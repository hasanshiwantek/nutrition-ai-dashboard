import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, X, UserPlus  } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { logoutManual } from "../store/authSlice";
import appLogo from "../assets/app_icon.png";
import { AddAdminUser } from "./AddAdminUser";

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAdminUserModal, setShowAdminUserModal] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
    }
    dispatch(logoutManual());
    setShowLogoutModal(false);
    navigate("/");
  };

  return (
    <>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-10 relative bg-[#FFFFFF] px-6 md:px-10 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap sm:gap-4 min-w-0">
          <Link to="/users" className="shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={appLogo} alt="App logo" className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl object-contain" />
              <div className="leading-tight min-w-0">
                <div className="text-sm font-semibold text-gray-900"> Freedom Eats</div>
                <div className="text-[11px] text-gray-500">Admin Portal</div>
              </div>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <Link to="/users" className="font-medium text-gray-700 hover:text-indigo-600 whitespace-nowrap">Users</Link>
            <Link to="/profile" className="font-medium text-gray-700 hover:text-indigo-600 whitespace-nowrap">Profile</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-lg px-2 py-1 -mx-2 hover:bg-gray-50 transition"
            title="Open profile"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-semibold">
              {user?.name?.[0] || "U"}
            </div>
            <span className="font-medium text-gray-800 text-sm max-w-[140px] truncate">{user?.name || "User"}</span>
          </Link>
          <button
            onClick={() => setShowAdminUserModal(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <UserPlus size={20} className="text-gray-600" />
          </button>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <LogOut size={20} className="text-gray-600" />
          </button>
        </div>
      </header>

      {showAdminUserModal && <AddAdminUser onClose={() => setShowAdminUserModal(false)} onSaved={() => setShowAdminUserModal(false)} />}

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-lg relative">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <div className="text-center py-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Want to logout?</h2>
            </div>
            <div className="flex justify-between gap-3 mt-6">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-1/2 border py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={handleLogout}
                className="w-1/2 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
