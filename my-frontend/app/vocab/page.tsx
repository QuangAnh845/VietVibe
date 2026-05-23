import { Suspense } from "react";
import VocabScreen from "../_components/vocab-screen";

export default function VocabPage() {
  return (
    <Suspense fallback={null}>
      <VocabScreen />
    </Suspense>
  );
}
