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

    // Le canal est descendant : le serveur diffuse (cf. diffuser()), le
    // navigateur écoute. Aucun événement de ticket n'est accepté en entrée —
    // un client ne peut donc pas annoncer un appel qui n'a pas eu lieu en base.

    socket.on('disconnect', () => {
      console.log(`[Socket] Déconnecté : ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

// Diffusion d'un événement de cycle de vie, appelée par les contrôleurs une
// fois la base à jour. La charge utile se limite à l'identification du ticket
// et à son nouvel état : le destinataire rappelle l'API pour le détail, ce qui
// évite de faire circuler l'identité du porteur vers les autres navigateurs.
export function diffuser(event, ticket) {
  io?.to('jeloft:queue').emit(event, {
    ticketId: ticket.id,
    numero: ticket.numero,
    statut: ticket.statut,
    guichet: ticket.guichet ?? null,
    serviceId: ticket.serviceId,
  });
}

// Diffusion d'une suppression en masse. Il n'y a pas un ticket à désigner mais
// une portée (plateforme ou entreprise) : les écrans ouverts rechargent leur
// liste au lieu de retirer une ligne. Aucun identifiant de porteur ne circule.
export function diffuserPurge(portee) {
  io?.to('jeloft:queue').emit('tickets:purges', portee);
}
