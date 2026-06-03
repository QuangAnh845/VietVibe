import { Suspense } from "react";
import StudyScreen from "../_components/study-screen";

import { ProtectedRoute } from "../components/ProtectedRoute";

export default function VocabPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <StudyScreen />
      </Suspense>
    </ProtectedRoute>
  );
}
