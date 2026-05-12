// ============================================================
// App shell — sidebar, topbar, mobile tabbar + drawer
// ============================================================

function Shell({ page, onNavigate, children, urgentCount=0 }){
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    document.documentElement.dataset.sidebar === 'collapsed'
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [officeOpen, setOfficeOpen] = useState(false);
  const [activeOffice, setActiveOffice] = useState(OFFICES[0].id);
  const [mobileMenu, setMobileMenu] = useState(false);
  const officeRef = useRef(null);
  useOutsideClick(officeRef, () => setOfficeOpen(false));

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    document.documentElement.dataset.sidebar = next ? 'collapsed' : 'expanded';
    const t = JSON.parse(localStorage.getItem('algartempo_tweaks')||'{}');
    t.sidebar = next ? 'collapsed' : 'expanded';
    localStorage.setItem('algartempo_tweaks', JSON.stringify(t));
  };

  const navItems = [
    { id: 'dashboard',   label: 'Dashboard',    icon: <I.dashboard/>,   section: 'main' },
    { id: 'tarefas',     label: 'Tarefas',      icon: <I.tasks/>,       badge: 23, section: 'main' },
    { id: 'comunicados', label: 'Comunicados',  icon: <I.megaphone/>,   badge: 3,  section: 'main' },
    { id: 'chat',        label: 'Chat',         icon: <I.chat/>,        section: 'main' },

    { id: 'ferias',      label: 'Férias',       icon: <I.beach/>,       badge: 4, urgent: true, section: 'rh' },
    { id: 'reclamacoes', label: 'Reclamações',  icon: <I.flag/>,        badge: 7,  section: 'rh' },
    { id: 'admissoes',   label: 'Admissões & Cessações', icon: <I.users/>, badge: 6, section: 'rh' },
    { id: 'despesas',    label: 'Despesas',     icon: <I.receipt/>,     section: 'rh' },

    { id: 'calendario',  label: 'Calendário',   icon: <I.calendar/>,    section: 'op' },
    { id: 'clientes',    label: 'Clientes',     icon: <I.building/>,    section: 'op' },
    { id: 'visitas',     label: 'Visitas',      icon: <I.pin/>,         section: 'op' },

    { id: 'utilizadores',label: 'Utilizadores', icon: <I.users/>,       section: 'admin' },
    { id: 'definicoes',  label: 'Definições',   icon: <I.settings/>,    section: 'admin' },
  ];

  const activeOfficeObj = OFFICES.find(o => o.id === activeOffice);
  const tabItems = navItems.filter(n => ['dashboard','tarefas','ferias','reclamacoes','chat'].includes(n.id));
  const renderNav = (items) => {
    const sections = [
      { id: 'main', label: null },
      { id: 'rh',   label: 'Recursos humanos' },
      { id: 'op',   label: 'Operações' },
      { id: 'admin',label: 'Administração' },
    ];
    return sections.map(sec => {
      const its = items.filter(i => i.section === sec.id);
      if (!its.length) return null;
      return (
        <div className="nav-section" key={sec.id}>
          {sec.label && <div className="nav-heading">{sec.label}</div>}
          {its.map(n => (
            <button key={n.id}
              className={`nav-item ${page === n.id ? 'active' : ''}`}
              onClick={() => { onNavigate(n.id); setDrawerOpen(false); }}>
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
              {n.badge && <span className={`nav-badge ${n.urgent ? 'urgent' : ''}`}>{n.badge}</span>}
            </button>
          ))}
        </div>
      );
    });
  };

  const sidebarContent = (
    <>
      <div className="sidebar-brand">
        <div className="brand-mark">AT</div>
        <div>
          <div className="brand-name">Algartempo</div>
          <div className="brand-sub">Hub interno</div>
        </div>
      </div>

      <div className="office-switcher" ref={officeRef}>
        <button className={`office-btn ${officeOpen ? 'open' : ''}`} onClick={() => setOfficeOpen(o => !o)}>
          <span className="office-dot" style={{background: activeOfficeObj.color}}/>
          <div className="office-meta">
            <div className="office-label">Escritório</div>
            <div className="office-name">{activeOfficeObj.city}</div>
          </div>
          <I.chevronDown size={14} className="office-chev"/>
        </button>
        {officeOpen && (
          <div className="office-menu">
            {OFFICES.map(o => (
              <button key={o.id} className={`office-menu-item ${activeOffice === o.id ? 'active' : ''}`}
                onClick={() => { setActiveOffice(o.id); setOfficeOpen(false); }}>
                <span className="office-dot" style={{background: o.color}}/>
                <span>{o.name}</span>
                {activeOffice === o.id && <I.check size={14}/>}
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="sidebar-nav">{renderNav(navItems)}</nav>

      <div className="sidebar-foot">
        <div className="user-pill">
          <Avatar name={ME.name} initials={ME.initials} color="linear-gradient(135deg,#f472b6,#8b5cf6)"/>
          <div className="user-meta">
            <div className="user-name">{ME.name}</div>
            <div className="user-role">{ME.role}</div>
          </div>
          <button className="icon-btn sm" title="Terminar sessão"><I.logout size={14}/></button>
        </div>
      </div>
    </>
  );

  return (
    <div className="app">
      <aside className="sidebar" style={{position:'relative'}}>
        {sidebarContent}
        <button className="collapse-toggle" onClick={toggleSidebar} title={sidebarCollapsed ? 'Expandir' : 'Colapsar'}>
          <I.chevronLeft size={12}/>
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setDrawerOpen(true)} style={{display:'none'}}>
            <I.menu size={18}/>
          </button>
          <div className="topbar-title">
            <span>{navItems.find(n => n.id === page)?.label || 'Hub'}</span>
          </div>
          <div className="global-search">
            <I.search size={15} className="search-icon"/>
            <input placeholder="Pesquisar tarefas, reclamações, colaboradores…"/>
            <span className="kbd">⌘K</span>
          </div>
          <div className="topbar-right">
            <button className="topbar-btn" title="Notificações">
              <I.bell size={16}/>
              {urgentCount > 0 && <span className="pill-dot"/>}
            </button>
            <button className="topbar-btn" title="Ajuda"><I.help size={16}/></button>
            <div style={{width:1, background:'var(--border)', height:22, margin:'0 4px'}}/>
            <Avatar name={ME.name} initials={ME.initials} size="sm" color="linear-gradient(135deg,#f472b6,#8b5cf6)"/>
          </div>
        </header>

        <div className="content">{children}</div>

        <nav className="tabbar">
          {tabItems.map(t => (
            <button key={t.id}
              className={`tab-item ${page === t.id ? 'active' : ''}`}
              onClick={() => onNavigate(t.id)}>
              <span className="tab-ico">{t.icon}</span>
              <span>{t.label}</span>
              {t.badge && <span className="tab-badge">{t.badge}</span>}
            </button>
          ))}
        </nav>
      </main>

      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}/>
          <aside className="drawer">{sidebarContent}</aside>
        </>
      )}
    </div>
  );
}

window.Shell = Shell;
