import { BankClient } from "@ecf/core";
import { GLOBE_TREASURY_ID, GlobeTreasuryLoader } from "./GlobeTreasuryLoader.js";

/**
 * The Globe Treasury holds the globe's operating funds in kin.
 * Funded by clearing fees on inter-commonwealth transfers and demurrage proceeds.
 */
export class GlobeTreasury {
    private static instance: GlobeTreasury;

    private _ownerId!: string;
    private _accountId!: string;
    private _ready = false;

    private constructor() {}

    static getInstance(): GlobeTreasury {
        if (!GlobeTreasury.instance) GlobeTreasury.instance = new GlobeTreasury();
        return GlobeTreasury.instance;
    }

    isReady(): boolean      { return this._ready; }
    get ownerId(): string   { if (!this._ready) throw new Error("GlobeTreasury not ready"); return this._ownerId; }
    get accountId(): string { if (!this._ready) throw new Error("GlobeTreasury not ready"); return this._accountId; }

    async init(bank: BankClient, loader: GlobeTreasuryLoader): Promise<void> {
        if (loader.exists()) {
            const record    = loader.load();
            this._ownerId   = record.ownerId;
            this._accountId = record.accountId;
            this._ready = true;
            return;
        }

        const owner = await bank.createOwner("institution", "Globe Treasury", {
            ownerId: GLOBE_TREASURY_ID,
        });
        this._ownerId = owner.ownerId;

        const account = await bank.openAccount(this._ownerId, "Globe Treasury", "kithe");
        this._accountId = account.accountId;

        loader.save({
            ownerId:      this._ownerId,
            accountId:    this._accountId,
            registeredAt: new Date().toISOString(),
        });
        this._ready = true;
        console.log("[GlobeTreasury] registered:", this._accountId);
    }
}
