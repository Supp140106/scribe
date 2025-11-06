import { useState, useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { useUser } from "../context/UserContext";

export default function Chat() {
  const socket = useSocket();
  const { user, players, selectedRecipient, setSelectedRecipient } = useUser();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Private message inbound
    socket.on("privateMessage", ({ from, fromName, text, timestamp }) => {
      setMessages((prev) => [
        ...prev,
        { type: "dm-in", from, fromName, text, timestamp }
      ]);
    });

    // When someone makes a guess (displayed for everyone)
    socket.on("chatGuess", ({ name, guess }) => {
      setMessages((prev) => [
        ...prev,
        { type: "public", text: `${name}: ${guess}` }
      ]);
    });

    // Send confirmation for our own DMs
    socket.on("privateMessageDelivered", ({ to, text, timestamp }) => {
      const toName = players.find((p) => p.id === to)?.name || to;
      setMessages((prev) => [
        ...prev,
        { type: "dm-out", to, toName, text, timestamp }
      ]);
    });

    // When player guesses correctly
    socket.on("correctGuess", ({ playerName, fastBonus }) => {
      const bonusText = fastBonus > 0 ? ` (+${fastBonus} fast bonus!)` : "";
      setMessages((prev) => [
        ...prev,
        { type: "system", text: `🎉 ${playerName} guessed correctly!${bonusText}` }
      ]);
    });

    return () => {
      socket.off("privateMessage");
      socket.off("privateMessageDelivered");
      socket.off("chatGuess");
      socket.off("correctGuess");
    };
  }, [socket, players]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = messagesRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    const cleanText = input.trim();
    if (!cleanText) return;
    if (!user?.roomId) return;

    if (selectedRecipient?.id) {
      // prevent DM to self
      if (selectedRecipient.id === socket.id) {
        setSelectedRecipient(null);
        socket.emit("guess", { roomId: user.roomId, guess: cleanText });
      } else {
        // send DM
        socket.emit("privateMessage", {
          roomId: user.roomId,
          to: selectedRecipient.id,
          text: cleanText,
        });
      }
    } else {
      // public guess/chat
      socket.emit("guess", { roomId: user.roomId, guess: cleanText });
    }

    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="bg-indigo-50 w-full h-[80vh] relative rounded-2xl p-3 flex flex-col min-h-0 overflow-hidden">
      {/* Chat Messages */}
      <div ref={messagesRef} className="flex-1 min-h-0 overflow-y-auto no-scrollbar mb-16 pr-1">
        {messages.map((msg, i) => {
          const base = "p-2 my-2 rounded-lg shadow max-w-[80%]";
          if (msg.type === "dm-in") {
            return (
              <div key={i} className={`${base} bg-purple-100`}>
                <strong>[DM] {msg.fromName}:</strong> {msg.text}
              </div>
            );
          }
          if (msg.type === "dm-out") {
            return (
              <div key={i} className={`${base} bg-purple-50 text-purple-900 ml-auto`}>
                <strong>[To {msg.toName}]</strong> {msg.text}
              </div>
            );
          }
          if (msg.type === "system") {
            return (
              <div key={i} className={`${base} bg-green-200 font-semibold`}>
                {msg.text}
              </div>
            );
          }
          return (
            <div key={i} className={`${base} bg-white`}>
              {msg.text}
            </div>
          );
        })}
      </div>

      {/* Input box */}
      <div className="absolute bottom-0 left-0 w-full bg-white p-2 rounded-b-2xl">
        <div className="flex items-center gap-2 overflow-hidden">
          <input
            type="text"
            className="flex-1 min-w-0 border px-2 py-1 rounded truncate"
            placeholder={selectedRecipient ? `DM ${selectedRecipient.name}` : "Enter your message..."}
            title={selectedRecipient ? `DM ${selectedRecipient.name}` : "Enter your message"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          {/* {selectedRecipient ? (
            <button
              className="bg-gray-200 text-gray-800 px-3 rounded whitespace-nowrap"
              onClick={() => setSelectedRecipient(null)}
              title="Switch to group chat"
            >
              Group
            </button>
          ) : null} */}
          <button
            className="bg-blue-500 text-white px-4 rounded whitespace-nowrap"
            onClick={sendMessage}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
