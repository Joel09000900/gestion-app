import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export function initSocket(httpServer) {
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

  io = new Server(httpServer, {
    cors: {
      origin: CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Auth optionnelle : si un token est fourni et valide, on attache l'identité.
  // Un token présent mais invalide est rejeté ; l'anonyme (file publique) reste autorisé.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
      socket.data.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Token socket invalide'));
    }
  });

  io.on('connection', (socket) => {
    const who = socket.data.user ? `user ${socket.data.user.id}` : 'anonyme';
    console.log(`[Socket] Connecté : ${socket.id} (${who})`);

    // Le client rejoint la salle globale de la file d'attente
    socket.on('join:queue', () => {
      socket.join('jeloft:queue');
    });

    // Relayer les événements tickets vers tous les autres (sauf l'émetteur)
    const EVENTS = [
      'ticket:nouveau',
      'ticket:valide',
      'ticket:refuse',
      'ticket:appele',
      'ticket:traite',
      'ticket:absent',
    ];

    EVENTS.forEach((event) => {
      socket.on(event, (data) => {
        socket.to('jeloft:queue').emit(event, data);
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Déconnecté : ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  return io;
}
