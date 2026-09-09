'use strict';

// Tabla oficial Busimott — cuotas mensuales por valor de vehículo y plazo
const TABLA = {
  6000:  { 36:195.37, 42:167.46, 48:146.53, 54:130.24, 60:117.22, 66:106.56, 72:97.68,  ins:336,  vm:265.68,  tp:433.68  },
  7000:  { 36:227.93, 42:195.37, 48:170.95, 54:151.95, 60:136.76, 66:124.32, 72:113.96, ins:392,  vm:309.96,  tp:505.96  },
  8000:  { 36:260.49, 42:223.28, 48:195.37, 54:173.66, 60:156.29, 66:142.08, 72:130.24, ins:448,  vm:354.24,  tp:578.24  },
  9000:  { 36:293.05, 42:251.19, 48:219.79, 54:195.37, 60:175.83, 66:159.85, 72:146.53, ins:504,  vm:398.53,  tp:650.53  },
  10000: { 36:325.61, 42:279.10, 48:244.21, 54:217.07, 60:195.37, 66:177.61, 72:162.81, ins:560,  vm:442.81,  tp:722.81  },
  11000: { 36:358.17, 42:307.00, 48:268.63, 54:238.78, 60:214.90, 66:195.37, 72:179.09, ins:616,  vm:487.09,  tp:795.09  },
  12000: { 36:390.73, 42:334.91, 48:293.05, 54:260.49, 60:234.44, 66:213.13, 72:195.37, ins:672,  vm:531.37,  tp:867.37  },
  13000: { 36:423.29, 42:362.82, 48:317.47, 54:282.20, 60:253.98, 66:230.89, 72:211.65, ins:728,  vm:575.65,  tp:939.65  },
  14000: { 36:455.86, 42:390.73, 48:341.89, 54:303.90, 60:273.51, 66:248.65, 72:227.93, ins:784,  vm:619.93,  tp:1011.93 },
  15000: { 36:488.42, 42:418.64, 48:366.31, 54:325.61, 60:293.05, 66:266.41, 72:244.21, ins:840,  vm:null,    tp:1084.21 },
  16000: { 36:520.98, 42:446.55, 48:390.73, 54:347.32, 60:312.59, 66:284.17, 72:260.49, ins:896,  vm:708.49,  tp:1156.49 },
  17000: { 36:553.54, 42:474.46, 48:415.15, 54:369.03, 60:332.12, 66:301.93, 72:276.77, ins:952,  vm:752.77,  tp:1228.77 },
  18000: { 36:586.10, 42:502.37, 48:439.58, 54:390.73, 60:351.66, 66:319.69, 72:293.05, ins:1008, vm:797.05,  tp:1301.05 },
  19000: { 36:618.66, 42:530.28, 48:464.00, 54:412.44, 60:371.20, 66:337.45, 72:309.33, ins:1064, vm:841.33,  tp:1373.33 },
  20000: { 36:651.22, 42:558.19, 48:488.42, 54:434.15, 60:390.73, 66:355.21, 72:325.61, ins:1120, vm:885.61,  tp:1445.61 },
};

const PLAZOS = [36, 42, 48, 54, 60, 66, 72];

const MODAL_INFO = {
  mega_estrella:  {
    label:    'MEGA ESTRELLA ⭐⭐⭐',
    pct:      70,
    entrega:  '20 días hábiles tras el pago de entrada',
    detalle:  'Cancela el 70% de entrada y recibe su vehículo en 20 días hábiles. Sin buró ni central de riesgo.',
  },
  super_estrella: {
    label:    'SÚPER ESTRELLA ⭐⭐',
    pct:      35,
    entrega:  'mes 4',
    detalle:  'Realiza 3 abonos mensuales y en el mes 4 cancela el 35% del total del crédito. Recibe su vehículo ese mismo mes.',
  },
  estrella: {
    label:    'ESTRELLA ⭐',
    pct:      null,
    entrega:  'a partir del 7mo mes',
    detalle:  'Realiza 7 abonos mensuales iniciales para crear su récord crediticio y verificar su capacidad de pago. A partir del 7mo mes recibe su vehículo.',
  },
};

function closestRow(valor) {
  const v = Math.max(6000, Math.min(20000, Math.round(Number(valor) / 1000) * 1000));
  return { row: TABLA[v], base: v };
}

