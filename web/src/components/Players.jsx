import React, { useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { useUser } from "../context/UserContext";

export default function Players() {
  const socket = useSocket();
  const { players, setplayers, selectedRecipient, setSelectedRecipient } = useUser();

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
    <div className="bg-amber-400 w-xl h-80 p-4 rounded shadow">
      <h2 className="text-lg font-bold mb-2">Players in Room:</h2>

      {/* Group chat selector */}
      <div className="mb-2">
        <button
          className={`text-xs px-2 py-1 rounded border ${
            selectedRecipient ? "bg-white" : "bg-indigo-600 text-white border-indigo-700"
          }`}
          onClick={() => setSelectedRecipient(null)}
          title="Select group chat (All)"
        >
          Group chat (All)
        </button>
      </div>

      {players.length === 0 ? (
        <p>No players yet...</p>
      ) : (
        <ul className="space-y-1">
          {players.map((player) => {
            const isSelf = player.id === socket.id;
            const isSelected = selectedRecipient?.id === player.id;
            return (
              <li
                key={player.id}
                className={`bg-white rounded px-2 py-1 flex justify-between items-center ${
                  isSelf ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                } ${isSelected ? "ring-2 ring-indigo-500" : ""}`}
                title={`Socket: ${player.id}${isSelf ? " (You)" : ""}`}
                onClick={() => {
                  if (isSelf) return; // cannot DM yourself
                  setSelectedRecipient(
                    isSelected ? null : { id: player.id, name: player.name }
                  );
                }}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{player.name}</span>
                  
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{player.score}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    isSelf
                      ? "bg-gray-200 text-gray-600"
                      : isSelected
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {isSelf ? "You" : isSelected ? "DM" : "Select"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
