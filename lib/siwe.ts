// Minimal SIWE (EIP-4361-style) message builder + parser. The server builds
// the exact message the wallet signs, so it can reconstruct and validate it.

export interface SiweFields {
  domain: string;
  address: string;
  uri: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
}

const STATEMENT = "Sign in to FPI — Football Performance Index. This request will not trigger a blockchain transaction or cost any gas.";

export function buildSiweMessage(f: SiweFields): string {
  return [
    `${f.domain} wants you to sign in with your Ethereum account:`,
    f.address,
    "",
    STATEMENT,
    "",
    `URI: ${f.uri}`,
    "Version: 1",
    `Chain ID: ${f.chainId}`,
    `Nonce: ${f.nonce}`,
    `Issued At: ${f.issuedAt}`,
    `Expiration Time: ${f.expirationTime}`,
  ].join("\n");
}

export interface ParsedSiwe {
  domain: string;
  address: string;
  uri: string;
  chainId: number;
  nonce: string;
  expirationTime: string;
}

export function parseSiweMessage(message: string): ParsedSiwe | null {
  const lines = message.split("\n");
  const domain = lines[0]?.match(/^(.+) wants you to sign in with your Ethereum account:$/)?.[1]?.trim();
  const address = lines[1]?.trim();
  const uri = message.match(/^URI: (.+)$/m)?.[1]?.trim();
  const chainIdRaw = message.match(/^Chain ID: (\d+)$/m)?.[1];
  const nonce = message.match(/^Nonce: (.+)$/m)?.[1]?.trim();
  const expirationTime = message.match(/^Expiration Time: (.+)$/m)?.[1]?.trim();

  if (
    !domain ||
    !address ||
    !/^0x[a-fA-F0-9]{40}$/.test(address) ||
    !uri ||
    !chainIdRaw ||
    !nonce ||
    !expirationTime
  ) {
    return null;
  }
  return { domain, address, uri, chainId: Number(chainIdRaw), nonce, expirationTime };
}
