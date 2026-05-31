import AdminContentScreen from "../../_components/admin-content-screen";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function AdminContentPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminContentScreen />
    </ProtectedRoute>
  );
}
