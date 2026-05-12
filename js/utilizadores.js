let users = [];
let roleFilter = '';
let escritorioFilter = '';
let searchFilter = '';

// ── Cache de utilizadores ─────────────────────────────────────────────────────
// Página admin: usada com pouca frequência; .get() único é suficiente.
// O botão "↺ Atualizar" força nova leitura quando necessário.
const _utilCache = { ts: 0 };
const UTIL_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function _utilCacheValid() {
  return users.length > 0 && (Date.now() - _utilCache.ts) < UTIL_CACHE_TTL;
}

function carregarUtilizadores() {
  if (_utilCacheValid()) {
    renderUsers();
    setStatus('✓ ' + users.length + ' utilizador(es) — cache', '#16a34a');
    setTimeout(() => setStatus(''), 3000);
    return;
  }
  setStatus('A carregar…', '#f59e0b');
  window.UsersService.listAll()
    .then(nextUsers => {
      users = nextUsers;
      _utilCache.ts = Date.now();
      renderUsers();
      setStatus('✓ ' + users.length + ' utilizador(es)', '#16a34a');
      setTimeout(() => setStatus(''), 3000);
    })
    .catch(err => {
      console.error('[utilizadores] Erro ao carregar:', err);
      setStatus('Erro ao carregar: ' + (err.code || err.message), '#dc2626');
    });
}

function refreshUtilizadores() {
  _utilCache.ts = 0; // invalidar cache
  carregarUtilizadores();
}

const PERMS_DEF = (window.getPermissionDefinitions ? window.getPermissionDefinitions() : [])
  .filter(def => ![
    'modules.utilizadores.manage',
    'modules.definicoes.manage',
    'modules.gerir-calendarios.manage',
    'modules.auditoria.view',
  ].includes(def.key));

