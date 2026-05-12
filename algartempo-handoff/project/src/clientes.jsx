// ============================================================
// Clientes — lista + filtros + detalhe
// ============================================================

const CLIENTES = [
  { id: 'C-1028', nome: 'Portcel Navegação, S.A.',      tipo: 'empresa',  setor: 'Transportes',  nif: '501238456', escritorio: 'lisboa', gestor: 'u1', estado: 'ativo',     mrr: 8400, plano: 'Enterprise', desde: '2021-03-15', contato: 'Ana Silveira',      email: 'a.silveira@portcel.pt',      telefone: '+351 21 456 7800', cidade: 'Lisboa',  ultimo: '2026-04-18', sat: 4.7, ticketsAbertos: 1, faturado: 92400, risco: 'baixo' },
  { id: 'C-1031', nome: 'Marítima & Filhos, Lda.',      tipo: 'empresa',  setor: 'Logística',    nif: '508912003', escritorio: 'faro',   gestor: 'u4', estado: 'em-risco',  mrr: 3200, plano: 'Business',   desde: '2019-09-01', contato: 'Rui Carvalho',      email: 'rui@maritima.pt',            telefone: '+351 28 987 1122', cidade: 'Faro',    ultimo: '2026-03-04', sat: 2.9, ticketsAbertos: 3, faturado: 48700, risco: 'alto' },
  { id: 'C-1045', nome: 'Paula Ribeiro',                 tipo: 'particular', setor: 'Retalho',   nif: '248771332', escritorio: 'lisboa', gestor: 'u1', estado: 'ativo',     mrr: 49,   plano: 'Pessoal',    desde: '2022-11-07', contato: 'Paula Ribeiro',     email: 'paula.ribeiro@gmail.com',    telefone: '+351 91 234 5678', cidade: 'Lisboa',  ultimo: '2026-04-15', sat: 3.8, ticketsAbertos: 1, faturado: 1680, risco: 'medio' },
  { id: 'C-1053', nome: 'Tiago Mendes Consultoria',      tipo: 'empresa',  setor: 'Serviços',     nif: '514223891', escritorio: 'porto',  gestor: 'u3', estado: 'ativo',     mrr: 1200, plano: 'Business',   desde: '2023-01-22', contato: 'Tiago Mendes',      email: 'tiago@tmconsulting.pt',      telefone: '+351 22 567 0998', cidade: 'Porto',   ultimo: '2026-04-14', sat: 4.2, ticketsAbertos: 1, faturado: 28800, risco: 'baixo' },
  { id: 'C-1067', nome: 'Empresa Marítima Lda.',         tipo: 'empresa',  setor: 'Transportes',  nif: '510998234', escritorio: 'faro',   gestor: 'u4', estado: 'ativo',     mrr: 4800, plano: 'Enterprise', desde: '2020-06-30', contato: 'Sónia Pires',       email: 'contratos@emaritima.pt',     telefone: '+351 28 441 9987', cidade: 'Faro',    ultimo: '2026-04-12', sat: 3.5, ticketsAbertos: 1, faturado: 84200, risco: 'medio' },
  { id: 'C-1070', nome: 'Carla Sousa',                   tipo: 'particular', setor: 'Particular', nif: '191223445', escritorio: 'lisboa', gestor: 'u1', estado: 'ativo',     mrr: 29,   plano: 'Pessoal',    desde: '2024-02-18', contato: 'Carla Sousa',       email: 'carla.s@outlook.pt',         telefone: '+351 91 887 2210', cidade: 'Lisboa',  ultimo: '2026-04-08', sat: 4.5, ticketsAbertos: 0, faturado: 720, risco: 'baixo' },
  { id: 'C-1082', nome: 'Fontes Equipamentos, Lda.',     tipo: 'empresa',  setor: 'Retalho',      nif: '505661127', escritorio: 'braga',  gestor: 'u6', estado: 'ativo',     mrr: 890,  plano: 'Business',   desde: '2022-04-05', contato: 'José Fontes',       email: 'geral@fontesequip.pt',       telefone: '+351 25 388 4412', cidade: 'Braga',   ultimo: '2026-04-05', sat: 4.6, ticketsAbertos: 0, faturado: 19200, risco: 'baixo' },
  { id: 'C-1091', nome: 'Grupo Vieira Comunicação',      tipo: 'empresa',  setor: 'Media',        nif: '513772001', escritorio: 'porto',  gestor: 'u3', estado: 'inativo',   mrr: 0,    plano: 'Business',   desde: '2020-11-11', contato: 'Marta Vieira',      email: 'marta@grupovieira.pt',       telefone: '+351 22 334 5566', cidade: 'Porto',   ultimo: '2026-02-28', sat: 3.1, ticketsAbertos: 0, faturado: 34400, risco: 'alto' },
  { id: 'C-1104', nome: 'Oceano Azul Consultoria',       tipo: 'empresa',  setor: 'Serviços',     nif: '517223455', escritorio: 'lisboa', gestor: 'u5', estado: 'ativo',     mrr: 2400, plano: 'Business',   desde: '2023-08-14', contato: 'Henrique Lopes',    email: 'h.lopes@oceanoazul.pt',      telefone: '+351 21 667 8821', cidade: 'Lisboa',  ultimo: '2026-04-17', sat: 4.9, ticketsAbertos: 0, faturado: 38400, risco: 'baixo' },
  { id: 'C-1112', nome: 'Ana Batista',                   tipo: 'particular', setor: 'Particular', nif: '228991334', escritorio: 'braga',  gestor: 'u6', estado: 'prospect',  mrr: 0,    plano: '—',          desde: '2026-04-16', contato: 'Ana Batista',       email: 'ana.batista@sapo.pt',        telefone: '+351 93 445 6677', cidade: 'Braga',   ultimo: '2026-04-16', sat: null, ticketsAbertos: 0, faturado: 0, risco: 'baixo' },
  { id: 'C-1118', nome: 'NovaTech Soluções',             tipo: 'empresa',  setor: 'Tecnologia',   nif: '519002881', escritorio: 'porto',  gestor: 'u3', estado: 'prospect',  mrr: 0,    plano: '—',          desde: '2026-04-10', contato: 'Diogo Meireles',    email: 'diogo@novatech.io',          telefone: '+351 22 998 7766', cidade: 'Porto',   ultimo: '2026-04-10', sat: null, ticketsAbertos: 0, faturado: 0, risco: 'baixo' },
  { id: 'C-1124', nome: 'Clínica Saúde Viva',            tipo: 'empresa',  setor: 'Saúde',        nif: '516557889', escritorio: 'lisboa', gestor: 'u5', estado: 'ativo',     mrr: 1800, plano: 'Business',   desde: '2022-07-11', contato: 'Dra. Rita Almeida', email: 'r.almeida@saudeviva.pt',     telefone: '+351 21 228 9910', cidade: 'Lisboa',  ultimo: '2026-04-11', sat: 4.3, ticketsAbertos: 2, faturado: 28800, risco: 'medio' },
];

