import { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { useUser } from "../context/UserContext";

export default function Chat() {
  const socket = useSocket();
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!socket) return;

    // When someone makes a guess (displayed for everyone)
    socket.on("chatGuess", ({ name, guess }) => {
      setMessages((prev) => [
        ...prev,
        { system: false, text: `${name}: ${guess}` }
      ]);
    });

    // When player guesses correctly
    socket.on("correctGuess", ({ playerName, fastBonus }) => {
      const bonusText = fastBonus > 0 ? ` (+${fastBonus} fast bonus!)` : "";
      setMessages((prev) => [
        ...prev,
        { system: true, text: `🎉 ${playerName} guessed correctly!${bonusText}` }
      ]);
    });

    return () => {
      socket.off("chatGuess");
      socket.off("correctGuess");
    };
  }, [socket]);

  const sendMessage = () => {
    const cleanText = input.trim();
    if (!cleanText) return;
    if (!user?.roomId) return;

    // Emit guess to server
    socket.emit("guess", { roomId: user.roomId, guess: cleanText });

    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="bg-indigo-50 w-full h-full relative rounded-2xl p-3 flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto mb-12">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-2 my-2 rounded-lg shadow max-w-[80%] ${
              msg.system
                ? "bg-green-200 font-semibold"
                : "bg-white"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {/* Input box */}
      <div className="absolute bottom-0 left-0 w-full flex gap-2 bg-white p-2 rounded-b-2xl">
        <input
          type="text"
          className="flex-1 border px-2 py-1 rounded"
          placeholder="Enter your guess..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <button
          className="bg-blue-500 text-white px-4 rounded"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}