function fmtDateShort(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function segmentedClick(btn, val) {
  document.querySelectorAll('#roleSegmented .seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  setRoleFilter(val);
}

function setRoleFilter(v) {
  roleFilter = v || '';
  renderUsers();
}

function setEscritorioFilter(v) {
  escritorioFilter = v || '';
  renderUsers();
}

function setSearch(v) {
  searchFilter = (v || '').toLowerCase().trim();
  renderUsers();
}

function filteredUsers() {
  let list = users.slice();
  if (roleFilter) list = list.filter(u => u.role === roleFilter);
  if (escritorioFilter) list = list.filter(u => u.escritorio === escritorioFilter);
  if (searchFilter) {
    list = list.filter(u =>
      (u.nomeCompleto || u.nome || '').toLowerCase().includes(searchFilter) ||
      (u.email || '').toLowerCase().includes(searchFilter)
    );
  }
  return list;
}

async function updateUser(uid, patch) {
  try {
    await window.UsersService.update(uid, patch);
    const u = users.find(x => x.uid === uid);
    if (u) Object.assign(u, patch);
    toast('Alterações guardadas.');
  } catch (e) {
    console.error(e);
    toast('Erro ao guardar alterações.');
  }
}

function togglePerms(uid) {
  const row = document.getElementById('permsRow_' + uid);
  const btn = document.getElementById('btnPerms_' + uid);
  if (!row) return;

  const isOpen = row.classList.contains('open');
  document.querySelectorAll('.perms-row.open').forEach(r => r.classList.remove('open'));
  document.querySelectorAll('.btn-perms.active').forEach(b => b.classList.remove('active'));

  if (!isOpen) {
    row.classList.add('open');
    if (btn) btn.classList.add('active');
  }
}

async function applyPerfilUtilizador(uid, perfilId) {
  try {
    if (perfilId) {
      await window.PerfisService.applyPerfilToUser(uid, perfilId);
      toast('Perfil "' + perfilId + '" aplicado.');
    } else {
      await window.PerfisService.removePerfilFromUser(uid);
      toast('Perfil removido. Permissoes repostas para defaults.');
    }
    _utilCache.ts = 0;
    carregarUtilizadores();
  } catch (e) {
    console.error(e);
    toast('Erro ao aplicar perfil.');
  }
}

async function setPermissao(uid, perm, val) {
  const item = document.getElementById('permItem_' + uid + '_' + perm);
  if (item) item.classList.toggle('on', val);

  const user = users.find(entry => entry.uid === uid);
  const hadPerfil = !!(user && user.perfil);

  try {
    await window.UsersService.setPermission(uid, perm, val, { clearProfile: hadPerfil });

    if (user) {
      user.perfil = null;
    }

    if (hadPerfil) {
      _utilCache.ts = 0;
      carregarUtilizadores();
      toast('Permissao atualizada e perfil removido para permitir configuracao individual.');
      return;
    }

    toast('Permissao ' + (val ? 'ativada' : 'removida') + '.');
  } catch (e) {
    if (item) item.classList.toggle('on', !val);
    const input = document.getElementById('perm_' + uid + '_' + perm);
    if (input) input.checked = !val;
    console.error(e);
    toast('Erro ao atualizar permissao.');
  }
}

function renderOfficeOptions() {
  const offices = window.getEscritoriosSync ? window.getEscritoriosSync({ includeInactive: true }) : [];

  const filtro = document.getElementById('escritorioFilter');
  if (filtro) {
    filtro.innerHTML = '<option value="">Todos os escritorios</option>' +
      offices.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
    if (escritorioFilter) filtro.value = escritorioFilter;
  }

  const novoEsc = document.getElementById('newEscritorio');
  if (novoEsc) {
    novoEsc.innerHTML = '<option value="">Selecionar...</option>' +
      offices.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
  }

  document.querySelectorAll('select[data-escritorio-select]').forEach(sel => {
    const uid = sel.getAttribute('data-escritorio-select');
    const user = users.find(item => item.uid === uid);
    const atual = user && user.escritorio ? user.escritorio : '';
    sel.innerHTML = '<option value="">-</option>' +
      offices.map(e => `<option value="${e.id}" ${atual === e.id ? 'selected' : ''}>${e.nome}</option>`).join('');
  });
}

function avatarColor(str) {
  const palette = [
    'linear-gradient(135deg,#f472b6,#8b5cf6)', '#f59e0b', '#10b981',
    '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#14b8a6', '#0284c7', '#d97706',
  ];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function avatarInitials(nome, email) {
  if (nome) {
    const parts = nome.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }
  return (email || '?')[0].toUpperCase();
}

function updateKpis() {
  const total = users.length;
  const admins = users.filter(u => u.role === 'admin').length;
  const ativos = users.filter(u => u.ativo !== false).length;
  const pendentes = users.filter(u => {
    const ativo = u.ativo !== false;
    return !ativo && (Date.now() - (u.criadoEm || 0) < 7 * 24 * 60 * 60 * 1000);
  }).length;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('kpiTotal', total);
  set('kpiTotalSub', total === 1 ? '1 conta registada' : total + ' contas registadas');
  set('kpiAdmins', admins);
  set('kpiAdminsSub', 'de ' + total + ' colaboradores');
  set('kpiAtivos', ativos);
  set('kpiPendentes', pendentes);
}

function renderUsers() {
  const tbody = document.getElementById('usersTbody');
  const countBadge = document.getElementById('countBadge');
  if (!tbody) return;

  updateKpis();

  const meUid = window.currentUser ? window.currentUser.uid : null;
  const list = filteredUsers().sort((a, b) => {
    const na = (a.nomeCompleto || a.nome || a.email || '').toLowerCase();
    const nb = (b.nomeCompleto || b.nome || b.email || '').toLowerCase();
    return na.localeCompare(nb, 'pt-PT');
  });

  if (countBadge) countBadge.textContent = list.length + ' de ' + users.length + ' colaboradores';

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px 20px;color:var(--muted);font-size:13px;">Nenhum utilizador encontrado.</td></tr>';
    return;
  }

  const offices = window.getEscritoriosSync ? window.getEscritoriosSync({ includeInactive: true }) : [];

  tbody.innerHTML = '';
  list.forEach(u => {
    const tr = document.createElement('tr');
    if (u.uid === meUid) tr.classList.add('me-row');

    const nome = u.nomeCompleto || u.nome || '';
    const email = u.email || '';
    const role = u.role || 'colaborador';
    const ativo = u.ativo !== false;
    const isPendente = !ativo && (Date.now() - (u.criadoEm || 0) < 7 * 24 * 60 * 60 * 1000);
    const initials = avatarInitials(nome, email);
    const bgColor = avatarColor(nome || email);
    const office = offices.find(o => o.id === u.escritorio);
    const officeLabel = office ? office.nome : (u.escritorio || '—');
    const officeCor = office ? (office.cor || 'var(--muted)') : 'var(--muted)';

    const statusPill = ativo
      ? `<span class="pill pill-green"><span class="pill-dot" style="background:var(--green);"></span>Ativo</span>`
      : isPendente
      ? `<span class="pill pill-amber"><span class="pill-dot" style="background:var(--amber);"></span>Pendente</span>`
      : `<span class="pill pill-red"><span class="pill-dot" style="background:var(--red);"></span>Inativo</span>`;

    const rolePill = role === 'admin'
      ? `<span class="pill pill-accent"><span class="pill-dot" style="background:var(--accent);"></span>Admin</span>`
      : `<span class="pill">Colaborador</span>`;

    tr.innerHTML = `
      <td>
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="avatar md" style="background:${bgColor};" title="${escHtml(nome)}">${escHtml(initials)}</span>
          <div style="min-width:0;">
            <div style="font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(nome || email)}</div>
            <div style="font-size:12px;color:var(--muted);">${escHtml(email)}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="pill" style="background:transparent;border:1px solid var(--border);">
          <span class="pill-dot" style="background:${officeCor};"></span>
          ${escHtml(officeLabel)}
        </span>
      </td>
      <td>${rolePill}</td>
      <td>${statusPill}</td>
      <td><span style="font-size:12px;color:var(--muted);">${fmtDateShort(u.ultimoAcesso)}</span></td>
      <td style="text-align:right;padding-right:14px;">
        <button class="btn btn-secondary btn-sm" onclick="abrirDrawer('${u.uid}');event.stopPropagation();">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:12px;height:12px;"><circle cx="6" cy="5.5" r="2.5"/><path d="M1 13c0-2.5 1.8-4 5-4s5 1.5 5 4"/><path d="M11 2l1.5 1.5L9 7"/></svg>
          Gerir
        </button>
      </td>
    `;

    tr.onclick = () => abrirDrawer(u.uid);
    tbody.appendChild(tr);
  });

  renderOfficeOptions();
}

function abrirDrawer(uid) {
  const u = users.find(x => x.uid === uid);
  if (!u) return;

  const overlay = document.getElementById('drawerOverlay');
  const drawer = document.getElementById('sideDrawer');
  if (!overlay || !drawer) return;

  const nome = u.nomeCompleto || u.nome || '';
  const email = u.email || '';
  const role = u.role || 'colaborador';
  const ativo = u.ativo !== false;
  const isPendente = !ativo && (Date.now() - (u.criadoEm || 0) < 7 * 24 * 60 * 60 * 1000);
  const initials = avatarInitials(nome, email);
  const bgColor = avatarColor(nome || email);
  const offices = window.getEscritoriosSync ? window.getEscritoriosSync({ includeInactive: true }) : [];
  const office = offices.find(o => o.id === u.escritorio);

  const statusPill = ativo
    ? `<span class="pill pill-green"><span class="pill-dot" style="background:var(--green);"></span>Ativo</span>`
    : isPendente
    ? `<span class="pill pill-amber"><span class="pill-dot" style="background:var(--amber);"></span>Pendente</span>`
    : `<span class="pill pill-red"><span class="pill-dot" style="background:var(--red);"></span>Inativo</span>`;

  const rolePill = role === 'admin'
    ? `<span class="pill pill-accent"><span class="pill-dot" style="background:var(--accent);"></span>Admin</span>`
    : `<span class="pill">Colaborador</span>`;

  const permsProfile = { ...u, permissoes: u.permissoes || {} };
  let permsHtml;
  if (role === 'admin') {
    permsHtml = `<div class="alert-card-v2 blue"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:16px;height:16px;flex-shrink:0;"><path d="M8 1l1.5 3 3.3.5-2.4 2.3.6 3.2L8 8.5l-3 1.5.6-3.2L3.2 4.5l3.3-.5L8 1z"/></svg><span>Administrador — todas as permissões estão ativas.</span></div>`;
  } else {
    const rows = PERMS_DEF.map((p, i) => {
      const on = window.temPermissaoNoPerfil ? window.temPermissaoNoPerfil(permsProfile, p.key) : false;
      return `<div class="perm-row" style="${i === PERMS_DEF.length - 1 ? 'border-bottom:none;' : ''}">
        <div class="perm-row-meta">
          <div class="perm-row-label">${escHtml(p.label)}</div>
        </div>
        <button class="toggle-switch ${on ? 'on' : ''}" data-uid="${u.uid}" data-perm="${escHtml(p.key)}" onclick="togglePermDrawer(this)">
          <span class="toggle-knob"></span>
        </button>
      </div>`;
    }).join('');
    permsHtml = `
      <div class="cli-info-block" style="margin-bottom:0;">
        <div class="cli-info-label">Permissões individuais</div>
        <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;">${rows}</div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
        <select class="select-v2" id="drawerPerfilSel" style="flex:1;" onchange="applyPerfilUtilizador('${u.uid}',this.value)">
          <option value="">— Perfil de permissão —</option>
        </select>
      </div>`;
  }

  drawer.innerHTML = `
    <div class="side-drawer-head">
      <span class="avatar lg" style="background:${bgColor};">${escHtml(initials)}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Poppins',sans-serif;font-size:17px;font-weight:700;letter-spacing:-.015em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(nome || email)}</div>
        <div style="font-size:12.5px;color:var(--muted);margin-top:2px;">${escHtml(email)}</div>
        <div style="display:flex;gap:6px;margin-top:8px;">${rolePill}${statusPill}</div>
      </div>
      <button class="icon-btn" onclick="fecharDrawer()" style="align-self:flex-start;flex-shrink:0;">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M4 4l8 8M12 4l-8 8"/></svg>
      </button>
    </div>

    <div class="side-drawer-actions">
      <button class="btn btn-secondary btn-sm" onclick="updateUser('${u.uid}',{ativo:${!ativo}});_utilCache.ts=0;fecharDrawer();setTimeout(()=>carregarUtilizadores(),400);">
        ${ativo ? 'Suspender conta' : 'Reativar conta'}
      </button>
      <div class="spacer"></div>
    </div>

    <div class="tabs-nav">
      <button class="tab-btn active" onclick="switchDrawerTab(this,'drawerTabInfo')">Informação</button>
      <button class="tab-btn" onclick="switchDrawerTab(this,'drawerTabPerms')">Permissões</button>
    </div>

    <div class="side-drawer-body">
      <div id="drawerTabInfo">
        <div class="cli-info-block">
          <div class="cli-info-label">Identificação</div>
          <div class="cli-info-grid">
            <div><span class="muted">Nome completo</span><span>${escHtml(nome || '—')}</span></div>
            <div><span class="muted">Email</span><span style="word-break:break-all;">${escHtml(email)}</span></div>
            <div><span class="muted">Escritório</span><span>${escHtml(office ? office.nome : (u.escritorio || '—'))}</span></div>
            <div><span class="muted">Tipo de conta</span><span>${role === 'admin' ? 'Administrador' : 'Colaborador'}</span></div>
            <div><span class="muted">Último acesso</span><span>${fmtDateShort(u.ultimoAcesso)}</span></div>
            <div><span class="muted">Estado</span><span>${ativo ? 'Ativo' : (isPendente ? 'Pendente' : 'Inativo')}</span></div>
          </div>
        </div>

        <div class="cli-info-block">
          <div class="cli-info-label">Editar dados</div>
          <div class="form-grid" style="gap:12px;">
            <div class="field">
              <label class="field-label">Nome completo</label>
              <input class="input-v2" id="drawerNome" value="${escHtml(nome)}">
            </div>
            <div class="field">
              <label class="field-label">Escritório</label>
              <select class="select-v2" id="drawerEscritorio" data-escritorio-select="${u.uid}">
                <option value="">—</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">Tipo de conta</label>
              <select class="select-v2" id="drawerRole">
                <option value="colaborador" ${role === 'colaborador' ? 'selected' : ''}>Colaborador</option>
                <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:12px;">
            <button class="btn btn-primary btn-sm" onclick="guardarDrawer('${u.uid}')">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;"><path d="M3 8l3 3 7-7"/></svg>
              Guardar
            </button>
          </div>
        </div>
      </div>

      <div id="drawerTabPerms" style="display:none;">
        ${permsHtml}
      </div>
    </div>
  `;

  overlay.classList.add('open');
  renderOfficeOptions();

  if (role !== 'admin' && window.PerfisService) {
    window.PerfisService.loadPerfis().then(perfis => {
      const sel = document.getElementById('drawerPerfilSel');
      if (!sel) return;
      perfis.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nome;
        if (p.id === u.perfil) opt.selected = true;
        sel.appendChild(opt);
      });
    });
  }
}

