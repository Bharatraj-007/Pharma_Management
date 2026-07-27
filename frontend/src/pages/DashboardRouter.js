import WorkerDashboard from "./WorkerDashboard";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import CEODashboard from "./CEODashboard";

function DashboardRouter() {
  const role = localStorage.getItem("role");

  if (role === "admin") return <AdminDashboard />;
  if (role === "manager") return <ManagerDashboard />;
  if (role === "ceo") return <CEODashboard />;
  if (role === "worker") return <WorkerDashboard />;

  return <WorkerDashboard />;
}

export default DashboardRouter;
