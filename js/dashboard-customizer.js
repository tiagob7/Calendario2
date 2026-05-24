(() => {
  const PANEL_DEFAULTS = [
    { id: 'comunicados', label: 'Comunicados recentes', width: 'full', visible: true, featured: false },
    { id: 'tarefas', label: 'Tarefas activas', width: 'half', visible: true, featured: true },
    { id: 'admissoes', label: 'Processos de admissao / cessacao', width: 'half', visible: true, featured: false },
    { id: 'reclamacoes', label: 'Reclamacoes em aberto', width: 'full', visible: true, featured: false },
    { id: 'calendario', label: 'Carga de trabalho do mes', width: 'full', visible: true, featured: false },
    { id: 'eventos', label: 'Eventos do mes', width: 'half', visible: true, featured: false },
    { id: 'actividade', label: 'Actividade recente', width: 'half', visible: true, featured: false },
  ];

  const KPI_DEFAULTS = [
    { id: 'activas',     label: 'Tarefas activas', className: 'k-total',     source: 'tasks',       tsField: 'criadaEm', polarity: 'bad-up' },
    { id: 'urgentes',    label: 'Urgentes',        className: 'k-urgente',   source: 'tasks',       tsField: 'criadaEm', polarity: 'bad-up', filter: (t) => t.prioridade === 'urgente' },
    { id: 'progresso',   label: 'Em progresso',    className: 'k-progresso', source: 'tasks',       tsField: 'criadaEm', polarity: 'neutral' },
    { id: 'pendentes',   label: 'Pendentes',       className: 'k-pendente',  source: 'tasks',       tsField: 'criadaEm', polarity: 'bad-up' },
    { id: 'concluidas',  label: 'Concluidas',      className: 'k-concluido', source: 'tasks',       tsField: 'criadaEm', polarity: 'good-up' },
    { id: 'comunicados', label: 'Comunicados',     className: 'k-com',       source: 'comunicados', tsField: 'criadoEm', polarity: 'neutral' },
    { id: 'admissoes',   label: 'Admissoes',       className: 'k-adm',       source: 'admissoes',   tsField: 'criadoEm', polarity: 'neutral' },
  ];

  const THEME_PRESETS = [
    { id: 'default', label: 'Azul clean', note: 'Base actual e mais neutra.', swatches: ['#0284c7', '#0f172a', '#f1f5f9'] },
    { id: 'forest', label: 'Verde atlantico', note: 'Tom mais institucional.', swatches: ['#0f766e', '#12312b', '#ecfeff'] },
    { id: 'sunset', label: 'Terracota', note: 'Mais quente e editorial.', swatches: ['#c2410c', '#3c1f12', '#fff7ed'] },
    { id: 'violet', label: 'Violeta', note: 'Mais premium e diferenciado.', swatches: ['#7c3aed', '#21163d', '#f5f3ff'] },
  ];

  const DEFAULTS = {
    version: 1,
    gridPreset: 'balanced',
    themePreset: 'default',
    panels: PANEL_DEFAULTS.map(panel => ({ ...panel })),
    kpis: {
      order: KPI_DEFAULTS.map(kpi => kpi.id),
      hidden: [],
      highlighted: ['urgentes'],
    },
  };

  const originalApplyLayout = window.applyLayout;
  const originalReadLayout = window.readLayoutFromDOM;
  let saveTimer = null;
  let editorOpen = false;
  let state = {
    gridPreset: DEFAULTS.gridPreset,
    themePreset: DEFAULTS.themePreset,
    panels: clonePanels(DEFAULTS.panels),
    kpis: cloneKpis(DEFAULTS.kpis),
  };

  function clonePanels(panels) {
    return (panels || []).map(panel => ({
      id: panel.id,
      label: panel.label,
      width: panel.width === 'full' ? 'full' : 'half',
      visible: panel.visible !== false,
      featured: !!panel.featured,
    }));
  }

  function cloneKpis(kpis) {
    return {
      order: (kpis && Array.isArray(kpis.order) ? kpis.order : DEFAULTS.kpis.order).slice(),
      hidden: (kpis && Array.isArray(kpis.hidden) ? kpis.hidden : DEFAULTS.kpis.hidden).slice(),
      highlighted: (kpis && Array.isArray(kpis.highlighted) ? kpis.highlighted : DEFAULTS.kpis.highlighted).slice(),
    };
  }

  function normalizePanels(panels) {
    const raw = Array.isArray(panels) ? panels : [];
    const merged = PANEL_DEFAULTS.map(def => {
      const saved = raw.find(item => item.id === def.id) || {};
      return {
        ...def,
        ...saved,
        width: saved.width === 'full' ? 'full' : def.width,
        visible: saved.visible !== false,
        featured: !!saved.featured,
      };
    });

    raw
      .filter(item => item && item.id && !PANEL_DEFAULTS.find(def => def.id === item.id))
      .forEach(item => merged.push({
        id: item.id,
        label: item.label || item.id,
        width: item.width === 'full' ? 'full' : 'half',
        visible: item.visible !== false,
        featured: !!item.featured,
      }));

    return merged;
  }

  function getPrefs(profile) {
    const root = profile && profile.preferencias && profile.preferencias.dashboard
      ? profile.preferencias.dashboard
      : {};
    const legacyLayout = profile && Array.isArray(profile.dashboardLayout) ? profile.dashboardLayout : [];
    return {
      gridPreset: root.gridPreset || DEFAULTS.gridPreset,
      themePreset: root.themePreset || DEFAULTS.themePreset,
      panels: normalizePanels(root.panels && root.panels.length ? root.panels : legacyLayout),
      kpis: cloneKpis(root.kpis || DEFAULTS.kpis),
    };
  }

  function getCurrentPanels() {
    const grid = document.getElementById('mainGrid');
    if (!grid) return clonePanels(state.panels);
    return normalizePanels([...grid.querySelectorAll('[data-panel-id]')].map(panel => ({
      id: panel.dataset.panelId,
      width: panel.classList.contains('full') ? 'full' : 'half',
      visible: !panel.classList.contains('panel-hidden'),
      featured: panel.classList.contains('featured-panel'),
    })));
  }

  function applyPanelDecorations(panels) {
    panels.forEach(panel => {
      const el = document.querySelector(`#mainGrid [data-panel-id="${panel.id}"]`);
      if (!el) return;
      el.classList.toggle('panel-hidden', panel.visible === false);
      el.classList.toggle('featured-panel', !!panel.featured);
    });
  }

  function applyGridPreset(preset) {
    const grid = document.getElementById('mainGrid');
    if (!grid) return;
    state.gridPreset = preset === 'emphasis' ? 'emphasis' : 'balanced';
    grid.classList.remove('grid-balanced', 'grid-emphasis');
    grid.classList.add(`grid-${state.gridPreset}`);
    document.querySelectorAll('.layout-preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === state.gridPreset);
    });
  }

  function applyThemePreset(themeId) {
    state.themePreset = THEME_PRESETS.find(theme => theme.id === themeId) ? themeId : DEFAULTS.themePreset;
    if (state.themePreset === 'default') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', state.themePreset);
  }

  function isDefaultPanels(panels) {
    const normalized = normalizePanels(panels);
    return normalized.every((panel, index) => {
      const def = DEFAULTS.panels[index];
      return panel.id === def.id && panel.width === def.width && panel.visible === def.visible && panel.featured === def.featured;
    });
  }

  function hasCustomizations() {
    return (
      state.gridPreset !== DEFAULTS.gridPreset ||
      state.themePreset !== DEFAULTS.themePreset ||
      !isDefaultPanels(getCurrentPanels()) ||
      state.kpis.hidden.join('|') !== DEFAULTS.kpis.hidden.join('|') ||
      state.kpis.highlighted.join('|') !== DEFAULTS.kpis.highlighted.join('|')
    );
  }

  function updateResetVisibility() {
    const btn = document.getElementById('layoutResetBtn');
    if (btn) btn.classList.toggle('visible', hasCustomizations());
  }

  function normalizeEditorCopy() {
    const sectionTitles = document.querySelectorAll('#dashboardEditor .dashboard-editor-section-head h3');
    const sectionNotes = document.querySelectorAll('#dashboardEditor .dashboard-editor-section-head p');
    const headerNote = document.querySelector('#dashboardEditor .dashboard-editor-header p');
    const resetBtn = document.querySelector('#dashboardEditor .dashboard-editor-secondary');

    if (headerNote) headerNote.textContent = 'Escolhe o que cada utilizador vê e como o layout se comporta.';

    if (sectionTitles[1]) sectionTitles[1].textContent = 'Tema';
    if (sectionNotes[1]) sectionNotes[1].textContent = 'Variações cromáticas para o modo claro.';

    if (sectionTitles[2]) sectionTitles[2].textContent = 'Painéis';
    if (sectionNotes[2]) sectionNotes[2].textContent = 'Mostrar e destacar painéis.';

    if (resetBtn) resetBtn.textContent = 'Repor personalização';
  }

  function persistPrefs(options = {}) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const panels = getCurrentPanels();
      state.panels = clonePanels(panels);
      updateResetVisibility();

      if (!window.currentUser) return;
      const payload = options.reset ? {
        dashboardLayout: firebase.firestore.FieldValue.delete(),
        'preferencias.dashboard': firebase.firestore.FieldValue.delete(),
      } : {
        dashboardLayout: panels.map(({ id, width }) => ({ id, width })),
        'preferencias.dashboard': {
          version: DEFAULTS.version,
          gridPreset: state.gridPreset,
          themePreset: state.themePreset,
          panels: panels.map(({ id, width, visible, featured }) => ({ id, width, visible, featured })),
          kpis: cloneKpis(state.kpis),
        },
      };

      firebase.firestore()
        .collection('utilizadores').doc(window.currentUser.uid)
        .update(payload)
        .catch(err => console.warn('[dashboard-customizer] Erro ao guardar preferencias:', err));
    }, options.immediate ? 0 : 250);
  }

  window.applyLayout = function(layout) {
    const panels = normalizePanels(layout || state.panels);
    state.panels = clonePanels(panels);
    if (typeof originalApplyLayout === 'function') {
      originalApplyLayout(panels.map(({ id, width }) => ({ id, width })));
    }
    applyPanelDecorations(panels);
  };

  window.readLayoutFromDOM = function() {
    return getCurrentPanels();
  };

  window.saveLayout = function() {
    state.panels = getCurrentPanels();
    persistPrefs();
    if (editorOpen) renderEditor();
  };

  window.resetLayout = function() {
    state.gridPreset = DEFAULTS.gridPreset;
    state.themePreset = DEFAULTS.themePreset;
    state.panels = clonePanels(DEFAULTS.panels);
    state.kpis = cloneKpis(DEFAULTS.kpis);
    applyThemePreset(state.themePreset);
    applyGridPreset(state.gridPreset);
    window.applyLayout(state.panels);
    if (typeof window.renderKPIs === 'function') window.renderKPIs();
    persistPrefs({ reset: true, immediate: true });
    if (editorOpen) renderEditor();
  };

  window.setGridPreset = function(preset) {
    applyGridPreset(preset);
    updateResetVisibility();
    persistPrefs();
    if (editorOpen) renderEditor();
  };

  window.setThemePreset = function(themeId) {
    applyThemePreset(themeId);
    updateResetVisibility();
    persistPrefs();
    if (editorOpen) renderEditor();
  };

  window.updatePanelSetting = function(panelId, changes) {
    state.panels = getCurrentPanels().map(panel => panel.id === panelId ? { ...panel, ...changes } : panel);
    window.applyLayout(state.panels);
    persistPrefs();
    if (editorOpen) renderEditor();
  };

  window.updateKpiSetting = function(kpiId, type, enabled) {
    const bucket = type === 'highlighted' ? state.kpis.highlighted.slice() : state.kpis.hidden.slice();
    const has = bucket.includes(kpiId);
    if (enabled && !has) bucket.push(kpiId);
    if (!enabled && has) bucket.splice(bucket.indexOf(kpiId), 1);

    if (type === 'highlighted') state.kpis.highlighted = bucket;
    else state.kpis.hidden = bucket;

    updateResetVisibility();
    persistPrefs();
    if (typeof window.renderKPIs === 'function') window.renderKPIs();
    if (editorOpen) renderEditor();
  };

  window.openDashboardEditor = function() {
    const editor = document.getElementById('dashboardEditor');
    const backdrop = document.getElementById('dashboardEditorBackdrop');
    if (!editor || !backdrop) return;
    editorOpen = true;
    normalizeEditorCopy();
    renderEditor();
    backdrop.hidden = false;
    editor.classList.add('open');
    editor.setAttribute('aria-hidden', 'false');
  };

  window.closeDashboardEditor = function() {
    const editor = document.getElementById('dashboardEditor');
    const backdrop = document.getElementById('dashboardEditorBackdrop');
    if (!editor || !backdrop) return;
    editorOpen = false;
    backdrop.hidden = true;
    editor.classList.remove('open');
    editor.setAttribute('aria-hidden', 'true');
  };

  window.resetDashboardPersonalization = function() {
    window.resetLayout();
  };

  function renderEditor() {
    const panelList = document.getElementById('panelEditorList');
    const kpiList = document.getElementById('kpiEditorList');
    const themeList = document.getElementById('themeOptions');
    const gridList = document.getElementById('editorGridPreset');
    if (!panelList || !kpiList || !themeList || !gridList) return;
    normalizeEditorCopy();

    gridList.innerHTML = [
      { id: 'balanced', label: 'Equilibrado', note: 'Duas colunas com o mesmo peso.' },
      { id: 'emphasis', label: 'Com destaque', note: 'Coluna principal mais larga.' },
    ].map(item => `
      <button type="button" class="${state.gridPreset === item.id ? 'active' : ''}" onclick="setGridPreset('${item.id}')">
        <strong>${item.label}</strong>
        <span>${item.note}</span>
      </button>
    `).join('');

    themeList.innerHTML = THEME_PRESETS.map(theme => `
      <button type="button" class="theme-card ${state.themePreset === theme.id ? 'active' : ''}" data-theme="${theme.id}" onclick="setThemePreset('${theme.id}')">
        <div class="theme-swatches">${theme.swatches.map(color => `<span class="theme-swatch" style="background:${color}"></span>`).join('')}</div>
        <div><strong>${theme.label}</strong><span>${theme.note}</span></div>
        <span>${theme.id === 'default' ? 'Base' : 'Tema'}</span>
      </button>
    `).join('');

    panelList.innerHTML = getCurrentPanels().map(panel => `
      <div class="editor-card">
        <div>
          <strong>${(PANEL_DEFAULTS.find(item => item.id === panel.id) || panel).label}</strong>
          <span>${panel.visible ? 'Visivel no dashboard' : 'Oculto para este utilizador'}</span>
        </div>
        <div class="editor-card-controls">
          <button type="button" class="editor-chip ${panel.visible ? 'active' : ''}" onclick="updatePanelSetting('${panel.id}', { visible: ${panel.visible ? 'false' : 'true'} })">${panel.visible ? 'Mostrar' : 'Oculto'}</button>
          <button type="button" class="editor-chip ${panel.featured ? 'active' : ''}" onclick="updatePanelSetting('${panel.id}', { featured: ${panel.featured ? 'false' : 'true'} })">Destaque</button>
        </div>
      </div>
    `).join('');

    kpiList.innerHTML = KPI_DEFAULTS.map(kpi => `
      <div class="editor-card">
        <div>
          <strong>${kpi.label}</strong>
          <span>${state.kpis.hidden.includes(kpi.id) ? 'Oculto no topo do dashboard' : 'Visivel na faixa de KPIs'}</span>
        </div>
        <div class="editor-card-controls">
          <button type="button" class="editor-chip ${!state.kpis.hidden.includes(kpi.id) ? 'active' : ''}" onclick="updateKpiSetting('${kpi.id}', 'hidden', ${state.kpis.hidden.includes(kpi.id) ? 'false' : 'true'})">${state.kpis.hidden.includes(kpi.id) ? 'Oculto' : 'Mostrar'}</button>
          <button type="button" class="editor-chip ${state.kpis.highlighted.includes(kpi.id) ? 'active' : ''}" onclick="updateKpiSetting('${kpi.id}', 'highlighted', ${state.kpis.highlighted.includes(kpi.id) ? 'false' : 'true'})">${state.kpis.highlighted.includes(kpi.id) ? 'Destaque' : 'Normal'}</button>
        </div>
      </div>
    `).join('');
  }

  // ── KPI TREND DATA ──────────────────────────────────────────────
  const SERIES_DAYS = 14;
  const DAY_MS = 24 * 60 * 60 * 1000;
  let trendData = { tasks: [], comunicados: [], admissoes: [] };
  let trendLoaded = false;
  let trendLoading = false;

  function dayStartTs(ts) {
    const d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  function buildSeries(items, tsField, days) {
    const today = new Date();
    const startTs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - (days - 1) * DAY_MS;
    const buckets = new Array(days).fill(0);
    items.forEach(item => {
      const ts = item && item[tsField];
      if (!ts) return;
      const idx = Math.floor((dayStartTs(ts) - startTs) / DAY_MS);
      if (idx >= 0 && idx < days) buckets[idx]++;
    });
    return buckets;
  }

  function computeDelta(series) {
    if (!series || series.length < 14) return { value: null, pct: null };
    const recent = series.slice(7).reduce((a, b) => a + b, 0);
    const prior  = series.slice(0, 7).reduce((a, b) => a + b, 0);
    if (prior === 0) {
      if (recent === 0) return { value: 0, pct: 0 };
      return { value: recent, pct: null };
    }
    return { value: recent - prior, pct: ((recent - prior) / prior) * 100 };
  }

  function sparklineSVG(series) {
    if (!series || !series.length) return '';
    const W = 84, H = 26;
    const max = Math.max(1, ...series);
    const n = series.length;
    const xStep = W / (n - 1);
    const pts = series.map((v, i) => [i * xStep, H - (v / max) * (H - 4) - 2]);
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${line} L${W},${H} L0,${H} Z`;
    const dots = pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="1.1" class="kpi-spark-dot"/>`).join('');
    return `<svg class="kpi-spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="none" aria-hidden="true">`
      + `<path d="${area}" class="kpi-spark-area"/>`
      + `<path d="${line}" class="kpi-spark-line"/>`
      + dots
      + `</svg>`;
  }

  function deltaChip(delta, polarity) {
    if (delta.value === null) return '';
    if (delta.pct === null) {
      const sign = delta.value > 0 ? '+' : '';
      return `<span class="kpi-delta neutral" title="Sem actividade na semana anterior">${sign}${delta.value} esta sem.</span>`;
    }
    if (delta.pct === 0) {
      return `<span class="kpi-delta flat" title="Igual a semana anterior">= 0%</span>`;
    }
    const isUp = delta.pct > 0;
    let tone = 'neutral';
    if (polarity === 'good-up') tone = isUp ? 'good' : 'bad';
    else if (polarity === 'bad-up') tone = isUp ? 'bad' : 'good';
    const arrow = isUp ? '▲' : '▼';
    const pct = Math.abs(delta.pct);
    const pctStr = pct >= 100 ? '' + Math.round(pct) : pct < 10 ? pct.toFixed(1) : '' + Math.round(pct);
    const sign = isUp ? '+' : '-';
    return `<span class="kpi-delta ${tone}" title="${sign}${Math.abs(delta.value)} novas vs semana anterior">${arrow} ${pctStr}%</span>`;
  }

  async function loadKpiTrendData() {
    if (trendLoading || trendLoaded) return;
    trendLoading = true;
    const db = firebase.firestore();
    const since = Date.now() - SERIES_DAYS * DAY_MS;
    try {
      const [tT, tC, tA] = await Promise.all([
        db.collection('tarefas_todo').where('criadaEm', '>=', since).get().catch(() => ({ docs: [] })),
        db.collection('comunicados').where('criadoEm', '>=', since).get().catch(() => ({ docs: [] })),
        db.collection('admissoes').where('criadoEm', '>=', since).get().catch(() => ({ docs: [] })),
      ]);
      trendData = {
        tasks: tT.docs.map(d => ({ id: d.id, ...d.data() })),
        comunicados: tC.docs.map(d => ({ id: d.id, ...d.data() })),
        admissoes: tA.docs.map(d => ({ id: d.id, ...d.data() })),
      };
      trendLoaded = true;
      if (typeof window.renderKPIs === 'function') window.renderKPIs();
    } catch (e) {
      console.warn('[dashboard-customizer] Falha a carregar tendencia KPI:', e);
    } finally {
      trendLoading = false;
    }
  }

  window.renderKPIs = function() {
    const filtT = (escritorioAtivoDash && escritorioAtivoDash !== 'todos')
      ? tasks.filter(t => matchEscritorioDoc(t, escritorioAtivoDash))
      : tasks;
    const filtC = (escritorioAtivoDash && escritorioAtivoDash !== 'todos')
      ? comunicados.filter(c => matchComunicadoEscritorioDash(c, escritorioAtivoDash))
      : comunicados;
    const filtA = (escritorioAtivoDash && escritorioAtivoDash !== 'todos')
      ? admissoes.filter(a => matchEscritorioDoc(a, escritorioAtivoDash))
      : admissoes;

    const activas = filtT.filter(t => t.estado !== 'concluido' && t.estado !== 'cancelado');
    const values = {
      activas:     { value: activas.length, sub: `${tasks.length} no total` },
      urgentes:    { value: activas.filter(t => t.prioridade === 'urgente').length, sub: 'requerem atencao' },
      progresso:   { value: activas.filter(t => t.estado === 'progresso').length, sub: 'a ser trabalhadas' },
      pendentes:   { value: activas.filter(t => t.estado === 'pendente').length, sub: 'aguardam resposta' },
      concluidas:  { value: filtT.filter(t => t.estado === 'concluido').length, sub: 'total historico' },
      comunicados: { value: filtC.filter(c => !c.arquivado).length, sub: 'activos' },
      admissoes:   { value: filtA.filter(a => a.estado !== 'concluido' && a.estado !== 'cancelado').length, sub: 'em processamento' },
    };

    const trendForKpi = (kpi) => {
      const raw = trendData[kpi.source] || [];
      const byOffice = (escritorioAtivoDash && escritorioAtivoDash !== 'todos')
        ? raw.filter(it => kpi.source === 'comunicados'
            ? matchComunicadoEscritorioDash(it, escritorioAtivoDash)
            : matchEscritorioDoc(it, escritorioAtivoDash))
        : raw;
      return kpi.filter ? byOffice.filter(kpi.filter) : byOffice;
    };

    const visible = state.kpis.order
      .map(id => KPI_DEFAULTS.find(item => item.id === id))
      .filter(Boolean)
      .filter(kpi => !state.kpis.hidden.includes(kpi.id));

    const row = document.getElementById('kpiRow');
    if (!row) return;

    row.innerHTML = visible.map(kpi => {
      const series = buildSeries(trendForKpi(kpi), kpi.tsField, SERIES_DAYS);
      const delta  = computeDelta(series);
      const spark  = trendLoaded ? sparklineSVG(series) : '<span class="kpi-spark-placeholder"></span>';
      const chip   = trendLoaded ? deltaChip(delta, kpi.polarity) : '';
      const highlighted = state.kpis.highlighted.includes(kpi.id) ? 'kpi-highlighted' : '';
      return `
        <div class="kpi-card ${kpi.className} ${highlighted}">
          <div class="kpi-card-head">
            <div class="kpi-lbl">${kpi.label}</div>
            ${spark}
          </div>
          <div class="kpi-val-row">
            <div class="kpi-val">${values[kpi.id].value}</div>
            ${chip}
          </div>
          <div class="kpi-sub">${values[kpi.id].sub}</div>
        </div>
      `;
    }).join('');

    if (!trendLoaded && !trendLoading) {
      loadKpiTrendData();
    }
  };

  document.addEventListener('authReady', ({ detail }) => {
    state = getPrefs(window.userProfile || detail.profile || {});
    normalizeEditorCopy();
    applyThemePreset(state.themePreset);
    applyGridPreset(state.gridPreset);
    window.applyLayout(state.panels);
    updateResetVisibility();
    renderEditor();
    if (typeof window.renderKPIs === 'function') window.renderKPIs();
  });
})();
