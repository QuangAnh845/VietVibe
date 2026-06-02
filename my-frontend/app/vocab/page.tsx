import { Suspense } from "react";
_;

import { ProtectedRoute } from "../components/ProtectedRoute";

export default function VocabPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}></Suspense>
    </ProtectedRoute>
  );
}
