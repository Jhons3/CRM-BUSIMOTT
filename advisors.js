// ── Advisors ──────────────────────────────────────────────────────────────────
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { db } = require('../config/store');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/advisors
router.get('/', (req, res) => {
  const advisors = db.getAdvisors(req.user.companyId);
  const assignments = db.getAssignments(req.user.companyId);
  const { AssignmentService } = require('../services/assignment');
  const withLoad = AssignmentService.getLoadStats(advisors, assignments);

  const safe = withLoad.map(({ password: _, ...a }) => a);
  res.json(safe);
});

// POST /api/advisors (admin)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, email, phone, specialties = [] } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Nombre y email requeridos' });

    if (db.getUserByEmail(email)) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashed = await bcrypt.hash(tempPassword, 10);

    const user = db.createUser({
      companyId: req.user.companyId,
      name, email, phone,
      password: hashed,
      role: 'advisor',
      status: 'active',
      isAvailable: true,
      activeClients: 0,
      specialties,
    });

    const { password: _, ...safe } = user;
    res.status(201).json({ ...safe, tempPassword });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear asesor' });
  }
});

// PATCH /api/advisors/:id/availability
router.patch('/:id/availability', (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user || user.companyId !== req.user.companyId) {
    return res.status(404).json({ error: 'Asesor no encontrado' });
  }

  const updated = db.updateUser(user.id, { isAvailable: req.body.isAvailable });
  const { password: _, ...safe } = updated;

  if (req.app.get('io')) {
    req.app.get('io').emit('advisor_update', safe);
  }
  res.json(safe);
});

module.exports = router;
