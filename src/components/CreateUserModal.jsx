import React, { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";

export const CreateUserModal = ({ onClose, editUser = null, onUserAdded }) => {
  const isEditMode = !!editUser;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: editUser?.name || "",
    email: editUser?.email || "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email";
    }
    if (!isEditMode) {
      if (!formData.password) newErrors.password = "Password is required";
      else if (formData.password.length < 6) newErrors.password = "Min 6 characters";
      if (!formData.confirmPassword) newErrors.confirmPassword = "Confirm password is required";
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    } else if (formData.password) {
      if (formData.password.length < 6) newErrors.password = "Min 6 characters";
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!isEditMode && typeof onUserAdded === "function") {
      onUserAdded({
        id: Date.now(),
        name: formData.name.trim(),
        email: formData.email.trim(),
        status: "active",
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-lg relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">{isEditMode ? "Edit user" : "Create new user"}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {isEditMode ? "Update the user details below." : "Fill in the details below to create a new user account."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 font-medium">Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full mt-1 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors.name ? "border-red-400" : "border-gray-200"}`}
            />
            <p className="text-xs text-red-500 min-h-[16px] mt-1">{errors.name || " "}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 font-medium">Email</label>
            <input
              type="email"
              placeholder="e.g. example@gmail.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full mt-1 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors.email ? "border-red-400" : "border-gray-200"}`}
            />
            <p className="text-xs text-red-500 min-h-[16px] mt-1">{errors.email || " "}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 font-medium">
              Password {isEditMode && <span className="text-gray-400">(optional)</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={isEditMode ? "Leave blank to keep current" : "Enter secure password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full mt-1 p-2 pr-10 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors.password ? "border-red-400" : "border-gray-200"}`}
              />
              <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-red-500 min-h-[16px] mt-1">{errors.password || " "}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 font-medium">Confirm password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={`w-full mt-1 p-2 pr-10 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors.confirmPassword ? "border-red-400" : "border-gray-200"}`}
              />
              <button type="button" onClick={() => setShowConfirmPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-red-500 min-h-[16px] mt-1">{errors.confirmPassword || " "}</p>
          </div>
          <button type="submit" className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">
            {isEditMode ? "Update user" : "Create user"}
          </button>
        </form>
      </div>
    </div>
  );
};
