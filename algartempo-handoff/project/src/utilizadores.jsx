// ============================================================
// Utilizadores — gestão de contas, perfis e permissões
// ============================================================

const UTI_USERS = [
  { id: 'u1', nome: 'Sofia Marques',   email: 'sofia.marques@algartempo.pt',   officeId: 'lisboa', role: 'admin',        estado: 'ativo',     last: 'agora',       perfil: 'Administração',     initials: 'SM', color: 'linear-gradient(135deg,#f472b6,#8b5cf6)' },
  { id: 'u2', nome: 'João Pereira',    email: 'joao.pereira@algartempo.pt',    officeId: 'lisboa', role: 'colaborador',  estado: 'ativo',     last: 'há 12 min',   perfil: 'Operações',         initials: 'JP', color: '#f59e0b' },
  { id: 'u3', nome: 'Inês Rocha',      email: 'ines.rocha@algartempo.pt',      officeId: 'porto',  role: 'admin',        estado: 'ativo',     last: 'há 38 min',   perfil: 'Administração',     initials: 'IR', color: '#10b981' },
  { id: 'u4', nome: 'Miguel Santos',   email: 'miguel.santos@algartempo.pt',   officeId: 'faro',   role: 'colaborador',  estado: 'ativo',     last: 'há 2 h',      perfil: 'Operações',         initials: 'MS', color: '#8b5cf6' },
  { id: 'u5', nome: 'Beatriz Costa',   email: 'beatriz.costa@algartempo.pt',   officeId: 'lisboa', role: 'colaborador',  estado: 'ativo',     last: 'ontem',       perfil: 'Recursos Humanos',  initials: 'BC', color: '#ec4899' },
  { id: 'u6', nome: 'Rui Fernandes',   email: 'rui.fernandes@algartempo.pt',   officeId: 'braga',  role: 'colaborador',  estado: 'ativo',     last: 'ontem',       perfil: 'Operações',         initials: 'RF', color: '#06b6d4' },
  { id: 'u7', nome: 'Ana Lima',        email: 'ana.lima@algartempo.pt',        officeId: 'porto',  role: 'colaborador',  estado: 'ativo',     last: 'há 4 h',      perfil: 'Recursos Humanos',  initials: 'AL', color: '#ef4444' },
  { id: 'u8', nome: 'Pedro Soares',    email: 'pedro.soares@algartempo.pt',    officeId: 'lisboa', role: 'colaborador',  estado: 'inativo',   last: 'há 12 dias',  perfil: 'Operações',         initials: 'PS', color: '#64748b' },
  { id: 'u9', nome: 'Carolina Dias',   email: 'carolina.dias@algartempo.pt',   officeId: 'porto',  role: 'colaborador',  estado: 'pendente',  last: '—',           perfil: 'Marketing',         initials: 'CD', color: '#a855f7' },
  { id: 'u10', nome: 'Luísa Antunes',  email: 'luisa.antunes@algartempo.pt',   officeId: 'faro',   role: 'colaborador',  estado: 'ativo',     last: 'há 30 min',   perfil: 'Operações',         initials: 'LA', color: '#14b8a6' },
];

