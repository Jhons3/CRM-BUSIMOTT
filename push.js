'use strict';
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { saveSubscription } = require('../services/pushService');

// GET /api/push/vapid-key — el frontend necesita la clave pública para suscribirse
router.get('/vapid-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'Push no configurado' });
  res.json({ publicKey: key });
});

// POST /api/push/subscribe — guarda la suscripción del navegador
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Suscripción inválida' });
    await saveSubscription(req.user.id, req.user.companyId, subscription);
    res.json({ ok: true });
  } catch (e) {
    console.error('[push] Error subscribe:', e.message);
    res.status(500).json({ error: 'Error guardando suscripción' });
  }
});

module.exports = router;
