// ============================================================
// Despesas — submissão e aprovação de notas de despesa
// ============================================================

const DESP_CATEGORIAS = {
  alimentacao:   { label: 'Alimentação',  tone: 'amber',  icon: 'store',    color: '#f59e0b' },
  transporte:    { label: 'Transporte',   tone: 'accent', icon: 'pin',      color: '#0284c7' },
  alojamento:    { label: 'Alojamento',   tone: 'purple', icon: 'building', color: '#8b5cf6' },
  material:      { label: 'Material',     tone: 'teal',   icon: 'paper',    color: '#0d9488' },
  comunicacoes:  { label: 'Comunicações', tone: 'green',  icon: 'phone',    color: '#10b981' },
  outro:         { label: 'Outro',        tone: 'neutral',icon: 'receipt',  color: '#64748b' },
};

const DESP_SEED = [
  { id: 'd1',  uid: 'u2', nome: 'João Pereira',    email: 'joao.pereira@algartempo.pt',    officeId: 'lisboa', categoria: 'alimentacao', valor: 42.50, data: '2026-05-08', descricao: 'Almoço com cliente ABC — Restaurante Solar', estado: 'pendente',  recibo: { nome: 'recibo-almoco-abc.pdf' }, criadoEm: 'há 2 h',    initials: 'JP', color: '#f59e0b' },
  { id: 'd2',  uid: 'u4', nome: 'Miguel Santos',   email: 'miguel.santos@algartempo.pt',   officeId: 'faro',   categoria: 'transporte',  valor: 87.30, data: '2026-05-07', descricao: 'Combustível — visita Albufeira → Faro → Loulé',  estado: 'pendente',  recibo: { nome: 'galp-08051426.jpg' }, criadoEm: 'há 5 h',    initials: 'MS', color: '#8b5cf6' },
  { id: 'd3',  uid: 'u5', nome: 'Beatriz Costa',   email: 'beatriz.costa@algartempo.pt',   officeId: 'lisboa', categoria: 'alojamento',  valor: 124.00,data: '2026-05-05', descricao: 'Hotel Marquês · 1 noite · formação ISO',          estado: 'pendente',  recibo: { nome: 'fatura-hotel-marques.pdf' }, criadoEm: 'há 1 dia', initials: 'BC', color: '#ec4899' },
  { id: 'd4',  uid: 'u3', nome: 'Inês Rocha',      email: 'ines.rocha@algartempo.pt',      officeId: 'porto',  categoria: 'comunicacoes',valor: 18.90, data: '2026-05-04', descricao: 'Roaming dados — viagem a Madrid',                 estado: 'aprovado',  recibo: null,                          criadoEm: 'há 2 dias', initials: 'IR', color: '#10b981', observacao: 'OK — autorizado pela direção.', resolvidoPor: 'Sofia Marques', resolvidoEm: 'há 1 dia' },
  { id: 'd5',  uid: 'u7', nome: 'Ana Lima',        email: 'ana.lima@algartempo.pt',        officeId: 'porto',  categoria: 'material',    valor: 56.40, data: '2026-05-03', descricao: 'Material economato — recepção',                   estado: 'aprovado',  recibo: { nome: 'staples-fatura.pdf' }, criadoEm: 'há 3 dias', initials: 'AL', color: '#ef4444', observacao: '', resolvidoPor: 'Sofia Marques', resolvidoEm: 'há 2 dias' },
  { id: 'd6',  uid: 'u6', nome: 'Rui Fernandes',   email: 'rui.fernandes@algartempo.pt',   officeId: 'braga',  categoria: 'transporte',  valor: 145.00,data: '2026-04-30', descricao: 'Comboio Braga → Lisboa (ida e volta) reunião',    estado: 'aprovado',  recibo: { nome: 'cp-bilhete.pdf' },     criadoEm: 'há 6 dias', initials: 'RF', color: '#06b6d4' },
  { id: 'd7',  uid: 'u8', nome: 'Pedro Soares',    email: 'pedro.soares@algartempo.pt',    officeId: 'lisboa', categoria: 'outro',       valor: 320.00,data: '2026-04-28', descricao: 'Reembolso licença software (sem orçamento prévio)',estado: 'rejeitado', recibo: { nome: 'invoice-software.pdf' }, criadoEm: 'há 8 dias', initials: 'PS', color: '#64748b', observacao: 'Pedido sem aprovação prévia. Submeter via pedido de compra.', resolvidoPor: 'Sofia Marques', resolvidoEm: 'há 7 dias' },
  { id: 'd8',  uid: 'u10',nome: 'Luísa Antunes',   email: 'luisa.antunes@algartempo.pt',   officeId: 'faro',   categoria: 'alimentacao', valor: 28.70, data: '2026-04-26', descricao: 'Jantar pós-formação · equipa Faro (4 pax)',       estado: 'aprovado',  recibo: { nome: 'taberna-faro.pdf' },   criadoEm: 'há 10 dias',initials: 'LA', color: '#14b8a6' },
];

