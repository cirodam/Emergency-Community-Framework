/**
 * Abstraction over an SMS transport.
 *
 * Currently implemented by GsmModemProvider (raw AT commands over serial port).
 * The interface is thin — provide a way to send and a way to register an inbound
 * handler. The provider owns receiving; the service owns handling.
 */
export interface SmsProvider {
    send(to: string, body: string): Promise<void>;
    startReceiving(onMessage: (from: string, body: string) => Promise<void>): void;
    stop(): void;
}
