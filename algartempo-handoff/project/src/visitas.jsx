// ============================================================
// Visitas — registo de visitas a clientes e parceiros
// ============================================================

const VIS_TIPOS = {
  reuniao:      { label: 'Reunião',       tone: 'accent', icon: 'users',    color: '#0284c7' },
  demonstracao: { label: 'Demonstração',  tone: 'purple', icon: 'star',     color: '#8b5cf6' },
  auditoria:    { label: 'Auditoria',     tone: 'amber',  icon: 'shield2',  color: '#f59e0b' },
  formacao:     { label: 'Formação',      tone: 'teal',   icon: 'book',     color: '#0d9488' },
  comercial:    { label: 'Comercial',     tone: 'green',  icon: 'building', color: '#10b981' },
  outro:        { label: 'Outro',         tone: 'neutral',icon: 'pin',      color: '#64748b' },
};

const VIS_SEED = [
  { id: 'v1', uid: 'u2', responsavel: 'João Pereira',   email: 'joao.pereira@algartempo.pt',   officeId: 'lisboa', cliente: 'TechMar Soluções',     local: 'Lisboa · Parque das Nações',      dataVisita: '2026-05-12', tipo: 'comercial',    estado: 'agendada',  descricao: 'Apresentação da proposta anual de serviço temporário.', criadoEm: 'há 2 h',    initials: 'JP', color: '#f59e0b' },
  { id: 'v2', uid: 'u4', responsavel: 'Miguel Santos',  email: 'miguel.santos@algartempo.pt',  officeId: 'faro',   cliente: 'Hotel Vila Galé',      local: 'Albufeira · Vilamoura',           dataVisita: '2026-05-13', tipo: 'reuniao',      estado: 'agendada',  descricao: 'Reforço de equipa para alta estação (recepção e cozinha).', criadoEm: 'há 4 h',  initials: 'MS', color: '#8b5cf6' },
  { id: 'v3', uid: 'u5', responsavel: 'Beatriz Costa',  email: 'beatriz.costa@algartempo.pt',  officeId: 'lisboa', cliente: 'Logística Atlântica',  local: 'Alverca · Centro Logístico',      dataVisita: '2026-05-14', tipo: 'auditoria',    estado: 'agendada',  descricao: 'Auditoria interna ao processo de admissão de operadores.',  criadoEm: 'há 6 h',   initials: 'BC', color: '#ec4899' },
  { id: 'v4', uid: 'u3', responsavel: 'Inês Rocha',     email: 'ines.rocha@algartempo.pt',     officeId: 'porto',  cliente: 'Bosch Termotecnologia',local: 'Aveiro · Cacia',                  dataVisita: '2026-05-08', tipo: 'reuniao',      estado: 'realizada', descricao: 'Reunião de alinhamento Q2. Cliente satisfeito.',           resultado: 'Renovação contratual confirmada para mais 24 meses. Aumento de volume previsto para Setembro.', criadoEm: 'há 4 dias', realizadaEm: 'há 3 dias', initials: 'IR', color: '#10b981' },
  { id: 'v5', uid: 'u7', responsavel: 'Ana Lima',       email: 'ana.lima@algartempo.pt',       officeId: 'porto',  cliente: 'Sonae MC',             local: 'Maia · Sede Sonae',               dataVisita: '2026-05-06', tipo: 'comercial',    estado: 'realizada', descricao: 'Pitch para reforço de equipa logística no Natal 2026.',     resultado: 'Cliente pediu proposta detalhada. Envio até 15/05.',                                          criadoEm: 'há 6 dias', realizadaEm: 'há 5 dias', initials: 'AL', color: '#ef4444' },
  { id: 'v6', uid: 'u6', responsavel: 'Rui Fernandes',  email: 'rui.fernandes@algartempo.pt',  officeId: 'braga',  cliente: 'Continental Mabor',    local: 'Famalicão · Lousado',             dataVisita: '2026-05-04', tipo: 'formacao',     estado: 'realizada', descricao: 'Formação de segurança a 12 novos colaboradores.',          resultado: '12 colaboradores certificados. Próxima sessão a 18/05.',                                       criadoEm: 'há 8 dias', realizadaEm: 'há 7 dias', initials: 'RF', color: '#06b6d4' },
  { id: 'v7', uid: 'u10',responsavel: 'Luísa Antunes',  email: 'luisa.antunes@algartempo.pt',  officeId: 'faro',   cliente: 'Pestana Algarve',      local: 'Vilamoura · Hotel',               dataVisita: '2026-05-02', tipo: 'demonstracao', estado: 'cancelada', descricao: 'Demonstração de plataforma de gestão de turnos.',          criadoEm: 'há 10 dias', initials: 'LA', color: '#14b8a6' },
];

