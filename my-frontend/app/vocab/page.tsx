import { Suspense } from "react";
import VocabScreen from "../_components/vocab-screen";
import { ProtectedRoute } from "../components/ProtectedRoute";

export default function VocabPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <VocabScreen />
      </Suspense>
    </ProtectedRoute>
  );
}