const CLIENTE_TIMELINE = [
  { id:'t1', tipo:'reclamacao', titulo:'Reclamação #R-2053 registada',     desc:'Cobrança indevida · abril',                 when:'15 Abr · 09:12', by:'Paula Ribeiro',    icon:'alert',  tone:'red' },
  { id:'t2', tipo:'email',      titulo:'Resposta enviada por email',        desc:'Confirmação de recepção + prazo de 24h',    when:'15 Abr · 11:47', by:'Sofia Marques',    icon:'mail',   tone:'blue' },
  { id:'t3', tipo:'nota',       titulo:'Nota interna adicionada',           desc:'Pedido para review do sistema de faturação', when:'15 Abr · 14:30', by:'Sofia Marques',    icon:'paper',  tone:'neutral' },
  { id:'t4', tipo:'chamada',    titulo:'Chamada efetuada · 8min',           desc:'Confirmação de novo agendamento',           when:'12 Abr · 10:15', by:'Sofia Marques',    icon:'phone',  tone:'neutral' },
  { id:'t5', tipo:'fatura',     titulo:'Fatura #F-8842 emitida',            desc:'Mensalidade plano Pessoal · 49,00 €',       when:'01 Abr · 00:02', by:'Sistema',          icon:'receipt',tone:'green' },
];

window.CLIENTES = CLIENTES;
window.CLIENTE_TIMELINE = CLIENTE_TIMELINE;

