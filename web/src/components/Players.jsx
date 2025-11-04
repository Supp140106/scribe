import React, { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";

export default function Players() {
  const socket = useSocket();
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // Listen for updated player lists
    socket.on("playerList", (playerList) => {
      setPlayers(playerList);
    });

    // Cleanup listener when component unmounts
    return () => {
      socket.off("playerList");
    };
  }, [socket]);

  return (
    <div className="bg-amber-400 w-xl h-64 p-4 rounded shadow">
      <h2 className="text-lg font-bold mb-2">Players in Room:</h2>

      {players.length === 0 ? (
        <p>No players yet...</p>
      ) : (
        <ul className="space-y-1">
          {players.map((player) => (
            <li
              key={player.id}
              className="bg-white rounded px-2 py-1 flex justify-between"
            >
              <span>{player.name}</span>
              <span className="font-semibold">{player.score}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
