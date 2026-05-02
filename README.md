# Single Page Chess Web Application

A fully functional single-page chess application with Player vs AI and Player vs Player modes.

## Tech Stack

- **Frontend**: React (Vite), functional components, hooks
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Architecture**: REST API

## Prerequisites

- Node.js (v16 or higher)
- npm

## Setup Instructions

### 1. Install all dependencies

From the project root:

```bash
npm run install:all
```

Or manually:

```bash
npm install
cd client && npm install
cd ../server && npm install
```

### 2. SQLite

SQLite is used via the `better-sqlite3` package. No separate SQLite installation is required. The database file `chess.db` is created automatically in the `server` folder on first run.

### 3. Run the application

**Terminal 1 – Backend (API):**
```bash
npm start
```
Server runs at `http://localhost:3001`

**Terminal 2 – Frontend (React):**
```bash
npm run dev
```
Client runs at `http://localhost:5173`

Open `http://localhost:5173` in your browser.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/game | Start new game |
| POST | /api/move | Save a move |
| GET | /api/game/:id | Load game by ID |
| GET | /api/history | Get all saved games |

## Features

- **Modes**: Player vs AI, Player vs Player (local)
- **Chess rules**: Castling, en passant, pawn promotion, check, checkmate, stalemate, draws (threefold, fifty-move)
- **AI**: Minimax with alpha-beta pruning (Easy / Medium / Hard)
- **UI**: Drag-and-drop, valid move highlights, last move, check indication, captured pieces, PGN move history
- **Controls**: New Game, Restart, Undo, Switch Mode, Flip Board, AI difficulty
- **Extra**: PGN export/import, move sounds, smooth animations, auto-save, responsive layout

## Project Structure

```
/chess-app
  /server
    server.js
    db.js
    routes.js
  /client
    /src
      App.jsx
      main.jsx
      index.css
      /components
        ChessBoard.jsx
        Controls.jsx
        MoveHistory.jsx
      /utils
        AI.js
        sounds.js
    index.html
    package.json
  package.json
  README.md
```

## License

MIT
