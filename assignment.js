// =============================================
// CRM Sales - Servicio de Asignación de Asesores
// =============================================
// Estrategias de asignación:
//   ROUND_ROBIN   → turnos rotativos entre asesores
//   LEAST_LOADED  → al asesor con menos clientes activos
//   SPECIALTY     → por especialidad/producto

const ASSIGNMENT_STRATEGIES = {
  ROUND_ROBIN: 'round_robin',
  LEAST_LOADED: 'least_loaded',
  SPECIALTY: 'specialty',
};

// En memoria hasta conectar DB (luego usar DB real)
let roundRobinIndex = 0;

class AssignmentService {
  /**
   * Asigna un cliente al mejor asesor disponible
   * @param {Object} client - Datos del cliente
   * @param {Array} advisors - Lista de asesores disponibles
   * @param {string} strategy - Estrategia de asignación
   * @returns {Object} { advisor, reason }
   */
  static assignAdvisor(client, advisors, strategy = ASSIGNMENT_STRATEGIES.LEAST_LOADED) {
    if (!advisors || advisors.length === 0) {
      throw new Error('No hay asesores disponibles');
    }

    // Filtrar solo asesores activos/disponibles
    const available = advisors.filter(a => a.status === 'active' && a.isAvailable !== false);

    if (available.length === 0) {
      // Si no hay disponibles, asignar al menos cargado de todos
      return this._leastLoaded(advisors);
    }

    switch (strategy) {
      case ASSIGNMENT_STRATEGIES.ROUND_ROBIN:
        return this._roundRobin(available);

      case ASSIGNMENT_STRATEGIES.LEAST_LOADED:
        return this._leastLoaded(available);

      case ASSIGNMENT_STRATEGIES.SPECIALTY:
        return this._bySpecialty(client, available);

      default:
        return this._leastLoaded(available);
    }
  }

  // ─── Round Robin ──────────────────────────────────────────────────────────
  static _roundRobin(advisors) {
    const advisor = advisors[roundRobinIndex % advisors.length];
    roundRobinIndex++;
    return {
      advisor,
      reason: `Asignación rotatoria (turno ${roundRobinIndex})`,
    };
  }

  // ─── Menor carga ──────────────────────────────────────────────────────────
  static _leastLoaded(advisors) {
    const advisor = advisors.reduce((prev, curr) =>
      (prev.activeClients || 0) <= (curr.activeClients || 0) ? prev : curr
    );
    return {
      advisor,
      reason: `Asesor con menos carga activa (${advisor.activeClients || 0} clientes)`,
    };
  }

  // ─── Por especialidad ─────────────────────────────────────────────────────
  static _bySpecialty(client, advisors) {
    const intent = client.intent || '';

    // Buscar asesor con especialidad que coincida
    const specialist = advisors.find(a =>
      a.specialties && a.specialties.includes(intent)
    );

    if (specialist) {
      return {
        advisor: specialist,
        reason: `Especialista en ${intent}`,
      };
    }

    // Fallback a menor carga
    return this._leastLoaded(advisors);
  }

  /**
   * Calcula estadísticas de carga de asesores
   */
  static getLoadStats(advisors, assignments) {
    return advisors.map(advisor => {
      const advisorAssignments = assignments.filter(
        a => a.advisorId === advisor.id && a.status === 'active'
      );
      return {
        ...advisor,
        activeClients: advisorAssignments.length,
        totalAssigned: assignments.filter(a => a.advisorId === advisor.id).length,
      };
    });
  }
}

module.exports = {
  AssignmentService,
  ASSIGNMENT_STRATEGIES,
};
