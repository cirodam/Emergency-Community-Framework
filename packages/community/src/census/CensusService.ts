import { createHmac } from "crypto";
import type { Person } from "../person/Person.js";
import { PersonService } from "../person/PersonService.js";
import { FederationMembershipService } from "../FederationMembershipService.js";

/**
 * Domain separator used to derive a per-person federation nullifier.
 *
 * nullifier = HMAC-SHA256(key=DOMAIN_SEP, data=personPublicKeyHex)
 *
 * This produces a stable, pseudonymous ID for each person that:
 *   - is the same regardless of which community submits it (deterministic)
 *   - cannot be reversed to reveal the person's public key without an
 *     exhaustive search over known public keys
 *   - lets the federation detect double-counting across communities without
 *     learning anything about the underlying individuals
 */
const DOMAIN_SEP = "ecf-federation-nullifier-v1";

export function computeNullifier(person: Person): string {
    return createHmac("sha256", DOMAIN_SEP)
        .update(person.publicKeyHex)
        .digest("hex");
}

export function computeNullifiers(persons: Person[]): string[] {
    return persons.map(computeNullifier);
}

/**
 * Push the current member census to the federation.
 * No-ops silently if the community is not yet a federation member.
 *
 * Returns the list of duplicate nullifiers if the federation detected
 * any cross-community overlaps, so the caller can log or surface them.
 */
export async function pushCensus(): Promise<{ duplicates: string[] } | null> {
    const membership = FederationMembershipService.getInstance().getStatus();
    if (!membership || membership.status !== "approved") return null;

    const persons  = PersonService.getInstance().getAll();
    const nullifiers = computeNullifiers(persons);

    return FederationMembershipService.getInstance().submitCensus(nullifiers, persons.length);
}
