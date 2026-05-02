const API_BASE = 'https://single-page-chess.onrender.com/api';

export async function createGame(mode) {
  const res = await fetch(`${API_BASE}/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error('Failed to create game');
  return res.json();
}

export async function saveMove(gameId, moveNumber, move, fen) {
  const res = await fetch(`${API_BASE}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, moveNumber, move, fen }),
  });
  if (!res.ok) throw new Error('Failed to save move');
  return res.json();
}

export async function updateGameResult(gameId, result) {
  const res = await fetch(`${API_BASE}/game/${gameId}/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result }),
  });
  if (!res.ok) throw new Error('Failed to update result');
  return res.json();
}

export async function getGame(id) {
  const res = await fetch(`${API_BASE}/game/${id}`);
  if (!res.ok) throw new Error('Failed to load game');
  return res.json();
}

export async function getHistory() {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}
