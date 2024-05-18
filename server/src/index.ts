import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: "http://localhost:5173", // Replace with your frontend URL
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Replace with your frontend URL
    methods: ["GET", "POST"],
  },
});

interface GameState {
  squares: (string | null)[];
  xIsNext: boolean;
}

const initialState: GameState = {
  squares: Array(9).fill(null),
  xIsNext: true,
};

let gameState = initialState;
let players: { [key: string]: number } = {};
let currentPlayerCount = 0;

function calculateWinner(squares: (string | null)[]): string | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}

io.on("connection", (socket: Socket) => {
  if (currentPlayerCount < 2) {
    players[socket.id] = currentPlayerCount;
    currentPlayerCount++;
    socket.emit("playerAssignment", players[socket.id]);
    socket.emit("gameState", gameState);
  } else {
    socket.emit(
      "rejectConnection",
      "Game is full. Please wait for the game to reset."
    );
    socket.disconnect();
  }

  socket.on("makeMove", (index: number) => {
    if (
      players[socket.id] !== undefined &&
      !calculateWinner(gameState.squares) &&
      gameState.squares[index] === null
    ) {
      const currentPlayer = players[socket.id];
      if (
        (currentPlayer === 0 && gameState.xIsNext) ||
        (currentPlayer === 1 && !gameState.xIsNext)
      ) {
        const squares = gameState.squares.slice();
        squares[index] = gameState.xIsNext ? "X" : "O";
        gameState = {
          squares: squares,
          xIsNext: !gameState.xIsNext,
        };
        io.emit("gameState", gameState);
        const winner = calculateWinner(gameState.squares);
        if (winner) {
          io.emit("gameEnd", {
            winner,
            players,
          });
        }
      }
    }
  });

  socket.on("resetGame", () => {
    gameState = initialState;
    players = {};
    currentPlayerCount = 0;
    io.emit("gameState", gameState);
    io.emit("gameReset");
  });

  socket.on("disconnect", () => {
    if (players[socket.id] !== undefined) {
      delete players[socket.id];
      currentPlayerCount--;
    }
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