function fmt(n) {
  return n != null ? `$${Number(n).toFixed(2)}` : 'Consultar';
}

// Detecta la modalidad elegida escaneando el historial de conversación
function detectModalidad(history) {
  if (!history || !history.length) return null;
  const text = history
    .map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
    .join(' ')
    .toLowerCase();
  if (text.includes('mega estrella'))                                    return 'mega_estrella';
  if (text.includes('súper estrella') || text.includes('super estrella')) return 'super_estrella';
  if (text.includes('estrella'))                                          return 'estrella';
  return null;
}

// Formatea el valor como "6mil", "10mil", etc.
function fmtValor(v) {
  return `${v / 1000}mil`;
}

// Calcula el abono a 12 meses del 30% restante en Mega Estrella
// Factor derivado de la tabla oficial: $203.22 para $6.000 → ratio 0.03387
function mega12m(base) {
  return (base * 0.03387).toFixed(2);
}

function buildCard(row, base, modalidad, plazo) {
  const cuota = row[plazo] ?? row[72];
  const vLabel = fmtValor(base);

  if (modalidad === 'mega_estrella') {
    const entrada70 = Math.round(base * 0.70);
    return [
      `🟡 Modalidad Mega Estrella (valor ${vLabel})`,
      ``,
      `📑 Invierte el 70%= $${entrada70}`,
      ``,
      `Disfrute su vehículo en apenas 20 días hábiles  🚘`,
      ``,
      `🔸 Valor restante diferido:`,
      `12 meses`,
      `18 meses`,
    ].join('\n');
  }

  if (modalidad === 'super_estrella') {
    return [
      `🟡  Modalidad Súper Estrella (valor ${vLabel})`,
      ``,
      `✅ Activación de servicio (beneficios)= $${row.tp.toFixed(2)} su primera mensualidad ya está incluida.📑`,
      ``,
      `Mensualidades económicas de $${cuota.toFixed(2)}`,
      `Al 4to mes cancela el 35% de entrada.`,
    ].join('\n');
  }

  // estrella (default)
  return [
    `🟡  Modalidad Estrella (valor ${vLabel})`,
    ``,
    `✅ Activación de servicio (beneficios)= $${row.tp.toFixed(2)} su primera mensualidad ya está incluida.📑`,
    ``,
    `Mensualidades económicas de $${cuota.toFixed(2)}`,
    ``,
    `🚘  Prepárese para recibir su vehículo desde el séptimo mes`,
  ].join('\n');
}

/**
 * Genera la cotización en el formato oficial de Busimott.
 * @param {number} valor     - Valor del vehículo
 * @param {string} modalidad - 'mega_estrella' | 'super_estrella' | 'estrella' | null (→ las 3)
 * @param {number} plazo     - Meses (default 72)
 */
function generarCotizacion(valor, modalidad, plazo = 72) {
  const { row, base } = closestRow(valor);
  if (!row) return 'No tenemos cotización para ese valor. Manejamos vehículos desde $6.000 a $20.000.';

  if (!modalidad || !MODAL_INFO[modalidad]) {
    return [
      buildCard(row, base, 'mega_estrella',  plazo),
      '',
      buildCard(row, base, 'super_estrella', plazo),
      '',
      buildCard(row, base, 'estrella',       plazo),
    ].join('\n');
  }

  return buildCard(row, base, modalidad, plazo);
}

/**
 * Genera tabla con todos los plazos disponibles para un valor.
 * Se usa cuando el cliente quiere ver diferentes opciones de plazo.
 */
function generarTablaPlazos(valor) {
  const { row, base } = closestRow(valor);
  if (!row) return null;
  const lines = [`📊 *Plazos disponibles — ${fmt(base)}*`, ``, `De menor a mayor abono mensual:`];
  for (const p of [...PLAZOS].reverse()) {
    const tag = p === 72 ? ' ← más económico' : '';
    lines.push(`• ${p} meses → ${fmt(row[p])}/mes${tag}`);
  }
  lines.push('', `📋 Activación (única): ${fmt(row.ins)}`, `1️⃣ Valor total de activación: ${fmt(row.tp)}`);
  lines.push('', `¿A cuántos meses le acomoda?`);
  return lines.join('\n');
}

module.exports = { generarCotizacion, generarTablaPlazos, detectModalidad, TABLA, PLAZOS };

