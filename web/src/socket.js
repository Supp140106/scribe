import { io } from "socket.io-client";

const URL = 'https://scribe-8tvn.onrender.com'
export const socket = io(URL, { autoConnect: false });
