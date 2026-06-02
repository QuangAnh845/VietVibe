import AdminUsersScreen from "../../_components/admin-users-screen";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function AdminUsersPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminUsersScreen />
    </ProtectedRoute>
  );
}
