const db = firebase.firestore();


// ── Dark mode — icon init (toggle via window.toggleDarkMode em auth.js) ──
(function() {
  const isDark = document.documentElement.classList.contains('dark');
  document.querySelectorAll('.dark-toggle-icon').forEach(el => {
    el.textContent = isDark ? '☀️' : '🌙';
  });
})();

// ══════════════════════════════════════════════
// LAYOUT — drag & drop + toggle largura
// ══════════════════════════════════════════════

const LAYOUT_DEFAULT = [
  { id: 'comunicados', width: 'full' },
  { id: 'tarefas',     width: 'half' },
  { id: 'admissoes',   width: 'half' },
  { id: 'reclamacoes', width: 'full' },
  { id: 'calendario',  width: 'full' },
  { id: 'eventos',     width: 'half' },
  { id: 'actividade',  width: 'half' },
];

let dashboardLayout = null; // carregado do Firestore ou default
let _layoutSaveTimer = null;

// Aplica um array de layout ao DOM
function applyLayout(layout) {
  const grid = document.getElementById('mainGrid');
  if (!grid) return;

  // Reordenar painéis no DOM segundo o layout
  layout.forEach(item => {
    const panel = grid.querySelector(`[data-panel-id="${item.id}"]`);
    if (!panel) return;
    grid.appendChild(panel); // move para o fim na ordem correcta
    // Largura
    if (item.width === 'full') {
      panel.classList.add('full');
    } else {
      panel.classList.remove('full');
    }
    // Actualizar botão de toggle
    const btn = panel.querySelector('.panel-width-btn');
    if (btn) btn.classList.toggle('is-full', item.width === 'full');
  });
}

// Lê o layout actual do DOM e devolve array
function readLayoutFromDOM() {
  const grid = document.getElementById('mainGrid');
  if (!grid) return LAYOUT_DEFAULT.slice();
  return [...grid.querySelectorAll('[data-panel-id]')].map(panel => ({
    id: panel.dataset.panelId,
    width: panel.classList.contains('full') ? 'full' : 'half',
  }));
}

// Compara layout com o default
function isDefaultLayout(layout) {
  if (!layout || layout.length !== LAYOUT_DEFAULT.length) return false;
  return layout.every((item, i) =>
    item.id === LAYOUT_DEFAULT[i].id && item.width === LAYOUT_DEFAULT[i].width
  );
}

// Guarda no Firestore com debounce
function saveLayout() {
  clearTimeout(_layoutSaveTimer);
  _layoutSaveTimer = setTimeout(() => {
    const layout = readLayoutFromDOM();
    dashboardLayout = layout;
    if (window.currentUser) {
      firebase.firestore()
        .collection('utilizadores').doc(window.currentUser.uid)
        .update({ dashboardLayout: layout })
        .catch(e => console.warn('[layout] Erro ao guardar:', e));
    }
  }, 600);
}

// Toggle full/half de um painel
function toggleWidth(btn) {
  const panel = btn.closest('[data-panel-id]');
  if (!panel) return;
  const isFull = panel.classList.toggle('full');
  btn.classList.toggle('is-full', isFull);
  saveLayout();
}

// Repor layout original
function resetLayout() {
  applyLayout(LAYOUT_DEFAULT);
  dashboardLayout = LAYOUT_DEFAULT.slice();
  if (window.currentUser) {
    firebase.firestore()
      .collection('utilizadores').doc(window.currentUser.uid)
      .update({ dashboardLayout: firebase.firestore.FieldValue.delete() })
      .catch(() => {});
  }
}

// Inicializa SortableJS no grid
function initSortable() {
  const grid = document.getElementById('mainGrid');
  if (!grid || typeof Sortable === 'undefined') return;
  Sortable.create(grid, {
    handle: '.drag-handle',
    animation: 180,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd() {
      saveLayout();
    },
  });
}

// ── STATE ──
let tasks       = [];
let comunicados = [];
let admissoes   = [];
let reclamacoes = [];
let calData     = null;
let loadedFlags = { tasks: false, com: false, cal: false, adm: false, rec: false };
let unsubFns    = []; // mantido por compatibilidade (agora vazio — sem listeners ativos)
let errorFlags  = {}; // regista pedidos que falharam

// ── CACHE DO DASHBOARD ───────────────────────────────────────────────────────
// Evita re-reads ao Firestore em cada troca de escritório ou navegação rápida.
// TTL de 2 minutos: dados suficientemente frescos para um painel de gestão.
const _dashCache = {
  tasksTs: 0, comTs: 0, admTs: 0, recTs: 0,
  // calendário por escritório: { [officeId]: timestamp }
  calTs: {},
};
const DASH_CACHE_TTL = 2 * 60 * 1000; // 2 minutos em ms

function _dashCacheValid(key) {
  return (Date.now() - (_dashCache[key] || 0)) < DASH_CACHE_TTL;
}

// Expõe um refresh manual (ex: botão "Atualizar")
function dashRefresh() {
  _dashCache.tasksTs = 0;
  _dashCache.comTs   = 0;
  _dashCache.admTs   = 0;
  _dashCache.recTs   = 0;
  _dashCache.calTs   = {};
  startSync(escritorioAtivoDash);
}

