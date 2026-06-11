import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bot, MessageSquare, RefreshCw, User } from "lucide-react";
import { collection, collectionGroup, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

function tsMillis(msg) {
  const ts = msg.timestamp ?? msg.createdAt;
  if (ts == null) return 0;
  if (typeof ts.toDate === "function") {
    try {
      return ts.toDate().getTime();
    } catch {
      return 0;
    }
  }
  const s = ts.seconds;
  return typeof s === "number" ? s * 1000 : 0;
}

function formatTs(ts) {
  if (ts == null) return "";
  if (typeof ts === "object" && ts !== null && typeof ts.toDate === "function") {
    try {
      return ts.toDate().toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
    } catch {
      return "";
    }
  }
  const s = /** @type {{ seconds?: number }} */ (ts).seconds;
  if (typeof s === "number") {
    return new Date(s * 1000).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  }
  return "";
}

/** @param {unknown} role */
function isUserRole(role) {
  const r = String(role ?? "").toLowerCase();
  return r === "user" || r === "human" || r === "customer";
}

/**
 * Firestore folder id exactly as listed under food_chat_logs.
 */
async function loadMessagesForExactFolder(userId, folderId) {
  const messagesRef = collection(db, "users", userId, "food_chat_logs", folderId, "messages");
  let snapshot;
  try {
    snapshot = await getDocs(query(messagesRef, orderBy("timestamp", "asc")));
  } catch {
    try {
      snapshot = await getDocs(query(messagesRef, orderBy("timestamp")));
    } catch {
      snapshot = await getDocs(messagesRef);
    }
  }
  const rows = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    dateKey: folderId,
    ...docSnap.data(),
  }));
  rows.sort((a, b) => tsMillis(a) - tsMillis(b));
  return rows;
}

function addDays(base, deltaDays) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + deltaDays);
  return d;
}

