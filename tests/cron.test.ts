import { describe, it, expect, afterEach } from "vitest";
import { isAuthorizedCron } from "@/lib/cron";

function req(auth?: string) {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "authorization" ? auth ?? null : null) },
  } as unknown as Parameters<typeof isAuthorizedCron>[0];
}

const origEnv = process.env.NODE_ENV;
const origSecret = process.env.CRON_SECRET;

afterEach(() => {
  (process.env as Record<string, string | undefined>).NODE_ENV = origEnv;
  process.env.CRON_SECRET = origSecret;
});

describe("isAuthorizedCron", () => {
  it("rejects when no secret is set in production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCron(req())).toBe(false);
  });

  it("allows when no secret is set outside production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCron(req())).toBe(true);
  });

  it("requires a matching bearer token when a secret is set", () => {
    process.env.CRON_SECRET = "s3cret";
    expect(isAuthorizedCron(req("Bearer s3cret"))).toBe(true);
    expect(isAuthorizedCron(req("Bearer wrong"))).toBe(false);
    expect(isAuthorizedCron(req())).toBe(false);
  });
});
