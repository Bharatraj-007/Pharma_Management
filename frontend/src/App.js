import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import AccessDenied from "./components/AccessDenied";

// Lazy loaded page components
const DashboardRouter = lazy(() => import("./pages/DashboardRouter"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Stock = lazy(() => import("./pages/Inventory"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const Attendance = lazy(() => import("./pages/Attendance"));
const LeaveManagement = lazy(() => import("./pages/LeaveManagement"));
const Chat = lazy(() => import("./pages/Chat"));
const Settings = lazy(() => import("./pages/Settings"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const SalaryManagement = lazy(() => import("./pages/SalaryManagement"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const Signup = lazy(() => import("./pages/Signup"));
const VerifyOTP = lazy(() => import("./pages/VerifyOTP"));
const Login = lazy(() => import("./pages/Login"));
const Signout = lazy(() => import("./pages/Signout"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

function LoadingFallback() {
  return (
    <div className="sp-loading-container animate-fade">
      <div className="sp-loading-spinner"></div>
      <p className="sp-loading-text">Loading Smart Pharma System...</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/signout" element={<Signout />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<PrivateRoute><Layout><DashboardRouter /></Layout></PrivateRoute>} />
          <Route path="/tasks" element={<PrivateRoute><ProtectedRoute permission="tasks"><Layout><Tasks /></Layout></ProtectedRoute></PrivateRoute>} />
          <Route path="/stock" element={<PrivateRoute><ProtectedRoute permission="stock"><Layout><Stock /></Layout></ProtectedRoute></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><ProtectedRoute permission="attendance"><Layout><Attendance /></Layout></ProtectedRoute></PrivateRoute>} />
          <Route path="/leave" element={<PrivateRoute><ProtectedRoute permission="leaveManagement"><Layout><LeaveManagement /></Layout></ProtectedRoute></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><ProtectedRoute permission="reports"><Layout><ReportsPage /></Layout></ProtectedRoute></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><ProtectedRoute permission="chat"><Layout><Chat /></Layout></ProtectedRoute></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><ProtectedRoute permission="settings"><Layout><Settings /></Layout></ProtectedRoute></PrivateRoute>} />
          <Route path="/user-management" element={<PrivateRoute><ProtectedRoute permission="userManagement"><Layout><UserManagement /></Layout></ProtectedRoute></PrivateRoute>} />
          <Route path="/audit-logs" element={<PrivateRoute><ProtectedRoute permission="auditLogs"><Layout><AuditLogs /></Layout></ProtectedRoute></PrivateRoute>} />
          <Route path="/salary" element={<PrivateRoute><ProtectedRoute permission="salaryManagement"><Layout><SalaryManagement /></Layout></ProtectedRoute></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><ProtectedRoute permission="settings"><Layout><Profile /></Layout></ProtectedRoute></PrivateRoute>} />
          <Route path="/access-denied" element={<PrivateRoute><Layout><AccessDenied /></Layout></PrivateRoute>} />

          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
