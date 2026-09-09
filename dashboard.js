// ── Dashboard ─────────────────────────────────────────────────────────────────
const express = require('express');
const dashRouter = express.Router();
const { db } = require('../config/store');
const { authMiddleware } = require('../middleware/auth');
const { AssignmentService } = require('../services/assignment');

dashRouter.use(authMiddleware);

// GET /api/dashboard/stats
dashRouter.get('/stats', (req, res) => {
  const stats = db.getStats(req.user.companyId);
  const advisors = db.getAdvisors(req.user.companyId);
  const assignments = db.getAssignments(req.user.companyId);
  const withLoad = AssignmentService.getLoadStats(advisors, assignments);

  res.json({
    ...stats,
    advisors: {
      total: advisors.length,
      available: advisors.filter(a => a.isAvailable && a.status === 'active').length,
      load: withLoad.map(a => ({
        id: a.id,
        name: a.name,
        activeClients: a.activeClients,
        isAvailable: a.isAvailable,
      })),
    },
    conversion: stats.totalClients > 0
      ? Math.round((stats.interested / stats.totalClients) * 100)
      : 0,
  });
});

// GET /api/dashboard/recent
dashRouter.get('/recent', (req, res) => {
  const clients = db.getClients(req.user.companyId, {});
  const recent = clients.slice(0, 20);
  res.json(recent);
});

module.exports = dashRouter;
