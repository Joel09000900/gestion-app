import 'dotenv/config';
import { createServer } from 'http';
import app from './app.js';
import { initSocket } from './socket.js';

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
