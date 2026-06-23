// Admin (deployer) gating. The admin wallet is the FootballIPO owner — only it
// can open new presales on-chain (createSale is onlyOwner) and persist listing
// metadata. Set NEXT_PUBLIC_ADMIN_ADDRESS to the deployer address.

export const ADMIN_ADDRESS = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS || "").toLowerCase();

export function isAdminWallet(address?: string | null): boolean {
  if (!ADMIN_ADDRESS || !address) return false;
  return address.toLowerCase() === ADMIN_ADDRESS;
}
