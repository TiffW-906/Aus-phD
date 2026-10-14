// Verifies the Cloudflare Access JWT that Access adds to every request it lets
// through (`Cf-Access-Jwt-Assertion`). Headers alone can be forged when the
// Worker is reached without Access in front, so the signature, audience, issuer
// and expiry are all checked here and anything unexpected fails closed.

export type AccessConfig = {
  teamDomain: string; // e.g. "your-team.cloudflareaccess.com"
  aud: string; // Application Audience (AUD) tag from the Access application
  owners: string[]; // optional email allowlist; empty means any Access-approved user
};

export type AccessUser = { userId: string; email: string };

type Jwk = JsonWebKey & { kid?: string };
type CertFetcher = (url: string) => Promise<{ keys: Jwk[] }>;

const certCache = new Map<string, { keys: Jwk[]; expires: number }>();
const CERT_TTL_MS = 60 * 60 * 1000;

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJson(part: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(part)));
}

export function normalizeTeamDomain(value: string): string {
  return value.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
}

export function parseOwners(value: string | undefined): string[] {
  return (value ?? "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
}

const defaultFetcher: CertFetcher = async url => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Access certs request failed: ${res.status}`);
  return await res.json() as { keys: Jwk[] };
};

async function signingKeys(teamDomain: string, fetcher: CertFetcher, forceRefresh: boolean): Promise<Jwk[]> {
  const cached = certCache.get(teamDomain);
  if (!forceRefresh && cached && cached.expires > Date.now()) return cached.keys;
  const body = await fetcher(`https://${teamDomain}/cdn-cgi/access/certs`);
  const keys = Array.isArray(body?.keys) ? body.keys : [];
  certCache.set(teamDomain, { keys, expires: Date.now() + CERT_TTL_MS });
  return keys;
}

export async function verifyAccessJwt(
  token: string | null,
  config: AccessConfig,
  options: { fetchCerts?: CertFetcher; now?: number } = {},
): Promise<AccessUser | null> {
  if (!token || !config.teamDomain || !config.aud) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = decodeJson(parts[0]);
    const payload = decodeJson(parts[1]);
    if (header.alg !== "RS256" || typeof header.kid !== "string") return null;

    const teamDomain = normalizeTeamDomain(config.teamDomain);
    const fetcher = options.fetchCerts ?? defaultFetcher;
    let jwk = (await signingKeys(teamDomain, fetcher, false)).find(k => k.kid === header.kid);
    // Access rotates keys; refetch once when the kid is unknown.
    if (!jwk) jwk = (await signingKeys(teamDomain, fetcher, true)).find(k => k.kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, base64UrlDecode(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!valid) return null;

    const now = Math.floor((options.now ?? Date.now()) / 1000);
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(config.aud)) return null;
    if (payload.iss !== `https://${teamDomain}`) return null;
    if (typeof payload.exp !== "number" || payload.exp <= now) return null;
    if (typeof payload.nbf === "number" && payload.nbf > now + 60) return null;

    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    const userId = typeof payload.sub === "string" ? payload.sub : "";
    if (!email || !userId) return null;
    if (config.owners.length && !config.owners.includes(email)) return null;
    return { userId, email };
  } catch {
    return null;
  }
}
