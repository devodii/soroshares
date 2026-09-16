import "server-only";
import { Redis } from "@upstash/redis";

export interface KvStore<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  all(): Promise<Record<string, T>>;
}

let client: Redis | undefined;

function getClient(): Redis {
  if (!client) {
    client = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }
  return client;
}

export function createRedisStore<T>(name: string): KvStore<T> {
  const key = (id: string) => `soroshares:${name}:${id}`;

  return {
    async get(id) {
      const value = await getClient().get<T>(key(id));
      return value ?? undefined;
    },
    async set(id, value) {
      await getClient().set(key(id), value);
    },
    async delete(id) {
      await getClient().del(key(id));
    },
    async all() {
      const keys = await getClient().keys(`soroshares:${name}:*`);
      if (keys.length === 0) return {};
      const values = await getClient().mget<T[]>(...keys);
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
