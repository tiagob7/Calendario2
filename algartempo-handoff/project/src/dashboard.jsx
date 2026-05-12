// ============================================================
// Dashboard page
// ============================================================

function Dashboard({ onNavigate, pushToast }){
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Bom dia' : hour < 19 ? 'Boa tarde' : 'Boa noite';

  const quickActions = [
    { id:'nova-tarefa',   title:'Nova tarefa',      sub:'Atribuir a alguém',     icon:<I.tasks/>,    tone:'accent' },
    { id:'novo-comu',     title:'Comunicado',       sub:'Para um escritório',    icon:<I.megaphone/>,tone:'purple' },
    { id:'pedir-ferias',  title:'Pedir férias',     sub:'Criar novo pedido',     icon:<I.beach/>,    tone:'green',  nav:'ferias' },
    { id:'nova-recl',     title:'Registar reclamação', sub:'Receber novo caso',  icon:<I.flag/>,     tone:'amber',  nav:'reclamacoes' },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Hoje · Domingo, 19 Abril</div>
          <h1>{greet}, {ME.name.split(' ')[0]}</h1>
          <p className="lede">4 itens precisam da tua atenção e 7 reclamações estão em curso nos escritórios.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><I.paper size={15}/> Exportar relatório</button>
          <button className="btn btn-primary"><I.plus size={15}/> Criar</button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="stat-grid">
        {KPIS.map(k => {
          const up = k.delta > 0, dn = k.delta < 0;
          const color = k.key === 'reclamacoes' ? '#d97706' : k.key === 'ferias' ? '#7c3aed' : 'var(--accent)';
          return (
            <div key={k.key} className="stat-tile" style={{cursor:'pointer'}}
                 onClick={() => k.key !== 'admissoes' && onNavigate(k.key === 'tarefas' ? 'tarefas' : k.key)}>
              <div className="stat-lbl">
                <span className="stat-ico">
                  {k.key==='tarefas'&&<I.tasks size={14}/>}
                  {k.key==='reclamacoes'&&<I.flag size={14}/>}
                  {k.key==='ferias'&&<I.beach size={14}/>}
                  {k.key==='admissoes'&&<I.users size={14}/>}
                </span>
                {k.label}
              </div>
              <div className="stat-val">{k.value}</div>
              <div className={`stat-delta ${up?'up':dn?'dn':'flat'}`}>
                {up && <I.arrowUp size={12}/>}{dn && <I.arrowDown size={12}/>}
                <span className="mono">{k.delta>0?'+':''}{k.delta}</span>
                <span style={{color:'var(--text-4)', fontWeight:500}}> · {k.deltaLabel}</span>
              </div>
              <Sparkline data={k.trend} color={color}/>
            </div>
          );
        })}
      </div>

      {/* Urgent banner */}
      <div className="hero-card" style={{marginTop:20}}>
        <div className="hero-text">
          <div className="hero-greeting" style={{fontSize:16, display:'flex', alignItems:'center', gap:8}}>
            <I.alert size={18} style={{color:'var(--amber)'}}/> 4 itens precisam da tua atenção
          </div>
          <div className="hero-sub">
            Reclamações abertas há mais de 72h, pedidos de férias pendentes e uma admissão com prazo a expirar amanhã.
          </div>
        </div>
        <div className="hero-actions">
          <button className="btn btn-secondary" onClick={() => onNavigate('reclamacoes')}>Ver reclamações</button>
          <button className="btn btn-primary" onClick={() => onNavigate('ferias')}>Aprovar férias</button>
        </div>
      </div>

      <div className="dash-grid">
        <div>
          {/* Quick actions */}
          <div className="dash-section-head">
            <h2>Ações rápidas</h2>
          </div>
          <div className="quick-grid">
            {quickActions.map(a => {
              const bg = {accent:'var(--accent-soft)', purple:'var(--purple-soft)', green:'var(--green-soft)', amber:'var(--amber-soft)'}[a.tone];
              const fg = {accent:'var(--accent)', purple:'var(--purple)', green:'var(--green)', amber:'var(--amber)'}[a.tone];
              return (
                <button key={a.id} className="quick-card"
                  onClick={() => a.nav ? onNavigate(a.nav) : pushToast(`${a.title} — em desenvolvimento`)}>
                  <div className="quick-ico" style={{background:bg, color:fg}}>{a.icon}</div>
                  <div className="quick-meta">
                    <div className="quick-title">{a.title}</div>
                    <div className="quick-sub">{a.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Activity */}
          <div className="dash-section-head">
            <h2>Atividade recente</h2>
            <button className="see-all">Ver tudo <I.chevronRight size={13}/></button>
          </div>
          <div className="card">
            <div className="card-body tight" style={{paddingTop:4, paddingBottom:4}}>
              <div className="activity-list">
                {ACTIVITY.map(a => (
                  <div key={a.id} className="activity-row">
                    <Avatar initials={a.actorInitials} size="sm"/>
                    <div className="activity-body">
                      <div className="activity-top">
                        <span className="activity-actor">{a.actor}</span>
                        <span className="activity-verb">{a.verb}</span>
                        <span className="activity-target">{a.target}</span>
                        <span className="activity-time">{a.time}</span>
                      </div>
                      <div className="activity-desc">{a.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          {/* Focus */}
          <div className="dash-section-head">
            <h2>A precisar de atenção</h2>
          </div>
          <div className="card">
            <div className="focus-list">
              {FOCUS.map(f => (
                <button key={f.id} className="focus-row" onClick={() => onNavigate(f.module)} style={{width:'100%', textAlign:'left'}}>
                  <span className={`focus-marker ${f.marker}`}/>
                  <div className="focus-main">
                    <div className="focus-title">{f.title}</div>
                    <div className="focus-meta">{f.meta}</div>
                  </div>
                  <I.chevronRight size={14} style={{color:'var(--text-4)'}}/>
                </button>
              ))}
            </div>
          </div>

          <div className="dash-section-head">
            <h2>Esta semana</h2>
          </div>
          <div className="card">
            <div className="card-body">
              <div style={{display:'flex', flexDirection:'column', gap:12}}>
                <div className="row between">
                  <div className="row" style={{gap:10}}>
                    <Avatar initials="JP" size="sm" color="#f59e0b"/>
                    <div>
                      <div style={{fontSize:13, fontWeight:600}}>João Pereira</div>
                      <div style={{fontSize:11, color:'var(--text-3)'}}>Férias · 12–19 Mai</div>
                    </div>
                  </div>
                  <Pill tone="amber">Pendente</Pill>
                </div>
                <div className="row between">
                  <div className="row" style={{gap:10}}>
                    <Avatar initials="IR" size="sm" color="#10b981"/>
                    <div>
                      <div style={{fontSize:13, fontWeight:600}}>Inês Rocha</div>
                      <div style={{fontSize:11, color:'var(--text-3)'}}>Folga · 24 Abr</div>
                    </div>
                  </div>
                  <Pill tone="green">Aprovado</Pill>
                </div>
                <div className="row between">
                  <div className="row" style={{gap:10}}>
                    <Avatar initials="RF" size="sm" color="#06b6d4"/>
                    <div>
                      <div style={{fontSize:13, fontWeight:600}}>Rui Fernandes</div>
                      <div style={{fontSize:11, color:'var(--text-3)'}}>Folga · 30 Abr</div>
                    </div>
                  </div>
                  <Pill tone="amber">Pendente</Pill>
                </div>
                <div style={{height:1, background:'var(--divider)'}}/>
                <button className="btn btn-ghost" style={{justifyContent:'center'}} onClick={() => onNavigate('ferias')}>
                  Ver calendário completo <I.arrowRight size={14}/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
