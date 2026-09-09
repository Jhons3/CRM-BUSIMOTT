'use strict';

const { TABLA } = require('../data/cotizacion');

function closestVal(v) {
  return Math.max(6000, Math.min(20000, Math.round(Number(v) / 1000) * 1000));
}
function fmt(n) { return `$${Number(n).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

// Extrae valor numérico del texto: "8mil", "8k", "8000", "$8.000"
function extractValorFromText(text) {
  const t = text.replace(/[.,]/g, match => match === '.' && text.indexOf(match) > text.length - 5 ? '.' : '');
  const m =
    text.match(/\b(\d{1,2})\s*(mil|k)\b/i)    ||
    text.match(/\$\s*(\d{1,2})[.,](\d{3})\b/)  ||
    text.match(/\b(\d{5,6})\b/);
  if (!m) return null;
  if (m[2] && /mil|k/i.test(m[2])) return Number(m[1]) * 1000;
  if (m[2] && m[2].length === 3)   return Number(m[1] + m[2]);
  if (m[1])                         return Number(m[1]);
  return null;
}

// ── Banco de 21 preguntas frecuentes ─────────────────────────────────────────

const FAQ = [

  // 1. Garantía de entrega
  {
    id: 'garantia_entrega',
    test: t => /garanti[az].*entrega|entrega.*garanti[az]|c[oó]mo\s*(s[eé]|sab[eo]).*entrega|van\s*a\s*entrega|segur[oa].*entrega|entrega.*segur[oa]|cumpl.*tiempo|me\s*entregan?\b/.test(t),
    response: () =>
      'Dentro del contrato queda estipulada la modalidad de pago que usted elige y el tiempo de entrega de su vehículo. Todo por escrito y firmado. ¿Le coordino los próximos pasos?',
  },

  // 2. Confirmación plazo Estrella (7 meses)
  {
    id: 'confirma_estrella_7',
    test: t => /pago\s*(los\s*)?7|7\s*(meses|abonos).*entregan|entregan.*7\s*(mes|abono)|desde\s*el\s*s[eé]ptimo|7mo\s*mes|mes\s*7/.test(t),
    response: () =>
      'Efectivamente, así es. La modalidad Estrella trabaja exclusivamente con su abono mensual sin aportar ningún porcentaje de entrada, y adquiere su vehículo en la marca, modelo y color que prefiere. ¿Iniciamos?',
  },

  // 3. Pago adelantado total / todo de una
  {
    id: 'pago_adelantado_total',
    test: t => /pago\s*todo\s*(de\s*una|adelantado|junto)|cancelo?\s*todo|pagar\s*todo\s*de\s*una|\d+\s*(cuotas?|abonos?)\s*adelantad|\bde\s*una\s*vez\b/.test(t),
    response: () =>
      'Me encantaría ayudarle de esa manera, sin embargo es importante generar el récord crediticio para verificar su capacidad de pago, ya que no revisamos ni solicitamos buró de crédito ni central de riesgo. Le otorgamos crédito directo. ¿Le coordino los próximos pasos?',
  },

  // 4. Para qué sirve la activación / qué incluye → tag
  {
    id: 'activacion_beneficios',
    test: t => /activaci[oó]n.*sirve|para\s*qu[eé].*activ|qu[eé]\s*(incluye|cubre|trae)\s*la\s*activ|activ.*qu[eé]\s*incluye|beneficios.*activ|activ.*beneficios/.test(t),
    response: () => 'TAG:ENVIAR_BENEFICIOS',
  },

  // 5. Son un patio de vehículos / ir a ver los carros
  {
    id: 'patio_carros',
    test: t => /patio\s*(de\s*)?(carros?|veh[ií]culos?|autos?)|ir\s*a\s*ver\s*(los\s*)?(carros?|veh[ií]culos?)|tienen\s*carros?\s*f[ií]sicos?|local\s*(de\s*)?(carros?|veh)/.test(t),
    response: () =>
      'Somos una comercializadora de vehículos y motocicletas. Realizamos una búsqueda y compra personalizada del vehículo que usted solicita. La ventaja es que elige el vehículo exactamente a su gusto: marca, modelo y color. ¿Tiene algún modelo en mente?',
  },

  // 6. Dónde están ubicados → tag
  {
    id: 'ubicacion',
    test: t => /d[oó]nde\s*(est[aá]n|quedan|se\s*ubican|trabajan|atienden)|ubicaci[oó]n|direcci[oó]n|c[oó]mo\s*llegar|oficinas|instalaciones/.test(t),
    response: () => 'TAG:ENVIAR_DIRECCION',
  },

  // 7. Quiero el vehículo más pronto
  {
    id: 'vehiculo_pronto',
    test: t => /m[aá]s\s*(r[aá]pido|pronto)|sin\s*esperar|antes\s*del\s*7|antes\s*de\s*(los\s*)?\d\s*mes|urgente|necesito\s*(ya|pronto|r[aá]pido|de\s*ya)/.test(t),
    response: () =>
      'Con gusto, para eso tenemos la modalidad Súper Estrella donde recibe su vehículo al 4to mes, o la Mega Estrella donde lo recibe en apenas 20 días hábiles con el 70% de entrada. ¿Cuál le interesa más?',
  },

  // 8. Confirmación Súper Estrella 4to mes
  {
    id: 'confirma_super_4',
    test: t => /4to\s*mes.*entrega|entrega.*4to\s*mes|cuarto\s*mes.*veh[ií]culo|recib[oe].*4to\s*mes|mes\s*4.*entrega/.test(t),
    response: () =>
      'Efectivamente. En la modalidad Súper Estrella realiza 3 abonos y en el 4to mes cancela el 35% de entrada — ese mismo mes recibe su vehículo. ¿Iniciamos?',
  },

  // 9. Cálculo del 70% de entrada
  {
    id: 'calculo_70',
    test: t => /cu[aá]nto\s*(es|ser[ií]a|sale)\s*(el\s*)?70|70\s*%?\s*(de|del)\s*(\$|\d)|el\s*70\s*de\s*\d|\bcu[aá]nto\s*es\s*el\s*70\b/.test(t),
    response: (t, ctx) => {
      const v = extractValorFromText(t) || (ctx.valor ? Number(ctx.valor) : null);
      if (!v) return null;
      const base   = closestVal(v);
      const entrada = Math.round(base * 0.70);
      return `Para un vehículo de ${fmt(base)}, el 70% de entrada serían $${entrada.toLocaleString()}. Con ese pago recibe su vehículo en 20 días hábiles. ¿Le coordino los próximos pasos?`;
    },
  },

  // 10. Cálculo del 35% de entrada
  {
    id: 'calculo_35',
    test: t => /cu[aá]nto\s*(es|ser[ií]a|sale)\s*(el\s*)?35|35\s*%?\s*(de|del)\s*(\$|\d)|el\s*35\s*de\s*\d|\bcu[aá]nto\s*es\s*el\s*35\b|cu[aá]nto\s*(es|ser[ií]a)\s*(el\s*)?(35|treinta).*entrada|cu[aá]nto.*entrada.*35|35.*entrada.*cu[aá]nto/.test(t),
    response: (t, ctx) => {
      const v = extractValorFromText(t) || (ctx.valor ? Number(ctx.valor) : null);
      if (!v) {
        // Sin valor en texto ni en contexto — pedir el valor en lugar de caer al AI
        return '¿Para qué valor de vehículo le calculo el 35% de entrada? Por ejemplo: $8.000, $10.000, $12.000…';
      }
      const base = closestVal(v);
      const row  = TABLA[base];
      if (!row) return null;
      const total = (row[72] * 72 + row.ins) * 0.35;
      return `El 35% de entrada para un vehículo de ${fmt(base)} son ${fmt(total)}. ¿Le coordino los próximos pasos?`;
    },
  },

  // 11. Cuánto terminaría pagando en total / crédito total
  {
    id: 'total_credito',
    test: t => /cu[aá]nto.*\btotal\b|total\s*(del?\s*)?cr[eé]dito|cr[eé]dito\s*total|valor\s*total.*(cr[eé]dito|plan)|pagar.*\btotal\b/.test(t),
    response: (t, ctx) => {
      const v = extractValorFromText(t) || (ctx.valor ? Number(ctx.valor) : null);
      if (!v) return null;
      const base = closestVal(v);
      const row  = TABLA[base];
      if (!row) return null;
      const totalCredito = (row[72] * 72 + row.ins).toFixed(2);
      const contado      = (base + row.ins).toFixed(2);
      return `Para un vehículo de ${fmt(base)}, el total a crédito sería $${totalCredito} (72 abonos de ${fmt(row[72])} + activación). De contado: $${contado}. Trabajamos con la tasa más económica del mercado, 2.87% fija anual. ¿Le coordino los próximos pasos?`;
    },
  },

  // 11b. Cuánto es el primer pago / para empezar
  {
    id: 'primer_pago',
    test: t => /primer[ao]?\s*(pago|abono|mensualidad)|cu[aá]nto\s*(es|ser[ií]a|pago)\s*(para\s*)?(empezar|iniciar|comenzar)|cu[aá]nto\s*necesito\s*para\s*(iniciar|empezar|comenzar)|para\s*empezar\s*cu[aá]nto/.test(t),
    response: (t, ctx) => {
      if (!ctx.valor) return null;
      const base = closestVal(ctx.valor);
      const row  = TABLA[base];
      if (!row) return null;
      const isMega = (ctx.modalidad || '').toLowerCase().includes('mega');
      if (isMega) {
        const entrada = Math.round(Number(ctx.valor) * 0.70).toLocaleString();
        return `En Mega Estrella solo ingresa con el 70% del valor del vehículo: $${entrada}. Nada más. Con ese pago recibe su vehículo en 20 días hábiles. ¿Le coordino los próximos pasos?`;
      }
      return `Su primer pago es la activación de servicio de ${fmt(row.tp)}, que ya incluye su primer abono mensual de ${fmt(row[72])}. A partir del segundo mes cancela únicamente ${fmt(row[72])}. ¿Le coordino los próximos pasos?`;
    },
  },

  // 12. Por qué sale más caro que el precio de lista
  {
    id: 'por_que_mas_caro',
    test: t => /por\s*qu[eé]\s*(sale|cuesta|es|pago)\s*m[aá]s|m[aá]s\s*(caro|costoso)\s*(que\s*(el\s*precio|el\s*valor))?|sale\s*m[aá]s\s*caro/.test(t),
    response: () =>
      'Le comprendo. Todo artículo a crédito tiene un valor adicional, por esa razón cancela un poco más. Sin embargo, recuerde que le otorgamos crédito directo para adquirir cualquier vehículo a su gusto, sin buró ni garantía. ¿Le coordino los próximos pasos?',
  },

  // 13. Qué cubre la garantía
  {
    id: 'garantia_cobertura',
    test: t => /qu[eé]\s*(cubre|incluye|abarca|trae)\s*(la\s*)?garant[ií]a|garant[ií]a\s*(del\s*motor|mec[aá]nica|de\s*qu[eé]|qu[eé]\s*cubre)/.test(t),
    response: () =>
      'La garantía cubre especialmente el motor de su vehículo, que es la parte más costosa. Son 24 meses de garantía incluidos con su adquisición. ¿Le coordino los próximos pasos?',
  },

  // 14a. Envío / recepción del contrato digital → P11 directo
  {
    id: 'p11_contrato',
    test: t => /c[oó]mo\s*(ser[ií]a|funciona|es|se\s*hace|realiza)\s*(el\s*)?env[ií]o|c[oó]mo\s*(me\s*)?env[ií]an?\s*(el\s*)?contrato|env[ií]o\s*(del?\s*)?(contrato|correo)|correo\s*electr[oó]nico.*contrato|contrato.*(correo|digital|electr[oó]nico|virtual)|c[oó]mo\s*recibo\s*(el\s*)?contrato|env[ií]a[nm]e\s*(el\s*)?contrato|me\s*(env[ií]an?|mandan?|pasan?)\s*(el\s*)?contrato|explicar?\s*(el\s*)?env[ií]o/.test(t),
    response: (t, ctx) => {
      const isMega = (ctx.modalidad || '').toLowerCase().includes('mega');
      let activText = `Para el envío de su contrato necesita cubrir el valor de activación de servicios de su plan.`;
      if (ctx.valor) {
        const base = Math.max(6000, Math.min(20000, Math.round(Number(ctx.valor) / 1000) * 1000));
        if (isMega) {
          const entrada = Math.round(Number(ctx.valor) * 0.70).toLocaleString();
          activText = `Para el envío de su contrato necesita cubrir el 70% de entrada: $${entrada}.`;
        } else {
          const row = TABLA[base];
          if (row) activText = `Para el envío de su contrato necesita cubrir el valor de activación de servicios de $${row.tp.toFixed(2)}.`;
        }
      }
      return `${activText} [ENVIAR_CUENTA_PAGO] Una vez confirmado su pago, comuníquese con contabilidad al +593 99 986 5071 para generar su comprobante y proceder con el envío de su contrato. [HANDOFF:cliente_caliente]`;
    },
  },

  // 14. Ver / leer el contrato antes de pagar (sin querer recibirlo aún)
  {
    id: 'ver_contrato',
    test: t => /ver\s*(el\s*)?contrato|leer\s*(el\s*)?contrato|contrato\s*antes|revisar\s*(el\s*)?contrato/.test(t),
    response: () =>
      'Me encantaría ayudarle, sin embargo el contrato es un documento oficial de la empresa y no puede ser enviado sin ningún respaldo económico. Puede visitarnos en nuestras instalaciones y revisarlo sin ningún compromiso. ¿Prefiere visitarnos o proceder con el contrato digital?',
  },

  // 15. Precio al contado
  {
    id: 'precio_contado',
    test: t => /\bcontado\b|precio\s*(al\s*)?contado|pago\s*(al\s*)?contado|cu[aá]nto\s*(al\s*)?contado|pago\s*completo\s*de\s*una/.test(t),
    response: (t, ctx) => {
      const v = extractValorFromText(t) || (ctx.valor ? Number(ctx.valor) : null);
      if (!v) return null;
      const base = closestVal(v);
      const row  = TABLA[base];
      if (!row) return null;
      const total = (base + row.ins).toFixed(2);
      return `Para un vehículo de ${fmt(base)} al contado, el valor total sería $${total} (precio del vehículo + activación $${row.ins}). La entrega es en máximo 20 días hábiles. ¿Le coordino los próximos pasos?`;
    },
  },

  // 16. Son un consorcio / sorteos / subastas
  {
    id: 'consorcio',
    test: t => /consorcio|sorteo|subasta|plan\s*grupal|rifan?\b|plan\s*colectivo/.test(t),
    response: () =>
      'Somos una comercializadora de vehículos y motocicletas. No trabajamos bajo ningún tipo de sorteo, subasta ni plan grupal. El proceso es individual para cada cliente — las entregas son fijas y garantizadas por contrato. ¿Le coordino los próximos pasos?',
  },

  // 17. Adelantar pagos / varios abonos
  {
    id: 'adelantar_abonos',
    test: t => /adelantar\s*(los\s*)?(pagos?|abonos?)|pagar\s*m[aá]s\s*de\s*un\s*abono|varios\s*abonos|pago\s*doble|dos\s*abonos?|abonos?\s*extra/.test(t),
    response: () =>
      'Efectivamente, puede realizar más abonos según su capacidad de pago. El tiempo de entrega de su vehículo se mantiene según su modalidad, y después de recibirlo también puede adelantar abonos. ¿Le coordino los próximos pasos?',
  },

  // 18. Cuántos meses / plazo del crédito
  {
    id: 'plazo_meses',
    test: t => /cu[aá]ntos?\s*(meses?|abonos?|pagos?)\s*(son|tiene|hay)|plazo\s*(del?\s*)?cr[eé]dito|en\s*cu[aá]ntos?\s*meses?|tiempo\s*(del?\s*)?cr[eé]dito|cuantos\s*meses\s*(dura|es)/.test(t),
    response: () =>
      'Trabajamos con plazos de 36, 42, 48, 54, 60, 66 y 72 meses — usted elige según su capacidad de pago. El abono más económico es a 72 meses. Trabajamos con la tasa administrativa más económica del mercado, 2.87% fija anual. ¿Qué plazo le acomoda mejor?',
  },

  // 19. Entrega a domicilio / en otra ciudad
  {
    id: 'entrega_domicilio',
    test: t => /entregan\s*(a\s*)?(domicilio|mi\s*casa|donde\s*(yo\s*)?est[eé]|mi\s*direcci[oó]n)|llevan\s*el\s*(carro|veh[ií]culo)|entrega\s*en\s*(mi\s*ciudad|provincia|otra\s*ciudad|[a-z]+)/.test(t),
    response: () =>
      'La entrega del vehículo se realiza únicamente en nuestras instalaciones en Quito. La coordinación la manejan nuestros ingenieros. ¿Le coordino los próximos pasos?',
  },

  // 20. Buró de crédito / historial / deudas
  {
    id: 'buro',
    test: t => /bur[oó](\s*de\s*cr[eé]dito)?|central\s*de\s*riesgo|historial\s*crediticio|cr[eé]dito\s*(malo|negativo)|deudas?\b|lista\s*negra|verifin/.test(t),
    response: () =>
      'No consultamos buró ni central de riesgo. Trabajamos con crédito directo basado en su capacidad de pago actual — usted ya califica. ¿Le coordino los próximos pasos?',
  },

  // 21a. Pregunta por cuota/abono cuando ya hay valor guardado (evita el genérico $6K)
  {
    id: 'pide_abono_venta',
    test: t => /cu[aá]nto\s*(es|ser[ií]a|queda|sale)\s*(la\s*)?(cuota|abono|mensual(idad)?)|cu[aá]nto\s*(pago|me\s*sale|me\s*toca|abon[oa])|que\s*abono|que\s*mensual/.test(t),
    response: (t, ctx) => {
      if (!ctx.valor) return null;
      const base = closestVal(ctx.valor);
      const row  = TABLA[base];
      if (!row) return null;
      const modalLabel = ctx.modalidad || 'su plan';
      return `Su abono mensual para un vehículo de ${fmt(base)} es de ${fmt(row[72])} a 72 meses. La activación de servicios es ${fmt(row.tp)} (primera mensualidad incluida). ¿Le coordino los próximos pasos?`;
    },
  },

  // 22. Requisitos para iniciar → ENVIAR_CUENTA_PAGO (con activación calculada si hay valor)
  {
    id: 'requisitos',
    test: t => /\brequisitos?\b|que\s*necesito\b|que\s*(se\s*)?necesita\b|que\s*documentos?\b|que\s*papeles?\b|cuales?\s*son\s*(los\s*)?requisitos?/.test(t),
    response: () => 'TAG:ENVIAR_CUENTA_PAGO',
  },

  // 21. Desconfianza / estafa / fraude → tag
  {
    id: 'antifraude',
    test: t => /estafa|fraude|enga[ñn]|es\s*falso|no\s*es\s*real|son\s*reales?|comprobantes?|pruebas?|confiable|seg[uu]ro\s*(que\s*)?(son|es|no)\s*(real|legit|ver[ií]fic)/.test(t),
    response: () => 'TAG:ENVIAR_ANTIFRAUDE',
  },
];

/**
 * Busca una respuesta en el cache de FAQs.
 * @param {string} text   - Mensaje del cliente (texto plano)
 * @param {object} ctx    - { valor, modalidad, nombre } del lead
 * @returns {{ text: string, isTag: boolean }|null}
 */
function findFaqResponse(text, ctx = {}) {
  const t = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const faq of FAQ) {
    if (!faq.test(t)) continue;
    const res = faq.response(t, ctx);
    if (!res) continue;
    if (res.startsWith('TAG:')) return { text: res.replace('TAG:', ''), isTag: true };
    return { text: res, isTag: false };
  }
  return null;
}

module.exports = { findFaqResponse };
