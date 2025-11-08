import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SocketProvider } from "./context/SocketContext";
import { UserProvider, useUser } from "./context/UserContext";
import Home from "./pages/Home";
import PrivateRoom from "./pages/PrivateRoom";
import PlayGround from "./pages/PlayGround";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};


function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}


function PlaygroundProtectedRoute({ children }) {
  const { user } = useUser();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}


function PublicRoute({ children }) {
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <SocketProvider>
      <UserProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Route (redirects to / if already logged in) */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />

            <Route
              path="/private/create"
              element={
                <ProtectedRoute>
                  <PrivateRoom mode="create" />
                </ProtectedRoute>
              }
            />

            <Route
              path="/private/join"
              element={
                <ProtectedRoute>
                  <PrivateRoom mode="join" />
                </ProtectedRoute>
              }
            />


            <Route
              path="/playground"
              element={
                <ProtectedRoute>
                  <PlaygroundProtectedRoute>
                    <PlayGround />
                  </PlaygroundProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Redirect unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </SocketProvider>
  );
}
