import React, { useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { useUser } from "../context/UserContext";

export default function Players() {
  const socket = useSocket();
  const { players, setplayers } = useUser();

  useEffect(() => {
    if (!socket) return;

    const handlePlayerList = (playerList) => {
      console.log("Updated player list:", playerList);
      setplayers(playerList || []);
    };

    // Listen for full player list updates
    socket.on("playerList", handlePlayerList);

    return () => {
      socket.off("playerList", handlePlayerList);
    };
  }, [socket, setplayers]);

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
