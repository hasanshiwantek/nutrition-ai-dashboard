import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const DATE_ID_RE = /^\d{4}-\d{1,2}-\d{1,2}$/;

/** @param {string} dateKey */
export function parseDateKeyToDate(dateKey) {
  const m = String(dateKey).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateKey(id) {
  const d = parseDateKeyToDate(id);
  return d ? d.getTime() : 0;
}

/** @param {string} dateKey e.g. "May 14, 2026" */
export function formatDateKeyForDisplay(dateKey) {
  const d = parseDateKeyToDate(dateKey);
  if (!d) return String(dateKey ?? "—");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** @param {string} dateKey @param {number} days inclusive calendar days ending today */
export function isDateKeyWithinLastNDays(dateKey, days) {
  const d = parseDateKeyToDate(dateKey);
  if (!d || days < 1) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  return d.getTime() >= start.getTime() && d.getTime() <= today.getTime();
}

/** @param {string} dateKey */
function compareDateKeysDesc(a, dateKey) {
  return parseDateKey(dateKey) - parseDateKey(a);
}

/**
 * users/{userId}/daily_logs/{dateKey}/meals/{mealId}
 */
export async function loadAllUserDailyLogMeals(userId) {
  console.info("[daily_log meals] START", { userId });

  let dateKeys = [];
  try {
    const dailyLogsSnap = await getDocs(collection(db, "users", userId, "daily_logs"));
    dateKeys = dailyLogsSnap.docs.map((d) => d.id).filter((id) => DATE_ID_RE.test(id));
    dateKeys.sort((a, b) => compareDateKeysDesc(a, b));
    console.info("[daily_log meals] date folders:", dateKeys);
  } catch (e) {
    console.error("[daily_log meals] list daily_logs:", e);
    throw e;
  }

  const all = [];
  const byDate = {};

  for (const dateKey of dateKeys) {
    const path = `users/${userId}/daily_logs/${dateKey}/meals`;
    let snap;
    try {
      snap = await getDocs(collection(db, "users", userId, "daily_logs", dateKey, "meals"));
    } catch (e) {
      console.warn(`[daily_log meals] ${path}:`, e);
      continue;
    }

    const rows = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      dateKey,
      ...docSnap.data(),
    }));

    if (rows.length > 0) {
      byDate[dateKey] = rows;
      for (const row of rows) all.push(row);
    }
  }

  all.sort((a, b) => {
    const d = compareDateKeysDesc(a.dateKey, b.dateKey);
    if (d !== 0) return d;
    return String(a.time ?? "").localeCompare(String(b.time ?? ""));
  });

  console.log("[daily_log meals] SUMMARY", {
    userId,
    totalMeals: all.length,
    daysWithMeals: dateKeys.filter((k) => byDate[k]?.length).length,
    dates: Object.keys(byDate),
  });
  console.log("[daily_log meals] flat list:", all);

  return {
    meals: all,
    byDate,
    dateKeys: Object.keys(byDate).sort((a, b) => compareDateKeysDesc(a, b)),
    dateFolderCount: Object.keys(byDate).length,
  };
}
