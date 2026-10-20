import { describe, expect, it } from "vitest";

import {
  ATTEMPT_STORAGE_KEY,
  createAttemptKeys,
} from "@/features/cart/attempt-key";

function memoryStorage(fail: { read?: boolean; write?: boolean } = {}) {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => {
      if (fail.read) throw new Error("blocked");
      return data.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (fail.write) throw new Error("quota");
      data.set(k, v);
    },
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
  return { storage, data };
}

function counter() {
  let n = 0;
  return () => `key-${++n}`;
}

describe("checkout attempt keys", () => {
  it("reuses the key for the same content and rotates it for a different content", () => {
    const keys = createAttemptKeys(counter(), () => memoryStorage().storage);
    expect(keys.keyFor("a")).toBe("key-1");
    expect(keys.keyFor("a")).toBe("key-1");
    expect(keys.keyFor("b")).toBe("key-2");
  });

  it("keeps the key in memory when storage throws on every read and write", () => {
    const { storage } = memoryStorage({ read: true, write: true });
    const keys = createAttemptKeys(counter(), () => storage);
    expect(keys.keyFor("a")).toBe("key-1");
    expect(keys.keyFor("a")).toBe("key-1");
  });

  it("keeps the key in memory when only writes fail", () => {
    const { storage } = memoryStorage({ write: true });
    const keys = createAttemptKeys(counter(), () => storage);
    expect(keys.keyFor("a")).toBe(keys.keyFor("a"));
  });

  it("recovers the key after a reload of the same tab when storage works", () => {
    const { storage, data } = memoryStorage();
    const before = createAttemptKeys(counter(), () => storage);
    const key = before.keyFor("a");
    expect(JSON.parse(data.get(ATTEMPT_STORAGE_KEY)!)).toEqual({
      content: "a",
      key,
    });
    const afterReload = createAttemptKeys(
      () => "fresh",
      () => storage,
    );
    expect(afterReload.keyFor("a")).toBe(key);
  });

  it("starts a new key after forget(), in memory and in storage", () => {
    const { storage, data } = memoryStorage();
    const keys = createAttemptKeys(counter(), () => storage);
    keys.keyFor("a");
    keys.forget();
    expect(data.has(ATTEMPT_STORAGE_KEY)).toBe(false);
    expect(keys.keyFor("a")).toBe("key-2");
  });

  it("ignores malformed stored data", () => {
    const { storage, data } = memoryStorage();
    data.set(ATTEMPT_STORAGE_KEY, "{not json");
    const keys = createAttemptKeys(counter(), () => storage);
    expect(keys.keyFor("a")).toBe("key-1");
  });
});
