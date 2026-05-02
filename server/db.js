const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'chess.db');
const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT NOT NULL,
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS moves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    move_number INTEGER NOT NULL,
    move TEXT NOT NULL,
    fen TEXT NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id)
  );

  CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
`);

/**
 * Start a new game and return its ID
 */
function createGame(mode) {
  const stmt = db.prepare('INSERT INTO games (mode) VALUES (?)');
  const result = stmt.run(mode || 'pvp');
  return result.lastInsertRowid;
}

/**
 * Save a move for a game
 */
function saveMove(gameId, moveNumber, move, fen) {
  const stmt = db.prepare(
    'INSERT INTO moves (game_id, move_number, move, fen) VALUES (?, ?, ?, ?)'
  );
  stmt.run(gameId, moveNumber, move, fen);
}

/**
 * Update game result
 */
function updateGameResult(gameId, result) {
  const stmt = db.prepare('UPDATE games SET result = ? WHERE id = ?');
  stmt.run(result || null, gameId);
}

/**
 * Get game by ID with moves
 */
function getGame(gameId) {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  if (!game) return null;
  const moves = db
    .prepare('SELECT * FROM moves WHERE game_id = ? ORDER BY move_number ASC')
    .all(gameId);
  return { ...game, moves };
}

/**
 * Get all games (history)
 */
function getAllGames() {
  const games = db
    .prepare(
      'SELECT id, mode, result, created_at FROM games ORDER BY created_at DESC'
    )
    .all();
  return games;
}

module.exports = {
  db,
  createGame,
  saveMove,
  updateGameResult,
  getGame,
  getAllGames,
};
