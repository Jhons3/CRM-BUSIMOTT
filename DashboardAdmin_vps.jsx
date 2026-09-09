import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePaged, Pagination } from '../utils';
import {
  Users, Phone, MessageCircle, Calendar, BarChart2, Trophy,
  XCircle, Clock, TrendingUp, AlertCircle, Activity,
  UserCheck, Star, Download, RefreshCw, Eye,
  MessageSquare, CheckCircle, X, Search, Send,
  Zap, Bell, ChevronDown, ChevronUp, DollarSign,
  Edit2, Trash2, Plus, Shield, FileText,
  Lock, Save, ChevronRight, Settings, Folder,
  UserPlus, Grid, Flame, Thermometer, Snowflake, Target, Bot,
  FileSpreadsheet} from 'lucide-react';
function toWA(p){const r=(p||'').replace(/\D/g,'');return r.startsWith('593')?r:r.startsWith('0')&&r.length===10?'593'+r.substring(1):r.length===9?'593'+r:r;}
// DS is now a function that takes '#4f6ef7' color from props
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
let _setConfirmA = null;
function askConfirm(msg, onYes) { if (_setConfirmA) _setConfirmA({ msg, onYes }); }
function ConfirmModal({ msg, onYes, onClose }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,padding:'28px 32px',width:'min(340px,92vw)',boxShadow:'0 24px 64px rgba(0,0,0,0.18)',border:'1px solid #e2e8f0'}} onClick={e=>e.stopPropagation()}>
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
let MOB = false; // true cuando pantalla < 768px
const API = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '')
  : `${window.location.protocol}//${window.location.hostname}:3001`;
const tok = () => localStorage.getItem('crm_token');

// Funcion de exportacion
async function exportarCSV(tipo) {
  try {
    const token = localStorage.getItem('crm_token');
    const res = await fetch(`/api/export/${tipo}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error exportando');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${tipo}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch(err) {
    alert('Error al exportar: ' + err.message);
  }
}

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

/* ══════════════════════════ DATOS MOCK ══════════════════════════ */
const INIT_USERS = [
  { id:'u1', name:'María García',   email:'maria@empresa.com',   phone:'+525550001111', role:'asesor',     active:true,  pass:'demo123', created:'2024-09-01', lastLogin:'hace 20 min', ini:'MG' },
  { id:'u2', name:'Carlos Ruiz',    email:'carlos@empresa.com',  phone:'+525550002222', role:'asesor',     active:true,  pass:'demo123', created:'2024-10-15', lastLogin:'hace 1 h',   ini:'CR' },
  { id:'u3', name:'Ana Jiménez',    email:'ana@empresa.com',     phone:'+525550003333', role:'asesor',     active:false, pass:'demo123', created:'2024-08-20', lastLogin:'hace 3 días', ini:'AJ' },
  { id:'u4', name:'Luis Mendoza',   email:'luis@empresa.com',    phone:'+525550004444', role:'asesor',     active:true,  pass:'demo123', created:'2024-11-01', lastLogin:'hace 2 h',   ini:'LM' },
  { id:'u5', name:'Rosa Peña',      email:'rosa@empresa.com',    phone:'+525550005555', role:'supervisor', active:true,  pass:'demo123', created:'2024-07-10', lastLogin:'hace 5 min',  ini:'RP' },
  { id:'u6', name:'Jorge Salinas',  email:'jorge@empresa.com',   phone:'+525550006666', role:'supervisor', active:true,  pass:'demo123', created:'2024-06-01', lastLogin:'hace 30 min', ini:'JS' },
];

const INIT_EMPLOYEES = [
  { id:'e1', name:'María García',   puesto:'Asesor de ventas',  dept:'Ventas',         phone:'+525550001111', email:'maria@empresa.com',  ingreso:'2024-09-01', salario:'$18,000', status:'activo',   ini:'MG' },
  { id:'e2', name:'Carlos Ruiz',    puesto:'Asesor de ventas',  dept:'Ventas',         phone:'+525550002222', email:'carlos@empresa.com', ingreso:'2024-10-15', salario:'$18,000', status:'activo',   ini:'CR' },
  { id:'e3', name:'Ana Jiménez',    puesto:'Asesor senior',     dept:'Ventas',         phone:'+525550003333', email:'ana@empresa.com',    ingreso:'2024-08-20', salario:'$22,000', status:'inactivo', ini:'AJ' },
  { id:'e4', name:'Luis Mendoza',   puesto:'Asesor de ventas',  dept:'Ventas',         phone:'+525550004444', email:'luis@empresa.com',   ingreso:'2024-11-01', salario:'$18,000', status:'activo',   ini:'LM' },
  { id:'e5', name:'Rosa Peña',      puesto:'Supervisora',       dept:'Supervisión',    phone:'+525550005555', email:'rosa@empresa.com',   ingreso:'2024-07-10', salario:'$28,000', status:'activo',   ini:'RP' },
  { id:'e6', name:'Jorge Salinas',  puesto:'Supervisor',        dept:'Supervisión',    phone:'+525550006666', email:'jorge@empresa.com',  ingreso:'2024-06-01', salario:'$28,000', status:'activo',   ini:'JS' },
  { id:'e7', name:'Claudia Torres', puesto:'Recepcionista',     dept:'Administración', phone:'+525550007777', email:'claudia@empresa.com',ingreso:'2023-03-15', salario:'$14,000', status:'activo',   ini:'CT' },
];

const CLIENTS = [
  { id:'c1', name:'Roberto Sánchez', phone:'+52551234567', email:'roberto@gmail.com', asesor:'María García',  cls:'interested', result:null,   score:85, loss:null,                             updated:'hace 2 h'  },
  { id:'c2', name:'Laura Martínez',  phone:'+52339876543', email:'laura@corp.mx',     asesor:'Carlos Ruiz',   cls:'needs_info', result:null,   score:60, loss:null,                             updated:'hace 26 h' },
  { id:'c3', name:'Diego Ramírez',   phone:'+52815555444', email:null,                asesor:'María García',  cls:'interested', result:'won',  score:95, loss:null,                             updated:'hace 5 h'  },
  { id:'c4', name:'Sofía López',     phone:'+52557777888', email:'sofia@mail.mx',     asesor:'Luis Mendoza',  cls:'no_info',    result:'lost', score:20, loss:'Precio muy alto vs competencia', updated:'hace 2 días'},
  { id:'c5', name:'Miguel Torres',   phone:'+52331122334', email:'miguel@corp.mx',     asesor:'Ana Jiménez',   cls:'interested', result:null,   score:72, loss:null,                             updated:'hace 4 h'  },
  { id:'c6', name:'Carmen Vega',     phone:'+52554433221', email:'carmen@vega.mx',    asesor:'Ana Jiménez',   cls:'needs_info', result:'won',  score:78, loss:null,                             updated:'hace 6 h'  },
  { id:'c7', name:'Pedro Flores',    phone:'+52559988776', email:'pedro@flores.mx',   asesor:'Carlos Ruiz',   cls:'no_info',    result:'lost', score:15, loss:'Sin presupuesto por ahora',      updated:'hace 3 días'},
  { id:'c8', name:'Isabel Moreno',   phone:'+52553344556', email:'isabel@mx.com',     asesor:'Luis Mendoza',  cls:'interested', result:null,   score:65, loss:null,                             updated:'hace 8 h'  },
];

const ASESOR_ACTS = [
  { id:'a1', asesor:'María García', tipo:'llamada',  desc:'Llamada con Roberto Sánchez — 4:12 min',    resultado:'Interesado',     color:'#4f6ef7', Icon_t:'phone',    time:'hace 1 h'   },
  { id:'a2', asesor:'Carlos Ruiz',  tipo:'mensaje',  desc:'WhatsApp enviado a Laura Martínez',          resultado:'Pendiente',      color:'#25d366', Icon_t:'msg',      time:'hace 2 h'   },
  { id:'a3', asesor:'Ana Jiménez',  tipo:'cita',     desc:'Cita agendada con Miguel Torres — 20 ene',  resultado:'Agendado',       color:'#f59e0b', Icon_t:'calendar', time:'hace 3 h'   },
  { id:'a4', asesor:'Luis Mendoza', tipo:'llamada',  desc:'Llamada con Isabel Moreno — 2:45 min',       resultado:'Nec. info',      color:'#4f6ef7', Icon_t:'phone',    time:'hace 4 h'   },
  { id:'a5', asesor:'María García', tipo:'venta',    desc:'¡Cierre! Diego Ramírez firmó contrato',      resultado:'Ganado',         color:'#10b981', Icon_t:'trophy',   time:'hace 5 h'   },
  { id:'a6', asesor:'Carlos Ruiz',  tipo:'perdida',  desc:'Pedro Flores marcado como perdido',          resultado:'Perdido',        color:'#ef4444', Icon_t:'x',        time:'hace 6 h'   },
  { id:'a7', asesor:'Ana Jiménez',  tipo:'venta',    desc:'Carmen Vega cerrada exitosamente',           resultado:'Ganado',         color:'#10b981', Icon_t:'trophy',   time:'hace 7 h'   },
  { id:'a8', asesor:'Luis Mendoza', tipo:'mensaje',  desc:'Recordatorio enviado a Sofía López',         resultado:'Sin info',       color:'#ef4444', Icon_t:'msg',      time:'hace 8 h'   },
  { id:'a9', asesor:'María García', tipo:'cita',     desc:'Reagendó cita con Roberto — 22 ene',         resultado:'Agendado',       color:'#f59e0b', Icon_t:'calendar', time:'hace 9 h'   },
  { id:'a10',asesor:'Carlos Ruiz',  tipo:'llamada',  desc:'Segunda llamada Laura Martínez — 6:20 min',  resultado:'Interesado',     color:'#4f6ef7', Icon_t:'phone',    time:'hace 10 h'  },
];

const SUP_ACTS = [
  { id:'s1', tipo:'revision',  desc:'Revisó performance de María García — Score 88',         color:'#0ea5e9', time:'hace 30 min' },
  { id:'s2', tipo:'mensaje',   desc:'Envió feedback a Carlos Ruiz sobre su seguimiento',     color:'#4f6ef7', time:'hace 2 h'   },
  { id:'s3', tipo:'reporte',   desc:'Generó reporte mensual del equipo — Enero 2025',        color:'#8b5cf6', time:'hace 4 h'   },
  { id:'s4', tipo:'calendario',desc:'Agendó reunión de equipo para el 20 de enero',           color:'#f59e0b', time:'hace 5 h'   },
  { id:'s5', tipo:'alerta',    desc:'Envió alerta de bajo rendimiento a Luis Mendoza',        color:'#ef4444', time:'hace 7 h'   },
  { id:'s6', tipo:'aprobacion',desc:'Aprobó descuento 10% solicitado por María García',       color:'#10b981', time:'hace 9 h'   },
  { id:'s7', tipo:'revision',  desc:'Revisó historial de llamadas — 35 llamadas semana',     color:'#0ea5e9', time:'hace 12 h'  },
  { id:'s8', tipo:'reporte',   desc:'Exportó CSV de clientes perdidos con razones',           color:'#8b5cf6', time:'hace 1 día' },
];

const VENTAS_MES = {
  Ene:{ ventas:3,  perdidas:1, monto:54000  },
  Feb:{ ventas:5,  perdidas:2, monto:90000  },
  Mar:{ ventas:4,  perdidas:1, monto:72000  },
  Abr:{ ventas:7,  perdidas:3, monto:126000 },
  May:{ ventas:6,  perdidas:2, monto:108000 },
  Jun:{ ventas:8,  perdidas:2, monto:144000 },
  Jul:{ ventas:5,  perdidas:3, monto:90000  },
  Ago:{ ventas:9,  perdidas:1, monto:162000 },
  Sep:{ ventas:11, perdidas:2, monto:198000 },
  Oct:{ ventas:8,  perdidas:4, monto:144000 },
  Nov:{ ventas:12, perdidas:2, monto:216000 },
  Dic:{ ventas:10, perdidas:3, monto:180000 },
};
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const CLS_CFG = {
  interested: { label:'Interesado',    color:'#10b981', bg:'#d1fae5' },
  needs_info: { label:'Nec. info',     color:'#f59e0b', bg:'#fef3c7' },
  no_info:    { label:'Sin info',      color:'#ef4444', bg:'#fee2e2' },
};

/* ══════════════════════════ UI ATOMS ══════════════════════════ */
function Av({ ini, color='#4f6ef7', size=34 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:`${color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.33, fontWeight:800, color, flexShrink:0 }}>
      {ini}
    </div>
  );
}

function Tag({ label, color, bg }) {
  return <span style={{ padding:'2px 9px', borderRadius:999, fontSize:11, fontWeight:700, color, background:bg, whiteSpace:'nowrap' }}>{label}</span>;
}

function Card({ title, Icon, iconColor='#4f6ef7', children, action, raw }) {
  return (
    <div style={{ background:CB, borderRadius:14, border:`1px solid ${DS.primary}18`, overflow:'hidden' }}>
      {title && (
        <div style={{ padding:'13px 18px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', display:'flex', alignItems:'center', gap:7 }}>
            <Icon size={14} color={iconColor}/> {title}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: raw ? 0 : 18 }}>{children}</div>
    </div>
  );
}

function BarChart({ data, color='#4f6ef7', hl }) {
  const max = Math.max(...data) || 1;
  return (
    <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:72 }}>
      {data.map((v,i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <div style={{ width:'100%', background:`${color}18`, borderRadius:4, height:60, display:'flex', alignItems:'flex-end' }}>
            <div style={{ width:'100%', background: i===hl ? '#f59e0b' : color, borderRadius:4, height:`${(v/max)*100}%` }}/>
          </div>
          <div style={{ fontSize:7, color:'#9aa5be', fontWeight:600 }}>{MESES[i]}</div>
        </div>
      ))}
    </div>
  );
}

function ActIcon({ tipo, color }) {
  const icons = { phone:Phone, msg:MessageCircle, calendar:Calendar, trophy:Trophy, x:XCircle };
  const Ic = icons[tipo] || Activity;
  return (
    <div style={{ width:34, height:34, borderRadius:9, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <Ic size={15} color={color}/>
    </div>
  );
}

function fmt(n) { return '$'+Number(n).toLocaleString('es-MX'); }

/* ══════════════════════════ MENSAJES (interno) ══════════════════════════ */
const INIT_MSGS = [
  { id:'m1', de:'u5', deNombre:'Rosa Peña',     deRol:'supervisor', para:'admin', texto:'El equipo cumplió el 80% de la meta esta semana.', hora:'hace 30 min', leido:false },
  { id:'m2', de:'u1', deNombre:'María García',  deRol:'asesor',     para:'admin', texto:'¿Puedo hacer un descuento especial a Roberto?',     hora:'hace 2 h',   leido:false },
  { id:'m3', de:'admin', deNombre:'Admin',       deRol:'admin',     para:'u5',    texto:'Excelente trabajo Rosa, sigan así.',                hora:'hace 4 h',   leido:true  },
  { id:'m4', de:'u6', deNombre:'Jorge Salinas', deRol:'supervisor', para:'admin', texto:'¿Puedo añadir un nuevo asesor esta semana?',         hora:'hace 6 h',   leido:true  },
];

const INIT_LEADS_ADMIN = [
  { id:'la1', nombre:'Andrés Castillo', telefono:'+52551098765', email:'andres@gmail.com',    msgBot:'Vi su anuncio, me interesa el plan premium.',        nivel:'caliente', score:90, asesor:'María García', origen:'WhatsApp Bot', fecha:new Date(Date.now()-1*3600000).toISOString()  },
  { id:'la2', nombre:'Patricia Núñez',  telefono:'+52339012345', email:'patricia@corp.mx',    msgBot:'¿Pueden enviarme información sobre sus planes?',     nivel:'caliente', score:82, asesor:'Carlos Ruiz',  origen:'WhatsApp Bot', fecha:new Date(Date.now()-2*3600000).toISOString()  },
  { id:'la3', nombre:'Fernando Reyes',  telefono:'+52554567890', email:'',                    msgBot:'Me recomendaron su empresa, quisiera cotización.',    nivel:'caliente', score:78, asesor:'María García', origen:'WhatsApp Bot', fecha:new Date(Date.now()-4*3600000).toISOString()  },
  { id:'la4', nombre:'Claudia Herrera', telefono:'+52813456789', email:'claudia@hotmail.com', msgBot:'¿Cuánto cuesta el plan básico?',                     nivel:'tibio',    score:55, asesor:'Luis Mendoza', origen:'WhatsApp Bot', fecha:new Date(Date.now()-6*3600000).toISOString()  },
  { id:'la5', nombre:'Ricardo Méndez',  telefono:'+52556789012', email:'ricardo@empresa.com', msgBot:'Hola, quiero información general.',                  nivel:'tibio',    score:50, asesor:'Ana Jiménez',  origen:'WhatsApp Bot', fecha:new Date(Date.now()-8*3600000).toISOString()  },
  { id:'la6', nombre:'Valentina Cruz',  telefono:'+52332345678', email:'',                    msgBot:'¿Tienen soporte en español?',                        nivel:'tibio',    score:42, asesor:'Carlos Ruiz',  origen:'WhatsApp Bot', fecha:new Date(Date.now()-10*3600000).toISOString() },
  { id:'la7', nombre:'Jorge Ponce',     telefono:'+52557890123', email:'',                    msgBot:'Ok',                                                 nivel:'frio',     score:18, asesor:'Luis Mendoza', origen:'WhatsApp Bot', fecha:new Date(Date.now()-14*3600000).toISOString() },
  { id:'la8', nombre:'Mónica Vargas',   telefono:'+52551234000', email:'',                    msgBot:'¿Esto es real o spam?',                              nivel:'frio',     score:12, asesor:'María García', origen:'WhatsApp Bot', fecha:new Date(Date.now()-18*3600000).toISOString() },
  { id:'la9', nombre:'Alejandro Ponce', telefono:'+52339876001', email:'',                    msgBot:'No gracias, solo curioseando.',                       nivel:'frio',     score:5,  asesor:'Ana Jiménez',  origen:'WhatsApp Bot', fecha:new Date(Date.now()-24*3600000).toISOString() },
];
const LEAD_COLS_ADMIN = {
  caliente:{ label:'Caliente', sub:'Muy interesados',          color:'#ef4444', bg:'#fff5f5', border:'#fecaca' },
  tibio:   { label:'Tibio',   sub:'Medianamente interesado', color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
  frio:    { label:'Frío',    sub:'Poco interés / poca info', color:'#4f6ef7', bg:'#f0f1ff', border:'#c7d2fe' },
};
const ago = d => { const s=(Date.now()-new Date(d))/1000; if(s<60)return 'ahora'; if(s<3600)return `${Math.floor(s/60)}m`; if(s<86400)return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`; };

/* ══════════════════════════ TAB DASHBOARD ══════════════════════════ */

// ── Botón de exportación reutilizable ────────────────────────────────────────
function ExportMenu({ endpoint, label = 'Exportar', color }) {
  const p = color || DS.primary;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef();

  React.useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function doExport(fmt) {
    setOpen(false);
    const token = localStorage.getItem('crm_token');
    const url = `/api/export/${endpoint}?format=${fmt}`;
    fetch(url, { headers:{ Authorization:`Bearer ${token}` }})
      .then(r => {
        if (!r.ok) throw new Error('Error al exportar');
        return r.blob();
      })
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${endpoint}.${fmt === 'csv' ? 'csv' : 'xlsx'}`;
        a.click();
      })
      .catch(e => alert('Error: ' + e.message));
  }

  return (
    <div ref={ref} style={{position:'relative',display:'inline-block'}}>
      <button onClick={()=>setOpen(!open)}
        style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:`1px solid ${p}30`,
          background:`${p}08`,color:p,fontWeight:700,fontSize:12,cursor:'pointer',transition:'all .15s'}}
        onMouseEnter={e=>{e.currentTarget.style.background=`${p}15`;}}
        onMouseLeave={e=>{e.currentTarget.style.background=`${p}08`;}}>
        <Download size={13}/> {label} <ChevronDown size={11}/>
      </button>
      {open && (
        <div style={{position:'absolute',right:0,top:'110%',background:'#fff',borderRadius:10,
          boxShadow:'0 8px 24px rgba(0,0,0,0.12)',border:'1px solid #eaecf0',zIndex:999,minWidth:160,overflow:'hidden'}}>
          <button onClick={()=>doExport('excel')}
            style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'11px 16px',border:'none',
              background:'none',cursor:'pointer',fontSize:12,fontWeight:600,color:'#1e293b',textAlign:'left'}}
            onMouseEnter={e=>{e.currentTarget.style.background='#f0fdf4';}}
            onMouseLeave={e=>{e.currentTarget.style.background='none';}}>
            <FileSpreadsheet size={14} color="#10b981"/> Excel (.xlsx)
          </button>
          <button onClick={()=>doExport('csv')}
            style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'11px 16px',border:'none',
              background:'none',cursor:'pointer',fontSize:12,fontWeight:600,color:'#1e293b',textAlign:'left'}}
            onMouseEnter={e=>{e.currentTarget.style.background='#eff6ff';}}
            onMouseLeave={e=>{e.currentTarget.style.background='none';}}>
            <FileText size={14} color="#4f6ef7"/> CSV (.csv)
          </button>
        </div>
      )}
    </div>
  );
}


