import { requirePersonCredential, requireAppPermission, AppSuspensionCache, requireNotAppSuspended } from "@ecf/core";
import { getCommunityIdentity } from "../communityIdentity.js";

const COMMUNITY_URL = process.env.COMMUNITY_URL ?? "http://localhost:3002";
const suspensionCache = new AppSuspensionCache(COMMUNITY_URL);

/** Verifies a valid community-issued PersonCredential. */
export const requireAuth         = requirePersonCredential(getCommunityIdentity);
export const requireNotSuspended = requireNotAppSuspended("market", suspensionCache);

/** Requires `market: coordinator` permission (implies valid credential + not suspended). */
export const requireCoordinator  = [requireAuth, requireNotSuspended, requireAppPermission("market", "coordinator")];

/** Requires `market: admin` permission (implies valid credential + not suspended). */
export const requireMarketAdmin  = [requireAuth, requireNotSuspended, requireAppPermission("market", "admin")];

/** Base auth + suspension check — use this for standard market routes. */
export const requireMarketAccess = [requireAuth, requireNotSuspended];
