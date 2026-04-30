import { requirePersonCredential, requireAppPermission, AppSuspensionCache, requireNotAppSuspended } from "@ecf/core";
import { getCommunityIdentity } from "../communityIdentity.js";

const COMMUNITY_URL = process.env.COMMUNITY_URL ?? "http://localhost:3002";
const suspensionCache = new AppSuspensionCache(COMMUNITY_URL);

/** Verifies a valid community-issued PersonCredential. */
export const requireAuth         = requirePersonCredential(getCommunityIdentity);
export const requireNotSuspended = requireNotAppSuspended("bank", suspensionCache);

/** Requires `bank: teller` permission (implies valid credential + not suspended). */
export const requireTeller    = [requireAuth, requireNotSuspended, requireAppPermission("bank", "teller")];

/** Requires `bank: admin` permission (implies valid credential + not suspended). */
export const requireBankAdmin = [requireAuth, requireNotSuspended, requireAppPermission("bank", "admin")];

/** Base auth + suspension check — use this for standard bank routes. */
export const requireBankAccess = [requireAuth, requireNotSuspended];
