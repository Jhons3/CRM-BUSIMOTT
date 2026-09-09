/* eslint-disable */
import React, { useState, useEffect, useRef, useCallback } from 'react';
function toWA(p){const r=(p||'').replace(/\D/g,'');return r.startsWith('593')?r:r.startsWith('0')&&r.length===10?'593'+r.substring(1):r.length===9?'593'+r:r;}
import {
  Users, Phone, MessageCircle, Calendar, BarChart2, Trophy,
  XCircle, Clock, TrendingUp, AlertCircle, Activity,
  UserCheck, ChevronLeft, ChevronRight, Zap, Star, Download,
  RefreshCw, Eye, MessageSquare, CheckCircle, X,
  Video, Search, Send, FileText,
  Bell, Edit2, Trash2, Plus, DollarSign, Shield, Grid, Save,
  Flame, Thermometer, Snowflake, Target, Bot, FileSpreadsheet, ChevronDown} from 'lucide-react';
const makeDS = (p = '#4f6ef7') => ({
  bg:'#f5f7fb', bg2:'#f8fafc', bg3:'#f1f5f9',
  surface:'#ffffff', surf2:'#f8fafc', surf3:'#f1f5f9',
  border:'1px solid #eaecf0', border2:'1.5px solid #e2e8f0',
  shadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)',
  shadow2:'0 4px 20px rgba(0,0,0,0.09)',
  glass:'rgba(0,0,0,0.02)', glass2:'#ffffff',
  text1:'#1e293b', text2:'#475569', text3:'#94a3b8',
  red:'#ef4444', green:'#10b981', yellow:'#f59e0b',
  blue: p, primary: p,
  purple:'#8b5cf6',
  fontHead:"'DM Sans',sans-serif", fontBody:"'DM Sans',sans-serif",
});
let DS = makeDS();
let CB = '#ffffff'; // card background (updated per company)
let CBorder = '#4f6ef720'; // card border
let CShadow = '0 2px 12px #4f6ef714'; // card shadow
let MOB = false;
let _setConfirmS = null;
function askConfirm(msg, onYes) { if (_setConfirmS) _setConfirmS({ msg, onYes }); }
function ConfirmModal({ msg, onYes, onClose }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,padding:'28px 32px',width:340,boxShadow:'0 24px 64px rgba(0,0,0,0.18)',border:'1px solid #e2e8f0'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:18,fontWeight:800,color:'#1e293b',marginBottom:8}}>¿Estás seguro?</div>
        <div style={{fontSize:13,color:'#64748b',marginBottom:24,lineHeight:1.6}}>{msg}</div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:'11px',borderRadius:10,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#64748b',fontWeight:700,fontSize:13,cursor:'pointer'}}>No, cancelar</button>
          <button onClick={()=>{onYes();onClose();}} style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:'#ef4444',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  );
}
const API = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '')
  : `${window.location.protocol}//${window.location.hostname}:3001`;
const tok = () => localStorage.getItem('crm_token');
async function apiFetch(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}

const ago = d => { const s=(Date.now()-new Date(d))/1000; if(s<60)return 'ahora'; if(s<3600)return `${Math.floor(s/60)}m`; if(s<86400)return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`; };
const fmtT = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

/* ─────────────────────────── SHARED DATA ─────────────────────────── */
const ASESORES = [
  { id:'a1', name:'María García',  email:'maria@empresa.com',  phone:'+525550001111', active:true,  score:88, clients:12, won:4, lost:2, calls:28, avgDur:234, streak:5 },
  { id:'a2', name:'Carlos Ruiz',   email:'carlos@empresa.com', phone:'+525550002222', active:true,  score:62, clients:9,  won:2, lost:3, calls:17, avgDur:185, streak:1 },
  { id:'a3', name:'Ana Jiménez',   email:'ana@empresa.com',    phone:'+525550003333', active:false, score:94, clients:15, won:6, lost:1, calls:35, avgDur:278, streak:8 },
  { id:'a4', name:'Luis Mendoza',  email:'luis@empresa.com',   phone:'+525550004444', active:true,  score:48, clients:7,  won:1, lost:4, calls:12, avgDur:145, streak:0 },
];

const INIT_LEADS_SUP = [
  { id:'ls1', nombre:'Andrés Castillo', telefono:'+52551098765', email:'andres@gmail.com',    msgBot:'Vi su anuncio, me interesa el plan premium.',     nivel:'caliente', score:90, asesorId:'a1', asesor:'María García',  origen:'WhatsApp Bot', fecha:new Date(Date.now()-1*3600000).toISOString()  },
  { id:'ls2', nombre:'Patricia Núñez',  telefono:'+52339012345', email:'patricia@corp.mx',    msgBot:'¿Pueden enviarme información sobre sus planes?',  nivel:'caliente', score:82, asesorId:'a2', asesor:'Carlos Ruiz',   origen:'WhatsApp Bot', fecha:new Date(Date.now()-2*3600000).toISOString()  },
  { id:'ls3', nombre:'Fernando Reyes',  telefono:'+52554567890', email:'',                    msgBot:'Me recomendaron su empresa, quisiera cotización.', nivel:'caliente', score:78, asesorId:'a1', asesor:'María García',  origen:'WhatsApp Bot', fecha:new Date(Date.now()-4*3600000).toISOString()  },
  { id:'ls4', nombre:'Claudia Herrera', telefono:'+52813456789', email:'claudia@hotmail.com', msgBot:'¿Cuánto cuesta el plan básico?',                  nivel:'tibio',    score:55, asesorId:'a4', asesor:'Luis Mendoza',  origen:'WhatsApp Bot', fecha:new Date(Date.now()-6*3600000).toISOString()  },
  { id:'ls5', nombre:'Ricardo Méndez',  telefono:'+52556789012', email:'ricardo@empresa.com', msgBot:'Hola, quiero información general.',               nivel:'tibio',    score:50, asesorId:'a3', asesor:'Ana Jiménez',   origen:'WhatsApp Bot', fecha:new Date(Date.now()-8*3600000).toISOString()  },
  { id:'ls6', nombre:'Valentina Cruz',  telefono:'+52332345678', email:'',                    msgBot:'¿Tienen soporte en español?',                     nivel:'tibio',    score:42, asesorId:'a2', asesor:'Carlos Ruiz',   origen:'WhatsApp Bot', fecha:new Date(Date.now()-10*3600000).toISOString() },
  { id:'ls7', nombre:'Jorge Ponce',     telefono:'+52557890123', email:'',                    msgBot:'Ok',                                              nivel:'frio',     score:18, asesorId:'a4', asesor:'Luis Mendoza',  origen:'WhatsApp Bot', fecha:new Date(Date.now()-14*3600000).toISOString() },
  { id:'ls8', nombre:'Mónica Vargas',   telefono:'+52551234000', email:'',                    msgBot:'¿Esto es real o spam?',                           nivel:'frio',     score:12, asesorId:'a1', asesor:'María García',  origen:'WhatsApp Bot', fecha:new Date(Date.now()-18*3600000).toISOString() },
];
const LEAD_COLS_SUP = {
  caliente:{ label:'Caliente', sub:'Muy interesados',          color:'#ef4444', bg:'#fff5f5', border:'#fecaca' },
  tibio:   { label:'Tibio',   sub:'Medianamente interesado', color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
  frio:    { label:'Frío',    sub:'Poco interés / poca info', color:'#4f6ef7', bg:'#f0f1ff', border:'#c7d2fe' },
};

const INIT_CLIENTS = [
  { id:'c1', name:'Roberto Sánchez', phone:'+52551234567', email:'roberto@gmail.com',  asesorId:'a1', asesor:'María García',  classification:'interested', result:null,   score:85, lossReason:null,  lastContact: new Date(Date.now()-2*3600000).toISOString(),   notes:'Interesado en plan premium' },
  { id:'c2', name:'Laura Martínez',  phone:'+52339876543', email:'laura@empresa.com',  asesorId:'a2', asesor:'Carlos Ruiz',   classification:'needs_info', result:null,   score:60, lossReason:null,  lastContact: new Date(Date.now()-26*3600000).toISOString(),  notes:'Solicita más info de precios' },
  { id:'c3', name:'Diego Ramírez',   phone:'+52815555444', email:null,                 asesorId:'a1', asesor:'María García',  classification:'interested', result:'won',  score:95, lossReason:null,  lastContact: new Date(Date.now()-5*3600000).toISOString(),   notes:'Cerrado exitosamente' },
  { id:'c4', name:'Sofía López',     phone:'+52557777888', email:'sofia@hotmail.com',  asesorId:'a4', asesor:'Luis Mendoza',  classification:'no_info',   result:'lost', score:20, lossReason:'Precio muy alto, optó por competencia',    lastContact: new Date(Date.now()-48*3600000).toISOString(),  notes:'No contestó 3 intentos' },
  { id:'c5', name:'Miguel Torres',   phone:'+52331122334', email:'miguel@corp.mx',     asesorId:'a3', asesor:'Ana Jiménez',   classification:'interested', result:null,   score:72, lossReason:null,  lastContact: new Date(Date.now()-4*3600000).toISOString(),   notes:'Reunión de cierre pendiente' },
  { id:'c6', name:'Carmen Vega',     phone:'+52554433221', email:'carmen@vega.mx',     asesorId:'a3', asesor:'Ana Jiménez',   classification:'needs_info', result:'won',  score:78, lossReason:null,  lastContact: new Date(Date.now()-6*3600000).toISOString(),   notes:'Cerrado en segunda llamada' },
  { id:'c7', name:'Pedro Flores',    phone:'+52559988776', email:'pedro@flores.mx',    asesorId:'a2', asesor:'Carlos Ruiz',   classification:'no_info',   result:'lost', score:15, lossReason:'No tiene presupuesto en este momento',     lastContact: new Date(Date.now()-72*3600000).toISOString(), notes:'Seguimiento en 3 meses' },
  { id:'c8', name:'Isabel Moreno',   phone:'+52553344556', email:'isabel@moreno.mx',   asesorId:'a4', asesor:'Luis Mendoza',  classification:'interested', result:null,   score:65, lossReason:null,  lastContact: new Date(Date.now()-8*3600000).toISOString(),   notes:'Evaluando opciones' },
];

const INIT_EVENTS = [
  { id:'e1', type:'cita',    title:'Demo producto',     clientId:'c1', clientName:'Roberto Sánchez', asesorId:'a1', asesor:'María García',  date: dateStr(2), time:'10:00', description:'Mostrar módulo de reportes y dashboard principal', done:false },
  { id:'e2', type:'llamada', title:'Seguimiento precio',clientId:'c2', clientName:'Laura Martínez',  asesorId:'a2', asesor:'Carlos Ruiz',   date: dateStr(1), time:'12:00', description:'Aclarar precios del plan empresarial',              done:false },
  { id:'e3', type:'cita',    title:'Cierre contrato',   clientId:'c5', clientName:'Miguel Torres',   asesorId:'a3', asesor:'Ana Jiménez',   date: dateStr(3), time:'15:00', description:'Reunión final para firma de contrato',              done:false },
  { id:'e4', type:'llamada', title:'Reactivación',      clientId:'c8', clientName:'Isabel Moreno',   asesorId:'a4', asesor:'Luis Mendoza',  date: dateStr(0), time:'09:00', description:'Llamada de seguimiento tras 8 días sin contacto',   done:true  },
];

const INIT_MESSAGES = [
  { id:'m1', from:'a1', fromName:'María García',  to:'sup', toName:'Supervisor', text:'Buenos días, ¿puedo hacer un descuento del 10% a Roberto?', time: new Date(Date.now()-30*60000).toISOString(), read:false },
  { id:'m2', from:'a2', fromName:'Carlos Ruiz',   to:'sup', toName:'Supervisor', text:'Laura pide más información técnica, ¿me ayudas con la ficha?', time: new Date(Date.now()-2*3600000).toISOString(), read:true  },
  { id:'m3', from:'sup',fromName:'Supervisor',    to:'a3', toName:'Ana Jiménez',  text:'Ana, excelente trabajo este mes. Sigue así!', time: new Date(Date.now()-4*3600000).toISOString(), read:true  },
];

function dateStr(daysAhead) {
  const d = new Date(); d.setDate(d.getDate()+daysAhead);
  return d.toISOString().split('T')[0];
}
function timeAgo(d) {
  const s=(Date.now()-new Date(d))/1000;
  if(s<60) return 'ahora'; if(s<3600) return `hace ${Math.floor(s/60)}m`;
  if(s<86400) return `hace ${Math.floor(s/3600)}h`; return `hace ${Math.floor(s/86400)}d`;
}
function fmt(sec) { return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`; }

const CLS = {
  interested:{ label:'Interesado',    color:'#10b981', bg:'#d1fae5' },
  needs_info:{ label:'Necesita info', color:'#f59e0b', bg:'#fef3c7' },
  no_info:   { label:'Sin info',      color:'#ef4444', bg:'#fee2e2' },
};
const EVENT_TYPES = {
  cita:    { label:'Cita',       color:'#4f6ef7', Icon:Calendar },
  llamada: { label:'Llamada',    color:'#10b981', Icon:Phone    },
  video:   { label:'Videollamada',color:'#8b5cf6', Icon:Video   },
};
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTH_DATA = [3,5,4,7,6,8,5,9,11,8,12,10];

/* ─────────────────────────── UI COMPONENTS ─────────────────────────── */
function Card({ title, Icon, iconColor='#4f6ef7', children, action, noPad }) {
  return (
    <div style={{ background:CB, borderRadius:16, border:`1px solid ${DS.primary}18`, boxSizing:'border-box', overflow:'hidden' }}>
      {title && (
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ margin:0, fontSize:13, fontWeight:700, color:'#1e293b', display:'flex', alignItems:'center', gap:7 }}>
            <Icon size={14} color={iconColor}/> {title}
          </h3>
          {action}
        </div>
      )}
      <div style={{ padding: noPad ? 0 : 20 }}>{children}</div>
    </div>
  );
}

function Badge({ label, color, bg }) {
  return <span style={{ padding:'2px 9px', borderRadius:999, fontSize:11, fontWeight:700, color, background:bg }}>{label}</span>;
}

function ScoreBadge({ score }) {
  const c=score>=80?'#10b981':score>=50?'#f59e0b':'#ef4444';
  const b=score>=80?'#d1fae5':score>=50?'#fef3c7':'#fee2e2';
  return <Badge label={score} color={c} bg={b}/>;
}