/** Pichle N din — `2026-5-14` aur `2026-05-14` dono folder ids (listing fail hone par). */
function folderIdsFromCalendarScan(daysBack = 120) {
  const ids = [];
  const seen = new Set();
  const now = new Date();
  for (let i = 0; i <= daysBack; i++) {
    const d = addDays(now, -i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const a = `${y}-${m}-${day}`;
    const b = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (!seen.has(a)) {
      seen.add(a);
      ids.push(a);
    }
    if (!seen.has(b)) {
      seen.add(b);
      ids.push(b);
    }
  }
  return ids;
}

function dedupePush(all, seen, rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const k = `${row.dateKey}_${row.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    all.push(row);
  }
}

/** collectionGroup — jab food_chat_logs list blocked ho lekin messages read ho. */
async function loadFoodChatViaCollectionGroup(userId) {
  const snap = await getDocs(collectionGroup(db, "messages"));
  const prefix = `users/${userId}/food_chat_logs/`;
  const rows = [];
  for (let i = 0; i < snap.docs.length; i++) {
    const docSnap = snap.docs[i];
    const path = docSnap.ref.path;
    if (!path.startsWith(prefix)) continue;
    const parts = path.split("/");
    const ix = parts.indexOf("food_chat_logs");
    const dateKey = ix >= 0 ? parts[ix + 1] : "";
    rows.push({
      id: docSnap.id,
      dateKey,
      ...docSnap.data(),
    });
  }
  rows.sort((a, b) => tsMillis(a) - tsMillis(b));
  return rows;
}

/** Saari din folders → saare messages, timestamp se sort.
 * Listing ∪ calendar scan merge, chunked parallel reads.
 */
async function loadAllFoodChatMessages(userId) {
  let keysFromList = [];
  try {
    const logsSnap = await getDocs(collection(db, "users", userId, "food_chat_logs"));
    keysFromList = logsSnap.docs.map((d) => d.id);
  } catch (e) {
    console.warn("[food chat] food_chat_logs list:", e);
  }

  const scanIds = folderIdsFromCalendarScan(120);
  const foldersToLoad = [...new Set([...keysFromList, ...scanIds])];

  let loadSource =
    keysFromList.length > 0 ? "merged_list_plus_calendar_120d" : "calendar_scan_120d";

  console.info("[food chat] first load folders:", {
    listedFolders: keysFromList.length,
    calendarCandidates: scanIds.length,
    uniqueFoldersToQuery: foldersToLoad.length,
  });

  const all = [];
  const seen = new Set();

  const CHUNK = 16;
  for (let i = 0; i < foldersToLoad.length; i += CHUNK) {
    const slice = foldersToLoad.slice(i, i + CHUNK);
    const batches = await Promise.all(slice.map((fid) => loadMessagesForExactFolder(userId, fid)));
    for (let j = 0; j < batches.length; j++) {
      dedupePush(all, seen, batches[j]);
    }
  }

  all.sort((a, b) => tsMillis(a) - tsMillis(b));

  if (all.length === 0) {
    console.info("[food chat] folders se khali — collectionGroup(messages) try…");
    try {
      const cgRows = await loadFoodChatViaCollectionGroup(userId);
      dedupePush(all, seen, cgRows);
      all.sort((a, b) => tsMillis(a) - tsMillis(b));
      if (all.length > 0) loadSource = `${loadSource}+collection_group`;
    } catch (e) {
      console.warn("[food chat] collectionGroup:", e);
    }
  }

  const uniqueDates = new Set(all.map((m) => String(m.dateKey ?? m.date ?? "")).filter(Boolean));

  return {
    messages: all,
    dateFolderCount: uniqueDates.size,
  };
}

/** @param {unknown} err */
function getFriendlyFoodChatError(err) {
  const code = /** @type {{ code?: string; message?: string }} */ (err)?.code ?? "";
  const msg = String(/** @type {{ message?: string }} */ (err)?.message ?? err ?? "");

  if (code === "permission-denied" || /permission|insufficient/i.test(msg)) {
    return {
      title: "Unable to load chat history",
      detail:
        "You do not have permission to view this user's messages. Contact an administrator if you need access.",
    };
  }
  if (code === "unavailable" || /network|offline|fetch/i.test(msg)) {
    return {
      title: "Connection problem",
      detail: "Check your internet connection and tap Refresh to try again.",
    };
  }
  if (code === "failed-precondition" || /index/i.test(msg)) {
    return {
      title: "Unable to load chat history",
      detail: "Chat history is temporarily unavailable. Please try again later or contact support.",
    };
  }
  return {
    title: "Something went wrong",
    detail: "We could not load the chat history. Tap Refresh to try again.",
  };
}

function FoodChatEmptyState({ title, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-dashed border-slate-300 bg-white/90">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <MessageSquare size={28} strokeWidth={1.5} />
      </div>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

/** @param {Record<string, unknown> | undefined} nd */
function NutritionSnippet({ nd }) {
  if (!nd || typeof nd !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (nd);
  const parts = [];
  if (o.name != null) parts.push(String(o.name));
  if (o.meal_type != null) parts.push(String(o.meal_type));
  if (o.protein_g != null) parts.push(`P ${o.protein_g}g`);
  if (o.carbs_g != null) parts.push(`C ${o.carbs_g}g`);
  if (o.fat_g != null) parts.push(`F ${o.fat_g}g`);
  if (parts.length === 0) return null;
  return (
    <div className="mt-2 rounded-lg bg-emerald-50/90 border border-emerald-100 px-3 py-2 text-xs text-emerald-900">
      <span className="font-semibold text-emerald-800">Nutrition</span>
      <span className="text-emerald-700"> · {parts.join(" · ")}</span>
    </div>
  );
}

/**
 * Poori food chat history — saari dates, chat-style bubbles.
 *
 * @param {{ id: string; name?: string; email?: string }} user
 */
export const UserChatHistoryScreen = ({ user, onClose }) => {
  const userId = user?.id;
  const [messages, setMessages] = useState([]);
  const [dateFolderCount, setDateFolderCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {{ title: string; detail?: string } | null} */ (null));
  const scrollRef = useRef(null);

  const title = useMemo(
    () => String(user?.name || user?.email || "User").trim() || "User",
    [user?.name, user?.email]
  );

  const loadAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { messages: rows, dateFolderCount: fc } = await loadAllFoodChatMessages(userId);
      setMessages(rows);
      setDateFolderCount(fc);
    } catch (e) {
      console.error("Error loading food chat:", e);
      setError(getFriendlyFoodChatError(e));
      setMessages([]);
      setDateFolderCount(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const messagesWithDividers = useMemo(() => {
    let prev = "";
    return messages.map((msg) => {
      const dk = String(msg.dateKey ?? msg.date ?? "");
      const showDayChip = Boolean(dk && dk !== prev);
      if (dk) prev = dk;
      return { msg, dk, showDayChip };
    });
  }, [messages]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#e8eef2]">
      <header className="shrink-0 border-b border-slate-200/90 bg-white shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 min-h-[3.25rem]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
          >
            <ArrowLeft size={18} className="text-slate-500" />
            <span className="hidden sm:inline text-sm font-medium">Back</span>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
              {title}
              <span className="font-normal text-slate-500"> · Food chat</span>
              {!loading && messages.length > 0 && (
                <span className="font-normal text-slate-400">
                  {" "}
                  · {messages.length} messages · {dateFolderCount} {dateFolderCount === 1 ? "day" : "days"}
                </span>
              )}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => loadAll()}
            disabled={loading}
            aria-label="Refresh"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
          >
            <RefreshCw size={18} className={loading ? "animate-spin text-emerald-600" : "text-slate-500"} />
            <span className="hidden sm:inline text-sm font-medium">Refresh</span>
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4">
        <div className="mx-auto max-w-2xl pb-16">
          {error && !loading && (
            <FoodChatEmptyState title={error.title}>
              <p className="mt-2 max-w-sm text-sm text-slate-600">{error.detail}</p>
            </FoodChatEmptyState>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="h-9 w-9 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
              <p className="text-sm text-slate-500">Loading chat history…</p>
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <FoodChatEmptyState title="No chat history yet">
              <p className="mt-2 max-w-sm text-sm text-slate-600">
                This user has not logged any food conversations in the app, or their history is not available.
              </p>
            </FoodChatEmptyState>
          )}

          {!loading && messages.length > 0 && (
            <ul className="flex flex-col gap-3">
              {messagesWithDividers.map(({ msg, dk, showDayChip }) => {
                const fromUser = isUserRole(msg.role);
                const when = formatTs(msg.timestamp);
                const body = String(msg.content ?? msg.text ?? "—");

                const rt = msg.responseType != null ? String(msg.responseType) : "";

                return (
                  <React.Fragment key={`${dk}_${msg.id}`}>
                    {showDayChip && (
                      <li className="flex justify-center py-2">
                        <span className="rounded-full bg-slate-200/90 text-slate-600 text-[11px] font-medium px-3 py-1">
                          {dk}
                        </span>
                      </li>
                    )}
                    <li className={`flex w-full ${fromUser ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`flex max-w-[min(100%,420px)] gap-2 ${fromUser ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div
                          className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-full shadow-sm ${
                            fromUser ? "bg-indigo-600 text-white" : "bg-white text-emerald-700 border border-slate-200"
                          }`}
                        >
                          {fromUser ? <User size={18} /> : <Bot size={18} />}
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-3 shadow-md ${
                            fromUser
                              ? "rounded-tr-sm bg-indigo-600 text-white"
                              : "rounded-tl-sm bg-white text-slate-800 border border-slate-200/90"
                          }`}
                        >
                          <div
                            className={`flex flex-wrap items-center gap-2 text-xs font-medium mb-1 ${
                              fromUser ? "text-indigo-100" : "text-slate-500"
                            }`}
                          >
                            <span>{fromUser ? "User" : "Assistant"}</span>
                            {when ? (
                              <span className={fromUser ? "text-indigo-200" : "text-slate-400"}>· {when}</span>
                            ) : null}
                            {!fromUser && rt && (
                              <span className="rounded bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[10px] font-mono">
                                {rt}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
                              fromUser ? "text-white" : "text-slate-800"
                            }`}
                          >
                            {body}
                          </p>
                          {!fromUser && <NutritionSnippet nd={msg.nutritionData} />}
                        </div>
                      </div>
                    </li>
                  </React.Fragment>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
