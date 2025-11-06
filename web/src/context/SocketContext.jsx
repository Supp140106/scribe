// src/context/SocketContext.js
import React, { createContext, useContext, useEffect } from "react";
import { socket } from "../socket";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
      console.log("✅ Socket connected:", socket.id);
    }

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connect error:", err.message);
    });

    // ❌ Don't disconnect in StrictMode (React dev double-run issue)
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
