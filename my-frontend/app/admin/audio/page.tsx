import AdminAudioScreen from "../../_components/admin-audio-screen";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function AdminAudioPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminAudioScreen />
    </ProtectedRoute>
  );
}
