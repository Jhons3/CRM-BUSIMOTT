// ── Conversations ─────────────────────────────────────────────────────────────
const express = require('express');
const convRouter = express.Router();
const { db } = require('../config/store');
const { authMiddleware } = require('../middleware/auth');
const { sendWhatsAppMessage } = require('../services/twilio');

convRouter.use(authMiddleware);

// GET /api/conversations
convRouter.get('/', (req, res) => {
  const convs = db.getConversations(req.user.companyId);
  const enriched = convs.map(c => ({
    ...c,
    client: db.getClientById(c.clientId),
    messages: db.getMessages(c.id),
  }));
  res.json(enriched);
});

// GET /api/conversations/:id/messages
convRouter.get('/:id/messages', (req, res) => {
  const messages = db.getMessages(req.params.id);
  res.json(messages);
});

// POST /api/conversations/:id/send - asesor envía mensaje
convRouter.post('/:id/send', async (req, res) => {
  try {
    const { message } = req.body;
    const conv = db.getConversations(req.user.companyId, null)
      .find(c => c.id === req.params.id);

    if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });

    const client = db.getClientById(conv.clientId);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

    const result = await sendWhatsAppMessage(`whatsapp:${client.phone}`, message);

    if (result.success) {
      const msg = db.addMessage({
        conversationId: conv.id,
        sender: 'advisor',
        senderId: req.user.id,
        content: message,
        type: 'text',
        sid: result.sid,
      });

      if (req.app.get('io')) {
        req.app.get('io').emit('new_message', { conversationId: conv.id, message: msg });
      }

      res.json(msg);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

module.exports = convRouter;
