import { Navigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import Dashboard from "@/pages/Dashboard";

export default function AdminHome() {
  const { isAdmin } = useUser();

  if (isAdmin) {
    return <Navigate to="/cockpit-real-time" replace />;
  }

  return <Dashboard />;
}