function fecharDrawer() {
  const overlay = document.getElementById('drawerOverlay');
  if (overlay) overlay.classList.remove('open');
}

function switchDrawerTab(btn, tabId) {
  document.querySelectorAll('.tabs-nav .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.side-drawer-body > div[id^="drawerTab"]').forEach(d => d.style.display = 'none');
  const tab = document.getElementById(tabId);
  if (tab) tab.style.display = '';
}

function guardarDrawer(uid) {
  const nome = document.getElementById('drawerNome')?.value.trim();
  const escritorio = document.getElementById('drawerEscritorio')?.value;
  const role = document.getElementById('drawerRole')?.value;
  const patch = {};
  if (nome) patch.nomeCompleto = nome;
  if (escritorio !== undefined) patch.escritorio = escritorio;
  if (role) patch.role = role;
  updateUser(uid, patch).then(() => {
    _utilCache.ts = 0;
    carregarUtilizadores();
    fecharDrawer();
  });
}

function togglePermDrawer(btn) {
  const uid = btn.dataset.uid;
  const perm = btn.dataset.perm;
  const isOn = btn.classList.contains('on');
  btn.classList.toggle('on', !isOn);
  btn.querySelector('.toggle-knob').style.left = !isOn ? '18px' : '2px';
  setPermissao(uid, perm, !isOn);
}

