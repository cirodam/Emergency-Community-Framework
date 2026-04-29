import logger from "../logger.js";
import { SerialPort } from "serialport";
import type { SmsProvider } from "./SmsProvider.js";

/**
 * Drives a GSM modem directly over a serial port using AT commands.
 *
 * Requires:
 *   - A modem accessible at a serial device path (e.g. /dev/ttyUSB0)
 *   - In Docker: the device must be passed through:
 *       devices:
 *         - "/dev/ttyUSB0:/dev/ttyUSB0"
 *     and the container may need access to the `dialout` group.
 *
 * Env vars consumed here (read by SmsService, passed into constructor):
 *   SMS_MODEM_PATH   - serial device path (default: /dev/ttyUSB2 for SIM7600G-H)
 *   SMS_MODEM_BAUD   - baud rate (default: 115200)
 *
 * Protocol overview:
 *   - Uses AT text mode (AT+CMGF=1)
 *   - Configures modem to push incoming SMS directly as +CMT URCs
 *     rather than storing them (AT+CNMI=1,2,0,0,0)
 *   - Send flow: AT+CMGS="<number>" → wait for ">" → send body + \x1A → wait for +CMGS:
 *
 * Limitation: a +CMT URC that arrives while a send is in-flight will be
 * dropped (the buffer is cleared after each command). The user may simply
 * send the command again. For higher reliability, extend this with AT+CMGL
 * polling as a fallback.
 */

type MessageHandler = (from: string, body: string) => Promise<void>;

interface PendingCommand {
    terminal: string;
    resolve: (response: string) => void;
    reject: (err: Error) => void;
    timer: NodeJS.Timeout;
}

export class GsmModemProvider implements SmsProvider {
    private port: SerialPort;
    private rxBuf = "";
    private pending: PendingCommand | null = null;
    private pendingCmtFrom: string | null = null;
    private messageHandler: MessageHandler | null = null;
    private sendLocked = false;
    private readonly sendQueue: Array<() => void> = [];

    constructor(path: string, baudRate = 115200) {
        this.port = new SerialPort({ path, baudRate, autoOpen: false });
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    async init(): Promise<void> {
        await new Promise<void>((resolve, reject) =>
            this.port.open(err => (err ? reject(err) : resolve())),
        );

        this.port.on("data", (chunk: Buffer) => {
            this.rxBuf += chunk.toString("latin1");
            this.drain();
        });

        this.port.on("error", err => {
            logger.error(`[sms] serial port error: ${err.message}`);
        });

        await this.atCmd("ATE0\r\n", "OK");               // disable echo
        await this.atCmd("AT+CMGF=1\r\n", "OK");          // text mode
        await this.atCmd("AT+CNMI=1,2,0,0,0\r\n", "OK"); // push incoming as +CMT URCs
        logger.info("[sms] GSM modem ready");
    }

    startReceiving(handler: MessageHandler): void {
        this.messageHandler = handler;
    }

    stop(): void {
        if (this.port.isOpen) this.port.close();
    }

    // ── Send ──────────────────────────────────────────────────────────────────

    async send(to: string, body: string): Promise<void> {
        // Serialize sends — only one AT+CMGS sequence at a time.
        if (this.sendLocked) {
            await new Promise<void>(res => this.sendQueue.push(res));
        }
        this.sendLocked = true;
        try {
            // Step 1: open the send prompt.
            await this.atCmd(`AT+CMGS="${to}"\r`, ">", 10_000);
            // Step 2: send the message body terminated with Ctrl-Z.
            await this.atCmd(`${body}\x1A`, "+CMGS:", 30_000);
        } finally {
            this.sendLocked = false;
            this.sendQueue.shift()?.();
        }
    }

    // ── AT command core ────────────────────────────────────────────────────────

    /**
     * Write an AT command and wait until the response buffer contains `terminal`
     * or the modem returns ERROR. Rejects on timeout or ERROR.
     */
    private atCmd(cmd: string, terminal: string, timeoutMs = 10_000): Promise<string> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending = null;
                this.rxBuf = "";
                reject(new Error(`[sms] AT timeout waiting for "${terminal}" (cmd: ${JSON.stringify(cmd)})`));
            }, timeoutMs);

            this.pending = { terminal, resolve, reject, timer };
            this.rxBuf = "";
            this.port.write(cmd);
        });
    }

    /**
     * Called whenever data arrives on the serial port.
     * If a command is in-flight, check for its terminal string.
     * Otherwise, scan the idle buffer for +CMT URCs.
     */
    private drain(): void {
        if (this.pending) {
            const { terminal, resolve, reject, timer } = this.pending;

            if (this.rxBuf.includes(terminal)) {
                this.pending = null;
                clearTimeout(timer);
                const response = this.rxBuf;
                this.rxBuf = "";
                resolve(response);
                return;
            }

            if (this.rxBuf.includes("ERROR")) {
                this.pending = null;
                clearTimeout(timer);
                const response = this.rxBuf.trim();
                this.rxBuf = "";
                reject(new Error(`[sms] modem ERROR: ${response}`));
                return;
            }

            // Still accumulating — wait for more data.
            return;
        }

        // Idle: extract complete lines and look for +CMT URCs.
        let nl: number;
        while ((nl = this.rxBuf.indexOf("\n")) !== -1) {
            const line = this.rxBuf.slice(0, nl).replace(/\r/g, "").trim();
            this.rxBuf = this.rxBuf.slice(nl + 1);
            this.handleIdleLine(line);
        }
    }

    private handleIdleLine(line: string): void {
        if (line === "") return;

        if (line.startsWith("+CMT:")) {
            // +CMT: "+15551234567","","26/04/26,12:00:00+00"
            const match = line.match(/\+CMT:\s*"([^"]+)"/);
            this.pendingCmtFrom = match?.[1] ?? null;
            return;
        }

        if (this.pendingCmtFrom !== null) {
            const from = this.pendingCmtFrom;
            const body = line;
            this.pendingCmtFrom = null;
            this.messageHandler?.(from, body).catch(err =>
                (err: unknown) => logger.error({ err }, "[sms] message handler error"),
            );
        }
    }
}
