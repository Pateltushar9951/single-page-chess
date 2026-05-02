import React from 'react';

export default function Controls({
  mode,
  onNewGame,
  onRestart,
  onUndo,
  onSwitchMode,
  onFlipBoard,
  aiDifficulty,
  onAiDifficultyChange,
  canUndo,
  gameOver,
}) {
  return (
    <div className="controls">
      <button className="primary" onClick={onNewGame}>
        New Game
      </button>
      <button onClick={onRestart}>Restart</button>
      <button onClick={onUndo} disabled={!canUndo || gameOver}>
        Undo
      </button>
      <button onClick={onSwitchMode}>
        {mode === 'pvp' ? 'Switch to PvAI' : 'Switch to PvP'}
      </button>
      <button onClick={onFlipBoard}>Flip Board</button>
      {mode === 'pvai' && (
        <select
          value={aiDifficulty}
          onChange={(e) => onAiDifficultyChange(e.target.value)}
          disabled={gameOver}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      )}
    </div>
  );
}