function abrirModalNovo() {
  document.getElementById('modalNovoUser').classList.add('open');
  document.getElementById('newNome').value = '';
  document.getElementById('newApelido').value = '';
  document.getElementById('newEmail').value = '';
  document.getElementById('newEscritorio').value = '';
  document.getElementById('newRole').value = 'colaborador';
  document.getElementById('newPassword').value = '';

  const errEl = document.getElementById('modalNovoErr');
  errEl.textContent = '';
  errEl.style.display = 'none';

  const btn = document.getElementById('btnSalvarNovo');
  btn.disabled = false;
  btn.textContent = 'Criar conta';

  renderOfficeOptions();
  document.getElementById('newNome').focus();
}

function fecharModalNovo() {
  document.getElementById('modalNovoUser').classList.remove('open');
}

async function criarUtilizador() {
  const nome = document.getElementById('newNome').value.trim();
  const apelido = document.getElementById('newApelido').value.trim();
  const email = document.getElementById('newEmail').value.trim();
  const escritorio = document.getElementById('newEscritorio').value;
  const role = document.getElementById('newRole').value;
  const password = document.getElementById('newPassword').value;
  const errEl = document.getElementById('modalNovoErr');
  const btnSalvar = document.getElementById('btnSalvarNovo');

  errEl.textContent = '';
  errEl.style.display = 'none';

  if (!nome || !email || !password) {
    errEl.textContent = 'Nome, email e password são obrigatórios.';
    errEl.style.display = 'block';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = 'Email inválido.';
    errEl.style.display = 'block';
    return;
  }
  if (password.length < 6) {
    errEl.textContent = 'A password deve ter pelo menos 6 caracteres.';
    errEl.style.display = 'block';
    return;
  }

  btnSalvar.disabled = true;
  btnSalvar.textContent = 'A criar...';

  try {
    await window.UsersService.create({
      nome,
      apelido,
      email,
      escritorio,
      role,
      password,
    });

    _utilCache.ts = 0; // novo utilizador → forçar re-leitura
    fecharModalNovo();
    toast('Conta criada com sucesso para ' + email + '.');
    carregarUtilizadores(); // recarregar lista
  } catch (err) {
    console.error('[criarUtilizador]', err);
    const msgs = {
      'auth/email-already-in-use': 'Este email ja esta registado.',
      'auth/invalid-email': 'Email invalido.',
      'auth/weak-password': 'Password demasiado fraca.',
    };
    errEl.textContent = msgs[err.code] || ('Erro: ' + (err.message || err.code));
    errEl.style.display = 'block';
    btnSalvar.disabled = false;
    btnSalvar.textContent = 'Criar conta';
  }
}

