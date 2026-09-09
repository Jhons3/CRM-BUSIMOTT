/* eslint-disable */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePaged, Pagination } from '../utils';
function toWA(p){const r=(p||'').replace(/\D/g,'');return r.startsWith('593')?r:r.startsWith('0')&&r.length===10?'593'+r.substring(1):r.length===9?'593'+r:r;}
import {
  Users, Phone, MessageCircle, Calendar, Trophy, XCircle,
  TrendingUp, Activity, Star, Bell, AlertCircle, Zap,
  FileText, DollarSign, Plus, Trash2, CheckCircle, X,
  Send, Download, Edit2, ChevronLeft, ChevronRight,
  Save, RefreshCw, MessageSquare, Eye, Shield, Grid, Search, Clock,
  Flame, Thermometer, Snowflake, Target, Bot, FileSpreadsheet,
  ChevronDown, MapPin, CreditCard, Image, Gift} from 'lucide-react';
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
let MOB = false; // true cuando la pantalla es móvil (< 768px)
const API = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '')
  : `${window.location.protocol}//${window.location.hostname}:3001`;
const tok = () => localStorage.getItem('crm_token');
async function apiFetch(method, endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${tok()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}

/* ══ helpers ══ */
const fmtT = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const ago = d => { const s=(Date.now()-new Date(d))/1000; if(s<60)return 'ahora'; if(s<3600)return `${Math.floor(s/60)}m`; if(s<86400)return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`; };
const dateStr = n => { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().split('T')[0]; };

/* ══ Clasificación caliente/tibio/frío ══ */
const HEAT = {
  caliente:{ l:'¡A cerrar!',  c:'#10b981', b:'#f0fdf9', Icon:CheckCircle, dot:'#10b981', tip:'Este lead está listo — ¡prioridad máxima!' },
  tibio:   { l:'Seguir',      c:'#f59e0b', b:'#fefce8', Icon:Clock,       dot:'#f59e0b', tip:'Sigue en contacto — tiene potencial' },
  frio:    { l:'¡Rescátalo!', c:'#ef4444', b:'#fff1f2', Icon:Zap,         dot:'#ef4444', tip:'No lo abandones — una llamada puede cambiarlo todo' },
};
const LEAD_COLS = {
  caliente:{ label:'¡A cerrar!',  sub:'Listos para convertir — actúa YA',  color:'#10b981', bg:'#f0fdf9', border:'#a7f3d0' },
  tibio:   { label:'En seguimiento', sub:'Sigue llamando — tienen potencial', color:'#f59e0b', bg:'#fefce8', border:'#fde68a' },
  frio:    { label:'¡Rescátalos!', sub:'No los pierdas — una llamada puede cambiarlo', color:'#ef4444', bg:'#fff1f2', border:'#fecaca' },
};
const EVT_CFG = {
  llamada:  { Icon:Phone,          label:'Llamada',          color:'#10b981' },
  cita:     { Icon:Calendar,       label:'Cita',             color:'#4f6ef7' },
  cobro:    { Icon:DollarSign,     label:'Cliente por cobrar',color:'#f59e0b' },
  video:    { Icon:MessageCircle,  label:'Videollamada',     color:'#8b5cf6' },
};
const PAY_ST = { pending:{c:'#f59e0b',b:'#fef3c7',l:'Pendiente'}, overdue:{c:'#ef4444',b:'#fee2e2',l:'Vencido'}, paid:{c:'#10b981',b:'#d1fae5',l:'Pagado'} };

/* ══ Datos iniciales ══ */
const INIT_CLIENTS = [
  { id:'c1', name:'Roberto Sánchez', phone:'+52551234567', email:'roberto@gmail.com', heat:'caliente', result:null,  lossReason:'', score:85, last:new Date(Date.now()-2*3600000).toISOString(),  notes:'Interesado en plan premium' },
  { id:'c2', name:'Laura Martínez',  phone:'+52339876543', email:'laura@empresa.com', heat:'tibio',    result:null,  lossReason:'', score:60, last:new Date(Date.now()-26*3600000).toISOString(), notes:'Quiere comparar precios' },
  { id:'c3', name:'Diego Ramírez',   phone:'+52815555444', email:'diego@corp.mx',     heat:'caliente', result:'won', lossReason:'', score:95, last:new Date(Date.now()-5*3600000).toISOString(),  notes:'Cerrado exitosamente' },
  { id:'c4', name:'Sofía López',     phone:'+52557777888', email:'sofia@hotmail.com', heat:'frio',     result:'lost',lossReason:'Sin presupuesto este trimestre', score:20, last:new Date(Date.now()-48*3600000).toISOString(), notes:'No contestó 3 veces' },
  { id:'c5', name:'Miguel Torres',   phone:'+52331122334', email:'miguel@corp.mx',    heat:'caliente', result:null,  lossReason:'', score:72, last:new Date(Date.now()-4*3600000).toISOString(),  notes:'Reunión de cierre pendiente' },
];
const INIT_EVENTS = [
  { id:'ev1', type:'cita',    cid:'c1', cname:'Roberto Sánchez', date:dateStr(2), time:'10:00', notes:'Demo del producto' },
  { id:'ev2', type:'llamada', cid:'c2', cname:'Laura Martínez',  date:dateStr(1), time:'15:30', notes:'Revisar cotización' },
  { id:'ev3', type:'video',   cid:'c5', cname:'Miguel Torres',   date:dateStr(5), time:'11:00', notes:'Reunión de cierre' },
  { id:'ev4', type:'cobro',   cid:'c3', cname:'Diego Ramírez',   date:dateStr(3), time:'09:00', notes:'Recordatorio pago $8,500' },
];
const INIT_PAYMENTS = [
  { id:'p1', cid:'c3', cname:'Diego Ramírez',   concept:'Plan Premium', amount:8500, status:'pending', due:dateStr(7)  },
  { id:'p2', cid:'c1', cname:'Roberto Sánchez', concept:'Mensualidad',  amount:2500, status:'overdue', due:dateStr(-3) },
  { id:'p3', cid:'c5', cname:'Miguel Torres',   concept:'Setup fee',    amount:1500, status:'paid',    due:dateStr(-10)},
  { id:'p4', cid:'c2', cname:'Laura Martínez',  concept:'Consultoría',  amount:3200, status:'pending', due:dateStr(14) },
];
const INIT_ACTIONS = [
  { id:'a1', type:'llamada',   cid:'c1', cname:'Roberto Sánchez', at:new Date(Date.now()-1*3600000).toISOString(),  dur:252,  resultado:'Interesado en premium', notas:'Prometió decidir esta semana' },
  { id:'a2', type:'whatsapp',  cid:'c2', cname:'Laura Martínez',  at:new Date(Date.now()-3*3600000).toISOString(),  dur:null, resultado:'Enviado catálogo',       notas:'Esperar respuesta 48h' },
  { id:'a3', type:'llamada',   cid:'c5', cname:'Miguel Torres',   at:new Date(Date.now()-5*3600000).toISOString(),  dur:165,  resultado:'Cita confirmada',        notas:'Reunión viernes 11am' },
  { id:'a4', type:'email',     cid:'c3', cname:'Diego Ramírez',   at:new Date(Date.now()-8*3600000).toISOString(),  dur:null, resultado:'Contrato enviado',       notas:'Pendiente firma digital' },
  { id:'a5', type:'llamada',   cid:'c4', cname:'Sofía López',     at:new Date(Date.now()-24*3600000).toISOString(), dur:89,   resultado:'No contestó 3er intento',notas:'Marcar como perdido si no responde' },
  { id:'a6', type:'whatsapp',  cid:'c1', cname:'Roberto Sánchez', at:new Date(Date.now()-30*3600000).toISOString(), dur:null, resultado:'Visto sin respuesta',    notas:'Seguimiento mañana' },
];
const INIT_LEADS = [
  { id:'l1', nombre:'Andrés Castillo', telefono:'+52551098765', email:'andres@gmail.com',    msgBot:'Vi su anuncio y me interesa saber más del plan premium.',    nivel:'caliente', score:90, notas:'Preguntó por precios y disponibilidad inmediata.', origen:'WhatsApp Bot', fecha:new Date(Date.now()-1*3600000).toISOString()  },
  { id:'l2', nombre:'Patricia Núñez',  telefono:'+52339012345', email:'patricia@corp.mx',    msgBot:'Buenos días, ¿me pueden enviar información sobre sus planes?', nivel:'caliente', score:82, notas:'Empresa necesita 5 licencias.',                    origen:'WhatsApp Bot', fecha:new Date(Date.now()-2*3600000).toISOString()  },
  { id:'l3', nombre:'Fernando Reyes',  telefono:'+52554567890', email:'',                    msgBot:'Me recomendaron su empresa, quisiera una cotización.',         nivel:'caliente', score:78, notas:'Referido por cliente existente.',                  origen:'WhatsApp Bot', fecha:new Date(Date.now()-4*3600000).toISOString()  },
  { id:'l4', nombre:'Claudia Herrera', telefono:'+52813456789', email:'claudia@hotmail.com', msgBot:'¿Cuánto cuesta el plan básico? Estoy comparando opciones.',    nivel:'tibio',    score:55, notas:'Evalúa también a la competencia.',                 origen:'WhatsApp Bot', fecha:new Date(Date.now()-6*3600000).toISOString()  },
  { id:'l5', nombre:'Ricardo Méndez',  telefono:'+52556789012', email:'ricardo@empresa.com', msgBot:'Hola, quiero información general de sus servicios.',           nivel:'tibio',    score:50, notas:'Sin urgencia ni presupuesto mencionado.',           origen:'WhatsApp Bot', fecha:new Date(Date.now()-8*3600000).toISOString()  },
  { id:'l6', nombre:'Valentina Cruz',  telefono:'+52332345678', email:'',                    msgBot:'¿Tienen soporte en español?',                                  nivel:'tibio',    score:42, notas:'Pregunta puntual, poco contexto.',                  origen:'WhatsApp Bot', fecha:new Date(Date.now()-10*3600000).toISOString() },
  { id:'l7', nombre:'Jorge Salinas',   telefono:'+52557890123', email:'jorge@salinas.mx',    msgBot:'Ok',                                                           nivel:'frio',     score:18, notas:'Solo respondió "ok". Sin más info.',                origen:'WhatsApp Bot', fecha:new Date(Date.now()-14*3600000).toISOString() },
  { id:'l8', nombre:'Mónica Vargas',   telefono:'+52551234000', email:'',                    msgBot:'¿Esto es real o spam?',                                        nivel:'frio',     score:12, notas:'Respuesta de desconfianza.',                        origen:'WhatsApp Bot', fecha:new Date(Date.now()-18*3600000).toISOString() },
  { id:'l9', nombre:'Alejandro Ponce', telefono:'+52339876001', email:'',                    msgBot:'No gracias, solo curioseando.',                                nivel:'frio',     score:5,  notas:'Descartó el servicio.',                            origen:'WhatsApp Bot', fecha:new Date(Date.now()-24*3600000).toISOString() },
];
if(!window.__CRM_MSGS__) window.__CRM_MSGS__=[
  { id:'m1', de:'sup', deNombre:'Rosa (Supervisora)', para:'asesor', texto:'¡Buen trabajo esta semana!', hora:new Date(Date.now()-3600000).toISOString(), leido:false },
  { id:'m2', de:'asesor', deNombre:'Yo', para:'sup', texto:'Gracias! Cerré a Diego hoy', hora:new Date(Date.now()-1800000).toISOString(), leido:true },
];

/* ══ ATOMS ══ */
function Bdg({l,c,b}){ return <span style={{padding:'2px 9px',borderRadius:999,fontSize:11,fontWeight:700,color:c,background:b,whiteSpace:'nowrap'}}>{l}</span>; }
function Panel({title,Icon,color='#4f6ef7',children,action}){
  return(
    <div style={{background:CB,borderRadius:18,border:`1px solid ${DS.primary}18`,boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)',overflow:'hidden'}}>
      <div style={{padding:'11px 15px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontSize:13,fontWeight:700,color:'#1e293b',display:'flex',alignItems:'center',gap:6}}><Icon size={13} color={color}/>{title}</div>
        {action}
      </div>
      <div style={{padding:14}}>{children}</div>
    </div>
  );
}
function KpiCard({Icon,label,value,color,onClick,badge}){
  return(
    <div onClick={onClick} style={{background:CB,borderRadius:'14px',padding:'14px 15px',border:`1px solid ${DS.primary}18`,borderTop:`3px solid ${color}`,cursor:onClick?'pointer':'default',transition:'box-shadow .15s',position:'relative',boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)'}}
      onMouseEnter={e=>{if(onClick)e.currentTarget.style.boxShadow=`0 4px 18px ${color}25`;}}
      onMouseLeave={e=>e.currentTarget.style.boxShadow=''}>
      {badge>0&&<div style={{position:'absolute',top:'8px',right:'8px',width:'18px',height:'18px',borderRadius:'50%',background:'#ef4444',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:800,color:'#fff'}}>{badge}</div>}
      <Icon size={18} color={color} strokeWidth={1.8}/>
      <div style={{fontSize:'22px',fontWeight:800,color:'#1e293b',marginTop:'6px'}}>{value}</div>
      <div style={{fontSize:'10px',color:'#9aa5be',marginTop:'2px',display:'flex',alignItems:'center',gap:'2px'}}>{label}{onClick&&<span style={{color,marginLeft:'2px'}}>→</span>}</div>
    </div>
  );
}

function IBtn({onClick,bg,color,title,children}){ 
  return (
    <button 
      title={title} 
      onClick={onClick} 
      style={{
        padding: '5px 8px', 
        borderRadius: '7px', 
        border: 'none', 
        background: bg || '#eef2ff', 
        color: color || '#4f6ef7', 
        cursor: 'pointer', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px', 
        fontWeight: 700, 
        fontSize: '11px'
      }}
    >
      {children}
    </button>
  ); 
}

function Modal({title,subtitle,width=440,onClose,children}){
  return(
    <div style={{position:'fixed',inset:0,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(8px)',background:'rgba(79,110,247,0.35)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
      <div style={{background:'#ffffff',borderRadius:'20px',padding:'26px',width,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'18px'}}>
          <div><h2 style={{margin:'0 0 3px',fontSize:'17px',fontWeight:800,color:'#1e293b'}}>{title}</h2>{subtitle&&<div style={{fontSize:'11px',color:'#9aa5be'}}>{subtitle}</div>}</div>
          <button onClick={onClose} style={{border:'none',background:'rgba(79,110,247,0.10)',borderRadius:'8px',padding:'7px',cursor:'pointer',display:'flex'}}><X size={13} color="#64748b"/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({label,children}){ return <div><label style={{fontSize:'10px',color:'#9aa5be',fontWeight:700,display:'block',marginBottom:'5px'}}>{label}</label>{children}</div>; }
const inp = {padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:'10px',fontSize:'13px',outline:'none',width:'100%',boxSizing:'border-box',background:'#fff',color:'#1e293b',fontFamily:"'DM Sans',sans-serif",transition:'border-color .2s,box-shadow .2s'};
const btn_primary = {padding:'11px 0',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#4f6ef7,#3b55e0)',color:'#fff',fontWeight:700,fontSize:'13px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',fontFamily:"'DM Sans',sans-serif"};
const btn_cancel  = {padding:'11px',borderRadius:'10px',border:'1px solid #cbd5e1',background:'#f5f7fb',color:'#9aa5be',fontWeight:700,fontSize:'13px',cursor:'pointer'};

/* ══ CONFIRM MODAL ══ */
let _setConfirm = null;
function askConfirm(msg, onYes) { if (_setConfirm) _setConfirm({ msg, onYes }); }
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

/* ══ WHATSAPP APP CHOOSER ══ */
let _setWA = null;
function openWA(num, text, app) {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const isAndroid = /Android/i.test(ua);
  if (isAndroid && app) {
    // En Android se puede abrir directamente la app elegida (WhatsApp o WhatsApp Business)
    const pkg = app === 'business' ? 'com.whatsapp.w4b' : 'com.whatsapp';
    const t = text ? `&text=${encodeURIComponent(text)}` : '';
    window.location.href = `intent://send?phone=${num}${t}#Intent;scheme=whatsapp;package=${pkg};end`;
  } else {
    // iOS / escritorio: el sistema decide qué app usar
    const t = text ? `?text=${encodeURIComponent(text)}` : '';
    window.open(`https://wa.me/${num}${t}`, '_blank');
  }
}
function askWhatsApp(phone, text = '', leadId = null) {
  const num = toWA(phone);
  if (!num) { alert('Este contacto no tiene un número de WhatsApp válido.'); return; }
  if (leadId) apiFetch('POST', `/api/supervisor/leads/${leadId}/contactar`, {}).catch(()=>{});
  // Si el asesor ya eligió su app de WhatsApp, abrir directo sin volver a preguntar
  let pref = null;
  try { pref = localStorage.getItem('crm_wa_app'); } catch(e) {}
  if (pref === 'normal' || pref === 'business') { openWA(num, text, pref); return; }
  if (_setWA) _setWA({ num, text });
  else openWA(num, text);
}
function WhatsAppModal({ data, onClose }) {
  const { num, text } = data;
  const [remember, setRemember] = useState(true);
  const choose = (app) => {
    if (remember) { try { localStorage.setItem('crm_wa_app', app); } catch(e) {} }
    openWA(num, text, app);
    onClose();
  };
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,padding:'26px 28px',width:340,boxShadow:'0 24px 64px rgba(0,0,0,0.18)',border:'1px solid #e2e8f0'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
          <MessageCircle size={18} color="#25d366"/>
          <div style={{fontSize:17,fontWeight:800,color:'#1e293b'}}>Abrir chat de WhatsApp</div>
        </div>
        <div style={{fontSize:13,color:'#64748b',marginBottom:20,lineHeight:1.5}}>¿Con qué aplicación quieres abrir el chat con <b>+{num}</b>?</div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <button onClick={()=>choose('normal')} style={{padding:'13px',borderRadius:12,border:'none',background:'#25d366',color:'#fff',fontWeight:800,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <MessageCircle size={16}/> WhatsApp
          </button>
          <button onClick={()=>choose('business')} style={{padding:'13px',borderRadius:12,border:'none',background:'#0a7d4b',color:'#fff',fontWeight:800,fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <MessageCircle size={16}/> WhatsApp Business
          </button>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12.5,color:'#64748b',cursor:'pointer',padding:'4px 2px'}}>
            <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} style={{width:16,height:16,accentColor:'#25d366',cursor:'pointer'}}/>
            Recordar mi elección y no volver a preguntar
          </label>
          <button onClick={onClose} style={{padding:'11px',borderRadius:12,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#64748b',fontWeight:700,fontSize:13,cursor:'pointer'}}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ══ CALL MODAL ══ */
function CallModal({client,onSave,onClose}){
  const [phase,setPhase]=useState('choose');
  const [secs,setSecs]=useState(0);
  const [notes,setNotes]=useState('');
  const [result,setResult]=useState('');
  const [via,setVia]=useState('llamada');
  const timerRef=useRef(null);

  function startCall(type){
    setVia(type);
    setPhase('calling');
    const raw=(client?.phone||'').replace(/\D/g,'');
    if(type==='llamada'){
      window.location.href=`tel:${client?.phone||''}`;
    } else {
      const wa=raw.startsWith('593')?raw:raw.startsWith('0')&&raw.length===10?'593'+raw.substring(1):raw.length===9?'593'+raw:raw;
      window.open(`https://wa.me/${wa}`,'_blank');
    }
    timerRef.current=setInterval(()=>setSecs(s=>s+1),1000);
  }
  function hangUp(){ clearInterval(timerRef.current); setPhase('saving'); }
  useEffect(()=>()=>clearInterval(timerRef.current),[]);

  const p=DS.primary;
  return(
    <Modal title="Llamar a cliente" subtitle={`${client?.name} · ${client?.phone}`} width={370} onClose={onClose}>
      {phase==='choose'&&(
        <div>
          <div style={{textAlign:'center',marginBottom:20,fontSize:13,color:'#64748b'}}>
            Elige cómo contactar a <b>{client?.name}</b>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <button onClick={()=>startCall('llamada')}
              style={{padding:'16px 20px',borderRadius:14,border:`2px solid ${p}30`,background:`${p}08`,cursor:'pointer',display:'flex',alignItems:'center',gap:14,transition:'all .15s'}}
              onMouseEnter={e=>{e.currentTarget.style.background=`${p}14`;e.currentTarget.style.borderColor=p;}}
              onMouseLeave={e=>{e.currentTarget.style.background=`${p}08`;e.currentTarget.style.borderColor=`${p}30`;}}>
              <div style={{width:44,height:44,borderRadius:12,background:p,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontSize:20}}>📞</span>
              </div>
              <div style={{textAlign:'left'}}>
                <div style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>Llamada por teléfono</div>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{client?.phone}</div>
              </div>
            </button>
            <button onClick={()=>startCall('whatsapp')}
              style={{padding:'16px 20px',borderRadius:14,border:'2px solid #25d36630',background:'#25d36608',cursor:'pointer',display:'flex',alignItems:'center',gap:14,transition:'all .15s'}}
              onMouseEnter={e=>{e.currentTarget.style.background='#25d36614';e.currentTarget.style.borderColor='#25d366';}}
              onMouseLeave={e=>{e.currentTarget.style.background='#25d36608';e.currentTarget.style.borderColor='#25d36630';}}>
              <div style={{width:44,height:44,borderRadius:12,background:'#25d366',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontSize:20}}>💬</span>
              </div>
              <div style={{textAlign:'left'}}>
                <div style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>Llamada por WhatsApp</div>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{client?.phone}</div>
              </div>
            </button>
          </div>
        </div>
      )}
      {phase==='calling'&&(
        <div style={{textAlign:'center',padding:'8px 0'}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,color:via==='llamada'?p:'#25d366',marginBottom:10,textTransform:'uppercase'}}>
            {via==='llamada'?'📞 Llamada en curso':'💬 WhatsApp en curso'}
          </div>
          <div style={{fontSize:52,fontWeight:800,color:'#1e293b',letterSpacing:3,marginBottom:24,fontVariantNumeric:'tabular-nums'}}>{fmtT(secs)}</div>
          <button onClick={hangUp}
            style={{padding:'14px 40px',borderRadius:999,border:'none',background:'#ef4444',color:'#fff',fontWeight:800,fontSize:15,cursor:'pointer',boxShadow:'0 4px 20px #ef444440'}}>
            📵 Colgar
          </button>
        </div>
      )}
      {phase==='saving'&&(
        <div>
          <div style={{textAlign:'center',background:'#f8fafc',borderRadius:12,padding:'12px',marginBottom:16,fontSize:13}}>
            <span style={{color:'#94a3b8'}}>Duración: </span>
            <span style={{fontWeight:800,color:'#1e293b'}}>{fmtT(secs)}</span>
          </div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notas de la llamada..." rows={3}
            style={{...inp,resize:'none',marginBottom:12}}/>
          <textarea value={result} onChange={e=>setResult(e.target.value)} placeholder="Resultado de la llamada..." rows={2}
            style={{...inp,resize:'none',marginBottom:16}}/>
          <button onClick={()=>onSave({dur:secs,notas:notes,resultado:result,type:via})}
            style={{...btn_primary,width:'100%',background:'#10b981',backgroundImage:'none'}}>
            ✓ Guardar y cerrar
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ══ LOSS MODAL ══ */
function LossModal({client,onSave,onClose}){
  const [r,setR]=useState('');
  return(
    <Modal title="Marcar como Perdido" subtitle={client?.name} onClose={onClose}>
      <div style={{background:'#fef2f2',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#dc2626'}}>
        ️ Esta acción marcará al cliente como perdido y quedará registrado en las estadísticas.
      </div>
      <Field label="CONCEPTO (describe con tus propias palabras)">
        <textarea value={r} onChange={e=>setR(e.target.value)}
          placeholder="Ej: El cliente eligió a la competencia por mejor precio, No tenía presupuesto suficiente, No le convenció el producto..."
          rows={4} style={{...inp,resize:'none',marginBottom:14,marginTop:6}}/>
      </Field>
      <div style={{display:'flex',gap:10}}>
        <button onClick={onClose} style={{flex:1,...btn_cancel}}>Cancelar</button>
        <button onClick={()=>r.trim()&&onSave(r)} disabled={!r.trim()}
          style={{flex:2,...btn_primary,background:r.trim()?'#ef4444':'#f1f5f9',color:r.trim()?'#fff':'#94a3b8',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
          <XCircle size={14}/> Confirmar pérdida
        </button>
      </div>
    </Modal>
  );
}

/* ══ WIN MODAL — con valor de venta ══ */
function WinModal({client,onSave,onClose}){
  const [amount,setAmount]=useState('');
  const [concept,setConcept]=useState('');
  const [notes,setNotes]=useState('');
  return(
    <Modal title="¡Marcar como Ganado! " subtitle={client?.name} onClose={onClose}>
      <div style={{background:'#f0fdf4',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#16a34a'}}>
        ¡Excelente! Registra el valor de esta venta para llevar estadísticas reales del negocio.
      </div>
      <div style={{display:'grid',gap:10,marginBottom:16}}>
        <Field label="VALOR DE LA VENTA ($)" required>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
            placeholder="Ej: 5000.00" style={inp}/>
        </Field>
        <Field label="CONCEPTO / PRODUCTO VENDIDO">
          <input value={concept} onChange={e=>setConcept(e.target.value)}
            placeholder="Ej: Plan Professional mensual, Producto XYZ..." style={inp}/>
        </Field>
        <Field label="NOTAS DE LA VENTA">
          <textarea value={notes} onChange={e=>setNotes(e.target.value)}
            placeholder="Notas adicionales sobre este cierre..." rows={2}
            style={{...inp,resize:'none'}}/>
        </Field>
      </div>
      <div style={{display:'flex',gap:10}}>
        <button onClick={onClose} style={{flex:1,...btn_cancel}}>Cancelar</button>
        <button onClick={()=>onSave({amount:parseFloat(amount)||0, concept, notes})}
          style={{flex:2,...btn_primary,background:'#10b981',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
          <CheckCircle size={14}/> Confirmar venta
        </button>
      </div>
    </Modal>
  );
}

/* ══ CLIENT MODAL ══ */
function ClientModal({client,onSave,onClose}){
  const [f,setF]=useState(client?{name:client.name,phone:client.phone,email:client.email||'',cedula:client.cedula||'',heat:client.heat||'tibio',score:client.score,notes:client.notes||'',producto:client.producto||''}:{name:'',phone:'',email:'',cedula:'',heat:'tibio',score:50,notes:'',producto:''});
  return(
    <Modal title={client?'Editar cliente':'Nuevo cliente'} width={460} onClose={onClose}>
        <div style={{display:'grid',gap:10,marginBottom:16}}>
          {[{p:'Nombre completo *',k:'name',t:'text'},{p:'Teléfono *',k:'phone',t:'tel'},{p:'Email',k:'email',t:'email'},{p:'Cédula / RUC',k:'cedula',t:'text'}].map(fi => (





          <input key={fi.k} type={fi.t} value={f[fi.k]} onChange={e=>setF(p=>({...p,[fi.k]:e.target.value}))} placeholder={fi.p} style={inp}/>
        ))}
        <Field label="TEMPERATURA DEL CLIENTE">

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:2}}>
            {Object.entries(HEAT).map(([k,v], i)=>(



              <button key={k} onClick={()=>setF(p=>({...p,heat:k}))} style={{padding:'9px 4px',borderRadius:9,border:`2px solid ${f.heat===k?v.c:'#e2e8f0'}`,background:f.heat===k?v.b:'#fafafa',cursor:'pointer',fontSize:12,fontWeight:700,color:f.heat===k?v.c:'#94a3b8',textAlign:'center'}}>
                {v.l}
              </button>
            ))}
          </div>
        </Field>
        <Field label={`SCORE (${f.score}/100)`}>
          <input type="range" min={0} max={100} value={f.score} onChange={e=>setF(p=>({...p,score:parseInt(e.target.value)}))}
            style={{width:'100%',accentColor:f.score>=70?'#10b981':f.score>=40?'#f59e0b':'#ef4444'}}/>
        </Field>
        <textarea value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="Notas sobre el cliente..." rows={3} style={{...inp,resize:'none'}}/>
        <Field label="PRODUCTO / SERVICIO">
          <select value={f.producto} onChange={e=>setF(p=>({...p,producto:e.target.value}))} style={inp}>
            <option value="">— Sin asignar —</option>
            <option value="Estrella">⭐ Estrella</option>
            <option value="Súper Estrella">⭐⭐ Súper Estrella</option>
            <option value="Mega Estrella">⭐⭐⭐ Mega Estrella</option>
            <option value="Contado">💵 Contado</option>
          </select>
        </Field>
      </div>
      <div style={{display:'flex',gap:10}}>
        <button onClick={onClose} style={{flex:1,...btn_cancel}}>Cancelar</button>
        <button onClick={()=>{if(!f.name||!f.phone){alert('Nombre y teléfono son obligatorios');return;}onSave(f);}} style={{flex:2,...btn_primary}}>
          <Save size={14}/> {client?'Guardar cambios':'Agregar cliente'}
        </button>
      </div>
    </Modal>
  );
}

/* ══ EVENT MODAL ══ */
function EventModal({clients,ev,onSave,onClose}){
  const [f,setF]=useState(ev?{type:ev.type,cid:ev.cid,date:ev.date,time:ev.time,notes:ev.notes}:{type:'cita',cid:'',date:dateStr(1),time:'10:00',notes:''});
  return(
    <Modal title={ev?'Editar evento':'Nuevo evento'} width={460} onClose={onClose}>
      <div style={{display:'grid',gap:10,marginBottom:16}}>
        <Field label="TIPO DE EVENTO">
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginTop:2}}>
            {Object.entries(EVT_CFG).map(([k,v])=>(
              <button key={k} onClick={()=>setF(p=>({...p,type:k}))} style={{padding:'8px 4px',borderRadius:8,border:`2px solid ${f.type===k?v.color:'#e2e8f0'}`,background:f.type===k?`${v.color}12`:'#fafafa',cursor:'pointer',fontSize:10,fontWeight:700,color:f.type===k?v.color:'#9aa5be',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                <v.Icon size={14}/>{v.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="CLIENTE">
          <select value={f.cid} onChange={e=>setF(p=>({...p,cid:e.target.value}))} style={inp}>
            <option value="">-- Selecciona un cliente --</option>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <Field label="FECHA"><input type="date" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))} style={inp}/></Field>
          <Field label="HORA"><input type="time" value={f.time} onChange={e=>setF(p=>({...p,time:e.target.value}))} style={inp}/></Field>
        </div>
        <textarea value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="Notas del evento..." rows={2} style={{...inp,resize:'none'}}/>
      </div>
      <div style={{display:'flex',gap:10}}>
        <button onClick={onClose} style={{flex:1,...btn_cancel}}>Cancelar</button>
        <button onClick={()=>{if(!f.cid){alert('Selecciona un cliente');return;}const cl=clients.find(c=>c.id===f.cid);onSave({...f,cname:cl?.name||''});}} style={{flex:2,...btn_primary}}>
          <Save size={14}/> {ev?'Guardar cambios':'Crear evento'}
        </button>
      </div>
    </Modal>
  );
}

/* ══ ACTION EDIT MODAL ══ */
function ActionModal({action,onSave,onClose}){
  const [f,setF]=useState({type:action.type,resultado:action.resultado||'',notas:action.notas||''});
  return(
    <Modal title="Editar actividad" subtitle={action.cname} width={440} onClose={onClose}>
      <div style={{display:'grid',gap:10,marginBottom:16}}>
        <Field label="TIPO">
          <select value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))} style={inp}>
            <option value="llamada">Llamada telefónica</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="cita">Cita / visita</option>
          </select>
        </Field>
        <Field label="RESULTADO">
          <input value={f.resultado} onChange={e=>setF(p=>({...p,resultado:e.target.value}))} placeholder="¿Qué resultado tuvo?" style={inp}/>
        </Field>
        <Field label="NOTAS INTERNAS">
          <textarea value={f.notas} onChange={e=>setF(p=>({...p,notas:e.target.value}))} rows={3} style={{...inp,resize:'none'}}/>
        </Field>
      </div>
      <div style={{display:'flex',gap:10}}>
        <button onClick={onClose} style={{flex:1,...btn_cancel}}>Cancelar</button>
        <button onClick={()=>onSave(f)} style={{flex:2,...btn_primary}}><Save size={14}/> Guardar</button>
      </div>
    </Modal>
  );
}

/* ══ PAYMENT MODAL ══ */
function PayModal({clients,pay,onSave,onClose}){
  const [f,setF]=useState(pay?{cid:pay.cid,concept:pay.concept,amount:pay.amount,status:pay.status,due:pay.due}:{cid:'',concept:'',amount:'',status:'pending',due:dateStr(7)});
  return(
    <Modal title={pay?'Editar pago':'Registrar pago'} onClose={onClose}>
      <div style={{display:'grid',gap:10,marginBottom:16}}>
        <Field label="CLIENTE">
          <select value={f.cid} onChange={e=>setF(p=>({...p,cid:e.target.value}))} style={inp}>
            <option value="">-- Selecciona cliente --</option>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="CONCEPTO"><input value={f.concept} onChange={e=>setF(p=>({...p,concept:e.target.value}))} placeholder="Plan, mensualidad, servicio..." style={inp}/></Field>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <Field label="MONTO ($)"><input type="number" value={f.amount} onChange={e=>setF(p=>({...p,amount:e.target.value}))} placeholder="0.00" style={inp}/></Field>
          <Field label="VENCE"><input type="date" value={f.due} onChange={e=>setF(p=>({...p,due:e.target.value}))} style={inp}/></Field>
        </div>
        <Field label="ESTADO">
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginTop:2}}>
            {Object.entries(PAY_ST).map(([k,v])=>(
              <button key={k} onClick={()=>setF(p=>({...p,status:k}))} style={{padding:'8px',borderRadius:8,border:`2px solid ${f.status===k?v.c:'#e2e8f0'}`,background:f.status===k?v.b:'#fafafa',cursor:'pointer',fontSize:12,fontWeight:700,color:f.status===k?v.c:'#94a3b8'}}>{v.l}</button>
            ))}
          </div>
        </Field>
      </div>
      <div style={{display:'flex',gap:10}}>
        <button onClick={onClose} style={{flex:1,...btn_cancel}}>Cancelar</button>
        <button onClick={()=>{if(!f.cid||!f.concept||!f.amount){alert('Completa los campos obligatorios');return;}const cl=clients.find(c=>c.id===f.cid);onSave({...f,amount:parseFloat(f.amount),cname:cl?.name||''});}} style={{flex:2,...btn_primary}}><Save size={14}/> {pay?'Guardar':'Registrar'}</button>
      </div>
    </Modal>
  );
}

/* ══ LEAD MODAL ══ */
function LeadModal({lead,onSave,onClose}){
  const [f,setF]=useState({nombre:lead?.nombre||'',telefono:lead?.telefono||'',email:lead?.email||'',cedula:lead?.cedula||'',nivel:lead?.nivel||'tibio',score:lead?.score||50,notas:lead?.notas||'',msgBot:lead?.msgBot||''});
  const sc=f.score>=70?'#10b981':f.score>=40?'#f59e0b':'#ef4444';
  return(
    <Modal title={lead?'Editar lead':'Nuevo lead'} subtitle="Recibido vía WhatsApp Bot" width={480} onClose={onClose}>
      <div style={{background:'#f0fdf4',borderRadius:10,padding:'10px 12px',marginBottom:14,border:'1px solid #bbf7d0'}}>
        <div style={{fontSize:9,color:'#16a34a',fontWeight:700,marginBottom:4,display:'flex',alignItems:'center',gap:4}}><MessageCircle size={9}/> MENSAJE DEL BOT</div>
        <textarea value={f.msgBot} onChange={e=>setF(p=>({...p,msgBot:e.target.value}))} rows={2} style={{width:'100%',background:'transparent',border:'none',outline:'none',fontSize:12,color:'#15803d',resize:'none',fontStyle:'italic',boxSizing:'border-box'}}/>
      </div>
      <div style={{display:'grid',gap:10,marginBottom:14}}>
        {[{p:'Nombre *',k:'nombre',t:'text'},{p:'Teléfono *',k:'telefono',t:'tel'},{p:'Email',k:'email',t:'email'},{p:'Cédula',k:'cedula',t:'text'}].map(fi=>(
          <input key={fi.k} type={fi.t} value={f[fi.k]} onChange={e=>setF(p=>({...p,[fi.k]:e.target.value}))} placeholder={fi.p} style={inp}/>
        ))}
        <Field label="NIVEL DE INTERÉS">
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:2}}>
            {Object.entries(LEAD_COLS).map(([k,v])=>(
              <button key={k} onClick={()=>setF(p=>({...p,nivel:k}))} style={{padding:'9px 4px',borderRadius:9,border:`2px solid ${f.nivel===k?v.color:'#e2e8f0'}`,background:f.nivel===k?v.bg:'#fafafa',cursor:'pointer',fontSize:11,fontWeight:700,color:f.nivel===k?v.color:'#9aa5be',textAlign:'center'}}>
                <div>{v.label}</div><div style={{fontSize:9,opacity:.7,marginTop:2}}>{v.sub}</div>
              </button>
            ))}
          </div>
        </Field>
        <Field label={`SCORE DE INTERÉS — ${f.score}/100`}>
          <input type="range" min={0} max={100} value={f.score} onChange={e=>setF(p=>({...p,score:parseInt(e.target.value)}))} style={{width:'100%',accentColor:sc}}/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#cbd5e1',marginTop:1}}><span style={{color:'#ef4444'}}>¡Rescatar!</span><span style={{color:'#f59e0b'}}>Seguir</span><span style={{color:'#10b981'}}>¡Cerrar!</span></div>
        </Field>
        <textarea value={f.notas} onChange={e=>setF(p=>({...p,notas:e.target.value}))} placeholder="Notas internas sobre este lead..." rows={2} style={{...inp,resize:'none'}}/>
      </div>
      <div style={{display:'flex',gap:10}}>
        <button onClick={onClose} style={{flex:1,...btn_cancel}}>Cancelar</button>
        <button onClick={()=>{if(!f.nombre||!f.telefono){alert('Nombre y teléfono son obligatorios');return;}onSave(f);}} style={{flex:2,...btn_primary}}><Save size={14}/> {lead?'Guardar cambios':'Agregar lead'}</button>
      </div>
    </Modal>
  );
}

/* ════════════════════════════════════════════
   TAB CLIENTES — con clasificación Caliente/Tibio/Frío
════════════════════════════════════════════ */
function TabClientes({clients,setClients,onCall,onRefresh,onVerConversacion}){
  const [isMob, setIsMob] = useState(window.innerWidth < 900);
  useEffect(()=>{const fn=()=>setIsMob(window.innerWidth<900);window.addEventListener('resize',fn);return()=>window.removeEventListener('resize',fn);},[]);
  const [q,setQ]=useState(''); const [filt,setFilt]=useState('all'); const [heatFilt,setHeatFilt]=useState('all');
  const [lossModal,  setLossModal]  = useState(null);
  const [winModal,   setWinModal]   = useState(null);
  const [clientModal,setClientModal]= useState(null);
  const [detailId,   setDetailId]   = useState(null);
  const [saving,     setSaving]     = useState(false);

  const rows=clients.filter(c=>{
    const ms=(c.name||'').toLowerCase().includes(q.toLowerCase())||(c.phone||'').includes(q);
    const mf=filt==='all'||(filt==='active'&&!c.result)||(filt==='won'&&c.result==='won')||(filt==='lost'&&c.result==='lost');
    const mh=heatFilt==='all'||c.heat===heatFilt;
    return ms&&mf&&mh;
  });

  const { paged, ...pg } = usePaged(rows, 12);

  async function markWon(id, winData) {
    try {
      await apiFetch('PUT',`/api/asesor/clients/${id}`,{
        result:'won', heat:'caliente',
        notes: winData?.notes||'',
        saleAmount: winData?.amount||0,
        saleConcept: winData?.concept||'',
      });
      setClients(p=>p.map(c=>c.id===id?{...c,result:'won',saleAmount:winData?.amount||0}:c));
      // Also save as payment
      if (winData?.amount>0) {
        apiFetch('POST','/api/asesor/activities',{
          clientId:id, type:'venta',
          resultado:`Venta cerrada: ${winData.concept||'Venta'} — $${winData.amount}`,
          notas:winData.notes||'', duration:0,
        }).catch(()=>{});
      }
    } catch(e) { alert('Error: '+e.message); }
    setWinModal(null); setDetailId(null);
  }

  async function markLost(id,r) {
    try {
      await apiFetch('PUT',`/api/asesor/clients/${id}`,{ result:'lost', lossReason:r });
      setClients(p=>p.map(c=>c.id===id?{...c,result:'lost',lossReason:r}:c));
    } catch(e) { alert('Error: '+e.message); }
    setLossModal(null); setDetailId(null);
  }

  async function reopen(id) {
    try {
      await apiFetch('PUT',`/api/asesor/clients/${id}`,{ result:null });
      setClients(p=>p.map(c=>c.id===id?{...c,result:null,lossReason:''}:c));
    } catch(e) { alert('Error: '+e.message); }
  }

  function del(id) {
    askConfirm('Este cliente será eliminado permanentemente.', async () => {
      try {
        await apiFetch('DELETE',`/api/clients/${id}`);
        setClients(p=>p.filter(c=>c.id!==id));
      } catch(e) { alert('Error: '+e.message); }
      setDetailId(null);
    });
  }

  async function save(f) {
    setSaving(true);
    try {
      if(clientModal==='new') {
        const r = await apiFetch('POST','/api/clients',{
          name:f.name, phone:f.phone, email:f.email||null, cedula:f.cedula||null,
          notes:f.notes||null, heat:f.heat, classification:'needs_info',
        });
        setClients(p=>[{...r,heat:f.heat,cedula:f.cedula||'',result:null,last:r.created_at},...p]);
      } else {
        const r = await apiFetch('PUT',`/api/asesor/clients/${clientModal.id}`,{
          name:f.name, phone:f.phone, email:f.email, cedula:f.cedula, notes:f.notes, heat:f.heat, producto:f.producto,
        });
        setClients(p=>p.map(c=>c.id===clientModal.id?{...c,...r,heat:f.heat,cedula:f.cedula||''}:c));
      }
      if(onRefresh) onRefresh();
    } catch(e) { alert('Error: '+e.message); }
    setSaving(false);
    setClientModal(null);
  }

  const dc=detailId?clients.find(c=>c.id===detailId):null;

  const sidebarPanels = (
    <>
      <Panel title="Distribución de calor" Icon={TrendingUp}>
        {Object.entries(HEAT).map(([k,v])=>{
          const n=clients.filter(c=>c.heat===k).length; const pct=clients.length?Math.round((n/clients.length)*100):0;
          return(
            <div key={k} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:11,fontWeight:700,color:'#4a5568'}}>
                <span>{v.l}</span><span style={{color:v.c}}>{n}</span>
              </div>
              <div style={{background:'rgba(79,110,247,0.10)',borderRadius:999,height:6}}><div style={{width:`${pct}%`,height:'100%',background:v.c,borderRadius:999}}/></div>
            </div>
          );
        })}
      </Panel>
      <Panel title="Sin contacto +24h" Icon={AlertCircle} color="#ef4444">
        {clients.filter(c=>(Date.now()-new Date(c.last))/3600000>24&&!c.result).map(c=>(
          <div key={c.id} style={{display:'flex',gap:7,padding:'7px 0',borderBottom:'1px solid #e2e8f0',alignItems:'center'}}>
            <div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,color:'#1e293b'}}>{c.name}</div><div style={{fontSize:9,color:'#ef4444'}}>{ago(c.last)}</div></div>
            <IBtn onClick={()=>onCall(c)}><Phone size={11} color='#4f6ef7'/></IBtn>
          </div>
        ))}
        {clients.filter(c=>(Date.now()-new Date(c.last))/3600000>24&&!c.result).length===0&&<div style={{fontSize:11,color:'#10b981',textAlign:'center',fontWeight:600}}> Todos contactados</div>}
      </Panel>
    </>
  );

  return(
    <div>
    <div style={{display:'flex',flexDirection:isMob?'column':'row',gap:16}}>
      {lossModal&&<LossModal client={lossModal} onSave={r=>markLost(lossModal.id,r)} onClose={()=>setLossModal(null)}/>}
      {winModal&&<WinModal client={winModal} onSave={d=>markWon(winModal.id,d)} onClose={()=>setWinModal(null)}/>}
      {clientModal&&<ClientModal client={clientModal==='new'?null:clientModal} onSave={save} onClose={()=>setClientModal(null)}/>}
      {dc&&(
        <div style={{position:'fixed',inset:0,backdropFilter:'blur(6px)',background:'rgba(79,110,247,0.3)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9000}}>
          <div style={{background:'#ffffff',borderRadius:20,padding:26,width:480,maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
              <div>
                <h2 style={{margin:'0 0 6px',fontSize:18,fontWeight:800,color:'#1e293b'}}>{dc.name}</h2>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                  {dc.heat&&(
                    <span style={{display:'inline-flex',alignItems:'center',gap:4,
                      padding:'2px 8px',borderRadius:999,fontSize:10,fontWeight:700,
                      color:HEAT[dc.heat]?.c||'#94a3b8',
                      background:HEAT[dc.heat]?.b||'#f1f5f9',
                      border:`1px solid ${HEAT[dc.heat]?.c||'#94a3b8'}25`}}>
                      <span style={{width:6,height:6,borderRadius:'50%',
                        background:HEAT[dc.heat]?.c||'#94a3b8',
                        boxShadow:`0 0 5px ${HEAT[dc.heat]?.c||'#94a3b8'}`,flexShrink:0}}/>
                      {HEAT[dc.heat]?.l||dc.heat}
                    </span>
                  )}
                  {dc.result==='won'&&<Bdg l=" Ganado" c="#065f46" b="#d1fae5"/>}
                  {dc.result==='lost'&&<Bdg l=" Perdido" c="#7f1d1d" b="#fee2e2"/>}
                  {!dc.result&&<Bdg l="● En proceso" c="#92400e" b="#fef3c7"/>}
                </div>
              </div>
              <button onClick={()=>setDetailId(null)} style={{border:'none',background:'rgba(79,110,247,0.10)',borderRadius:8,padding:7,cursor:'pointer',display:'flex'}}><X size={13} color="#64748b"/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              {[{l:'TELÉFONO',v:dc.phone},{l:'CÉDULA / RUC',v:dc.cedula||'—'},{l:'EMAIL',v:dc.email||'—'},{l:'SCORE',v:`${dc.score}/100`},{l:'CONTACTO',v:ago(dc.last)}].map((fi,i)=>(
                <div key={i} style={{background:'#f5f7fb',borderRadius:9,padding:'9px 12px'}}>
                  <div style={{fontSize:9,color:'#9aa5be',fontWeight:700}}>{fi.l}</div>
                  <div style={{fontSize:13,fontWeight:700,color:'#1e293b',marginTop:3}}>{fi.v}</div>
                </div>
              ))}
            </div>
            {dc.notes&&<div style={{background:'#fef3c7',borderRadius:9,padding:'9px 12px',marginBottom:12,fontSize:13,color:'#92400e'}}><b>Nota:</b> {dc.notes}</div>}
            {dc.result==='won'&&dc.saleAmount>0&&<div style={{background:'#f0fdf4',borderRadius:9,padding:'9px 12px',border:'1px solid #bbf7d0',marginBottom:12}}><div style={{fontSize:9,color:'#16a34a',fontWeight:700,marginBottom:3}}>VALOR DE VENTA</div><div style={{fontSize:18,fontWeight:800,color:'#16a34a'}}>${parseFloat(dc.saleAmount||0).toLocaleString()}</div></div>}
            {(dc.producto||dc.metadata?.producto)&&<div style={{background:'#eff6ff',borderRadius:9,padding:'9px 12px',border:'1px solid #bfdbfe',marginBottom:12}}><div style={{fontSize:9,color:'#1d4ed8',fontWeight:700,marginBottom:3}}>PRODUCTO / SERVICIO</div><div style={{fontSize:13,fontWeight:700,color:'#1e40af'}}>{dc.producto||dc.metadata?.producto}</div></div>}
            {dc.result==='lost'&&<div style={{background:'#fef2f2',borderRadius:9,padding:'9px 12px',border:'1px solid #fecaca',marginBottom:12}}><div style={{fontSize:9,color:'#dc2626',fontWeight:700,marginBottom:3}}>CONCEPTO</div><div style={{fontSize:12,color:'#7f1d1d'}}>{dc.lossReason||'Sin concepto registrado'}</div></div>}
            <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
              <IBtn onClick={()=>onCall(dc)} bg="#eef2ff" color='#4f6ef7'><Phone size={12}/> Llamar</IBtn>
              {onVerConversacion&&<IBtn onClick={()=>{setDetailId(null);onVerConversacion(dc);}} bg="#eff6ff" color="#2563eb"><MessageSquare size={12}/> Ver conversación</IBtn>}
              <IBtn onClick={()=>askWhatsApp(dc.phone, `Hola ${dc.name}`)} bg="#f0fdf4" color="#25d366"><MessageCircle size={12}/> WhatsApp</IBtn>
              <IBtn onClick={()=>{setDetailId(null);setClientModal(dc);}} bg="#fef3c7" color="#d97706"><Edit2 size={12}/> Editar</IBtn>
              {!dc.result&&<><IBtn onClick={()=>{setWinModal(dc);}} bg="#d1fae5" color="#10b981"><CheckCircle size={12}/> Ganado</IBtn><IBtn onClick={()=>{setDetailId(null);setLossModal(dc);}} bg="#fee2e2" color="#ef4444"><XCircle size={12}/> Perdido</IBtn></>}
              {dc.result&&<IBtn onClick={()=>reopen(dc.id)} bg="#f1f5f9" color="#64748b"><RefreshCw size={12}/> Reabrir</IBtn>}
              <IBtn onClick={()=>del(dc.id)} bg="#fee2e2" color="#ef4444"><Trash2 size={12}/> Eliminar</IBtn>
            </div>
          </div>
        </div>
      )}

      <div style={{flex:1,minWidth:0}}>
        {/* Filtros de temperatura */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginBottom:12}}>
          {[{l:'Todos',v:'all',c:'#4f6ef7',n:clients.length,Ic:null},{l:'Caliente',v:'caliente',c:'#ef4444',n:clients.filter(c=>c.heat==='caliente').length,Ic:Flame},{l:'Tibio',v:'tibio',c:'#f59e0b',n:clients.filter(c=>c.heat==='tibio').length,Ic:Thermometer},{l:'Frío',v:'frio',c:'#4f6ef7',n:clients.filter(c=>c.heat==='frio').length,Ic:Snowflake}].map(s=>(
            <div key={s.v} onClick={()=>setHeatFilt(s.v)} style={{background:CB,borderRadius:10,padding:'9px 12px',border:`1px solid ${DS.primary}18`,borderLeft:`3px solid ${heatFilt===s.v?s.c:'transparent'}`,cursor:'pointer',textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.n}</div>
              <div style={{fontSize:10,color:'#9aa5be',marginTop:2}}>{s.l}</div>
            </div>
          ))}
          <div onClick={()=>setFilt(filt==='won'?'all':'won')} style={{background:filt==='won'?'#d1fae5':'#fff',borderRadius:10,padding:'9px 12px',border:'1px solid #e2e8f0',borderLeft:`3px solid ${filt==='won'?'#10b981':'transparent'}`,cursor:'pointer',textAlign:'center'}}>
            <div style={{fontSize:18,fontWeight:800,color:'#10b981'}}>{clients.filter(c=>c.result==='won').length}</div>
            <div style={{fontSize:10,color:'#9aa5be',marginTop:2}}> Ganados</div>
          </div>
        </div>

        {/* Search + New */}
        <div style={{display:'flex',gap:8,marginBottom:12,overflowX:'auto',flexWrap:'nowrap',WebkitOverflowScrolling:'touch',paddingBottom:4}}>
          <div style={{flex:1,position:'relative',minWidth:150}}>
            <Search size={12} color="#94a3b8" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}}/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nombre o teléfono..."
              style={{...inp,paddingLeft:30}}/>
          </div>
          <button onClick={()=>setClientModal('new')} style={{padding:'9px 16px',borderRadius:9,border:'none',background:'#4f6ef7',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
            <Plus size={13}/> Nuevo cliente
          </button>
        </div>

        {/* Tabla */}
        <div style={{background:CB,borderRadius:18,border:`1px solid ${DS.primary}18`,boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)',overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:680}}>
            <thead><tr style={{background:'#f5f7fb'}}>{['Cliente','Teléfono','Temperatura','Estado','Score','Último contacto','Acciones'].map(h=><th key={h} style={{padding:'8px 11px',textAlign:'left',fontSize:10,fontWeight:700,color:'#9aa5be',textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
            <tbody>
              {paged.map(c=>{
                const h=HEAT[c.heat]||{l:c.heat,c:'#94a3b8',b:'#f1f5f9',Icon:null};
                return(
                  <tr key={c.id} style={{borderTop:'1px solid #e2e8f0',cursor:'pointer'}} onClick={()=>setDetailId(c.id)}>
                    <td style={{padding:'9px 11px'}}><div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{c.name}</div><div style={{fontSize:10,color:'#9aa5be'}}>{c.email||'Sin email'}</div></td>
                    <td style={{padding:'9px 11px',fontSize:12,color:'#4a5568'}}>{c.phone}</td>
                    <td style={{padding:'9px 11px'}}><Bdg l={h.l} c={h.c} b={h.b}/></td>
                    <td style={{padding:'9px 11px'}}>
                      {c.result==='won'&&<Bdg l=" Ganado" c="#065f46" b="#d1fae5"/>}
                      {c.result==='lost'&&<Bdg l=" Perdido" c="#7f1d1d" b="#fee2e2"/>}
                      {!c.result&&<Bdg l="● Proceso" c="#92400e" b="#fef3c7"/>}
                    </td>
                    <td style={{padding:'9px 11px'}}><span style={{padding:'2px 8px',borderRadius:999,fontSize:11,fontWeight:700,color:c.score>=70?'#065f46':c.score>=40?'#92400e':'#7f1d1d',background:c.score>=70?'#d1fae5':c.score>=40?'#fef3c7':'#fee2e2'}}>{c.score}</span></td>
                    <td style={{padding:'9px 11px',fontSize:11,color:'#9aa5be'}}>{ago(c.last)}</td>
                    <td style={{padding:'9px 11px'}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:4}}>
                        <IBtn onClick={()=>setClientModal(c)} bg="#eef2ff"><Edit2 size={11} color='#4f6ef7'/></IBtn>
                        <IBtn onClick={()=>onCall(c)} bg="#f0fdf4"><Phone size={11} color="#10b981"/></IBtn>
                        {!c.result&&<IBtn onClick={()=>setWinModal(c)} bg="#d1fae5" title="Marcar como Ganado"><CheckCircle size={11} color="#10b981"/></IBtn>}
                        {!c.result&&<IBtn onClick={()=>setLossModal(c)} bg="#fee2e2" title="Marcar como Perdido"><XCircle size={11} color="#ef4444"/></IBtn>}
                        <IBtn onClick={()=>del(c.id)} bg="#fef2f2"><Trash2 size={11} color="#ef4444"/></IBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length&&<tr><td colSpan={7} style={{padding:28,textAlign:'center',color:'#9aa5be',fontSize:13}}>Sin resultados</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination {...pg} primary={DS.primary} label="clientes" />
      </div>

      {/* Sidebar desktop */}
      {!isMob && (
        <div style={{width:220,flexShrink:0,display:'flex',flexDirection:'column',gap:12}}>
          {sidebarPanels}
        </div>
      )}
    </div>
    {/* Sidebar mobile — debajo de la lista */}
    {isMob && (
      <div style={{display:'flex',gap:12,marginTop:12}}>
        <div style={{flex:1}}>{sidebarPanels}</div>
      </div>
    )}
    </div>
  );
}

/* ════════════════════════════════════════════
   TAB CALENDARIO — CRUD completo, todos los tipos
════════════════════════════════════════════ */
/* ══ ACTIVIDAD FORM ══ */
function ActividadForm({act,clients,onSave,onClose}){
  const [f,setF]=useState({
    clientId:act?.client_id||act?.clientId||'',
    type:act?.type||'llamada',
    resultado:act?.resultado||'',
    notas:act?.notas||'',
    duration:act?.duration||act?.dur||0,
  });
  return(
    <div>
      <div style={{display:'grid',gap:10,marginBottom:16}}>
        <Field label="TIPO DE ACTIVIDAD">
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
            {[{k:'llamada',l:'Llamada',  Ic:Phone},{k:'whatsapp',l:'WhatsApp', Ic:MessageCircle},{k:'email',l:'Email',    Ic:FileText},{k:'cita',l:'Cita',     Ic:Calendar},{k:'venta',l:'Venta',    Ic:DollarSign},{k:'perdida',l:'Pérdida',  Ic:XCircle}].map(t=>(
              <button key={t.k} onClick={()=>setF(p=>({...p,type:t.k}))}
                style={{padding:'8px 4px',borderRadius:8,border:`2px solid ${f.type===t.k?DS.primary:'#e2e8f0'}`,background:f.type===t.k?'#eef2ff':'#fafafa',cursor:'pointer',fontSize:11,fontWeight:700,color:f.type===t.k?DS.primary:'#64748b'}}>
                {t.l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="CLIENTE">
          <select value={f.clientId} onChange={e=>setF(p=>({...p,clientId:e.target.value}))} style={inp}>
            <option value="">-- Selecciona cliente --</option>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="RESULTADO">
          <input value={f.resultado} onChange={e=>setF(p=>({...p,resultado:e.target.value}))} placeholder="¿Qué resultado tuvo?" style={inp}/>
        </Field>
        <Field label="DURACIÓN (minutos)">
          <input type="number" value={f.duration} onChange={e=>setF(p=>({...p,duration:parseInt(e.target.value)||0}))} placeholder="0" style={{...inp,maxWidth:120}}/>
        </Field>
        <Field label="NOTAS INTERNAS">
          <textarea value={f.notas} onChange={e=>setF(p=>({...p,notas:e.target.value}))} rows={3} placeholder="Notas sobre la actividad..." style={{...inp,resize:'none'}}/>
        </Field>
      </div>
      <div style={{display:'flex',gap:10}}>
        <button onClick={onClose} style={{flex:1,...btn_cancel}}>Cancelar</button>
        <button onClick={()=>onSave(f)} style={{flex:2,...btn_primary}}><Save size={14}/> Guardar actividad</button>
      </div>
    </div>
  );
}

function TabCalendario({events,setEvents,clients,onRefresh}){
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth());
  const [selDay,setSelDay]=useState(now.getDate());
  const [modal,setModal]=useState(null);
  const [actModal,setActModal]=useState(null); // null | 'new' | action-obj
  const [actions,setActions]=useState([]);
  const MNAMES=['Enero','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const ACT_TYPES={llamada:'Llamada',whatsapp:'WhatsApp',email:'Email',    Ic:FileText,cita:'Cita',venta:'Venta',perdida:'Pérdida'};

  // Cargar actividades reales
  useEffect(()=>{
    apiFetch('GET','/api/asesor/activities').then(r=>{ if(Array.isArray(r)) setActions(r.map(a=>({...a,cname:a.client_name||'—',at:a.created_at}))); }).catch(()=>{});
  },[]);

  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDay=new Date(year,month,1).getDay();
  const evByDay={};
  events.forEach(e=>{const d=new Date(e.date);if(d.getFullYear()===year&&d.getMonth()===month){const k=d.getDate();if(!evByDay[k])evByDay[k]=[];evByDay[k].push(e);}});
  const todayStr=`${year}-${String(month+1).padStart(2,'0')}-${String(selDay).padStart(2,'0')}`;
  const dayEvts=events.filter(e=>e.date===todayStr).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const upcoming=events.filter(e=>new Date(e.date)>=now).sort((a,b)=>new Date(a.date+' '+(a.time||''))-new Date(b.date+' '+(b.time||''))).slice(0,8);

  async function delEv(id){
    try{ await apiFetch('PUT',`/api/asesor/calendar/${id}`,{done:true}); setEvents(p=>p.filter(e=>e.id!==id)); }
    catch(e){ setEvents(p=>p.filter(e=>e.id!==id)); }
  }
  async function saveEv(f){
    try{
      if(modal==='new'){
        const r=await apiFetch('POST','/api/asesor/calendar',{clientId:f.cid,clientName:f.cname,type:f.type,eventDate:f.date,eventTime:f.time,notes:f.notes});
        setEvents(p=>[...p,{...r,date:r.event_date,time:r.event_time||'',cname:r.client_name||''}]);
      } else {
        await apiFetch('PUT',`/api/asesor/calendar/${modal.id}`,{notes:f.notes,eventDate:f.date,eventTime:f.time});
        setEvents(p=>p.map(e=>e.id===modal.id?{...e,...f}:e));
      }
    } catch(e){ setEvents(p=>modal==='new'?[...p,{id:'ev'+Date.now(),...f}]:p.map(e=>e.id===modal.id?{...e,...f}:e)); }
    setModal(null);
  }

  async function saveAction(f){
    try{
      if(actModal==='new'){
        const r=await apiFetch('POST','/api/asesor/activities',{clientId:f.clientId,type:f.type,resultado:f.resultado,notas:f.notas,duration:f.duration||0});
        setActions(p=>[{...r,cname:clients.find(c=>c.id===f.clientId)?.name||'—',at:r.created_at},...p]);
      } else {
        await apiFetch('PUT',`/api/asesor/activities/${actModal.id}`,{clientId:f.clientId,type:f.type,resultado:f.resultado,notas:f.notas,duration:f.duration});
        setActions(p=>p.map(a=>a.id===actModal.id?{...a,...f}:a));
      }
    } catch(e){ alert(e.message); }
    setActModal(null);
  }
  function delAction(id){
    askConfirm('Esta actividad será eliminada permanentemente.', async ()=>{
      try{ await apiFetch('DELETE',`/api/asesor/activities/${id}`); }
      catch(e){ alert(e.message); return; }
      setActions(p=>p.filter(a=>a.id!==id));
    });
  }

  return(
    <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'1fr 270px',gap:16}}>
      {modal&&<EventModal clients={clients} ev={modal==='new'?null:modal} onSave={saveEv} onClose={()=>setModal(null)}/>}
      <div>
        {/* Calendario visual */}
        <div style={{background:CB,borderRadius:18,border:`1px solid ${DS.primary}18`,boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)',padding:18,marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <button onClick={()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}} style={{border:'none',background:'rgba(79,110,247,0.10)',borderRadius:8,padding:'6px 10px',cursor:'pointer',display:'flex'}}><ChevronLeft size={14}/></button>
            <span style={{fontSize:15,fontWeight:800,color:'#1e293b'}}>{MNAMES[month]} {year}</span>
            <button onClick={()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}} style={{border:'none',background:'rgba(79,110,247,0.10)',borderRadius:8,padding:'6px 10px',cursor:'pointer',display:'flex'}}><ChevronRight size={14}/></button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
            {['D','L','M','X','J','V','S'].map(d=><div key={d} style={{textAlign:'center',fontSize:10,fontWeight:700,color:'#9aa5be',padding:'4px 0'}}>{d}</div>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
            {Array.from({length:firstDay}).map((_,i)=><div key={'e'+i}/>)}
            {Array.from({length:daysInMonth}).map((_,i)=>{
              const d=i+1;const isToday=d===now.getDate()&&month===now.getMonth()&&year===now.getFullYear();
              const isSel=d===selDay;const dayEvArr=evByDay[d]||[];
              return(
                <div key={d} onClick={()=>setSelDay(d)} style={{padding:'6px 0',borderRadius:8,textAlign:'center',cursor:'pointer',background:isToday?DS.primary:isSel?'#eef2ff':'transparent',color:isToday?'#fff':isSel?DS.primary:'#374151',fontWeight:isToday||isSel?800:400,position:'relative',fontSize:12}}>
                  {d}
                  {dayEvArr.length>0&&(
                    <div style={{position:'absolute',bottom:1,left:'50%',transform:'translateX(-50%)',display:'flex',gap:2}}>
                      {dayEvArr.slice(0,3).map((e,i)=>{const cfg=EVT_CFG[e.type]||{color:'#4f6ef7'};return<div key={i} style={{width:4,height:4,borderRadius:'50%',background:isToday?'#fff':cfg.color}}/>;})}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Leyenda de tipos */}
        <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap'}}>
          {Object.entries(EVT_CFG).map(([k,v])=>(
            <div key={k} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',background:'#ffffff',borderRadius:8,border:'1px solid #e2e8f0',fontSize:11,fontWeight:600,color:v.color}}>
              <v.Icon size={11}/>{v.label}
            </div>
          ))}
        </div>

        {/* Eventos del día seleccionado */}
        <div style={{background:CB,borderRadius:18,border:`1px solid ${DS.primary}18`,boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)',overflow:'hidden'}}>
          <div style={{padding:'11px 16px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{selDay} de {MNAMES[month]} · {dayEvts.length} evento(s)</span>
            <button onClick={()=>setModal('new')} style={{padding:'6px 12px',borderRadius:8,border:'none',background:'#4f6ef7',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><Plus size={11}/> Agregar</button>
          </div>
          {dayEvts.length===0&&<div style={{padding:24,textAlign:'center',color:'#9aa5be',fontSize:12}}>Sin eventos este día. <button onClick={()=>setModal('new')} style={{background:'none',border:'none',color:'#4f6ef7',fontWeight:700,cursor:'pointer',fontSize:12}}>+ Crear uno</button></div>}
          {dayEvts.map(e=>{const cfg=EVT_CFG[e.type]||{Icon:Calendar,label:e.type,color:'#4f6ef7'};return(
            <div key={e.id} style={{display:'flex',gap:12,padding:'12px 16px',borderBottom:'1px solid #e2e8f0',alignItems:'center'}}>
              <div style={{width:36,height:36,borderRadius:9,background:`${cfg.color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><cfg.Icon size={16} color={cfg.color}/></div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{e.cname}</div>
                <div style={{fontSize:11,color:cfg.color,fontWeight:700}}>{e.time} · {cfg.label}</div>
                {e.notes&&<div style={{fontSize:11,color:'#9aa5be',marginTop:2}}>{e.notes}</div>}
              </div>
              <div style={{display:'flex',gap:5}}>
                <IBtn onClick={()=>setModal(e)} bg="#eef2ff"><Edit2 size={11} color='#4f6ef7'/></IBtn>
                <IBtn onClick={()=>askWhatsApp(clients.find(c=>c.id===e.cid)?.phone, `Recordatorio de ${cfg.label} hoy a las ${e.time}`)} bg="#f0fdf4"><MessageCircle size={11} color="#25d366"/></IBtn>
                <IBtn onClick={()=>delEv(e.id)} bg="#fef2f2"><Trash2 size={11} color="#ef4444"/></IBtn>
              </div>
            </div>
          );})}
        </div>
      </div>

      {/* Sidebar próximos */}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <button onClick={()=>setModal('new')} style={{width:'100%',padding:'11px',borderRadius:12,border:'none',background:'#4f6ef7',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Plus size={14}/> Nuevo evento</button>
        <button onClick={()=>setActModal('new')} style={{width:'100%',padding:'11px',borderRadius:12,border:'none',background:'#10b981',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Plus size={14}/> Nueva actividad</button>

        {/* Stats por tipo */}
        <Panel title="Por tipo" Icon={Activity} color="#8b5cf6">
          {Object.entries(EVT_CFG).map(([k,v])=>{const n=events.filter(e=>e.type===k).length;return(
            <div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:9}}>
              <div style={{width:28,height:28,borderRadius:7,background:`${v.color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><v.Icon size={12} color={v.color}/></div>
              <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:'#4a5568'}}>{v.label}</div></div>
              <span style={{fontSize:14,fontWeight:800,color:v.color}}>{n}</span>
            </div>
          );})}
        </Panel>

        <Panel title="Próximos eventos" Icon={Bell} color="#f59e0b">
          {upcoming.length===0&&<div style={{fontSize:11,color:'#9aa5be',textAlign:'center',padding:8}}>Sin eventos próximos</div>}
          {upcoming.map(e=>{const cfg=EVT_CFG[e.type]||{Icon:Calendar,color:'#4f6ef7',label:e.type};return(
            <div key={e.id} style={{display:'flex',gap:8,padding:'8px 0',borderBottom:'1px solid #e2e8f0',alignItems:'flex-start'}}>
              <div style={{width:28,height:28,borderRadius:7,background:`${cfg.color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><cfg.Icon size={12} color={cfg.color}/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:700,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.cname}</div>
                <div style={{fontSize:10,color:cfg.color,fontWeight:700}}>{e.date} · {e.time}</div>
                <div style={{fontSize:9,color:'#9aa5be'}}>{cfg.label}</div>
              </div>
              <button onClick={()=>delEv(e.id)} style={{border:'none',background:'#fef2f2',borderRadius:6,padding:'4px 5px',cursor:'pointer',display:'flex',flexShrink:0}}><Trash2 size={10} color="#ef4444"/></button>
            </div>
          );})}
        </Panel>
      </div>

      {/* Lista de actividades — parte inferior completa */}
      <div style={{gridColumn:'1/-1',background:CB,borderRadius:18,border:`1px solid ${DS.primary}18`,boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)',overflowX:'auto',marginTop:4}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:13,fontWeight:700,color:'#1e293b',display:'flex',alignItems:'center',gap:6}}><Activity size={13} color='#4f6ef7'/> Mis actividades ({actions.length})</span>
          <button onClick={()=>setActModal('new')} style={{padding:'6px 12px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><Plus size={11}/> Nueva</button>
        </div>
        {actions.length===0&&<div style={{padding:20,textAlign:'center',color:'#9aa5be',fontSize:12}}>Sin actividades registradas. Crea una con el botón "+ Nueva"</div>}
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:680}}>
          <thead><tr style={{background:'#f5f7fb'}}>{['Tipo','Cliente','Resultado','Notas','Fecha','Acciones'].map(h=><th key={h} style={{padding:'7px 12px',textAlign:'left',fontSize:10,fontWeight:700,color:'#9aa5be',textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
          <tbody>
            {actions.slice(0,30).map(a=>{
              const color={llamada:'#4f6ef7',whatsapp:'#25d366',email:'#0ea5e9',cita:'#f59e0b',venta:'#10b981',perdida:'#ef4444'}[a.type]||'#94a3b8';
              return(
                <tr key={a.id} style={{borderTop:'1px solid #e2e8f0'}}>
                  <td style={{padding:'9px 12px'}}><span style={{padding:'2px 9px',borderRadius:999,fontSize:11,fontWeight:700,color,background:`${color}18`}}>{ACT_TYPES[a.type]||a.type}</span></td>
                  <td style={{padding:'9px 12px',fontSize:12,fontWeight:600,color:'#4a5568'}}>{a.cname||a.client_name||'—'}</td>
                  <td style={{padding:'9px 12px',fontSize:11,color:'#9aa5be'}}>{a.resultado||'—'}</td>
                  <td style={{padding:'9px 12px',fontSize:11,color:'#9aa5be',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.notas||'—'}</td>
                  <td style={{padding:'9px 12px',fontSize:10,color:'#9aa5be',whiteSpace:'nowrap'}}>{a.at?new Date(a.at).toLocaleDateString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—'}</td>
                  <td style={{padding:'9px 12px'}}>
                    <div style={{display:'flex',gap:5}}>
                      <button onClick={()=>setActModal(a)} style={{padding:'4px 8px',borderRadius:7,border:'none',background:'rgba(79,110,247,0.10)',cursor:'pointer',display:'flex'}}><Edit2 size={11} color='#4f6ef7'/></button>
                      <button onClick={()=>delAction(a.id)} style={{padding:'4px 8px',borderRadius:7,border:'none',background:'#fef2f2',cursor:'pointer',display:'flex'}}><Trash2 size={11} color="#ef4444"/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Actividad */}
      {actModal&&(
        <div style={{position:'fixed',inset:0,backdropFilter:'blur(12px)',background:'rgba(79,110,247,0.3)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{background:'#ffffff',borderRadius:20,padding:26,width:480,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:800,color:'#1e293b'}}>{actModal==='new'?'Nueva actividad':'Editar actividad'}</h3>
              <button onClick={()=>setActModal(null)} style={{border:'none',background:'none',cursor:'pointer'}}><X size={18} color="#94a3b8"/></button>
            </div>
            <ActividadForm act={actModal==='new'?null:actModal} clients={clients} onSave={saveAction} onClose={()=>setActModal(null)}/>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   TAB PAGOS — sin espacios muertos
════════════════════════════════════════════ */
function TabPagos({payments,setPayments,clients}){
  const [modal,setModal]=useState(null); // null | 'new' | pay-obj
  const [filt,setFilt]=useState('all');
  const pending=payments.filter(p=>p.status==='pending');
  const overdue=payments.filter(p=>p.status==='overdue');
  const paid=payments.filter(p=>p.status==='paid');
  const totalPend=pending.reduce((s,p)=>s+p.amount,0);
  const totalVenc=overdue.reduce((s,p)=>s+p.amount,0);
  const totalCobr=paid.reduce((s,p)=>s+p.amount,0);
  const rows=filt==='all'?payments:payments.filter(p=>p.status===filt);
  const savePay=async f=>{
    const body={clientId:f.cid||null,amount:parseFloat(f.amount)||0,dueDate:f.due||null,status:f.status,description:f.concept};
    try{
      if(modal==='new'){
        const r=await apiFetch('POST','/api/asesor/payments',body);
        setPayments(p=>[...p,{...r,cid:r.client_id,cname:clients.find(c=>c.id===f.cid)?.name||'—',concept:r.description||f.concept||'',amount:parseFloat(r.amount)||0,status:r.status||'pending',due:r.due_date||f.due}]);
      } else {
        await apiFetch('PUT',`/api/asesor/payments/${modal.id}`,body);
        setPayments(p=>p.map(x=>x.id===modal.id?{...x,...f,amount:parseFloat(f.amount)||0}:x));
      }
    }catch(e){ alert(e.message); }
    setModal(null);
  };
  const sendWA=p=>{const cl=clients.find(c=>c.id===p.cid);if(cl)askWhatsApp(cl.phone, `Hola ${cl.name}, le recordamos su pago pendiente de $${p.amount.toLocaleString()} por ${p.concept}.`);};

  // Calcular días hasta vencimiento
  const daysUntil=due=>{const d=Math.round((new Date(due)-new Date())/(1000*86400));return d;};

  return(
    <>
      {modal&&<PayModal clients={clients} pay={modal==='new'?null:modal} onSave={savePay} onClose={()=>setModal(null)}/>}

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {l:'Por cobrar',   v:`$${totalPend.toLocaleString()}`, c:'#f59e0b', Ic:Clock,       n:pending.length},
          {l:'Vencidos',     v:`$${totalVenc.toLocaleString()}`, c:'#ef4444', Ic:AlertCircle, n:overdue.length},
          {l:'Cobrado',      v:`$${totalCobr.toLocaleString()}`, c:'#10b981', Ic:CheckCircle, n:paid.length},
          {l:'Total pagos',  v:payments.length,                  c:'#4f6ef7', Ic:FileText,    n:null},
        ].map((s,i)=>(
          <div key={i} style={{background:CB,borderRadius:14,padding:'14px 16px',border:`1px solid ${DS.primary}18`,borderTop:`3px solid ${s.c}`,display:'flex',gap:10,alignItems:'center'}}>
            <div style={{width:38,height:38,borderRadius:10,background:`${s.c}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><s.Ic size={16} color={s.c}/></div>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:'#1e293b'}}>{s.v}</div>
              <div style={{fontSize:10,color:'#9aa5be'}}>{s.l}{s.n!==null&&` · ${s.n} pagos`}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 240px',gap:14}}>
        <div>
          {/* Filtros + botón */}
          <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
            {[{k:'all',l:'Todos'},{k:'pending',l:'Pendientes'},{k:'overdue',l:'Vencidos'},{k:'paid',l:'Cobrados'}].map(f=>(
              <button key={f.k} onClick={()=>setFilt(f.k)} style={{padding:'7px 12px',borderRadius:8,border:'none',fontSize:12,fontWeight:700,cursor:'pointer',background:filt===f.k?DS.primary:'#f1f5f9',color:filt===f.k?'#fff':'#64748b'}}>{f.l}</button>
            ))}
            <div style={{flex:1}}/>
            <button onClick={()=>setModal('new')} style={{padding:'8px 14px',borderRadius:9,border:'none',background:'#4f6ef7',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}><Plus size={13}/> Registrar pago</button>
          </div>

          {/* Tabla */}
          <div style={{background:CB,borderRadius:18,border:`1px solid ${DS.primary}18`,boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)',overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:680}}>
              <thead><tr style={{background:'#f5f7fb'}}>{['Cliente','Concepto','Monto','Vence','Días','Estado','Acciones'].map(h=><th key={h} style={{padding:'8px 11px',textAlign:'left',fontSize:10,fontWeight:700,color:'#9aa5be',textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map(p=>{
                  const st=PAY_ST[p.status]||{c:'#94a3b8',b:'#f1f5f9',l:p.status};
                  const dias=daysUntil(p.due);
                  return(
                    <tr key={p.id} style={{borderTop:'1px solid #e2e8f0'}}>
                      <td style={{padding:'10px 11px',fontSize:12,fontWeight:700,color:'#1e293b'}}>{p.cname}</td>
                      <td style={{padding:'10px 11px',fontSize:11,color:'#9aa5be'}}>{p.concept}</td>
                      <td style={{padding:'10px 11px',fontSize:13,fontWeight:800,color:'#10b981'}}>${p.amount.toLocaleString()}</td>
                      <td style={{padding:'10px 11px',fontSize:11,color:'#9aa5be'}}>{p.due}</td>
                      <td style={{padding:'10px 11px'}}>
                        <span style={{fontSize:11,fontWeight:700,color:p.status==='paid'?'#10b981':dias<0?'#ef4444':dias<=3?'#f59e0b':'#94a3b8'}}>
                          {p.status==='paid'?'Cobrado':dias<0?`${Math.abs(dias)}d vencido`:dias===0?'¡Hoy!':dias<=3?`️ ${dias}d`:`${dias}d`}
                        </span>
                      </td>
                      <td style={{padding:'10px 11px'}}><Bdg l={st.l} c={st.c} b={st.b}/></td>
                      <td style={{padding:'10px 11px'}} onClick={e=>e.stopPropagation()}>
                        <div style={{display:'flex',gap:4}}>
                          {p.status!=='paid'&&<IBtn onClick={async()=>{try{await apiFetch('PUT',`/api/asesor/payments/${p.id}`,{status:'paid'});}catch(e){alert(e.message);return;}setPayments(prev=>prev.map(x=>x.id===p.id?{...x,status:'paid'}:x));}} bg="#d1fae5" color="#065f46" title="Marcar cobrado"><CheckCircle size={11}/></IBtn>}
                          {p.status!=='paid'&&<IBtn onClick={()=>sendWA(p)} bg="#f0fdf4" title="Recordatorio WhatsApp"><MessageCircle size={11} color="#25d366"/></IBtn>}
                          <IBtn onClick={()=>setModal(p)} bg="#eef2ff" title="Editar"><Edit2 size={11} color='#4f6ef7'/></IBtn>
                          <IBtn onClick={()=>askConfirm('¿Eliminar este pago?', async()=>{try{await apiFetch('DELETE',`/api/asesor/payments/${p.id}`);}catch(e){alert(e.message);return;}setPayments(prev=>prev.filter(x=>x.id!==p.id));})} bg="#fef2f2" title="Eliminar"><Trash2 size={11} color="#ef4444"/></IBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length&&<tr><td colSpan={7} style={{padding:24,textAlign:'center',color:'#9aa5be',fontSize:12}}>Sin pagos en esta categoría</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Vencimientos urgentes */}
          <Panel title=" Urgentes" Icon={AlertCircle} color="#ef4444">
            {overdue.length===0&&pending.filter(p=>daysUntil(p.due)<=3).length===0&&<div style={{fontSize:11,color:'#10b981',textAlign:'center',fontWeight:600}}> Sin urgencias</div>}
            {[...overdue,...pending.filter(p=>daysUntil(p.due)<=3)].map(p=>(
              <div key={p.id} style={{padding:'8px 0',borderBottom:'1px solid #e2e8f0'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#1e293b'}}>{p.cname}</div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
                  <span style={{fontSize:12,fontWeight:800,color:'#ef4444'}}>${p.amount.toLocaleString()}</span>
                  <button onClick={()=>sendWA(p)} style={{border:'none',background:'#f0fdf4',borderRadius:6,padding:'3px 7px',cursor:'pointer',fontSize:10,fontWeight:700,color:'#25d366',display:'flex',alignItems:'center',gap:3}}><MessageCircle size={9}/> WA</button>
                </div>
              </div>
            ))}
          </Panel>

          {/* Resumen visual */}
          <Panel title="Distribución" Icon={TrendingUp}>
            {[{l:'Pendiente',v:totalPend,c:'#f59e0b'},{l:'Vencido',v:totalVenc,c:'#ef4444'},{l:'Cobrado',v:totalCobr,c:'#10b981'}].map((s,i)=>{
              const total=totalPend+totalVenc+totalCobr||1; const pct=Math.round((s.v/total)*100);
              return(
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:11}}><span style={{fontWeight:600,color:'#4a5568'}}>{s.l}</span><span style={{fontWeight:800,color:s.c}}>{pct}%</span></div>
                  <div style={{background:'rgba(79,110,247,0.10)',borderRadius:999,height:6}}><div style={{width:`${pct}%`,height:'100%',background:s.c,borderRadius:999}}/></div>
                </div>
              );
            })}
          </Panel>

          {/* Scripts de cobro */}
          <Panel title="Scripts de cobro" Icon={MessageSquare} color="#8b5cf6">
            {[{t:'Recordatorio amable',m:'Hola, le escribo para recordarle su pago pendiente. ¿Podemos coordinarlo esta semana?'},{t:'Urgente vencido',m:'Estimado cliente, su pago está vencido. Por favor contáctenos para evitar cargos adicionales.'},{t:'Último aviso',m:'Este es un último aviso sobre su saldo pendiente. Por favor regularice a la brevedad.'}].map((s,i)=>(
              <div key={i} style={{padding:'7px 0',borderBottom:'1px solid #e2e8f0'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#4a5568',marginBottom:2}}>{s.t}</div>
                <div style={{fontSize:9,color:'#9aa5be',marginBottom:3,lineHeight:1.4}}>{s.m.slice(0,55)}...</div>
                <button onClick={()=>navigator.clipboard.writeText(s.m)} style={{padding:'2px 8px',borderRadius:5,border:'none',background:'rgba(79,110,247,0.10)',color:'#4f6ef7',fontSize:9,fontWeight:700,cursor:'pointer'}}>Copiar</button>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════
   TAB ACTIVIDADES — historial con edición/borrado, sin espacios muertos
════════════════════════════════════════════ */
function TabActividades({actions,setActions,clients,onCall}){
  const [editModal,setEditModal]=useState(null);
  const [filt,setFilt]=useState('all');
  const ACT_CFG={llamada:{Icon:Phone,c:'#4f6ef7',l:'Llamada'},whatsapp:{Icon:MessageCircle,c:'#25d366',l:'WhatsApp'},mensaje_wa:{Icon:MessageCircle,c:'#25d366',l:'Mensaje WA'},email:{Icon:FileText,c:'#f59e0b',l:'Email'},cita:{Icon:Calendar,c:'#8b5cf6',l:'Cita'},nota:{Icon:FileText,c:'#64748b',l:'Nota'},cambio_estado:{Icon:RefreshCw,c:'#ef4444',l:'Cambio de estado'},venta:{Icon:DollarSign,c:'#10b981',l:'Venta'},reasignacion:{Icon:RefreshCw,c:'#2563eb',l:'Reasignación'}};
  const rows=filt==='all'?actions:actions.filter(a=>a.type===filt);
  const del=id=>askConfirm('Esta actividad será eliminada.', async ()=>{
    try{ await apiFetch('DELETE',`/api/asesor/activities/${id}`); }
    catch(e){ alert(e.message); return; }
    setActions(p=>p.filter(a=>a.id!==id));
  });
  const save=async f=>{
    try{ await apiFetch('PUT',`/api/asesor/activities/${editModal.id}`,{type:f.type,resultado:f.resultado,notas:f.notas}); }
    catch(e){ alert(e.message); }
    setActions(p=>p.map(a=>a.id===editModal.id?{...a,...f}:a));setEditModal(null);
  };
  // Stats
  const calls=actions.filter(a=>a.type==='llamada');
  const avgDur=calls.filter(a=>a.dur).length?Math.round(calls.filter(a=>a.dur).reduce((s,a)=>s+a.dur,0)/calls.filter(a=>a.dur).length):0;

  return(
    <>
      {editModal&&<ActionModal action={editModal} onSave={save} onClose={()=>setEditModal(null)}/>}

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {l:'Total actividades', v:actions.length,       c:'#4f6ef7', Ic:Activity},
          {l:'Llamadas',          v:calls.length,          c:'#10b981', Ic:Phone},
          {l:'WhatsApp',          v:actions.filter(a=>a.type==='whatsapp').length, c:'#25d366', Ic:MessageCircle},
          {l:'Prom. duración',    v:fmtT(avgDur),          c:'#f59e0b', Ic:Clock},
        ].map((s,i)=>(
          <div key={i} style={{background:CB,borderRadius:14,padding:'14px 16px',border:`1px solid ${DS.primary}18`,borderTop:`3px solid ${s.c}`,display:'flex',gap:10,alignItems:'center'}}>
            <div style={{width:36,height:36,borderRadius:10,background:`${s.c}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><s.Ic size={15} color={s.c}/></div>
            <div><div style={{fontSize:20,fontWeight:800,color:'#1e293b'}}>{s.v}</div><div style={{fontSize:10,color:'#9aa5be'}}>{s.l}</div></div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 230px',gap:14}}>
        <div>
          {/* Filtros */}
          <div style={{display:'flex',gap:7,marginBottom:12}}>
            {[{k:'all',l:'Todos'},{k:'llamada',l:'Llamadas', Ic:Phone},{k:'whatsapp',l:'WhatsApp', Ic:MessageCircle},{k:'email',l:'Email',    Ic:FileText},{k:'cita',l:'Citas',    Ic:Calendar}].map(f=>(
              <button key={f.k} onClick={()=>setFilt(f.k)} style={{padding:'6px 12px',borderRadius:8,border:'none',fontSize:11,fontWeight:700,cursor:'pointer',background:filt===f.k?DS.primary:'#f1f5f9',color:filt===f.k?'#fff':'#64748b'}}>{f.l}</button>
            ))}
          </div>

          {/* Lista con editar/borrar */}
          <div style={{background:CB,borderRadius:18,border:`1px solid ${DS.primary}18`,boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)',overflow:'hidden'}}>
            {rows.length===0&&<div style={{padding:28,textAlign:'center',color:'#9aa5be',fontSize:12}}>Sin actividades registradas</div>}
            {rows.map((a,i)=>{
              const cfg=ACT_CFG[a.type]||{Icon:Activity,c:'#94a3b8',l:a.type};
              return(
                <div key={a.id} style={{display:'flex',gap:12,padding:'12px 16px',borderBottom:'1px solid #e2e8f0',alignItems:'flex-start'}}>
                  <div style={{width:36,height:36,borderRadius:9,background:`${cfg.c}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><cfg.Icon size={15} color={cfg.c}/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{a.cname}</span>
                      <Bdg l={cfg.l} c={cfg.c} b={`${cfg.c}18`}/>
                      {a.dur!=null&&<span style={{fontSize:10,color:cfg.c,fontWeight:700}}>{fmtT(a.dur)}</span>}
                    </div>
                    {a.resultado&&<div style={{fontSize:12,color:'#4a5568',marginBottom:2}}> {a.resultado}</div>}
                    {a.notas&&<div style={{fontSize:11,color:'#9aa5be',fontStyle:'italic'}}>{a.notas}</div>}
                    <div style={{fontSize:10,color:'#cbd5e1',marginTop:3}}>{ago(a.at)}</div>
                  </div>
                  <div style={{display:'flex',gap:5,flexShrink:0}}>
                    <IBtn onClick={()=>setEditModal(a)} bg="#eef2ff" title="Editar"><Edit2 size={11} color='#4f6ef7'/></IBtn>
                    <IBtn onClick={()=>del(a.id)} bg="#fef2f2" title="Eliminar"><Trash2 size={11} color="#ef4444"/></IBtn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Por tipo */}
          <Panel title="Por tipo" Icon={TrendingUp} color="#8b5cf6">
            {Object.entries(ACT_CFG).map(([k,v])=>{
              const n=actions.filter(a=>a.type===k).length; const mx=Math.max(...Object.values(ACT_CFG).map((_,i,arr)=>actions.filter(a=>a.type===Object.keys(ACT_CFG)[i]).length))||1;
              return(
                <div key={k} style={{marginBottom:9}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:11}}>
                    <span style={{fontWeight:600,color:'#4a5568',display:'flex',alignItems:'center',gap:4}}><v.Icon size={10} color={v.c}/>{v.l}</span>
                    <span style={{fontWeight:800,color:v.c}}>{n}</span>
                  </div>
                  <div style={{background:'rgba(79,110,247,0.10)',borderRadius:999,height:5}}><div style={{width:`${(n/mx)*100}%`,height:'100%',background:v.c,borderRadius:999}}/></div>
                </div>
              );
            })}
          </Panel>

          {/* Acciones rápidas */}
          <Panel title="Acción rápida" Icon={Zap} color="#10b981">
            {clients.filter(c=>!c.result).slice(0,5).map(c=>(
              <div key={c.id} style={{display:'flex',gap:7,padding:'7px 0',borderBottom:'1px solid #e2e8f0',alignItems:'center'}}>
                <div style={{flex:1,fontSize:11,fontWeight:700,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name.split(' ')[0]}</div>
                <IBtn onClick={()=>onCall(c)}><Phone size={10} color='#4f6ef7'/></IBtn>
                <IBtn onClick={()=>askWhatsApp(c.phone, `Hola ${c.name}`)} bg="#f0fdf4"><MessageCircle size={10} color="#25d366"/></IBtn>
              </div>
            ))}
          </Panel>

          {/* Mejor horario */}
          <Panel title="Mejores horarios" Icon={Clock} color="#f59e0b">
            {[{h:'9-11am',pct:82,c:'#10b981'},{h:'12-2pm',pct:55,c:'#f59e0b'},{h:'3-5pm',pct:70,c:'#4f6ef7'},{h:'5-7pm',pct:40,c:'#94a3b8'}].map((s,i)=>(
              <div key={i} style={{marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}>
                  <span style={{fontWeight:600,color:'#4a5568'}}>{s.h}</span>
                  <span style={{fontWeight:700,color:s.c}}>{s.pct}%</span>
                </div>
                <div style={{background:'rgba(79,110,247,0.10)',borderRadius:999,height:5}}><div style={{width:`${s.pct}%`,height:'100%',background:s.c,borderRadius:999}}/></div>
              </div>
            ))}
            <div style={{fontSize:9,color:'#9aa5be',marginTop:4}}>% de llamadas atendidas</div>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════
   TAB MENSAJES — solo supervisor
════════════════════════════════════════════ */
function TabMensajes({ contacts }){
  const [msgs,     setMsgs]    = useState([]);
  const [activeTo, setActiveTo]= useState(null);
  const [texto,    setTexto]   = useState('');
  const [loading,  setLoading] = useState(true);
  const endRef = useRef(null);

  // Separar admin (solo lectura) y supervisores (puede escribir)
  const supervisores = (contacts||[]).filter(c=>c.role==='supervisor');
  const admins       = (contacts||[]).filter(c=>c.role==='admin');
  const contactoActivo = (contacts||[]).find(c=>c.id===activeTo);
  const esAdmin = contactoActivo?.role==='admin';

  useEffect(()=>{
    // Seleccionar primer supervisor por defecto
    if(supervisores.length>0 && !activeTo) setActiveTo(supervisores[0].id);
    else if(contacts?.length>0 && !activeTo) setActiveTo(contacts[0].id);
  },[contacts?.length, activeTo]);

  useEffect(()=>{
    setLoading(true);
    apiFetch('GET','/api/asesor/messages')
      .then(r=>setMsgs(Array.isArray(r)?r:[]))
      .catch(()=>setMsgs([]))
      .finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}); },[msgs,activeTo]);

  async function enviar(){
    if(!texto.trim()||!activeTo||esAdmin) return;
    try {
      const r = await apiFetch('POST','/api/asesor/messages',{ toId:activeTo, texto:texto.trim() });
      setMsgs(p=>[...p,r]);
      setTexto('');
    } catch(e){ alert(e.message); }
  }

  const conv = msgs.filter(m=>m.from_id===activeTo||m.to_id===activeTo).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  return(
    <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:0,background:CB,borderRadius:18,border:`1px solid ${DS.primary}18`,boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)',overflow:'hidden',minHeight:500}}>
      {/* Lista contactos */}
      <div style={{borderRight:'1px solid rgba(79,110,247,0.08)',background:'#f5f7fb',overflowY:'auto'}}>
        <div style={{padding:'12px 14px',borderBottom:'1px solid #e2e8f0',fontSize:12,fontWeight:700,color:'#1e293b'}}>Mensajería interna</div>
        {/* Supervisores - puede escribir */}
        {supervisores.length>0&&<div style={{padding:'5px 12px 3px',fontSize:9,color:'#9aa5be',fontWeight:800,textTransform:'uppercase'}}>Mis supervisores</div>}
        {supervisores.map(c=>{
          const unread=msgs.filter(m=>m.from_id===c.id&&!m.leido).length;
          const last=[...msgs].filter(m=>m.from_id===c.id||m.to_id===c.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
          return(
            <div key={c.id} onClick={()=>setActiveTo(c.id)} style={{padding:'10px 14px',display:'flex',gap:8,alignItems:'center',cursor:'pointer',background:activeTo===c.id?'#f5f3ff':'transparent',borderBottom:'1px solid #e2e8f0'}}>
              <div style={{width:34,height:34,borderRadius:'50%',background:'#f5f3ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#8b5cf6',flexShrink:0}}>{(c.name||'?').charAt(0)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{c.name}</div>
                <div style={{fontSize:10,color:'#8b5cf6',fontWeight:600}}> Supervisor</div>
                {last&&<div style={{fontSize:9,color:'#9aa5be',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{last.texto}</div>}
              </div>
              {unread>0&&<div style={{width:17,height:17,borderRadius:'50%',background:'#8b5cf6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'#fff'}}>{unread}</div>}
            </div>
          );
        })}
        {/* Admin - solo lectura */}
        {admins.length>0&&<div style={{padding:'8px 12px 3px',fontSize:9,color:'#9aa5be',fontWeight:800,textTransform:'uppercase'}}>Administrador</div>}
        {admins.map(c=>{
          const unread=msgs.filter(m=>m.from_id===c.id&&!m.leido).length;
          const last=[...msgs].filter(m=>m.from_id===c.id||m.to_id===c.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
          return(
            <div key={c.id} onClick={()=>setActiveTo(c.id)} style={{padding:'10px 14px',display:'flex',gap:8,alignItems:'center',cursor:'pointer',background:activeTo===c.id?'#fef3c7':'transparent',borderBottom:'1px solid #e2e8f0'}}>
              <div style={{width:34,height:34,borderRadius:'50%',background:'#fef3c7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#d97706',flexShrink:0}}>{(c.name||'?').charAt(0)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{c.name}</div>
                <div style={{fontSize:10,color:'#d97706',fontWeight:600}}> Admin — Solo lectura</div>
                {last&&<div style={{fontSize:9,color:'#9aa5be',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{last.texto}</div>}
              </div>
              {unread>0&&<div style={{width:17,height:17,borderRadius:'50%',background:'#f59e0b',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'#fff'}}>{unread}</div>}
            </div>
          );
        })}
        {(!contacts||contacts.length===0)&&<div style={{padding:16,fontSize:11,color:'#9aa5be',textAlign:'center'}}>Sin contactos disponibles</div>}
      </div>

      {/* Chat */}
      <div style={{display:'flex',flexDirection:'column'}}>
        {contactoActivo?(
          <div style={{padding:'11px 16px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:9,background:'#f5f7fb'}}>
            <div style={{width:34,height:34,borderRadius:'50%',background:contactoActivo.role==='admin'?'#fef3c7':'#f5f3ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:contactoActivo.role==='admin'?'#d97706':'#8b5cf6'}}>{(contactoActivo.name||'?').charAt(0)}</div>
            <div><div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{contactoActivo.name}</div><div style={{fontSize:10,color:'#9aa5be'}}>{contactoActivo.role==='admin'?'Administrador':'Supervisor'}</div></div>
          </div>
        ):(
          <div style={{padding:'11px 16px',borderBottom:'1px solid #e2e8f0',background:'#f5f7fb',color:'#9aa5be',fontSize:12}}>Selecciona un contacto</div>
        )}
        <div style={{flex:1,overflowY:'auto',padding:'14px 16px',display:'flex',flexDirection:'column',gap:9,minHeight:280}}>
          {loading&&<div style={{color:'#9aa5be',fontSize:12,textAlign:'center',marginTop:40}}>Cargando...</div>}
          {!loading&&conv.length===0&&<div style={{color:'#9aa5be',fontSize:12,textAlign:'center',marginTop:40}}>Sin mensajes aún. ¡Escribe algo!</div>}
          {conv.map(m=>{
            const mine=m.from_role==='asesor'||m.from_role==='advisor';
            return(
              <div key={m.id} style={{display:'flex',justifyContent:mine?'flex-end':'flex-start'}}>
                <div style={{maxWidth:'70%',padding:'9px 13px',borderRadius:mine?'14px 14px 4px 14px':'14px 14px 14px 4px',background:mine?DS.primary:'#f1f5f9',color:mine?'#fff':'#374151',fontSize:13,lineHeight:1.5}}>
                  {!mine&&<div style={{fontSize:10,fontWeight:700,color:'#4f6ef7',marginBottom:2}}>{m.from_name}</div>}
                  {m.texto}
                  <div style={{fontSize:9,marginTop:3,opacity:.65,textAlign:'right'}}>{new Date(m.created_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef}/>
        </div>
        {esAdmin ? (
          <div style={{padding:'12px 16px',borderTop:'1px solid #e2e8f0',background:'#fef3c7',display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:11,color:'#92400e'}}>️ Solo puedes ver los mensajes del administrador, no responder.</span>
          </div>
        ) : (
          <div style={{padding:'9px 14px',borderTop:'1px solid #e2e8f0',display:'flex',gap:9,alignItems:'flex-end'}}>
            <textarea value={texto} onChange={e=>setTexto(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviar();}}}
              placeholder={contactoActivo?`Escribe a ${contactoActivo.name.split(' ')[0]}... (Enter para enviar)`:'Selecciona contacto'} rows={2} disabled={!activeTo}
              style={{flex:1,padding:'8px 12px',border:'1px solid #cbd5e1',borderRadius:10,fontSize:12,resize:'none',outline:'none'}}/>
            <button onClick={enviar} disabled={!texto.trim()||!activeTo} style={{padding:'11px 14px',borderRadius:10,border:'none',background:!texto.trim()||!activeTo?'#f1f5f9':'#4f6ef7',color:!texto.trim()||!activeTo?'#94a3b8':'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontWeight:700,fontSize:12}}>
              <Send size={13}/> Enviar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   TAB LEADS — KANBAN con drag & drop
════════════════════════════════════════════ */

// ══════════════════════════════════════════════════════════
// TAB: CONVERSACIONES DEL BOT (lo que Claudia habló con el cliente)
// ══════════════════════════════════════════════════════════
// ── Tabla de cotizaciones Busimott (replicada del backend) ───────────────────
const TABLA_COT = {
  6000:  {36:195.37,42:167.46,48:146.53,54:130.24,60:117.22,66:106.56,72:97.68,  ins:336, tp:433.68 },
  7000:  {36:227.93,42:195.37,48:170.95,54:151.95,60:136.76,66:124.32,72:113.96, ins:392, tp:505.96 },
  8000:  {36:260.49,42:223.28,48:195.37,54:173.66,60:156.29,66:142.08,72:130.24, ins:448, tp:578.24 },
  9000:  {36:293.05,42:251.19,48:219.79,54:195.37,60:175.83,66:159.85,72:146.53, ins:504, tp:650.53 },
  10000: {36:325.61,42:279.10,48:244.21,54:217.07,60:195.37,66:177.61,72:162.81, ins:560, tp:722.81 },
  11000: {36:358.17,42:307.00,48:268.63,54:238.78,60:214.90,66:195.37,72:179.09, ins:616, tp:795.09 },
  12000: {36:390.73,42:334.91,48:293.05,54:260.49,60:234.44,66:213.13,72:195.37, ins:672, tp:867.37 },
  13000: {36:423.29,42:362.82,48:317.47,54:282.20,60:253.98,66:230.89,72:211.65, ins:728, tp:939.65 },
  14000: {36:455.86,42:390.73,48:341.89,54:303.90,60:273.51,66:248.65,72:227.93, ins:784, tp:1011.93},
  15000: {36:488.42,42:418.64,48:366.31,54:325.61,60:293.05,66:266.41,72:244.21, ins:840, tp:1084.21},
  16000: {36:520.98,42:446.55,48:390.73,54:347.32,60:312.59,66:284.17,72:260.49, ins:896, tp:1156.49},
  17000: {36:553.54,42:474.46,48:415.15,54:369.03,60:332.12,66:301.93,72:276.77, ins:952, tp:1228.77},
  18000: {36:586.10,42:502.37,48:439.58,54:390.73,60:351.66,66:319.69,72:293.05, ins:1008,tp:1301.05},
  19000: {36:618.66,42:530.28,48:464.00,54:412.44,60:371.20,66:337.45,72:309.33, ins:1064,tp:1373.33},
  20000: {36:651.22,42:558.19,48:488.42,54:434.15,60:390.73,66:355.21,72:325.61, ins:1120,tp:1445.61},
};
function getCotRow(valor) {
  const v = Math.max(6000,Math.min(20000,Math.round(Number(valor)/1000)*1000));
  return { row: TABLA_COT[v], base: v };
}
function generarCotFrontend(valor, modalidad, plazo) {
  const { row, base } = getCotRow(valor);
  if (!row) return '';
  const vl    = `${base/1000}mil`;
  const cuota = (row[plazo] ?? row[72]).toFixed(2);
  const tp    = row.tp.toFixed(2);
  const e70   = Math.round(base*0.70);
  const mega  = `🟡 Modalidad Mega Estrella (valor ${vl})\n\n📑 Invierte el 70%= $${e70}\n\nDisfrute su vehículo en apenas 20 días hábiles 🚘\n\n🔸 Valor restante diferido:\n12 meses\n18 meses`;
  const super_ = `🟡 Modalidad Súper Estrella (valor ${vl})\n\n✅ Activación de servicio (beneficios)= $${tp} su primera mensualidad ya está incluida.📑\n\nMensualidades económicas de $${cuota}\nAl 4to mes cancela el 35% de entrada.`;
  const estr  = `🟡 Modalidad Estrella (valor ${vl})\n\n✅ Activación de servicio (beneficios)= $${tp} su primera mensualidad ya está incluida.📑\n\nMensualidades económicas de $${cuota}\n\n🚘 Prepárese para recibir su vehículo desde el séptimo mes`;
  if (modalidad === 'mega_estrella')  return mega;
  if (modalidad === 'super_estrella') return super_;
  if (modalidad === 'estrella')       return estr;
  return `${mega}\n\n${super_}\n\n${estr}`;
}

const MSGS_RAPIDOS = [
  { id:'cotizacion', Icon:TrendingUp,  label:'Cotización',     desc:'Genera cotización editable',        special:true  },
  { id:'modalidades',Icon:Star,        label:'Modalidades',    desc:'Las 3 formas de pago',
    texto:`Así funciona cada modalidad:\n⭐ Mega Estrella:  Entrada del 70% para acceder a beneficios preferenciales.\n⭐ Súper Estrella: Empieza hoy y pague una entrada mínima del 35% en el 4to mes.\n⭐ Estrella: Accede a tu vehículo con pagos flexibles.\n\n¿Indíqueme con qué modalidad de pago adquiere su vehículo?` },
  { id:'beneficios', Icon:Gift,        label:'Beneficios',     desc:'Ventajas de adquirir con Busimott',
    texto:`🎁 *Beneficios de adquirir su vehículo con Busimott:*\n\n✅ Vehículo 0 km totalmente a su nombre\n✅ Sin garante y sin necesidad de historial crediticio\n✅ Mensualidades fijas y económicas\n✅ Acompañamiento personalizado durante todo el proceso\n✅ Entrega ágil según la modalidad que elija\n\n¿Le gustaría que le indique con cuál modalidad puede empezar hoy mismo? 🚗` },
  { id:'requisitos', Icon:FileText,    label:'Requisitos',     desc:'Documentos que necesita el cliente',
    texto:`📋 *Requisitos para iniciar:*\n❇️ Cédula de identidad y papeleta de votación\n❇️ Correo electrónico vigente\n❇️ Valor de activación según el plan elegido` },
  { id:'cuenta',     Icon:CreditCard,  label:'Cuenta de pago', desc:'Datos para transferencia bancaria',
    texto:`💳 *Cuenta para registrar su pago:*\n\n👤 Titular: Business Motors Busimott. Cía. Ltda.\n🏦 Banco: Banco del Pichincha\n📋 Tipo: Cuenta Corriente\n🔢 N° de cuenta: 2100247020\n🆔 RUC: 1793140491001\n\n⚠️ Una vez realizado el pago, envíenos el comprobante por este chat.\nAl confirmar el pago procedemos con el envío de su contrato. 🚗` },
  { id:'direccion',  Icon:MapPin,      label:'Dirección',      desc:'Ubicación de las oficinas',
    texto:`📍 *Oficinas Busimott Cía. Ltda.*\n\n🏢 Av. Eloy Alfaro E7-103 y De Los Eucaliptos, Quito\n📞 023 50 0328\n✉️ bussimott.info@gmail.com\n\n¿Qué día y hora le viene mejor para visitarnos? 🤝` },
  { id:'catalogo',   Icon:Image,       label:'Catálogo',       desc:'Link de modelos disponibles',
    texto:`Con gusto 📸 Aquí puede ver todos nuestros modelos disponibles:\n\nhttps://ibb.co/album/PMkJhp\n\nUna vez elija el modelo que le guste, indíqueme el valor del vehículo o el abono mensual que le acomoda y le genero la cotización de inmediato. ¿Cuál le llama la atención?` },
  { id:'valor',      Icon:DollarSign,  label:'Consultar valor', desc:'Preguntar el valor del vehículo',
    texto:`🚗 Para generarle una cotización exacta, cuénteme:\n\n💰 ¿Qué valor de vehículo tiene en mente?\n(Nuestros planes van desde $6.000 hasta $20.000)\n\nO si prefiere, indíqueme la cuota mensual que se ajusta a su presupuesto y yo le calculo el valor ideal para usted. 😊` },
  { id:'servicio',   Icon:Phone,       label:'Servicio al cliente', desc:'Número de servicio al cliente',
    texto:`📞 Para mayor información sobre tu requerimiento, comunícate al siguiente número de servicio al cliente:\n\n0999097014` },
];

function TabBotConversaciones({ leads, initial }) {
  const p = DS.primary;
  const [selectedLead, setSelectedLead] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [msgText, setMsgText]       = useState('');
  const [quickOpen, setQuickOpen]   = useState(false);
  const [cotOpen, setCotOpen]       = useState(false);
  const [cotValor, setCotValor]     = useState(9000);
  const [cotModal, setCotModal]     = useState('todas');
  const [cotPlazo, setCotPlazo]     = useState(72);
  const inputRef = useRef(null);
  const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#f8fafc' };

  async function loadConversations(leadId) {
    setLoading(true);
    try {
      const data = await apiFetch('GET', `/api/webhook/conversations/${leadId}`);
      setConversations(Array.isArray(data) ? data : []);
    } catch(e) {
      setConversations([]);
    }
    setLoading(false);
  }

  function selectLead(lead) {
    setSelectedLead(lead);
    setMsgText('');
    setQuickOpen(false);
    setCotOpen(false);
    loadConversations(lead.id);
  }

  // Al llegar desde "Ver conversación" de un cliente, abrir su conversación
  useEffect(() => {
    if (initial && initial.id) selectLead(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  function handleMsgChange(e) {
    const val = e.target.value;
    setMsgText(val);
    if (val === '*') { setQuickOpen(true); setCotOpen(false); }
    else if (!val.startsWith('*')) { setQuickOpen(false); setCotOpen(false); }
  }

  function insertarMensaje(texto) {
    setMsgText(texto);
    setQuickOpen(false);
    setCotOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function seleccionarOpcion(item) {
    if (item.special) { setCotOpen(true); return; }
    insertarMensaje(item.texto);
  }

  async function enviarMensaje() {
    const txt = msgText.trim();
    if (!txt || !selectedLead) return;
    try {
      let sendPhone = (selectedLead.telefono||'').replace(/\D/g,'');
      if (sendPhone.startsWith('0') && sendPhone.length===10) sendPhone='593'+sendPhone.substring(1);
      else if (sendPhone.length===9) sendPhone='593'+sendPhone;
      await apiFetch('POST', '/api/messages/send', {
        leadId:    selectedLead.id,
        phone:     sendPhone,
        message:   txt,
        companyId: selectedLead.company_id,
      });
      setMsgText('');
      setQuickOpen(false);
      setCotOpen(false);
      loadConversations(selectedLead.id);
    } catch(e) { alert('Error al enviar: ' + e.message); }
  }

  const filteredLeads = leads.filter(l =>
    l.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    l.telefono?.includes(search)
  );

  const NIVEL = {
    caliente: { c: '#10b981', bg: '#f0fdf9', label: 'Caliente' },
    tibio:    { c: '#f59e0b', bg: '#fefce8', label: 'Tibio'    },
    frio:     { c: '#ef4444', bg: '#fef2f2', label: 'Frío'     },
  };

  return (
    <div style={{ display: MOB ? 'block' : 'grid', gridTemplateColumns: '320px 1fr', gap: 16, height: MOB ? 'auto' : '75vh', background: 'transparent' }}>

      {/* LISTA DE LEADS — en móvil se oculta cuando hay lead seleccionado */}
      {(!MOB || !selectedLead) && (
      <div style={{ background: CB, borderRadius: 14, border: `1px solid ${DS.primary}18`, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: MOB ? '70vh' : 'auto' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #eaecf0' }}>
          <div style={{ fontSize: 11, color: p, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Leads del Bot</div>
          <input style={inp} placeholder="Buscar por nombre o teléfono..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredLeads.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No hay leads del bot aún</div>
          )}
          {filteredLeads.map(lead => {
            const nv = NIVEL[lead.nivel] || NIVEL.frio;
            const isSelected = selectedLead?.id === lead.id;
            return (
              <div key={lead.id} onClick={() => selectLead(lead)}
                style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isSelected ? `${p}08` : 'transparent', borderLeft: isSelected ? `3px solid ${p}` : '3px solid transparent', transition: 'all .15s' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{lead.nombre}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: nv.c, background: nv.bg, padding: '2px 8px', borderRadius: 999 }}>{nv.label}</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{lead.telefono}</div>
                {lead.msgBot && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    "{lead.msgBot}"
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 999, height: 4 }}>
                    <div style={{ width: `${lead.score || 0}%`, height: '100%', background: nv.c, borderRadius: 999 }} />
                  </div>
                  <span style={{ fontSize: 10, color: '#94a3b8', minWidth: 32 }}>Score: {lead.score || 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* CONVERSACIÓN — en móvil solo se muestra cuando hay lead seleccionado */}
      {(!MOB || selectedLead) && (
      <div style={{ background: CB, borderRadius: 14, border: `1px solid ${DS.primary}18`, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: MOB ? '70vh' : 'auto', marginTop: MOB ? 0 : 0 }}>
        {!selectedLead ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <MessageCircle size={40} color="#e2e8f0" />
            <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600 }}>Selecciona un lead para ver la conversación</div>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>Aquí verás todo lo que Claudia habló con el cliente</div>
          </div>
        ) : (
          <>
            {/* Header del chat */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #eaecf0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {MOB && (
                  <button onClick={() => setSelectedLead(null)} style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 8, border: `1px solid ${DS.primary}20`, background: `${DS.primary}08`, color: DS.primary, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ← Volver
                  </button>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLead.nombre}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{selectedLead.telefono} · Score: {selectedLead.score}/100</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => askWhatsApp(selectedLead.telefono, `Hola ${selectedLead.nombre||''}, soy tu asesor de BUSIMOTT`, selectedLead.id)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#f0fdf9', color: '#059669', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <MessageCircle size={13} /> Continuar en WhatsApp
                </button>
              </div>
            </div>

            {/* Mensajes */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc' }}>
              {loading && (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 20 }}>Cargando conversación...</div>
              )}
              {!loading && conversations.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 20 }}>
                  <MessageCircle size={28} color="#e2e8f0" style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                  Sin conversaciones registradas aún
                </div>
              )}
              {conversations.map((msg, i) => {
                const isBot    = msg.direction === 'outbound';
                const isClient = msg.direction === 'inbound';
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end' }}>
                    <div style={{ maxWidth: '72%' }}>
                      {isBot && (
                        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3, marginLeft: 4 }}>Claudia (Bot)</div>
                      )}
                      {isClient && (
                        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3, textAlign: 'right', marginRight: 4 }}>{selectedLead.nombre}</div>
                      )}
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: isBot ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                        background: isBot ? '#fff' : p,
                        color: isBot ? '#1e293b' : '#fff',
                        fontSize: 13,
                        lineHeight: 1.5,
                        border: isBot ? '1px solid #e2e8f0' : 'none',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}>
                        {msg.message_text&&msg.message_text.startsWith('[IMG:')?(()=>{const u=msg.message_text.match(/\[IMG:(.*?)\]/);return u?(<><img src={(process.env.REACT_APP_API_URL||'')+u[1]} alt="Imagen" style={{maxWidth:'100%',borderRadius:8,marginBottom:4,cursor:'pointer'}} onClick={()=>window.open((process.env.REACT_APP_API_URL||'')+u[1],'_blank')}/><div style={{fontSize:11}}>{msg.message_text.replace(/\[IMG:.*?\]\s*/,'')}</div></>):msg.message_text;})():msg.message_text}
                      </div>
                      <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 3, textAlign: isBot ? 'left' : 'right', marginLeft: isBot ? 4 : 0, marginRight: isClient ? 4 : 0 }}>
                        {msg.created_at ? new Date(msg.created_at).toLocaleString('es-EC', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : ''}
                        {msg.intent && isBot && <span style={{ marginLeft: 6, color: '#a78bfa' }}>· {msg.intent}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer — mensajes rápidos + textarea */}
            <div style={{ padding: '10px 16px 12px', borderTop: '1px solid #eaecf0', background: '#fff', position: 'relative' }}>

              {/* ── Panel mensajes rápidos ──────────────────────────────── */}
              {quickOpen && (
                <div style={{ position:'absolute', bottom:'100%', left:16, right:16, marginBottom:6, background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.13)', zIndex:100, overflow:'hidden' }}>
                  {/* Header */}
                  <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <Zap size={14} color={p} />
                      <span style={{ fontSize:12, fontWeight:700, color:'#1e293b' }}>Mensajes Rápidos</span>
                    </div>
                    <button onClick={()=>{setQuickOpen(false);setCotOpen(false);setMsgText('');}} style={{ background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:2 }}><X size={15}/></button>
                  </div>

                  {/* Opciones en grid */}
                  {!cotOpen && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0 }}>
                      {MSGS_RAPIDOS.map((item,i) => (
                        <button key={item.id} onClick={()=>seleccionarOpcion(item)}
                          style={{ padding:'12px 10px', background:'transparent', border:'none', borderRight: i%3!==2?'1px solid #f1f5f9':'none', borderBottom:'1px solid #f1f5f9', cursor:'pointer', textAlign:'left', transition:'background .12s' }}
                          onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <div style={{ marginBottom:6, display:'flex', alignItems:'center', justifyContent:'flex-start' }}>
                            <div style={{ width:32, height:32, borderRadius:8, background:`${p}14`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <item.Icon size={16} color={p} />
                            </div>
                          </div>
                          <div style={{ fontSize:12, fontWeight:700, color:'#1e293b', marginBottom:2 }}>{item.label}</div>
                          <div style={{ fontSize:10, color:'#94a3b8', lineHeight:1.3 }}>{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sub-panel cotizador */}
                  {cotOpen && (
                    <div style={{ padding:'14px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                        <button onClick={()=>setCotOpen(false)} style={{ background:'none',border:'none',cursor:'pointer',color:'#64748b',padding:0,display:'flex',alignItems:'center' }}><ChevronLeft size={16}/></button>
                        <span style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>📊 Generador de Cotización</span>
                      </div>

                      {/* Controles */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
                        <div>
                          <label style={{ fontSize:10, fontWeight:700, color:'#64748b', display:'block', marginBottom:4 }}>VALOR DEL VEHÍCULO</label>
                          <select value={cotValor} onChange={e=>setCotValor(Number(e.target.value))}
                            style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', background:'#fff' }}>
                            {Object.keys(TABLA_COT).map(v=>(
                              <option key={v} value={v}>${Number(v).toLocaleString()}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize:10, fontWeight:700, color:'#64748b', display:'block', marginBottom:4 }}>MODALIDAD</label>
                          <select value={cotModal} onChange={e=>setCotModal(e.target.value)}
                            style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', background:'#fff' }}>
                            <option value="todas">Todas las modalidades</option>
                            <option value="mega_estrella">Mega Estrella ⭐⭐⭐</option>
                            <option value="super_estrella">Súper Estrella ⭐⭐</option>
                            <option value="estrella">Estrella ⭐</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize:10, fontWeight:700, color:'#64748b', display:'block', marginBottom:4 }}>PLAZO (MESES)</label>
                          <select value={cotPlazo} onChange={e=>setCotPlazo(Number(e.target.value))}
                            style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', background:'#fff' }}>
                            {[36,42,48,54,60,66,72].map(pl=>(
                              <option key={pl} value={pl}>{pl} meses{pl===72?' (+ económico)':''}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Preview */}
                      <div style={{ background:'#f8fafc', borderRadius:10, padding:'10px 12px', marginBottom:10, maxHeight:130, overflowY:'auto', border:'1px solid #e2e8f0' }}>
                        <pre style={{ margin:0, fontSize:11, color:'#1e293b', whiteSpace:'pre-wrap', fontFamily:'inherit', lineHeight:1.5 }}>
                          {generarCotFrontend(cotValor, cotModal, cotPlazo)}
                        </pre>
                      </div>

                      {/* Botón insertar */}
                      <button onClick={()=>insertarMensaje(generarCotFrontend(cotValor, cotModal, cotPlazo))}
                        style={{ width:'100%', padding:'9px', borderRadius:9, border:'none', background:p, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                        Insertar en el chat
                      </button>
                    </div>
                  )}

                  {/* Hint */}
                  {!cotOpen && (
                    <div style={{ padding:'6px 14px', fontSize:10, color:'#cbd5e1', textAlign:'center', borderTop:'1px solid #f1f5f9' }}>
                      Selecciona una opción · ESC para cerrar
                    </div>
                  )}
                </div>
              )}

              {/* ── Input + botones ─────────────────────────────────────── */}
              {(()=>{
                const lastIn = [...conversations].filter(m=>m.direction==='inbound').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
                const horas  = lastIn ? (Date.now()-new Date(lastIn.created_at).getTime())/(1000*60*60) : 999;
                const cerrada = horas > 24;
                if (cerrada) return (
                  <div style={{ background:'#fef3c7', border:'1px solid #fde68a', borderRadius:10, padding:'14px 16px', display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <Clock size={18} color='#d97706'/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#92400e' }}>Ventana de 24 horas cerrada</div>
                      <div style={{ fontSize:11, color:'#b45309', marginTop:2 }}>Espera a que el cliente te escriba de nuevo para poder responder.</div>
                    </div>
                    <button onClick={()=>askWhatsApp(selectedLead.telefono)}
                      style={{ marginLeft:'auto', padding:'7px 12px', borderRadius:8, border:'none', background:'#25d366', color:'#fff', fontWeight:700, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:4, whiteSpace:'nowrap', flexShrink:0 }}>
                      <MessageCircle size={11}/> Abrir WA
                    </button>
                  </div>
                );
                return (<>
                  <div style={{ display:'flex', gap:8, alignItems:'flex-end', marginBottom:6 }}>
                    <div style={{ flex:1, position:'relative' }}>
                      <textarea
                        ref={inputRef}
                        value={msgText}
                        onChange={handleMsgChange}
                        rows={2}
                        placeholder="Escribe un mensaje… o escribe * para mensajes rápidos"
                        style={{ width:'100%', padding:'10px 14px', borderRadius:10, border: quickOpen?`1.5px solid ${p}`:'1px solid #e2e8f0', fontSize:13, resize:'none', outline:'none', fontFamily:'inherit', lineHeight:1.5, boxSizing:'border-box', transition:'border-color .15s' }}
                        onKeyDown={e => {
                          if (e.key==='Escape') { setQuickOpen(false); setCotOpen(false); setMsgText(''); }
                          if (e.key==='Enter'&&!e.shiftKey&&!quickOpen) { e.preventDefault(); enviarMensaje(); }
                        }}
                      />
                      {!quickOpen && (
                        <button onClick={()=>{setMsgText('*');setQuickOpen(true);setCotOpen(false);setTimeout(()=>inputRef.current?.focus(),50);}}
                          title="Mensajes rápidos (*)"
                          style={{ position:'absolute', right:8, bottom:8, background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 6px', cursor:'pointer', display:'flex', alignItems:'center' }}>
                          <Zap size={13} color='#94a3b8' />
                        </button>
                      )}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <button onClick={enviarMensaje}
                        style={{ padding:'10px 16px', borderRadius:9, border:'none', background:'#25d366', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
                        <Send size={13}/> Enviar
                      </button>
                      <button onClick={()=>askWhatsApp(selectedLead.telefono, `Hola ${selectedLead.nombre||''}, soy tu asesor de BUSIMOTT`, selectedLead.id)}
                        style={{ padding:'8px 16px', borderRadius:9, border:'none', background:'#f0fdf9', color:'#059669', fontWeight:700, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
                        <MessageCircle size={11}/> Abrir WA
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:'#94a3b8', textAlign:'center' }}>
                    Escribe <strong>*</strong> para mensajes rápidos · Enter envía · Shift+Enter nueva línea · Score: {selectedLead.score}/100
                  </div>
                </>);
              })()}
            </div>
          </>
        )}
      </div>
      )}
    </div>
  );

}

function TabLeads({leads,setLeads}){
  const p = DS.primary;
  const dragRef=useRef(null);
  const [modal,setModal]=useState(null);
  const [detail,setDetail]=useState(null);
  const [dragOver,setDragOver]=useState(null);

  function onDragStart(e,id){
    dragRef.current=id;
    e.dataTransfer.effectAllowed='move';
    e.currentTarget.style.opacity='0.5';
    e.currentTarget.style.transform='scale(0.97)';
  }
  function onDragEnd(e){ e.currentTarget.style.opacity='1'; e.currentTarget.style.transform=''; }
  function onDragOver(e,nivel){ e.preventDefault(); setDragOver(nivel); }
  function onDragLeave(){ setDragOver(null); }
  function onDrop(e,nivel){
    e.preventDefault(); setDragOver(null);
    const id=dragRef.current; if(!id)return;
    dragRef.current=null;
    setLeads(prev=>prev.map(l=>l.id===id?{...l,nivel}:l));
    apiFetch('PUT',`/api/asesor/leads/${id}`,{nivel}).catch(console.error);
  }
  async function saveLead(f){
    if(modal==='new'){
      try{
        const c=await apiFetch('POST','/api/asesor/leads',f);
        setLeads(prev=>[{...c, nivel:c.nivel||f.nivel||'tibio', score:c.score||f.score||50, msgBot:c.msg_bot||f.msgBot||'', telefono:c.telefono||f.telefono||'', cedula:c.cedula||f.cedula||'', origen:c.origen||'Manual', fecha:c.created_at||new Date().toISOString()},...prev]);
      }catch(e){alert('Error al crear lead: '+e.message);return;}
    } else {
      try{
        const updated=await apiFetch('PUT',`/api/asesor/leads/${modal.id}`,f);
        setLeads(prev=>prev.map(l=>l.id===modal.id?{...l,...updated}:l));
      }catch(e){alert('Error al guardar: '+e.message);return;}
    }
    setModal(null);
  }
  function del(id){ askConfirm('Este lead será eliminado permanentemente.',async()=>{ try{ await apiFetch('DELETE',`/api/asesor/leads/${id}`); setLeads(prev=>prev.filter(l=>l.id!==id)); }catch(e){alert('Error al eliminar: '+e.message);} }); }

  const COLS={
    caliente:{label:'¡A cerrar!',       sub:'Están listos — ¡actúa AHORA!',        color:'#10b981',light:'#f0fdf9',border:'#a7f3d0',acc:'#059669',Icon:CheckCircle,
              tip:'🟢 Este lead está caliente. No esperes — una llamada hoy puede cerrar la venta.',
              action:'Llamar ahora'},
    tibio:   {label:'En seguimiento',   sub:'Sigue el contacto — tienen potencial', color:'#f59e0b',light:'#fefce8',border:'#fde68a',acc:'#d97706',Icon:Clock,
              tip:'🟡 Con persistencia se convierten. Agenda una llamada de seguimiento hoy.',
              action:'Agendar llamada'},
    frio:    {label:'¡Rescátalos!',     sub:'No los abandones — ¡una llamada puede cambiar todo!', color:'#ef4444',light:'#fff1f2',border:'#fecaca',acc:'#dc2626',Icon:Zap,
              tip:'🔴 ¡No los des por perdidos! El 30% de los leads "fríos" cierran con el seguimiento correcto.',
              action:'Rescatar ahora'},
  };
  const total=leads.length||1;

  return(
    <>
      {modal&&<LeadModal lead={modal==='new'?null:modal} onSave={saveLead} onClose={()=>setModal(null)}/>}

      {detail&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9000}}
          onClick={e=>{if(e.target===e.currentTarget)setDetail(null);}}>
          <div style={{background:'#fff',borderRadius:20,padding:28,width:480,maxHeight:'88vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.2)',border:'1px solid #eaecf0'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
              <div>
                <h2 style={{margin:'0 0 6px',fontSize:20,fontWeight:800,color:'#1e293b'}}>{detail.nombre}</h2>
                <span style={{padding:'3px 12px',borderRadius:999,fontSize:12,fontWeight:700,color:COLS[detail.nivel]?.acc,background:COLS[detail.nivel]?.light,border:`1px solid ${COLS[detail.nivel]?.border}`}}>{COLS[detail.nivel]?.label}</span>
              </div>
              <button onClick={()=>setDetail(null)} style={{border:'none',background:'#f1f5f9',borderRadius:10,padding:8,cursor:'pointer',display:'flex'}}
                onMouseEnter={e=>e.currentTarget.style.background='#e2e8f0'} onMouseLeave={e=>e.currentTarget.style.background='#f1f5f9'}>
                <X size={14} color="#64748b"/>
              </button>
            </div>
            <div style={{background:'#f8fafc',borderRadius:12,padding:'14px 16px',marginBottom:14,border:'1px solid #eaecf0'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:12,fontWeight:700,color:'#64748b'}}>Score de interés</span>
                <span style={{fontSize:15,fontWeight:800,color:detail.score>=70?'#10b981':detail.score>=40?'#f59e0b':'#ef4444'}}>{detail.score}/100</span>
              </div>
              <div style={{background:'#e2e8f0',borderRadius:999,height:8,overflow:'hidden'}}>
                <div style={{width:`${detail.score}%`,height:'100%',background:detail.score>=70?'#10b981':detail.score>=40?'#f59e0b':'#ef4444',borderRadius:999,transition:'width .6s ease'}}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {[{l:'TELÉFONO',v:detail.telefono},{l:'CÉDULA',v:detail.cedula||'—'},{l:'EMAIL',v:detail.email||'—'},{l:'ORIGEN',v:detail.origen},{l:'RECIBIDO',v:ago(detail.fecha)}].map((fi,i)=>(
                <div key={i} style={{background:'#f8fafc',borderRadius:10,padding:'10px 14px',border:'1px solid #eaecf0'}}>
                  <div style={{fontSize:9,color:'#94a3b8',fontWeight:700,marginBottom:3}}>{fi.l}</div>
                  <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{fi.v}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#f0fdf9',borderRadius:12,padding:'12px 14px',border:'1px solid #a7f3d0',marginBottom:14}}>
              <div style={{fontSize:9,color:'#059669',fontWeight:700,marginBottom:5,display:'flex',alignItems:'center',gap:4}}><MessageCircle size={9}/> MENSAJE DEL BOT</div>
              <div style={{fontSize:12,color:'#065f46',fontStyle:'italic',lineHeight:1.6}}>"{detail.msgBot}"</div>
            </div>
            {detail.notas&&<div style={{background:'#fefce8',borderRadius:12,padding:'10px 14px',marginBottom:14,border:'1px solid #fde68a',fontSize:12,color:'#92400e'}}><b>Notas:</b> {detail.notas}</div>}
            <div style={{display:'flex',gap:8,flexDirection:'column'}}>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{setDetail(null);setModal(detail);}} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:`${p}10`,color:p,fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><Edit2 size={13}/> Editar</button>
                <button onClick={()=>askWhatsApp(detail.telefono, `Hola ${detail.nombre}`)} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#f0fdf9',color:'#059669',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><MessageCircle size={13}/> Abrir WA</button>
                <button onClick={()=>{setDetail(null);del(detail.id);}} style={{padding:'10px 14px',borderRadius:10,border:'none',background:'#fef2f2',color:'#ef4444',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><Trash2 size={13}/></button>
              </div>
              {/* Enviar mensaje desde CRM */}
              <div style={{borderTop:'1px solid #f1f5f9',paddingTop:10}}>
                <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,marginBottom:6}}>ENVIAR MENSAJE DESDE EL CRM</div>
                <div style={{display:'flex',gap:8}}>
                  <textarea id={`msg-input-${detail.id}`} rows={2} placeholder="Escribe tu mensaje..."
                    style={{flex:1,padding:'9px 12px',borderRadius:9,border:'1px solid #e2e8f0',fontSize:12,resize:'none',outline:'none',fontFamily:'inherit'}}
                    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById(`btn-send-${detail.id}`)?.click();}}}
                  />
                  <button id={`btn-send-${detail.id}`}
                    onClick={async()=>{
                      const inp=document.getElementById(`msg-input-${detail.id}`);
                      const txt=inp?.value?.trim();
                      if(!txt)return;
                      try{
                        // Formatear telefono Ecuador
                        let phone=(detail.telefono||'').replace(/\D/g,'');
                        if(phone.startsWith('0')&&phone.length===10) phone='593'+phone.substring(1);
                        else if(phone.length===9) phone='593'+phone;
                        await apiFetch('POST','/api/messages/send',{
                          leadId:detail.id,
                          phone,
                          message:txt,
                          companyId:detail.company_id,
                        });
                        inp.value='';
                        alert('✅ Mensaje enviado a '+detail.nombre);
                      }catch(e){alert('❌ Error: '+e.message);}
                    }}
                    style={{padding:'9px 16px',borderRadius:9,border:'none',background:'#25d366',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}>
                    <MessageCircle size={13}/> Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <div style={{fontSize:11,color:p,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:3}}>Bot Leads</div>
          <h2 style={{margin:0,fontSize:22,fontWeight:800,color:'#1e293b'}}>Leads del WhatsApp Bot</h2>
          <p style={{margin:'4px 0 0',fontSize:12,color:'#94a3b8'}}>Arrastra las tarjetas para moverlas entre columnas</p>
        </div>
        <button onClick={()=>setModal('new')} style={{padding:'10px 20px',borderRadius:11,border:'none',background:`linear-gradient(135deg,${p},${p}cc)`,color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:7,boxShadow:`0 4px 14px ${p}35`,transition:'all .2s'}}
          onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow=`0 8px 20px ${p}45`;}}
          onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 4px 14px ${p}35`;}}><Plus size={14}/> Nuevo lead</button>
      </div>

      {/* KPI CARDS */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[
          {l:'Total leads', c:p,        v:leads.length,                                Icon:Users},
          {l:'¡A cerrar!',c:'#10b981',v:leads.filter(l=>l.nivel==='caliente').length,Icon:CheckCircle},
          {l:'En seguimiento',c:'#f59e0b',v:leads.filter(l=>l.nivel==='tibio').length,Icon:Clock},
          {l:'¡Rescatar!',  c:'#ef4444',v:leads.filter(l=>l.nivel==='frio').length,    Icon:Zap},
        ].map((s,i)=>(
          <div key={i} style={{background:'#fff',borderRadius:14,padding:'18px 20px',border:'1px solid #eaecf0',borderTop:`3px solid ${s.c}`,boxShadow:'0 1px 3px rgba(0,0,0,0.05)',display:'flex',gap:12,alignItems:'center',transition:'all .2s',cursor:'default'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 24px ${s.c}18`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)';}}>
            <div style={{width:42,height:42,borderRadius:12,background:`${s.c}12`,border:`1px solid ${s.c}20`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <s.Icon size={18} color={s.c} strokeWidth={2}/>
            </div>
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
              style={{background:isTarget?col.light:'#f8fafc',borderRadius:16,border:`2px ${isTarget?'dashed':'solid'} ${isTarget?col.acc:col.border}`,minHeight:400,display:'flex',flexDirection:'column',transition:'all .2s',boxShadow:isTarget?`0 0 0 3px ${col.acc}20`:'none'}}>
              {/* Semáforo header */}
              <div style={{padding:'12px 14px',borderBottom:`1px solid ${col.border}`,background:col.light}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    {/* Semáforo dot */}
                    <div style={{width:10,height:10,borderRadius:'50%',background:col.acc,boxShadow:`0 0 8px ${col.acc}90`,flexShrink:0}}/>
                    <div style={{fontSize:14,fontWeight:800,color:col.acc,display:'flex',alignItems:'center',gap:5}}>
                      {col.Icon&&<col.Icon size={14} color={col.acc}/>}{col.label}
                    </div>
                  </div>
                  <div style={{width:26,height:26,borderRadius:'50%',background:col.acc,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',boxShadow:`0 2px 8px ${col.acc}40`}}>{colLeads.length}</div>
                </div>
                {/* Motivational tip */}
                <div style={{fontSize:10,color:col.acc,fontWeight:600,lineHeight:1.4,opacity:.85}}>{col.sub}</div>
              </div>
              <div style={{flex:1,padding:'10px',display:'flex',flexDirection:'column',gap:10}}>
                {colLeads.length===0&&<div style={{textAlign:'center',padding:'28px 0',color:col.acc,opacity:.35,fontSize:12,fontWeight:600}}>Arrastra leads aquí</div>}
                {colLeads.map(lead=>(
                  <div key={lead.id} draggable onDragStart={e=>onDragStart(e,lead.id)} onDragEnd={onDragEnd}
                    style={{background:'#fff',borderRadius:12,padding:'13px 14px',border:`1px solid ${col.border}`,cursor:'grab',transition:'all .2s',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}
                    onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 6px 20px ${col.acc}20`;e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.borderColor=col.acc;}}
                    onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)';e.currentTarget.style.transform='';e.currentTarget.style.borderColor=col.border;}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:800,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lead.nombre}</div>
                        <div style={{fontSize:10,color:'#94a3b8',marginTop:2,display:'flex',alignItems:'center',gap:3}}><Phone size={8}/>{lead.telefono}</div>
                      </div>
                      <div style={{display:'flex',gap:4,marginLeft:8,flexShrink:0}}>
                        <button onClick={e=>{e.stopPropagation();setModal(lead);}} style={{border:'none',background:col.light,borderRadius:7,padding:'4px 6px',cursor:'pointer',display:'flex',transition:'all .15s'}}
                          onMouseEnter={e=>e.currentTarget.style.background=col.acc} onMouseLeave={e=>e.currentTarget.style.background=col.light}><Edit2 size={10} color={col.acc}/></button>
                        <button onClick={e=>{e.stopPropagation();del(lead.id);}} style={{border:'none',background:'#fef2f2',borderRadius:7,padding:'4px 6px',cursor:'pointer',display:'flex',transition:'all .15s'}}
                          onMouseEnter={e=>e.currentTarget.style.background='#ef4444'} onMouseLeave={e=>e.currentTarget.style.background='#fef2f2'}><Trash2 size={10} color="#ef4444"/></button>
                      </div>
                    </div>
                    <div style={{fontSize:10,color:'#64748b',lineHeight:1.5,marginBottom:10,fontStyle:'italic',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',background:'#f8fafc',borderRadius:8,padding:'7px 9px'}}>"{lead.msgBot}"</div>
                    <div style={{marginBottom:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:9,color:'#94a3b8',fontWeight:700}}>SCORE</span>
                        <span style={{fontSize:10,fontWeight:800,color:lead.score>=70?'#10b981':lead.score>=40?'#f59e0b':'#ef4444'}}>{lead.score}%</span>
                      </div>
                      <div style={{background:'#f1f5f9',borderRadius:999,height:5,overflow:'hidden'}}>
                        <div style={{width:`${lead.score}%`,height:'100%',background:lead.score>=70?'#10b981':lead.score>=40?'#f59e0b':'#ef4444',borderRadius:999,transition:'width .5s ease'}}/>
                      </div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:9,color:'#94a3b8',background:'#f1f5f9',borderRadius:999,padding:'2px 8px'}}>{ago(lead.fecha)}</span>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={e=>{e.stopPropagation();setDetail(lead);}} style={{border:'none',background:col.light,borderRadius:7,padding:'4px 10px',cursor:'pointer',fontSize:10,fontWeight:700,color:col.acc,display:'flex',alignItems:'center',gap:3,transition:'all .15s'}}
                          onMouseEnter={e=>{e.currentTarget.style.background=col.acc;e.currentTarget.style.color='#fff';}} onMouseLeave={e=>{e.currentTarget.style.background=col.light;e.currentTarget.style.color=col.acc;}}><Eye size={9}/> Ver</button>
                        <button onClick={e=>{e.stopPropagation();askWhatsApp(lead.telefono, `Hola ${lead.nombre}`, lead.id);}} style={{border:'none',background:'#f0fdf9',borderRadius:7,padding:'4px 8px',cursor:'pointer',display:'flex',transition:'all .15s'}}
                          onMouseEnter={e=>e.currentTarget.style.background='#059669'} onMouseLeave={e=>e.currentTarget.style.background='#f0fdf9'}><MessageCircle size={10} color="#059669"/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{padding:'8px 10px',borderTop:`1px dashed ${col.border}`}}>
                <button onClick={()=>setModal('new')} style={{width:'100%',padding:'7px',borderRadius:9,border:`1px dashed ${col.acc}40`,background:'transparent',color:col.acc,fontSize:11,fontWeight:700,cursor:'pointer',transition:'all .15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.background=col.light;e.currentTarget.style.borderColor=col.acc;}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor=`${col.acc}40`;}}>+ Agregar lead</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}


/* ════════════════════════════════════════════
   TAB DASHBOARD
════════════════════════════════════════════ */
function AnimNum({target,color}){
  const [n,setN]=useState(0);
  useEffect(()=>{
    let start=0; const step=()=>{ start+=Math.ceil(target/20); if(start>=target){setN(target);return;}; setN(start); requestAnimationFrame(step); };
    const t=setTimeout(()=>requestAnimationFrame(step),100);
    return()=>clearTimeout(t);
  },[target]);
  return <span style={{color}}>{n}</span>;
}

function GlassCard({children,style={},onClick,hover=true}){
  const [hov,setHov]=useState(false);
  const p=DS.primary;
  return(
    <div onClick={onClick}
      onMouseEnter={()=>hover&&setHov(true)}
      onMouseLeave={()=>hover&&setHov(false)}
      style={{
        background:`linear-gradient(135deg,rgba(255,255,255,0.07) 0%,rgba(255,255,255,0.03) 100%)`,
        backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
        border:`1px solid rgba(255,255,255,${hov?'0.18':'0.10'})`,
        borderRadius:20,
        boxShadow:hov?`0 20px 60px rgba(0,0,0,0.35),0 0 0 1px ${p}25,inset 0 1px 0 rgba(255,255,255,0.12)`:`0 8px 32px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.08)`,
        transform:hov?'translateY(-3px)':'translateY(0)',
        transition:'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        cursor:onClick?'pointer':'default',
        overflow:'hidden',
        position:'relative',
        ...style,
      }}>
      {/* shimmer line */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${p}60,transparent)`,opacity:.6}}/>
      {children}
    </div>
  );
}


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
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
      </div>

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


function TabEstadisticasPersonales({stats, leads, clients, actions, events, onNavigate}) {
  const p = DS.primary;
  const nav = onNavigate || (()=>{});
  const [hov, setHov] = React.useState(null);

  if (!stats) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:48,height:48,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
          <Activity size={22} color={p}/>
        </div>
        <div style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>Cargando estadísticas...</div>
      </div>
    </div>
  );

  const ganados   = stats.clients?.ganados    || 0;
  const meta      = stats.meta_mes            || 10;
  const avance    = stats.avance_meta         || 0;
  const totalLeads = (stats.leads?.total||0) || 1;

  // Cards interactivas con navegacion
  const kpis = [
    { l:'Mis Clientes',      v:stats.clients?.total||0,        c:'#4f6ef7', sub:'asignados a ti',    nav:'clients',     Ic:Users,         bg:'#EEF2FF' },
    { l:'Ventas cerradas',   v:ganados,                         c:'#10b981', sub:'este mes',          nav:'clients',     Ic:CheckCircle,   bg:'#F0FDF4' },
    { l:'En negociación',    v:stats.clients?.en_proceso||0,   c:'#f59e0b', sub:'en proceso',         nav:'clients',     Ic:TrendingUp,    bg:'#FFFBEB' },
    { l:'Tasa conversión',   v:`${stats.tasa_conversion||0}%`, c:'#8b5cf6', sub:'de cierre',          nav:'clients',     Ic:Activity,      bg:'#F5F3FF' },
    { l:'Leads del bot',     v:stats.leads?.total||0,           c:'#ef4444', sub:'recibidos',          nav:'leads',       Ic:Bot,           bg:'#FFF1F2' },
    { l:'Leads calientes',   v:stats.leads?.calientes||0,      c:'#ef4444', sub:'alta prioridad',     nav:'leads',       Ic:Zap,           bg:'#FFF1F2' },
    { l:'Actividades mes',   v:stats.actions?.este_mes||0,     c:'#0ea5e9', sub:'realizadas',          nav:'actions',     Ic:Activity,      bg:'#EFF6FF' },
    { l:'Citas pendientes',  v:stats.events?.total||0,          c:'#f59e0b', sub:'próximas',           nav:'calendar',    Ic:Calendar,      bg:'#FFFBEB' },
  ];

  const nivelData = [
    { l:'Calientes', v:stats.leads?.calientes||0, c:'#ef4444', bg:'#fff5f5', nav:'leads' },
    { l:'Tibios',    v:stats.leads?.tibios||0,    c:'#f59e0b', bg:'#fffbeb', nav:'leads' },
    { l:'Fríos',     v:stats.leads?.frios||0,     c:'#4f6ef7', bg:'#f0f1ff', nav:'leads' },
  ];

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* Header */}
      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,color:p,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:4}}>Panel personal</div>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:'#1E293B',letterSpacing:'-0.5px'}}>Mi Rendimiento</h1>
        <p style={{margin:'4px 0 0',fontSize:13,color:'#94A3B8'}}>Haz clic en cada card para ver el detalle</p>
      </div>

      {/* KPI Cards interactivas */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:MOB?10:14,marginBottom:24}}>
        {kpis.map((k,i)=>(
          <div key={i}
            onClick={()=>nav(k.nav)}
            onMouseEnter={()=>setHov(i)}
            onMouseLeave={()=>setHov(null)}
            style={{
              background:CB||'#fff', borderRadius:MOB?12:16, padding:MOB?'14px':'20px',
              border:`1px solid ${k.c}20`,
              borderTop:`3px solid ${k.c}`,
              cursor:'pointer',
              transition:'all .2s',
              transform: hov===i ? 'translateY(-4px)' : 'none',
              boxShadow: hov===i ? `0 12px 28px ${k.c}25` : '0 1px 4px rgba(0,0,0,0.05)',
              position:'relative', overflow:'hidden',
            }}>
            {/* BG icon */}
            <div style={{position:'absolute',bottom:-8,right:-8,opacity:0.06}}>
              <k.Ic size={64} color={k.c}/>
            </div>
            {/* Icon */}
            <div style={{width:MOB?32:40,height:MOB?32:40,borderRadius:10,background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:MOB?10:14,border:`1px solid ${k.c}20`}}>
              <k.Ic size={MOB?15:18} color={k.c}/>
            </div>
            <div style={{fontSize:MOB?22:28,fontWeight:800,color:'#1e293b',lineHeight:1,marginBottom:4}}>{k.v}</div>
            <div style={{fontSize:MOB?11:12,fontWeight:700,color:'#475569'}}>{k.l}</div>
            <div style={{fontSize:10,color:k.c,marginTop:3,fontWeight:600}}>{k.sub} →</div>
          </div>
        ))}
      </div>

      {/* Row 2: Meta + Distribucion */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'1fr 1fr',gap:16,marginBottom:16}}>

        {/* Meta del mes — CON VENTAS REALES */}
        <div style={{background:'#fff',borderRadius:16,padding:'22px',border:'1px solid #eaecf0',cursor:'pointer'}}
          onClick={()=>nav('clients')}
          onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 8px 24px ${p}15`;e.currentTarget.style.transform='translateY(-2px)';}}
          onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='none';}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:'#1e293b',marginBottom:2}}>Meta del mes</div>
              <div style={{fontSize:12,color:'#94a3b8'}}>Ventas cerradas este mes</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:28,fontWeight:800,color:ganados>=meta?'#10b981':p,lineHeight:1}}>{ganados}</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>de {meta} meta</div>
            </div>
          </div>
          <div style={{background:'#f1f5f9',borderRadius:999,height:12,overflow:'hidden',marginBottom:8}}>
            <div style={{
              width:`${avance}%`,height:'100%',
              background: avance>=100 ? 'linear-gradient(90deg,#10b981,#34d399)'
                        : avance>=60  ? `linear-gradient(90deg,${p},${p}cc)`
                        : 'linear-gradient(90deg,#f59e0b,#fbbf24)',
              borderRadius:999, transition:'width .8s',
            }}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:11,color:'#94a3b8'}}>
              {avance>=100?'Meta cumplida':avance>=60?'Buen ritmo':'Sigue adelante'}
            </span>
            <span style={{fontSize:13,fontWeight:800,color:avance>=100?'#10b981':p}}>{avance}%</span>
          </div>
        </div>

        {/* Distribución de leads — interactiva */}
        <div style={{background:'#fff',borderRadius:16,padding:'22px',border:'1px solid #eaecf0'}}>
          <div style={{fontSize:13,fontWeight:800,color:'#1e293b',marginBottom:16}}>Distribución de leads</div>
          {nivelData.map((n,i)=>{
            const pct=Math.round((n.v/totalLeads)*100);
            return(
              <div key={i} style={{marginBottom:12,cursor:'pointer'}}
                onClick={()=>nav(n.nav)}
                onMouseEnter={e=>{e.currentTarget.style.opacity='0.8';}}
                onMouseLeave={e=>{e.currentTarget.style.opacity='1';}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:n.c}}/>
                    <span style={{fontSize:12,fontWeight:600,color:'#475569'}}>{n.l}</span>
                  </div>
                  <span style={{fontSize:12,fontWeight:800,color:n.c}}>{n.v} ({pct}%)</span>
                </div>
                <div style={{background:'#f1f5f9',borderRadius:999,height:7,overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:n.c,borderRadius:999,transition:'width .5s'}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Proximas citas — interactivas */}
      <div style={{background:'#fff',borderRadius:16,padding:'20px',border:'1px solid #eaecf0',marginBottom:16,cursor:'pointer'}}
        onClick={()=>nav('calendar')}
        onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 8px 24px ${p}10`;}}
        onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Calendar size={16} color={p}/>
            <span style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Próximas citas</span>
          </div>
          <span style={{fontSize:11,color:p,fontWeight:700}}>Ver calendario →</span>
        </div>
        {events.filter(e=>new Date(e.date||e.event_date)>=new Date()).slice(0,4).length===0?(
          <div style={{textAlign:'center',color:'#94a3b8',fontSize:12,padding:'12px 0'}}>Sin citas agendadas — clic para agendar</div>
        ):(
          events.filter(e=>new Date(e.date||e.event_date)>=new Date()).sort((a,b)=>new Date(a.date||a.event_date)-new Date(b.date||b.event_date)).slice(0,4).map((ev,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 0',borderBottom:i<3?'1px solid #f8fafc':'none'}}>
              <div style={{width:42,height:42,borderRadius:10,background:`${p}10`,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',minWidth:42}}>
                <div style={{fontSize:14,fontWeight:800,color:p,lineHeight:1}}>{new Date(ev.date||ev.event_date).getDate()}</div>
                <div style={{fontSize:9,color:p,fontWeight:600}}>{['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][new Date(ev.date||ev.event_date).getMonth()]}</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:'#1e293b'}}>{ev.cname||ev.client_name||'Cliente'}</div>
                <div style={{fontSize:11,color:'#94a3b8'}}>{ev.time||ev.event_time||'Sin hora'} — {ev.notes||ev.type||'Cita'}</div>
              </div>
              <div style={{fontSize:10,background:`${p}10`,color:p,padding:'3px 9px',borderRadius:6,fontWeight:700}}>
                {ev.type==='cita'?'Cita':ev.type==='llamada'?'Llamada':'Actividad'}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resumen rendimiento — interactivo */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(3,1fr)',gap:12}}>
        {[
          {l:'Score promedio',   v:`${stats.leads?.score_promedio||0}/100`, c:'#4f6ef7', sub:'de tus leads',  nav:'leads',    Ic:Activity},
          {l:'Actividades hoy', v:stats.actions?.hoy||0,                   c:'#10b981', sub:'registradas',    nav:'actions',  Ic:CheckCircle},
          {l:'Leads nuevos hoy',v:stats.leads?.hoy||0,                     c:'#f59e0b', sub:'del bot',        nav:'leads',    Ic:Zap},
        ].map((s,i)=>(
          <div key={i}
            onClick={()=>nav(s.nav)}
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


function TabDashboard({clients,events,actions,payments,leads,stats,onCall,onNavigate}){
  const p       = DS.primary;
  const won     = clients.filter(c=>c.result==='won').length;
  const lost    = clients.filter(c=>c.result==='lost').length;
  const proceso = clients.filter(c=>!c.result).length;
  const meta    = 10;
  const pct     = Math.min(Math.round((won/meta)*100),100);
  const sinContacto = clients.filter(c=>(Date.now()-new Date(c.last))/3600000>24&&!c.result);
  const pendPagos   = payments.filter(q=>q.status!=='paid');
  const todayActs   = actions.slice(0,6);
  const calientes   = leads.filter(l=>l.nivel==='caliente').length;
  const totalVenta  = clients.filter(c=>c.result==='won').reduce((s,c)=>s+(Number(c.metadata?.saleAmount ?? c.saleAmount)||0),0);
  const metaVenta   = meta*3200;

  const typeMap={
    llamada: {l:'Llamada',  c:p,        bg:`${p}10`,  Icon:Phone},
    whatsapp:{l:'WhatsApp', c:'#10B981',bg:'#10B98110',Icon:MessageCircle},
    email:   {l:'Email',    c:'#F59E0B',bg:'#F59E0B10',Icon:FileText},
    cita:    {l:'Cita',     c:'#8B5CF6',bg:'#8B5CF610',Icon:Calendar},
  };
  const stMap={
    'Pendiente':    {l:'Pendiente',    c:'#F59E0B',bg:'#FEF9EE'},
    'Completado':   {l:'Completado',   c:'#10B981',bg:'#F0FDF9'},
    'Completada':   {l:'Completada',   c:'#10B981',bg:'#F0FDF9'},
    'Respondido':   {l:'Respondido',   c:'#10B981',bg:'#F0FDF9'},
    'No respondido':{l:'No respondido',c:'#EF4444',bg:'#FFF5F5'},
  };

  // EMS-style card with left colored border
  const panel = (color='#10B981') => ({
    background:'#fff',
    borderRadius:12,
    border:'1px solid #E8EDF2',
    borderLeft:`3px solid ${color}`,
    boxShadow:'0 1px 4px rgba(0,0,0,0.05)',
    overflow:'hidden',
  });

  // Tinted mini cards (like EMS)
  const tintCard = (color) => ({
    background:`${color}08`,
    borderRadius:12,
    border:`1px solid ${color}20`,
    padding:'18px 20px',
  });

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* ── SECTION HEADER ── */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <div style={{fontSize:11,color:p,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:4}}>Panel del Asesor</div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:'#1E293B',fontFamily:"'Syne',sans-serif",letterSpacing:'-0.5px'}}>Mi Dashboard</h1>
          <p style={{margin:'4px 0 0',fontSize:13,color:'#94A3B8'}}>Gestiona tus actividades, clientes y metas desde un solo lugar</p>
        </div>
        <button onClick={()=>onNavigate('actions')} style={{padding:'10px 20px',borderRadius:10,border:'none',background:`linear-gradient(135deg,${p},${p}dd)`,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:7,boxShadow:`0 4px 14px ${p}35`,transition:'all .2s'}}
        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';}}
        onMouseLeave={e=>{e.currentTarget.style.transform='';}}>
          <Plus size={14}/> Nueva actividad
        </button>
      </div>


      {/* -- CARDS DE CANALES con logos -- */}
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
          // Contar ventas por canal cruzando con clients
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
            <div style={{display:'grid',gridTemplateColumns:`repeat(${activos.length},1fr)`,gap:12}}>
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

      {/* -- 4 KPI CARDS (EMS tinted style) -- */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:MOB?10:14,marginBottom:20}}>
        {[
          {Icon:Activity,      label:'Total actividades', value:actions.length,     color:p,         sub:'hoy',            nav:'actions'},
          {Icon:Phone,         label:'Llamadas hoy',      value:actions.filter(a=>a.type==='llamada').length, color:'#10B981', sub:`${actions.filter(a=>a.resultado==='Pendiente').length} pendientes`,nav:'actions'},
          {Icon:MessageCircle, label:'WhatsApp hoy',      value:actions.filter(a=>a.type==='whatsapp').length,color:'#0EA5E9', sub:`${calientes} sin responder`,   nav:'clients'},
          {Icon:DollarSign,    label:'Por cobrar',        value:`$${pendPagos.reduce((s,q)=>s+(q.amount||0),0).toLocaleString()}`, color:'#F59E0B', sub:`${pendPagos.length} pagos`, nav:'payments'},
        ].map((k,i)=>(
          <div key={i} onClick={()=>onNavigate(k.nav)} style={{
            background:CB||'#fff', borderRadius:14,
            border:`1px solid ${k.color}20`,
            boxShadow:`0 1px 3px rgba(0,0,0,0.05), 0 4px 16px ${k.color}08`,
            padding:MOB?'14px':' 20px', cursor:'pointer', position:'relative', overflow:'hidden',
            transition:'transform .15s, box-shadow .15s',
          }}
          onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 8px 24px ${k.color}20`;}}
          onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 1px 3px rgba(0,0,0,0.05), 0 4px 16px ${k.color}08`;}}>
            {/* Tinted BG */}
            <div style={{position:'absolute',top:0,right:0,bottom:0,left:'60%',background:`linear-gradient(135deg,${k.color}06,${k.color}12)`,borderRadius:'0 14px 14px 0',pointerEvents:'none'}}/>
            {/* top accent */}
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${k.color},${k.color}44)`,borderRadius:'14px 14px 0 0'}}/>
            <div style={{position:'relative'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div style={{width:40,height:40,borderRadius:12,background:`${k.color}12`,border:`1px solid ${k.color}25`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <k.Icon size={19} color={k.color} strokeWidth={2}/>
                </div>
                <span style={{fontSize:10,color:k.color,fontWeight:700,background:`${k.color}10`,border:`1px solid ${k.color}20`,borderRadius:999,padding:'3px 9px'}}>↑ activo</span>
              </div>
              <div style={{fontSize:32,fontWeight:800,color:'#1E293B',fontFamily:"'Syne',sans-serif",letterSpacing:'-0.5px',lineHeight:1,marginBottom:4}}>{k.value}</div>
              <div style={{fontSize:12,color:'#94A3B8',fontWeight:500}}>{k.label}</div>
              <div style={{fontSize:10,color:k.color,fontWeight:600,marginTop:6}}>{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* -- MAIN GRID 2 cols -- */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'1fr 300px',gap:16}}>

        {/* LEFT */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Activities panel — EMS section style */}
          <div style={{background:'#fff',borderRadius:14,border:'1px solid #E8EDF2',boxShadow:'0 1px 4px rgba(0,0,0,0.05)',overflow:'hidden'}}>
            {/* section header with left accent */}
            <div style={{padding:'16px 20px',borderBottom:'1px solid #F1F5F9',borderLeft:`3px solid ${p}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                  <Activity size={15} color={p}/>
                  <span style={{fontSize:14,fontWeight:800,color:'#1E293B',fontFamily:"'Syne',sans-serif"}}>Actividades de hoy</span>
                  {actions.filter(a=>a.resultado==='Pendiente').length>0&&(
                    <span style={{background:`${p}10`,color:p,borderRadius:999,padding:'2px 9px',fontSize:10,fontWeight:700,border:`1px solid ${p}20`}}>
                      {actions.filter(a=>a.resultado==='Pendiente').length} pendientes
                    </span>
                  )}
                </div>
                <div style={{fontSize:11,color:'#94A3B8'}}>Gestiona tus llamadas, WhatsApp, emails y citas desde un solo lugar</div>
              </div>
            </div>

            {/* filter pills */}
            <div style={{padding:'10px 20px',borderBottom:'1px solid #F8FAFC',display:'flex',gap:6,background:'#FAFBFC'}}>
              {[{k:'all',l:'Todos',active:true},{k:'llamada',l:'Llamadas', Ic:Phone},{k:'whatsapp',l:'WhatsApp', Ic:MessageCircle},{k:'email',l:'Email',    Ic:FileText},{k:'cita',l:'Citas',    Ic:Calendar}].map((f,i)=>(
                <button key={f.k} style={{
                  padding:'5px 13px',borderRadius:20,border:`1px solid ${f.active?p+'50':'#E2E8F0'}`,
                  fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',fontFamily:"'DM Sans',sans-serif",transition:'all .15s',
                  background:f.active?`linear-gradient(135deg,${p},${p}cc)`:'#fff',
                  color:f.active?'#fff':'#64748B',
                  boxShadow:f.active?`0 3px 8px ${p}25`:'none',
                }}>{f.l}</button>
              ))}
            </div>

            {/* rows */}
            {todayActs.length===0&&<div style={{padding:'36px',textAlign:'center',color:'#CBD5E1',fontSize:13}}>Sin actividades registradas hoy</div>}
            {todayActs.map((a,i)=>{
              const t=typeMap[a.type]||{l:a.type,c:'#94A3B8',bg:'#F8FAFC',Icon:Activity};
              const st=stMap[a.resultado]||{l:a.resultado||'—',c:'#94A3B8',bg:'#F8FAFC'};
              return(
                <div key={a.id||i} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 20px',borderBottom:'1px solid #F8FAFC',transition:'background .12s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#FAFBFC'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{width:44,height:44,borderRadius:13,background:t.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`1px solid ${t.c}20`}}>
                    <t.Icon size={19} color={t.c} strokeWidth={2}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#1E293B'}}>{a.cname||'Cliente'}</span>
                      <span style={{background:t.bg,color:t.c,borderRadius:999,padding:'2px 8px',fontSize:10,fontWeight:700,border:`1px solid ${t.c}20`}}>{t.l}</span>
                      {a.at&&<span style={{fontSize:10,color:'#CBD5E1'}}>{new Date(a.at).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}</span>}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:7}}>
                      {a.dur>0&&<span style={{fontSize:11,color:t.c,fontWeight:700,background:t.bg,borderRadius:4,padding:'1px 6px'}}>{fmtT(a.dur)}</span>}
                      {a.desc&&<span style={{fontSize:11,color:'#64748B',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:260}}>{a.desc}</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:7,flexShrink:0}}>
                    <span style={{background:st.bg,color:st.c,borderRadius:999,padding:'4px 11px',fontSize:11,fontWeight:700,border:`1px solid ${st.c}15`}}>{st.l}</span>
                    <button onClick={()=>onCall&&onCall({name:a.cname,phone:a.phone})} style={{width:34,height:34,borderRadius:9,border:`1px solid ${t.c}20`,background:t.bg,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background=t.c;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=t.bg;}}>
                      <Phone size={14} color={t.c}/>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* tip */}
            {sinContacto.length>0&&(
              <div style={{padding:'11px 20px',background:`${p}06`,borderTop:'1px solid #F1F5F9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:12,color:'#64748B'}}><b style={{color:'#1E293B'}}>Tip Pro:</b> Tienes <b style={{color:p}}>{sinContacto.length} clientes</b> que necesitan seguimiento hoy</span>
                <button onClick={()=>onNavigate('clients')} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${p}30`,background:'#fff',color:p,fontSize:11,fontWeight:700,cursor:'pointer',transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background=p;e.currentTarget.style.color='#fff';}}
                onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color=p;}}>
                  Ver clientes ›
                </button>
              </div>
            )}
          </div>

          {/* Environmental Insights style — 2 panels row */}
          <div style={{background:'#fff',borderRadius:14,border:'1px solid #E8EDF2',boxShadow:'0 1px 4px rgba(0,0,0,0.05)',overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid #F1F5F9',borderLeft:`3px solid #10B981`,display:'flex',alignItems:'center',gap:8}}>
              <TrendingUp size={14} color="#10B981"/>
              <span style={{fontSize:14,fontWeight:800,color:'#1E293B',fontFamily:"'Syne',sans-serif"}}>Resumen de clientes</span>
              <span style={{fontSize:11,color:'#94A3B8',marginLeft:4}}>Distribución y estado actual</span>
            </div>
            <div style={{padding:'16px 20px',display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:12}}>
              {[
                {Icon:Users,      l:'Total',      v:clients.length,c:p,        bg:`${p}08`},
                {Icon:Activity,   l:'En proceso', v:proceso,       c:'#F59E0B', bg:'#FEF9EE'},
                {Icon:Trophy,     l:'Ganados',    v:won,           c:'#10B981', bg:'#F0FDF9'},
                {Icon:XCircle,    l:'Perdidos',   v:lost,          c:'#EF4444', bg:'#FFF5F5'},
              ].map((s,i)=>(
                <div key={i} style={{background:s.bg,borderRadius:12,padding:'14px 16px',border:`1px solid ${s.c}15`}}>
                  <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
                    <s.Icon size={14} color={s.c}/>
                    <span style={{fontSize:11,color:s.c,fontWeight:700}}>{s.l}</span>
                  </div>
                  <div style={{fontSize:26,fontWeight:800,color:s.c,fontFamily:"'Syne',sans-serif",letterSpacing:'-0.5px'}}>{s.v}</div>
                  <div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>{clients.length?Math.round((s.v/(clients.length||1))*100):0}% del total</div>
                </div>
              ))}
            </div>
            <div style={{padding:'10px 20px 14px',borderTop:'1px solid #F1F5F9',display:'flex',gap:20,fontSize:11,color:'#94A3B8'}}>
              <span>Tasa de conversión: <b style={{color:'#10B981'}}>{clients.length?Math.round((won/(clients.length||1))*100):0}%</b></span>
              <span>Sin contacto +24h: <b style={{color:'#EF4444'}}>{sinContacto.length} clientes</b></span>
              <span>Pagos pendientes: <b style={{color:'#F59E0B'}}>${pendPagos.reduce((s,q)=>s+(q.amount||0),0).toLocaleString()}</b></span>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Pipeline — EMS tinted cards */}
          <div style={{background:'#fff',borderRadius:14,border:'1px solid #E8EDF2',boxShadow:'0 1px 4px rgba(0,0,0,0.05)',overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid #F1F5F9',borderLeft:`3px solid ${p}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <TrendingUp size={14} color={p}/>
                <span style={{fontSize:14,fontWeight:800,color:'#1E293B',fontFamily:"'Syne',sans-serif"}}>Pipeline del mes</span>
              </div>
            </div>
            {/* EMS-style tinted stat cards */}
            <div style={{padding:'14px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[
                {l:'Leads bot',   v:leads.length,                   c:p,         bg:`${p}08`},
                {l:'Contactados', v:Math.round(leads.length*.57)||0, c:'#10B981', bg:'#F0FDF9'},
                {l:'En proceso',  v:proceso,                         c:'#F59E0B', bg:'#FEF9EE'},
                {l:'Cerrados',    v:won,                             c:'#8B5CF6', bg:'#F5F3FF'},
              ].map((f,i)=>(
                <div key={i} style={{background:f.bg,borderRadius:11,padding:'14px',border:`1px solid ${f.c}15`}}>
                  <div style={{fontSize:11,color:f.c,fontWeight:700,marginBottom:8}}>{f.l}</div>
                  <div style={{fontSize:28,fontWeight:800,color:'#1E293B',fontFamily:"'Syne',sans-serif",lineHeight:1}}>{f.v}</div>
                  <div style={{background:`${f.c}20`,borderRadius:999,height:4,marginTop:10,overflow:'hidden'}}>
                    <div style={{width:`${leads.length?Math.min((f.v/(leads.length||1))*100,100):f.v>0?20:0}%`,height:'100%',background:f.c,borderRadius:999,minWidth:f.v>0?'8%':'0',transition:'width .5s ease'}}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{padding:'10px 16px 14px',borderTop:'1px solid #F1F5F9'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#94A3B8',marginBottom:6}}>
                <span>Meta: <b style={{color:'#1E293B'}}>${metaVenta.toLocaleString()}</b></span>
                <span>Actual: <b style={{color:p}}>${totalVenta.toLocaleString()}</b></span>
              </div>
              <div style={{background:'#F1F5F9',borderRadius:999,height:7,overflow:'hidden'}}>
                <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${p},#10B981)`,borderRadius:999,transition:'width .6s ease'}}/>
              </div>
              <div style={{textAlign:'right',fontSize:10,color:p,fontWeight:700,marginTop:5}}>{pct}% completado</div>
            </div>
          </div>

          {/* Meta mensual */}
          <div style={{background:'#fff',borderRadius:14,border:'1px solid #E8EDF2',boxShadow:'0 1px 4px rgba(0,0,0,0.05)',overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid #F1F5F9',borderLeft:'3px solid #10B981',display:'flex',alignItems:'center',gap:8}}>
              <Trophy size={14} color="#10B981"/>
              <span style={{fontSize:14,fontWeight:800,color:'#1E293B',fontFamily:"'Syne',sans-serif"}}>Meta mensual</span>
              <span style={{marginLeft:'auto',fontSize:12,fontWeight:800,color:'#1E293B'}}>{won}/{meta} · {pct}%</span>
            </div>
            <div style={{padding:'16px 18px'}}>
              <div style={{background:'#F1F5F9',borderRadius:999,height:10,overflow:'hidden',marginBottom:10}}>
                <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${p},#10B981)`,borderRadius:999,boxShadow:`0 0 8px ${p}40`,transition:'width .7s ease'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#94A3B8',marginBottom:14}}>
                <span>{won} cerradas</span><span>{meta-won} para la meta</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div style={{background:'#F0FDF9',borderRadius:10,padding:'12px',textAlign:'center',border:'1px solid #10B98120'}}>
                  <div style={{fontSize:22,fontWeight:800,color:'#10B981',fontFamily:"'Syne',sans-serif"}}>{won}</div>
                  <div style={{fontSize:10,color:'#94A3B8'}}>Ganados</div>
                </div>
                <div style={{background:'#FFF5F5',borderRadius:10,padding:'12px',textAlign:'center',border:'1px solid #EF444420'}}>
                  <div style={{fontSize:22,fontWeight:800,color:'#EF4444',fontFamily:"'Syne',sans-serif"}}>{lost}</div>
                  <div style={{fontSize:10,color:'#94A3B8'}}>Perdidos</div>
                </div>
              </div>
            </div>
          </div>

          {/* Acción rápida */}
          <div style={{background:'#fff',borderRadius:14,border:'1px solid #E8EDF2',boxShadow:'0 1px 4px rgba(0,0,0,0.05)',overflow:'hidden'}}>
            <div style={{padding:'12px 18px',borderBottom:'1px solid #F1F5F9',borderLeft:'3px solid #F59E0B',display:'flex',alignItems:'center',gap:8}}>
              <Zap size={14} color="#F59E0B"/>
              <span style={{fontSize:14,fontWeight:800,color:'#1E293B',fontFamily:"'Syne',sans-serif"}}>Acción rápida</span>
            </div>
            <div style={{padding:'12px',display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:8}}>
              {[
                {Icon:MessageCircle,l:'WhatsApp',c:'#10B981',nav:'clients'},
                {Icon:Phone,        l:'Llamar',  c:p,        nav:'clients'},
                {Icon:Calendar,     l:'Cita',    c:'#8B5CF6',nav:'calendar'},
                {Icon:Plus,         l:'Lead',    c:'#F59E0B',nav:'leads'},
              ].map((a,i)=>(
                <button key={i} onClick={()=>onNavigate(a.nav)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:7,padding:'12px 6px',borderRadius:11,border:`1px solid ${a.c}15`,background:`${a.c}06`,cursor:'pointer',transition:'all .18s'}}
                onMouseEnter={e=>{e.currentTarget.style.background=`${a.c}12`;e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 6px 16px ${a.c}18`;}}
                onMouseLeave={e=>{e.currentTarget.style.background=`${a.c}06`;e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='none';}}>
                  <div style={{width:36,height:36,borderRadius:10,background:`${a.c}12`,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${a.c}20`}}>
                    <a.Icon size={17} color={a.c} strokeWidth={2}/>
                  </div>
                  <span style={{fontSize:9,fontWeight:700,color:a.c,textAlign:'center',lineHeight:1.3}}>{a.l}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mejores horarios */}
          <div style={{background:'#fff',borderRadius:14,border:'1px solid #E8EDF2',boxShadow:'0 1px 4px rgba(0,0,0,0.05)',overflow:'hidden'}}>
            <div style={{padding:'12px 18px',borderBottom:'1px solid #F1F5F9',borderLeft:'3px solid #0EA5E9',display:'flex',alignItems:'center',gap:8}}>
              <Clock size={14} color="#0EA5E9"/>
              <span style={{fontSize:14,fontWeight:800,color:'#1E293B',fontFamily:"'Syne',sans-serif"}}>Mejores horarios</span>
            </div>
            <div style={{padding:'14px 18px'}}>
              {[
                {t:'10:00 - 11:00 AM',v:82,c:'#10B981'},
                {t:'12:00 - 2:00 PM', v:78,c:'#F59E0B'},
                {t:'3:00 - 5:00 PM',  v:65,c:p},
                {t:'5:00 - 7:00 PM',  v:42,c:'#0EA5E9'},
              ].map((h,i)=>(
                <div key={i} style={{marginBottom:11}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:11,color:'#64748B',fontWeight:500}}>{h.t}</span>
                    <span style={{fontSize:11,fontWeight:800,color:h.c}}>{h.v}%</span>
                  </div>
                  <div style={{background:'#F1F5F9',borderRadius:999,height:6,overflow:'hidden'}}>
                    <div style={{width:`${h.v}%`,height:'100%',background:h.c,borderRadius:999,transition:'width .5s ease'}}/>
                  </div>
                </div>
              ))}
              <div style={{fontSize:10,color:'#CBD5E1',textAlign:'center',borderTop:'1px solid #F8FAFC',paddingTop:10,marginTop:6}}>
                 {actions.length} llamadas analizadas
              </div>
            </div>
          </div>

          {/* Sin contacto */}
          {sinContacto.length>0&&(
            <div style={{background:'#FFF5F5',borderRadius:14,border:'1px solid #FECACA',boxShadow:'0 1px 4px rgba(0,0,0,0.04)',overflow:'hidden'}}>
              <div style={{padding:'11px 16px',borderBottom:'1px solid #FECACA',borderLeft:'3px solid #EF4444',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:7}}>
                  <AlertCircle size={14} color="#EF4444"/>
                  <span style={{fontSize:13,fontWeight:800,color:'#DC2626',fontFamily:"'Syne',sans-serif"}}>Sin contacto +24h</span>
                </div>
                <span style={{background:'#EF4444',color:'#fff',borderRadius:999,padding:'2px 8px',fontSize:11,fontWeight:700}}>{sinContacto.length}</span>
              </div>
              <div style={{padding:'8px 14px'}}>
                {sinContacto.slice(0,3).map(c=>(
                  <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 4px',borderBottom:'1px solid #FEE2E2'}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:'#7F1D1D'}}>{c.name}</div>
                      <div style={{fontSize:10,color:'#EF4444'}}>{ago(c.last)}</div>
                    </div>
                    <button onClick={()=>onCall&&onCall(c)} style={{width:30,height:30,borderRadius:8,border:'1px solid #FECACA',background:'#FEE2E2',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='#EF4444';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='#FEE2E2';}}>
                      <Phone size={13} color="#EF4444"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabPipeline({clients,payments,leads,actions}){
  const p = DS.primary;
  const [activeStage, setActiveStage] = React.useState(null);
  const [metaEdit,   setMetaEdit]    = React.useState(false);
  const [meta,       setMeta]        = React.useState(10);
  const [metaInput,  setMetaInput]   = React.useState('10');
  const [hovKpi,     setHovKpi]      = React.useState(null);
  const [showTip,    setShowTip]     = React.useState(true);

  const won     = clients.filter(c=>c.result==='won');
  const lost    = clients.filter(c=>c.result==='lost');
  const proceso = clients.filter(c=>!c.result);
  const pct     = Math.min(Math.round((won.length/meta)*100),100);
  const totalVal= won.reduce((s,c)=>s+(Number(c.metadata?.saleAmount ?? c.saleAmount)||0),0);
  const metaVal = meta * 3200;
  const pendP   = payments.filter(q=>q.status!=='paid');
  const totalLeads = leads.length;

  const stages = [
    {key:'leads',   label:'Leads Bot',    v:totalLeads,                           c:'#6366f1', Icon:Target,   desc:'Prospectos captados por el bot'},
    {key:'contact', label:'Contactados',  v:Math.round(totalLeads*.62)||0,        c:p,         Icon:Phone,    desc:'Primer contacto realizado'},
    {key:'proceso', label:'En proceso',   v:proceso.length,                       c:'#f59e0b', Icon:Activity, desc:'Negociación en curso'},
    {key:'won',     label:'Ganados',      v:won.length,                           c:'#10b981', Icon:Trophy,   desc:'Ventas confirmadas'},
    {key:'lost',    label:'Perdidos',     v:lost.length,                          c:'#ef4444', Icon:XCircle,  desc:'No se concretaron'},
  ];

  const kpis = [
    {label:'Meta del mes',   value:meta,              sub:'ventas objetivo',          color:p,        Icon:Star,       action:()=>setMetaEdit(true)},
    {label:'Cerradas',       value:won.length,        sub:`$${totalVal.toLocaleString()} generados`,  color:'#10b981', Icon:Trophy,     action:null},
    {label:'En proceso',     value:proceso.length,    sub:'oportunidades activas',    color:'#f59e0b', Icon:Activity,  action:null},
    {label:'Progreso',       value:`${pct}%`,         sub:`${meta-won.length} para la meta`, color:pct>=80?'#10b981':pct>=50?'#f59e0b':p, Icon:TrendingUp, action:null},
  ];

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* ── HEADER ── */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:22}}>
        <div>
          <div style={{fontSize:11,color:p,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:4}}>Mi Pipeline Personal</div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:'#1e293b',letterSpacing:'-0.5px'}}>Pipeline de Ventas</h1>
          <p style={{margin:'5px 0 0',fontSize:13,color:'#94a3b8'}}>Tu embudo personal · Haz clic en cada etapa para ver detalles</p>
        </div>
        <button onClick={()=>setMetaEdit(true)} style={{padding:'9px 18px',borderRadius:11,border:`1.5px solid ${p}30`,background:`${p}08`,color:p,fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,transition:'all .2s'}}
          onMouseEnter={e=>{e.currentTarget.style.background=p;e.currentTarget.style.color='#fff';}}
          onMouseLeave={e=>{e.currentTarget.style.background=`${p}08`;e.currentTarget.style.color=p;}}>
          <Star size={13}/> Editar meta
        </button>
      </div>

      {/* ── META EDIT MODAL ── */}
      {metaEdit&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.4)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9000}}
          onClick={e=>{if(e.target===e.currentTarget)setMetaEdit(false);}}>
          <div style={{background:'#fff',borderRadius:20,padding:28,width:340,boxShadow:'0 24px 60px rgba(0,0,0,0.18)',border:'1px solid #eaecf0'}}>
            <div style={{fontSize:16,fontWeight:800,color:'#1e293b',marginBottom:6}}>Editar meta mensual</div>
            <div style={{fontSize:12,color:'#94a3b8',marginBottom:20}}>¿Cuántas ventas quieres cerrar este mes?</div>
            <input type="number" min="1" max="100" value={metaInput} onChange={e=>setMetaInput(e.target.value)}
              style={{width:'100%',padding:'12px 16px',border:'2px solid #e2e8f0',borderRadius:12,fontSize:24,fontWeight:800,textAlign:'center',color:'#1e293b',outline:'none',boxSizing:'border-box',marginBottom:16,transition:'border .2s'}}
              onFocus={e=>e.target.style.borderColor=p} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <button onClick={()=>setMetaEdit(false)} style={{padding:'11px',borderRadius:11,border:'1.5px solid #e2e8f0',background:'#f8fafc',color:'#64748b',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all .15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#e2e8f0'} onMouseLeave={e=>e.currentTarget.style.background='#f8fafc'}>Cancelar</button>
              <button onClick={()=>{const v=parseInt(metaInput)||10;setMeta(v);setMetaEdit(false);}} style={{padding:'11px',borderRadius:11,border:'none',background:`linear-gradient(135deg,${p},${p}cc)`,color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:`0 4px 12px ${p}35`,transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';}} onMouseLeave={e=>{e.currentTarget.style.transform='';}}>Guardar meta</button>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI STATS — estilo flat con acento izquierdo ── */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {kpis.map((k,i)=>(
          <div key={i}
            style={{padding:'18px 20px',borderLeft:`3px solid ${k.color}`,background:`${k.color}07`,borderRadius:'0 10px 10px 0',cursor:k.action?'pointer':'default',transition:'background .15s'}}
            onMouseEnter={e=>{ if(k.action) e.currentTarget.style.background=`${k.color}14`; }}
            onMouseLeave={e=>{ e.currentTarget.style.background=`${k.color}07`; }}
            onClick={()=>k.action&&k.action()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div style={{width:36,height:36,borderRadius:9,background:`${k.color}14`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <k.Icon size={17} color={k.color} strokeWidth={2}/>
              </div>
              {k.action&&<div style={{fontSize:9,color:k.color,background:`${k.color}14`,borderRadius:999,padding:'2px 8px',fontWeight:700}}>Editar</div>}
            </div>
            <div style={{fontSize:28,fontWeight:800,color:'#1e293b',letterSpacing:'-0.5px',lineHeight:1,marginBottom:4}}>{k.value}</div>
            <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:2}}>{k.label}</div>
            <div style={{fontSize:11,color:'#94a3b8'}}>{k.sub}</div>
            {i===3&&(
              <div style={{marginTop:8}}>
                <div style={{background:'rgba(0,0,0,0.06)',borderRadius:999,height:4,overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${k.color},#10b981)`,borderRadius:999,transition:'width .8s ease'}}/>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── FUNNEL INTERACTIVO ── */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'1.2fr 1fr',gap:16,marginBottom:16}}>
        <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9',borderLeft:`3px solid ${p}`,display:'flex',alignItems:'center',gap:8}}>
            <TrendingUp size={14} color={p}/>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>Embudo de conversión</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>Haz clic en una etapa para ver detalles</div>
            </div>
          </div>
          <div style={{padding:'20px'}}>
            {stages.map((s,i,arr)=>{
              const maxV=arr[0].v||1;
              const barW=Math.max(s.v>0?(s.v/maxV)*100:0, s.v>0?6:0);
              const convRate = i>0&&arr[i-1].v>0 ? Math.round((s.v/arr[i-1].v)*100) : 100;
              const isActive = activeStage===s.key;
              return(
                <div key={s.key} style={{marginBottom:14,cursor:'pointer'}} onClick={()=>setActiveStage(isActive?null:s.key)}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7,padding:'8px 10px',borderRadius:10,background:isActive?`${s.c}08`:'transparent',border:isActive?`1px solid ${s.c}20`:'1px solid transparent',transition:'all .2s'}}
                    onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background='#f8fafc';}}
                    onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background='transparent';}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:32,height:32,borderRadius:9,background:isActive?s.c:`${s.c}12`,border:`1px solid ${s.c}20`,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',flexShrink:0}}>
                        <s.Icon size={14} color={isActive?'#fff':s.c}/>
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:isActive?s.c:'#475569'}}>{s.label}</div>
                        <div style={{fontSize:10,color:'#94a3b8'}}>{s.desc}</div>
                      </div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:22,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
                      {i>0&&<div style={{fontSize:9,color:'#94a3b8'}}>{convRate}% del anterior</div>}
                    </div>
                  </div>
                  <div style={{background:'#f1f5f9',borderRadius:10,height:10,overflow:'hidden',marginLeft:4,marginRight:4}}>
                    <div style={{width:`${barW}%`,height:'100%',background:`linear-gradient(90deg,${s.c},${s.c}88)`,borderRadius:10,transition:'width .6s ease',minWidth:s.v>0?'3%':'0',boxShadow:isActive?`0 0 8px ${s.c}60`:''}}/>
                  </div>
                  {/* Detalle expandible */}
                  {isActive&&(
                    <div style={{marginTop:10,padding:'12px 14px',background:`${s.c}06`,borderRadius:12,border:`1px solid ${s.c}20`,animation:'fadeUp .2s ease'}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:16,fontWeight:800,color:s.c}}>{s.v}</div>
                          <div style={{fontSize:9,color:'#94a3b8'}}>Cantidad</div>
                        </div>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:16,fontWeight:800,color:s.c}}>{totalLeads?Math.round((s.v/totalLeads)*100):0}%</div>
                          <div style={{fontSize:9,color:'#94a3b8'}}>Del total</div>
                        </div>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:16,fontWeight:800,color:s.c}}>{i>0&&arr[i-1].v>0?Math.round((s.v/arr[i-1].v)*100):100}%</div>
                          <div style={{fontSize:9,color:'#94a3b8'}}>Conversión</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{padding:'12px 14px',background:`${p}06`,borderRadius:12,border:`1px solid ${p}15`,marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#1e293b'}}>Tasa de conversión global</div>
                <div style={{fontSize:10,color:'#94a3b8'}}>leads → ventas cerradas</div>
              </div>
              <div style={{fontSize:24,fontWeight:800,color:p}}>{totalLeads?Math.round((won.length/totalLeads)*100):0}%</div>
            </div>
          </div>
        </div>

        {/* ── PANEL DERECHO ── */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Clientes interactivos */}
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
            <div style={{padding:'13px 18px',borderBottom:'1px solid #f1f5f9',borderLeft:'3px solid #10b981',display:'flex',alignItems:'center',gap:8}}>
              <Users size={13} color="#10b981"/>
              <span style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Mis clientes</span>
            </div>
            <div style={{padding:'14px 18px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
              {[
                {l:'En proceso',v:proceso.length,c:p},
                {l:'Ganados',   v:won.length,    c:'#10b981'},
                {l:'Perdidos',  v:lost.length,   c:'#ef4444'},
              ].map((s,i)=>(
                <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:12,padding:'14px 10px',border:`1px solid ${s.c}15`,cursor:'pointer',transition:'all .2s'}}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${s.c}08`;e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 6px 18px ${s.c}18`;e.currentTarget.style.borderColor=`${s.c}40`;}}
                  onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor=`${s.c}15`;}}>
                  <div style={{fontSize:26,fontWeight:800,color:s.c,lineHeight:1,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:10,color:'#64748b',fontWeight:600}}>{s.l}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{clients.length?Math.round((s.v/clients.length)*100):0}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagos pendientes interactivos */}
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
            <div style={{padding:'13px 18px',borderBottom:'1px solid #f1f5f9',borderLeft:'3px solid #f59e0b',display:'flex',alignItems:'center',gap:8}}>
              <DollarSign size={13} color="#f59e0b"/>
              <span style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Pagos pendientes</span>
              {pendP.length>0&&<span style={{marginLeft:'auto',fontSize:11,fontWeight:700,color:'#f59e0b',background:'#fef9c3',borderRadius:999,padding:'2px 10px',border:'1px solid #fde68a'}}>{pendP.length}</span>}
            </div>
            <div style={{padding:'10px 14px'}}>
              {pendP.length===0
                ? <div style={{textAlign:'center',padding:'16px 0',color:'#10b981',fontWeight:600,fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><CheckCircle size={16} color="#10b981"/> Sin pagos pendientes</div>
                : pendP.slice(0,4).map((pay,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 8px',borderRadius:10,marginBottom:4,border:'1px solid transparent',cursor:'pointer',transition:'all .15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.background='#fef9c3';e.currentTarget.style.borderColor='#fde68a';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='transparent';}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:28,height:28,borderRadius:8,background:'#fef9c3',display:'flex',alignItems:'center',justifyContent:'center'}}><DollarSign size={12} color="#f59e0b"/></div>
                        <span style={{fontSize:12,fontWeight:600,color:'#1e293b'}}>{pay.cname||'Cliente'}</span>
                      </div>
                      <span style={{fontSize:13,fontWeight:800,color:'#f59e0b'}}>${(pay.amount||0).toLocaleString()}</span>
                    </div>
                  ))
              }
              {pendP.length>4&&<div style={{fontSize:11,color:'#94a3b8',textAlign:'center',marginTop:4}}>+{pendP.length-4} pagos más</div>}
            </div>
          </div>

          {/* Tip inteligente */}
          {showTip&&(
            <div style={{background:`linear-gradient(135deg,${p}10,${p}06)`,borderRadius:14,padding:'14px 16px',border:`1px solid ${p}20`,position:'relative',transition:'all .3s'}}>
              <button onClick={()=>setShowTip(false)} style={{position:'absolute',top:8,right:8,border:'none',background:'transparent',cursor:'pointer',color:'#94a3b8',padding:4}}
                onMouseEnter={e=>e.currentTarget.style.color='#1e293b'} onMouseLeave={e=>e.currentTarget.style.color='#94a3b8'}>
                <X size={12}/>
              </button>
              <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                <div style={{width:32,height:32,borderRadius:9,background:p,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:`0 4px 10px ${p}35`}}>
                  <Star size={15} color="#fff"/>
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:'#1e293b',marginBottom:3}}>Tip Pro</div>
                  <div style={{fontSize:11,color:'#64748b',lineHeight:1.5}}>
                    {pct<30?"Empieza contactando los leads calientes — tienen mayor probabilidad de cierre.":
                     pct<60?"Buen ritmo. Enfócate en cerrar los clientes en proceso esta semana.":
                     pct<90?"¡Excelente avance! Estás cerca de tu meta mensual.":
                     "¡Increíble! Estás logrando tu meta. Apunta a superarla."}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* -- ACTIVIDADES RECIENTES -- */}
      <div style={{background:'#fff',borderRadius:16,border:'1px solid #eaecf0',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',overflow:'hidden'}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid #f1f5f9',borderLeft:'3px solid #8b5cf6',display:'flex',alignItems:'center',gap:8}}>
          <Activity size={14} color="#8b5cf6"/>
          <span style={{fontSize:14,fontWeight:800,color:'#1e293b'}}>Actividades del pipeline</span>
          <span style={{fontSize:11,color:'#94a3b8',marginLeft:4}}>Últimas interacciones con clientes</span>
        </div>
        <div style={{padding:'8px 0'}}>
          {actions.slice(0,5).map((a,i)=>{
            const typeConf={llamada:{c:p,bg:`${p}10`,Icon:Phone},whatsapp:{c:'#059669',bg:'#f0fdf9',Icon:MessageCircle},email:{c:'#f59e0b',bg:'#fef9c3',Icon:FileText},cita:{c:'#8b5cf6',bg:'#f5f3ff',Icon:Calendar}};
            const t=typeConf[a.type]||{c:'#94a3b8',bg:'#f8fafc',Icon:Activity};
            return(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 20px',borderBottom:'1px solid #f8fafc',transition:'background .15s',cursor:'default'}}
                onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{width:36,height:36,borderRadius:11,background:t.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`1px solid ${t.c}20`}}>
                  <t.Icon size={16} color={t.c} strokeWidth={2}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{a.cname}</div>
                  <div style={{fontSize:11,color:'#94a3b8',display:'flex',alignItems:'center',gap:8}}>
                    <span style={{color:t.c,fontWeight:600,background:t.bg,borderRadius:999,padding:'1px 7px',fontSize:10}}>{a.type}</span>
                    {a.dur>0&&<span>{fmtT(a.dur)}</span>}
                    <span>{ago(a.at)}</span>
                  </div>
                </div>
                <div style={{flexShrink:0}}>
                  {a.resultado&&<span style={{fontSize:11,fontWeight:700,color:a.resultado==='Completado'||a.resultado==='Completada'?'#10b981':a.resultado==='Pendiente'?'#f59e0b':'#ef4444',background:a.resultado==='Completado'||a.resultado==='Completada'?'#f0fdf9':a.resultado==='Pendiente'?'#fef9c3':'#fef2f2',borderRadius:999,padding:'3px 10px'}}>{a.resultado}</span>}
                </div>
              </div>
            );
          })}
          {actions.length===0&&<div style={{padding:'24px',textAlign:'center',color:'#94a3b8',fontSize:13}}>Sin actividades registradas</div>}
        </div>
      </div>
    </div>
  );
}

export default function DashboardAsesor({user,currentView,onNavigate,primary='#4f6ef7',pageBg='#f0f4ff',cardBg='#ffffff',cardBorder,cardShadow}) {
  DS = makeDS(primary);
  CB = cardBg || '#ffffff'; // update module-level for sub-components
  CBorder = cardBorder || `${primary}20`;
  MOB = window.innerWidth < 768; // actualiza flag móvil en cada render
  CShadow = cardShadow || `0 2px 12px ${primary}14`;
  const [clients,  setClients]  = useState([]);
  const [events,   setEvents]   = useState([]);
  const [payments, setPayments] = useState([]);
  const [actions,  setActions]  = useState([]);
  const [leads,    setLeads]    = useState([]);
  const [contacts, setContacts] = useState([]);
  const [stats,    setStats]    = useState(null);
  const [call,     setCall]     = useState(null);
  const [confirmDlg, setConfirmDlg] = useState(null);
  _setConfirm = setConfirmDlg;
  const [waDlg, setWaDlg] = useState(null);
  _setWA = setWaDlg;
  const [convInitial, setConvInitial] = useState(null);
  const nav  = onNavigate||(()=>{});
  const view = currentView||'dashboard';

  // Ver conversación del bot con un cliente: busca su lead por teléfono y navega
  function verConversacionCliente(client) {
    const digits = String(client?.phone||'').replace(/\D/g,'');
    const lead = leads.find(l => {
      const ld = String(l.telefono||l.phone||'').replace(/\D/g,'');
      return ld && digits && ld.slice(-9) === digits.slice(-9);
    });
    if (!lead) { alert('Este cliente aún no tiene una conversación con el bot.'); return; }
    setConvInitial(lead);
    nav('conversaciones');
  }

  const cargar = useCallback(async () => {
    try {
      const [clientsRes, statsRes, activRes, calRes, leadsRes, contactsRes, paymentsRes] = await Promise.all([
        apiFetch('GET','/api/asesor/clients').catch(()=>[]),
        apiFetch('GET','/api/asesor/stats').catch(()=>null),
        apiFetch('GET','/api/asesor/activities').catch(()=>[]),
        apiFetch('GET','/api/asesor/calendar').catch(()=>[]),
        apiFetch('GET','/api/asesor/leads').catch(()=>[]),
        apiFetch('GET','/api/asesor/contacts').catch(()=>[]),
        apiFetch('GET','/api/asesor/payments').catch(()=>[]),
      ]);
      if (Array.isArray(clientsRes) && clientsRes.length>0) {
        setClients(clientsRes.map(c=>({
          ...c,
          result:   c.metadata?.result||null,
          heat:     c.metadata?.heat||c.heat||'tibio',
          last:     c.last_contact||c.created_at,
          name:     c.name||'Sin nombre',
          producto: c.metadata?.producto||c.producto||'',
          cedula:   c.metadata?.cedula||c.cedula||'',
        })));
      }
      if (statsRes) setStats(statsRes);
      if (Array.isArray(activRes) && activRes.length>0) {
        setActions(activRes.map(a=>({
          ...a, cid:a.client_id, cname:a.client_name||'—',
          at:a.created_at, dur:a.duration||0,
        })));
      }
      if (Array.isArray(calRes) && calRes.length>0) {
        setEvents(calRes.map(e=>({
          ...e, date:e.event_date, time:e.event_time||'',
          client:e.client_name||'—', done:e.done||false,
        })));
      }
      if (Array.isArray(leadsRes) && leadsRes.length>0) {
        setLeads(leadsRes.map(l=>({
          ...l, nivel:l.nivel||'tibio', score:l.score||50,
          msgBot:l.msg_bot||'', telefono:l.telefono||l.phone||'',
          cedula:l.metadata?.cedula||l.cedula||'',
        })));
      }
      if (Array.isArray(contactsRes)) setContacts(contactsRes);
      if (Array.isArray(paymentsRes) && paymentsRes.length>0) {
        setPayments(paymentsRes.map(p=>({...p, cid:p.client_id, cname:p.client_name||'—', status:p.status||'pending', amount:parseFloat(p.amount)||0, concept:p.description||p.concept||'', due:p.due_date||p.created_at})));
      }
    } catch(e) { console.error('Error cargando datos asesor:', e.message); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleCallSave(d){
    try {
      await apiFetch('POST','/api/asesor/activities',{
        clientId:call.id, type:d.type, resultado:d.resultado||'',
        notas:d.notas||'', duration:d.dur||0,
      });
      setActions(p=>[{id:'a'+Date.now(),type:d.type,cid:call.id,cname:call.name,at:new Date().toISOString(),dur:d.dur,resultado:d.resultado||'',notas:d.notas||''},...p]);
    } catch(e) { console.error(e.message); }
    setClients(p=>p.map(c=>c.id===call.id?{...c,last:new Date().toISOString()}:c));
    setCall(null);
  }

  return(
    <>
      {call&&<CallModal client={call} onSave={handleCallSave} onClose={()=>setCall(null)}/>}
      {confirmDlg&&<ConfirmModal msg={confirmDlg.msg} onYes={confirmDlg.onYes} onClose={()=>setConfirmDlg(null)}/>}
      {waDlg&&<WhatsAppModal data={waDlg} onClose={()=>setWaDlg(null)}/>}
      {view==='dashboard' &&<TabDashboard   clients={clients} events={events} actions={actions} payments={payments} leads={leads} stats={stats} onCall={setCall} onNavigate={nav}/>}
      {view==='clients' /* export: clients */   &&<TabClientes    clients={clients} setClients={setClients} onCall={setCall} onRefresh={cargar} onVerConversacion={verConversacionCliente}/>}
      {view==='calendar'  &&<TabCalendario  events={events} setEvents={setEvents} clients={clients} onRefresh={cargar}/>}
      {view==='payments'  &&<TabPagos       payments={payments} setPayments={setPayments} clients={clients}/>}
      {view==='actions'   &&<TabActividades actions={actions} setActions={setActions} clients={clients} onCall={setCall}/>}
      {view==='messages'  &&<TabMensajes    contacts={contacts}/>}
      {view==='leads'     &&<TabLeads       leads={leads} setLeads={setLeads}/>}
      {view==='estadisticas'     &&<TabEstadisticasPersonales stats={stats} leads={leads} clients={clients} actions={actions} events={events} onNavigate={nav}/>}
      {view==='conversaciones'   &&<TabBotConversaciones leads={leads} initial={convInitial}/>}
      {view==='pipeline'  &&<TabPipeline    clients={clients} payments={payments} leads={leads} actions={actions}/>}
    </>
  );
}
