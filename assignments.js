// ── Assignments ───────────────────────────────────────────────────────────────
const express = require('express');
const assignRouter = express.Router();
const { db } = require('../config/store');
const { authMiddleware } = require('../middleware/auth');
const { AssignmentService } = require('../services/assignment');
const { notifyAdvisorNewClient } = require('../services/twilio');

assignRouter.use(authMiddleware);

// GET /api/assignments
assignRouter.get('/', (req, res) => {
  const assignments = db.getAssignments(req.user.companyId);
  const enriched = assignments.map(a => ({
    ...a,
    client: db.getClientById(a.clientId),
    advisor: (() => { const u = db.getUserById(a.advisorId); return u ? { id: u.id, name: u.name } : null; })(),
  }));
  res.json(enriched);
});

// POST /api/assignments/manual - asignación manual
assignRouter.post('/manual', async (req, res) => {
  try {
    const { clientId, advisorId } = req.body;
    if (!clientId || !advisorId) return res.status(400).json({ error: 'clientId y advisorId requeridos' });

    const client = db.getClientById(clientId);
    const advisor = db.getUserById(advisorId);

    if (!client || !advisor) return res.status(404).json({ error: 'Cliente o asesor no encontrado' });

    const assignment = db.createAssignment({
      companyId: req.user.companyId,
      clientId,
      advisorId,
      assignedBy: req.user.id,
      reason: 'Asignación manual',
    });

    db.updateClient(clientId, { assignedAdvisorId: advisorId, status: 'assigned' });
    db.updateUser(advisorId, { activeClients: (advisor.activeClients || 0) + 1 });

    if (advisor.phone) {
      notifyAdvisorNewClient(advisor.phone, client).catch(console.error);
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('new_assignment', { assignment, client, advisor });
    }

    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ error: 'Error en asignación' });
  }
});

// PATCH /api/assignments/:id/status
assignRouter.patch('/:id/status', (req, res) => {
  const updated = db.updateAssignment(req.params.id, { status: req.body.status });
  if (!updated) return res.status(404).json({ error: 'Asignación no encontrada' });
  res.json(updated);
});

module.exports = assignRouter;
