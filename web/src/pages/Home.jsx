import { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import bgImage from "../Images/background.png";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

function decodeJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function Home() {
  const socket = useSocket();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const { setUser, setplayers } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    // Hardcode the name to Google OAuth username and grab avatar from token
    const token = localStorage.getItem("token");
    const payload = token ? decodeJwt(token) : null;
    if (payload?.name) setName(payload.name);
    if (payload?.picture) setAvatar(payload.picture);
  }, []);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const token = localStorage.getItem("token");
    socket.emit("register", { name, token, avatar });
  };

  const handleLogout = async () => {
    try {
      // Attempt to clear any server-side session (safe even if unused)
      const api = import.meta.env.VITE_API_URL;
      if (api) {
        await fetch(`${api}/auth/logout`, { credentials: "include" }).catch(() => {});
      }
    } catch {}
    // Always clear client token and redirect to login
    try { localStorage.removeItem("token"); } catch {}
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("joinedRoom", (hello) => {
      console.log("Socket data:", hello);
      setUser(hello);
      // prime the players list immediately so the new user sees everyone
      try { if (hello?.players) setplayers(hello.players); } catch {}
      navigate("/playground", { replace: true });
    });

    return () => {
      socket.off("joinedRoom");
    };
  }, [socket, setUser, navigate]);

  return (
    <div
      className="h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <h1 className="text-7xl text-indigo-50 text-center pt-7">Skribbl.io</h1>

      {/* Top-right avatar + Logout */}
      <div className="fixed top-4 right-4 flex items-center gap-3 z-10">
        {avatar ? (
          <img
            src={avatar}
            alt="Avatar"
            className="w-10 h-10 rounded-full border-2 border-indigo-500 shadow"
          />
        ) : null}
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm bg-white/90 hover:bg-white text-indigo-700 border border-indigo-600 rounded-lg font-semibold"
        >
          Logout
        </button>
      </div>

      <div className="bg-indigo-200 max-w-xl mx-auto mt-28 rounded-2xl flex flex-col items-center justify-center gap-4 p-6">
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          readOnly
          disabled
          className="w-64 p-3 rounded-lg border outline-indigo-600 outline-2 border-gray-300 text-center text-indigo-600 bg-indigo-50 opacity-80"
        />

        <div className="flex flex-col gap-3 w-64">
          <button
            className="bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700"
            onClick={handleSubmit}
          >
            PLAY
          </button>

          <button
            className="bg-white text-indigo-700 py-2 border border-indigo-600 rounded-lg font-semibold hover:bg-indigo-50"
            onClick={() => navigate("/private/create")}
          >
            Create Private Room
          </button>

          <button
            className="bg-white text-indigo-700 py-2 border border-indigo-600 rounded-lg font-semibold hover:bg-indigo-50"
            onClick={() => navigate("/private/join")}
          >
            Join Private Room
          </button>
        </div>
      </div>
    </div>
  );
}