function Utilizadores({ pushToast }){
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('all');     // all | admin | colaborador
  const [office, setOffice]       = useState('all');
  const [estado, setEstado]       = useState('all');       // all | ativo | inativo | pendente
  const [selected, setSelected]   = useState(null);
  const [modalNew, setModalNew]   = useState(false);
  const [users, setUsers]         = useState(UTI_USERS);

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (office !== 'all' && u.officeId !== office) return false;
      if (estado !== 'all' && u.estado !== estado) return false;
      if (search){
        const s = search.toLowerCase();
        if (!u.nome.toLowerCase().includes(s) && !u.email.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, office, estado]);

  const counts = useMemo(() => ({
    all:        users.length,
    admin:      users.filter(u => u.role === 'admin').length,
    colaborador:users.filter(u => u.role === 'colaborador').length,
  }), [users]);

  const officeOf = (id) => OFFICES.find(o => o.id === id);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Administração</div>
          <h1>Utilizadores</h1>
          <p className="lede">Gerir contas, perfis e permissões de todos os colaboradores. Apenas administradores têm acesso a esta área.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><I.layers size={14}/>Exportar CSV</button>
          <button className="btn btn-primary" onClick={() => setModalNew(true)}><I.plus size={14}/>Novo utilizador</button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="stat-grid" style={{marginBottom: 18}}>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.users size={14}/></span>Total de contas</div>
          <div className="stat-val">{counts.all}</div>
          <div className="stat-delta flat"><span className="mono">+1</span> esta semana</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.settings size={14}/></span>Administradores</div>
          <div className="stat-val">{counts.admin}</div>
          <div className="stat-delta flat">de {counts.all} colaboradores</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.check2 size={14}/></span>Ativos hoje</div>
          <div className="stat-val">{users.filter(u => u.last !== '—' && !u.last.includes('dias')).length}</div>
          <div className="stat-delta up"><I.arrowUp size={11}/><span className="mono">12%</span> vs semana</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl"><span className="stat-ico"><I.alert size={14}/></span>Pendentes</div>
          <div className="stat-val">{users.filter(u => u.estado === 'pendente').length}</div>
          <div className="stat-delta flat">a aguardar 1º login</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{marginBottom: 14}}>
        <div className="card-body" style={{display:'flex', alignItems:'center', gap: 12, flexWrap:'wrap', padding:'12px 16px'}}>
          <Segmented value={roleFilter} onChange={setRoleFilter} options={[
            { value: 'all',         label: `Todos · ${counts.all}` },
            { value: 'admin',       label: `Admins · ${counts.admin}` },
            { value: 'colaborador', label: `Colaboradores · ${counts.colaborador}` },
          ]}/>

          <div style={{flex:1, position:'relative', minWidth: 200}}>
            <I.search size={14} style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-4)'}}/>
            <input
              className="input"
              style={{paddingLeft: 32}}
              placeholder="Pesquisar nome ou email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select className="select" style={{maxWidth: 170}} value={office} onChange={e => setOffice(e.target.value)}>
            <option value="all">Todos os escritórios</option>
            {OFFICES.map(o => <option key={o.id} value={o.id}>{o.city}</option>)}
          </select>

          <select className="select" style={{maxWidth: 150}} value={estado} onChange={e => setEstado(e.target.value)}>
            <option value="all">Todos os estados</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
            <option value="pendente">Pendentes</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<I.users size={22}/>}
              title="Sem resultados"
              sub="Ajusta os filtros ou a pesquisa para encontrar o colaborador."
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width: '32%'}}>Utilizador</th>
                  <th>Escritório</th>
                  <th>Perfil</th>
                  <th>Estado</th>
                  <th>Último acesso</th>
                  <th style={{textAlign:'right', paddingRight:18}}>Permissões</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const off = officeOf(u.officeId);
                  return (
                    <tr key={u.id} onClick={() => setSelected(u)} className={selected?.id === u.id ? 'selected' : ''}>
                      <td>
                        <div style={{display:'flex', alignItems:'center', gap:12}}>
                          <Avatar name={u.nome} initials={u.initials} color={u.color}/>
                          <div style={{minWidth:0}}>
                            <div style={{fontWeight:600, fontSize:13.5}}>{u.nome}</div>
                            <div style={{fontSize:12, color:'var(--text-3)'}}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="pill" style={{background: 'transparent', border: '1px solid var(--border)'}}>
                          <span className="pill-dot" style={{background: off?.color}}/>
                          {off?.city || u.officeId}
                        </span>
                      </td>
                      <td>
                        {u.role === 'admin'
                          ? <Pill tone="accent" dot="var(--accent)">Admin</Pill>
                          : <Pill tone="neutral">Colaborador</Pill>}
                        <div style={{fontSize:11, color:'var(--text-4)', marginTop:3}}>{u.perfil}</div>
                      </td>
                      <td>
                        {u.estado === 'ativo'    && <Pill tone="green" dot="var(--green)">Ativo</Pill>}
                        {u.estado === 'inativo'  && <Pill tone="red"   dot="var(--red)">Inativo</Pill>}
                        {u.estado === 'pendente' && <Pill tone="amber" dot="var(--amber)">Pendente</Pill>}
                      </td>
                      <td>
                        <span className="mono" style={{fontSize:12, color:'var(--text-3)'}}>{u.last}</span>
                      </td>
                      <td style={{textAlign:'right', paddingRight:14}}>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setSelected(u); }}>
                          <I.sliders size={13}/>Gerir
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
          <span style={{fontSize:12, color:'var(--text-3)'}}>{filtered.length} de {users.length} colaboradores</span>
          <span style={{fontSize:11, color:'var(--text-4)'}}>Sincronizado · há instantes</span>
        </div>
      </div>

      {/* Drawer detalhe */}
      {selected && (
        <UserDrawer
          user={selected}
          office={officeOf(selected.officeId)}
          onClose={() => setSelected(null)}
          onSave={(patch) => {
            setUsers(us => us.map(x => x.id === selected.id ? {...x, ...patch} : x));
            setSelected(s => ({...s, ...patch}));
            pushToast?.('Alterações guardadas', 'success');
          }}
          onRemove={() => {
            setUsers(us => us.filter(x => x.id !== selected.id));
            pushToast?.('Conta removida', 'success');
            setSelected(null);
          }}
        />
      )}

      {/* Modal Novo */}
      <Modal
        open={modalNew}
        onClose={() => setModalNew(false)}
        title="Novo utilizador"
        size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModalNew(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { pushToast?.('Conta criada', 'success'); setModalNew(false); }}>
            <I.check size={14}/>Criar conta
          </button>
        </>}
      >
        <p style={{fontSize:13, color:'var(--text-3)', marginBottom:18}}>
          A conta fica ativa de imediato e o colaborador recebe um email com o convite para definir a password.
        </p>
        <div className="form-grid">
          <div className="field">
            <label className="field-label">Nome <span className="req">*</span></label>
            <input className="input" placeholder="Nome próprio"/>
          </div>
          <div className="field">
            <label className="field-label">Apelido <span className="req">*</span></label>
            <input className="input" placeholder="Último apelido"/>
          </div>
          <div className="field full">
            <label className="field-label">Email <span className="req">*</span></label>
            <input className="input" placeholder="nome.apelido@algartempo.pt" type="email"/>
            <span className="field-hint">Será também o nome de utilizador para login.</span>
          </div>
          <div className="field">
            <label className="field-label">Escritório <span className="req">*</span></label>
            <select className="select" defaultValue="">
              <option value="" disabled>Selecionar…</option>
              {OFFICES.map(o => <option key={o.id} value={o.id}>{o.city}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Perfil de permissão</label>
            <select className="select">
              <option>Operações</option>
              <option>Recursos Humanos</option>
              <option>Marketing</option>
              <option>Administração</option>
            </select>
          </div>
          <div className="field full">
            <label className="field-label">Tipo de conta</label>
            <Segmented value="colaborador" onChange={() => {}} options={[
              { value: 'colaborador', label: 'Colaborador' },
              { value: 'admin',       label: 'Administrador' },
            ]}/>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Drawer detalhe ──────────────────────────────────────────
function UserDrawer({ user, office, onClose, onSave, onRemove }){
  const [tab, setTab] = useState('info');
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="side-drawer" onClick={e => e.stopPropagation()}>
        <div className="side-drawer-head">
          <div style={{display:'flex', gap:14, alignItems:'center', minWidth:0}}>
            <Avatar name={user.nome} initials={user.initials} size="lg" color={user.color}/>
            <div style={{minWidth:0}}>
              <div style={{fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:700, letterSpacing:'-.015em'}}>{user.nome}</div>
              <div style={{fontSize:13, color:'var(--text-3)'}}>{user.email}</div>
              <div style={{display:'flex', gap:6, marginTop:8}}>
                {user.role === 'admin'
                  ? <Pill tone="accent" dot="var(--accent)">Admin</Pill>
                  : <Pill tone="neutral">Colaborador</Pill>}
                {user.estado === 'ativo'    && <Pill tone="green" dot="var(--green)">Ativo</Pill>}
                {user.estado === 'inativo'  && <Pill tone="red"   dot="var(--red)">Inativo</Pill>}
                {user.estado === 'pendente' && <Pill tone="amber" dot="var(--amber)">Pendente</Pill>}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><I.close size={16}/></button>
        </div>

        <div className="side-drawer-actions">
          <button className="btn btn-secondary btn-sm"><I.mail size={13}/>Reenviar convite</button>
          <button className="btn btn-secondary btn-sm"><I.settings size={13}/>Reset password</button>
          <div className="spacer"/>
          {user.estado === 'ativo'
            ? <button className="btn btn-ghost btn-sm" onClick={() => onSave({ estado: 'inativo' })}>Suspender</button>
            : <button className="btn btn-ghost btn-sm" onClick={() => onSave({ estado: 'ativo'   })}>Reativar</button>}
          <button className="btn btn-danger btn-sm" onClick={() => setConfirm(true)}><I.trash size={13}/>Remover</button>
        </div>

        <div className="tabs" style={{padding:'0 20px', marginBottom: 0}}>
          <button className={`tab-btn ${tab==='info'?'active':''}`}     onClick={() => setTab('info')}>Informação</button>
          <button className={`tab-btn ${tab==='perms'?'active':''}`}    onClick={() => setTab('perms')}>Permissões</button>
          <button className={`tab-btn ${tab==='atividade'?'active':''}`}onClick={() => setTab('atividade')}>Atividade</button>
        </div>

        <div className="side-drawer-body">
          {tab === 'info' && <UserInfoTab user={user} office={office} onSave={onSave}/>}
          {tab === 'perms' && <UserPermsTab user={user} onSave={onSave}/>}
          {tab === 'atividade' && <UserActivityTab user={user}/>}
        </div>

        {confirm && (
          <div className="modal-overlay" onClick={() => setConfirm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-head"><h2>Remover conta?</h2></div>
              <div className="modal-body">
                <div className="alert-card red" style={{marginBottom: 14}}>
                  <I.alert size={18}/>
                  <div>
                    <div style={{fontWeight:600}}>Esta ação é definitiva</div>
                    <div style={{fontSize:12.5, marginTop:2}}>
                      A conta de <b>{user.nome}</b> será desativada e todos os acessos revogados imediatamente.
                      O histórico de atividade é preservado para fins de auditoria.
                    </div>
                  </div>
                </div>
                <p style={{fontSize:13, color:'var(--text-3)'}}>Para confirmar, escreve <span className="mono" style={{color:'var(--text)'}}>REMOVER</span> abaixo.</p>
                <input className="input" placeholder="REMOVER" style={{marginTop:8}}/>
              </div>
              <div className="modal-foot">
                <button className="btn btn-secondary" onClick={() => setConfirm(false)}>Cancelar</button>
                <button className="btn btn-danger" onClick={() => { onRemove(); setConfirm(false); }}><I.trash size={13}/>Remover conta</button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function UserInfoTab({ user, office, onSave }){
  return (
    <>
      <div className="cli-info-block">
        <div className="cli-info-label">Identificação</div>
        <div className="cli-info-grid">
          <div>
            <span className="muted">Nome completo</span>
            <span>{user.nome}</span>
          </div>
          <div>
            <span className="muted">Email</span>
            <span>{user.email}</span>
          </div>
          <div>
            <span className="muted">Escritório</span>
            <span style={{display:'flex', alignItems:'center', gap:6}}>
              <span className="pill-dot" style={{background: office?.color}}/>
              {office?.name || user.officeId}
            </span>
          </div>
          <div>
            <span className="muted">Perfil de permissão</span>
            <span>{user.perfil}</span>
          </div>
          <div>
            <span className="muted">Tipo de conta</span>
            <span>{user.role === 'admin' ? 'Administrador' : 'Colaborador'}</span>
          </div>
          <div>
            <span className="muted">Último acesso</span>
            <span className="mono" style={{fontSize:13}}>{user.last}</span>
          </div>
        </div>
      </div>

      <div className="cli-info-block">
        <div className="cli-info-label">Editar dados</div>
        <div className="form-grid">
          <div className="field">
            <label className="field-label">Nome</label>
            <input className="input" defaultValue={user.nome}/>
          </div>
          <div className="field">
            <label className="field-label">Email</label>
            <input className="input" defaultValue={user.email}/>
          </div>
          <div className="field">
            <label className="field-label">Escritório</label>
            <select className="select" defaultValue={user.officeId}>
              {OFFICES.map(o => <option key={o.id} value={o.id}>{o.city}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Perfil</label>
            <select className="select" defaultValue={user.perfil}>
              <option>Administração</option>
              <option>Operações</option>
              <option>Recursos Humanos</option>
              <option>Marketing</option>
            </select>
          </div>
        </div>
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:14}}>
          <button className="btn btn-primary btn-sm" onClick={() => onSave({})}>
            <I.check size={13}/>Guardar
          </button>
        </div>
      </div>
    </>
  );
}

function UserPermsTab({ user, onSave }){
  const groups = [
    {
      label: 'Administração',
      perms: [
        { id: 'admin.users',     label: 'Gerir utilizadores',         desc: 'Criar, editar e remover contas',           on: user.role === 'admin' },
        { id: 'admin.offices',   label: 'Gerir escritórios',          desc: 'Configurar localizações da empresa',       on: user.role === 'admin' },
        { id: 'admin.audit',     label: 'Ver auditoria completa',     desc: 'Histórico de todas as alterações',         on: user.role === 'admin' },
      ],
    },
    {
      label: 'Recursos Humanos',
      perms: [
        { id: 'rh.ferias.aprovar', label: 'Aprovar pedidos de férias', desc: 'Validar pedidos da equipa',                on: true },
        { id: 'rh.admissoes',      label: 'Gerir admissões',           desc: 'Processo de onboarding',                    on: user.perfil === 'Recursos Humanos' || user.role === 'admin' },
        { id: 'rh.despesas',       label: 'Validar despesas',          desc: 'Aprovar relatórios de despesas',            on: user.role === 'admin' },
      ],
    },
    {
      label: 'Operações',
      perms: [
        { id: 'op.tarefas.todos',  label: 'Ver tarefas de todos',      desc: 'Caso contrário, só atribuídas a si',       on: true },
        { id: 'op.clientes',       label: 'Editar clientes',           desc: 'Criar e atualizar fichas de cliente',      on: user.perfil === 'Operações' || user.role === 'admin' },
        { id: 'op.reclamacoes',    label: 'Responder reclamações',     desc: 'Gestão do livro de reclamações',           on: true },
      ],
    },
  ];

  return (
    <>
      <div className="alert-card" style={{background:'var(--accent-soft)', border:'1px solid var(--accent-border)', color:'var(--accent-ink)', marginBottom:18}}>
        <I.shield2 size={18}/>
        <div>
          <div style={{fontWeight:600, color:'var(--accent-ink)'}}>Permissões herdadas do perfil</div>
          <div style={{fontSize:12.5, marginTop:2}}>
            Este utilizador tem o perfil <b>{user.perfil}</b>. Pode sobrepor permissões individualmente abaixo.
          </div>
        </div>
      </div>

      {groups.map(g => (
        <div key={g.label} className="cli-info-block">
          <div className="cli-info-label">{g.label}</div>
          <div style={{display:'flex', flexDirection:'column', border:'1px solid var(--border)', borderRadius:'var(--r-md)', overflow:'hidden'}}>
            {g.perms.map((p, i) => (
              <div key={p.id} style={{display:'flex', alignItems:'center', gap:14, padding:'12px 14px', borderBottom: i < g.perms.length-1 ? '1px solid var(--divider)' : 'none'}}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:600}}>{p.label}</div>
                  <div style={{fontSize:12, color:'var(--text-3)'}}>{p.desc}</div>
                </div>
                <Toggle defaultChecked={p.on}/>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
        <button className="btn btn-secondary btn-sm">Repor padrão do perfil</button>
        <button className="btn btn-primary btn-sm" onClick={() => onSave({})}><I.check size={13}/>Guardar permissões</button>
      </div>
    </>
  );
}

function UserActivityTab({ user }){
  const events = [
    { tone: 'green', icon: <I.check size={12}/>, title: 'Aprovou férias', sub: 'Pedido #FR-2026-014 · João Pereira',  meta: 'há 2 h' },
    { tone: 'blue',  icon: <I.edit size={12}/>,  title: 'Atualizou perfil', sub: 'Alterou escritório de Lisboa para Porto',meta: 'ontem · 16:42' },
    { tone: 'blue',  icon: <I.shield2 size={12}/>, title: 'Iniciou sessão',  sub: 'IP 188.250.x.x · Chrome / macOS',     meta: 'ontem · 09:08' },
    { tone: 'green', icon: <I.plus size={12}/>,  title: 'Criou tarefa',     sub: '#T-345 — Relatório SEPA',              meta: 'há 2 dias' },
    { tone: 'red',   icon: <I.alert size={12}/>, title: 'Tentativa de login falhada', sub: 'Password incorreta · 2 tentativas', meta: 'há 4 dias' },
  ];
  return (
    <>
      <div className="cli-info-label">Histórico recente</div>
      <ul className="timeline" style={{marginTop:12}}>
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
      <div style={{textAlign:'center', marginTop:16}}>
        <button className="btn btn-ghost btn-sm">Ver auditoria completa <I.chevronRight size={12}/></button>
      </div>
    </>
  );
}

// Toggle switch
function Toggle({ defaultChecked }){
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <button
      onClick={() => setOn(o => !o)}
      style={{
        width: 36, height: 20,
        borderRadius: 999,
        background: on ? 'var(--accent)' : 'var(--border-strong)',
        position: 'relative',
        transition: 'background 160ms',
        flexShrink: 0,
      }}
      aria-pressed={on}
    >
      <span style={{
        position:'absolute',
        top:2,
        left: on ? 18 : 2,
        width:16, height:16,
        background:'white', borderRadius:'50%',
        boxShadow:'0 1px 3px rgba(0,0,0,.2)',
        transition:'left 160ms',
      }}/>
    </button>
  );
}

window.Utilizadores = Utilizadores;
