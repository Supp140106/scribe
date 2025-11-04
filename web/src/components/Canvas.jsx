import React, { useRef, useEffect, useState } from "react";
import "./Canvas.css";

const Canvas = ({ socket, isDrawing }) => {
  const canvasRef = useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [currentSize, setCurrentSize] = useState(5);
  const [tool, setTool] = useState("pen");

  const colors = [
    "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF",
    "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080",
    "#FFC0CB", "#A52A2A", "#808080", "#90EE90", "#FFD700"
  ];
  const sizes = [2, 5, 10, 15, 20];

  // Setup canvas once
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // Listen socket draw events
  useEffect(() => {
    socket.on("draw", drawLineFromServer);
    socket.on("clearCanvas", clearCanvas);
    
    socket.on("drawingData", (dataArray) => {
      clearCanvas();
      dataArray.forEach(drawLineFromServer);
    });

    return () => {
      socket.off("draw");
      socket.off("clearCanvas");
      socket.off("drawingData");
    };
  }, [socket]);

  // Draw Line Function
  const drawLineFromServer = ({ x0, y0, x1, y1, color, size }) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = color;
    ctx.lineWidth = size;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
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
    setIsMouseDown(true);
    canvasRef.current.lastX = pos.x;
    canvasRef.current.lastY = pos.y;
  };

  const draw = (pos) => {
    if (!isDrawing || !isMouseDown) return;

    const canvas = canvasRef.current;
    const drawColor = tool === "eraser" ? "#FFFFFF" : currentColor;

    const data = {
      x0: canvas.lastX,
      y0: canvas.lastY,
      x1: pos.x,
      y1: pos.y,
      color: drawColor,
      size: currentSize
    };

    drawLineFromServer(data);
    socket.emit("draw", data);

    canvas.lastX = pos.x;
    canvas.lastY = pos.y;
  };

  const stop = () => setIsMouseDown(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="canvas-container">

      {isDrawing && (
        <div className="toolbar">
          <button className={tool === "pen" ? "active" : ""} onClick={() => setTool("pen")}>✏️</button>
          <button className={tool === "eraser" ? "active" : ""} onClick={() => setTool("eraser")}>🧹</button>
          <button onClick={() => socket.emit("clearCanvas")}>🗑️</button>

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

      <canvas
        ref={canvasRef}
        className="drawing-canvas"
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
  );
};

export default Canvas;
