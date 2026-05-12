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
    if (document.getElementById('appShellStyle')) return;

    const style = document.createElement('style');
    style.id = 'appShellStyle';
    style.textContent = `
      body.app-shell-active {
        min-height: 100vh;
        background: var(--bg);
      }

      /* ── Sidebar ── */
      .app-shell-sidebar {
        position: fixed;
        top: 0; left: 0; bottom: 0;
        z-index: 300;
        width: 248px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: var(--surface, #fff);
        border-right: 1px solid var(--border, #e2e2e8);
        transition: width var(--d, .2s) var(--ease, ease);
      }

      .app-shell-sidebar.collapsed { width: 64px; }

      /* Logo */
      .app-shell-logo {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 62px;
        padding: 18px 14px;
        border-bottom: 1px solid var(--border, #e2e2e8);
        overflow: hidden;
      }

      .app-shell-logo-icon {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--accent);
        color: var(--on-accent, #fff);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0;
        font-family: 'Poppins', 'Inter', sans-serif;
        flex-shrink: 0;
        box-shadow: var(--shadow-sm);
      }

      .app-shell-logo-name {
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        font-weight: 800;
        color: var(--text, #1a1a22);
        line-height: 1.1;
        white-space: nowrap;
      }

      .app-shell-logo-sub {
        font-size: 10px;
        color: var(--muted, #8888a0);
        text-transform: uppercase;
        letter-spacing: .08em;
        white-space: nowrap;
      }

      /* Office switcher */
      .app-shell-office-wrap {
        position: relative;
        padding: 10px 10px 8px;
        border-bottom: 1px solid var(--border, #e2e2e8);
        overflow: visible;
      }

      .app-shell-office-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 7px 10px;
        border-radius: 8px;
        border: 1px solid var(--border, #e2e2e8);
        background: var(--surface2, #f7f7f9);
        color: var(--text-2, #4a4a68);
        font-size: 12px;
        font-weight: 500;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
        text-align: left;
        transition: all .18s ease;
        white-space: nowrap;
        overflow: hidden;
      }

      .app-shell-office-btn:hover,
      .app-shell-office-btn.open {
        border-color: var(--accent, #2563eb);
        color: var(--accent, #2563eb);
        background: var(--accent-soft, var(--surface2));
      }

      .app-shell-office-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--accent);
        flex-shrink: 0;
      }

      .app-shell-office-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .app-shell-office-chevron {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
      }

      .app-shell-office-menu {
        position: absolute;
        top: calc(100% - 2px);
        left: 10px;
        right: 10px;
        z-index: 380;
        display: none;
        padding: 6px;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--surface);
        box-shadow: var(--shadow-lg);
      }

      .app-shell-office-wrap.open .app-shell-office-menu {
        display: grid;
        gap: 2px;
      }

      .app-shell-office-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 8px;
        border-radius: 7px;
        color: var(--text-2);
        font-size: 12px;
        text-align: left;
      }

      .app-shell-office-item:hover {
        background: var(--surface-hover);
        color: var(--text);
      }

      .app-shell-office-item.active {
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 700;
      }

      /* Collapsed hides */
      .app-shell-sidebar.collapsed .app-shell-logo-copy,
      .app-shell-sidebar.collapsed .app-shell-group-label,
      .app-shell-sidebar.collapsed .app-shell-link-label,
      .app-shell-sidebar.collapsed .app-shell-user-copy,
      .app-shell-sidebar.collapsed .app-shell-link-badge,
      .app-shell-sidebar.collapsed .app-shell-office-name,
      .app-shell-sidebar.collapsed .app-shell-office-chevron,
      .app-shell-sidebar.collapsed .app-shell-office-menu {
        opacity: 0;
        width: 0;
        overflow: hidden;
      }

      .app-shell-sidebar.collapsed .app-shell-office-btn {
        justify-content: center;
        padding: 7px;
      }

      .app-shell-sidebar.collapsed .app-shell-office-wrap {
        padding: 8px 10px;
      }

      /* Nav */
      .app-shell-nav {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 8px 8px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .app-shell-nav::-webkit-scrollbar { width: 4px; }
      .app-shell-nav::-webkit-scrollbar-thumb {
        background: var(--border, #e2e2e8);
        border-radius: 99px;
      }

      .app-shell-group-label {
        padding: 10px 8px 4px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .1em;
        color: var(--muted, #8888a0);
        white-space: nowrap;
      }

      .app-shell-link {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px;
        border-radius: 8px;
        color: var(--text-2, #4a4a68);
        text-decoration: none;
        transition: all .18s ease;
        white-space: nowrap;
      }

      .app-shell-link:hover {
        background: var(--surface2, #f7f7f9);
        color: var(--text, #1a1a22);
      }

      :root {
        --sidebar-active-bg: var(--accent-soft);
        --sidebar-active-color: var(--accent);
        --sidebar-active-icon-bg: color-mix(in srgb, var(--accent) 12%, transparent);
      }
      html[data-theme="forest"] {
        --sidebar-active-bg: rgba(20,184,166,.10);
        --sidebar-active-color: #0d9488;
        --sidebar-active-icon-bg: rgba(20,184,166,.12);
      }
      html[data-theme="sunset"] {
        --sidebar-active-bg: rgba(249,115,22,.10);
        --sidebar-active-color: #ea580c;
        --sidebar-active-icon-bg: rgba(249,115,22,.12);
      }
      html[data-theme="violet"] {
        --sidebar-active-bg: rgba(124,58,237,.10);
        --sidebar-active-color: #7c3aed;
        --sidebar-active-icon-bg: rgba(124,58,237,.12);
      }

      .app-shell-link.active {
        background: var(--sidebar-active-bg);
        color: var(--sidebar-active-color);
        font-weight: 600;
      }

      .app-shell-link-icon {
        width: 32px;
        height: 32px;
        border-radius: 7px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .app-shell-link.active .app-shell-link-icon {
        background: var(--sidebar-active-icon-bg);
      }

      .app-shell-link-icon svg {
        width: 16px;
        height: 16px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
      }

      .app-shell-link-label {
        flex: 1;
        font-size: 13px;
        font-weight: 500;
      }

      .app-shell-link-badge {
        min-width: 18px;
        padding: 1px 6px;
        border-radius: 99px;
        background: var(--red);
        color: var(--on-accent, #fff);
        font-size: 10px;
        font-weight: 700;
        line-height: 16px;
        text-align: center;
      }

      .app-shell-sidebar.collapsed .app-shell-link { justify-content: center; }

      .app-shell-sep {
        margin: 6px 0;
        border: 0;
        border-top: 1px solid var(--border, #e2e2e8);
      }

      /* Footer */
      .app-shell-footer {
        padding: 8px;
        border-top: 1px solid var(--border, #e2e2e8);
      }

      .app-shell-user {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: 8px;
        overflow: hidden;
        transition: all .18s ease;
        cursor: default;
      }

      .app-shell-user:hover { background: var(--surface2, #f7f7f9); }

      .app-shell-avatar {
        width: 30px;
        height: 30px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--accent);
        color: var(--on-accent, #fff);
        font-size: 11px;
        font-weight: 700;
        flex-shrink: 0;
      }

      .app-shell-user-copy { flex: 1; min-width: 0; }

      .app-shell-user-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--text, #1a1a22);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .app-shell-user-role {
        font-size: 10px;
        color: var(--muted, #8888a0);
        white-space: nowrap;
      }

      .app-shell-logout-icon {
        width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        border: 1px solid var(--border, #e2e2e8);
        background: transparent;
        color: var(--muted, #8888a0);
        cursor: pointer;
        flex-shrink: 0;
        transition: all .18s ease;
      }

      .app-shell-logout-icon:hover {
        border-color: var(--red);
        color: var(--red);
        background: var(--red-bg);
      }

      .app-shell-logout-icon svg {
        width: 13px;
        height: 13px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
      }

      /* Toggle button */
      .app-shell-toggle {
        position: fixed;
        top: 18px;
        left: 235px;
        z-index: 350;
        width: 26px;
        height: 26px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--border, #e2e2e8);
        border-radius: 999px;
        background: var(--surface, #fff);
        color: var(--muted, #8888a0);
        box-shadow: var(--shadow-md);
        cursor: pointer;
        transition: left .28s ease, transform .18s ease, border-color .18s ease, color .18s ease, background .18s ease;
      }

      .app-shell-toggle:hover {
        border-color: var(--accent, #2563eb);
        color: var(--accent, #2563eb);
      }

      .app-shell-toggle svg {
        width: 12px;
        height: 12px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.4;
        transition: transform .28s ease;
      }

      .app-shell-sidebar.collapsed + .app-shell-toggle { left: 51px; }
      .app-shell-sidebar.collapsed + .app-shell-toggle svg { transform: rotate(180deg); }

      /* Main content */
      .app-shell-main {
        min-width: 0;
        margin-left: 248px;
        transition: margin-left var(--d, .2s) var(--ease, ease);
      }

      .app-shell-sidebar.collapsed + .app-shell-toggle + .app-shell-main { margin-left: 64px; }
      .app-shell-main > .page { min-width: 0; }

      /* ── Topbar ── */
      .app-shell-topbar {
        position: sticky;
        top: 0;
        z-index: 200;
        min-height: 56px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 24px;
        background: var(--surface, #fff);
        border-bottom: 1px solid var(--border, #e2e2e8);
        box-shadow: var(--shadow-xs);
      }

      .app-shell-topbar-title {
        margin: 0;
        font-family: 'Poppins', sans-serif;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0;
        color: var(--text, #1a1a22);
        white-space: nowrap;
      }

      /* Global search */
      .app-shell-search-wrap {
        flex: 1;
        max-width: 360px;
        margin: 0 auto;
      }

      .app-shell-search {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 34px;
        padding: 0 10px;
        border-radius: 8px;
        border: 1px solid var(--border, #e2e2e8);
        background: var(--surface2, #f7f7f9);
        width: 100%;
        transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        cursor: text;
      }

      .app-shell-search:focus-within {
        border-color: var(--accent, #2563eb);
        box-shadow: 0 0 0 3px var(--accent-soft);
        background: var(--surface, #fff);
      }

      .app-shell-search svg {
        width: 13px;
        height: 13px;
        fill: none;
        stroke: var(--muted, #8888a0);
        stroke-width: 1.8;
        flex-shrink: 0;
      }

      .app-shell-search input {
        flex: 1;
        border: none;
        background: transparent;
        outline: none;
        font-size: 12.5px;
        font-family: 'Inter', sans-serif;
        color: var(--text, #1a1a22);
        min-width: 0;
      }

      .app-shell-search input::placeholder { color: var(--muted, #8888a0); }

      .app-shell-search-kbd {
        font-size: 10px;
        padding: 1px 5px;
        border-radius: 4px;
        border: 1px solid var(--border, #e2e2e8);
        background: var(--surface, #fff);
        color: var(--muted, #8888a0);
        white-space: nowrap;
        flex-shrink: 0;
        font-family: 'Inter', sans-serif;
      }

      .app-shell-spacer { flex: 1; }

      /* Topbar actions */
      .app-shell-topbar-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }

      .app-shell-icon-btn {
        position: relative;
        width: 34px;
        height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        border: 1px solid var(--border, #e2e2e8);
        background: var(--surface2, #f7f7f9);
        color: var(--muted, #8888a0);
        cursor: pointer;
        transition: all .18s ease;
        flex-shrink: 0;
      }

      .app-shell-icon-btn:hover {
        border-color: var(--accent, #2563eb);
        color: var(--accent, #2563eb);
      }

      .app-shell-icon-btn svg {
        width: 15px;
        height: 15px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
      }

      .app-shell-icon-btn .dark-toggle-icon {
        font-size: 14px;
        line-height: 1;
      }

      /* Notification badge */
      .app-shell-notif-badge {
        position: absolute;
        top: 5px;
        right: 5px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--red);
        border: 1.5px solid var(--surface, #fff);
        display: none;
      }

      .app-shell-notif-badge.show { display: block; }

      /* Topbar user avatar */
      .app-shell-topbar-avatar {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--accent);
        color: var(--on-accent, #fff);
        font-size: 11px;
        font-weight: 700;
        flex-shrink: 0;
        border: 2px solid var(--border, #e2e2e8);
        cursor: pointer;
        transition: border-color .18s ease, box-shadow .18s ease;
        font-family: 'Inter', sans-serif;
      }

      .app-shell-topbar-avatar:hover {
        border-color: var(--accent, #2563eb);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }

      /* Legacy topbar elements (hidden — functionality moved to sidebar/new buttons) */
      .app-shell-dark,
      .app-shell-logout,
      .app-shell-topbar-user { display: none !important; }

      /* Mobile modules button */
      .app-shell-modules-btn {
        display: none;
        align-items: center;
        gap: 6px;
        padding: 7px 11px;
        border-radius: 999px;
        border: 1px solid var(--border, #e2e2e8);
        background: var(--surface2, #f7f7f9);
        color: var(--muted, #8888a0);
        font-family: 'Inter', sans-serif;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .07em;
        cursor: pointer;
        transition: all .18s ease;
      }

      .app-shell-modules-btn:hover {
        border-color: var(--accent, #2563eb);
        color: var(--accent, #2563eb);
      }

      .app-shell-modules-btn svg {
        width: 12px;
        height: 12px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
      }

      .app-shell-modules-wrap {
        position: relative;
        display: none;
      }

      .app-shell-modules-menu {
        position: absolute;
        top: calc(100% + 10px);
        left: 0;
        width: min(320px, calc(100vw - 28px));
        max-height: min(70vh, 520px);
        overflow-y: auto;
        padding: 10px;
        border: 1px solid var(--border, #e2e2e8);
        border-radius: 18px;
        background: var(--surface, #fff);
        box-shadow: 0 18px 40px rgba(15,23,42,.16);
        opacity: 0;
        pointer-events: none;
        transform: translateY(-6px);
        transition: opacity .18s ease, transform .18s ease;
      }

      .app-shell-modules-wrap.open .app-shell-modules-menu {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
      }

      .app-shell-modules-group {
        padding: 8px 10px 4px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .08em;
        color: var(--muted, #8888a0);
      }

      .app-shell-modules-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 12px;
        color: var(--text, #1a1a22);
        text-decoration: none;
        transition: all .18s ease;
      }

      .app-shell-modules-item:hover { background: var(--surface2, #f7f7f9); }
      .app-shell-modules-item.active {
        background: var(--blue-bg, #eff6ff);
        color: var(--blue, #2563eb);
      }

      .app-shell-modules-icon {
        width: 34px;
        height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        background: var(--surface2, #f7f7f9);
        color: inherit;
        flex-shrink: 0;
      }

      .app-shell-modules-icon svg {
        width: 16px;
        height: 16px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.9;
      }

      .app-shell-modules-copy { min-width: 0; flex: 1; }
      .app-shell-modules-label { display: block; font-size: 13px; font-weight: 700; }
      .app-shell-modules-sub { display: block; margin-top: 2px; font-size: 11px; color: var(--muted, #8888a0); }

      /* Backdrop */
      .app-shell-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15,23,42,.4);
        opacity: 0;
        pointer-events: none;
        transition: opacity .22s ease;
        z-index: 280;
      }

      .app-shell-backdrop.open {
        opacity: 1;
        pointer-events: auto;
      }

      /* Responsive */
      @media (max-width: 900px) {
        .app-shell-sidebar { width: 64px; }

        .app-shell-sidebar .app-shell-logo-copy,
        .app-shell-sidebar .app-shell-group-label,
        .app-shell-sidebar .app-shell-link-label,
        .app-shell-sidebar .app-shell-user-copy,
        .app-shell-sidebar .app-shell-link-badge,
        .app-shell-sidebar .app-shell-office-name,
        .app-shell-sidebar .app-shell-office-chevron {
          opacity: 0;
          width: 0;
          overflow: hidden;
        }

        .app-shell-sidebar .app-shell-office-btn {
          justify-content: center;
          padding: 7px;
        }

        .app-shell-sidebar .app-shell-link { justify-content: center; }
        .app-shell-toggle { left: 51px; }
        .app-shell-main { margin-left: 64px; }

        .app-shell-topbar {
          padding-left: 18px;
          padding-right: 18px;
        }

        .app-shell-search-wrap { max-width: 260px; }
        .app-shell-search-kbd { display: none; }
      }

      @media (max-width: 640px) {
        .app-shell-topbar {
          gap: 8px;
          padding-left: 14px;
          padding-right: 14px;
        }

        .app-shell-modules-wrap { display: inline-block; }
        .app-shell-modules-btn { display: inline-flex; }

        .app-shell-search-wrap { display: none; }

        .app-shell-sidebar,
        .app-shell-toggle,
        .app-shell-backdrop { display: none !important; }

        .app-shell-main,
        .app-shell-sidebar.collapsed + .app-shell-toggle + .app-shell-main {
          margin-left: 0;
        }
      }
    `;

    document.head.appendChild(style);
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

  // Secções de navegação — define agrupamento visual na sidebar
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

    // Módulos não mapeados em nenhuma secção (catch-all)
    mainModules.filter(m => !allSectionedIds.has(m.id)).forEach(m => {
      html += navLinkHtml(m, activePage);
    });

    return html;
  }

  function buildSidebarHtml(activePage) {
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
          <button class="app-shell-office-btn" type="button" id="appShellOfficeBtn" title="Escritório activo">
            <span class="app-shell-office-dot" id="appShellOfficeDot"></span>
            <span class="app-shell-office-name" id="appShellOfficeName">A carregar…</span>
            <svg aria-hidden="true" class="app-shell-office-chevron" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4"/></svg>
          </button>
          ${buildOfficeMenuHtml()}
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
          Módulos
        </button>
        <h1 class="app-shell-topbar-title">${title}</h1>
        <div class="app-shell-search-wrap">
          <div class="app-shell-search">
            <svg aria-hidden="true" viewBox="0 0 16 16"><circle cx="6.5" cy="6.5" r="5"/><path d="M10.5 10.5l3.5 3.5"/></svg>
            <input type="search" placeholder="Pesquisar…" id="appShellSearchInput" autocomplete="off">
            <span class="app-shell-search-kbd">⌘K</span>
          </div>
        </div>
        <span class="app-shell-spacer"></span>
        <div class="app-shell-topbar-actions">
          ${customizeBtn}
          <button class="app-shell-icon-btn" type="button" id="appShellNotifBtn" title="Notificações" aria-label="Notificações">
            <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M8 1a5 5 0 015 5c0 2.5.5 4 1.5 5H1.5C2.5 10 3 8.5 3 6a5 5 0 015-5z"/><path d="M6 13a2 2 0 004 0"/></svg>
            <span class="app-shell-notif-badge" id="appShellNotifBadge"></span>
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
        if (window.isAdmin && window.isAdmin()) {
          sessionStorage.setItem('filtroEscritorio', officeId || 'todos');
          document.dispatchEvent(new CustomEvent('escritorioChanged', { detail: { escritorio: officeId || 'todos' } }));
        }
        wrap.classList.remove('open');
        btn.classList.remove('open');
        window.renderNavbar(window.__appShellActivePage || '');
      });
    });
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

    ensureMobileModulesMenu(activePage);
    bindOfficeSwitcher();
    applySidebarState();
    updateShellUser(window.userProfile);
  };

  window.addEventListener('resize', applySidebarState);
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

    // Aplicar tema guardado nas preferências do utilizador
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
