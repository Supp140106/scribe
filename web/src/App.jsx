import Home from "./pages/Home";
import PlayGround from "./pages/PlayGround";
import { SocketProvider } from "./context/SocketContext";
import { UserProvider, useUser } from "./context/UserContext";

function AppRoutes() {
  const { user } = useUser();
  return user ? <PlayGround /> : <Home />;
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