// ── AGUARDAR AUTH ──
document.addEventListener('authReady', ({ detail }) => {
  const profile = detail.profile;

  window.renderNavbar('dashboard');

  const escritorio = window.escritorioAtivo();

  // ── Carregar layout guardado ──
  const savedLayout = window.userProfile && window.userProfile.dashboardLayout;
  if (savedLayout && Array.isArray(savedLayout) && savedLayout.length) {
    const merged = LAYOUT_DEFAULT.map(def => {
      const saved = savedLayout.find(s => s.id === def.id);
      return saved || def;
    });
    savedLayout.filter(s => !LAYOUT_DEFAULT.find(d => d.id === s.id)).forEach(s => merged.push(s));
    dashboardLayout = merged;
  } else {
    dashboardLayout = LAYOUT_DEFAULT.slice();
  }
  applyLayout(dashboardLayout);

  // Inicializar drag & drop
  initSortable();

  startSync(escritorio);
});


// ── ESCRITÓRIO ATIVO (atualizado sem reload) ──
let escritorioAtivoDash = '';

// ── Helper: ID do documento de calendário do mês atual ──
function dashCalDocId(esc) {
  const n = new Date();
  return 'calendario_' + esc + '_' + n.getFullYear() + '_' + String(n.getMonth() + 1).padStart(2, '0');
}

// ── CARREGAMENTO COM CACHE ────────────────────────────────────────────────────
// Substituímos os 5 onSnapshot por .get() com TTL de 2 minutos.
// — Sem listeners permanentes → zero reads contínuos em background
// — Ao mudar de escritório, apenas o calendário é re-buscado (se o cache expirou)
// — Botão "Atualizar" / dashRefresh() força nova leitura
function startSync(escritorio) {
  escritorioAtivoDash = escritorio || '';

  // Resolução do escritório para o calendário
  const calEsc = (escritorioAtivoDash && escritorioAtivoDash !== 'todos')
    ? escritorioAtivoDash
    : (window.getEscritoriosSync ? (window.getEscritoriosSync()[0] || {}).id : '') || 'quarteira';

  // Se todos os dados estão frescos no cache → apenas re-renderizar
  const allFresh =
    _dashCacheValid('tasksTs') &&
    _dashCacheValid('comTs') &&
    _dashCacheValid('admTs') &&
    _dashCacheValid('recTs') &&
    _dashCacheValid('calTs_' + calEsc);

  if (allFresh && (tasks.length + comunicados.length + admissoes.length + reclamacoes.length) > 0) {
    renderAll();
    return;
  }

  // Inicializar flags (apenas para os que precisam de ser buscados)
  loadedFlags = { tasks: false, com: false, cal: false, adm: false, rec: false };
  errorFlags  = {};
  setStatus('A carregar…', '#f59e0b');

  // ── Tarefas ──
  if (_dashCacheValid('tasksTs') && tasks.length > 0) {
    loadedFlags.tasks = true;
  } else {
    db.collection('tarefas_todo').orderBy('ordemChegada', 'asc').limit(50).get()
      .then(snap => {
        tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _dashCache.tasksTs = Date.now();
        loadedFlags.tasks = true;
        checkAllLoaded();
      })
      .catch(err => {
        console.error('tasks (orderBy):', err);
        // Fallback sem orderBy se o índice ainda não existir
        db.collection('tarefas_todo').limit(50).get()
          .then(snap => {
            tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            _dashCache.tasksTs = Date.now();
          })
          .catch(() => {})
          .finally(() => { loadedFlags.tasks = true; checkAllLoaded(); });
      });
  }

  // ── Comunicados ──
  if (_dashCacheValid('comTs') && comunicados.length > 0) {
    loadedFlags.com = true;
  } else {
    db.collection('comunicados').orderBy('criadoEm', 'desc').limit(20).get()
      .then(snap => {
        comunicados = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _dashCache.comTs = Date.now();
        loadedFlags.com = true;
        checkAllLoaded();
      })
      .catch(err => { console.error('com:', err); errorFlags.com = true; loadedFlags.com = true; checkAllLoaded(); });
  }

  // ── Admissões ──
  if (_dashCacheValid('admTs') && admissoes.length > 0) {
    loadedFlags.adm = true;
  } else {
    db.collection('admissoes').orderBy('criadoEm', 'desc').limit(20).get()
      .then(snap => {
        admissoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _dashCache.admTs = Date.now();
        loadedFlags.adm = true;
        checkAllLoaded();
      })
      .catch(err => { console.error('adm:', err); errorFlags.adm = true; loadedFlags.adm = true; checkAllLoaded(); });
  }

  // ── Reclamações ──
  if (_dashCacheValid('recTs') && reclamacoes.length > 0) {
    loadedFlags.rec = true;
  } else {
    db.collection('reclamacoes_horas').orderBy('criadoEm', 'desc').limit(20).get()
      .then(snap => {
        reclamacoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _dashCache.recTs = Date.now();
        loadedFlags.rec = true;
        checkAllLoaded();
        renderReclamacoes();
      })
      .catch(err => { console.error('rec:', err); errorFlags.rec = true; loadedFlags.rec = true; checkAllLoaded(); });
  }

  // ── Calendário (por escritório) ──
  const calDocId = dashCalDocId(calEsc);
  if (_dashCacheValid('calTs_' + calEsc) && calData !== undefined) {
    loadedFlags.cal = true;
  } else {
    db.collection('calendarios').doc(calDocId).get()
      .then(snap => {
        calData = snap.exists ? snap.data() : null;
        _dashCache.calTs['calTs_' + calEsc] = Date.now();
        _dashCache['calTs_' + calEsc] = Date.now();
        loadedFlags.cal = true;
        checkAllLoaded();
      })
      .catch(err => { console.error('cal:', err); errorFlags.cal = true; loadedFlags.cal = true; checkAllLoaded(); });
  }

  // Se todos estavam em cache, renderizar agora
  checkAllLoaded();
}

