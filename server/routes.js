const db = require('./db');

/**
 * POST /api/game - Start new game
 * Body: { mode: 'pvp' | 'pvai' }
 */
function createGame(req, res) {
  try {
    const mode = (req.body && req.body.mode) || 'pvp';
    if (!['pvp', 'pvai'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Use pvp or pvai.' });
    }
    const id = db.createGame(mode);
    res.status(201).json({ id, mode });
  } catch (err) {
    console.error('createGame error:', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
}

/**
 * POST /api/move - Save move
 * Body: { gameId, moveNumber, move, fen }
 */
function saveMove(req, res) {
  try {
    const { gameId, moveNumber, move, fen } = req.body || {};
    if (
      gameId == null ||
      moveNumber == null ||
      move == null ||
      fen == null
    ) {
      return res.status(400).json({
        error: 'Missing required fields: gameId, moveNumber, move, fen',
      });
    }
    db.saveMove(Number(gameId), Number(moveNumber), String(move), String(fen));
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('saveMove error:', err);
    res.status(500).json({ error: 'Failed to save move' });
  }
}

/**
 * POST /api/game/:id/result - Update game result (optional, for checkmate/draw)
 * Body: { result: string }
 */
function updateResult(req, res) {
  try {
    const id = Number(req.params.id);
    const result = (req.body && req.body.result) || null;
    db.updateGameResult(id, result);
    res.json({ ok: true });
  } catch (err) {
    console.error('updateResult error:', err);
    res.status(500).json({ error: 'Failed to update result' });
  }
}

/**
 * GET /api/game/:id - Load game with moves
 */
function getGame(req, res) {
  try {
    const id = Number(req.params.id);
    const game = db.getGame(id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json(game);
  } catch (err) {
    console.error('getGame error:', err);
    res.status(500).json({ error: 'Failed to load game' });
  }
}

/**
 * GET /api/history - Get all saved games
 */
function getHistory(req, res) {
  try {
    const games = db.getAllGames();
    res.json(games);
  } catch (err) {
    console.error('getHistory error:', err);
    res.status(500).json({ error: 'Failed to load history' });
  }
}

module.exports = {
  createGame,
  saveMove,
  updateResult,
  getGame,
  getHistory,
};
