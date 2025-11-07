import { io } from "socket.io-client";

const URL = import.meta.env.VITE_SOCKET_URL; // ✅ pulled from .env
export const socket = io(URL, { autoConnect: false });
