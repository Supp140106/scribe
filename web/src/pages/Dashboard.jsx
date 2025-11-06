import React, { useEffect, useState } from "react";
import bgImage from "../Images/background.png";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [groupedHistory, setGroupedHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      const api = import.meta.env.VITE_API_URL || "http://localhost:3001";

      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${api}/user/history`, {
          method: "GET",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (!res.ok) {
          if (res.status === 401)
            throw new Error("Please log in to view your history.");
          throw new Error("Failed to fetch game history");
        }

        const data = await res.json();
        const reversed = (data.history || []).slice().reverse();
        setHistory(reversed);

        // 🧩 Group by exact date/time (match)
        const grouped = reversed.reduce((acc, game) => {
          const matchTime = new Date(game.date).toLocaleString();
          if (!acc[matchTime]) acc[matchTime] = [];
          acc[matchTime].push(game);
          return acc;
        }, {});
        setGroupedHistory(grouped);
      } catch (err) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading)
    return (
      <div
        className="flex justify-center items-center h-screen text-lg text-gray-100"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        Loading your game history...
      </div>
    );

  if (error)
    return (
      <div
        className="flex justify-center items-center h-screen text-lg text-red-100"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {error}
      </div>
    );

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="bg-white/70 backdrop-blur-md text-3xl font-extrabold px-6 py-2 rounded-2xl shadow-lg border border-white/40">
          Scribble.io
        </h1>
        <button
          onClick={() => navigate("/")}
          className="bg-white/80 hover:bg-white text-indigo-700 border border-indigo-600 px-4 py-2 rounded-lg font-semibold shadow"
        >
          Back
        </button>
      </div>

      {/* Content card */}
      <div className="max-w-5xl mx-auto px-4 pb-10">
        <div className="bg-indigo-200/80 rounded-2xl p-4 shadow-xl border border-indigo-300">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-extrabold text-indigo-800 drop-shadow">
              Game History
            </h2>
            <span className="text-sm text-indigo-700 bg-white/70 px-3 py-1 rounded-full border border-white/60">
              {history.length % 3 + 1} match
            </span>
          </div>

          {history.length === 0 ? (
            <div className="bg-white/80 border border-white/60 rounded-xl p-6 text-center text-indigo-700">
              No games played yet.
            </div>
          ) : (
            <div className="bg-white/80 border border-white/60 rounded-xl max-h-[60vh] overflow-y-auto">
              <ul className="divide-y divide-indigo-100">
                {Object.entries(groupedHistory).map(([date, matches], idx) => (
                  <li
                    key={idx}
                    className="px-4 py-3 hover:bg-indigo-50/60 transition"
                  >
                    <div className="mb-2">
                      <h3 className="text-indigo-800 font-bold text-lg">
                        Match – {date}
                      </h3>
                      <p className="text-indigo-600 text-sm">
                        {5} round{matches.length > 1 ? "s" : ""}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {matches.map((game, subIdx) => {
                        const resultColor =
                          game.result === "win"
                            ? "bg-green-100 text-green-800 border-green-300"
                            : game.result === "loss"
                            ? "bg-red-100 text-red-800 border-red-300"
                            : "bg-yellow-100 text-yellow-800 border-yellow-300";
                        return (
                          <div
                            key={subIdx}
                            className="flex items-center justify-between border border-indigo-100 bg-indigo-50/70 rounded-lg px-3 py-2"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-indigo-900 truncate">
                                vs {game.opponentName}
                              </div>
                              <div className="text-sm text-indigo-700 mt-1 flex gap-3 flex-wrap">
                                <span>You: {game.myScore}</span>
                                <span>Opponent: {game.opponentScore}</span>
                              </div>
                            </div>
                            <span
                              className={`text-xs px-2 py-1 rounded-full border ${resultColor}`}
                            >
                              {game.result?.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
