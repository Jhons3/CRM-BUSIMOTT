import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp,
  LayoutDashboard, Users, UserCheck, Eye, MessageSquare,
  BarChart2, Calendar, Zap, Building2, LogOut, Bot, ArrowRight, DollarSign, MessageCircle,
  UserPlus, Folder, Activity, Grid, Settings, Bell, Clock, CheckCheck, X
} from 'lucide-react';
import DashboardAsesor from './pages/DashboardAsesor';
import DashboardAdmin from './pages/DashboardAdmin';
import DashboardSupervisor from './pages/DashboardSupervisor';
import DashboardSuperAdmin from './pages/DashboardSuperAdmin';

// Origen del backend: usa REACT_APP_API_URL si está definido; si no, infiere
// el host actual (localhost, IP de red local, dominio, etc.) en el puerto 3001.
// Así el login funciona sin importar desde qué dispositivo/URL se acceda al CRM.
const API_ORIGIN = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '')
  : `${window.location.protocol}//${window.location.hostname}:3001`;

// ── Push notifications ────────────────────────────────────────────────────────
function urlB64ToUint8Array(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}
async function registerPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const token = localStorage.getItem('crm_token');
  if (!token) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const keyRes = await fetch(`${API_ORIGIN}/api/push/vapid-key`);
    if (!keyRes.ok) return;
    const { publicKey } = await keyRes.json();
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(publicKey),
    });
    await fetch(`${API_ORIGIN}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ subscription: sub }),
    });
    console.log('[push] Suscripción activa');
  } catch(e) { console.warn('[push]', e.message); }
}

async function apiPost(url, data) {
  const res = await fetch(`${API_ORIGIN}${url}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}
