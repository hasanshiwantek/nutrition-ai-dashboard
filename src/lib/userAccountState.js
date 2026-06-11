import { toDisplayDate } from "./userDocumentDisplay";

/**
 * Active = not suspended and status is not "inactive".
 * @param {Record<string, unknown> | null | undefined} doc
 */export function isUserAccountActive(doc) {
  if (doc?.isSuspended === true) return false;
  const status = String(doc?.status ?? "active").toLowerCase();
  return status !== "inactive";
}

/** @param {boolean} active */
export function accountFieldsForActive(active) {
  return {
    status: active ? "active" : "inactive",
    isSuspended: !active,
  };
}

/** @param {Record<string, unknown>} doc @param {string[]} keys */
function pickFirstDefined(doc, keys) {
  for (const key of keys) {
    const v = doc?.[key];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

/** Subscription / trial fields from Firestore user doc (supports typo field names). */
export function subscriptionFieldsFromUserDoc(doc) {
  return {
    trialUsed: doc?.trialUsed,
    subscriptionExpiresAt: doc?.subscriptionExpiresAt,
    isSubscribed: doc?.isSubscribed,
    subscriptionPlanId: pickFirstDefined(doc, ["subscriptionPlanId", "subscripionPlanId"]),
    subscriptionPlanName: pickFirstDefined(doc, ["subscriptionPlanName", "subscripionPlanName"]),
  };
}

/** @param {unknown} isSubscribed */
export function subscriptionStatusLabel(isSubscribed) {
  if (isSubscribed === true) return "Active";
  if (isSubscribed === false) return "Expired";
  return "No";
}

/** @param {unknown} expiresAt */
export function subscriptionExpiresLabel(expiresAt) {
  const formatted = toDisplayDate(expiresAt);
  if (formatted) return formatted;
  if (expiresAt != null && expiresAt !== "") return String(expiresAt);
  return "No";
}

/** @param {Record<string, unknown>} doc */
export function listRowFromUserDoc(doc, id) {

  // ✅ Last login days ago
  let lastLoginDaysAgo = "N/A";
  if (doc.lastActive) {
    const lastActiveMs = (doc.lastActive.seconds || doc.lastActive._seconds) * 1000;
    const diffMs = Date.now() - lastActiveMs;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    lastLoginDaysAgo = days === 0 ? "Today" : days === 1 ? "1 day ago" : `${days} days ago`;
  }

  const active = isUserAccountActive(doc);
  const fields = accountFieldsForActive(active);
  return {
    id,
    name: doc.name ?? doc.displayName ?? doc.fullName ?? "—",
    email: doc.email ?? "—",
    status: fields.status,
    isSuspended: fields.isSuspended,
    lastLogin: lastLoginDaysAgo,
    ...subscriptionFieldsFromUserDoc(doc),
  };
}
