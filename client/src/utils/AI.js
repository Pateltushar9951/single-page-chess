import { Chess } from 'chess.js';

/**
 * Piece values for board evaluation (centipawns)
 */
const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

/**
 * Simple piece-square tables (middle game) for better positional play
 */
const PAWN_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const KNIGHT_TABLE = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_TABLE = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];

const ROOK_TABLE = [
  0, 0, 0, 5, 5, 0, 0, 0,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  5, 10, 10, 10, 10, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const QUEEN_TABLE = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];

const KING_MIDDLE_TABLE = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];

const PIECE_TABLES = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
  k: KING_MIDDLE_TABLE,
};

/**
 * Get square index 0-63 from file (0-7) and rank (0-7).
 * White's perspective: a1=0, h8=63.
 */
function squareToIndex(square) {
  const file = square.charCodeAt(0) - 97;
  const rank = 8 - parseInt(square[1], 10);
  return rank * 8 + file;
}

/**
 * Flip table for black (black pieces see board from their side)
 */
function flipIndex(i) {
  return 63 - i;
}

/**
 * Evaluate board position. Positive = white better, negative = black better.
 */
export function evaluateBoard(chess) {
  const fen = chess.fen();
  const board = chess.board();
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const sq = r * 8 + c;
      const pieceType = piece.type;
      const table = PIECE_TABLES[pieceType];
      const tableVal = table ? (piece.color === 'w' ? table[flipIndex(sq)] : -table[sq]) : 0;
      const value = PIECE_VALUES[pieceType] + (tableVal || 0);
      score += piece.color === 'w' ? value : -value;
    }
  }

  return score;
}

/**
 * Minimax with alpha-beta pruning.
 * Returns { score, move } for the best move.
 */
function minimax(chess, depth, alpha, beta, maximizing) {
  if (depth === 0) {
    return { score: evaluateBoard(chess), move: null };
  }

  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) {
    if (chess.isCheckmate()) {
      return { score: maximizing ? -100000 + (4 - depth) : 100000 - (4 - depth), move: null };
    }
    return { score: 0, move: null }; // stalemate
  }

  let bestMove = moves[0];
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    chess.move(move);
    const { score } = minimax(chess, depth - 1, alpha, beta, !maximizing);
    chess.undo();

    if (maximizing) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestScore);
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
      beta = Math.min(beta, bestScore);
    }
    if (beta <= alpha) break;
  }

  return { score: bestScore, move: bestMove };
}

/**
 * Get best move for current side to move (black = AI in PvAI).
 * difficulty: 'easy' (depth 1-2), 'medium' (3), 'hard' (4+)
 */
export function getBestMove(fen, difficulty = 'medium') {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  const depthMap = { easy: 2, medium: 3, hard: 4 };
  const depth = depthMap[difficulty] ?? 3;
  const maximizing = chess.turn() === 'w'; // positive score = white better; white maximizes, black minimizes

  const { move } = minimax(chess, depth, -Infinity, Infinity, maximizing);
  return move ? move.san : moves[0].san;
}

/**
 * Promise that resolves after ms (for AI thinking delay)
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
