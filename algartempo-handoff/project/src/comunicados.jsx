// ============================================================
// Comunicados — Feed + detail + new
// ============================================================

function Comunicados({ pushToast }){
  const [items, setItems] = useState(COMUNICADOS);
  const [cat, setCat] = useState('Todas');
  const [detail, setDetail] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  const visible = items.filter(i => {
    if (cat !== 'Todas' && i.categoria !== cat) return false;
    if (search && !(`${i.titulo} ${i.resumo}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const pinned = visible.filter(i => i.pinned);
  const rest = visible.filter(i => !i.pinned);

  const markRead = (id) => setItems(arr => arr.map(i => i.id === id ? {...i, lido: true} : i));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Comunicação interna</div>
          <h1>Comunicados</h1>
          <p className="lede">Anúncios, actualizações e notícias partilhadas com as equipas.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary">Marcar tudo como lido</button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><I.plus size={15}/> Novo comunicado</button>
        </div>
      </div>

      <div className="row between" style={{marginBottom:16, flexWrap:'wrap', gap:12}}>
        <div className="tabs" style={{margin:0, border:'none', overflow:'auto', maxWidth:'100%'}}>
          {COM_CATEGORIAS.map(c => (
            <button key={c} className={`tab-btn ${cat===c?'active':''}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
        <div style={{position:'relative'}}>
          <I.search size={14} style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-4)'}}/>
          <input className="input" style={{paddingLeft:32, width:220}} placeholder="Pesquisar…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>

      {pinned.length > 0 && (
        <>
          <div className="section-label"><I.star size={12}/> Afixados</div>
          <div className="com-grid pinned">
            {pinned.map(c => <ComCard key={c.id} item={c} onOpen={() => { setDetail(c); markRead(c.id); }} featured/>)}
          </div>
        </>
      )}

      {rest.length > 0 && (
        <>
          <div className="section-label">{pinned.length > 0 ? 'Mais recentes' : 'Todos'}</div>
          <div className="com-list">
            {rest.map(c => <ComRow key={c.id} item={c} onOpen={() => { setDetail(c); markRead(c.id); }}/>)}
          </div>
        </>
      )}

      {visible.length === 0 && (
        <div className="card">
          <EmptyState icon={<I.megaphone size={22}/>} title="Sem comunicados" sub="Não há resultados para este filtro."/>
        </div>
      )}

      {detail && <ComDetail item={detail} onClose={() => setDetail(null)}/>}
      {showForm && <ComForm onClose={() => setShowForm(false)} onSubmit={(data) => {
        const id = 'c' + (items.length + 1);
        setItems([{ ...data, id, autor: ME.name, autorId: ME.id, publicado: '2026-04-19', pinned: false, lido: true, views: 0 }, ...items]);
        setShowForm(false);
        pushToast('Comunicado publicado', 'success');
      }}/>}
    </div>
  );
}

function ComIcon({ kind, size=18 }){
  const map = { alert: <I.alert size={size}/>, calendar: <I.calendar size={size}/>, star: <I.star size={size}/>, receipt: <I.receipt size={size}/>, users: <I.users size={size}/>, clock: <I.clock size={size}/>, check2: <I.check2 size={size}/>, megaphone: <I.megaphone size={size}/> };
  return map[kind] || <I.megaphone size={size}/>;
}

function ComCard({ item, onOpen, featured }){
  const toneMap = { 'Sistemas':'amber', 'Recursos Humanos':'accent', 'Finanças':'purple', 'Cultura':'green', 'Pessoas':'teal', 'Operações':'neutral' };
  return (
    <article className={`com-card ${featured?'featured':''} ${!item.lido?'unread':''}`} onClick={onOpen}>
      <div className="com-card-head">
        <div className="com-icon"><ComIcon kind={item.icon}/></div>
        <div style={{flex:1}}>
          <div className="com-card-meta">
            <Pill tone={toneMap[item.categoria]||'neutral'}>{item.categoria}</Pill>
            {!item.lido && <span className="unread-dot" title="Novo"/>}
          </div>
          <h3 className="com-card-title">{item.titulo}</h3>
        </div>
      </div>
      <p className="com-card-resumo">{item.resumo}</p>
      <div className="com-card-foot">
        <div className="row" style={{gap:8}}>
          <Avatar initials={(item.autor||'?').split(' ').map(s=>s[0]).slice(0,2).join('')} size="sm"/>
          <span style={{fontSize:12, color:'var(--text-3)'}}>{item.autor} · {formatDate(item.publicado)}</span>
        </div>
        <span className="com-views"><I.users size={12}/> {item.views}</span>
      </div>
    </article>
  );
}

function ComRow({ item, onOpen }){
  const toneMap = { 'Sistemas':'amber', 'Recursos Humanos':'accent', 'Finanças':'purple', 'Cultura':'green', 'Pessoas':'teal', 'Operações':'neutral' };
  return (
    <div className={`com-row ${!item.lido?'unread':''}`} onClick={onOpen}>
      <div className="com-icon sm"><ComIcon kind={item.icon} size={16}/></div>
      <div style={{flex:1, minWidth:0}}>
        <div className="row" style={{gap:8, marginBottom:4, flexWrap:'wrap'}}>
          <Pill tone={toneMap[item.categoria]||'neutral'}>{item.categoria}</Pill>
          {!item.lido && <span className="unread-dot"/>}
          <span style={{fontSize:11, color:'var(--text-4)'}}>{formatDate(item.publicado)}</span>
        </div>
        <div className="com-row-title">{item.titulo}</div>
        <div className="com-row-resumo">{item.resumo}</div>
      </div>
      <div style={{textAlign:'right', flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6}}>
        <Avatar initials={(item.autor||'?').split(' ').map(s=>s[0]).slice(0,2).join('')} size="sm"/>
        <span className="com-views"><I.users size={11}/>{item.views}</span>
      </div>
    </div>
  );
}

function ComDetail({ item, onClose }){
  const toneMap = { 'Sistemas':'amber', 'Recursos Humanos':'accent', 'Finanças':'purple', 'Cultura':'green', 'Pessoas':'teal', 'Operações':'neutral' };
  return (
    <Modal open={true} onClose={onClose} size="lg" title={
      <span className="row" style={{gap:8}}><ComIcon kind={item.icon} size={16}/>{item.titulo}</span>
    } footer={<button className="btn btn-secondary" onClick={onClose}>Fechar</button>}>
      <div className="row" style={{gap:6, marginBottom:16}}>
        <Pill tone={toneMap[item.categoria]||'neutral'}>{item.categoria}</Pill>
        <span className="muted" style={{fontSize:12}}>{item.autor} · {formatDate(item.publicado)}</span>
        <span className="muted" style={{fontSize:12, marginLeft:'auto'}}><I.users size={12} style={{verticalAlign:'-2px'}}/> {item.views} vistos</span>
      </div>
      <div style={{fontSize:15, lineHeight:1.7, color:'var(--text-2)', whiteSpace:'pre-line'}}>
        {item.resumo}
        {'\n\n'}
        Esta comunicação foi enviada a todos os colaboradores {item.escritorios.includes('todos') ? 'de todos os escritórios' : `dos escritórios: ${item.escritorios.join(', ')}`}. Para dúvidas, responde diretamente por chat ao autor desta mensagem.
      </div>
      <div style={{marginTop:20, padding:'12px 14px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', fontSize:12.5, color:'var(--text-3)'}}>
        <strong style={{color:'var(--text-1)'}}>Destinatários:</strong> {item.escritorios.includes('todos') ? 'Todos os escritórios' : item.escritorios.map(e => e[0].toUpperCase()+e.slice(1)).join(' · ')}
      </div>
    </Modal>
  );
}

function ComForm({ onClose, onSubmit }){
  const [titulo, setTitulo] = useState('');
  const [resumo, setResumo] = useState('');
  const [categoria, setCategoria] = useState('Operações');
  const [escritorios, setEscritorios] = useState(['todos']);
  const [icon, setIcon] = useState('megaphone');
  const [errors, setErrors] = useState({});

  const toggleOffice = (id) => {
    if (id === 'todos') return setEscritorios(['todos']);
    setEscritorios(prev => {
      const cleaned = prev.filter(x => x !== 'todos');
      return cleaned.includes(id) ? cleaned.filter(x => x !== id) : [...cleaned, id];
    });
  };

  const submit = () => {
    const errs = {};
    if (!titulo.trim()) errs.titulo = 'Obrigatório';
    if (!resumo.trim()) errs.resumo = 'Escreve a mensagem';
    if (escritorios.length === 0) errs.esc = 'Seleciona pelo menos 1';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSubmit({ titulo, resumo, categoria, escritorios, icon });
  };

  return (
    <Modal open={true} onClose={onClose} size="lg" title="Novo comunicado"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit}>Publicar</button>
      </>}>
      <div className="form-grid">
        <div className="field full">
          <label className="field-label">Título <span className="req">*</span></label>
          <input className="input" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="ex: Manutenção no sistema na próxima semana"/>
          {errors.titulo && <div className="field-error">{errors.titulo}</div>}
        </div>
        <div className="field full">
          <label className="field-label">Mensagem <span className="req">*</span></label>
          <textarea className="textarea" rows={5} value={resumo} onChange={e => setResumo(e.target.value)} placeholder="Detalha o anúncio…"/>
          {errors.resumo && <div className="field-error">{errors.resumo}</div>}
        </div>
        <div className="field">
          <label className="field-label">Categoria</label>
          <select className="select" value={categoria} onChange={e => setCategoria(e.target.value)}>
            {COM_CATEGORIAS.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label">Ícone</label>
          <div className="row" style={{gap:4, flexWrap:'wrap'}}>
            {['megaphone','alert','calendar','star','receipt','users','clock','check2'].map(k => (
              <button key={k} className={`icon-pick ${icon===k?'active':''}`} onClick={() => setIcon(k)} title={k}>
                <ComIcon kind={k} size={16}/>
              </button>
            ))}
          </div>
        </div>
        <div className="field full">
          <label className="field-label">Destinatários</label>
          <div className="row" style={{gap:6, flexWrap:'wrap'}}>
            <button className={`btn btn-sm ${escritorios.includes('todos')?'btn-primary':'btn-secondary'}`} onClick={() => toggleOffice('todos')}>Todos</button>
            {OFFICES.map(o => (
              <button key={o.id} className={`btn btn-sm ${escritorios.includes(o.id)?'btn-primary':'btn-secondary'}`} onClick={() => toggleOffice(o.id)}>
                <span style={{width:6, height:6, borderRadius:'50%', background:o.color}}/>{o.city}
              </button>
            ))}
          </div>
          {errors.esc && <div className="field-error">{errors.esc}</div>}
        </div>
      </div>
    </Modal>
  );
}

window.Comunicados = Comunicados;
