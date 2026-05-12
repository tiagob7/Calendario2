// ============================================================
// Reclamações module — list + detail + create
// ============================================================

function Reclamacoes({ pushToast }){
  const [filter, setFilter] = useState('todos');
  const [items, setItems] = useState(RECLAMACOES);
  const [detail, setDetail] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  const counts = useMemo(() => ({
    todos: items.length,
    aberto: items.filter(i => i.estado === 'aberto').length,
    'em-analise': items.filter(i => i.estado === 'em-analise').length,
    resolvido: items.filter(i => i.estado === 'resolvido').length,
  }), [items]);

  const visible = items.filter(i => {
    if (filter !== 'todos' && i.estado !== filter) return false;
    if (search && !(`${i.cliente} ${i.assunto} ${i.id}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const channelIcon = (c) => c === 'email' ? <I.mail size={16}/> : c === 'livro' ? <I.book size={16}/> : c === 'loja' ? <I.store size={16}/> : <I.phone size={16}/>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Atendimento ao cliente</div>
          <h1>Reclamações</h1>
          <p className="lede">Registo e gestão de reclamações recebidas por todos os canais.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><I.paper size={15}/> Exportar</button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><I.plus size={15}/> Nova reclamação</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{marginBottom:20}}>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.flag size={14}/></span>Total ativas</div>
          <div className="stat-val">{counts.aberto + counts['em-analise']}</div>
          <div className="stat-delta flat"><span className="muted">dos últimos 30 dias</span></div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.clock size={14}/></span>Tempo médio de resposta</div>
          <div className="stat-val">4.2<span style={{fontSize:16, color:'var(--text-3)', fontWeight:500, marginLeft:4}}>h</span></div>
          <div className="stat-delta up"><I.arrowDown size={12}/><span className="mono">-18%</span><span style={{color:'var(--text-4)', fontWeight:500}}> · vs semana passada</span></div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.check2 size={14}/></span>Taxa de resolução</div>
          <div className="stat-val">87<span style={{fontSize:16, color:'var(--text-3)', fontWeight:500, marginLeft:4}}>%</span></div>
          <div className="stat-delta up"><I.arrowUp size={12}/><span className="mono">+3%</span><span style={{color:'var(--text-4)', fontWeight:500}}> · este mês</span></div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.alert size={14}/></span>Abertas &gt; 72h</div>
          <div className="stat-val" style={{color:'var(--amber)'}}>2</div>
          <div className="stat-delta dn"><I.arrowUp size={12}/><span className="mono">+1</span><span style={{color:'var(--text-4)', fontWeight:500}}> · requer ação</span></div>
        </div>
      </div>

      {/* Filters */}
      <div className="row between" style={{marginBottom:14, flexWrap:'wrap', gap:12}}>
        <div className="tabs" style={{margin:0, border:'none'}}>
          {[
            {v:'todos', l:'Todas'},
            {v:'aberto', l:'Abertas'},
            {v:'em-analise', l:'Em análise'},
            {v:'resolvido', l:'Resolvidas'},
          ].map(t => (
            <button key={t.v} className={`tab-btn ${filter === t.v ? 'active' : ''}`} onClick={() => setFilter(t.v)}>
              {t.l} <span className="tab-count">{counts[t.v]}</span>
            </button>
          ))}
        </div>
        <div className="row" style={{gap:8}}>
          <div style={{position:'relative'}}>
            <I.search size={14} style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-4)'}}/>
            <input className="input" style={{paddingLeft:32, width:220}} placeholder="Pesquisar cliente ou ID…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <button className="btn btn-secondary btn-sm"><I.filter size={14}/> Filtros</button>
        </div>
      </div>

      {/* List */}
      <div className="card">
        <div className="rec-list">
          {visible.length === 0 ? (
            <EmptyState icon={<I.flag size={22}/>} title="Sem reclamações" sub="Não há resultados para este filtro."/>
          ) : visible.map(r => (
            <div key={r.id} className="rec-row" onClick={() => setDetail(r)}>
              <div className={`rec-priority p-${r.prioridade}`}/>
              <div className={`rec-channel ${r.canal}`}>{channelIcon(r.canal)}</div>
              <div className="rec-body">
                <div className="rec-top">
                  <span className="rec-id mono">{r.id}</span>
                  <span className="rec-cliente">{r.cliente}</span>
                  <Pill tone={r.estado === 'aberto' ? 'amber' : r.estado === 'em-analise' ? 'accent' : 'green'}>
                    {ESTADO_LABEL[r.estado]}
                  </Pill>
                  <span className="muted" style={{fontSize:11, marginLeft:'auto'}}>{r.dataAbertura}</span>
                </div>
                <div style={{fontSize:13, fontWeight:500, marginTop:2, marginBottom:4}}>{r.assunto}</div>
                <div className="rec-excerpt">{r.excerpt}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {detail && <RecDetalhe item={detail} onClose={() => setDetail(null)} onUpdate={(upd) => {
        setItems(arr => arr.map(i => i.id === upd.id ? upd : i));
        setDetail(upd);
      }} pushToast={pushToast}/>}

      {showForm && <RecForm onClose={() => setShowForm(false)} onSubmit={(data) => {
        const id = 'R-' + (2054 + items.length - 6);
        setItems([{ ...data, id, mensagens: [], dataAbertura: '2026-04-19' }, ...items]);
        setShowForm(false);
        pushToast('Reclamação registada', 'success');
      }}/>}
    </div>
  );
}

function RecDetalhe({ item, onClose, onUpdate, pushToast }){
  const [reply, setReply] = useState('');
  const send = () => {
    if (!reply.trim()) return;
    const msgs = [...(item.mensagens||[]), { from: ME.name, out: true, text: reply, time: 'agora' }];
    onUpdate({ ...item, mensagens: msgs });
    setReply('');
    pushToast('Resposta enviada', 'success');
  };

  const timeline = [
    { label: 'Recebida', meta: item.dataAbertura, done: true },
    { label: 'Em análise', meta: item.estado !== 'aberto' ? '16 Abril' : '—', done: item.estado === 'em-analise' || item.estado === 'resolvido', active: item.estado === 'em-analise' },
    { label: 'Respondida', meta: item.estado === 'resolvido' ? '17 Abril' : '—', done: item.estado === 'resolvido' },
    { label: 'Resolvida', meta: item.estado === 'resolvido' ? '17 Abril' : '—', done: item.estado === 'resolvido', active: item.estado !== 'resolvido' && item.estado !== 'aberto' ? false : false },
  ];

  return (
    <Modal open={true} onClose={onClose} size="lg" title={
      <span>{item.id} · {item.cliente}</span>
    } footer={<>
      {item.estado !== 'resolvido' && (
        <button className="btn btn-success" onClick={() => { onUpdate({ ...item, estado: 'resolvido' }); pushToast('Reclamação resolvida', 'success'); onClose(); }}>
          <I.check size={14}/> Marcar como resolvida
        </button>
      )}
      <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
    </>}>
      <div className="detail-layout">
        <div>
          <div style={{marginBottom:14}}>
            <div style={{fontFamily:"'Sora', sans-serif", fontSize:18, fontWeight:700, letterSpacing:'-.015em', marginBottom:6}}>{item.assunto}</div>
            <div className="row" style={{gap:6, marginBottom:10}}>
              <Pill tone={item.estado === 'aberto' ? 'amber' : item.estado === 'em-analise' ? 'accent' : 'green'}>
                {ESTADO_LABEL[item.estado]}
              </Pill>
              <Pill tone={item.prioridade === 'alta' ? 'red' : item.prioridade === 'media' ? 'amber' : 'green'}>Prioridade {item.prioridade}</Pill>
              <Pill>{CHANNEL_LABEL[item.canal]}</Pill>
            </div>
            <div style={{fontSize:13.5, lineHeight:1.6, color:'var(--text-2)'}}>{item.excerpt}</div>
          </div>

          {item.mensagens && item.mensagens.length > 0 && (
            <>
              <div style={{fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600, marginBottom:8}}>Conversa</div>
              <div className="card" style={{marginBottom:12}}>
                <div className="detail-chat">
                  {item.mensagens.map((m, i) => (
                    <div key={i} className={`msg ${m.out ? 'out' : ''}`}>
                      {!m.out && <Avatar initials={(m.from||'').split(' ').map(s=>s[0]).slice(0,2).join('')} size="sm"/>}
                      <div>
                        <div className="msg-bubble">{m.text}</div>
                        <div className="msg-time">{m.from} · {m.time}</div>
                      </div>
                      {m.out && <Avatar initials={ME.initials} size="sm" color="linear-gradient(135deg,#f472b6,#8b5cf6)"/>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="row" style={{gap:8, alignItems:'flex-end'}}>
            <div className="field" style={{flex:1}}>
              <label className="field-label">Responder</label>
              <textarea className="textarea" rows={2} value={reply} onChange={e => setReply(e.target.value)} placeholder="Escrever resposta para o cliente…"/>
            </div>
            <button className="btn btn-primary" onClick={send}><I.send size={14}/> Enviar</button>
          </div>
        </div>

        <div>
          <div style={{fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600, marginBottom:10}}>Detalhes</div>
          <div style={{display:'flex', flexDirection:'column', gap:10, padding:'14px 16px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', fontSize:13, marginBottom:18}}>
            <div className="row between"><span className="muted">Cliente</span><span style={{fontWeight:600}}>{item.cliente}</span></div>
            <div className="row between"><span className="muted">Canal</span><span>{CHANNEL_LABEL[item.canal]}</span></div>
            <div className="row between"><span className="muted">Escritório</span><span style={{textTransform:'capitalize'}}>{item.escritorio}</span></div>
            <div className="row between"><span className="muted">Data</span><span className="tnum">{item.dataAbertura}</span></div>
            <div className="row between"><span className="muted">Atribuído</span><Avatar initials="SM" size="sm" color="linear-gradient(135deg,#f472b6,#8b5cf6)"/></div>
          </div>

          <div style={{fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600, marginBottom:10}}>Progresso</div>
          <div className="timeline">
            {timeline.map((s, i) => (
              <div key={i} className={`timeline-step ${s.done?'done':''} ${s.active?'active':''}`}>
                <div className="timeline-dot">{s.done && <I.check/>}</div>
                <div className="timeline-body">
                  <div className="timeline-title">{s.label}</div>
                  <div className="timeline-meta">{s.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function RecForm({ onClose, onSubmit }){
  const [cliente, setCliente] = useState('');
  const [canal, setCanal] = useState('email');
  const [prioridade, setPrioridade] = useState('media');
  const [escritorio, setEscritorio] = useState('lisboa');
  const [assunto, setAssunto] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [errors, setErrors] = useState({});

  const submit = () => {
    const errs = {};
    if (!cliente.trim()) errs.cliente = 'Obrigatório';
    if (!assunto.trim()) errs.assunto = 'Obrigatório';
    if (!excerpt.trim()) errs.excerpt = 'Descreve a reclamação';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSubmit({ cliente, canal, prioridade, escritorio, assunto, excerpt, estado: 'aberto', atribuido: ME.id });
  };

  return (
    <Modal open={true} onClose={onClose} size="lg" title="Registar nova reclamação"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit}>Registar</button>
      </>}>
      <div className="form-grid">
        <div className="field">
          <label className="field-label">Nome do cliente <span className="req">*</span></label>
          <input className="input" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="ex: Maria Silva"/>
          {errors.cliente && <div className="field-error">{errors.cliente}</div>}
        </div>
        <div className="field">
          <label className="field-label">Canal</label>
          <div className="row" style={{gap:4, flexWrap:'wrap'}}>
            {[
              {v:'email', l:'Email', i:<I.mail size={13}/>},
              {v:'livro', l:'Livro', i:<I.book size={13}/>},
              {v:'loja', l:'Loja', i:<I.store size={13}/>},
              {v:'telefone', l:'Telefone', i:<I.phone size={13}/>},
            ].map(o => (
              <button key={o.v} className={`btn btn-sm ${canal===o.v?'btn-primary':'btn-secondary'}`} onClick={() => setCanal(o.v)}>
                {o.i}{o.l}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label">Prioridade</label>
          <div className="row" style={{gap:6}}>
            {[
              {v:'alta', l:'Alta', color:'var(--red)'},
              {v:'media', l:'Média', color:'var(--amber)'},
              {v:'baixa', l:'Baixa', color:'var(--green)'},
            ].map(o => (
              <button key={o.v} className={`btn btn-sm ${prioridade===o.v?'btn-primary':'btn-secondary'}`} onClick={() => setPrioridade(o.v)}>
                <span style={{width:8, height:8, borderRadius:'50%', background:o.color}}/>{o.l}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label">Escritório</label>
          <select className="select" value={escritorio} onChange={e => setEscritorio(e.target.value)}>
            {OFFICES.map(o => <option key={o.id} value={o.id}>{o.city}</option>)}
          </select>
        </div>
        <div className="field full">
          <label className="field-label">Assunto <span className="req">*</span></label>
          <input className="input" value={assunto} onChange={e => setAssunto(e.target.value)} placeholder="Resumo curto da reclamação"/>
          {errors.assunto && <div className="field-error">{errors.assunto}</div>}
        </div>
        <div className="field full">
          <label className="field-label">Descrição <span className="req">*</span></label>
          <textarea className="textarea" rows={5} value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Detalha o que o cliente relatou…"/>
          {errors.excerpt && <div className="field-error">{errors.excerpt}</div>}
        </div>
      </div>
    </Modal>
  );
}

window.Reclamacoes = Reclamacoes;
