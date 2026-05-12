// ============================================================
// Tarefas — Kanban board with drag & drop
// ============================================================

function Tarefas({ pushToast }){
  const [items, setItems] = useState(TAREFAS);
  const [detail, setDetail] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('todas'); // todas | minhas
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const visible = filter === 'minhas' ? items.filter(i => i.atribuido === ME.id) : items;

  const countByState = (st) => visible.filter(i => i.estado === st).length;

  const onDragStart = (id) => setDragging(id);
  const onDragEnd = () => { setDragging(null); setDragOver(null); };
  const onDropCol = (estado) => {
    if (!dragging) return;
    setItems(arr => arr.map(i => i.id === dragging ? {...i, estado} : i));
    window.TAREFAS = items.map(i => i.id === dragging ? {...i, estado} : i);
    pushToast(`Movido para "${TAREFA_ESTADOS.find(e=>e.id===estado).label}"`, 'success');
    setDragging(null); setDragOver(null);
  };

  const personFor = (id) => id === ME.id ? ME : (COLLEAGUES.find(c => c.id === id) || {name:'—', initials:'?'});

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Produtividade</div>
          <h1>Tarefas</h1>
          <p className="lede">Acompanha o trabalho das equipas com kanban arrastável.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><I.filter size={15}/> Filtros</button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><I.plus size={15}/> Nova tarefa</button>
        </div>
      </div>

      <div className="row between" style={{marginBottom:16, flexWrap:'wrap', gap:12}}>
        <div className="tabs" style={{margin:0, border:'none'}}>
          {[{v:'todas',l:'Todas'},{v:'minhas',l:'Atribuídas a mim'}].map(t => (
            <button key={t.v} className={`tab-btn ${filter===t.v?'active':''}`} onClick={() => setFilter(t.v)}>
              {t.l} <span className="tab-count">{t.v==='todas'?items.length:items.filter(i=>i.atribuido===ME.id).length}</span>
            </button>
          ))}
        </div>
        <div className="row" style={{gap:6}}>
          {COLLEAGUES.slice(0,4).map(c => (
            <Avatar key={c.id} initials={c.initials} size="sm" color={c.color}/>
          ))}
          <span style={{fontSize:12, color:'var(--text-3)', marginLeft:4}}>+3 colaboradores</span>
        </div>
      </div>

      <div className="kanban">
        {TAREFA_ESTADOS.map(col => (
          <div key={col.id}
            className={`kanban-col ${dragOver === col.id ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
            onDragLeave={() => setDragOver(d => d === col.id ? null : d)}
            onDrop={() => onDropCol(col.id)}>
            <div className="kanban-head">
              <div className="row" style={{gap:8, alignItems:'center'}}>
                <span className="col-dot" style={{background: col.color}}/>
                <span className="col-title">{col.label}</span>
                <span className="col-count">{countByState(col.id)}</span>
              </div>
              <button className="icon-btn sm" onClick={() => setShowForm(true)} title="Adicionar"><I.plus size={13}/></button>
            </div>
            <div className="kanban-body">
              {visible.filter(i => i.estado === col.id).map(t => {
                const person = personFor(t.atribuido);
                const done = (t.checklist||[]).filter(c=>c.done).length;
                const total = (t.checklist||[]).length;
                const prioTone = t.prioridade === 'alta' ? 'red' : t.prioridade === 'media' ? 'amber' : 'green';
                const due = new Date(t.due);
                const today = new Date(2026, 3, 19);
                const overdue = due < today && t.estado !== 'done';
                const dueToday = due.toDateString() === today.toDateString();
                return (
                  <div key={t.id}
                    className={`kcard ${dragging === t.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={() => onDragStart(t.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => setDetail(t)}>
                    <div className="kcard-top">
                      <span className="kcard-tag">{t.tag}</span>
                      <Pill tone={prioTone}>{t.prioridade}</Pill>
                    </div>
                    <div className="kcard-title">{t.title}</div>
                    {total > 0 && (
                      <div className="kcard-prog">
                        <div className="prog-bar">
                          <div className="prog-fill" style={{width: `${(done/total)*100}%`}}/>
                        </div>
                        <span className="mono">{done}/{total}</span>
                      </div>
                    )}
                    <div className="kcard-foot">
                      <span className={`kcard-due ${overdue?'overdue':dueToday?'today':''}`}>
                        <I.clock size={12}/>
                        {overdue ? 'Atrasada' : dueToday ? 'Hoje' : formatDate(t.due)}
                      </span>
                      <Avatar initials={person.initials} size="sm" color={person.color}/>
                    </div>
                  </div>
                );
              })}
              {countByState(col.id) === 0 && (
                <div className="kcol-empty">Arrasta para cá</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {detail && <TaskDetail item={detail} onClose={() => setDetail(null)} onUpdate={(u) => {
        setItems(arr => arr.map(i => i.id === u.id ? u : i));
        setDetail(u);
      }} personFor={personFor} pushToast={pushToast}/>}

      {showForm && <TaskForm onClose={() => setShowForm(false)} onSubmit={(data) => {
        const id = 'T-' + (350 + items.length - 10);
        setItems([{ ...data, id, checklist: [] }, ...items]);
        setShowForm(false);
        pushToast('Tarefa criada', 'success');
      }}/>}
    </div>
  );
}

function TaskDetail({ item, onClose, onUpdate, personFor, pushToast }){
  const person = personFor(item.atribuido);
  const prioTone = item.prioridade === 'alta' ? 'red' : item.prioridade === 'media' ? 'amber' : 'green';
  const toggleCheck = (i) => {
    const cl = [...(item.checklist||[])];
    cl[i] = { ...cl[i], done: !cl[i].done };
    onUpdate({ ...item, checklist: cl });
  };
  return (
    <Modal open={true} onClose={onClose} size="lg" title={<span className="mono" style={{fontSize:13, color:'var(--text-3)'}}>{item.id}</span>}
      footer={<>
        {item.estado !== 'done' && (
          <button className="btn btn-success" onClick={() => { onUpdate({ ...item, estado: 'done' }); pushToast('Tarefa concluída', 'success'); onClose(); }}>
            <I.check size={14}/> Marcar concluída
          </button>
        )}
        <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
      </>}>
      <div className="detail-layout">
        <div>
          <h2 style={{fontFamily:"'Sora', sans-serif", fontSize:22, fontWeight:700, letterSpacing:'-.02em', margin:'0 0 12px'}}>{item.title}</h2>
          <div className="row" style={{gap:6, marginBottom:16}}>
            <Pill>{TAREFA_ESTADOS.find(e=>e.id===item.estado)?.label}</Pill>
            <Pill tone={prioTone}>prioridade {item.prioridade}</Pill>
            <Pill>{item.tag}</Pill>
          </div>
          <div style={{fontSize:14, lineHeight:1.65, color:'var(--text-2)', marginBottom:18}}>{item.desc}</div>

          {item.checklist && item.checklist.length > 0 && (
            <>
              <div style={{fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600, marginBottom:8}}>Checklist</div>
              <div className="checklist">
                {item.checklist.map((c, i) => (
                  <label key={i} className="check-row">
                    <input type="checkbox" checked={c.done} onChange={() => toggleCheck(i)}/>
                    <span className={c.done ? 'done' : ''}>{c.t}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        <div>
          <div style={{fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600, marginBottom:10}}>Detalhes</div>
          <div style={{display:'flex', flexDirection:'column', gap:10, padding:'14px 16px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', fontSize:13}}>
            <div className="row between"><span className="muted">Atribuído</span>
              <span className="row" style={{gap:8}}><Avatar initials={person.initials} size="sm" color={person.color}/><span style={{fontWeight:600}}>{person.name}</span></span>
            </div>
            <div className="row between"><span className="muted">Prazo</span><span className="tnum">{formatDate(item.due)}</span></div>
            <div className="row between"><span className="muted">Etiqueta</span><span>{item.tag}</span></div>
            <div className="row between"><span className="muted">Estado</span><span style={{textTransform:'capitalize'}}>{TAREFA_ESTADOS.find(e=>e.id===item.estado)?.label}</span></div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function TaskForm({ onClose, onSubmit }){
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [estado, setEstado] = useState('todo');
  const [prioridade, setPrioridade] = useState('media');
  const [atribuido, setAtribuido] = useState(ME.id);
  const [due, setDue] = useState('');
  const [tag, setTag] = useState('Operações');
  const [errors, setErrors] = useState({});

  const submit = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Obrigatório';
    if (!due) errs.due = 'Define um prazo';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSubmit({ title, desc, estado, prioridade, atribuido, due, tag });
  };

  return (
    <Modal open={true} onClose={onClose} title="Nova tarefa"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit}>Criar tarefa</button>
      </>}>
      <div className="form-grid">
        <div className="field full">
          <label className="field-label">Título <span className="req">*</span></label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="ex: Rever proposta comercial"/>
          {errors.title && <div className="field-error">{errors.title}</div>}
        </div>
        <div className="field full">
          <label className="field-label">Descrição</label>
          <textarea className="textarea" rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Contexto, links e critérios de aceitação"/>
        </div>
        <div className="field">
          <label className="field-label">Prazo <span className="req">*</span></label>
          <input type="date" className="input" value={due} onChange={e => setDue(e.target.value)}/>
          {errors.due && <div className="field-error">{errors.due}</div>}
        </div>
        <div className="field">
          <label className="field-label">Atribuído</label>
          <select className="select" value={atribuido} onChange={e => setAtribuido(e.target.value)}>
            <option value={ME.id}>{ME.name} (tu)</option>
            {COLLEAGUES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label">Prioridade</label>
          <div className="row" style={{gap:6}}>
            {[{v:'alta',l:'Alta',c:'var(--red)'},{v:'media',l:'Média',c:'var(--amber)'},{v:'baixa',l:'Baixa',c:'var(--green)'}].map(o => (
              <button key={o.v} className={`btn btn-sm ${prioridade===o.v?'btn-primary':'btn-secondary'}`} onClick={() => setPrioridade(o.v)}>
                <span style={{width:8, height:8, borderRadius:'50%', background:o.c}}/>{o.l}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label">Estado inicial</label>
          <select className="select" value={estado} onChange={e => setEstado(e.target.value)}>
            {TAREFA_ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

window.Tarefas = Tarefas;
