import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { accountFieldsForActive, isUserAccountActive } from "../lib/userAccountState";

/**
 * @param {{ id: string } & Record<string, unknown>} detail - Full doc: { id, ...data }
 */
export const EditUserModal = ({ detail, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("active");

  const docId = detail?.id;

  useEffect(() => {
    if (!docId) return;
    setName(
      String(detail.name ?? detail.displayName ?? detail.fullName ?? "")
    );
    setEmail(String(detail.email ?? ""));
    setStatus(isUserAccountActive(detail) ? "active" : "inactive");
  }, [detail, docId]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!docId) return;
    const account = accountFieldsForActive(status === "active");
    const payload = { name: name.trim(), email: email.trim(), ...account };
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", docId), payload);
      onSaved?.({
        id: docId,
        name: payload.name || "—",
        email: payload.email || "—",
        status: account.status,
        isSuspended: account.isSuspended,
        _raw: { ...detail, ...payload },
      });
      onClose();
    } catch (err) {
      console.error("[EditUserModal] update error:", err);
      alert(err?.message || "Update failed. Check Firestore rules.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-lg relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Edit user</h2>
        <p className="text-xs text-gray-500 mb-4">
          Document ID: <span className="font-mono text-gray-700">{docId}</span>
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 font-medium">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
