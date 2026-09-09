import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Users, Plus, Trash2, Edit2, X, Save,
  Eye, CheckCircle, XCircle, Bot, Shield, UserPlus,
  DollarSign, TrendingUp, Activity, Search, RefreshCw,
  AlertCircle, Settings, Phone, MessageCircle,
  Grid, FileText, Star, Lock, Zap, BarChart2,
  Clock, Bell, Download, Calendar, ArrowRight
, FileSpreadsheet, ChevronDown} from 'lucide-react';

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

const PLANS = {
  starter:    { label:'Starter',    price:'$99/mes',  color:'#10b981', bg:'#d1fae5', max_advisors:12,   max_supervisors:1,    features:['12 asesores','1 supervisor','Bot WhatsApp','Reportes básicos'] },
  growth:     { label:'Growth',     price:'$199/mes', color:'#4f6ef7', bg:'#eef2ff', max_advisors:30,   max_supervisors:3,    features:['30 asesores','3 supervisores','Bot WhatsApp','Reportes avanzados','Soporte prioritario'] },
  enterprise: { label:'Enterprise', price:'$399/mes', color:'#f59e0b', bg:'#fef3c7', max_advisors:9999, max_supervisors:9999, features:['Ilimitado','Bot WhatsApp','Reportes completos','Soporte 24/7','White-label'] },
};
const STATUS_CFG = {
  active:    { c:'#10b981', b:'#d1fae5', l:'Activo',     Ic:CheckCircle },
  suspended: { c:'#ef4444', b:'#fee2e2', l:'Suspendido', Ic:Lock },
  cancelled: { c:'#94a3b8', b:'#f1f5f9', l:'Cancelado',  Ic:XCircle },
};
const BOT_STATUS = {
  active:   { c:'#10b981', b:'#d1fae5', l:'● Activo'   },
  inactive: { c:'#94a3b8', b:'#f1f5f9', l:'○ Inactivo' },
  paused:   { c:'#f59e0b', b:'#fef3c7', l:'⏸ Pausado'  },
  error:    { c:'#ef4444', b:'#fee2e2', l:'✗ Error'     },
};

/* ── Design tokens ── */
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
let CShadow = '0 2px 12px #4f6ef714'; // card shadow // Updated per company in main component
let MOB = false;
let _setConfirmSA = null;
function askConfirm(msg, onYes) { if (_setConfirmSA) _setConfirmSA({ msg, onYes }); }
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

