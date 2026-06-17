import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import ticketRoutes from './routes/tickets.routes.js';
import serviceRoutes from './routes/services.routes.js';
import entrepriseRoutes from './routes/entreprises.routes.js';

const app = express();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '5mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/entreprises', entrepriseRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

export default app;
