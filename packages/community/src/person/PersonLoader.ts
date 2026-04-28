import { FileStore } from "@ecf/core";
import { Person, PersonCredential, LanguageProficiency } from "./Person.js";

/** Shape of a Person record on disk. All Dates stored as ISO strings. */
interface PersonRecord {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    joinDate: string;
    handle: string;
    disabled: boolean;
    retired: boolean;
    steward: boolean;
    bornInCommunity: boolean;
    guardianId: string | null;
    phone: string | null;
    pinHash: string | null;
    passwordHash: string | null;
    privateKeyDer: string;
    publicKeyHex: string;
    languages: LanguageProficiency[];
    credential: PersonCredential | null;
}

export class PersonLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(person: Person): void {
        const { pinHash, passwordHash } = person.getCredentialsForPersistence();
        const { privateKeyDer, publicKeyHex } = person.getKeypairForPersistence();
        const record: PersonRecord = {
            id:           person.id,
            firstName:    person.firstName,
            lastName:     person.lastName,
            birthDate:    person.birthDate.toISOString(),
            joinDate:     person.joinDate.toISOString(),
            handle:       person.handle,
            disabled:     person.disabled,
            retired:      person.retired,
            steward:      person.steward,
            bornInCommunity: person.bornInCommunity,
            guardianId:   person.guardianId,
            phone:        person.phone,
            pinHash,
            passwordHash,
            privateKeyDer,
            publicKeyHex,
            languages:    person.languages,
            credential:   person.credential,
        };
        this.store.write(person.id, record);
    }

    loadAll(): Person[] {
        return this.store.readAll<PersonRecord>().map(r => this.fromRecord(r));
    }

    delete(id: string): boolean {
        return this.store.delete(id);
    }

    private fromRecord(r: PersonRecord): Person {
        return Person.restore({
            id:           r.id,
            firstName:    r.firstName,
            lastName:     r.lastName,
            birthDate:    new Date(r.birthDate),
            joinDate:     new Date(r.joinDate),
            handle:       r.handle,
            disabled:     r.disabled ?? false,
            retired:      r.retired ?? false,
            steward:      r.steward ?? false,
            bornInCommunity: r.bornInCommunity ?? false,
            guardianId:   r.guardianId,
            phone:        r.phone,
            pinHash:      r.pinHash ?? null,
            passwordHash: r.passwordHash ?? null,
            privateKeyDer: r.privateKeyDer ?? null,
            publicKeyHex:  r.publicKeyHex ?? null,
            languages:    r.languages ?? [],
            credential:   r.credential ?? null,
        });
    }
}
