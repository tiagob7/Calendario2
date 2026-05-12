// ============================================================
// Admissões & Cessações — gestão de entradas e saídas
// ============================================================

const ADM_OFFICES = ['lisboa','porto','faro','braga'];

const ADM_SEED = [
  { id:'p1', tipo:'admissao', nome:'Tiago Mendes',     empresa:'Empresa X, Lda',          categoria:'Técnico Contabilidade', numero:'00142', nif:'234567890', tipoPagamento:'mes',  valorBase:'950',  valorMes:'1100', valorHora:'',     dataEntrada:'2026-05-12', motivo:'', estado:'aguardar',  prioridade:'alta',  submetidoPor:'Sofia Marques', criadoEm: Date.now()-86400000*1, escritorio:'lisboa', notas:'', ficheiros: [{nome:'CC_Tiago.pdf', tamanho:312000}] },
  { id:'p2', tipo:'admissao', nome:'Marta Lopes',      empresa:'Construções Sul SA',      categoria:'Auxiliar Limpeza',      numero:'00143', nif:'987654321', tipoPagamento:'hora', valorBase:'',     valorMes:'',    valorHora:'5.20', dataEntrada:'2026-05-18', motivo:'', estado:'pendente',  prioridade:'media', submetidoPor:'Inês Rocha',     criadoEm: Date.now()-86400000*2, escritorio:'porto',  notas:'Aguarda comprovativo NISS.', ficheiros: [] },
  { id:'p3', tipo:'cessacao', nome:'Pedro Soares',     empresa:'Empresa X, Lda',          categoria:'Operador Logístico',    numero:'00098', nif:'112233445', tipoPagamento:'',     valorBase:'',     valorMes:'',    valorHora:'',     dataEntrada:'',           dataSaida:'2026-05-10', motivo:'Rescisão por iniciativa do trabalhador', estado:'aguardar',  prioridade:'alta',  submetidoPor:'Sofia Marques', criadoEm: Date.now()-86400000*1, escritorio:'lisboa', notas:'', ficheiros: [] },
  { id:'p4', tipo:'admissao', nome:'Carlos Antunes',   empresa:'TopVerde Lda',            categoria:'Jardineiro',             numero:'00144', nif:'556677889', tipoPagamento:'mes',  valorBase:'820',  valorMes:'870',  valorHora:'',     dataEntrada:'2026-05-25', motivo:'', estado:'aguardar',  prioridade:'baixa', submetidoPor:'Miguel Santos',  criadoEm: Date.now()-86400000*3, escritorio:'faro',   notas:'', ficheiros: [{nome:'IBAN_Carlos.pdf', tamanho:108000},{nome:'CC_Carlos.pdf', tamanho:298000}] },
  { id:'p5', tipo:'cessacao', nome:'Helena Vieira',    empresa:'Frutamar Lda',            categoria:'Op. Embalagem',          numero:'00076', nif:'334455667', tipoPagamento:'',     valorBase:'',     valorMes:'',    valorHora:'',     dataEntrada:'',           dataSaida:'2026-04-30', motivo:'Caducidade do contrato', estado:'concluido', prioridade:'baixa', submetidoPor:'Inês Rocha',     criadoEm: Date.now()-86400000*8, escritorio:'porto',  notas:'Tudo regularizado.', ficheiros: [] },
  { id:'p6', tipo:'admissao', nome:'Ricardo Pinto',    empresa:'Algar Construções',       categoria:'Servente',               numero:'00145', nif:'667788990', tipoPagamento:'hora', valorBase:'',     valorMes:'',    valorHora:'5.50', dataEntrada:'2026-05-09', motivo:'', estado:'pendente',  prioridade:'alta',  submetidoPor:'Sofia Marques',  criadoEm: Date.now()-86400000*1, escritorio:'lisboa', notas:'Falta exame de medicina.', ficheiros: [{nome:'Contrato_Ricardo.pdf', tamanho:412000}] },
  { id:'p7', tipo:'admissao', nome:'Joana Sá',         empresa:'Hotel Marina Bay',        categoria:'Rececionista',           numero:'00146', nif:'998877665', tipoPagamento:'mes',  valorBase:'1050', valorMes:'1100', valorHora:'',     dataEntrada:'2026-06-01', motivo:'', estado:'aguardar',  prioridade:'baixa', submetidoPor:'Beatriz Costa',  criadoEm: Date.now()-3600000*5,  escritorio:'lisboa', notas:'', ficheiros: [] },
];

const EST_LABEL = { aguardar:'A aguardar', pendente:'Pendente', concluido:'Concluído', cancelado:'Cancelado' };
const TIPO_LABEL = { admissao:'Admissão', cessacao:'Cessação' };

