import { and, eq, sql } from "drizzle-orm";
import { PNG } from "pngjs";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  TEST_BASE_URL,
  TEST_SECRET,
  TEST_PASSWORD,
  signUp,
  signIn,
  sessionCookieFrom,
  thrown,
  redirectTarget,
} from "./auth-helpers";
vi.mock("server-only", () => ({}));
const browser = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({
  headers: async () => browser.headers,
  cookies: async () => ({ getAll: () => [] }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const input = {
  material: "marble",
  color: "Grey",
  texture: "Honed",
  lengthMm: 600,
  widthMm: 400,
  thicknessMm: 20,
  quantity: 4,
  contactName: "Demo Person",
  contactEmail: "demo@example.test",
  contactPhone: "+1 (555) 010-1234",
};
function form(
  key = crypto.randomUUID(),
  fields: unknown = input,
  image?: Buffer,
) {
  const f = new FormData();
  f.set("key", key);
  f.set("fields", JSON.stringify(fields));
  f.set(
    "photo",
    new File(
      [
        new Uint8Array(
          image ??
            PNG.sync.write({ width: 2, height: 2, data: Buffer.alloc(16, 90) }),
        ),
      ],
      "reference.png",
      { type: "image/png" },
    ),
  );
  return f;
}
function reset() {
  vi.resetModules();
  const g = globalThis as { __stoneDb?: unknown; __stoneAuth?: unknown };
  delete g.__stoneDb;
  delete g.__stoneAuth;
}

describe("public requests: real local database and authorization", () => {
  let db: NonNullable<Awaited<ReturnType<typeof import("@/server/db").getDb>>>;
  let schema: typeof import("@/server/db/schema");
  let actions: typeof import("@/server/stone-requests/actions");
  let store: typeof import("@/server/stone-requests/store");
  let queries: typeof import("@/server/stone-requests/queries");
  let route: typeof import("@/app/api/stone-requests/[id]/photo/route");
  let client: string, other: string, admin: string, owner: string;
  const as = (cookie?: string) => {
    browser.headers = new Headers({
      origin: TEST_BASE_URL,
      host: new URL(TEST_BASE_URL).host,
      "x-stone-path": "/en/create-your-stone",
    });
    if (cookie) browser.headers.set("cookie", cookie);
  };
  beforeAll(async () => {
    reset();
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", TEST_SECRET);
    vi.stubEnv("BETTER_AUTH_URL", TEST_BASE_URL);
    actions = await import("@/server/stone-requests/actions");
    store = await import("@/server/stone-requests/store");
    queries = await import("@/server/stone-requests/queries");
    route = await import("@/app/api/stone-requests/[id]/photo/route");
    schema = await import("@/server/db/schema");
    db = (await (await import("@/server/db")).getDb())!;
    const auth = (await (await import("@/server/auth/auth")).getAuth())!;
    for (const email of [
      "client@example.test",
      "other@example.test",
      "admin@example.test",
    ])
      expect((await signUp(auth, email)).status).toBe(200);
    await db
      .update(schema.user)
      .set({ role: "admin" })
      .where(eq(schema.user.email, "admin@example.test"));
    client = sessionCookieFrom(
      await signIn(auth, "client@example.test", TEST_PASSWORD),
    )!;
    other = sessionCookieFrom(
      await signIn(auth, "other@example.test", TEST_PASSWORD),
    )!;
    admin = sessionCookieFrom(
      await signIn(auth, "admin@example.test", TEST_PASSWORD),
    )!;
    owner = (
      await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, "client@example.test"))
    )[0].id;
  });
  beforeEach(async () => {
    vi.restoreAllMocks();
    as(client);
    await db.delete(schema.stoneRequest);
    await db.update(schema.stoneRequestBudget).set({ total: 0, users: {} });
    await db
      .delete(schema.rateLimit)
      .where(eq(schema.rateLimit.key, `stone-upload:${owner}`));
  });
  afterAll(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    reset();
  });
  it("guards guests before malformed input and rejects forged/missing origins", async () => {
    as();
    expect(
      redirectTarget(
        await thrown(() => actions.submitStoneRequest(null as never)),
      ),
    ).toContain("/en/sign-in?");
    as(client);
    browser.headers.delete("origin");
    expect(await actions.submitStoneRequest(form())).toEqual({
      ok: false,
      code: "invalid",
    });
    browser.headers.set("origin", "https://attacker.example");
    expect(await actions.submitStoneRequest(form())).toEqual({
      ok: false,
      code: "invalid",
    });
  });
  it.each([
    { ...input, quantity: 0 },
    { ...input, widthMm: 10001 },
    { ...input, contactEmail: "invalid" },
    { ...input, userId: "other" },
    { ...input, color: "a\u202eb" },
  ])("rejects invalid or extra fields", async (invalid) => {
    expect(await actions.submitStoneRequest(form(undefined, invalid))).toEqual({
      ok: false,
      code: "invalid",
    });
    expect(await db.select().from(schema.stoneRequest)).toHaveLength(0);
  });
  it("rejects active image content without consuming upload capacity", async () => {
    expect(
      await actions.submitStoneRequest(
        form(undefined, input, Buffer.from("<svg/>")),
      ),
    ).toEqual({ ok: false, code: "photo" });
    expect((await db.select().from(schema.stoneRequestBudget))[0].total).toBe(
      0,
    );
  });
  it("persists canonical photo/contact, derives identity/status, replays safely and isolates reads", async () => {
    const key = crypto.randomUUID();
    const saved = await actions.submitStoneRequest(form(key));
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(await actions.submitStoneRequest(form(key))).toEqual(saved);
    expect(
      await actions.submitStoneRequest(form(key, { ...input, quantity: 9 })),
    ).toEqual({ ok: false, code: "conflict" });
    const [stored] = await db.select().from(schema.stoneRequest);
    expect(stored).toMatchObject({
      userId: owner,
      status: "new",
      revision: 0,
      referenceImage: null,
      contactEmail: input.contactEmail,
    });
    expect(stored.number).toMatch(/^Q-\d{9}$/);
    expect(stored.photoBase64).toBeTruthy();
    expect(
      (await db.select().from(schema.stoneRequestBudget))[0],
    ).toMatchObject({ total: 1, users: { [owner]: 1 } });
    const getPhoto = () =>
      route.GET(
        new Request(`${TEST_BASE_URL}/api/stone-requests/${saved.id}/photo`),
        { params: Promise.resolve({ id: saved.id }) },
      );
    const photo = await getPhoto();
    expect(photo.status).toBe(200);
    expect(photo.headers.get("content-type")).toBe("image/png");
    expect(photo.headers.get("cache-control")).toContain("no-store");
    expect(photo.headers.get("x-content-type-options")).toBe("nosniff");
    expect(PNG.sync.read(Buffer.from(await photo.arrayBuffer())).data).toEqual(
      Buffer.alloc(16, 90),
    );
    expect(await queries.getRequestConfirmation("en", saved.id)).toMatchObject({
      number: saved.number,
      contactEmail: input.contactEmail,
    });
    as(other);
    expect(await actions.recoverStoneRequest(key)).toBeNull();
    expect(await queries.getRequestConfirmation("en", saved.id)).toBeNull();
    expect((await getPhoto()).status).toBe(404);
    as(admin);
    expect((await getPhoto()).status).toBe(200);
    const list = await (
      await import("@/server/admin/stone-request-queries")
    ).getAdminStoneRequests("en");
    expect(JSON.stringify(list)).not.toContain(stored.photoBase64!);
    as();
    expect(redirectTarget(await thrown(getPhoto))).toContain("sign-in");
  });
  for (const boundary of ["user", "global"] as const) {
    it(`concurrent identical retry succeeds at the last ${boundary} capacity slot`, async () => {
      await db.update(schema.stoneRequestBudget).set({
        total: boundary === "global" ? 49 : 9,
        users: boundary === "user" ? { [owner]: 9 } : {},
      });
      // Force both callers to complete their initial lookup before either inserts.
      const original = store.findSubmission;
      let arrivals = 0;
      let release!: () => void;
      const barrier = new Promise<void>((resolve) => {
        release = resolve;
      });
      vi.spyOn(store, "findSubmission").mockImplementation(async (...args) => {
        const found = await original(...args);
        if (++arrivals <= 2) {
          if (arrivals === 2) release();
          await barrier;
        }
        return found;
      });
      const key = crypto.randomUUID();
      const results = await Promise.all([
        actions.submitStoneRequest(form(key)),
        actions.submitStoneRequest(form(key)),
      ]);
      expect(results[0].ok).toBe(true);
      expect(results[1]).toEqual(results[0]);
      expect(await db.select().from(schema.stoneRequest)).toHaveLength(1);
      expect((await db.select().from(schema.stoneRequestBudget))[0].total).toBe(
        boundary === "global" ? 50 : 10,
      );
    });
    it(`concurrent distinct requests cannot exceed ${boundary} capacity`, async () => {
      await db.update(schema.stoneRequestBudget).set({
        total: boundary === "global" ? 49 : 9,
        users: boundary === "user" ? { [owner]: 9 } : {},
      });
      const results = await Promise.all([
        actions.submitStoneRequest(form()),
        actions.submitStoneRequest(form()),
      ]);
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.filter((r) => !r.ok)).toEqual([
        { ok: false, code: "quota" },
      ]);
    });
  }
  it("rate limits before decoding and recovers saved submissions separately", async () => {
    const key = crypto.randomUUID();
    const saved = await actions.submitStoneRequest(form(key));
    await db
      .update(schema.rateLimit)
      .set({ count: 10 })
      .where(eq(schema.rateLimit.key, `stone-upload:${owner}`));
    expect(await actions.submitStoneRequest(form())).toEqual({
      ok: false,
      code: "rate-limit",
    });
    expect(await actions.recoverStoneRequest(key)).toEqual(saved);
  });
  it("rolls back the budget when an insert constraint fails", async () => {
    await expect(
      store.insertSubmission(
        db,
        owner,
        crypto.randomUUID(),
        "digest",
        Buffer.from("photo"),
        { ...input, material: "marble", quantity: 0 },
        { en: "Marble", ru: "Marble" },
      ),
    ).rejects.toThrow();
    expect((await db.select().from(schema.stoneRequestBudget))[0].total).toBe(
      0,
    );
  });
  it("denies an expired session", async () => {
    const sessions = await db
      .select()
      .from(schema.session)
      .where(eq(schema.session.userId, owner));
    await db
      .update(schema.session)
      .set({ expiresAt: new Date(0) })
      .where(eq(schema.session.userId, owner));
    expect(
      redirectTarget(await thrown(() => actions.submitStoneRequest(form()))),
    ).toContain("sign-in");
    for (const session of sessions)
      await db
        .update(schema.session)
        .set({ expiresAt: session.expiresAt })
        .where(and(eq(schema.session.id, session.id), sql`true`));
  });
});
