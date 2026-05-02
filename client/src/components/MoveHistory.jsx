import React from 'react';

export default function MoveHistory({ history, pgn }) {
  return (
    <div className="panel">
      <h3>Move history (PGN)</h3>
      <div className="move-history">
        {pgn ? (
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
            {pgn}
          </pre>
        ) : history.length === 0 ? (
          <span>No moves yet</span>
        ) : (
          <div>
            {history.map((move, i) => (
              <span key={i}>
                {i % 2 === 0 && (
                  <span className="move-num">{Math.floor(i / 2) + 1}.</span>
                )}
                {move.san}{' '}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