function Btn({ children, onClick, color='#4f6ef7', bg='#eef2ff', icon: Icon, sm }) {
  return (
    <button onClick={onClick} style={{ padding:sm?'5px 9px':'9px 14px', borderRadius:8, border:'none', background:bg, color, fontWeight:700, fontSize:sm?11:13, cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
      {Icon && <Icon size={sm?11:13}/>}{children}
    </button>
  );
}

function BarMini({ data, labels, color='#4f6ef7' }) {
  const max=Math.max(...data)||1;
  return (
    <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:64 }}>
      {data.map((v,i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <div style={{ width:'100%', background:`${color}18`, borderRadius:4, height:52, display:'flex', alignItems:'flex-end' }}>
            <div style={{ width:'100%', background:color, borderRadius:4, height:`${(v/max)*100}%`, transition:'height 0.4s' }}/>
          </div>
          {labels && <div style={{ fontSize:7, color:'#9aa5be', fontWeight:600 }}>{labels[i]}</div>}
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB 1 — DASHBOARD
═══════════════════════════════════════════════════════════════════ */

// ── Canal Stats — Estadísticas por red social ─────────────────────────────
function CanalStatsCompleto({ leads = [], clients = [] }) {
  const total = leads.length || 1;

  const KEYS = ['whatsapp','facebook','instagram','tiktok','otro'];
  const canales = {};
  KEYS.forEach(k => { canales[k] = { leads:0, ventas:0, enProceso:0 }; });

  leads.forEach(l => {
    const c = (l.canal || l.origen || '').toLowerCase();
    const key = c.includes('facebook')||c.includes('fb') ? 'facebook'
              : c.includes('instagram')||c.includes('ig') ? 'instagram'
              : c.includes('tiktok')||c.includes('tik') ? 'tiktok'
              : c.includes('whatsapp')||c.includes('wa')||c.includes('bot') ? 'whatsapp'
              : 'otro';
    canales[key].leads++;
    // Buscar si ese lead tiene cliente ganado
    const clienteGanado = clients.find(cl =>
      (cl.phone === l.telefono || cl.phone === l.telefono) &&
      (cl.result === 'won' || cl.metadata?.result === 'won')
    );
    if (clienteGanado) canales[key].ventas++;
    else canales[key].enProceso++;
  });

  const CFG = [
    { key:'whatsapp',  label:'WhatsApp',  color:'#25D366', bg:'#f0fdf9',
      icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
    { key:'facebook',  label:'Facebook',  color:'#1877F2', bg:'#EBF5FF',
      icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    { key:'instagram', label:'Instagram', color:'#E1306C', bg:'#FEE8F0',
      icon:<svg viewBox="0 0 24 24" width="26" height="26"><defs><radialGradient id="igx" cx="30%" cy="107%"><stop offset="0%" stopColor="#fdf497"/><stop offset="45%" stopColor="#fd5949"/><stop offset="60%" stopColor="#d6249f"/><stop offset="90%" stopColor="#285AEB"/></radialGradient></defs><path fill="url(#igx)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
    { key:'tiktok',    label:'TikTok',    color:'#010101', bg:'#f0f0f0',
      icon:<svg viewBox="0 0 24 24" width="26" height="26"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="#010101"/></svg> },
  ];

  const activos = CFG.filter(c => canales[c.key].leads > 0);
  if (activos.length === 0) return (
    <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #eaecf0',marginBottom:20}}>
      <div style={{fontSize:12,fontWeight:800,color:'#1e293b',marginBottom:8}}>Canales de captacion</div>
      <div style={{fontSize:12,color:'#94a3b8',textAlign:'center',padding:'16px 0'}}>Sin leads registrados. Los canales apareceran cuando el bot reciba mensajes desde anuncios.</div>
    </div>
  );

  const topLeads  = [...activos].sort((a,b)=>canales[b.key].leads - canales[a.key].leads)[0];
  const topVentas = [...activos].sort((a,b)=>canales[b.key].ventas - canales[a.key].ventas)[0];

  return (
    <div style={{background:'#fff',borderRadius:16,padding:'20px',border:'1px solid #eaecf0',marginBottom:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Canales de captacion</div>
        <div style={{fontSize:11,color:'#94a3b8'}}>{leads.length} leads totales</div>
      </div>

      {/* Indicadores top */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        <div style={{background:topLeads.bg,borderRadius:10,padding:'10px 14px',border:`1px solid ${topLeads.color}25`}}>
          <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,marginBottom:4}}>MAS LEADS</div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {topLeads.icon}
            <div>
              <div style={{fontSize:13,fontWeight:800,color:topLeads.color}}>{topLeads.label}</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>{canales[topLeads.key].leads} leads ({Math.round((canales[topLeads.key].leads/total)*100)}%)</div>
            </div>
          </div>
        </div>
        {topVentas && canales[topVentas.key].ventas > 0 ? (
          <div style={{background:topVentas.bg,borderRadius:10,padding:'10px 14px',border:`1px solid ${topVentas.color}25`}}>
            <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,marginBottom:4}}>MAS VENTAS</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {topVentas.icon}
              <div>
                <div style={{fontSize:13,fontWeight:800,color:topVentas.color}}>{topVentas.label}</div>
                <div style={{fontSize:11,color:'#10b981',fontWeight:600}}>{canales[topVentas.key].ventas} ventas cerradas</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{background:'#f8fafc',borderRadius:10,padding:'10px 14px',border:'1px solid #e2e8f0'}}>
            <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,marginBottom:4}}>VENTAS POR CANAL</div>
            <div style={{fontSize:12,color:'#94a3b8'}}>Aun sin ventas cerradas registradas</div>
          </div>
        )}
      </div>

      {/* Cards por canal */}
      <div style={{display:'grid',gridTemplateColumns:`repeat(${activos.length},1fr)`,gap:10}}>
        {activos.sort((a,b)=>canales[b.key].leads-canales[a.key].leads).map((cfg,i)=>{
          const d = canales[cfg.key];
          const pct = Math.round((d.leads/total)*100);
          const convRate = d.leads > 0 ? Math.round((d.ventas/d.leads)*100) : 0;
          const isTop = cfg.key === topLeads.key;
          return(
            <div key={i} style={{background:cfg.bg,borderRadius:14,padding:'14px',border:`1.5px solid ${isTop?cfg.color+'50':cfg.color+'20'}`,
              boxShadow:isTop?`0 4px 16px ${cfg.color}20`:'none',position:'relative'}}>
              {isTop && <div style={{position:'absolute',top:8,right:8,background:cfg.color,color:'#fff',fontSize:9,fontWeight:800,padding:'2px 6px',borderRadius:999}}>TOP</div>}
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                {cfg.icon}
                <span style={{fontSize:12,fontWeight:800,color:'#1e293b'}}>{cfg.label}</span>
              </div>
              <div style={{fontSize:22,fontWeight:800,color:cfg.color,lineHeight:1}}>{d.leads}</div>
              <div style={{fontSize:11,color:'#94a3b8',marginBottom:8}}>leads · {pct}%</div>
              {d.ventas > 0 && (
                <div style={{fontSize:11,fontWeight:700,color:'#10b981',marginBottom:4}}>{d.ventas} ventas ({convRate}% conv.)</div>
              )}
              {d.ventas === 0 && d.leads > 0 && (
                <div style={{fontSize:10,color:'#f59e0b',fontWeight:600,marginBottom:4}}>Sin ventas aun</div>
              )}
              <div style={{background:`${cfg.color}20`,borderRadius:999,height:4,overflow:'hidden'}}>
                <div style={{width:`${pct}%`,height:'100%',background:cfg.color,borderRadius:999}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



function TabDashboard({ clients, asesores, events, leads, stats, onNavigate }) {
  const p = DS.primary;
  const nav = onNavigate || (() => {});
  const [hovCard, setHovCard] = React.useState(null);
  const [selectedAsesor, setSelectedAsesor] = React.useState(null);
  const [showAsesorDetail, setShowAsesorDetail] = React.useState(false);

  const won    = clients?.filter(c=>c.result==='won')  || [];
  const lost   = clients?.filter(c=>c.result==='lost') || [];
  const activo = clients?.filter(c=>!c.result)         || [];
  const sinContacto = clients?.filter(c=>(Date.now()-new Date(c.last_contact||c.created_at))/3600000>24&&!c.result)||[];
  const calientes = leads?.filter(l=>l.nivel==='caliente')||[];
  const totalC = clients?.length||0;
  const totalL = leads?.length||0;
  const metaEq = (asesores?.length||1)*10;
  const pct = Math.min(Math.round((won.length/metaEq)*100),100);
  const now = new Date();
  const proxEventos = events?.filter(e=>new Date(e.date)>=now).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,3)||[];

  // Per-asesor metrics
  const asesorStats = (asesores||[]).map(a=>{
    const mc=clients?.filter(c=>c.asesor===a.name||c.advisor_id===a.id)||[];
    const mw=mc.filter(c=>c.result==='won');
    const ml=leads?.filter(l=>l.asesor===a.name)||[];
    const sc=mc.filter(c=>(Date.now()-new Date(c.last_contact||c.created_at))/3600000>24&&!c.result);
    const tasa=mc.length?Math.round((mw.length/mc.length)*100):0;
    return{...a,clientes:mc.length,ganados:mw.length,leads:ml.length,sinContacto:sc.length,tasa};
  }).sort((a,b)=>b.ganados-a.ganados);

  const sel = asesorStats.find(a=>a.id===selectedAsesor||a.name===selectedAsesor);

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* Asesor detail modal */}
      {sel&&showAsesorDetail&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.45)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9000}}
          onClick={e=>{if(e.target===e.currentTarget){setShowAsesorDetail(false);setSelectedAsesor(null);}}}>
          <div style={{background:'#fff',borderRadius:20,padding:28,width:440,boxShadow:'0 24px 60px rgba(0,0,0,0.18)',border:'1px solid #eaecf0'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:46,height:46,borderRadius:'50%',background:`linear-gradient(135deg,${p},${p}cc)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'#fff',boxShadow:`0 4px 14px ${p}35`}}>{sel.name?.charAt(0)?.toUpperCase()}</div>
                <div><div style={{fontSize:16,fontWeight:800,color:'#1e293b'}}>{sel.name}</div><div style={{fontSize:11,color:'#94a3b8'}}>Asesor de ventas</div></div>
              </div>
              <button onClick={()=>{setShowAsesorDetail(false);setSelectedAsesor(null);}} style={{border:'none',background:'#f1f5f9',borderRadius:10,padding:8,cursor:'pointer',display:'flex'}}><X size={14} color="#64748b"/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:10,marginBottom:16}}>
              {[{l:'Clientes',v:sel.clientes,c:p},{l:'Ganados',v:sel.ganados,c:'#10b981'},{l:'Leads',v:sel.leads,c:'#6366f1'},{l:'Sin contacto',v:sel.sinContacto,c:'#ef4444'}].map((s,i)=>(
                <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:12,padding:'12px 8px',border:`1px solid ${s.c}15`}}>
                  <div style={{fontSize:22,fontWeight:800,color:s.c,lineHeight:1,marginBottom:3}}>{s.v}</div>
                  <div style={{fontSize:9,color:'#94a3b8'}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>Tasa de conversión</span>
                <span style={{fontSize:14,fontWeight:800,color:sel.tasa>=60?'#10b981':sel.tasa>=30?'#f59e0b':'#ef4444'}}>{sel.tasa}%</span>
              </div>
              <div style={{background:'#f1f5f9',borderRadius:999,height:8,overflow:'hidden'}}>
                <div style={{width:`${sel.tasa}%`,height:'100%',background:sel.tasa>=60?'#10b981':sel.tasa>=30?'#f59e0b':'#ef4444',borderRadius:999,transition:'width .6s ease'}}/>
              </div>
            </div>
            <div style={{padding:'12px 14px',background:'#f8fafc',borderRadius:12,fontSize:12,color:'#64748b',lineHeight:1.6}}>
              <b style={{color:'#1e293b'}}>Mi evaluación:</b> {sel.tasa>=60?'Rendimiento excelente. Mantén el ritmo y considera asignarle más leads calientes.':sel.tasa>=30?'Rendimiento aceptable. Trabaja en las técnicas de cierre con este asesor.':'Necesita apoyo urgente. Agenda una sesión de coaching esta semana.'}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{marginBottom:22}}>
        <div style={{fontSize:11,color:p,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:4}}>Supervisor</div>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:'#1e293b',letterSpacing:'-0.5px'}}>Mi Panel de Supervisión</h1>
        <p style={{margin:'5px 0 0',fontSize:13,color:'#94a3b8'}}>Monitorea tu equipo de {asesores?.length||0} asesores · {totalC} clientes asignados</p>
      </div>

      {/* Canales de captacion */}
      <CanalStatsCompleto leads={leads} clients={clients}/>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(5,1fr)',gap:12,marginBottom:20}}>
        {[
          {Icon:Users,     label:'Mis clientes',   value:totalC,         color:'#6366f1', sub:'total equipo',     nav:'clients'},
          {Icon:Trophy,    label:'Ganados',         value:won.length,     color:'#10b981', sub:`${pct}% de meta`,  nav:'clients'},
          {Icon:Activity,  label:'En proceso',      value:activo.length,  color:'#f59e0b', sub:'negociando',       nav:'clients'},
          {Icon:Flame,     label:'Leads calientes', value:calientes.length,color:'#ef4444',sub:'alta prioridad',   nav:'leads'},
          {Icon:AlertCircle,label:'Sin contacto',  value:sinContacto.length,color:'#94a3b8',sub:'+24h sin llamar',nav:'clients'},
        ].map((k,i)=>(
          <div key={i} onClick={()=>nav(k.nav)} style={{background:'#fff',borderRadius:14,padding:'17px',border:'1px solid #eaecf0',borderTop:`3px solid ${k.color}`,cursor:'pointer',transition:'all .2s',boxShadow:hovCard===i?`0 10px 28px ${k.color}20`:'0 1px 3px rgba(0,0,0,0.05)',transform:hovCard===i?'translateY(-3px)':''}}
            onMouseEnter={()=>setHovCard(i)} onMouseLeave={()=>setHovCard(null)}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${k.color}12`,border:`1px solid ${k.color}20`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <k.Icon size={16} color={k.color} strokeWidth={2}/>
              </div>
              <div style={{width:3,height:36,borderRadius:999,background:`linear-gradient(180deg,${k.color},${k.color}44)`}}/>
            </div>
            <div style={{fontSize:26,fontWeight:800,color:'#1e293b',lineHeight:1,marginBottom:3}}>{k.value}</div>
            <div style={{fontSize:11,fontWeight:700,color:'#1e293b',marginBottom:2}}>{k.label}</div>
            <div style={{fontSize:9,color:'#94a3b8'}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'1.3fr 1fr',gap:16}}>
        {/* Left: asesores table */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',borderLeft:`3px solid ${p}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <UserCheck size={14} color={p}/>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>Mis asesores</div>
                  <div style={{fontSize:11,color:'#94a3b8'}}>Haz clic para ver detalle del asesor</div>
                </div>
              </div>
              <button onClick={()=>nav('advisors')} style={{padding:'6px 14px',borderRadius:9,border:'none',background:`${p}10`,color:p,fontSize:11,fontWeight:700,cursor:'pointer',transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background=p;e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background=`${p}10`;e.currentTarget.style.color=p;}}>
                Ver equipo
              </button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 65px 65px 65px 75px 26px',gap:8,padding:'9px 20px',background:'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
              {['Asesor','Clientes','Ganados','Leads','Tasa',''].map((h,i)=>(
                <div key={i} style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:0.5,textAlign:i>0?'center':'left'}}>{h}</div>
              ))}
            </div>
            {asesorStats.length===0&&<div style={{padding:'24px',textAlign:'center',color:'#94a3b8',fontSize:13}}>Sin asesores en tu equipo</div>}
            {asesorStats.map((a,i)=>(
              <div key={a.id||i} style={{display:'grid',gridTemplateColumns:'1fr 65px 65px 65px 75px 26px',gap:8,padding:'12px 20px',borderBottom:'1px solid #f8fafc',alignItems:'center',transition:'background .15s',cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                onClick={()=>{setSelectedAsesor(a.id||a.name);setShowAsesorDetail(true);}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:30,height:30,borderRadius:'50%',background:`${p}15`,border:`2px solid ${p}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:p,flexShrink:0}}>{a.name?.charAt(0)?.toUpperCase()}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{a.name}</div>
                    {a.sinContacto>0&&<div style={{fontSize:9,color:'#ef4444',fontWeight:600}}>{a.sinContacto} sin contacto</div>}
                  </div>
                </div>
                <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#64748b'}}>{a.clientes}</div>
                <div style={{textAlign:'center',fontSize:13,fontWeight:800,color:'#10b981'}}>{a.ganados}</div>
                <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#6366f1'}}>{a.leads}</div>
                <div style={{textAlign:'center'}}>
                  <span style={{fontSize:11,fontWeight:800,padding:'2px 9px',borderRadius:999,color:a.tasa>=60?'#10b981':a.tasa>=30?'#f59e0b':'#ef4444',background:a.tasa>=60?'#f0fdf9':a.tasa>=30?'#fffbeb':'#fef2f2'}}>{a.tasa}%</span>
                </div>
                <ChevronRight size={13} color="#e2e8f0"/>
              </div>
            ))}
          </div>

          {/* Alerta sin contacto */}
          {sinContacto.length>0&&(
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #fecaca',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',overflow:'hidden'}}>
              <div style={{padding:'12px 18px',borderBottom:'1px solid #fecaca',borderLeft:'3px solid #ef4444',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:7}}><AlertCircle size={13} color="#ef4444"/><span style={{fontSize:13,fontWeight:800,color:'#dc2626'}}>Requieren seguimiento urgente</span></div>
                <span style={{background:'#ef4444',color:'#fff',borderRadius:999,padding:'2px 9px',fontSize:11,fontWeight:700}}>{sinContacto.length}</span>
              </div>
              <div style={{padding:'8px 14px'}}>
                {sinContacto.slice(0,4).map((c,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 4px',borderBottom:'1px solid #fef2f2',cursor:'pointer',transition:'background .15s',borderRadius:8}}
                    onMouseEnter={e=>e.currentTarget.style.background='#fef2f2'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                    onClick={()=>nav('clients')}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{c.name}</div>
                      <div style={{fontSize:10,color:'#94a3b8'}}>Asesor: {c.asesor||'Sin asignar'}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:10,color:'#ef4444',fontWeight:700}}>Sin contacto</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Meta del equipo */}
          <div style={{background:`linear-gradient(135deg,${p},${p}cc)`,borderRadius:16,padding:'20px',color:'#fff',position:'relative',overflow:'hidden',boxShadow:`0 8px 24px ${p}35`}}>
            <div style={{position:'absolute',top:-30,right:-30,width:110,height:110,borderRadius:'50%',background:'rgba(255,255,255,0.08)',pointerEvents:'none'}}/>
            <div style={{position:'relative'}}>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',fontWeight:700,marginBottom:4}}>Meta del equipo</div>
              <div style={{fontSize:32,fontWeight:800,marginBottom:4}}>{pct}%</div>
              <div style={{background:'rgba(255,255,255,0.2)',borderRadius:999,height:7,overflow:'hidden',marginBottom:8}}>
                <div style={{width:`${pct}%`,height:'100%',background:'#fff',borderRadius:999,transition:'width .7s ease'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(255,255,255,0.65)',marginBottom:14}}>
                <span>{won.length} ganadas</span><span>Meta: {metaEq} ventas</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[{l:'Tasa conv.',v:`${totalC?Math.round((won.length/totalC)*100):0}%`},{l:'En proceso',v:activo.length}].map((s,i)=>(
                  <div key={i} style={{background:'rgba(255,255,255,0.12)',borderRadius:10,padding:'10px',textAlign:'center'}}>
                    <div style={{fontSize:18,fontWeight:800}}>{s.v}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.65)',marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Próximos eventos */}
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
            <div style={{padding:'13px 18px',borderBottom:'1px solid #f1f5f9',borderLeft:'3px solid #8b5cf6',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:7}}><Calendar size={13} color="#8b5cf6"/><span style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Próximas citas</span></div>
              <button onClick={()=>nav('reports')} style={{padding:'5px 12px',borderRadius:8,border:'none',background:'#f5f3ff',color:'#8b5cf6',fontSize:11,fontWeight:700,cursor:'pointer',transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='#8b5cf6';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#f5f3ff';e.currentTarget.style.color='#8b5cf6';}}>Ver reportes</button>
            </div>
            <div style={{padding:'10px 16px'}}>
              {proxEventos.length===0&&<div style={{padding:'16px 0',textAlign:'center',color:'#94a3b8',fontSize:13}}>Sin citas próximas</div>}
              {proxEventos.map((e,i)=>(
                <div key={e.id||i} style={{display:'flex',gap:12,alignItems:'center',padding:'9px 0',borderBottom:'1px solid #f8fafc',cursor:'pointer',transition:'all .15s',borderRadius:8}}
                  onMouseEnter={ev=>ev.currentTarget.style.background='#f8fafc'} onMouseLeave={ev=>ev.currentTarget.style.background='transparent'}>
                  <div style={{width:36,height:36,borderRadius:10,background:'#f5f3ff',border:'1px solid #e9d5ff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <Calendar size={16} color="#8b5cf6"/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.client||e.cname||'Cita'}</div>
                    <div style={{fontSize:10,color:'#8b5cf6',fontWeight:600}}>{e.date} · {e.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones rápidas */}
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
            <div style={{padding:'12px 18px',borderBottom:'1px solid #f1f5f9',borderLeft:'3px solid #f59e0b',display:'flex',alignItems:'center',gap:7}}>
              <Zap size={13} color="#f59e0b"/><span style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Acciones rápidas</span>
            </div>
            <div style={{padding:'12px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                {Icon:Users,        l:'Mis asesores', c:p,         nav:'advisors'},
                {Icon:TrendingUp,   l:'Pipeline',     c:'#6366f1', nav:'pipeline'},
                {Icon:BarChart2,    l:'Ventas',       c:'#10b981', nav:'sales'},
                {Icon:MessageSquare,l:'Mensajes',     c:'#8b5cf6', nav:'messages'},
              ].map((a,i)=>(
                <button key={i} onClick={()=>nav(a.nav)} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:11,border:`1px solid ${a.c}15`,background:`${a.c}06`,cursor:'pointer',transition:'all .18s',textAlign:'left'}}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${a.c}14`;e.currentTarget.style.transform='translateY(-1px)';}} onMouseLeave={e=>{e.currentTarget.style.background=`${a.c}06`;e.currentTarget.style.transform='';}}>
                  <div style={{width:28,height:28,borderRadius:8,background:`${a.c}12`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><a.Icon size={13} color={a.c}/></div>
                  <span style={{fontSize:11,fontWeight:700,color:'#1e293b'}}>{a.l}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabClientes({ clients, setClients, asesores }) {
  const [search, setSearch]   = useState('');
  const [filterA, setFilterA] = useState('all');
  const [filterR, setFilterR] = useState('all');
  const [detail, setDetail]   = useState(null);

  const filtered = clients.filter(c=>{
    const ms = c.name.toLowerCase().includes(search.toLowerCase())||c.phone.includes(search);
    const ma = filterA==='all' || c.asesorId===filterA;
    const mr = filterR==='all'||(filterR==='proceso'&&!c.result)||(filterR==='won'&&c.result==='won')||(filterR==='lost'&&c.result==='lost');
    return ms&&ma&&mr;
  });

  return (
    <div style={{ display:'grid', gridTemplateColumns:MOB?'1fr':'1fr 290px', gap:20 }}>
      <div>
        {/* Filtros */}
        <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:200, position:'relative' }}>
            <Search size={13} color="#94a3b8" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)' }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente o teléfono..."
              style={{ width:'100%', padding:'9px 12px 9px 32px', border:'1px solid #cbd5e1', borderRadius:10, fontSize:13, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <select value={filterA} onChange={e=>setFilterA(e.target.value)} style={{ padding:'9px 12px', border:'1px solid #cbd5e1', borderRadius:10, fontSize:13, outline:'none', cursor:'pointer' }}>
            <option value="all">Todos los asesores</option>
            {(asesores||ASESORES).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={filterR} onChange={e=>setFilterR(e.target.value)} style={{ padding:'9px 12px', border:'1px solid #cbd5e1', borderRadius:10, fontSize:13, outline:'none', cursor:'pointer' }}>
            <option value="all">Todos los estados</option>
            <option value="proceso">En proceso</option>
            <option value="won">Ganados</option>
            <option value="lost">Perdidos</option>
          </select>
        </div>

        {/* Tabla */}
        <div style={{ background:CB, borderRadius:16, border:`1px solid ${DS.primary}18`, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f5f7fb' }}>
                {['Cliente','Teléfono','Asesor','Clasificación','Estado','Producto/Servicio','Acc.'].map(h=>(
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#9aa5be', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c=>{
                const cls=CLS[c.classification]||{};
                return (
                  <tr key={c.id} style={{ borderTop:'1px solid #e2e8f0', cursor:'pointer' }} onClick={()=>setDetail(c)}>
                    <td style={{ padding:'11px 14px' }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{c.name}</div>
                      <div style={{ fontSize:10, color:'#9aa5be' }}>{timeAgo(c.lastContact)}</div>
                    </td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:'#4a5568' }}>{c.phone}</td>
                    <td style={{ padding:'11px 14px', fontSize:12, fontWeight:600, color:'#4f6ef7' }}>{c.asesor ? c.asesor.split(' ')[0] : 'Sin asignar'}</td>
                    <td style={{ padding:'11px 14px' }}><Badge label={cls.label} color={cls.color} bg={cls.bg}/></td>
                    <td style={{ padding:'11px 14px' }}>
                      {c.result==='won'  && <span style={{ color:'#10b981', fontWeight:700, fontSize:12 }}> Ganado</span>}
                      {c.result==='lost' && <span style={{ color:'#ef4444', fontWeight:700, fontSize:12 }}> Perdido</span>}
                      {!c.result         && <span style={{ color:'#f59e0b', fontWeight:700, fontSize:12 }}>● Proceso</span>}
                    </td>
                    <td style={{ padding:'11px 14px', maxWidth:160 }}>
                      {(() => { const p = c.producto || c.metadata?.producto; return p
                        ? <span style={{ fontSize:11, fontWeight:700, color:'#1e40af', background:'#dbeafe', padding:'3px 9px', borderRadius:6, display:'inline-block', whiteSpace:'nowrap' }}>{p}</span>
                        : <span style={{ fontSize:11, color:'#9aa5be' }}>—</span>; })()}
                    </td>
                    <td style={{ padding:'11px 14px' }} onClick={e=>e.stopPropagation()}>
                      <Btn onClick={()=>setDetail(c)} color='#4f6ef7' bg="#eef2ff" icon={Eye} sm>Ver</Btn>
                    </td>
                  </tr>
                );
              })}
              {filtered.length===0 && <tr><td colSpan={7} style={{ padding:32, textAlign:'center', color:'#9aa5be', fontSize:13 }}>Sin resultados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card title="Resumen del equipo" Icon={BarChart2}>
          {(asesores||ASESORES).map(a=>{
            const ac=clients.filter(c=>c.asesorId===a.id);
            const won=ac.filter(c=>c.result==='won').length;
            const lost=ac.filter(c=>c.result==='lost').length;
            return (
              <div key={a.id} style={{ padding:'10px 0', borderBottom:'1px solid #e2e8f0' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>{a.name.split(' ')[0]}</div>
                  <ScoreBadge score={a.score}/>
                </div>
                <div style={{ fontSize:11, color:'#9aa5be' }}>{ac.length} clientes · <span style={{ color:'#10b981', fontWeight:700 }}>{won} ganados</span> · <span style={{ color:'#ef4444', fontWeight:700 }}>{lost} perdidos</span></div>
              </div>
            );
          })}
        </Card>

        <Card title="Clientes perdidos" Icon={XCircle} iconColor="#ef4444">
          {clients.filter(c=>c.result==='lost').map(c=>(
            <div key={c.id} style={{ padding:'9px 0', borderBottom:'1px solid #e2e8f0', cursor:'pointer' }} onClick={()=>setDetail(c)}>
              <div style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>{c.name}</div>
              <div style={{ fontSize:11, color:'#ef4444', fontWeight:600 }}>{c.asesor ? c.asesor.split(' ')[0] : 'Sin asignar'}</div>
              {c.lossReason && <div style={{ fontSize:10, color:'#9aa5be', fontStyle:'italic', marginTop:2 }}>"{c.lossReason.substring(0,40)}..."</div>}
            </div>
          ))}
        </Card>
      </div>

      {/* Modal detalle */}
      {detail && <ClientDetailModal client={detail} onClose={()=>setDetail(null)} setClients={setClients}/>}
    </div>
  );

}

function ClientDetailModal({ client, onClose, setClients }) {
  const cls = CLS[client.classification]||{};
  const [editing, setEditing] = React.useState(false);
  const [saving,  setSaving]  = React.useState(false);
  const [form, setForm] = React.useState({
    name:       client.name        || '',
    phone:      client.phone       || '',
    email:      client.email       || '',
    notes:      client.notes       || '',
    lossReason: client.lossReason  || '',
    producto:   client.producto || client.metadata?.producto || '',
  });

  async function guardar() {
    setSaving(true);
    try {
      await apiFetch('PUT', `/api/asesor/clients/${client.id}`, {
        name: form.name, phone: form.phone, email: form.email,
        notes: form.notes, lossReason: form.lossReason, producto: form.producto,
      });
      if (setClients) setClients(prev => prev.map(c => c.id === client.id ? { ...c, ...form } : c));
      setEditing(false);
    } catch(e) { alert('Error al guardar: ' + e.message); }
    setSaving(false);
  }

  function eliminar() {
    askConfirm(`¿Eliminar a ${client.name}? Esta acción no se puede deshacer.`, async () => {
      try {
        await apiFetch('DELETE', `/api/clients/${client.id}`);
        if (setClients) setClients(prev => prev.filter(c => c.id !== client.id));
        onClose();
      } catch(e) { alert('Error al eliminar: ' + e.message); }
    });
  }

  const inp = { width:'100%', padding:'9px 12px', border:'1px solid #cbd5e1', borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' };

  return (
    <div style={{ position:'fixed', inset:0, backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(8px)', background:'rgba(79,110,247,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'#ffffff', borderRadius:24, padding:32, width:520, maxHeight:'88vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h2 style={{ margin:'0 0 6px', fontSize:20, fontWeight:800, color:'#1e293b' }}>{client.name}</h2>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <Badge label={cls.label} color={cls.color} bg={cls.bg}/>
              <ScoreBadge score={client.score}/>
              {client.result==='won'  && <Badge label="Ganado"  color="#10b981" bg="#d1fae5"/>}
              {client.result==='lost' && <Badge label="Perdido" color="#ef4444" bg="#fee2e2"/>}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setEditing(!editing)} style={{ border:'none', background: editing ? '#4f6ef7' : '#f1f5f9', borderRadius:8, padding:'7px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:5, color: editing ? '#fff' : '#475569', fontSize:12, fontWeight:700 }}>
              <Edit2 size={13}/> {editing ? 'Cancelar' : 'Editar'}
            </button>
            <button onClick={onClose} style={{ border:'none', background:'rgba(79,110,247,0.10)', borderRadius:8, padding:'8px 10px', cursor:'pointer' }}><X size={16} color="#64748b"/></button>
          </div>
        </div>

        {/* Campos editables o de solo lectura */}
        {editing ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
            {[
              { label:'Nombre', key:'name', type:'text' },
              { label:'Teléfono', key:'phone', type:'tel' },
              { label:'Email', key:'email', type:'email' },
            ].map(f=>(
              <div key={f.key}>
                <div style={{ fontSize:10, color:'#9aa5be', fontWeight:700, marginBottom:4 }}>{f.label.toUpperCase()}</div>
                <input type={f.type} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={inp}/>
              </div>
            ))}
            <div>
              <div style={{ fontSize:10, color:'#9aa5be', fontWeight:700, marginBottom:4 }}>NOTAS</div>
              <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3} style={{...inp, resize:'none'}}/>
            </div>
            <div>
              <div style={{ fontSize:10, color:'#1d4ed8', fontWeight:700, marginBottom:4 }}>PRODUCTO / SERVICIO</div>
              <select value={form.producto} onChange={e=>setForm(p=>({...p,producto:e.target.value}))} style={inp}>
                <option value="">— Sin asignar —</option>
                <option value="Estrella">⭐ Estrella</option>
                <option value="Súper Estrella">⭐⭐ Súper Estrella</option>
                <option value="Mega Estrella">⭐⭐⭐ Mega Estrella</option>
                <option value="Contado">💵 Contado</option>
              </select>
            </div>
            {client.result==='lost' && (
              <div>
                <div style={{ fontSize:10, color:'#dc2626', fontWeight:700, marginBottom:4 }}>CONCEPTO (RAZÓN DE PÉRDIDA)</div>
                <textarea value={form.lossReason} onChange={e=>setForm(p=>({...p,lossReason:e.target.value}))} rows={2} placeholder="Describe por qué se perdió este cliente..." style={{...inp, resize:'none'}}/>
              </div>
            )}
            <button onClick={guardar} disabled={saving} style={{ padding:'11px', borderRadius:10, border:'none', background:'#4f6ef7', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              {saving ? 'Guardando...' : '✓ Guardar cambios'}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[
                { label:'ASESOR',          value: client.asesor || '—' },
                { label:'TELÉFONO',        value: client.phone },
                { label:'EMAIL',           value: client.email || '—' },
                { label:'ÚLTIMO CONTACTO', value: timeAgo(client.lastContact) },
              ].map((f,i)=>(
                <div key={i} style={{ background:'#f5f7fb', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:10, color:'#9aa5be', fontWeight:700, marginBottom:4 }}>{f.label}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#4a5568' }}>{f.value}</div>
                </div>
              ))}
            </div>
            {client.notes && (
              <div style={{ background:'#fef3c7', borderRadius:10, padding:'12px 14px', marginBottom:12, fontSize:13, color:'#92400e' }}>
                <b>Notas:</b> {client.notes}
              </div>
            )}
            {(client.producto || client.metadata?.producto) && (
              <div style={{ background:'#eff6ff', borderRadius:10, padding:'14px 16px', border:'1px solid #bfdbfe', marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Producto / Servicio</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#1e40af' }}>{client.producto || client.metadata?.producto}</div>
              </div>
            )}
            {client.result==='lost' && (
              <div style={{ background:'#fef2f2', borderRadius:10, padding:'14px 16px', border:'1px solid #fecaca', marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#dc2626', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Concepto (Razón de pérdida)</div>
                <div style={{ fontSize:13, color:'#7f1d1d', lineHeight:1.5 }}>
                  {client.lossReason || <span style={{ color:'#9aa5be', fontStyle:'italic' }}>No registrado</span>}
                </div>
              </div>
            )}
          </>
        )}

        {/* Acciones */}
        <div style={{ display:'flex', gap:10, marginTop:16 }}>
          <a href={`https://wa.me/${toWA(client.phone)}`} target="_blank" rel="noreferrer"
            style={{ flex:1, padding:'10px 0', borderRadius:10, background:'#f0fdf4', color:'#16a34a', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:6, textDecoration:'none' }}>
            <MessageCircle size={14}/> WhatsApp
          </a>
          <a href={`tel:${client.phone}`}
            style={{ flex:1, padding:'10px 0', borderRadius:10, background:'rgba(79,110,247,0.10)', color:'#4f6ef7', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:6, textDecoration:'none' }}>
            <Phone size={14}/> Llamar
          </a>
          <button onClick={eliminar}
            style={{ padding:'10px 14px', borderRadius:10, border:'none', background:'#fef2f2', color:'#ef4444', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            <Trash2 size={14}/> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB 3 — ASESORES
═══════════════════════════════════════════════════════════════════ */
function TabAsesores({ clients, asesores: asesoresReal, teamActivities=[], onNavigate, onSelectContact }) {
  const asesores = (asesoresReal && asesoresReal.length > 0) ? asesoresReal : ASESORES;
  const [expanded, setExpanded] = React.useState(null);
  const [msgModal, setMsgModal] = React.useState(null); // kept for compatibility

  return (
    <div style={{ display:'grid', gridTemplateColumns:MOB?'1fr':'1fr 290px', gap:20 }}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {asesores.map(a=>{
          const ac = clients.filter(c=>c.asesorId===a.id||c.assigned_advisor_id===a.id);
          const won  = ac.filter(c=>c.result==='won').length;
          const lost = ac.filter(c=>c.result==='lost').length;
          const inProc=ac.filter(c=>!c.result).length;
          const conv = ac.length?Math.round((won/ac.length)*100):0;
          const open = expanded===a.id;
          return (
            <div key={a.id} style={{ background:CB, borderRadius:16, border:`1px solid ${DS.primary}18`, overflow:'hidden' }}>
              {/* Header */}
              <div style={{ padding:'16px 20px', display:'flex', gap:14, alignItems:'center', cursor:'pointer' }} onClick={()=>setExpanded(open?null:a.id)}>
                <div style={{ width:46, height:46, borderRadius:'50%', background:'rgba(79,110,247,0.10)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'#4f6ef7', flexShrink:0 }}>{a.name.charAt(0)}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:15, fontWeight:800, color:'#1e293b' }}>{a.name}</span>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:a.active?'#10b981':'#94a3b8' }}/>
                    <span style={{ fontSize:11, color:a.active?'#10b981':'#94a3b8', fontWeight:600 }}>{a.active?'Online':'Offline'}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#9aa5be' }}>{a.email} · {ac.length} clientes</div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <ScoreBadge score={a.score}/>
                  <button onClick={e=>{e.stopPropagation(); if(onSelectContact) onSelectContact(a.id); if(onNavigate) onNavigate('messages');}} style={{ padding:'6px 10px', borderRadius:8, border:'none', background:'rgba(79,110,247,0.10)', cursor:'pointer', display:'flex', alignItems:'center', gap:5, color:'#4f6ef7', fontSize:12, fontWeight:700 }}><Send size={13}/> Mensaje</button>
                  {open ? <span style={{fontSize:16,color:'#9aa5be',fontWeight:700}}>▲</span> : <span style={{fontSize:16,color:'#9aa5be',fontWeight:700}}>▼</span>}
                </div>
              </div>

              {open && (
                <div style={{ padding:'0 20px 20px', borderTop:'1px solid #e2e8f0' }}>
                  {/* Stats */}
                  <div style={{ display:'grid', gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)', gap:10, margin:'14px 0' }}>
                    {[
                      { label:'Clientes',  value:ac.length,  color:'#4f6ef7' },
                      { label:'Ganados',   value:won,         color:'#10b981' },
                      { label:'Perdidos',  value:lost,        color:'#ef4444' },
                      { label:'Conversión',value:`${conv}%`,  color:'#8b5cf6' },
                    ].map((s,i)=>(
                      <div key={i} style={{ background:'#f5f7fb', borderRadius:10, padding:'12px', textAlign:'center' }}>
                        <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
                        <div style={{ fontSize:10, color:'#9aa5be' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Métricas adicionales */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                    <div style={{ background:'#f5f7fb', borderRadius:10, padding:'12px 14px' }}>
                      <div style={{ fontSize:11, color:'#9aa5be', fontWeight:700, marginBottom:4 }}>LLAMADAS TOTALES</div>
                      <div style={{ fontSize:18, fontWeight:800, color:'#4a5568' }}>{a.calls}</div>
                      <div style={{ fontSize:11, color:'#9aa5be' }}>Prom. {fmt(a.avgDur)} por llamada</div>
                    </div>
                    <div style={{ background:'#f5f7fb', borderRadius:10, padding:'12px 14px' }}>
                      <div style={{ fontSize:11, color:'#9aa5be', fontWeight:700, marginBottom:4 }}>RACHA</div>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:18, fontWeight:800, color:a.streak>0?'#d97706':'#94a3b8' }}>{a.streak}</span>
                        <span style={{ fontSize:12, color:'#9aa5be' }}>días activo</span>
                        {a.streak>=3 && <span style={{ fontSize:14 }}></span>}
                      </div>
                    </div>
                  </div>

                  {/* Clientes en proceso */}
                  {inProc > 0 && (
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#9aa5be', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Clientes activos</div>
                      {ac.filter(c=>!c.result).map(c=>{
                        const cls=CLS[c.classification]||{};
                        const lastAct=teamActivities.filter(x=>x.client_id===c.id||x.client_name===c.name).sort((x,y)=>new Date(y.created_at)-new Date(x.created_at))[0];
                        return (
                          <div key={c.id} style={{ padding:'9px 0', borderBottom:'1px solid #e2e8f0' }}>
                            <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom: (c.notes||lastAct?.notas)?4:0 }}>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>{c.name}</div>
                                <div style={{ fontSize:10, color:'#9aa5be' }}>{timeAgo(c.lastContact)}</div>
                              </div>
                              <Badge label={cls.label} color={cls.color} bg={cls.bg}/>
                              <ScoreBadge score={c.score}/>
                            </div>
                            {c.notes && (
                              <div style={{ fontSize:11, color:'#92400e', background:'#fef3c7', borderRadius:7, padding:'5px 9px', marginTop:3 }}>
                                <b>Nota:</b> {c.notes}
                              </div>
                            )}
                            {lastAct?.notas && (
                              <div style={{ fontSize:11, color:'#1e40af', background:'#eff6ff', borderRadius:7, padding:'5px 9px', marginTop:3 }}>
                                <b>{lastAct.type||'Actividad'}:</b> {lastAct.notas}
                                {lastAct.resultado && <span style={{color:'#4f6ef7',marginLeft:6}}>→ {lastAct.resultado}</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pérdidas con razón */}
                  {ac.filter(c=>c.result==='lost'&&c.lossReason).length>0 && (
                    <div style={{ marginTop:12 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#9aa5be', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Razones de pérdida</div>
                      {ac.filter(c=>c.result==='lost'&&c.lossReason).map(c=>(
                        <div key={c.id} style={{ background:'#fef2f2', borderRadius:8, padding:'9px 12px', marginBottom:6, border:'1px solid #fecaca' }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'#1e293b', marginBottom:3 }}>{c.name}</div>
                          <div style={{ fontSize:11, color:'#7f1d1d' }}>{c.lossReason}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card title="Performance general" Icon={BarChart2}>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[...asesores].sort((a,b)=>(b.score||0)-(a.score||0)).map((a,i)=>(
              <div key={a.id}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#4a5568' }}>{a.name.split(' ')[0]}</span>
                  <span style={{ fontSize:12, fontWeight:800, color:'#4f6ef7' }}>{a.score}</span>
                </div>
                <div style={{ background:'rgba(79,110,247,0.10)', borderRadius:999, height:7 }}>
                  <div style={{ width:`${a.score}%`, height:'100%', background:a.score>=80?'#10b981':a.score>=50?'#f59e0b':'#ef4444', borderRadius:999 }}/>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Acciones rápidas" Icon={Zap} iconColor="#10b981">
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <Btn color="#ef4444" bg="#fef2f2" icon={AlertCircle}>Reportar bajo rendimiento</Btn>
            <Btn color='#4f6ef7' bg="#eef2ff" icon={Download}>Exportar performance</Btn>
            <Btn color="#16a34a" bg="#f0fdf4" icon={MessageCircle}>Mensaje grupal</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MessageModal({ asesor, onClose }) {
  const [text,    setText]   = React.useState('');
  const [sending, setSending]= React.useState(false);
  const [sent,    setSent]   = React.useState(false);

  async function enviar() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await apiFetch('POST', '/api/supervisor/messages', { toId: asesor.id, texto: text.trim() });
      setSent(true);
      setTimeout(() => onClose(), 1200);
    } catch(e) { alert('Error: ' + e.message); }
    setSending(false);
  }

  return (
    <div style={{ position:'fixed', inset:0, backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(8px)', background:'rgba(79,110,247,0.3)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'#ffffff', borderRadius:20, padding:28, width:420, boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <h3 style={{ margin:'0 0 3px', fontSize:16, fontWeight:800, color:'#1e293b' }}>Mensaje interno</h3>
            <div style={{ fontSize:11, color:'#9aa5be' }}>Para: {asesor.name} · Asesor</div>
          </div>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer' }}><X size={18} color="#94a3b8"/></button>
        </div>
        {sent ? (
          <div style={{ textAlign:'center', padding:'20px 0', color:'#10b981', fontSize:14, fontWeight:700 }}>
            <CheckCircle size={32} color="#10b981" style={{ marginBottom:8 }}/><br/>
             Mensaje enviado correctamente
          </div>
        ) : (
          <>
            <textarea value={text} onChange={e=>setText(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); enviar(); }}}
              placeholder={`Escribe un mensaje para ${asesor.name.split(' ')[0]}... (Enter para enviar)`} rows={4}
              style={{ width:'100%', padding:'12px 14px', border:'1px solid #cbd5e1', borderRadius:10, fontSize:13, resize:'none', outline:'none', boxSizing:'border-box', marginBottom:14 }}/>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={onClose} style={{ flex:1, padding:'11px 0', borderRadius:10, border:'1px solid #cbd5e1', background:'#f5f7fb', color:'#9aa5be', fontWeight:700, fontSize:13, cursor:'pointer' }}>Cancelar</button>
              <button onClick={enviar} disabled={sending||!text.trim()} style={{ flex:2, padding:'11px 0', borderRadius:10, border:'none', background:sending||!text.trim()?'#a5b4fc':'#4f6ef7', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <Send size={14}/> {sending?'Enviando...':'Enviar mensaje'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB 4 — CALENDARIO
═══════════════════════════════════════════════════════════════════ */
function TabCalendario({ events, setEvents, asesores }) {
  const today = new Date();
  const [cur,    setCur]    = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sel,    setSel]    = useState(null);
  const [modal,  setModal]  = useState(false);
  const [editEv, setEditEv] = useState(null);
  const [form,   setForm]   = useState({ type:'cita', title:'', clientName:'', asesorId:'a1', date:'', time:'', description:'' });

  const y=cur.getFullYear(), m=cur.getMonth();
  const firstDay=new Date(y,m,1).getDay(), dim=new Date(y,m+1,0).getDate();
  const monthName=cur.toLocaleDateString('es-MX',{month:'long',year:'numeric'});

  const byDay={};
  events.forEach(e=>{
    const d=new Date(e.date);
    if(d.getFullYear()===y&&d.getMonth()===m){
      const k=d.getDate();
      if(!byDay[k])byDay[k]=[];
      byDay[k].push(e);
    }
  });

  const cells=[];
  for(let i=0;i<firstDay;i++)cells.push(null);
  for(let d=1;d<=dim;d++)cells.push(d);

  function openNew() {
    const dateVal = sel ? `${y}-${String(m+1).padStart(2,'0')}-${String(sel).padStart(2,'0')}` : dateStr(0);
    setForm({ type:'cita', title:'', clientName:'', asesorId:'a1', date:dateVal, time:'', description:'' });
    setEditEv(null);
    setModal(true);
  }

  function openEdit(e, ev) {
    ev.stopPropagation();
    setForm({ type:e.type, title:e.title, clientName:e.clientName, asesorId:e.asesorId, date:e.date, time:e.time, description:e.description||'' });
    setEditEv(e.id);
    setModal(true);
  }

  function saveEvent() {
    if(!form.title||!form.date||!form.time||!form.clientName){ alert('Completa título, cliente, fecha y hora'); return; }
  const asesor = (ASESORES||[]).find(a=>a.id===form.asesorId);
    if(editEv) {
      setEvents(prev=>prev.map(e=>e.id===editEv?{...e,...form,asesor:asesor?.name,clientId:null}:e));
    } else {
      setEvents(prev=>[...prev,{ id:'e'+Date.now(), ...form, asesor:asesor?.name, clientId:null, done:false }]);
    }
    setModal(false);
  }

  function toggleDone(id, ev) {
    ev.stopPropagation();
    setEvents(prev=>prev.map(e=>e.id===id?{...e,done:!e.done}:e));
  }

  function deleteEvent(id, ev) {
    ev.stopPropagation();
    askConfirm('Este evento será eliminado permanentemente.', ()=>setEvents(prev=>prev.filter(e=>e.id!==id)));
  }

  const upcoming = events.filter(e=>!e.done&&new Date(e.date)>=today).sort((a,b)=>new Date(a.date)-new Date(b.date));

  return (
    <div style={{ display:'grid', gridTemplateColumns:MOB?'1fr':'1fr 290px', gap:20 }}>
      {/* Columna izquierda */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Métricas */}
        <div style={{ display:'grid', gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(3,1fr)', gap:12 }}>
          {[
            { label:'Eventos este mes', value:events.filter(e=>{const d=new Date(e.date);return d.getMonth()===m&&d.getFullYear()===y;}).length, Icon:Calendar, color:'#4f6ef7' },
            { label:'Pendientes',       value:events.filter(e=>!e.done&&new Date(e.date)>=today).length, Icon:Clock,    color:'#f59e0b' },
            { label:'Completados',      value:events.filter(e=>e.done).length, Icon:CheckCircle, color:'#10b981' },
          ].map((s,i)=>(
            <div key={i} style={{ background:CB, borderRadius:12, padding:'14px 16px', border:`1px solid ${DS.primary}18`, display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:`${s.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><s.Icon size={17} color={s.color}/></div>
              <div><div style={{ fontSize:20, fontWeight:800, color:'#1e293b' }}>{s.value}</div><div style={{ fontSize:10, color:'#9aa5be', fontWeight:600 }}>{s.label}</div></div>
            </div>
          ))}
        </div>

        {/* Calendario */}
        <div style={{ background:CB, borderRadius:16, padding:22, border:`1px solid ${DS.primary}18` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <button onClick={()=>setCur(new Date(y,m-1,1))} style={{ border:'none', background:'rgba(79,110,247,0.10)', borderRadius:8, padding:'6px 10px', cursor:'pointer', display:'flex' }}><ChevronLeft size={16} color="#64748b"/></button>
            <span style={{ fontSize:14, fontWeight:700, color:'#1e293b', textTransform:'capitalize' }}>{monthName}</span>
            <button onClick={()=>setCur(new Date(y,m+1,1))} style={{ border:'none', background:'rgba(79,110,247,0.10)', borderRadius:8, padding:'6px 10px', cursor:'pointer', display:'flex' }}><ChevronRight size={16} color="#64748b"/></button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
            {['Do','Lu','Ma','Mi','Ju','Vi','Sá'].map(d=><div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'#9aa5be', padding:'4px 0' }}>{d}</div>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
            {cells.map((day,i)=>{
              const isToday=day===today.getDate()&&y===today.getFullYear()&&m===today.getMonth();
              const evts=day?(byDay[day]||[]):[];
              const isSel=sel===day;
              return (
                <div key={i} onClick={()=>day&&setSel(isSel?null:day)}
                  style={{ textAlign:'center', padding:'8px 2px', borderRadius:8, fontSize:13, fontWeight:isToday?800:400, background:isToday?DS.primary:isSel?'#eef2ff':'transparent', color:isToday?'#fff':day?'#374151':'transparent', cursor:day?'pointer':'default', position:'relative', border:isSel&&!isToday?'2px solid #6366f1':'2px solid transparent', minHeight:36 }}>
                  {day}
                  {evts.length>0&&!isToday&&<div style={{ position:'absolute', bottom:3, left:'50%', transform:'translateX(-50%)', display:'flex', gap:1 }}>
                    {evts.slice(0,3).map((_,ei)=><div key={ei} style={{ width:4, height:4, borderRadius:'50%', background:'#4f6ef7' }}/>)}
                  </div>}
                </div>
              );
            })}
          </div>

          {sel && (byDay[sel]?.length??0) > 0 && (
            <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#9aa5be', marginBottom:10, textTransform:'uppercase' }}>
                {sel} de {cur.toLocaleDateString('es-MX',{month:'long'})}
              </div>
              {byDay[sel].map(e=>{
                const cfg=EVENT_TYPES[e.type]||EVENT_TYPES.cita;
                return (
                  <div key={e.id} style={{ display:'flex', gap:10, padding:'10px 0', borderBottom:'1px solid #e2e8f0', alignItems:'flex-start' }}>
                    <div style={{ width:34, height:34, borderRadius:8, background:e.done?'#f1f5f9':`${cfg.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><cfg.Icon size={15} color={e.done?'#94a3b8':cfg.color}/></div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:e.done?'#94a3b8':'#0f172a', textDecoration:e.done?'line-through':'none' }}>{e.title}</div>
                      <div style={{ fontSize:11, color:'#9aa5be' }}>{e.asesor} · {e.clientName} · {e.time}</div>
                      {e.description && <div style={{ fontSize:11, color:'#9aa5be', fontStyle:'italic', marginTop:2 }}>"{e.description}"</div>}
                    </div>
                    <div style={{ display:'flex', gap:5 }}>
                      <button onClick={ev=>toggleDone(e.id,ev)} style={{ padding:'5px 7px', borderRadius:6, border:'none', background:e.done?'#d1fae5':'#f1f5f9', cursor:'pointer', display:'flex' }}><CheckCircle size={12} color={e.done?'#10b981':'#94a3b8'}/></button>
                      <button onClick={ev=>openEdit(e,ev)} style={{ padding:'5px 7px', borderRadius:6, border:'none', background:'rgba(79,110,247,0.10)', cursor:'pointer', display:'flex' }}><Edit2 size={12} color='#4f6ef7'/></button>
                      <button onClick={ev=>deleteEvent(e.id,ev)} style={{ padding:'5px 7px', borderRadius:6, border:'none', background:'#fef2f2', cursor:'pointer', display:'flex' }}><Trash2 size={12} color="#ef4444"/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <button onClick={openNew} style={{ padding:'12px 0', borderRadius:12, border:'none', background:'#4f6ef7', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}><Plus size={16}/> Nuevo evento</button>

        <Card title="Próximos eventos" Icon={Bell} iconColor='#4f6ef7'>
          {upcoming.length===0
            ? <div style={{ color:'#9aa5be', fontSize:12, textAlign:'center', padding:'12px 0' }}>Sin eventos próximos</div>
            : upcoming.slice(0,6).map(e=>{
                const cfg=EVENT_TYPES[e.type]||EVENT_TYPES.cita;
                return (
                  <div key={e.id} style={{ display:'flex', gap:10, padding:'9px 0', borderBottom:'1px solid #e2e8f0' }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:`${cfg.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><cfg.Icon size={13} color={cfg.color}/></div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>{e.title}</div>
                      <div style={{ fontSize:11, color:'#9aa5be' }}>{e.asesor?.split(' ')[0]} · {e.clientName}</div>
                      <div style={{ fontSize:11, color:cfg.color, fontWeight:700 }}>{new Date(e.date).toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'})} · {e.time}</div>
                      {e.description && <div style={{ fontSize:10, color:'#9aa5be', fontStyle:'italic' }}>"{e.description.substring(0,40)}{e.description.length>40?'...':''}"</div>}
                    </div>
                  </div>
                );
              })
          }
        </Card>

        <Card title="Por asesor" Icon={UserCheck}>
          {(asesores||ASESORES).map(a=>{
            const cnt=events.filter(e=>e.asesorId===a.id&&!e.done&&new Date(e.date)>=today).length;
            return (
              <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #e2e8f0' }}>
                <span style={{ fontSize:12, fontWeight:600, color:'#4a5568' }}>{a.name.split(' ')[0]}</span>
                <span style={{ fontSize:12, fontWeight:800, color:cnt>0?DS.primary:'#94a3b8' }}>{cnt} pendientes</span>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Modal nuevo/editar evento */}
      {modal && (
        <div style={{ position:'fixed', inset:0, backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(8px)', background:'rgba(79,110,247,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
          <div style={{ background:'#ffffff', borderRadius:24, padding:32, width:460, boxShadow:'0 24px 64px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:800, color:'#1e293b' }}>{editEv?'Editar evento':'Nuevo evento'}</h3>
              <button onClick={()=>setModal(false)} style={{ border:'none', background:'none', cursor:'pointer' }}><X size={18} color="#94a3b8"/></button>
            </div>

            {/* Tipo */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
              {Object.entries(EVENT_TYPES).map(([k,v])=>(
                <button key={k} onClick={()=>setForm(p=>({...p,type:k}))} style={{ padding:'10px 0', borderRadius:10, border:form.type===k?`2px solid ${v.color}`:'2px solid #e2e8f0', background:form.type===k?`${v.color}15`:'#fafafa', color:form.type===k?v.color:'#9aa5be', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <v.Icon size={14}/> {v.label}
                </button>
              ))}
            </div>

            <div style={{ display:'grid', gap:10, marginBottom:14 }}>
              <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Título del evento *"
                style={{ padding:'10px 14px', border:'1px solid #cbd5e1', borderRadius:10, fontSize:13, outline:'none' }}/>
              <input value={form.clientName} onChange={e=>setForm(p=>({...p,clientName:e.target.value}))} placeholder="Nombre del cliente *"
                style={{ padding:'10px 14px', border:'1px solid #cbd5e1', borderRadius:10, fontSize:13, outline:'none' }}/>
              <select value={form.asesorId} onChange={e=>setForm(p=>({...p,asesorId:e.target.value}))} style={{ padding:'10px 14px', border:'1px solid #cbd5e1', borderRadius:10, fontSize:13, outline:'none', cursor:'pointer' }}>
                {(asesores||ASESORES).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={{ padding:'10px 14px', border:'1px solid #cbd5e1', borderRadius:10, fontSize:13, outline:'none' }}/>
                <input type="time" value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} style={{ padding:'10px 14px', border:'1px solid #cbd5e1', borderRadius:10, fontSize:13, outline:'none' }}/>
              </div>
              <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Descripción del evento (¿de qué trata?)" rows={3}
                style={{ padding:'10px 14px', border:'1px solid #cbd5e1', borderRadius:10, fontSize:13, resize:'none', outline:'none' }}/>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <Btn onClick={()=>setModal(false)} color="#64748b" bg="#f1f5f9" icon={X}>Cancelar</Btn>
              <button onClick={saveEvent} style={{ flex:1, padding:'11px 0', borderRadius:10, border:'none', background:'#4f6ef7', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}><CheckCircle size={14}/> {editEv?'Guardar cambios':'Crear evento'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB 5 — MENSAJES (supervisor ↔ asesores + admin)
═══════════════════════════════════════════════════════════════════ */
function TabMensajes({ users, initialContact }) {
  const [messages,  setMessages]  = useState([]);
  const [activeTo,  setActiveTo]  = useState(initialContact||null);
  const [activeRole,setActiveRole]= useState(null);
  const [text,      setText]      = useState('');
  const [loading,   setLoading]   = useState(true);
  const endRef = useRef(null);

  // Construir lista de contactos: admins + asesores
  const admins   = (users||[]).filter(u=>u.role==='admin');
  const asesores = (users||[]).filter(u=>u.role==='advisor'||u.role==='asesor');
  const contactos = [
    ...admins.map(u=>({...u, tipo:'admin',    etiqueta:'Administrador'})),
    ...asesores.map(u=>({...u, tipo:'asesor', etiqueta:'Asesor'})),
  ];

  useEffect(()=>{
    if(initialContact) {
      setActiveTo(initialContact);
    } else if(contactos.length>0 && !activeTo) {
      setActiveTo(contactos[0].id);
      setActiveRole(contactos[0].role);
    }
  },[contactos.length, initialContact]);

  useEffect(()=>{
    setLoading(true);
    apiFetch('GET','/api/supervisor/messages')
      .then(r=>{ setMessages(Array.isArray(r)?r:[]); })
      .catch(()=>setMessages([]))
      .finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}); },[messages, activeTo]);

  async function send() {
    if(!text.trim()||!activeTo) return;
    try {
      const r = await apiFetch('POST','/api/supervisor/messages',{ toId:activeTo, texto:text.trim() });
      setMessages(p=>[...p,r]);
      setText('');
    } catch(e) { alert(e.message); }
  }

  const conv = messages.filter(m=>(m.to_id===activeTo)||(m.from_id===activeTo)).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const contactoActivo = contactos.find(c=>c.id===activeTo);

  return (
    <div style={{ display:MOB?'block':'grid', gridTemplateColumns:'260px 1fr', gap:0, background:CB, borderRadius:16, border:`1px solid ${DS.primary}18`, overflow:'hidden', minHeight:520 }}>
      {/* Lista contactos */}
      {(!MOB || !activeTo) && <div style={{ borderRight:'1px solid rgba(79,110,247,0.08)', overflowY:'auto', maxHeight:MOB?240:'none' }}>
        <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid #e2e8f0', fontSize:13, fontWeight:700, color:'#1e293b' }}>Conversaciones</div>
        <div style={{ padding:'6px 14px', background:'#fef3c7', fontSize:10, color:'#92400e', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
          <Eye size={10}/> Visible para el administrador
        </div>
        {/* Admins primero */}
        {admins.length>0&&<div style={{ padding:'6px 14px 4px', fontSize:9, color:'#9aa5be', fontWeight:800, textTransform:'uppercase', letterSpacing:0.5 }}>Administrador</div>}
        {admins.map(c=>{
          const unread=messages.filter(m=>m.from_id===c.id&&m.to_id!==c.id&&!m.leido).length;
          const last=[...messages].filter(m=>m.from_id===c.id||m.to_id===c.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
          return(
            <div key={c.id} onClick={()=>{setActiveTo(c.id);setActiveRole(c.role);}} style={{ padding:'11px 16px',display:'flex',gap:10,alignItems:'center',cursor:'pointer',background:activeTo===c.id?'#fef3c7':'transparent',borderBottom:'1px solid #e2e8f0' }}>
              <div style={{ width:36,height:36,borderRadius:'50%',background:'#fef3c7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#d97706',flexShrink:0 }}>{(c.name||'A').charAt(0)}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:'flex',justifyContent:'space-between' }}>
                  <span style={{ fontSize:12,fontWeight:700,color:'#1e293b' }}>{c.name.split(' ')[0]}</span>
                  {last&&<span style={{ fontSize:9,color:'#9aa5be' }}>{new Date(last.created_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</span>}
                </div>
                <div style={{ fontSize:10,color:'#d97706',fontWeight:600 }}>Administrador</div>
              </div>
              {unread>0&&<div style={{ width:18,height:18,borderRadius:'50%',background:'#f59e0b',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff',flexShrink:0 }}>{unread}</div>}
            </div>
          );
        })}
        {/* Asesores */}
        {asesores.length>0&&<div style={{ padding:'8px 14px 4px', fontSize:9, color:'#9aa5be', fontWeight:800, textTransform:'uppercase', letterSpacing:0.5 }}>Asesores</div>}
        {asesores.map(c=>{
          const unread=messages.filter(m=>m.from_id===c.id&&!m.leido).length;
          const last=[...messages].filter(m=>m.from_id===c.id||m.to_id===c.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
          return(
            <div key={c.id} onClick={()=>{setActiveTo(c.id);setActiveRole(c.role);}} style={{ padding:'11px 16px',display:'flex',gap:10,alignItems:'center',cursor:'pointer',background:activeTo===c.id?'rgba(79,110,247,0.18)':'transparent',borderBottom:'1px solid #e2e8f0' }}>
              <div style={{ position:'relative',flexShrink:0 }}>
                <div style={{ width:36,height:36,borderRadius:'50%',background:'rgba(79,110,247,0.10)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#4f6ef7' }}>{(c.name||'A').charAt(0)}</div>
                <div style={{ position:'absolute',bottom:0,right:0,width:9,height:9,borderRadius:'50%',background:c.status==='active'?'#10b981':'#94a3b8',border:'2px solid #fff' }}/>
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:'flex',justifyContent:'space-between' }}>
                  <span style={{ fontSize:12,fontWeight:700,color:'#1e293b' }}>{c.name.split(' ')[0]}</span>
                  {last&&<span style={{ fontSize:9,color:'#9aa5be' }}>{new Date(last.created_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</span>}
                </div>
                <div style={{ fontSize:10,color:'#9aa5be',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{last?.texto||'Sin mensajes'}</div>
              </div>
              {unread>0&&<div style={{ width:18,height:18,borderRadius:'50%',background:'#4f6ef7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff',flexShrink:0 }}>{unread}</div>}
            </div>
          );
        })}
        {contactos.length===0&&<div style={{ padding:20,textAlign:'center',color:'#9aa5be',fontSize:12 }}>Sin contactos disponibles</div>}
      </div>}

      {/* Área de chat */}
      {(!MOB || activeTo) && <div style={{ display:'flex',flexDirection:'column' }}>
        {MOB && activeTo && <button onClick={()=>setActiveTo(null)} style={{ margin:'10px 14px 0',padding:'8px 14px',background:'none',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,cursor:'pointer',textAlign:'left',color:'#4f6ef7',fontWeight:600 }}>← Volver</button>}
        {contactoActivo?(
          <div style={{ padding:'12px 18px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:10,background:'#f5f7fb' }}>
            <div style={{ width:36,height:36,borderRadius:'50%',background:contactoActivo.tipo==='admin'?'#fef3c7':'#eef2ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:contactoActivo.tipo==='admin'?'#d97706':'#4f6ef7' }}>{(contactoActivo.name||'A').charAt(0)}</div>
            <div>
              <div style={{ fontSize:14,fontWeight:700,color:'#1e293b' }}>{contactoActivo.name}</div>
              <div style={{ fontSize:11,color:'#9aa5be',fontWeight:600 }}>{contactoActivo.tipo==='admin'?'Administrador':'Asesor'}</div>
            </div>
          </div>
        ):(
          <div style={{ padding:'12px 18px',borderBottom:'1px solid #e2e8f0',background:'#f5f7fb',color:'#9aa5be',fontSize:12 }}>Selecciona un contacto</div>
        )}

        <div style={{ flex:1,overflowY:'auto',padding:'14px 18px',display:'flex',flexDirection:'column',gap:10,minHeight:280 }}>
          {loading&&<div style={{ textAlign:'center',color:'#9aa5be',fontSize:12,marginTop:40 }}>Cargando mensajes...</div>}
          {!loading&&conv.length===0&&<div style={{ color:'#9aa5be',fontSize:12,textAlign:'center',marginTop:40 }}>Sin mensajes. ¡Inicia la conversación!</div>}
          {conv.map(msg=>{
            const mine = !msg.to_id || msg.from_role==='supervisor';
            return(
              <div key={msg.id} style={{ display:'flex',justifyContent:mine?'flex-end':'flex-start' }}>
                <div style={{ maxWidth:'70%',padding:'10px 14px',borderRadius:mine?'14px 14px 4px 14px':'14px 14px 14px 4px',background:mine?DS.primary:'#f1f5f9',color:mine?'#fff':'#374151',fontSize:13,lineHeight:1.5 }}>
                  {!mine&&<div style={{ fontSize:10,fontWeight:700,color:'#4f6ef7',marginBottom:3 }}>{msg.from_name}</div>}
                  <div>{msg.texto}</div>
                  <div style={{ fontSize:10,marginTop:4,opacity:0.7,textAlign:'right' }}>{new Date(msg.created_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef}/>
        </div>

        <div style={{ padding:'10px 16px',borderTop:'1px solid #e2e8f0',display:'flex',gap:10,alignItems:'flex-end' }}>
          <textarea value={text} onChange={e=>setText(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder={contactoActivo?`Escribe a ${contactoActivo.name.split(' ')[0]}... (Enter para enviar)`:'Selecciona un contacto'}
            disabled={!activeTo} rows={2}
            style={{ flex:1,padding:'9px 13px',border:'1px solid #cbd5e1',borderRadius:10,fontSize:13,resize:'none',outline:'none',background:!activeTo?'#f8fafc':'#fff' }}/>
          <button onClick={send} disabled={!activeTo||!text.trim()} style={{ padding:'12px 16px',borderRadius:10,border:'none',background:!activeTo||!text.trim()?'#f1f5f9':'#4f6ef7',color:!activeTo||!text.trim()?'#94a3b8':'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontWeight:700 }}>
            <Send size={14}/> Enviar
          </button>
        </div>
      </div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB VENTAS — mensual/semanal/anual con descarga CSV
═══════════════════════════════════════════════════════════════════ */
const VENTAS_DATA = {
  Ene:{v:3,p:1,m:54000}, Feb:{v:5,p:2,m:90000}, Mar:{v:4,p:1,m:72000},
  Abr:{v:7,p:3,m:126000},May:{v:6,p:2,m:108000},Jun:{v:8,p:2,m:144000},
  Jul:{v:5,p:3,m:90000}, Ago:{v:9,p:1,m:162000},Sep:{v:11,p:2,m:198000},
  Oct:{v:8,p:4,m:144000},Nov:{v:12,p:2,m:216000},Dic:{v:10,p:3,m:180000},
};
const MLIST = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const fmtMXN = n => '$'+Number(n).toLocaleString('es-MX');

function TabVentas({ clients, asesores: asesoresProp }) {
  const p = DS.primary;
  const asesores = asesoresProp || [];
  const [showMetaModal,  setShowMetaModal]  = useState(false);
  const [editTarget,     setEditTarget]     = useState(null);
  const [showGlobalEdit, setShowGlobalEdit] = useState(false);
  const [globalInput,    setGlobalInput]    = useState('');
  const [showNotif,      setShowNotif]      = useState(null);

  const [metas, setMetas] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('crm_metas_sup') || '{}'); } catch { return {}; }
  });
  const [metaGlobal, setMetaGlobal] = React.useState(() => {
    try { return parseInt(localStorage.getItem('crm_meta_global_sup')) || null; } catch { return null; }
  });

  const saveMeta = (key,val)=>{
    const updated={...metas,[key]:parseInt(val)||10};
    setMetas(updated);
    localStorage.setItem('crm_metas_sup',JSON.stringify(updated));
    setShowMetaModal(false);
    setShowNotif('✅ Meta actualizada');
    setTimeout(()=>setShowNotif(null),2500);
  };
  const saveGlobal = (val)=>{
    const n=parseInt(val)||0;
    setMetaGlobal(n);
    localStorage.setItem('crm_meta_global_sup',String(n));
    setShowGlobalEdit(false);
    setShowNotif('✅ Meta global guardada');
    setTimeout(()=>setShowNotif(null),2500);
  };

  const won  = clients?.filter(c=>c.result==='won') ||[];
  const lost = clients?.filter(c=>c.result==='lost')||[];
  const totalMeta = metaGlobal ||
    asesores.reduce((s,a)=>s+(metas[a.id||a.name]||10),0)||
    asesores.length*10||10;
  const pctMeta = Math.min(Math.round((won.length/totalMeta)*100),100);
  const ingresos = won.length*3200;
  const fmtMXN = n=>'$'+Number(n).toLocaleString('es-MX');
  const mesNombre=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][new Date().getMonth()];

  const asesorData = asesores.map(a=>{
    const key=a.id||a.name;
    const mc=clients?.filter(c=>c.asesor===a.name||c.advisor_id===a.id)||[];
    const mw=mc.filter(c=>c.result==='won');
    const metaA=metas[key]||10;
    const pctA=Math.min(Math.round((mw.length/metaA)*100),100);
    return{...a,key,ganados:mw.length,perdidos:mc.filter(c=>c.result==='lost').length,
      clientes:mc.length,meta:metaA,pctMeta:pctA,
      tasa:mc.length?Math.round((mw.length/mc.length)*100):0};
  }).sort((a,b)=>b.ganados-a.ganados);

  const card={background:'#fff',borderRadius:16,border:'1px solid #eaecf0',
    boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'};

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>

      {showNotif&&(
        <div style={{position:'fixed',top:20,right:24,zIndex:99999,
          background:'#1e293b',color:'#fff',borderRadius:12,padding:'12px 20px',
          boxShadow:'0 8px 24px rgba(0,0,0,0.2)',fontSize:13,fontWeight:600,
          display:'flex',alignItems:'center',gap:8}}>{showNotif}</div>
      )}

      {/* Meta modal */}
      {showMetaModal&&editTarget&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',
          backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}
          onClick={e=>{if(e.target===e.currentTarget)setShowMetaModal(false);}}>
          <div style={{background:'#fff',borderRadius:22,padding:30,width:420,
            boxShadow:'0 24px 60px rgba(0,0,0,0.2)',border:'1px solid #eaecf0'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
              <div style={{width:46,height:46,borderRadius:'50%',background:`${p}15`,
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:p}}>
                {editTarget.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:'#1e293b'}}>Meta de {editTarget.name}</div>
                <div style={{fontSize:12,color:'#94a3b8'}}>{mesNombre} {new Date().getFullYear()}</div>
              </div>
              <button onClick={()=>setShowMetaModal(false)} style={{marginLeft:'auto',
                border:'none',background:'#f1f5f9',borderRadius:10,padding:8,cursor:'pointer',display:'flex'}}
                onMouseEnter={e=>e.currentTarget.style.background='#e2e8f0'}
                onMouseLeave={e=>e.currentTarget.style.background='#f1f5f9'}>
                <X size={14} color="#64748b"/>
              </button>
            </div>
            <div style={{background:`${p}08`,borderRadius:12,padding:'12px 14px',marginBottom:14,border:`1px solid ${p}15`}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>Progreso actual</span>
                <span style={{fontSize:13,fontWeight:800,color:p}}>{editTarget.ganados}/{editTarget.meta}</span>
              </div>
              <div style={{background:'rgba(255,255,255,0.6)',borderRadius:999,height:7,overflow:'hidden'}}>
                <div style={{width:`${editTarget.pctMeta}%`,height:'100%',
                  background:editTarget.pctMeta>=80?'#10b981':editTarget.pctMeta>=50?p:'#f59e0b',
                  borderRadius:999}}/>
              </div>
            </div>
            <input type="number" min="1" max="200" defaultValue={editTarget.meta}
              id={`meta-sup-${editTarget.key}`}
              style={{width:'100%',padding:'14px',border:'2px solid #e2e8f0',borderRadius:12,
                fontSize:28,fontWeight:800,textAlign:'center',color:'#1e293b',outline:'none',
                boxSizing:'border-box',marginBottom:12,transition:'border .2s'}}
              onFocus={e=>e.target.style.borderColor=p}
              onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
              {[5,8,10,12,15,20].map(n=>(
                <button key={n} onClick={()=>{document.getElementById(`meta-sup-${editTarget.key}`).value=n;}}
                  style={{padding:'5px 12px',borderRadius:8,border:`1.5px solid ${p}20`,
                    background:`${p}08`,color:p,fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.background=p;e.currentTarget.style.color='#fff';}}
                  onMouseLeave={e=>{e.currentTarget.style.background=`${p}08`;e.currentTarget.style.color=p;}}>
                {n}
              </button>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <button onClick={()=>setShowMetaModal(false)}
              style={{padding:'12px',borderRadius:12,border:'1.5px solid #e2e8f0',
                background:'#f8fafc',color:'#64748b',fontWeight:700,fontSize:13,cursor:'pointer'}}
              onMouseEnter={e=>e.currentTarget.style.background='#e2e8f0'}
              onMouseLeave={e=>e.currentTarget.style.background='#f8fafc'}>Cancelar</button>
            <button onClick={()=>saveMeta(editTarget.key,document.getElementById(`meta-sup-${editTarget.key}`).value)}
              style={{padding:'12px',borderRadius:12,border:'none',
                background:`linear-gradient(135deg,${p},${p}cc)`,color:'#fff',
                fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:`0 4px 14px ${p}35`,transition:'all .2s'}}
              onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
              onMouseLeave={e=>e.currentTarget.style.transform=''}>Guardar meta</button>
          </div>
        </div>
      </div>
      )}

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:22}}>
        <div>
          <div style={{fontSize:11,color:p,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:4}}>Supervisor · Ventas</div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:'#1e293b',letterSpacing:'-0.5px'}}>Ventas del Equipo</h1>
          <p style={{margin:'5px 0 0',fontSize:13,color:'#94a3b8'}}>{mesNombre} · {asesores.length} asesores</p>
        </div>
        <button onClick={()=>{setGlobalInput(String(totalMeta));setShowGlobalEdit(true);}}
          style={{padding:'9px 18px',borderRadius:11,border:`1.5px solid ${p}30`,
            background:`${p}08`,color:p,fontSize:12,fontWeight:700,cursor:'pointer',
            display:'flex',alignItems:'center',gap:6,transition:'all .2s'}}
          onMouseEnter={e=>{e.currentTarget.style.background=p;e.currentTarget.style.color='#fff';}}
          onMouseLeave={e=>{e.currentTarget.style.background=`${p}08`;e.currentTarget.style.color=p;}}>
          <Star size={13}/> Meta del equipo
        </button>
      </div>

      {/* Global meta banner */}
      {showGlobalEdit&&(
        <div style={{background:`linear-gradient(135deg,${p},${p}dd)`,borderRadius:16,
          padding:'20px 24px',marginBottom:20,color:'#fff',
          display:'flex',alignItems:'center',gap:16,boxShadow:`0 8px 24px ${p}35`}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:800,marginBottom:4}}>Meta total del equipo — {mesNombre}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.7)'}}>O asigna metas individuales a cada asesor en la tabla de abajo.</div>
          </div>
          <input type="number" value={globalInput} onChange={e=>setGlobalInput(e.target.value)}
            style={{width:90,padding:'10px',border:'2px solid rgba(255,255,255,0.4)',
              borderRadius:10,fontSize:22,fontWeight:800,textAlign:'center',
              background:'rgba(255,255,255,0.15)',color:'#fff',outline:'none',boxSizing:'border-box'}}/>
          <button onClick={()=>saveGlobal(globalInput)}
            style={{padding:'10px 20px',borderRadius:10,border:'none',
              background:'rgba(255,255,255,0.25)',color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.35)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.25)'}>Guardar</button>
          <button onClick={()=>setShowGlobalEdit(false)}
            style={{padding:'10px 16px',borderRadius:10,border:'1.5px solid rgba(255,255,255,0.3)',
              background:'transparent',color:'rgba(255,255,255,0.7)',fontWeight:700,fontSize:13,cursor:'pointer'}}>Cancelar</button>
        </div>
      )}

      {/* KPIs con META card destacada */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'1.2fr 1fr 1fr 1fr',gap:14,marginBottom:20}}>
        {/* META card */}
        <div style={{background:`linear-gradient(135deg,${p},${p}cc)`,borderRadius:16,
          padding:'20px',color:'#fff',position:'relative',overflow:'hidden',
          boxShadow:`0 8px 28px ${p}35`,cursor:'pointer',transition:'all .2s'}}
          onClick={()=>setShowGlobalEdit(!showGlobalEdit)}
          onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 14px 36px ${p}45`;}}
          onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 8px 28px ${p}35`;}}>
          <div style={{position:'absolute',top:-30,right:-30,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,0.1)',pointerEvents:'none'}}/>
          <div style={{position:'relative'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div style={{width:38,height:38,borderRadius:10,background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}><Target size={18} color="#fff"/></div>
              <span style={{fontSize:9,color:'rgba(255,255,255,0.7)',background:'rgba(255,255,255,0.15)',borderRadius:999,padding:'2px 8px',fontWeight:700}}>Editar</span>
            </div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.75)',fontWeight:700,marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>Meta del mes</div>
            <div style={{fontSize:36,fontWeight:900,lineHeight:1,marginBottom:3}}>{totalMeta}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',marginBottom:10}}>ventas objetivo</div>
            <div style={{background:'rgba(255,255,255,0.2)',borderRadius:999,height:7,overflow:'hidden',marginBottom:5}}>
              <div style={{width:`${pctMeta}%`,height:'100%',background:'#fff',borderRadius:999,transition:'width .8s ease'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(255,255,255,0.7)'}}>
              <span>{won.length} logradas</span><span>{pctMeta}%</span>
            </div>
          </div>
        </div>
        {[
          {Icon:Trophy,    l:'Ventas cerradas',  v:won.length,         c:'#10b981',sub:'mi equipo'},
          {Icon:DollarSign,l:'Ingresos est.',     v:fmtMXN(ingresos),  c:'#f59e0b',sub:'generados',sm:true},
          {Icon:BarChart2, l:'Conversión',        v:`${clients?.length?Math.round((won.length/clients.length)*100):0}%`,c:'#8b5cf6',sub:'tasa del equipo'},
        ].map((k,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:16,padding:'18px',border:'1px solid #eaecf0',borderTop:`3px solid ${k.c}`,boxShadow:'0 1px 3px rgba(0,0,0,0.05)',transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 24px ${k.c}18`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)';}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
              <div style={{width:38,height:38,borderRadius:10,background:`${k.c}12`,border:`1px solid ${k.c}20`,display:'flex',alignItems:'center',justifyContent:'center'}}><k.Icon size={17} color={k.c} strokeWidth={2}/></div>
              <div style={{width:3,height:38,borderRadius:999,background:`linear-gradient(180deg,${k.c},${k.c}44)`}}/>
            </div>
            <div style={{fontSize:k.sm?16:26,fontWeight:800,color:'#1e293b',lineHeight:1,marginBottom:3}}>{k.v}</div>
            <div style={{fontSize:11,fontWeight:700,color:'#1e293b',marginBottom:2}}>{k.l}</div>
            <div style={{fontSize:10,color:'#94a3b8'}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabla metas individuales */}
      <div style={card}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',borderLeft:`3px solid ${p}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <UserCheck size={14} color={p}/>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>Metas individuales de mis asesores</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>Haz clic en "Meta" para editar la meta de cada asesor</div>
            </div>
          </div>
          <div style={{fontSize:11,color:'#94a3b8'}}>Meta total: <b style={{color:p}}>{totalMeta}</b> · Logrado: <b style={{color:'#10b981'}}>{won.length}</b></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 70px 70px 70px 150px 80px',gap:10,padding:'10px 20px',background:'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
          {['Asesor','Clientes','Ganados','Tasa','Progreso meta','Acción'].map((h,i)=>(
            <div key={i} style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:0.5,textAlign:i>0?'center':'left'}}>{h}</div>
          ))}
        </div>
        {asesorData.length===0&&<div style={{padding:'24px',textAlign:'center',color:'#94a3b8',fontSize:13}}>Sin asesores en tu equipo</div>}
        {asesorData.map((a,i)=>(
          <div key={a.key||i}
            style={{display:'grid',gridTemplateColumns:'1fr 70px 70px 70px 150px 80px',gap:10,padding:'13px 20px',borderBottom:'1px solid #f8fafc',alignItems:'center',transition:'background .15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div style={{display:'flex',alignItems:'center',gap:9}}>
              <div style={{width:34,height:34,borderRadius:'50%',background:`${p}15`,border:`2px solid ${p}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:p,flexShrink:0}}>{a.name?.charAt(0)?.toUpperCase()}</div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{a.name}</div>
                <div style={{fontSize:10,color:'#94a3b8'}}>Meta: {a.meta} ventas</div>
              </div>
            </div>
            <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#64748b'}}>{a.clientes}</div>
            <div style={{textAlign:'center',fontSize:14,fontWeight:800,color:'#10b981'}}>{a.ganados}</div>
            <div style={{textAlign:'center'}}>
              <span style={{fontSize:11,fontWeight:800,padding:'3px 9px',borderRadius:999,
                color:a.tasa>=60?'#10b981':a.tasa>=30?'#f59e0b':'#ef4444',
                background:a.tasa>=60?'#f0fdf9':a.tasa>=30?'#fffbeb':'#fef2f2'}}>{a.tasa}%</span>
            </div>
            <div style={{padding:'0 2px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontSize:10,color:'#94a3b8'}}>{a.ganados}/{a.meta}</span>
                <span style={{fontSize:10,fontWeight:800,color:a.pctMeta>=80?'#10b981':a.pctMeta>=50?p:'#f59e0b'}}>{a.pctMeta}%</span>
              </div>
              <div style={{background:'#f1f5f9',borderRadius:999,height:7,overflow:'hidden'}}>
                <div style={{width:`${a.pctMeta}%`,height:'100%',
                  background:a.pctMeta>=80?'#10b981':a.pctMeta>=50?p:'#f59e0b',
                  borderRadius:999,transition:'width .5s ease'}}/>
              </div>
              {a.pctMeta>=100&&<div style={{fontSize:9,color:'#10b981',fontWeight:700,marginTop:2,textAlign:'center'}}>¡Meta cumplida!</div>}
            </div>
            <div style={{textAlign:'center'}}>
              <button onClick={()=>{setEditTarget(a);setShowMetaModal(true);}}
                style={{padding:'6px 12px',borderRadius:8,border:`1.5px solid ${p}30`,
                  background:`${p}08`,color:p,fontSize:11,fontWeight:700,cursor:'pointer',
                  display:'inline-flex',alignItems:'center',gap:4,transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background=p;e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor=p;}}
                onMouseLeave={e=>{e.currentTarget.style.background=`${p}08`;e.currentTarget.style.color=p;e.currentTarget.style.borderColor=`${p}30`;}}>
                <Star size={10}/> Meta
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabReportes({ clients }) {
  const [range, setRange] = useState('month');

  const ganados = clients.filter(c=>c.result==='won').length;
  const perdidos= clients.filter(c=>c.result==='lost').length;
  const total   = clients.length;
  const conv    = total?Math.round((ganados/total)*100):0;

  const lossReasons = clients.filter(c=>c.result==='lost'&&c.lossReason).map(c=>c.lossReason);
  const reasonCounts = {};
  lossReasons.forEach(r=>{ reasonCounts[r]=(reasonCounts[r]||0)+1; });

  function exportCSV() {
    const rows = [
      ['Nombre','Teléfono','Email','Asesor','Clasificación','Estado','Razón de pérdida'],
      ...clients.map(c=>[c.name,c.phone,c.email||'',c.asesor,c.classification,c.result||'proceso',c.lossReason||''])
    ];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download='reporte_clientes.csv'; a.click();
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header acciones */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', gap:8 }}>
          {['week','month','quarter','year'].map(r=>(
            <button key={r} onClick={()=>setRange(r)} style={{ padding:'7px 14px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', background:range===r?DS.primary:'#f1f5f9', color:range===r?'#fff':'#64748b' }}>
              {{week:'Esta semana',month:'Este mes',quarter:'Trimestre',year:'Año'}[r]}
            </button>
          ))}
        </div>
        <button onClick={exportCSV} style={{ padding:'9px 16px', borderRadius:10, border:'none', background:'#10b981', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}><Download size={14}/> Exportar CSV</button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(5,1fr)', gap:14 }}>
        {[
          { Icon:Users,     label:'Total clientes',     value:total,   color:'#4f6ef7' },
          { Icon:Trophy,    label:'Ganados',             value:ganados, color:'#10b981' },
          { Icon:XCircle,   label:'Perdidos',            value:perdidos,color:'#ef4444' },
          { Icon:BarChart2, label:'Tasa de conversión',  value:`${conv}%`,color:'#8b5cf6' },
          { Icon:Clock,     label:'Tiempo prom. llamada',value:'3:54',  color:'#f59e0b' },
        ].map((s,i)=>(
          <div key={i} style={{ background:CB, borderRadius:16, padding:'16px 18px', border:`1px solid ${DS.primary}18`, borderTop:`3px solid ${s.color}` }}>
            <s.Icon size={20} color={s.color} strokeWidth={1.8}/>
            <div style={{ fontSize:26, fontWeight:800, color:'#1e293b', marginTop:8 }}>{s.value}</div>
            <div style={{ fontSize:11, color:'#9aa5be', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div style={{ display:'grid', gridTemplateColumns:MOB?'1fr':'1.6fr 1fr', gap:16 }}>
        <Card title="Ventas mensuales del equipo" Icon={TrendingUp} action={<span style={{ fontSize:11, color:'#9aa5be' }}>2025</span>}>
          <BarMini data={MONTH_DATA} labels={MONTHS} color='#4f6ef7'/>
          <div style={{ marginTop:12, display:'grid', gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)', gap:8 }}>
            {[
              { l:'Total acumulado', v:MONTH_DATA.reduce((a,b)=>a+b,0), c:'#4f6ef7' },
              { l:'Mejor mes',       v:Math.max(...MONTH_DATA),          c:'#10b981' },
              { l:'Promedio',        v:Math.round(MONTH_DATA.reduce((a,b)=>a+b,0)/12), c:'#f59e0b' },
              { l:'Tendencia',       v:'↑ +15%',                         c:'#8b5cf6' },
            ].map((s,i)=>(
              <div key={i} style={{ background:'#f5f7fb', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:800, color:s.c }}>{s.v}</div>
                <div style={{ fontSize:10, color:'#9aa5be' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Razones de pérdida" Icon={XCircle} iconColor="#ef4444">
          {Object.entries(reasonCounts).length===0
            ? <div style={{ color:'#9aa5be', fontSize:12, textAlign:'center', padding:'20px 0' }}>Sin razones registradas</div>
            : Object.entries(reasonCounts).map(([reason,count],i)=>(
              <div key={i} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12, fontWeight:600, color:'#4a5568' }}>
                  <span style={{ flex:1, marginRight:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{reason}</span>
                  <span style={{ color:'#ef4444', fontWeight:800 }}>{count}</span>
                </div>
                <div style={{ background:'#fee2e2', borderRadius:999, height:7 }}>
                  <div style={{ width:`${(count/perdidos)*100}%`, height:'100%', background:'#ef4444', borderRadius:999 }}/>
                </div>
              </div>
            ))
          }
        </Card>
      </div>

      {/* Performance por asesor */}
      <Card title="Performance completo por asesor" Icon={Activity} noPad
        action={<button onClick={exportCSV} style={{ fontSize:11, color:'#4f6ef7', fontWeight:700, border:'none', background:'rgba(79,110,247,0.10)', borderRadius:6, padding:'4px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}><Download size={11}/> Exportar</button>}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f5f7fb' }}>
              {['Asesor','Clientes','Ganados','Perdidos','Conv.%','Llamadas','Prom. dur.','Racha','Score'].map(h=>(
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#9aa5be', textTransform:'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...ASESORES].sort((a,b)=>b.score-a.score).map(a=>{
              const ac=clients.filter(c=>c.asesorId===a.id);
              const conv=ac.length?Math.round((ac.filter(c=>c.result==='won').length/ac.length)*100):0;
              return (
                <tr key={a.id} style={{ borderTop:'1px solid #e2e8f0' }}>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:a.active?'#10b981':'#94a3b8' }}/>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{a.name}</div>
                        <div style={{ fontSize:10, color:'#9aa5be' }}>{a.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:13, fontWeight:600, color:'#4a5568', textAlign:'center' }}>{a.clients}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, fontWeight:700, color:'#10b981', textAlign:'center' }}>{a.won}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, fontWeight:700, color:'#ef4444', textAlign:'center' }}>{a.lost}</td>
                  <td style={{ padding:'12px 14px', textAlign:'center' }}>
                    <span style={{ fontSize:12, fontWeight:800, color:conv>=50?'#10b981':'#ef4444' }}>{conv}%</span>
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'#4a5568', textAlign:'center' }}>{a.calls}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'#4f6ef7', fontWeight:600, textAlign:'center' }}>{fmt(a.avgDur)}</td>
                  <td style={{ padding:'12px 14px', textAlign:'center' }}>
                    {a.streak>0
                      ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:3, fontSize:12, fontWeight:700, color:'#d97706' }}>{a.streak}d </span>
                      : <span style={{ fontSize:12, color:'#9aa5be' }}>—</span>}
                  </td>
                  <td style={{ padding:'12px 14px', textAlign:'center' }}><ScoreBadge score={a.score}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════════════════════
   TAB LEADS — Supervisor (Kanban + reasignar asesor)
═══════════════════════════════════════════════════════════════════ */
function TabLeads({ leads, setLeads, asesores: asesoresReal, onRefresh }) {
  const p = DS.primary;
  const dragRef = useRef(null);
  const [detail, setDetail] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const asesoresList = asesoresReal?.map(a=>a.name)||['Sin asignar'];

  function onDragStart(e,id){ dragRef.current=id; e.dataTransfer.effectAllowed='move'; e.currentTarget.style.opacity='0.5'; }
  function onDragEnd(e){ e.currentTarget.style.opacity='1'; }
  function onDragOver(e,nivel){ e.preventDefault(); setDragOver(nivel); }
  function onDragLeave(){ setDragOver(null); }
  function onDrop(e,nivel){ e.preventDefault(); setDragOver(null); const id=dragRef.current; if(!id)return; dragRef.current=null; setLeads(prev=>prev.map(l=>l.id===id?{...l,nivel}:l)); apiFetch('PUT',`/api/supervisor/leads/${id}`,{nivel}).catch(console.error); }
  function reasignar(id,asesor){ setLeads(prev=>prev.map(l=>l.id===id?{...l,asesor}:l)); }
  function del(id){ askConfirm('Este lead será eliminado permanentemente.',async()=>{ try{ await apiFetch('DELETE',`/api/supervisor/leads/${id}`); setLeads(prev=>prev.filter(l=>l.id!==id)); }catch(e){alert('Error al eliminar: '+e.message);} }); }

  const COLS={
    caliente:{label:'¡A cerrar!',sub:'¡Actúa ya — están listos!',color:'#10b981',light:'#f0fdf9',border:'#a7f3d0',acc:'#059669',Icon:CheckCircle},
    tibio:   {label:'En seguimiento',sub:'Sigue el contacto',color:'#f59e0b',light:'#fefce8',border:'#fde68a',acc:'#d97706',Icon:Clock},
    frio:    {label:'¡Rescátalos!',sub:'No los abandones',color:'#ef4444',light:'#fff1f2',border:'#fecaca',acc:'#dc2626',Icon:Zap},
  };
  const total=leads.length||1;

  return(
    <>
      {detail&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9000}}
          onClick={e=>{if(e.target===e.currentTarget)setDetail(null);}}>
          <div style={{background:'#fff',borderRadius:20,padding:28,width:500,maxHeight:'88vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.2)',border:'1px solid #eaecf0'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
              <div>
                <h2 style={{margin:'0 0 6px',fontSize:20,fontWeight:800,color:'#1e293b'}}>{detail.nombre}</h2>
                <span style={{padding:'3px 12px',borderRadius:999,fontSize:12,fontWeight:700,color:COLS[detail.nivel]?.acc,background:COLS[detail.nivel]?.light,border:`1px solid ${COLS[detail.nivel]?.border}`}}>{COLS[detail.nivel]?.label}</span>
              </div>
              <button onClick={()=>setDetail(null)} style={{border:'none',background:'#f1f5f9',borderRadius:10,padding:8,cursor:'pointer',display:'flex'}}
                onMouseEnter={e=>e.currentTarget.style.background='#e2e8f0'} onMouseLeave={e=>e.currentTarget.style.background='#f1f5f9'}><X size={14} color="#64748b"/></button>
            </div>
            <div style={{background:'#f8fafc',borderRadius:12,padding:'14px 16px',marginBottom:14,border:'1px solid #eaecf0'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:12,fontWeight:700,color:'#64748b'}}>Score</span>
                <span style={{fontSize:15,fontWeight:800,color:detail.score>=70?'#10b981':detail.score>=40?'#f59e0b':'#ef4444'}}>{detail.score}/100</span>
              </div>
              <div style={{background:'#e2e8f0',borderRadius:999,height:8,overflow:'hidden'}}><div style={{width:`${detail.score}%`,height:'100%',background:detail.score>=70?'#10b981':detail.score>=40?'#f59e0b':'#ef4444',borderRadius:999,transition:'width .6s ease'}}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {[{l:'TELÉFONO',v:detail.telefono},{l:'CÉDULA',v:detail.cedula||'—'},{l:'ASESOR',v:detail.asesor||'Sin asignar'},{l:'ORIGEN',v:detail.origen||'Bot'},{l:'RECIBIDO',v:ago(detail.fecha)}].map((fi,i)=>(
                <div key={i} style={{background:'#f8fafc',borderRadius:10,padding:'10px 14px',border:'1px solid #eaecf0'}}>
                  <div style={{fontSize:9,color:'#94a3b8',fontWeight:700,marginBottom:3}}>{fi.l}</div>
                  <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{fi.v}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#f0fdf9',borderRadius:12,padding:'12px 14px',border:'1px solid #a7f3d0',marginBottom:14}}>
              <div style={{fontSize:9,color:'#059669',fontWeight:700,marginBottom:5}}>MENSAJE DEL BOT</div>
              <div style={{fontSize:12,color:'#065f46',fontStyle:'italic'}}>"{detail.msgBot||'—'}"</div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,color:'#94a3b8',fontWeight:700,display:'block',marginBottom:5}}>REASIGNAR ASESOR</label>
              <select value={detail.asesor||''} onChange={e=>{reasignar(detail.id,e.target.value);setDetail(d=>({...d,asesor:e.target.value}));}}
                style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',cursor:'pointer',fontFamily:'inherit'}}>
                {asesoresList.map(a=><option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>window.open(`https://wa.me/${toWA(detail.telefono)}?text=Hola%20${encodeURIComponent(detail.nombre)}`,'_blank')} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#f0fdf9',color:'#059669',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5,transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='#059669';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#f0fdf9';e.currentTarget.style.color='#059669';}}><MessageCircle size={13}/> WhatsApp</button>
              <button onClick={()=>{setDetail(null);del(detail.id);}} style={{padding:'10px 16px',borderRadius:10,border:'none',background:'#fef2f2',color:'#ef4444',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:4,transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='#ef4444';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#fef2f2';e.currentTarget.style.color='#ef4444';}}><Trash2 size={13}/></button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <div style={{fontSize:11,color:p,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:3}}>Bot Leads</div>
          <h2 style={{margin:0,fontSize:22,fontWeight:800,color:'#1e293b'}}>Leads del WhatsApp Bot</h2>
          <p style={{margin:'4px 0 0',fontSize:12,color:'#94a3b8'}}>Gestiona y reasigna leads entre tus asesores</p>
        </div>
      </div>

      {/* KPI */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[
          {l:'Total leads', c:p,        v:leads.length,                                Icon:Users},
          {l:'¡A cerrar!',c:'#10b981',v:leads.filter(l=>l.nivel==='caliente').length,Icon:CheckCircle},
          {l:'En seguimiento',c:'#f59e0b',v:leads.filter(l=>l.nivel==='tibio').length,Icon:Clock},
          {l:'¡Rescatar!',  c:'#ef4444',v:leads.filter(l=>l.nivel==='frio').length,    Icon:Zap},
        ].map((s,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:14,padding:'18px 20px',border:'1px solid #eaecf0',borderTop:`3px solid ${s.c}`,boxShadow:'0 1px 3px rgba(0,0,0,0.05)',display:'flex',gap:12,alignItems:'center',transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 24px ${s.c}18`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)';}}>
            <div style={{width:42,height:42,borderRadius:12,background:`${s.c}12`,border:`1px solid ${s.c}20`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><s.Icon size={18} color={s.c} strokeWidth={2}/></div>
            <div>
              <div style={{fontSize:28,fontWeight:800,color:'#1e293b',letterSpacing:'-0.5px',lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:11,color:'#94a3b8',marginTop:3,display:'flex',alignItems:'center',gap:4}}>{s.l}</div>
              <div style={{fontSize:10,color:s.c,fontWeight:700,marginTop:2}}>{Math.round((s.v/total)*100)}% del total</div>
            </div>
          </div>
        ))}
      </div>

      {/* KANBAN */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'repeat(3,1fr)',gap:16}}>
        {Object.entries(COLS).map(([nivel,col])=>{
          const colLeads=leads.filter(l=>l.nivel===nivel).sort((a,b)=>b.score-a.score);
          const isTarget=dragOver===nivel;
          return(
            <div key={nivel} onDragOver={e=>onDragOver(e,nivel)} onDragLeave={onDragLeave} onDrop={e=>onDrop(e,nivel)}
              style={{background:isTarget?col.light:'#f8fafc',borderRadius:16,border:`2px ${isTarget?'dashed':'solid'} ${isTarget?col.acc:col.border}`,minHeight:380,display:'flex',flexDirection:'column',transition:'all .2s',boxShadow:isTarget?`0 0 0 3px ${col.acc}20`:'none'}}>
              <div style={{padding:'14px 16px',borderBottom:`1px solid ${col.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:col.acc,display:'flex',alignItems:'center',gap:6}}>{col.Icon&&<col.Icon size={14} color={col.acc}/>}{col.label}</div>
                  <div style={{fontSize:10,color:col.acc,opacity:.7,marginTop:2}}>{col.sub}</div>
                </div>
                <div style={{width:26,height:26,borderRadius:'50%',background:col.acc,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff'}}>{colLeads.length}</div>
              </div>
              <div style={{flex:1,padding:'10px',display:'flex',flexDirection:'column',gap:10}}>
                {colLeads.length===0&&<div style={{textAlign:'center',padding:'28px 0',color:col.acc,opacity:.35,fontSize:12,fontWeight:600}}>Arrastra leads aquí</div>}
                {colLeads.map(lead=>(
                  <div key={lead.id} draggable onDragStart={e=>onDragStart(e,lead.id)} onDragEnd={onDragEnd}
                    style={{background:'#fff',borderRadius:12,padding:'13px 14px',border:`1px solid ${col.border}`,cursor:'grab',transition:'all .2s',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}
                    onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 6px 20px ${col.acc}20`;e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.borderColor=col.acc;}}
                    onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)';e.currentTarget.style.transform='';e.currentTarget.style.borderColor=col.border;}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:7}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:800,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lead.nombre}</div>
                        <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{lead.telefono}</div>
                      </div>
                      <button onClick={e=>{e.stopPropagation();del(lead.id);}} style={{border:'none',background:'#fef2f2',borderRadius:7,padding:'4px 6px',cursor:'pointer',display:'flex',marginLeft:6,transition:'all .15s'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#ef4444'} onMouseLeave={e=>e.currentTarget.style.background='#fef2f2'}><Trash2 size={10} color="#ef4444"/></button>
                    </div>
                    {lead.asesor&&<div style={{fontSize:10,color:p,background:`${p}10`,borderRadius:6,padding:'3px 8px',display:'inline-block',marginBottom:7,fontWeight:600}}>{lead.asesor}</div>}
                    <div style={{fontSize:10,color:'#64748b',lineHeight:1.5,marginBottom:8,fontStyle:'italic',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',background:'#f8fafc',borderRadius:8,padding:'6px 9px'}}>"{lead.msgBot||'—'}"</div>
                    <div style={{marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                        <span style={{fontSize:9,color:'#94a3b8',fontWeight:700}}>SCORE</span>
                        <span style={{fontSize:10,fontWeight:800,color:lead.score>=70?'#10b981':lead.score>=40?'#f59e0b':'#ef4444'}}>{lead.score}%</span>
                      </div>
                      <div style={{background:'#f1f5f9',borderRadius:999,height:5,overflow:'hidden'}}><div style={{width:`${lead.score}%`,height:'100%',background:lead.score>=70?'#10b981':lead.score>=40?'#f59e0b':'#ef4444',borderRadius:999}}/></div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:9,color:'#94a3b8',background:'#f1f5f9',borderRadius:999,padding:'2px 8px'}}>{ago(lead.fecha)}</span>
                      <div style={{display:'flex',gap:5}}>
                        <button onClick={e=>{e.stopPropagation();setDetail(lead);}} style={{border:'none',background:col.light,borderRadius:7,padding:'4px 10px',cursor:'pointer',fontSize:10,fontWeight:700,color:col.acc,display:'flex',alignItems:'center',gap:3,transition:'all .15s'}}
                          onMouseEnter={e=>{e.currentTarget.style.background=col.acc;e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background=col.light;e.currentTarget.style.color=col.acc;}}><Eye size={9}/> Ver</button>
                        <button onClick={e=>{e.stopPropagation();window.open(`https://wa.me/${toWA(lead.telefono)}?text=Hola%20${encodeURIComponent(lead.nombre)}`,'_blank');}} style={{border:'none',background:'#f0fdf9',borderRadius:7,padding:'4px 8px',cursor:'pointer',display:'flex',transition:'all .15s'}}
                          onMouseEnter={e=>e.currentTarget.style.background='#059669'} onMouseLeave={e=>e.currentTarget.style.background='#f0fdf9'}><MessageCircle size={10} color="#059669"/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════
   PIPELINE — SUPERVISOR
   Ve el equipo de asesores a su cargo
════════════════════════════════════════════ */
function TabPipelineSupervisor({ leads, clients, asesores }) {
  const p = DS.primary;
  const [activeStage,    setActiveStage]    = React.useState(null);
  const [selectedAsesor, setSelectedAsesor] = React.useState(null);
  const [showDetail,     setShowDetail]     = React.useState(false);
  const [showMetaModal,  setShowMetaModal]  = React.useState(false);
  const [editMeta,       setEditMeta]       = React.useState(null);
  const [metas,          setMetas]          = React.useState(() => { 
    try { return JSON.parse(localStorage.getItem('crm_metas_sup') || '{}'); } catch { return {}; }
  });
  const [hovRow, setHovRow] = React.useState(null);
  const [showNotif, setShowNotif] = React.useState(null);

  const won    = clients?.filter(c=>c.result==='won')  || [];
  const lost   = clients?.filter(c=>c.result==='lost') || [];
  const activo = clients?.filter(c=>!c.result)         || [];
  const calientes = leads?.filter(l=>l.nivel==='caliente')||[];
  const tibios    = leads?.filter(l=>l.nivel==='tibio')   ||[];
  const frios     = leads?.filter(l=>l.nivel==='frio')    ||[];
  const totalL = leads?.length   || 0;
  const totalC = clients?.length || 0;
  const metaEq = (asesores||[]).reduce((s,a)=>s+(metas[a.id||a.name]||10),0)||(asesores?.length||1)*10;
  const pct = Math.min(Math.round((won.length/metaEq)*100),100);

  const saveMeta = (id,val)=>{
    const updated={...metas,[id]:parseInt(val)||10};
    setMetas(updated);
    localStorage.setItem('crm_metas_sup',JSON.stringify(updated));
    setShowMetaModal(false);
    setShowNotif('Meta actualizada');
    setTimeout(()=>setShowNotif(null),2500);
  };

  const asesorStats = (asesores||[]).map(a=>{
    const key=a.id||a.name;
    const mc=clients?.filter(c=>c.asesor===a.name||c.advisor_id===a.id)||[];
    const mw=mc.filter(c=>c.result==='won');
    const ml=leads?.filter(l=>l.asesor===a.name)||[];
    const metaA=metas[key]||10;
    const pctA=Math.min(Math.round((mw.length/metaA)*100),100);
    return{...a,key,clientes:mc.length,ganados:mw.length,leads:ml.length,
      en_proceso:mc.filter(c=>!c.result).length,
      sinContacto:mc.filter(c=>(Date.now()-new Date(c.last_contact||c.created_at))/3600000>24&&!c.result).length,
      tasa:mc.length?Math.round((mw.length/mc.length)*100):0,
      meta:metaA,pctMeta:pctA};
  }).sort((a,b)=>b.ganados-a.ganados);

  const selA = asesorStats.find(a=>a.key===selectedAsesor);

  const stages=[
    {key:'leads',  label:'Leads recibidos',v:totalL,                   c:'#6366f1',Icon:Target,  desc:'Bot WhatsApp'},
    {key:'contact',label:'Contactados',    v:Math.round(totalL*.62)||0,c:p,         Icon:Phone,   desc:'Primer contacto'},
    {key:'proceso',label:'En negociación', v:activo.length,            c:'#f59e0b', Icon:Activity,desc:'Activos'},
    {key:'won',    label:'Cerrados',       v:won.length,               c:'#10b981', Icon:Trophy,  desc:'Confirmados'},
  ];

  const card={background:'#fff',borderRadius:16,border:'1px solid #eaecf0',
    boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'};

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* Toast */}
      {showNotif&&(
        <div style={{position:'fixed',top:20,right:24,zIndex:99999,background:'#1e293b',color:'#fff',
          borderRadius:12,padding:'12px 20px',boxShadow:'0 8px 24px rgba(0,0,0,0.2)',
          fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
          <CheckCircle size={16} color="#10b981"/>{showNotif}
        </div>
      )}

      {/* Meta modal */}
      {showMetaModal&&editMeta&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',backdropFilter:'blur(4px)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}
          onClick={e=>{if(e.target===e.currentTarget)setShowMetaModal(false);}}>
          <div style={{background:'#fff',borderRadius:22,padding:30,width:400,
            boxShadow:'0 24px 60px rgba(0,0,0,0.2)',border:'1px solid #eaecf0'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
              <div style={{width:46,height:46,borderRadius:'50%',background:`${p}15`,
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:p}}>
                {editMeta.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:'#1e293b'}}>Meta de {editMeta.name}</div>
                <div style={{fontSize:12,color:'#94a3b8'}}>Define el objetivo de ventas del período</div>
              </div>
            </div>
            <div style={{marginBottom:18}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',letterSpacing:0.5,
                textTransform:'uppercase',display:'block',marginBottom:8}}>Ventas objetivo</label>
              <input type="number" min="1" max="200" defaultValue={editMeta.meta}
                id="meta-input-sup"
                style={{width:'100%',padding:'14px 16px',border:'2px solid #e2e8f0',borderRadius:12,
                  fontSize:28,fontWeight:800,textAlign:'center',color:'#1e293b',outline:'none',
                  boxSizing:'border-box',transition:'border .2s'}}
                onFocus={e=>e.target.style.borderColor=p} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
              <div style={{marginTop:10,display:'flex',gap:6,flexWrap:'wrap'}}>
                {[5,8,10,12,15,20].map(n=>(
                  <button key={n} onClick={()=>{document.getElementById('meta-input-sup').value=n;}}
                    style={{padding:'5px 12px',borderRadius:8,border:`1.5px solid ${p}20`,
                      background:`${p}08`,color:p,fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background=p;e.currentTarget.style.color='#fff';}}
                    onMouseLeave={e=>{e.currentTarget.style.background=`${p}08`;e.currentTarget.style.color=p;}}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div style={{background:'#f8fafc',borderRadius:12,padding:'12px 14px',
              marginBottom:18,border:'1px solid #eaecf0',fontSize:11,color:'#64748b'}}>
              <b style={{color:'#1e293b'}}>Actual:</b> {editMeta.ganados} de {editMeta.meta} ({editMeta.pctMeta}%)
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <button onClick={()=>setShowMetaModal(false)}
                style={{padding:'12px',borderRadius:12,border:'1.5px solid #e2e8f0',background:'#f8fafc',
                  color:'#64748b',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all .15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#e2e8f0'}
                onMouseLeave={e=>e.currentTarget.style.background='#f8fafc'}>Cancelar</button>
              <button onClick={()=>saveMeta(editMeta.key,document.getElementById('meta-input-sup').value)}
                style={{padding:'12px',borderRadius:12,border:'none',
                  background:`linear-gradient(135deg,${p},${p}cc)`,color:'#fff',fontWeight:800,
                  fontSize:13,cursor:'pointer',boxShadow:`0 4px 14px ${p}35`,transition:'all .2s'}}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
                onMouseLeave={e=>e.currentTarget.style.transform=''}>Guardar meta</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selA&&showDetail&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.45)',backdropFilter:'blur(4px)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:9000}}
          onClick={e=>{if(e.target===e.currentTarget){setShowDetail(false);setSelectedAsesor(null);}}}>
          <div style={{background:'#fff',borderRadius:22,padding:28,width:460,
            boxShadow:'0 24px 64px rgba(0,0,0,0.2)',border:'1px solid #eaecf0'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:48,height:48,borderRadius:'50%',
                  background:`linear-gradient(135deg,${p},${p}cc)`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:18,fontWeight:800,color:'#fff',boxShadow:`0 4px 14px ${p}35`}}>
                  {selA.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:'#1e293b'}}>{selA.name}</div>
                  <div style={{fontSize:11,color:'#94a3b8'}}>Asesor de ventas</div>
                </div>
              </div>
              <button onClick={()=>{setShowDetail(false);setSelectedAsesor(null);}}
                style={{border:'none',background:'#f1f5f9',borderRadius:10,padding:8,cursor:'pointer',display:'flex'}}
                onMouseEnter={e=>e.currentTarget.style.background='#e2e8f0'}
                onMouseLeave={e=>e.currentTarget.style.background='#f1f5f9'}>
                <X size={14} color="#64748b"/>
              </button>
            </div>
            {/* Meta bar */}
            <div style={{background:`${p}08`,borderRadius:14,padding:'14px 16px',
              marginBottom:16,border:`1px solid ${p}20`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>Meta asignada por ti</div>
                  <div style={{fontSize:11,color:'#64748b'}}>{selA.ganados} de {selA.meta} ventas · {selA.pctMeta}%</div>
                </div>
                <button onClick={()=>{setEditMeta(selA);setShowMetaModal(true);setShowDetail(false);}}
                  style={{padding:'6px 14px',borderRadius:9,border:'none',background:p,color:'#fff',
                    fontSize:11,fontWeight:700,cursor:'pointer',boxShadow:`0 3px 10px ${p}35`,
                    display:'flex',alignItems:'center',gap:4,transition:'all .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
                  onMouseLeave={e=>e.currentTarget.style.transform=''}>
                  <Star size={11}/> Editar meta
                </button>
              </div>
              <div style={{background:'rgba(255,255,255,0.6)',borderRadius:999,height:8,overflow:'hidden'}}>
                <div style={{width:`${selA.pctMeta}%`,height:'100%',
                  background:selA.pctMeta>=80?'#10b981':selA.pctMeta>=50?p:'#f59e0b',
                  borderRadius:999,transition:'width .7s ease'}}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:10,marginBottom:16}}>
              {[{l:'Clientes',v:selA.clientes,c:p},{l:'Ganados',v:selA.ganados,c:'#10b981'},
                {l:'Leads',v:selA.leads,c:'#6366f1'},{l:'Sin cont.',v:selA.sinContacto,c:'#ef4444'}
              ].map((s,i)=>(
                <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:12,
                  padding:'12px 8px',border:`1px solid ${s.c}15`}}>
                  <div style={{fontSize:22,fontWeight:800,color:s.c,lineHeight:1,marginBottom:3}}>{s.v}</div>
                  <div style={{fontSize:9,color:'#94a3b8'}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>Tasa de conversión</span>
                <span style={{fontSize:14,fontWeight:800,
                  color:selA.tasa>=60?'#10b981':selA.tasa>=30?'#f59e0b':'#ef4444'}}>{selA.tasa}%</span>
              </div>
              <div style={{background:'#f1f5f9',borderRadius:999,height:8,overflow:'hidden'}}>
                <div style={{width:`${selA.tasa}%`,height:'100%',
                  background:selA.tasa>=60?'#10b981':selA.tasa>=30?'#f59e0b':'#ef4444',
                  borderRadius:999,transition:'width .6s ease'}}/>
              </div>
            </div>
            <div style={{padding:'12px 14px',background:'#f8fafc',borderRadius:12,
              border:'1px solid #eaecf0',fontSize:12,color:'#64748b',lineHeight:1.6,marginBottom:14}}>
              <b style={{color:'#1e293b'}}>Mi evaluación:</b>{' '}
              {selA.pctMeta>=80?`${selA.name} va excelente hacia su meta. Considera aumentarla.`:
               selA.pctMeta>=50?`${selA.name} va por buen camino. Motívalo para cerrar más esta semana.`:
               `${selA.name} necesita apoyo. Agenda una revisión de su cartera de clientes.`}
              {selA.sinContacto>0&&` Tiene ${selA.sinContacto} clientes sin contacto reciente.`}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button onClick={()=>{setEditMeta(selA);setShowMetaModal(true);setShowDetail(false);}}
                style={{padding:'10px',borderRadius:11,border:'none',background:`${p}10`,color:p,
                  fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',
                  justifyContent:'center',gap:5,transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background=p;e.currentTarget.style.color='#fff';}}
                onMouseLeave={e=>{e.currentTarget.style.background=`${p}10`;e.currentTarget.style.color=p;}}>
                <Star size={13}/> Editar meta
              </button>
              <button onClick={()=>{setShowDetail(false);setSelectedAsesor(null);}}
                style={{padding:'10px',borderRadius:11,border:'1.5px solid #e2e8f0',background:'#fff',
                  color:'#64748b',fontWeight:700,fontSize:12,cursor:'pointer',transition:'all .15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#f1f5f9'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:22}}>
        <div>
          <div style={{fontSize:11,color:p,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:4}}>Supervisor · Mi equipo</div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:'#1e293b',letterSpacing:'-0.5px'}}>Pipeline de mi Equipo</h1>
          <p style={{margin:'5px 0 0',fontSize:13,color:'#94a3b8'}}>Haz clic en un asesor para asignar meta · {asesores?.length||0} asesores</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[
          {label:'Leads equipo',  v:totalL,         color:'#6366f1',Icon:Target,   sub:'captados'},
          {label:'¡A cerrar!',     v:calientes.length,color:'#ef4444',Icon:Flame,   sub:'alta prioridad'},
          {label:'Ganados',       v:won.length,      color:'#10b981',Icon:Trophy,  sub:`meta ${metaEq}`},
          {label:'Progreso',      v:`${pct}%`,       color:p,         Icon:TrendingUp,sub:'vs meta total'},
        ].map((k,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:14,padding:'18px',border:'1px solid #eaecf0',
            borderTop:`3px solid ${k.color}`,boxShadow:'0 1px 3px rgba(0,0,0,0.05)',transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 10px 28px ${k.color}18`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)';}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
              <div style={{width:40,height:40,borderRadius:11,background:`${k.color}12`,
                border:`1px solid ${k.color}20`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <k.Icon size={18} color={k.color} strokeWidth={2}/>
              </div>
              <div style={{width:3,height:40,borderRadius:999,background:`linear-gradient(180deg,${k.color},${k.color}44)`}}/>
            </div>
            <div style={{fontSize:28,fontWeight:800,color:'#1e293b',lineHeight:1,marginBottom:3}}>{k.v}</div>
            <div style={{fontSize:11,fontWeight:700,color:'#1e293b',marginBottom:2}}>{k.label}</div>
            <div style={{fontSize:10,color:'#94a3b8'}}>{k.sub}</div>
            {i===3&&<div style={{marginTop:10,background:'#f1f5f9',borderRadius:999,height:5,overflow:'hidden'}}>
              <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${p},#10b981)`,
                borderRadius:999,transition:'width .8s ease'}}/>
            </div>}
          </div>
        ))}
      </div>

      {/* Funnel + temperatura */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'1.2fr 1fr',gap:16,marginBottom:16}}>
        <div style={card}>
          <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',borderLeft:`3px solid ${p}`,
            display:'flex',alignItems:'center',gap:8}}>
            <TrendingUp size={14} color={p}/>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>Embudo del equipo</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>Clic en etapa para expandir</div>
            </div>
          </div>
          <div style={{padding:'20px'}}>
            {stages.map((s,i,arr)=>{
              const maxV=arr[0].v||1;
              const barW=Math.max(s.v>0?(s.v/maxV)*100:0,s.v>0?6:0);
              const rate=i>0&&arr[i-1].v>0?Math.round((s.v/arr[i-1].v)*100):100;
              const isAct=activeStage===s.key;
              return(
                <div key={s.key} style={{marginBottom:14,cursor:'pointer'}} onClick={()=>setActiveStage(isAct?null:s.key)}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                    marginBottom:7,padding:'8px 10px',borderRadius:10,
                    background:isAct?`${s.c}08`:'transparent',
                    border:isAct?`1px solid ${s.c}20`:'1px solid transparent',transition:'all .2s'}}
                    onMouseEnter={e=>{if(!isAct)e.currentTarget.style.background='#f8fafc';}}
                    onMouseLeave={e=>{if(!isAct)e.currentTarget.style.background='transparent';}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:30,height:30,borderRadius:9,
                        background:isAct?s.c:`${s.c}12`,display:'flex',alignItems:'center',
                        justifyContent:'center',flexShrink:0,transition:'all .2s'}}>
                        <s.Icon size={13} color={isAct?'#fff':s.c}/>
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:isAct?s.c:'#475569'}}>{s.label}</div>
                        <div style={{fontSize:10,color:'#94a3b8'}}>{s.desc}</div>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                      {i>0&&<div style={{fontSize:9,color:'#94a3b8'}}>{rate}% conv.</div>}
                    </div>
                  </div>
                  <div style={{background:'#f1f5f9',borderRadius:10,height:10,overflow:'hidden'}}>
                    <div style={{width:`${barW}%`,height:'100%',background:`linear-gradient(90deg,${s.c},${s.c}88)`,
                      borderRadius:10,transition:'width .6s ease',minWidth:s.v>0?'3%':'0',
                      boxShadow:isAct?`0 0 8px ${s.c}60`:''}}/>
                  </div>
                  {isAct&&(
                    <div style={{marginTop:8,padding:'12px 14px',background:`${s.c}06`,
                      borderRadius:12,border:`1px solid ${s.c}20`}}>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,textAlign:'center'}}>
                        {[{l:'Total',v:s.v},{l:'% del total',v:`${totalL?Math.round((s.v/totalL)*100):0}%`},{l:'Conversión',v:`${rate}%`}].map((d,j)=>(
                          <div key={j}>
                            <div style={{fontSize:16,fontWeight:800,color:s.c}}>{d.v}</div>
                            <div style={{fontSize:9,color:'#94a3b8'}}>{d.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={card}>
            <div style={{padding:'13px 18px',borderBottom:'1px solid #f1f5f9',borderLeft:'3px solid #ef4444',display:'flex',alignItems:'center',gap:8}}>
              <Flame size={13} color="#ef4444"/>
              <span style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Temperatura leads</span>
            </div>
            <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:9}}>
              {[
                {l:'¡A cerrar!',v:calientes.length,c:'#ef4444',bg:'#fef2f2',bd:'#fecaca',Icon:Flame},
                {l:'En seguimiento',   v:tibios.length,   c:'#f59e0b',bg:'#fffbeb',bd:'#fde68a',Icon:Thermometer},
                {l:'¡Rescatar!',    v:frios.length,    c:'#3b82f6',bg:'#eff6ff',bd:'#bfdbfe',Icon:Snowflake},
              ].map((s,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
                  background:s.bg,borderRadius:11,border:`1px solid ${s.bd}`,cursor:'pointer',transition:'all .2s'}}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateX(4px)';e.currentTarget.style.boxShadow=`0 4px 14px ${s.c}18`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='none';}}>
                  <div style={{width:30,height:30,borderRadius:9,background:'rgba(255,255,255,0.7)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><s.Icon size={14} color={s.c}/></div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:700,color:s.c}}>{s.l}</span>
                      <span style={{fontSize:15,fontWeight:800,color:s.c}}>{s.v}</span>
                    </div>
                    <div style={{background:'rgba(255,255,255,0.5)',borderRadius:999,height:4,overflow:'hidden'}}>
                      <div style={{width:`${totalL?Math.max((s.v/totalL)*100,s.v>0?4:0):0}%`,height:'100%',background:s.c,borderRadius:999}}/>
                    </div>
                  </div>
                  <span style={{fontSize:10,color:s.c,fontWeight:700,flexShrink:0}}>{totalL?Math.round((s.v/totalL)*100):0}%</span>
                </div>
              ))}
            </div>
          </div>
          <div style={card}>
            <div style={{padding:'13px 18px',borderBottom:'1px solid #f1f5f9',borderLeft:'3px solid #10b981',display:'flex',alignItems:'center',gap:8}}>
              <Users size={13} color="#10b981"/>
              <span style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Estado clientes</span>
            </div>
            <div style={{padding:'14px 18px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
              {[{l:'En proceso',v:activo.length,c:p},{l:'Ganados',v:won.length,c:'#10b981'},{l:'Perdidos',v:lost.length,c:'#ef4444'}].map((s,i)=>(
                <div key={i} style={{textAlign:'center',padding:'13px 8px',background:'#f8fafc',borderRadius:12,border:`1px solid ${s.c}15`,cursor:'pointer',transition:'all .2s'}}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${s.c}08`;e.currentTarget.style.transform='translateY(-2px)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.transform='';}}>
                  <div style={{fontSize:24,fontWeight:800,color:s.c,lineHeight:1,marginBottom:3}}>{s.v}</div>
                  <div style={{fontSize:10,color:'#64748b',fontWeight:600}}>{s.l}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{totalC?Math.round((s.v/totalC)*100):0}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Asesores con metas */}
      <div style={card}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',borderLeft:'3px solid #8b5cf6',
          display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <UserCheck size={14} color="#8b5cf6"/>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>Mis asesores · Metas individuales</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>Haz clic para ver detalle o en el botón para editar la meta</div>
            </div>
          </div>
        </div>
        <div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 65px 65px 65px 65px 130px 80px',
            gap:10,padding:'10px 20px',background:'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
            {['Asesor','Clientes','Ganados','Leads','Tasa','Prog. meta','Acción'].map((h,i)=>(
              <div key={i} style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:0.5,textAlign:i>0?'center':'left'}}>{h}</div>
            ))}
          </div>
          {asesorStats.length===0&&<div style={{padding:'24px',textAlign:'center',color:'#94a3b8',fontSize:13}}>Sin asesores asignados</div>}
          {asesorStats.map((a,i)=>{
            const isHov=hovRow===i;
            return(
              <div key={a.key||i}
                style={{display:'grid',gridTemplateColumns:'1fr 65px 65px 65px 65px 130px 80px',
                  gap:10,padding:'13px 20px',borderBottom:'1px solid #f8fafc',alignItems:'center',
                  background:isHov?'#f8fafc':'transparent',cursor:'pointer',transition:'all .15s'}}
                onMouseEnter={()=>setHovRow(i)} onMouseLeave={()=>setHovRow(null)}
                onClick={()=>{setSelectedAsesor(a.key);setShowDetail(true);}}>
                <div style={{display:'flex',alignItems:'center',gap:9}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:`${p}15`,
                    border:`2px solid ${isHov?p:`${p}25`}`,display:'flex',alignItems:'center',
                    justifyContent:'center',fontSize:12,fontWeight:800,color:p,flexShrink:0,transition:'border-color .2s'}}>
                    {a.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{a.name}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>Meta: {a.meta} ventas{a.sinContacto>0?` · ${a.sinContacto} sin cont.`:''}</div>
                  </div>
                </div>
                <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#64748b'}}>{a.clientes}</div>
                <div style={{textAlign:'center',fontSize:13,fontWeight:800,color:'#10b981'}}>{a.ganados}</div>
                <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#6366f1'}}>{a.leads}</div>
                <div style={{textAlign:'center'}}>
                  <span style={{fontSize:11,fontWeight:800,padding:'3px 9px',borderRadius:999,
                    color:a.tasa>=60?'#10b981':a.tasa>=30?'#f59e0b':'#ef4444',
                    background:a.tasa>=60?'#f0fdf9':a.tasa>=30?'#fffbeb':'#fef2f2'}}>{a.tasa}%</span>
                </div>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{flex:1,background:'#f1f5f9',borderRadius:999,height:6,overflow:'hidden'}}>
                      <div style={{width:`${a.pctMeta}%`,height:'100%',
                        background:a.pctMeta>=80?'#10b981':a.pctMeta>=50?p:'#f59e0b',
                        borderRadius:999,transition:'width .5s ease'}}/>
                    </div>
                    <span style={{fontSize:10,fontWeight:700,flexShrink:0,
                      color:a.pctMeta>=80?'#10b981':a.pctMeta>=50?p:'#f59e0b'}}>{a.pctMeta}%</span>
                  </div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:2,textAlign:'center'}}>{a.ganados}/{a.meta}</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <button onClick={e=>{e.stopPropagation();setEditMeta(a);setShowMetaModal(true);}}
                    style={{padding:'5px 11px',borderRadius:8,border:`1.5px solid ${p}30`,
                      background:`${p}08`,color:p,fontSize:11,fontWeight:700,cursor:'pointer',
                      transition:'all .15s',display:'inline-flex',alignItems:'center',gap:3}}
                    onMouseEnter={e=>{e.currentTarget.style.background=p;e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor=p;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=`${p}08`;e.currentTarget.style.color=p;e.currentTarget.style.borderColor=`${p}30`;}}>
                    <Star size={10}/> Meta
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TabEstadisticasPersonales({stats, leads, clients, events, onNavigate}) {
  const p = DS.primary;
  const nav = onNavigate || (()=>{});
const [hov, setHov] = React.useState(null);

  const ganados    = clients.filter(c=>c.result==='won'||c.metadata?.result==='won').length;
  const enProceso  = clients.filter(c=>!c.result&&c.metadata?.result!=='won'&&c.metadata?.result!=='lost').length;
  const totalC     = clients.length || 1;
  const tasa       = Math.round((ganados/totalC)*100);
  const calientes  = leads.filter(l=>l.nivel==='caliente').length;
  const tibios     = leads.filter(l=>l.nivel==='tibio').length;
  const frios      = leads.filter(l=>l.nivel==='frio').length;
  const totalLeads = leads.length || 1;
  const meta       = 20;
  const avance     = Math.min(Math.round((ganados/meta)*100),100);
  const scorePromedio = leads.length ? Math.round(leads.reduce((s,l)=>s+(l.score||0),0)/leads.length) : 0;

  const kpis = [
    { l:'Clientes equipo',   v:clients.length, c:'#4f6ef7', sub:'total asignados',  nav:'clients',  Ic:Users,       bg:'#EEF2FF' },
    { l:'Ventas cerradas',   v:ganados,         c:'#10b981', sub:'este mes',          nav:'clients',  Ic:CheckCircle, bg:'#F0FDF4' },
    { l:'En negociación',    v:enProceso,       c:'#f59e0b', sub:'en proceso',        nav:'clients',  Ic:TrendingUp,  bg:'#FFFBEB' },
    { l:'Tasa conversión',   v:`${tasa}%`,      c:'#8b5cf6', sub:'del equipo',        nav:'clients',  Ic:Activity,    bg:'#F5F3FF' },
    { l:'Leads del bot',     v:leads.length,    c:'#ef4444', sub:'recibidos',         nav:'leads',    Ic:Bot,         bg:'#FFF1F2' },
    { l:'Leads calientes',   v:calientes,       c:'#ef4444', sub:'alta prioridad',    nav:'leads',    Ic:Zap,         bg:'#FFF1F2' },
    { l:'Score promedio',    v:scorePromedio,   c:'#0ea5e9', sub:'de leads',          nav:'leads',    Ic:Activity,    bg:'#EFF6FF' },
    { l:'Citas próximas',    v:events.filter(e=>new Date(e.date||e.event_date)>=new Date()).length, c:'#f59e0b', sub:'agendadas', nav:'calendar', Ic:Calendar, bg:'#FFFBEB' },
  ];

  const nivelData = [
    { l:'Calientes', v:calientes, c:'#ef4444', nav:'leads' },
    { l:'Tibios',    v:tibios,    c:'#f59e0b', nav:'leads' },
    { l:'Fríos',     v:frios,     c:'#4f6ef7', nav:'leads' },
  ];

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
      </div>

      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,color:p,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:4}}>Panel personal</div>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:'#1E293B',letterSpacing:'-0.5px'}}>Mi Rendimiento</h1>
        <p style={{margin:'4px 0 0',fontSize:13,color:'#94A3B8'}}>Haz clic en cada card para ver el detalle</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {kpis.map((k,i)=>(
          <div key={i} onClick={()=>nav(k.nav)} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}
            style={{background:'#fff',borderRadius:16,padding:'20px',border:`1px solid ${k.c}20`,borderTop:`3px solid ${k.c}`,cursor:'pointer',transition:'all .2s',
              transform:hov===i?'translateY(-4px)':'none',boxShadow:hov===i?`0 12px 28px ${k.c}25`:'0 1px 4px rgba(0,0,0,0.05)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',bottom:-8,right:-8,opacity:0.06}}><k.Ic size={64} color={k.c}/></div>
            <div style={{width:40,height:40,borderRadius:12,background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14,border:`1px solid ${k.c}20`}}>
              <k.Ic size={18} color={k.c}/>
            </div>
            <div style={{fontSize:28,fontWeight:800,color:'#1e293b',lineHeight:1,marginBottom:4}}>{k.v}</div>
            <div style={{fontSize:12,fontWeight:700,color:'#475569'}}>{k.l}</div>
            <div style={{fontSize:11,color:k.c,marginTop:4,fontWeight:600}}>{k.sub} →</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        <div style={{background:'#fff',borderRadius:16,padding:'22px',border:'1px solid #eaecf0',cursor:'pointer',transition:'all .2s'}}
          onClick={()=>nav('clients')}
          onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 8px 24px ${p}15`;e.currentTarget.style.transform='translateY(-2px)';}}
          onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='none';}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:'#1e293b',marginBottom:2}}>Meta del mes — Equipo</div>
              <div style={{fontSize:12,color:'#94a3b8'}}>Ventas cerradas este mes</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:28,fontWeight:800,color:ganados>=meta?'#10b981':p,lineHeight:1}}>{ganados}</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>de {meta} meta</div>
            </div>
          </div>
          <div style={{background:'#f1f5f9',borderRadius:999,height:12,overflow:'hidden',marginBottom:8}}>
            <div style={{width:`${avance}%`,height:'100%',background:avance>=100?'linear-gradient(90deg,#10b981,#34d399)':`linear-gradient(90deg,${p},${p}cc)`,borderRadius:999,transition:'width .8s'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <span style={{fontSize:11,color:'#94a3b8'}}>{avance>=100?'Meta cumplida':avance>=60?'Buen ritmo':'Sigue adelante'}</span>
            <span style={{fontSize:13,fontWeight:800,color:avance>=100?'#10b981':p}}>{avance}%</span>
          </div>
        </div>

        <div style={{background:'#fff',borderRadius:16,padding:'22px',border:'1px solid #eaecf0'}}>
          <div style={{fontSize:13,fontWeight:800,color:'#1e293b',marginBottom:16}}>Distribución de leads</div>
          {nivelData.map((n,i)=>{
            const pct=Math.round((n.v/totalLeads)*100);
            return(
              <div key={i} style={{marginBottom:12,cursor:'pointer'}} onClick={()=>nav(n.nav)}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:n.c}}/>
                    <span style={{fontSize:12,fontWeight:600,color:'#475569'}}>{n.l}</span>
                  </div>
                  <span style={{fontSize:12,fontWeight:800,color:n.c}}>{n.v} ({pct}%)</span>
                </div>
                <div style={{background:'#f1f5f9',borderRadius:999,height:7,overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:n.c,borderRadius:999}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(3,1fr)',gap:12}}>
        {[
          {l:'Score promedio',   v:`${scorePromedio}/100`, c:'#4f6ef7', sub:'de tus leads',  nav:'leads',    Ic:Activity},
          {l:'Leads hoy',        v:leads.filter(l=>new Date(l.created_at).toDateString()===new Date().toDateString()).length, c:'#f59e0b', sub:'del bot', nav:'leads', Ic:Zap},
          {l:'Citas hoy',        v:events.filter(e=>(e.date||e.event_date)===new Date().toISOString().split('T')[0]).length, c:'#10b981', sub:'agendadas', nav:'calendar', Ic:Calendar},
        ].map((s,i)=>(
          <div key={i} onClick={()=>nav(s.nav)}
            style={{background:'#fff',borderRadius:14,padding:'18px',border:`1px solid ${s.c}20`,cursor:'pointer',textAlign:'center',transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 8px 20px ${s.c}20`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
            <s.Ic size={20} color={s.c} style={{marginBottom:8}}/>
            <div style={{fontSize:24,fontWeight:800,color:s.c}}>{s.v}</div>
            <div style={{fontSize:12,fontWeight:700,color:'#1e293b',marginTop:4}}>{s.l}</div>
            <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


function TabRendimientoEquipo({ clients, asesores: asesoresRaw, leads }) {
  const p = DS.primary;
  const asesores = (asesoresRaw && asesoresRaw.length > 0) ? asesoresRaw : [];
  const [orden, setOrden] = React.useState('conversion');

  const dataAsesores = asesores.map(a => {
    const ac       = clients.filter(c => c.asesorId===a.id || c.assigned_advisor_id===a.id);
    const leadsA   = leads.filter(l => l.advisor_id===a.id);
    const ganados  = ac.filter(c => c.result==='won').length;
    const perdidos = ac.filter(c => c.result==='lost').length;
    const proceso  = ac.filter(c => !c.result).length;
    const conv     = ac.length ? Math.round((ganados/ac.length)*100) : 0;
    const calientes = leadsA.filter(l => l.nivel==='caliente').length;
    const scorePromedio = leadsA.length ? Math.round(leadsA.reduce((s,l)=>s+(l.score||0),0)/leadsA.length) : 0;
    return { ...a, total_clientes:ac.length, ganados, perdidos, proceso, conv, leads:leadsA.length, calientes, scorePromedio };
  });

  const sorted = [...dataAsesores].sort((a,b) => {
    if (orden==='conversion') return b.conv - a.conv;
    if (orden==='ganados')    return b.ganados - a.ganados;
    if (orden==='leads')      return b.leads - a.leads;
    if (orden==='clientes')   return b.total_clientes - a.total_clientes;
    return 0;
  });

  // Totales equipo
  const totalGanados  = dataAsesores.reduce((s,a)=>s+a.ganados,0);
  const totalClientes = dataAsesores.reduce((s,a)=>s+a.total_clientes,0)||1;
  const totalLeads    = dataAsesores.reduce((s,a)=>s+a.leads,0);
  const convEquipo    = Math.round((totalGanados/totalClientes)*100);

  return (
    <div>
      {/* KPIs del equipo */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {l:'Asesores activos', v:asesores.length,  c:'#4f6ef7'},
          {l:'Clientes totales', v:totalClientes,     c:'#8b5cf6'},
          {l:'Ventas cerradas',  v:totalGanados,      c:'#10b981'},
          {l:'Tasa conversión',  v:`${convEquipo}%`,  c:'#f59e0b'},
        ].map((k,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:14,padding:'16px 18px',border:`1px solid ${k.c}20`,borderTop:`3px solid ${k.c}`}}>
            <div style={{fontSize:24,fontWeight:800,color:k.c}}>{k.v}</div>
            <div style={{fontSize:12,fontWeight:700,color:'#1e293b',marginTop:6}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Tabla de rendimiento */}
      <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <div style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Ranking del equipo</div>
          <div style={{display:'flex',gap:6}}>
            {[
              {k:'conversion',l:'Conversión'},
              {k:'ganados',   l:'Ganados'},
              {k:'leads',     l:'Leads'},
              {k:'clientes',  l:'Clientes'},
            ].map(o=>(
              <button key={o.k} onClick={()=>setOrden(o.k)}
                style={{padding:'5px 12px',borderRadius:7,border:'none',fontSize:11,fontWeight:700,cursor:'pointer',
                  background:orden===o.k?p:'#f1f5f9',color:orden===o.k?'#fff':'#64748b'}}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#f8fafc'}}>
              {['#','Asesor','Clientes','Ganados','Perdidos','En proceso','Leads','Conversión'].map(h=>(
                <th key={h} style={{padding:'10px 14px',fontSize:10,fontWeight:700,color:'#94a3b8',textAlign:'left'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((a,i)=>{
              const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
              return(
                <tr key={a.id} style={{borderTop:'1px solid #f8fafc',background:i===0?`${p}04`:'transparent'}}>
                  <td style={{padding:'12px 14px',fontSize:13,fontWeight:800,color:p}}>{medal||i+1}</td>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:34,height:34,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:p}}>
                        {(a.name||'?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{a.name}</div>
                        <div style={{fontSize:10,color:'#94a3b8'}}>{a.email||''}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:'12px 14px',fontSize:13,fontWeight:600,color:'#4f6ef7'}}>{a.total_clientes}</td>
                  <td style={{padding:'12px 14px',fontSize:13,fontWeight:700,color:'#10b981'}}>{a.ganados}</td>
                  <td style={{padding:'12px 14px',fontSize:13,fontWeight:600,color:'#ef4444'}}>{a.perdidos}</td>
                  <td style={{padding:'12px 14px',fontSize:13,fontWeight:600,color:'#f59e0b'}}>{a.proceso}</td>
                  <td style={{padding:'12px 14px',fontSize:13,fontWeight:600,color:'#8b5cf6'}}>{a.leads}</td>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{flex:1,background:'#f1f5f9',borderRadius:999,height:6,overflow:'hidden',minWidth:60}}>
                        <div style={{width:`${a.conv}%`,height:'100%',background:a.conv>=60?'#10b981':a.conv>=30?'#f59e0b':'#ef4444',borderRadius:999}}/>
                      </div>
                      <span style={{fontSize:12,fontWeight:800,color:a.conv>=60?'#10b981':a.conv>=30?'#f59e0b':'#ef4444',minWidth:36}}>{a.conv}%</span>
                    </div>
                  </td>
                </tr>

              );
            })}
            {sorted.length===0&&(
              <tr><td colSpan={8} style={{padding:24,textAlign:'center',color:'#94a3b8',fontSize:12}}>Sin asesores registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

}

function TabConversaciones({ leads }) {
  const p = DS.primary;
  const [sel, setSel] = React.useState(null);
  const [convs, setConvs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');

  async function load(lead) {
    setSel(lead); setLoading(true);
    try { const d = await apiFetch('GET', `/api/webhook/conversations/${lead.id}`); setConvs(Array.isArray(d)?d:[]); }
    catch(e) { setConvs([]); }
    setLoading(false);
  }

  const filtered = leads.filter(l => l.nombre?.toLowerCase().includes(search.toLowerCase()) || l.telefono?.includes(search));
  const NIVEL = { caliente:{c:'#10b981',bg:'#f0fdf9',l:'Caliente'}, tibio:{c:'#f59e0b',bg:'#fefce8',l:'Tibio'}, frio:{c:'#ef4444',bg:'#fef2f2',l:'Frio'} };

  return (
    <div style={{display:MOB?'block':'grid',gridTemplateColumns:'300px 1fr',gap:16,height:MOB?'auto':'75vh'}}>
      {(!MOB || !sel) && <div style={{background:'#fff',borderRadius:14,border:'1px solid #eaecf0',display:'flex',flexDirection:'column',overflow:'hidden',height:MOB?'70vh':'auto'}}>
        <div style={{padding:'12px 14px',borderBottom:'1px solid #eaecf0'}}>
          <div style={{fontSize:11,color:p,fontWeight:700,textTransform:'uppercase',marginBottom:6}}>Conversaciones del bot</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente..." style={{width:'100%',padding:'7px 11px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:12,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {filtered.map(lead=>{
            const nv=NIVEL[lead.nivel]||NIVEL.frio;
            const isSel=sel?.id===lead.id;
            return(<div key={lead.id} onClick={()=>load(lead)} style={{padding:'10px 14px',borderBottom:'1px solid #f1f5f9',cursor:'pointer',background:isSel?`${p}08`:'transparent',borderLeft:isSel?`3px solid ${p}`:'3px solid transparent'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                <span style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{lead.nombre}</span>
                <span style={{fontSize:10,fontWeight:700,color:nv.c,background:nv.bg,padding:'1px 7px',borderRadius:999}}>{nv.l}</span>
              </div>
              <div style={{fontSize:11,color:'#64748b'}}>{lead.telefono}</div>
            </div>);
          })}
          {filtered.length===0&&<div style={{padding:20,textAlign:'center',color:'#94a3b8',fontSize:12}}>Sin leads</div>}
        </div>
      </div>}
      {(!MOB || sel) && <div style={{background:'#fff',borderRadius:14,border:'1px solid #eaecf0',display:'flex',flexDirection:'column',overflow:'hidden',height:MOB?'70vh':'auto'}}>
        {MOB && sel && <button onClick={()=>setSel(null)} style={{margin:'10px 14px 0',padding:'8px 14px',background:'none',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,cursor:'pointer',textAlign:'left',color:'#4f6ef7',fontWeight:600}}>← Volver</button>}
        {!sel?(<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8}}>
          <MessageCircle size={36} color="#e2e8f0"/>
          <div style={{fontSize:13,color:'#94a3b8',fontWeight:600}}>Selecciona un lead para ver la conversacion</div>
        </div>):(
          <>
            <div style={{padding:'12px 16px',borderBottom:'1px solid #eaecf0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>{sel.nombre}</div>
                <div style={{fontSize:11,color:'#64748b'}}>{sel.telefono} · Score: {sel.score}/100</div>
              </div>
              <button onClick={()=>window.open(`https://wa.me/${(()=>{let n=(sel.telefono||'').replace(/\D/g,'');if(n.startsWith('0')&&n.length===10)n='593'+n.substring(1);else if(n.length===9)n='593'+n;return n;})()}?text=Hola%20${encodeURIComponent(sel.nombre||'')}%2C%20soy%20del%20equipo%20BUSIMOTT`,'_blank')}
                style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#f0fdf9',color:'#059669',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
                <MessageCircle size={12}/> Abrir WhatsApp
              </button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'14px 16px',display:'flex',flexDirection:'column',gap:8,background:'#f8fafc'}}>
              {loading&&<div style={{textAlign:'center',color:'#94a3b8',fontSize:12,padding:20}}>Cargando...</div>}
              {!loading&&convs.length===0&&<div style={{textAlign:'center',color:'#94a3b8',fontSize:12,padding:20}}>Sin mensajes aun</div>}
              {convs.map((m,i)=>{
                const isBot=m.direction==='outbound';
                return(<div key={i} style={{display:'flex',justifyContent:isBot?'flex-start':'flex-end'}}>
                  <div style={{maxWidth:'70%'}}>
                    <div style={{fontSize:10,color:'#94a3b8',marginBottom:2,textAlign:isBot?'left':'right'}}>{isBot?'Claudia (Bot)':sel.nombre}</div>
                    <div style={{padding:'9px 13px',borderRadius:isBot?'4px 12px 12px 12px':'12px 4px 12px 12px',background:isBot?'#fff':p,color:isBot?'#1e293b':'#fff',fontSize:12,lineHeight:1.5,border:isBot?'1px solid #e2e8f0':'none'}}>
                      {m.message_text}
                    </div>
                    <div style={{fontSize:10,color:'#cbd5e1',marginTop:2,textAlign:isBot?'left':'right'}}>
                      {m.created_at?new Date(m.created_at).toLocaleString('es-EC',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):''}
                    </div>
                  </div>
                </div>);
              })}
            </div>
            {(()=>{
              const lastIn=convs.filter(m=>m.direction==='inbound').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
              const horas=lastIn?(Date.now()-new Date(lastIn.created_at).getTime())/(1000*60*60):999;
              if(horas>24) return(
                <div style={{padding:'12px 16px',borderTop:'1px solid #eaecf0',background:'#fef3c7',display:'flex',alignItems:'center',gap:10}}>
                  <Clock size={16} color='#d97706'/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#92400e'}}>Ventana de 24 horas cerrada</div>
                    <div style={{fontSize:11,color:'#b45309'}}>Espera a que el cliente te escriba de nuevo para poder responder.</div>
                  </div>
                  <button onClick={()=>window.open(`https://wa.me/${toWA(sel.telefono)}`,'_blank')} style={{padding:'7px 12px',borderRadius:8,border:'none',background:'#25d366',color:'#fff',fontWeight:700,fontSize:11,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
                    <MessageCircle size={11}/> Abrir WA
                  </button>
                </div>
              );
              return(
                <div style={{padding:'10px 16px',borderTop:'1px solid #eaecf0',background:'#fff',display:'flex',gap:8,alignItems:'flex-end'}}>
                  <textarea id="sup-chat-input" rows={2} placeholder="Escribe un mensaje..." style={{flex:1,padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:12,resize:'none',outline:'none',fontFamily:'inherit'}}
                    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById('sup-btn-send')?.click();}}}/>
                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    <button id="sup-btn-send" onClick={async()=>{
                      const inp=document.getElementById('sup-chat-input');
                      const txt=inp?.value?.trim();
                      if(!txt)return;
                      try{
                        let sp=(sel.telefono||'').replace(/\D/g,'');
                        if(sp.startsWith('0')&&sp.length===10) sp='593'+sp.substring(1);
                        else if(sp.length===9) sp='593'+sp;
                        await apiFetch('POST','/api/messages/send',{leadId:sel.id,phone:sp,message:txt,companyId:sel.company_id});
                        inp.value='';load(sel);
                      }catch(e){alert('Error: '+e.message);}
                    }} style={{padding:'9px 14px',borderRadius:8,border:'none',background:'#25d366',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                      <MessageCircle size={12}/> Enviar
                    </button>
                    <button onClick={()=>window.open(`https://wa.me/${toWA(sel.telefono)}?text=Hola`,'_blank')} style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#f0fdf9',color:'#059669',fontWeight:700,fontSize:11,cursor:'pointer'}}>
                      Abrir WA
                    </button>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>}
    </div>
  );
}

function TabMisClientes({ user }) {
  const p = DS.primary;
  const [clients, setClients] = useState([]);
  const [leads,   setLeads]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [tab,     setTab]     = useState('clientes');
  const [sendModal,   setSendModal]   = useState(null);
  const [editModal,   setEditModal]   = useState(null); // null | 'new' | client obj
  const [lossModal,   setLossModal]   = useState(null);
  const [winModal,    setWinModal]    = useState(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:'', phone:'', email:'', notes:'', heat:'tibio' });

  function openNew()  { setForm({ name:'', phone:'', email:'', notes:'', heat:'tibio' }); setEditModal('new'); }
  function openEdit(c){ setForm({ name:c.name||'', phone:c.phone||'', email:c.email||'', notes:c.notes||'', heat:c.heat||c.metadata?.heat||'tibio' }); setEditModal(c); }

  async function guardar() {
    if (!form.name || !form.phone) return alert('Nombre y teléfono son obligatorios');
    setSaving(true);
    try {
      if (editModal === 'new') {
        const r = await apiFetch('POST', '/api/supervisor/mis-clientes', form);
        setClients(p => [r, ...p]);
      } else {
        await apiFetch('PUT', `/api/supervisor/mis-clientes/${editModal.id}`, form);
        setClients(p => p.map(c => c.id === editModal.id ? { ...c, ...form } : c));
      }
      setEditModal(null);
    } catch(e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  function eliminar(c) {
    askConfirm(`¿Eliminar a ${c.name}? Esta acción no se puede deshacer.`, async () => {
      try {
        await apiFetch('DELETE', `/api/supervisor/mis-clientes/${c.id}`);
        setClients(p => p.filter(x => x.id !== c.id));
      } catch(e) { alert('Error: ' + e.message); }
    });
  }

  async function marcarPerdido(c, concepto) {
    try {
      await apiFetch('PUT', `/api/supervisor/mis-clientes/${c.id}`, { result:'lost', lossReason: concepto });
      setClients(p => p.map(x => x.id===c.id ? { ...x, result:'lost', lossReason: concepto } : x));
    } catch(e) { alert('Error: ' + e.message); }
    setLossModal(null);
  }

  async function marcarGanado(c, concepto) {
    try {
      await apiFetch('PUT', `/api/supervisor/mis-clientes/${c.id}`, { result:'won', lossReason: concepto });
      setClients(p => p.map(x => x.id===c.id ? { ...x, result:'won', lossReason: concepto } : x));
    } catch(e) { alert('Error: ' + e.message); }
    setWinModal(null);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch('GET', '/api/supervisor/mis-clientes').catch(()=>[]),
      apiFetch('GET', '/api/supervisor/mis-leads').catch(()=>[]),
    ]).then(([c, l]) => {
      setClients(Array.isArray(c) ? c.map(x=>({...x,result:x.result||x.metadata?.result||null,heat:x.heat||x.metadata?.heat||'tibio',lossReason:x.lossReason||x.metadata?.lossReason||''})) : []);
      setLeads(Array.isArray(l) ? l : []);
      setLoading(false);
    });
  }, []);

  async function enviarMsg(cliente) {
    if (!msg.trim()) return;
    try {
      let phone = (cliente.phone||'').replace(/\D/g,'');
      if (phone.startsWith('0') && phone.length===10) phone='593'+phone.substring(1);
      else if (phone.length===9) phone='593'+phone;
      await apiFetch('POST', '/api/messages/send', {
        phone, message: msg, companyId: cliente.company_id
      });
      setSendModal(null); setMsg('');
      alert('✅ Mensaje enviado a ' + cliente.name);
    } catch(e) { alert('❌ Error: ' + e.message); }
  }

  const CLS = {
    caliente:{ c:'#ef4444', b:'#fff5f5', l:'Caliente' },
    tibio:   { c:'#f59e0b', b:'#fffbeb', l:'Tibio'    },
    frio:    { c:'#4f6ef7', b:'#f0f1ff', l:'Frío'     },
    won:     { c:'#10b981', b:'#f0fdf9', l:'Ganado'   },
    lost:    { c:'#ef4444', b:'#fef2f2', l:'Perdido'  },
  };

  const filteredC = clients.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));
  const filteredL = leads.filter(l => l.nombre?.toLowerCase().includes(search.toLowerCase()) || l.telefono?.includes(search));

  return (
    <div>
      {/* Send message modal */}
      {sendModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{background:'#fff',borderRadius:16,padding:24,width:360,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:14,fontWeight:800,marginBottom:4}}>Enviar mensaje</div>
            <div style={{fontSize:12,color:'#94a3b8',marginBottom:14}}>{sendModal.name} — {sendModal.phone}</div>
            <textarea value={msg} onChange={e=>setMsg(e.target.value)} rows={3}
              placeholder="Escribe tu mensaje..."
              style={{width:'100%',padding:'10px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:13,resize:'none',outline:'none',fontFamily:'inherit',marginBottom:10,boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setSendModal(null);setMsg('');}} style={{flex:1,padding:'9px',borderRadius:8,border:'none',background:'#f1f5f9',cursor:'pointer',fontSize:12,fontWeight:700}}>Cancelar</button>
              <button onClick={()=>enviarMsg(sendModal)} style={{flex:1,padding:'9px',borderRadius:8,border:'none',background:'#25d366',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                <MessageCircle size={13}/> Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <div style={{fontSize:11,color:p,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:2}}>Mi gestión</div>
          <h2 style={{margin:0,fontSize:20,fontWeight:800,color:'#1e293b'}}>Mis Clientes y Leads</h2>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={openNew}
            style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:9,border:'none',background:p,color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>
            <Plus size={13}/> Nuevo cliente
          </button>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..."
            style={{padding:'8px 14px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:12,outline:'none',width:180}}/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {[
          {k:'clientes', l:`Mis Clientes (${clients.length})`},
          {k:'leads',    l:`Mis Leads (${leads.length})`},
        ].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            style={{padding:'8px 16px',borderRadius:8,border:'none',fontSize:12,fontWeight:700,cursor:'pointer',
              background:tab===t.k?p:'#f1f5f9',color:tab===t.k?'#fff':'#64748b'}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Modal editar/crear cliente */}
      {editModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{background:'#fff',borderRadius:20,padding:28,width:460,boxShadow:'0 24px 60px rgba(0,0,0,0.2)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{margin:0,fontSize:17,fontWeight:800,color:'#1e293b'}}>{editModal==='new'?'Nuevo cliente':'Editar cliente'}</h3>
              <button onClick={()=>setEditModal(null)} style={{border:'none',background:'#f1f5f9',borderRadius:8,padding:7,cursor:'pointer',display:'flex'}}><X size={14} color="#64748b"/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
              {[{l:'Nombre *',k:'name',t:'text'},{l:'Teléfono *',k:'phone',t:'tel'},{l:'Email',k:'email',t:'email'}].map(f=>(
                <div key={f.k}>
                  <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,marginBottom:4}}>{f.l.toUpperCase()}</div>
                  <input type={f.t} value={form[f.k]} onChange={e=>setForm(x=>({...x,[f.k]:e.target.value}))}
                    style={{width:'100%',padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:9,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
                </div>
              ))}
              <div>
                <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,marginBottom:4}}>TEMPERATURA</div>
                <div style={{display:'flex',gap:8}}>
                  {[{v:'caliente',l:'🔥 Caliente',c:'#ef4444'},{v:'tibio',l:'🌡️ Tibio',c:'#f59e0b'},{v:'frio',l:'❄️ Frío',c:'#4f6ef7'}].map(h=>(
                    <button key={h.v} onClick={()=>setForm(x=>({...x,heat:h.v}))}
                      style={{flex:1,padding:'8px',borderRadius:8,border:`2px solid ${form.heat===h.v?h.c:'#e2e8f0'}`,background:form.heat===h.v?`${h.c}15`:'#fff',color:form.heat===h.v?h.c:'#94a3b8',fontWeight:700,fontSize:11,cursor:'pointer'}}>
                      {h.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,marginBottom:4}}>NOTAS</div>
                <textarea value={form.notes} onChange={e=>setForm(x=>({...x,notes:e.target.value}))} rows={3}
                  style={{width:'100%',padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:9,fontSize:13,outline:'none',resize:'none',boxSizing:'border-box'}}/>
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setEditModal(null)} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#64748b',fontWeight:700,cursor:'pointer',fontSize:13}}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{flex:2,padding:'10px',borderRadius:10,border:'none',background:p,color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13}}>
                {saving?'Guardando...':'✓ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal concepto de pérdida */}
      {lossModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{background:'#fff',borderRadius:20,padding:28,width:420,boxShadow:'0 24px 60px rgba(0,0,0,0.2)'}}>
            <h3 style={{margin:'0 0 16px',fontSize:16,fontWeight:800,color:'#1e293b'}}>Concepto de pérdida</h3>
            <div style={{fontSize:12,color:'#64748b',marginBottom:12}}>{lossModal.name}</div>
            <textarea id="loss-concepto" rows={4} placeholder="Describe por qué se perdió este cliente..."
              style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:9,fontSize:13,outline:'none',resize:'none',boxSizing:'border-box',marginBottom:14}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setLossModal(null)} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#64748b',fontWeight:700,cursor:'pointer'}}>Cancelar</button>
              <button onClick={()=>{const v=document.getElementById('loss-concepto').value.trim();if(!v)return;marcarPerdido(lossModal,v);}}
                style={{flex:2,padding:'10px',borderRadius:10,border:'none',background:'#ef4444',color:'#fff',fontWeight:700,cursor:'pointer'}}>Confirmar pérdida</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación de venta ganada */}
      {winModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{background:'#fff',borderRadius:20,padding:28,width:420,boxShadow:'0 24px 60px rgba(0,0,0,0.2)'}}>
            <h3 style={{margin:'0 0 16px',fontSize:16,fontWeight:800,color:'#10b981'}}>✓ Marcar como Ganado</h3>
            <div style={{fontSize:12,color:'#64748b',marginBottom:12}}>{winModal.name}</div>
            <textarea id="win-concepto" rows={3} placeholder="Detalle de la venta (opcional)..."
              style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:9,fontSize:13,outline:'none',resize:'none',boxSizing:'border-box',marginBottom:14}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setWinModal(null)} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#64748b',fontWeight:700,cursor:'pointer'}}>Cancelar</button>
              <button onClick={()=>{const v=document.getElementById('win-concepto').value.trim();marcarGanado(winModal,v||'Venta cerrada');}}
                style={{flex:2,padding:'10px',borderRadius:10,border:'none',background:'#10b981',color:'#fff',fontWeight:700,cursor:'pointer'}}>✓ Confirmar venta</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>Cargando...</div>
      ) : tab==='clientes' ? (
        <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Cliente','Teléfono','Temperatura','Estado','Acciones'].map(h=>(
                <th key={h} style={{padding:'10px 14px',fontSize:10,fontWeight:700,color:'#94a3b8',textAlign:'left'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filteredC.map((c,i)=>{
                const heatCfg = {caliente:{c:'#ef4444',bg:'#fff5f5',l:'🔥 Caliente'},tibio:{c:'#f59e0b',bg:'#fffbeb',l:'🌡️ Tibio'},frio:{c:'#4f6ef7',bg:'#f0f1ff',l:'❄️ Frío'}}[c.heat||'tibio']||{c:'#94a3b8',bg:'#f1f5f9',l:'—'};
                return(
                  <tr key={i} style={{borderTop:'1px solid #f8fafc'}}>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{c.name}</div>
                      <div style={{fontSize:11,color:'#94a3b8'}}>{c.email||c.phone}</div>
                    </td>
                    <td style={{padding:'10px 14px',fontSize:12,color:'#64748b'}}>{c.phone}</td>
                    <td style={{padding:'10px 14px'}}>
                      <span style={{background:heatCfg.bg,color:heatCfg.c,padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:700}}>{heatCfg.l}</span>
                    </td>
                    <td style={{padding:'10px 14px'}}>
                      {c.result==='won'  && <span style={{color:'#10b981',fontWeight:700,fontSize:12}}>✓ Ganado</span>}
                      {c.result==='lost' && <span style={{color:'#ef4444',fontWeight:700,fontSize:12}}>✗ Perdido</span>}
                      {!c.result         && <span style={{color:'#f59e0b',fontWeight:700,fontSize:12}}>● En proceso</span>}
                    </td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                        <button onClick={()=>openEdit(c)} style={{padding:'4px 9px',borderRadius:6,border:'none',background:'#eef2ff',color:p,fontWeight:700,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>
                          <Edit2 size={10}/> Editar
                        </button>
                        {!c.result&&<button onClick={()=>setWinModal(c)} style={{padding:'4px 9px',borderRadius:6,border:'none',background:'#d1fae5',color:'#10b981',fontWeight:700,fontSize:11,cursor:'pointer'}}>Ganado</button>}
                        {!c.result&&<button onClick={()=>setLossModal(c)} style={{padding:'4px 9px',borderRadius:6,border:'none',background:'#fef2f2',color:'#ef4444',fontWeight:700,fontSize:11,cursor:'pointer'}}>Perdido</button>}
                        <button onClick={()=>setSendModal(c)} style={{padding:'4px 9px',borderRadius:6,border:'none',background:'#f0fdf9',color:'#059669',fontWeight:700,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>
                          <MessageCircle size={10}/> WA
                        </button>
                        <button onClick={()=>eliminar(c)} style={{padding:'4px 9px',borderRadius:6,border:'none',background:'#fef2f2',color:'#ef4444',fontWeight:700,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>
                          <Trash2 size={10}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredC.length===0&&<tr><td colSpan={5} style={{padding:24,textAlign:'center',color:'#94a3b8',fontSize:12}}>Sin clientes asignados a ti</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Lead','Teléfono','Nivel','Score','Canal','Fecha'].map(h=>(
                <th key={h} style={{padding:'10px 14px',fontSize:10,fontWeight:700,color:'#94a3b8',textAlign:'left'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filteredL.map((l,i)=>{
                const nc={caliente:{c:'#ef4444',b:'#fff5f5'},tibio:{c:'#f59e0b',b:'#fffbeb'},frio:{c:'#4f6ef7',b:'#f0f1ff'}}[l.nivel]||{c:'#94a3b8',b:'#f1f5f9'};
                return(
                  <tr key={i} style={{borderTop:'1px solid #f8fafc'}}>
                    <td style={{padding:'10px 14px',fontSize:13,fontWeight:700,color:'#1e293b'}}>{l.nombre}</td>
                    <td style={{padding:'10px 14px',fontSize:12,color:'#64748b'}}>{l.telefono}</td>
                    <td style={{padding:'10px 14px'}}><span style={{background:nc.b,color:nc.c,padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700,textTransform:'capitalize'}}>{l.nivel}</span></td>
                    <td style={{padding:'10px 14px',fontSize:12,fontWeight:700,color:'#1e293b'}}>{l.score}/100</td>
                    <td style={{padding:'10px 14px',fontSize:11,color:'#64748b'}}>{l.canal||'WhatsApp'}</td>
                    <td style={{padding:'10px 14px',fontSize:11,color:'#94a3b8'}}>{l.created_at?new Date(l.created_at).toLocaleDateString('es-EC'):'—'}</td>
                  </tr>
                );
              })}
              {filteredL.length===0&&<tr><td colSpan={6} style={{padding:24,textAlign:'center',color:'#94a3b8',fontSize:12}}>Sin leads asignados a ti</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB ACTIVIDADES SUPERVISOR — registro personal de actividades
═══════════════════════════════════════════════════════════════════ */
function TabActividadesSupervisor({ clients }) {
  const p = DS.primary;
  const TIPOS = {
    llamada:       { l:'Llamada',     c:'#4f6ef7', Icon:Phone          },
    reunion:       { l:'Reunión',     c:'#8b5cf6', Icon:Users          },
    email:         { l:'Email',       c:'#f59e0b', Icon:MessageSquare  },
    visita:        { l:'Visita',      c:'#10b981', Icon:Target         },
    nota:          { l:'Nota',        c:'#64748b', Icon:FileText       },
  };
  const [acts, setActs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ clientId:'', type:'llamada', resultado:'', notas:'', duration:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('GET', '/api/supervisor/my-activities')
      .then(r => { setActs(Array.isArray(r)?r:[]); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function registrar() {
    if (!form.notas.trim()) return alert('Escribe una nota o resultado');
    setSaving(true);
    try {
      const r = await apiFetch('POST', '/api/supervisor/my-activities', {
        ...form, duration: parseInt(form.duration)||0
      });
      setActs(prev => [r, ...prev]);
      setModal(false);
      setForm({ clientId:'', type:'llamada', resultado:'', notas:'', duration:'' });
    } catch(e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  const inp = { width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box' };

  return (
    <div>
      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{background:'#fff',borderRadius:20,padding:28,width:460,boxShadow:'0 24px 60px rgba(0,0,0,0.2)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <h3 style={{margin:0,fontSize:17,fontWeight:800,color:'#1e293b'}}>Registrar actividad</h3>
              <button onClick={()=>setModal(false)} style={{border:'none',background:'#f1f5f9',borderRadius:8,padding:7,cursor:'pointer',display:'flex'}}><X size={14} color="#64748b"/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
              <div>
                <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,marginBottom:6}}>TIPO DE ACTIVIDAD</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {Object.entries(TIPOS).map(([k,v])=>(
                    <button key={k} onClick={()=>setForm(x=>({...x,type:k}))}
                      style={{padding:'7px 12px',borderRadius:8,border:`2px solid ${form.type===k?v.c:'#e2e8f0'}`,background:form.type===k?`${v.c}12`:'#fff',color:form.type===k?v.c:'#94a3b8',fontWeight:700,fontSize:11,cursor:'pointer'}}>
                      {v.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,marginBottom:4}}>CLIENTE (OPCIONAL)</div>
                <select value={form.clientId} onChange={e=>setForm(x=>({...x,clientId:e.target.value}))} style={{...inp,cursor:'pointer'}}>
                  <option value=''>Sin cliente específico</option>
                  {(clients||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,marginBottom:4}}>RESULTADO</div>
                <input value={form.resultado} onChange={e=>setForm(x=>({...x,resultado:e.target.value}))} placeholder="Ej: Acordó reunión para la próxima semana" style={inp}/>
              </div>
              <div>
                <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,marginBottom:4}}>NOTAS *</div>
                <textarea value={form.notas} onChange={e=>setForm(x=>({...x,notas:e.target.value}))} rows={3} placeholder="Describe lo que ocurrió..." style={{...inp,resize:'none'}}/>
              </div>
              <div>
                <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,marginBottom:4}}>DURACIÓN (minutos)</div>
                <input type="number" value={form.duration} onChange={e=>setForm(x=>({...x,duration:e.target.value}))} placeholder="0" style={{...inp,width:'30%'}}/>
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setModal(false)} style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#64748b',fontWeight:700,cursor:'pointer'}}>Cancelar</button>
              <button onClick={registrar} disabled={saving} style={{flex:2,padding:'10px',borderRadius:10,border:'none',background:p,color:'#fff',fontWeight:700,cursor:'pointer'}}>
                {saving?'Guardando...':'✓ Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <div style={{fontSize:11,color:p,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:4}}>Supervisor</div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:'#1e293b'}}>Mis Actividades</h1>
        </div>
        <button onClick={()=>setModal(true)} style={{padding:'10px 18px',borderRadius:10,border:'none',background:p,color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:7}}>
          <Plus size={14}/> Registrar actividad
        </button>
      </div>

      {/* Resumen */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {Object.entries(TIPOS).slice(0,4).map(([k,v])=>{
          const cnt = acts.filter(a=>a.type===k).length;
          return(
            <div key={k} style={{background:'#fff',borderRadius:14,padding:'16px',border:`1px solid ${v.c}20`,borderTop:`3px solid ${v.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                {v.Icon && <v.Icon size={16} color={v.c}/>}
                <span style={{fontSize:11,fontWeight:700,color:v.c,textTransform:'uppercase',letterSpacing:0.5}}>{v.l}</span>
              </div>
              <div style={{fontSize:28,fontWeight:800,color:v.c,lineHeight:1}}>{cnt}</div>
            </div>
          );
        })}
      </div>

      {/* Lista */}
      <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',overflow:'hidden'}}>
        {loading && <div style={{padding:32,textAlign:'center',color:'#94a3b8'}}>Cargando...</div>}
        {!loading && acts.length===0 && <div style={{padding:32,textAlign:'center',color:'#94a3b8'}}>Sin actividades registradas. ¡Registra tu primera!</div>}
        {acts.map((a,i)=>{
          const t = TIPOS[a.type]||TIPOS.nota;
          return(
            <div key={a.id||i} style={{display:'flex',gap:14,padding:'14px 20px',borderBottom:'1px solid #f8fafc',alignItems:'flex-start'}}>
              <div style={{width:38,height:38,borderRadius:10,background:`${t.c}12`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {t.Icon && <t.Icon size={16} color={t.c} strokeWidth={2}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                  <span style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{t.l}{a.client_name?` — ${a.client_name}`:''}</span>
                  <span style={{fontSize:11,color:'#94a3b8'}}>{a.created_at?new Date(a.created_at).toLocaleString('es-EC',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):''}</span>
                </div>
                {a.resultado&&<div style={{fontSize:12,color:t.c,fontWeight:600,marginBottom:2}}>Resultado: {a.resultado}</div>}
                {a.notas&&<div style={{fontSize:12,color:'#64748b',lineHeight:1.5}}>{a.notas}</div>}
                {a.duration>0&&<div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>⏱ {a.duration} min</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB ACTIVIDADES EQUIPO — ve lo que hace todo el equipo
═══════════════════════════════════════════════════════════════════ */
function TabActividadesEquipo({ asesores }) {
  const p = DS.primary;
  const TIPOS = {
    llamada:       { l:'Llamada',          c:'#4f6ef7', Icon:Phone          },
    reunion:       { l:'Reunión',          c:'#8b5cf6', Icon:Users          },
    email:         { l:'Email',            c:'#f59e0b', Icon:MessageSquare  },
    visita:        { l:'Visita',           c:'#10b981', Icon:Target         },
    nota:          { l:'Nota',             c:'#64748b', Icon:FileText       },
    mensaje_wa:    { l:'Mensaje WA',       c:'#25d366', Icon:MessageCircle  },
    cambio_estado: { l:'Cambio de estado', c:'#ef4444', Icon:RefreshCw      },
  };
  const [acts,    setActs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro,  setFiltro]  = useState('all');
  const [filtroT, setFiltroT] = useState('all');

  useEffect(() => {
    apiFetch('GET', '/api/supervisor/team-activities')
      .then(r => { setActs(Array.isArray(r)?r:[]); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const asesorNombres = [...new Set(acts.map(a=>a.advisor_name).filter(Boolean))];
  const filtered = acts.filter(a =>
    (filtro==='all' || a.advisor_name===filtro) &&
    (filtroT==='all' || a.type===filtroT)
  );

  const byAsesor = asesorNombres.map(n=>({
    name: n,
    total: acts.filter(a=>a.advisor_name===n).length,
    hoy:   acts.filter(a=>a.advisor_name===n && new Date(a.created_at).toDateString()===new Date().toDateString()).length,
  }));

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,color:p,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:4}}>Supervisor · Equipo</div>
        <h1 style={{margin:0,fontSize:22,fontWeight:800,color:'#1e293b'}}>Actividades del Equipo</h1>
        <p style={{margin:'4px 0 0',fontSize:13,color:'#94a3b8'}}>Todo lo que registra tu equipo de asesores</p>
      </div>

      {/* Resumen por asesor */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        {byAsesor.map((a,i)=>(
          <div key={i}
            onClick={()=>setFiltro(filtro===a.name?'all':a.name)}
            style={{background:'#fff',borderRadius:14,padding:'16px',border:`2px solid ${filtro===a.name?p:'#eaecf0'}`,cursor:'pointer',transition:'all .2s',boxShadow:filtro===a.name?`0 6px 20px ${p}20`:'none'}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:p,marginBottom:10}}>{a.name?.charAt(0)?.toUpperCase()}</div>
            <div style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>{a.name?.split(' ')[0]}</div>
            <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>{a.total} actividades · {a.hoy} hoy</div>
          </div>
        ))}
        {byAsesor.length===0&&!loading&&<div style={{gridColumn:'1/-1',padding:'24px',textAlign:'center',color:'#94a3b8',fontSize:13}}>Sin actividades registradas por el equipo</div>}
      </div>

      {/* Filtros */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        <button onClick={()=>setFiltro('all')} style={{padding:'6px 14px',borderRadius:8,border:'none',fontSize:12,fontWeight:700,cursor:'pointer',background:filtro==='all'?p:'#f1f5f9',color:filtro==='all'?'#fff':'#64748b'}}>Todos</button>
        {asesorNombres.map(n=>(
          <button key={n} onClick={()=>setFiltro(filtro===n?'all':n)} style={{padding:'6px 14px',borderRadius:8,border:'none',fontSize:12,fontWeight:700,cursor:'pointer',background:filtro===n?p:'#f1f5f9',color:filtro===n?'#fff':'#64748b'}}>{n.split(' ')[0]}</button>
        ))}
        <div style={{height:1,width:'100%'}}/>
        {['all',...Object.keys(TIPOS)].map(k=>{
          const t = k==='all'?{l:'Todos los tipos',c:'#64748b'}:TIPOS[k];
          return <button key={k} onClick={()=>setFiltroT(k)} style={{padding:'6px 14px',borderRadius:8,border:'none',fontSize:11,fontWeight:700,cursor:'pointer',background:filtroT===k?t.c:'#f1f5f9',color:filtroT===k?'#fff':'#64748b'}}>{k==='all'?'Todos':t.l}</button>;
        })}
      </div>

      {/* Lista */}
      <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',overflow:'hidden'}}>
        {loading && <div style={{padding:32,textAlign:'center',color:'#94a3b8'}}>Cargando actividades...</div>}
        {!loading && filtered.length===0 && <div style={{padding:32,textAlign:'center',color:'#94a3b8'}}>Sin actividades con los filtros actuales</div>}
        {filtered.map((a,i)=>{
          const t = TIPOS[a.type]||TIPOS.nota;
          return(
            <div key={a.id||i} style={{display:'flex',gap:14,padding:'14px 20px',borderBottom:'1px solid #f8fafc',alignItems:'flex-start'}}>
              <div style={{width:38,height:38,borderRadius:10,background:`${t.c}12`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {t.Icon && <t.Icon size={16} color={t.c} strokeWidth={2}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:3}}>
                  <div>
                    <span style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{t.l}</span>
                    {a.client_name&&<span style={{fontSize:12,color:'#94a3b8'}}> · {a.client_name}</span>}
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:11,color:'#94a3b8'}}>{a.created_at?new Date(a.created_at).toLocaleString('es-EC',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):''}</div>
                    <div style={{fontSize:11,fontWeight:700,color:p}}>{a.advisor_name}</div>
                  </div>
                </div>
                {a.resultado&&<div style={{fontSize:12,color:t.c,fontWeight:600,marginBottom:2}}>↳ {a.resultado}</div>}
                {a.notas&&<div style={{fontSize:12,color:'#64748b',lineHeight:1.5}}>{a.notas}</div>}
                {a.duration>0&&<div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>⏱ {a.duration} min</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardSupervisor({user,currentView,onNavigate,primary='#4f6ef7',pageBg='#f0f4ff',cardBg='#ffffff',cardBorder,cardShadow}) {
  DS = makeDS(primary);
  CB = cardBg || '#ffffff'; // update module-level for sub-components
  CBorder = cardBorder || `${primary}20`;
  CShadow = cardShadow || `0 2px 12px ${primary}14`;
  MOB = window.innerWidth < 768;
  const [clients,  setClients]  = React.useState([]);
  const [events,   setEvents]   = React.useState([]);
  const [leads,    setLeads]    = React.useState([]);
  const [asesores, setAsesores] = React.useState([]);
  const [stats,    setStats]    = React.useState(null);
  const [users,    setUsers]    = React.useState([]);
  const [selectedContact, setSelectedContact] = React.useState(null);
  const [confirmDlg, setConfirmDlg] = React.useState(null);
  const [teamActivities, setTeamActivities] = React.useState([]);
  _setConfirmS = setConfirmDlg;

  const nav  = onNavigate || (() => {});
  const view = currentView || 'dashboard';

  const cargar = useCallback(async () => {
    try {
      const [statsRes, clientsRes, asesoresRes, leadsRes, contactsRes, calRes, teamActRes] = await Promise.all([
        apiFetch('GET','/api/supervisor/stats').catch(()=>null),
        apiFetch('GET','/api/supervisor/clients?limit=200').catch(()=>[]),
        apiFetch('GET','/api/supervisor/asesores').catch(()=>[]),
        apiFetch('GET','/api/supervisor/leads').catch(()=>[]),
        apiFetch('GET','/api/supervisor/contacts').catch(()=>[]),
        apiFetch('GET','/api/supervisor/calendar').catch(()=>[]),
        apiFetch('GET','/api/supervisor/team-activities').catch(()=>[]),
      ]);
      if (statsRes) setStats(statsRes);
      if (Array.isArray(contactsRes) && contactsRes.length>0) setUsers(contactsRes);
      if (Array.isArray(clientsRes) && clientsRes.length>0) {
        setClients(clientsRes.map(c=>({...c, result:c.metadata?.result||null, heat:c.heat||c.metadata?.heat||'tibio', producto:c.metadata?.producto||c.producto||'', asesor:c.advisor_name||c.asesor||'', asesorId:c.assigned_advisor_id||''})));
      }
      if (Array.isArray(asesoresRes) && asesoresRes.length>0) {
        setAsesores(asesoresRes.map(a=>({...a, active:a.status==='active', score:Math.min(100,Math.round(((parseInt(a.ganados)||0)/Math.max(parseInt(a.total_clients)||1,1))*100+50)), clients:parseInt(a.total_clients)||0, won:parseInt(a.ganados)||0, lost:parseInt(a.perdidos)||0})));
      }
      if (Array.isArray(leadsRes) && leadsRes.length>0) {
        setLeads(leadsRes.map(l=>({...l, nivel:l.nivel||'tibio', score:l.score||50, msgBot:l.msg_bot||'', asesor:l.advisor_name||'Sin asignar', asesorId:l.advisor_id||'', fecha:l.created_at})));
      }
      if (Array.isArray(calRes) && calRes.length>0) {
        setEvents(calRes.map(e=>({...e, date:e.event_date, time:e.event_time||'', cname:e.client_name||'—'})));
      }
      if (Array.isArray(teamActRes)) setTeamActivities(teamActRes);
    } catch(e) { console.error('Error cargando datos supervisor:', e.message); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <>
      {view === 'dashboard' && <TabDashboard  clients={clients} asesores={asesores} events={events} leads={leads} stats={stats} onNavigate={nav}/>}
      {view === 'clients'   && <TabClientes   clients={clients} setClients={setClients} asesores={asesores} />}
      {view === 'advisors'  && <TabAsesores   clients={clients} asesores={asesores} teamActivities={teamActivities} onNavigate={nav} onSelectContact={setSelectedContact} />}
      {view === 'sales'     && <TabVentas     clients={clients} asesores={asesores} />}
      {view === 'messages'  && <TabMensajes   users={users} initialContact={selectedContact} />}
      {view === 'reports'   && <TabReportes   clients={clients} />}
      {view === 'leads'     && <TabLeads      leads={leads} setLeads={setLeads} asesores={asesores} onRefresh={cargar} />}
      {view === 'calendar'  && <TabCalendario events={events} setEvents={setEvents} asesores={asesores} />}
      {view === 'pipeline'      && <TabPipelineSupervisor leads={leads} clients={clients} asesores={asesores} />}
      {view === 'mis_clientes'       && <TabMisClientes user={user}/>}
      {view === 'estadisticas'       && <TabEstadisticasPersonales stats={stats} leads={leads} clients={clients} events={events} onNavigate={nav}/>}
      {view === 'rendimiento_equipo' && <TabRendimientoEquipo clients={clients} asesores={asesores} leads={leads}/>}
      {view === 'conversaciones'     && <TabConversaciones leads={leads}/>}
      {view === 'mis_actividades'    && <TabActividadesSupervisor clients={clients}/>}
      {view === 'actividades_equipo' && <TabActividadesEquipo asesores={asesores}/>}
      {confirmDlg&&<ConfirmModal msg={confirmDlg.msg} onYes={confirmDlg.onYes} onClose={()=>setConfirmDlg(null)}/>}
    </>
  );
}
