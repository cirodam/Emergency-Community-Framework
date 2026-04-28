import { BankClient } from "@ecf/core";
import type { CommonwealthTreasuryLoader } from "./CommonwealthTreasuryLoader.js";

export const COMMONWEALTH_TREASURY_ID = "ecf-commonwealth-treasury-000002";

/**
 * The Commonwealth Treasury holds the commonwealth's operating funds in kin.
 * Funded by clearing fees on inter-federation transfers and demurrage proceeds.
 */
export class CommonwealthTreasury {
    private static instance: CommonwealthTreasury;

    private _ownerId!: string;
    private _accountId!: string;
    private _ready = false;

    private constructor() {}

    static getInstance(): CommonwealthTreasury {
        if (!CommonwealthTreasury.instance) CommonwealthTreasury.instance = new CommonwealthTreasury();
        return CommonwealthTreasury.instance;
    }

    isReady(): boolean      { return this._ready; }
    get ownerId(): string   { if (!this._ready) throw new Error("CommonwealthTreasury not ready"); return this._ownerId; }
    get accountId(): string { if (!this._ready) throw new Error("CommonwealthTreasury not ready"); return this._accountId; }

    async init(bank: BankClient, loader: CommonwealthTreasuryLoader): Promise<void> {
        if (loader.exists()) {
            const record = loader.load();
            this._ownerId   = record.ownerId;
            this._accountId = record.accountId;
            this._ready = true;
            return;
        }

        const owner = await bank.createOwner("institution", "Commonwealth Treasury", {
            ownerId: COMMONWEALTH_TREASURY_ID,
        });
        this._ownerId = owner.ownerId;

        const account = await bank.openAccount(this._ownerId, "Commonwealth Treasury", "kithe");
        this._accountId = account.accountId;

        loader.save({
            ownerId:      this._ownerId,
            accountId:    this._accountId,
            registeredAt: new Date().toISOString(),
        });
        this._ready = true;
        console.log("[CommonwealthTreasury] registered:", this._accountId);
    }
}
