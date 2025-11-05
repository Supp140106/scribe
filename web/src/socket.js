
import { io } from "socket.io-client";

const URL = "https://scribe-neon-two.vercel.app/"
export const socket = io(URL, { autoConnect: false  });
