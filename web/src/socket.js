import { io } from "socket.io-client";

const URL = 'https://scribe-8tvn.onrender.com'; // ✅ pulled from .env
export const socket = io(URL, { autoConnect: false });
