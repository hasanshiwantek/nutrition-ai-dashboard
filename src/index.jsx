import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { store, persistor } from "./store/store";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import UserManagement from "./pages/UserManagement";
import OrderDetails from "./pages/OrderDetails";
import Profile from "./pages/Profile";
import Layout from "./components/Layout";
import StripeSuccess from "./pages/StripeSuccess";
import StripeRefresh from "./pages/StripeRefresh";
import AuthSync from "./components/AuthSync";
import "./index.css";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <AuthSync />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route path="/dashboard" element={<Navigate to="/users" replace />} />
            <Route path="/users" element={<Layout><UserManagement /></Layout>} />
            <Route path="/order/:id" element={<Layout><OrderDetails /></Layout>} />
            <Route path="/profile" element={<Layout><Profile /></Layout>} />
            <Route path="/stripe-success" element={<StripeSuccess />} />
            <Route path="/stripe-refresh" element={<StripeRefresh />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
