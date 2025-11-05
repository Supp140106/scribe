import { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import bgImage from "../Images/background.png";
import { useUser } from "../context/UserContext";

export default function PrivateRoom({ mode, onBack }) {
  const socket = useSocket();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const { setUser } = useUser();

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    socket.emit("createPrivateRoom", { name });
  };

  const handleJoin = () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!roomCode.trim()) {
      setError("Please enter a room code");
      return;
    }
    socket.emit("joinPrivateRoom", { name, roomCode: roomCode.toUpperCase() });
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("joinedRoom", (data) => {
      console.log("Joined private room:", data);
      setUser(data);
    });

    socket.on("errorMessage", ({ message }) => {
      setError(message);
    });

    return () => {
      socket.off("joinedRoom");
      socket.off("errorMessage");
    };
  }, [socket, setUser]);

  return (
    <div className="h-screen w-full bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})` }}>
      <h1 className="text-7xl text-indigo-50 text-center pt-7">Skribbl.io</h1>

      <div className="bg-indigo-200 max-w-xl h-auto mx-auto mt-28 rounded-2xl flex flex-col items-center justify-center gap-6 p-6">
        <h2 className="text-2xl font-bold text-indigo-700">
          {mode === "create" ? "Create Private Room" : "Join Private Room"}
        </h2>

        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          className="w-64 p-3 rounded-lg border outline-indigo-600 outline-2 border-gray-300 focus:outline-none text-center text-indigo-600 focus:bg-indigo-50"
        />

        {mode === "join" && (
          <input
            type="text"
            placeholder="Room Code"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase());
              setError("");
            }}
            maxLength={6}
            className="w-64 p-3 rounded-lg border outline-indigo-600 outline-2 border-gray-300 focus:outline-none text-center text-indigo-600 focus:bg-indigo-50 uppercase"
          />
        )}

        {error && (
          <p className="text-red-600 font-semibold text-sm">{error}</p>
        )}

        <div className="flex flex-col gap-3 w-64">
          <button
            className="bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700"
            onClick={mode === "create" ? handleCreate : handleJoin}
          >
            {mode === "create" ? "CREATE ROOM" : "JOIN ROOM"}
          </button>

          <button
            className="bg-white text-indigo-700 py-2 border border-indigo-600 rounded-lg font-semibold hover:bg-indigo-50"
            onClick={onBack}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
