import React, { useCallback, useState } from 'react';

// Unicode chess symbols
const PIECE_SYMBOLS = {
  w: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

/**
 * Convert square name to file (0-7) and rank (0-7). White perspective: a1 = (0,7), h8 = (7,0).
 */
function squareToCoords(sq) {
  const file = sq.charCodeAt(0) - 97;
  const rank = 8 - parseInt(sq[1], 10);
  return { file, rank };
}

function coordsToSquare(file, rank) {
  return String.fromCharCode(97 + file) + (8 - rank);
}

export default function ChessBoard({
  board,
  turn,
  lastMove,
  inCheck,
  kingSquare,
  validMoves,
  flipped,
  onMove,
  disabled,
}) {
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [touchSelected, setTouchSelected] = useState(null);

  // Only highlight valid destinations when a piece is selected (dragging or touch-selected)
  const selectedSquare = dragFrom || touchSelected;
  const validTargetsFromSelected =
    selectedSquare && validMoves
      ? validMoves.filter((m) => m.from === selectedSquare).map((m) => m.to)
      : [];

  const getSquareState = useCallback(
    (file, rank) => {
      const sq = coordsToSquare(file, rank);
      const isLight = (file + rank) % 2 === 1;
      const isLastFrom = lastMove && lastMove.from === sq;
      const isLastTo = lastMove && lastMove.to === sq;
      const isCheck = inCheck && kingSquare === sq;
      const isValidTarget = validTargetsFromSelected.includes(sq);
      const isDragOver = dropTarget === sq;
      const isSelectedPieceSquare = selectedSquare === sq;

      let className = 'square ' + (isLight ? 'light' : 'dark');
      if (isSelectedPieceSquare) className += ' highlight-selected';
      if (isValidTarget) className += ' highlight-valid';
      if (isLastFrom) className += ' highlight-last-from';
      if (isLastTo) className += ' highlight-last-to';
      if (isCheck) className += ' highlight-check';
      if (isDragOver) className += ' dragging-over';

      return className;
    },
    [board, lastMove, inCheck, kingSquare, validTargetsFromSelected, dropTarget, selectedSquare]
  );

  // Board: index 0 = rank 8 (top), 7 = rank 1 (bottom). When not flipped, white is at bottom (rank 1).
  const renderRank = flipped ? (r) => 7 - r : (r) => r;
  const renderFile = flipped ? (f) => 7 - f : (f) => f;

  const handleDragStart = (e, fromSquare) => {
    if (disabled) return;
    const piece = board.flat().find((p) => p && p.square === fromSquare);
    if (!piece || (turn && piece.color !== turn)) return;
    setDraggedPiece(piece);
    setDragFrom(fromSquare);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', fromSquare);
    try {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    } catch (_) { }
  };

  const handleDragOver = (e, toSquare) => {
    e.preventDefault();
    if (!validMoves) return;
    const canDrop = validMoves.some((m) => m.to === toSquare);
    if (canDrop) setDropTarget(toSquare);
  };

  const handleDragLeave = () => setDropTarget(null);

  const handleDrop = (e, toSquare) => {
    e.preventDefault();
    setDropTarget(null);
    if (!dragFrom || disabled) return;
    const move = validMoves && validMoves.find((m) => m.from === dragFrom && m.to === toSquare);
    if (move) onMove(move);
    setDraggedPiece(null);
    setDragFrom(null);
  };

  const handleDragEnd = () => {
    setDraggedPiece(null);
    setDragFrom(null);
    setDropTarget(null);
  };

  const handleSquareTouch = (sq) => {
    if (disabled) return;
    const piece = board.flat().find((p) => p && p.square === sq);
    if (touchSelected) {
      const move = validMoves && validMoves.find((m) => m.from === touchSelected && m.to === sq);
      if (move) {
        onMove(move);
        setTouchSelected(null);
        return;
      }
      setTouchSelected(piece && piece.color === turn ? sq : null);
      return;
    }
    if (piece && piece.color === turn) setTouchSelected(sq);
  };

  const rows = [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="board-wrap">
      <div className="chess-board">
        {rows.map((r) =>
          cols.map((c) => {
            const rank = renderRank(r);
            const file = renderFile(c);
            const sq = coordsToSquare(file, rank);
            const piece = board[rank][file];
            const isSelected = touchSelected === sq;

            return (
              <div
                key={sq}
                className={getSquareState(file, rank)}
                onDragOver={(e) => handleDragOver(e, sq)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, sq)}
                onClick={() => handleSquareTouch(sq)}
              >
                {/* File labels (a-h) on the bottom row of the board */}
                {r === 7 && (
                  <span className="file-label">
                    {String.fromCharCode(97 + file)}
                  </span>
                )}
                {/* Rank labels (1-8) on the left row of the board */}
                {c === 0 && (
                  <span className="rank-label">
                    {8 - rank}
                  </span>
                )}
                {piece && (
                  <div
                    className={`piece piece-${piece.color} ${draggedPiece && draggedPiece.square === sq ? 'dragging' : ''} ${isSelected ? 'animate' : ''}`}
                    draggable={!disabled && turn === piece.color}
                    onDragStart={(e) => handleDragStart(e, sq)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className="piece-icon">
                      {PIECE_SYMBOLS[piece.color][piece.type]}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