// ── CHECK LOADED ──
function checkAllLoaded() {
  if (!loadedFlags.tasks || !loadedFlags.com || !loadedFlags.cal || !loadedFlags.adm || !loadedFlags.rec) return;
  renderAll();
  if (Object.keys(errorFlags).length > 0) {
    setStatus('⚠ Ligação parcial', '#d97706');
  } else {
    setStatus('✓ Sincronizado', '#16a34a');
    setTimeout(() => setStatus(''), 3000);
  }
  const now = new Date();
  const lastUpdateEl = document.getElementById('lastUpdate');
  if (lastUpdateEl) {
    lastUpdateEl.innerHTML =
      'Actualizado às ' + now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) +
      ' <button class="dash-refresh-btn" onclick="dashRefresh()" title="Forçar atualização">↺</button>';
  }
}


// ── RENDER ALL ──
function renderAll() {
  renderUrgenteBanner();
  renderKPIs();
  renderTasks();
  renderComunicados();
  renderCalMini();
  renderEvents();
  renderAdmissoes();
  renderActivity();
  renderReclamacoes();
}

// ── URGENTE BANNER ──
function renderUrgenteBanner() {
  const banner   = document.getElementById('urgenteBanner');
  const urgentes = comunicados.filter(c =>
    c.tipo === 'urgente' &&
    !c.arquivado &&
    matchComunicadoEscritorioDash(c, escritorioAtivoDash)
  );
  if (!urgentes.length) { banner.style.display = 'none'; return; }
  banner.style.display = 'block';
  banner.innerHTML = urgentes.slice(0, 2).map(u => `
    <div class="urgente-banner">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2L1.5 13h13L8 2z"/><path d="M8 7v3M8 11.5v.5"/></svg>
      <div><strong>${escHtml(u.titulo)}</strong> — ${escHtml(u.autor || '')} · ${fmtShort(u.criadoEm)}</div>
    </div>
  `).join('');
}

// ── Helpers de filtro por escritório ──
function matchEscritorioDoc(doc, escritorio) {
  if (!escritorio || escritorio === 'todos') return true;
  const dest = doc.escritorio || '';
  const orig = doc.escritorioOrigem || '';
  return dest === escritorio || orig === escritorio;
}

function matchComunicadoEscritorioDash(c, esc) {
  if (!esc || esc === 'todos') return true;
  const dests = c.destinosEscritorio || null;
  if (dests && Array.isArray(dests) && dests.length) {
    if (dests.includes('todos')) return true;
    return dests.includes(esc);
  }
  return c.escritorio === esc;
}

// ── KPIs ──
function renderKPIs() {
  const filtT = (escritorioAtivoDash && escritorioAtivoDash !== 'todos')
    ? tasks.filter(t => matchEscritorioDoc(t, escritorioAtivoDash))
    : tasks;
  const filtC = (escritorioAtivoDash && escritorioAtivoDash !== 'todos')
    ? comunicados.filter(c => matchComunicadoEscritorioDash(c, escritorioAtivoDash))
    : comunicados;
  const filtA = (escritorioAtivoDash && escritorioAtivoDash !== 'todos')
    ? admissoes.filter(a => matchEscritorioDoc(a, escritorioAtivoDash))
    : admissoes;
  const filtR = (escritorioAtivoDash && escritorioAtivoDash !== 'todos')
    ? reclamacoes.filter(r => matchEscritorioDoc(r, escritorioAtivoDash))
    : reclamacoes;

  const activas      = filtT.filter(t => t.estado !== 'concluido' && t.estado !== 'cancelado');
  const urgentes     = activas.filter(t => t.prioridade === 'urgente');
  const emProgresso  = activas.filter(t => t.estado === 'progresso');
  const comAtivos    = filtC.filter(c => !c.arquivado);
  const comNaoLidos  = comAtivos.filter(c => !c.lido);
  const admPendentes = filtA.filter(a => a.estado !== 'concluido' && a.estado !== 'cancelado');
  const recAbertos   = filtR.filter(r => ['nova','verificacao','enviada','confirmada','aguarda-proc'].includes(r.estado));
  const recUrgentes  = recAbertos.filter(r => r.prioridade === 'alta' || r.prioridade === 'urgente');

  const tiles = [
    {
      key: 'tarefas',
      icon: '<rect x="3" y="4" width="10" height="10" rx="1.5"/><path d="M6 7l1.5 1.5L10 6"/>',
      label: 'Tarefas ativas',
      value: activas.length,
      sub: urgentes.length > 0
        ? `${urgentes.length} urgent${urgentes.length === 1 ? 'e' : 'es'} · ${emProgresso.length} em progresso`
        : `${emProgresso.length} em progresso · ${tasks.length} total`,
      href: 'tarefas.html',
      accent: urgentes.length > 0 ? 'red' : 'blue',
    },
    {
      key: 'reclamacoes',
      icon: '<circle cx="8" cy="8" r="6.5"/><path d="M8 5v4"/><circle cx="8" cy="11.5" r=".6" fill="currentColor"/>',
      label: 'Reclamações em aberto',
      value: recAbertos.length,
      sub: recUrgentes.length > 0
        ? `${recUrgentes.length} alta prioridade`
        : 'em acompanhamento',
      href: 'reclamacoes.html',
      accent: recUrgentes.length > 0 ? 'amber' : 'default',
    },
    {
      key: 'admissoes',
      icon: '<circle cx="8" cy="5" r="3"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5"/>',
      label: 'Admissões em curso',
      value: admPendentes.length,
      sub: 'em processamento',
      href: 'admissoes.html',
      accent: 'default',
    },
    {
      key: 'comunicados',
      icon: '<path d="M13 2H3a1 1 0 00-1 1v9a1 1 0 001 1h3l2 2 2-2h3a1 1 0 001-1V3a1 1 0 00-1-1z"/>',
      label: 'Comunicados',
      value: comAtivos.length,
      sub: comNaoLidos.length > 0 ? `${comNaoLidos.length} por ler` : 'todos lidos',
      href: 'comunicados.html',
      accent: comNaoLidos.length > 0 ? 'purple' : 'default',
    },
  ];

  document.getElementById('kpiRow').innerHTML = tiles.map(t => `
    <a class="stat-tile stat-tile--${t.accent}" href="${t.href}">
      <div class="stat-tile-header">
        <span class="stat-tile-icon">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">${t.icon}</svg>
        </span>
        <span class="stat-tile-label">${t.label}</span>
      </div>
      <div class="stat-tile-value">${t.value}</div>
      <div class="stat-tile-sub">${t.sub}</div>
    </a>
  `).join('');
}

