import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { normalizeTeamDomain, parseOwners, verifyAccessJwt, type AccessUser } from "./access";

export type User = AccessUser;

// Cloudflare Access sits in front of the whole site and signs every request it
// lets through. The Worker re-verifies that signature before trusting the email.
const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";
const LOCAL_USER: User = { userId: "local-dev", email: "local@dev.test" };

export async function getUser(): Promise<User | null> {
  // `vinext dev` has no Access in front of it; use a fixed local identity.
  if (import.meta.env.DEV) return LOCAL_USER;
  const requestHeaders = await headers();
  return verifyAccessJwt(requestHeaders.get(ACCESS_JWT_HEADER), {
    teamDomain: normalizeTeamDomain(env.ACCESS_TEAM_DOMAIN ?? ""),
    aud: env.ACCESS_AUD ?? "",
    owners: parseOwners(env.OWNER_EMAILS),
  });
}
