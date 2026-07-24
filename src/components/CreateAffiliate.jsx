import React, { useState } from "react";
import { X } from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";

/**
 * Calls the `createAffiliate` Cloud Function to create a new affiliate user.
 */
export const CreateAffiliate = ({ onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [commission, setCommission] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Name is required.");
    if (!email.trim()) return setError("Email is required.");
    if (commission !== "" && isNaN(Number(commission)))
      return setError("Commission must be a valid number.");


    const commissionValue = commission === "" ? null : Number(commission);

    setSaving(true);
    try {
      const functions = getFunctions();
      const createAffiliate = httpsCallable(functions, "createAffiliate");

      const result = await createAffiliate({
        name: name.trim(),
        email: email.trim(),
        commission: commissionValue,
      });

      onSaved?.({
        uid: result.data?.uid,
        name: name.trim(),
        email: email.trim(),
        commission: commissionValue,
        role: "affiliate",
        ...result.data, // in case the function returns extra fields (code, status, etc.)
      });

      onClose();
    } catch (err) {
      console.error("[CreateAffiliate] error:", err);
      setError(
        err?.message || "Failed to create affiliate. Check Cloud Function logs."
      );
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

        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Add Affiliate
        </h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="affiliate@example.com"
              className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 
          hide temparary
          */}
          {/* <div>
            <label className="text-sm text-gray-600 font-medium">Commission ($)</label>
            <input
              type="number"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="Optional — e.g. 10"
              min="0"
              step="any"
              className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div> */}
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
              {saving ? "Creating..." : "Create Affiliate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};