function Despesas({ pushToast }){
  const [list, setList]         = useState(DESP_SEED);
  const [search, setSearch]     = useState('');
  const [estado, setEstado]     = useState('todos');
  const [office, setOffice]     = useState('todos');
  const [categoria, setCategoria]= useState('todos');
  const [selected, setSelected] = useState(null);
  const [modalNew, setModalNew] = useState(false);

  const filtered = useMemo(() => {
    return list.filter(d => {
      if (estado    !== 'todos' && d.estado    !== estado)    return false;
      if (office    !== 'todos' && d.officeId  !== office)    return false;
      if (categoria !== 'todos' && d.categoria !== categoria) return false;
      if (search){
        const s = search.toLowerCase();
        if (!d.nome.toLowerCase().includes(s) && !d.descricao.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [list, search, estado, office, categoria]);

  const totals = useMemo(() => ({
    pendente: list.filter(d => d.estado === 'pendente').reduce((a,d) => a + d.valor, 0),
    aprovado: list.filter(d => d.estado === 'aprovado').reduce((a,d) => a + d.valor, 0),
    pendCount: list.filter(d => d.estado === 'pendente').length,
    aprovCount: list.filter(d => d.estado === 'aprovado').length,
    rejeitCount: list.filter(d => d.estado === 'rejeitado').length,
    monthCount: list.filter(d => d.data >= '2026-05-01').length,
  }), [list]);

  const decide = (id, novoEstado, obs) => {
    setList(l => l.map(d => d.id === id ? {...d, estado: novoEstado, observacao: obs || d.observacao, resolvidoPor: 'Sofia Marques', resolvidoEm: 'agora'} : d));
    setSelected(s => s?.id === id ? {...s, estado: novoEstado, observacao: obs || s.observacao, resolvidoPor: 'Sofia Marques', resolvidoEm: 'agora'} : s);
    pushToast?.(novoEstado === 'aprovado' ? 'Despesa aprovada' : 'Despesa rejeitada', 'success');
  };

  const officeOf = (id) => OFFICES.find(o => o.id === id);
  const fmtEUR = (v) => new Intl.NumberFormat('pt-PT', { style:'currency', currency:'EUR' }).format(v);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Recursos Humanos</div>
          <h1>Despesas</h1>
          <p className="lede">Notas de despesa submetidas pelos colaboradores. Aprovação por administradores ou RH.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><I.layers size={14}/>Exportar CSV</button>
          <button className="btn btn-primary" onClick={() => setModalNew(true)}><I.plus size={14}/>Nova despesa</button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="stat-grid" style={{marginBottom: 18}}>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.clock size={14}/></span>Pendentes</div>
          <div className="stat-val">{fmtEUR(totals.pendente)}</div>
          <div className="stat-delta flat"><span className="mono">{totals.pendCount}</span> notas a aguardar</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.check2 size={14}/></span>Aprovadas</div>
          <div className="stat-val">{fmtEUR(totals.aprovado)}</div>
          <div className="stat-delta up"><I.arrowUp size={11}/><span className="mono">{totals.aprovCount}</span> notas validadas</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.alert size={14}/></span>Rejeitadas</div>
          <div className="stat-val">{totals.rejeitCount}</div>
          <div className="stat-delta flat">este mês</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.receipt size={14}/></span>Submetidas em Maio</div>
          <div className="stat-val">{totals.monthCount}</div>
          <div className="stat-delta flat">total no mês corrente</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{marginBottom: 14}}>
        <div className="card-body" style={{display:'flex', alignItems:'center', gap: 12, flexWrap:'wrap', padding:'12px 16px'}}>
          <Segmented value={estado} onChange={setEstado} options={[
            { value: 'todos',     label: `Todos · ${list.length}` },
            { value: 'pendente',  label: `Pendentes · ${totals.pendCount}` },
            { value: 'aprovado',  label: `Aprovadas · ${totals.aprovCount}` },
            { value: 'rejeitado', label: `Rejeitadas · ${totals.rejeitCount}` },
          ]}/>
          <div style={{flex:1, position:'relative', minWidth: 200}}>
            <I.search size={14} style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-4)'}}/>
            <input className="input" style={{paddingLeft: 32}} placeholder="Pesquisar descrição ou colaborador…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select className="select" style={{maxWidth: 170}} value={categoria} onChange={e => setCategoria(e.target.value)}>
            <option value="todos">Todas as categorias</option>
            {Object.entries(DESP_CATEGORIAS).map(([k,c]) => <option key={k} value={k}>{c.label}</option>)}
          </select>
          <select className="select" style={{maxWidth: 150}} value={office} onChange={e => setOffice(e.target.value)}>
            <option value="todos">Todos os escritórios</option>
            {OFFICES.map(o => <option key={o.id} value={o.id}>{o.city}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p0">
          {filtered.length === 0 ? (
            <EmptyState icon={<I.receipt size={22}/>} title="Sem despesas" sub="Ajusta os filtros ou submete a primeira despesa do mês."/>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width:'36%'}}>Despesa</th>
                  <th>Categoria</th>
                  <th>Colaborador</th>
                  <th>Data</th>
                  <th className="num">Valor</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const cat = DESP_CATEGORIAS[d.categoria] || DESP_CATEGORIAS.outro;
                  const Ico = I[cat.icon] || I.receipt;
                  const off = officeOf(d.officeId);
                  return (
                    <tr key={d.id} onClick={() => setSelected(d)} className={selected?.id === d.id ? 'selected' : ''}>
                      <td>
                        <div style={{display:'flex', alignItems:'center', gap:12}}>
                          <div className={`def-card-icon tone-${cat.tone}`} style={{width:34, height:34}}>
                            <Ico size={15}/>
                          </div>
                          <div style={{minWidth:0}}>
                            <div style={{fontWeight:600, fontSize:13.5, lineHeight:1.3}}>{d.descricao}</div>
                            <div style={{fontSize:11.5, color:'var(--text-4)', marginTop:2, display:'flex', alignItems:'center', gap:6}}>
                              {d.recibo ? <><I.paperclip size={11}/> recibo anexado</> : <span style={{color:'var(--amber)'}}>sem recibo</span>}
                              <span>·</span>
                              <span className="pill-dot" style={{background: off?.color}}/>
                              {off?.city}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><Pill tone={cat.tone}>{cat.label}</Pill></td>
                      <td>
                        <div style={{display:'flex', alignItems:'center', gap:8}}>
                          <Avatar name={d.nome} initials={d.initials} size="sm" color={d.color}/>
                          <span style={{fontSize:13}}>{d.nome}</span>
                        </div>
                      </td>
                      <td><span className="mono" style={{fontSize:12, color:'var(--text-3)'}}>{d.data}</span></td>
                      <td className="num" style={{fontWeight:600, fontSize:13.5}}>{fmtEUR(d.valor)}</td>
                      <td>
                        {d.estado === 'pendente'  && <Pill tone="amber" dot="var(--amber)">Pendente</Pill>}
                        {d.estado === 'aprovado'  && <Pill tone="green" dot="var(--green)">Aprovada</Pill>}
                        {d.estado === 'rejeitado' && <Pill tone="red"   dot="var(--red)">Rejeitada</Pill>}
                      </td>
                      <td style={{textAlign:'right', paddingRight:14}}>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setSelected(d); }}>
                          Ver <I.chevronRight size={11}/>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="card-foot" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span style={{fontSize:12, color:'var(--text-3)'}}>{filtered.length} de {list.length} despesas</span>
          <span style={{fontSize:11, color:'var(--text-4)'}}>Total visível: <b style={{color:'var(--text)'}}>{fmtEUR(filtered.reduce((a,d) => a + d.valor, 0))}</b></span>
        </div>
      </div>

      {selected && (
        <DespesaDrawer
          d={selected}
          office={officeOf(selected.officeId)}
          onClose={() => setSelected(null)}
          onAprovar={(obs) => decide(selected.id, 'aprovado', obs)}
          onRejeitar={(obs) => decide(selected.id, 'rejeitado', obs)}
          onEliminar={() => { setList(l => l.filter(x => x.id !== selected.id)); pushToast?.('Despesa eliminada', 'success'); setSelected(null); }}
        />
      )}

      <Modal open={modalNew} onClose={() => setModalNew(false)} title="Nova despesa" size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModalNew(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { pushToast?.('Despesa submetida', 'success'); setModalNew(false); }}>
            <I.check size={14}/>Submeter
          </button>
        </>}>
        <p style={{fontSize:13, color:'var(--text-3)', marginBottom:18}}>
          Após submissão, a despesa fica <b>pendente</b> e é avaliada por um administrador ou pelo departamento de RH.
        </p>
        <div className="form-grid">
          <div className="field full">
            <label className="field-label">Descrição <span className="req">*</span></label>
            <input className="input" placeholder="ex: Almoço com cliente ABC — Restaurante Solar"/>
          </div>
          <div className="field">
            <label className="field-label">Categoria <span className="req">*</span></label>
            <select className="select" defaultValue="alimentacao">
              {Object.entries(DESP_CATEGORIAS).map(([k,c]) => <option key={k} value={k}>{c.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Valor (€) <span className="req">*</span></label>
            <input className="input" type="number" placeholder="0,00" step="0.01"/>
          </div>
          <div className="field">
            <label className="field-label">Data da despesa <span className="req">*</span></label>
            <input className="input" type="date" defaultValue="2026-05-11"/>
          </div>
          <div className="field">
            <label className="field-label">Escritório</label>
            <select className="select" defaultValue="lisboa">
              {OFFICES.map(o => <option key={o.id} value={o.id}>{o.city}</option>)}
            </select>
          </div>
          <div className="field full">
            <label className="field-label">Recibo</label>
            <div className="def-upload">
              <I.paperclip size={16}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:600}}>Arrasta aqui ou clica para anexar</div>
                <div style={{fontSize:11.5, color:'var(--text-4)', marginTop:2}}>PDF, JPG ou PNG — até 5 MB</div>
              </div>
              <button className="btn btn-secondary btn-sm">Escolher</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DespesaDrawer({ d, office, onClose, onAprovar, onRejeitar, onEliminar }){
  const [obs, setObs] = useState(d.observacao || '');
  const cat = DESP_CATEGORIAS[d.categoria] || DESP_CATEGORIAS.outro;
  const Ico = I[cat.icon] || I.receipt;
  const fmtEUR = (v) => new Intl.NumberFormat('pt-PT', { style:'currency', currency:'EUR' }).format(v);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="side-drawer" onClick={e => e.stopPropagation()}>
        <div className="side-drawer-head">
          <div style={{display:'flex', gap:14, alignItems:'center', minWidth:0, flex:1}}>
            <div className={`def-card-icon tone-${cat.tone}`} style={{width:48, height:48}}>
              <Ico size={20}/>
            </div>
            <div style={{minWidth:0, flex:1}}>
              <div style={{fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:700, letterSpacing:'-.015em', lineHeight:1.3}}>{d.descricao}</div>
              <div style={{fontSize:12.5, color:'var(--text-3)', marginTop:2}}>{cat.label} · {d.data}</div>
              <div style={{display:'flex', gap:6, marginTop:8}}>
                {d.estado === 'pendente'  && <Pill tone="amber" dot="var(--amber)">Pendente</Pill>}
                {d.estado === 'aprovado'  && <Pill tone="green" dot="var(--green)">Aprovada</Pill>}
                {d.estado === 'rejeitado' && <Pill tone="red"   dot="var(--red)">Rejeitada</Pill>}
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:11, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.04em', fontWeight:600}}>Valor</div>
              <div style={{fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:700, color:'var(--text)'}}>{fmtEUR(d.valor)}</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><I.close size={16}/></button>
        </div>

        <div className="side-drawer-body">
          <div className="cli-info-block">
            <div className="cli-info-label">Submetido por</div>
            <div style={{display:'flex', alignItems:'center', gap:12, padding:'12px', border:'1px solid var(--border)', borderRadius:'var(--r-md)', background:'var(--surface-2)'}}>
              <Avatar name={d.nome} initials={d.initials} color={d.color}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:600, fontSize:13.5}}>{d.nome}</div>
                <div style={{fontSize:12, color:'var(--text-3)'}}>{d.email}</div>
              </div>
              <span className="pill" style={{background:'transparent', border:'1px solid var(--border)'}}>
                <span className="pill-dot" style={{background: office?.color}}/>{office?.city}
              </span>
            </div>
          </div>

          <div className="cli-info-block">
            <div className="cli-info-label">Detalhes</div>
            <div className="cli-info-grid">
              <div><span className="muted">Data da despesa</span><span className="mono">{d.data}</span></div>
              <div><span className="muted">Submetida</span><span>{d.criadoEm}</span></div>
              <div><span className="muted">Categoria</span><span>{cat.label}</span></div>
              <div><span className="muted">Valor</span><span style={{fontWeight:600}}>{fmtEUR(d.valor)}</span></div>
              {d.resolvidoPor && <div><span className="muted">Decidido por</span><span>{d.resolvidoPor}</span></div>}
              {d.resolvidoEm && <div><span className="muted">Quando</span><span>{d.resolvidoEm}</span></div>}
            </div>
          </div>

          <div className="cli-info-block">
            <div className="cli-info-label">Recibo</div>
            {d.recibo ? (
              <div style={{display:'flex', alignItems:'center', gap:12, padding:14, border:'1px solid var(--border)', borderRadius:'var(--r-md)', background:'var(--surface-2)'}}>
                <div style={{width:40, height:40, borderRadius:'var(--r-sm)', background:'var(--accent-soft)', color:'var(--accent)', border:'1px solid var(--accent-border)', display:'grid', placeItems:'center'}}>
                  <I.paper size={18}/>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:600}}>{d.recibo.nome}</div>
                  <div style={{fontSize:11.5, color:'var(--text-4)'}}>anexado pelo colaborador</div>
                </div>
                <button className="btn btn-secondary btn-sm">Abrir</button>
              </div>
            ) : (
              <div className="alert-card" style={{background:'color-mix(in srgb, var(--amber) 8%, var(--surface))', border:'1px solid color-mix(in srgb, var(--amber) 30%, transparent)', color:'var(--text)'}}>
                <I.alert size={18} style={{color:'var(--amber)'}}/>
                <div>
                  <div style={{fontWeight:600}}>Sem recibo anexado</div>
                  <div style={{fontSize:12.5, marginTop:2, color:'var(--text-3)'}}>Recomenda-se solicitar comprovativo antes de aprovar.</div>
                </div>
              </div>
            )}
          </div>

          {d.estado === 'pendente' ? (
            <div className="cli-info-block">
              <div className="cli-info-label">Decisão</div>
              <textarea className="textarea" placeholder="Observação (opcional) — visível para o colaborador" value={obs} onChange={e => setObs(e.target.value)} rows={3}/>
              <div style={{display:'flex', gap:8, marginTop:12, justifyContent:'flex-end'}}>
                <button className="btn btn-danger btn-sm"  onClick={() => onRejeitar(obs)}><I.close size={13}/>Rejeitar</button>
                <button className="btn btn-success btn-sm" onClick={() => onAprovar(obs)}><I.check size={13}/>Aprovar despesa</button>
              </div>
            </div>
          ) : (
            d.observacao && (
              <div className="cli-info-block">
                <div className="cli-info-label">Observação</div>
                <div style={{padding:12, border:'1px solid var(--border)', borderRadius:'var(--r-md)', background:'var(--surface-2)', fontSize:13, lineHeight:1.6}}>
                  {d.observacao}
                </div>
              </div>
            )
          )}

          <div style={{display:'flex', justifyContent:'flex-end', marginTop:8}}>
            <button className="btn btn-ghost btn-sm" onClick={onEliminar}><I.trash size={12}/>Eliminar registo</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

window.Despesas = Despesas;
