/**
 * Any entity that can hold accounts in the bank.
 * Implemented by Member, community processes, federation nodes, etc.
 *
 * The handle is a short unique tag used in SMS commands:
 *   SEND 50 john groceries
 * It must be lowercase alphanumeric + underscores, unique within the community.
 */
export interface IEconomicActor {
    getId(): string;
    getDisplayName(): string;
    getHandle(): string;
}
