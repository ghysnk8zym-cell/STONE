import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProductStorage } from "./product-storage";

export function localProductStorage(): ProductStorage {
  // Separate from public/ and code; persisted across app restarts and ignored by Git.
  const directory = join(process.cwd(), ".data", "product-images");
  const path = (key: string) => {
    if (!/^[0-9a-f-]{36}\.png$/.test(key))
      throw new Error("Invalid product media key");
    return join(directory, key);
  };
  return {
    async put(key, bytes) {
      await mkdir(directory, { recursive: true });
      await writeFile(path(key), bytes, { flag: "wx" });
    },
    async get(key) {
      try {
        return new Uint8Array(await readFile(path(key)));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async delete(key) {
      try {
        await unlink(path(key));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    },
  };
}