window.bootProtectedPage({
  activePage: 'utilizadores',
  moduleId: 'utilizadores',
  requireAdmin: true,
}, ({ profile }) => {
  const me = profile ? (profile.nomeCompleto || profile.nome || profile.email || '') : '';
  const meInfo = document.getElementById('meInfo');
  if (meInfo) meInfo.textContent = me ? 'Admin: ' + me : '';

  window.loadEscritorios({ includeInactive: true }).then(() => {
    renderOfficeOptions();
  });

  // Refresh button wired to data-card-foot sync status
  const syncEl = document.getElementById('syncStatus');
  if (syncEl) {
    syncEl.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-sm';
    btn.title = 'Forçar atualização';
    btn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:12px;height:12px;"><path d="M13 8A5 5 0 112.5 5.5"/><path d="M2 2v4h4"/></svg> Atualizar';
    btn.onclick = () => refreshUtilizadores();
    syncEl.appendChild(btn);
  }

  carregarUtilizadores();
});

document.addEventListener('keydown', e => {
  const modal = document.getElementById('modalNovoUser');
  if (!modal || !modal.classList.contains('open')) return;

  if (e.key === 'Escape') {
    fecharModalNovo();
    return;
  }

  if (e.key === 'Enter') {
    const active = document.activeElement;
    if (active && active.tagName === 'TEXTAREA') return;
    e.preventDefault();
    criarUtilizador();
  }
});
