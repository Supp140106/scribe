import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SocketProvider } from "./context/SocketContext";
import { UserProvider } from "./context/UserContext";

import Home from "./pages/Home";
import PrivateRoom from "./pages/PrivateRoom";
import PlayGround from "./pages/PlayGround";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// 🔒 Check if user is authenticated
const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};

// Protect all routes unless logged in
function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <SocketProvider>
      <UserProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

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
                  <PlayGround />
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
