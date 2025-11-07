require("dotenv").config();
const cookieSession = require("cookie-session");
const express = require("express");
const mongoose = require("mongoose")
const cors = require("cors")
const http = require("http"); 
const passport = require("passport");
const authRoute = require("./routes/auth");
const user = require("./routes/User")
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

const app = express();
app.use(
  cookieSession({
    name:"session",
    keys:["Suppritdas"],
    maxAge:24*60*60*100
  })
)
app.use(passport.initialize());
app.use(passport.session());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
)

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});
app.use("/auth", authRoute);
app.use("/user",user);

const PORT = process.env.PORT || 3001;

/** Game config (kept same as you had) */
const ROOM_MIN_PLAYERS = 4;
const ROOM_MAX_PLAYERS = 5;
const ROUND_TIME_MS = 60_000;
const INTERMISSION_MS = 6_000;
const ROUNDS_PER_GAME = 5;
const POINTS_CORRECT_GUESS = 100;
const POINTS_DRAWER_PER_GUESS = 25;
const POINTS_FAST_GUESS_BONUS = 50;
const FAST_GUESS_THRESHOLD_MS = 15_000;

const WORDS = [
  "apple",
  "banana",
  "car",
  "house",
  "elephant",
  "rainbow",
  "guitar",
  "pizza",
  "mountain",
  "computer",
  "river",
  "clock",
  "book",
  "tree",
  "sun",
  "moon",
  "star",
  "cat",
  "dog",
  "bicycle",
];

let rooms = {};
let roomCounter = 1;

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createRoom(isPrivate = false) {
  const id = `room-${roomCounter++}`;
  const roomCode = isPrivate ? generateRoomCode() : null;
  rooms[id] = {
    id,
    roomCode,
    isPrivate,
    players: [],
    hostId: null,
    status: "waiting", // waiting | starting | choosing-word | in-round | intermission | finished
    currentWord: null,
    drawerId: null,
    round: 0,
    maxRounds: ROUNDS_PER_GAME,
    roundTimer: null,
    intermissionTimer: null,
    startTimeMs: null,
    drawHistory: [], // store array of completed strokes
    wordChoices: null,
  };
  return rooms[id];
}

function getOrCreateAvailableRoom() {
  const openRoomId = Object.keys(rooms).find((id) => {
    const r = rooms[id];
    return (
      !r.isPrivate &&
      r.players.length < ROOM_MAX_PLAYERS &&
      r.status === "waiting"
    );
  });
  if (openRoomId) return rooms[openRoomId];
  return createRoom(false);
}

function findRoomByCode(code) {
  if (!code) return null;
  const roomId = Object.keys(rooms).find((id) => rooms[id].roomCode === code);
  return roomId ? rooms[roomId] : null;
}

function listPublicPlayers(room) {
  return room.players.map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    guessed: p.guessed,
    connected: p.connected,
  }));
}

function addPlayerToRoom(room, socketId, username, opts = {}) {
  const player = {
    id: socketId,
    name: username,
    score: 0,
    connected: true,
    guessed: false,
    userId: opts.userId || null,
    avatar: opts.avatar || null,
  };
  room.players.push(player);
  if (!room.hostId) room.hostId = socketId;
  return player;
}

function findRoomBySocketId(socketId) {
  const roomId = Object.keys(rooms).find((rid) =>
    rooms[rid].players.some((p) => p.id === socketId),
  );
  if (!roomId) return undefined;
  return rooms[roomId];
}

function clearTimers(room) {
  if (!room) return;
  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
    room.roundTimer = null;
  }
  if (room.intermissionTimer) {
    clearTimeout(room.intermissionTimer);
    room.intermissionTimer = null;
  }
}

function cleanupRoom(roomId) {
  const r = rooms[roomId];
  if (!r) return;
  clearTimers(r);
  delete rooms[roomId];
}

function tryStartGame(room) {
  if (room.players.length >= ROOM_MIN_PLAYERS && room.status === "waiting") {
    room.status = "starting";
    room.round = 0;
    room.players.forEach((p) => {
      p.score = 0;
      p.guessed = false;
    });
    io.to(room.id).emit("roomStatus", { status: room.status });
    // small delay before first round starts
    room.intermissionTimer = setTimeout(() => startNextRound(room), 1500);
  }
}

function getWords() {
  const result = [];
  const used = new Set();
  while (result.length < 3) {
    const idx = Math.floor(Math.random() * WORDS.length);
    if (!used.has(idx)) {
      used.add(idx);
      result.push(WORDS[idx]);
    }
  }
  return result;
}

