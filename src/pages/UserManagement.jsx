import React, { useEffect, useMemo, useState, useCallback } from "react";
import { RefreshCw, Pencil, Trash2, Eye, MessageCircle, UtensilsCrossed } from "lucide-react";
import { collection, doc, getDoc, getDocs, deleteDoc, query, getCountFromServer, where, } from "firebase/firestore";
import { db, functions } from "../firebase";
import { EditUserModal } from "../components/EditUserModal";
import { ViewUserModal } from "../components/ViewUserModal";
import { UserChatHistoryScreen } from "../components/UserChatHistoryScreen";
import { UserDailyMealsScreen } from "../components/UserDailyMealsScreen";
import {
  listRowFromUserDoc,
  subscriptionFieldsFromUserDoc,
  subscriptionStatusLabel,
  subscriptionExpiresLabel,
} from "../lib/userAccountState";
import { toDisplayDate } from "../lib/userDocumentDisplay";
import { useAuthGuard } from "../hooks/useAuthGuard";
import Affiliate from "./Affiliate";
import { useSelector } from "react-redux";
import { httpsCallable } from "firebase/functions";

function mapUserDocument(docSnap) {
  const d = docSnap.data() || {};
  return { ...listRowFromUserDoc(d, docSnap.id), _raw: d };
}
function mapAffiliateDocument(docSnap) {
  const d = docSnap.data() || {};
  return {
    id: docSnap.id,
    name: d.name || "",
    email: d.email || "",
    commissionAmount: d.commissionAmount || "",
    status: d.status || "",
    affiliateCode: d.affiliateCode || "",
    branchLink: d.branchLink || "",
    _raw: d,

    availableBalance: d.availableBalance || 0,
    paidBalance: d.paidBalance || 0,
    totalEarned: d.totalEarned || 0,
    payoutRequestStatus: d.payoutRequestStatus || "",
    payoutRequestId: d.payoutRequestId || "",
  };
}
const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
    match /users/{userId}/food_chat_logs/{dateId}/messages/{messageId} {
      allow read: if request.auth != null;
    }
  }
}`;
const TABS = [
  { key: "user", label: "User Management" },
  { key: "affiliate", label: "Affiliate User" },
];

const UserManagement = () => {
  useAuthGuard()//i'm here
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [users, setUsers] = useState([]);
  const [affiliatesLoading, setAffiliatesLoading] = useState(false);
  const [affiliatesError, setAffiliatesError] = useState(null);
  const [affiliates, setAffiliates] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [editDetail, setEditDetail] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);
  const [chatUser, setChatUser] = useState(null);
  const [mealsUser, setMealsUser] = useState(null);
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("user");
  const { user } = useSelector((state) => state.auth);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      setPermissionDenied(false);
      const snap = await getDocs(collection(db, "users"));
      const rows = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const logsRef = collection(db, "users", docSnap.id, "daily_logs");
          const logsSnap = await getCountFromServer(logsRef);
          const logsCount = logsSnap.data().count;

          // ✅ Current month avg meals
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth() + 1; // 1-based

          const allLogs = await getDocs(logsRef);
          let totalMeals = 0;
          let daysWithMeals = 0;

          await Promise.all(
            allLogs.docs
              .filter((logDoc) => {
                // Filter current month docs (format: "2026-6-1" or "2026-06-01")
                const parts = logDoc.id.split("-");
                return Number(parts[0]) === year && Number(parts[1]) === month;
              })
              .map(async (logDoc) => {
                const mealsRef = collection(
                  db, "users", docSnap.id, "daily_logs", logDoc.id, "meals"
                );
                const mealsSnap = await getCountFromServer(mealsRef);
                const count = mealsSnap.data().count;
                if (count > 0) {
                  totalMeals += count;
                  daysWithMeals++;
                }
              })
          );

          // const avgMeals = daysWithMeals > 0
          //   ? (totalMeals / daysWithMeals).toFixed(1)
          //   : "0";

          // change to (elapsed days)
          const elapsedDays = now.getDate();
          const avgMeals = elapsedDays > 0
            ? (totalMeals / elapsedDays).toFixed(1)
            : "0";

          const row = mapUserDocument(docSnap);
          return {
            ...row,
            dailyLogsCount: logsCount,
            avgMealsPerDay: avgMeals,     // ✅ e.g. "2.5"
            totalMealsThisMonth: totalMeals,
            activeDaysThisMonth: daysWithMeals,
          };
        })
      );
      // const rows = snap.docs.map(mapUserDocument);
      setUsers(rows);
    } catch (err) {
      console.error("Firestore users read error:", err);
      if (err?.code === "permission-denied") {
        setPermissionDenied(true);
        setFetchError(null);
        console.info(
          "Fix: Firebase Console → Firestore Database → Rules — allow authenticated reads on `users`. Example:\n" +
          FIRESTORE_RULES_SNIPPET
        );
      } else {
        setFetchError(err?.message || "Failed to load users.");
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);
  const fetchAffiliates = useCallback(async () => {
    setAffiliatesLoading(true);
    setAffiliatesError(null);
    try {
      const snap = await getDocs(collection(db, "affiliates"));
      const rows = snap.docs.map(mapAffiliateDocument);
      setAffiliates(rows);
    } catch (err) {
      setAffiliatesError(err?.message || "Failed to load affiliates.");
      setAffiliates([]);
    } finally {
      setAffiliatesLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchAffiliates();
  }, [fetchAffiliates]);

  const filteredUsers = useMemo(() => {
    let list = users && users.length > 0 ? users : [];
    if (filter === "active") list = list.filter((u) => u.status === "active");
    if (filter === "inactive") list = list.filter((u) => u.status === "inactive");
    if (!searchValue.trim()) return list;
    const q = searchValue.toLowerCase();
    return list.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [users, searchValue, filter]);

  const filteredAffiliates = useMemo(() => {
    let list = affiliates && affiliates.length > 0 ? affiliates : [];
    if (!searchValue.trim()) return list;
    const q = searchValue.toLowerCase();
    return list.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [affiliates, searchValue]);

  const handleAccountUpdated = (updated) => {
    const row = listRowFromUserDoc(updated, updated.id);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...row, _raw: updated } : u)));
    setViewDetail((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
  };

  const handleCloseEditModal = () => {
    setEditDetail(null);
  };

  const handleCloseViewModal = () => {
    setViewDetail(null);
  };

  const handleCloseChat = () => {
    setChatUser(null);
  };

  const loadFullUserDocument = async (user) => {
    const ref = doc(db, "users", user.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data() || {};
    return { id: snap.id, ...data };
  };

  const handleView = async (user) => {
    setLoading(true);
    try {
      const full = await loadFullUserDocument(user);
      if (!full) {
        alert("User document not found.");
        return;
      }
      setEditDetail(null);
      setChatUser(null);
      setMealsUser(null);
      setViewDetail(full);
    } catch (err) {
      alert(err?.message || "Could not load user.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (user) => {
    setLoading(true);
    try {
      const full = await loadFullUserDocument(user);
      if (!full) {
        alert("User document not found.");
        return;
      }
      setViewDetail(null);
      setChatUser(null);
      setMealsUser(null);
      setEditDetail(full);
    } catch (err) {
      console.error("[Edit] getDoc error:", err);
      alert(err?.message || "Could not load user.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = (user) => {
    setEditDetail(null);
    setViewDetail(null);
    setMealsUser(null);
    setChatUser({ id: user.id, name: user.name, email: user.email });
  };

  const handleOpenMeals = (user) => {
    setEditDetail(null);
    setViewDetail(null);
    setChatUser(null);
    setMealsUser({ id: user.id, name: user.name, email: user.email });
  };

  const handleCloseMeals = () => setMealsUser(null);

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.name}" (${user.email})? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "users", user.id));
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      if (editDetail?.id === user.id) setEditDetail(null);
      if (viewDetail?.id === user.id) setViewDetail(null);
      if (chatUser?.id === user.id) setChatUser(null);
      if (mealsUser?.id === user.id) setMealsUser(null);
    } catch (err) {
      console.error("[Delete] error:", err);
      alert(err?.message || "Delete failed. Add `allow delete` in Firestore rules for `users`.");
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteAffiliate = async (user) => {
    if (!window.confirm(`Delete affiliate "${user.name}" (${user.email})? This cannot be undone.`)) return;
    setAffiliatesLoading(true);
    try {
      await deleteDoc(doc(db, "affiliates", user.id));
      setAffiliates((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      console.error("[Delete Affiliate] error:", err);
      alert(err?.message || "Delete failed. Add `allow delete` in Firestore rules for `affiliates`.");
    } finally {
      setAffiliatesLoading(false);
    }
  };
  const handlePayoutRequest = async (affiliateId, requestId, action) => {
    try {
      const respondAffiliatePayoutRequest = httpsCallable(
        functions,
        "respondAffiliatePayoutRequest"
      );
      const result = await respondAffiliatePayoutRequest({
        affiliateId,
        requestId,
        action,
      });

      await fetchAffiliates();
    } catch (error) {
      console.error(error);
    }
  };
  if (user?.role == "admin") {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{activeTab === "user" ? "User Management " : "Affiliate User"}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchUsers()
                fetchAffiliates()
              }}
              disabled={loading}
              className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh"
            >
              <RefreshCw size={18} /> Refresh
            </button>
          </div>
        </div>

        {permissionDenied && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-950 px-4 py-3 rounded-lg text-sm space-y-2">
            <p className="font-semibold">Firestore: Missing or insufficient permissions</p>
            <pre className="text-xs bg-white border border-amber-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-gray-800">
              {FIRESTORE_RULES_SNIPPET}
            </pre>
          </div>
        )}
        {fetchError && !permissionDenied && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {fetchError}
          </div>
        )}
        {/* Tab bar */}
        <div className="border-b border-gray-200 px-4">
          <div className="flex items-center gap-6">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setSearchValue("")
                  setActiveTab(tab.key)
                }}
                className={`relative py-3 text-sm font-medium transition ${activeTab === tab.key
                  ? "text-indigo-600"
                  : "text-gray-600 hover:text-gray-800"
                  }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute left-0 -bottom-px h-0.5 w-full bg-indigo-600 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
        {activeTab === "user" ? <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full md:max-w-md border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${filter === "all" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("active")}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${filter === "active" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter("inactive")}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${filter === "inactive" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Inactive
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">#</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">Name</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">Email</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">Subscription</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">Expires at</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">Avg meals</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">Last login</th>
                  <th className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length > 0 ? (
                  filteredUsers.filter((item) => item._raw?.role !== "admin").map((user, index) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">{user.name || "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email || "—"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${user.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                            }`}
                        >
                          {user.status || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          // const label = subscriptionStatusLabel(user.isSubscribed);
                          const label = user?.subscriptionStatus
                          const pill =
                            label === "Active"
                              ? "bg-emerald-100 text-emerald-800"
                              : label === "Expired"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-600";
                          return (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${pill}`}>{label}</span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {subscriptionExpiresLabel(user.subscriptionExpiresAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {user.avgMealsPerDay || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {user.lastLogin || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleEdit(user)}
                            disabled={loading}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-50"
                            title="Edit"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenChat(user)}
                            disabled={loading}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-50"
                            title="Chat history (user ↔ assistant)"
                          >
                            <MessageCircle size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenMeals(user)}
                            disabled={loading}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition disabled:opacity-50"
                            title="Daily log meals"
                          >
                            <UtensilsCrossed size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleView(user)}
                            disabled={loading}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
                            title="View details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            disabled={loading}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm">
                      {loading ? "Loading…" : "No users in Firestore collection `users`."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div> : <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full md:max-w-md border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">#</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">Names</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">Email</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">Commission</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">Code</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">Branch Link</th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAffiliates.length > 0 ? (
                  filteredAffiliates.filter((item) => item._raw?.role !== "admin").map((user, index) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">{user.name || "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email || "—"}</td>
                      <td className="px-6 py-4 text-sm  text-gray-800">${user.commissionAmount || "0"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${user.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                            }`}
                        >
                          {user.status || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {user.affiliateCode || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-indigo-600">
                        {user.branchLink ? (
                          <a
                            href={user.branchLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline break-all"
                          >
                            {user.branchLink}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-start gap-1 flex-wrap">
                          <button
                            onClick={() =>
                              handlePayoutRequest(
                                user.id,
                                user.payoutRequestId,
                                "ACCEPT"
                              )
                            }
                          >
                            Accept
                          </button>

                          <button
                            onClick={() =>
                              handlePayoutRequest(
                                user.id,
                                user.payoutRequestId,
                                "REJECT"
                              )
                            }
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAffiliate(user)}
                            disabled={affiliatesLoading}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                      {affiliatesLoading ? "Loading…" : "No affiliates in Firestore collection `affiliates`."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>}

        {viewDetail && (
          <ViewUserModal
            detail={viewDetail}
            onClose={handleCloseViewModal}
            onAccountUpdated={handleAccountUpdated}
          />
        )}

        {chatUser && (
          <UserChatHistoryScreen user={chatUser} onClose={handleCloseChat} />
        )}

        {mealsUser && (
          <UserDailyMealsScreen user={mealsUser} onClose={handleCloseMeals} />
        )}

        {editDetail && (
          <EditUserModal
            detail={editDetail}
            onClose={handleCloseEditModal}
            onSaved={(updated) => {
              setUsers((prev) =>
                prev.map((u) => (u.id === updated.id ? updated : u))
              );
            }}
          />
        )}
      </div>
    );
  } else {
    // here  Affiliate
    return <Affiliate />
  }

};

export default UserManagement;
