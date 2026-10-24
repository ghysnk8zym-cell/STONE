import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareProductPhoto } from "@/features/admin/prepare-product-photo";
import { PNG } from "pngjs";

const file = () =>
  new File(
    [
      new Uint8Array(
        PNG.sync.write({ width: 2, height: 2, data: Buffer.alloc(16) }),
      ),
    ],
    "photo.bin",
  );

describe("product photo worker lifetime", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  function worker() {
    const instance = {
      onmessage: null as null | ((event: { data: object }) => void),
      onerror: null as null | (() => void),
      terminate: vi.fn(),
      postMessage: vi.fn(),
    };
    const Worker = vi.fn(function () {
      return instance;
    });
    vi.stubGlobal("Worker", Worker);
    return { instance, Worker };
  }
  it("does not launch a decoder for oversized originals", async () => {
    const { Worker } = worker();
    await expect(
      prepareProductPhoto({ size: 30 * 1024 * 1024 + 1 } as File),
    ).rejects.toMatchObject({ code: "size" });
    expect(Worker).not.toHaveBeenCalled();
  });
  it("releases the worker on success and propagates specific input errors", async () => {
    const { instance } = worker();
    const photo = new Blob(["png"], { type: "image/png" });
    const result = prepareProductPhoto(file());
    await vi.waitFor(() =>
      expect(instance.postMessage).toHaveBeenCalledTimes(1),
    );
    instance.onmessage!({ data: { photo } });
    await expect(result).resolves.toBe(photo);
    expect(instance.terminate).toHaveBeenCalledOnce();
    const next = prepareProductPhoto(file());
    await vi.waitFor(() =>
      expect(instance.postMessage).toHaveBeenCalledTimes(2),
    );
    instance.onmessage!({ data: { error: "pixels" } });
    await expect(next).rejects.toMatchObject({ code: "pixels" });
    expect(instance.terminate).toHaveBeenCalledTimes(2);
  });
  it("recovers from a failed or unresponsive decoder without a permanently busy form", async () => {
    vi.useFakeTimers();
    const { instance } = worker();
    const failed = prepareProductPhoto(file());
    await vi.waitFor(() =>
      expect(instance.postMessage).toHaveBeenCalledTimes(1),
    );
    instance.onerror!();
    await expect(failed).rejects.toMatchObject({ code: "preparation" });
    const stalled = prepareProductPhoto(file());
    const assertion = expect(stalled).rejects.toMatchObject({
      code: "preparation",
    });
    await vi.waitFor(() =>
      expect(instance.postMessage).toHaveBeenCalledTimes(2),
    );
    await vi.advanceTimersByTimeAsync(120_000);
    await assertion;
    expect(instance.terminate).toHaveBeenCalledTimes(2);
  });
});
