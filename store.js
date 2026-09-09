// =============================================
// CRM Sales - Store en Memoria (Temporal)
// =============================================
const { v4: uuidv4 } = require('uuid');

const store = {
  // ── Empresas ──────────────────────────────────────────────────────────────
  companies: [
    {
      id: 'company-1',
      name: 'Empresa Demo',
      plan: 'professional',
      whatsappNumber: process.env.TWILIO_WHATSAPP_FROM,
      assignmentStrategy: 'least_loaded',
      primaryColor: '#6366f1',
      secondaryColor: '#0f172a',
      logo: null,
      createdAt: new Date().toISOString(),
    },
  ],

  // ── Usuarios ──────────────────────────────────────────────────────────────
  users: [
    {
      id: 'user-superadmin',
      companyId: null,
      name: 'Super Admin',
      email: 'superadmin@crm.com',
      password: 'demo123',
      role: 'super_admin',
      phone: null,
      status: 'active',
      isAvailable: true,
      activeClients: 0,
      specialties: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-admin',
      companyId: 'company-1',
      name: 'Administrador',
      email: 'admin@empresa.com',
      password: 'demo123',
      role: 'admin',
      phone: null,
      status: 'active',
      isAvailable: true,
      activeClients: 0,
      specialties: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-supervisor',
      companyId: 'company-1',
      name: 'Supervisor General',
      email: 'supervisor@empresa.com',
      password: 'demo123',
      role: 'supervisor',
      phone: '+521234567890',
      status: 'active',
      isAvailable: true,
      activeClients: 0,
      specialties: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-asesor-1',
      companyId: 'company-1',
      name: 'María González',
      email: 'maria@empresa.com',
      password: 'demo123',
      role: 'asesor',
      phone: '+521111111111',
      status: 'active',
      isAvailable: true,
      activeClients: 2,
      specialties: ['product_info'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-asesor-2',
      companyId: 'company-1',
      name: 'Carlos Ruiz',
      email: 'carlos@empresa.com',
      password: 'demo123',
      role: 'asesor',
      phone: '+522222222222',
      status: 'active',
      isAvailable: true,
      activeClients: 1,
      specialties: ['specific_query'],
      createdAt: new Date().toISOString(),
    },
  ],

  // ── Clientes ──────────────────────────────────────────────────────────────
  clients: [
    {
      id: 'client-1',
      companyId: 'company-1',
      phone: '+52551234567',
      name: 'Roberto Sánchez',
      email: 'roberto@gmail.com',
      classification: 'interested',
      status: 'assigned',
      intent: 'wants_advisor',
      source: 'whatsapp',
      assignedAdvisorId: 'user-asesor-1',
      result: null,
      createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    {
      id: 'client-2',
      companyId: 'company-1',
      phone: '+52339876543',
      name: 'Laura Martínez',
      email: 'laura@empresa.com',
      classification: 'needs_info',
      status: 'assigned',
      intent: 'product_info',
      source: 'whatsapp',
      assignedAdvisorId: 'user-asesor-2',
      result: null,
      createdAt: new Date(Date.now() - 18 * 60000).toISOString(),
    },
    {
      id: 'client-3',
      companyId: 'company-1',
      phone: '+52815555444',
      name: 'Diego Ramírez',
      email: null,
      classification: 'interested',
      status: 'won',
      intent: 'specific_query',
      source: 'whatsapp',
      assignedAdvisorId: 'user-asesor-1',
      result: 'won',
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: 'client-4',
      companyId: 'company-1',
      phone: '+52557777888',
      name: 'Sofía López',
      email: 'sofia@hotmail.com',
      classification: 'no_info',
      status: 'lost',
      intent: null,
      source: 'whatsapp',
      assignedAdvisorId: 'user-asesor-2',
      result: 'lost',
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    },
  ],

  actions: [],
  internalMessages: [],
  conversations: [],
  botSessions: {},
  assignments: [],
  messages: [],
};

// ─── Helpers CRUD ─────────────────────────────────────────────────────────────
const db = {
  getCompany: (id) => store.companies.find(c => c.id === id),
  getCompanyByNumber: (number) => store.companies.find(c => c.whatsappNumber === number),
  getAllCompanies: () => store.companies,
  createCompany: (data) => {
    const company = { id: uuidv4(), ...data, createdAt: new Date().toISOString() };
    store.companies.push(company);
    return company;
  },
  updateCompany: (id, data) => {
    const idx = store.companies.findIndex(c => c.id === id);
    if (idx !== -1) { store.companies[idx] = { ...store.companies[idx], ...data }; return store.companies[idx]; }
    return null;
  },

  getUsers: (companyId) => store.users.filter(u => u.companyId === companyId),
  getUserById: (id) => store.users.find(u => u.id === id),
  getUserByEmail: (email) => store.users.find(u => u.email === email),
  getAdvisors: (companyId) => store.users.filter(u => u.companyId === companyId && u.role === 'asesor'),
  getSupervisors: (companyId) => store.users.filter(u => u.companyId === companyId && u.role === 'supervisor'),
  updateUser: (id, data) => {
    const idx = store.users.findIndex(u => u.id === id);
    if (idx !== -1) { store.users[idx] = { ...store.users[idx], ...data, updatedAt: new Date().toISOString() }; return store.users[idx]; }
    return null;
  },
  createUser: (data) => {
    const user = { id: uuidv4(), ...data, createdAt: new Date().toISOString() };
    store.users.push(user);
    return user;
  },
  deleteUser: (id) => {
    const idx = store.users.findIndex(u => u.id === id);
    if (idx !== -1) { store.users.splice(idx, 1); return true; }
    return false;
  },

  getClients: (companyId, filters = {}) => {
    let clients = store.clients.filter(c => c.companyId === companyId);
    if (filters.classification) clients = clients.filter(c => c.classification === filters.classification);
    if (filters.status) clients = clients.filter(c => c.status === filters.status);
    if (filters.advisorId) clients = clients.filter(c => c.assignedAdvisorId === filters.advisorId);
    if (filters.result) clients = clients.filter(c => c.result === filters.result);
    return clients.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  getClientsByAdvisor: (advisorId) =>
    store.clients.filter(c => c.assignedAdvisorId === advisorId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  getClientByPhone: (phone, companyId) => store.clients.find(c => c.phone === phone && c.companyId === companyId),
  getClientById: (id) => store.clients.find(c => c.id === id),
  createClient: (data) => {
    const client = { id: uuidv4(), ...data, status: 'new', createdAt: new Date().toISOString() };
    store.clients.push(client);
    return client;
  },
  updateClient: (id, data) => {
    const idx = store.clients.findIndex(c => c.id === id);
    if (idx !== -1) { store.clients[idx] = { ...store.clients[idx], ...data, updatedAt: new Date().toISOString() }; return store.clients[idx]; }
    return null;
  },

  getActions: (filters = {}) => {
    let actions = [...store.actions];
    if (filters.advisorId) actions = actions.filter(a => a.advisorId === filters.advisorId);
    if (filters.clientId) actions = actions.filter(a => a.clientId === filters.clientId);
    if (filters.companyId) actions = actions.filter(a => a.companyId === filters.companyId);
    if (filters.type) actions = actions.filter(a => a.type === filters.type);
    return actions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  createAction: (data) => {
    const action = { id: uuidv4(), ...data, createdAt: new Date().toISOString() };
    store.actions.push(action);
    return action;
  },
  updateAction: (id, data) => {
    const idx = store.actions.findIndex(a => a.id === id);
    if (idx !== -1) { store.actions[idx] = { ...store.actions[idx], ...data, updatedAt: new Date().toISOString() }; return store.actions[idx]; }
    return null;
  },

  getInternalMessages: (companyId) =>
    store.internalMessages.filter(m => m.companyId === companyId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
  addInternalMessage: (data) => {
    const msg = { id: uuidv4(), ...data, read: false, createdAt: new Date().toISOString() };
    store.internalMessages.push(msg);
    return msg;
  },
  markInternalMessagesRead: (companyId, userId) => {
    store.internalMessages
      .filter(m => m.companyId === companyId && m.toId === userId)
      .forEach(m => m.read = true);
  },

  getBotSession: (phone) => store.botSessions[phone] || null,
  setBotSession: (phone, session) => { store.botSessions[phone] = session; },
  clearBotSession: (phone) => { delete store.botSessions[phone]; },

  getConversations: (companyId, clientId) => {
    let convs = store.conversations.filter(c => c.companyId === companyId);
    if (clientId) convs = convs.filter(c => c.clientId === clientId);
    return convs;
  },
  getConversationByClient: (clientId) => store.conversations.find(c => c.clientId === clientId),
  createConversation: (data) => {
    const conv = { id: uuidv4(), ...data, createdAt: new Date().toISOString() };
    store.conversations.push(conv);
    return conv;
  },
  updateConversation: (id, data) => {
    const idx = store.conversations.findIndex(c => c.id === id);
    if (idx !== -1) { store.conversations[idx] = { ...store.conversations[idx], ...data }; return store.conversations[idx]; }
    return null;
  },

  getMessages: (conversationId) =>
    store.messages.filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
  addMessage: (data) => {
    const msg = { id: uuidv4(), ...data, createdAt: new Date().toISOString() };
    store.messages.push(msg);
    return msg;
  },

  getAssignments: (companyId) => store.assignments.filter(a => a.companyId === companyId),
  createAssignment: (data) => {
    const assignment = { id: uuidv4(), ...data, status: 'active', createdAt: new Date().toISOString() };
    store.assignments.push(assignment);
    return assignment;
  },
  updateAssignment: (id, data) => {
    const idx = store.assignments.findIndex(a => a.id === id);
    if (idx !== -1) { store.assignments[idx] = { ...store.assignments[idx], ...data }; return store.assignments[idx]; }
    return null;
  },

  getStats: (companyId) => {
    const clients = store.clients.filter(c => c.companyId === companyId);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      totalClients: clients.length,
      interested: clients.filter(c => c.classification === 'interested').length,
      needsInfo: clients.filter(c => c.classification === 'needs_info').length,
      noInfo: clients.filter(c => c.classification === 'no_info').length,
      todayNew: clients.filter(c => new Date(c.createdAt) >= today).length,
      monthNew: clients.filter(c => new Date(c.createdAt) >= thisMonth).length,
      assigned: clients.filter(c => c.assignedAdvisorId).length,
      pending: clients.filter(c => !c.assignedAdvisorId && c.classification === 'interested').length,
      won: clients.filter(c => c.result === 'won').length,
      lost: clients.filter(c => c.result === 'lost').length,
    };
  },

  getAdvisorStats: (advisorId) => {
    const clients = store.clients.filter(c => c.assignedAdvisorId === advisorId);
    const actions = store.actions.filter(a => a.advisorId === advisorId);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const calls = actions.filter(a => a.type === 'call_phone' || a.type === 'call_whatsapp');
    const totalCallDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
    return {
      totalClients: clients.length,
      monthClients: clients.filter(c => new Date(c.createdAt) >= thisMonth).length,
      won: clients.filter(c => c.result === 'won').length,
      lost: clients.filter(c => c.result === 'lost').length,
      pending: clients.filter(c => !c.result && c.status === 'assigned').length,
      totalCalls: calls.length,
      totalCallDuration,
      todayActions: actions.filter(a => new Date(a.createdAt) >= today).length,
    };
  },
};

module.exports = { db, store };
