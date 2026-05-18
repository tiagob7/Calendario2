(function() {
  const PAGE_TITLES = {
    dashboard: 'Dashboard',
    calendario: 'Calend&aacute;rio',
    tarefas: 'Tarefas',
    comunicados: 'Comunicados',
    admissoes: 'Admiss&otilde;es',
    reclamacoes: 'Reclama&ccedil;&otilde;es de Horas',
    escalas: 'Escalas',
    clientes: 'Clientes',
    definicoes: 'Defini&ccedil;&otilde;es',
    utilizadores: 'Utilizadores',
    'gerir-calendarios': 'Gerir Calend&aacute;rios',
    auditoria: 'Auditoria',
  };

  const DASHBOARD_LINK = {
    id: 'dashboard',
    label: 'Dashboard',
    href: 'dashboard.html',
    icon: '<rect x="2" y="2" width="5" height="5" rx="1.2"/><rect x="9" y="2" width="5" height="5" rx="1.2"/><rect x="2" y="9" width="5" height="5" rx="1.2"/><rect x="9" y="9" width="5" height="5" rx="1.2"/>',
  };

  function getModules(group) {
    if (typeof window.getAppModules !== 'function') return [];
    return window.getAppModules({ group, forNav: true, profile: window.userProfile });
  }

  function ensureShellStyles() {
    if (document.querySelector('link[href$="styles.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles.css';
    document.head.appendChild(link);
  }
  function initialsFromName(nome) {
    return String(nome || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || '?';
  }

  function navLinkHtml(item, activePage, extraAttrs) {
    const badgeId = item.id === 'tarefas'
      ? 'sidebarBadgeTarefas'
      : item.id === 'comunicados'
        ? 'sidebarBadgeCom'
        : item.id === 'chat'
          ? 'sidebarBadgeChat'
          : '';

    return `
      <a class="app-shell-link${activePage === item.id ? ' active' : ''}" href="${item.href}"${extraAttrs || ''}>
        <span class="app-shell-link-icon">
          <svg aria-hidden="true" viewBox="0 0 16 16">${item.icon || ''}</svg>
        </span>
        <span class="app-shell-link-label">${item.label}</span>
        ${badgeId ? `<span class="app-shell-link-badge" id="${badgeId}" style="display:none"></span>` : ''}
      </a>
    `;
  }

  function getActiveOfficeId() {
    return window.escritorioAtivo ? window.escritorioAtivo() : '';
  }

  function getOfficeListForShell() {
    if (window.getEscritoriosDisponiveisParaUser) {
      const available = window.getEscritoriosDisponiveisParaUser(window.userProfile || null);
      if (available && available.length) return available;
    }
    if (window.getEscritoriosSync) return window.getEscritoriosSync();
    return [];
  }

  function buildOfficeMenuHtml() {
    const isAdmin = window.isAdmin ? window.isAdmin() : false;
    const active = getActiveOfficeId();
    const offices = getOfficeListForShell();
    const items = isAdmin
      ? [{ id: 'todos', nome: 'Todos os escrit&oacute;rios', cor: 'var(--accent)' }].concat(offices)
      : offices;

    if (!items.length) return '';

    return `
      <div class="app-shell-office-menu" id="appShellOfficeMenu">
        ${items.map(item => `
          <button class="app-shell-office-item${active === item.id ? ' active' : ''}" type="button" data-office-id="${item.id}">
            <span class="app-shell-office-dot" style="background:${item.cor || 'var(--accent)'}"></span>
            <span>${item.nome || item.id}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  // SecÃ§Ãµes de navegaÃ§Ã£o â€” define agrupamento visual na sidebar
  const NAV_SECTIONS = [
    { label: null, ids: ['tarefas', 'comunicados', 'chat'] },
    { label: 'Recursos Humanos', ids: ['ferias', 'reclamacoes', 'admissoes', 'despesas'] },
    { label: 'Opera&ccedil;&otilde;es', ids: ['calendario', 'clientes', 'visitas', 'escalas'] },
  ];

  function buildNavSectionsHtml(mainModules, activePage) {
    const allSectionedIds = new Set(NAV_SECTIONS.flatMap(s => s.ids));
    let html = navLinkHtml(DASHBOARD_LINK, activePage);

    NAV_SECTIONS.forEach(sec => {
      const items = sec.ids.map(id => mainModules.find(m => m.id === id)).filter(Boolean);
      if (!items.length) return;
      if (sec.label) html += `<div class="app-shell-group-label">${sec.label}</div>`;
      html += items.map(item => navLinkHtml(item, activePage)).join('');
    });

    // M&oacute;dulos nÃ£o mapeados em nenhuma secÃ§Ã£o (catch-all)
    mainModules.filter(m => !allSectionedIds.has(m.id)).forEach(m => {
      html += navLinkHtml(m, activePage);
    });

    return html;
  }

  function buildSidebarHtml(activePage) {
    const isAdmin = window.isAdmin ? window.isAdmin() : false;
    const mainModules = getModules('main');
    const adminModules = getModules('admin');

    const adminSection = adminModules.length ? `
      <div class="app-shell-sep"></div>
      <div class="app-shell-group-label">Administra&ccedil;&atilde;o</div>
      ${adminModules.map(item => navLinkHtml(item, activePage)).join('')}
    ` : '';

    return `
      <aside class="app-shell-sidebar" id="appShellSidebar">
        <div class="app-shell-logo">
          <div class="app-shell-logo-icon">AT</div>
          <div class="app-shell-logo-copy">
            <div class="app-shell-logo-name">Algartempo</div>
            <div class="app-shell-logo-sub">Hub Interno</div>
          </div>
        </div>
        <div class="app-shell-office-wrap">
          <button class="app-shell-office-btn" type="button" id="appShellOfficeBtn" title="Escrit&oacute;rio activo"${!isAdmin ? ' disabled' : ''}>
            <span class="app-shell-office-dot" id="appShellOfficeDot"></span>
            <span class="app-shell-office-meta">
              <span class="app-shell-office-label">Escrit&oacute;rio</span>
              <span class="app-shell-office-name" id="appShellOfficeName">A carregar&hellip;</span>
            </span>
            ${isAdmin ? '<svg aria-hidden="true" class="app-shell-office-chevron" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4"/></svg>' : ''}
          </button>
          ${isAdmin ? buildOfficeMenuHtml() : ''}
        </div>
        <nav class="app-shell-nav">
          ${buildNavSectionsHtml(mainModules, activePage)}
          ${adminSection}
        </nav>
        <div class="app-shell-footer">
          <div class="app-shell-user" id="appShellUser">
            <div class="app-shell-avatar" id="appShellAvatar">?</div>
            <div class="app-shell-user-copy">
              <div class="app-shell-user-name" id="appShellUserName">-</div>
              <div class="app-shell-user-role" id="appShellUserRole">-</div>
            </div>
            <button class="app-shell-logout-icon" type="button" onclick="window.logout()" title="Sair" aria-label="Sair">
              <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6"/></svg>
            </button>
          </div>
        </div>
      </aside>
      <div class="app-shell-backdrop" id="appShellBackdrop" onclick="window.closeSidebarMenu()"></div>
      <button class="app-shell-toggle" id="appShellToggle" type="button" title="Recolher menu" aria-label="Recolher menu" onclick="window.toggleSidebar()">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
      </button>
    `;
  }

  function buildTopbarHtml(activePage) {
    const title = PAGE_TITLES[activePage] || activePage;
    const isDark = document.documentElement.classList.contains('dark');
    const isDashboard = activePage === 'dashboard';

    const customizeBtn = isDashboard ? `
      <button class="app-shell-icon-btn" type="button"
        onclick="typeof window.openDashboardEditor === 'function' && window.openDashboardEditor()"
        title="Personalizar dashboard">
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M11 2.5l2.5 2.5M3 13l2.2-.4L13 5.2 10.8 3 3.5 10.3 3 13z"/>
          <path d="M9.5 4.5l2 2"/>
        </svg>
      </button>
    ` : '';

    return `
      <header class="app-shell-topbar" id="appShellTopbar">
        <button class="app-shell-modules-btn" type="button" onclick="window.toggleSidebar()">
          <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/></svg>
          M&oacute;dulos
        </button>
        <h1 class="app-shell-topbar-title">${title}</h1>
        <div class="app-shell-search-wrap">
          <div class="app-shell-search">
            <svg aria-hidden="true" viewBox="0 0 16 16"><circle cx="6.5" cy="6.5" r="5"/><path d="M10.5 10.5l3.5 3.5"/></svg>
            <input type="search" placeholder="Pesquisar&hellip;" id="appShellSearchInput" autocomplete="off"
              oninput="window._shellSearchInput && window._shellSearchInput(this.value)"
              onfocus="window.openShellSearch && window.openShellSearch()"
              onkeydown="window._shellSearchKey && window._shellSearchKey(event)">
            <span class="app-shell-search-kbd">&#8984;K</span>
          </div>
          <div class="app-shell-search-panel" id="appShellSearchPanel" role="listbox" aria-label="Resultados de pesquisa">
            <div class="app-shell-search-results" id="appShellSearchResults"></div>
            <div class="app-shell-search-footer">
              <span class="app-shell-search-footer-label">Ir para:</span>
              <a href="tarefas.html">Tarefas</a>
              <a href="comunicados.html">Comunicados</a>
              <a href="reclamacoes.html">Reclama&ccedil;&otilde;es</a>
              <a href="admissoes.html">Admiss&otilde;es</a>
            </div>
          </div>
        </div>
        <span class="app-shell-spacer"></span>
        <div class="app-shell-topbar-actions">
          ${customizeBtn}
          <button class="app-shell-icon-btn" type="button" id="appShellNotifBtn" title="Notifica&ccedil;&otilde;es" aria-label="Notifica&ccedil;&otilde;es">
            <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M8 1a5 5 0 015 5c0 2.5.5 4 1.5 5H1.5C2.5 10 3 8.5 3 6a5 5 0 015-5z"/><path d="M6 13a2 2 0 004 0"/></svg>
            <span class="app-shell-notif-badge" id="appShellNotifBadge"></span>
          </button>
          <button class="app-shell-icon-btn" type="button" id="appShellHelpBtn" title="Ajuda" aria-label="Ajuda">
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="8" cy="8" r="6.5"/>
              <path d="M6 6a2 2 0 113.5 1.4C9 8.1 8 8.5 8 9.5"/>
              <circle cx="8" cy="12" r=".6" fill="currentColor" stroke="none"/>
            </svg>
          </button>
          <button class="app-shell-icon-btn" type="button" onclick="window.toggleDarkMode()" title="Modo escuro">
            <span class="dark-toggle-icon">${isDark ? '☀️' : '🌙'}</span>
          </button>
          <div class="app-shell-topbar-avatar" id="appShellTopbarAvatar" title="">?</div>
        </div>
      </header>
    `;
  }

  function updateShellUser(profile) {
    const isAdmin = window.isAdmin ? window.isAdmin() : false;
    const nome = profile ? (profile.nomeCompleto || profile.nome || profile.email || '') : '';
    const iniciais = initialsFromName(nome);
    const roleText = isAdmin ? 'Administrador' : 'Colaborador';

    const avatar = document.getElementById('appShellAvatar');
    const name = document.getElementById('appShellUserName');
    const role = document.getElementById('appShellUserRole');
    const topbarAvatar = document.getElementById('appShellTopbarAvatar');

    if (avatar) avatar.textContent = iniciais;
    if (name) name.textContent = nome || '-';
    if (role) role.textContent = roleText;
    if (topbarAvatar) {
      topbarAvatar.textContent = iniciais;
      topbarAvatar.title = nome || '';
    }

    const officeNameEl = document.getElementById('appShellOfficeName');
    const officeDotEl = document.getElementById('appShellOfficeDot');
    if (officeNameEl) {
      const officeId = getActiveOfficeId();
      const office = getOfficeListForShell().find(item => item.id === officeId);
      const label = officeId === 'todos' ? 'Todos os escritórios'
        : officeId ? (window.nomeEscritorio ? window.nomeEscritorio(officeId) || officeId : officeId)
        : (nome ? 'Seleccionar…' : 'A carregar…');
      officeNameEl.textContent = label;
      if (officeDotEl) officeDotEl.style.background = officeId === 'todos' ? 'var(--accent)' : (office && office.cor ? office.cor : 'var(--accent)');
    }
  }

  function bindOfficeSwitcher() {
    const wrap = document.querySelector('.app-shell-office-wrap');
    const btn = document.getElementById('appShellOfficeBtn');
    const menu = document.getElementById('appShellOfficeMenu');
    if (!wrap || !btn || !menu) return;

    btn.onclick = function(event) {
      event.stopPropagation();
      const next = !wrap.classList.contains('open');
      wrap.classList.toggle('open', next);
      btn.classList.toggle('open', next);
    };

    menu.querySelectorAll('[data-office-id]').forEach(item => {
      item.addEventListener('click', event => {
        event.stopPropagation();
        const officeId = item.getAttribute('data-office-id') || '';
        wrap.classList.remove('open');
        btn.classList.remove('open');
        if (window.isAdmin && window.isAdmin()) {
          sessionStorage.setItem('filtroEscritorio', officeId || 'todos');
          document.dispatchEvent(new CustomEvent('escritorioChanged', { detail: { escritorio: officeId || 'todos' } }));
          window.location.reload();
        }
      });
    });
  }

  const MOBILE_TAB_IDS = ['dashboard', 'tarefas', 'ferias', 'reclamacoes', 'chat'];

  function ensureMobileTabbar(activePage) {
    const main = document.getElementById('appShellMain');
    if (!main) return;

    const allModules = [DASHBOARD_LINK].concat(getModules('main'));
    const tabs = MOBILE_TAB_IDS
      .map(id => allModules.find(m => m.id === id))
      .filter(Boolean);

    let tabbar = document.getElementById('appShellTabbar');
    if (!tabbar) {
      tabbar = document.createElement('nav');
      tabbar.id = 'appShellTabbar';
      tabbar.className = 'mobile-tabbar';
      tabbar.setAttribute('aria-label', 'Navegação móvel');
      main.appendChild(tabbar);
    }

    tabbar.innerHTML = tabs.map(tab => {
      const badgeId = tab.id === 'tarefas' ? 'tabbarBadgeTarefas'
        : tab.id === 'chat' ? 'tabbarBadgeChat' : '';
      return `
        <a class="mobile-tab-item${activePage === tab.id ? ' active' : ''}" href="${tab.href}" aria-label="${tab.label}">
          <svg viewBox="0 0 16 16" aria-hidden="true">${tab.icon || ''}</svg>
          <span class="mobile-tab-label">${tab.label}</span>
          ${badgeId ? `<span class="mobile-tab-badge" id="${badgeId}" style="display:none"></span>` : ''}
        </a>
      `;
    }).join('');
  }

  function ensureMobileModulesMenu(activePage) {
    const topbar = document.getElementById('appShellTopbar');
    const button = topbar ? topbar.querySelector('.app-shell-modules-btn') : null;
    if (!topbar || !button) return;

    let wrap = document.getElementById('appShellModulesWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'appShellModulesWrap';
      wrap.className = 'app-shell-modules-wrap';
      button.parentNode.insertBefore(wrap, button);
      wrap.appendChild(button);
    }

    const mainModules = [DASHBOARD_LINK].concat(getModules('main'));
    const adminModules = getModules('admin');
    const sections = [
      { label: 'Principal', items: mainModules },
      ...(adminModules.length ? [{ label: 'Gestao', items: adminModules }] : []),
    ];

    let menu = document.getElementById('appShellModulesMenu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'appShellModulesMenu';
      menu.className = 'app-shell-modules-menu';
      wrap.appendChild(menu);
    }

    button.setAttribute('type', 'button');
    button.onclick = function(event) {
      window.toggleMobileModulesMenu(event);
    };

    menu.innerHTML = sections.map(section => `
      <div class="app-shell-modules-group">${section.label}</div>
      ${section.items.map(item => `
        <a class="app-shell-modules-item${activePage === item.id ? ' active' : ''}" href="${item.href}">
          <span class="app-shell-modules-icon">
            <svg viewBox="0 0 16 16">${item.icon || ''}</svg>
          </span>
          <span class="app-shell-modules-copy">
            <span class="app-shell-modules-label">${item.label}</span>
            <span class="app-shell-modules-sub">${activePage === item.id ? 'Pagina atual' : 'Abrir modulo'}</span>
          </span>
        </a>
      `).join('')}
    `).join('');
  }

  function applySidebarState() {
    const sidebar = document.getElementById('appShellSidebar');
    const backdrop = document.getElementById('appShellBackdrop');
    if (!sidebar) return;

    if (window.innerWidth <= 640) {
      sidebar.classList.remove('collapsed');
      sidebar.classList.remove('mobile-open');
      if (backdrop) backdrop.classList.remove('open');
      window.closeMobileModulesMenu();
      return;
    }

    const shouldCollapse = window.innerWidth <= 900 || localStorage.getItem('sidebarCollapsed') === '1';
    sidebar.classList.toggle('collapsed', shouldCollapse);
    sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('open');
  }

  window.closeSidebarMenu = function() {
    const sidebar = document.getElementById('appShellSidebar') || document.getElementById('sidebar');
    const backdrop = document.getElementById('appShellBackdrop') || document.getElementById('sidebarBackdrop');
    if (!sidebar) return;

    sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('open');
  };

  window.closeMobileModulesMenu = function() {
    const wrap = document.getElementById('appShellModulesWrap') || document.getElementById('dashModulesWrap');
    if (wrap) wrap.classList.remove('open');
  };

  window.toggleMobileModulesMenu = function(event) {
    if (event) event.stopPropagation();

    if (window.innerWidth > 640) {
      window.closeMobileModulesMenu();
      return;
    }

    const wrap = document.getElementById('appShellModulesWrap') || document.getElementById('dashModulesWrap');
    if (!wrap) return;
    wrap.classList.toggle('open');
  };

  window.toggleSidebar = function() {
    const sidebar = document.getElementById('appShellSidebar') || document.getElementById('sidebar');
    const backdrop = document.getElementById('appShellBackdrop') || document.getElementById('sidebarBackdrop');
    if (!sidebar) return;

    if (window.innerWidth <= 640) {
      window.toggleMobileModulesMenu();
      return;
    }

    sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
  };

  window.escritorioAtivo = function() {
    if (window.isAdmin && window.isAdmin()) {
      const saved = sessionStorage.getItem('filtroEscritorio') || 'todos';
      if (saved === 'todos') return saved;
      if (window.escritorioExiste && window.escritorioExiste(saved)) return saved;
      return 'todos';
    }

    if (window.userProfile && window.userProfile.escritorio) return window.userProfile.escritorio;
    if (window.getEscritorioDefault) {
      const fallback = window.getEscritorioDefault();
      return fallback ? fallback.id : '';
    }
    return '';
  };

  window.bootProtectedPage = function(options, onReady) {
    const cfg = options || {};

    document.addEventListener('authReady', function handleProtectedPage(event) {
      const detail = event && event.detail ? event.detail : {};
      const profile = detail.profile || window.userProfile || null;
      const isAdmin = window.isAdmin ? window.isAdmin() : false;

      if (cfg.moduleId && typeof window.userCanAccessModule === 'function' && !window.userCanAccessModule(cfg.moduleId, profile)) {
        if (typeof cfg.onDenied === 'function') {
          cfg.onDenied({ user: detail.user || window.currentUser || null, profile, isAdmin, escritorio: '' });
        } else {
          window.location.href = cfg.redirectTo || 'dashboard.html';
        }
        return;
      }

      if (cfg.requireAdmin && !isAdmin) {
        if (typeof cfg.onDenied === 'function') {
          cfg.onDenied({ user: detail.user || window.currentUser || null, profile, isAdmin, escritorio: '' });
        } else {
          window.location.href = cfg.redirectTo || 'dashboard.html';
        }
        return;
      }

      if (cfg.renderNavbar !== false && cfg.activePage) {
        window.renderNavbar(cfg.activePage);
      }

      const context = {
        user: detail.user || window.currentUser || null,
        profile,
        isAdmin,
        escritorio: window.escritorioAtivo(),
        moduleId: cfg.moduleId || cfg.activePage || '',
      };

      if (typeof onReady === 'function') onReady(context);
    }, { once: true });
  };

  window.renderNavbar = function(activePage) {
    const pageEl = document.querySelector('.page');
    if (!pageEl) return;

    window.__appShellActivePage = activePage;
    ensureShellStyles();
    document.body.classList.add('app-shell-active');

    let sidebar = document.getElementById('appShellSidebar');
    let toggle = document.getElementById('appShellToggle');
    let main = document.getElementById('appShellMain');
    let topbar = document.getElementById('appShellTopbar');

    if (!sidebar || !toggle || !main || !topbar) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = buildSidebarHtml(activePage) +
        `<div class="app-shell-main" id="appShellMain">${buildTopbarHtml(activePage)}</div>`;

      sidebar = wrapper.querySelector('#appShellSidebar');
      toggle = wrapper.querySelector('#appShellToggle');
      main = wrapper.querySelector('#appShellMain');
      topbar = wrapper.querySelector('#appShellTopbar');

      document.body.insertBefore(sidebar, document.body.firstChild);
      document.body.insertBefore(toggle, sidebar.nextSibling);
      document.body.insertBefore(main, toggle.nextSibling);
      main.appendChild(pageEl);
    } else {
      sidebar.outerHTML = buildSidebarHtml(activePage).trim();
      toggle.outerHTML = `<button class="app-shell-toggle" id="appShellToggle" type="button" title="Recolher menu" aria-label="Recolher menu" onclick="window.toggleSidebar()"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg></button>`;
      if (topbar) topbar.outerHTML = buildTopbarHtml(activePage).trim();

      sidebar = document.getElementById('appShellSidebar');
      toggle = document.getElementById('appShellToggle');
      main = document.getElementById('appShellMain');
      topbar = document.getElementById('appShellTopbar');

      if (pageEl.parentElement !== main) {
        main.appendChild(pageEl);
      }
    }

    ensureMobileTabbar(activePage);
    ensureMobileModulesMenu(activePage);
    bindOfficeSwitcher();
    applySidebarState();
    updateShellUser(window.userProfile);
  };

  window.addEventListener('resize', applySidebarState);

  // ── Shell search panel ──────────────────────────────────────────

  function ensureSearchBackdrop() {
    let bd = document.getElementById('appShellSearchBackdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'appShellSearchBackdrop';
      bd.className = 'app-shell-search-backdrop';
      bd.onclick = function() { window.closeShellSearch(); };
      document.body.appendChild(bd);
    }
    return bd;
  }

  window.openShellSearch = function() {
    const panel = document.getElementById('appShellSearchPanel');
    const results = document.getElementById('appShellSearchResults');
    if (!panel) return;
    panel.classList.add('open');
    ensureSearchBackdrop().classList.add('open');
    if (results && !results.innerHTML.trim()) {
      results.innerHTML = '<div class="gsearch-empty">Escreve para pesquisar…</div>';
    }
    const input = document.getElementById('appShellSearchInput');
    if (input) { input.focus(); }
  };

  window.closeShellSearch = function() {
    const panel = document.getElementById('appShellSearchPanel');
    if (panel) panel.classList.remove('open');
    const bd = document.getElementById('appShellSearchBackdrop');
    if (bd) bd.classList.remove('open');
  };

  // Input handler — delegates to doGlobalSearch if available (dashboard)
  window._shellSearchInput = function(q) {
    if (typeof window.doGlobalSearch === 'function') {
      window.doGlobalSearch(q);
    }
  };

  // Keyboard: Escape closes, arrow keys navigate results
  window._shellSearchKey = function(event) {
    if (event.key === 'Escape') {
      window.closeShellSearch();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const panel = document.getElementById('appShellSearchPanel');
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll('.gsearch-item'));
      if (!items.length) return;
      const focused = panel.querySelector('.gsearch-item.focused');
      const idx = focused ? items.indexOf(focused) : -1;
      if (focused) focused.classList.remove('focused');
      const next = event.key === 'ArrowDown'
        ? items[Math.min(idx + 1, items.length - 1)]
        : items[Math.max(idx - 1, 0)];
      next.classList.add('focused');
      next.scrollIntoView({ block: 'nearest' });
    }
    if (event.key === 'Enter') {
      const panel = document.getElementById('appShellSearchPanel');
      if (!panel) return;
      const focused = panel.querySelector('.gsearch-item.focused');
      if (focused) { focused.click(); }
    }
  };

  // Ctrl+K / Cmd+K — open search
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      const input = document.getElementById('appShellSearchInput');
      if (input) {
        input.focus();
        window.openShellSearch();
      }
    }
  });

  document.addEventListener('click', event => {
    const wrap = document.getElementById('appShellModulesWrap') || document.getElementById('dashModulesWrap');
    if (wrap && !wrap.contains(event.target)) {
      window.closeMobileModulesMenu();
    }
    const officeWrap = document.querySelector('.app-shell-office-wrap');
    if (officeWrap && !officeWrap.contains(event.target)) {
      officeWrap.classList.remove('open');
      const btn = document.getElementById('appShellOfficeBtn');
      if (btn) btn.classList.remove('open');
    }
  });

  document.addEventListener('authReady', event => {
    const detail = event && event.detail ? event.detail : {};
    const profile = detail.profile || window.userProfile || null;
    updateShellUser(profile);

    // Aplicar tema guardado nas preferÃªncias do utilizador
    const prefs = profile && profile.preferencias && profile.preferencias.dashboard
      ? profile.preferencias.dashboard
      : {};
    const theme = prefs.themePreset || null;
    if (theme && theme !== 'default') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    // Aplicar cor de destaque personalizada
    const customAccent = prefs.customAccent || null;
    const accentVars = ['--accent','--blue','--blue-bg','--blue-border',
      '--sidebar-active-color','--sidebar-active-bg','--sidebar-active-icon-bg'];
    if (customAccent && /^#[0-9a-fA-F]{6}$/.test(customAccent)) {
      const r = parseInt(customAccent.slice(1,3),16);
      const g = parseInt(customAccent.slice(3,5),16);
      const b = parseInt(customAccent.slice(5,7),16);
      document.documentElement.style.setProperty('--accent', customAccent);
      document.documentElement.style.setProperty('--blue', customAccent);
      document.documentElement.style.setProperty('--blue-bg', `rgba(${r},${g},${b},.10)`);
      document.documentElement.style.setProperty('--blue-border', `rgba(${r},${g},${b},.28)`);
      document.documentElement.style.setProperty('--sidebar-active-color', customAccent);
      document.documentElement.style.setProperty('--sidebar-active-bg', `rgba(${r},${g},${b},.18)`);
      document.documentElement.style.setProperty('--sidebar-active-icon-bg', `rgba(${r},${g},${b},.22)`);
    } else {
      accentVars.forEach(v => document.documentElement.style.removeProperty(v));
    }
    // Aplicar fundo personalizado
    const customBg = prefs.customBg || null;
    if (customBg) {
      document.documentElement.style.setProperty('--bg', customBg);
    } else {
      document.documentElement.style.removeProperty('--bg');
    }
  });
})();

