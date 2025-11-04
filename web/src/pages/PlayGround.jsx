// PlayGround.jsx
import { useState, useRef, useEffect } from "react";
import bgImage from "../Images/background.png";
import { ReactSketchCanvas } from "react-sketch-canvas";
import Chat from "../components/Chat";
import Players from "../components/Players";
import Swal from "sweetalert2";
import { useSocket } from "../context/SocketContext";

export default function PlayGround() {
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [isErasing, setIsErasing] = useState(false);
  const [isDrawer, setIsDrawer] = useState(false);
  const [roundTime, setRoundTime] = useState(0);
  const [wordDisplay, setWordDisplay] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [drawHistory, setDrawHistory] = useState([]); // local mirror of server strokes
  const canvasRef = useRef(null);
  const socket = useSocket();

  // countdown timer in ms -> display in seconds
  useEffect(() => {
    let timer;
    if (roundTime > 0) {
      timer = setInterval(() => setRoundTime((t) => Math.max(0, t - 1000)), 1000);
    }
    return () => clearInterval(timer);
  }, [roundTime]);

  // socket event wiring
  useEffect(() => {
    if (!socket) return;

    // When server confirms a successful join it emits joinedRoom
    socket.on("joinedRoom", (payload) => {
      setRoomId(payload.roomId);
      setIsDrawer(payload.youAreDrawer);
      // if server sent a drawHistory as part of joinedRoom you can load it here too (server currently sends loadCanvas separately)
    });

    // load full history when joining in-progress round
    socket.on("loadCanvas", ({ drawHistory: serverHistory }) => {
      if (!canvasRef.current) return;
      const paths = Array.isArray(serverHistory) ? serverHistory : [];
      setDrawHistory(paths);
      // loadPaths replaces entire canvas content
      canvasRef.current.loadPaths(paths);
    });

    // when any client completes a stroke, server relays 'endStroke'
    socket.on("endStroke", ({ stroke }) => {
      // only apply strokes for non-drawer clients (drawer already has it locally),
      // but applying it anyway keeps everyone consistent
      if (!canvasRef.current || !stroke) return;
      setDrawHistory((prev) => {
        const next = [...prev, stroke];
        // loadPaths overwrites paths so provide full array
        try {
          canvasRef.current.loadPaths(next);
        } catch (err) {
          console.warn("Failed to loadPaths on endStroke:", err);
        }
        return next;
      });
    });

    // server tells clients to clear canvas
    socket.on("clearCanvas", () => {
      if (!canvasRef.current) return;
      try {
        canvasRef.current.clearCanvas();
      } catch (err) {}
      setDrawHistory([]);
    });

    // server tells clients to undo (it already removed last stroke on server)
    socket.on("undoCanvas", () => {
      if (!canvasRef.current) return;
      try {
        canvasRef.current.undo();
      } catch (err) {}
      setDrawHistory((prev) => {
        const next = prev.slice(0, -1);
        // ensure canvas matches
        try {
          canvasRef.current.loadPaths(next);
        } catch (err) {}
        return next;
      });
    });

    // existing round / word logic (matches your server events)
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
              socket.emit("selectWord", { word: chosen });
              Swal.close();
            });
          });
        },
      });
    });

    socket.on("roundStartConfirmed", ({ drawerId, timeMs }) => {
      const me = socket.id;
      const amDrawer = me === drawerId;
      setIsDrawer(amDrawer);
      setRoundTime(timeMs);

      if (amDrawer) {
        Swal.fire({
          icon: "success",
          title: "Your word has been chosen!",
          timer: 1200,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "info",
          title: "Drawer has chosen a word!",
          timer: 1200,
          showConfirmButton: false,
        });
        setWordDisplay("_____");
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

    socket.on("drawerWord", ({ word }) => {
      setWordDisplay(word);
    });

    // housekeeping: remove listeners on unmount / socket change
    return () => {
      socket.off("joinedRoom");
      socket.off("loadCanvas");
      socket.off("endStroke");
      socket.off("clearCanvas");
      socket.off("undoCanvas");
      socket.off("chooseWord");
      socket.off("roundStartConfirmed");
      socket.off("roundStart");
      socket.off("drawerWord");
    };
  }, [socket]);

  // color change
  const handleStrokeColorChange = (event) => {
    setStrokeColor(event.target.value);
    setIsErasing(false);
    try {
      canvasRef.current.eraseMode(false);
    } catch (err) {}
  };

  // onStroke provided by ReactSketchCanvas fires when a stroke finishes.
  // We export paths and send only the last stroke to the server as endStroke.
  const handleStroke = async () => {
    if (!isDrawer) return;
    if (!canvasRef.current) return;

    try {
      const paths = await canvasRef.current.exportPaths(); // array of strokes
      if (!Array.isArray(paths) || paths.length === 0) return;

      // pick the most recent stroke (last element)
      const lastStroke = paths[paths.length - 1];

      // update local drawHistory immediately (optimistic)
      setDrawHistory((prev) => {
        const next = [...prev, lastStroke];
        return next;
      });

      // emit stroke to server for persistence + broadcast
      if (roomId) {
        socket.emit("endStroke", { roomId, stroke: lastStroke });
      }
    } catch (err) {
      console.error("handleStroke error:", err);
    }
  };

  const toggleEraser = () => {
    const newVal = !isErasing;
    setIsErasing(newVal);
    try {
      canvasRef.current.eraseMode(newVal);
    } catch (err) {}
  };

  const clearCanvas = () => {
    try {
      canvasRef.current.clearCanvas();
    } catch (err) {}
    setDrawHistory([]);
    if (roomId) socket.emit("clearCanvas", { roomId });
  };

  const undoCanvas = () => {
    try {
      canvasRef.current.undo();
    } catch (err) {}
    // update local mirror
    setDrawHistory((prev) => {
      const next = prev.slice(0, -1);
      return next;
    });
    if (roomId) socket.emit("undoCanvas", { roomId });
  };

  const redoCanvas = () => {
    try {
      canvasRef.current.redo();
    } catch (err) {}
    // NOTE: server doesn't handle redo; redo is local only
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
          ⏳ {Math.ceil(roundTime / 1000)}s | ✍️ {isDrawer ? "You are drawing" : "Guess the word"}
          <br />
          <b>Word:</b> {wordDisplay}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-row items-start justify-center grow gap-4 pb-3 px-4">
        <Players />

        {/* Canvas */}
        <div className="flex flex-col items-center justify-center grow gap-4 pb-3">
          <div className="bg-white/60 backdrop-blur-md p-3 rounded-xl shadow-lg border border-white/50">
            <ReactSketchCanvas
              ref={canvasRef}
              style={{ borderRadius: "20px", border: "2px solid #ddd" }}
              width="700px"
              height="450px"
              canvasColor="#ffffff"
              onStroke={handleStroke} // fires when a stroke is completed
              strokeWidth={4}
              strokeColor={isErasing ? "#ffffff" : strokeColor}
              readOnly={!isDrawer}
            />
          </div>

          {/* Toolbar */}
          {isDrawer && (
            <div className="flex flex-wrap items-center justify-center gap-3 bg-white/60 backdrop-blur-md px-6 py-2 rounded-xl shadow-md border border-white/40">
              <label className="flex items-center gap-2 text-sm font-semibold">
                🎨
                <input
                  type="color"
                  value={strokeColor}
                  onChange={handleStrokeColorChange}
                  className="w-8 h-8 rounded cursor-pointer"
                />
              </label>

              <button onClick={undoCanvas} className="btn">
                Undo
              </button>
              <button onClick={redoCanvas} className="btn">
                Redo
              </button>
              <button onClick={toggleEraser} className={`btn ${isErasing ? "bg-red-500" : ""}`}>
                {isErasing ? "Eraser On" : "Use Eraser"}
              </button>
              <button onClick={clearCanvas} className="btn bg-black text-white">
                Clear All
              </button>
            </div>
          )}
        </div>

        <Chat />
      </div>
    </div>
  );
}
