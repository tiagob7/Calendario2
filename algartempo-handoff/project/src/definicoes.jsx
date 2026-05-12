// ============================================================
// Definições — administração do sistema
// ============================================================

function Definicoes({ pushToast, onNavigate }){
  const [open, setOpen] = useState(null); // null | 'aparencia' | 'utilizadores' | 'escritorios'
  const toggle = (id) => setOpen(o => o === id ? null : id);

  // Cards: navegáveis (vão para outra página) ou expansíveis (abrem painel inline)
  const cards = [
    { id: 'utilizadores',    tone: 'accent', icon: <I.users size={18}/>,    title: 'Utilizadores',
      desc: 'Gerir contas, perfis e permissões dos colaboradores.',
      cta: 'Gerir utilizadores', kind: 'panel' },
    { id: 'escritorios',     tone: 'green',  icon: <I.building size={18}/>, title: 'Escritórios',
      desc: 'Criar, renomear e definir cores dos escritórios da organização.',
      cta: 'Gerir escritórios', kind: 'panel' },
    { id: 'calendario',      tone: 'purple', icon: <I.calendar size={18}/>, title: 'Calendário',
      desc: 'Publicar feriados, eventos e gerir calendários de cada escritório.',
      cta: 'Abrir calendários', kind: 'nav', target: 'calendario' },
    { id: 'perfis',          tone: 'teal',   icon: <I.shield2 size={18}/>,  title: 'Perfis de permissão',
      desc: 'Criar e atribuir perfis reutilizáveis de permissões à equipa.',
      cta: 'Gerir perfis', kind: 'panel' },
    { id: 'auditoria',       tone: 'amber',  icon: <I.clock size={18}/>,    title: 'Auditoria',
      desc: 'Histórico detalhado — quem mudou o quê e quando, em toda a app.',
      cta: 'Ver histórico', kind: 'panel' },
    { id: 'aparencia',       tone: 'purple', icon: <I.palette size={18}/>,  title: 'Aparência',
      desc: 'Tema, modo escuro, densidade e estilo da interface para esta organização.',
      cta: 'Personalizar', kind: 'panel' },
    { id: 'integracoes',     tone: 'accent', icon: <I.layers size={18}/>,   title: 'Integrações',
      desc: 'Email, Slack, calendários externos e outras ligações.',
      cta: 'Configurar', kind: 'panel' },
    { id: 'seed',            tone: 'red',    icon: <I.paper size={18}/>,    title: 'Seed de dados',
      desc: 'Carregar dados de teste no Firestore. Apenas para administradores.',
      cta: 'Abrir seed', kind: 'panel' },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Administração</div>
          <h1>Definições</h1>
          <p className="lede">Configurações globais da plataforma Algartempo. As alterações são aplicadas em todos os escritórios.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><I.layers size={14}/>Exportar configuração</button>
          <button className="btn btn-secondary"><I.help size={14}/>Documentação</button>
        </div>
      </div>

      {/* Top status banner */}
      <div className="hero-card" style={{background: 'linear-gradient(135deg, var(--accent-soft) 0%, color-mix(in srgb, var(--accent-soft) 50%, var(--surface)) 100%)', marginBottom: 24}}>
        <div style={{width: 56, height:56, borderRadius:'var(--r-md)', display:'grid', placeItems:'center', background:'var(--surface)', border:'1px solid var(--accent-border)', color:'var(--accent)', flexShrink:0, position:'relative', zIndex:1}}>
          <I.shield2 size={24}/>
        </div>
        <div className="hero-text">
          <div className="hero-greeting">Tudo configurado.</div>
          <div className="hero-sub">
            10 utilizadores ativos · 4 escritórios · 4 perfis de permissão · última alteração há 2 horas por <b>Sofia Marques</b>.
          </div>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => toggle('auditoria')}>
            <I.clock size={14}/>Ver últimas alterações
          </button>
        </div>
      </div>

      {/* Section header */}
      <div className="dash-section-head" style={{marginTop: 0}}>
        <h2>Categorias</h2>
        <span className="see-all" style={{cursor:'default'}}>{cards.length} secções</span>
      </div>

      {/* Card grid */}
      <div className="def-grid">
        {cards.map(c => (
          <DefCard key={c.id}
            data={c}
            active={open === c.id}
            onClick={() => {
              if (c.kind === 'nav') { onNavigate?.(c.target); pushToast?.(`A abrir ${c.title.toLowerCase()}…`); }
              else toggle(c.id);
            }}
          />
        ))}
      </div>

      {/* Inline panels */}
      {open === 'aparencia'    && <PanelAparencia    onClose={() => setOpen(null)} pushToast={pushToast}/>}
      {open === 'utilizadores' && <PanelUtilizadoresResumo onClose={() => setOpen(null)} onNavigate={onNavigate}/>}
      {open === 'escritorios'  && <PanelEscritorios   onClose={() => setOpen(null)} pushToast={pushToast}/>}
      {open === 'perfis'       && <PanelPerfis        onClose={() => setOpen(null)} pushToast={pushToast}/>}
      {open === 'auditoria'    && <PanelAuditoria     onClose={() => setOpen(null)}/>}
      {open === 'integracoes'  && <PanelIntegracoes   onClose={() => setOpen(null)} pushToast={pushToast}/>}
      {open === 'seed'         && <PanelSeed          onClose={() => setOpen(null)} pushToast={pushToast}/>}

      <div style={{marginTop: 30, textAlign:'center', fontSize:11, color:'var(--text-4)'}}>
        Algartempo Hub · v3.4.2 · Última sincronização: agora
      </div>
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────
function DefCard({ data, active, onClick }){
  const { tone, icon, title, desc, cta } = data;
  return (
    <button className={`def-card ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="def-card-top">
        <div className={`def-card-icon tone-${tone}`}>{icon}</div>
        <div className="def-card-title">{title}</div>
      </div>
      <div className="def-card-desc">{desc}</div>
      <div className="def-card-foot">
        <span className="def-card-link">
          {cta}
          <I.chevronRight size={12}/>
        </span>
      </div>
    </button>
  );
}

// ── Painel container ───────────────────────────────────────
function Panel({ icon, title, subtitle, headAction, onClose, children }){
  return (
    <div className="def-panel">
      <div className="def-panel-head">
        <div className="def-panel-ic">{icon}</div>
        <div style={{flex:1, minWidth:0}}>
          <h3>{title}</h3>
          {subtitle && <div className="def-panel-sub">{subtitle}</div>}
        </div>
        {headAction}
        <button className="icon-btn" onClick={onClose}><I.close size={14}/></button>
      </div>
      <div className="def-panel-body">{children}</div>
    </div>
  );
}

// ── Aparência ──────────────────────────────────────────────
function PanelAparencia({ onClose, pushToast }){
  const tweaks = JSON.parse(localStorage.getItem('algartempo_tweaks') || '{}');
  const [dark, setDark]         = useState(!!tweaks.dark);
  const [density, setDensity]   = useState(tweaks.density || 'balanced');
  const [cardStyle, setCardStyle] = useState(tweaks.cardStyle || 'outlined');
  const [accent, setAccent]     = useState(tweaks.accent || '#0284c7');

  const apply = (patch) => {
    const t = JSON.parse(localStorage.getItem('algartempo_tweaks') || '{}');
    Object.assign(t, patch);
    localStorage.setItem('algartempo_tweaks', JSON.stringify(t));
    if ('dark' in patch)     document.documentElement.classList.toggle('dark', !!patch.dark);
    if (patch.density)       document.documentElement.dataset.density = patch.density;
    if (patch.cardStyle)     document.documentElement.dataset.cards = patch.cardStyle;
    if (patch.accent)        document.documentElement.style.setProperty('--accent', patch.accent);
  };

  const accents = [
    { val: '#0284c7', name: 'Algartempo' },
    { val: '#0d9488', name: 'Teal' },
    { val: '#7c3aed', name: 'Violeta' },
    { val: '#dc2626', name: 'Carmim' },
    { val: '#d97706', name: 'Âmbar' },
    { val: '#0f766e', name: 'Floresta' },
  ];

  return (
    <Panel icon={<I.palette size={16}/>} title="Aparência" subtitle="Tema e densidade desta organização" onClose={onClose}>
      {/* Modo */}
      <SettingRow label="Modo" hint="Tema claro ou escuro para todos os ecrãs.">
        <Segmented value={dark ? 'dark' : 'light'} onChange={v => { const d = v === 'dark'; setDark(d); apply({ dark: d }); }} options={[
          { value: 'light', label: 'Claro', icon: <I.sun size={12}/> },
          { value: 'dark',  label: 'Escuro', icon: <I.moon size={12}/> },
        ]}/>
      </SettingRow>

      {/* Densidade */}
      <SettingRow label="Densidade" hint="Espaçamento global entre elementos.">
        <Segmented value={density} onChange={v => { setDensity(v); apply({ density: v }); }} options={[
          { value: 'compact',   label: 'Compacta' },
          { value: 'balanced',  label: 'Equilibrada' },
          { value: 'spacious',  label: 'Folgada' },
        ]}/>
      </SettingRow>

      {/* Cards */}
      <SettingRow label="Estilo dos cards" hint="Como os cards são apresentados.">
        <Segmented value={cardStyle} onChange={v => { setCardStyle(v); apply({ cardStyle: v }); }} options={[
          { value: 'flat',     label: 'Plano' },
          { value: 'outlined', label: 'Contornado' },
          { value: 'shadow',   label: 'Sombreado' },
        ]}/>
      </SettingRow>

      {/* Cor */}
      <SettingRow label="Cor de destaque" hint="Aplica em botões, links e estados ativos.">
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          {accents.map(a => (
            <button key={a.val}
              onClick={() => { setAccent(a.val); apply({ accent: a.val }); }}
              title={a.name}
              style={{
                width: 32, height: 32,
                borderRadius: 'var(--r-md)',
                background: a.val,
                border: accent === a.val ? '2px solid var(--text)' : '2px solid transparent',
                boxShadow: accent === a.val ? '0 0 0 2px var(--surface), 0 0 0 4px var(--accent)' : 'var(--shadow-sm)',
                transition: 'all 140ms',
              }}
            />
          ))}
        </div>
      </SettingRow>

      <div style={{display:'flex', justifyContent:'flex-end', marginTop: 14}}>
        <button className="btn btn-secondary btn-sm" onClick={() => {
          apply({ dark: false, density: 'balanced', cardStyle: 'outlined', accent: '#0284c7' });
          setDark(false); setDensity('balanced'); setCardStyle('outlined'); setAccent('#0284c7');
          pushToast?.('Aparência reposta', 'success');
        }}>Repor padrão</button>
      </div>
    </Panel>
  );
}

function SettingRow({ label, hint, children }){
  return (
    <div className="def-setting-row">
      <div className="def-setting-meta">
        <div className="def-setting-label">{label}</div>
        {hint && <div className="def-setting-hint">{hint}</div>}
      </div>
      <div className="def-setting-ctrl">{children}</div>
    </div>
  );
}

// ── Resumo Utilizadores ────────────────────────────────────
function PanelUtilizadoresResumo({ onClose, onNavigate }){
  const sample = (window.UTI_USERS_SAMPLE || [
    { initials: 'SM', name: 'Sofia Marques',  role: 'Admin',         office: 'Lisboa', color: 'linear-gradient(135deg,#f472b6,#8b5cf6)' },
    { initials: 'IR', name: 'Inês Rocha',     role: 'Admin',         office: 'Porto',  color: '#10b981' },
    { initials: 'JP', name: 'João Pereira',   role: 'Colaborador',   office: 'Lisboa', color: '#f59e0b' },
    { initials: 'BC', name: 'Beatriz Costa',  role: 'Colaborador',   office: 'Lisboa', color: '#ec4899' },
    { initials: 'MS', name: 'Miguel Santos',  role: 'Colaborador',   office: 'Faro',   color: '#8b5cf6' },
  ]);
  return (
    <Panel
      icon={<I.users size={16}/>}
      title="Utilizadores"
      subtitle="10 contas · 2 administradores · 1 pendente"
      onClose={onClose}
      headAction={
        <button className="btn btn-primary btn-sm" onClick={() => onNavigate?.('utilizadores')}>
          Gestão completa <I.chevronRight size={12}/>
        </button>
      }
    >
      <div style={{display:'flex', flexDirection:'column', border:'1px solid var(--border)', borderRadius:'var(--r-md)', overflow:'hidden'}}>
        {sample.map((u, i) => (
          <div key={i} style={{display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderBottom: i < sample.length - 1 ? '1px solid var(--divider)' : 'none'}}>
            <Avatar name={u.name} initials={u.initials} size="sm" color={u.color}/>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:13, fontWeight:600}}>{u.name}</div>
              <div style={{fontSize:11.5, color:'var(--text-3)'}}>{u.office}</div>
            </div>
            {u.role === 'Admin'
              ? <Pill tone="accent" dot="var(--accent)">{u.role}</Pill>
              : <Pill tone="neutral">{u.role}</Pill>}
          </div>
        ))}
      </div>
      <div style={{display:'flex', alignItems:'center', gap:8, padding:'12px', marginTop: 12, background:'var(--accent-soft)', border:'1px solid var(--accent-border)', borderRadius:'var(--r-md)', color:'var(--accent-ink)', fontSize:12.5}}>
        <I.help size={14}/>
        <span>Para criar, editar ou remover contas, abre a gestão completa.</span>
      </div>
    </Panel>
  );
}

// ── Escritórios ────────────────────────────────────────────
function PanelEscritorios({ onClose, pushToast }){
  const [list, setList]     = useState(OFFICES.map(o => ({...o, ativo: true, ordem: 10})));
  const [editing, setEditing] = useState(null);

  return (
    <Panel
      icon={<I.building size={16}/>}
      title="Escritórios"
      subtitle="Localizações onde a equipa opera"
      onClose={onClose}
      headAction={
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ novo: true, name:'', city:'', color:'#0284c7' })}>
          <I.plus size={12}/>Novo escritório
        </button>
      }
    >
      <div style={{display:'flex', flexDirection:'column', border:'1px solid var(--border)', borderRadius:'var(--r-md)', overflow:'hidden'}}>
        {list.map((o, i) => (
          <div key={o.id} style={{display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:14, alignItems:'center', padding:'12px 14px', borderBottom: i < list.length - 1 ? '1px solid var(--divider)' : 'none'}}>
            <div style={{width:32, height:32, borderRadius:'var(--r-md)', background: o.color, display:'grid', placeItems:'center', color:'white'}}>
              <I.building size={14}/>
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13.5, fontWeight:600}}>{o.name}</div>
              <div style={{fontSize:11.5, color:'var(--text-3)'}}>id: <span className="mono">{o.id}</span> · ordem {o.ordem}</div>
            </div>
            <Pill tone={o.ativo ? 'green' : 'neutral'} dot={o.ativo ? 'var(--green)' : null}>{o.ativo ? 'Ativo' : 'Inativo'}</Pill>
            <div style={{display:'flex', gap:4}}>
              <button className="icon-btn sm" title="Editar" onClick={() => setEditing(o)}><I.edit size={13}/></button>
              <button className="icon-btn sm" title="Remover" onClick={() => { setList(l => l.filter(x => x.id !== o.id)); pushToast?.('Escritório removido', 'success'); }}><I.trash size={13}/></button>
            </div>
          </div>
        ))}
      </div>

      <div className="def-info-note" style={{marginTop: 14}}>
        <I.help size={14}/>
        <span>As alterações ficam disponíveis em toda a app de imediato — tarefas, comunicados e calendários atualizam automaticamente.</span>
      </div>

      {editing && (
        <Modal
          open={true}
          onClose={() => setEditing(null)}
          title={editing.novo ? 'Novo escritório' : `Editar · ${editing.name}`}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => { setEditing(null); pushToast?.('Escritório guardado', 'success'); }}>
              <I.check size={14}/>Guardar
            </button>
          </>}
        >
          <div className="form-grid">
            <div className="field full">
              <label className="field-label">Nome do escritório</label>
              <input className="input" defaultValue={editing.name || ''} placeholder="Lisboa — Saldanha"/>
            </div>
            <div className="field">
              <label className="field-label">ID interno</label>
              <input className="input mono" defaultValue={editing.id || ''} placeholder="lisboa" disabled={!editing.novo}/>
              <span className="field-hint">{editing.novo ? 'Minúsculas, sem espaços — definitivo.' : 'O ID é definitivo.'}</span>
            </div>
            <div className="field">
              <label className="field-label">Ordem</label>
              <input className="input" type="number" defaultValue={editing.ordem || 10}/>
            </div>
            <div className="field full">
              <label className="field-label">Cor</label>
              <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                {['#0284c7','#0d9488','#7c3aed','#dc2626','#d97706','#059669','#db2777','#475569'].map(c => (
                  <button key={c} style={{width:30, height:30, borderRadius:'var(--r-md)', background:c, border: c === editing.color ? '2px solid var(--text)' : '2px solid transparent', boxShadow:'var(--shadow-sm)'}}/>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </Panel>
  );
}

// ── Perfis de permissão ────────────────────────────────────
function PanelPerfis({ onClose, pushToast }){
  const perfis = [
    { name: 'Administração',     desc: 'Acesso total ao sistema',                                 users: 2, color: 'var(--accent)' },
    { name: 'Recursos Humanos',  desc: 'Aprovar férias, gerir admissões, despesas',               users: 2, color: 'var(--purple)' },
    { name: 'Operações',         desc: 'Tarefas, clientes, reclamações, calendário',              users: 5, color: 'var(--teal)' },
    { name: 'Marketing',         desc: 'Comunicados, conteúdos e website',                        users: 1, color: 'var(--amber)' },
  ];
  return (
    <Panel
      icon={<I.shield2 size={16}/>}
      title="Perfis de permissão"
      subtitle="Conjuntos reutilizáveis de permissões aplicados aos colaboradores"
      onClose={onClose}
      headAction={<button className="btn btn-primary btn-sm"><I.plus size={12}/>Novo perfil</button>}
    >
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap: 12}}>
        {perfis.map(p => (
          <div key={p.name} style={{padding: 16, border:'1px solid var(--border)', borderRadius:'var(--r-md)', background:'var(--surface)'}}>
            <div style={{display:'flex', alignItems:'center', gap:10, marginBottom: 8}}>
              <div style={{width:8, height:24, borderRadius:2, background: p.color}}/>
              <div style={{fontSize:14, fontWeight:700, fontFamily:"'Sora',sans-serif"}}>{p.name}</div>
            </div>
            <div style={{fontSize:12.5, color:'var(--text-3)', lineHeight:1.5, marginBottom: 10}}>{p.desc}</div>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <Pill tone="neutral"><I.users size={11}/> {p.users} {p.users === 1 ? 'pessoa' : 'pessoas'}</Pill>
              <button className="btn btn-ghost btn-sm">Editar <I.chevronRight size={11}/></button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── Auditoria ──────────────────────────────────────────────
function PanelAuditoria({ onClose }){
  const events = [
    { tone: 'blue',  who: 'Sofia Marques',  what: 'alterou permissões de',         target: 'Inês Rocha → Administrador', meta: 'há 2 h',     ip: '188.250.x.x' },
    { tone: 'green', who: 'Sofia Marques',  what: 'criou conta',                   target: 'Carolina Dias',              meta: 'ontem · 14:22', ip: '188.250.x.x' },
    { tone: 'red',   who: 'Sofia Marques',  what: 'removeu',                       target: 'Pedro Soares (suspensão temporária)', meta: 'há 3 dias',  ip: '188.250.x.x' },
    { tone: 'blue',  who: 'Inês Rocha',     what: 'editou escritório',             target: 'Porto — Boavista (cor)',     meta: 'há 5 dias',  ip: '79.168.x.x'  },
    { tone: 'green', who: 'Sistema',        what: 'aplicou regras automáticas',    target: 'Reset de sessões inativas (3)', meta: 'há 7 dias',  ip: 'cron' },
  ];
  return (
    <Panel
      icon={<I.clock size={16}/>}
      title="Auditoria"
      subtitle="Tudo o que mudou na configuração do sistema"
      onClose={onClose}
      headAction={<button className="btn btn-secondary btn-sm"><I.layers size={12}/>Exportar</button>}
    >
      <ul className="timeline" style={{margin: '6px 0 0'}}>
        {events.map((e, i) => (
          <li key={i} className={`tl-item tone-${e.tone}`}>
            <span className="tl-marker">
              {e.tone === 'red' && <I.trash size={11}/>}
              {e.tone === 'green' && <I.plus size={11}/>}
              {e.tone === 'blue' && <I.edit size={11}/>}
            </span>
            <div style={{flex:1}}>
              <div className="tl-title">
                <b>{e.who}</b> <span style={{color:'var(--text-3)', fontWeight:400}}>{e.what}</span> <span style={{color:'var(--accent)'}}>{e.target}</span>
              </div>
              <div className="tl-meta">{e.meta} · IP <span className="mono">{e.ip}</span></div>
            </div>
          </li>
        ))}
      </ul>
      <div style={{textAlign:'center', marginTop: 12}}>
        <button className="btn btn-ghost btn-sm">Ver todos os 247 eventos <I.chevronRight size={11}/></button>
      </div>
    </Panel>
  );
}

// ── Integrações ────────────────────────────────────────────
function PanelIntegracoes({ onClose, pushToast }){
  const ints = [
    { name: 'Email · SMTP',    desc: 'Envio de notificações e convites',  status: 'ligado',     icon: <I.mail size={16}/>,  tone:'green' },
    { name: 'Calendário Google', desc: 'Sincronizar férias e eventos',   status: 'desligado',  icon: <I.calendar size={16}/>, tone:'neutral' },
    { name: 'Slack',           desc: 'Receber alertas em canais Slack',  status: 'desligado',  icon: <I.chat size={16}/>,    tone:'neutral' },
    { name: 'Firestore',       desc: 'Base de dados primária',           status: 'ligado',     icon: <I.layers size={16}/>,  tone:'green' },
  ];
  return (
    <Panel icon={<I.layers size={16}/>} title="Integrações" subtitle="Serviços externos ligados a esta organização" onClose={onClose}>
      <div style={{display:'flex', flexDirection:'column', border:'1px solid var(--border)', borderRadius:'var(--r-md)', overflow:'hidden'}}>
        {ints.map((it, i) => (
          <div key={it.name} style={{display:'flex', alignItems:'center', gap:14, padding:'14px', borderBottom: i < ints.length - 1 ? '1px solid var(--divider)' : 'none'}}>
            <div style={{width:36, height:36, borderRadius:'var(--r-md)', background:'var(--surface-2)', border:'1px solid var(--border)', display:'grid', placeItems:'center', color:'var(--text-2)'}}>{it.icon}</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:13.5, fontWeight:600}}>{it.name}</div>
              <div style={{fontSize:12, color:'var(--text-3)'}}>{it.desc}</div>
            </div>
            {it.status === 'ligado'
              ? <Pill tone="green" dot="var(--green)">Ligado</Pill>
              : <Pill tone="neutral">Não configurado</Pill>}
            <button className="btn btn-secondary btn-sm" onClick={() => pushToast?.(`A configurar ${it.name}…`)}>
              {it.status === 'ligado' ? 'Configurar' : 'Ligar'}
            </button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── Seed ───────────────────────────────────────────────────
function PanelSeed({ onClose, pushToast }){
  return (
    <Panel icon={<I.paper size={16}/>} title="Seed de dados" subtitle="Carregar dados de teste — destrutivo" onClose={onClose}>
      <div className="alert-card red" style={{marginBottom: 16}}>
        <I.alert size={18}/>
        <div>
          <div style={{fontWeight: 600}}>Atenção — operação destrutiva</div>
          <div style={{fontSize:12.5, marginTop:2}}>Esta ação substitui todos os dados de teste no Firestore. <b>Não usar em produção.</b></div>
        </div>
      </div>
      <div className="form-grid">
        <div className="field full">
          <label className="field-label">Coleções a recriar</label>
          <div style={{display:'flex', flexDirection:'column', gap:8, padding:12, border:'1px solid var(--border)', borderRadius:'var(--r-md)'}}>
            {['utilizadores', 'escritorios', 'tarefas', 'reclamacoes', 'comunicados', 'ferias'].map(c => (
              <label key={c} style={{display:'flex', alignItems:'center', gap:10, fontSize:13}}>
                <input type="checkbox" defaultChecked/>
                <span className="mono">{c}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop: 14}}>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger" onClick={() => pushToast?.('Seed executado · 6 coleções', 'success')}>
          <I.alert size={13}/>Recriar dados
        </button>
      </div>
    </Panel>
  );
}

window.Definicoes = Definicoes;
