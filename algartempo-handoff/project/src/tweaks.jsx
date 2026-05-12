// ============================================================
// Tweaks panel — runtime design controls
// ============================================================

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "density": "balanced",
  "cardStyle": "default",
  "sidebar": "expanded",
  "mobileNav": "tabbar",
  "accent": "#0284c7"
}/*EDITMODE-END*/;

function useTweaks(){
  const load = () => {
    try {
      const v = JSON.parse(localStorage.getItem('algartempo_tweaks')||'null');
      return { ...TWEAK_DEFAULTS, ...(v||{}) };
    } catch { return {...TWEAK_DEFAULTS}; }
  };
  const [t, setT] = useState(load);
  const apply = (patch) => {
    const next = { ...t, ...patch };
    setT(next);
    localStorage.setItem('algartempo_tweaks', JSON.stringify(next));
    const r = document.documentElement;
    r.classList.toggle('dark', !!next.dark);
    r.dataset.density = next.density;
    r.dataset.cards = next.cardStyle;
    r.dataset.sidebar = next.sidebar;
    r.dataset.mnav = next.mobileNav;
    r.style.setProperty('--accent', next.accent);
    // pair accent shades
    const accentMap = {
      '#0284c7': { hover:'#0369a1', soft:'#eff8fd', border:'#bfe2f5', ink:'#0c4a6e' },
      '#0f172a': { hover:'#1e293b', soft:'#f1f5f9', border:'#cbd5e1', ink:'#020617' },
      '#0d9488': { hover:'#0f766e', soft:'#f0fdfa', border:'#99f6e4', ink:'#134e4a' },
      '#6366f1': { hover:'#4f46e5', soft:'#eef2ff', border:'#c7d2fe', ink:'#312e81' },
      '#d97706': { hover:'#b45309', soft:'#fffbeb', border:'#fde68a', ink:'#78350f' },
      '#e11d48': { hover:'#be123c', soft:'#fff1f2', border:'#fecdd3', ink:'#881337' },
    };
    const m = accentMap[next.accent];
    if (m){
      r.style.setProperty('--accent-hover', m.hover);
      r.style.setProperty('--accent-soft', m.soft);
      r.style.setProperty('--accent-border', m.border);
      r.style.setProperty('--accent-ink', m.ink);
    }
    // Notify host for persistence
    try { window.parent.postMessage({type:'__edit_mode_set_keys', edits: patch}, '*'); } catch(e){}
  };
  useEffect(() => {
    // initial apply
    apply({});
    // eslint-disable-next-line
  }, []);
  return [t, apply];
}

function TweaksPanel(){
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [t, apply] = useTweaks();

  useEffect(() => {
    const handler = (ev) => {
      if (!ev.data || !ev.data.type) return;
      if (ev.data.type === '__activate_edit_mode') { setEditMode(true); setOpen(true); }
      if (ev.data.type === '__deactivate_edit_mode') { setEditMode(false); setOpen(false); }
    };
    window.addEventListener('message', handler);
    try { window.parent.postMessage({type:'__edit_mode_available'}, '*'); } catch(e){}
    return () => window.removeEventListener('message', handler);
  }, []);

  // Always show the fab too (so it works outside edit mode)
  const fabVisible = true;

  const accentSwatches = [
    {v:'#0284c7', label:'Azul'},
    {v:'#0f172a', label:'Preto'},
    {v:'#0d9488', label:'Teal'},
    {v:'#6366f1', label:'Indigo'},
    {v:'#d97706', label:'Âmbar'},
    {v:'#e11d48', label:'Rosa'},
  ];

  return (
    <>
      {fabVisible && !open && (
        <button className="tweaks-fab" title="Tweaks" onClick={() => setOpen(true)}>
          <I.sliders size={18}/>
        </button>
      )}
      {open && (
        <div className="tweaks-panel">
          <div className="tweaks-head">
            <h3><I.sliders size={14}/> Tweaks</h3>
            <button className="icon-btn" onClick={() => setOpen(false)}><I.close size={14}/></button>
          </div>
          <div className="tweaks-body">
            <div className="tweak-group">
              <div className="tweak-label"><I.moon size={12}/> Tema</div>
              <div className="tweak-toggle">
                <button className={`switch ${t.dark?'on':''}`} onClick={() => apply({dark: !t.dark})}/>
                <span style={{fontSize:13}}>{t.dark ? 'Escuro' : 'Claro'}</span>
              </div>
            </div>

            <div className="tweak-group">
              <div className="tweak-label"><I.palette size={12}/> Cor de acento</div>
              <div className="tweak-options">
                {accentSwatches.map(s => (
                  <button key={s.v}
                    className={`tweak-opt ${t.accent === s.v ? 'active' : ''}`}
                    onClick={() => apply({accent: s.v})}
                    title={s.label}>
                    <span className="sw" style={{background: s.v, border: '1px solid rgba(0,0,0,.1)'}}/>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="tweak-group">
              <div className="tweak-label"><I.layers size={12}/> Densidade</div>
              <div className="tweak-options">
                {[{v:'compact',l:'Compacta'},{v:'balanced',l:'Equilibrada'},{v:'spacious',l:'Espaçosa'}].map(o => (
                  <button key={o.v} className={`tweak-opt ${t.density === o.v ? 'active' : ''}`} onClick={() => apply({density: o.v})}>{o.l}</button>
                ))}
              </div>
            </div>

            <div className="tweak-group">
              <div className="tweak-label">Estilo de cards</div>
              <div className="tweak-options">
                {[{v:'default',l:'Padrão'},{v:'flat',l:'Flat'},{v:'outlined',l:'Outlined'},{v:'shadow',l:'Sombra'}].map(o => (
                  <button key={o.v} className={`tweak-opt ${t.cardStyle === o.v ? 'active' : ''}`} onClick={() => apply({cardStyle: o.v})}>{o.l}</button>
                ))}
              </div>
            </div>

            <div className="tweak-group">
              <div className="tweak-label">Sidebar (desktop)</div>
              <div className="tweak-options">
                {[{v:'expanded',l:'Expandida'},{v:'collapsed',l:'Colapsada'}].map(o => (
                  <button key={o.v} className={`tweak-opt ${t.sidebar === o.v ? 'active' : ''}`} onClick={() => apply({sidebar: o.v})}>{o.l}</button>
                ))}
              </div>
            </div>

            <div className="tweak-group">
              <div className="tweak-label">Mobile nav</div>
              <div className="tweak-options">
                {[{v:'tabbar',l:'Tab bar'},{v:'drawer',l:'Drawer'}].map(o => (
                  <button key={o.v} className={`tweak-opt ${t.mobileNav === o.v ? 'active' : ''}`} onClick={() => apply({mobileNav: o.v})}>{o.l}</button>
                ))}
              </div>
              <div style={{fontSize:11, color:'var(--text-4)', marginTop:6}}>Visível em ecrãs ≤ 900px</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

window.TweaksPanel = TweaksPanel;
