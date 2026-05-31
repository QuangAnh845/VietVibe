"use client";

import { Suspense } from "react";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import AdminListeningScreen from "../../_components/admin-listening-screen";

export default function AdminListeningPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-sm text-[#7b8b83]">
            Đang tải...
          </div>
        }
      >
        <AdminListeningScreen />
      </Suspense>
    </ProtectedRoute>
  );
}
