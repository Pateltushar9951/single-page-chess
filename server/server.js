const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// REST API
app.post('/api/game', routes.createGame);
app.post('/api/move', routes.saveMove);
app.post('/api/game/:id/result', routes.updateResult);
app.get('/api/game/:id', routes.getGame);
app.get('/api/history', routes.getHistory);

const server = app.listen(PORT, () => {
  console.log(`Chess API server running at http://localhost:${PORT}`);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Error: Port ${PORT} is already in use.`);
    console.error('You can try to kill the process using this port or use a different port.');
    process.exit(1);
  } else {
    console.error('Server error:', e);
  }
});
