import React, { useState, useEffect, useRef, useCallback } from "react";

/* ----------------------------------------------------------------------
   PALLANKUZHI  —  a quiet, traditional two-row seed-sowing game
   ------------------------------------------------------------------- */

const FONTS_LINK_ID = "pallankuzhi-fonts";

function useGoogleFonts() {
  useEffect(() => {
    if (document.getElementById(FONTS_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONTS_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Rozha+One&family=Mukta:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

/* ---------------------------- game constants --------------------------- */

const PLAYER_PITS = ["p0", "p1", "p2", "p3", "p4", "p5"];
const AI_PITS = ["a0", "a1", "a2", "a3", "a4", "a5"];
const ALL_PITS = [...PLAYER_PITS, ...AI_PITS];

// Counter-clockwise sowing order: player row left->right, then AI row right->left.
const CIRCULAR_ORDER = ["p0", "p1", "p2", "p3", "p4", "p5", "a5", "a4", "a3", "a2", "a1", "a0"];

const OPPOSITE = {
  p0: "a0", p1: "a1", p2: "a2", p3: "a3", p4: "a4", p5: "a5",
  a0: "p0", a1: "p1", a2: "p2", a3: "p3", a4: "p4", a5: "p5",
};

function initialBoard() {
  const b = {};
  ALL_PITS.forEach((id) => (b[id] = 4));
  return b;
}

function cloneBoard(b) {
  return { ...b };
}

function sideOf(pitId) {
  return pitId[0] === "p" ? "player" : "ai";
}

function sumSide(board, side) {
  const pits = side === "player" ? PLAYER_PITS : AI_PITS;
  return pits.reduce((s, id) => s + board[id], 0);
}

/**
 * Sows the seeds from `startPit` counter-clockwise and applies the capture
 * rule. Returns a new board, the number of seeds captured, the pit the last
 * seed landed in, and whether that landing triggered a capture.
 */
function sow(board, startPit, side) {
  const b = cloneBoard(board);
  let seeds = b[startPit];
  b[startPit] = 0;

  let idx = CIRCULAR_ORDER.indexOf(startPit);
  let last = startPit;
  while (seeds > 0) {
    idx = (idx + 1) % CIRCULAR_ORDER.length;
    last = CIRCULAR_ORDER[idx];
    b[last] += 1;
    seeds -= 1;
  }

  let captured = 0;
  let didCapture = false;
  const landedOnOwnSide = sideOf(last) === side;

  if (landedOnOwnSide && b[last] === 1) {
    // The pit was empty before this last seed dropped in.
    const opp = OPPOSITE[last];
    if (b[opp] > 0) {
      captured = b[last] + b[opp];
      b[last] = 0;
      b[opp] = 0;
    } else {
      captured = b[last];
      b[last] = 0;
    }
    didCapture = true;
  }

  return { board: b, captured, lastPit: last, didCapture };
}

function validMoves(board, side) {
  const pits = side === "player" ? PLAYER_PITS : AI_PITS;
  return pits.filter((id) => board[id] > 0);
}

/* ------------------------------- AI logic ------------------------------- */

function chooseAiMove(board) {
  const moves = validMoves(board, "ai");
  if (moves.length === 0) return null;

  let bestScore = -Infinity;
  let bestPits = [];

  for (const pit of moves) {
    const { board: afterAi, captured: aiCap } = sow(board, pit, "ai");

    // Look one reply ahead: how much could the player capture back?
    let bestReply = 0;
    for (const replyPit of validMoves(afterAi, "player")) {
      const { captured: replyCap } = sow(afterAi, replyPit, "player");
      if (replyCap > bestReply) bestReply = replyCap;
    }

    const score = aiCap * 2 - bestReply;

    if (score > bestScore) {
      bestScore = score;
      bestPits = [pit];
    } else if (score === bestScore) {
      bestPits.push(pit);
    }
  }

  return bestPits[Math.floor(Math.random() * bestPits.length)];
}

/* ------------------------------ small parts ----------------------------- */

function Seeds({ count }) {
  // A tidy little cluster of seed-marks rather than a literal count of dots,
  // so wells with many seeds don't get visually noisy.
  const shown = Math.min(count, 5);
  const dots = Array.from({ length: shown });
  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <div className="grid grid-cols-3 gap-0.5 place-items-center">
        {dots.map((_, i) => (
          <span
            key={i}
            className="block rounded-full"
            style={{
              width: 9,
              height: 12,
              background:
                "radial-gradient(circle at 35% 30%, #f2d9a8, #b9803f 65%, #7a4f24)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.45)",
              transform: `rotate(${(i * 47) % 360}deg)`,
            }}
          />
        ))}
      </div>
      {count > 0 && (
        <span
          className="absolute -bottom-1 -right-1 text-[11px] font-semibold rounded-full px-1.5"
          style={{ background: "#3b2414", color: "#f3e4c8", lineHeight: "16px" }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function Pit({ id, count, onClick, disabled, highlight, flash }) {
  return (
    <button
      onClick={() => onClick(id)}
      disabled={disabled}
      className={
        "relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-transform duration-150 " +
        (disabled ? "cursor-default" : "cursor-pointer hover:scale-105 active:scale-95")
      }
      style={{
        background: "radial-gradient(circle at 50% 40%, #4a2c15, #2c1a0d 75%)",
        boxShadow: flash
          ? "inset 0 3px 8px rgba(0,0,0,0.7), 0 0 0 3px #d4a437"
          : highlight
          ? "inset 0 3px 8px rgba(0,0,0,0.7), 0 0 0 2px rgba(212,164,55,0.55)"
          : "inset 0 3px 8px rgba(0,0,0,0.7)",
      }}
      aria-label={`Well ${id} with ${count} seeds`}
    >
      <Seeds count={count} />
    </button>
  );
}

/* ------------------------------- screens -------------------------------- */

function WoodBoardIllustration({ className }) {
  return (
    <svg viewBox="0 0 320 140" className={className} role="img" aria-label="Pallankuzhi wooden board">
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9a6a37" />
          <stop offset="100%" stopColor="#6d451f" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="312" height="132" rx="18" fill="url(#wood)" stroke="#3f2610" strokeWidth="4" />
      {[0, 1].map((row) =>
        Array.from({ length: 6 }).map((_, col) => (
          <ellipse
            key={`${row}-${col}`}
            cx={40 + col * 48}
            cy={row === 0 ? 45 : 95}
            rx="17"
            ry="14"
            fill="#2c1a0d"
            opacity="0.9"
          />
        ))
      )}
    </svg>
  );
}

function WelcomeScreen({ onPlayAi, onPlayHuman, onRules }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6" style={{ background: "radial-gradient(circle at 50% 0%, #7a4f24 0%, #3c2513 70%)" }}>
      <div className="flex flex-col items-center text-center max-w-md">
        <WoodBoardIllustration className="w-64 sm:w-80 drop-shadow-2xl mb-8" />
        <h1
          className="text-5xl sm:text-6xl mb-2 tracking-wide"
          style={{ fontFamily: "'Rozha One', serif", color: "#f6e6c4" }}
        >
          Pallankuzhi
        </h1>
        <p className="mb-10 text-base sm:text-lg" style={{ fontFamily: "'Mukta', sans-serif", color: "#e3c99b" }}>
          The old game of counting seeds and wells, played one quiet move at a time.
        </p>
        <div className="flex flex-col gap-3 w-64">
          <button
            onClick={onPlayAi}
            className="py-3 rounded-full text-lg font-semibold transition-transform hover:scale-105 active:scale-95"
            style={{ background: "#d4a437", color: "#3c2513", fontFamily: "'Mukta', sans-serif" }}
          >
            Play vs AI
          </button>
          <button
            onClick={onPlayHuman}
            className="py-3 rounded-full text-lg font-semibold transition-transform hover:scale-105 active:scale-95"
            style={{ background: "#e3c99b", color: "#3c2513", fontFamily: "'Mukta', sans-serif" }}
          >
            Play vs Friend
          </button>
          <button
            onClick={onRules}
            className="py-3 rounded-full text-lg font-medium border transition-colors hover:bg-white/10"
            style={{ borderColor: "#e3c99b", color: "#f6e6c4", fontFamily: "'Mukta', sans-serif" }}
          >
            Rules
          </button>
        </div>
      </div>
    </div>
  );
}

function RulesScreen({ onBack }) {
  const steps = [
    "Every well begins with four seeds — forty-eight seeds on the board in all.",
    "One side plays the six wells in the bottom row; the other side (the AI, or a friend sharing the device) plays the six in the top row.",
    "On your turn, pick up all the seeds from one of your own wells.",
    "Drop them one by one into each following well, moving counter-clockwise around the board.",
    "If your very last seed lands in one of your own wells that was empty, you capture it — along with everything sitting in the well directly opposite.",
    "Captured seeds leave the board and go into your store for good.",
    "Turns alternate between the two sides.",
    "Play continues until one side's six wells are completely empty.",
    "The other side then keeps whatever seeds are left on their own side.",
    "Whoever has captured the most seeds wins.",
  ];

  return (
    <div className="min-h-screen w-full px-6 py-10 flex flex-col items-center" style={{ background: "#f3e4c8" }}>
      <div className="max-w-xl w-full">
        <h2 className="text-3xl mb-6" style={{ fontFamily: "'Rozha One', serif", color: "#3c2513" }}>
          How to play
        </h2>

        <WoodBoardIllustration className="w-full mb-8" />

        <ol className="space-y-4 mb-10">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3" style={{ fontFamily: "'Mukta', sans-serif", color: "#3c2513" }}>
              <span
                className="flex-none w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold"
                style={{ background: "#3c2513", color: "#f3e4c8" }}
              >
                {i + 1}
              </span>
              <p className="leading-relaxed">{s}</p>
            </li>
          ))}
        </ol>

        <button
          onClick={onBack}
          className="py-3 px-8 rounded-full text-lg font-semibold transition-transform hover:scale-105 active:scale-95"
          style={{ background: "#3c2513", color: "#f3e4c8", fontFamily: "'Mukta', sans-serif" }}
        >
          Back
        </button>
      </div>
    </div>
  );
}

function GameScreen({ mode, onExit, onGameOver }) {
  const isAiMode = mode === "ai";
  const nameFor = (side) => {
    if (isAiMode) return side === "player" ? "You" : "AI";
    return side === "player" ? "Player 1" : "Player 2";
  };
  const turnLabel = (side) => {
    if (isAiMode) return side === "player" ? "Your turn" : "AI's turn";
    return `${nameFor(side)}'s turn`;
  };

  const [board, setBoard] = useState(initialBoard);
  const [turn, setTurn] = useState("player"); // 'player' | 'ai'
  const [playerStore, setPlayerStore] = useState(0);
  const [aiStore, setAiStore] = useState(0);
  const [history, setHistory] = useState([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [flashPit, setFlashPit] = useState(null);
  const [locked, setLocked] = useState(false);
  const historyEndRef = useRef(null);

  const pushHistory = useCallback((entry) => {
    setHistory((h) => [entry, ...h].slice(0, 30));
  }, []);

  const finishIfOver = useCallback(
    (b, pStore, aStore) => {
      const playerEmpty = sumSide(b, "player") === 0;
      const aiEmpty = sumSide(b, "ai") === 0;
      if (!playerEmpty && !aiEmpty) return false;

      let finalPlayer = pStore;
      let finalAi = aStore;
      if (playerEmpty) {
        finalAi += sumSide(b, "ai");
      } else if (aiEmpty) {
        finalPlayer += sumSide(b, "player");
      }
      setPlayerStore(finalPlayer);
      setAiStore(finalAi);
      setTimeout(() => onGameOver({ playerStore: finalPlayer, aiStore: finalAi }), 900);
      return true;
    },
    [onGameOver]
  );

  const applyMove = useCallback(
    (pit, side) => {
      setBoard((current) => {
        const { board: newBoard, captured, lastPit, didCapture } = sow(current, pit, side);

        if (didCapture && captured > 0) {
          setFlashPit(lastPit);
          setTimeout(() => setFlashPit(null), 550);
        }

        const label = nameFor(side);
        const wellLabel = pit.toUpperCase();
        if (captured > 0) {
          pushHistory(`${label} sowed from ${wellLabel} and captured ${captured} seed${captured === 1 ? "" : "s"}.`);
        } else {
          pushHistory(`${label} sowed from ${wellLabel}.`);
        }

        let newPlayerStore = playerStore;
        let newAiStore = aiStore;
        if (captured > 0) {
          if (side === "player") newPlayerStore += captured;
          else newAiStore += captured;
          if (side === "player") setPlayerStore(newPlayerStore);
          else setAiStore(newAiStore);
        }

        const over = finishIfOver(newBoard, newPlayerStore, newAiStore);
        if (!over) {
          setTurn(side === "player" ? "ai" : "player");
        }
        return newBoard;
      });
    },
    [playerStore, aiStore, pushHistory, finishIfOver]
  );

  // AI's turn (only in vs-AI mode)
  useEffect(() => {
    if (!isAiMode) return;
    if (turn !== "ai") return;
    if (validMoves(board, "ai").length === 0) return;
    setAiThinking(true);
    setLocked(true);
    const delay = 1000 + Math.random() * 700;
    const t = setTimeout(() => {
      const move = chooseAiMove(board);
      setAiThinking(false);
      setLocked(false);
      if (move) applyMove(move, "ai");
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn]);

  const handlePitClick = (id) => {
    if (locked) return;
    const side = sideOf(id);
    if (isAiMode && side !== "player") return; // AI's row isn't tappable
    if (turn !== side) return;
    if (board[id] === 0) return;
    setLocked(true);
    applyMove(id, side);
    setLocked(false);
  };

  const resetGame = () => {
    setBoard(initialBoard());
    setTurn("player");
    setPlayerStore(0);
    setAiStore(0);
    setHistory([]);
    setAiThinking(false);
    setLocked(false);
  };

  return (
    <div className="min-h-screen w-full px-4 py-6 flex flex-col items-center" style={{ background: "#efdcb8" }}>
      <div className="w-full max-w-3xl flex items-center justify-between mb-4">
        <h2 className="text-2xl" style={{ fontFamily: "'Rozha One', serif", color: "#3c2513" }}>
          Pallankuzhi
        </h2>
        <div
          className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300"
          style={{
            background: turn === "player" ? "#d4a437" : "#3c2513",
            color: turn === "player" ? "#3c2513" : "#f3e4c8",
            fontFamily: "'Mukta', sans-serif",
          }}
        >
          {aiThinking ? "AI is thinking…" : turnLabel(turn)}
        </div>
      </div>

      {/* score cards */}
      <div className="w-full max-w-3xl grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ background: "#3c2513" }}>
          <span style={{ fontFamily: "'Mukta', sans-serif", color: "#e3c99b" }}>{nameFor("player")}</span>
          <span className="text-xl font-bold" style={{ color: "#f6e6c4" }}>{playerStore}</span>
        </div>
        <div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ background: "#3c2513" }}>
          <span style={{ fontFamily: "'Mukta', sans-serif", color: "#e3c99b" }}>{nameFor("ai")}</span>
          <span className="text-xl font-bold" style={{ color: "#f6e6c4" }}>{aiStore}</span>
        </div>
      </div>

      {/* board */}
      <div
        className="w-full max-w-3xl rounded-3xl p-4 sm:p-6 mb-4"
        style={{
          background: "linear-gradient(180deg, #9a6a37, #6d451f)",
          boxShadow: "0 12px 30px rgba(0,0,0,0.35), inset 0 0 0 4px #3f2610",
        }}
      >
        <div className="flex flex-col gap-3 sm:gap-5 items-center">
          <div className="flex gap-2 sm:gap-4">
            {AI_PITS.map((id) => (
              <Pit
                key={id}
                id={id}
                count={board[id]}
                onClick={handlePitClick}
                disabled={isAiMode || locked || turn !== "ai" || board[id] === 0}
                highlight={!isAiMode && turn === "ai" && !locked && board[id] > 0}
                flash={flashPit === id}
              />
            ))}
          </div>
          <div className="w-full h-px" style={{ background: "rgba(0,0,0,0.25)" }} />
          <div className="flex gap-2 sm:gap-4">
            {PLAYER_PITS.map((id) => (
              <Pit
                key={id}
                id={id}
                count={board[id]}
                onClick={handlePitClick}
                disabled={locked || turn !== "player" || board[id] === 0}
                highlight={turn === "player" && !locked && board[id] > 0}
                flash={flashPit === id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* move history */}
      <div className="w-full max-w-3xl rounded-2xl p-4 mb-4" style={{ background: "#fbf3e2" }}>
        <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: "'Mukta', sans-serif", color: "#7a4f24" }}>
          Move history
        </h3>
        <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
          {history.length === 0 && (
            <p className="text-sm" style={{ color: "#a08662", fontFamily: "'Mukta', sans-serif" }}>
              No moves yet — pick a well to begin.
            </p>
          )}
          {history.map((h, i) => (
            <p key={i} className="text-sm" style={{ color: "#4a2c15", fontFamily: "'Mukta', sans-serif" }}>
              {h}
            </p>
          ))}
          <div ref={historyEndRef} />
        </div>
      </div>

      {/* controls */}
      <div className="w-full max-w-3xl flex flex-wrap gap-3 justify-center">
        <button
          onClick={resetGame}
          className="py-2 px-5 rounded-full font-medium transition-transform hover:scale-105 active:scale-95"
          style={{ background: "#d4a437", color: "#3c2513", fontFamily: "'Mukta', sans-serif" }}
        >
          Restart Game
        </button>
        <button
          onClick={onExit}
          className="py-2 px-5 rounded-full font-medium border transition-colors hover:bg-black/5"
          style={{ borderColor: "#7a4f24", color: "#3c2513", fontFamily: "'Mukta', sans-serif" }}
        >
          New Game
        </button>
        <button
          onClick={onExit}
          className="py-2 px-5 rounded-full font-medium border transition-colors hover:bg-black/5"
          style={{ borderColor: "#7a4f24", color: "#3c2513", fontFamily: "'Mukta', sans-serif" }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

function ResultScreen({ result, mode, onPlayAgain, onHome }) {
  const { playerStore, aiStore } = result;
  const isAiMode = mode === "ai";
  const playerWon = playerStore > aiStore;
  const tie = playerStore === aiStore;
  const winnerText = tie
    ? "It's a tie"
    : isAiMode
    ? playerWon
      ? "You win"
      : "AI wins"
    : playerWon
    ? "Player 1 wins"
    : "Player 2 wins";

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6" style={{ background: "radial-gradient(circle at 50% 20%, #7a4f24, #2c1a0d 75%)" }}>
      <div className="max-w-md w-full text-center">
        <p className="text-sm uppercase tracking-widest mb-3" style={{ color: "#e3c99b", fontFamily: "'Mukta', sans-serif", letterSpacing: "0.15em" }}>
          Game over
        </p>
        <h2
          className="text-4xl sm:text-5xl mb-6 animate-[pulse_2s_ease-in-out_1]"
          style={{ fontFamily: "'Rozha One', serif", color: "#f6e6c4" }}
        >
          {winnerText}
        </h2>

        <div className="flex justify-center gap-6 mb-10">
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: "#f6e6c4" }}>{playerStore}</p>
            <p className="text-sm" style={{ color: "#e3c99b", fontFamily: "'Mukta', sans-serif" }}>{isAiMode ? "You" : "Player 1"}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: "#f6e6c4" }}>{aiStore}</p>
            <p className="text-sm" style={{ color: "#e3c99b", fontFamily: "'Mukta', sans-serif" }}>{isAiMode ? "AI" : "Player 2"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onPlayAgain}
            className="py-3 rounded-full text-lg font-semibold transition-transform hover:scale-105 active:scale-95"
            style={{ background: "#d4a437", color: "#3c2513", fontFamily: "'Mukta', sans-serif" }}
          >
            Play Again
          </button>
          <button
            onClick={onHome}
            className="py-3 rounded-full text-lg font-medium border transition-colors hover:bg-white/10"
            style={{ borderColor: "#e3c99b", color: "#f6e6c4", fontFamily: "'Mukta', sans-serif" }}
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- root app ------------------------------- */

export default function PallankuzhiApp() {
  useGoogleFonts();
  const [screen, setScreen] = useState("welcome"); // welcome | rules | game | result
  const [mode, setMode] = useState("ai"); // 'ai' | 'human'
  const [gameKey, setGameKey] = useState(0);
  const [result, setResult] = useState({ playerStore: 0, aiStore: 0 });

  const startNewGame = (nextMode) => {
    setMode((current) => nextMode || current);
    setGameKey((k) => k + 1);
    setScreen("game");
  };

  return (
    <div style={{ fontFamily: "'Mukta', sans-serif" }}>
      {screen === "welcome" && (
        <WelcomeScreen
          onPlayAi={() => startNewGame("ai")}
          onPlayHuman={() => startNewGame("human")}
          onRules={() => setScreen("rules")}
        />
      )}
      {screen === "rules" && <RulesScreen onBack={() => setScreen("welcome")} />}
      {screen === "game" && (
        <GameScreen
          key={gameKey}
          mode={mode}
          onExit={() => setScreen("welcome")}
          onGameOver={(r) => {
            setResult(r);
            setScreen("result");
          }}
        />
      )}
      {screen === "result" && (
        <ResultScreen
          result={result}
          mode={mode}
          onPlayAgain={() => startNewGame()}
          onHome={() => setScreen("welcome")}
        />
      )}
    </div>
  );
}
