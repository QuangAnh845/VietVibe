import HomeScreen from "./_components/home-screen";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeScreen />
    </ProtectedRoute>
  );
}
