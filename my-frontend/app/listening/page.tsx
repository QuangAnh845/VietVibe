import { Suspense } from "react";
import ListeningScreen from "../_components/listening-screen";
import { ProtectedRoute } from "../components/ProtectedRoute";

export default function ListeningPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <ListeningScreen />
      </Suspense>
    </ProtectedRoute>
  );
}