function admPrio(dateStr){
  if (!dateStr) return 'baixa';
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((d - hoje)/86400000);
  if (diff <= 1) return 'alta';
  if (diff <= 3) return 'media';
  return 'baixa';
}
function admDateStr(p){ return p.tipo === 'admissao' ? p.dataEntrada : p.dataSaida; }
function admFmtDate(s){ if(!s) return '—'; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; }
function admFmtMoney(v){ const n = parseFloat(v); return isNaN(n) ? '—' : n.toLocaleString('pt-PT',{style:'currency',currency:'EUR'}); }
function admFmtBytes(b){ if(!b) return ''; if(b<1024) return b+' B'; if(b<1048576) return Math.round(b/1024)+' KB'; return (b/1048576).toFixed(1)+' MB'; }
function admInitials(name){ return (name||'').split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase() || '?'; }

const ADM_OFFICE_COLOR = (id) => (OFFICES.find(o => o.id === id)?.color) || '#64748b';
const ADM_OFFICE_CITY  = (id) => (OFFICES.find(o => o.id === id)?.city) || id;

function Admissoes({ pushToast }){
  const [items, setItems]       = useState(ADM_SEED);
  const [tipo, setTipo]         = useState('todos');
  const [estado, setEstado]     = useState('activos');
  const [prio, setPrio]         = useState('todos');
  const [office, setOffice]     = useState('all');
  const [search, setSearch]     = useState('');
  const [view, setView]         = useState('cards');     // cards | table
  const [selected, setSelected] = useState(null);
  const [modalNew, setModalNew] = useState(false);

  const counts = useMemo(() => {
    const activos = items.filter(p => p.estado !== 'concluido' && p.estado !== 'cancelado');
    return {
      total:    items.length,
      adm:      activos.filter(p => p.tipo === 'admissao').length,
      ces:      activos.filter(p => p.tipo === 'cessacao').length,
      alta:     activos.filter(p => p.prioridade === 'alta').length,
      pendente: activos.filter(p => p.estado === 'pendente').length,
      concluido:items.filter(p => p.estado === 'concluido').length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const order = { alta:0, media:1, baixa:2 };
    return items.filter(p => {
      if (tipo !== 'todos' && p.tipo !== tipo) return false;
      if (prio !== 'todos' && p.prioridade !== prio) return false;
      if (office !== 'all' && p.escritorio !== office) return false;
      if (estado === 'activos') { if (p.estado === 'concluido' || p.estado === 'cancelado') return false; }
      else if (estado !== 'todos' && p.estado !== estado) return false;
      if (search){
        const s = search.toLowerCase();
        if (![p.nome, p.empresa, p.numero, p.nif, p.categoria].filter(Boolean).some(v => v.toLowerCase().includes(s))) return false;
      }
      return true;
    }).sort((a, b) => {
      const da = (a.estado==='concluido'||a.estado==='cancelado') ? 1 : 0;
      const db = (b.estado==='concluido'||b.estado==='cancelado') ? 1 : 0;
      if (da !== db) return da - db;
      const pd = (order[a.prioridade]??2) - (order[b.prioridade]??2);
      if (pd !== 0) return pd;
      return (b.criadoEm||0) - (a.criadoEm||0);
    });
  }, [items, tipo, estado, prio, office, search]);

  const updateItem = (id, patch) => {
    setItems(it => it.map(x => x.id === id ? {...x, ...patch} : x));
    setSelected(s => s && s.id === id ? {...s, ...patch} : s);
  };
  const removeItem = (id) => {
    setItems(it => it.filter(x => x.id !== id));
    setSelected(null);
    pushToast?.('Processo eliminado', 'success');
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Recursos Humanos</div>
          <h1>Admissões & Cessações</h1>
          <p className="lede">Pedidos de entrada e saída de trabalhadores temporários, submetidos pelos recrutadores e processados pela equipa de RH.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><I.layers size={14}/>Exportar</button>
          <button className="btn btn-primary" onClick={() => setModalNew(true)}><I.plus size={14}/>Novo pedido</button>
        </div>
      </div>

      <div className="adm-flow-note">
        <span className="step-num">1</span><span><b>Recrutador</b> submete o pedido</span>
        <span className="step-arrow">→</span>
        <span className="step-num">2</span><span><b>RH</b> valida documentos e processa</span>
        <span className="step-arrow">→</span>
        <span className="step-num">3</span><span>Pedido <b>concluído</b> e arquivado</span>
      </div>

      {/* KPI strip */}
      <div className="stat-grid" style={{marginBottom: 18}}>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico" style={{background:'var(--green-soft)', color:'var(--green)', borderColor:'var(--green-border)'}}><I.arrowDown size={14}/></span>Admissões ativas</div>
          <div className="stat-val">{counts.adm}</div>
          <div className="stat-delta flat"><span className="mono">+2</span> esta semana</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico" style={{background:'color-mix(in srgb, var(--amber) 16%, transparent)', color:'var(--amber)', borderColor:'color-mix(in srgb, var(--amber) 30%, transparent)'}}><I.arrowUp size={14}/></span>Cessações ativas</div>
          <div className="stat-val">{counts.ces}</div>
          <div className="stat-delta flat">a processar</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico" style={{background:'var(--red-soft)', color:'var(--red)', borderColor:'var(--red-border)'}}><I.alert size={14}/></span>Alta prioridade</div>
          <div className="stat-val">{counts.alta}</div>
          <div className="stat-delta up"><I.alert size={11}/><span>data iminente</span></div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.clock size={14}/></span>Pendentes</div>
          <div className="stat-val">{counts.pendente}</div>
          <div className="stat-delta flat">a aguardar docs</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico" style={{background:'var(--accent-soft)', color:'var(--accent)', borderColor:'var(--accent-border)'}}><I.check size={14}/></span>Concluídos</div>
          <div className="stat-val">{counts.concluido}</div>
          <div className="stat-delta flat">arquivados</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{marginBottom: 14}}>
        <div className="card-body" style={{display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', padding:'12px 16px'}}>
          <Segmented value={tipo} onChange={setTipo} options={[
            { value: 'todos',     label: 'Todos' },
            { value: 'admissao',  label: 'Admissões' },
            { value: 'cessacao',  label: 'Cessações' },
          ]}/>
          <div style={{flex:1, position:'relative', minWidth: 200}}>
            <I.search size={14} style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-4)'}}/>
            <input className="input" style={{paddingLeft:32}} placeholder="Pesquisar nome, NIF, empresa…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select className="select" style={{maxWidth:160}} value={estado} onChange={e => setEstado(e.target.value)}>
            <option value="activos">Ativos</option>
            <option value="todos">Todos os estados</option>
            <option value="aguardar">A aguardar</option>
            <option value="pendente">Pendentes</option>
            <option value="concluido">Concluídos</option>
            <option value="cancelado">Cancelados</option>
          </select>
          <select className="select" style={{maxWidth:140}} value={prio} onChange={e => setPrio(e.target.value)}>
            <option value="todos">Todas prio</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
          <select className="select" style={{maxWidth:160}} value={office} onChange={e => setOffice(e.target.value)}>
            <option value="all">Todos escritórios</option>
            {OFFICES.map(o => <option key={o.id} value={o.id}>{o.city}</option>)}
          </select>
          <Segmented value={view} onChange={setView} options={[
            { value: 'cards',  label: 'Cards' },
            { value: 'table',  label: 'Tabela' },
          ]}/>
        </div>
      </div>

      {/* Body */}
      {filtered.length === 0 ? (
        <div className="card"><div className="card-body p0">
          <EmptyState icon={<I.users size={22}/>} title="Sem processos" sub="Ajusta filtros ou cria um novo processo."
            action={<button className="btn btn-primary" onClick={() => setModalNew(true)}><I.plus size={13}/>Novo processo</button>}/>
        </div></div>
      ) : view === 'cards' ? (
        <div className="adm-grid">
          {filtered.map((p, i) => (
            <AdmCard key={p.id} idx={i+1} proc={p} onClick={() => setSelected(p)}/>
          ))}
        </div>
      ) : (
        <div className="card"><div className="card-body p0">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{width:'30%'}}>Colaborador</th>
                <th>Tipo</th>
                <th>Data</th>
                <th>Escritório</th>
                <th>Prio</th>
                <th>Estado</th>
                <th style={{textAlign:'right', paddingRight:16}}>Anexos</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} onClick={() => setSelected(p)}>
                  <td>
                    <div style={{display:'flex', alignItems:'center', gap:12}}>
                      <Avatar name={p.nome} initials={admInitials(p.nome)}/>
                      <div style={{minWidth:0}}>
                        <div style={{fontWeight:600, fontSize:13.5}}>{p.nome}</div>
                        <div style={{fontSize:12, color:'var(--text-3)'}}>{p.empresa || '—'} · <span className="mono">#{p.numero||'—'}</span></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {p.tipo === 'admissao'
                      ? <Pill tone="green" dot="var(--green)">Admissão</Pill>
                      : <Pill tone="amber" dot="var(--amber)">Cessação</Pill>}
                  </td>
                  <td><span className="mono" style={{fontSize:12.5}}>{admFmtDate(admDateStr(p))}</span></td>
                  <td>
                    <span className="pill" style={{background:'transparent', border:'1px solid var(--border)'}}>
                      <span className="pill-dot" style={{background: ADM_OFFICE_COLOR(p.escritorio)}}/>
                      {ADM_OFFICE_CITY(p.escritorio)}
                    </span>
                  </td>
                  <td><PrioBadge prio={p.prioridade}/></td>
                  <td><EstadoPill estado={p.estado}/></td>
                  <td style={{textAlign:'right', paddingRight:16, fontSize:12, color:'var(--text-3)'}}>
                    {p.ficheiros?.length ? <span className="mono">📎 {p.ficheiros.length}</span> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}

      {selected && <AdmDrawer proc={selected} onClose={() => setSelected(null)} onUpdate={updateItem} onRemove={removeItem} pushToast={pushToast}/>}
      {modalNew && <AdmNewModal onClose={() => setModalNew(false)} onCreate={(p) => { setItems(it => [{...p, id:'p'+Date.now(), criadoEm:Date.now(), submetidoPor:'Sofia Marques', ficheiros:[], notas:''}, ...it]); setModalNew(false); pushToast?.('Processo criado', 'success'); }}/>}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────
function AdmCard({ idx, proc, onClick }){
  const isDone = proc.estado === 'concluido' || proc.estado === 'cancelado';
  return (
    <button className={`adm-card tipo-${proc.tipo} ${isDone ? 'done' : ''}`} onClick={onClick}>
      <div className="adm-card-stripe"/>
      <div className="adm-card-head">
        <Avatar name={proc.nome} initials={admInitials(proc.nome)}/>
        <div style={{flex:1, minWidth:0}}>
          <div className="adm-card-name">{proc.nome}</div>
          <div className="adm-card-sub">
            <span>{proc.empresa || '—'}</span>
            {proc.categoria && <><span style={{color:'var(--text-4)'}}>·</span><span style={{color:'var(--text-3)'}}>{proc.categoria}</span></>}
          </div>
        </div>
        <PrioDot prio={proc.prioridade}/>
      </div>

      <div className="adm-card-meta">
        <div>
          <div className="adm-meta-lbl">{proc.tipo === 'admissao' ? 'Entrada' : 'Saída'}</div>
          <div className="adm-meta-val mono">{admFmtDate(admDateStr(proc))}</div>
        </div>
        <div>
          <div className="adm-meta-lbl">Escritório</div>
          <div className="adm-meta-val" style={{display:'flex', alignItems:'center', gap:5}}>
            <span className="pill-dot" style={{background: ADM_OFFICE_COLOR(proc.escritorio)}}/>
            {ADM_OFFICE_CITY(proc.escritorio)}
          </div>
        </div>
        {proc.tipo === 'admissao' ? (
          <div>
            <div className="adm-meta-lbl">Valor base</div>
            <div className="adm-meta-val mono">{admFmtMoney(proc.valorBase || proc.valorMes || proc.valorHora)}</div>
          </div>
        ) : (
          <div>
            <div className="adm-meta-lbl">Motivo</div>
            <div className="adm-meta-val" style={{fontSize:12, color:'var(--text-2)'}}>{proc.motivo || '—'}</div>
          </div>
        )}
        <div>
          <div className="adm-meta-lbl">NIF</div>
          <div className="adm-meta-val mono">{proc.nif || '—'}</div>
        </div>
      </div>

      <div className="adm-card-foot">
        <div style={{display:'flex', gap:6, alignItems:'center'}}>
          {proc.tipo === 'admissao'
            ? <Pill tone="green" dot="var(--green)">Admissão</Pill>
            : <Pill tone="amber" dot="var(--amber)">Cessação</Pill>}
          <EstadoPill estado={proc.estado}/>
        </div>
        <div style={{display:'flex', gap:10, alignItems:'center', fontSize:11.5, color:'var(--text-4)'}}>
          {proc.ficheiros?.length > 0 && <span><I.paper size={11}/> {proc.ficheiros.length}</span>}
          {proc.notas && <span title="Tem nota interna"><I.edit size={11}/></span>}
          <span>#{proc.numero || (idx).toString().padStart(3,'0')}</span>
        </div>
      </div>
    </button>
  );
}

// ── Estado / Prio pills ──────────────────────────────────
function EstadoPill({ estado }){
  const map = {
    aguardar:  { tone:'neutral', dot:null, label:'A aguardar' },
    pendente:  { tone:'amber',   dot:'var(--amber)', label:'Pendente' },
    concluido: { tone:'green',   dot:'var(--green)', label:'Concluído' },
    cancelado: { tone:'red',     dot:'var(--red)',   label:'Cancelado' },
  };
  const c = map[estado] || map.aguardar;
  return <Pill tone={c.tone} dot={c.dot}>{c.label}</Pill>;
}
function PrioBadge({ prio }){
  if (prio === 'alta')  return <Pill tone="red"   dot="var(--red)">Alta</Pill>;
  if (prio === 'media') return <Pill tone="amber" dot="var(--amber)">Média</Pill>;
  return <Pill tone="neutral">Baixa</Pill>;
}
function PrioDot({ prio }){
  const c = prio === 'alta' ? 'var(--red)' : prio === 'media' ? 'var(--amber)' : 'var(--green)';
  return <span title={`Prioridade ${prio}`} style={{width:10, height:10, borderRadius:'50%', background:c, boxShadow:`0 0 0 3px color-mix(in srgb, ${c} 18%, transparent)`, flexShrink:0}}/>;
}

// ── Drawer ───────────────────────────────────────────────
function AdmDrawer({ proc, onClose, onUpdate, onRemove, pushToast }){
  const [tab, setTab] = useState('detalhe');
  const [confirm, setConfirm] = useState(false);
  const isAdm = proc.tipo === 'admissao';
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="side-drawer wide" onClick={e => e.stopPropagation()}>
        <div className="side-drawer-head">
          <div style={{display:'flex', gap:14, alignItems:'center', minWidth:0}}>
            <Avatar name={proc.nome} initials={admInitials(proc.nome)} size="lg"/>
            <div style={{minWidth:0}}>
              <div style={{fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:700, letterSpacing:'-.015em'}}>{proc.nome}</div>
              <div style={{fontSize:13, color:'var(--text-3)'}}>{proc.empresa || '—'}{proc.categoria ? ` · ${proc.categoria}` : ''}</div>
              <div style={{display:'flex', gap:6, marginTop:8, flexWrap:'wrap'}}>
                {isAdm
                  ? <Pill tone="green" dot="var(--green)">Admissão</Pill>
                  : <Pill tone="amber" dot="var(--amber)">Cessação</Pill>}
                <EstadoPill estado={proc.estado}/>
                <PrioBadge prio={proc.prioridade}/>
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><I.close size={16}/></button>
        </div>

        <div className="side-drawer-actions">
          <select className="select" style={{maxWidth:170}} value={proc.estado} onChange={e => { onUpdate(proc.id, { estado: e.target.value }); pushToast?.('Estado atualizado', 'success'); }}>
            <option value="aguardar">⬜ A aguardar</option>
            <option value="pendente">🟡 Pendente</option>
            <option value="concluido">✅ Concluído</option>
            <option value="cancelado">🔴 Cancelado</option>
          </select>
          <button className="btn btn-secondary btn-sm"><I.mail size={13}/>Notificar RH</button>
          <div className="spacer"/>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirm(true)}><I.trash size={13}/>Eliminar</button>
        </div>

        <div className="tabs" style={{padding:'0 20px'}}>
          <button className={`tab-btn ${tab==='detalhe'?'active':''}`}  onClick={() => setTab('detalhe')}>Detalhe</button>
          <button className={`tab-btn ${tab==='checklist'?'active':''}`}onClick={() => setTab('checklist')}>Checklist</button>
          <button className={`tab-btn ${tab==='anexos'?'active':''}`}   onClick={() => setTab('anexos')}>Anexos {proc.ficheiros?.length ? `· ${proc.ficheiros.length}` : ''}</button>
          <button className={`tab-btn ${tab==='historico'?'active':''}`}onClick={() => setTab('historico')}>Histórico</button>
        </div>

        <div className="side-drawer-body">
          {tab === 'detalhe'   && <AdmDetailTab proc={proc} onUpdate={onUpdate}/>}
          {tab === 'checklist' && <AdmChecklistTab proc={proc}/>}
          {tab === 'anexos'    && <AdmAnexosTab proc={proc} onUpdate={onUpdate} pushToast={pushToast}/>}
          {tab === 'historico' && <AdmHistoryTab proc={proc}/>}
        </div>

        {confirm && (
          <div className="modal-overlay" onClick={() => setConfirm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-head"><h2>Eliminar processo?</h2></div>
              <div className="modal-body">
                <div className="alert-card red" style={{marginBottom: 14}}>
                  <I.alert size={18}/>
                  <div>
                    <div style={{fontWeight:600}}>Ação irreversível</div>
                    <div style={{fontSize:12.5, marginTop:2}}>O processo de <b>{proc.nome}</b> será removido permanentemente. Os anexos no Storage também serão apagados.</div>
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button className="btn btn-secondary" onClick={() => setConfirm(false)}>Cancelar</button>
                <button className="btn btn-danger" onClick={() => { onRemove(proc.id); setConfirm(false); }}><I.trash size={13}/>Eliminar</button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function AdmDetailTab({ proc, onUpdate }){
  const isAdm = proc.tipo === 'admissao';
  return (
    <>
      <div className="cli-info-block">
        <div className="cli-info-label">Identificação</div>
        <div className="cli-info-grid">
          <div><span className="muted">Nome</span><span>{proc.nome}</span></div>
          <div><span className="muted">Nº colaborador</span><span className="mono">{proc.numero || '—'}</span></div>
          <div><span className="muted">NIF</span><span className="mono">{proc.nif || '—'}</span></div>
          <div><span className="muted">Submetido por</span><span>{proc.submetidoPor || '—'}</span></div>
        </div>
      </div>

      {isAdm ? (
        <>
          <div className="cli-info-block">
            <div className="cli-info-label">Empresa & categoria</div>
            <div className="cli-info-grid">
              <div><span className="muted">Empresa utilizadora</span><span>{proc.empresa || '—'}</span></div>
              <div><span className="muted">Categoria</span><span>{proc.categoria || '—'}</span></div>
              <div><span className="muted">Escritório</span>
                <span style={{display:'flex', alignItems:'center', gap:6}}>
                  <span className="pill-dot" style={{background:ADM_OFFICE_COLOR(proc.escritorio)}}/>
                  {ADM_OFFICE_CITY(proc.escritorio)}
                </span>
              </div>
              <div><span className="muted">Data de entrada</span><span className="mono">{admFmtDate(proc.dataEntrada)}</span></div>
            </div>
          </div>
          <div className="cli-info-block">
            <div className="cli-info-label">Condições contratuais</div>
            <div className="cli-info-grid">
              <div><span className="muted">Tipo de pagamento</span><span>{proc.tipoPagamento === 'hora' ? 'À hora' : 'Mensal'}</span></div>
              <div><span className="muted">Valor base</span><span className="mono">{admFmtMoney(proc.valorBase)}</span></div>
              <div><span className="muted">Valor mês</span><span className="mono">{admFmtMoney(proc.valorMes)}</span></div>
              <div><span className="muted">Valor hora</span><span className="mono">{admFmtMoney(proc.valorHora)}</span></div>
            </div>
          </div>
        </>
      ) : (
        <div className="cli-info-block">
          <div className="cli-info-label">Saída</div>
          <div className="cli-info-grid">
            <div><span className="muted">Empresa</span><span>{proc.empresa || '—'}</span></div>
            <div><span className="muted">Data de saída</span><span className="mono">{admFmtDate(proc.dataSaida)}</span></div>
            <div><span className="muted">Motivo</span><span>{proc.motivo || '—'}</span></div>
            <div><span className="muted">Escritório</span>
              <span style={{display:'flex', alignItems:'center', gap:6}}>
                <span className="pill-dot" style={{background:ADM_OFFICE_COLOR(proc.escritorio)}}/>
                {ADM_OFFICE_CITY(proc.escritorio)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="cli-info-block">
        <div className="cli-info-label">Nota interna RH</div>
        <textarea className="input" rows={3} placeholder="Nota visível apenas para a equipa de RH…" defaultValue={proc.notas || ''} onBlur={e => onUpdate(proc.id, { notas: e.target.value })}/>
      </div>
    </>
  );
}

function AdmChecklistTab({ proc }){
  const isAdm = proc.tipo === 'admissao';
  const items = isAdm ? [
    { label:'Cópia do CC / Cartão de Cidadão',           done:true },
    { label:'Comprovativo de NIB / IBAN',                done:true },
    { label:'Inscrição Segurança Social (NISS)',         done:false },
    { label:'Exame de medicina no trabalho',             done:false },
    { label:'Contrato assinado pelas duas partes',       done:false },
    { label:'Equipamento atribuído (EPIs)',              done:false },
    { label:'Sessão de acolhimento agendada',            done:false },
  ] : [
    { label:'Carta / aviso de cessação recebido',        done:true },
    { label:'Comunicação à Segurança Social',            done:true },
    { label:'Recibo de fim de contrato gerado',          done:false },
    { label:'Devolução de equipamento',                  done:false },
    { label:'Pagamento de proporcionais',                done:false },
    { label:'Encerramento de acessos (email, sistemas)', done:false },
  ];
  const completed = items.filter(i => i.done).length;
  const pct = Math.round(completed / items.length * 100);
  return (
    <>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <div>
          <div style={{fontSize:13.5, fontWeight:600}}>Progresso do processo</div>
          <div style={{fontSize:12, color:'var(--text-3)'}}>{completed} de {items.length} concluídos</div>
        </div>
        <div style={{fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:700, color:'var(--accent)'}}>{pct}%</div>
      </div>
      <div style={{height:6, borderRadius:999, background:'var(--bg-inset)', overflow:'hidden', marginBottom:18}}>
        <div style={{height:'100%', width:`${pct}%`, background:'var(--accent)', transition:'width 220ms'}}/>
      </div>
      <div style={{display:'flex', flexDirection:'column', border:'1px solid var(--border)', borderRadius:'var(--r-md)', overflow:'hidden'}}>
        {items.map((it, i) => (
          <label key={i} style={{display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderBottom: i < items.length-1 ? '1px solid var(--divider)' : 'none', cursor:'pointer'}}>
            <span style={{width:20, height:20, borderRadius:'50%', display:'grid', placeItems:'center', flexShrink:0,
              background: it.done ? 'var(--green-soft)' : 'var(--bg-inset)',
              border: `1px solid ${it.done ? 'var(--green-border)' : 'var(--border)'}`,
              color: it.done ? 'var(--green)' : 'transparent'}}>
              <I.check size={11}/>
            </span>
            <span style={{flex:1, fontSize:13, color: it.done ? 'var(--text-3)' : 'var(--text)', textDecoration: it.done ? 'line-through' : 'none'}}>{it.label}</span>
            {it.done && <span style={{fontSize:11, color:'var(--text-4)'}}>concluído</span>}
          </label>
        ))}
      </div>
    </>
  );
}

function AdmAnexosTab({ proc, onUpdate, pushToast }){
  const files = proc.ficheiros || [];
  return (
    <>
      <div className="cli-info-label" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        Documentos anexos
        <button className="btn btn-secondary btn-sm" onClick={() => pushToast?.('Seletor de ficheiros (mock)')}>
          <I.plus size={12}/>Adicionar
        </button>
      </div>

      {files.length === 0 ? (
        <div className="empty-state" style={{padding:'24px 16px'}}>
          <I.paper size={20}/>
          <p style={{marginTop:8, fontSize:13}}>Sem anexos. Adiciona contratos, CC, IBAN ou outros documentos.</p>
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', border:'1px solid var(--border)', borderRadius:'var(--r-md)', overflow:'hidden', marginTop:10}}>
          {files.map((f, i) => (
            <div key={i} style={{display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderBottom: i < files.length - 1 ? '1px solid var(--divider)' : 'none'}}>
              <span style={{width:32, height:32, borderRadius:'var(--r-sm)', background:'var(--accent-soft)', color:'var(--accent)', border:'1px solid var(--accent-border)', display:'grid', placeItems:'center'}}><I.paper size={14}/></span>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:13, fontWeight:600}}>{f.nome}</div>
                <div style={{fontSize:11.5, color:'var(--text-3)'}}>{admFmtBytes(f.tamanho)}</div>
              </div>
              <button className="btn btn-ghost btn-sm">Download</button>
              <button className="icon-btn sm" onClick={() => { onUpdate(proc.id, { ficheiros: files.filter((_, j) => j !== i) }); pushToast?.('Anexo removido'); }}><I.trash size={12}/></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function AdmHistoryTab({ proc }){
  const events = [
    { tone:'green', icon:<I.plus size={11}/>,   title:'Processo criado',  sub:`Submetido por ${proc.submetidoPor}`, meta:'agora' },
    { tone:'blue',  icon:<I.edit size={11}/>,   title:'Anexos adicionados',sub:`${proc.ficheiros?.length || 0} ficheiro(s)`, meta:'há 2 h' },
    { tone:'blue',  icon:<I.shield2 size={11}/>,title:'Estado: pendente', sub:'Falta exame de medicina', meta:'ontem' },
  ];
  return (
    <ul className="timeline" style={{margin:'4px 0 0'}}>
      {events.map((e, i) => (
        <li key={i} className={`tl-item tone-${e.tone}`}>
          <span className="tl-marker">{e.icon}</span>
          <div style={{flex:1}}>
            <div className="tl-title">{e.title}</div>
            <div className="tl-sub">{e.sub}</div>
            <div className="tl-meta">{e.meta}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Modal Novo ───────────────────────────────────────────
function AdmNewModal({ onClose, onCreate }){
  const [tipo, setTipo] = useState('admissao');
  const [pag, setPag]   = useState('mes');
  const [form, setForm] = useState({
    nome:'', numero:'', nif:'', empresa:'', categoria:'',
    valorBase:'', valorMes:'', valorHora:'',
    dataEntrada:'', dataSaida:'', motivo:'',
    escritorio:'lisboa',
  });
  const set = (k) => (e) => setForm(f => ({...f, [k]: e.target.value }));
  const dataRef = tipo === 'admissao' ? form.dataEntrada : form.dataSaida;
  const prio = admPrio(dataRef);

  const submit = () => {
    if (!form.nome.trim())                              return alert('Preenche o nome.');
    if (tipo === 'admissao' && !form.empresa.trim())    return alert('Preenche a empresa.');
    if (tipo === 'admissao' && !form.dataEntrada)       return alert('Preenche a data de entrada.');
    if (tipo === 'cessacao' && !form.dataSaida)         return alert('Preenche a data de saída.');
    onCreate({ ...form, tipo, tipoPagamento: pag, prioridade: prio, estado:'aguardar' });
  };

  return (
    <Modal
      open={true} onClose={onClose} size="lg"
      title="Novo processo"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit}><I.check size={14}/>Submeter processo</button>
      </>}
    >
      {/* Tipo selector */}
      <div className="adm-tipo-select">
        <button className={`adm-tipo-card ${tipo==='admissao'?'sel green':''}`} onClick={() => setTipo('admissao')}>
          <span className="adm-tipo-ic" style={{background:'var(--green-soft)', color:'var(--green)', borderColor:'var(--green-border)'}}><I.arrowDown size={16}/></span>
          <div>
            <div className="adm-tipo-lbl">Admissão</div>
            <div className="adm-tipo-desc">Entrada de novo colaborador</div>
          </div>
        </button>
        <button className={`adm-tipo-card ${tipo==='cessacao'?'sel amber':''}`} onClick={() => setTipo('cessacao')}>
          <span className="adm-tipo-ic" style={{background:'color-mix(in srgb, var(--amber) 16%, transparent)', color:'var(--amber)', borderColor:'color-mix(in srgb, var(--amber) 30%, transparent)'}}><I.arrowUp size={16}/></span>
          <div>
            <div className="adm-tipo-lbl">Cessação</div>
            <div className="adm-tipo-desc">Saída de colaborador</div>
          </div>
        </button>
      </div>

      <div className="form-section-label">Dados do colaborador</div>
      <div className="form-grid">
        <div className="field full"><label className="field-label">Nome completo <span className="req">*</span></label><input className="input" placeholder="ex: João Ferreira" value={form.nome} onChange={set('nome')}/></div>
        <div className="field"><label className="field-label">Nº colaborador</label><input className="input" placeholder="ex: 00142" value={form.numero} onChange={set('numero')}/></div>
        <div className="field"><label className="field-label">NIF</label><input className="input" placeholder="ex: 123456789" value={form.nif} onChange={set('nif')}/></div>
        <div className="field"><label className="field-label">Escritório</label>
          <select className="select" value={form.escritorio} onChange={set('escritorio')}>
            {OFFICES.map(o => <option key={o.id} value={o.id}>{o.city}</option>)}
          </select>
        </div>
      </div>

      {tipo === 'admissao' ? (
        <>
          <div className="form-section-label">Empresa & categoria</div>
          <div className="form-grid">
            <div className="field"><label className="field-label">Empresa utilizadora <span className="req">*</span></label><input className="input" placeholder="ex: Empresa X, Lda" value={form.empresa} onChange={set('empresa')}/></div>
            <div className="field"><label className="field-label">Categoria</label><input className="input" placeholder="ex: Téc. Contabilidade" value={form.categoria} onChange={set('categoria')}/></div>
          </div>

          <div className="form-section-label">Condições contratuais</div>
          <div className="field full"><label className="field-label">Tipo de pagamento</label>
            <Segmented value={pag} onChange={setPag} options={[
              { value:'mes',  label:'Mensal' },
              { value:'hora', label:'À hora' },
            ]}/>
          </div>
          <div className="form-grid">
            <div className="field"><label className="field-label">Valor base (€)</label><input className="input" type="number" step="0.01" value={form.valorBase} onChange={set('valorBase')}/></div>
            <div className="field"><label className="field-label">Valor mês (€)</label><input className="input" type="number" step="0.01" value={form.valorMes} onChange={set('valorMes')}/></div>
            <div className="field"><label className="field-label">Valor hora (€)</label><input className="input" type="number" step="0.01" value={form.valorHora} onChange={set('valorHora')}/></div>
            <div className="field"><label className="field-label">Data de entrada <span className="req">*</span></label><input className="input" type="date" value={form.dataEntrada} onChange={set('dataEntrada')}/></div>
          </div>
          {dataRef && <PrioPreview prio={prio}/>}
        </>
      ) : (
        <>
          <div className="form-section-label">Dados da saída</div>
          <div className="form-grid">
            <div className="field"><label className="field-label">Data de saída <span className="req">*</span></label><input className="input" type="date" value={form.dataSaida} onChange={set('dataSaida')}/></div>
            <div className="field"><label className="field-label">Motivo</label>
              <select className="select" value={form.motivo} onChange={set('motivo')}>
                <option value="">— Selecionar —</option>
                <option>Rescisão por iniciativa do trabalhador</option>
                <option>Caducidade do contrato</option>
                <option>Despedimento por justa causa</option>
                <option>Despedimento coletivo</option>
                <option>Mútuo acordo</option>
              </select>
            </div>
            <div className="field full"><label className="field-label">Empresa</label><input className="input" placeholder="ex: Empresa X, Lda" value={form.empresa} onChange={set('empresa')}/></div>
          </div>
          {dataRef && <PrioPreview prio={prio}/>}
        </>
      )}
    </Modal>
  );
}

function PrioPreview({ prio }){
  const map = {
    alta:  { color:'var(--red)',   bg:'var(--red-soft)',   border:'var(--red-border)',   text:'Alta — data iminente' },
    media: { color:'var(--amber)', bg:'color-mix(in srgb, var(--amber) 16%, transparent)', border:'color-mix(in srgb, var(--amber) 30%, transparent)', text:'Média — em breve' },
    baixa: { color:'var(--green)', bg:'var(--green-soft)', border:'var(--green-border)', text:'Baixa — sem urgência' },
  };
  const c = map[prio];
  return (
    <div style={{display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:c.bg, border:`1px solid ${c.border}`, borderRadius:'var(--r-md)', marginTop:10, fontSize:12.5, color:c.color, fontWeight:600}}>
      <span style={{width:8, height:8, borderRadius:'50%', background:c.color}}/>
      Prioridade calculada: {c.text}
    </div>
  );
}

window.Admissoes = Admissoes;
