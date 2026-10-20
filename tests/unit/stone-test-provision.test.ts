import { describe, expect, it } from "vitest";

import {
  APPROVED_TARGET,
  checkOwnerUrl,
  grantStatements,
  runtimeUrl,
  syntheticAccounts,
} from "../../scripts/ops/stone-test-provision.mjs";

const HOST = "ep-delicate-silence-b5doyaix.c-7.us-east-2.aws.neon.tech";

describe("stone-test provisioning helpers", () => {
  it("accepts only the approved stone-test branch endpoint, database and owner role", () => {
    expect(APPROVED_TARGET).toEqual({
      host: HOST,
      database: "neondb",
      ownerRole: "neondb_owner",
      runtimeRole: "stone_app",
    });
    expect(
      checkOwnerUrl(
        `postgresql://neondb_owner:x@${HOST}/neondb?sslmode=require`,
      ),
    ).toBeNull();
  });

  it("rejects other hosts, the pooler, other databases, other roles and non-TLS URLs, naming no value", () => {
    const bad = [
      `postgresql://neondb_owner:x@${HOST.replace("silence-b5doyaix", "other")}/neondb?sslmode=require`,
      `postgresql://neondb_owner:x@${HOST.replace(".c-7", "-pooler.c-7")}/neondb?sslmode=require`,
      `postgresql://neondb_owner:x@${HOST}/postgres?sslmode=require`,
      `postgresql://someone:x@${HOST}/neondb?sslmode=require`,
      `postgresql://neondb_owner:x@${HOST}/neondb`,
      "not a url",
      "",
    ];
    for (const url of bad) {
      const reason = checkOwnerUrl(url);
      expect(reason).toBeTypeOf("string");
      expect(reason).not.toContain("x@");
      expect(reason).not.toContain(HOST);
    }
  });

  it("builds the runtime URL for the least-privilege role on the same endpoint", () => {
    const url = new URL(runtimeUrl("p@ss/word"));
    expect(url.username).toBe("stone_app");
    expect(decodeURIComponent(url.password)).toBe("p@ss/word");
    expect(url.hostname).toBe(HOST);
    expect(url.pathname).toBe("/neondb");
    expect(url.searchParams.get("sslmode")).toBe("require");
  });

  it("grants data access only (no DDL, no superuser, no neon_auth)", () => {
    const sql = grantStatements().join("\n");
    expect(sql).toContain("GRANT USAGE ON SCHEMA public TO stone_app");
    expect(sql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO stone_app",
    );
    expect(sql).toContain(
      "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO stone_app",
    );
    expect(sql).not.toMatch(
      /CREATE ON|SUPERUSER|CREATEROLE|neon_auth|ALL PRIVILEGES/i,
    );
  });

  it("creates synthetic accounts with strong random passwords on reserved example addresses", () => {
    const a = syntheticAccounts();
    const b = syntheticAccounts();
    expect(a.admin.email).toBe("stone-admin@example.com");
    expect(a.client.email).toBe("stone-client@example.com");
    expect(a.admin.password.length).toBeGreaterThanOrEqual(24);
    expect(a.client.password.length).toBeGreaterThanOrEqual(24);
    expect(a.admin.password).not.toBe(b.admin.password);
  });
});