function endRound(room, { revealWord = false } = {}) {
  if (!room) return;
  clearTimers(room);

  // mark any players who didn't guess as guessed=false already is fine
  room.status = "intermission";
  io.to(room.id).emit("roundEnd", {
    round: room.round,
    word: revealWord ? room.currentWord : null,
    scores: room.players.map(({ id, name, score }) => ({ id, name, score })),
  });

  io.to(room.id).emit("playerList", listPublicPlayers(room));

  // schedule next round or finish
  room.intermissionTimer = setTimeout(
    () => startNextRound(room),
    INTERMISSION_MS,
  );
}

const finishGame = async (room) => {
  if (!room) return;

  clearTimers(room);
  room.status = "finished";

  const scores = room.players.map(({ id, name, score }) => ({ id, name, score }));
  io.to(room.id).emit("gameFinished", { scores });

  // Persist pairwise history for authenticated players
  try {
    const playersWithUser = room.players.filter((p) => p.userId);
    const when = new Date();
    for (const p of playersWithUser) {
      const entries = [];
      for (const q of playersWithUser) {
        if (p.userId === q.userId) continue;
        const myScore = p.score || 0;
        const opponentScore = q.score || 0;
        const result = myScore > opponentScore ? "win" : myScore < opponentScore ? "loss" : "draw";
        entries.push({
          opponentId: q.userId,
          opponentName: q.name,
          myScore,
          opponentScore,
          result,
          date: when,
          roomId: room.id,
        });
      }
      if (entries.length) {
        await User.updateOne(
          { _id: p.userId },
          { $push: { gameHistory: { $each: entries } } }
        );
      }
    }
  } catch (err) {
    console.error("Error saving game history:", err);
  }
};


function startNextRound(room) {
  if (!room) return;
  clearTimers(room);

  // if reached max rounds -> finish
  if (room.round >= room.maxRounds) {
    return finishGame(room);
  }

  room.round += 1;
  room.status = "choosing-word";
  room.startTimeMs = null;
  room.drawHistory = []; // clear history for new round
  io.to(room.id).emit("clearCanvas");
  room.currentWord = null;

  // determine drawer: rotate through players based on round number
  if (room.players.length === 0) {
    // no players, cleanup room
    return cleanupRoom(room.id);
  }
  const drawerIndex = (room.round - 1) % room.players.length;
  room.drawerId = room.players[drawerIndex].id;
  room.players.forEach((p) => (p.guessed = false));

  const wordChoices = getWords();
  room.wordChoices = wordChoices;

  io.to(room.id).emit("roundStart", {
    round: room.round,
    maxRounds: room.maxRounds,
    drawerId: room.drawerId,
    choosingWord: true,
  });

  // send the chooser the words
  io.to(room.drawerId).emit("chooseWord", { words: wordChoices });
}

