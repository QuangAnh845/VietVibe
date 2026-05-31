import { Suspense } from "react";
import { ProtectedRoute } from "../components/ProtectedRoute";
import StudyScreen from "../_components/study-screen";

export default function ListeningPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <StudyScreen />
      </Suspense>
    </ProtectedRoute>
  );
}
