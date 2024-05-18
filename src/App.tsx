import { useState, useEffect } from "react";
import io from "socket.io-client";

interface SquareProps {
  value: string | null;
  onSquareClick: () => void;
}

interface BoardProps {
  xIsNext: boolean;
  squares: (string | null)[];
  onPlay: (i: number) => void;
}

const socket = io("http://localhost:3000"); // Ensure this matches your server's URL

function Square({ value, onSquareClick }: SquareProps) {
  return (
    <button
      className="square"
      style={{ padding: "1em" }}
      onClick={onSquareClick}
    >
      {value}
    </button>
  );
}

function Board({ xIsNext, squares, onPlay }: BoardProps) {
  function handleClick(i: number) {
    onPlay(i);
  }

  const winner = calculateWinner(squares);
  let status;
  if (winner) {
    status = "Winner: " + winner;
  } else {
    status = "Next player: " + (xIsNext ? "X" : "O");
  }

  return (
    <>
      <div className="status">{status}</div>
      <div className="board-row">
        <Square value={squares[0]} onSquareClick={() => handleClick(0)} />
        <Square value={squares[1]} onSquareClick={() => handleClick(1)} />
        <Square value={squares[2]} onSquareClick={() => handleClick(2)} />
      </div>
      <div className="board-row">
        <Square value={squares[3]} onSquareClick={() => handleClick(3)} />
        <Square value={squares[4]} onSquareClick={() => handleClick(4)} />
        <Square value={squares[5]} onSquareClick={() => handleClick(5)} />
      </div>
      <div className="board-row">
        <Square value={squares[6]} onSquareClick={() => handleClick(6)} />
        <Square value={squares[7]} onSquareClick={() => handleClick(7)} />
        <Square value={squares[8]} onSquareClick={() => handleClick(8)} />
      </div>
    </>
  );
}

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

export default function Game() {
  const [gameState, setGameState] = useState({
    squares: Array(9).fill(null),
    xIsNext: true,
  });
  const [player, setPlayer] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    socket.on("gameState", (state) => {
      setGameState(state);
      setResult(null);
    });

    socket.on("playerAssignment", (player: number) => {
      setPlayer(player);
    });

    socket.on("rejectConnection", (message: string) => {
      setMessage(message);
    });

    socket.on("gameEnd", ({ winner, players }) => {
      if (player !== null) {
        if (winner === "X" && players[socket.id] === 0) {
          setResult("Victory");
        } else if (winner === "O" && players[socket.id] === 1) {
          setResult("Victory");
        } else {
          setResult("Defeat");
        }
      }
    });

    socket.on("gameReset", () => {
      setMessage("");
      setResult(null);
    });

    return () => {
      socket.off("gameState");
      socket.off("playerAssignment");
      socket.off("rejectConnection");
      socket.off("gameEnd");
      socket.off("gameReset");
    };
  }, [player]);

  function handlePlay(index: number) {
    if (
      player !== null &&
      ((player === 0 && gameState.xIsNext) ||
        (player === 1 && !gameState.xIsNext))
    ) {
      socket.emit("makeMove", index);
    }
  }

  function handleReset() {
    socket.emit("resetGame");
    setMessage("");
  }

  return (
    <div
      className="game"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="game-board">
        <Board
          xIsNext={gameState.xIsNext}
          squares={gameState.squares}
          onPlay={handlePlay}
        />
      </div>
      <div className="game-info">
        {message && <div className="message">{message}</div>}
        {result && <div className="result">{result}</div>}
        <button onClick={handleReset}>Reset Game</button>
      </div>
    </div>
  );
}
