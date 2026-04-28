import { BankClient, NodeService } from "@ecf/core";

const BANK_URL = process.env.BANK_URL ?? "http://localhost:3001";

/** Returns a BankClient signed with this node's identity. */
export function nodeBankClient(): BankClient {
    return new BankClient(
        BANK_URL,
        body => NodeService.getInstance().getSigner().signBody(body),
    );
}