function ReporteVentasBtn() {
  const p = DS.primary;
  const [open, setOpen]   = React.useState(false);
  const [desde, setDesde] = React.useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [hasta, setHasta] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = React.useState(false);

  async function descargar() {
    setLoading(true);
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`/api/export/reporte-ventas?desde=${desde}&hasta=${hasta}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error generando reporte');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `reporte_ventas_${desde}_${hasta}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch(err) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  }

  return (
    <>
      {open && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{background:'#fff',borderRadius:18,padding:28,width:'min(360px,92vw)',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:16,fontWeight:800,color:'#1e293b',marginBottom:4}}>Reporte de ventas</div>
            <div style={{fontSize:12,color:'#94a3b8',marginBottom:20}}>Selecciona el período — descarga en Excel</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:6}}>DESDE</div>
                <input type="date" value={desde} onChange={e=>setDesde(e.target.value)}
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:6}}>HASTA</div>
                <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)}
                  style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
              </div>
            </div>
            <div style={{background:'#f8fafc',borderRadius:10,padding:'12px 14px',marginBottom:16,fontSize:12,color:'#64748b'}}>
              El reporte incluye: resumen por asesor, por canal, y detalle de cada venta cerrada.
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setOpen(false)}
                style={{flex:1,padding:'10px',borderRadius:9,border:'none',background:'#f1f5f9',cursor:'pointer',fontSize:13,fontWeight:700,color:'#64748b'}}>
                Cancelar
              </button>
              <button onClick={descargar} disabled={loading}
                style={{flex:2,padding:'10px',borderRadius:9,border:'none',background:p,color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                <Download size={14}/>{loading ? 'Generando...' : 'Descargar Excel'}
              </button>
            </div>
          </div>
        </div>
      )}
      <button onClick={()=>setOpen(true)}
        style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:10,border:'none',background:p,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:`0 4px 14px ${p}40`}}>
        <FileSpreadsheet size={14}/> Reporte de ventas
      </button>
    </>
  );
}

