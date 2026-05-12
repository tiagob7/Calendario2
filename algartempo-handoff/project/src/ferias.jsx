// ============================================================
// Férias module — balance + list + calendar + new request
// ============================================================

function Ferias({ pushToast }){
  const [view, setView] = useState('lista'); // lista | calendario
  const [filter, setFilter] = useState('todos'); // todos | pendente | aprovado | rejeitado
  const [showForm, setShowForm] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [items, setItems] = useState(FERIAS_REQUESTS);
  const [month, setMonth] = useState(new Date(2026, 3, 1)); // April 2026

  const counts = useMemo(() => ({
    todos: items.length,
    pendente: items.filter(i => i.estado === 'pendente').length,
    aprovado: items.filter(i => i.estado === 'aprovado').length,
    rejeitado: items.filter(i => i.estado === 'rejeitado').length,
  }), [items]);

  const visible = items.filter(i => filter === 'todos' ? true : i.estado === filter);

  const handleAprovar = (id) => {
    setItems(arr => arr.map(i => i.id === id ? {...i, estado:'aprovado'} : i));
    setDetailItem(null);
    pushToast('Pedido aprovado', 'success');
  };
  const handleRejeitar = (id) => {
    setItems(arr => arr.map(i => i.id === id ? {...i, estado:'rejeitado'} : i));
    setDetailItem(null);
    pushToast('Pedido rejeitado');
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Recursos Humanos</div>
          <h1>Férias &amp; Ausências</h1>
          <p className="lede">Gestão de pedidos de férias, folgas e licenças de toda a equipa.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><I.paper size={15}/> Exportar</button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><I.plus size={15}/> Novo pedido</button>
        </div>
      </div>

      {/* Balance + breakdown */}
      <div className="card" style={{marginBottom:20}}>
        <div className="balance-card">
          <div className="balance-ring">
            <svg viewBox="0 0 120 120">
              <circle className="track" cx="60" cy="60" r="54"/>
              <circle className="fill" cx="60" cy="60" r="54"
                strokeDasharray={`${2*Math.PI*54}`}
                strokeDashoffset={`${2*Math.PI*54 * (1 - (FERIAS_BALANCE.used+FERIAS_BALANCE.pending)/FERIAS_BALANCE.total)}`}/>
            </svg>
            <div className="ring-inner">
              <div className="ring-value">{FERIAS_BALANCE.left}</div>
              <div className="ring-label">dias restantes</div>
            </div>
          </div>
          <div className="balance-meta">
            <div className="balance-title">O meu saldo de {FERIAS_BALANCE.year}</div>
            <div className="balance-sub">Com base no teu contrato de 22 dias úteis anuais.</div>
            <div className="balance-breakdown">
              <div className="bd-item">
                <div className="bd-val">{FERIAS_BALANCE.total}</div>
                <div className="bd-lbl">Total anual</div>
              </div>
              <div className="bd-item">
                <div className="bd-val used">{FERIAS_BALANCE.used}</div>
                <div className="bd-lbl">Já gozados</div>
              </div>
              <div className="bd-item">
                <div className="bd-val pending">{FERIAS_BALANCE.pending}</div>
                <div className="bd-lbl">Aguardando</div>
              </div>
              <div className="bd-item">
                <div className="bd-val left">{FERIAS_BALANCE.left}</div>
                <div className="bd-lbl">Disponíveis</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + view */}
      <div className="row between" style={{marginBottom:16, alignItems:'center'}}>
        <div className="tabs" style={{margin:0, border:'none'}}>
          {[
            {v:'todos', l:'Todos'},
            {v:'pendente', l:'Pendentes'},
            {v:'aprovado', l:'Aprovados'},
            {v:'rejeitado', l:'Rejeitados'},
          ].map(t => (
            <button key={t.v}
              className={`tab-btn ${filter === t.v ? 'active' : ''}`}
              onClick={() => setFilter(t.v)}>
              {t.l} <span className="tab-count">{counts[t.v]}</span>
            </button>
          ))}
        </div>
        <Segmented value={view} onChange={setView} options={[
          {value:'lista',      label:'Lista',      icon:<I.menu size={13}/>},
          {value:'calendario', label:'Calendário', icon:<I.calendar size={13}/>},
        ]}/>
      </div>

      {view === 'lista' && (
        <div className="card">
          <div className="req-list">
            {visible.length === 0 ? (
              <EmptyState icon={<I.beach size={22}/>} title="Sem pedidos neste filtro" sub="Experimenta outro filtro acima."/>
            ) : visible.map(r => {
              const pillTone = r.estado === 'pendente' ? 'amber' : r.estado === 'aprovado' ? 'green' : r.estado === 'rejeitado' ? 'red' : 'neutral';
              const tipoIcon = r.tipo === 'ferias' ? <I.beach size={14}/> : r.tipo === 'folga' ? <I.clock size={14}/> : <I.paper size={14}/>;
              return (
                <div key={r.id} className={`req-row ${r.estado}`} onClick={() => setDetailItem(r)}>
                  <Avatar initials={(r.user||'?').split(' ').map(s=>s[0]).slice(0,2).join('')} size="sm"/>
                  <div className="req-main">
                    <div className="req-title">{r.user}</div>
                    <div className="req-sub">
                      <span style={{display:'inline-flex', alignItems:'center', gap:4}}>{tipoIcon}{r.tipo}</span>
                      <span>{r.motivo || '—'}</span>
                    </div>
                  </div>
                  <div className="req-dates tnum">{dateRange(r.inicio, r.fim)}</div>
                  <div className="req-days">
                    <Pill tone={pillTone}>{r.estado}</Pill>
                    <div style={{fontSize:11, color:'var(--text-4)', marginTop:2}}>{r.dias} dia{r.dias>1?'s':''}</div>
                  </div>
                  <div className="req-actions">
                    {r.estado === 'pendente' && (
                      <>
                        <button className="btn btn-sm btn-success" onClick={(e) => { e.stopPropagation(); handleAprovar(r.id); }}><I.check size={13}/></button>
                        <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleRejeitar(r.id); }}><I.close size={13}/></button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'calendario' && <FeriasCalendar month={month} setMonth={setMonth} items={items}/>}

      {showForm && <NovoPedidoForm onClose={() => setShowForm(false)} onSubmit={(data) => {
        const id = 'fr' + (items.length + 1);
        setItems([{ ...data, id, userId: ME.id, user: ME.name, estado: 'pendente', submetido: '2026-04-19' }, ...items]);
        setShowForm(false);
        pushToast('Pedido submetido com sucesso', 'success');
      }}/>}

      {detailItem && <DetalhePedido item={detailItem} onClose={() => setDetailItem(null)} onAprovar={handleAprovar} onRejeitar={handleRejeitar}/>}
    </div>
  );
}

function FeriasCalendar({ month, setMonth, items }){
  const y = month.getFullYear(), m = month.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m+1, 0);
  const startWD = (first.getDay() + 6) % 7; // Monday-first
  const days = [];
  // prev month tail
  const prevLast = new Date(y, m, 0).getDate();
  for (let i = startWD - 1; i >= 0; i--) days.push({ d: prevLast - i, other: true, date: new Date(y, m-1, prevLast - i) });
  for (let d = 1; d <= last.getDate(); d++) days.push({ d, date: new Date(y, m, d) });
  while (days.length % 7 !== 0) days.push({ d: days.length - startWD - last.getDate() + 1, other: true, date: new Date(y, m+1, days.length - startWD - last.getDate() + 1) });

  const monthLabel = month.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  const today = new Date(2026, 3, 19);

  const eventsFor = (date) => {
    return items.filter(i => {
      if (i.estado === 'rejeitado') return false;
      const a = new Date(i.inicio), b = new Date(i.fim);
      return date >= a && date <= b;
    });
  };

  const toneFor = (it) => {
    if (it.estado === 'pendente') return 'amber';
    if (it.tipo === 'folga') return 'purple';
    return 'green';
  };

  return (
    <div className="card">
      <div className="cal-nav">
        <button className="icon-btn" onClick={() => setMonth(new Date(y, m-1, 1))}><I.chevronLeft size={14}/></button>
        <h3>{monthLabel}</h3>
        <button className="icon-btn" onClick={() => setMonth(new Date(y, m+1, 1))}><I.chevronRight size={14}/></button>
        <button className="btn btn-secondary btn-sm" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Hoje</button>
      </div>
      <div className="cal-grid">
        {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(w => <div key={w} className="cal-weekday">{w}</div>)}
        {days.map((d, i) => {
          const isWeekend = (i % 7 >= 5);
          const isToday = !d.other && d.date.getDate() === today.getDate() && d.date.getMonth() === today.getMonth() && d.date.getFullYear() === today.getFullYear();
          const evs = d.other ? [] : eventsFor(d.date);
          return (
            <div key={i} className={`cal-day ${d.other?'other':''} ${isWeekend?'weekend':''} ${isToday?'today':''}`}>
              <div className="cal-day-num">{d.d}</div>
              {evs.slice(0,3).map(e => (
                <div key={e.id} className={`cal-event e-${toneFor(e)}`} title={`${e.user} · ${e.tipo}`}>
                  {e.user.split(' ')[0]} · {e.tipo}
                </div>
              ))}
              {evs.length > 3 && <div style={{fontSize:10, color:'var(--text-4)'}}>+{evs.length-3} mais</div>}
            </div>
          );
        })}
      </div>
      <div className="cal-legend">
        <span className="legend-item"><span className="legend-sw" style={{background:'var(--green)'}}/>Férias aprovadas</span>
        <span className="legend-item"><span className="legend-sw" style={{background:'var(--amber)'}}/>Pendentes</span>
        <span className="legend-item"><span className="legend-sw" style={{background:'var(--purple)'}}/>Folgas / Licenças</span>
      </div>
    </div>
  );
}

function NovoPedidoForm({ onClose, onSubmit }){
  const [tipo, setTipo] = useState('ferias');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errors, setErrors] = useState({});

  const dias = inicio && fim && inicio <= fim ? daysBetween(inicio, fim) : 0;

  const submit = () => {
    const errs = {};
    if (!inicio) errs.inicio = 'Obrigatório';
    if (!fim) errs.fim = 'Obrigatório';
    if (inicio && fim && inicio > fim) errs.fim = 'Fim deve ser após início';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSubmit({ tipo, inicio, fim, dias, motivo });
  };

  return (
    <Modal open={true} onClose={onClose} title="Novo pedido de ausência"
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit}>Submeter pedido</button>
      </>}>
      <div className="form-grid">
        <div className="field full">
          <label className="field-label">Tipo</label>
          <div className="row" style={{gap:6}}>
            {[
              {v:'ferias', l:'Férias',  i:<I.beach size={14}/>},
              {v:'folga',  l:'Folga',   i:<I.clock size={14}/>},
              {v:'licenca',l:'Licença', i:<I.paper size={14}/>},
            ].map(o => (
              <button key={o.v} className={`btn btn-sm ${tipo===o.v?'btn-primary':'btn-secondary'}`} onClick={()=>setTipo(o.v)}>
                {o.i}{o.l}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label">Data início <span className="req">*</span></label>
          <input type="date" className="input" value={inicio} onChange={e => setInicio(e.target.value)}/>
          {errors.inicio && <div className="field-error">{errors.inicio}</div>}
        </div>
        <div className="field">
          <label className="field-label">Data fim <span className="req">*</span></label>
          <input type="date" className="input" value={fim} onChange={e => setFim(e.target.value)}/>
          {errors.fim && <div className="field-error">{errors.fim}</div>}
        </div>
        {dias > 0 && (
          <div className="full">
            <div className="row" style={{padding:'10px 12px', background:'var(--accent-soft)', borderRadius:'var(--r-md)', color:'var(--accent-ink)', fontSize:13, border:'1px solid var(--accent-border)'}}>
              <I.calendar size={15}/>
              <span><strong>{dias}</strong> dia{dias>1?'s':''} solicitados · saldo restante após aprovação: <strong>{FERIAS_BALANCE.left - dias}</strong></span>
            </div>
          </div>
        )}
        <div className="field full">
          <label className="field-label">Motivo / observações</label>
          <textarea className="textarea" rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Opcional — contexto para o gestor"/>
        </div>
      </div>
    </Modal>
  );
}

function DetalhePedido({ item, onClose, onAprovar, onRejeitar }){
  const pillTone = item.estado === 'pendente' ? 'amber' : item.estado === 'aprovado' ? 'green' : 'red';
  return (
    <Modal open={true} onClose={onClose} title={`Pedido de ${item.user}`}
      footer={item.estado === 'pendente' ? <>
        <button className="btn btn-danger" onClick={() => onRejeitar(item.id)}><I.close size={14}/> Rejeitar</button>
        <button className="btn btn-success" onClick={() => onAprovar(item.id)}><I.check size={14}/> Aprovar</button>
      </> : <button className="btn btn-secondary" onClick={onClose}>Fechar</button>}>
      <div style={{display:'flex', flexDirection:'column', gap:16}}>
        <div className="row" style={{gap:8}}>
          <Pill tone={pillTone}>{item.estado}</Pill>
          <Pill>{item.tipo}</Pill>
          <span className="muted" style={{fontSize:12}}>Submetido a {item.submetido}</span>
        </div>
        <div style={{padding:'14px 16px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--r-md)'}}>
          <div style={{fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600, marginBottom:6}}>Período solicitado</div>
          <div style={{fontFamily:"'Sora', sans-serif", fontSize:20, fontWeight:700, letterSpacing:'-.02em'}}>
            {dateRange(item.inicio, item.fim)}
          </div>
          <div style={{fontSize:12, color:'var(--text-3)', marginTop:2}}>{item.dias} dia{item.dias>1?'s':''} úteis</div>
        </div>
        {item.motivo && (
          <div>
            <div className="field-label" style={{marginBottom:6}}>Motivo</div>
            <div style={{fontSize:13, lineHeight:1.6, color:'var(--text-2)'}}>{item.motivo}</div>
          </div>
        )}
        {item.obs && (
          <div style={{padding:'10px 12px', background:'var(--red-soft)', border:'1px solid var(--red-border)', borderRadius:'var(--r-md)', fontSize:12.5, color:'var(--red-ink)'}}>
            <strong>Observações do gestor:</strong> {item.obs}
          </div>
        )}
      </div>
    </Modal>
  );
}

window.Ferias = Ferias;
