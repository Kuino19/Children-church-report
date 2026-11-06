const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');

// Initialize database
require('./db');

const authRoutes = require('./routes/authRoutes');
const metadataRoutes = require('./routes/metadataRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Foursquare Idimu Missionary District Reporting API', version: '1.0.0' });
});

// 404 for unhandled API routes (always return JSON)
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
});

// Global error handler for API (always return JSON)
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Serve frontend in production if built
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Foursquare Idimu Missionary District Server] Running on http://localhost:${PORT}`);
  });
}

module.exports = app;