// ── TASKS ──
const ESTADO_LABEL = { aguardar: 'A aguardar', progresso: 'Em progresso', concluido: 'Concluído', cancelado: 'Cancelado', pendente: 'Pendente' };
const PRIO_ORDER   = { urgente: 0, normal: 1, baixa: 2 };

function renderTasks() {
  const container = document.getElementById('tasksList');
  const isAdmin = window.isAdmin();
  const mostrarEscritorio = isAdmin && (!escritorioAtivoDash || escritorioAtivoDash === 'todos');
  const filtradas = (escritorioAtivoDash && escritorioAtivoDash !== 'todos')
    ? tasks.filter(t => matchEscritorioDoc(t, escritorioAtivoDash))
    : tasks;

  const activas = filtradas
    .filter(t => t.estado !== 'concluido' && t.estado !== 'cancelado')
    .sort((a, b) => {
      const pd = (PRIO_ORDER[a.prioridade] ?? 1) - (PRIO_ORDER[b.prioridade] ?? 1);
      if (pd !== 0) return pd;
      return (a.ordemChegada || 0) - (b.ordemChegada || 0);
    })
    .slice(0, 8);

  if (!activas.length) {
    container.innerHTML = '<div class="empty-mini">Sem tarefas activas 🎉</div>';
    document.getElementById('progressWrap').style.display = 'none';
    return;
  }

  container.innerHTML = activas.map(t => `
    <div class="task-row"
      data-titulo="${escHtml(t.titulo)}"
      data-desc="${escHtml(t.descricao||'')}"
      data-pessoa="${escHtml(t.solicitante||'—')}"
      data-escritorio="${escHtml(t.escritorio||'—')}"
      data-prio="${escHtml(t.prioridade||'normal')}"
      data-estado="${escHtml(ESTADO_LABEL[t.estado]||t.estado)}">
      <div class="task-prio-dot ${t.prioridade}"></div>
      <div class="task-name">${escHtml(t.titulo)}</div>
      <div class="task-person">${escHtml(t.solicitante)}</div>
      <span class="estado-pill ${t.estado || 'aguardar'}">${ESTADO_LABEL[t.estado] || t.estado}</span>
    </div>
  `).join('');

  bindTaskTooltips();

  // progress bar
  const total      = filtradas.filter(t => t.estado !== 'cancelado').length;
  const concluidas = filtradas.filter(t => t.estado === 'concluido').length;
  if (total > 0) {
    const pct = Math.round(concluidas / total * 100);
    document.getElementById('progressWrap').style.display = 'block';
    document.getElementById('progressPct').textContent = pct + '%';
    document.getElementById('progressBar').style.transform = `scaleX(${pct / 100})`;
  }
}


// ── ADMISSÕES ──
function renderAdmissoes() {
  const container = document.getElementById('admList');
  const mostrarEscritorio = window.isAdmin() && (!escritorioAtivoDash || escritorioAtivoDash === 'todos');
  const filtradas = (escritorioAtivoDash && escritorioAtivoDash !== 'todos')
    ? admissoes.filter(a => matchEscritorioDoc(a, escritorioAtivoDash))
    : admissoes;
  const recentes = filtradas
    .filter(a => a.estado !== 'concluido' && a.estado !== 'cancelado')
    .slice(0, 8);

  if (!recentes.length) {
    container.innerHTML = '<div class="empty-mini">Sem processos em curso.</div>';
    return;
  }

  container.innerHTML = recentes.map(a => {
    const dataVal = a.tipo === 'cessacao' ? (a.dataSaida || '') : (a.dataEntrada || '');
    return `
    <div class="adm-row"
      data-num="${escHtml(a.numero||'—')}"
      data-nif="${escHtml(a.nif||'—')}"
      data-nome="${escHtml(a.nome||'—')}"
      data-empresa="${escHtml(a.empresa||'—')}"
      data-cat="${escHtml(a.categoria||'—')}"
      data-data="${escHtml(dataVal)}"
      data-tipo="${escHtml(a.tipo||'admissao')}">
      <div class="adm-tipo-dot ${a.tipo || 'admissao'}"></div>
      <div class="adm-name">${escHtml(a.nome || '—')}</div>
      <div class="adm-meta">${escHtml(a.submetidoPor || a.empresa || '')}</div>
      ${mostrarEscritorio && a.escritorio ? `<span class="escritorio-tag">${escHtml(a.escritorio)}</span>` : ''}
      <span class="adm-tipo-tag ${a.tipo || 'admissao'}">${a.tipo === 'cessacao' ? 'Cessação' : 'Admissão'}</span>
    </div>
  `}).join('');

  bindAdmTooltips();
}

