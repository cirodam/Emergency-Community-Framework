import { requirePersonCredential, requireAppPermission, AppSuspensionCache, requireNotAppSuspended } from "@ecf/core";
import { getCommunityIdentity } from "../communityIdentity.js";

const COMMUNITY_URL = process.env.COMMUNITY_URL ?? "http://localhost:3002";
const suspensionCache = new AppSuspensionCache(COMMUNITY_URL);

/** Verifies a valid community-issued PersonCredential. */
export const requireAuth         = requirePersonCredential(getCommunityIdentity);
export const requireNotSuspended = requireNotAppSuspended("mail", suspensionCache);

/** Requires `mail: moderator` permission (implies valid credential). */
export const requireModerator = [requireAuth, requireNotSuspended, requireAppPermission("mail", "moderator")];

/** Base auth + suspension check — use for standard mail routes. */
export const requireMailAccess = [requireAuth, requireNotSuspended];