function Clientes({ pushToast }){
  const [query, setQuery] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [estado, setEstado] = useState('todos');
  const [escritorio, setEscritorio] = useState('todos');
  const [sortBy, setSortBy] = useState('recente');
  const [view, setView] = useState('tabela');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const visible = useMemo(() => {
    let arr = CLIENTES.filter(c => {
      if (tipo !== 'todos' && c.tipo !== tipo) return false;
      if (estado !== 'todos' && c.estado !== estado) return false;
      if (escritorio !== 'todos' && c.escritorio !== escritorio) return false;
      if (query){
        const q = query.toLowerCase();
        if (!(`${c.nome} ${c.contato} ${c.email} ${c.nif} ${c.id}`.toLowerCase().includes(q))) return false;
      }
      return true;
    });
    const cmp = {
      recente: (a,b) => (b.ultimo||'').localeCompare(a.ultimo||''),
      nome:    (a,b) => a.nome.localeCompare(b.nome),
      mrr:     (a,b) => b.mrr - a.mrr,
      sat:     (a,b) => (b.sat||0) - (a.sat||0),
    }[sortBy];
    return [...arr].sort(cmp);
  }, [query, tipo, estado, escritorio, sortBy]);

  const counts = {
    total: CLIENTES.length,
    ativos: CLIENTES.filter(c => c.estado === 'ativo').length,
    risco: CLIENTES.filter(c => c.risco === 'alto').length,
    prospects: CLIENTES.filter(c => c.estado === 'prospect').length,
    mrrTotal: CLIENTES.reduce((s,c) => s + c.mrr, 0),
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Gestão comercial</div>
          <h1>Clientes</h1>
          <p className="lede">Base consolidada de clientes empresariais e particulares em todos os escritórios.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><I.upload size={15}/> Importar</button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><I.plus size={15}/> Novo cliente</button>
        </div>
      </div>

      <div className="cli-stats">
        <div className="cli-stat"><div className="cli-stat-lbl">Total</div><div className="cli-stat-val">{counts.total}</div></div>
        <div className="cli-stat"><div className="cli-stat-lbl">Ativos</div><div className="cli-stat-val">{counts.ativos}</div></div>
        <div className="cli-stat"><div className="cli-stat-lbl">Em risco</div><div className="cli-stat-val" style={{color:'var(--red)'}}>{counts.risco}</div></div>
        <div className="cli-stat"><div className="cli-stat-lbl">Prospects</div><div className="cli-stat-val" style={{color:'var(--amber)'}}>{counts.prospects}</div></div>
        <div className="cli-stat"><div className="cli-stat-lbl">MRR total</div><div className="cli-stat-val tnum">{counts.mrrTotal.toLocaleString('pt-PT')} €</div></div>
      </div>

      <div className="cli-toolbar">
        <div style={{position:'relative', flex:1, minWidth:200, maxWidth:360}}>
          <I.search size={14} style={{position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-4)'}}/>
          <input className="input" style={{paddingLeft:34, width:'100%'}} placeholder="Pesquisar por nome, NIF, email…" value={query} onChange={e => setQuery(e.target.value)}/>
        </div>
        <select className="select" value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          <option value="empresa">Empresas</option>
          <option value="particular">Particulares</option>
        </select>
        <select className="select" value={estado} onChange={e => setEstado(e.target.value)}>
          <option value="todos">Todos os estados</option>
          <option value="ativo">Ativo</option>
          <option value="em-risco">Em risco</option>
          <option value="inativo">Inativo</option>
          <option value="prospect">Prospect</option>
        </select>
        <select className="select" value={escritorio} onChange={e => setEscritorio(e.target.value)}>
          <option value="todos">Todos os escritórios</option>
          {OFFICES.map(o => <option key={o.id} value={o.id}>{o.city}</option>)}
        </select>
        <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="recente">Mais recente</option>
          <option value="nome">Nome A-Z</option>
          <option value="mrr">Maior MRR</option>
          <option value="sat">Satisfação</option>
        </select>
        <Segmented value={view} onChange={setView} options={[
          {value:'tabela', label:'Tabela'},
          {value:'cards',  label:'Cards'},
        ]}/>
      </div>

      {visible.length === 0 && (
        <div className="card"><EmptyState icon={<I.users size={22}/>} title="Sem clientes" sub="Tenta remover alguns filtros para ver resultados."/></div>
      )}

      {view === 'tabela' && visible.length > 0 && (
        <div className="table-wrap">
          <table className="data-table cli-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Plano</th>
                <th>MRR</th>
                <th>Gestor</th>
                <th>Satisfação</th>
                <th>Estado</th>
                <th>Último contacto</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(c => {
                const gestor = c.gestor === ME.id ? ME : COLLEAGUES.find(x => x.id === c.gestor);
                return (
                  <tr key={c.id} onClick={() => setSelected(c)} className="cli-row">
                    <td>
                      <div className="cli-cell-name">
                        <div className={`cli-avatar ${c.tipo}`}>
                          {c.tipo === 'empresa' ? <I.building size={15}/> : c.contato.split(' ').map(s=>s[0]).slice(0,2).join('')}
                        </div>
                        <div style={{minWidth:0}}>
                          <div className="cli-name">{c.nome}</div>
                          <div className="cli-sub mono">{c.id} · {c.setor}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="muted" style={{fontSize:12.5, textTransform:'capitalize'}}>{c.tipo}</span></td>
                    <td><span style={{fontSize:13}}>{c.plano}</span></td>
                    <td className="tnum" style={{fontWeight:600}}>{c.mrr > 0 ? c.mrr.toLocaleString('pt-PT')+' €' : '—'}</td>
                    <td>{gestor && <span className="row" style={{gap:6}}><Avatar initials={gestor.initials} size="sm" color={gestor.color}/><span style={{fontSize:12.5}}>{gestor.name.split(' ')[0]}</span></span>}</td>
                    <td>{c.sat ? <SatBar value={c.sat}/> : <span className="muted">—</span>}</td>
                    <td><EstadoPill estado={c.estado}/></td>
                    <td><span className="muted tnum" style={{fontSize:12.5}}>{formatDate(c.ultimo)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === 'cards' && (
        <div className="cli-grid">
          {visible.map(c => {
            const gestor = c.gestor === ME.id ? ME : COLLEAGUES.find(x => x.id === c.gestor);
            return (
              <article key={c.id} className="cli-card" onClick={() => setSelected(c)}>
                <div className="cli-card-head">
                  <div className={`cli-avatar lg ${c.tipo}`}>
                    {c.tipo === 'empresa' ? <I.building size={18}/> : c.contato.split(' ').map(s=>s[0]).slice(0,2).join('')}
                  </div>
                  <EstadoPill estado={c.estado}/>
                </div>
                <div className="cli-card-name">{c.nome}</div>
                <div className="cli-card-sub">{c.setor} · {c.cidade}</div>
                <div className="cli-card-stats">
                  <div><div className="cli-stat-lbl">MRR</div><div className="tnum" style={{fontWeight:600}}>{c.mrr>0 ? c.mrr+' €' : '—'}</div></div>
                  <div><div className="cli-stat-lbl">Plano</div><div style={{fontSize:13, fontWeight:500}}>{c.plano}</div></div>
                  <div><div className="cli-stat-lbl">Satisfação</div><div>{c.sat ? <SatBar value={c.sat}/> : <span className="muted">—</span>}</div></div>
                </div>
                <div className="cli-card-foot">
                  {gestor && <span className="row" style={{gap:6}}><Avatar initials={gestor.initials} size="sm" color={gestor.color}/><span style={{fontSize:12, color:'var(--text-3)'}}>{gestor.name}</span></span>}
                  {c.ticketsAbertos > 0 && <span style={{fontSize:11, color:'var(--red)', fontWeight:600}}><I.alert size={12} style={{verticalAlign:'-2px'}}/> {c.ticketsAbertos} aberto{c.ticketsAbertos>1?'s':''}</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selected && <ClienteDetail cliente={selected} onClose={() => setSelected(null)} pushToast={pushToast}/>}
      {showForm && <ClienteForm onClose={() => setShowForm(false)} onSubmit={() => { setShowForm(false); pushToast('Cliente criado', 'success'); }}/>}
    </div>
  );
}

function EstadoPill({ estado }){
  const map = {
    ativo:     { tone:'green',  label:'Ativo',    dot:'#16a34a' },
    'em-risco':{ tone:'red',    label:'Em risco', dot:'#dc2626' },
    inativo:   { tone:'neutral',label:'Inativo',  dot:'#9aa3af' },
    prospect:  { tone:'amber',  label:'Prospect', dot:'#d97706' },
  }[estado] || { tone:'neutral', label:estado, dot:'#9aa3af' };
  return <Pill tone={map.tone} dot={map.dot}>{map.label}</Pill>;
}

function SatBar({ value }){
  const pct = (value/5)*100;
  const color = value >= 4.2 ? 'var(--green)' : value >= 3.5 ? 'var(--amber)' : 'var(--red)';
  return (
    <div className="sat-bar">
      <div className="sat-fill" style={{width:`${pct}%`, background:color}}/>
      <span className="sat-val tnum">{value.toFixed(1)}</span>
    </div>
  );
}

function ClienteDetail({ cliente, onClose, pushToast }){
  const [tab, setTab] = useState('resumo');
  const gestor = cliente.gestor === ME.id ? ME : COLLEAGUES.find(c => c.id === cliente.gestor);
  const office = OFFICES.find(o => o.id === cliente.escritorio);
  const anos = Math.round((new Date(2026,3,20) - new Date(cliente.desde)) / (365*86400000) * 10) / 10;

  return (
    <div className="side-drawer-overlay" onClick={onClose}>
      <aside className="side-drawer" onClick={e => e.stopPropagation()}>
        <header className="side-drawer-head">
          <div className="row" style={{gap:12, alignItems:'center', minWidth:0}}>
            <div className={`cli-avatar xl ${cliente.tipo}`}>
              {cliente.tipo === 'empresa' ? <I.building size={22}/> : cliente.contato.split(' ').map(s=>s[0]).slice(0,2).join('')}
            </div>
            <div style={{minWidth:0}}>
              <div className="row" style={{gap:8, marginBottom:4}}>
                <span className="mono" style={{fontSize:11, color:'var(--text-3)'}}>{cliente.id}</span>
                <EstadoPill estado={cliente.estado}/>
              </div>
              <h2 style={{fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:700, letterSpacing:'-.02em', margin:0, lineHeight:1.2}}>{cliente.nome}</h2>
              <div style={{fontSize:12.5, color:'var(--text-3)', marginTop:3}}>{cliente.setor} · {cliente.cidade} · cliente há {anos} anos</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><I.close size={16}/></button>
        </header>

        <div className="side-drawer-actions">
          <button className="btn btn-primary btn-sm" onClick={() => pushToast('Email composto')}><I.mail size={13}/> Email</button>
          <button className="btn btn-secondary btn-sm" onClick={() => pushToast('A ligar…')}><I.phone size={13}/> Ligar</button>
          <button className="btn btn-secondary btn-sm"><I.paper size={13}/> Nova nota</button>
          <button className="btn btn-ghost btn-sm" style={{marginLeft:'auto'}}><I.moreH size={14}/></button>
        </div>

        <div className="tabs" style={{padding:'0 20px', marginTop:0}}>
          {[
            {v:'resumo',     l:'Resumo'},
            {v:'atividade',  l:'Atividade'},
            {v:'faturacao',  l:'Faturação'},
            {v:'contactos',  l:'Contactos'},
          ].map(t => (
            <button key={t.v} className={`tab-btn ${tab===t.v?'active':''}`} onClick={() => setTab(t.v)}>{t.l}</button>
          ))}
        </div>

        <div className="side-drawer-body">
          {tab === 'resumo' && (
            <>
              <div className="cli-kpis">
                <div><div className="cli-stat-lbl">MRR</div><div className="cli-kpi-val tnum">{cliente.mrr>0 ? cliente.mrr.toLocaleString('pt-PT')+' €' : '—'}</div></div>
                <div><div className="cli-stat-lbl">Faturado</div><div className="cli-kpi-val tnum">{cliente.faturado.toLocaleString('pt-PT')} €</div></div>
                <div><div className="cli-stat-lbl">Satisfação</div><div className="cli-kpi-val">{cliente.sat ? cliente.sat.toFixed(1)+' / 5' : '—'}</div></div>
                <div><div className="cli-stat-lbl">Tickets abertos</div><div className="cli-kpi-val" style={{color: cliente.ticketsAbertos>0?'var(--red)':'inherit'}}>{cliente.ticketsAbertos}</div></div>
              </div>

              <div className="cli-info-block">
                <div className="cli-info-label">Informação geral</div>
                <div className="cli-info-grid">
                  <div><span className="muted">Contato principal</span><span>{cliente.contato}</span></div>
                  <div><span className="muted">Email</span><span className="tnum" style={{fontSize:12.5}}>{cliente.email}</span></div>
                  <div><span className="muted">Telefone</span><span className="tnum">{cliente.telefone}</span></div>
                  <div><span className="muted">NIF</span><span className="mono">{cliente.nif}</span></div>
                  <div><span className="muted">Plano</span><span>{cliente.plano}</span></div>
                  <div><span className="muted">Cliente desde</span><span className="tnum">{formatDate(cliente.desde)}/{cliente.desde.split('-')[0]}</span></div>
                  <div><span className="muted">Escritório</span><span className="row" style={{gap:6}}><span style={{width:6, height:6, borderRadius:'50%', background:office?.color}}/>{office?.name}</span></div>
                  <div><span className="muted">Gestor</span>{gestor && <span className="row" style={{gap:6}}><Avatar initials={gestor.initials} size="sm" color={gestor.color}/>{gestor.name}</span>}</div>
                </div>
              </div>

              {cliente.risco === 'alto' && (
                <div className="alert-card red">
                  <I.alert size={18}/>
                  <div>
                    <div style={{fontWeight:600, marginBottom:2}}>Cliente em risco</div>
                    <div style={{fontSize:12.5}}>Satisfação baixa ({cliente.sat?.toFixed(1)}) e {cliente.ticketsAbertos} ticket{cliente.ticketsAbertos>1?'s':''} em aberto. Considera agendar uma reunião de acompanhamento.</div>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'atividade' && (
            <>
              <div className="cli-info-label" style={{marginBottom:14}}>Últimas interações</div>
              <ol className="timeline">
                {CLIENTE_TIMELINE.map(t => (
                  <li key={t.id} className={`tl-item tone-${t.tone}`}>
                    <span className="tl-marker">{React.createElement(I[t.icon], {size: 12})}</span>
                    <div className="tl-body">
                      <div className="tl-title">{t.titulo}</div>
                      <div className="tl-sub">{t.desc}</div>
                      <div className="tl-meta">{t.when} · {t.by}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}

          {tab === 'faturacao' && (
            <>
              <div className="cli-info-label" style={{marginBottom:14}}>Últimas 6 faturas</div>
              <div className="mini-table">
                {[
                  {n:'F-8842', date:'01 Abr 26', val:cliente.mrr, st:'pago'},
                  {n:'F-8701', date:'01 Mar 26', val:cliente.mrr, st:'pago'},
                  {n:'F-8562', date:'01 Fev 26', val:cliente.mrr, st:'pago'},
                  {n:'F-8421', date:'01 Jan 26', val:cliente.mrr, st:'pago'},
                  {n:'F-8288', date:'01 Dez 25', val:cliente.mrr, st:'pago'},
                  {n:'F-8145', date:'01 Nov 25', val:cliente.mrr, st:'pago'},
                ].filter(() => cliente.mrr>0).map(f => (
                  <div className="mini-row" key={f.n}>
                    <span className="mono">{f.n}</span>
                    <span className="tnum muted">{f.date}</span>
                    <span className="tnum" style={{fontWeight:600}}>{f.val.toLocaleString('pt-PT')} €</span>
                    <Pill tone="green" dot="#16a34a">Pago</Pill>
                  </div>
                ))}
                {cliente.mrr === 0 && <div className="muted" style={{padding:'16px 0', fontSize:13}}>Sem faturas emitidas para este cliente.</div>}
              </div>
            </>
          )}

          {tab === 'contactos' && (
            <>
              <div className="cli-info-label" style={{marginBottom:14}}>Pessoas deste cliente</div>
              <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div className="contact-row">
                  <Avatar initials={cliente.contato.split(' ').map(s=>s[0]).slice(0,2).join('')} size="md"/>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontWeight:600, fontSize:14}}>{cliente.contato} <span style={{fontSize:11, color:'var(--text-4)', fontWeight:400, marginLeft:6}}>PRINCIPAL</span></div>
                    <div style={{fontSize:12.5, color:'var(--text-3)'}}>{cliente.email}</div>
                  </div>
                  <button className="icon-btn" title="Email"><I.mail size={14}/></button>
                  <button className="icon-btn" title="Telefone"><I.phone size={14}/></button>
                </div>
                {cliente.tipo === 'empresa' && (
                  <div className="contact-row">
                    <Avatar initials="SF" size="md" color="#8b5cf6"/>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontWeight:600, fontSize:14}}>Sónia Ferraz</div>
                      <div style={{fontSize:12.5, color:'var(--text-3)'}}>financeiro@{cliente.email.split('@')[1]}</div>
                    </div>
                    <button className="icon-btn" title="Email"><I.mail size={14}/></button>
                    <button className="icon-btn" title="Telefone"><I.phone size={14}/></button>
                  </div>
                )}
                <button className="btn btn-ghost btn-sm" style={{alignSelf:'flex-start'}}><I.plus size={13}/> Adicionar contato</button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function ClienteForm({ onClose, onSubmit }){
  const [tipo, setTipo] = useState('empresa');
  const [nome, setNome] = useState('');
  const [nif, setNif] = useState('');
  const [contato, setContato] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [escritorio, setEscritorio] = useState('lisboa');
  const [plano, setPlano] = useState('Business');
  const [errors, setErrors] = useState({});

  const submit = () => {
    const e = {};
    if (!nome.trim()) e.nome = 'Obrigatório';
    if (!nif.trim() || nif.length < 9) e.nif = 'NIF com 9 dígitos';
    if (!email.trim() || !email.includes('@')) e.email = 'Email inválido';
    setErrors(e);
    if (Object.keys(e).length) return;
    onSubmit({ tipo, nome, nif, contato, email, telefone, escritorio, plano });
  };

  return (
    <Modal open={true} onClose={onClose} size="lg" title="Novo cliente"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit}>Criar cliente</button>
      </>}>
      <div className="form-grid">
        <div className="field full">
          <label className="field-label">Tipo</label>
          <div className="row" style={{gap:8}}>
            {[{v:'empresa',l:'Empresa',i:<I.building size={14}/>},{v:'particular',l:'Particular',i:<I.users size={14}/>}].map(o => (
              <button key={o.v} className={`btn btn-sm ${tipo===o.v?'btn-primary':'btn-secondary'}`} onClick={() => setTipo(o.v)}>{o.i}{o.l}</button>
            ))}
          </div>
        </div>
        <div className="field full">
          <label className="field-label">{tipo === 'empresa' ? 'Nome da empresa' : 'Nome completo'} <span className="req">*</span></label>
          <input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder={tipo==='empresa'?'ex: Portcel Navegação, S.A.':'ex: Ana Silveira'}/>
          {errors.nome && <div className="field-error">{errors.nome}</div>}
        </div>
        <div className="field">
          <label className="field-label">NIF <span className="req">*</span></label>
          <input className="input mono" value={nif} onChange={e => setNif(e.target.value.replace(/\D/g,'').slice(0,9))} placeholder="501238456"/>
          {errors.nif && <div className="field-error">{errors.nif}</div>}
        </div>
        <div className="field">
          <label className="field-label">Escritório</label>
          <select className="select" value={escritorio} onChange={e => setEscritorio(e.target.value)}>
            {OFFICES.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div className="field full">
          <label className="field-label">Contato principal</label>
          <input className="input" value={contato} onChange={e => setContato(e.target.value)} placeholder="Nome da pessoa de contato"/>
        </div>
        <div className="field">
          <label className="field-label">Email <span className="req">*</span></label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@empresa.pt"/>
          {errors.email && <div className="field-error">{errors.email}</div>}
        </div>
        <div className="field">
          <label className="field-label">Telefone</label>
          <input className="input mono" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="+351 21 000 0000"/>
        </div>
        <div className="field">
          <label className="field-label">Plano inicial</label>
          <select className="select" value={plano} onChange={e => setPlano(e.target.value)}>
            <option>Pessoal</option>
            <option>Business</option>
            <option>Enterprise</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}

window.Clientes = Clientes;
