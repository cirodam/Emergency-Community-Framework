/**
 * Parses inbound SMS text into a structured command.
 *
 * Commands (case-insensitive):
 *
 *   BALANCE
 *     → check your kin balance
 *
 *   SEND <amount> @<handle> <pin>
 *     → transfer <amount> kin to the person with @<handle>, authenticated by <pin>
 *     → amount must be a positive integer
 *     → pin must be 4–8 digits
 *
 *   HELP (or any unrecognised input)
 *     → show command list
 */

export type SmsCommand =
    | { type: "balance" }
    | { type: "send"; amount: number; handle: string; pin: string }
    | { type: "help" };

export function parseSmsCommand(raw: string): SmsCommand {
    const text = raw.trim();
    const upper = text.toUpperCase();

    if (upper === "BALANCE") {
        return { type: "balance" };
    }

    if (upper === "HELP") {
        return { type: "help" };
    }

    // SEND <amount> @<handle> <pin>
    const sendMatch = text.match(
        /^send\s+(\d+)\s+@?([a-z0-9_]+)\s+(\d{4,8})$/i,
    );
    if (sendMatch) {
        const amount = parseInt(sendMatch[1]!, 10);
        const handle = sendMatch[2]!.toLowerCase();
        const pin    = sendMatch[3]!;

        if (amount <= 0 || !Number.isFinite(amount)) {
            return { type: "help" };
        }

        return { type: "send", amount, handle, pin };
    }

    return { type: "help" };
}
