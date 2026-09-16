import "server-only";
import { kv } from "@vercel/kv";

export interface KvStore<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  all(): Promise<Record<string, T>>;
}

export function createRedisStore<T>(name: string): KvStore<T> {
  const key = (id: string) => `soroshares:${name}:${id}`;

  return {
    async get(id) {
      const value = await kv.get<T>(key(id));
      return value ?? undefined;
    },
    async set(id, value) {
      await kv.set(key(id), value);
    },
    async delete(id) {
      await kv.del(key(id));
    },
    async all() {
      const keys = await kv.keys(`soroshares:${name}:*`);
      if (keys.length === 0) return {};
      const values = await kv.mget<T[]>(...keys);
      const prefix = `soroshares:${name}:`;
      const result: Record<string, T> = {};
      keys.forEach((k, i) => {
        const value = values[i];
        if (value !== null && value !== undefined) result[k.slice(prefix.length)] = value;
      });
      return result;
    },
  };
}
