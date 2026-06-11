import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { formatFieldValue, getPreviewKeys, formatFieldLabel } from "../lib/userDocumentDisplay";
import { accountFieldsForActive, isUserAccountActive } from "../lib/userAccountState";

/**
 * Full-screen read-only user document with activate / deactivate.
 * @param {{ id: string } & Record<string, unknown>} detail
 * @param {() => void} onClose
 * @param {(updated: { id: string } & Record<string, unknown>) => void} [onAccountUpdated]
 */
export const ViewUserModal = ({ detail: detailProp, onClose, onAccountUpdated }) => {
  const [detail, setDetail] = useState(detailProp);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setDetail(detailProp);
  }, [detailProp]);

  const docId = detail?.id;
  const displayName = String(detail?.name ?? detail?.displayName ?? "User details");
  const isActive = isUserAccountActive(detail);

  const rowKeys = useMemo(() => {
    if (!docId) return [];
    const rest = getPreviewKeys(detail).filter((k) => k !== "id");
    return ["id", ...rest];
  }, [detail, docId]);

  useEffect(() => {
    if (docId) console.log("[ViewUserScreen] full user document:", detail);
  }, [detail, docId]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleToggleAccount = async () => {
    if (!docId || toggling) return;
    const nextActive = !isActive;
    const patch = accountFieldsForActive(nextActive);
    setToggling(true);
    try {
      await updateDoc(doc(db, "users", docId), patch);
      const updated = { ...detail, ...patch };
      setDetail(updated);
      onAccountUpdated?.(updated);
    } catch (err) {
      console.error("[ViewUser] account toggle error:", err);
      alert(err?.message || "Could not update account. Check Firestore rules.");
    } finally {
      setToggling(false);
    }
  };

  if (!docId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-50">
      <header className="shrink-0 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-slate-50"
        >
          <ArrowLeft size={18} className="text-slate-500" />
          Back
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-gray-900">{displayName}</h1>
        <button
          type="button"
          onClick={handleToggleAccount}
          disabled={toggling}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${isActive
            ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
            : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
            }`}
        >
          {toggling ? "Updating…" : isActive ? "Deactivate" : "Activate"}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-12">
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
            <span className="text-gray-500">Account:</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                }`}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-600">
              <span className="font-medium">Status</span> {String(detail.status ?? "—")}
            </span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-600">
              <span className="font-medium">Suspended</span>{" "}
              {detail.isSuspended === true ? "true" : detail.isSuspended === false ? "false" : "—"}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <dl className="grid grid-cols-1 sm:grid-cols-[minmax(9rem,12rem)_1fr] divide-y divide-gray-100 text-sm sm:divide-y-0">
              {rowKeys.map((key) => (
                <React.Fragment key={key}>
                  <dt className="border-gray-100 bg-gray-50 px-4 py-3 text-xs font-medium text-gray-600 sm:border-b sm:border-r">
                    {key === "height"
                      ? "Height"
                      : key === "id"
                        ? "User ID"
                        : key === "isSuspended"
                          ? "Suspended"
                          : formatFieldLabel(key)}
                  </dt>
                  <dd className="border-gray-100 px-4 py-3 text-gray-900 break-words sm:border-b">
                    {key === "id" ? (
                      <span className="font-mono text-xs text-gray-800">{docId}</span>
                    ) : (
                      formatFieldValue(key, detail[key])
                    )}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        </div>
      </main>
    </div>
  );
};