// ── TOOLTIP ADMISSÕES ──
function bindAdmTooltips() {
  const tip = document.getElementById('admTooltip');
  if (!tip) return;
  let tipH = 220;

  document.querySelectorAll('#admList .adm-row').forEach(row => {
    row.addEventListener('mouseenter', e => {
      const dataLabel = row.dataset.tipo === 'cessacao' ? 'Data Saída' : 'Data Entrada';
      const dataFmt = fmtDateStr(row.dataset.data);
      tip.innerHTML = `
        <div class="tt-row"><span class="tt-lbl">Nº Func.</span><span class="tt-val">${row.dataset.num}</span></div>
        <div class="tt-row"><span class="tt-lbl">NIF</span><span class="tt-val">${row.dataset.nif}</span></div>
        <div class="tt-row"><span class="tt-lbl">Nome</span><span class="tt-val">${row.dataset.nome}</span></div>
        <div class="tt-row"><span class="tt-lbl">Empresa</span><span class="tt-val">${row.dataset.empresa}</span></div>
        <div class="tt-row"><span class="tt-lbl">Categoria</span><span class="tt-val">${row.dataset.cat}</span></div>
        <div class="tt-row"><span class="tt-lbl">${dataLabel}</span><span class="tt-val">${dataFmt}</span></div>
      `;
      tipH = tip.offsetHeight; // lido uma vez por hover
      positionTip(tip, e, tipH);
      tip.classList.add('show');
    });
    row.addEventListener('mousemove', e => positionTip(tip, e, tipH));
    row.addEventListener('mouseleave', () => tip.classList.remove('show'));
  });
}

// ── TOOLTIP TAREFAS ──
const PRIO_LABEL_DASH = { urgente:'🔴 Urgente', normal:'🟡 Normal', baixa:'🟢 Baixa' };

function bindTaskTooltips() {
  const tip = document.getElementById('taskTooltip');
  if (!tip) return;
  let tipH = 220;

  document.querySelectorAll('#tasksList .task-row').forEach(row => {
    row.addEventListener('mouseenter', e => {
      const desc = row.dataset.desc;
      tip.innerHTML = `
        <div class="tt-row"><span class="tt-lbl">Tarefa</span><span class="tt-val tt-strong">${row.dataset.titulo}</span></div>
        ${desc ? `<hr class="tt-divider"><div class="tt-val tt-desc">${desc}</div>` : ''}
        <hr class="tt-divider">
        <div class="tt-row"><span class="tt-lbl">Criado por</span><span class="tt-val">${row.dataset.pessoa}</span></div>
        <div class="tt-row"><span class="tt-lbl">Prioridade</span><span class="tt-val">${PRIO_LABEL_DASH[row.dataset.prio]||row.dataset.prio}</span></div>
        <div class="tt-row"><span class="tt-lbl">Estado</span><span class="tt-val">${row.dataset.estado}</span></div>
        <div class="tt-row"><span class="tt-lbl">Escritório</span><span class="tt-val">${row.dataset.escritorio}</span></div>
      `;
      tipH = tip.offsetHeight;
      positionTip(tip, e, tipH);
      tip.classList.add('show');
    });
    row.addEventListener('mousemove', e => positionTip(tip, e, tipH));
    row.addEventListener('mouseleave', () => tip.classList.remove('show'));
  });
}

// ── TOOLTIP RECLAMAÇÕES ──
const CANAL_LABEL_DASH = { email:'📧 Email', telefone:'📞 Telefone', mensagem:'💬 Mensagem', presencial:'🧑 Presencial' };

function bindRecTooltips() {
  const tip = document.getElementById('recTooltip');
  if (!tip) return;
  let tipH = 220;

  document.querySelectorAll('#recList .rec-dash-row').forEach(row => {
    row.style.cursor = 'default';
    row.addEventListener('mouseenter', e => {
      const periodos = row.dataset.periodos;
      const turnos   = row.dataset.turnos;
      const notas    = row.dataset.notas;
      const dataFmt  = row.dataset.data ? fmtShort(Number(row.dataset.data)) : '—';
      tip.innerHTML = `
        <div class="tt-row"><span class="tt-lbl">Nome</span><span class="tt-val tt-strong">${row.dataset.nome}</span></div>
        <div class="tt-row"><span class="tt-lbl">NIF</span><span class="tt-val">${row.dataset.nif}</span></div>
        <div class="tt-row"><span class="tt-lbl">Nº Func.</span><span class="tt-val">${row.dataset.numfunc}</span></div>
        <div class="tt-row"><span class="tt-lbl">Categoria</span><span class="tt-val">${row.dataset.categoria}</span></div>
        <hr class="tt-divider">
        <div class="tt-row"><span class="tt-lbl">Empresa</span><span class="tt-val">${row.dataset.empresa}</span></div>
        <div class="tt-row"><span class="tt-lbl">Escritório</span><span class="tt-val">${row.dataset.escritorio}</span></div>
        <div class="tt-row"><span class="tt-lbl">Canal</span><span class="tt-val">${CANAL_LABEL_DASH[row.dataset.canal] || row.dataset.canal}</span></div>
        <hr class="tt-divider">
        <div class="tt-row"><span class="tt-lbl">Períodos</span><span class="tt-val">${row.dataset.resumo}</span></div>
        ${periodos ? `<div class="tt-row"><span class="tt-lbl">Detalhe</span><span class="tt-val tt-desc">${periodos}</span></div>` : ''}
        ${turnos   ? `<div class="tt-row"><span class="tt-lbl">Turnos</span><span class="tt-val tt-desc">${turnos}</span></div>` : ''}
        ${notas    ? `<hr class="tt-divider"><div class="tt-val tt-desc">📝 ${notas}</div>` : ''}
        <hr class="tt-divider">
        <div class="tt-row"><span class="tt-lbl">Estado</span><span class="tt-val">${row.dataset.estado}</span></div>
        <div class="tt-row"><span class="tt-lbl">Registado</span><span class="tt-val">${row.dataset.criado} · ${dataFmt}</span></div>
      `;
      tipH = tip.offsetHeight;
      positionTip(tip, e, tipH);
      tip.classList.add('show');
    });
    row.addEventListener('mousemove', e => positionTip(tip, e, tipH));
    row.addEventListener('mouseleave', () => tip.classList.remove('show'));
  });
}

