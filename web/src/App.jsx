import { useState } from "react";
import Home from "./pages/Home";
import PrivateRoom from "./pages/PrivateRoom";
import PlayGround from "./pages/PlayGround";
import { SocketProvider } from "./context/SocketContext";
import { UserProvider, useUser } from "./context/UserContext";

function AppRoutes() {
  const { user } = useUser();
  const [page, setPage] = useState("home");

  if (user) {
    return <PlayGround />;
  }

  if (page === "createPrivate") {
    return <PrivateRoom mode="create" onBack={() => setPage("home")} />;
  }

  if (page === "joinPrivate") {
    return <PrivateRoom mode="join" onBack={() => setPage("home")} />;
  }

  return <Home onNavigate={setPage} />;
}

export default function App() {
  return (
    <SocketProvider>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </SocketProvider>
  );
}
