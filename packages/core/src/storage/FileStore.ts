import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, renameSync, unlinkSync } from "fs";
import { join, resolve } from "path";
import { DataManifest } from "./DataManifest.js";

/**
 * Atomic JSON file store backed by the local filesystem.
 *
 * All writes go to a .tmp file first, then are renamed over the target.
 * Rename is atomic on Linux/macOS — a crash mid-write leaves the original intact.
 */
export class FileStore {
    constructor(private readonly dir: string) {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Validate that an id is safe to use as a filename component.
     * Rejects any id containing path separators, dots, or non-printable
     * characters that could be used for directory traversal.
     */
    private static assertSafeId(id: string): void {
        if (!/^[a-zA-Z0-9_\-]+$/.test(id)) {
            throw new Error(`Invalid storage id: "${id}"`);
        }
    }

    /** Write an object to {id}.json atomically. */
    write<T>(id: string, data: T): void {
        FileStore.assertSafeId(id);
        const target = join(this.dir, `${id}.json`);
        const tmp = `${target}.tmp`;
        const content = JSON.stringify(data, null, 2);
        writeFileSync(tmp, content, "utf-8");
        renameSync(tmp, target);
        DataManifest.getInstance().record(resolve(target), content);
    }

    /** Read and parse {id}.json. Returns undefined if the file does not exist. */
    read<T>(id: string): T | undefined {
        FileStore.assertSafeId(id);
        const path = join(this.dir, `${id}.json`);
        if (!existsSync(path)) return undefined;
        const content = readFileSync(path, "utf-8");
        DataManifest.getInstance().verify(resolve(path), content);
        return JSON.parse(content) as T;
    }

    /** Read and parse all *.json files in the directory. */
    readAll<T>(): T[] {
        return readdirSync(this.dir)
            .filter(f => f.endsWith(".json"))
            .map(f => {
                const path = join(this.dir, f);
                const content = readFileSync(path, "utf-8");
                DataManifest.getInstance().verify(resolve(path), content);
                return JSON.parse(content) as T;
            });
    }

    /** Delete {id}.json. Returns true if the file existed. */
    delete(id: string): boolean {
        FileStore.assertSafeId(id);
        const path = join(this.dir, `${id}.json`);
        if (!existsSync(path)) return false;
        unlinkSync(path);
        DataManifest.getInstance().remove(resolve(path));
        return true;
    }

    exists(id: string): boolean {
        FileStore.assertSafeId(id);
        return existsSync(join(this.dir, `${id}.json`));
    }
}