/* ── Atoms ── */
function Bdg({l,c,b}){
  return <span style={{padding:'3px 10px',borderRadius:999,fontSize:11,fontWeight:700,color:c,background:b||`${c}18`,whiteSpace:'nowrap',letterSpacing:0.2}}>{l}</span>;
}
function Panel({title,Icon,color=DS.purple,children,action}){
  return(
    <div style={{background:DS.surface,borderRadius:14,border:`1px solid ${DS.border}`,overflow:'hidden'}}>
      <div style={{padding:'12px 16px',borderBottom:`1px solid ${DS.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f8fafc'}}>
        <div style={{fontSize:12,fontWeight:700,color:'#1e293b',display:'flex',alignItems:'center',gap:7,fontFamily:DS.fontHead}}><Icon size={13} color={color} strokeWidth={2}/>{title}</div>
        {action}
      </div>
      <div style={{padding:16}}>{children}</div>
    </div>
  );
}
const inp = {padding:'10px 13px',border:`1px solid ${DS.border2}`,borderRadius:10,fontSize:13,outline:'none',width:'100%',boxSizing:'border-box',background:'#f8fafc',color:'#1e293b',fontFamily:DS.fontBody};
function Btn({children,onClick,bg,color='#fff',disabled,sm,full,danger,primary='#1f3d2b'}){
  const defBg = danger ? 'linear-gradient(135deg,#ef4444,#dc2626)' : (bg||`linear-gradient(135deg,${primary},${primary}dd)`);
  return <button onClick={onClick} disabled={disabled} style={{
    padding:sm?'6px 12px':'9px 18px', borderRadius:10, border:'none',
    background:disabled?'#f1f5f9':defBg,
    color:disabled?'#94a3b8':color,
    fontWeight:700, fontSize:sm?11:13,
    cursor:disabled?'default':'pointer',
    display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap',
    width:full?'100%':'auto', justifyContent:full?'center':'flex-start',
    fontFamily:"'DM Sans',sans-serif",
    boxShadow:disabled?'none':`0 4px 12px ${primary}30`,
    transition:'all .2s',
  }}
  onMouseEnter={e=>{ if(!disabled){ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow=`0 8px 20px ${primary}40`; }}}
  onMouseLeave={e=>{ if(!disabled){ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=`0 4px 12px ${primary}30`; }}}
  >{children}</button>;
}
function Field({label,required,children}){
  return <div><label style={{fontSize:10,color:'#94a3b8',fontWeight:700,display:'block',marginBottom:5,letterSpacing:0.5,textTransform:'uppercase'}}>{label}{required&&<span style={{color:DS.red}}> *</span>}</label>{children}</div>;
}
function Modal({title,subtitle,width=540,onClose,children}){
  return(
    <div style={{position:'fixed',inset:0,backdropFilter:'blur(12px)',background:'rgba(79,110,247,0.35)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
      <div style={{background:DS.surface,borderRadius:20,padding:26,width,maxHeight:'92vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.3)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
          <div>
            <h2 style={{margin:'0 0 3px',fontSize:17,fontWeight:800,color:'#1e293b'}}>{title}</h2>
            {subtitle&&<div style={{fontSize:11,color:'#94a3b8'}}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{border:'none',background:'#f8fafc',borderRadius:8,padding:7,cursor:'pointer',display:'flex'}}><X size={14} color="#64748b"/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Plan Selector ── */
function PlanSelector({value,onChange,showChange}){
  return(
    <div>
      {showChange&&<div style={{background:'#fef3c7',borderRadius:9,padding:'8px 12px',marginBottom:12,fontSize:11,color:'#92400e',display:'flex',alignItems:'center',gap:6}}><AlertCircle size={11}/> Al cambiar el plan se actualizan los límites automáticamente.</div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {Object.entries(PLANS).map(([k,p])=>(
          <div key={k} onClick={()=>onChange(k)} style={{border:`2px solid ${value===k?p.color:'#e2e8f0'}`,borderRadius:12,padding:'14px 12px',cursor:'pointer',background:value===k?p.bg:'#fafafa',transition:'all .15s'}}>
            <div style={{fontSize:13,fontWeight:800,color:value===k?p.color:'#475569',marginBottom:4}}>{p.label}</div>
            <div style={{fontSize:14,fontWeight:800,color:value===k?p.color:'#1e293b',marginBottom:8}}>{p.price}</div>
            {p.features.map((f,i)=><div key={i} style={{fontSize:10,color:value===k?p.color:'#94a3b8',display:'flex',alignItems:'center',gap:4,marginBottom:3}}><CheckCircle size={9} color={value===k?p.color:'#94a3b8'}/>{f}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ MODAL CREAR / EDITAR EMPRESA ══ */
function ModalEmpresa({empresa,onSave,onClose}){
  const editing = !!empresa;
  const [f,setF] = useState({
    name:empresa?.name||'', city:empresa?.city||'',
    contact_name:empresa?.contact_name||'', contact_email:empresa?.contact_email||'',
    contact_phone:empresa?.contact_phone||'', employee_count:empresa?.employee_count||'',
    plan:empresa?.plan||'starter',
    primary_color:empresa?.primary_color||'#4f6ef7'||'#4f6ef7',
    secondary_color:empresa?.secondary_color||'#3b55e0',
    sidebar_color:empresa?.sidebar_color||'#3b55e0',
    bg_color:empresa?.bg_color||'#f0f4ff',
    card_bg:empresa?.card_bg||'#ffffff',
    logo_url:empresa?.logo_url||'',
    whatsapp_number:empresa?.whatsapp_number||'',
    wa_phone_id:empresa?.wa_phone_id||'',
    wa_token:empresa?.wa_token||'',
    product_info:empresa?.product_info||'',
    bot_hora_inicio:empresa?.bot_hora_inicio??23,
    bot_hora_fin:empresa?.bot_hora_fin??4,
    bot_name:empresa?.bot_name||'Claudia',
    bot_enabled:empresa?.bot_enabled??true,
    gemini_api_key:empresa?.gemini_api_key||'',
    bot_prompt:empresa?.bot_prompt||'',
    bot_filtro_prompt:empresa?.bot_filtro_prompt||'',
    adminName:'', adminEmail:'', adminPassword:'',
  });
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  async function guardar(){
    if(!f.name){setError('El nombre es obligatorio');return;}
    if(!editing&&(!f.adminName||!f.adminEmail||!f.adminPassword)){setError('Nombre, email y contraseña del admin son obligatorios');return;}
    setLoading(true);setError('');
    try{
      const res = await apiFetch(editing?'PUT':'POST', editing?`/api/superadmin/companies/${empresa.id}`:'/api/superadmin/companies', f);
      onSave(res);
    }catch(e){setError(e.message);}
    setLoading(false);
  }

  return(
    <Modal title={editing?'Editar empresa':'Nueva empresa'} width={600} onClose={onClose}>
      {error&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:9,padding:'10px 14px',color:'#dc2626',fontSize:12,marginBottom:14}}>{error}</div>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        <div style={{gridColumn:'1/-1'}}><Field label="NOMBRE DE LA EMPRESA" required><input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="Ej: Ventas Pro S.A." style={inp}/></Field></div>
        <Field label="CIUDAD"><input value={f.city} onChange={e=>setF(p=>({...p,city:e.target.value}))} placeholder="Ciudad de México" style={inp}/></Field>
        <Field label="NO. EMPLEADOS"><input type="number" value={f.employee_count} onChange={e=>setF(p=>({...p,employee_count:e.target.value}))} style={inp}/></Field>
        <Field label="NOMBRE CONTACTO"><input value={f.contact_name} onChange={e=>setF(p=>({...p,contact_name:e.target.value}))} placeholder="Juan Pérez" style={inp}/></Field>
        <Field label="EMAIL CONTACTO"><input type="email" value={f.contact_email} onChange={e=>setF(p=>({...p,contact_email:e.target.value}))} placeholder="contacto@empresa.com" style={inp}/></Field>
        <Field label="TELÉFONO"><input value={f.contact_phone} onChange={e=>setF(p=>({...p,contact_phone:e.target.value}))} placeholder="+52 55 1234 5678" style={inp}/></Field>
        <div style={{gridColumn:'1/-1'}}>
          <div style={{fontSize:11,fontWeight:800,color:'#475569',marginBottom:12,marginTop:4,display:'flex',alignItems:'center',justifyContent:'space-between',gap:6,paddingTop:12,borderTop:'1px solid #f1f5f9'}}>
            <span style={{display:'flex',alignItems:'center',gap:6}}><Bot size={12} color="#25d366"/> Configuración Bot WhatsApp</span>
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:11,fontWeight:700,color:f.bot_enabled?'#10b981':'#94a3b8'}}>
              <div onClick={()=>setF(p=>({...p,bot_enabled:!p.bot_enabled}))} style={{width:36,height:20,borderRadius:10,background:f.bot_enabled?'#10b981':'#e2e8f0',position:'relative',cursor:'pointer',transition:'background 0.2s'}}>
                <div style={{position:'absolute',top:3,left:f.bot_enabled?18:3,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
              </div>
              {f.bot_enabled?'Bot ACTIVO':'Bot INACTIVO'}
            </label>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <Field label="NÚMERO WHATSAPP (formato +593...)" >
              <input value={f.whatsapp_number} onChange={e=>setF(p=>({...p,whatsapp_number:e.target.value}))} placeholder="+593 97 878 1756" style={inp}/>
            </Field>
            <Field label="NOMBRE DEL BOT">
              <input value={f.bot_name} onChange={e=>setF(p=>({...p,bot_name:e.target.value}))} placeholder="Claudia" style={inp}/>
            </Field>
            <Field label="WA_PHONE_ID (de Meta Developers)">
              <input value={f.wa_phone_id} onChange={e=>setF(p=>({...p,wa_phone_id:e.target.value}))} placeholder="123456789012345" style={inp}/>
            </Field>
            <Field label="WA_TOKEN (token de acceso Meta)">
              <input type="password" value={f.wa_token} onChange={e=>setF(p=>({...p,wa_token:e.target.value}))} placeholder="EAAxxxxxxxxxxxxxxx" style={inp}/>
            </Field>
            <Field label="GEMINI API KEY (IA del bot)" required>
              <input type="password" value={f.gemini_api_key} onChange={e=>setF(p=>({...p,gemini_api_key:e.target.value}))} placeholder="AIzaSy..." style={{...inp,borderColor:f.gemini_api_key?'#10b981':'#fca5a5'}}/>
            </Field>
            <Field label="HORARIO BOT — INICIO (hora 0-23)">
              <input type="number" min="0" max="23" value={f.bot_hora_inicio} onChange={e=>setF(p=>({...p,bot_hora_inicio:parseInt(e.target.value)||23}))} style={inp}/>
            </Field>
            <Field label="HORARIO BOT — FIN (hora 0-23)">
              <input type="number" min="0" max="23" value={f.bot_hora_fin} onChange={e=>setF(p=>({...p,bot_hora_fin:parseInt(e.target.value)||4}))} style={inp}/>
            </Field>
          </div>
          <Field label="DESCRIPCIÓN DEL PRODUCTO / SERVICIO (el bot usa esto para responder)">
            <textarea value={f.product_info} onChange={e=>setF(p=>({...p,product_info:e.target.value}))}
              placeholder="Describe tu producto o servicio. El bot usará esta info para responder a los clientes..."
              style={{...inp,height:70,resize:'vertical',fontFamily:'inherit'}}/>
          </Field>
          <div style={{marginTop:10,paddingTop:10,borderTop:'1px dashed #e2e8f0'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#475569',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
              <Bot size={12} color="#6366f1"/> Prompts del Bot (dejar vacío para usar el prompt por defecto)
            </div>
            <Field label="PROMPT PRINCIPAL (Claude / Gemini / DeepSeek)">
              <textarea value={f.bot_prompt} onChange={e=>setF(p=>({...p,bot_prompt:e.target.value}))}
                placeholder="Eres [nombre del bot], asesora de [empresa]. Vendes [producto]..."
                style={{...inp,height:90,resize:'vertical',fontFamily:'inherit',fontSize:11}}/>
            </Field>
            <Field label="PROMPT FILTRO (Groq — incluye tablas de precios, preguntas frecuentes)">
              <textarea value={f.bot_filtro_prompt} onChange={e=>setF(p=>({...p,bot_filtro_prompt:e.target.value}))}
                placeholder="Eres [nombre del bot], asesora de [empresa]. Productos: ..."
                style={{...inp,height:90,resize:'vertical',fontFamily:'inherit',fontSize:11,marginTop:8}}/>
            </Field>
            <div style={{background:'#f5f3ff',borderRadius:8,padding:'8px 12px',marginTop:6,border:'1px solid #c4b5fd',fontSize:10,color:'#5b21b6'}}>
              <b>Tip:</b> El Prompt Filtro lo usa Groq (modo 24/7, respuestas cortas). El Prompt Principal lo usa Claude/Gemini (análisis complejos). Si los dejas vacíos, se usa el prompt de Busimott por defecto.
            </div>
          </div>
          <div style={{background:'#f0fdf9',borderRadius:10,padding:'10px 14px',marginTop:8,border:'1px solid #a7f3d0',fontSize:11,color:'#065f46'}}>
            <b>WA_PHONE_ID y WA_TOKEN:</b> developers.facebook.com → Tu app → WhatsApp → Configuración API.<br/>
            <b>GEMINI API KEY:</b> aistudio.google.com → Get API Key → Create API Key.
          </div>
        </div>
        <div style={{gridColumn:'1/-1',background:'#f8fafc',borderRadius:12,padding:'16px',border:`1px solid ${DS.border}`}}>
          <div style={{fontSize:11,fontWeight:800,color:'#475569',marginBottom:12,display:'flex',alignItems:'center',gap:6}}><Settings size={12} color={DS.text2}/> White-label — Identidad visual</div>
          
          {/* Logo URL */}
          <div style={{marginBottom:12}}>
            <Field label="URL DEL LOGOTIPO (imagen pública)">
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input value={f.logo_url} onChange={e=>setF(p=>({...p,logo_url:e.target.value}))} placeholder="https://tu-empresa.com/logo.png" style={{...inp,flex:1}}/>
                {f.logo_url&&<img src={f.logo_url} alt="logo" onError={e=>e.target.style.display='none'} style={{width:40,height:40,objectFit:'contain',borderRadius:10,background:'transparent',padding:0}}/>}
              </div>
              <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>Sube tu logo a imgur.com o cloudinary.com y pega el link directo aquí</div>
            </Field>
          </div>

          {/* Colores - 4 campos */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <Field label="COLOR PRIMARIO (acento/botones)">
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="color" value={f.primary_color} onChange={e=>setF(p=>({...p,primary_color:e.target.value}))} style={{width:40,height:34,padding:2,border:`1px solid ${DS.border2}`,borderRadius:8,cursor:'pointer',background:'transparent'}}/>
                <input value={f.primary_color} onChange={e=>setF(p=>({...p,primary_color:e.target.value}))} style={{...inp,flex:1}}/>
              </div>
            </Field>
            <Field label="COLOR SIDEBAR (fondo menú)">
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="color" value={f.sidebar_color} onChange={e=>setF(p=>({...p,sidebar_color:e.target.value}))} style={{width:40,height:34,padding:2,border:`1px solid ${DS.border2}`,borderRadius:8,cursor:'pointer',background:'transparent'}}/>
                <input value={f.sidebar_color} onChange={e=>setF(p=>({...p,sidebar_color:e.target.value}))} style={{...inp,flex:1}}/>
              </div>
            </Field>
            <Field label="COLOR DE FONDO (página)">
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="color" value={f.bg_color} onChange={e=>setF(p=>({...p,bg_color:e.target.value}))} style={{width:40,height:34,padding:2,border:`1px solid ${DS.border2}`,borderRadius:8,cursor:'pointer',background:'transparent'}}/>
                <input value={f.bg_color} onChange={e=>setF(p=>({...p,bg_color:e.target.value}))} style={{...inp,flex:1}}/>
              </div>
            </Field>
            <Field label="COLOR TARJETAS (fondo paneles)">
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="color" value={f.card_bg} onChange={e=>setF(p=>({...p,card_bg:e.target.value}))} style={{width:40,height:34,padding:2,border:`1px solid ${DS.border2}`,borderRadius:8,cursor:'pointer',background:'transparent'}}/>
                <input value={f.card_bg} onChange={e=>setF(p=>({...p,card_bg:e.target.value}))} style={{...inp,flex:1}}/>
              </div>
            </Field>
            <Field label="COLOR SECUNDARIO (texto/detalles)">
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="color" value={f.secondary_color} onChange={e=>setF(p=>({...p,secondary_color:e.target.value}))} style={{width:40,height:34,padding:2,border:`1px solid ${DS.border2}`,borderRadius:8,cursor:'pointer',background:'transparent'}}/>
                <input value={f.secondary_color} onChange={e=>setF(p=>({...p,secondary_color:e.target.value}))} style={{...inp,flex:1}}/>
              </div>
            </Field>
          </div>

          {/* Preview del sidebar */}
          <div style={{fontSize:10,color:'#94a3b8',marginBottom:6,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5}}>Vista previa</div>
          <div style={{display:'flex',gap:0,borderRadius:10,overflow:'hidden',border:`1px solid ${DS.border}`,height:80}}>
            {/* Mini sidebar */}
            <div style={{width:110,background:f.sidebar_color,padding:'8px 8px',display:'flex',flexDirection:'column',gap:5}}>
              <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:4}}>
                {f.logo_url
                  ? <img src={f.logo_url} alt="" onError={e=>e.target.style.display='none'} style={{width:18,height:18,objectFit:'contain',borderRadius:4,background:'transparent'}}/>
                  : <div style={{width:18,height:18,borderRadius:4,background:f.primary_color,display:'flex',alignItems:'center',justifyContent:'center'}}><Bot size={9} color="#fff"/></div>
                }
                <div style={{fontSize:8,fontWeight:800,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name||'Empresa'}</div>
              </div>
              {['Dashboard','Clientes','Mensajes'].map((item,i)=>(
                <div key={i} style={{padding:'3px 6px',borderRadius:5,background:i===0?`${f.primary_color}30`:'transparent',borderLeft:i===0?`2px solid ${f.primary_color}`:'2px solid transparent',fontSize:7,color:i===0?'#fff':'rgba(255,255,255,0.4)',fontWeight:i===0?700:400}}>{item}</div>
              ))}
            </div>
            {/* Mini content */}
            <div style={{flex:1,background:f.bg_color,padding:'8px 10px'}}>
              <div style={{fontSize:8,fontWeight:700,color:'#4a5568',marginBottom:6}}>{f.name||'Empresa'}</div>
              <div style={{display:'flex',gap:5}}>
                {['Clientes','Ventas','Leads'].map((s,i)=>(
                  <div key={i} style={{flex:1,background:i===0?f.primary_color:'rgba(255,255,255,0.05)',borderRadius:5,padding:'4px 5px',textAlign:'center'}}>
                    <div style={{fontSize:9,fontWeight:800,color:'#fff'}}>{i===0?'24':'—'}</div>
                    <div style={{fontSize:6,color:'rgba(255,255,255,0.5)'}}>{s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{gridColumn:'1/-1'}}><Field label="PLAN"><PlanSelector value={f.plan} onChange={v=>setF(p=>({...p,plan:v}))} showChange={editing}/></Field></div>
      </div>
      {!editing&&(
        <div style={{background:'#f5f7fb',borderRadius:12,padding:'16px',marginBottom:16,border:'1px solid #c7d2fe'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#4338ca',marginBottom:12,display:'flex',alignItems:'center',gap:6}}><Shield size={13}/> Administrador de la empresa</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div style={{gridColumn:'1/-1'}}><Field label="NOMBRE DEL ADMIN" required><input value={f.adminName} onChange={e=>setF(p=>({...p,adminName:e.target.value}))} placeholder="Nombre completo" style={inp}/></Field></div>
            <Field label="EMAIL DEL ADMIN" required><input type="email" value={f.adminEmail} onChange={e=>setF(p=>({...p,adminEmail:e.target.value}))} placeholder="admin@empresa.com" style={inp}/></Field>
            <Field label="CONTRASEÑA" required><input type="password" value={f.adminPassword} onChange={e=>setF(p=>({...p,adminPassword:e.target.value}))} placeholder="Mínimo 6 caracteres" style={inp}/></Field>
          </div>
        </div>
      )}
      <div style={{display:'flex',gap:10}}>
        <button onClick={onClose} style={{flex:1,padding:'11px',borderRadius:10,border:`1px solid ${DS.border2}`,background:'#f8fafc',color:'#94a3b8',fontWeight:700,cursor:'pointer'}}>Cancelar</button>
        <Btn onClick={guardar} primary='#4f6ef7' disabled={loading} bg='#4f6ef7'><Save size={14}/>{loading?'Guardando...':editing?'Guardar cambios':'Crear empresa'}</Btn>
      </div>
    </Modal>
  );
}

/* ══ PESTAÑA EMPRESAS ══ */
function TabEmpresas({companies,onRefresh}){
  const [search,setSearch]=useState('');
  const [modalNew,setModalNew]=useState(false);
  const [modalEdit,setModalEdit]=useState(null);
  const [detalle,setDetalle]=useState(null);

  const filtradas = companies.filter(c=>
    c.name?.toLowerCase().includes(search.toLowerCase())||
    (c.city||'').toLowerCase().includes(search.toLowerCase())||
    (c.contact_email||'').toLowerCase().includes(search.toLowerCase())
  );

  function eliminar(id,name){
    askConfirm(`¿Eliminar "${name}" y TODOS sus datos? Esta acción no se puede deshacer.`, async ()=>{
      try{await apiFetch('DELETE',`/api/superadmin/companies/${id}`);onRefresh();}
      catch(e){alert('Error: '+e.message);}
    });
  }

  return(
    <>
      {modalNew&&<ModalEmpresa onSave={()=>{onRefresh();setModalNew(false);}} onClose={()=>setModalNew(false)}/>}
      {modalEdit&&<ModalEmpresa empresa={modalEdit} onSave={()=>{onRefresh();setModalEdit(null);}} onClose={()=>setModalEdit(null)}/>}
      {detalle&&<ModalDetalleEmpresa empresa={detalle} onClose={()=>setDetalle(null)} onRefresh={()=>{onRefresh();setDetalle(null);}}/>}

      <div style={{display:'flex',gap:10,marginBottom:16,alignItems:'center'}}>
        <div style={{position:'relative',flex:1,maxWidth:400}}>
          <Search size={13} color="#94a3b8" style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, ciudad o email..." style={{...inp,paddingLeft:32}}/>
        </div>
        <div style={{flex:1}}/>
        <Btn onClick={onRefresh} bg="#f1f5f9" color="#64748b" sm><RefreshCw size={12}/> Actualizar</Btn>
        <Btn onClick={()=>setModalNew(true)} primary='#4f6ef7' bg='#4f6ef7'><Plus size={14}/> Nueva empresa</Btn>
      </div>

      {filtradas.length===0?(
        <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
          <Building2 size={44} color="#e2e8f0" style={{marginBottom:12}}/>
          <div style={{fontSize:15,fontWeight:700,color:'#1e293b',marginBottom:6}}>Sin empresas registradas</div>
          <div style={{fontSize:13,marginBottom:16}}>Crea la primera empresa con el botón "Nueva empresa"</div>
          <Btn onClick={()=>setModalNew(true)} primary='#4f6ef7' bg='#4f6ef7' full><Plus size={14}/> Nueva empresa</Btn>
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'repeat(2,1fr)',gap:14}}>
          {filtradas.map(c=>{
            const st=STATUS_CFG[c.status||'active']||STATUS_CFG.active;
            const plan=PLANS[c.plan]||PLANS.starter;
            return(
              <div key={c.id} style={{background:DS.surface,borderRadius:16,border:`1px solid ${DS.border}`,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.03)'}}>
                <div style={{background:c.secondary_color||'#0f172a',padding:'14px 18px',display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:40,height:40,borderRadius:10,background:c.logo_url?'transparent':(c.primary_color||'#4f6ef7'),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                    {c.logo_url
                      ? <img src={c.logo_url} alt={c.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:40,height:40,objectFit:'contain',background:'transparent'}}/>
                      : null
                    }
                    <Building2 size={18} color="#fff" style={{display:c.logo_url?'none':'block'}}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:800,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                    <div style={{fontSize:10,color:c.primary_color||'#4f6ef7'||'#4f6ef7',fontWeight:600}}>{c.city||'Sin ciudad'} · {c.contact_email||'—'}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end'}}>
                    <Bdg l={st.l} c={st.c} b="rgba(255,255,255,0.15)"/>
                    <Bdg l={`${plan.label} · ${plan.price}`} c="#fff" b="rgba(255,255,255,0.12)"/>
                  </div>
                </div>
                <div style={{padding:'14px 18px'}}>
                  <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:8,marginBottom:12}}>
                    {[{l:'Usuarios',v:c.total_users||0,c:'#4f6ef7'},{l:'Clientes',v:c.total_clients||0,c:'#10b981'},{l:'Leads',v:c.total_leads||0,c:'#ef4444'},{l:'Bots',v:c.total_bots||0,c:'#f59e0b'}].map((s,i)=>(
                      <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'7px 0'}}>
                        <div style={{fontSize:16,fontWeight:800,color:s.c}}>{s.v}</div>
                        <div style={{fontSize:9,color:'#94a3b8'}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:7,marginBottom:10}}>
                    {[{l:'Asesores',v:c.advisors||0,max:c.max_advisors||12,c:'#4f6ef7'},{l:'Supervisores',v:c.supervisors||0,max:c.max_supervisors||1,c:'#f59e0b'}].map((s,i)=>{
                      const pct=s.max>=9999?20:Math.min((s.v/s.max)*100,100);
                      const over=s.max<9999&&s.v>s.max;
                      return(
                        <div key={i} style={{flex:1,background:plan.bg,borderRadius:8,padding:'8px 10px'}}>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3}}>
                            <span style={{fontWeight:600,color:'#475569'}}>{s.l}</span>
                            <span style={{fontWeight:800,color:over?'#ef4444':s.c}}>{s.v}/{s.max>=9999?'∞':s.max}</span>
                          </div>
                          <div style={{background:'#e2e8f0',borderRadius:999,height:4,overflow:'hidden'}}>
                            <div style={{width:`${pct}%`,height:'100%',background:over?'#ef4444':s.c,borderRadius:999}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {c.status==='suspended'&&<div style={{background:'#fef2f2',borderRadius:8,padding:'7px 10px',marginBottom:10,fontSize:11,color:'#dc2626',display:'flex',alignItems:'center',gap:5}}><Lock size={11}/> Suspendido: {c.suspension_reason||'—'}</div>}
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>setDetalle(c)} style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:'rgba(79,110,247,0.10)',color:'#4f6ef7',fontWeight:700,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><Eye size={11}/> Ver detalle</button>
                    <button onClick={()=>setModalEdit(c)} style={{padding:'8px 10px',borderRadius:8,border:'none',background:'#fef3c7',cursor:'pointer',display:'flex'}} title="Editar"><Edit2 size={12} color="#d97706"/></button>
                    <button onClick={()=>eliminar(c.id,c.name)} style={{padding:'8px 10px',borderRadius:8,border:'none',background:'#fef2f2',cursor:'pointer',display:'flex'}} title="Eliminar"><Trash2 size={12} color="#ef4444"/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ══ MODAL DETALLE EMPRESA ══ */
function ModalDetalleEmpresa({empresa,onClose,onRefresh}){
  const [tab,setTab]=useState('info');
  const [users,setUsers]=useState([]);
  const [limits,setLimits]=useState({});
  const [loading,setLoad]=useState(false);
  const [newU,setNewU]=useState({name:'',email:'',password:'',role:'advisor',phone:''});
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState('');
  const [suspend,setSuspend]=useState(false);
  const [reason,setReason]=useState('');
  const [leads,setLeads]=useState([]);
  const [clients,setClients]=useState([]);
  const [resetPwd,setResetPwd]=useState(null);
  const [newPwd,setNewPwd]=useState('');
  const [pwdMsg,setPwdMsg]=useState('');

  const st=STATUS_CFG[empresa.status||'active']||STATUS_CFG.active;
  const plan=PLANS[empresa.plan]||PLANS.starter;

  useEffect(()=>{
    setLoad(true);
    apiFetch('GET',`/api/superadmin/companies/${empresa.id}/users`)
      .then(r=>{setUsers(r.users||r||[]);setLimits(r.limits||{});})
      .catch(()=>{}).finally(()=>setLoad(false));
    apiFetch('GET',`/api/superadmin/companies/${empresa.id}/leads`).then(r=>setLeads(Array.isArray(r)?r:[])).catch(()=>{});
    apiFetch('GET',`/api/superadmin/companies/${empresa.id}/clients`).then(r=>setClients(Array.isArray(r)?r:[])).catch(()=>{});
  },[empresa.id]);

  async function crearU(){
    if(!newU.name||!newU.email||!newU.password){setMsg('Completa todos los campos');return;}
    setSaving(true);setMsg('');
    try{const r=await apiFetch('POST',`/api/superadmin/companies/${empresa.id}/users`,newU);setUsers(p=>[...p,r]);setNewU({name:'',email:'',password:'',role:'advisor',phone:''});setMsg('✅ Usuario creado');}
    catch(e){setMsg('❌ '+e.message);}
    setSaving(false);
  }
  function elimU(id){askConfirm('Este usuario será eliminado permanentemente.', async()=>{try{await apiFetch('DELETE',`/api/superadmin/users/${id}`);setUsers(p=>p.filter(u=>u.id!==id));}catch(e){setMsg('❌ '+e.message);}});}
  async function doResetPwd(){
    if(!newPwd||newPwd.length<6){setPwdMsg('Minimo 6 caracteres');return;}
    try{
      await apiFetch('PUT',`/api/superadmin/users/${resetPwd.id}/reset-password`,{password:newPwd});
      setPwdMsg('✅ Contraseña actualizada');
      setTimeout(()=>{setResetPwd(null);setNewPwd('');setPwdMsg('');},1500);
    }catch(e){setPwdMsg('❌ '+e.message);}
  }
  async function cambiarEstado(s){
    try{
      await apiFetch('PUT',`/api/superadmin/companies/${empresa.id}`,{status:s,suspension_reason:s==='suspended'?reason:null,suspended_at:s==='suspended'?new Date().toISOString():null});
      setSuspend(false);onRefresh();
    }catch(e){setMsg('❌ '+e.message);}
  }

  const advisors=users.filter(u=>u.role==='advisor'||u.role==='asesor');
  const supervisors=users.filter(u=>u.role==='supervisor');

  const TABS=[{k:'info',l:'Información',Ic:Building2},{k:'usuarios',l:'Usuarios',Ic:Users},{k:'leads',l:'Leads',Ic:TrendingUp},{k:'clientes',l:'Clientes',Ic:Users},{k:'servicio',l:'Servicio & Plan',Ic:Settings}];

  return(
    <Modal title={empresa.name} subtitle={`Plan: ${plan.label} · ${st.l}`} width={700} onClose={onClose}>
      <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
        <Bdg l={st.l} c={st.c} b={st.b}/>
        <Bdg l={plan.label} c={plan.color} b={plan.bg}/>
        <Bdg l={plan.price} c={plan.color} b={plan.bg}/>
        {empresa.city&&<span style={{fontSize:11,color:'#94a3b8'}}>📍{empresa.city}</span>}
      </div>
      <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:`1px solid ${DS.border}`,paddingBottom:8}}>
        {TABS.map(t=><button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'7px 14px',borderRadius:8,border:'none',fontSize:12,fontWeight:700,cursor:'pointer',background:tab===t.k?DS.primary:'transparent',color:tab===t.k?'#fff':'#64748b',display:'flex',alignItems:'center',gap:5}}><t.Ic size={11}/>{t.l}</button>)}
      </div>
      {msg&&<div style={{padding:'8px 12px',borderRadius:8,background:msg.startsWith('✅')?'#d1fae5':'#fee2e2',color:msg.startsWith('✅')?'#065f46':'#dc2626',fontSize:12,marginBottom:12}}>{msg}</div>}

      {tab==='info'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[{l:'Nombre',v:empresa.name},{l:'Ciudad',v:empresa.city||'—'},{l:'Contacto',v:empresa.contact_name||'—'},{l:'Email',v:empresa.contact_email||'—'},{l:'Teléfono',v:empresa.contact_phone||'—'},{l:'Empleados',v:empresa.employee_count||'—'},{l:'WhatsApp',v:empresa.whatsapp_number||'—'},{l:'Creada',v:new Date(empresa.created_at).toLocaleDateString('es-MX')}].map((fi,i)=>(
            <div key={i} style={{background:'#f8fafc',borderRadius:9,padding:'9px 12px'}}><div style={{fontSize:9,color:'#94a3b8',fontWeight:700}}>{fi.l}</div><div style={{fontSize:12,fontWeight:700,color:'#1e293b',marginTop:3}}>{fi.v}</div></div>
          ))}
          <div style={{gridColumn:'1/-1',background:plan.bg,borderRadius:12,padding:'14px',border:`1px solid ${plan.color}33`}}>
            <div style={{fontSize:11,fontWeight:800,color:plan.color,marginBottom:10}}>Límites del plan {plan.label}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[{l:'Asesores',actual:advisors.length,max:empresa.max_advisors||12,c:'#4f6ef7'},{l:'Supervisores',actual:supervisors.length,max:empresa.max_supervisors||1,c:'#f59e0b'}].map((s,i)=>{
                const pct=s.max>=9999?20:Math.min((s.actual/s.max)*100,100);
                const over=s.max<9999&&s.actual>s.max;
                return(
                  <div key={i} style={{background:DS.surface,borderRadius:10,padding:'12px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:11,fontWeight:700,color:'#475569'}}>{s.l}</span><span style={{fontSize:12,fontWeight:800,color:over?'#ef4444':s.c}}>{s.actual}/{s.max>=9999?'∞':s.max}</span></div>
                    <div style={{background:'#f8fafc',borderRadius:999,height:6,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:over?'#ef4444':s.c,borderRadius:999}}/></div>
                    {over&&<div style={{fontSize:9,color:'#ef4444',marginTop:3}}>⚠️ Excede el límite del plan</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab==='usuarios'&&!loading&&(
        <div>
          <div style={{background:'#f5f7fb',borderRadius:12,padding:'14px',marginBottom:14,border:'1px solid #c7d2fe'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#4338ca',marginBottom:10}}>➕ Crear usuario</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
              <input value={newU.name} onChange={e=>setNewU(p=>({...p,name:e.target.value}))} placeholder="Nombre *" style={inp}/>
              <input type="email" value={newU.email} onChange={e=>setNewU(p=>({...p,email:e.target.value}))} placeholder="Email *" style={inp}/>
              <input type="password" value={newU.password} onChange={e=>setNewU(p=>({...p,password:e.target.value}))} placeholder="Contraseña *" style={inp}/>
              <input value={newU.phone} onChange={e=>setNewU(p=>({...p,phone:e.target.value}))} placeholder="Teléfono (opcional)" style={inp}/>
              <select value={newU.role} onChange={e=>setNewU(p=>({...p,role:e.target.value}))} style={{...inp,gridColumn:'1/-1'}}>
                <option value="admin">Administrador</option>
                <option value="supervisor">Supervisor</option>
                <option value="advisor">Asesor</option>
              </select>
            </div>
            <Btn onClick={crearU} disabled={saving} bg="#4338ca"><UserPlus size={13}/>{saving?'Creando...':'Crear usuario'}</Btn>
          </div>
          <div style={{background:DS.surface,borderRadius:12,border:`1px solid ${DS.border}`,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:'#f8fafc'}}>{['Nombre','Email','Rol','Estado','Creado',''].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
              <tbody>
                {users.map(u=>{const rc={admin:{c:'#4f6ef7',b:'rgba(79,110,247,0.18)'},supervisor:{c:'#f59e0b',b:'#fef3c7'},advisor:{c:'#10b981',b:'#d1fae5'},asesor:{c:'#10b981',b:'#d1fae5'}}[u.role]||{c:'#94a3b8',b:'#f1f5f9'};return(
                  <tr key={u.id} style={{borderTop:'1px solid #f8fafc'}}>
                    <td style={{padding:'9px 12px',fontSize:12,fontWeight:700,color:'#1e293b'}}>{u.name}</td>
                    <td style={{padding:'9px 12px',fontSize:11,color:'#94a3b8'}}>{u.email}</td>
                    <td style={{padding:'9px 12px'}}><Bdg l={u.role} c={rc.c} b={rc.b}/></td>
                    <td style={{padding:'9px 12px',display:'flex',flexDirection:'column',gap:3}}>
                      <Bdg l={u.status||'active'} c={u.status==='active'?'#10b981':'#ef4444'} b={u.status==='active'?'#d1fae5':'#fee2e2'}/>
                      {u.locked_until&&new Date(u.locked_until)>new Date()&&<Bdg l="Bloqueada" c="#ef4444" b="#fee2e2"/>}
                      {u.force_password_change&&<Bdg l="Cambio pendiente" c="#f59e0b" b="#fef3c7"/>}
                    </td>
                    <td style={{padding:'9px 12px',fontSize:10,color:'#94a3b8'}}>{new Date(u.created_at).toLocaleDateString('es-MX')}</td>
                    <td style={{padding:'9px 12px',display:'flex',gap:4}}>
                    <button onClick={()=>{setResetPwd(u);setNewPwd('');setPwdMsg('');}} title="Resetear contraseña" style={{padding:'4px 8px',borderRadius:7,border:'none',background:'#fef3c7',cursor:'pointer',display:'flex'}}><Lock size={11} color="#f59e0b"/></button>
                    <button onClick={()=>elimU(u.id)} style={{padding:'4px 8px',borderRadius:7,border:'none',background:'#fef2f2',cursor:'pointer',display:'flex'}}><Trash2 size={11} color="#ef4444"/></button>
                    </td>
                  </tr>
                );})}
                {!users.length&&<tr><td colSpan={6} style={{padding:20,textAlign:'center',color:'#94a3b8',fontSize:12}}>Sin usuarios</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {resetPwd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{background:'#fff',borderRadius:16,padding:24,width:340,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:14,fontWeight:800,marginBottom:4}}>Resetear contraseña</div>
            <div style={{fontSize:12,color:'#94a3b8',marginBottom:14}}>{resetPwd.name} ({resetPwd.email})</div>
            {pwdMsg&&<div style={{padding:'6px 10px',borderRadius:7,background:pwdMsg.startsWith('✅')?'#d1fae5':'#fee2e2',color:pwdMsg.startsWith('✅')?'#065f46':'#dc2626',fontSize:12,marginBottom:10}}>{pwdMsg}</div>}
            <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="Nueva contraseña (min. 6)" style={{...inp,marginBottom:10,display:'block'}}/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setResetPwd(null)} style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:'#f1f5f9',cursor:'pointer',fontSize:12,fontWeight:700}}>Cancelar</button>
              <button onClick={doResetPwd} style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:'#1e293b',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700}}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {tab==='leads'&&(
        <div style={{background:CB,borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'10px 14px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:700,color:'#475569',display:'flex',justifyContent:'space-between'}}>
            <span>Leads de {empresa.name}</span>
            <span style={{color:'#94a3b8'}}>{leads.length} total</span>
          </div>
          {leads.length===0?<div style={{padding:24,textAlign:'center',color:'#94a3b8',fontSize:12}}>Sin leads aun</div>:(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc'}}>{['Nombre','Telefono','Nivel','Score','Asesor','Fecha'].map(h=><th key={h} style={{padding:'8px 12px',fontSize:10,fontWeight:700,color:'#94a3b8',textAlign:'left'}}>{h}</th>)}</tr></thead>
            <tbody>{leads.map((l,i)=>{
              const nc={caliente:{c:'#ef4444',b:'#fff5f5'},tibio:{c:'#f59e0b',b:'#fffbeb'},frio:{c:'#4f6ef7',b:'#f0f1ff'}}[l.nivel]||{c:'#94a3b8',b:'#f1f5f9'};
              return(<tr key={i} style={{borderTop:'1px solid #f8fafc'}}>
                <td style={{padding:'8px 12px',fontSize:12,fontWeight:600}}>{l.nombre||'—'}</td>
                <td style={{padding:'8px 12px',fontSize:11,color:'#94a3b8'}}>{l.telefono||'—'}</td>
                <td style={{padding:'8px 12px'}}><span style={{background:nc.b,color:nc.c,padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700,textTransform:'capitalize'}}>{l.nivel||'frio'}</span></td>
                <td style={{padding:'8px 12px',fontSize:12,fontWeight:700,color:'#1e293b'}}>{l.score||0}</td>
                <td style={{padding:'8px 12px',fontSize:11,color:'#94a3b8'}}>{l.asesor_nombre||'Sin asignar'}</td>
                <td style={{padding:'8px 12px',fontSize:10,color:'#94a3b8'}}>{l.created_at?new Date(l.created_at).toLocaleDateString('es-EC'):'—'}</td>
              </tr>);
            })}</tbody>
          </table>)}
        </div>
      )}

      {tab==='clientes'&&(
        <div style={{background:CB,borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'10px 14px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:700,color:'#475569',display:'flex',justifyContent:'space-between'}}>
            <span>Clientes de {empresa.name}</span>
            <span style={{color:'#94a3b8'}}>{clients.length} total</span>
          </div>
          {clients.length===0?<div style={{padding:24,textAlign:'center',color:'#94a3b8',fontSize:12}}>Sin clientes aun</div>:(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc'}}>{['Nombre','Telefono','Email','Estado','Asesor','Fecha'].map(h=><th key={h} style={{padding:'8px 12px',fontSize:10,fontWeight:700,color:'#94a3b8',textAlign:'left'}}>{h}</th>)}</tr></thead>
            <tbody>{clients.map((c,i)=>(
              <tr key={i} style={{borderTop:'1px solid #f8fafc'}}>
                <td style={{padding:'8px 12px',fontSize:12,fontWeight:600}}>{c.name||'—'}</td>
                <td style={{padding:'8px 12px',fontSize:11,color:'#94a3b8'}}>{c.phone||'—'}</td>
                <td style={{padding:'8px 12px',fontSize:11,color:'#94a3b8'}}>{c.email||'—'}</td>
                <td style={{padding:'8px 12px'}}><span style={{background:'#d1fae5',color:'#065f46',padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700}}>{c.classification||'activo'}</span></td>
                <td style={{padding:'8px 12px',fontSize:11,color:'#94a3b8'}}>{c.asesor_nombre||'Sin asignar'}</td>
                <td style={{padding:'8px 12px',fontSize:10,color:'#94a3b8'}}>{c.created_at?new Date(c.created_at).toLocaleDateString('es-EC'):'—'}</td>
              </tr>
            ))}</tbody>
          </table>)}
        </div>
      )}

      {tab==='servicio'&&(
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:DS.surface,borderRadius:12,border:`2px solid ${st.c}`,padding:'16px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}><st.Ic size={20} color={st.c}/><div style={{fontSize:14,fontWeight:800,color:st.c}}>{st.l}</div></div>
            {empresa.suspension_reason&&<div style={{fontSize:11,color:'#94a3b8'}}>Motivo: {empresa.suspension_reason}</div>}
          </div>
          {empresa.status==='active'?(
            !suspend?(
              <Btn onClick={()=>setSuspend(true)} bg="#ef4444"><Lock size={13}/> Suspender por falta de pago</Btn>
            ):(
              <div>
                <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo de suspensión..." rows={3} style={{...inp,resize:'none',marginBottom:10}}/>
                <div style={{display:'flex',gap:8}}>
                  <Btn onClick={()=>setSuspend(false)} bg="#f1f5f9" color="#64748b" sm>Cancelar</Btn>
                  <Btn onClick={()=>cambiarEstado('suspended')} bg="#ef4444" sm><Lock size={11}/> Confirmar</Btn>
                </div>
              </div>
            )
          ):(
            <div style={{display:'flex',gap:8}}>
              <Btn onClick={()=>cambiarEstado('active')} bg="#10b981"><CheckCircle size={13}/> Reactivar</Btn>
              <Btn onClick={()=>cambiarEstado('cancelled')} bg="#94a3b8" sm><XCircle size={11}/> Cancelar definitivamente</Btn>
            </div>
          )}
          <div style={{background:'#f0fdf4',borderRadius:12,padding:'14px',border:'1px solid #bbf7d0'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#166534',marginBottom:8}}>💳 Próximo pago</div>
            <input type="date" defaultValue={empresa.next_payment||''} onChange={e=>apiFetch('PUT',`/api/superadmin/companies/${empresa.id}`,{next_payment:e.target.value}).catch(()=>{})} style={{...inp,maxWidth:200}}/>
          </div>
          <div style={{background:'#f5f7fb',borderRadius:12,padding:'14px',border:'1px solid #c7d2fe'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#4338ca',marginBottom:10}}>📋 Cambiar plan</div>
            <PlanSelector value={empresa.plan} onChange={async v=>{try{await apiFetch('PUT',`/api/superadmin/companies/${empresa.id}`,{plan:v});onRefresh();}catch(e){setMsg('❌ '+e.message);}}} showChange={true}/>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ══ PESTAÑA BOTS ══ */
function TabBots({bots,onRefresh}){
  const [detBot,setDetBot]=useState(null);
  const [activity,setActivity]=useState([]);
  const [loadAct,setLoadAct]=useState(false);

  async function verActividad(bot){
    setDetBot(bot);setLoadAct(true);
    try{const r=await apiFetch('GET',`/api/superadmin/bots/${bot.id}/activity`);setActivity(Array.isArray(r)?r:[]);}
    catch(e){setActivity([]);}
    setLoadAct(false);
  }
  async function toggleBot(bot,status){
    try{await apiFetch('PUT',`/api/superadmin/bots/${bot.id}`,{status});onRefresh();}
    catch(e){alert(e.message);}
  }

  const BOT_ACTS={message_in:{l:'Mensaje recibido',c:'#4f6ef7'},message_out:{l:'Mensaje enviado',c:'#10b981'},lead_created:{l:'Lead creado',c:'#f59e0b'},lead_converted:{l:'Convertido',c:'#10b981'},lead_lost:{l:'Lead perdido',c:'#ef4444'},bot_started:{l:'Bot iniciado',c:'#4f6ef7'},bot_stopped:{l:'Bot detenido',c:'#94a3b8'}};

  return(
    <>
      {detBot&&(
        <Modal title={`Bot — ${detBot.company_name}`} subtitle={detBot.whatsapp_number||'Sin número'} width={640} onClose={()=>setDetBot(null)}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
            {[{l:'Mensajes',v:detBot.total_messages||0,c:'#4f6ef7',Ic:MessageCircle},{l:'Leads',v:detBot.total_leads||0,c:'#f59e0b',Ic:Users},{l:'Convertidos',v:detBot.total_converted||0,c:'#10b981',Ic:CheckCircle},{l:'Conv %',v:`${detBot.total_leads>0?Math.round((detBot.total_converted/detBot.total_leads)*100):0}%`,c:'#8b5cf6',Ic:TrendingUp}].map((s,i)=>(
              <div key={i} style={{background:'#f8fafc',borderRadius:11,padding:'12px',textAlign:'center',borderTop:`3px solid ${s.c}`}}>
                <s.Ic size={16} color={s.c} style={{margin:'0 auto 6px'}}/>
                <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'center'}}>
            <Bdg l={(BOT_STATUS[detBot.status]||BOT_STATUS.inactive).l} c={(BOT_STATUS[detBot.status]||BOT_STATUS.inactive).c} b={(BOT_STATUS[detBot.status]||BOT_STATUS.inactive).b}/>
            {detBot.last_activity&&<span style={{fontSize:10,color:'#94a3b8'}}>Última actividad: {new Date(detBot.last_activity).toLocaleString('es-MX')}</span>}
            <div style={{flex:1}}/>
            {detBot.status==='active'?<Btn onClick={()=>toggleBot(detBot,'paused')} bg="#f59e0b" sm><Lock size={11}/> Pausar</Btn>:<Btn onClick={()=>toggleBot(detBot,'active')} bg="#10b981" sm><CheckCircle size={11}/> Activar</Btn>}
          </div>
          <div style={{background:DS.surface,borderRadius:12,border:`1px solid ${DS.border}`,overflow:'hidden'}}>
            <div style={{padding:'11px 14px',borderBottom:`1px solid ${DS.border}`,fontSize:12,fontWeight:700,color:'#1e293b',display:'flex',alignItems:'center',gap:6}}><Activity size={12} color='#4f6ef7'/> Logs de actividad</div>
            {loadAct&&<div style={{padding:20,textAlign:'center',color:'#94a3b8',fontSize:12}}>Cargando logs...</div>}
            {!loadAct&&activity.length===0&&<div style={{padding:24,textAlign:'center',color:'#94a3b8',fontSize:12}}>Sin actividad registrada aún. Los logs aparecerán cuando el bot esté activo y recibiendo mensajes.</div>}
            {activity.slice(0,30).map(a=>{const cfg=BOT_ACTS[a.type]||{l:a.type,c:'#94a3b8'};return(
              <div key={a.id} style={{display:'flex',gap:10,padding:'9px 14px',borderBottom:`1px solid ${DS.border}`,alignItems:'center'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:cfg.c,flexShrink:0}}/>
                <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:'#475569'}}>{cfg.l}</div>{a.description&&<div style={{fontSize:10,color:'#94a3b8'}}>{a.description}</div>}{a.phone&&<div style={{fontSize:10,color:'#94a3b8'}}>{a.phone}</div>}</div>
                <div style={{fontSize:9,color:'#94a3b8',flexShrink:0}}>{new Date(a.created_at).toLocaleString('es-MX',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            );})}
          </div>
        </Modal>
      )}

      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[{l:'Total bots',v:bots.length,c:'#4f6ef7',Ic:Bot},{l:'Activos',v:bots.filter(b=>b.status==='active').length,c:'#10b981',Ic:CheckCircle},{l:'Inactivos',v:bots.filter(b=>b.status==='inactive').length,c:'#94a3b8',Ic:XCircle},{l:'Con error',v:bots.filter(b=>b.status==='error').length,c:'#ef4444',Ic:AlertCircle}].map((s,i)=>(
          <div key={i} style={{background:DS.surface,borderRadius:14,padding:'14px 16px',border:`1px solid ${DS.border}`,borderTop:`3px solid ${s.c}`,display:'flex',gap:10,alignItems:'center'}}>
            <div style={{width:36,height:36,borderRadius:10,background:`${s.c}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><s.Ic size={16} color={s.c}/></div>
            <div><div style={{fontSize:20,fontWeight:800,color:'#1e293b'}}>{s.v}</div><div style={{fontSize:10,color:'#94a3b8'}}>{s.l}</div></div>
          </div>
        ))}
      </div>

      {bots.length===0?(
        <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
          <Bot size={44} color="#e2e8f0" style={{marginBottom:12}}/>
          <div style={{fontSize:14,fontWeight:700,color:'#1e293b',marginBottom:6}}>Sin bots configurados</div>
          <div style={{fontSize:12}}>Los bots se configuran al asignar un número de WhatsApp a cada empresa.</div>
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'repeat(2,1fr)',gap:12}}>
          {bots.map(b=>{
            const bs=BOT_STATUS[b.status]||BOT_STATUS.inactive;
            const conv=b.total_leads>0?Math.round((b.total_converted/b.total_leads)*100):0;
            return(
              <div key={b.id} style={{background:DS.surface,borderRadius:14,border:`1px solid ${DS.border}`,overflow:'hidden'}}>
                <div style={{padding:'14px 18px',borderBottom:`1px solid ${DS.border}`,display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:38,height:38,borderRadius:10,background:`${bs.c}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Bot size={18} color={bs.c}/></div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>{b.company_name}</div>
                    <div style={{fontSize:11,color:'#94a3b8'}}>{b.whatsapp_number||'Sin número configurado'}</div>
                  </div>
                  <Bdg l={bs.l} c={bs.c} b={bs.b}/>
                </div>
                <div style={{padding:'14px 18px'}}>
                  <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(4,1fr)',gap:8,marginBottom:12}}>
                    {[{l:'Mensajes',v:b.total_messages||0,c:'#4f6ef7'},{l:'Leads',v:b.total_leads||0,c:'#f59e0b'},{l:'Convertidos',v:b.total_converted||0,c:'#10b981'},{l:'Conv%',v:`${conv}%`,c:'#8b5cf6'}].map((s,i)=>(
                      <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 0'}}>
                        <div style={{fontSize:14,fontWeight:800,color:s.c}}>{s.v}</div>
                        <div style={{fontSize:9,color:'#94a3b8'}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  {b.last_activity&&<div style={{fontSize:10,color:'#94a3b8',marginBottom:10,display:'flex',alignItems:'center',gap:4}}><Clock size={9}/> {new Date(b.last_activity).toLocaleString('es-MX')}</div>}
                  <button onClick={()=>verActividad(b)} style={{width:'100%',padding:'8px',borderRadius:8,border:'none',background:'rgba(79,110,247,0.10)',color:'#4f6ef7',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><Eye size={12}/> Ver logs de actividad</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ══ PESTAÑA SERVICIOS (Suspender/Activar) ══ */
function TabServicios({companies,onRefresh}){
  const activas=companies.filter(c=>(c.status||'active')==='active');
  const suspendidas=companies.filter(c=>c.status==='suspended');
  const canceladas=companies.filter(c=>c.status==='cancelled');

  async function cambiarEstado(id,status,reason=''){
    try{await apiFetch('PUT',`/api/superadmin/companies/${id}`,{status,suspension_reason:status==='suspended'?reason:null,suspended_at:status==='suspended'?new Date().toISOString():null});onRefresh();}
    catch(e){alert(e.message);}
  }

  const EmpCard=({c})=>{
    const [showReason,setShowReason]=useState(false);
    const [reason,setReason]=useState('');
    const st=STATUS_CFG[c.status||'active']||STATUS_CFG.active;
    const plan=PLANS[c.plan]||PLANS.starter;
    return(
      <div style={{background:DS.surface,borderRadius:14,border:`1px solid ${st.c}33`,padding:'16px 18px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>{c.name}</div>
            <div style={{fontSize:11,color:'#94a3b8'}}>{c.contact_email||'Sin email'} · {plan.label}</div>
            {c.suspension_reason&&<div style={{fontSize:10,color:'#ef4444',marginTop:3}}>Motivo: {c.suspension_reason}</div>}
          </div>
          <Bdg l={st.l} c={st.c} b={st.b}/>
        </div>
        <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
          {(c.status||'active')==='active'&&(
            showReason?(
              <div style={{width:'100%'}}>
                <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo de suspensión..." style={{...inp,marginBottom:7}}/>
                <div style={{display:'flex',gap:6}}>
                  <Btn onClick={()=>setShowReason(false)} bg="#f1f5f9" color="#64748b" sm>Cancelar</Btn>
                  <Btn onClick={()=>cambiarEstado(c.id,'suspended',reason)} bg="#ef4444" sm><Lock size={11}/> Confirmar suspensión</Btn>
                </div>
              </div>
            ):(
              <Btn onClick={()=>setShowReason(true)} bg="#fef2f2" color="#ef4444" sm><Lock size={11}/> Suspender</Btn>
            )
          )}
          {c.status==='suspended'&&<Btn onClick={()=>cambiarEstado(c.id,'active')} bg="#d1fae5" color="#065f46" sm><CheckCircle size={11}/> Reactivar</Btn>}
          {c.status!=='cancelled'&&<Btn onClick={()=>askConfirm('¿Cancelar definitivamente esta empresa?',()=>cambiarEstado(c.id,'cancelled'))} bg="#f1f5f9" color="#94a3b8" sm><XCircle size={11}/> Cancelar</Btn>}
        </div>
      </div>
    );
  };

  return(
    <div>
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(3,1fr)',gap:12,marginBottom:20}}>
        {[{l:'Activas',v:activas.length,c:'#10b981',Ic:CheckCircle},{l:'Suspendidas',v:suspendidas.length,c:'#ef4444',Ic:Lock},{l:'Canceladas',v:canceladas.length,c:'#94a3b8',Ic:XCircle}].map((s,i)=>(
          <div key={i} style={{background:DS.surface,borderRadius:14,padding:'16px',border:`1px solid ${DS.border}`,borderTop:`3px solid ${s.c}`,display:'flex',gap:10,alignItems:'center'}}>
            <div style={{width:38,height:38,borderRadius:10,background:`${s.c}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><s.Ic size={16} color={s.c}/></div>
            <div><div style={{fontSize:22,fontWeight:800,color:'#1e293b'}}>{s.v}</div><div style={{fontSize:10,color:'#94a3b8'}}>{s.l}</div></div>
          </div>
        ))}
      </div>

      {suspendidas.length>0&&(
        <div style={{marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:800,color:'#ef4444',marginBottom:10,display:'flex',alignItems:'center',gap:7}}><Lock size={13}/> Empresas suspendidas ({suspendidas.length})</div>
          <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'repeat(2,1fr)',gap:10}}>
            {suspendidas.map(c=><EmpCard key={c.id} c={c}/>)}
          </div>
        </div>
      )}

      <div style={{marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:800,color:'#10b981',marginBottom:10,display:'flex',alignItems:'center',gap:7}}><CheckCircle size={13}/> Empresas activas ({activas.length})</div>
        {activas.length===0?<div style={{textAlign:'center',padding:20,color:'#94a3b8',fontSize:12}}>Sin empresas activas</div>:(
          <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'repeat(2,1fr)',gap:10}}>
            {activas.map(c=><EmpCard key={c.id} c={c}/>)}
          </div>
        )}
      </div>

      {canceladas.length>0&&(
        <div>
          <div style={{fontSize:13,fontWeight:800,color:'#94a3b8',marginBottom:10,display:'flex',alignItems:'center',gap:7}}><XCircle size={13}/> Empresas canceladas ({canceladas.length})</div>
          <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'repeat(2,1fr)',gap:10}}>
            {canceladas.map(c=><EmpCard key={c.id} c={c}/>)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ PESTAÑA ESTADÍSTICAS ══ */
function TabIngresos({revenue}){
  if(!revenue) return <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Cargando ingresos...</div>;
  const PLAN_COLORS={starter:'#10b981',growth:'#4f6ef7',enterprise:'#f59e0b'};
  return(
    <div>
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(3,1fr)',gap:12,marginBottom:20}}>
        {[
          {l:'Ingreso mensual total',v:`$${revenue.total_monthly?.toLocaleString()}`,c:'#10b981'},
          {l:'Ingreso anual proyectado',v:`$${revenue.total_annual?.toLocaleString()}`,c:'#4f6ef7'},
          {l:'Empresas activas',v:revenue.companies?.length||0,c:'#f59e0b'},
        ].map((s,i)=>(
          <div key={i} style={{background:CB,borderRadius:12,padding:'16px 18px',border:`1px solid ${s.c}30`,borderTop:`3px solid ${s.c}`}}>
            <div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div>
            <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{background:CB,borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',fontSize:12,fontWeight:700,color:'#475569'}}>Detalle por empresa</div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f8fafc'}}>{['Empresa','Plan','Estado','Ingreso mensual'].map(h=><th key={h} style={{padding:'10px 14px',fontSize:11,fontWeight:700,color:'#94a3b8',textAlign:'left'}}>{h}</th>)}</tr></thead>
          <tbody>{(revenue.companies||[]).map((c,i)=>(
            <tr key={i} style={{borderTop:'1px solid #f8fafc'}}>
              <td style={{padding:'10px 14px',fontSize:13,fontWeight:600}}>{c.name}</td>
              <td style={{padding:'10px 14px'}}><span style={{background:PLAN_COLORS[c.plan]+'20',color:PLAN_COLORS[c.plan],padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700,textTransform:'capitalize'}}>{c.plan}</span></td>
              <td style={{padding:'10px 14px',fontSize:12,color:'#10b981',fontWeight:600}}>{c.status}</td>
              <td style={{padding:'10px 14px',fontSize:14,fontWeight:800,color:'#1e293b'}}>${c.monthly_revenue}/mes</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function TabActividad({logs}){
  const COLORS={CREATE:'#10b981',UPDATE:'#4f6ef7',DELETE:'#ef4444',LOGIN:'#8b5cf6',SUSPEND:'#f59e0b'};
  return(
    <div>
      <div style={{background:CB,borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:12,fontWeight:700,color:'#475569'}}>Log de actividad del sistema</span>
          <span style={{fontSize:11,color:'#94a3b8'}}>{logs.length} registros</span>
        </div>
        {logs.length===0?(
          <div style={{padding:32,textAlign:'center',color:'#94a3b8',fontSize:13}}>Sin actividad registrada aun. Los logs se generan con las acciones del sistema.</div>
        ):(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc'}}>{['Accion','Usuario','Detalle','Fecha'].map(h=><th key={h} style={{padding:'8px 14px',fontSize:11,fontWeight:700,color:'#94a3b8',textAlign:'left'}}>{h}</th>)}</tr></thead>
            <tbody>{logs.slice(0,50).map((l,i)=>(
              <tr key={i} style={{borderTop:'1px solid #f8fafc'}}>
                <td style={{padding:'8px 14px'}}><span style={{background:(COLORS[l.action]||'#94a3b8')+'20',color:COLORS[l.action]||'#94a3b8',padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700}}>{l.action||'—'}</span></td>
                <td style={{padding:'8px 14px',fontSize:12}}>{l.user_name||l.user_email||'Sistema'}</td>
                <td style={{padding:'8px 14px',fontSize:12,color:'#475569',maxWidth:280}}>{l.details||'—'}</td>
                <td style={{padding:'8px 14px',fontSize:11,color:'#94a3b8'}}>{l.created_at?new Date(l.created_at).toLocaleString('es-EC'):'—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ModalChangePwd({onClose}){
  const [f,setF]=useState({current:'',next:'',confirm:''});
  const [msg,setMsg]=useState('');
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(false);
  async function guardar(){
    if(!f.current||!f.next||!f.confirm){setErr('Completa todos los campos');return;}
    if(f.next!==f.confirm){setErr('Las contrasenas no coinciden');return;}
    if(f.next.length<8){setErr('Minimo 8 caracteres');return;}
    setLoading(true);setErr('');
    try{
      await apiFetch('POST','/api/superadmin/change-password',{current_password:f.current,new_password:f.next});
      setMsg('Contrasena actualizada correctamente');
      setTimeout(onClose,2000);
    }catch(e){setErr(e.message);}
    setLoading(false);
  }
  const inp={width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:13,boxSizing:'border-box'};
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
      <div style={{background:'#fff',borderRadius:16,padding:28,width:380,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div style={{fontSize:15,fontWeight:800,color:'#1e293b',display:'flex',alignItems:'center',gap:8}}><Shield size={16} color="#f59e0b"/> Cambiar contrasena</div>
          <button onClick={onClose} style={{border:'none',background:'#f1f5f9',borderRadius:8,padding:6,cursor:'pointer'}}>✕</button>
        </div>
        {err&&<div style={{background:'#fef2f2',color:'#dc2626',borderRadius:8,padding:'8px 12px',fontSize:12,marginBottom:12}}>{err}</div>}
        {msg&&<div style={{background:'#f0fdf4',color:'#16a34a',borderRadius:8,padding:'8px 12px',fontSize:12,marginBottom:12}}>{msg}</div>}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div><label style={{fontSize:11,color:'#94a3b8',fontWeight:700,display:'block',marginBottom:4}}>CONTRASENA ACTUAL</label><input type="password" value={f.current} onChange={e=>setF(p=>({...p,current:e.target.value}))} style={inp}/></div>
          <div><label style={{fontSize:11,color:'#94a3b8',fontWeight:700,display:'block',marginBottom:4}}>NUEVA CONTRASENA</label><input type="password" value={f.next} onChange={e=>setF(p=>({...p,next:e.target.value}))} style={inp}/></div>
          <div><label style={{fontSize:11,color:'#94a3b8',fontWeight:700,display:'block',marginBottom:4}}>CONFIRMAR CONTRASENA</label><input type="password" value={f.confirm} onChange={e=>setF(p=>({...p,confirm:e.target.value}))} style={inp}/></div>
          <button onClick={guardar} disabled={loading} style={{padding:'10px',borderRadius:9,border:'none',background:'#1e293b',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',marginTop:4}}>{loading?'Guardando...':'Actualizar contrasena'}</button>
        </div>
      </div>
    </div>
  );
}

function TabEstadisticas({companies,stats,bots}){
  return(
    <div style={{display:'grid',gridTemplateColumns:MOB?'1fr':'1fr 1fr',gap:16}}>
      <Panel title="Distribución por plan" Icon={Star} color="#f59e0b">
        {Object.entries(PLANS).map(([k,p])=>{
          const n=companies.filter(c=>c.plan===k).length;
          const pct=companies.length?Math.round((n/companies.length)*100):0;
          return(
            <div key={k} style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <div><span style={{fontSize:12,fontWeight:800,color:p.color}}>{p.label}</span><span style={{fontSize:10,color:'#94a3b8',marginLeft:6}}>{p.price}</span></div>
                <span style={{fontSize:13,fontWeight:800,color:p.color}}>{n}</span>
              </div>
              <div style={{background:'#f8fafc',borderRadius:999,height:8}}><div style={{width:`${pct}%`,height:'100%',background:p.color,borderRadius:999}}/></div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>Límites: {p.max_advisors>=9999?'Ilimitado':`${p.max_advisors} asesores`} · {p.max_supervisors>=9999?'Ilimitados':`${p.max_supervisors} sup.`}</div>
            </div>
          );
        })}
      </Panel>

      <Panel title="Estado de servicios" Icon={Settings} color='#4f6ef7'>
        {Object.entries(STATUS_CFG).map(([k,v])=>{
          const n=companies.filter(c=>(c.status||'active')===k).length;
          return(
            <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${DS.border}`}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}><v.Ic size={14} color={v.c}/><span style={{fontSize:12,fontWeight:700,color:'#475569'}}>{v.l}</span></div>
              <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:18,fontWeight:800,color:v.c}}>{n}</span><Bdg l={`${companies.length?Math.round((n/companies.length)*100):0}%`} c={v.c} b={v.b}/></div>
            </div>
          );
        })}
      </Panel>

      <Panel title="Resumen global de clientes" Icon={Users} color="#10b981">
        {[{l:'Total clientes',v:stats?.clients?.total||0,c:'#4f6ef7'},{l:'Ganados',v:stats?.clients?.won||0,c:'#10b981'},{l:'Perdidos',v:stats?.clients?.lost||0,c:'#ef4444'},{l:'Nuevos hoy',v:stats?.clients?.today||0,c:'#f59e0b'}].map((s,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:`1px solid ${DS.border}`}}>
            <span style={{fontSize:12,color:'#94a3b8'}}>{s.l}</span>
            <span style={{fontSize:14,fontWeight:800,color:s.c}}>{s.v}</span>
          </div>
        ))}
      </Panel>

      <Panel title="Bots — Resumen global" Icon={Bot} color="#25d366">
        {[{l:'Bots activos',v:bots.filter(b=>b.bot_enabled===true).length||stats?.bots?.active||0,c:'#10b981'},{l:'Mensajes totales',v:stats?.bots?.total_messages||0,c:'#4f6ef7'},{l:'Leads generados',v:stats?.bots?.total_leads||0,c:'#f59e0b'},{l:'Leads convertidos',v:stats?.bots?.total_converted||0,c:'#10b981'}].map((s,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:`1px solid ${DS.border}`}}>
            <span style={{fontSize:12,color:'#94a3b8'}}>{s.l}</span>
            <span style={{fontSize:14,fontWeight:800,color:s.c}}>{s.v}</span>
          </div>
        ))}
      </Panel>

      <Panel title="Ingresos estimados (MRR)" Icon={DollarSign} color="#10b981">
        {Object.entries(PLANS).map(([k,p])=>{
          const n=companies.filter(c=>c.plan===k&&(c.status||'active')==='active').length;
          const price=parseInt(p.price.replace(/[^0-9]/g,''))||0;
          return(
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:`1px solid ${DS.border}`}}>
              <span style={{fontSize:12,color:'#94a3b8'}}>{p.label} × {n}</span>
              <span style={{fontSize:13,fontWeight:800,color:'#10b981'}}>${(n*price).toLocaleString()}/mes</span>
            </div>
          );
        })}
        <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0 0',marginTop:4}}>
          <span style={{fontSize:13,fontWeight:800,color:'#1e293b'}}>Total MRR</span>
          <span style={{fontSize:16,fontWeight:800,color:'#10b981'}}>
            ${Object.entries(PLANS).reduce((sum,[k,p])=>{
              const n=companies.filter(c=>c.plan===k&&(c.status||'active')==='active').length;
              return sum+(n*(parseInt(p.price.replace(/[^0-9]/g,''))||0));
            },0).toLocaleString()}/mes
          </span>
        </div>
      </Panel>

      <Panel title="Actividad reciente" Icon={Activity} color="#8b5cf6">
        {companies.slice(0,5).map((c,i)=>(
          <div key={i} style={{display:'flex',gap:10,padding:'9px 0',borderBottom:`1px solid ${DS.border}`,alignItems:'center'}}>
            <div style={{width:32,height:32,borderRadius:8,background:c.primary_color||'#4f6ef7'||'#4f6ef7',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Building2 size={13} color="#fff"/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:700,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
              <div style={{fontSize:10,color:'#94a3b8'}}>{c.total_users||0} usuarios · {c.total_clients||0} clientes</div>
            </div>
            <Bdg l={(PLANS[c.plan]||PLANS.starter).label} c={(PLANS[c.plan]||PLANS.starter).color} b={(PLANS[c.plan]||PLANS.starter).bg}/>
          </div>
        ))}
      </Panel>
    </div>
  );
}

/* ════════════════════════════════════════════
   EXPORT PRINCIPAL — DASHBOARD SUPER ADMIN
════════════════════════════════════════════ */

function ExportMenu({ endpoint, label = 'Exportar', color = '#4f6ef7' }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef();
  React.useEffect(()=>{ function h(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false);} document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h); },[]);
  function doExport(fmt) {
    setOpen(false);
    const token = localStorage.getItem('crm_token');
    fetch(`/api/exports/${endpoint}?format=${fmt}`,{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.blob()).then(blob=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${endpoint}.${fmt==='csv'?'csv':'xlsx'}`;a.click();}).catch(e=>alert('Error: '+e.message));
  }
  return (
    <div ref={ref} style={{position:'relative',display:'inline-block'}}>
      <button onClick={()=>setOpen(!open)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:8,border:'1px solid #4f6ef730',background:'#4f6ef708',color:'#4f6ef7',fontWeight:700,fontSize:11,cursor:'pointer'}}>
        <Download size={12}/> {label} <ChevronDown size={10}/>
      </button>
      {open&&<div style={{position:'absolute',right:0,top:'110%',background:'#fff',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',border:'1px solid #eaecf0',zIndex:999,minWidth:150,overflow:'hidden'}}>
        <button onClick={()=>doExport('excel')} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'10px 14px',border:'none',background:'none',cursor:'pointer',fontSize:12,fontWeight:600,color:'#1e293b'}} onMouseEnter={e=>e.currentTarget.style.background='#f0fdf4'} onMouseLeave={e=>e.currentTarget.style.background='none'}><FileSpreadsheet size={13} color="#10b981"/> Excel</button>
        <button onClick={()=>doExport('csv')} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'10px 14px',border:'none',background:'none',cursor:'pointer',fontSize:12,fontWeight:600,color:'#1e293b'}} onMouseEnter={e=>e.currentTarget.style.background='#eff6ff'} onMouseLeave={e=>e.currentTarget.style.background='none'}><FileText size={13} color="#4f6ef7"/> CSV</button>
      </div>}
    </div>
  );
}

export default function DashboardSuperAdmin({user,currentView,onNavigate,primary='#4f6ef7',pageBg='#f0f4ff',cardBg='#ffffff',cardBorder,cardShadow}) {
  DS = makeDS(primary);
  CB = cardBg || '#ffffff'; // update module-level for sub-components
  CBorder = cardBorder || `${primary}20`;
  CShadow = cardShadow || `0 2px 12px ${primary}14`; // Update module-level DS with company color
  MOB = window.innerWidth < 768;
  const [companies,setCompanies]=useState([]);
  const [bots,setBots]=useState([]);
  const [revenue,setRevenue]=useState(null);
  const [auditLog,setAuditLog]=useState([]);
  const [showChangePwd,setShowChangePwd]=useState(false);
  const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState('empresas');
  const [confirmDlg,setConfirmDlg]=useState(null);
  _setConfirmSA = setConfirmDlg;

  useEffect(()=>{if(currentView)setTab(currentView);},[currentView]);

  function cargar(){
    setLoading(true);
    console.log('[SuperAdmin] Cargando empresas...');
    apiFetch('GET','/api/superadmin/companies')
      .then(comp => {
        console.log('[SuperAdmin] Respuesta companies:', comp);
        setCompanies(Array.isArray(comp) ? comp : []);
      })
      .catch(err => {
        console.error('[SuperAdmin] ERROR companies:', err);
        setCompanies([]);
      })
      .finally(() => setLoading(false));
    apiFetch('GET','/api/superadmin/stats').then(setStats).catch(()=>null);
    apiFetch('GET','/api/superadmin/bots').then(b=>setBots(Array.isArray(b)?b:[])).catch(()=>[]);
    apiFetch('GET','/api/superadmin/revenue').then(setRevenue).catch(()=>null);
    apiFetch('GET','/api/superadmin/audit-log').then(a=>setAuditLog(Array.isArray(a)?a:[])).catch(()=>[]);
  }
  useEffect(()=>{cargar();},[]);

  const TABS=[
    {k:'empresas',  l:'Empresas',     Ic:Building2,  badge:companies.length},
    {k:'bots',      l:'Bots',         Ic:Bot,        badge:bots.length},
    {k:'ingresos',  l:'Ingresos',     Ic:DollarSign, badge:null},
    {k:'actividad', l:'Actividad',    Ic:Activity,   badge:auditLog.length>0?auditLog.length:null},
    {k:'servicios', l:'Servicios',    Ic:Settings,   badge:companies.filter(c=>c.status==='suspended').length},
    {k:'stats',     l:'Estadísticas', Ic:TrendingUp, badge:null},
  ];

  return(
    <div>
      {/* KPIs globales */}
      <div style={{display:'grid',gridTemplateColumns:MOB?'repeat(2,1fr)':'repeat(7,1fr)',gap:10,marginBottom:20}}>
        {[
          {Ic:Building2,l:'Empresas',   v:stats?.companies?.total,    c:primary},
          {Ic:Users,    l:'Usuarios',   v:stats?.users?.total,        c:'#8b5cf6'},
          {Ic:Shield,   l:'Admins',     v:stats?.users?.admins,       c:'#0ea5e9'},
          {Ic:Activity, l:'Asesores',   v:stats?.users?.advisors,     c:'#10b981'},
          {Ic:Users,    l:'Clientes',   v:stats?.clients?.total,      c:'#f59e0b'},
          {Ic:Grid,     l:'Leads',      v:stats?.leads?.total,        c:'#ef4444'},
          {Ic:Bot,      l:'Bots activos',v:stats?.bots?.active,       c:'#25d366'},
        ].map((s,i)=>(
          <div key={i} style={{background:CB,borderRadius:12,padding:'12px 14px',border:`1px solid ${DS.border}`,borderTop:`3px solid ${s.c}`}}>
            <s.Ic size={16} color={s.c} strokeWidth={1.8}/>
            <div style={{fontSize:20,fontWeight:800,color:'#1e293b',marginTop:6}}>{s.v??'—'}</div>
            <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:16,alignItems:'center',flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>{setTab(t.k);if(onNavigate)onNavigate(t.k);}} style={{padding:MOB?'7px 12px':'9px 16px',borderRadius:9,border:'none',fontSize:MOB?11:13,fontWeight:700,cursor:'pointer',background:tab===t.k?primary:'#f1f5f9',color:tab===t.k?'#fff':'#64748b',display:'flex',alignItems:'center',gap:6}}>
            <t.Ic size={13}/>{t.l}
            {t.badge>0&&<span style={{background:tab===t.k?'rgba(255,255,255,0.3)':primary,color:'#fff',borderRadius:999,padding:'0 7px',fontSize:10,fontWeight:800}}>{t.badge}</span>}
          </button>
        ))}
        <div style={{flex:1}}/>
        <button onClick={()=>setShowChangePwd(true)} style={{padding:'9px 12px',borderRadius:9,border:'none',background:'#fef3c7',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontSize:12,color:'#92400e',fontWeight:700}}><Shield size={12}/> Mi contrasena</button>
        <button onClick={cargar} style={{padding:'9px 12px',borderRadius:9,border:'none',background:'#f8fafc',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontSize:12,color:'#94a3b8'}}><RefreshCw size={12}/> Actualizar</button>
      </div>

      {loading?(
        <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
          <RefreshCw size={32} color="#e2e8f0" style={{marginBottom:12}}/>
          <div style={{fontSize:14}}>Cargando datos...</div>
        </div>
      ):(
        <>
          {tab==='empresas'  && <TabEmpresas    companies={companies} onRefresh={cargar}/>}
          {tab==='bots'      && <TabBots        bots={bots} onRefresh={cargar}/>}
          {tab==='ingresos'  && <TabIngresos    revenue={revenue}/>}
          {tab==='actividad' && <TabActividad   logs={auditLog}/>}
          {tab==='servicios' && <TabServicios   companies={companies} onRefresh={cargar}/>}
          {tab==='stats'     && <TabEstadisticas companies={companies} stats={stats} bots={bots}/>}
          {showChangePwd     && <ModalChangePwd onClose={()=>setShowChangePwd(false)}/>}
          {confirmDlg&&<ConfirmModal msg={confirmDlg.msg} onYes={confirmDlg.onYes} onClose={()=>setConfirmDlg(null)}/>}
        </>
      )}
    </div>
  );
}