/** API health */
app.get("/health", (req, res) => res.send("Running..."));

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  // helper to decode JWT from client payload
  function parseClientToken(token) {
    try {
      if (!token) return null;
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      return { userId: payload.id, name: payload.name, avatar: payload.picture };
    } catch {
      return null;
    }
  }

  socket.on("createPrivateRoom", ({ name, token, avatar }) => {
    try {
      if (!name?.trim()) {
        socket.emit("errorMessage", { message: "Invalid name." });
        return;
      }

      const room = createRoom(true);
      const auth = parseClientToken(token);
      addPlayerToRoom(room, socket.id, name, { userId: auth?.userId || null, avatar: avatar || auth?.avatar || null });
      socket.join(room.id);

      const players = listPublicPlayers(room);

      socket.emit("joinedRoom", {
        roomId: room.id,
        roomCode: room.roomCode,
        isPrivate: room.isPrivate,
        status: room.status,
        round: room.round,
        drawerId: room.drawerId,
        youAreDrawer: room.drawerId === socket.id,
        players,
        playerCount: players.length,
      });

      io.to(room.id).emit("playerList", players);
      io.to(room.id).emit("roomStatus", { status: room.status });

      console.log(
        `🔒 ${name} created private room ${room.id} with code ${room.roomCode}`,
      );
    } catch (err) {
      console.error("createPrivateRoom error:", err);
    }
  });

  socket.on("joinPrivateRoom", ({ name, roomCode, token, avatar }) => {
    try {
      if (!name?.trim()) {
        socket.emit("errorMessage", { message: "Invalid name." });
        return;
      }

      if (!roomCode?.trim()) {
        socket.emit("errorMessage", { message: "Invalid room code." });
        return;
      }

      const room = findRoomByCode(roomCode.toUpperCase());
      if (!room) {
        socket.emit("errorMessage", { message: "Room not found." });
        return;
      }

      if (room.players.length >= ROOM_MAX_PLAYERS) {
        socket.emit("errorMessage", { message: "Room is full." });
        return;
      }

      const auth = parseClientToken(token);
      addPlayerToRoom(room, socket.id, name, { userId: auth?.userId || null, avatar: avatar || auth?.avatar || null });
      socket.join(room.id);

      const players = listPublicPlayers(room);

      socket.emit("joinedRoom", {
        roomId: room.id,
        roomCode: room.roomCode,
        isPrivate: room.isPrivate,
        status: room.status,
        round: room.round,
        drawerId: room.drawerId,
        youAreDrawer: room.drawerId === socket.id,
        players,
        playerCount: players.length,
      });

      io.to(room.id).emit("playerList", players);
      io.to(room.id).emit("roomStatus", { status: room.status });

      console.log(
        `🔓 ${name} joined private room ${room.id} with code ${room.roomCode}`,
      );

      // Load existing canvas if game in progress
      if (room.status === "in-round" && room.drawHistory?.length) {
        socket.emit("loadCanvas", { drawHistory: room.drawHistory });
      }

      if (
        room.status === "choosing-word" &&
        room.drawerId === socket.id &&
        room.wordChoices
      ) {
        socket.emit("chooseWord", { words: room.wordChoices });
      }

      tryStartGame(room);
    } catch (err) {
      console.error("joinPrivateRoom error:", err);
    }
  });

  socket.on("register", ({ name, token, avatar }) => {
    try {
      if (!name?.trim()) {
        socket.emit("errorMessage", { message: "Invalid name." });
        return;
      }

      const room = getOrCreateAvailableRoom();
      const auth = parseClientToken(token);
      addPlayerToRoom(room, socket.id, name, { userId: auth?.userId || null, avatar: avatar || auth?.avatar || null });
      socket.join(room.id);

      const players = listPublicPlayers(room);

      socket.emit("joinedRoom", {
        roomId: room.id,
        roomCode: room.roomCode,
        isPrivate: room.isPrivate,
        status: room.status,
        round: room.round,
        drawerId: room.drawerId,
        youAreDrawer: room.drawerId === socket.id,
        players,
        playerCount: players.length,
      });

      io.to(room.id).emit("playerList", players);
      io.to(room.id).emit("roomStatus", { status: room.status });

      console.log(`👥 ${name} joined ${room.id}`);

      // If a round is ongoing send existing draw history & wordChoices to drawer
      if (room.status === "in-round" && room.drawHistory?.length) {
        socket.emit("loadCanvas", { drawHistory: room.drawHistory });
      }

      // If drawer reconnects while choosing word, re-send choices
      if (
        room.status === "choosing-word" &&
        room.drawerId === socket.id &&
        room.wordChoices
      ) {
        socket.emit("chooseWord", { words: room.wordChoices });
      }

      tryStartGame(room);
    } catch (err) {
      console.error("register error:", err);
    }
  });

  /** 🖌️ DRAWING EVENTS */

  // Real-time segment drawing for live preview
  socket.on("draw", ({ roomId, x0, y0, x1, y1, color, size }) => {
    if (!roomId) return;
    if ([x0, y0, x1, y1].some((v) => typeof v !== "number")) return;
    socket.to(roomId).emit("draw", { x0, y0, x1, y1, color, size });
  });

  // Client finished a stroke (blob of path)
  socket.on("endStroke", ({ roomId, stroke }) => {
    console.log(`📥 Received endStroke from ${socket.id}:`, {
      roomId,
      pointCount: stroke?.points?.length,
    });

    if (!roomId || !stroke) {
      console.log("❌ Missing roomId or stroke data");
      return;
    }

    const room = rooms[roomId];
    if (!room) {
      console.log(`❌ Room ${roomId} not found`);
      return;
    }

    console.log(
      `🖌️ Broadcasting stroke to room ${roomId}: ${
        stroke.points?.length || 0
      } points`,
    );
    console.log(
      `   Players in room: ${room.players.map((p) => p.name).join(", ")}`,
    );

    room.drawHistory.push(stroke);

    // send stroke to everyone else in the room
    socket.to(roomId).emit("endStroke", { stroke });
    console.log(`✅ Stroke broadcasted to other players in ${roomId}`);
  });

  // Clear canvas for room
  socket.on("clearCanvas", ({ roomId }) => {
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room) return;

    room.drawHistory = [];
    io.to(roomId).emit("clearCanvas");
  });

  // Undo last stroke
  socket.on("undoCanvas", ({ roomId }) => {
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room) return;

    if (room.drawHistory.length > 0) {
      room.drawHistory.pop(); // remove last stroke
    }
    io.to(roomId).emit("undoCanvas", { drawHistory: room.drawHistory });
  });

  /** WORD CHOICE from drawer */
  socket.on("chooseWord", ({ roomId, word }) => {
    try {
      if (!roomId || !word) return;
      const room = rooms[roomId];
      if (!room) return;
      if (socket.id !== room.drawerId) {
        socket.emit("errorMessage", {
          message: "Only the drawer can choose the word.",
        });
        return;
      }
      // verify word is one of the choices (defensive)
      if (!room.wordChoices || !room.wordChoices.includes(word)) {
        socket.emit("errorMessage", { message: "Invalid word choice." });
        return;
      }

      // Set current word and begin the round
      room.currentWord = word;
      room.status = "in-round";
      room.startTimeMs = Date.now();
      // reset player guesses
      room.players.forEach(
        (p) => (p.guessed = p.id === room.drawerId ? true : false),
      );

      // notify room that round is now in progress (do NOT reveal the word except to drawer)
      io.to(room.id).emit("roundInProgress", {
        round: room.round,
        drawerId: room.drawerId,
        roundTimeMs: ROUND_TIME_MS,
        startTimeMs: room.startTimeMs,
      });

      // tell the drawer the secret word (so front-end can show it)
      io.to(room.drawerId).emit("yourWord", { word: room.currentWord });

      // start round timer
      room.roundTimer = setTimeout(() => {
        // time up — reveal the word and end round
        endRound(room, { revealWord: true });
      }, ROUND_TIME_MS);

      io.to(room.id).emit("playerList", listPublicPlayers(room));
    } catch (err) {
      console.error("chooseWord error:", err);
    }
  });

  /** 💬 PRIVATE MESSAGES (DMs within same room) */
  socket.on("privateMessage", ({ roomId, to, text }) => {
    try {
      if (!roomId || !to || !text) return;
      const room = rooms[roomId];
      if (!room) return;
      // disallow sending DM to self
      if (to === socket.id) return;
      const sender = room.players.find((p) => p.id === socket.id);
      const isRecipientInRoom = room.players.some((p) => p.id === to);
      if (!sender || !isRecipientInRoom) return;

      const payload = {
        roomId,
        from: socket.id,
        fromName: sender.name,
        text: String(text),
        timestamp: Date.now(),
      };
      // deliver privately to target
      io.to(to).emit("privateMessage", payload);
      // ack to sender so UI can show the message immediately
      socket.emit("privateMessageDelivered", { ...payload, to });
    } catch (err) {
      console.error("privateMessage error:", err);
    }
  });

  /** 🧠 GUESS SYSTEM & ROUND FLOW */
  socket.on("guess", ({ roomId, guess }) => {
    try {
      if (!roomId || !guess) return;
      const room = rooms[roomId];
      if (!room) return;
      if (room.status !== "in-round") return; // only accept guesses when in-round

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;
      if (player.guessed) return; // already guessed correctly

      // normalize compare
      const normalizedGuess = String(guess).trim().toLowerCase();
      const normalizedWord = String(room.currentWord || "")
        .trim()
        .toLowerCase();

      // broadcast chat/guess to room (so everyone sees guesses)
      // io.to(room.id).emit("chatGuess", {
      //   id: socket.id,
      //   name: player.name,
      //   guess,
      // });

      if (
        normalizedGuess &&
        normalizedWord &&
        normalizedGuess === normalizedWord
      ) {
        // correct guess
        player.guessed = true;

        // time-based bonus
        const now = Date.now();
        const elapsed = room.startTimeMs
          ? now - room.startTimeMs
          : ROUND_TIME_MS;
        const fastBonus =
          elapsed <= FAST_GUESS_THRESHOLD_MS ? POINTS_FAST_GUESS_BONUS : 0;

        player.score += POINTS_CORRECT_GUESS + fastBonus;

        // give drawer points for this correct guess
        const drawer = room.players.find((p) => p.id === room.drawerId);
        if (drawer) {
          drawer.score += POINTS_DRAWER_PER_GUESS;
        }

        // notify everyone of the correct guess
        io.to(room.id).emit("correctGuess", {
          playerId: player.id,
          playerName: player.name,
          scores: room.players.map(({ id, name, score }) => ({
            id,
            name,
            score,
          })),
          fastBonus,
        });

        io.to(room.id).emit("playerList", listPublicPlayers(room));

        // if all non-drawer players have guessed, end the round early (reveal word)
        const nonDrawerPlayers = room.players.filter(
          (p) => p.id !== room.drawerId,
        );
        console.log(
          "DEBUG — guessed state:",
          room.players.map((p) => ({ name: p.name, guessed: p.guessed })),
        );

        const allGuessed = nonDrawerPlayers.every((p) => p.guessed === true);
        if (allGuessed) {
          endRound(room, { revealWord: true });
        }
      }
    } catch (err) {
      console.error("guess error:", err);
    }
  });

  // Graceful leave without closing the socket
  socket.on("leaveRoom", (payload = {}, ack) => {
    try {
      const roomId = payload.roomId || (findRoomBySocketId(socket.id)?.id);
      const room = roomId ? rooms[roomId] : null;
      if (!room) { if (ack) ack(false); return; }

      room.players = room.players.filter((p) => p.id !== socket.id);

      if (room.players.length === 0) {
        cleanupRoom(room.id);
      } else {
        if (room.drawerId === socket.id && room.status === "in-round") {
          io.to(room.id).emit("system", { type: "drawerLeft" });
          endRound(room, { revealWord: true });
        }
        if (room.drawerId === socket.id && room.status === "choosing-word") {
          io.to(room.id).emit("system", { type: "drawerLeftDuringChoose" });
          room.wordChoices = null;
          clearTimers(room);
          room.intermissionTimer = setTimeout(() => startNextRound(room), 1000);
        }
        if (!room.players.some((p) => p.id === room.drawerId)) {
          room.drawerId = room.players.length ? room.players[0].id : null;
        }
        if (!room.hostId || !room.players.some((p) => p.id === room.hostId)) {
          room.hostId = room.players.length ? room.players[0].id : null;
        }
        io.to(room.id).emit("playerList", listPublicPlayers(room));
      }
      if (ack) ack(true);
    } catch (err) {
      console.error("leaveRoom error:", err);
      if (ack) ack(false);
    }
  });

  socket.on("disconnecting", () => {
    try {
      const room = findRoomBySocketId(socket.id);
      if (!room) return;

      // mark player disconnected and remove from players list
      room.players = room.players.filter((p) => p.id !== socket.id);

      // if room empty, cleanup
      if (room.players.length === 0) return cleanupRoom(room.id);

      // if drawer left while in-round, end the round and reveal word
      if (room.drawerId === socket.id && room.status === "in-round") {
        io.to(room.id).emit("system", { type: "drawerLeft" });
        endRound(room, { revealWord: true });
      }

      // if drawer left while choosing-word, move to next round immediately
      if (room.drawerId === socket.id && room.status === "choosing-word") {
        io.to(room.id).emit("system", { type: "drawerLeftDuringChoose" });
        // clear wordChoices to avoid reuse
        room.wordChoices = null;
        // start next round after a small delay
        clearTimers(room);
        room.intermissionTimer = setTimeout(() => startNextRound(room), 1000);
      }

      // ensure drawerId still points to an existing player (if not, reassign host)
      if (!room.players.some((p) => p.id === room.drawerId)) {
        room.drawerId = room.players.length ? room.players[0].id : null;
      }
      if (!room.hostId || !room.players.some((p) => p.id === room.hostId)) {
        room.hostId = room.players.length ? room.players[0].id : null;
      }

      io.to(room.id).emit("playerList", listPublicPlayers(room));
    } catch (err) {
      console.error("disconnect error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("❌ MONGODB_URI is not set. Configure it in your environment or server/.env");
      process.exit(1);
    }

    // Connect first, then register passport strategies and start server
    await mongoose.connect(process.env.MONGODB_URI);
    const redacted = (() => {
      try {
        const url = new URL(process.env.MONGODB_URI);
        return `${url.protocol}//${url.host}${url.pathname}`;
      } catch {
        return "<redacted>";
      }
    })();
    console.log("✅ MongoDB connected:", redacted);

    require("./passport");

    server.listen(PORT, () => console.log("Server running on port", PORT));
  } catch (err) {
    console.error("❌ Failed to start server:", err?.message || err);
    process.exit(1);
  }
}

start();
