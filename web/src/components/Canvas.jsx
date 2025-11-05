import React, { useRef, useEffect, useState } from "react";
import "./Canvas.css";

const Canvas = ({ socket, isDrawing, roomId }) => {
  const canvasRef = useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [currentSize, setCurrentSize] = useState(5);
  const [tool, setTool] = useState("pen");
  const currentStroke = useRef([]);

  const colors = [
    "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF",
    "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080",
    "#FFC0CB", "#A52A2A", "#808080", "#90EE90", "#FFD700"
  ];
  const sizes = [2, 5, 10, 15, 20];

  // Setup canvas once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // Listen socket draw events
  useEffect(() => {
    if (!socket) {
      console.log("⚠️ Canvas: No socket provided");
      return;
    }
    
    console.log("✅ Canvas: Setting up socket listeners", { roomId, isDrawing });

    const handleEndStroke = ({ stroke }) => {
      console.log("📥 Received stroke from server:", stroke);
      if (stroke && stroke.points) {
        drawStroke(stroke);
        console.log("✅ Stroke drawn on canvas");
      } else {
        console.log("⚠️ Invalid stroke data received");
      }
    };

    const handleClearCanvas = () => {
      clearCanvas();
    };

    const handleLoadCanvas = ({ drawHistory }) => {
      clearCanvas();
      if (drawHistory && Array.isArray(drawHistory)) {
        drawHistory.forEach(stroke => drawStroke(stroke));
      }
    };

    const handleUndoCanvas = ({ drawHistory }) => {
      clearCanvas();
      if (drawHistory && Array.isArray(drawHistory)) {
        drawHistory.forEach(stroke => drawStroke(stroke));
      }
    };

    const handleDraw = (seg) => {
      drawSegment(seg);
    };

    socket.on("draw", handleDraw);
    socket.on("endStroke", handleEndStroke);
    socket.on("clearCanvas", handleClearCanvas);
    socket.on("loadCanvas", handleLoadCanvas);
    socket.on("undoCanvas", handleUndoCanvas);
    
    console.log("✅ Canvas: Socket listeners attached");

    return () => {
      console.log("🗑️ Canvas: Removing socket listeners");
      socket.off("draw");
      socket.off("endStroke", handleEndStroke);
      socket.off("clearCanvas", handleClearCanvas);
      socket.off("loadCanvas", handleLoadCanvas);
      socket.off("undoCanvas", handleUndoCanvas);
    };
  }, [socket, roomId, isDrawing]);

  // Draw a segment line
  const drawSegment = ({ x0, y0, x1, y1, color, size }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };

  // Draw a complete stroke
  const drawStroke = (stroke) => {
    const canvas = canvasRef.current;
    if (!canvas || !stroke || !stroke.points || stroke.points.length < 2) return;
    
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    
    ctx.stroke();
  };

  const getPos = (e, touch = false) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = touch ? e.touches[0].clientX : e.clientX;
    const y = touch ? e.touches[0].clientY : e.clientY;

    return { x: (x - rect.left) * scaleX, y: (y - rect.top) * scaleY };
  };

  const start = (pos) => {
    if (!isDrawing) return;
    
    setIsMouseDown(true);
    const drawColor = tool === "eraser" ? "#FFFFFF" : currentColor;
    
    currentStroke.current = {
      points: [pos],
      color: drawColor,
      size: currentSize
    };
  };

  const draw = (pos) => {
    if (!isDrawing || !isMouseDown) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const stroke = currentStroke.current;
    
    if (!stroke || stroke.points.length === 0) return;

    // Add point to current stroke
    stroke.points.push(pos);

    // Draw line segment locally
    const prevPoint = stroke.points[stroke.points.length - 2];
    drawSegment({ x0: prevPoint.x, y0: prevPoint.y, x1: pos.x, y1: pos.y, color: stroke.color, size: stroke.size });

    // Emit segment for real-time preview to others
    if (roomId) {
      socket.emit("draw", {
        roomId,
        x0: prevPoint.x,
        y0: prevPoint.y,
        x1: pos.x,
        y1: pos.y,
        color: stroke.color,
        size: stroke.size,
      });
    }
  };

  const stop = () => {
    if (!isMouseDown) return;
    
    setIsMouseDown(false);
    
    // Send completed stroke to server
    if (currentStroke.current && currentStroke.current.points.length > 1 && roomId) {
      console.log("📤 Sending stroke to server:", {
        roomId,
        points: currentStroke.current.points.length,
        color: currentStroke.current.color,
        size: currentStroke.current.size
      });
      socket.emit("endStroke", {
        roomId,
        stroke: currentStroke.current
      });
      console.log("✅ Stroke emitted");
    } else {
      console.log("⚠️ Stroke not sent:", {
        hasStroke: !!currentStroke.current,
        pointCount: currentStroke.current?.points?.length,
        hasRoomId: !!roomId
      });
    }
    
    currentStroke.current = [];
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleClearClick = () => {
    if (roomId) {
      socket.emit("clearCanvas", { roomId });
    }
  };

  const handleUndoClick = () => {
    if (roomId) {
      socket.emit("undoCanvas", { roomId });
    }
  };

  return (
    <div className="canvas-container">
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          width={700}
          height={450}
          onMouseDown={(e) => start(getPos(e))}
          onMouseMove={(e) => draw(getPos(e))}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={(e) => { e.preventDefault(); start(getPos(e, true)); }}
          onTouchMove={(e) => { e.preventDefault(); draw(getPos(e, true)); }}
          onTouchEnd={stop}
          style={{ cursor: isDrawing ? "crosshair" : "not-allowed" }}
        />
      </div>

      {isDrawing && (
        <div className="toolbar">
          <button className={tool === "pen" ? "active" : ""} onClick={() => setTool("pen")}>✏️</button>
          <button className={tool === "eraser" ? "active" : ""} onClick={() => setTool("eraser")}>🧹</button>
          <button onClick={handleClearClick}>🗑️</button>
          <button onClick={handleUndoClick}>↩️</button>

          {colors.map(c => (
            <button key={c} className={`color-btn ${currentColor === c?"active":""}`}
              style={{ backgroundColor: c }}
              onClick={() => { setCurrentColor(c); setTool("pen"); }}
            />
          ))}

          {sizes.map(s => (
            <button key={s} className={`size-btn ${currentSize === s?"active":""}`}
              onClick={() => setCurrentSize(s)}>
              <div className="size-preview" style={{ width: s*2, height: s*2 }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Canvas;
