// PlayGround.jsx
import { useState, useEffect } from "react";
import bgImage from "../Images/background.png";
import Canvas from "../components/Canvas";
import Chat from "../components/Chat";
import Players from "../components/Players";
import Swal from "sweetalert2";
import { useSocket } from "../context/SocketContext";
import { useUser } from "../context/UserContext";

export default function PlayGround() {
  const { user } = useUser();
  const [isDrawer, setIsDrawer] = useState(false);
  const [roundTime, setRoundTime] = useState(0);
  const [wordDisplay, setWordDisplay] = useState("");
  const [copied, setCopied] = useState(false);
  const socket = useSocket();

  const roomId = user?.roomId || null;
  const roomCode = user?.roomCode || null;
  const isPrivate = user?.isPrivate || false;

  console.log("🎮 PlayGround rendered:", { roomId, isDrawer });

  // ✅ Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("joinedRoom", ({ youAreDrawer }) => {
      console.log("🎮 joinedRoom event");
      setIsDrawer(!!youAreDrawer);
    });

    socket.on("chooseWord", ({ words }) => {
      setIsDrawer(true);
      Swal.fire({
        title: "Choose a word to draw!",
        html: `
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${words
              .map(
                (w) =>
                  `<button class="swal2-confirm swal2-styled" style="width:100%" data-word="${w}">
                    ${w}
                  </button>`
              )
              .join("")}
          </div>
        `,
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => {
          const buttons = Swal.getHtmlContainer().querySelectorAll("button");
          buttons.forEach((btn) => {
            btn.addEventListener("click", () => {
              const chosen = btn.getAttribute("data-word");
              socket.emit("chooseWord", { roomId, word: chosen });
              Swal.close();
            });
          });
        },
      });
    });

    // ✅ Timer synced with server (authoritative clock)
    socket.on("roundInProgress", ({ drawerId, roundTimeMs, startTimeMs }) => {
      const amDrawer = socket.id === drawerId;
      setIsDrawer(amDrawer);

      // Sync timer
      const tick = () => {
        const elapsed = Date.now() - startTimeMs;
        const remaining = Math.max(
          0,
          Math.floor((roundTimeMs - elapsed) / 1000)
        );
        setRoundTime(remaining);
      };

      tick();
      if (window.roundInterval) clearInterval(window.roundInterval);
      window.roundInterval = setInterval(tick, 1000);

      if (!amDrawer) {
        Swal.fire({
          icon: "info",
          title: "Round started! Start guessing!",
          timer: 1500,
          showConfirmButton: false,
        });
        setWordDisplay("?????");
      }
    });

    socket.on("roundStart", ({ drawerId, choosingWord }) => {
      if (choosingWord && socket.id !== drawerId) {
        setIsDrawer(false);
        Swal.fire({
          title: "Drawer is choosing a word...",
          allowOutsideClick: false,
          showConfirmButton: false,
          timer: 2000,
        });
      }
    });

    socket.on("yourWord", ({ word }) => {
      setIsDrawer(true);
      setWordDisplay(word);
      Swal.fire({
        icon: "success",
        title: `Your word: ${word}`,
        text: "Start drawing!",
        timer: 2000,
        showConfirmButton: false,
      });
    });

    return () => {
      socket.off("joinedRoom");
      socket.off("chooseWord");
      socket.off("roundInProgress");
      socket.off("roundStart");
      socket.off("yourWord");
      if (window.roundInterval) clearInterval(window.roundInterval);
    };
  }, [socket, roomId]);

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="h-screen w-full flex flex-col bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Header */}
      <div className="flex justify-between px-8 py-3 items-center">
        <h1 className="bg-white/70 backdrop-blur-md text-3xl font-extrabold px-6 py-2 rounded-2xl shadow-lg border border-white/40">
          Scribble.io
        </h1>

        <div className="bg-white/70 px-4 py-2 rounded-lg shadow">
          ⏳ {roundTime}s | ✍️ {isDrawer ? "You are drawing" : "Guess the word"}
          <br />
          <b>Word:</b> {wordDisplay}
        </div>

        {isPrivate && roomCode && (
          <div className="bg-indigo-100 px-4 py-2 rounded-lg shadow border-2 border-indigo-400">
            <div className="text-sm text-indigo-600 font-semibold">Private Room</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-indigo-800">{roomCode}</span>
              <button
                onClick={copyRoomCode}
                className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
              >
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-row items-start justify-center grow gap-4 pb-3 px-4">
        <Players />

        <div className="flex flex-col items-center justify-center grow gap-4 pb-3">
          <Canvas socket={socket} isDrawing={isDrawer} roomId={roomId} />
        </div>

        <Chat />
      </div>
    </div>
  );
}
