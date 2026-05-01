import { BankDb } from "./BankDb.js";
import { AccountOwner, AccountOwnerRecord } from "./AccountOwner.js";

interface OwnerRow {
    owner_id:       string;
    owner_type:     string;
    display_name:   string;
    created_at:     string;
    phone:          string | null;
    password_hash:  string | null;
    pin_hash:       string | null;
    public_key_hex: string | null;
}

export class AccountOwnerLoader {
    private get db() { return BankDb.getInstance().db; }

    save(owner: AccountOwner): void {
        this.db.prepare(`
            INSERT INTO account_owners
                (owner_id, owner_type, display_name, created_at, phone, password_hash, pin_hash, public_key_hex)
            VALUES
                (@owner_id, @owner_type, @display_name, @created_at, @phone, @password_hash, @pin_hash, @public_key_hex)
            ON CONFLICT(owner_id) DO UPDATE SET
                display_name   = excluded.display_name,
                phone          = excluded.phone,
                password_hash  = excluded.password_hash,
                pin_hash       = excluded.pin_hash,
                public_key_hex = excluded.public_key_hex
        `).run({
            owner_id:       owner.ownerId,
            owner_type:     owner.ownerType,
            display_name:   owner.displayName,
            created_at:     owner.createdAt.toISOString(),
            phone:          owner.phone          ?? null,
            password_hash:  owner.passwordHash   ?? null,
            pin_hash:       owner.pinHash        ?? null,
            public_key_hex: owner.publicKeyHex   ?? null,
        });
    }

    loadAll(): AccountOwner[] {
        return (this.db.prepare("SELECT * FROM account_owners").all() as OwnerRow[])
            .map(r => this.fromRow(r));
    }

    delete(ownerId: string): boolean {
        const result = this.db.prepare("DELETE FROM account_owners WHERE owner_id = ?").run(ownerId);
        return result.changes > 0;
    }

    private fromRow(r: OwnerRow): AccountOwner {
        const record: AccountOwnerRecord = {
            ownerId:     r.owner_id,
            ownerType:   r.owner_type as AccountOwnerRecord["ownerType"],
            displayName: r.display_name,
            createdAt:   r.created_at,
        };
        if (r.phone)          record.phone        = r.phone;
        if (r.password_hash)  record.passwordHash = r.password_hash;
        if (r.pin_hash)       record.pinHash      = r.pin_hash;
        if (r.public_key_hex) record.publicKeyHex = r.public_key_hex;
        return AccountOwner.restore(record);
    }
}

