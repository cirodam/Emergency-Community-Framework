import { FileStore } from "@ecf/core";
import { AccountOwner, AccountOwnerRecord } from "./AccountOwner.js";

export class AccountOwnerLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(owner: AccountOwner): void {
        const record: AccountOwnerRecord = {
            ownerId:     owner.ownerId,
            ownerType:   owner.ownerType,
            displayName: owner.displayName,
            createdAt:   owner.createdAt.toISOString(),
        };
        if (owner.phone)        record.phone        = owner.phone;
        if (owner.passwordHash) record.passwordHash = owner.passwordHash;
        if (owner.pinHash)      record.pinHash      = owner.pinHash;
        if (owner.publicKeyHex) record.publicKeyHex = owner.publicKeyHex;
        this.store.write(owner.ownerId, record);
    }

    loadAll(): AccountOwner[] {
        return this.store.readAll<AccountOwnerRecord>().map(AccountOwner.restore);
    }

    delete(ownerId: string): boolean {
        return this.store.delete(ownerId);
    }
}
