import { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import bgImage from "../Images/background.png";
import { useUser } from "../context/UserContext";

export default function Home({ onNavigate }) {
  const socket = useSocket();
  const [name, setName] = useState("");
  const { setUser } = useUser();

  const handleSubmit = () => {
    socket.emit("register", { name });
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("joinedRoom", (hello) => {
      console.log("Socket data:", hello);
      setUser(hello); // update context -> triggers page switch
    });

    return () => {
      socket.off("joinedRoom");
    };
  }, [socket, setUser]);

  return (
    <div className="h-screen w-full bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})` }}>
      <h1 className="text-7xl text-indigo-50 text-center pt-7">Skribbl.io</h1>

      <div className="bg-indigo-200 max-w-xl h-80 mx-auto mt-28 rounded-2xl flex flex-col items-center justify-center gap-6 p-6">
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-64 p-3 rounded-lg border outline-indigo-600 outline-2 border-gray-300 focus:outline-none text-center text-indigo-600 focus:bg-indigo-50"
        />

        <div className="flex flex-col gap-3 w-64">
          <button
            className="bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700"
            onClick={handleSubmit}
          >
            PLAY
          </button>

          <button 
            className="bg-white text-indigo-700 py-2 border border-indigo-600 rounded-lg font-semibold hover:bg-indigo-50"
            onClick={() => onNavigate('createPrivate')}
          >
            Create Private Room
          </button>
          
          <button 
            className="bg-white text-indigo-700 py-2 border border-indigo-600 rounded-lg font-semibold hover:bg-indigo-50"
            onClick={() => onNavigate('joinPrivate')}
          >
            Join Private Room
          </button>
        </div>
      </div>
    </div>
  );
}