async function apiGet(url, token) {
  const res = await fetch(`${API_ORIGIN}${url}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

// Mezcla hex con blanco al (amount*100)% del color primario
function lightenColor(hex, amount) {
  if (!hex || !hex.startsWith('#')) return '#ffffff';
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c=>c+c).join('') : h;
  const r = parseInt(full.slice(0,2), 16);
  const g = parseInt(full.slice(2,4), 16);
  const b = parseInt(full.slice(4,6), 16);
  const m = v => Math.round(255 + (v-255)*amount).toString(16).padStart(2,'0');
  return `#${m(r)}${m(g)}${m(b)}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

// ─── Welcome Overlay — cubre TODA la pantalla para TODOS los roles ────────────
function WelcomeOverlay({ user, onDismiss }) {
  const [fading,  setFading]  = useState(false);
  const [stats,   setStats]   = useState(null);

  function handleDismiss() {
    setFading(true);
    setTimeout(onDismiss, 550);
  }

  // Cargar stats reales según el rol
  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const base = API_ORIGIN;

    if (user?.role === 'super_admin') {
      fetch(`${base}/api/superadmin/stats`, { headers })
        .then(r=>r.json()).then(d=>setStats(d)).catch(()=>{});
    } else if (user?.role === 'admin') {
      fetch(`${base}/api/admin/stats`, { headers })
        .then(r=>r.json()).then(d=>setStats(d)).catch(()=>{});
    } else if (user?.role === 'supervisor') {
      fetch(`${base}/api/supervisor/stats`, { headers })
        .then(r=>r.json()).then(d=>setStats(d)).catch(()=>{});
    } else if (user?.role === 'advisor' || user?.role === 'asesor') {
      fetch(`${base}/api/asesor/stats`, { headers })
        .then(r=>r.json()).then(d=>setStats(d)).catch(()=>{});
    }
  }, [user?.role]);

  const ROLE_CFG = {
    super_admin: { label: 'Super Administrador', color: '#a855f7',
      stats: [
        { Icon: Building2, value: stats?.companies?.total ?? '…', label: 'Empresas' },
        { Icon: Users,     value: stats?.users?.total     ?? '…', label: 'Usuarios' },
        { Icon: Bot,       value: stats?.bots?.active     ?? '…', label: 'Bots activos' },
      ]},
    admin: { label: 'Administrador', color: '#6366f1',
      stats: [
        { Icon: Users,     value: stats?.clients?.today   ?? '…', label: 'Clientes hoy' },
        { Icon: UserCheck, value: stats?.users?.asesores  ?? '…', label: 'Asesores activos' },
        { Icon: Zap,       value: stats?.clients?.en_proceso ?? '…', label: 'En proceso' },
      ]},
    supervisor: { label: 'Supervisor', color: '#f59e0b',
      stats: [
        { Icon: Users,     value: stats?.clients?.total   ?? '…', label: 'Clientes' },
        { Icon: BarChart2, value: stats?.clients?.ganados ?? '…', label: 'Ventas ganadas' },
        { Icon: Users,     value: stats?.asesores?.length ?? '…', label: 'Asesores' },
      ]},
    asesor: { label: 'Asesor de Ventas', color: '#10b981',
      stats: [
        { Icon: Users,     value: stats?.clients?.total    ?? '…', label: 'Mis clientes' },
        { Icon: BarChart2, value: stats?.clients?.ganados  ?? '…', label: 'Ganados' },
        { Icon: Zap,       value: stats?.clients?.en_proceso ?? '…', label: 'En proceso' },
      ]},
    advisor: { label: 'Asesor de Ventas', color: '#10b981',
      stats: [
        { Icon: Users,     value: stats?.clients?.total    ?? '…', label: 'Mis clientes' },
        { Icon: BarChart2, value: stats?.clients?.ganados  ?? '…', label: 'Ganados' },
        { Icon: Zap,       value: stats?.clients?.en_proceso ?? '…', label: 'En proceso' },
      ]},
  };

  const cfg = ROLE_CFG[user?.role] || ROLE_CFG.admin;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      backdropFilter: fading ? 'blur(0px)' : 'blur(12px)',
      WebkitBackdropFilter: fading ? 'blur(0px)' : 'blur(12px)',
      background: fading ? 'rgba(10,15,30,0)' : 'rgba(10,15,30,0.7)',
      transition: 'backdrop-filter 0.55s ease, -webkit-backdrop-filter 0.55s ease, background 0.55s ease',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: fading ? 'none' : 'auto',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* Mascota decorativa en el fondo */}
      <img src="/mascota.jpeg" alt="" style={{ position:'absolute', right:'5%', bottom:0, height:'85vh', opacity:0.12, pointerEvents:'none', userSelect:'none', filter:'grayscale(20%)' }}/>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{
        background: '#ffffff', borderRadius: 28,
        padding: '44px 52px', textAlign: 'center',
        maxWidth: 480, width: '90%',
        boxShadow: '0 32px 80px rgba(79,110,247,0.2)',
        border: '1px solid rgba(79,110,247,0.12)',
        opacity: fading ? 0 : 1,
        transform: fading ? 'scale(0.95) translateY(-12px)' : 'scale(1) translateY(0)',
        transition: 'opacity 0.45s ease, transform 0.45s ease',
        position: 'relative', zIndex: 1,
      }}>
        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}bb)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 800, color: '#fff',
          margin: '0 auto 20px',
          boxShadow: `0 8px 24px ${cfg.color}55`,
        }}>
          {user?.name?.charAt(0)}
        </div>

        <div style={{ fontSize: 13, color: '#9aa5be', fontWeight: 600, marginBottom: 6 }}>{getGreeting()},</div>
        <h1 style={{ margin: '0 0 4px', fontSize: 32, fontWeight: 800, color: '#0f1b3d' }}>
          {user?.name?.split(' ')[0]}
        </h1>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 32, color: cfg.color, textTransform:'uppercase', letterSpacing:1 }}>
          {cfg.label}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 32 }}>
          {cfg.stats.map((s, i) => (
            <div key={i} style={{ background: '#f0f4ff', borderRadius: 14, padding: '16px 10px', border:'1px solid rgba(79,110,247,0.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                <s.Icon size={22} color={cfg.color} strokeWidth={1.8}/>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0f1b3d' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#9aa5be', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: '#9aa5be', marginBottom: 28 }}>
          {new Date().toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </div>

        <button onClick={handleDismiss} style={{
          width: '100%', padding: '14px 0',
          background: 'linear-gradient(135deg, #4f6ef7, #3b55e0)', color: '#fff',
          border: 'none', borderRadius: 12,
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(79,110,247,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Comenzar mi día <ArrowRight size={18}/>
        </button>
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(()=>{
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const DEMO = [
    { label:'Super Admin', email:'superadmin@crm.com' },
    { label:'Admin',       email:'admin@empresa.com'  },
    { label:'Supervisor',  email:'supervisor@empresa.com' },
    { label:'Asesor',      email:'maria@empresa.com'  },
  ];

  async function handleLogin(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res  = await fetch(`${API_ORIGIN}/api/auth/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('crm_token', data.token);
        localStorage.setItem('crm_user',  JSON.stringify(data.user));
        if (data.company) localStorage.setItem('crm_company', JSON.stringify(data.company));
        onLogin(data.user, data.company);
      } else if (data.locked) {
        setError('🔒 ' + data.error);
      } else if (data.suspended) {
        setError('🔒 Empresa suspendida: ' + (data.reason || 'Contacta al administrador.'));
      } else {
        setError(data.error || 'Credenciales inválidas');
      }
    } catch { setError('No se pudo conectar al servidor.'); }
    setLoading(false);
  }

  const inputStyle = {
    width:'100%', padding:'15px 18px 15px 48px',
    background:'#f3f4f6', border:'2px solid transparent',
    borderRadius:14, color:'#111827', fontSize:15,
    outline:'none', boxSizing:'border-box',
    fontFamily:"'DM Sans',sans-serif", transition:'all .2s',
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:100,
      display:'flex', fontFamily:"'DM Sans',system-ui,sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`@keyframes logoPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.45;transform:scale(1.12)}}`}</style>

      {/* ══ IZQUIERDA — ocupa la mitad completa (oculto en móvil) ══ */}
      <div style={{
        flex:'0 0 50%', height:'100vh',
        position:'relative', overflow:'hidden',
        background:'linear-gradient(145deg,#b91c1c 0%,#7f1d1d 55%,#3d0a0a 100%)',
        display: isMobile ? 'none' : 'flex', flexDirection:'column',
        alignItems:'flex-start', justifyContent:'center',
        padding:'0 64px',
      }}>
        {/* Trazos de luz suaves y difusos — look editorial, no esferas "3D" */}
        <div style={{
          position:'absolute', bottom:-180, left:-140,
          width:480, height:480, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(248,113,113,0.35), transparent 70%)',
          filter:'blur(50px)', pointerEvents:'none',
        }}/>
        <div style={{
          position:'absolute', top:-160, right:-120,
          width:440, height:440, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(220,38,38,0.30), transparent 70%)',
          filter:'blur(60px)', pointerEvents:'none',
        }}/>
        <div style={{
          position:'absolute', top:'42%', right:'12%',
          width:220, height:220, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(255,255,255,0.10), transparent 70%)',
          filter:'blur(30px)', pointerEvents:'none',
        }}/>
        {/* Textura de grano sutil para dar profundidad sin saturar de color */}
        <div style={{
          position:'absolute', inset:0, opacity:0.05, pointerEvents:'none',
          backgroundImage:'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize:'3px 3px',
        }}/>

        {/* Contenido */}
        <div style={{position:'relative', zIndex:2, maxWidth:480}}>
          {/* Logo */}
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:48}}>
            <img src="/logo.jpeg" alt="JISMART" style={{
              width:60,height:60,objectFit:'contain',
              borderRadius:'50%',
            }}/>
            <div>
              <div style={{fontSize:20,fontWeight:900,color:'#fff',letterSpacing:-0.3,lineHeight:1}}>
                CRM <span style={{color:'#fca5a5'}}>JISMART</span>
              </div>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',fontWeight:700,
                letterSpacing:2.5,textTransform:'uppercase',marginTop:3}}>
                Powered by AI
              </div>
            </div>
          </div>

          {/* BIENVENIDO */}
          <div style={{
            fontSize:56,fontWeight:900,color:'#fff',
            letterSpacing:1,textTransform:'uppercase',
            lineHeight:1,marginBottom:10,
            textShadow:'0 4px 20px rgba(0,0,0,0.4)',
          }}>
            BIENVENIDO
          </div>
          <div style={{
            fontSize:14,fontWeight:800,color:'rgba(255,255,255,0.55)',
            letterSpacing:3,textTransform:'uppercase',marginBottom:28,
          }}>
            CRM JISMART-AI
          </div>

          {/* Eslogan */}
          <p style={{
            fontSize:16,color:'rgba(255,255,255,0.75)',
            lineHeight:1.7,margin:'0 0 40px',
            fontStyle:'italic',
          }}>
            "Inteligencia para tu negocio,{' '}
            <span style={{color:'#fca5a5',fontWeight:700}}>
              es el presente no el futuro"
            </span>
          </p>

          {/* Pills */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              {l:'WhatsApp Bot', c:'#4ade80'},
              {l:'IA Integrada',  c:'#a5b4fc'},
              {l:'Tiempo Real',   c:'#fbbf24'},
            ].map((t,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,
                fontSize:13,color:t.c,fontWeight:700,letterSpacing:0.3}}>
                <div style={{width:8,height:8,borderRadius:'50%',flexShrink:0,
                  background:t.c,boxShadow:`0 0 10px ${t.c}`}}/>
                {t.l}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ DERECHA — formulario full height ══ */}
      <div style={{
        flex:1, height:'100vh',
        background:'#ffffff',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        padding: isMobile ? '32px 24px' : '0 72px',
        overflowY:'auto',
      }}>
        {/* Logo visible solo en móvil */}
        {isMobile && (
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:28}}>
            <img src="/logo.jpeg" alt="JISMART" style={{width:44,height:44,objectFit:'contain',borderRadius:'50%'}}/>
            <div>
              <div style={{fontSize:16,fontWeight:900,color:'#111827',letterSpacing:-0.3}}>CRM <span style={{color:'#b91c1c'}}>JISMART</span></div>
              <div style={{fontSize:9,color:'#9ca3af',fontWeight:700,letterSpacing:2,textTransform:'uppercase'}}>Powered by AI</div>
            </div>
          </div>
        )}
        <div style={{width:'100%', maxWidth: isMobile ? '100%' : 420}}>

          {/* Título */}
          <h1 style={{margin:'0 0 8px',fontSize: isMobile ? 26 : 36,fontWeight:800,
            color:'#111827',letterSpacing:-0.8,lineHeight:1}}>
            Iniciar sesión
          </h1>
          <p style={{margin:'0 0 28px',fontSize:14,color:'#9ca3af',fontWeight:400}}>
            Ingresa tus credenciales para continuar
          </p>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{marginBottom:16,position:'relative'}}>
              <div style={{position:'absolute',left:16,top:'50%',
                transform:'translateY(-50%)',pointerEvents:'none',zIndex:1}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="Nombre de usuario / Email" required style={inputStyle}
                onFocus={e=>{e.target.style.borderColor='#dc2626';e.target.style.background='#fff';e.target.style.boxShadow='0 0 0 4px rgba(220,38,38,0.08)';}}
                onBlur={e=>{e.target.style.borderColor='transparent';e.target.style.background='#f3f4f6';e.target.style.boxShadow='none';}}
              />
            </div>

            {/* Password */}
            <div style={{marginBottom:28,position:'relative'}}>
              <div style={{position:'absolute',left:16,top:'50%',
                transform:'translateY(-50%)',pointerEvents:'none',zIndex:1}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <input type={showPass?'text':'password'} value={password}
                onChange={e=>setPassword(e.target.value)}
                onPaste={e=>e.preventDefault()}
                placeholder="Contraseña" required
                style={{...inputStyle, paddingRight:90}}
                onFocus={e=>{e.target.style.borderColor='#dc2626';e.target.style.background='#fff';e.target.style.boxShadow='0 0 0 4px rgba(220,38,38,0.08)';}}
                onBlur={e=>{e.target.style.borderColor='transparent';e.target.style.background='#f3f4f6';e.target.style.boxShadow='none';}}
              />
              <button type="button" onClick={()=>setShowPass(!showPass)} style={{
                position:'absolute',right:16,top:'50%',transform:'translateY(-50%)',
                background:'none',border:'none',color:'#9ca3af',cursor:'pointer',
                fontSize:11,fontWeight:800,letterSpacing:0.8,padding:4,
                transition:'color .15s',
              }}
              onMouseEnter={e=>e.currentTarget.style.color='#dc2626'}
              onMouseLeave={e=>e.currentTarget.style.color='#9ca3af'}>
                {showPass?'OCULTAR':'MOSTRAR'}
              </button>
            </div>

            {/* Olvidé mi contraseña */}
            <div style={{textAlign:'right',marginTop:-18,marginBottom:20}}>
              <button type="button" onClick={()=>setShowRecovery(true)} style={{
                background:'none',border:'none',color:'#9ca3af',cursor:'pointer',
                fontSize:12,fontWeight:600,padding:2,transition:'color .15s',
              }}
              onMouseEnter={e=>e.currentTarget.style.color='#dc2626'}
              onMouseLeave={e=>e.currentTarget.style.color='#9ca3af'}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Error */}
            {error&&(
              <div style={{background:'#fef2f2',border:'1.5px solid #fecaca',
                borderRadius:12,padding:'12px 16px',color:'#dc2626',
                fontSize:13,marginBottom:16,fontWeight:600}}>
                ⚠️ {error}
              </div>
            )}

            {/* Botón ingresar */}
            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'16px',
              background:loading?'#9ca3af':'linear-gradient(135deg,#dc2626,#b91c1c)',
              color:'#fff', border:'none', borderRadius:14,
              fontSize:16,fontWeight:800,cursor:loading?'not-allowed':'pointer',
              letterSpacing:0.3,
              boxShadow:loading?'none':'0 4px 14px rgba(185,28,28,0.22)',
              transition:'all .18s',
              display:'flex',alignItems:'center',justifyContent:'center',gap:10,
            }}
            onMouseEnter={e=>{if(!loading){e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 6px 18px rgba(185,28,28,0.28)';}}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=loading?'none':'0 4px 14px rgba(185,28,28,0.22)';}}>
              {loading ? <img src="/logo.jpeg" alt="Verificando" style={{height:28,width:28,objectFit:'contain',borderRadius:'50%',animation:'logoPulse 1s ease-in-out infinite'}}/> : <>Ingresar <span style={{fontSize:20}}>→</span></>}
            </button>
          </form>

          {/* Footer */}
          <div style={{marginTop:32,textAlign:'center',fontSize:11,color:'#d1d5db'}}>
            © 2026{' '}
            <span style={{color:'#dc2626',fontWeight:800}}>JISMART-AI</span>
            {' '}· Todos los derechos reservados
          </div>
        </div>
      </div>

      {showRecovery && <RecoveryModal onClose={()=>setShowRecovery(false)}/>}
    </div>
  );
}

// ─── Modal de recuperación de contraseña ─────────────────────────────────────
function RecoveryModal({ onClose }) {
  const [step,     setStep]     = useState(1); // 1=pedir código, 2=ingresar código + nueva clave
  const [email,    setEmail]    = useState('');
  const [code,     setCode]     = useState('');
  const [newPass,  setNewPass]  = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [msg,      setMsg]      = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function requestCode(e) {
    e.preventDefault(); setLoading(true); setError(''); setMsg('');
    try {
      const res  = await fetch(`${API_ORIGIN}/api/auth/forgot-password`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMsg(data.message || 'Si el correo existe, enviamos un código de recuperación.');
      setStep(2);
    } catch { setError('No se pudo conectar al servidor.'); }
    setLoading(false);
  }

  async function confirmReset(e) {
    e.preventDefault(); setError(''); setMsg('');
    if (newPass !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (newPass.length < 6)  { setError('Mínimo 6 caracteres'); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API_ORIGIN}/api/auth/reset-password`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, code, newPassword: newPass }),
      });
      const data = await res.json();
      if (res.ok) { setMsg(data.message); setStep(3); }
      else setError(data.error || 'No se pudo restablecer la contraseña');
    } catch { setError('No se pudo conectar al servidor.'); }
    setLoading(false);
  }

  const inputStyle = {
    width:'100%', padding:'13px 16px',
    background:'#f3f4f6', border:'2px solid transparent',
    borderRadius:12, color:'#111827', fontSize:14,
    outline:'none', boxSizing:'border-box',
    fontFamily:"'DM Sans',sans-serif",
  };

  return (
    <div style={{position:'fixed', inset:0, zIndex:200, display:'flex',
      alignItems:'center', justifyContent:'center',
      background:'rgba(17,24,39,0.55)', backdropFilter:'blur(2px)'}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%', maxWidth:420, background:'#fff', borderRadius:18,
        padding:'32px 32px', boxShadow:'0 24px 64px rgba(0,0,0,0.25)',
        fontFamily:"'DM Sans',sans-serif",
      }}>
        <h2 style={{margin:'0 0 6px',fontSize:22,fontWeight:800,color:'#111827'}}>
          Recuperar contraseña
        </h2>

        {step === 1 && (
          <form onSubmit={requestCode}>
            <p style={{margin:'0 0 20px',fontSize:13,color:'#6b7280',lineHeight:1.6}}>
              Ingresa el correo asociado a tu cuenta. Te enviaremos un código de 6 dígitos para restablecer tu contraseña.
            </p>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="Correo electrónico" required style={{...inputStyle, marginBottom:16}}/>
            {error && <div style={{color:'#dc2626',fontSize:13,fontWeight:600,marginBottom:14}}>⚠️ {error}</div>}
            <div style={{display:'flex',gap:10}}>
              <button type="button" onClick={onClose} style={{flex:1,padding:'13px',borderRadius:12,
                border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',fontWeight:700,cursor:'pointer'}}>
                Cancelar
              </button>
              <button type="submit" disabled={loading} style={{flex:1,padding:'13px',borderRadius:12,
                border:'none',background:loading?'#9ca3af':'linear-gradient(135deg,#dc2626,#b91c1c)',
                color:'#fff',fontWeight:800,cursor:loading?'not-allowed':'pointer'}}>
                {loading ? 'Enviando...' : 'Enviar código'}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={confirmReset}>
            {msg && <div style={{background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:10,
              padding:'10px 14px',color:'#166534',fontSize:12.5,fontWeight:600,marginBottom:18}}>
              ✅ {msg}
            </div>}
            <p style={{margin:'0 0 14px',fontSize:13,color:'#6b7280'}}>
              Revisa tu correo <strong>{email}</strong>, ingresa el código y tu nueva contraseña.
            </p>
            <input value={code} onChange={e=>setCode(e.target.value)}
              placeholder="Código de 6 dígitos" required maxLength={6}
              style={{...inputStyle, marginBottom:12, letterSpacing:4, textAlign:'center', fontWeight:800, fontSize:18}}/>
            <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)}
              placeholder="Nueva contraseña" required style={{...inputStyle, marginBottom:12}}/>
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
              placeholder="Confirmar nueva contraseña" required style={{...inputStyle, marginBottom:16}}/>
            {error && <div style={{color:'#dc2626',fontSize:13,fontWeight:600,marginBottom:14}}>⚠️ {error}</div>}
            <div style={{display:'flex',gap:10}}>
              <button type="button" onClick={()=>setStep(1)} style={{flex:1,padding:'13px',borderRadius:12,
                border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',fontWeight:700,cursor:'pointer'}}>
                Atrás
              </button>
              <button type="submit" disabled={loading} style={{flex:1,padding:'13px',borderRadius:12,
                border:'none',background:loading?'#9ca3af':'linear-gradient(135deg,#dc2626,#b91c1c)',
                color:'#fff',fontWeight:800,cursor:loading?'not-allowed':'pointer'}}>
                {loading ? 'Verificando...' : 'Restablecer contraseña'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div>
            <div style={{background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:10,
              padding:'14px 16px',color:'#166534',fontSize:13,fontWeight:600,marginBottom:20}}>
              ✅ {msg || 'Contraseña actualizada correctamente.'}
            </div>
            <button type="button" onClick={onClose} style={{width:'100%',padding:'13px',borderRadius:12,
              border:'none',background:'linear-gradient(135deg,#dc2626,#b91c1c)',
              color:'#fff',fontWeight:800,cursor:'pointer'}}>
              Ir a iniciar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Badge Rol ────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const cfg = {
    super_admin: { label:'Super Admin', bg:'#f5f3ff', color:'#7c3aed' },
    admin:       { label:'Admin',       bg:'#dbeafe', color:'#1d4ed8' },
    supervisor:  { label:'Supervisor',  bg:'#fef9c3', color:'#a16207' },
    asesor:      { label:'Asesor',      bg:'#dcfce7', color:'#15803d' },
    advisor:     { label:'Asesor',      bg:'#dcfce7', color:'#15803d' },
  }[role] || { label:role, bg:'#f1f5f9', color:'#475569' };
  return <span style={{ display:'inline-flex',alignItems:'center',padding:'2px 9px',borderRadius:999,fontSize:10,fontWeight:700,background:cfg.bg,color:cfg.color,letterSpacing:0.2 }}>{cfg.label}</span>;
}

// ─── Layout ───────────────────────────────────────────────────────────────────
// ── Campana de notificaciones ─────────────────────────────────────────────────
function NotificationBell({ user, primary = '#4f6ef7', apiOrigin }) {
  const [notifs, setNotifs]   = useState([]);
  const [open,   setOpen]     = useState(false);
  const panelRef              = useRef(null);
  const token                 = localStorage.getItem('crm_token');

  // Endpoint según rol: supervisor/admin usan su propia ruta
  const isSupervisor = ['supervisor', 'admin', 'administrator'].includes(user?.role);
  const notifBase    = isSupervisor ? `${apiOrigin}/api/supervisor/notifications` : `${apiOrigin}/api/asesor/notifications`;

  const fetchNotifs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(notifBase, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotifs(await res.json());
    } catch {}
  }, [token, notifBase]);

  // Cargar al montar y cada 60 segundos
  useEffect(() => {
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 60000);
    return () => clearInterval(iv);
  }, [fetchNotifs]);

  // Escuchar evento Socket.IO de regestión inyectado desde el servidor
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.type === 'lead:reengagement') {
        fetchNotifs();
      }
    };
    window.addEventListener('crm:socket', handler);
    return () => window.removeEventListener('crm:socket', handler);
  }, [fetchNotifs]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function markRead(id) {
    setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
    await fetch(`${notifBase}/${id}/read`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  async function markAllRead() {
    setNotifs(p => p.map(n => ({ ...n, read: true })));
    await fetch(`${notifBase}/read-all`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  const unread = notifs.filter(n => !n.read).length;

  const TYPE_CFG = {
    reengagement:  { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: <Clock size={13} color="#f59e0b"/> },
    lead_promoted: { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', icon: <Zap size={13} color="#10b981"/>    },
  };

  function relTime(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60)   return 'Ahora mismo';
    if (diff < 3600) return `Hace ${Math.floor(diff/60)} min`;
    if (diff < 86400)return `Hace ${Math.floor(diff/3600)}h`;
    return `Hace ${Math.floor(diff/86400)}d`;
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Botón campana */}
      <button onClick={() => setOpen(o => !o)} style={{
        position: 'relative', width: 36, height: 36, borderRadius: 10,
        border: '1px solid rgba(15,23,42,0.08)', background: open ? `${primary}10` : 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .15s',
      }}>
        <Bell size={17} color={open ? primary : '#64748b'} />
        {unread > 0 && (
          <div style={{
            position: 'absolute', top: 4, right: 4,
            minWidth: 16, height: 16, borderRadius: 999,
            background: '#ef4444', border: '2px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800, color: '#fff', lineHeight: 1,
            padding: '0 3px',
          }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>

      {/* Panel de notificaciones */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 340, maxHeight: 480,
          background: '#fff', borderRadius: 14,
          border: '1px solid #eaecf0',
          boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
          zIndex: 9999, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Bell size={15} color={primary} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Notificaciones</span>
              {unread > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#ef4444', borderRadius: 999, padding: '1px 7px' }}>{unread} nuevas</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {unread > 0 && (
                <button onClick={markAllRead} title="Marcar todas como leídas" style={{ background: 'none', border: 'none', cursor: 'pointer', color: primary, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCheck size={13}/> Leer todas
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}>
                <X size={15}/>
              </button>
            </div>
          </div>

          {/* Lista */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifs.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                <Bell size={28} color="#e2e8f0" style={{ marginBottom: 10 }}/>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Sin notificaciones</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Aquí aparecerán los avisos de regestión</div>
              </div>
            )}
            {notifs.map(n => {
              const cfg = TYPE_CFG[n.type] || TYPE_CFG.lead_promoted;
              const data = (typeof n.data === 'string') ? JSON.parse(n.data || '{}') : (n.data || {});
              return (
                <div key={n.id} onClick={() => markRead(n.id)} style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f8fafc',
                  background: n.read ? '#fff' : `${cfg.bg}`,
                  borderLeft: n.read ? '3px solid transparent' : `3px solid ${cfg.color}`,
                  cursor: 'pointer', transition: 'background .12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = n.read ? '#fff' : cfg.bg}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: n.read ? 600 : 700, color: '#1e293b', marginBottom: 2 }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4, marginBottom: 4 }}>{n.body}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{relTime(n.created_at)}</span>
                        {data.dias && <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '1px 6px', borderRadius: 999 }}>{data.dias}d sin respuesta</span>}
                        {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }}/>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MainLayout({ user, company, onLogout, children, currentView, onNavigate, primary='#4f6ef7', sidebarBg, pageBg='#f5f7fb', cardBg='#ffffff', cardBorder, cardShadow }) {
  const NAV = {
    super_admin: [
      { key:'empresas',  Icon:Building2,   label:'Empresas' },
      { key:'bots',      Icon:Bot,         label:'Bots' },
      { key:'servicios', Icon:Settings,    label:'Servicios' },
      { key:'stats',     Icon:BarChart2,   label:'Estadísticas' },
    ],
    admin: [
      { key:'dashboard',          Icon:LayoutDashboard, label:'Dashboard' },
      { key:'pipeline',             Icon:TrendingUp,       label:'Pipeline' },
      { key:'rendimiento_equipo',  Icon:BarChart2,        label:'Rendimiento Equipo' },
      { key:'clients',            Icon:Users,           label:'Clientes' },
      { key:'leads',              Icon:Grid,            label:'Leads Bot' },
      { key:'conversaciones',     Icon:MessageCircle,   label:'Conversaciones' },
      { key:'actividades_equipo', Icon:Activity,        label:'Act. Equipo' },
      { key:'asesor_activity',    Icon:Activity,        label:'Act. Asesores' },
      { key:'supervisor_activity',Icon:Eye,             label:'Act. Supervisor' },
      { key:'sales',              Icon:DollarSign,      label:'Ventas' },
      { key:'users',              Icon:UserPlus,        label:'Usuarios' },
      { key:'employees',          Icon:Folder,          label:'Empleados' },
    ],
    supervisor: [
      { key:'dashboard',           Icon:LayoutDashboard, label:'Dashboard' },
      { key:'mis_clientes',        Icon:Users,           label:'Mis Clientes' },
      { key:'mis_actividades',     Icon:Activity,        label:'Mis Actividades' },
      { key:'estadisticas',        Icon:BarChart2,       label:'Mi Rendimiento' },
      { key:'rendimiento_equipo',  Icon:TrendingUp,      label:'Equipo' },
      { key:'actividades_equipo',  Icon:Folder,          label:'Act. Equipo' },
      { key:'pipeline',            Icon:TrendingUp,      label:'Pipeline' },
      { key:'clients',             Icon:Users,           label:'Clientes' },
      { key:'advisors',            Icon:UserCheck,       label:'Asesores' },
      { key:'leads',               Icon:Grid,            label:'Leads Bot' },
      { key:'conversaciones',      Icon:MessageCircle,   label:'Conversaciones' },
      { key:'sales',               Icon:DollarSign,      label:'Ventas' },
      { key:'reports',             Icon:BarChart2,       label:'Reportes' },
    ],
    advisor: [
      { key:'dashboard',      Icon:LayoutDashboard, label:'Mi Dashboard' },
      { key:'estadisticas',   Icon:BarChart2,        label:'Mi Rendimiento' },
      { key:'clients',        Icon:Users,            label:'Mis Clientes' },
      { key:'leads',          Icon:Grid,             label:'Leads Bot' },
      { key:'conversaciones', Icon:MessageCircle,    label:'Conversaciones' },
      { key:'calendar',       Icon:Calendar,         label:'Calendario' },
      { key:'payments',       Icon:DollarSign,       label:'Pagos' },
      { key:'actions',        Icon:Activity,         label:'Actividades' },
    ],
    asesor: [
      { key:'dashboard',      Icon:LayoutDashboard, label:'Mi Dashboard' },
      { key:'estadisticas',   Icon:BarChart2,        label:'Mi Rendimiento' },
      { key:'clients',        Icon:Users,            label:'Mis Clientes' },
      { key:'leads',          Icon:Grid,             label:'Leads Bot' },
      { key:'conversaciones', Icon:MessageCircle,    label:'Conversaciones' },
      { key:'calendar',       Icon:Calendar,         label:'Calendario' },
      { key:'payments',       Icon:DollarSign,       label:'Pagos' },
      { key:'actions',        Icon:Zap,              label:'Actividades' },
    ],
  };

  const nav = NAV[user.role] || [];
  const logoUrl    = company?.logoUrl        || '';

  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(()=>{
    const fn = () => { setIsMobile(window.innerWidth < 768); if(window.innerWidth>=768) setSidebarOpen(false); };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // Convert hex to rgb for rgba() usage
  const hexToRgb = h => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h.replace('#','').length===3?h.replace(/./g,c=>c+c):h);
    return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '79,110,247';
  };
  const pRgb = primary.startsWith('#') ? hexToRgb(primary) : '79,110,247';

  // Inject ALL company colors as CSS variables — tokens shared by every page
  const styleVars = `
    :root {
      --primary:        ${primary};
      --primary-rgb:    ${pRgb};
      --primary-dark:   ${primary}dd;
      --primary-glow:   rgba(${pRgb},0.15);
      --primary-light:  rgba(${pRgb},0.06);
      --primary-border: rgba(${pRgb},0.15);
      --primary-tint:   rgba(${pRgb},0.04);
      --page-bg:        ${pageBg};
      --card-bg:        ${cardBg};
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --shadow-sm: 0 1px 2px rgba(15,23,42,0.04);
      --shadow-md: 0 2px 10px rgba(15,23,42,0.06);
      --shadow-lg: 0 12px 32px rgba(15,23,42,0.10);
    }
    button { transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease, color 0.16s ease; }
    input:focus, textarea:focus, select:focus {
      border-color: ${primary} !important;
      box-shadow: 0 0 0 3.5px rgba(${pRgb},0.10) !important;
      outline: none !important;
    }
    ::-webkit-scrollbar-thumb { background: rgba(${pRgb},0.18); border-radius: 99px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(${pRgb},0.32); }
  `;

  // ── Chrome neutral, premium graphite — el color de marca vive en los acentos, no en el fondo ──
  const sidebarBase    = (sidebarBg && sidebarBg.startsWith('#')) ? sidebarBg : '#14161c';
  const sidebarSurface = 'rgba(255,255,255,0.045)';
  const sidebarBorder  = 'rgba(255,255,255,0.06)';
  const inactiveFg     = 'rgba(255,255,255,0.52)';
  const sidebarSubtitle= 'rgba(255,255,255,0.32)';

  return (
    <div style={{
      display:'flex', width:'100vw', height:'100vh',
      background: pageBg || '#f5f7fb',
      fontFamily:"'DM Sans',system-ui,sans-serif",
      overflow:'hidden',
      position:'fixed', top:0, left:0,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{styleVars}</style>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.22); }
        button, a { transition: all 0.18s ease; }
        input, select, textarea { font-family: inherit; transition: border-color 0.18s, box-shadow 0.18s; }
        input:focus, select:focus, textarea:focus { outline: none; }
        .crm-card { background: ${cardBg||'#fff'}; border-radius: 16px; border: 1px solid ${cardBorder||'#eef0f3'}; box-shadow: ${cardShadow||'var(--shadow-sm)'}; transition: box-shadow 0.2s, border-color 0.2s; }
        .crm-card:hover { box-shadow: var(--shadow-md); border-color: ${cardBorder||'#e2e5ea'}; }
        tr { transition: background 0.15s; }
        tr:hover td { background: rgba(15,23,42,0.018) !important; }
      `}</style>

      {/* ══ Overlay oscuro cuando el drawer está abierto en móvil ══ */}
      {isMobile && sidebarOpen && (
        <div onClick={()=>setSidebarOpen(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
          zIndex:199, backdropFilter:'blur(2px)',
        }}/>
      )}

      {/* ══════════════════════════════
          SIDEBAR — chrome neutro, acento de marca
      ══════════════════════════════ */}
      <div style={{
        width: 232,
        background: sidebarBase,
        display:'flex', flexDirection:'column', flexShrink:0,
        position: isMobile ? 'fixed' : 'relative',
        top: isMobile ? 0 : 'auto',
        left: isMobile ? 0 : 'auto',
        height: isMobile ? '100dvh' : 'auto',
        zIndex: isMobile ? 200 : 'auto',
        transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* ── Logo / marca ── */}
        <div style={{ padding:'24px 20px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{
              width:38, height:38, borderRadius:11, flexShrink:0,
              background: logoUrl ? '#fff' : 'transparent',
              border: logoUrl ? `1px solid ${sidebarBorder}` : 'none',
              display:'flex', alignItems:'center', justifyContent:'center',
              overflow:'hidden',
            }}>
              {logoUrl
                ? <img src={logoUrl} alt="logo"
                    onError={e=>{e.target.style.display='none';}}
                    style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
                : <img src="/logo.jpeg" alt="CRM JISMART"
                    style={{ width:38, height:38, objectFit:'contain', borderRadius:11 }}/>
              }
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13.5, fontWeight:700, color:'#fff',
                fontFamily:"'DM Sans',sans-serif", letterSpacing:-0.2, lineHeight:1.25,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {company?.name || 'CRM JISMART'}
              </div>
              <div style={{ fontSize:10, color:sidebarSubtitle, fontWeight:600,
                letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>
                Panel de control
              </div>
            </div>
          </div>
        </div>

        {/* ── Navegación ── */}
        <nav style={{ flex:1, padding:'8px 14px', overflowY:'auto' }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.4, textTransform:'uppercase',
            color:'rgba(255,255,255,0.22)', padding:'8px 12px 6px' }}>
            Navegación
          </div>
          {nav.map(n => {
            const active = currentView === n.key;
            return (
              <button key={n.key} onClick={() => { onNavigate(n.key); if(isMobile) setSidebarOpen(false); }} style={{
                width:'100%', display:'flex', alignItems:'center', gap:11,
                padding:'9px 12px 9px 11px', borderRadius:10,
                border:'none', borderLeft: active ? `2.5px solid ${primary}` : '2.5px solid transparent',
                background: active ? `rgba(${pRgb},0.14)` : 'transparent',
                color: active ? '#fff' : inactiveFg,
                fontSize:13, fontWeight: active ? 700 : 500,
                cursor:'pointer', marginBottom:1, textAlign:'left',
                fontFamily:"'DM Sans',sans-serif",
              }}
              onMouseEnter={e=>{
                if(!active){
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = '#fff';
                }
              }}
              onMouseLeave={e=>{
                if(!active){
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = inactiveFg;
                }
              }}>
                <n.Icon size={16} color={active ? primary : inactiveFg} strokeWidth={active ? 2.2 : 1.8}/>
                <span style={{ flex:1 }}>{n.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── Usuario / salir ── */}
        <div style={{
          padding:'14px 16px 16px',
          borderTop:`1px solid ${sidebarBorder}`,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{
              width:34, height:34, borderRadius:10, flexShrink:0,
              background: sidebarSurface, border:`1px solid ${sidebarBorder}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:700, color: primary,
            }}>
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:12.5, fontWeight:600, color:'#fff',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user.name}
              </div>
              <RoleBadge role={user.role}/>
            </div>
          </div>
          <button onClick={onLogout} style={{
            width:'100%', padding:'8px 12px',
            background:'transparent',
            border:`1px solid ${sidebarBorder}`,
            borderRadius:9, color:inactiveFg,
            fontSize:11.5, cursor:'pointer', fontWeight:600,
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}
          onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='rgba(255,255,255,0.14)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color=inactiveFg; e.currentTarget.style.borderColor=sidebarBorder; }}>
            <LogOut size={13}/> Cerrar sesión
          </button>
        </div>
      </div>

      {/* ══════════════════════════════
          ÁREA PRINCIPAL — fundida con el sidebar, sin "costuras"
      ══════════════════════════════ */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0,
        background: pageBg || '#f5f7fb' }}>

        {/* Barra superior — transparente, una sola superficie con el contenido */}
        <div style={{
          padding: isMobile ? '0 16px' : '0 28px',
          height:58,
          borderBottom: `1px solid ${cardBorder || 'rgba(15,23,42,0.06)'}`,
          display:'flex', justifyContent:'space-between', alignItems:'center',
          flexShrink:0,
        }}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            {isMobile && (
              <button onClick={()=>setSidebarOpen(o=>!o)} style={{
                background:'none', border:'none', cursor:'pointer', padding:6,
                display:'flex', flexDirection:'column', gap:4, borderRadius:8,
              }}>
                <span style={{display:'block',width:20,height:2,background:'#475569',borderRadius:2,transition:'all .2s',
                  transform: sidebarOpen ? 'rotate(45deg) translateY(6px)' : 'none'}}/>
                <span style={{display:'block',width:20,height:2,background:'#475569',borderRadius:2,transition:'all .2s',
                  opacity: sidebarOpen ? 0 : 1}}/>
                <span style={{display:'block',width:20,height:2,background:'#475569',borderRadius:2,transition:'all .2s',
                  transform: sidebarOpen ? 'rotate(-45deg) translateY(-6px)' : 'none'}}/>
              </button>
            )}
            <h2 style={{ margin:0, fontSize: isMobile ? 13 : 15, fontWeight:700, color:'#1e293b',
              display:'flex', alignItems:'center', gap:10,
              fontFamily:"'DM Sans',sans-serif", letterSpacing:-0.3 }}>
              {(()=>{ const n=nav.find(n=>n.key===currentView);
                return n ? <><n.Icon size={17} color={primary} strokeWidth={2}/>{n.label}</> : null;
              })()}
            </h2>
          </div>
          <div style={{ display:'flex', gap: isMobile ? 6 : 10, alignItems:'center' }}>
            {!isMobile && (
              <div style={{
                fontSize:11, color:'#475569', fontWeight:600,
                background:'transparent', padding:'5px 12px 5px 8px', borderRadius:999,
                display:'flex', alignItems:'center', gap:6,
                border:'1px solid rgba(15,23,42,0.08)',
              }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981' }}/>
                Bot activo
              </div>
            )}
            {(['advisor', 'asesor', 'supervisor', 'admin', 'administrator'].includes(user.role)) && (
              <NotificationBell user={user} primary={primary} apiOrigin={API_ORIGIN} />
            )}
            <RoleBadge role={user.role}/>
          </div>
        </div>

        {/* Contenido de la página */}
        <div className="crm-page-content" style={{
          flex:1, overflowY:'auto', overflowX:'hidden',
          padding: isMobile ? '16px 14px' : '26px 28px',
          width:'100%',
          minWidth:0,
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Coming Soon ──────────────────────────────────────────────────────────────
function ComingSoon({ view, role }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'50vh', color:'#94a3b8' }}>
      <Building2 size={48} color="#e2e8f0"/>
      <div style={{ fontSize:18, fontWeight:700, color:'#0f172a', marginTop:16, marginBottom:8 }}>Módulo en desarrollo</div>
      <div style={{ fontSize:14 }}>Vista: <b>{view}</b> · Rol: <b>{role}</b></div>
    </div>
  );
}

// ─── Dashboard General ────────────────────────────────────────────────────────
function DashboardGeneral({ user }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (token && user.role !== 'super_admin') {
      apiGet('/api/dashboard/stats', token).then(setStats).catch(()=>{});
    }
  }, [user]);

  if (user.role === 'super_admin') {
    return (
      <div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
          {[
            { Icon:Building2, label:'Empresas activas', value:'1', color:'#6366f1' },
            { Icon:Users,     label:'Usuarios totales', value:'5', color:'#10b981' },
            { Icon:Bot,       label:'Bots activos',     value:'1', color:'#f59e0b' },
          ].map((s,i) => (
            <div key={i} style={{ background:'#fff', borderRadius:16, padding:'20px 24px', border:'1px solid #f1f5f9', borderTop:`3px solid ${s.color}` }}>
              <s.Icon size={24} color={s.color} strokeWidth={1.8}/>
              <div style={{ fontSize:28, fontWeight:800, color:'#0f172a', marginTop:10 }}>{s.value}</div>
              <div style={{ fontSize:13, color:'#94a3b8', marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'#fff', borderRadius:16, padding:24, border:'1px solid #f1f5f9' }}>
          <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
            <Building2 size={16} color="#6366f1"/> Empresas registradas
          </h3>
          <div style={{ background:'#f8fafc', borderRadius:10, padding:16 }}>
            <div style={{ fontWeight:700, color:'#0f172a' }}>Empresa Demo</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Plan: Professional · 4 usuarios · Bot activo</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { Icon:Users,    label:'Total clientes', value: stats?.totalClients ?? '—', color:'#6366f1' },
          { Icon:Zap,      label:'Interesados',    value: stats?.interested ?? '—',   color:'#10b981' },
          { Icon:BarChart2,label:'Ventas ganadas', value: stats?.won ?? '—',          color:'#f59e0b' },
          { Icon:Calendar, label:'Pendientes',     value: stats?.pending ?? '—',      color:'#ef4444' },
        ].map((s,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:16, padding:'20px 24px', border:'1px solid #f1f5f9', borderTop:`3px solid ${s.color}` }}>
            <s.Icon size={24} color={s.color} strokeWidth={1.8}/>
            <div style={{ fontSize:30, fontWeight:800, color:'#0f172a', marginTop:10 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background:'#fff', borderRadius:16, padding:24, border:'1px solid #f1f5f9' }}>
        <h3 style={{ margin:'0 0 8px', fontSize:15, fontWeight:700 }}>Bienvenido, {user.name} 👋</h3>
        <p style={{ margin:0, color:'#64748b', fontSize:14 }}>Panel de <b>{user.role}</b> — los módulos se activarán próximamente.</p>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
// ─── Modal cambio de contraseña forzado ───────────────────────────────────────
function ForcePasswordChangeModal({ token, onDone }) {
  const [pass, setPass]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow]       = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (pass.length < 6) return setError('Mínimo 6 caracteres');
    if (pass !== confirm) return setError('Las contraseñas no coinciden');
    setLoading(true);
    try {
      const res = await fetch(`${API_ORIGIN}/api/auth/force-change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword: pass }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Error al cambiar contraseña');
      onDone();
    } catch { setError('No se pudo conectar al servidor'); }
    setLoading(false);
  }

  const inp = { width:'100%', padding:'12px 14px', borderRadius:10, border:'2px solid #e2e8f0', fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit' };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(10,15,30,0.85)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'40px 44px', width:'100%', maxWidth:420, boxShadow:'0 32px 80px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#f59e0b,#d97706)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 style={{ margin:'0 0 8px', fontSize:22, fontWeight:800, color:'#0f1b3d' }}>Actualiza tu contraseña</h2>
          <p style={{ margin:0, fontSize:13, color:'#64748b' }}>El administrador ha restablecido tu acceso. Debes crear una nueva contraseña antes de continuar.</p>
        </div>

        {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', color:'#dc2626', fontSize:13, marginBottom:14 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', display:'block', marginBottom:6 }}>Nueva contraseña</label>
            <input type={show?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)} placeholder="Mínimo 6 caracteres" style={inp} required/>
          </div>
          <div style={{ marginBottom:6 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', display:'block', marginBottom:6 }}>Confirmar contraseña</label>
            <input type={show?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repite la contraseña" style={inp} required/>
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#64748b', cursor:'pointer', marginBottom:20, userSelect:'none' }}>
            <input type="checkbox" checked={show} onChange={e=>setShow(e.target.checked)}/> Mostrar contraseña
          </label>
          <button type="submit" disabled={loading} style={{ width:'100%', padding:'13px', borderRadius:11, border:'none', background:loading?'#94a3b8':'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', fontWeight:800, fontSize:15, cursor:loading?'not-allowed':'pointer' }}>
            {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser]         = useState(null);
  const [company, setCompany]   = useState(null);
  const [currentView, setView]  = useState('dashboard');
  const [checking, setChecking] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    const saved = localStorage.getItem('crm_user');
    const savedCompany = localStorage.getItem('crm_company');
    if (token && saved) {
      try { setUser(JSON.parse(saved)); } catch {}
      try { if (savedCompany) setCompany(JSON.parse(savedCompany)); } catch {}
      // Always fetch fresh company data from API to get latest colors/logo
      fetch(`${API_ORIGIN}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.user) { setUser(data.user); registerPush(); }
          if (data.company) {
            setCompany(data.company);
            localStorage.setItem('crm_company', JSON.stringify(data.company));
          }
        })
        .catch(() => {});
    }
    setChecking(false);
  }, []);

  function handleLogin(u, c) {
    setUser(u); setCompany(c);
    setView('dashboard');
    setShowWelcome(true);
    registerPush();
  }
  function handleLogout() {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    localStorage.removeItem('crm_company');
    setUser(null); setCompany(null);
    setShowWelcome(false);
  }

  if (checking) return (
    <div style={{ position:'fixed', inset:0, background:'#f5f7fb', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
      <div style={{ color:'#1f3d2b', fontSize:22, fontWeight:800, display:'flex', alignItems:'center', gap:10, fontFamily:"'DM Sans',sans-serif" }}>
        <Bot size={28} color="#1f3d2b"/> Cargando...
      </div>
    </div>
  );

  if (!user) return <LoginPage onLogin={handleLogin}/>;

  // Si el superadmin reseteó la contraseña → forzar cambio antes de entrar
  if (user.forcePasswordChange) {
    const token = localStorage.getItem('crm_token');
    return <ForcePasswordChangeModal token={token} onDone={() => {
      const updated = { ...user, forcePasswordChange: false };
      setUser(updated);
      localStorage.setItem('crm_user', JSON.stringify(updated));
    }}/>;
  }

  const primary    = company?.primaryColor   || '#4f6ef7';
  const sidebarBg  = company?.secondaryColor || company?.sidebarColor || 'linear-gradient(180deg,#3b55e0 0%,#5b3fca 60%,#7c5cfc 100%)';
  const pageBg = company?.bgColor || lightenColor(primary, 0.10);
  const cardBg = company?.cardBg  || lightenColor(primary, 0.06);
  const cardBorder = primary + '20';
  const cardShadow = `0 2px 12px ${primary}14`;

  function renderView() {
    const colorProps = { primary, sidebarBg, pageBg, cardBg, cardBorder, cardShadow };
    if (user.role === 'asesor' || user.role === 'advisor') return <DashboardAsesor user={user} currentView={currentView} onNavigate={setView} {...colorProps}/>;
    if (user.role === 'admin')       return <DashboardAdmin      user={user} currentView={currentView} onNavigate={setView} {...colorProps}/>;
    if (user.role === 'supervisor')  return <DashboardSupervisor user={user} currentView={currentView} onNavigate={setView} {...colorProps}/>;
    if (user.role === 'super_admin') return <DashboardSuperAdmin user={user} currentView={currentView} onNavigate={setView} {...colorProps}/>;
    if (currentView === 'dashboard') return <DashboardGeneral user={user}/>;
    return <ComingSoon view={currentView} role={user.role}/>;
  }

  return (
    <>
      {/* Overlay de bienvenida — cubre TODO para todos los roles */}
      {showWelcome && <WelcomeOverlay user={user} onDismiss={() => setShowWelcome(false)}/>}

      <MainLayout user={user} company={company} onLogout={handleLogout} currentView={currentView} onNavigate={setView} primary={primary} sidebarBg={sidebarBg} pageBg={pageBg} cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
        {renderView()}
      </MainLayout>
    </>
  );
}
