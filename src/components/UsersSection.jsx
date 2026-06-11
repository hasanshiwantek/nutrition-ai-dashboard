import React from "react";
import addUserIcon from "../assets/adduser-icon.svg";
import { CreateUserModal } from "./CreateUserModal";



export const getUserMonthlyMealAverage = async (userId) => {
  if (!userId) return 0;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based

  // Start and end of current month
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0); // Last day of month

  try {
    // 1. Get all daily_logs for this user in current month
    const dailyLogsRef = collection(db, "users", userId, "daily_logs");

    const logsQuery = query(
      dailyLogsRef,
      where("date", ">=", startOfMonth),
      where("date", "<=", endOfMonth)
    );

    const logsSnapshot = await getDocs(logsQuery);
    const totalDaysLogged = logsSnapshot.size;

    if (totalDaysLogged === 0) return 0;

    // 2. Count total meals across all those daily logs
    let totalMeals = 0;

    for (const logDoc of logsSnapshot.docs) {
      const mealsRef = collection(db, "users", userId, "daily_logs", logDoc.id, "meals");
      const mealsCountSnap = await getCountFromServer(mealsRef);
      totalMeals += mealsCountSnap.data().count;
    }

    // 3. Calculate average
    const averageMeals = totalMeals / totalDaysLogged;

    return Number(averageMeals.toFixed(2));

  } catch (error) {
    console.error(`Error calculating meal average for user ${userId}:`, error);
    return 0;
  }
};
const UsersSection = ({
  users = [],
  searchValue,
  onSearchChange,
  loading = false,
  error = null,
  onToggleStatus,
  toggling = false,
  showStatus = true,
  showToggle = true,
}) => {
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  const handleCloseModal = () => {
    setShowCreateModal(false);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4 relative overflow-hidden">
        <div className="absolute bottom-6 right-6 w-28 h-28 bg-indigo-100 opacity-70 blur-3xl rounded-full pointer-events-none z-0" />
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-gray-800 text-lg">Users</h2>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1 inline-block">Enter name</label>
          <input
            type="text"
            placeholder="Enter name"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-3 relative z-10 h-[35rem] overflow-y-scroll">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading users...</p>
          ) : error ? (
            <p className="text-sm text-red-500 text-center py-4">{error}</p>
          ) : users.length > 0 ? (
            users.map((user, i) => {
              const userName = typeof user === "object" ? user.name : user;
              const userEmail = typeof user === "object" ? user.email : "";
              const userInitial = userName ? userName.charAt(0).toUpperCase() : "?";
              const userId = typeof user === "object" ? user.id : i;
              const status = typeof user === "object" ? user.status : null;
              return (
                <div key={userId} className="relative flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm"
                      style={{ backgroundColor: `hsl(${(i * 45) % 360}, 70%, 55%)` }}
                    >
                      {userInitial}
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium text-sm">{userName}</p>
                      {userEmail && <p className="text-xs text-gray-500">{userEmail}</p>}
                      {showStatus && status && (
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                            status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {status}
                        </span>
                      )}
                    </div>
                  </div>
                  {showToggle && typeof user === "object" && typeof onToggleStatus === "function" && status && (
                    <button
                      onClick={() => onToggleStatus(user)}
                      disabled={toggling}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                        status === "active"
                          ? "bg-red-50 text-red-700 hover:bg-red-100"
                          : "bg-green-50 text-green-700 hover:bg-green-100"
                      }`}
                      title="Toggle active/inactive"
                    >
                      {toggling ? "Please wait..." : status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No users found.</p>
          )}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="absolute bottom-40 right-8 z-30 flex items-center justify-center rounded-full drop-shadow-xl hover:scale-105 transition"
        >
          <img src={addUserIcon} alt="Add user" className="w-16 h-16" />
        </button>
      </div>

      {showCreateModal && <CreateUserModal onClose={handleCloseModal} />}
    </>
  );
};

export default UsersSection;
