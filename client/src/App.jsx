import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './components/ChessBoard';
import Controls from './components/Controls';
import { playMoveSound, playCaptureSound, playCheckSound } from './utils/sounds';
import * as api from './utils/api';

/**
 * Build 2D board with square names for each piece (for drag/drop and highlights)
 */
function buildBoard(game) {
  return game.board().map((row, r) =>
    row.map((cell, c) => {
      if (!cell) return null;
      const file = String.fromCharCode(97 + c);
      const rank = 8 - r;
      return { ...cell, square: file + rank };
    })
  );
}

/**
 * Get king square for current turn (for check highlight)
 */
function getKingSquare(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) {
        const file = String.fromCharCode(97 + c);
        const rank = 8 - r;
        return file + rank;
      }
    }
  }
  return null;
}

export default function App() {
  const [game, setGame] = useState(() => new Chess());
  const [board, setBoard] = useState(() => buildBoard(new Chess()));
  const [mode, setMode] = useState('pvp'); // 'pvp' | 'pvai'
  const [flipped, setFlipped] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [historyStack, setHistoryStack] = useState([]); // for undo: [{ fen, moveNumber }]
  const [lastMove, setLastMove] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [savedGames, setSavedGames] = useState([]);
  const [whiteTime, setWhiteTime] = useState(600); // 10 minutes in seconds
  const [blackTime, setBlackTime] = useState(600);
  const [timersStarted, setTimersStarted] = useState(false);
  const [moveHistoryState, setMoveHistoryState] = useState([]); // Explicitly track moves
  const gameRef = useRef(game);
  gameRef.current = game;
  const turnRef = useRef('w');
  const gameOverRef = useRef(false);
  const aiDoneRef = useRef(false);
  const aiTimeoutRef = useRef(null);
  const workerRef = useRef(null);

  const turn = game.turn();
  const inCheck = game.inCheck();
  const gameOver = game.isGameOver();
  turnRef.current = turn;
  gameOverRef.current = gameOver;
  const kingSquare = getKingSquare(game.board(), turn);
  const validMoves = gameOver ? [] : game.moves({ verbose: true });
  const moveHistory = moveHistoryState; // Use our state-based history

  // Human plays white; in PvAI, black is AI so we disable moves when it's black's turn (AI will move)
  const humanTurn = mode === 'pvp' ? true : turn === 'w';
  const disabled = gameOver || aiThinking || !humanTurn;

  const persistMove = useCallback(async (moveNumber, san, fen) => {
    if (!gameId) return;
    try {
      await api.saveMove(gameId, moveNumber, san, fen);
    } catch (e) {
      console.warn('Failed to save move', e);
    }
  }, [gameId]);

  // AI Logic Components
  const applyAiMove = useCallback((g, moveSan) => {
    const res = g.move(moveSan);
    if (!res) return;
    const newFen = g.fen();

    setMoveHistoryState((s) => s.concat([res]));
    setGame(new Chess(newFen));
    setBoard(buildBoard(new Chess(newFen)));
    setLastMove({ from: res.from, to: res.to });
    playMoveSound();
    if (res.captured) playCaptureSound();
    if (g.inCheck()) playCheckSound();
    persistMove(g.history().length, res.san, newFen);

    if (g.isGameOver()) {
      let resultStr = g.isCheckmate() ? (g.turn() === 'w' ? '0-1' : '1-0') : '1/2-1/2';
      if (gameId) api.updateGameResult(gameId, resultStr).catch(() => { });
    }
  }, [persistMove, gameId]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./utils/aiWorker.js', import.meta.url), {
      type: 'module'
    });
    return () => workerRef.current?.terminate();
  }, []);

  const makeAiMove = useCallback(() => {
    if (gameOver || turnRef.current !== 'b' || aiThinking) return;

    setAiThinking(true);
    aiDoneRef.current = false;
    const fenSnapshot = gameRef.current.fen();
    const delayMs = 600;

    aiTimeoutRef.current = setTimeout(() => {
      if (aiDoneRef.current) return;
      aiDoneRef.current = true;
      setAiThinking(false);
    }, 10000);

    workerRef.current.onmessage = (e) => {
      const { bestMove } = e.data;
      if (aiDoneRef.current) return;

      setTimeout(() => {
        if (aiDoneRef.current) return;
        aiDoneRef.current = true;
        if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

        if (bestMove) applyAiMove(new Chess(fenSnapshot), bestMove);
        setAiThinking(false);
      }, delayMs);
    };

    workerRef.current.postMessage({ fen: fenSnapshot, difficulty: aiDifficulty });
  }, [aiDifficulty, aiThinking, applyAiMove]);

  const makeMove = useCallback(
    (move) => {
      const g = gameRef.current;
      const result = g.move(move);
      if (!result) return;
      const fen = g.fen();

      // Update history state
      setMoveHistoryState((s) => s.concat([result]));

      setGame(new Chess(fen));
      setBoard(buildBoard(new Chess(fen)));
      setLastMove({ from: result.from, to: result.to });
      playMoveSound();
      if (result.captured) playCaptureSound();
      if (g.inCheck()) playCheckSound();

      const moveNumber = g.history().length;
      persistMove(moveNumber, result.san, fen);

      if (gameOver) return;
      const updated = new Chess(fen);
      if (updated.isGameOver()) {
        let resultStr = 'Draw';
        if (updated.isCheckmate()) resultStr = updated.turn() === 'w' ? '0-1' : '1-0';
        else if (updated.isStalemate()) resultStr = '1/2-1/2';
        else if (updated.isDraw()) resultStr = '1/2-1/2';
        if (gameId) api.updateGameResult(gameId, resultStr).catch(() => { });
      }

      // PvAI: after human (white) moves, the turn changes to 'b'.
      // The AI will be triggered by the useEffect turn observer.
    },
    [mode, persistMove, gameId]
  );

  // Turn Observer for AI moves (PvAI)
  useEffect(() => {
    if (mode === 'pvai' && turn === 'b' && !gameOver && !aiThinking) {
      makeAiMove();
    }
  }, [mode, turn, gameOver, aiThinking, makeAiMove]);

  const startNewGame = useCallback(async (modeOverride) => {
    const m = modeOverride !== undefined ? modeOverride : mode;
    try {
      const { id } = await api.createGame(m);
      setGameId(id);
    } catch (_) {
      setGameId(null);
    }
    const g = new Chess();
    setGame(g);
    setBoard(buildBoard(g));
    setLastMove(null);
    setHistoryStack([]);
    setMoveHistoryState([]);
    setWhiteTime(600);
    setBlackTime(600);
    setTimersStarted(false);
  }, [mode]);

  const restartGame = useCallback(() => {
    const g = new Chess();
    setGame(g);
    setBoard(buildBoard(g));
    setLastMove(null);
    setHistoryStack([]);
    setMoveHistoryState([]); // Reset history
    setWhiteTime(600);
    setBlackTime(600);
    setTimersStarted(false);
    if (gameId) {
      api.createGame(mode).then(({ id }) => setGameId(id)).catch(() => { });
    }
  }, [mode, gameId]);

  const undoMove = useCallback(() => {
    if (historyStack.length === 0 || gameOver) return;
    const prev = historyStack[historyStack.length - 1];
    const g = new Chess(prev.fen);
    setGame(g);
    setBoard(buildBoard(g));
    setHistoryStack((s) => s.slice(0, -1));
    setMoveHistoryState((s) => s.slice(0, -1)); // Rollback history
    setLastMove(historyStack.length > 1 ? null : null);
    const lastHist = g.history({ verbose: true });
    if (lastHist.length > 0) {
      const lm = lastHist[lastHist.length - 1];
      setLastMove({ from: lm.from, to: lm.to });
    } else {
      setLastMove(null);
    }
  }, [historyStack, gameOver]);


  // Undo: we need to track FEN before each move. So on each makeMove we push current fen to historyStack before applying.
  const makeMoveWithUndo = useCallback(
    (move) => {
      setHistoryStack((s) => s.concat([{ fen: game.fen(), moveNumber: moveHistoryState.length }]));
      makeMove(move);
    },
    [game, makeMove, moveHistoryState]
  );

  const undoMoveFixed = useCallback(() => {
    if (historyStack.length === 0 || gameOver || aiThinking) return;
    const prev = historyStack[historyStack.length - 1];
    const g = new Chess(prev.fen);
    setGame(g);
    setBoard(buildBoard(g));
    setHistoryStack((s) => s.slice(0, -1));
    setMoveHistoryState((s) => s.slice(0, -1)); // Rollback history
    const hist = moveHistoryState.slice(0, -1);
    setLastMove(hist.length > 0 ? { from: hist[hist.length - 1].from, to: hist[hist.length - 1].to } : null);
  }, [historyStack, gameOver, aiThinking, moveHistoryState]);

  const switchMode = useCallback(() => {
    const newMode = mode === 'pvp' ? 'pvai' : 'pvp';
    setMode(newMode);
    const g = new Chess();
    setGame(g);
    setBoard(buildBoard(g));
    setLastMove(null);
    setHistoryStack([]);
    setMoveHistoryState([]); // Reset history
    setWhiteTime(600);
    setBlackTime(600);
    setTimersStarted(false);
    api.createGame(newMode).then(({ id }) => setGameId(id)).catch(() => setGameId(null));
  }, [mode]);

  const flipBoard = useCallback(() => setFlipped((f) => !f), []);

  // Timer interval logic (Persistent)
  useEffect(() => {
    if (!timersStarted) return;

    const interval = setInterval(() => {
      if (gameOverRef.current) return;

      if (turnRef.current === 'w') {
        setWhiteTime((t) => Math.max(0, t - 1));
      } else {
        setBlackTime((t) => Math.max(0, t - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timersStarted]);

  // Start timers on first move
  useEffect(() => {
    if (moveHistoryState.length > 0 && !timersStarted) {
      setTimersStarted(true);
    }
  }, [moveHistoryState, timersStarted]);

  // Initialize game and create backend game on mount (once)
  useEffect(() => {
    startNewGame();
  }, []);

  // Load saved games list (for history panel - optional)
  useEffect(() => {
    api.getHistory().then(setSavedGames).catch(() => { });
  }, [gameId]);

  const getStatusText = () => {
    if (game.isCheckmate()) return `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins.`;
    if (game.isStalemate()) return 'Stalemate — Draw';
    if (game.isDraw()) {
      if (game.isThreefoldRepetition()) return 'Draw — Threefold repetition';
      if (game.isFiftyMove()) return 'Draw — Fifty-move rule';
      if (game.isInsufficientMaterial()) return 'Draw — Insufficient material';
      if (game.isDraw()) return 'Draw';
    }
    if (game.inCheck()) return `Check! ${game.turn() === 'w' ? 'White' : 'Black'} to move.`;
    return `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
  };

  // Compute captured pieces by comparing current board counts with starting material
  const initialCounts = {
    w: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
    b: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
  };
  const currentCounts = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };
  board.forEach((row) => {
    row.forEach((cell) => {
      if (!cell) return;
      currentCounts[cell.color][cell.type] += 1;
    });
  });
  const whiteSym = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };
  const blackSym = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };
  const capturedWhite = [];
  const capturedBlack = [];
  ['p', 'n', 'b', 'r', 'q'].forEach((type) => {
    const lostWhite = initialCounts.w[type] - currentCounts.w[type];
    const lostBlack = initialCounts.b[type] - currentCounts.b[type];
    for (let i = 0; i < lostWhite; i += 1) capturedWhite.push(whiteSym[type]);
    for (let i = 0; i < lostBlack; i += 1) capturedBlack.push(blackSym[type]);
  });

  const selectMode = useCallback(
    (newMode) => {
      if (newMode === mode) return;
      setMode(newMode);
      const g = new Chess();
      setGame(g);
      setBoard(buildBoard(g));
      setLastMove(null);
      setHistoryStack([]);
      setMoveHistoryState([]); // Reset history
      setWhiteTime(600);
      setBlackTime(600);
      setTimersStarted(false);
      api.createGame(newMode).then(({ id }) => setGameId(id)).catch(() => setGameId(null));
    },
    [mode]
  );

  // Formatting move history into pairs (White, Black) for a table
  const formattedHistory = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    formattedHistory.push({
      num: Math.floor(i / 2) + 1,
      w: moveHistory[i].san,
      b: moveHistory[i + 1] ? moveHistory[i + 1].san : null,
    });
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>PLAY CHESS ONLINE</h1>
        <div className="mode-select">
          <button
            type="button"
            className={`mode-option ${mode === 'pvp' ? 'active' : ''}`}
            onClick={() => selectMode('pvp')}
          >
            Player vs Player
          </button>
          <button
            type="button"
            className={`mode-option ${mode === 'pvai' ? 'active' : ''}`}
            onClick={() => selectMode('pvai')}
          >
            Player vs AI
          </button>
        </div>
      </header>

      <div className="game-container">
        <div className="board-section">
          <div
            className={`status-bar ${game.inCheck() ? 'check' : ''} ${gameOver ? 'checkmate' : ''}`}
          >
            {getStatusText()}
            {aiThinking && <div className="ai-thinking">AI is thinking…</div>}
          </div>
          <Clock time={blackTime} label="Black" color="b" active={turn === 'b' && !gameOver} />

          <ChessBoard
            board={board}
            turn={turn}
            lastMove={lastMove}
            inCheck={inCheck}
            kingSquare={kingSquare}
            validMoves={validMoves}
            flipped={flipped}
            onMove={makeMoveWithUndo}
            disabled={disabled}
          />

          <Clock time={whiteTime} label="White" color="w" active={turn === 'w' && !gameOver} />
        </div>

        <div className="side-section">
          <Controls
            mode={mode}
            onNewGame={startNewGame}
            onRestart={restartGame}
            onUndo={undoMoveFixed}
            onSwitchMode={switchMode}
            onFlipBoard={flipBoard}
            aiDifficulty={aiDifficulty}
            onAiDifficultyChange={setAiDifficulty}
            canUndo={historyStack.length > 0}
            gameOver={gameOver}
          />

          <div className="panel history-panel">
            <h3>Move Record</h3>
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>White</th>
                    <th>Black</th>
                  </tr>
                </thead>
                <tbody>
                  {formattedHistory.map((m) => (
                    <tr key={m.num}>
                      <td>{m.num}.</td>
                      <td className="move-san">{m.w}</td>
                      <td className="move-san">{m.b || ''}</td>
                    </tr>
                  ))}
                  {formattedHistory.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', opacity: 0.5, padding: '1rem' }}>
                        No moves yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel captured-panel">
            <h3>Captured</h3>
            <div className="captured-pieces white">
              <span style={{ marginRight: '0.5rem', color: 'var(--light-dim)' }}>♚ White lost:</span>
              <span className="captured-count">{capturedWhite.length}</span>
              {capturedWhite.length > 0 && <span style={{ color: '#ffffff' }}> — {capturedWhite.join(' ')}</span>}
            </div>
            <div className="captured-pieces black">
              <span style={{ marginRight: '0.5rem', color: 'var(--light-dim)' }}>♚ Black lost:</span>
              <span className="captured-count">{capturedBlack.length}</span>
              {capturedBlack.length > 0 && <span style={{ color: '#1b1b1b' }}> — {capturedBlack.join(' ')}</span>}
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}

function Clock({ time, label, color, active }) {
  const mins = Math.floor(time / 60);
  const secs = time % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className={`chess-clock ${color} ${active ? 'active' : ''}`}>
      <span className="clock-label">{label}</span>
      <div className="clock-time">
        <span className="clock-icon">🕒</span>
        {timeStr}
      </div>
    </div>
  );
}
