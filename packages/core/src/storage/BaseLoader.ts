import { FileStore } from "./FileStore.js";

/**
 * Abstract base class for all collection-based entity loaders.
 *
 * Subclasses implement:
 *   - `serialize(entity)` → TData  (must include `id: string` as the file key)
 *   - `deserialize(data)` → TEntity
 *
 * The base provides: `save`, `load`, `loadAll`, `delete`.
 * Override `loadAll` when post-processing (e.g. sorting) is needed.
 */
export abstract class BaseLoader<TData extends { id: string }, TEntity> {
    protected readonly store: FileStore;

    constructor(dir: string) {
        this.store = new FileStore(dir);
    }

    protected abstract serialize(entity: TEntity): TData;
    protected abstract deserialize(data: TData): TEntity;

    save(entity: TEntity): void {
        const data = this.serialize(entity);
        this.store.write(data.id, data);
    }

    load(id: string): TEntity | null {
        const data = this.store.read<TData>(id);
        return data !== undefined ? this.deserialize(data) : null;
    }

    loadAll(): TEntity[] {
        return this.store.readAll<TData>().map(d => this.deserialize(d));
    }

    delete(id: string): boolean {
        return this.store.delete(id);
    }
}
