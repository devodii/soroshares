import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");

export interface DiskStore<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  delete(key: string): void;
  all(): Record<string, T>;
}

const caches = new Map<string, Map<string, unknown>>();
const loaded = new Set<string>();

function filePath(name: string): string {
  return path.join(DATA_DIR, `${name}.json`);
}

function load(name: string): Map<string, unknown> {
  let cache = caches.get(name);
  if (!cache) {
    cache = new Map();
    caches.set(name, cache);
  }
  if (loaded.has(name)) return cache;
  loaded.add(name);
  const file = filePath(name);
  if (existsSync(file)) {
    const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    for (const [key, value] of Object.entries(raw)) cache.set(key, value);
  }
  return cache;
}

function persist(name: string, cache: Map<string, unknown>): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(filePath(name), JSON.stringify(Object.fromEntries(cache), null, 2));
}

// On serverless, each cold start gets its own filesystem, so this is best-effort
// under concurrency, not a correctness guarantee. Bootstrap re-checks on-chain
// state before acting, so it stays correct even if this cache is stale.
export function createDiskStore<T>(name: string): DiskStore<T> {
  return {
    get(key) {
      return load(name).get(key) as T | undefined;
    },
    set(key, value) {
      const cache = load(name);
      cache.set(key, value);
      persist(name, cache);
    },
    delete(key) {
      const cache = load(name);
      cache.delete(key);
      persist(name, cache);
    },
    all() {
      return Object.fromEntries(load(name)) as Record<string, T>;
    },
  };
}
