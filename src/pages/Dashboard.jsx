import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import totalorders from "../assets/totalorders-icon.svg";
import grossprofit from "../assets/grossprofit-icon.svg";
import StatsCard from "../components/StatsCard";
import UsersSection from "../components/UsersSection";

const Dashboard = () => {
  const { user: authUser } = useSelector((state) => state.auth);
  const [userSearch, setUserSearch] = useState("");
  const [users] = useState([]);

  const filteredUsers = useMemo(() => {
    const list = users && users.length > 0 ? users : [];
    return list.filter((u) => {
      if (authUser?.id && u.id === authUser.id) return false;
      if (!userSearch) return true;
      const q = userSearch.toLowerCase();
      return (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q));
    });
  }, [users, userSearch, authUser?.id]);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const inactiveUsers = users.filter((u) => u.status === "inactive").length;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {[
          { label: "Total users", value: totalUsers, icon: totalorders, alt: "Total users icon" },
          { label: "Active users", value: activeUsers, icon: grossprofit, alt: "Active users icon" },
          { label: "Inactive users", value: inactiveUsers, icon: grossprofit, alt: "Inactive users icon" },
        ].map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between gap-3 mb-6">
            <div>
              <h2 className="font-semibold text-gray-800 text-lg">Quick actions</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage users and profile.
              </p>
            </div>
            <button
              type="button"
              className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/users" className="group border rounded-2xl p-5 hover:bg-gray-50 transition">
              <div className="text-sm font-semibold text-gray-800">Users</div>
              <div className="text-xs text-gray-500 mt-1">View all users and change active/inactive status.</div>
              <div className="mt-4 flex items-center gap-3 text-xs">
                <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">Total: {totalUsers}</span>
                <span className="px-2 py-1 rounded-full bg-green-50 text-green-700">Active: {activeUsers}</span>
                <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">Inactive: {inactiveUsers}</span>
              </div>
            </Link>

            <Link to="/profile" className="group border rounded-2xl p-5 hover:bg-gray-50 transition">
              <div className="text-sm font-semibold text-gray-800">Profile</div>
              <div className="text-xs text-gray-500 mt-1">View admin profile details.</div>
            </Link>
          </div>
        </div>
        <div>
          <UsersSection
            users={filteredUsers}
            searchValue={userSearch}
            onSearchChange={setUserSearch}
            loading={false}
            error={null}
            showStatus={false}
            showToggle={false}
          />
        </div>
      </div>
    </>
  );
};

export default Dashboard;
