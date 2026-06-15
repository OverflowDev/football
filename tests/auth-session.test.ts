import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "@/lib/auth-session";

describe("auth session (signed cookie)", () => {
  it("round-trips a valid session", () => {
    const token = signSession({ uid: "user_1", address: "0xABC0000000000000000000000000000000000001" });
    const payload = verifySession(token);
    expect(payload?.uid).toBe("user_1");
    expect(payload?.address).toBe("0xabc0000000000000000000000000000000000001");
  });

  it("rejects a tampered token", () => {
    const token = signSession({ uid: "user_1", address: "0x1" });
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(verifySession(tampered)).toBeNull();
  });

  it("rejects a spoofed/garbage cookie", () => {
    expect(verifySession("not-a-real-token")).toBeNull();
    expect(verifySession("")).toBeNull();
    expect(verifySession(undefined)).toBeNull();
  });

  it("rejects an expired session", () => {
    const token = signSession({ uid: "user_1", address: "0x1" }, -10);
    expect(verifySession(token)).toBeNull();
  });
});
