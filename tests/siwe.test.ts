import { describe, it, expect } from "vitest";
import { buildSiweMessage, parseSiweMessage } from "@/lib/siwe";

const fields = {
  domain: "localhost:3000",
  address: "0xAbC0000000000000000000000000000000000001",
  uri: "http://localhost:3000",
  chainId: 5042002,
  nonce: "abc123",
  issuedAt: new Date().toISOString(),
  expirationTime: new Date(Date.now() + 600000).toISOString(),
};

describe("SIWE message", () => {
  it("builds and parses round-trip", () => {
    const msg = buildSiweMessage(fields);
    const parsed = parseSiweMessage(msg);
    expect(parsed?.address).toBe(fields.address);
    expect(parsed?.nonce).toBe("abc123");
    expect(parsed?.expirationTime).toBe(fields.expirationTime);
  });

  it("rejects malformed messages", () => {
    expect(parseSiweMessage("just some text")).toBeNull();
    expect(parseSiweMessage("")).toBeNull();
  });
});
