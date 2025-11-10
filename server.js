const express = require('express');
const compression = require('compression');
const path = require('path');

const PORT = process.env.PORT || 3000;
const app = express();

// Enable gzip compression
app.use(compression());

// Serve static files from repo root
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/healthz', (req, res) => {
    res.json({ ok: true });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('🧟 Eras Zombie MVP');
    console.log(`🌐 Server running at http://0.0.0.0:${PORT}`);
    console.log('🎮 Open in browser to play!');
});
