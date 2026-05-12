// ============================================================
// Reusable primitives
// ============================================================

const { useState, useEffect, useRef, useMemo, useCallback } = React;
// Expose hooks globally so each Babel script can use them
Object.assign(window, { useState, useEffect, useRef, useMemo, useCallback });

// Simple toast system
const ToastCtx = React.createContext(null);
function ToastProvider({ children }){
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind='default') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, {id, msg, kind}]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === 'success' && <I.check size={16}/>}
            {t.kind === 'error'   && <I.alert size={16}/>}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => React.useContext(ToastCtx);

// ── Pill ──────────────────────────────────────────────────
function Pill({ tone='neutral', dot, children, className='' }){
  const toneClass = {
    neutral: '', accent: 'pill-accent',
    green: 'pill-green', amber: 'pill-amber', red: 'pill-red',
    purple: 'pill-purple', teal: 'pill-teal',
  }[tone] || '';
  return (
    <span className={`pill ${toneClass} ${className}`}>
      {dot && <span className="pill-dot" style={{background:dot}}/>}
      {children}
    </span>
  );
}

// ── Segmented control ────────────────────────────────────
function Segmented({ value, onChange, options }){
  return (
    <div className="segmented">
      {options.map(o => (
        <button key={o.value}
          className={`seg-btn ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────
function Modal({ open, onClose, title, children, footer, size }){
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${size || ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose}><I.close size={16}/></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ── Avatar ───────────────────────────────────────────────
function Avatar({ name, initials, size='md', color }){
  const ini = initials || (name||'?').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
  const bg = color || `linear-gradient(135deg, hsl(${(ini.charCodeAt(0)*37)%360} 70% 60%), hsl(${(ini.charCodeAt(1||0)*53)%360} 70% 55%))`;
  return (
    <span className={`avatar ${size}`} style={{background: bg}} title={name}>{ini}</span>
  );
}

// ── Empty state ──────────────────────────────────────────
function EmptyState({ icon, title, sub, action }){
  return (
    <div className="empty-state">
      <div className="empty-state-ic">{icon}</div>
      <h3>{title}</h3>
      {sub && <p style={{marginTop:6, fontSize:13}}>{sub}</p>}
      {action && <div style={{marginTop:16}}>{action}</div>}
    </div>
  );
}

// ── Sparkline ────────────────────────────────────────────
function Sparkline({ data, width=90, height=34, color='var(--accent)' }){
  if (!data || !data.length) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i*step, height - ((v-min)/range) * (height-4) - 2]);
  const d = pts.map((p, i) => `${i===0?'M':'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = d + ` L ${width} ${height} L 0 ${height} Z`;
  const gradId = `sg-${Math.random().toString(36).slice(2,6)}`;
  return (
    <svg width={width} height={height} className="stat-spark">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".25"/>
          <stop offset="1" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`}/>
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

// ── Popover helper ───────────────────────────────────────
function useOutsideClick(ref, handler){
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) handler(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
}

// Date utils
function formatDate(iso){
  if (!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}`;
}
function dateRange(i, f){
  if (i === f) return formatDate(i);
  return `${formatDate(i)} – ${formatDate(f)}`;
}
function daysBetween(i, f){
  const a = new Date(i), b = new Date(f);
  return Math.round((b-a)/86400000) + 1;
}

Object.assign(window, {
  ToastProvider, useToast, Pill, Segmented, Modal, Avatar,
  EmptyState, Sparkline, useOutsideClick,
  formatDate, dateRange, daysBetween,
});