function ExportButtons({ roles = ['leads','clients','ventas','equipo'] }) {
  const p = DS.primary;
  const opts = [
    { key:'leads',   label:'Leads',   Icon:Grid },
    { key:'clients', label:'Clientes',Icon:Users },
    { key:'ventas',  label:'Ventas',  Icon:DollarSign },
    { key:'equipo',  label:'Equipo',  Icon:UserCheck },
  ].filter(o => roles.includes(o.key));

  return (
    <div style={{background:'#fff',borderRadius:14,padding:'16px 20px',border:'1px solid #eaecf0',marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Exportar reportes</div>
        <div style={{fontSize:11,color:'#94a3b8'}}>Formato CSV — abre en Excel</div>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        {opts.map(o=>(
          <button key={o.key} onClick={()=>exportarCSV(o.key)}
            style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:`1px solid ${p}30`,background:`${p}08`,color:p,fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.background=p;e.currentTarget.style.color='#fff';}}
            onMouseLeave={e=>{e.currentTarget.style.background=`${p}08`;e.currentTarget.style.color=p;}}>
            <Download size={13}/>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TabDashboard({ users, leads, stats, planInfo, clients: realClients, onNavigate }) {
  const p = DS.primary;
  const nav = onNavigate || (() => {});
  const clients  = realClients || [];
  const asesores = users?.filter(u => ['advisor','asesor'].includes(u.role) && u.status==='active') || [];
  const supervisors = users?.filter(u => u.role==='supervisor') || [];
  const won    = clients.filter(c => c.result==='won');
  const lost   = clients.filter(c => c.result==='lost');
  const activo = clients.filter(c => !c.result);
  const calientes = leads?.filter(l => l.nivel==='caliente') || [];
  const conv   = clients.length ? Math.round((won.length/clients.length)*100) : 0;
  const ingresos = won.reduce((s,c)=>s+(Number(c.metadata?.saleAmount ?? c.saleAmount)||0),0);
  const mesAct = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][new Date().getMonth()];
  const [hovCard, setHovCard] = React.useState(null);

  const kpis = [
    {Icon:Users,      label:'Clientes totales', value:clients.length,   color:'#6366f1', sub:'en empresa',        nav:'clients'},
    {Icon:Trophy,     label:'Ventas ganadas',   value:won.length,       color:'#10b981', sub:`${conv}% conv.`,    nav:'sales'},
    {Icon:Activity,   label:'En proceso',       value:activo.length,    color:'#f59e0b', sub:'oportunidades',     nav:'clients'},
    {Icon:UserCheck,  label:'Asesores activos', value:asesores.length,  color:'#8b5cf6', sub:'en equipo',         nav:'users'},
    {Icon:Target,     label:'Leads hot',        value:calientes.length, color:'#ef4444', sub:'alta prioridad',    nav:'leads'},
    {Icon:DollarSign, label:'Ingresos est.',    value:`$${(ingresos/1000).toFixed(0)}k`, color:'#d97706', sub:'generados', nav:'sales'},
  ];

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>
      {/* Header */}
      <div style={{marginBottom:22}}>
        <div style={{fontSize:11,color:p,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:4}}>Administrador</div>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:'#1e293b',letterSpacing:'-0.5px'}}>Panel de Control</h1>
        <p style={{margin:'5px 0 0',fontSize:13,color:'#94a3b8'}}>Gestión completa de tu empresa · {asesores.length} asesores · {clients.length} clientes</p>
      </div>

      {/* 6 KPI cards */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(3,1fr)':'repeat(6,1fr)',gap:MOB?8:12,marginBottom:20}}>
        {kpis.map((k,i)=>(
          <div key={i} onClick={()=>nav(k.nav)} style={{background:'#fff',borderRadius:14,padding:'16px',border:'1px solid #eaecf0',borderTop:`3px solid ${k.color}`,cursor:'pointer',transition:'all .2s',boxShadow:hovCard===i?`0 10px 28px ${k.color}20`:'0 1px 3px rgba(0,0,0,0.05)',transform:hovCard===i?'translateY(-3px)':''}}
            onMouseEnter={()=>setHovCard(i)} onMouseLeave={()=>setHovCard(null)}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${k.color}12`,border:`1px solid ${k.color}20`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <k.Icon size={17} color={k.color} strokeWidth={2}/>
              </div>
              <span style={{fontSize:10,color:k.color,fontWeight:700,background:`${k.color}10`,borderRadius:999,padding:'2px 7px'}}>→</span>
            </div>
            <div style={{fontSize:24,fontWeight:800,color:'#1e293b',lineHeight:1,marginBottom:3}}>{k.value}</div>
            <div style={{fontSize:10,color:'#94a3b8',fontWeight:500}}>{k.label}</div>
            <div style={{fontSize:9,color:k.color,fontWeight:700,marginTop:2}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'1.4fr 1fr',gap:16,marginBottom:16}}>

        {/* Left: Top asesores + actividad reciente */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Canales de captación */}
          <CanalStatsCompleto leads={leads} clients={clients}/>

          {/* ── CARDS DE CANALES con logos ── */}
          {(()=>{
            const total = leads.length || 1;
            const canales = {
              facebook:  {count:0, label:'Facebook',  color:'#1877F2', bg:'#EBF5FF', ventas:0},
              instagram: {count:0, label:'Instagram', color:'#E1306C', bg:'#FEE8F0', ventas:0},
              tiktok:    {count:0, label:'TikTok',    color:'#010101', bg:'#F0F0F0', ventas:0},
              whatsapp:  {count:0, label:'WhatsApp',  color:'#25D366', bg:'#F0FDF9', ventas:0},
            };
            leads.forEach(l=>{
              const c=(l.canal||l.origen||'').toLowerCase();
              const key = c.includes('facebook')||c.includes('fb') ? 'facebook'
                        : c.includes('instagram')||c.includes('ig') ? 'instagram'
                        : c.includes('tiktok')||c.includes('tik') ? 'tiktok'
                        : 'whatsapp';
              canales[key].count++;
              const clientesLead = clients.filter(cl=>cl.assigned_advisor_id===l.advisor_id||cl.asesorId===l.advisor_id);
              if(clientesLead.some(cl=>cl.result==='won')) canales[key].ventas++;
            });
            const activos = Object.entries(canales).filter(([,v])=>v.count>0).sort((a,b)=>b[1].count-a[1].count);
            if(activos.length===0) return null;
            const topCanal = activos[0];
            const LOGOS = {
              facebook:  <svg viewBox="0 0 24 24" width="28" height="28" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
              instagram: <svg viewBox="0 0 24 24" width="28" height="28"><defs><radialGradient id="igc" cx="30%" cy="107%"><stop offset="0%" stopColor="#fdf497"/><stop offset="45%" stopColor="#fd5949"/><stop offset="60%" stopColor="#d6249f"/><stop offset="90%" stopColor="#285AEB"/></radialGradient></defs><path fill="url(#igc)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
              tiktok:    <svg viewBox="0 0 24 24" width="28" height="28"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="#010101"/></svg>,
              whatsapp:  <svg viewBox="0 0 24 24" width="28" height="28" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
            };
            return(
              <div style={{marginBottom:20}}>
                <div style={{fontSize:11,color:'#94a3b8',fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:10}}>
                  Canales de captacion
                </div>
                <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':`repeat(${activos.length},1fr)`,gap:12}}>
                  {activos.map(([key,val])=>{
                    const pct=Math.round((val.count/total)*100);
                    const isTop=key===topCanal[0];
                    return(
                      <div key={key} style={{
                        background:val.bg,
                        borderRadius:16,
                        padding:'16px 18px',
                        border:`1.5px solid ${isTop?val.color+'60':val.color+'20'}`,
                        position:'relative',
                        overflow:'hidden',
                        boxShadow:isTop?`0 4px 20px ${val.color}25`:'none',
                      }}>
                        {isTop&&<div style={{position:'absolute',top:10,right:10,background:val.color,color:'#fff',fontSize:9,fontWeight:800,padding:'2px 7px',borderRadius:999}}>TOP</div>}
                        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                          {LOGOS[key]}
                          <span style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>{val.label}</span>
                        </div>
                        <div style={{fontSize:28,fontWeight:800,color:val.color,lineHeight:1,marginBottom:2}}>{val.count}</div>
                        <div style={{fontSize:11,color:'#94a3b8',marginBottom:8}}>leads ({pct}% del total)</div>
                        {val.ventas>0&&<div style={{fontSize:11,fontWeight:700,color:'#10b981'}}>✅ {val.ventas} ventas cerradas</div>}
                        <div style={{background:`${val.color}20`,borderRadius:999,height:4,marginTop:8,overflow:'hidden'}}>
                          <div style={{width:`${pct}%`,height:'100%',background:val.color,borderRadius:999,transition:'width .5s'}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Performance asesores */}
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',borderLeft:`3px solid ${p}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <UserCheck size={14} color={p}/>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>Performance de asesores</div>
                  <div style={{fontSize:11,color:'#94a3b8'}}>Rendimiento actual del equipo de ventas</div>
                </div>
              </div>
              <button onClick={()=>nav('users')} style={{padding:'6px 14px',borderRadius:9,border:'none',background:`${p}10`,color:p,fontSize:11,fontWeight:700,cursor:'pointer',transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background=p;e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background=`${p}10`;e.currentTarget.style.color=p;}}>
                Gestionar
              </button>
            </div>
            {/* Table header */}
            <div style={{display:'grid',gridTemplateColumns:MOB?'1fr 55px 55px 55px 60px':'1fr 70px 70px 70px 80px',gap:8,padding:'9px 20px',background:'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
              {['Asesor','Clientes','Ganados','Leads','Tasa'].map((h,i)=>(
                <div key={i} style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:0.5,textAlign:i>0?'center':'left'}}>{h}</div>
              ))}
            </div>
            {asesores.length===0&&<div style={{padding:'24px',textAlign:'center',color:'#94a3b8',fontSize:13}}>Sin asesores registrados</div>}
            {asesores.slice(0,5).map((a,i)=>{
              const mc = clients.filter(c=>c.advisor_id===a.id||c.asesor===a.name);
              const mw = mc.filter(c=>c.result==='won');
              const ml = leads?.filter(l=>l.asesor===a.name||l.advisor_id===a.id)||[];
              const tasa = mc.length?Math.round((mw.length/mc.length)*100):0;
              return(
                <div key={a.id||i} style={{display:'grid',gridTemplateColumns:MOB?'1fr 55px 55px 55px 60px':'1fr 70px 70px 70px 80px',gap:8,padding:'12px 20px',borderBottom:'1px solid #f8fafc',alignItems:'center',transition:'background .15s',cursor:'pointer'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  onClick={()=>nav('users')}>
                  <div style={{display:'flex',alignItems:'center',gap:9}}>
                    <div style={{width:30,height:30,borderRadius:'50%',background:`${p}15`,border:`2px solid ${p}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:p,flexShrink:0}}>{a.name?.charAt(0)?.toUpperCase()}</div>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{a.name}</div>
                      <div style={{fontSize:9,color:'#94a3b8'}}>{a.email}</div>
                    </div>
                  </div>
                  <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#64748b'}}>{mc.length}</div>
                  <div style={{textAlign:'center',fontSize:13,fontWeight:800,color:'#10b981'}}>{mw.length}</div>
                  <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#6366f1'}}>{ml.length}</div>
                  <div style={{textAlign:'center'}}>
                    <span style={{fontSize:11,fontWeight:800,padding:'3px 10px',borderRadius:999,color:tasa>=60?'#10b981':tasa>=30?'#f59e0b':'#ef4444',background:tasa>=60?'#f0fdf9':tasa>=30?'#fffbeb':'#fef2f2'}}>{tasa}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Distribución de leads */}
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
            <div style={{padding:'13px 20px',borderBottom:'1px solid #f1f5f9',borderLeft:'3px solid #ef4444',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}><Flame size={13} color="#ef4444"/><span style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Leads por temperatura</span></div>
              <button onClick={()=>nav('leads')} style={{padding:'5px 12px',borderRadius:8,border:'none',background:'#fef2f2',color:'#ef4444',fontSize:11,fontWeight:700,cursor:'pointer',transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='#ef4444';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#fef2f2';e.currentTarget.style.color='#ef4444';}}>
                Ver leads
              </button>
            </div>
            <div style={{padding:'14px 20px',display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(3,1fr)',gap:12}}>
              {[
                {l:'¡A cerrar!',v:leads?.filter(l=>l.nivel==='caliente').length||0,c:'#ef4444',bg:'#fef2f2',Icon:Flame},
                {l:'En seguimiento',   v:leads?.filter(l=>l.nivel==='tibio').length||0,   c:'#f59e0b',bg:'#fffbeb',Icon:Thermometer},
                {l:'¡Rescatar!',    v:leads?.filter(l=>l.nivel==='frio').length||0,    c:'#3b82f6',bg:'#eff6ff',Icon:Snowflake},
              ].map((s,i)=>(
                <div key={i} style={{background:s.bg,borderRadius:12,padding:'14px',border:`1px solid ${s.c}20`,cursor:'pointer',transition:'all .2s'}}
                  onClick={()=>nav('leads')}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 6px 18px ${s.c}18`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='none';}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <s.Icon size={16} color={s.c}/>
                    <span style={{fontSize:10,color:s.c,fontWeight:700}}>{leads?.length?Math.round((s.v/leads.length)*100):0}%</span>
                  </div>
                  <div style={{fontSize:26,fontWeight:800,color:s.c,lineHeight:1,marginBottom:3}}>{s.v}</div>
                  <div style={{fontSize:11,color:'#64748b',fontWeight:600}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Estado empresa */}
          <div style={{background:`linear-gradient(135deg,${p},${p}cc)`,borderRadius:16,padding:'20px',color:'#fff',position:'relative',overflow:'hidden',boxShadow:`0 8px 24px ${p}35`}}>
            <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,0.08)',pointerEvents:'none'}}/>
            <div style={{position:'relative'}}>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',fontWeight:700,marginBottom:4}}>Empresa · {mesAct} {new Date().getFullYear()}</div>
              <div style={{fontSize:22,fontWeight:800,marginBottom:16}}>{planInfo?.name || 'Plan activo'}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                {[
                  {l:'Conversión',v:`${conv}%`},
                  {l:'Ingresos',  v:`$${(ingresos/1000).toFixed(0)}k`},
                  {l:'Asesores',  v:asesores.length},
                  {l:'Supervisores',v:supervisors.length},
                ].map((s,i)=>(
                  <div key={i} style={{background:'rgba(255,255,255,0.12)',borderRadius:10,padding:'10px'}}>
                    <div style={{fontSize:18,fontWeight:800,lineHeight:1}}>{s.v}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.65)',marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'rgba(255,255,255,0.15)',borderRadius:999,height:7,overflow:'hidden',marginBottom:6}}>
                <div style={{width:`${Math.min(conv*2,100)}%`,height:'100%',background:'#fff',borderRadius:999,transition:'width .8s ease'}}/>
              </div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.65)'}}>Tasa de conversión del equipo</div>
            </div>
          </div>

          {/* Acciones rápidas admin */}
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
            <div style={{padding:'13px 18px',borderBottom:'1px solid #f1f5f9',borderLeft:'3px solid #f59e0b',display:'flex',alignItems:'center',gap:8}}>
              <Zap size={13} color="#f59e0b"/><span style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Acciones de gestión</span>
            </div>
            <div style={{padding:'12px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                {Icon:UserPlus,   l:'Nuevo usuario',    c:'#6366f1', nav:'users'},
                {Icon:Users,      l:'Ver clientes',     c:p,         nav:'clients'},
                {Icon:BarChart2,  l:'Ver ventas',       c:'#10b981', nav:'sales'},
                {Icon:Grid,       l:'Gestionar leads',  c:'#ef4444', nav:'leads'},
                {Icon:MessageSquare,l:'Mensajes',       c:'#8b5cf6', nav:'messages'},
                {Icon:Folder,     l:'Empleados',        c:'#f59e0b', nav:'employees'},
              ].map((a,i)=>(
                <button key={i} onClick={()=>nav(a.nav)} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:11,border:`1px solid ${a.c}15`,background:`${a.c}06`,cursor:'pointer',transition:'all .18s',textAlign:'left'}}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${a.c}14`;e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow=`0 4px 12px ${a.c}18`;}}
                  onMouseLeave={e=>{e.currentTarget.style.background=`${a.c}06`;e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='none';}}>
                  <div style={{width:30,height:30,borderRadius:8,background:`${a.c}12`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <a.Icon size={14} color={a.c} strokeWidth={2}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:'#1e293b'}}>{a.l}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Clientes sin contacto */}
          {(() => {
            const sinContact = clients.filter(c=>(Date.now()-new Date(c.last_contact||c.created_at))/3600000>24&&!c.result);
            return sinContact.length>0&&(
              <div style={{background:'#fff',borderRadius:16,border:'1px solid #fecaca',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
                <div style={{padding:'12px 18px',borderBottom:'1px solid #fecaca',borderLeft:'3px solid #ef4444',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:7}}><AlertCircle size={13} color="#ef4444"/><span style={{fontSize:13,fontWeight:800,color:'#dc2626'}}>Clientes sin contacto</span></div>
                  <span style={{background:'#ef4444',color:'#fff',borderRadius:999,padding:'2px 9px',fontSize:11,fontWeight:700}}>{sinContact.length}</span>
                </div>
                <div style={{padding:'8px 14px'}}>
                  {sinContact.slice(0,3).map((c,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 4px',borderBottom:'1px solid #fef2f2'}}>
                      <div><div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{c.name}</div><div style={{fontSize:10,color:'#ef4444'}}>Sin contacto · {c.asesor||'Sin asesor'}</div></div>
                      <button onClick={()=>nav('clients')} style={{padding:'4px 10px',borderRadius:7,border:'1px solid #fecaca',background:'#fef2f2',color:'#ef4444',fontSize:10,fontWeight:700,cursor:'pointer',transition:'all .15s'}}
                        onMouseEnter={e=>{e.currentTarget.style.background='#ef4444';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#fef2f2';e.currentTarget.style.color='#ef4444';}}>
                        Ver
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function TabClientes({ clients: realClients, users, onRefresh }) {
  const p = DS.primary;
  const clients = (realClients && realClients.length > 0) ? realClients : [];
  const [search,   setSearch]   = useState('');
  const [fResult,  setFResult]  = useState('all');
  const [fAsesor,  setFAsesor]  = useState('all');
  const [detail,   setDetail]   = useState(null);

  const asesores = [...new Set(clients.map(c => c.asesor || c.advisor_name || 'Sin asignar').filter(Boolean))];

  const list = clients.filter(c => {
    const name  = c.name || '';
    const phone = c.phone || '';
    const result = c.result || c.metadata?.result || null;
    const asesor = c.asesor || c.advisor_name || '';
    const ms = name.toLowerCase().includes(search.toLowerCase()) || phone.includes(search);
    const mr = fResult==='all' || (fResult==='proceso'&&!result) || (fResult==='won'&&result==='won') || (fResult==='lost'&&result==='lost');
    const ma = fAsesor==='all' || asesor===fAsesor;
    return ms&&mr&&ma;
  });

  const { paged, ...pg } = usePaged(list, 12);

  return (
    <div style={{ display:'grid', gridTemplateColumns:MOB?'1fr':'1fr 260px', gap:18 }}>
      <div>
        {/* Mini KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)', gap:10, marginBottom:14 }}>
          {[
            { l:'Total',      v:clients.length,  c:'#4f6ef7' },
            { l:'En proceso', v:clients.filter(c=>!(c.result||c.metadata?.result)).length, c:'#f59e0b' },
            { l:'Ganados',    v:clients.filter(c=>(c.result||c.metadata?.result)==='won').length,  c:'#10b981' },
            { l:'Perdidos',   v:clients.filter(c=>(c.result||c.metadata?.result)==='lost').length, c:'#ef4444' },
          ].map((s,i) => (
            <div key={i} style={{ background:CB, borderRadius:10, padding:'10px 14px', border:`1px solid ${DS.primary}18`, borderLeft:`3px solid ${s.c}`, cursor:'pointer' }} onClick={()=>setFResult(['all','proceso','won','lost'][i])}>
              <div style={{ fontSize:22, fontWeight:800, color:s.c }}>{s.v}</div>
              <div style={{ fontSize:11, color:'#9aa5be' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display:'flex', gap:8, marginBottom:12, overflowX:'auto', flexWrap:'nowrap', WebkitOverflowScrolling:'touch', paddingBottom:4 }}>
          <div style={{ flex:1, position:'relative', minWidth:160 }}>
            <Search size={13} color="#94a3b8" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente o teléfono..."
              style={{ width:'100%', padding:'9px 12px 9px 30px', border:'1px solid #cbd5e1', borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <select value={fResult} onChange={e=>setFResult(e.target.value)} style={{ padding:'9px 12px', border:'1px solid #cbd5e1', borderRadius:9, fontSize:13, outline:'none', cursor:'pointer' }}>
            <option value="all">Todos</option>
            <option value="proceso">En proceso</option>
            <option value="won">Ganados</option>
            <option value="lost">Perdidos</option>
          </select>
          <select value={fAsesor} onChange={e=>setFAsesor(e.target.value)} style={{ padding:'9px 12px', border:'1px solid #cbd5e1', borderRadius:9, fontSize:13, outline:'none', cursor:'pointer' }}>
            <option value="all">Todos los asesores</option>
            {asesores.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div style={{ background:CB, borderRadius:14, border:`1px solid ${DS.primary}18`, overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:680 }}>
            <thead>
              <tr style={{ background:'#f5f7fb' }}>
                {['Cliente','Teléfono','Asesor','Clasificación','Estado','Producto/Servicio','Score','Acciones'].map(h=>(
                  <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#9aa5be', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((c,i) => {
                const result = c.result || c.metadata?.result || null;
                const heat   = c.heat || c.metadata?.heat || 'tibio';
                const asesor = c.asesor || c.advisor_name || 'Sin asignar';
                const heatCfg = {
                  caliente:{label:'Caliente',color:'#ef4444',bg:'#fff5f5'},
                  tibio:   {label:'Tibio',   color:'#f59e0b',bg:'#fffbeb'},
                  frio:    {label:'Frío',    color:'#4f6ef7',bg:'#f0f1ff'},
                }[heat] || {label:heat,color:'#94a3b8',bg:'#f1f5f9'};
                return (
                  <tr key={c.id||i} style={{ borderTop:'1px solid #e2e8f0', cursor:'pointer' }} onClick={()=>setDetail(c)}>
                    <td style={{ padding:'11px 12px' }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{c.name}</div>
                      <div style={{ fontSize:10, color:'#9aa5be' }}>{c.email||'Sin email'}</div>
                    </td>
                    <td style={{ padding:'11px 12px', fontSize:12, color:'#4a5568' }}>{c.phone}</td>
                    <td style={{ padding:'11px 12px', fontSize:12, fontWeight:600, color:p }}>{asesor.split(' ')[0]}</td>
                    <td style={{ padding:'11px 12px' }}><Tag label={heatCfg.label} color={heatCfg.color} bg={heatCfg.bg}/></td>
                    <td style={{ padding:'11px 12px' }}>
                      {result==='won'  && <Tag label="Ganado"  color="#065f46" bg="#d1fae5"/>}
                      {result==='lost' && <Tag label="Perdido" color="#7f1d1d" bg="#fee2e2"/>}
                      {!result         && <Tag label="Proceso" color="#92400e" bg="#fef3c7"/>}
                    </td>
                    <td style={{ padding:'11px 12px', maxWidth:140 }}>
                      {(() => { const p = c.metadata?.producto || c.producto; return p
                        ? <span style={{ fontSize:11, fontWeight:700, color:'#1e40af', background:'#dbeafe', padding:'2px 8px', borderRadius:5 }}>{p}</span>
                        : <span style={{ color:'#d1d5db' }}>—</span>; })()}
                    </td>
                    <td style={{ padding:'11px 12px' }}>
                      <span style={{ padding:'2px 9px', borderRadius:999, fontSize:11, fontWeight:700,
                        color:(c.score||0)>=80?'#065f46':(c.score||0)>=50?'#92400e':'#7f1d1d',
                        background:(c.score||0)>=80?'#d1fae5':(c.score||0)>=50?'#fef3c7':'#fee2e2'
                      }}>{c.score||0}</span>
                    </td>
                    <td style={{ padding:'11px 12px' }} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>askConfirm('Este cliente será eliminado permanentemente.',async()=>{try{await apiFetch('DELETE',`/api/clients/${c.id}`);if(onRefresh)onRefresh();}catch(e){alert('Error: '+e.message);}})}
                        style={{padding:'6px 10px',borderRadius:7,border:'none',background:'#fee2e2',color:'#ef4444',fontWeight:700,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                        <Trash2 size={12}/> Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={8} style={{ padding:32, textAlign:'center', color:'#9aa5be' }}>Sin resultados</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination {...pg} primary={p} label="clientes" />
      </div>

      {/* Sidebar */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card title="Por asesor" Icon={UserCheck}>
          {asesores.map(a => {
            const ac  = clients.filter(c=>(c.asesor||c.advisor_name||'Sin asignar')===a);
            const won = ac.filter(c=>(c.result||c.metadata?.result)==='won').length;
            const pct = ac.length ? Math.round((won/ac.length)*100) : 0;
            return (
              <div key={a} style={{ padding:'9px 0', borderBottom:'1px solid #e2e8f0', cursor:'pointer' }} onClick={()=>setFAsesor(fAsesor===a?'all':a)}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:fAsesor===a?DS.primary:'#0f172a' }}>{a.split(' ')[0]}</span>
                  <span style={{ fontSize:11, fontWeight:800, color:'#4f6ef7' }}>{pct}%</span>
                </div>
                <div style={{ background:'rgba(79,110,247,0.10)', borderRadius:999, height:6 }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:'#4f6ef7', borderRadius:999 }}/>
                </div>
                <div style={{ fontSize:10, color:'#9aa5be', marginTop:3 }}>{ac.length} clientes · {won} ganados</div>
              </div>
            );
          })}
        </Card>

        <Card title="Sin contacto +24h" Icon={AlertCircle} iconColor="#ef4444">
          {(() => {
            const DAY = 24*3600*1000;
            const sinContacto = clients
              .filter(c => { const t = c.last_contact || c.lastContact; return t && (Date.now() - new Date(t).getTime()) > DAY; })
              .sort((a,b) => new Date(a.last_contact||a.lastContact) - new Date(b.last_contact||b.lastContact))
              .slice(0, 12);
            if (!sinContacto.length) return <div style={{ padding:'12px 0', fontSize:12, color:'#9aa5be' }}>Todos los clientes con contacto reciente</div>;
            return sinContacto.map(c => {
              const asesor = (c.asesor || c.advisor_name || 'Sin asignar').split(' ')[0];
              const hrs = Math.floor((Date.now() - new Date(c.last_contact||c.lastContact).getTime())/3600000);
              const label = hrs >= 48 ? `${Math.floor(hrs/24)} días` : `${hrs}h`;
              return (
                <div key={c.id} style={{ padding:'8px 0', borderBottom:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>{c.name}</div>
                  <div style={{ fontSize:10, color:'#ef4444' }}>{asesor} · {label}</div>
                </div>
              );
            });
          })()}
        </Card>
      </div>

      {detail && (
        <div style={{ position:'fixed', inset:0, backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(8px)', background:'rgba(79,110,247,0.3)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
          <div style={{ background:'#ffffff', borderRadius:20, padding:28, width:'min(460px,92vw)', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:800 }}>{detail.name}</h3>
              <button onClick={()=>setDetail(null)} style={{ border:'none', background:'none', cursor:'pointer' }}><X size={18} color="#94a3b8"/></button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              {[
                {l:'ASESOR',    v:detail.asesor},
                {l:'TELÉFONO',  v:detail.phone},
                {l:'EMAIL',     v:detail.email||'—'},
                {l:'SCORE',     v:detail.score},
                {l:'ESTADO',    v:detail.result==='won'?'Ganado':detail.result==='lost'?'Perdido':'En proceso'},
                {l:'CONTACTO',  v:detail.updated},
              ].map((f,i)=>(
                <div key={i} style={{ background:'#f5f7fb', borderRadius:9, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:'#9aa5be', fontWeight:700, marginBottom:3 }}>{f.l}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#4a5568' }}>{f.v}</div>
                </div>
              ))}
            </div>
            {detail.result==='lost' && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#dc2626', marginBottom:5 }}>RAZÓN DE PÉRDIDA</div>
                <div style={{ fontSize:13, color:'#7f1d1d' }}>{detail.loss || <i style={{color:'#9aa5be'}}>No registrada por el asesor</i>}</div>
              </div>
            )}
            <button onClick={()=>{ askConfirm('Este cliente será eliminado permanentemente.', async ()=>{ try{ await apiFetch('DELETE',`/api/clients/${detail.id}`); if(onRefresh) onRefresh(); setDetail(null); }catch(e){ alert('Error al eliminar: '+e.message); } }); }}
              style={{width:'100%',padding:'10px',borderRadius:10,border:'none',background:'#fef2f2',color:'#ef4444',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:8}}
              onMouseEnter={e=>{e.currentTarget.style.background='#ef4444';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#fef2f2';e.currentTarget.style.color='#ef4444';}}>
              <Trash2 size={14}/> Eliminar cliente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════ TAB ACTIVIDADES EQUIPO (Admin) ══════════════════════════ */
function TabActividadesEquipo() {
  const p = DS.primary;
  const TIPOS = {
    llamada:       { l:'Llamada',          c:'#4f6ef7', Icon:Phone         },
    reunion:       { l:'Reunión',          c:'#8b5cf6', Icon:Users         },
    email:         { l:'Email',            c:'#f59e0b', Icon:MessageSquare },
    visita:        { l:'Visita',           c:'#10b981', Icon:Target        },
    nota:          { l:'Nota',             c:'#64748b', Icon:FileText      },
    mensaje_wa:    { l:'Mensaje WA',       c:'#25d366', Icon:MessageCircle },
    whatsapp:      { l:'WhatsApp',         c:'#25d366', Icon:MessageCircle },
    cambio_estado: { l:'Cambio de estado', c:'#ef4444', Icon:RefreshCw     },
    cita:          { l:'Cita',             c:'#8b5cf6', Icon:Calendar      },
    reasignacion:  { l:'Reasignación',     c:'#2563eb', Icon:UserCheck     },
    venta:         { l:'Venta',            c:'#10b981', Icon:CheckCircle   },
  };
  const [acts,    setActs]    = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filtroA, setFiltroA] = React.useState('all');
  const [filtroT, setFiltroT] = React.useState('all');

  React.useEffect(() => {
    apiFetch('GET', '/api/supervisor/team-activities')
      .then(r => { setActs(Array.isArray(r) ? r : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const asesores = [...new Set(acts.map(a => a.advisor_name).filter(Boolean))];
  const filtered = acts.filter(a =>
    (filtroA === 'all' || a.advisor_name === filtroA) &&
    (filtroT === 'all' || a.type === filtroT)
  );

  const byAsesor = asesores.map(n => ({
    name:  n,
    total: acts.filter(a => a.advisor_name === n).length,
    hoy:   acts.filter(a => a.advisor_name === n && new Date(a.created_at).toDateString() === new Date().toDateString()).length,
    tipos: Object.fromEntries(Object.keys(TIPOS).map(k => [k, acts.filter(a => a.advisor_name === n && a.type === k).length])),
  }));

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, color:p, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:4 }}>Admin · Seguimiento</div>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:'#1e293b', letterSpacing:'-0.5px' }}>Actividades del Equipo</h1>
        <p style={{ margin:'5px 0 0', fontSize:13, color:'#94a3b8' }}>Todo lo que registra y hace el equipo de asesores</p>
      </div>

      {/* Cards por asesor */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14, marginBottom:24 }}>
        {byAsesor.map((a, i) => (
          <div key={i} onClick={() => setFiltroA(filtroA === a.name ? 'all' : a.name)}
            style={{ background:'#fff', borderRadius:14, padding:'18px', border:`2px solid ${filtroA === a.name ? p : '#eaecf0'}`, cursor:'pointer', transition:'all .2s',
              boxShadow: filtroA === a.name ? `0 6px 20px ${p}20` : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ width:38, height:38, borderRadius:'50%', background:`${p}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:p }}>{a.name.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:'#1e293b' }}>{a.name.split(' ')[0]}</div>
                <div style={{ fontSize:11, color:'#94a3b8' }}>{a.hoy} hoy · {a.total} total</div>
              </div>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {Object.entries(a.tipos).filter(([,v]) => v > 0).map(([k, v]) => {
                const tip = TIPOS[k];
                return (
                  <span key={k} style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:999, background:`${tip?.c}15`, color:tip?.c, display:'inline-flex', alignItems:'center', gap:3 }}>
                    {tip?.Icon && <tip.Icon size={9}/>} {tip?.l} {v}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
        {byAsesor.length === 0 && !loading && (
          <div style={{ gridColumn:'1/-1', padding:32, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Sin actividades registradas por el equipo aún</div>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:11, color:'#94a3b8', fontWeight:700, marginRight:4 }}>ASESOR:</span>
        {['all', ...asesores].map(n => (
          <button key={n} onClick={() => setFiltroA(n)}
            style={{ padding:'5px 12px', borderRadius:7, border:'none', fontSize:11, fontWeight:700, cursor:'pointer',
              background: filtroA === n ? p : '#f1f5f9', color: filtroA === n ? '#fff' : '#64748b' }}>
            {n === 'all' ? 'Todos' : n.split(' ')[0]}
          </button>
        ))}
        <div style={{ width:'100%', height:1 }}/>
        <span style={{ fontSize:11, color:'#94a3b8', fontWeight:700, marginRight:4 }}>TIPO:</span>
        {['all', ...Object.keys(TIPOS)].map(k => {
          const t = k === 'all' ? { l:'Todos', c:'#64748b' } : TIPOS[k];
          return (
            <button key={k} onClick={() => setFiltroT(k)}
              style={{ padding:'5px 12px', borderRadius:7, border:'none', fontSize:11, fontWeight:700, cursor:'pointer',
                background: filtroT === k ? t.c : '#f1f5f9', color: filtroT === k ? '#fff' : '#64748b' }}>
              {k === 'all' ? 'Todos los tipos' : t.l}
            </button>
          );
        })}
      </div>

      {/* Lista de actividades */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #eaecf0', overflow:'hidden' }}>
        <div style={{ padding:'12px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc' }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{filtered.length} actividades</span>
        </div>
        {loading && <div style={{ padding:32, textAlign:'center', color:'#94a3b8' }}>Cargando actividades...</div>}
        {!loading && filtered.length === 0 && <div style={{ padding:32, textAlign:'center', color:'#94a3b8' }}>Sin resultados con los filtros actuales</div>}
        {filtered.map((a, i) => {
          const t = TIPOS[a.type] || TIPOS.nota;
          return (
            <div key={a.id || i} style={{ display:'flex', gap:14, padding:'14px 20px', borderBottom:'1px solid #f8fafc', alignItems:'flex-start' }}>
              <div style={{ width:38, height:38, borderRadius:10, background:`${t.c}12`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {t.Icon && <t.Icon size={16} color={t.c} strokeWidth={2}/>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
                  <div>
                    <span style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{t.l}</span>
                    {a.client_name && <span style={{ fontSize:12, color:'#94a3b8' }}> · {a.client_name}</span>}
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:p }}>{a.advisor_name}</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>
                      {a.created_at ? new Date(a.created_at).toLocaleString('es-EC', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}
                    </div>
                  </div>
                </div>
                {a.resultado && <div style={{ fontSize:12, color:t.c, fontWeight:600, marginBottom:2 }}>↳ {a.resultado}</div>}
                {a.notas && <div style={{ fontSize:12, color:'#64748b', lineHeight:1.5 }}>{a.notas}</div>}
                {a.duration > 0 && <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>⏱ {a.duration} min</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════ TAB ACTIVIDADES ASESORES ══════════════════════════ */
function TabActAsesores({ users: realUsers }) {
  const allUsers = realUsers || INIT_USERS;
  const [fAsesor, setFA] = useState('all');
  const asesores = [...new Set(ASESOR_ACTS.map(a=>a.asesor))];
  const lista = ASESOR_ACTS.filter(a=>fAsesor==='all'||a.asesor===fAsesor);

  const stats = asesores.map(a => ({
    name: a,
    llamadas: ASESOR_ACTS.filter(x=>x.asesor===a&&x.tipo==='llamada').length,
    ventas:   ASESOR_ACTS.filter(x=>x.asesor===a&&x.tipo==='venta').length,
    perdidas: ASESOR_ACTS.filter(x=>x.asesor===a&&x.tipo==='perdida').length,
    total:    ASESOR_ACTS.filter(x=>x.asesor===a).length,
  }));

  return (
    <div style={{ display:'grid', gridTemplateColumns:MOB?'1fr':'1fr 270px', gap:18 }}>
      <div>
        {/* Filtro asesores */}
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          <button onClick={()=>setFA('all')} style={{ padding:'7px 14px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', background:fAsesor==='all'?DS.primary:'#f1f5f9', color:fAsesor==='all'?'#fff':'#64748b' }}>Todos</button>
          {asesores.map(a=>(
            <button key={a} onClick={()=>setFA(fAsesor===a?'all':a)} style={{ padding:'7px 14px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', background:fAsesor===a?DS.primary:'#f1f5f9', color:fAsesor===a?'#fff':'#64748b' }}>
              {a.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div style={{ background:CB, borderRadius:14, border:`1px solid ${DS.primary}18`, overflow:'hidden' }}>
          <div style={{ padding:'12px 18px', borderBottom:'1px solid #e2e8f0', fontSize:13, fontWeight:700, color:'#1e293b', display:'flex', alignItems:'center', gap:7 }}>
            <Activity size={14} color="#8b5cf6"/> Historial de actividades
          </div>
          {lista.map((a,i) => (
            <div key={a.id} style={{ display:'flex', gap:14, padding:'14px 18px', borderBottom:'1px solid #e2e8f0', alignItems:'flex-start' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                <ActIcon tipo={a.Icon_t} color={a.color}/>
                {i<lista.length-1&&<div style={{ width:1, height:14, background:'rgba(79,110,247,0.10)', marginTop:4 }}/>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ fontSize:13, fontWeight:800, color:'#4f6ef7' }}>{a.asesor}</span>
                  <Tag label={a.tipo.charAt(0).toUpperCase()+a.tipo.slice(1)} color={a.color} bg={`${a.color}18`}/>
                  <Tag label={a.resultado} color="#374151" bg="#f1f5f9"/>
                </div>
                <div style={{ fontSize:12, color:'#4a5568' }}>{a.desc}</div>
              </div>
              <div style={{ fontSize:11, color:'#9aa5be', flexShrink:0 }}>{a.time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card title="Resumen por asesor" Icon={BarChart2}>
          {stats.map(s => (
            <div key={s.name} style={{ padding:'10px 0', borderBottom:'1px solid #e2e8f0', cursor:'pointer' }} onClick={()=>setFA(fAsesor===s.name?'all':s.name)}>
              <div style={{ fontSize:12, fontWeight:800, color:fAsesor===s.name?DS.primary:'#0f172a', marginBottom:8 }}>{s.name}</div>
              <div style={{ display:'grid', gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(3,1fr)', gap:6 }}>
                {[
                  {l:'Llamadas',v:s.llamadas,c:'#4f6ef7'},
                  {l:'Ventas',  v:s.ventas,  c:'#10b981'},
                  {l:'Pérdidas',v:s.perdidas,c:'#ef4444'},
                ].map((x,i)=>(
                  <div key={i} style={{ background:'#f5f7fb', borderRadius:7, padding:'5px 8px', textAlign:'center' }}>
                    <div style={{ fontSize:16, fontWeight:800, color:x.c }}>{x.v}</div>
                    <div style={{ fontSize:9, color:'#9aa5be' }}>{x.l}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>

        <Card title="Tipos de actividad" Icon={Activity} iconColor="#8b5cf6">
          {[
            {tipo:'llamada', label:'Llamadas',   color:'#4f6ef7'},
            {tipo:'mensaje', label:'Mensajes',   color:'#25d366'},
            {tipo:'cita',    label:'Citas',      color:'#f59e0b'},
            {tipo:'venta',   label:'Ventas',     color:'#10b981'},
            {tipo:'perdida', label:'Pérdidas',   color:'#ef4444'},
          ].map(t => {
            const cnt = ASESOR_ACTS.filter(a=>a.tipo===t.tipo).length;
            return (
              <div key={t.tipo} style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 0', borderBottom:'1px solid #e2e8f0' }}>
                <div style={{ width:28, height:28, borderRadius:7, background:`${t.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:t.color }}/>
                </div>
                <div style={{ flex:1, fontSize:12, fontWeight:600, color:'#4a5568' }}>{t.label}</div>
                <div style={{ fontSize:16, fontWeight:800, color:t.color }}>{cnt}</div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════ TAB ACTIVIDADES SUPERVISOR ══════════════════════════ */
function TabActSupervisor({ users: realUsers }) {
  const allUsers = realUsers || INIT_USERS;
  const [subTab, setSubTab] = useState('actividades');
  const msgs = window.__CRM_MSGS__ || [];
  const icns = { revision:Eye, mensaje:MessageSquare, reporte:FileText, calendario:Calendar, alerta:AlertCircle, aprobacion:CheckCircle };
  const counts = {};
  SUP_ACTS.forEach(a=>{ counts[a.tipo]=(counts[a.tipo]||0)+1; });

  return (
    <div style={{ display:'grid', gridTemplateColumns:MOB?'1fr':'1fr 270px', gap:18 }}>
      <div>
        {/* Sub-tabs: Actividades / Mensajes */}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {[
            {k:'actividades', l:'Actividades del supervisor', Ic:Activity},
            {k:'mensajes',    l:'Mensajes asesor↔supervisor', Ic:MessageSquare},
          ].map(t=>(
            <button key={t.k} onClick={()=>setSubTab(t.k)} style={{ padding:'8px 16px', borderRadius:9, border:'none', fontWeight:700, fontSize:13, cursor:'pointer', background:subTab===t.k?DS.primary:'#f1f5f9', color:subTab===t.k?'#fff':'#64748b', display:'flex', alignItems:'center', gap:6 }}>
              <t.Ic size={13}/> {t.l}
              {t.k==='mensajes' && msgs.length>0 && <span style={{ background:subTab===t.k?'rgba(255,255,255,0.3)':'#4f6ef7', color:'#fff', borderRadius:999, padding:'1px 7px', fontSize:10, fontWeight:800 }}>{msgs.length}</span>}
            </button>
          ))}
        </div>

        {subTab==='actividades' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(3,1fr)', gap:12, marginBottom:16 }}>
              {[
                {l:'Acciones totales',   v:SUP_ACTS.length,                           c:'#4f6ef7', Ic:Activity},
                {l:'Reportes generados', v:SUP_ACTS.filter(a=>a.tipo==='reporte').length, c:'#8b5cf6', Ic:FileText},
                {l:'Mensajes enviados',  v:SUP_ACTS.filter(a=>a.tipo==='mensaje').length, c:'#10b981', Ic:MessageSquare},
              ].map((s,i)=>(
                <div key={i} style={{ background:CB, borderRadius:12, padding:'14px 16px', border:`1px solid ${DS.primary}18`, display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:`${s.c}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><s.Ic size={16} color={s.c}/></div>
                  <div><div style={{ fontSize:22, fontWeight:800, color:'#1e293b' }}>{s.v}</div><div style={{ fontSize:11, color:'#9aa5be' }}>{s.l}</div></div>
                </div>
              ))}
            </div>
            <div style={{ background:CB, borderRadius:14, border:`1px solid ${DS.primary}18`, overflow:'hidden' }}>
              <div style={{ padding:'12px 18px', borderBottom:'1px solid #e2e8f0', fontSize:13, fontWeight:700, color:'#1e293b', display:'flex', alignItems:'center', gap:7 }}>
                <Eye size={14} color="#0ea5e9"/> Todo lo que hizo el Supervisor
              </div>
              {SUP_ACTS.map((a,i)=>{
                const Ic = icns[a.tipo] || Activity;
                return (
                  <div key={a.id} style={{ display:'flex', gap:14, padding:'14px 18px', borderBottom:'1px solid #e2e8f0', alignItems:'flex-start' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:`${a.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}><Ic size={16} color={a.color}/></div>
                      {i<SUP_ACTS.length-1&&<div style={{ width:1, height:16, background:'rgba(79,110,247,0.10)', marginTop:3 }}/>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                        <Tag label={a.tipo.charAt(0).toUpperCase()+a.tipo.slice(1)} color={a.color} bg={`${a.color}18`}/>
                        <span style={{ fontSize:11, color:'#9aa5be' }}>{a.time}</span>
                      </div>
                      <div style={{ fontSize:13, color:'#4a5568', lineHeight:1.4 }}>{a.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {subTab==='mensajes' && (
          <div style={{ background:CB, borderRadius:14, border:`1px solid ${DS.primary}18`, overflow:'hidden' }}>
            <div style={{ padding:'12px 18px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:8 }}>
              <MessageSquare size={14} color='#4f6ef7'/>
              <span style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>Mensajes entre asesores y supervisor</span>
              <span style={{ marginLeft:'auto', background:'#fef3c7', color:'#92400e', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6, display:'flex', alignItems:'center', gap:4 }}><Eye size={10}/> Solo lectura</span>
            </div>
            {msgs.length===0 && (
              <div style={{ padding:40, textAlign:'center', color:'#9aa5be', fontSize:13 }}>
                Aún no hay mensajes entre asesores y supervisor.<br/>
                <span style={{ fontSize:11, marginTop:6, display:'block' }}>Aparecerán aquí en tiempo real cuando envíen mensajes.</span>
              </div>
            )}
            {msgs.map((m,i)=>{
              const fromSup = m.de==='sup';
              return (
                <div key={m.id||i} style={{ display:'flex', gap:12, padding:'14px 18px', borderBottom:'1px solid #e2e8f0', alignItems:'flex-start' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:fromSup?'#8b5cf618':'#6366f118', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:fromSup?'#8b5cf6':'#4f6ef7', flexShrink:0 }}>
                    {(m.deNombre||m.de||'?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:5 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{m.deNombre||m.de}</span>
                      <span style={{ padding:'1px 8px', borderRadius:999, fontSize:10, fontWeight:700, color:fromSup?'#6d28d9':'#4338ca', background:fromSup?'#f5f3ff':'#eef2ff' }}>
                        {fromSup?'Supervisora':'Asesor'}
                      </span>
                      <span style={{ fontSize:10, color:'#9aa5be', marginLeft:'auto' }}>
                        {m.hora&&typeof m.hora==='string'&&m.hora.includes('T') ? new Date(m.hora).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) : m.hora||m.time||''}
                      </span>
                    </div>
                    <div style={{ fontSize:13, color:'#4a5568', background:'#f5f7fb', padding:'10px 13px', borderRadius:10, lineHeight:1.5 }}>
                      {m.texto||m.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card title="Distribución de acciones" Icon={BarChart2} iconColor="#0ea5e9">
          {Object.entries(icns).map(([k,Ic])=>{
            const cnt=counts[k]||0;
            const max=Math.max(...Object.values(counts))||1;
            const colors={revision:'#0ea5e9',mensaje:'#4f6ef7',reporte:'#8b5cf6',calendario:'#f59e0b',alerta:'#ef4444',aprobacion:'#10b981'};
            const c=colors[k]||'#94a3b8';
            return (
              <div key={k} style={{ marginBottom:11 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:'#4a5568', display:'flex', alignItems:'center', gap:5 }}><Ic size={12} color={c}/>{k.charAt(0).toUpperCase()+k.slice(1)}</span>
                  <span style={{ fontWeight:800, color:c, fontSize:12 }}>{cnt}</span>
                </div>
                <div style={{ background:'rgba(79,110,247,0.10)', borderRadius:999, height:7 }}>
                  <div style={{ width:`${(cnt/max)*100}%`, height:'100%', background:c, borderRadius:999 }}/>
                </div>
              </div>
            );
          })}
        </Card>

        <Card title="Supervisores activos" Icon={Shield} iconColor="#0ea5e9">
          {INIT_USERS.filter(u=>u.role==='supervisor').map(u=>(
            <div key={u.id} style={{ display:'flex', gap:10, padding:'9px 0', borderBottom:'1px solid #e2e8f0', alignItems:'center' }}>
              <div style={{ position:'relative' }}>
                <Av ini={u.ini} color="#8b5cf6" size={34}/>
                <div style={{ position:'absolute', bottom:0, right:0, width:9, height:9, borderRadius:'50%', background:u.active?'#10b981':'#94a3b8', border:'2px solid #fff' }}/>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>{u.name}</div>
                <div style={{ fontSize:10, color:'#9aa5be' }}>Último acceso {u.lastLogin}</div>
              </div>
            </div>
          ))}
        </Card>

        {msgs.length>0 && (
          <div style={{ background:'#fef3c7', borderRadius:12, padding:'12px 14px', border:'1px solid #fde68a' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#92400e', marginBottom:4, display:'flex', alignItems:'center', gap:5 }}>
              <MessageSquare size={12}/> {msgs.length} mensaje(s) visibles
            </div>
            <div style={{ fontSize:11, color:'#b45309', lineHeight:1.5 }}>Puedes ver todos los mensajes entre asesores y su supervisor en la pestaña "Mensajes".</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════ TAB VENTAS ══════════════════════════ */

function TabVentas({ clients: realClients, users }) {
  const p = DS.primary;
  const clients  = realClients || [];
  const asesores = users?.filter(u=>['advisor','asesor'].includes(u.role))||[];

  // ── State ──
  const [periodo,      setPeriodo]      = useState('mensual');
  const [mesSel,       setMes]          = useState(MESES[new Date().getMonth()]);
  const [showMetaModal,setShowMetaModal]= useState(false);
  const [editTarget,   setEditTarget]   = useState(null); // {key,name,meta}
  const [metaGlobal,   setMetaGlobal]   = useState(null); // null = show edit form
  const [showGlobalEdit,setShowGlobalEdit]=useState(false);
  const [globalInput,  setGlobalInput]  = useState('');
  const [showNotif,    setShowNotif]    = useState(null);

  // Metas stored in localStorage - shared with Pipeline
  const [metas, setMetas] = useState(()=>{
    try{return JSON.parse(localStorage.getItem('crm_metas_admin')||'{}')}catch{return {};}
  });
  const [metaMensualGlobal, setMetaMensualGlobal] = useState(()=>{
    try{return parseInt(localStorage.getItem('crm_meta_global_admin'))||null}catch{return null;}
  });

  const saveMeta = (key,val)=>{
    const updated={...metas,[key]:parseInt(val)||10};
    setMetas(updated);
    localStorage.setItem('crm_metas_admin',JSON.stringify(updated));
    setShowMetaModal(false);
    setShowNotif('✅ Meta actualizada correctamente');
    setTimeout(()=>setShowNotif(null),2500);
  };
  const saveGlobalMeta = (val)=>{
    const n = parseInt(val)||0;
    setMetaMensualGlobal(n);
    localStorage.setItem('crm_meta_global_admin',String(n));
    setShowGlobalEdit(false);
    setShowNotif('✅ Meta global guardada');
    setTimeout(()=>setShowNotif(null),2500);
  };

  // ── Real data from clients ──
  const won  = clients.filter(c=>c.result==='won');
  const lost = clients.filter(c=>c.result==='lost');
  const totalVentas = won.length;
  const ingrEstimados = won.reduce((s,c)=>s+(Number(c.metadata?.saleAmount ?? c.saleAmount)||0),0);
  const totalMeta = metaMensualGlobal ||
    asesores.reduce((s,a)=>s+(metas[a.id||a.name]||10),0) ||
    asesores.length * 10 || 10;
  const pctMeta = Math.min(Math.round((totalVentas/totalMeta)*100),100);
  const fmtMXN = n=>'$'+Number(n).toLocaleString('es-MX');
  const mesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][new Date().getMonth()];

  // Per-asesor real data
  const asesorData = asesores.map(a=>{
    const key = a.id||a.name;
    const mc  = clients.filter(c=>c.asesor===a.name||c.advisor_id===a.id);
    const mw  = mc.filter(c=>c.result==='won');
    const ml  = mc.filter(c=>c.result==='lost');
    const metaA = metas[key]||10;
    const pctA  = Math.min(Math.round((mw.length/metaA)*100),100);
    return{...a,key,ganados:mw.length,perdidos:ml.length,proceso:mc.filter(c=>!c.result).length,
      clientes:mc.length,meta:metaA,pctMeta:pctA,
      ingresos:mw.reduce((s,c)=>s+(Number(c.metadata?.saleAmount ?? c.saleAmount)||0),0),
      tasa:mc.length?Math.round((mw.length/mc.length)*100):0};
  }).sort((a,b)=>b.ganados-a.ganados);

  const card={background:'#fff',borderRadius:16,border:'1px solid #eaecf0',
    boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'};

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>

      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <ReporteVentasBtn/>
      </div>

      {/* Toast */}
      {showNotif&&(
        <div style={{position:'fixed',top:20,right:24,zIndex:99999,
          background:'#1e293b',color:'#fff',borderRadius:12,padding:'12px 20px',
          boxShadow:'0 8px 24px rgba(0,0,0,0.2)',fontSize:13,fontWeight:600,
          display:'flex',alignItems:'center',gap:8}}>
          {showNotif}
        </div>
      )}

      {/* ── MODAL META INDIVIDUAL ── */}
      {showMetaModal&&editTarget&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',
          backdropFilter:'blur(4px)',display:'flex',alignItems:'center',
          justifyContent:'center',zIndex:9999}}
          onClick={e=>{if(e.target===e.currentTarget)setShowMetaModal(false);}}>
          <div style={{background:'#fff',borderRadius:22,padding:30,width:'min(420px,92vw)',
            boxShadow:'0 24px 60px rgba(0,0,0,0.2)',border:'1px solid #eaecf0'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
              <div style={{width:48,height:48,borderRadius:'50%',
                background:`${p}15`,display:'flex',alignItems:'center',
                justifyContent:'center',fontSize:18,fontWeight:800,color:p}}>
                {editTarget.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:'#1e293b'}}>Meta de {editTarget.name}</div>
                <div style={{fontSize:12,color:'#94a3b8'}}>Ventas objetivo — {mesNombre} {new Date().getFullYear()}</div>
              </div>
              <button onClick={()=>setShowMetaModal(false)} style={{marginLeft:'auto',
                border:'none',background:'#f1f5f9',borderRadius:10,padding:8,cursor:'pointer',display:'flex'}}
                onMouseEnter={e=>e.currentTarget.style.background='#e2e8f0'}
                onMouseLeave={e=>e.currentTarget.style.background='#f1f5f9'}>
                <X size={14} color="#64748b"/>
              </button>
            </div>
            {/* Progress actual */}
            <div style={{background:`${p}08`,borderRadius:14,padding:'14px 16px',
              marginBottom:16,border:`1px solid ${p}15`}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>Progreso actual</span>
                <span style={{fontSize:13,fontWeight:800,color:p}}>{editTarget.ganados} / {editTarget.meta}</span>
              </div>
              <div style={{background:'rgba(255,255,255,0.6)',borderRadius:999,height:8,overflow:'hidden'}}>
                <div style={{width:`${editTarget.pctMeta}%`,height:'100%',
                  background:editTarget.pctMeta>=80?'#10b981':editTarget.pctMeta>=50?p:'#f59e0b',
                  borderRadius:999,transition:'width .6s ease'}}/>
              </div>
              <div style={{fontSize:10,color:'#94a3b8',marginTop:5}}>{editTarget.pctMeta}% completado</div>
            </div>
            {/* Input */}
            <label style={{fontSize:11,fontWeight:700,color:'#64748b',letterSpacing:0.5,
              textTransform:'uppercase',display:'block',marginBottom:8}}>
              Nueva meta de ventas
            </label>
            <input type="number" min="1" max="200" defaultValue={editTarget.meta}
              id={`meta-ventas-${editTarget.key}`}
              style={{width:'100%',padding:'14px 16px',border:'2px solid #e2e8f0',
                borderRadius:12,fontSize:28,fontWeight:800,textAlign:'center',
                color:'#1e293b',outline:'none',boxSizing:'border-box',
                marginBottom:12,transition:'border .2s'}}
              onFocus={e=>e.target.style.borderColor=p}
              onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
              {[5,8,10,12,15,20,25,30].map(n=>(
                <button key={n}
                  onClick={()=>{document.getElementById(`meta-ventas-${editTarget.key}`).value=n;}}
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
                  background:'#f8fafc',color:'#64748b',fontWeight:700,fontSize:13,
                  cursor:'pointer',transition:'all .15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#e2e8f0'}
                onMouseLeave={e=>e.currentTarget.style.background='#f8fafc'}>
                Cancelar
              </button>
              <button onClick={()=>saveMeta(editTarget.key, document.getElementById(`meta-ventas-${editTarget.key}`).value)}
                style={{padding:'12px',borderRadius:12,border:'none',
                  background:`linear-gradient(135deg,${p},${p}cc)`,
                  color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',
                  boxShadow:`0 4px 14px ${p}35`,transition:'all .2s'}}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
                onMouseLeave={e=>e.currentTarget.style.transform=''}>
                Guardar meta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:22}}>
        <div>
          <div style={{fontSize:11,color:p,fontWeight:700,letterSpacing:1.5,
            textTransform:'uppercase',marginBottom:4}}>Administrador · Ventas</div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:'#1e293b',letterSpacing:'-0.5px'}}>
            Reporte de Ventas
          </h1>
          <p style={{margin:'5px 0 0',fontSize:13,color:'#94a3b8'}}>
            {mesNombre} {new Date().getFullYear()} · {asesores.length} asesores
          </p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>{setGlobalInput(String(totalMeta));setShowGlobalEdit(true);}}
            style={{padding:'9px 18px',borderRadius:11,border:`1.5px solid ${p}30`,
              background:`${p}08`,color:p,fontSize:12,fontWeight:700,cursor:'pointer',
              display:'flex',alignItems:'center',gap:6,transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.background=p;e.currentTarget.style.color='#fff';}}
            onMouseLeave={e=>{e.currentTarget.style.background=`${p}08`;e.currentTarget.style.color=p;}}>
            <Star size={13}/> Meta global
          </button>
        </div>
      </div>

      {/* ── META GLOBAL BANNER ── */}
      {showGlobalEdit&&(
        <div style={{background:`linear-gradient(135deg,${p},${p}dd)`,borderRadius:16,
          padding:'20px 24px',marginBottom:20,color:'#fff',
          display:'flex',alignItems:'center',gap:16,boxShadow:`0 8px 24px ${p}35`}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:800,marginBottom:4}}>Meta global de ventas — {mesNombre}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.7)'}}>
              Esta meta se distribuye entre todos los asesores. También puedes asignar metas individuales abajo.
            </div>
          </div>
          <input type="number" value={globalInput} onChange={e=>setGlobalInput(e.target.value)}
            style={{width:100,padding:'10px',border:'2px solid rgba(255,255,255,0.4)',
              borderRadius:10,fontSize:22,fontWeight:800,textAlign:'center',
              background:'rgba(255,255,255,0.15)',color:'#fff',outline:'none',
              boxSizing:'border-box'}}
            onFocus={e=>e.target.style.borderColor='rgba(255,255,255,0.9)'}
            onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.4)'}/>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>saveGlobalMeta(globalInput)}
              style={{padding:'10px 20px',borderRadius:10,border:'none',
                background:'rgba(255,255,255,0.25)',color:'#fff',fontWeight:800,
                fontSize:13,cursor:'pointer',transition:'all .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.35)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.25)'}>
              Guardar
            </button>
            <button onClick={()=>setShowGlobalEdit(false)}
              style={{padding:'10px 16px',borderRadius:10,border:'1.5px solid rgba(255,255,255,0.3)',
                background:'transparent',color:'rgba(255,255,255,0.7)',fontWeight:700,
                fontSize:13,cursor:'pointer',transition:'all .15s'}}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── KPI CARDS con META PRINCIPAL ── */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'1.2fr 1fr 1fr 1fr 1fr',gap:MOB?10:14,marginBottom:20}}>

        {/* META CARD — destacada */}
        <div style={{background:`linear-gradient(135deg,${p},${p}cc)`,borderRadius:16,
          padding:'20px',color:'#fff',position:'relative',overflow:'hidden',
          boxShadow:`0 8px 28px ${p}35`,cursor:'pointer',transition:'all .2s'}}
          onClick={()=>setShowGlobalEdit(!showGlobalEdit)}
          onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 14px 36px ${p}45`;}}
          onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 8px 28px ${p}35`;}}>
          <div style={{position:'absolute',top:-30,right:-30,width:110,height:110,
            borderRadius:'50%',background:'rgba(255,255,255,0.1)',pointerEvents:'none'}}/>
          <div style={{position:'absolute',bottom:-40,left:20,width:80,height:80,
            borderRadius:'50%',background:'rgba(255,255,255,0.06)',pointerEvents:'none'}}/>
          <div style={{position:'relative'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
              <div style={{width:40,height:40,borderRadius:11,background:'rgba(255,255,255,0.2)',
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Target size={20} color="#fff"/>
              </div>
              <span style={{fontSize:10,color:'rgba(255,255,255,0.7)',background:'rgba(255,255,255,0.15)',
                borderRadius:999,padding:'3px 10px',fontWeight:700,cursor:'pointer'}}>Editar</span>
            </div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.75)',fontWeight:700,
              marginBottom:4,letterSpacing:0.5,textTransform:'uppercase'}}>Meta del mes</div>
            <div style={{fontSize:38,fontWeight:900,lineHeight:1,marginBottom:4}}>{totalMeta}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',marginBottom:12}}>ventas objetivo</div>
            {/* Progress */}
            <div style={{background:'rgba(255,255,255,0.2)',borderRadius:999,height:8,overflow:'hidden',marginBottom:6}}>
              <div style={{width:`${pctMeta}%`,height:'100%',background:'#fff',
                borderRadius:999,transition:'width .8s ease',
                boxShadow:'0 0 8px rgba(255,255,255,0.5)'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(255,255,255,0.75)'}}>
              <span>{totalVentas} logradas</span><span>{pctMeta}% completo</span>
            </div>
          </div>
        </div>

        {/* Otros KPIs */}
        {[
          {Icon:Trophy,    l:'Ventas cerradas',  v:totalVentas,          c:'#10b981',sub:'este mes'},
          {Icon:XCircle,   l:'Perdidas',          v:lost.length,          c:'#ef4444',sub:'a recuperar'},
          {Icon:DollarSign,l:'Ingresos est.',     v:fmtMXN(ingrEstimados),c:'#f59e0b',sub:'generados',sm:true},
          {Icon:BarChart2, l:'Conversión',        v:`${clients.length?Math.round((totalVentas/clients.length)*100):0}%`,c:'#8b5cf6',sub:'tasa global'},
        ].map((k,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:16,padding:'18px',
            border:'1px solid #eaecf0',borderTop:`3px solid ${k.c}`,
            boxShadow:'0 1px 3px rgba(0,0,0,0.05)',transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 24px ${k.c}18`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)';}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
              <div style={{width:38,height:38,borderRadius:10,background:`${k.c}12`,
                border:`1px solid ${k.c}20`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <k.Icon size={17} color={k.c} strokeWidth={2}/>
              </div>
              <div style={{width:3,height:38,borderRadius:999,
                background:`linear-gradient(180deg,${k.c},${k.c}44)`}}/>
            </div>
            <div style={{fontSize:k.sm?18:28,fontWeight:800,color:'#1e293b',lineHeight:1,marginBottom:3}}>{k.v}</div>
            <div style={{fontSize:11,fontWeight:700,color:'#1e293b',marginBottom:2}}>{k.l}</div>
            <div style={{fontSize:10,color:'#94a3b8'}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── TABLA ASESORES CON METAS INDIVIDUALES ── */}
      <div style={{...card,marginBottom:16}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',
          borderLeft:`3px solid ${p}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <UserCheck size={14} color={p}/>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>Metas individuales por asesor</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>Haz clic en "Meta" para editar · Los cambios se reflejan en Pipeline</div>
            </div>
          </div>
          <div style={{fontSize:11,color:'#94a3b8'}}>
            Total meta: <b style={{color:p}}>{totalMeta}</b> · Logrado: <b style={{color:'#10b981'}}>{totalVentas}</b>
          </div>
        </div>

        {/* Headers */}
        <div style={{display:'grid',gridTemplateColumns:MOB?'1fr 55px 55px 55px 55px 110px 70px':'1fr 80px 80px 80px 80px 160px 90px',
          gap:10,padding:'10px 20px',background:'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
          {['Asesor','Clientes','Ganados','Perdidos','Tasa','Progreso meta','Acción'].map((h,i)=>(
            <div key={i} style={{fontSize:9,fontWeight:700,color:'#94a3b8',
              letterSpacing:0.5,textAlign:i>0?'center':'left'}}>{h}</div>
          ))}
        </div>

        {asesorData.length===0&&(
          <div style={{padding:'32px',textAlign:'center',color:'#94a3b8',fontSize:13}}>
            Sin asesores registrados
          </div>
        )}
        {asesorData.map((a,i)=>(
          <div key={a.key||i}
            style={{display:'grid',gridTemplateColumns:MOB?'1fr 55px 55px 55px 55px 110px 70px':'1fr 80px 80px 80px 80px 160px 90px',
              gap:10,padding:'14px 20px',borderBottom:'1px solid #f8fafc',alignItems:'center',
              transition:'background .15s',cursor:'default'}}
            onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>

            {/* Asesor */}
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:36,height:36,borderRadius:'50%',
                background:`linear-gradient(135deg,${p}22,${p}10)`,
                border:`2px solid ${p}25`,display:'flex',alignItems:'center',
                justifyContent:'center',fontSize:14,fontWeight:800,color:p,flexShrink:0}}>
                {a.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{a.name}</div>
                <div style={{fontSize:10,color:'#94a3b8'}}>Meta: {a.meta} ventas · {fmtMXN(a.ingresos)} est.</div>
              </div>
            </div>

            <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#64748b'}}>{a.clientes}</div>
            <div style={{textAlign:'center',fontSize:14,fontWeight:800,color:'#10b981'}}>{a.ganados}</div>
            <div style={{textAlign:'center',fontSize:14,fontWeight:700,color:'#ef4444'}}>{a.perdidos}</div>

            {/* Tasa */}
            <div style={{textAlign:'center'}}>
              <span style={{fontSize:12,fontWeight:800,padding:'3px 10px',borderRadius:999,
                color:a.tasa>=60?'#10b981':a.tasa>=30?'#f59e0b':'#ef4444',
                background:a.tasa>=60?'#f0fdf9':a.tasa>=30?'#fffbeb':'#fef2f2'}}>
                {a.tasa}%
              </span>
            </div>

            {/* Barra de progreso meta */}
            <div style={{padding:'0 4px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <span style={{fontSize:10,color:'#94a3b8'}}>{a.ganados}/{a.meta}</span>
                <span style={{fontSize:10,fontWeight:800,
                  color:a.pctMeta>=80?'#10b981':a.pctMeta>=50?p:'#f59e0b'}}>{a.pctMeta}%</span>
              </div>
              <div style={{background:'#f1f5f9',borderRadius:999,height:8,overflow:'hidden'}}>
                <div style={{width:`${a.pctMeta}%`,height:'100%',
                  background:a.pctMeta>=80?'#10b981':a.pctMeta>=50?p:'#f59e0b',
                  borderRadius:999,transition:'width .6s ease',
                  boxShadow:a.pctMeta>=80?'0 0 6px #10b98155':''}}/>
              </div>
              {a.pctMeta>=100&&(
                <div style={{fontSize:9,color:'#10b981',fontWeight:700,marginTop:3,textAlign:'center'}}>
                  ¡Meta cumplida!
                </div>
              )}
            </div>

            {/* Botón editar meta */}
            <div style={{textAlign:'center'}}>
              <button
                onClick={()=>{setEditTarget(a);setShowMetaModal(true);}}
                style={{padding:'7px 14px',borderRadius:9,border:`1.5px solid ${p}30`,
                  background:`${p}08`,color:p,fontSize:11,fontWeight:700,cursor:'pointer',
                  display:'inline-flex',alignItems:'center',gap:5,transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background=p;e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor=p;}}
                onMouseLeave={e=>{e.currentTarget.style.background=`${p}08`;e.currentTarget.style.color=p;e.currentTarget.style.borderColor=`${p}30`;}}>
                <Star size={11}/> Meta
              </button>
            </div>
          </div>
        ))}

        {/* Footer totales */}
        {asesorData.length > 0 && (
          <div style={{display:'grid',gridTemplateColumns:MOB?'1fr 55px 55px 55px 55px 110px 70px':'1fr 80px 80px 80px 80px 160px 90px',
            gap:10,padding:'12px 20px',background:`${p}06`,borderTop:`2px solid ${p}20`,alignItems:'center'}}>
            <div style={{fontSize:12,fontWeight:800,color:p,display:'flex',alignItems:'center',gap:6}}>
              <BarChart2 size={13}/> Totales del equipo
            </div>
            <div style={{textAlign:'center',fontSize:13,fontWeight:800,color:'#1e293b'}}>
              {asesorData.reduce((s,a)=>s+a.clientes,0)}
            </div>
            <div style={{textAlign:'center',fontSize:14,fontWeight:900,color:'#10b981'}}>
              {totalVentas}
            </div>
            <div style={{textAlign:'center',fontSize:14,fontWeight:800,color:'#ef4444'}}>
              {asesorData.reduce((s,a)=>s+a.perdidos,0)}
            </div>
            <div style={{textAlign:'center'}}>
              <span style={{fontSize:12,fontWeight:800,padding:'4px 12px',borderRadius:999,
                color:pctMeta>=60?'#10b981':pctMeta>=30?p:'#ef4444',
                background:pctMeta>=60?'#f0fdf9':pctMeta>=30?`${p}10`:'#fef2f2'}}>
                {clients.length?Math.round((totalVentas/clients.length)*100):0}%
              </span>
            </div>
            <div style={{padding:'0 4px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontSize:10,color:p,fontWeight:700}}>{totalVentas}/{totalMeta}</span>
                <span style={{fontSize:10,fontWeight:800,color:p}}>{pctMeta}%</span>
              </div>
              <div style={{background:'rgba(255,255,255,0.5)',borderRadius:999,height:8,overflow:'hidden'}}>
                <div style={{width:`${pctMeta}%`,height:'100%',
                  background:`linear-gradient(90deg,${p},#10b981)`,borderRadius:999}}/>
              </div>
            </div>
            <div/>
          </div>
        )}
      </div>

      {/* ── RESUMEN VENTAS POR MES (datos reales del sistema) ── */}
      <div style={card}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',
          borderLeft:'3px solid #10b981',display:'flex',alignItems:'center',gap:8}}>
          <TrendingUp size={14} color="#10b981"/>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>Resumen del período actual</div>
            <div style={{fontSize:11,color:'#94a3b8'}}>Datos reales del sistema</div>
          </div>
        </div>
        <div style={{padding:'20px',display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:MOB?10:16}}>
          {[
            {l:'Clientes totales',    v:clients.length,                     c:p,        Icon:Users},
            {l:'Ventas cerradas',     v:totalVentas,                        c:'#10b981', Icon:Trophy},
            {l:'Ingresos estimados',  v:fmtMXN(ingrEstimados),              c:'#f59e0b', Icon:DollarSign, sm:true},
            {l:'Faltan para meta',    v:Math.max(0,totalMeta-totalVentas),  c:'#ef4444', Icon:Target},
          ].map((s,i)=>(
            <div key={i} style={{textAlign:'center',padding:'18px 12px',background:'#f8fafc',
              borderRadius:14,border:`1px solid ${s.c}15`,transition:'all .2s',cursor:'default'}}
              onMouseEnter={e=>{e.currentTarget.style.background=`${s.c}06`;e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.transform='';}}>
              <div style={{width:40,height:40,borderRadius:11,background:`${s.c}12`,
                border:`1px solid ${s.c}20`,display:'flex',alignItems:'center',justifyContent:'center',
                margin:'0 auto 10px'}}>
                <s.Icon size={18} color={s.c} strokeWidth={2}/>
              </div>
              <div style={{fontSize:s.sm?16:26,fontWeight:800,color:s.c,lineHeight:1,marginBottom:4}}>{s.v}</div>
              <div style={{fontSize:11,color:'#64748b',fontWeight:600}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabMensajes({ users }) {
  const [msgs,     setMsgs]   = useState([]);
  const [activeTo, setTo]     = useState(null);
  const [texto,    setTexto]  = useState('');
  const [loading,  setLoading]= useState(true);
  const endRef = useRef(null);

  const supervisores = users.filter(u=>u.role==='supervisor');
  const asesores     = users.filter(u=>u.role==='advisor'||u.role==='asesor');
  const contactoActivo = users.find(u=>u.id===activeTo);

  useEffect(()=>{
    if(users.length>0 && !activeTo) setTo(users[0]?.id||null);
  },[users.length]);

  useEffect(()=>{
    setLoading(true);
    apiFetch('GET','/api/admin/messages')
      .then(r=>setMsgs(Array.isArray(r)?r:[]))
      .catch(()=>setMsgs([]))
      .finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}); },[msgs,activeTo]);

  async function enviar() {
    if(!texto.trim()||!activeTo) return;
    try {
      const r = await apiFetch('POST','/api/admin/messages',{ toId:activeTo, texto:texto.trim() });
      setMsgs(p=>[...p,r]);
      setTexto('');
    } catch(e){ alert(e.message); }
  }

  const conv = msgs.filter(m=>m.from_id===activeTo||m.to_id===activeTo).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));

  return (
    <div style={{ display:MOB?'block':'grid', gridTemplateColumns:'250px 1fr', gap:0, background:CB, borderRadius:14, border:`1px solid ${DS.primary}18`, overflow:'hidden', minHeight:MOB?'auto':520 }}>
      {/* Contactos */}
      <div style={{ borderRight:MOB?'none':'1px solid rgba(79,110,247,0.08)', borderBottom:MOB?'1px solid rgba(79,110,247,0.08)':'none', overflowY:'auto', maxHeight:MOB?220:'none' }}>
        <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid #e2e8f0', fontSize:13, fontWeight:700, color:'#1e293b' }}>Conversaciones</div>

        {/* Supervisores */}
        {supervisores.length>0&&<div style={{ padding:'6px 16px', fontSize:10, fontWeight:700, color:'#9aa5be', textTransform:'uppercase' }}>Supervisores</div>}
        {supervisores.map(u=>{
          const unread=msgs.filter(m=>m.from_id===u.id&&!m.leido).length;
          const last=[...msgs].filter(m=>m.from_id===u.id||m.to_id===u.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
          return(
            <div key={u.id} onClick={()=>setTo(u.id)} style={{ padding:'10px 16px', display:'flex', gap:9, alignItems:'center', cursor:'pointer', background:activeTo===u.id?'#f5f3ff':'transparent', borderBottom:'1px solid #e2e8f0' }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <Av ini={u.ini||(u.name||'?').charAt(0)} color="#8b5cf6" size={34}/>
                <div style={{ position:'absolute', bottom:0, right:0, width:9, height:9, borderRadius:'50%', background:u.active||u.status==='active'?'#10b981':'#94a3b8', border:'2px solid #fff' }}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>{(u.name||'').split(' ')[0]}</span>
                  {last&&<span style={{ fontSize:9, color:'#9aa5be' }}>{new Date(last.created_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</span>}
                </div>
                <div style={{ fontSize:10, color:'#9aa5be', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{last?.texto||'Sin mensajes'}</div>
              </div>
              {unread>0&&<div style={{ width:16, height:16, borderRadius:'50%', background:'#8b5cf6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'#fff' }}>{unread}</div>}
            </div>
          );
        })}

        {/* Asesores */}
        {asesores.length>0&&<div style={{ padding:'6px 16px', fontSize:10, fontWeight:700, color:'#9aa5be', textTransform:'uppercase', marginTop:4 }}>Asesores</div>}
        {asesores.map(u=>{
          const unread=msgs.filter(m=>m.from_id===u.id&&!m.leido).length;
          const last=[...msgs].filter(m=>m.from_id===u.id||m.to_id===u.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
          return(
            <div key={u.id} onClick={()=>setTo(u.id)} style={{ padding:'10px 16px', display:'flex', gap:9, alignItems:'center', cursor:'pointer', background:activeTo===u.id?'rgba(79,110,247,0.18)':'transparent', borderBottom:'1px solid #e2e8f0' }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <Av ini={u.ini||(u.name||'?').charAt(0)} color='#4f6ef7' size={34}/>
                <div style={{ position:'absolute', bottom:0, right:0, width:9, height:9, borderRadius:'50%', background:u.active||u.status==='active'?'#10b981':'#94a3b8', border:'2px solid #fff' }}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>{(u.name||'').split(' ')[0]}</span>
                  {last&&<span style={{ fontSize:9, color:'#9aa5be' }}>{new Date(last.created_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</span>}
                </div>
                <div style={{ fontSize:10, color:'#9aa5be', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{last?.texto||'Sin mensajes'}</div>
              </div>
              {unread>0&&<div style={{ width:16, height:16, borderRadius:'50%', background:'#4f6ef7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'#fff' }}>{unread}</div>}
            </div>
          );
        })}
        {supervisores.length===0&&asesores.length===0&&<div style={{ padding:20, textAlign:'center', color:'#9aa5be', fontSize:12 }}>Sin contactos</div>}
      </div>

      {/* Chat */}
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        {contactoActivo?(
          <div style={{ padding:'12px 18px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:10, background:'#f5f7fb' }}>
            <Av ini={contactoActivo.ini||(contactoActivo.name||'?').charAt(0)} color={contactoActivo.role==='supervisor'?'#8b5cf6':'#4f6ef7'} size={36}/>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#1e293b' }}>{contactoActivo.name}</div>
              <div style={{ fontSize:11, color:contactoActivo.role==='supervisor'?'#8b5cf6':'#4f6ef7', fontWeight:600 }}>
                {contactoActivo.role==='supervisor'?'Supervisor':'Asesor'}
              </div>
            </div>
          </div>
        ):(
          <div style={{ padding:'12px 18px', borderBottom:'1px solid #e2e8f0', background:'#f5f7fb', color:'#9aa5be', fontSize:12 }}>Selecciona un contacto</div>
        )}

        <div style={{ flex:1, overflowY:'auto', padding:'16px 18px', display:'flex', flexDirection:'column', gap:10, minHeight:300 }}>
          {loading&&<div style={{ color:'#9aa5be', fontSize:12, textAlign:'center', marginTop:40 }}>Cargando mensajes...</div>}
          {!loading&&conv.length===0&&<div style={{ color:'#9aa5be', fontSize:12, textAlign:'center', marginTop:40 }}>Sin mensajes todavía. ¡Inicia la conversación!</div>}
          {conv.map(m=>{
            const mine=m.from_role==='admin';
            return(
              <div key={m.id} style={{ display:'flex', justifyContent:mine?'flex-end':'flex-start' }}>
                <div style={{ maxWidth:'72%', padding:'10px 14px', borderRadius:mine?'14px 14px 4px 14px':'14px 14px 14px 4px', background:mine?DS.primary:'#f1f5f9', color:mine?'#fff':'#374151', fontSize:13, lineHeight:1.5 }}>
                  {!mine&&<div style={{ fontSize:10, fontWeight:700, color:'#4f6ef7', marginBottom:2 }}>{m.from_name}</div>}
                  {m.texto}
                  <div style={{ fontSize:10, marginTop:4, opacity:0.65, textAlign:'right' }}>{new Date(m.created_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef}/>
        </div>

        <div style={{ padding:'10px 16px', borderTop:'1px solid #e2e8f0', display:'flex', gap:10, alignItems:'flex-end' }}>
          <textarea value={texto} onChange={e=>setTexto(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviar();}}}
            placeholder={contactoActivo?`Escribe a ${(contactoActivo.name||'').split(' ')[0]}... (Enter para enviar)`:'Selecciona un contacto'}
            rows={2} disabled={!activeTo}
            style={{ flex:1, padding:'9px 13px', border:'1px solid #cbd5e1', borderRadius:10, fontSize:13, resize:'none', outline:'none', background:!activeTo?'#f8fafc':'#fff' }}/>
          <button onClick={enviar} disabled={!texto.trim()||!activeTo}
            style={{ padding:'12px 16px', borderRadius:10, border:'none', background:!texto.trim()||!activeTo?'#f1f5f9':'#4f6ef7', color:!texto.trim()||!activeTo?'#94a3b8':'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontWeight:700 }}>
            <Send size={14}/> Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════ TAB USUARIOS (Crear/Editar/Eliminar) ══════════════════════════ */
function TabUsuarios({ users, setUsers, planInfo, onRefresh }) {
  const [modal,  setModal]  = useState(false);
  const [editId, setEditId] = useState(null);
  const [fRole,  setFRole]  = useState('all');
  const [form,   setForm]   = useState({ name:'', email:'', phone:'', role:'asesor', pass:'', active:true });
  const [verPass,setVerPass]= useState(false);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const PLAN_LABELS = { starter:'Starter', growth:'Growth', enterprise:'Enterprise' };
  const maxAdvisors    = planInfo?.max_advisors    ?? 12;
  const maxSupervisors = planInfo?.max_supervisors ?? 1;
  const plan           = planInfo?.plan            ?? 'starter';
  const curAdvisors    = users.filter(u=>u.role==='advisor'||u.role==='asesor').length;
  const curSupervisors = users.filter(u=>u.role==='supervisor').length;

  function abrirNuevo() {
    setForm({ name:'', email:'', phone:'', role:'asesor', pass:'', active:true });
    setEditId(null); setErrMsg(''); setModal(true);
  }
  function abrirEditar(u) {
    setForm({ name:u.name, email:u.email, phone:u.phone||'', role:u.role, pass:'', active:u.active });
    setEditId(u.id); setErrMsg(''); setModal(true);
  }
  async function guardar() {
    if(!form.name||!form.email){ setErrMsg('Nombre y email son obligatorios'); return; }
    if(!editId&&!form.pass){ setErrMsg('La contraseña es obligatoria'); return; }
    setSaving(true); setErrMsg('');
    try {
      const body = { name:form.name, email:form.email, phone:form.phone, role:form.role==='asesor'?'advisor':form.role, status:form.active?'active':'inactive' };
      if(form.pass) body.password = form.pass;
      if(editId) {
        const r = await apiFetch('PUT',`/api/admin/users/${editId}`, body);
        setUsers(p=>p.map(u=>u.id===editId?{...u,...r,active:r.status==='active',ini:r.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}:u));
      } else {
        const r = await apiFetch('POST','/api/admin/users', body);
        setUsers(p=>[...p,{...r,active:r.status==='active',pass:'',ini:r.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase(),lastLogin:'Nunca',created:r.created_at?.split('T')[0]||'—'}]);
      }
      setModal(false);
    } catch(e) { setErrMsg(e.message); }
    setSaving(false);
  }
  async function toggleActivo(id, currentActive) {
    try {
      await apiFetch('PUT',`/api/admin/users/${id}`,{status:currentActive?'inactive':'active'});
      setUsers(p=>p.map(u=>u.id===id?{...u,active:!currentActive,status:currentActive?'inactive':'active'}:u));
    } catch(e) { alert(e.message); }
  }
  function eliminar(id) {
    askConfirm('Este usuario será eliminado y ya no podrá acceder al sistema.', async () => {
      try {
        await apiFetch('DELETE',`/api/admin/users/${id}`);
        setUsers(p=>p.filter(u=>u.id!==id));
      } catch(e) { alert(e.message); }
    });
  }

  const lista = users.filter(u=>fRole==='all'||(fRole==='asesor'?(u.role==='asesor'||u.role==='advisor'):u.role===fRole));

  return (
    <div style={{ display:'grid', gridTemplateColumns:MOB?'1fr':'1fr 250px', gap:18 }}>
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ display:'flex', gap:8 }}>
            {[{k:'all',l:'Todos'},{k:'supervisor',l:'Supervisores'},{k:'asesor',l:'Asesores'}].map(f=>(
              <button key={f.k} onClick={()=>setFRole(f.k)} style={{ padding:'7px 14px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', background:fRole===f.k?DS.primary:'#f1f5f9', color:fRole===f.k?'#fff':'#64748b' }}>
                {f.l} ({f.k==='all'?users.length:users.filter(u=>f.k==='asesor'?(u.role==='asesor'||u.role==='advisor'):u.role===f.k).length})
              </button>
            ))}
          </div>
          <div style={{ fontSize:12, color:'#64748b', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'8px 14px', display:'flex', alignItems:'center', gap:6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Solo el Super Admin puede crear usuarios
          </div>
        </div>

        <div style={{ background:CB, borderRadius:14, border:`1px solid ${DS.primary}18`, overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
            <thead>
              <tr style={{ background:'#f5f7fb' }}>
                {['Usuario','Email','Teléfono','Rol','Acceso','Creado','Acciones'].map(h=>(
                  <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#9aa5be', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(u=>(
                <tr key={u.id} style={{ borderTop:'1px solid #e2e8f0' }}>
                  <td style={{ padding:'11px 12px' }}>
                    <div style={{ display:'flex', gap:9, alignItems:'center' }}>
                      <Av ini={u.ini} color={u.role==='supervisor'?'#8b5cf6':'#4f6ef7'} size={32}/>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{u.name}</div>
                        <div style={{ fontSize:10, color:'#9aa5be' }}>{u.lastLogin}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'11px 12px', fontSize:12, color:'#4a5568' }}>{u.email}</td>
                  <td style={{ padding:'11px 12px', fontSize:12, color:'#4a5568' }}>{u.phone}</td>
                  <td style={{ padding:'11px 12px' }}>
                    <Tag label={u.role==='supervisor'?'Supervisor':'Asesor'} color={u.role==='supervisor'?'#6d28d9':'#4338ca'} bg={u.role==='supervisor'?'#f5f3ff':'#eef2ff'}/>
                  </td>
                  <td style={{ padding:'11px 12px' }}>
                    <button onClick={()=>toggleActivo(u.id)} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:999, border:'none', background:u.active?'#d1fae5':'#f1f5f9', color:u.active?'#065f46':'#64748b', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background:u.active?'#10b981':'#94a3b8' }}/>
                      {u.active?'Activo':'Inactivo'}
                    </button>
                  </td>
                  <td style={{ padding:'11px 12px', fontSize:12, color:'#9aa5be' }}>{u.created}</td>
                  <td style={{ padding:'11px 12px' }}>
                    <div style={{ display:'flex', gap:5 }}>
                      <button onClick={()=>abrirEditar(u)} style={{ padding:'6px 9px', borderRadius:7, border:'none', background:'rgba(79,110,247,0.10)', cursor:'pointer', display:'flex' }}><Edit2 size={13} color='#4f6ef7'/></button>
                      <button onClick={()=>eliminar(u.id)} style={{ padding:'6px 9px', borderRadius:7, border:'none', background:'#fef2f2', cursor:'pointer', display:'flex' }}><Trash2 size={13} color="#ef4444"/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!lista.length&&<tr><td colSpan={7} style={{ padding:32, textAlign:'center', color:'#9aa5be' }}>Sin usuarios</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card title="Resumen y límites" Icon={Users}>
          {[
            {l:'Total usuarios',   v:users.length,        c:'#4f6ef7', Ic:Users},
            {l:'Supervisores',     v:curSupervisors,      c:'#8b5cf6', Ic:Shield},
            {l:'Asesores',         v:curAdvisors,         c:'#4f6ef7', Ic:UserCheck},
            {l:'Activos',          v:users.filter(u=>u.active).length, c:'#10b981', Ic:Activity},
          ].map((s,i)=>(
            <div key={i} style={{ display:'flex', gap:10, alignItems:'center', padding:'8px 0', borderBottom:'1px solid #e2e8f0' }}>
              <div style={{ width:28, height:28, borderRadius:7, background:`${s.c}18`, display:'flex', alignItems:'center', justifyContent:'center' }}><s.Ic size={12} color={s.c}/></div>
              <div style={{ flex:1, fontSize:12, fontWeight:600, color:'#4a5568' }}>{s.l}</div>
              <div style={{ fontSize:16, fontWeight:800, color:s.c }}>{s.v}</div>
            </div>
          ))}
          <div style={{ marginTop:10, background:'#f5f7fb', borderRadius:9, padding:'10px 12px' }}>
            <div style={{ fontSize:10, fontWeight:800, color:'#4338ca', marginBottom:7 }}>LÍMITES DEL PLAN {(PLAN_LABELS[plan]||plan).toUpperCase()}</div>
            {[
              {l:'Asesores',     v:curAdvisors,     max:maxAdvisors,    c:'#4f6ef7'},
              {l:'Supervisores', v:curSupervisors,  max:maxSupervisors, c:'#8b5cf6'},
            ].map((s,i)=>{
              const pct=s.max>=9999?20:Math.min((s.v/s.max)*100,100);
              const over=s.max<9999&&s.v>=s.max;
              return(
                <div key={i} style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                    <span style={{ fontWeight:600, color:'#4a5568' }}>{s.l}</span>
                    <span style={{ fontWeight:800, color:over?'#ef4444':s.c }}>{s.v}/{s.max>=9999?'∞':s.max}</span>
                  </div>
                  <div style={{ background:'rgba(79,110,247,0.10)', borderRadius:999, height:5 }}>
                    <div style={{ width:`${pct}%`, height:'100%', background:over?'#ef4444':s.c, borderRadius:999 }}/>
                  </div>
                  {over&&<div style={{ fontSize:9, color:'#ef4444', marginTop:2 }}>️ Límite alcanzado — mejora tu plan</div>}
                </div>
              );
            })}
          </div>
        </Card>
        <button onClick={abrirNuevo} style={{ padding:'12px 0', borderRadius:12, border:'none', background:'#4f6ef7', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <UserPlus size={16}/> Crear nuevo usuario
        </button>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(8px)', background:'rgba(79,110,247,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
          <div style={{ background:'#ffffff', borderRadius:22, padding:30, width:'min(440px,92vw)', boxShadow:'0 24px 60px rgba(0,0,0,0.3)', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:800, color:'#1e293b' }}>{editId?'Editar usuario':'Nuevo usuario'}</h3>
              <button onClick={()=>setModal(false)} style={{ border:'none', background:'none', cursor:'pointer' }}><X size={18} color="#94a3b8"/></button>
            </div>

            {/* Rol */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
              {[{k:'asesor',l:'Asesor',Ic:UserCheck},{k:'supervisor',l:'Supervisor',Ic:Shield}].map(r=>(
                <button key={r.k} onClick={()=>setForm(p=>({...p,role:r.k}))} style={{ padding:'10px 0', borderRadius:10, border:form.role===r.k?'2px solid #6366f1':'2px solid #e2e8f0', background:form.role===r.k?'#eef2ff':'#fafafa', color:form.role===r.k?DS.primary:'#64748b', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <r.Ic size={14}/> {r.l}
                </button>
              ))}
            </div>

            <div style={{ display:'grid', gap:10, marginBottom:16 }}>
              {[
                {p:'Nombre completo *', k:'name',  t:'text'},
                {p:'Correo electrónico *', k:'email', t:'email'},
                {p:'Teléfono',          k:'phone', t:'tel'},
              ].map(f=>(
                <input key={f.k} type={f.t} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p}
                  style={{ padding:'10px 13px', border:'1px solid #cbd5e1', borderRadius:9, fontSize:13, outline:'none' }}/>
              ))}
              <div style={{ position:'relative' }}>
                <input type={verPass?'text':'password'} value={form.pass} onChange={e=>setForm(p=>({...p,pass:e.target.value}))} placeholder={editId?'Nueva contraseña (vacío = sin cambio)':'Contraseña de acceso *'}
                  style={{ width:'100%', padding:'10px 40px 10px 13px', border:'1px solid #cbd5e1', borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box' }}/>
                <button onClick={()=>setVerPass(v=>!v)} style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', border:'none', background:'none', cursor:'pointer', color:'#9aa5be', display:'flex' }}>
                  <Eye size={16}/>
                </button>
              </div>
            </div>

            {/* Toggle activo */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#f5f7fb', borderRadius:10, marginBottom:16, cursor:'pointer' }} onClick={()=>setForm(p=>({...p,active:!p.active}))}>
              <div style={{ width:42, height:23, borderRadius:999, background:form.active?DS.primary:'#d1d5db', position:'relative', transition:'background .2s', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:form.active?20:3, width:17, height:17, borderRadius:'50%', background:'#ffffff', transition:'left .2s' }}/>
              </div>
              <span style={{ fontSize:13, fontWeight:600, color:form.active?DS.primary:'#94a3b8' }}>{form.active?'Activo — puede acceder al sistema':'Inactivo — sin acceso al sistema'}</span>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              {errMsg && <div style={{ gridColumn:'1/-1', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'9px 12px', color:'#dc2626', fontSize:12, marginBottom:4 }}>{errMsg}</div>}
              <button onClick={()=>setModal(false)} style={{ flex:1, padding:'11px 0', borderRadius:10, border:'1px solid #cbd5e1', background:'#f5f7fb', color:'#9aa5be', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}><X size={14}/> Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ flex:2, padding:'11px 0', borderRadius:10, border:'none', background:saving?'#a5b4fc':'#4f6ef7', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}><Save size={14}/> {saving?'Guardando...':editId?'Guardar cambios':'Crear usuario'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════ TAB EMPLEADOS ══════════════════════════ */
const DEPT_COLORS = { Ventas:'#4f6ef7', Supervisión:'#8b5cf6', Administración:'#0ea5e9', Marketing:'#f59e0b', Operaciones:'#10b981' };
const DEPTS = Object.keys(DEPT_COLORS);

function TabEmpleados({ employees:initEmps, setEmployees, onRefresh }) {
  const [emps, setEmps] = useState(Array.isArray(initEmps) ? initEmps : []);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  
  useEffect(() => {
    if (initEmps && initEmps.length > 0) setEmps(initEmps);
  }, [initEmps]);
  
  // Override guardar to use API
  const guardarAPI = async (form, editId, onSuccess) => {
    setSaving(true); setErrMsg('');
    try {
      const body = { name:form.name, email:form.email, phone:form.phone, puesto:form.puesto||form.cargo, department:form.dept||form.department, salary:form.salario||form.salary, hire_date:form.ingreso||form.hire_date };
      let r;
      if (editId) { r = await apiFetch('PUT',`/api/admin/employees/${editId}`, body); }
      else        { r = await apiFetch('POST','/api/admin/employees', body); }
      if (onRefresh) onRefresh();
      onSuccess(r);
    } catch(e) { setErrMsg(e.message); }
    setSaving(false);
  };
  const eliminarAPI = (id, onSuccess) => {
    askConfirm('Este empleado será eliminado permanentemente.', async () => {
      try { await apiFetch('DELETE',`/api/admin/employees/${id}`); onSuccess(id); }
      catch(e) { alert(e.message); }
    });
  };

  const [modal,   setModal]  = useState(false);
  const [editId,  setEditId] = useState(null);
  const [detail,  setDetail] = useState(null);
  const [search,  setSearch] = useState('');
  const [fStatus, setFS]     = useState('all');
  const [form,    setForm]   = useState({ name:'', puesto:'', dept:'Ventas', phone:'', email:'', ingreso:'', salario:'', status:'activo' });

  function abrirNuevo() {
    setForm({ name:'', puesto:'', dept:'Ventas', phone:'', email:'', ingreso:new Date().toISOString().split('T')[0], salario:'', status:'activo' });
    setEditId(null); setModal(true);
  }
  function abrirEditar(e, ev) { ev.stopPropagation(); setForm({ name:e.name, puesto:e.puesto, dept:e.dept, phone:e.phone, email:e.email, ingreso:e.ingreso, salario:e.salario, status:e.status }); setEditId(e.id); setModal(true); }
  function guardar() {
    if(!form.name||!form.puesto){ alert('Nombre y puesto son obligatorios'); return; }
    if(editId) {
      setEmps(p=>p.map(e=>e.id===editId?{...e,...form}:e));
    } else {
      const ini=form.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      setEmps(p=>[...p,{ id:'e'+Date.now(), ...form, ini }]);
    }
    setModal(false);
  }
  function eliminar(id, ev) { ev.stopPropagation(); askConfirm('Este empleado será eliminado permanentemente.', ()=>setEmps(p=>p.filter(e=>e.id!==id))); }

  const lista = emps.filter(e => {
    const ms=e.name.toLowerCase().includes(search.toLowerCase())||e.puesto.toLowerCase().includes(search.toLowerCase());
    const mf=fStatus==='all'||e.status===fStatus;
    return ms&&mf;
  });

  return (
    <div style={{ display:'grid', gridTemplateColumns:MOB?'1fr':'1fr 255px', gap:18 }}>
      <div>
        <ExportButtons roles={['leads','clients','ventas','equipo']}/>
      {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)', gap:10, marginBottom:14 }}>
          {[
            {l:'Total empleados', v:emps.length,                        c:'#4f6ef7'},
            {l:'Activos',         v:emps.filter(e=>e.status==='activo').length, c:'#10b981'},
            {l:'Inactivos',       v:emps.filter(e=>e.status!=='activo').length, c:'#94a3b8'},
            {l:'Departamentos',   v:[...new Set(emps.map(e=>e.dept))].length,   c:'#f59e0b'},
          ].map((s,i)=>(
            <div key={i} style={{ background:CB, borderRadius:10, padding:'10px 14px', border:`1px solid ${DS.primary}18`, borderLeft:`3px solid ${s.c}` }}>
              <div style={{ fontSize:22, fontWeight:800, color:s.c }}>{s.v}</div>
              <div style={{ fontSize:11, color:'#9aa5be' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
          <div style={{ flex:1, position:'relative' }}>
            <Search size={13} color="#94a3b8" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empleado o puesto..."
              style={{ width:'100%', padding:'9px 12px 9px 30px', border:'1px solid #cbd5e1', borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <select value={fStatus} onChange={e=>setFS(e.target.value)} style={{ padding:'9px 12px', border:'1px solid #cbd5e1', borderRadius:9, fontSize:13, outline:'none', cursor:'pointer' }}>
            <option value="all">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
          <button onClick={abrirNuevo} style={{ padding:'9px 16px', borderRadius:9, border:'none', background:'#4f6ef7', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={14}/> Nuevo empleado
          </button>
        </div>

        <div style={{ background:CB, borderRadius:14, border:`1px solid ${DS.primary}18`, overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
            <thead>
              <tr style={{ background:'#f5f7fb' }}>
                {['Empleado','Puesto','Departamento','Teléfono','Ingreso','Salario','Estado',''].map(h=>(
                  <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#9aa5be', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(e=>{
                const dc=DEPT_COLORS[e.dept]||'#4f6ef7';
                return (
                  <tr key={e.id} style={{ borderTop:'1px solid #e2e8f0', cursor:'pointer' }} onClick={()=>setDetail(e)}>
                    <td style={{ padding:'11px 12px' }}>
                      <div style={{ display:'flex', gap:9, alignItems:'center' }}>
                        <Av ini={e.ini} color={dc} size={32}/>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{e.name}</div>
                          <div style={{ fontSize:10, color:'#9aa5be' }}>{e.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'11px 12px', fontSize:12, fontWeight:600, color:'#4a5568' }}>{e.puesto}</td>
                    <td style={{ padding:'11px 12px' }}><Tag label={e.dept} color={dc} bg={`${dc}18`}/></td>
                    <td style={{ padding:'11px 12px', fontSize:12, color:'#4a5568' }}>{e.phone}</td>
                    <td style={{ padding:'11px 12px', fontSize:12, color:'#9aa5be' }}>{e.ingreso}</td>
                    <td style={{ padding:'11px 12px', fontSize:12, fontWeight:700, color:'#10b981' }}>{e.salario}</td>
                    <td style={{ padding:'11px 12px' }}><Tag label={e.status==='activo'?'● Activo':'○ Inactivo'} color={e.status==='activo'?'#065f46':'#64748b'} bg={e.status==='activo'?'#d1fae5':'#f1f5f9'}/></td>
                    <td style={{ padding:'11px 12px' }} onClick={ev=>ev.stopPropagation()}>
                      <div style={{ display:'flex', gap:5 }}>
                        <button onClick={ev=>abrirEditar(e,ev)} style={{ padding:'5px 8px', borderRadius:7, border:'none', background:'rgba(79,110,247,0.10)', cursor:'pointer', display:'flex' }}><Edit2 size={12} color='#4f6ef7'/></button>
                        <button onClick={ev=>eliminar(e.id,ev)} style={{ padding:'5px 8px', borderRadius:7, border:'none', background:'#fef2f2', cursor:'pointer', display:'flex' }}><Trash2 size={12} color="#ef4444"/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!lista.length&&<tr><td colSpan={8} style={{ padding:32, textAlign:'center', color:'#9aa5be' }}>Sin empleados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card title="Por departamento" Icon={Grid}>
          {[...new Set(emps.map(e=>e.dept))].map(dept=>{
            const cnt=emps.filter(e=>e.dept===dept).length;
            const c=DEPT_COLORS[dept]||'#4f6ef7';
            return (
              <div key={dept} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #e2e8f0' }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:c, flexShrink:0 }}/>
                <span style={{ flex:1, fontSize:12, fontWeight:600, color:'#4a5568' }}>{dept}</span>
                <span style={{ fontSize:14, fontWeight:800, color:c }}>{cnt}</span>
              </div>
            );
          })}
        </Card>

        <Card title="Últimos añadidos" Icon={UserPlus} iconColor='#4f6ef7'>
          {[...emps].sort((a,b)=>b.ingreso.localeCompare(a.ingreso)).slice(0,4).map(e=>(
            <div key={e.id} style={{ display:'flex', gap:9, padding:'8px 0', borderBottom:'1px solid #e2e8f0', alignItems:'center' }}>
              <Av ini={e.ini} color={DEPT_COLORS[e.dept]||'#4f6ef7'} size={30}/>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>{e.name.split(' ')[0]}</div>
                <div style={{ fontSize:10, color:'#9aa5be' }}>{e.puesto} · {e.ingreso}</div>
              </div>
            </div>
          ))}
        </Card>

        <button onClick={abrirNuevo} style={{ padding:'11px 0', borderRadius:12, border:'none', background:'#4f6ef7', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
          <Plus size={14}/> Agregar empleado
        </button>
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div style={{ position:'fixed', inset:0, backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(8px)', background:'rgba(79,110,247,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
          <div style={{ background:'#ffffff', borderRadius:22, padding:28, width:'min(460px,92vw)', boxShadow:'0 24px 60px rgba(0,0,0,0.3)', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:18 }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:800, color:'#1e293b' }}>{editId?'Editar empleado':'Nuevo empleado'}</h3>
              <button onClick={()=>setModal(false)} style={{ border:'none', background:'none', cursor:'pointer' }}><X size={18} color="#94a3b8"/></button>
            </div>
            <div style={{ display:'grid', gap:10, marginBottom:14 }}>
              {[
                {p:'Nombre completo *', k:'name',    t:'text'},
                {p:'Puesto / cargo *',  k:'puesto',  t:'text'},
                {p:'Teléfono',          k:'phone',   t:'tel'},
                {p:'Email',             k:'email',   t:'email'},
                {p:'Salario (ej: $18,000)', k:'salario', t:'text'},
              ].map(f=>(
                <input key={f.k} type={f.t} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p}
                  style={{ padding:'10px 13px', border:'1px solid #cbd5e1', borderRadius:9, fontSize:13, outline:'none' }}/>
              ))}
              <select value={form.dept} onChange={e=>setForm(p=>({...p,dept:e.target.value}))} style={{ padding:'10px 13px', border:'1px solid #cbd5e1', borderRadius:9, fontSize:13, outline:'none', cursor:'pointer' }}>
                {DEPTS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={{ fontSize:11, color:'#9aa5be', fontWeight:700, display:'block', marginBottom:4 }}>FECHA DE INGRESO</label>
                  <input type="date" value={form.ingreso} onChange={e=>setForm(p=>({...p,ingreso:e.target.value}))} style={{ width:'100%', padding:'10px 13px', border:'1px solid #cbd5e1', borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#9aa5be', fontWeight:700, display:'block', marginBottom:4 }}>ESTADO</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={{ width:'100%', padding:'10px 13px', border:'1px solid #cbd5e1', borderRadius:9, fontSize:13, outline:'none', cursor:'pointer' }}>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setModal(false)} style={{ flex:1, padding:'11px 0', borderRadius:10, border:'1px solid #cbd5e1', background:'#f5f7fb', color:'#9aa5be', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}><X size={14}/> Cancelar</button>
              <button onClick={guardar} style={{ flex:2, padding:'11px 0', borderRadius:10, border:'none', background:'#4f6ef7', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}><Save size={14}/> {editId?'Guardar':'Agregar empleado'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle empleado */}
      {detail && (
        <div style={{ position:'fixed', inset:0, backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(8px)', background:'rgba(79,110,247,0.3)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
          <div style={{ background:'#ffffff', borderRadius:20, padding:26, width:'min(420px,92vw)', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <Av ini={detail.ini} color={DEPT_COLORS[detail.dept]||'#4f6ef7'} size={48}/>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:'#1e293b' }}>{detail.name}</div>
                  <Tag label={detail.dept} color={DEPT_COLORS[detail.dept]||'#4f6ef7'} bg={`${DEPT_COLORS[detail.dept]||'#4f6ef7'}18`}/>
                </div>
              </div>
              <button onClick={()=>setDetail(null)} style={{ border:'none', background:'none', cursor:'pointer' }}><X size={18} color="#94a3b8"/></button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[
                {l:'PUESTO',    v:detail.puesto},
                {l:'TELÉFONO',  v:detail.phone},
                {l:'EMAIL',     v:detail.email},
                {l:'INGRESO',   v:detail.ingreso},
                {l:'SALARIO',   v:detail.salario},
                {l:'ESTADO',    v:detail.status},
              ].map((f,i)=>(
                <div key={i} style={{ background:'#f5f7fb', borderRadius:9, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:'#9aa5be', fontWeight:700, marginBottom:3 }}>{f.l}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#4a5568' }}>{f.v}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={ev=>{ abrirEditar(detail,{stopPropagation:()=>{}}); setDetail(null); }} style={{ flex:1, padding:'10px 0', borderRadius:10, border:'none', background:'rgba(79,110,247,0.10)', color:'#4f6ef7', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}><Edit2 size={14}/> Editar</button>
              <a href={`tel:${detail.phone}`} style={{ flex:1, padding:'10px 0', borderRadius:10, background:'#f0fdf4', color:'#16a34a', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:6, textDecoration:'none' }}><Phone size={14}/> Llamar</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════ TAB LEADS (Admin — solo lectura + reasignar) ══════════════════════════ */
function TabLeads({ leads, setLeads }) {
  const p = DS.primary;
  const dragRef = useRef(null);
  const [detail, setDetail] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const ASESORES_LIST = ['María García','Carlos Ruiz','Ana Jiménez','Luis Mendoza'];

  function onDragStart(e,id){ dragRef.current=id; e.dataTransfer.effectAllowed='move'; e.currentTarget.style.opacity='0.5'; }
  function onDragEnd(e){ e.currentTarget.style.opacity='1'; }
  function onDragOver(e,nivel){ e.preventDefault(); setDragOver(nivel); }
  function onDragLeave(){ setDragOver(null); }
  function onDrop(e,nivel){ e.preventDefault(); setDragOver(null); const id=dragRef.current; if(!id)return; setLeads(prev=>prev.map(l=>l.id===id?{...l,nivel}:l)); dragRef.current=null; }
  function reasignar(id,asesor){ setLeads(prev=>prev.map(l=>l.id===id?{...l,asesor}:l)); }
  async function del(id){ askConfirm('Este lead será eliminado permanentemente.', async ()=>{ try{ await apiFetch('DELETE',`/api/supervisor/leads/${id}`); setLeads(prev=>prev.filter(l=>l.id!==id)); }catch(e){ alert('Error al eliminar: '+e.message); } }); }

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
          <div style={{background:'#fff',borderRadius:20,padding:28,width:'min(500px,92vw)',maxHeight:'88vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.2)',border:'1px solid #eaecf0'}}>
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
              {[{l:'TELÉFONO',v:detail.telefono},{l:'EMAIL',v:detail.email||'—'},{l:'ASESOR',v:detail.asesor},{l:'RECIBIDO',v:ago(detail.fecha)}].map((fi,i)=>(
                <div key={i} style={{background:'#f8fafc',borderRadius:10,padding:'10px 14px',border:'1px solid #eaecf0'}}>
                  <div style={{fontSize:9,color:'#94a3b8',fontWeight:700,marginBottom:3}}>{fi.l}</div>
                  <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{fi.v}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#f0fdf9',borderRadius:12,padding:'12px 14px',border:'1px solid #a7f3d0',marginBottom:14}}>
              <div style={{fontSize:9,color:'#059669',fontWeight:700,marginBottom:5}}>MENSAJE DEL BOT</div>
              <div style={{fontSize:12,color:'#065f46',fontStyle:'italic'}}>"{detail.msgBot}"</div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:10,color:'#94a3b8',fontWeight:700,display:'block',marginBottom:5}}>REASIGNAR ASESOR</label>
              <select value={detail.asesor} onChange={e=>{reasignar(detail.id,e.target.value);setDetail(d=>({...d,asesor:e.target.value}));}}
                style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',cursor:'pointer',fontFamily:'inherit'}}>
                {ASESORES_LIST.map(a=><option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>window.open(`https://wa.me/${toWA(detail.telefono)}?text=Hola%20${encodeURIComponent(detail.nombre)}`,'_blank')} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#f0fdf9',color:'#059669',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5,transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='#059669';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#f0fdf9';e.currentTarget.style.color='#059669';}}><MessageCircle size={13}/> WhatsApp</button>
              <button onClick={()=>{setDetail(null);del(detail.id);}} style={{padding:'10px 16px',borderRadius:10,border:'none',background:'#fef2f2',color:'#ef4444',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:4,transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='#ef4444';e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background='#fef2f2';e.currentTarget.style.color='#ef4444';}}><Trash2 size={13}/> Eliminar</button>
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

      {/* KPI CARDS */}
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
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(3,1fr)',gap:16}}>
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
                <div style={{width:26,height:26,borderRadius:'50%',background:col.acc,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',boxShadow:`0 2px 8px ${col.acc}40`}}>{colLeads.length}</div>
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
                    <div style={{fontSize:10,color:'#64748b',lineHeight:1.5,marginBottom:8,fontStyle:'italic',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',background:'#f8fafc',borderRadius:8,padding:'6px 9px'}}>"{lead.msgBot}"</div>
                    <div style={{marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                        <span style={{fontSize:9,color:'#94a3b8',fontWeight:700}}>SCORE</span>
                        <span style={{fontSize:10,fontWeight:800,color:lead.score>=70?'#10b981':lead.score>=40?'#f59e0b':'#ef4444'}}>{lead.score}%</span>
                      </div>
                      <div style={{background:'#f1f5f9',borderRadius:999,height:5,overflow:'hidden'}}><div style={{width:`${lead.score}%`,height:'100%',background:lead.score>=70?'#10b981':lead.score>=40?'#f59e0b':'#ef4444',borderRadius:999,transition:'width .5s'}}/></div>
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
   PIPELINE — ADMINISTRADOR
   Ve el embudo completo de toda la empresa
════════════════════════════════════════════ */
function TabPipelineAdmin({ leads, clients, users }) {
  const p = DS.primary;
  // ── State ──
  const [activeStage,    setActiveStage]    = React.useState(null);
  const [selectedAsesor, setSelectedAsesor] = React.useState(null);
  const [showDetail,     setShowDetail]     = React.useState(false);
  const [showMetaModal,  setShowMetaModal]  = React.useState(false);
  const [editMeta,       setEditMeta]       = React.useState(null); // {id, name, meta}
  const [metas,          setMetas]          = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('crm_metas_admin')||'{}'); } catch{ return {}; }
  });
  const [period,  setPeriod]  = React.useState('mes');
  const [hovRow,  setHovRow]  = React.useState(null);
  const [showNotif, setShowNotif] = React.useState(null);

  // ── Data ──
  const asesores  = users?.filter(u=>['advisor','asesor'].includes(u.role))||[];
  const won    = clients?.filter(c=>c.result==='won')  || [];
  const lost   = clients?.filter(c=>c.result==='lost') || [];
  const activo = clients?.filter(c=>!c.result)         || [];
  const calientes = leads?.filter(l=>l.nivel==='caliente')||[];
  const tibios    = leads?.filter(l=>l.nivel==='tibio')   ||[];
  const frios     = leads?.filter(l=>l.nivel==='frio')    ||[];
  const totalL = leads?.length   || 0;
  const totalC = clients?.length || 0;
  const metaEmp = asesores.reduce((s,a)=>s+(metas[a.id||a.name]||10),0)||asesores.length*10||10;
  const pct = Math.min(Math.round((won.length/metaEmp)*100),100);
  const ingresos = won.reduce((s,c)=>s+(Number(c.metadata?.saleAmount ?? c.saleAmount)||0),0);
  // Valores REALES del embudo (sin estimaciones):
  const allContactados = leads?.filter(l=>l.metadata?.asesor_contacto || l.asesor_contacto) || [];
  const contactados24h = allContactados.filter(l=>{
    const at = l.metadata?.asesor_contacto_at;
    if(!at) return false;
    return (new Date(at)-new Date(l.created_at)) <= 86400000;
  }).length;
  const contactadosTardio = allContactados.length - contactados24h;
  const propuestas  = clients?.filter(c=>(c.metadata?.producto||c.producto)||(c.metadata?.saleAmount!=null)).length || 0;

  const saveMeta = (id,val) => {
    const updated = {...metas,[id]:parseInt(val)||10};
    setMetas(updated);
    localStorage.setItem('crm_metas_admin', JSON.stringify(updated));
    setShowMetaModal(false);
    setShowNotif('Meta guardada correctamente');
    setTimeout(()=>setShowNotif(null),2500);
  };

  const asesorMetrics = asesores.map(a=>{
    const key = a.id||a.name;
    const mc = clients?.filter(c=>c.asesor===a.name||c.advisor_id===a.id)||[];
    const mw = mc.filter(c=>c.result==='won');
    const ml = leads?.filter(l=>l.asesor===a.name)||[];
    const metaA = metas[key]||10;
    const pctA  = Math.min(Math.round((mw.length/metaA)*100),100);
    return{...a,key,clientes:mc.length,ganados:mw.length,leads:ml.length,
      perdidos:mc.filter(c=>c.result==='lost').length,
      en_proceso:mc.filter(c=>!c.result).length,
      tasa:mc.length?Math.round((mw.length/mc.length)*100):0,
      meta:metaA, pctMeta:pctA};
  }).sort((a,b)=>b.ganados-a.ganados);

  const selA = asesorMetrics.find(a=>a.key===selectedAsesor);

  const stages = [
    {key:'leads',    label:'Leads captados',  v:totalL,                     c:'#6366f1',Icon:Target,  desc:'Bot WhatsApp'},
    {key:'contact',  label:'Contactados <24h', v:contactados24h,             c:p,         Icon:Phone,   desc:'Respuesta rápida del asesor'},
    {key:'tardio',   label:'Contactados >24h', v:contactadosTardio,          c:'#f97316', Icon:Clock,   desc:'Respuesta tardía'},
    {key:'proceso',  label:'En negociación',  v:activo.length,              c:'#f59e0b',Icon:Activity, desc:'Proceso activo'},
    {key:'propuesta',label:'Propuestas',      v:propuestas,                 c:'#8b5cf6',Icon:FileText,desc:'Producto/cotización'},
    {key:'won',      label:'Ganados',         v:won.length,                 c:'#10b981',Icon:Trophy,   desc:'Venta confirmada'},
    {key:'lost',     label:'Perdidos',        v:lost.length,                c:'#ef4444',Icon:XCircle,  desc:'No concretados'},
  ];

  const card = {background:'#fff',borderRadius:16,border:'1px solid #eaecf0',
    boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'};

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* ── NOTIFICACIÓN TOAST ── */}
      {showNotif&&(
        <div style={{position:'fixed',top:20,right:24,zIndex:99999,background:'#1e293b',color:'#fff',
          borderRadius:12,padding:'12px 20px',boxShadow:'0 8px 24px rgba(0,0,0,0.2)',
          fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:8,
          animation:'fadeUp .25s ease'}}>
          <CheckCircle size={16} color="#10b981"/>{showNotif}
        </div>
      )}

      {/* ── MODAL META POR ASESOR ── */}
      {showMetaModal&&editMeta&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',backdropFilter:'blur(4px)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}
          onClick={e=>{if(e.target===e.currentTarget)setShowMetaModal(false);}}>
          <div style={{background:'#fff',borderRadius:22,padding:30,width:'min(400px,92vw)',
            boxShadow:'0 24px 60px rgba(0,0,0,0.2)',border:'1px solid #eaecf0'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
              <div style={{width:46,height:46,borderRadius:'50%',background:`${p}15`,
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:p}}>
                {editMeta.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:'#1e293b'}}>Meta de {editMeta.name}</div>
                <div style={{fontSize:12,color:'#94a3b8'}}>Ventas objetivo para este período</div>
              </div>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:11,fontWeight:700,color:'#64748b',letterSpacing:0.5,
                textTransform:'uppercase',display:'block',marginBottom:8}}>
                Número de ventas objetivo
              </label>
              <input type="number" min="1" max="200"
                defaultValue={editMeta.meta}
                id="meta-input-admin"
                style={{width:'100%',padding:'14px 16px',border:'2px solid #e2e8f0',
                  borderRadius:12,fontSize:28,fontWeight:800,textAlign:'center',
                  color:'#1e293b',outline:'none',boxSizing:'border-box',transition:'border .2s'}}
                onFocus={e=>e.target.style.borderColor=p}
                onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
              <div style={{marginTop:10,display:'flex',gap:6,flexWrap:'wrap'}}>
                {[5,10,15,20,25,30].map(n=>(
                  <button key={n} onClick={()=>{document.getElementById('meta-input-admin').value=n;}}
                    style={{padding:'5px 12px',borderRadius:8,border:`1.5px solid ${p}20`,
                      background:`${p}08`,color:p,fontSize:12,fontWeight:700,cursor:'pointer',
                      transition:'all .15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background=p;e.currentTarget.style.color='#fff';}}
                    onMouseLeave={e=>{e.currentTarget.style.background=`${p}08`;e.currentTarget.style.color=p;}}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div style={{background:'#f8fafc',borderRadius:12,padding:'12px 14px',
              marginBottom:20,border:'1px solid #eaecf0'}}>
              <div style={{fontSize:11,color:'#64748b',marginBottom:4}}>
                <b style={{color:'#1e293b'}}>Meta actual:</b> {editMeta.meta} ventas
              </div>
              <div style={{fontSize:11,color:'#64748b'}}>
                <b style={{color:'#1e293b'}}>Progreso:</b> {editMeta.ganados} ganadas
                ({Math.round((editMeta.ganados/(editMeta.meta||1))*100)}%)
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <button onClick={()=>setShowMetaModal(false)}
                style={{padding:'12px',borderRadius:12,border:'1.5px solid #e2e8f0',
                  background:'#f8fafc',color:'#64748b',fontWeight:700,fontSize:13,
                  cursor:'pointer',transition:'all .15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#e2e8f0'}
                onMouseLeave={e=>e.currentTarget.style.background='#f8fafc'}>
                Cancelar
              </button>
              <button onClick={()=>saveMeta(editMeta.key, document.getElementById('meta-input-admin').value)}
                style={{padding:'12px',borderRadius:12,border:'none',
                  background:`linear-gradient(135deg,${p},${p}cc)`,
                  color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',
                  boxShadow:`0 4px 14px ${p}35`,transition:'all .2s'}}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';}}
                onMouseLeave={e=>{e.currentTarget.style.transform='';}}>
                Guardar meta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE ASESOR ── */}
      {selA&&showDetail&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.45)',backdropFilter:'blur(4px)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:9000}}
          onClick={e=>{if(e.target===e.currentTarget){setShowDetail(false);setSelectedAsesor(null);}}}>
          <div style={{background:'#fff',borderRadius:22,padding:30,width:'min(500px,92vw)',
            boxShadow:'0 24px 64px rgba(0,0,0,0.2)',border:'1px solid #eaecf0',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:52,height:52,borderRadius:'50%',
                  background:`linear-gradient(135deg,${p},${p}cc)`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:20,fontWeight:800,color:'#fff',boxShadow:`0 4px 14px ${p}35`}}>
                  {selA.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div style={{fontSize:17,fontWeight:800,color:'#1e293b'}}>{selA.name}</div>
                  <span style={{fontSize:11,color:'#94a3b8',background:'#f1f5f9',
                    borderRadius:999,padding:'2px 10px',fontWeight:600}}>Asesor de ventas</span>
                </div>
              </div>
              <button onClick={()=>{setShowDetail(false);setSelectedAsesor(null);}}
                style={{border:'none',background:'#f1f5f9',borderRadius:10,padding:8,cursor:'pointer',display:'flex'}}
                onMouseEnter={e=>e.currentTarget.style.background='#e2e8f0'}
                onMouseLeave={e=>e.currentTarget.style.background='#f1f5f9'}>
                <X size={14} color="#64748b"/>
              </button>
            </div>

            {/* Meta progress */}
            <div style={{background:`${p}08`,borderRadius:14,padding:'16px 18px',
              marginBottom:18,border:`1px solid ${p}20`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>Meta asignada</div>
                  <div style={{fontSize:11,color:'#64748b'}}>{selA.ganados} de {selA.meta} ventas</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:22,fontWeight:800,color:p}}>{selA.pctMeta}%</span>
                  <button onClick={()=>{setEditMeta(selA);setShowMetaModal(true);setShowDetail(false);}}
                    style={{padding:'6px 14px',borderRadius:9,border:'none',
                      background:p,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',
                      boxShadow:`0 3px 10px ${p}35`,transition:'all .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
                    onMouseLeave={e=>e.currentTarget.style.transform=''}>
                    Editar meta
                  </button>
                </div>
              </div>
              <div style={{background:'rgba(255,255,255,0.6)',borderRadius:999,height:10,overflow:'hidden'}}>
                <div style={{width:`${selA.pctMeta}%`,height:'100%',
                  background:selA.pctMeta>=80?'#10b981':selA.pctMeta>=50?p:'#f59e0b',
                  borderRadius:999,transition:'width .7s ease'}}/>
              </div>
            </div>

            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:10,marginBottom:18}}>
              {[{l:'Clientes',v:selA.clientes,c:p},{l:'Ganados',v:selA.ganados,c:'#10b981'},
                {l:'En proceso',v:selA.en_proceso,c:'#f59e0b'},{l:'Leads',v:selA.leads,c:'#6366f1'}
              ].map((s,i)=>(
                <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:12,
                  padding:'13px 8px',border:`1px solid ${s.c}15`}}>
                  <div style={{fontSize:24,fontWeight:800,color:s.c,lineHeight:1,marginBottom:3}}>{s.v}</div>
                  <div style={{fontSize:9,color:'#94a3b8'}}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Tasa */}
            <div style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
                <span style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>Tasa de conversión</span>
                <span style={{fontSize:15,fontWeight:800,
                  color:selA.tasa>=60?'#10b981':selA.tasa>=30?'#f59e0b':'#ef4444'}}>{selA.tasa}%</span>
              </div>
              <div style={{background:'#f1f5f9',borderRadius:999,height:10,overflow:'hidden'}}>
                <div style={{width:`${selA.tasa}%`,height:'100%',
                  background:selA.tasa>=60?'#10b981':selA.tasa>=30?'#f59e0b':'#ef4444',
                  borderRadius:999,transition:'width .7s ease'}}/>
              </div>
            </div>

            {/* Diagnóstico */}
            <div style={{padding:'14px 16px',background:'#f8fafc',borderRadius:14,
              border:'1px solid #eaecf0',fontSize:12,color:'#64748b',lineHeight:1.6,marginBottom:16}}>
              <b style={{color:'#1e293b'}}>Diagnóstico ejecutivo:</b>{' '}
              {selA.tasa>=60?`${selA.name} supera las expectativas. Considera asignarle una meta más alta y leads premium.`:
               selA.tasa>=30?`${selA.name} muestra progreso constante. Refuerza técnicas de cierre para alcanzar el siguiente nivel.`:
               `${selA.name} requiere atención inmediata. Programa coaching y revisa su cartera de clientes esta semana.`}
            </div>

            {/* Acciones */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              <button onClick={()=>{setEditMeta(selA);setShowMetaModal(true);setShowDetail(false);}}
                style={{padding:'10px',borderRadius:11,border:'none',background:`${p}10`,color:p,
                  fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',
                  justifyContent:'center',gap:5,transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background=p;e.currentTarget.style.color='#fff';}}
                onMouseLeave={e=>{e.currentTarget.style.background=`${p}10`;e.currentTarget.style.color=p;}}>
                <Star size={13}/> Meta
              </button>
              <button onClick={()=>window.open(`mailto:${selA.email||''}?subject=Revisión de pipeline`,'_blank')}
                style={{padding:'10px',borderRadius:11,border:'none',background:'#f0fdf9',color:'#059669',
                  fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',
                  justifyContent:'center',gap:5,transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='#059669';e.currentTarget.style.color='#fff';}}
                onMouseLeave={e=>{e.currentTarget.style.background='#f0fdf9';e.currentTarget.style.color='#059669';}}>
                <MessageCircle size={13}/> Contactar
              </button>
              <button onClick={()=>{setShowDetail(false);}}
                style={{padding:'10px',borderRadius:11,border:'1.5px solid #e2e8f0',background:'#fff',
                  color:'#64748b',fontWeight:700,fontSize:12,cursor:'pointer',transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='#f1f5f9';}}
                onMouseLeave={e=>{e.currentTarget.style.background='#fff';}}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:22}}>
        <div>
          <div style={{fontSize:11,color:p,fontWeight:700,letterSpacing:1.5,
            textTransform:'uppercase',marginBottom:4}}>Administrador · Empresa completa</div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:'#1e293b',letterSpacing:'-0.5px'}}>
            Pipeline de la Empresa
          </h1>
          <p style={{margin:'5px 0 0',fontSize:13,color:'#94a3b8'}}>
            {asesores.length} asesores · Haz clic en un asesor para gestionar su meta
          </p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {/* Period filter */}
          <div style={{display:'flex',gap:4,background:'#f1f5f9',borderRadius:10,padding:4}}>
            {['mes','trimestre','año'].map(per=>(
              <button key={per} onClick={()=>setPeriod(per)}
                style={{padding:'6px 14px',borderRadius:8,border:'none',
                  background:period===per?'#fff':'transparent',
                  color:period===per?'#1e293b':'#64748b',
                  fontSize:11,fontWeight:700,cursor:'pointer',
                  boxShadow:period===per?'0 1px 4px rgba(0,0,0,0.08)':'none',
                  textTransform:'capitalize',transition:'all .2s'}}>
                {per}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(5,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'Leads totales', v:totalL,       color:'#6366f1',Icon:Target,    sub:'del bot'},
          {label:'¡A cerrar!',    v:calientes.length,color:'#ef4444',Icon:Flame,   sub:'prioritarios'},
          {label:'En proceso',   v:activo.length, color:'#f59e0b',Icon:Activity,  sub:'negociando'},
          {label:'Ganados',      v:won.length,    color:'#10b981',Icon:Trophy,    sub:`$${(ingresos/1000).toFixed(0)}k est.`},
          {label:'Progreso emp.',v:`${pct}%`,     color:p,         Icon:TrendingUp,sub:`meta ${metaEmp}`},
        ].map((k,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:14,padding:'18px',
            border:'1px solid #eaecf0',borderTop:`3px solid ${k.color}`,
            boxShadow:'0 1px 3px rgba(0,0,0,0.05)',transition:'all .2s',cursor:'default',
            position:'relative',overflow:'hidden'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 10px 28px ${k.color}20`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)';}}>
            <div style={{position:'absolute',top:-20,right:-20,width:70,height:70,
              borderRadius:'50%',background:`${k.color}08`,pointerEvents:'none'}}/>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
              <div style={{width:40,height:40,borderRadius:11,background:`${k.color}12`,
                border:`1px solid ${k.color}20`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <k.Icon size={18} color={k.color} strokeWidth={2}/>
              </div>
              <div style={{width:3,height:40,borderRadius:999,
                background:`linear-gradient(180deg,${k.color},${k.color}44)`}}/>
            </div>
            <div style={{fontSize:28,fontWeight:800,color:'#1e293b',lineHeight:1,marginBottom:3}}>{k.v}</div>
            <div style={{fontSize:11,fontWeight:700,color:'#1e293b',marginBottom:2}}>{k.label}</div>
            <div style={{fontSize:10,color:'#94a3b8'}}>{k.sub}</div>
            {i===4&&<div style={{marginTop:10,background:'#f1f5f9',borderRadius:999,height:5,overflow:'hidden'}}>
              <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${p},#10b981)`,
                borderRadius:999,transition:'width .8s ease'}}/>
            </div>}
          </div>
        ))}
      </div>

      {/* ── FUNNEL + TEMPERATURA ── */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'1.4fr 1fr',gap:16,marginBottom:16}}>
        {/* Funnel */}
        <div style={card}>
          <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',borderLeft:`3px solid ${p}`,
            display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <TrendingUp size={14} color={p}/>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>Embudo de conversión</div>
                <div style={{fontSize:11,color:'#94a3b8'}}>Clic en etapa para ver métricas</div>
              </div>
            </div>
            <div style={{fontSize:12,fontWeight:800,color:p,background:`${p}10`,
              borderRadius:999,padding:'4px 12px',border:`1px solid ${p}20`}}>{pct}% completado</div>
          </div>
          <div style={{padding:'20px'}}>
            {stages.map((s,i,arr)=>{
              const maxV=arr[0].v||1;
              const barW=Math.max(s.v>0?(s.v/maxV)*100:0,s.v>0?4:0);
              const rate=i>0&&arr[i-1].v>0?Math.round((s.v/arr[i-1].v)*100):100;
              const isAct=activeStage===s.key;
              return(
                <div key={s.key} style={{marginBottom:12,cursor:'pointer'}}
                  onClick={()=>setActiveStage(isAct?null:s.key)}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                    marginBottom:6,padding:'8px 10px',borderRadius:10,
                    background:isAct?`${s.c}08`:'transparent',
                    border:isAct?`1px solid ${s.c}20`:'1px solid transparent',transition:'all .2s'}}
                    onMouseEnter={e=>{if(!isAct)e.currentTarget.style.background='#f8fafc';}}
                    onMouseLeave={e=>{if(!isAct)e.currentTarget.style.background='transparent';}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:30,height:30,borderRadius:9,
                        background:isAct?s.c:`${s.c}12`,border:`1px solid ${s.c}20`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        flexShrink:0,transition:'all .2s'}}>
                        <s.Icon size={13} color={isAct?'#fff':s.c}/>
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:isAct?s.c:'#475569'}}>{s.label}</div>
                        <div style={{fontSize:10,color:'#94a3b8'}}>{s.desc}</div>
                      </div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                      {i>0&&<div style={{fontSize:9,color:'#94a3b8'}}>{rate}% conv.</div>}
                    </div>
                  </div>
                  <div style={{background:'#f1f5f9',borderRadius:10,height:9,overflow:'hidden'}}>
                    <div style={{width:`${barW}%`,height:'100%',
                      background:`linear-gradient(90deg,${s.c},${s.c}88)`,
                      borderRadius:10,transition:'width .6s ease',
                      minWidth:s.v>0?'3%':'0',
                      boxShadow:isAct?`0 0 8px ${s.c}60`:''}}/>
                  </div>
                  {isAct&&(
                    <div style={{marginTop:8,padding:'12px 14px',background:`${s.c}06`,
                      borderRadius:12,border:`1px solid ${s.c}20`}}>
                      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:8,textAlign:'center'}}>
                        {[
                          {l:'Cantidad',v:s.v},
                          {l:'% del total',v:`${totalL?Math.round((s.v/totalL)*100):0}%`},
                          {l:'Conversión',v:`${rate}%`},
                          {l:'Ingresos',v:s.key==='won'?`$${ingresos.toLocaleString()}`:'—'},
                        ].map((d,j)=>(
                          <div key={j}>
                            <div style={{fontSize:15,fontWeight:800,color:s.c}}>{d.v}</div>
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

        {/* Temperatura + estado */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={card}>
            <div style={{padding:'13px 18px',borderBottom:'1px solid #f1f5f9',
              borderLeft:'3px solid #ef4444',display:'flex',alignItems:'center',gap:8}}>
              <Flame size={13} color="#ef4444"/>
              <span style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Temperatura de leads</span>
            </div>
            <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:9}}>
              {[
                {l:'¡A cerrar!',v:calientes.length,c:'#ef4444',bg:'#fef2f2',bd:'#fecaca',Icon:Flame},
                {l:'En seguimiento',   v:tibios.length,   c:'#f59e0b',bg:'#fffbeb',bd:'#fde68a',Icon:Thermometer},
                {l:'¡Rescatar!',    v:frios.length,    c:'#3b82f6',bg:'#eff6ff',bd:'#bfdbfe',Icon:Snowflake},
              ].map((s,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
                  background:s.bg,borderRadius:11,border:`1px solid ${s.bd}`,
                  cursor:'pointer',transition:'all .2s'}}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateX(4px)';e.currentTarget.style.boxShadow=`0 4px 14px ${s.c}18`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='none';}}>
                  <div style={{width:32,height:32,borderRadius:9,background:'rgba(255,255,255,0.7)',
                    display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <s.Icon size={15} color={s.c}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:700,color:s.c}}>{s.l}</span>
                      <span style={{fontSize:16,fontWeight:800,color:s.c}}>{s.v}</span>
                    </div>
                    <div style={{background:'rgba(255,255,255,0.5)',borderRadius:999,height:4,overflow:'hidden'}}>
                      <div style={{width:`${totalL?Math.max((s.v/totalL)*100,s.v>0?4:0):0}%`,
                        height:'100%',background:s.c,borderRadius:999,transition:'width .5s ease'}}/>
                    </div>
                  </div>
                  <span style={{fontSize:10,color:s.c,fontWeight:700,flexShrink:0}}>
                    {totalL?Math.round((s.v/totalL)*100):0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div style={card}>
            <div style={{padding:'13px 18px',borderBottom:'1px solid #f1f5f9',
              borderLeft:'3px solid #10b981',display:'flex',alignItems:'center',gap:8}}>
              <Users size={13} color="#10b981"/>
              <span style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Estado de clientes</span>
            </div>
            <div style={{padding:'14px 18px',display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(3,1fr)',gap:10}}>
              {[{l:'En proceso',v:activo.length,c:p},{l:'Ganados',v:won.length,c:'#10b981'},{l:'Perdidos',v:lost.length,c:'#ef4444'}].map((s,i)=>(
                <div key={i} style={{textAlign:'center',padding:'13px 8px',background:'#f8fafc',
                  borderRadius:12,border:`1px solid ${s.c}15`,cursor:'pointer',transition:'all .2s'}}
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

      {/* ── RANKING ASESORES CON METAS ── */}
      <div style={card}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',
          borderLeft:'3px solid #8b5cf6',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <UserCheck size={14} color="#8b5cf6"/>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>Ranking de asesores · Metas individuales</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>Haz clic en un asesor para gestionar su meta o ver su detalle</div>
            </div>
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'40px 1fr 70px 70px 70px 70px 130px 90px',minWidth:680,
            gap:10,padding:'10px 20px',background:'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
            {['#','Asesor','Clientes','Ganados','Leads','Tasa','Prog. meta','Acción'].map((h,i)=>(
              <div key={i} style={{fontSize:9,fontWeight:700,color:'#94a3b8',letterSpacing:0.5,
                textAlign:i>1?'center':'left'}}>{h}</div>
            ))}
          </div>
          {asesorMetrics.length===0&&<div style={{padding:'32px',textAlign:'center',color:'#94a3b8',fontSize:13}}>Sin asesores registrados</div>}
          {asesorMetrics.map((a,i)=>{
            const isHov=hovRow===i;
            return(
              <div key={a.key||i}
                style={{display:'grid',gridTemplateColumns:'40px 1fr 70px 70px 70px 70px 130px 90px',minWidth:680,
                  gap:10,padding:'13px 20px',borderBottom:'1px solid #f8fafc',alignItems:'center',
                  background:isHov?'#f8fafc':'transparent',cursor:'pointer',transition:'all .15s'}}
                onMouseEnter={()=>setHovRow(i)} onMouseLeave={()=>setHovRow(null)}
                onClick={()=>{setSelectedAsesor(a.key);setShowDetail(true);}}>
                <div style={{width:30,height:30,borderRadius:'50%',
                  background:i===0?'linear-gradient(135deg,#fbbf24,#f59e0b)':
                    i===1?'linear-gradient(135deg,#94a3b8,#64748b)':
                    i===2?'linear-gradient(135deg,#cd7c2c,#b45309)':'#f1f5f9',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:13,fontWeight:800,color:i<3?'#fff':'#94a3b8',
                  boxShadow:i<3?'0 2px 8px rgba(0,0,0,0.15)':'none'}}>{i+1}</div>
                <div style={{display:'flex',alignItems:'center',gap:9}}>
                  <div style={{width:34,height:34,borderRadius:'50%',background:`${p}15`,
                    border:`2px solid ${isHov?p:`${p}25`}`,display:'flex',alignItems:'center',
                    justifyContent:'center',fontSize:13,fontWeight:800,color:p,flexShrink:0,
                    transition:'border-color .2s'}}>{a.name?.charAt(0)?.toUpperCase()}</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{a.name}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>Meta: {a.meta} ventas</div>
                  </div>
                </div>
                <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#64748b'}}>{a.clientes}</div>
                <div style={{textAlign:'center',fontSize:13,fontWeight:800,color:'#10b981'}}>{a.ganados}</div>
                <div style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#6366f1'}}>{a.leads}</div>
                <div style={{textAlign:'center'}}>
                  <span style={{fontSize:12,fontWeight:800,padding:'3px 10px',borderRadius:999,
                    color:a.tasa>=60?'#10b981':a.tasa>=30?'#f59e0b':'#ef4444',
                    background:a.tasa>=60?'#f0fdf9':a.tasa>=30?'#fffbeb':'#fef2f2'}}>{a.tasa}%</span>
                </div>
                {/* Meta progress bar */}
                <div style={{textAlign:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{flex:1,background:'#f1f5f9',borderRadius:999,height:6,overflow:'hidden'}}>
                      <div style={{width:`${a.pctMeta}%`,height:'100%',
                        background:a.pctMeta>=80?'#10b981':a.pctMeta>=50?p:'#f59e0b',
                        borderRadius:999,transition:'width .5s ease'}}/>
                    </div>
                    <span style={{fontSize:10,fontWeight:700,
                      color:a.pctMeta>=80?'#10b981':a.pctMeta>=50?p:'#f59e0b',flexShrink:0}}>
                      {a.pctMeta}%
                    </span>
                  </div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{a.ganados}/{a.meta}</div>
                </div>
                {/* Botón editar meta */}
                <div style={{textAlign:'center'}}>
                  <button onClick={e=>{e.stopPropagation();setEditMeta(a);setShowMetaModal(true);}}
                    style={{padding:'5px 12px',borderRadius:8,border:`1.5px solid ${p}30`,
                      background:`${p}08`,color:p,fontSize:11,fontWeight:700,cursor:'pointer',
                      transition:'all .15s',display:'inline-flex',alignItems:'center',gap:4}}
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

function TabRendimientoEquipo({ clients, users, leads }) {
  const p = DS.primary;
  const [orden, setOrden] = useState('conversion');

  const asesores = (users||[]).filter(u => u.role==='advisor'||u.role==='asesor'||u.role==='supervisor');
  const resultadoDe = c => c.result || c.metadata?.result;

  const dataAsesores = asesores.map(a => {
    const ac       = clients.filter(c => c.asesorId===a.id || c.assigned_advisor_id===a.id || c.advisor_id===a.id);
    const leadsA   = leads.filter(l => l.advisor_id===a.id);
    const ganados  = ac.filter(c => resultadoDe(c)==='won').length;
    const perdidos = ac.filter(c => resultadoDe(c)==='lost').length;
    const proceso  = ac.filter(c => !resultadoDe(c)).length;
    const conv     = ac.length ? Math.round((ganados/ac.length)*100) : 0;
    return { ...a, total_clientes:ac.length, ganados, perdidos, proceso, conv, leads:leadsA.length };
  });

  const sorted = [...dataAsesores].sort((a,b) => {
    if (orden==='conversion') return b.conv - a.conv;
    if (orden==='ganados')    return b.ganados - a.ganados;
    if (orden==='leads')      return b.leads - a.leads;
    return b.total_clientes - a.total_clientes;
  });

  const totalGanados  = dataAsesores.reduce((s,a)=>s+a.ganados,0);
  const totalClientes = dataAsesores.reduce((s,a)=>s+a.total_clientes,0)||1;
  const convEquipo    = Math.round((totalGanados/totalClientes)*100);

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
        <ExportMenu endpoint="leads" label="Exportar leads"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {l:'Asesores',         v:asesores.length,  c:'#4f6ef7'},
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

      <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <div style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Ranking del equipo</div>
          <div style={{display:'flex',gap:6}}>
            {[{k:'conversion',l:'Conversión'},{k:'ganados',l:'Ganados'},{k:'leads',l:'Leads'},{k:'clientes',l:'Clientes'}].map(o=>(
              <button key={o.k} onClick={()=>setOrden(o.k)}
                style={{padding:'5px 12px',borderRadius:7,border:'none',fontSize:11,fontWeight:700,cursor:'pointer',
                  background:orden===o.k?p:'#f1f5f9',color:orden===o.k?'#fff':'#64748b'}}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:680}}>
          <thead>
            <tr style={{background:'#f8fafc'}}>
              {['#','Asesor','Clientes','Ganados','Perdidos','En proceso','Leads','Conversión'].map(h=>(
                <th key={h} style={{padding:'10px 14px',fontSize:10,fontWeight:700,color:'#94a3b8',textAlign:'left'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((a,i)=>{
              const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
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
            {sorted.length===0&&<tr><td colSpan={8} style={{padding:24,textAlign:'center',color:'#94a3b8',fontSize:12}}>Sin asesores registrados</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function TabConversaciones({ leads }) {
  const p = DS.primary;
  const [sel, setSel] = useState(null);
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  async function load(lead) {
    setSel(lead); setLoading(true);
    try { const d = await apiFetch('GET', `/api/webhook/conversations/${lead.id}`); setConvs(Array.isArray(d)?d:[]); }
    catch(e) { setConvs([]); }
    setLoading(false);
  }

  const filtered = leads.filter(l => l.nombre?.toLowerCase().includes(search.toLowerCase()) || l.telefono?.includes(search));
  const NIVEL = { caliente:{c:'#10b981',bg:'#f0fdf9',l:'Caliente'}, tibio:{c:'#f59e0b',bg:'#fefce8',l:'Tibio'}, frio:{c:'#ef4444',bg:'#fef2f2',l:'Frio'} };

  return (
    <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'300px 1fr',gap:16,height:MOB?'auto':'75vh'}}>
      <div style={{background:'#fff',borderRadius:14,border:'1px solid #eaecf0',display:'flex',flexDirection:'column',overflow:'hidden'}}>
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
      </div>
      <div style={{background:'#fff',borderRadius:14,border:'1px solid #eaecf0',display:'flex',flexDirection:'column',overflow:'hidden'}}>
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
                      {m.message_text&&m.message_text.startsWith('[IMG:')?(()=>{const u=m.message_text.match(/\[IMG:(.*?)\]/);return u?(<><img src={(process.env.REACT_APP_API_URL||'')+u[1]} alt="Imagen" style={{maxWidth:'100%',borderRadius:8,marginBottom:4,cursor:'pointer'}} onClick={()=>window.open((process.env.REACT_APP_API_URL||'')+u[1],'_blank')}/><div style={{fontSize:11}}>{m.message_text.replace(/\[IMG:.*?\]\s*/,'')}</div></>):m.message_text;})():m.message_text}
                    </div>
                    <div style={{fontSize:10,color:'#cbd5e1',marginTop:2,textAlign:isBot?'left':'right'}}>
                      {m.created_at?new Date(m.created_at).toLocaleString('es-EC',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):''}
                    </div>
                  </div>
                </div>);
              })}
            </div>
            <div style={{padding:'10px 16px',borderTop:'1px solid #eaecf0',background:'#fff',display:'flex',gap:8,alignItems:'flex-end'}}>
              <textarea id="adm-chat-input" rows={2} placeholder="Escribe un mensaje..." style={{flex:1,padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:12,resize:'none',outline:'none',fontFamily:'inherit'}}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById('adm-btn-send')?.click();}}}/>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                <button id="adm-btn-send" onClick={async()=>{
                  const inp=document.getElementById('adm-chat-input');
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
          </>
        )}
      </div>
    </div>
  );
}


// ── Canal Stats — Estadísticas por red social ─────────────────────────────
function CanalStatsCompleto({ leads = [], clients = [] }) {
  const total = leads.length || 1;

  const canales = { facebook:0, instagram:0, tiktok:0, whatsapp:0, otro:0 };
  leads.forEach(l => {
    const c = (l.canal || l.origen || '').toLowerCase();
    if      (c.includes('facebook')  || c.includes('fb'))  canales.facebook++;
    else if (c.includes('instagram') || c.includes('ig'))  canales.instagram++;
    else if (c.includes('tiktok')    || c.includes('tik')) canales.tiktok++;
    else if (c.includes('whatsapp')  || c.includes('wa') || c.includes('bot')) canales.whatsapp++;
    else canales.otro++;
  });

  const CFG = [
    { key:'whatsapp',  label:'WhatsApp',  color:'#25D366', bg:'#f0fdf9',
      icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
    { key:'facebook',  label:'Facebook',  color:'#1877F2', bg:'#EBF5FF',
      icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    { key:'instagram', label:'Instagram', color:'#E1306C', bg:'#FEE8F0',
      icon:<svg viewBox="0 0 24 24" width="22" height="22"><defs><radialGradient id="rg1" cx="30%" cy="107%"><stop offset="0%" stopColor="#fdf497"/><stop offset="45%" stopColor="#fd5949"/><stop offset="60%" stopColor="#d6249f"/><stop offset="90%" stopColor="#285AEB"/></radialGradient></defs><path fill="url(#rg1)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
    { key:'tiktok',    label:'TikTok',    color:'#010101', bg:'#f0f0f0',
      icon:<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="#010101"/></svg> },
    { key:'otro',      label:'Otros',     color:'#94a3b8', bg:'#f8fafc',
      icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="#94a3b8"><circle cx="12" cy="12" r="10"/><path fill="#fff" d="M12 6a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1z"/></svg> },
  ];

  const activos = CFG.filter(c => canales[c.key] > 0);
  if (activos.length === 0) return (
    <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #eaecf0',marginBottom:20}}>
      <div style={{fontSize:12,fontWeight:800,color:'#1e293b',marginBottom:8}}>Canales de captacion</div>
      <div style={{fontSize:12,color:'#94a3b8',textAlign:'center',padding:'12px 0'}}>Sin leads registrados aun</div>
    </div>
  );

  const top = activos.sort((a,b)=>canales[b.key]-canales[a.key])[0];

  return (
    <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #eaecf0',marginBottom:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:800,color:'#1e293b',display:'flex',alignItems:'center',gap:6}}>
          Canales de captacion
        </div>
        <div style={{fontSize:11,color:'#94a3b8'}}>{leads.length} leads totales</div>
      </div>
      {top && (
        <div style={{background:top.bg,borderRadius:10,padding:'10px 14px',marginBottom:12,border:`1px solid ${top.color}30`,display:'flex',alignItems:'center',gap:10}}>
          {top.icon}
          <div>
            <div style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>Canal principal</div>
            <div style={{fontSize:13,fontWeight:800,color:top.color}}>{top.label} — {canales[top.key]} leads ({Math.round((canales[top.key]/leads.length)*100)}%)</div>
          </div>
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8}}>
        {activos.map((c,i)=>{
          const cnt = canales[c.key];
          const pct = Math.round((cnt/leads.length)*100);
          return(
            <div key={i} style={{background:c.bg,borderRadius:12,padding:'10px 12px',border:`1px solid ${c.color}20`,textAlign:'center'}}>
              <div style={{display:'flex',justifyContent:'center',marginBottom:6}}>{c.icon}</div>
              <div style={{fontSize:11,fontWeight:700,color:'#475569',marginBottom:2}}>{c.label}</div>
              <div style={{fontSize:20,fontWeight:800,color:c.color,lineHeight:1}}>{cnt}</div>
              <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{pct}%</div>
              <div style={{background:`${c.color}20`,borderRadius:999,height:3,marginTop:6,overflow:'hidden'}}>
                <div style={{width:`${pct}%`,height:'100%',background:c.color,borderRadius:999}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardAdmin({user,currentView,onNavigate,primary='#4f6ef7',pageBg='#f0f4ff',cardBg='#ffffff',cardBorder,cardShadow}) {
  DS = makeDS(primary);
  CB = cardBg || '#ffffff';
  CBorder = cardBorder || `${primary}20`;
  MOB = window.innerWidth < 768;
  CShadow = cardShadow || `0 2px 12px ${primary}14`;
  const [users,     setUsers]     = useState([]);
  const [leads,     setLeads]     = useState([]);
  const [clients,   setClients]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats,     setStats]     = useState(null);
  const [planInfo,  setPlanInfo]  = useState(null);
  const [loadingDB, setLoadingDB] = useState(true);
  const [confirmDlg, setConfirmDlg] = useState(null);
  _setConfirmA = setConfirmDlg;

  const nav  = onNavigate || (() => {});
  const view = currentView || 'dashboard';

  const cargarDatos = useCallback(async () => {
    setLoadingDB(true);
    try {
      const [usersRes, clientsRes, leadsRes, empsRes, statsRes] = await Promise.all([
        apiFetch('GET','/api/admin/users'),
        apiFetch('GET','/api/admin/clients?limit=100000000'),
        apiFetch('GET','/api/admin/leads').catch(()=>[]),
        apiFetch('GET','/api/admin/employees').catch(()=>[]),
        apiFetch('GET','/api/admin/stats').catch(()=>null),
      ]);
      if (usersRes?.users) { setUsers(usersRes.users.map(u=>({...u,active:u.status==='active',pass:'',ini:(u.name||'??').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase(),lastLogin:u.last_login?'Activo':'Nunca',created:u.created_at?.split('T')[0]||'—'}))); setPlanInfo(usersRes.plan||null); }
      if (clientsRes?.clients) setClients(clientsRes.clients.map(c=>({...c, result:c.result||c.metadata?.result||null, heat:c.heat||c.metadata?.heat||'tibio', asesorId:c.assigned_advisor_id||c.asesorId||'', asesor:c.advisor_name||c.asesor||'', lossReason:c.lossReason||c.metadata?.lossReason||''})));
      if (Array.isArray(leadsRes)) setLeads(leadsRes.map(l=>({...l,nivel:l.nivel||'tibio',score:l.score||50,msgBot:l.msg_bot||'',asesor:l.advisor_name||'Sin asignar',asesorId:l.advisor_id||''})));
      if (Array.isArray(empsRes)) setEmployees(empsRes.map(e=>({...e,status:e.status||'activo',ini:(e.name||'??').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()})));
      if (statsRes) setStats(statsRes);
    } catch(e) { console.error('Error cargando datos admin:', e.message); }
    setLoadingDB(false);
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  return (
    <>
      {view === 'dashboard'            && <TabDashboard        users={users} leads={leads} stats={stats} planInfo={planInfo} clients={clients} onNavigate={nav} />}
      {view === 'clients'              && <TabClientes         clients={clients} users={users} onRefresh={cargarDatos} />}
      {view === 'sales'                && <TabVentas           clients={clients} users={users} />}
      {view === 'messages'             && <TabMensajes         users={users} />}
      {view === 'users'                && <TabUsuarios         users={users} setUsers={setUsers} planInfo={planInfo} onRefresh={cargarDatos} />}
      {view === 'employees'            && <TabEmpleados        employees={employees} setEmployees={setEmployees} onRefresh={cargarDatos} />}
      {view === 'leads'                && <TabLeads            leads={leads} setLeads={setLeads} users={users} />}
      {view === 'pipeline'              && <TabPipelineAdmin    leads={leads} clients={clients} users={users} />}
      {view === 'rendimiento_equipo'    && <TabRendimientoEquipo clients={clients} users={users} leads={leads}/>}
      {view === 'conversaciones'        && <TabConversaciones  leads={leads}/>}
      {view === 'actividades_equipo'    && <TabActividadesEquipo />}
      {confirmDlg&&<ConfirmModal msg={confirmDlg.msg} onYes={confirmDlg.onYes} onClose={()=>setConfirmDlg(null)}/>}
    </>
  );
}