// positionTip usa CSS `translate` (GPU, sem reflow) em vez de left/top
function positionTip(tip, e, tipH) {
  const margin = 14;
  const tipW = 300;
  const h = tipH || 220;
  let x = e.clientX + margin;
  let y = e.clientY + margin;
  if (x + tipW > window.innerWidth)  x = e.clientX - tipW - margin;
  if (y + h    > window.innerHeight) y = e.clientY - h    - margin;
  tip.style.translate = `${x}px ${y}px`;
}

function fmtDateStr(str) {
  if (!str || str === '—') return '—';
  const parts = str.split('-');
  if (parts.length !== 3) return str;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

// ── COMUNICADOS ──
const TIPO_LABEL = { geral: 'Geral', urgente: 'Urgente', info: 'Info', aviso: 'Aviso' };

function renderComunicados() {
  const container = document.getElementById('comList');
  const mostrarEscritorio = window.isAdmin() && (!escritorioAtivoDash || escritorioAtivoDash === 'todos');
  const filtradas = (escritorioAtivoDash && escritorioAtivoDash !== 'todos')
    ? comunicados.filter(c => matchComunicadoEscritorioDash(c, escritorioAtivoDash))
    : comunicados;
  const recentes = filtradas.filter(c => !c.arquivado).slice(0, 6);

  if (!recentes.length) {
    container.innerHTML = '<div class="empty-mini">Sem comunicados activos.</div>';
    return;
  }

  container.innerHTML = recentes.map(c => `
    <div class="com-row">
      <div class="tipo-dot ${c.tipo}"></div>
      <div class="com-content">
        <div class="com-titulo-row">${escHtml(c.titulo)}</div>
        <div class="com-meta-row">
          ${escHtml(c.autor || '—')} · ${fmtShort(c.criadoEm)}
          ${mostrarEscritorio && c.escritorio ? ` · <span class="txt-cap">${escHtml(c.escritorio)}</span>` : ''}
        </div>
      </div>
      <span class="tipo-tag-sm ${c.tipo}">${TIPO_LABEL[c.tipo] || c.tipo}</span>
    </div>
  `).join('');
}

// ── CALENDAR MINI ──
function renderCalMini() {
  const container = document.getElementById('calMini');
  if (!calData || !calData.departments || !calData.departments.length) {
    container.innerHTML = '<div class="empty-mini">Sem dados de calendário.</div>';
    return;
  }

  // Descobrir o mês/ano do documento de calendário (id: "calendario_ESC_YYYY_MM")
  // Usar calData.mes/ano se existir, caso contrário inferir do mês atual
  const now = new Date();
  const ano  = calData.ano  || now.getFullYear();
  const mes  = calData.mes  != null ? calData.mes : now.getMonth(); // 0-based
  const diasNoMes = new Date(ano, mes + 1, 0).getDate(); // 28/29/30/31

  const DIAS_SEMANA_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  // Linha de números de dia + dia da semana
  let numHtml  = '<div class="cal-day-nums">';
  let dowHtml  = '<div class="cal-dow-row">';
  for (let d = 1; d <= diasNoMes; d++) {
    const dow = new Date(ano, mes, d).getDay(); // 0=Dom … 6=Sáb
    const isWeekend = dow === 0 || dow === 6;
    const wkClass = isWeekend ? ' cal-weekend' : '';
    numHtml += `<div class="cal-day-num${wkClass}">${d}</div>`;
    dowHtml += `<div class="cal-dow${wkClass}">${DIAS_SEMANA_PT[dow].charAt(0)}</div>`;
  }
  numHtml += '</div>';
  dowHtml += '</div>';

  const { departments } = calData;
  let html = dowHtml + numHtml;

  departments.forEach(dept => {
    html += `<div class="cal-dept-label">${escHtml(dept.name)}</div>`;
    html += '<div class="cal-grid">';
    for (let d = 0; d < diasNoMes; d++) {
      const val   = dept.data ? (dept.data[d] ?? 0) : 0;
      const color = dept.colors ? dept.colors[Math.min(5, Math.max(0, val))] : '#ddd';
      const dow   = new Date(ano, mes, d + 1).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const opacity = isWeekend && val === 0 ? 'opacity:.35;' : '';
      html += `<div class="cal-seg" style="background:${color};${opacity}" title="${DIAS_SEMANA_PT[dow]} ${d + 1}: ${val}"></div>`;
    }
    html += '</div>';
  });

  container.innerHTML = html;
}

// ── EVENTS ──
function renderEvents() {
  const container = document.getElementById('evList');
  if (!calData || !calData.events || !calData.events.length) {
    container.innerHTML = '<div class="empty-mini">Sem eventos no calendário.</div>';
    return;
  }

  const events  = [...calData.events].sort((a, b) => a.dayFrom - b.dayFrom).slice(0, 10);
  const depts   = calData.departments || [];
  const getDept = id => depts.find(d => d.id === id);

  container.innerHTML = events.map(ev => {
    const dept   = getDept(ev.deptId);
    const color  = dept ? dept.colors[4] : '#888';
    const dayLbl = ev.dayFrom === ev.dayTo ? `Dia ${ev.dayFrom}` : `Dia ${ev.dayFrom}–${ev.dayTo}`;
    return `
      <div class="ev-row">
        <div class="ev-dot" style="background:${color}"></div>
        <span class="ev-day-badge">${escHtml(dayLbl)}</span>
        <div class="ev-label">${escHtml(ev.label)}</div>
        <div class="ev-dept">${dept ? escHtml(dept.name) : ''}</div>
      </div>
    `;
  }).join('');
}

// ── ACTIVITY ──
function renderActivity() {
  const container = document.getElementById('activityList');
  const mostrarEscritorio = window.isAdmin() && (!escritorioAtivoDash || escritorioAtivoDash === 'todos');
  const filtT = (escritorioAtivoDash && escritorioAtivoDash !== 'todos')
    ? tasks.filter(t => matchEscritorioDoc(t, escritorioAtivoDash))
    : tasks;
  const filtC = (escritorioAtivoDash && escritorioAtivoDash !== 'todos')
    ? comunicados.filter(c => matchComunicadoEscritorioDash(c, escritorioAtivoDash))
    : comunicados;

  const items = [
    ...filtT.map(t => ({ type: 'task', ts: t.criadaEm || 0, label: t.titulo, sub: t.solicitante, estado: t.estado, escritorio: t.escritorio })),
    ...filtC.map(c => ({ type: 'com', ts: c.criadoEm || 0, label: c.titulo, sub: c.autor, tipo: c.tipo, escritorio: c.escritorio }))
  ].sort((a, b) => b.ts - a.ts).slice(0, 8);

  if (!items.length) {
    container.innerHTML = '<div class="empty-mini">Sem actividade recente.</div>';
    return;
  }

  container.innerHTML = items.map(item => {
    const icon = item.type === 'task' ? '📋' : '📢';
    const cls  = item.type === 'task' ? 'task' : 'com';
    const sub  = item.type === 'task'
      ? `${escHtml(item.sub || '')} · ${ESTADO_LABEL[item.estado] || item.estado}`
      : `Comunicado · ${escHtml(item.sub || '')}`;
    return `
      <div class="activity-row">
        <div class="activity-icon ${cls}">${icon}</div>
        <div class="activity-content">
          <div class="activity-text">${escHtml(item.label)}</div>
          <div class="activity-sub">
            ${sub}
            ${mostrarEscritorio && item.escritorio ? ` · <span class="txt-cap">${escHtml(item.escritorio)}</span>` : ''}
          </div>
        </div>
        <div class="activity-time">${fmtShort(item.ts)}</div>
      </div>
    `;
  }).join('');
}

// ── UTILS ──

// ── RECLAMAÇÕES ──
const ESTADOS_ATIVOS_REC = ['nova','verificacao','enviada','confirmada','aguarda-proc'];
const REC_ESTADO_LABEL = {
  nova:'Nova', verificacao:'Em Verificação', enviada:'Enviada à Empresa',
  confirmada:'Confirmada', 'aguarda-proc':'Aguarda Processamento',
  paga:'Paga', 'sem-fundamento':'Sem Fundamento', negada:'Negada'
};

function renderReclamacoes() {
  const esc = escritorioAtivoDash;
  const filtradas = reclamacoes.filter(r => {
    if (esc && esc !== 'todos' && r.escritorio !== esc) return false;
    return ESTADOS_ATIVOS_REC.includes(r.estado);
  });

  // KPI chips
  const kpis = document.getElementById('recKpis');
  if (kpis) {
    const counts = {};
    ESTADOS_ATIVOS_REC.forEach(e => { counts[e] = 0; });
    filtradas.forEach(r => { if (counts[r.estado] !== undefined) counts[r.estado]++; });
    const chips = ESTADOS_ATIVOS_REC.filter(e => counts[e] > 0).map(e =>
      `<span class="rec-kpi-chip ${e}">${counts[e]} ${REC_ESTADO_LABEL[e]}</span>`
    ).join('');
    kpis.innerHTML = chips || '';
  }

  // Ocultar painel se sem permissão ou sem dados
  const wrap = document.getElementById('reclamacoesPanelWrap');
  const canSee = window.isAdmin() || window.temPermissao('modules.reclamacoes.view');
  if (wrap) wrap.style.display = canSee ? '' : 'none';

  const container = document.getElementById('recList');
  if (!container) return;

  if (!canSee) { container.innerHTML = ''; return; }

  if (!filtradas.length) {
    container.innerHTML = '<div class="empty-mini">✓ Sem reclamações em aberto.</div>';
    return;
  }

  const mostrar = filtradas.slice(0, 10);
  container.innerHTML = mostrar.map(r => {
    const estadoCls = (r.estado || 'nova').replace(/-/g,'');
    const dotCls = r.estado === 'aguarda-proc' ? 'aguarda-proc' : estadoCls;
    // Construir resumo de períodos e turnos para o tooltip
    const periodos = (r.periodos || []);
    const periodoStr = periodos.map(p =>
      `${p.mesNome || ''} ${p.ano}: dias ${(p.dias||[]).join(',')} — ${p.totalHoras||''}${p.totalNoturnas?' 🌙'+p.totalNoturnas:''}${p.totalFeriado?' 📅'+p.totalFeriado:''}`
    ).join(' | ');
    const turnosStr = periodos.flatMap(p =>
      (p.turnos||[]).map(t => `${t.entrada||''}→${t.saida||''}${t.total?' ('+t.total+')':''}`)
    ).join(' · ');
    return `<div class="rec-dash-row"
      data-nome="${escHtml(r.nome||'—')}"
      data-nif="${escHtml(r.nif||'—')}"
      data-numfunc="${escHtml(r.numFunc||'—')}"
      data-categoria="${escHtml(r.categoria||'—')}"
      data-empresa="${escHtml(r.empresa||'—')}"
      data-escritorio="${escHtml(window.nomeEscritorio?window.nomeEscritorio(r.escritorio):(r.escritorio||'—'))}"
      data-canal="${escHtml(r.canal||'—')}"
      data-estado="${escHtml(REC_ESTADO_LABEL[r.estado]||r.estado||'—')}"
      data-resumo="${escHtml(r.resumoPeriodo||'—')}"
      data-periodos="${escHtml(periodoStr)}"
      data-turnos="${escHtml(turnosStr)}"
      data-notas="${escHtml(r.notas||'')}"
      data-criado="${escHtml(r.criadoPor||'—')}"
      data-data="${r.criadoEm||''}">
      <div class="rec-dash-dot ${dotCls}"></div>
      <div class="rec-dash-name">${escHtml(r.nome || '—')} <span class="rec-dash-meta-inline">· ${escHtml(r.empresa || '—')}${r.categoria ? ' · ' + escHtml(r.categoria) : ''}</span></div>
      <div class="rec-dash-meta">${escHtml(r.resumoPeriodo || '—')}</div>
      <span class="rec-kpi-chip ${r.estado === 'aguarda-proc' ? 'aguarda-proc' : estadoCls}">${REC_ESTADO_LABEL[r.estado] || r.estado}</span>
    </div>`;
  }).join('');

  if (filtradas.length > 10) {
    container.innerHTML += `<div class="rec-more-note">
      + ${filtradas.length - 10} mais · <a href="reclamacoes.html">Ver todas</a>
    </div>`;
  }

  bindRecTooltips();
}

// ── PESQUISA GLOBAL ──
let _gsearchTimeout = null;

function toggleGlobalSearch() {
  const panel = document.getElementById('appShellSearchPanel');
  if (!panel) return;
  if (panel.classList.contains('open')) {
    window.closeShellSearch && window.closeShellSearch();
  } else {
    window.openShellSearch && window.openShellSearch();
  }
}

function doGlobalSearch(q) {
  clearTimeout(_gsearchTimeout);
  _gsearchTimeout = setTimeout(() => _execGlobalSearch(q), 180);
}

function _execGlobalSearch(q) {
  const results = document.getElementById('appShellSearchResults') || document.getElementById('globalSearchResults');
  if (!results) return;
  q = (q || '').toLowerCase().trim();
  if (!q || q.length < 2) {
    results.innerHTML = '<div class="gsearch-empty">Escreve pelo menos 2 letras…</div>';
    return;
  }

  const hits = [];

  // Tarefas
  tasks.filter(t => `${t.titulo} ${t.solicitante} ${t.descricao}`.toLowerCase().includes(q)).slice(0, 4).forEach(t => {
    hits.push({ type: 'task', icon: '📋', label: t.titulo || '—', sub: t.solicitante || '', href: 'tarefas.html' });
  });

  // Comunicados
  comunicados.filter(c => `${c.titulo} ${c.autor} ${c.conteudo}`.toLowerCase().includes(q)).slice(0, 4).forEach(c => {
    hits.push({ type: 'com', icon: '📢', label: c.titulo || '—', sub: c.autor || '', href: 'comunicados.html' });
  });

  // Reclamações
  reclamacoes.filter(r => `${r.nome} ${r.nif} ${r.numFunc} ${r.empresa}`.toLowerCase().includes(q)).slice(0, 4).forEach(r => {
    hits.push({ type: 'rec', icon: '⚠️', label: r.nome || '—', sub: `${r.empresa || ''} · ${r.resumoPeriodo || ''}`, href: 'reclamacoes.html' });
  });

  // Admissões
  admissoes.filter(a => `${a.nome} ${a.nif} ${a.empresa} ${a.funcao}`.toLowerCase().includes(q)).slice(0, 3).forEach(a => {
    hits.push({ type: 'adm', icon: '👤', label: a.nome || '—', sub: `${a.empresa || ''} · ${a.tipo || ''}`, href: 'admissoes.html' });
  });

  if (!hits.length) {
    results.innerHTML = '<div class="gsearch-empty">Sem resultados.</div>';
    return;
  }

  const sections = { task: 'Tarefas', com: 'Comunicados', rec: 'Reclamações', adm: 'Admissões' };
  let lastType = null;
  results.innerHTML = hits.map(h => {
    let html = '';
    if (h.type !== lastType) {
      html += `<div class="gsearch-section">${sections[h.type]}</div>`;
      lastType = h.type;
    }
    html += `<a class="gsearch-item" href="${h.href}">
      <div class="gsearch-item-icon ${h.type}">${h.icon}</div>
      <div class="gsearch-item-body">
        <div class="gsearch-item-label">${escHtml(h.label)}</div>
        ${h.sub ? `<div class="gsearch-item-sub">${escHtml(h.sub)}</div>` : ''}
      </div>
    </a>`;
    return html;
  }).join('');
}
