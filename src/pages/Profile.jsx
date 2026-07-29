import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { BadgeCheck, Calendar, KeyRound, Shield } from "lucide-react";

/** @param {string | null | undefined} iso */
function formatAuthDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

/** @param {string | null | undefined} role */
function formatRole(role) {
  const r = String(role || "user").toLowerCase();
  if (r === "admin" || r === "administrator") return "Administrator";
  if (r === "user") return "Standard user";
  return String(role || "User");
}

/** @param {string | null | undefined} provider */
function formatSignInMethod(provider) {
  if (!provider || provider === "password") return "Email and password";
  if (provider === "google.com") return "Google";
  if (provider === "apple.com") return "Apple";
  return provider.replace(/\.com$/, "").replace(/^./, (c) => c.toUpperCase());
}

/** @param {{ icon: import("lucide-react").LucideIcon; label: string; children: React.ReactNode }} props */
function ProfileField({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-4 border-b border-gray-100 px-5 py-4 last:border-b-0 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium text-gray-900 break-words">{children}</dd>
      </div>
    </div>
  );
}

const Profile = () => {
  const { user, firebaseAuth } = useSelector((state) => state.auth);

  const displayName = firebaseAuth?.displayName || user?.name || "—";
  const email = user?.email || firebaseAuth?.email || "—";
  const role = user?.role || firebaseAuth?.claims?.role || "user";
  const emailVerified = firebaseAuth?.emailVerified === true;
  const created = user?.creationTime || firebaseAuth?.authTime;
  const lastSignIn = user?.lastSignInTime;
  const signInMethod = formatSignInMethod(firebaseAuth?.signInProvider);

  const initials = useMemo(() => {
    const n = String(displayName).trim();
    if (!n || n === "—") return "A";
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }, [displayName]);

  return (
    <div className="w-full flex justify-center px-2 sm:px-0">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-500">Your {user?.role == "admin" ? "admin" : "affiliate"} account details</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col items-center border-b border-gray-100 bg-gradient-to-b from-indigo-50/80 to-white px-6 py-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-2xl font-semibold text-white shadow-md">
              {initials}
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900 truncate max-w-full">{displayName}</h2>
            <p className="mt-1 text-sm text-gray-500 truncate max-w-full">{email}</p>
            <span className="mt-3 inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
              {formatRole(role)}
            </span>
          </div>

          <dl>
            <ProfileField icon={BadgeCheck} label="Email status">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${emailVerified ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                  }`}
              >
                {emailVerified ? "Verified" : "Not verified"}
              </span>
            </ProfileField>
            <ProfileField icon={Calendar} label="Account created">
              {formatAuthDate(created)}
            </ProfileField>
            <ProfileField icon={Calendar} label="Last sign-in">
              {formatAuthDate(lastSignIn)}
            </ProfileField>
            <ProfileField icon={KeyRound} label="Sign-in method">
              {signInMethod}
            </ProfileField>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default Profile;