function Visitas({ pushToast }){
  const [list, setList]         = useState(VIS_SEED);
  const [view, setView]         = useState('cards'); // cards | tabela | timeline
  const [search, setSearch]     = useState('');
  const [estado, setEstado]     = useState('todos');
  const [tipo, setTipo]         = useState('todos');
  const [office, setOffice]     = useState('todos');
  const [selected, setSelected] = useState(null);
  const [modalNew, setModalNew] = useState(false);

  const filtered = useMemo(() => {
    return list.filter(v => {
      if (estado !== 'todos' && v.estado   !== estado) return false;
      if (tipo   !== 'todos' && v.tipo     !== tipo)   return false;
      if (office !== 'todos' && v.officeId !== office) return false;
      if (search){
        const s = search.toLowerCase();
        if (!v.cliente.toLowerCase().includes(s) && !v.responsavel.toLowerCase().includes(s) && !(v.local||'').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [list, search, estado, tipo, office]);

  const counts = useMemo(() => ({
    agendadas:  list.filter(v => v.estado === 'agendada').length,
    realizadas: list.filter(v => v.estado === 'realizada').length,
    canceladas: list.filter(v => v.estado === 'cancelada').length,
    proximas:   list.filter(v => v.estado === 'agendada' && v.dataVisita <= '2026-05-15').length,
  }), [list]);

  const officeOf = (id) => OFFICES.find(o => o.id === id);

  const marcar = (id, resultado) => {
    setList(l => l.map(v => v.id === id ? {...v, estado:'realizada', resultado, realizadaEm:'agora'} : v));
    setSelected(s => s?.id === id ? {...s, estado:'realizada', resultado, realizadaEm:'agora'} : s);
    pushToast?.('Visita marcada como realizada', 'success');
  };
  const cancelar = (id) => {
    setList(l => l.map(v => v.id === id ? {...v, estado:'cancelada'} : v));
    setSelected(s => s?.id === id ? {...s, estado:'cancelada'} : s);
    pushToast?.('Visita cancelada', 'success');
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Operações</div>
          <h1>Visitas</h1>
          <p className="lede">Registo de visitas a clientes e parceiros. Permite acompanhar a atividade comercial e operacional no terreno.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><I.layers size={14}/>Exportar</button>
          <button className="btn btn-primary" onClick={() => setModalNew(true)}><I.plus size={14}/>Nova visita</button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="stat-grid" style={{marginBottom: 18}}>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.calendar size={14}/></span>Agendadas</div>
          <div className="stat-val">{counts.agendadas}</div>
          <div className="stat-delta flat"><span className="mono">{counts.proximas}</span> nos próximos 7 dias</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.check2 size={14}/></span>Realizadas</div>
          <div className="stat-val">{counts.realizadas}</div>
          <div className="stat-delta up"><I.arrowUp size={11}/><span className="mono">+22%</span> vs mês passado</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.alert size={14}/></span>Canceladas</div>
          <div className="stat-val">{counts.canceladas}</div>
          <div className="stat-delta flat">este mês</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.pin size={14}/></span>Locais únicos</div>
          <div className="stat-val">{new Set(list.map(v => v.local)).size}</div>
          <div className="stat-delta flat">visitados em 2026</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{marginBottom: 14}}>
        <div className="card-body" style={{display:'flex', alignItems:'center', gap: 12, flexWrap:'wrap', padding:'12px 16px'}}>
          <Segmented value={estado} onChange={setEstado} options={[
            { value: 'todos',     label: `Todas · ${list.length}` },
            { value: 'agendada',  label: `Agendadas · ${counts.agendadas}` },
            { value: 'realizada', label: `Realizadas · ${counts.realizadas}` },
            { value: 'cancelada', label: `Canceladas · ${counts.canceladas}` },
          ]}/>
          <div style={{flex:1, position:'relative', minWidth: 200}}>
            <I.search size={14} style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-4)'}}/>
            <input className="input" style={{paddingLeft: 32}} placeholder="Pesquisar cliente, local ou responsável…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select className="select" style={{maxWidth: 150}} value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="todos">Todos os tipos</option>
            {Object.entries(VIS_TIPOS).map(([k,c]) => <option key={k} value={k}>{c.label}</option>)}
          </select>
          <select className="select" style={{maxWidth: 150}} value={office} onChange={e => setOffice(e.target.value)}>
            <option value="todos">Todos os escritórios</option>
            {OFFICES.map(o => <option key={o.id} value={o.id}>{o.city}</option>)}
          </select>
          <Segmented value={view} onChange={setView} options={[
            { value:'cards',    label:'Cards' },
            { value:'tabela',   label:'Tabela' },
          ]}/>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="card"><div className="card-body">
          <EmptyState icon={<I.pin size={22}/>} title="Sem visitas" sub="Regista a primeira visita ou ajusta os filtros."/>
        </div></div>
      ) : view === 'cards' ? (
        <div className="vis-grid">
          {filtered.map(v => <VisitaCard key={v.id} v={v} office={officeOf(v.officeId)} onClick={() => setSelected(v)}/>)}
        </div>
      ) : (
        <div className="card">
          <div className="card-body p0">
            <table className="data-table">
              <thead>
                <tr><th>Cliente</th><th>Tipo</th><th>Local</th><th>Data</th><th>Responsável</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const tp = VIS_TIPOS[v.tipo] || VIS_TIPOS.outro;
                  const off = officeOf(v.officeId);
                  return (
                    <tr key={v.id} onClick={() => setSelected(v)}>
                      <td><div style={{fontWeight:600, fontSize:13.5}}>{v.cliente}</div></td>
                      <td><Pill tone={tp.tone}>{tp.label}</Pill></td>
                      <td><span style={{fontSize:12.5, color:'var(--text-3)'}}><I.pin size={11} style={{verticalAlign:'middle', marginRight:4}}/>{v.local}</span></td>
                      <td><span className="mono" style={{fontSize:12}}>{v.dataVisita}</span></td>
                      <td>
                        <div style={{display:'flex', alignItems:'center', gap:8}}>
                          <Avatar name={v.responsavel} initials={v.initials} size="sm" color={v.color}/>
                          <span style={{fontSize:13}}>{v.responsavel}</span>
                        </div>
                      </td>
                      <td>
                        {v.estado === 'agendada'  && <Pill tone="accent" dot="var(--accent)">Agendada</Pill>}
                        {v.estado === 'realizada' && <Pill tone="green"  dot="var(--green)">Realizada</Pill>}
                        {v.estado === 'cancelada' && <Pill tone="red"    dot="var(--red)">Cancelada</Pill>}
                      </td>
                      <td style={{textAlign:'right', paddingRight:14}}>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setSelected(v); }}>Ver <I.chevronRight size={11}/></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <VisitaDrawer
          v={selected}
          office={officeOf(selected.officeId)}
          onClose={() => setSelected(null)}
          onMarcar={(res) => marcar(selected.id, res)}
          onCancelar={() => cancelar(selected.id)}
          onEliminar={() => { setList(l => l.filter(x => x.id !== selected.id)); pushToast?.('Visita eliminada'); setSelected(null); }}
        />
      )}

      <Modal open={modalNew} onClose={() => setModalNew(false)} title="Nova visita" size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModalNew(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { pushToast?.('Visita registada', 'success'); setModalNew(false); }}>
            <I.check size={14}/>Registar visita
          </button>
        </>}>
        <div className="form-grid">
          <div className="field full">
            <label className="field-label">Cliente / Entidade <span className="req">*</span></label>
            <input className="input" placeholder="ex: TechMar Soluções"/>
          </div>
          <div className="field full">
            <label className="field-label">Tipo de visita</label>
            <div className="vis-type-grid">
              {Object.entries(VIS_TIPOS).filter(([k]) => k !== 'outro').map(([k,c]) => {
                const Ico = I[c.icon] || I.pin;
                return (
                  <label key={k} className="vis-type-opt">
                    <input type="radio" name="vtipo" defaultChecked={k === 'reuniao'}/>
                    <span className={`def-card-icon tone-${c.tone}`} style={{width:32, height:32}}><Ico size={14}/></span>
                    <span style={{fontSize:13, fontWeight:600}}>{c.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="field">
            <label className="field-label">Data <span className="req">*</span></label>
            <input className="input" type="date" defaultValue="2026-05-12"/>
          </div>
          <div className="field">
            <label className="field-label">Escritório</label>
            <select className="select" defaultValue="lisboa">
              {OFFICES.map(o => <option key={o.id} value={o.id}>{o.city}</option>)}
            </select>
          </div>
          <div className="field full">
            <label className="field-label">Local</label>
            <input className="input" placeholder="ex: Lisboa · Parque das Nações"/>
          </div>
          <div className="field full">
            <label className="field-label">Responsável</label>
            <input className="input" placeholder="Nome de quem realiza a visita"/>
          </div>
          <div className="field full">
            <label className="field-label">Objetivo / descrição</label>
            <textarea className="textarea" rows={3} placeholder="O que vai ser tratado nesta visita…"/>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function VisitaCard({ v, office, onClick }){
  const tp = VIS_TIPOS[v.tipo] || VIS_TIPOS.outro;
  const Ico = I[tp.icon] || I.pin;
  return (
    <button className={`vis-card vis-${v.estado}`} onClick={onClick}>
      <div className="vis-card-head">
        <div className={`def-card-icon tone-${tp.tone}`} style={{width:36, height:36}}><Ico size={15}/></div>
        <div style={{flex:1, minWidth:0}}>
          <div className="vis-card-title">{v.cliente}</div>
          <div className="vis-card-meta">
            <Pill tone={tp.tone}>{tp.label}</Pill>
            <span className="pill-dot" style={{background: office?.color}}/>
            <span style={{fontSize:11.5, color:'var(--text-4)'}}>{office?.city}</span>
          </div>
        </div>
      </div>
      <div className="vis-card-body">
        {v.local && <div className="vis-line"><I.pin size={12}/><span>{v.local}</span></div>}
        <div className="vis-line"><I.calendar size={12}/><span className="mono">{v.dataVisita}</span></div>
        <div className="vis-line"><I.users size={12}/><span>{v.responsavel}</span></div>
      </div>
      <div className="vis-card-foot">
        {v.estado === 'agendada'  && <Pill tone="accent" dot="var(--accent)">Agendada</Pill>}
        {v.estado === 'realizada' && <Pill tone="green"  dot="var(--green)">Realizada</Pill>}
        {v.estado === 'cancelada' && <Pill tone="red"    dot="var(--red)">Cancelada</Pill>}
        <span className="vis-card-link">Ver detalhe <I.chevronRight size={11}/></span>
      </div>
    </button>
  );
}

function VisitaDrawer({ v, office, onClose, onMarcar, onCancelar, onEliminar }){
  const [resultado, setResultado] = useState(v.resultado || '');
  const tp = VIS_TIPOS[v.tipo] || VIS_TIPOS.outro;
  const Ico = I[tp.icon] || I.pin;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="side-drawer" onClick={e => e.stopPropagation()}>
        <div className="side-drawer-head">
          <div style={{display:'flex', gap:14, alignItems:'center', minWidth:0, flex:1}}>
            <div className={`def-card-icon tone-${tp.tone}`} style={{width:48, height:48}}><Ico size={20}/></div>
            <div style={{minWidth:0, flex:1}}>
              <div style={{fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:700, letterSpacing:'-.015em', lineHeight:1.3}}>{v.cliente}</div>
              <div style={{fontSize:12.5, color:'var(--text-3)', marginTop:2}}>{tp.label} · {v.dataVisita}</div>
              <div style={{display:'flex', gap:6, marginTop:8}}>
                {v.estado === 'agendada'  && <Pill tone="accent" dot="var(--accent)">Agendada</Pill>}
                {v.estado === 'realizada' && <Pill tone="green"  dot="var(--green)">Realizada</Pill>}
                {v.estado === 'cancelada' && <Pill tone="red"    dot="var(--red)">Cancelada</Pill>}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><I.close size={16}/></button>
        </div>

        <div className="side-drawer-body">
          <div className="cli-info-block">
            <div className="cli-info-label">Responsável</div>
            <div style={{display:'flex', alignItems:'center', gap:12, padding:'12px', border:'1px solid var(--border)', borderRadius:'var(--r-md)', background:'var(--surface-2)'}}>
              <Avatar name={v.responsavel} initials={v.initials} color={v.color}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:600, fontSize:13.5}}>{v.responsavel}</div>
                <div style={{fontSize:12, color:'var(--text-3)'}}>{v.email}</div>
              </div>
              <span className="pill" style={{background:'transparent', border:'1px solid var(--border)'}}>
                <span className="pill-dot" style={{background: office?.color}}/>{office?.city}
              </span>
            </div>
          </div>

          <div className="cli-info-block">
            <div className="cli-info-label">Detalhes</div>
            <div className="cli-info-grid">
              <div><span className="muted">Data</span><span className="mono">{v.dataVisita}</span></div>
              <div><span className="muted">Tipo</span><span>{tp.label}</span></div>
              <div><span className="muted">Local</span><span>{v.local || '—'}</span></div>
              <div><span className="muted">Registado</span><span>{v.criadoEm}</span></div>
              {v.realizadaEm && <div><span className="muted">Realizada</span><span>{v.realizadaEm}</span></div>}
            </div>
          </div>

          {v.descricao && (
            <div className="cli-info-block">
              <div className="cli-info-label">Objetivo</div>
              <div style={{padding:12, border:'1px solid var(--border)', borderRadius:'var(--r-md)', background:'var(--surface-2)', fontSize:13, lineHeight:1.6}}>{v.descricao}</div>
            </div>
          )}

          {v.estado === 'agendada' ? (
            <div className="cli-info-block">
              <div className="cli-info-label">Marcar como realizada</div>
              <textarea className="textarea" rows={3} placeholder="Resultado da visita — pontos discutidos, próximos passos…" value={resultado} onChange={e => setResultado(e.target.value)}/>
              <div style={{display:'flex', gap:8, marginTop:12, justifyContent:'flex-end'}}>
                <button className="btn btn-danger btn-sm" onClick={onCancelar}><I.close size={13}/>Cancelar visita</button>
                <button className="btn btn-success btn-sm" onClick={() => onMarcar(resultado)}><I.check size={13}/>Marcar realizada</button>
              </div>
            </div>
          ) : v.resultado ? (
            <div className="cli-info-block">
              <div className="cli-info-label">Resultado</div>
              <div style={{padding:12, border:'1px solid var(--green-border)', borderRadius:'var(--r-md)', background:'var(--green-soft)', fontSize:13, lineHeight:1.6}}>{v.resultado}</div>
            </div>
          ) : null}

          <div style={{display:'flex', justifyContent:'flex-end', marginTop:8}}>
            <button className="btn btn-ghost btn-sm" onClick={onEliminar}><I.trash size={12}/>Eliminar registo</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

window.Visitas = Visitas;
