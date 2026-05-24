(function() {
  const state = {
    clientes: [],
    filtered: [],
    selectedId: '',
    view: 'tabela',        // 'tabela' | 'cards'
    activeTab: 'detalhe',  // 'detalhe' | 'precos' | 'historico'
    canImport: false,
    canEdit: false,
    canPropose: false,
    preview: null,
    importBusy: false,
    saveBusy: false,
    editMode: null,   // null | 'cliente' | 'precos' | 'proposta'
    editData: null,
    viewAno: null,    // ano selecionado na aba Preços (null = precosAtuais)
    visibleCount: 20, // quantos clientes estão renderizados (paginação DOM)
    expandedPropostas: new Set(),  // índices de propostas expandidas
    expandedHistorico: new Set(),  // índices de eventos de histórico expandidos
  };

  const dom = {};

  // ---- DOM CACHE ----

  function cacheDom() {
    dom.clientesList   = document.getElementById('clientesList');
    dom.clienteDetail  = document.getElementById('clienteDetail');
    dom.drawerOverlay  = document.getElementById('drawerOverlay');
    dom.clientsCount   = document.getElementById('clientsCountLabel');
    dom.filterSearch   = document.getElementById('filterSearch');
    dom.filterOffice   = document.getElementById('filterOffice');
    dom.filterStatus   = document.getElementById('filterStatus');
    dom.viewBtnTabela  = document.getElementById('viewBtnTabela');
    dom.viewBtnCards   = document.getElementById('viewBtnCards');
    dom.novoClienteBtn     = document.getElementById('btnNovoCliente');
    dom.novoClienteModal   = document.getElementById('novoClienteModalOverlay');
    dom.importBtn          = document.getElementById('btnImportExcel');
    dom.formatoBtn         = document.getElementById('btnFormatoExcel');
    dom.formatoModal       = document.getElementById('formatoModalOverlay');
    dom.anoImportModal     = document.getElementById('anoImportModalOverlay');
    dom.anoImportSelect    = document.getElementById('importAnoVigencia');
    dom.importDropzone     = document.getElementById('importDropzone');
    dom.importFile         = document.getElementById('clientesImportFile');
    dom.importBusy         = document.getElementById('importBusyState');
    dom.importPreview      = document.getElementById('importPreviewWrap');
    dom.importHint         = document.getElementById('importPermissionHint');
  }

  // ---- HELPERS ----

  function formatMoney(value) {
    if (value == null || !Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: value % 1 ? 2 : 0,
      maximumFractionDigits: 4,
    }).format(value);
  }

  function normText(value) {
    return String(value == null ? '' : value)
      .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  function parseNumInput(val) {
    const n = parseFloat(String(val == null ? '' : val).replace(',', '.').trim());
    return Number.isFinite(n) ? n : null;
  }

  function lastRevision(cliente) {
    const r = Array.isArray(cliente && cliente.revisoes) ? cliente.revisoes : [];
    return r.length ? r[r.length - 1] : null;
  }

  function hasPrices(cliente) {
    return !!(cliente && cliente.precosAtuais && Object.keys(cliente.precosAtuais).length);
  }

  function getSelected() {
    return state.filtered.find(c => c.id === state.selectedId)
      || state.clientes.find(c => c.id === state.selectedId)
      || null;
  }

  function getAvatarInitials(c) {
    const name = c.nome || '';
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return '?';
  }

  async function audit(acao, docId, titulo) {
    if (typeof window.registarAuditoria !== 'function') return;
    try { await window.registarAuditoria({ modulo: 'clientes', acao, docId, titulo }); } catch (_) {}
  }

  // ---- PERMISSIONS ----

  function updatePermissions() {
    const check = p => typeof window.temPermissao === 'function' && window.temPermissao(p);
    const isAdmin = typeof window.isAdmin === 'function' && window.isAdmin();
    state.canImport  = check('modules.clientes.import');
    state.canEdit    = check('modules.clientes.edit');
    state.canPropose = check('modules.clientes.propose');

    // Novo cliente — utilizadores com permissão de edição
    if (dom.novoClienteBtn) dom.novoClienteBtn.hidden = !state.canEdit;
    // Importação e formato — apenas administradores
    if (dom.importBtn)   dom.importBtn.hidden   = !isAdmin;
    if (dom.formatoBtn)  dom.formatoBtn.hidden  = !isAdmin;
  }

  // ---- MODAL NOVO CLIENTE ----

  function openNovoClienteModal() {
    // Preencher select de escritórios
    const sel = document.getElementById('novoClienteEscritorio');
    if (sel) {
      const escritorios = typeof window.getEscritoriosSync === 'function'
        ? window.getEscritoriosSync().filter(e => e.ativo !== false)
        : [];
      sel.innerHTML = '<option value="">— Sem escritório —</option>' +
        escritorios.map(e => `<option value="${window.escHtml(e.id)}">${window.escHtml(e.nome)}</option>`).join('');
    }
    // Limpar campos
    ['novoClienteNome','novoClienteNumero','novoClienteGrupo','novoClienteObs'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const btn = document.getElementById('novoClienteSaveBtn');
    if (btn) btn.disabled = false;
    if (dom.novoClienteModal) dom.novoClienteModal.classList.add('open');
    setTimeout(() => document.getElementById('novoClienteNome')?.focus(), 80);
  }

  function closeNovoClienteModal() {
    if (dom.novoClienteModal) dom.novoClienteModal.classList.remove('open');
  }

  async function saveNovoCliente() {
    const nome = (document.getElementById('novoClienteNome')?.value || '').trim();
    if (!nome) { window.toast('O nome é obrigatório.'); document.getElementById('novoClienteNome')?.focus(); return; }

    const btn = document.getElementById('novoClienteSaveBtn');
    if (btn) btn.disabled = true;

    try {
      const id = await window.ClientesService.criarCliente({
        nome,
        numeroCliente: (document.getElementById('novoClienteNumero')?.value || '').trim(),
        grupo:         (document.getElementById('novoClienteGrupo')?.value  || '').trim(),
        escritorioOrigem: (document.getElementById('novoClienteEscritorio')?.value || '').trim(),
        obs:           (document.getElementById('novoClienteObs')?.value    || '').trim(),
      });
      await audit('criado', id, nome);
      closeNovoClienteModal();
      window.toast('Cliente criado.');
      // Abrir o drawer do novo cliente
      state.selectedId = id;
      state.activeTab  = 'detalhe';
    } catch (err) {
      console.error(err);
      window.toast(err.message || 'Erro ao criar cliente.');
      if (btn) btn.disabled = false;
    }
  }

  // ---- MODAL FORMATO ----

  function openFormatoModal() {
    if (dom.formatoModal) dom.formatoModal.classList.add('open');
  }

  function closeFormatoModal() {
    if (dom.formatoModal) dom.formatoModal.classList.remove('open');
  }

  // ---- MODAL ANO IMPORT ----

  function _populateAnoSelect() {
    if (!dom.anoImportSelect) return;
    const cur = new Date().getFullYear();
    dom.anoImportSelect.innerHTML = '<option value="">Não especificar</option>' +
      [cur - 1, cur, cur + 1].map(y =>
        `<option value="${y}"${y === cur ? ' selected' : ''}>${y}</option>`
      ).join('');
  }

  function openAnoImportModal() {
    _populateAnoSelect();
    if (dom.anoImportModal) dom.anoImportModal.classList.add('open');
  }

  function closeAnoImportModal() {
    if (dom.anoImportModal) dom.anoImportModal.classList.remove('open');
  }

  function cancelImportAno() {
    closeAnoImportModal();
    state.preview = null;
    dom.importFile.value = '';
    dom.importPreview.innerHTML = '';
  }

  async function confirmImportAno() {
    if (!state.preview || !state.canImport) return;
    const anoVigencia = dom.anoImportSelect ? (Number(dom.anoImportSelect.value) || null) : null;
    closeAnoImportModal();
    try {
      setImportBusy(true);
      const result = await window.ClientesService.applyImport(state.preview, { anoVigencia });
      await audit('importado', 'import-' + result.importedAt, result.sourceFile);
      state.preview = null;
      dom.importFile.value = '';
      dom.importPreview.innerHTML = '';
      window.toast('Importação concluída' + (anoVigencia ? ` (${anoVigencia})` : '') + '.');
    } catch (err) {
      console.error(err);
      window.toast(err.message || 'Erro ao aplicar a importação.');
    } finally {
      setImportBusy(false);
    }
  }

  // ---- IMPORT ----

  function setImportBusy(v) {
    state.importBusy = !!v;
    dom.importBusy.hidden = !v;
  }

  async function handleImportFile(file) {
    if (!state.canImport) return;
    try {
      setImportBusy(true);
      state.preview = await window.ClientesService.previewImport(file);
      renderImportPreview();
      window.toast('Preview de importação pronto.');
    } catch (err) {
      console.error(err);
      state.preview = null;
      dom.importPreview.innerHTML = '';
      window.toast(err.message || 'Erro ao analisar o ficheiro.');
    } finally {
      setImportBusy(false);
    }
  }

  function confirmImport() {
    // Mostra modal de ano antes de aplicar
    if (!state.preview || !state.canImport) return;
    openAnoImportModal();
  }

  function cancelImportPreview() {
    state.preview = null;
    dom.importFile.value = '';
    dom.importPreview.innerHTML = '';
  }

  function renderImportPreview() {
    if (!state.preview) { dom.importPreview.innerHTML = ''; return; }

    const s = state.preview.summary;
    const itemsHtml = state.preview.clients.slice(0, 10).map(item => `
      <div class="clientes-preview-row">
        <div class="clientes-preview-copy">
          <div class="clientes-preview-title">${window.escHtml(item.nome)}</div>
          <div class="clientes-preview-sub">
            ${item.numeroCliente ? 'Nº ' + window.escHtml(item.numeroCliente) + ' · ' : ''}
            ${window.escHtml(item.grupo || 'Sem grupo')}
            ${item.escritorioOrigem ? ' · ' + window.escHtml(item.escritorioOrigem) : ''}
            · ${item.summary.totalCategorias} categoria${item.summary.totalCategorias !== 1 ? 's' : ''}
          </div>
        </div>
        <span class="clientes-preview-badge ${item.isAmbiguous ? 'warning' : item.isExisting ? 'update' : 'new'}">
          ${item.isBlocked ? 'Bloqueado' : item.isExisting ? 'Atualizar' : 'Novo'}
        </span>
      </div>`).join('');

    const notes = []
      .concat(state.preview.ignoredRows.slice(0, 6).map(r => 'Linha ' + r.rowNumber + ': ' + r.reason))
      .concat(state.preview.clients.flatMap(c => c.warnings).slice(0, 6));

    dom.importPreview.innerHTML = `
      <div class="clientes-import-preview">
        <div class="clientes-import-grid">
          <div class="clientes-preview-block">
            <div class="clientes-preview-head">
              <div>
                <h3>${window.escHtml(state.preview.fileName)}</h3>
                <p>Folha <strong>${window.escHtml(state.preview.sourceSheet)}</strong> · ${s.totalCategorias} linhas agrupadas em ${s.totalClientes} clientes.</p>
              </div>
              <span class="clientes-soft-badge">Preview</span>
            </div>
            <div class="clientes-preview-list">
              ${itemsHtml || '<div class="clientes-preview-note">Sem clientes válidos para importar.</div>'}
            </div>
            ${state.preview.clients.length > 10 ? `<p class="clientes-empty-note" style="margin-top:10px;">+${state.preview.clients.length - 10} cliente(s) no total.</p>` : ''}
          </div>
          <div class="clientes-preview-block">
            <div class="clientes-preview-head"><div><h3>Resumo</h3><p>Confirma o impacto antes de gravar.</p></div></div>
            <div class="clientes-history-tags" style="margin-top:0;">
              <span class="clientes-status-badge new">${s.novos} novos</span>
              <span class="clientes-status-badge update">${s.existentes} atualizações</span>
              <span class="clientes-status-badge warning">${s.ambiguos} ambíguos</span>
              <span class="clientes-soft-badge">${s.bloqueados} bloqueados</span>
              <span class="clientes-soft-badge">${s.linhasIgnoradas} linhas ignoradas</span>
            </div>
            <div class="clientes-preview-notes" style="margin-top:12px;">
              ${(notes.length ? notes : ['Sem avisos relevantes.']).map(n => `<div class="clientes-preview-note">${window.escHtml(n)}</div>`).join('')}
            </div>
          </div>
        </div>
        <div class="clientes-import-actions">
          <button class="btn btn-secondary" type="button" onclick="window.ClientesPage.cancelImportPreview()">Limpar preview</button>
          <button class="btn btn-primary" type="button" onclick="window.ClientesPage.confirmImport()" ${state.preview.clients.some(c => !c.isBlocked) ? '' : 'disabled'}>Confirmar importação</button>
        </div>
      </div>`;
  }

  // ---- FILTERS ----

  function bindFilters() {
    dom.filterSearch.addEventListener('input', () => { state.visibleCount = 20; render(); });
    dom.filterOffice.addEventListener('change', () => { state.visibleCount = 20; render(); });
    dom.filterStatus.addEventListener('change', () => { state.visibleCount = 20; render(); });

    dom.viewBtnTabela.addEventListener('click', () => setView('tabela'));
    dom.viewBtnCards.addEventListener('click', () => setView('cards'));

    dom.importFile.addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0];
      if (file) await handleImportFile(file);
    });

    ['dragenter', 'dragover'].forEach(ev => {
      dom.importDropzone.addEventListener(ev, e => {
        e.preventDefault();
        if (state.canImport) dom.importDropzone.classList.add('drag');
      });
    });

    ['dragleave', 'drop'].forEach(ev => {
      dom.importDropzone.addEventListener(ev, e => {
        e.preventDefault();
        dom.importDropzone.classList.remove('drag');
      });
    });

    dom.importDropzone.addEventListener('drop', async e => {
      if (!state.canImport) return;
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) await handleImportFile(file);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && dom.drawerOverlay && !dom.drawerOverlay.hidden) {
        closeDetail();
      }
    });
  }

  function setView(v) {
    state.view = v;
    dom.viewBtnTabela.classList.toggle('active', v === 'tabela');
    dom.viewBtnCards.classList.toggle('active', v === 'cards');
    renderList();
  }

  function getFiltered() {
    const search = normText(dom.filterSearch.value);
    const office = dom.filterOffice.value;
    const status = dom.filterStatus.value;

    return state.clientes.filter(c => {
      if (office && (c.escritorioOrigem || '') !== office) return false;
      if (status === 'com-precos' && !hasPrices(c)) return false;
      if (status === 'sem-precos' && hasPrices(c)) return false;
      if (!search) return true;
      return [c.nome, c.numeroCliente, c.grupo, c.escritorioOrigem].map(normText).join(' ').includes(search);
    });
  }

  function renderOfficeOptions() {
    const cur = dom.filterOffice.value;
    const offices = Array.from(new Set(state.clientes.map(c => c.escritorioOrigem).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'pt-PT'));

    dom.filterOffice.innerHTML = '<option value="">Todos os escritórios</option>'
      + offices.map(o => `<option value="${window.escHtml(o)}">${window.escHtml(o)}</option>`).join('');

    if (offices.includes(cur)) dom.filterOffice.value = cur;
  }

  // ---- RENDER LIST ----

  function renderList() {
    dom.clientsCount.textContent = `${state.filtered.length} cliente${state.filtered.length !== 1 ? 's' : ''} visível${state.filtered.length !== 1 ? 'is' : ''}`;

    if (!state.filtered.length) {
      dom.clientesList.innerHTML = `
        <div class="cli-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M4 7h16M4 12h16M4 17h10"/><rect x="3" y="4" width="18" height="16" rx="2"/></svg>
          <div class="empty-title">Nenhum cliente encontrado</div>
          <div class="empty-sub">Ajusta os filtros ou importa um ficheiro Excel para começar.</div>
        </div>`;
      return;
    }

    if (state.view === 'cards') {
      renderCards();
    } else {
      renderTable();
    }
  }

  function anoBadgeHtml(c) {
    const ano = c.anoVigenciaAtual;
    if (!ano) return '<span class="cli-muted">—</span>';
    const anoAtual = new Date().getFullYear();
    const cls = ano < anoAtual ? 'warning' : ano === anoAtual ? 'new' : 'update';
    return `<span class="clientes-status-badge ${cls}">${ano}</span>`;
  }

  function loadMore() {
    state.visibleCount += 20;
    renderList();
  }

  function renderTable() {
    const visible = state.filtered.slice(0, state.visibleCount);
    const remaining = state.filtered.length - visible.length;

    const rows = visible.map(c => {
      const priceCount = Object.keys(c.precosAtuais || {}).length;
      const initials = getAvatarInitials(c);
      const isActive = c.id === state.selectedId;
      return `
        <tr class="cli-row${isActive ? ' active' : ''}" data-id="${window.escHtml(c.id)}">
          <td>
            <div class="cli-cell-name">
              <div class="cli-avatar empresa">${window.escHtml(initials)}</div>
              <div style="min-width:0;">
                <div class="cli-name">${window.escHtml(c.nome || 'Sem nome')}</div>
                ${c.numeroCliente ? `<div class="cli-sub">Nº ${window.escHtml(c.numeroCliente)}</div>` : ''}
              </div>
            </div>
          </td>
          <td><span class="cli-muted">${window.escHtml(c.grupo || '—')}</span></td>
          <td>${c.escritorioOrigem ? `<span class="clientes-soft-badge">${window.escHtml(c.escritorioOrigem)}</span>` : '<span class="cli-muted">—</span>'}</td>
          <td><span class="cli-muted">${priceCount}</span></td>
          <td>${anoBadgeHtml(c)}</td>
          <td><span class="cli-tnum">${c.updatedAt ? window.fmtDataHora(c.updatedAt) : '—'}</span></td>
        </tr>`;
    }).join('');

    const loadMoreBtn = remaining > 0
      ? `<div class="cli-load-more">
           <button class="btn btn-secondary btn-sm" onclick="window.ClientesPage.loadMore()">
             Carregar mais ${remaining} cliente${remaining !== 1 ? 's' : ''}
           </button>
         </div>`
      : '';

    dom.clientesList.innerHTML = `
      <div class="cli-table-wrap">
        <table class="cli-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Grupo</th>
              <th>Escritório</th>
              <th>Categorias</th>
              <th>Ano vigência</th>
              <th>Preços atualizados</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${loadMoreBtn}`;

    dom.clientesList.querySelectorAll('[data-id]').forEach(row => {
      row.addEventListener('click', () => openDetail(row.getAttribute('data-id')));
    });
  }

  function renderCards() {
    const visible = state.filtered.slice(0, state.visibleCount);
    const remaining = state.filtered.length - visible.length;

    const cards = visible.map(c => {
      const priceCount = Object.keys(c.precosAtuais || {}).length;
      const initials = getAvatarInitials(c);
      const isActive = c.id === state.selectedId;
      return `
        <article class="cli-card${isActive ? ' active' : ''}" data-id="${window.escHtml(c.id)}">
          <div class="cli-card-head">
            <div class="cli-avatar lg empresa">${window.escHtml(initials)}</div>
            ${anoBadgeHtml(c)}
          </div>
          <div class="cli-card-name">${window.escHtml(c.nome || 'Sem nome')}</div>
          ${c.grupo ? `<div class="cli-card-sub">${window.escHtml(c.grupo)}</div>` : ''}
          <div class="cli-card-stats">
            <div>
              <div class="cli-stat-lbl">Categorias</div>
              <div style="font-weight:700;font-size:15px;">${priceCount}</div>
            </div>
            <div>
              <div class="cli-stat-lbl">Escritório</div>
              <div style="font-size:11.5px;font-weight:500;">${window.escHtml(c.escritorioOrigem || '—')}</div>
            </div>
            <div>
              <div class="cli-stat-lbl">Atualizado</div>
              <div class="cli-tnum">${c.updatedAt ? window.fmtDataHora(c.updatedAt) : '—'}</div>
            </div>
          </div>
          ${c.numeroCliente ? `<div class="cli-card-foot"><span>Nº ${window.escHtml(c.numeroCliente)}</span></div>` : ''}
        </article>`;
    }).join('');

    const loadMoreBtn = remaining > 0
      ? `<div class="cli-load-more">
           <button class="btn btn-secondary btn-sm" onclick="window.ClientesPage.loadMore()">
             Carregar mais ${remaining} cliente${remaining !== 1 ? 's' : ''}
           </button>
         </div>`
      : '';

    dom.clientesList.innerHTML = `<div class="cli-grid">${cards}</div>${loadMoreBtn}`;

    dom.clientesList.querySelectorAll('[data-id]').forEach(card => {
      card.addEventListener('click', () => openDetail(card.getAttribute('data-id')));
    });
  }

  // ---- DRAWER ----

  function openDetail(id) {
    state.selectedId = id;
    state.editMode = null;
    state.editData = null;
    state.activeTab = 'detalhe';
    dom.drawerOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
    renderDetail();
    // Highlight active item in list
    document.querySelectorAll('[data-id]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-id') === id);
    });
  }

  function closeDetail() {
    state.selectedId = '';
    state.editMode = null;
    state.editData = null;
    dom.drawerOverlay.hidden = true;
    document.body.style.overflow = '';
    document.querySelectorAll('[data-id]').forEach(el => el.classList.remove('active'));
  }

  function switchDetailTab(tab) {
    state.activeTab = tab;
    state.viewAno = null;
    state.expandedPropostas.clear();
    state.expandedHistorico.clear();
    renderDetail();
  }

  function setViewAno(ano) {
    state.viewAno = ano;
    renderDetail();
  }

  // ---- RENDER DETAIL ----

  function renderDetail() {
    const c = getSelected();
    if (!c) { closeDetail(); return; }

    if (state.editMode === 'cliente') { renderEditCliente(c); return; }
    if (state.editMode === 'precos')  { renderEditPrecos(); return; }
    if (state.editMode === 'proposta') { renderNovaProposta(); return; }

    const tab = state.activeTab || 'detalhe';
    const initials = getAvatarInitials(c);
    const priceEntries = Object.values(c.precosAtuais || {})
      .sort((a, b) => String(a.categoria || '').localeCompare(String(b.categoria || ''), 'pt-PT'));
    const allRevs = c.revisoes || [];
    const proposals = allRevs.map((r, i) => ({ ...r, _idx: i })).filter(r => r.tipo === 'proposta').reverse();
    const allEvents = allRevs.map((r, i) => ({ ...r, _idx: i })).slice().reverse();
    const rev = lastRevision(c);

    let tabContent = '';

    if (tab === 'detalhe') {
      tabContent = `
        <div class="cli-kpis">
          <div>
            <div class="cli-kpi-lbl">Categorias</div>
            <div class="cli-kpi-val">${priceEntries.length || '0'}</div>
          </div>
          <div>
            <div class="cli-kpi-lbl">Revisões</div>
            <div class="cli-kpi-val">${allRevs.length}</div>
          </div>
          <div>
            <div class="cli-kpi-lbl">Propostas</div>
            <div class="cli-kpi-val">${proposals.length}</div>
          </div>
        </div>
        <div class="cli-info-block">
          <div class="cli-info-label">Informação geral</div>
          <div class="cli-info-grid">
            ${c.numeroCliente ? `<div><span class="cli-info-key">Nº cliente</span><span>${window.escHtml(c.numeroCliente)}</span></div>` : ''}
            ${c.grupo ? `<div><span class="cli-info-key">Grupo</span><span>${window.escHtml(c.grupo)}</span></div>` : ''}
            ${c.escritorioOrigem ? `<div><span class="cli-info-key">Escritório</span><span>${window.escHtml(c.escritorioOrigem)}</span></div>` : ''}
            ${c.updatedAt ? `<div><span class="cli-info-key">Preços atualizados</span><span>${window.fmtDataHora(c.updatedAt)}</span></div>` : ''}
            ${c.ultimaPropostaData || (rev && rev.propostaDataRaw) ? `<div><span class="cli-info-key">Data proposta</span><span>${window.escHtml(c.ultimaPropostaData || (rev && rev.propostaDataRaw) || '—')}</span></div>` : ''}
          </div>
        </div>
        ${c.obs ? `
          <div class="clientes-preview-note">
            <strong style="display:block;margin-bottom:4px;color:var(--text);">Observações</strong>
            ${window.escHtml(c.obs)}
          </div>` : ''}`;
    }

    else if (tab === 'precos') {
      // ── Selector de ano ──────────────────────────────────────
      const precosPorAno = c.precosPorAno || {};
      const anosDisponiveis = Object.keys(precosPorAno).map(Number).sort((a, b) => a - b);
      const anoAtual = c.anoVigenciaAtual || null;
      const viewingAno = state.viewAno; // null = precosAtuais

      // Preços a mostrar: do ano selecionado ou precosAtuais
      let viewEntries;
      if (viewingAno && precosPorAno[String(viewingAno)]) {
        viewEntries = Object.values(precosPorAno[String(viewingAno)])
          .sort((a, b) => String(a.categoria || '').localeCompare(String(b.categoria || ''), 'pt-PT'));
      } else {
        viewEntries = priceEntries;
      }
      const isViewingCurrent = !viewingAno || viewingAno === anoAtual;

      // Selector de ano (só aparece se houver histórico por ano)
      const anoSelectorHtml = anosDisponiveis.length > 0 ? `
        <div class="cli-ano-selector">
          ${anosDisponiveis.map(a => `
            <button class="cli-ano-btn${viewingAno === a ? ' active' : ''}"
              onclick="window.ClientesPage.setViewAno(${a})">${a}</button>`).join('')}
          <button class="cli-ano-btn${isViewingCurrent ? ' active' : ''}"
            onclick="window.ClientesPage.setViewAno(null)">
            ${anoAtual || 'Atual'} <span class="cli-ano-current-dot"></span>
          </button>
        </div>` : '';

      const pricesTable = viewEntries.length
        ? `<div class="clientes-prices-wrap">
             <table class="clientes-prices-table">
               <thead><tr><th>Categoria profissional</th><th>Valor/Hora</th><th>Valor/Mês</th></tr></thead>
               <tbody>
                 ${viewEntries.map(p => `
                   <tr>
                     <td>
                       <span class="clientes-price-main">${window.escHtml(p.categoria || '—')}</span>
                       ${p.obsLinha ? `<span class="clientes-price-sub">${window.escHtml(p.obsLinha)}</span>` : ''}
                     </td>
                     <td>${formatMoney(p.precoHora)}</td>
                     <td>${formatMoney(p.preco22Dias)}</td>
                   </tr>`).join('')}
               </tbody>
             </table>
           </div>`
        : `<div class="clientes-empty-note">${isViewingCurrent && state.canEdit ? 'Ainda sem preços. Clica em "Editar" para adicionar.' : 'Sem preços registados para este ano.'}</div>`;

      tabContent = `
        <section class="clientes-section">
          <div class="clientes-section-head">
            <h3>Preços${viewingAno && !isViewingCurrent ? ` <span class="clientes-soft-badge" style="margin-left:6px;">${viewingAno}</span>` : ''}</h3>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="clientes-soft-badge">${viewEntries.length} cat.</span>
              ${isViewingCurrent && state.canEdit ? `<button class="btn btn-secondary btn-sm" type="button" onclick="window.ClientesPage.enterEditPrecos()">Editar</button>` : ''}
            </div>
          </div>
          ${anoSelectorHtml}
          ${pricesTable}
        </section>`;
    }

    else if (tab === 'propostas') {
      const propostasHtml = proposals.length
        ? `<div class="clientes-history-list">
             ${proposals.map(p => {
               const isRevisao = !!p.parentReferencia;
               const versao = Number(p.versao) || 1;
               const isOpen = state.expandedPropostas.has(p._idx);
               const nCat = Array.isArray(p.linhas) ? p.linhas.length : 0;
               return `
              <article class="clientes-history-item clientes-collapsible${isRevisao ? ' is-revisao' : ''}${isOpen ? ' is-open' : ''}">
                <div class="clientes-history-item-head clientes-collapsible-trigger" onclick="window.ClientesPage.toggleProposta(${p._idx})">
                  <div class="clientes-collapsible-chevron">
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 7l3 3 3-3"/></svg>
                  </div>
                  <div style="flex:1;min-width:0;">
                    <h4>${window.escHtml(p.referencia || p.nomeProposta || 'Proposta sem nome')}${versao > 1 ? ` <span class="clientes-soft-badge" style="margin-left:6px;">v${versao}</span>` : ''}${p.anoVigencia ? ` <span class="clientes-soft-badge" style="margin-left:6px;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);">${p.anoVigencia}</span>` : ''}</h4>
                    <p>${window.fmtDataHora(p.importedAt)} · ${window.escHtml(p.importedByName || 'Desconhecido')}${p.propostaDataRaw ? ' · ' + window.escHtml(p.propostaDataRaw) : ''}</p>
                    ${isRevisao ? `<p style="margin-top:2px;font-size:11px;color:var(--text-3);">Revisão de <strong>${window.escHtml(p.parentReferencia)}</strong></p>` : ''}
                  </div>
                  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
                    <span class="clientes-soft-badge">${nCat} cat.</span>
                    ${p.aplicada
                      ? '<span class="clientes-status-badge new">Aplicada</span>'
                      : (state.canEdit ? `<button class="btn btn-secondary btn-sm" type="button" onclick="event.stopPropagation();window.ClientesPage.aplicarProposta(${p._idx})">Aplicar</button>` : '')}
                  </div>
                </div>
                ${isOpen ? `
                <div class="clientes-collapsible-body">
                  ${p.nota ? `<p style="margin-bottom:8px;font-size:12px;color:var(--text-2);">${window.escHtml(p.nota)}</p>` : ''}
                  <div class="clientes-history-actions">
                    ${state.canPropose ? `<button class="btn btn-ghost btn-sm" type="button" onclick="window.ClientesPage.reabrirProposta(${p._idx})">Re-abrir</button>` : ''}
                    ${state.canPropose ? `<button class="btn btn-ghost btn-sm" type="button" onclick="window.ClientesPage.criarRevisao(${p._idx})">↪ Criar revisão</button>` : ''}
                  </div>
                  ${nCat ? `
                  <div class="clientes-proposal-preview">
                    <table class="clientes-prices-table">
                      <thead><tr><th>Categoria profissional</th><th>Valor/Hora</th><th>Valor/Mês</th></tr></thead>
                      <tbody>
                        ${p.linhas.map(l => `
                          <tr>
                            <td>${window.escHtml(l.categoria || '—')}</td>
                            <td>${formatMoney(l.precoHora)}</td>
                            <td>${formatMoney(l.preco22Dias)}</td>
                          </tr>`).join('')}
                      </tbody>
                    </table>
                  </div>` : '<p class="clientes-empty-note" style="margin-top:8px;">Sem categorias de preços.</p>'}
                </div>` : ''}
              </article>`;
             }).join('')}
           </div>`
        : `<div class="clientes-empty-note">Ainda sem propostas. ${state.canPropose ? 'Clica em <strong>Nova proposta</strong> para criar uma.' : ''}</div>`;

      tabContent = `
        <section class="clientes-section">
          <div class="clientes-section-head">
            <h3>Propostas</h3>
            <span class="clientes-soft-badge">${proposals.length} ${proposals.length === 1 ? 'proposta' : 'propostas'}</span>
          </div>
          ${propostasHtml}
        </section>`;
    }

    else if (tab === 'historico') {
      const eventLabel = (r) => {
        switch (r.tipo) {
          case 'proposta':       return { label: 'Proposta', cls: 'update' };
          case 'importacao':     return { label: 'Importação Excel', cls: 'new' };
          case 'edicao-manual':  return { label: 'Edição manual', cls: 'warning' };
          default:               return { label: r.tipo || 'Evento', cls: '' };
        }
      };
      const historyHtml = allEvents.length
        ? `<div class="clientes-history-list">
             ${allEvents.map(r => {
               const ev = eventLabel(r);
               const subtitle = r.tipo === 'proposta'
                 ? (r.referencia || r.nomeProposta || 'Proposta sem nome')
                 : (r.sourceFile || 'Sem ficheiro');
               const nCat = Array.isArray(r.linhas) ? r.linhas.length : 0;
               const isOpen = state.expandedHistorico.has(r._idx);
               return `
               <article class="clientes-history-item clientes-collapsible${isOpen ? ' is-open' : ''}">
                 <div class="clientes-history-item-head clientes-collapsible-trigger" onclick="window.ClientesPage.toggleHistorico(${r._idx})">
                   <div class="clientes-collapsible-chevron">
                     <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 7l3 3 3-3"/></svg>
                   </div>
                   <div style="flex:1;min-width:0;">
                     <h4>${window.escHtml(subtitle)}${r.aplicada ? ' <span class="clientes-status-badge new" style="margin-left:6px;">Aplicada</span>' : ''}${r.anoVigencia ? ` <span class="clientes-soft-badge" style="margin-left:6px;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);">${r.anoVigencia}</span>` : ''}</h4>
                     <p>${window.fmtDataHora(r.importedAt)} · ${window.escHtml(r.importedByName || 'Utilizador desconhecido')}</p>
                   </div>
                   <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
                     <span class="clientes-status-badge ${ev.cls}">${ev.label}</span>
                     <span class="clientes-soft-badge">${nCat} cat.</span>
                   </div>
                 </div>
                 ${isOpen ? `
                 <div class="clientes-collapsible-body">
                   <div class="clientes-history-tags" style="margin-bottom:${nCat ? '10px' : '0'};">
                     ${r.propostaDataRaw ? `<span class="clientes-soft-badge">Data: ${window.escHtml(r.propostaDataRaw)}</span>` : ''}
                     ${r.parentReferencia ? `<span class="clientes-soft-badge">↪ ${window.escHtml(r.parentReferencia)}</span>` : ''}
                     ${r.atualizadoEm ? `<span class="clientes-soft-badge">Editado ${window.fmtDataHora(r.atualizadoEm)}</span>` : ''}
                   </div>
                   ${nCat ? `
                   <div class="clientes-proposal-preview">
                     <table class="clientes-prices-table">
                       <thead><tr><th>Categoria profissional</th><th>Valor/Hora</th><th>Valor/Mês</th></tr></thead>
                       <tbody>
                         ${r.linhas.map(l => `
                           <tr>
                             <td>${window.escHtml(l.categoria || '—')}</td>
                             <td>${formatMoney(l.precoHora)}</td>
                             <td>${formatMoney(l.preco22Dias)}</td>
                           </tr>`).join('')}
                       </tbody>
                     </table>
                   </div>` : '<p class="clientes-empty-note" style="margin-top:4px;">Sem categorias registadas.</p>'}
                 </div>` : ''}
               </article>`;
             }).join('')}
           </div>`
        : '<div class="clientes-empty-note">Sem eventos no histórico.</div>';

      tabContent = `
        <section class="clientes-section">
          <div class="clientes-section-head">
            <h3>Histórico completo</h3>
            <span class="clientes-soft-badge">${allEvents.length} ${allEvents.length === 1 ? 'evento' : 'eventos'}</span>
          </div>
          ${historyHtml}
        </section>`;
    }

    dom.clienteDetail.innerHTML = `
      <header class="side-drawer-head">
        <div class="cli-detail-header">
          <div class="cli-avatar xl empresa">${window.escHtml(initials)}</div>
          <div class="cli-detail-titleblock">
            <div class="cli-detail-kicker">${window.escHtml(c.escritorioOrigem || 'Cliente')}${c.numeroCliente ? ' · Nº ' + window.escHtml(c.numeroCliente) : ''}</div>
            <h2 class="cli-detail-name">${window.escHtml(c.nome || 'Sem nome')}</h2>
          </div>
        </div>
        <button class="icon-btn" onclick="window.ClientesPage.closeDetail()" title="Fechar">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 3l10 10M13 3L3 13"/></svg>
        </button>
      </header>

      ${state.canEdit || state.canPropose ? `
      <div class="side-drawer-actions">
        ${state.canEdit ? `<button class="btn btn-secondary btn-sm" onclick="window.ClientesPage.enterEditCliente()">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 2l3 3-8 8H3v-3l8-8z"/></svg>
          Editar
        </button>` : ''}
        ${state.canPropose ? `<button class="btn btn-primary btn-sm" onclick="window.ClientesPage.novaProposta()">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3v10M3 8h10"/></svg>
          Nova proposta
        </button>` : ''}
      </div>` : ''}

      <nav class="cli-drawer-tabs">
        <button class="cli-tab-btn ${tab === 'detalhe' ? 'active' : ''}" onclick="window.ClientesPage.switchDetailTab('detalhe')">Detalhe</button>
        <button class="cli-tab-btn ${tab === 'precos' ? 'active' : ''}" onclick="window.ClientesPage.switchDetailTab('precos')">Preços</button>
        <button class="cli-tab-btn ${tab === 'propostas' ? 'active' : ''}" onclick="window.ClientesPage.switchDetailTab('propostas')">Propostas${proposals.length ? ' <span class="clientes-soft-badge" style="margin-left:4px;">' + proposals.length + '</span>' : ''}</button>
        <button class="cli-tab-btn ${tab === 'historico' ? 'active' : ''}" onclick="window.ClientesPage.switchDetailTab('historico')">Histórico</button>
      </nav>

      <div class="side-drawer-body">
        ${tabContent}
      </div>`;
  }

  // ---- EDIT CLIENT ----

  function enterEditCliente() {
    const c = getSelected();
    if (!c || !state.canEdit) return;
    state.editMode = 'cliente';
    state.editData = {
      nome: c.nome || '',
      numeroCliente: c.numeroCliente || '',
      grupo: c.grupo || '',
      escritorioOrigem: c.escritorioOrigem || '',
      obs: c.obs || '',
    };
    renderEditCliente(c);
  }

  function renderEditCliente(c) {
    const d = state.editData;
    dom.clienteDetail.innerHTML = `
      <header class="side-drawer-head">
        <div class="cli-detail-header">
          <div class="cli-avatar xl empresa">${window.escHtml(getAvatarInitials(c))}</div>
          <div class="cli-detail-titleblock">
            <div class="cli-detail-kicker">Editar dados do cliente</div>
            <h2 class="cli-detail-name">${window.escHtml(c.nome || 'Sem nome')}</h2>
          </div>
        </div>
        <button class="icon-btn" onclick="window.ClientesPage.cancelEdit()" title="Cancelar">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 3l10 10M13 3L3 13"/></svg>
        </button>
      </header>
      <div class="side-drawer-body">
        <div class="clientes-edit-grid">
          <label class="clientes-edit-field">
            <span class="field-label">Nome</span>
            <input class="form-input" id="editNome" value="${window.escHtml(d.nome)}" placeholder="Nome do cliente">
          </label>
          <label class="clientes-edit-field">
            <span class="field-label">Nº Cliente</span>
            <input class="form-input" id="editNumeroCliente" value="${window.escHtml(d.numeroCliente)}" placeholder="Número de cliente">
          </label>
          <label class="clientes-edit-field">
            <span class="field-label">Grupo</span>
            <input class="form-input" id="editGrupo" value="${window.escHtml(d.grupo)}" placeholder="Grupo empresarial">
          </label>
          <label class="clientes-edit-field">
            <span class="field-label">Escritório</span>
            <input class="form-input" id="editEscritorioOrigem" value="${window.escHtml(d.escritorioOrigem)}" placeholder="Escritório de origem">
          </label>
        </div>
        <label class="clientes-edit-field" style="margin-top:4px;">
          <span class="field-label">Observações</span>
          <textarea class="form-input form-textarea" id="editObs" placeholder="Notas sobre este cliente…">${window.escHtml(d.obs)}</textarea>
        </label>
      </div>
      <div class="side-drawer-footer">
        <button class="btn btn-secondary btn-sm" type="button" onclick="window.ClientesPage.cancelEdit()">Cancelar</button>
        <button class="btn btn-primary btn-sm" type="button" id="saveClienteBtn" onclick="window.ClientesPage.saveCliente()">Guardar</button>
      </div>`;
  }

  async function saveCliente() {
    const c = getSelected();
    if (!c || !state.canEdit || state.saveBusy) return;

    const nome = (document.getElementById('editNome')?.value || '').trim();
    if (!nome) { window.toast('O nome não pode estar vazio.'); return; }

    const btn = document.getElementById('saveClienteBtn');
    if (btn) btn.disabled = true;
    state.saveBusy = true;

    try {
      await window.ClientesService.updateCliente(c.id, {
        nome,
        numeroCliente: (document.getElementById('editNumeroCliente')?.value || '').trim(),
        grupo:         (document.getElementById('editGrupo')?.value || '').trim(),
        escritorioOrigem: (document.getElementById('editEscritorioOrigem')?.value || '').trim(),
        obs:           (document.getElementById('editObs')?.value || '').trim(),
      });
      await audit('editado', c.id, nome);
      state.editMode = null;
      state.editData = null;
      window.toast('Cliente atualizado.');
    } catch (err) {
      console.error(err);
      window.toast(err.message || 'Erro ao guardar.');
      if (btn) btn.disabled = false;
    } finally {
      state.saveBusy = false;
    }
  }

  function cancelEdit() {
    state.editMode = null;
    state.editData = null;
    renderDetail();
  }

  // ---- EDIT PRICES ----

  function linhasFromPrecos(precosAtuais) {
    return Object.values(precosAtuais || {})
      .sort((a, b) => String(a.categoria || '').localeCompare(String(b.categoria || ''), 'pt-PT'));
  }

  function readPriceRows() {
    return Array.from(dom.clienteDetail.querySelectorAll('[data-price-row]')).map(row => ({
      categoria:    row.querySelector('[data-field="categoria"]').value.trim(),
      preco22Dias:  parseNumInput(row.querySelector('[data-field="preco22Dias"]').value),
      valorDia:     null,
      precoHora:    parseNumInput(row.querySelector('[data-field="precoHora"]').value),
      obsLinha:     '',
    })).filter(r => r.categoria);
  }

  function syncPriceRows() {
    if (state.editData) state.editData.linhas = readPriceRows();
  }

  function priceRowHtml(l, i) {
    return `<tr data-price-row="${i}">
      <td><input class="form-input" data-field="categoria" value="${window.escHtml(l.categoria || '')}" placeholder="Categoria profissional"></td>
      <td><input class="form-input" type="number" step="0.01" min="0" data-field="precoHora" value="${l.precoHora != null ? l.precoHora : ''}" placeholder="0.00"></td>
      <td><input class="form-input" type="number" step="0.01" min="0" data-field="preco22Dias" value="${l.preco22Dias != null ? l.preco22Dias : ''}" placeholder="0.00"></td>
      <td><button class="clientes-row-remove" type="button" onclick="window.ClientesPage.removePriceRow(${i})" title="Remover">×</button></td>
    </tr>`;
  }

  function priceEditTableHtml(linhas) {
    return `
      <div class="clientes-prices-wrap">
        <table class="clientes-prices-table edit-mode">
          <thead><tr><th>Categoria profissional</th><th>Valor/Hora</th><th>Valor/Mês</th><th></th></tr></thead>
          <tbody>${linhas.map(priceRowHtml).join('')}</tbody>
        </table>
      </div>
      <button class="clientes-add-row-btn" type="button" onclick="window.ClientesPage.addPriceRow()">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v10M3 8h10"/></svg>
        Adicionar categoria
      </button>`;
  }

  function enterEditPrecos() {
    const c = getSelected();
    if (!c || !state.canEdit) return;
    state.editMode = 'precos';
    state.editData = { linhas: linhasFromPrecos(c.precosAtuais) };
    renderEditPrecos();
  }

  function renderEditPrecos() {
    const c = getSelected();
    if (!c || !state.editData) return;

    dom.clienteDetail.innerHTML = `
      <header class="side-drawer-head">
        <div class="cli-detail-header">
          <div class="cli-avatar xl empresa">${window.escHtml(getAvatarInitials(c))}</div>
          <div class="cli-detail-titleblock">
            <div class="cli-detail-kicker">Editar preços</div>
            <h2 class="cli-detail-name">${window.escHtml(c.nome || 'Sem nome')}</h2>
          </div>
        </div>
        <button class="icon-btn" onclick="window.ClientesPage.cancelEdit()" title="Cancelar">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 3l10 10M13 3L3 13"/></svg>
        </button>
      </header>
      <div class="side-drawer-body">
        <section class="clientes-section">
          ${priceEditTableHtml(state.editData.linhas)}
        </section>
      </div>
      <div class="side-drawer-footer">
        <button class="btn btn-secondary btn-sm" type="button" onclick="window.ClientesPage.cancelEdit()">Cancelar</button>
        <button class="btn btn-primary btn-sm" type="button" id="savePrecosBtn" onclick="window.ClientesPage.savePrecos()">Guardar preços</button>
      </div>`;
  }

  function addPriceRow() {
    syncPriceRows();
    state.editData.linhas.push({ categoria: '', preco22Dias: null, valorDia: null, precoHora: null, obsLinha: '' });
    renderEditPrecos();
    focusLastRow();
  }

  function removePriceRow(index) {
    syncPriceRows();
    state.editData.linhas.splice(index, 1);
    renderEditPrecos();
  }

  function focusLastRow() {
    const rows = dom.clienteDetail.querySelectorAll('[data-price-row]');
    const last = rows[rows.length - 1];
    if (last) last.querySelector('[data-field="categoria"]').focus();
  }

  async function savePrecos() {
    const c = getSelected();
    if (!c || !state.canEdit || state.saveBusy) return;

    syncPriceRows();
    const linhas = state.editData.linhas.filter(l => l.categoria.trim());
    if (!linhas.length) { window.toast('Adiciona pelo menos uma categoria antes de guardar.'); return; }

    const btn = document.getElementById('savePrecosBtn');
    if (btn) btn.disabled = true;
    state.saveBusy = true;

    try {
      await window.ClientesService.updatePrecos(c.id, linhas);
      await audit('precos-editados', c.id, c.nome);
      state.editMode = null;
      state.editData = null;
      window.toast('Preços atualizados.');
    } catch (err) {
      console.error(err);
      window.toast(err.message || 'Erro ao guardar preços.');
      if (btn) btn.disabled = false;
    } finally {
      state.saveBusy = false;
    }
  }

  // ---- PROPOSAL ----

  function enterNovaProposta() {
    const c = getSelected();
    if (!c || !state.canEdit) return;
    state.editMode = 'proposta';
    const proximoAno = new Date().getFullYear() + 1;
    state.editData = {
      nomeProposta: '',
      dataPropostaRaw: '',
      nota: '',
      anoVigencia: String(c.anoVigenciaAtual ? c.anoVigenciaAtual + 1 : proximoAno),
      linhas: linhasFromPrecos(c.precosAtuais),
    };
    renderNovaProposta();
  }

  function syncPropostaData() {
    if (!state.editData || state.editMode !== 'proposta') return;
    const n    = document.getElementById('propostaNome');
    const d    = document.getElementById('propostaData');
    const nota = document.getElementById('propostaNota');
    const ano  = document.getElementById('propostaAno');
    if (n)    state.editData.nomeProposta    = n.value;
    if (d)    state.editData.dataPropostaRaw = d.value;
    if (nota) state.editData.nota            = nota.value;
    if (ano)  state.editData.anoVigencia     = ano.value;
    state.editData.linhas = readPriceRows();
  }

  function renderNovaProposta() {
    const c = getSelected();
    if (!c || !state.editData) return;
    const d = state.editData;

    dom.clienteDetail.innerHTML = `
      <header class="side-drawer-head">
        <div class="cli-detail-header">
          <div class="cli-avatar xl empresa">${window.escHtml(getAvatarInitials(c))}</div>
          <div class="cli-detail-titleblock">
            <div class="cli-detail-kicker">Nova proposta</div>
            <div style="margin-bottom:4px;">
              <span class="cli-ano-vigencia-badge" id="propostaAnoKicker">${window.escHtml(String(d.anoVigencia))}</span>
            </div>
            <h2 class="cli-detail-name">${window.escHtml(c.nome || 'Sem nome')}</h2>
          </div>
        </div>
        <button class="icon-btn" onclick="window.ClientesPage.cancelEdit()" title="Cancelar">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 3l10 10M13 3L3 13"/></svg>
        </button>
      </header>
      <div class="side-drawer-body">
        <div class="clientes-edit-grid">
          <label class="clientes-edit-field">
            <span class="field-label">Nome da proposta</span>
            <input class="form-input" id="propostaNome" value="${window.escHtml(d.nomeProposta)}" placeholder="Ex: Revisão anual 2027">
          </label>
          <label class="clientes-edit-field">
            <span class="field-label">Data</span>
            <input class="form-input" type="date" id="propostaData" value="${window.escHtml(d.dataPropostaRaw)}">
          </label>
        </div>
        <div class="clientes-edit-grid" style="margin-top:0;">
          <label class="clientes-edit-field">
            <span class="field-label">Ano de vigência</span>
            <select class="form-input" id="propostaAno"
              onchange="const k=document.getElementById('propostaAnoKicker');if(k)k.textContent=this.value;"
>
              ${[0,1,2].map(offset => {
                const y = new Date().getFullYear() + offset;
                return `<option value="${y}"${String(d.anoVigencia) === String(y) ? ' selected' : ''}>${y}</option>`;
              }).join('')}
            </select>
          </label>
        </div>
        <label class="clientes-edit-field" style="margin-bottom:16px;">
          <span class="field-label">Nota</span>
          <textarea class="form-input form-textarea" id="propostaNota" placeholder="Justificação ou contexto desta proposta…">${window.escHtml(d.nota)}</textarea>
        </label>
        <section class="clientes-section">
          <div class="clientes-section-head">
            <h3>Preços propostos</h3>
          </div>
          ${priceEditTableHtml(d.linhas)}
          ${!d.linhas.length ? '<div class="clientes-empty-note" style="margin-top:8px;">Clica em "+ Adicionar" para inserir preços na proposta.</div>' : ''}
        </section>
      </div>
      <div class="side-drawer-footer">
        <button class="btn btn-secondary btn-sm" type="button" onclick="window.ClientesPage.cancelEdit()">Cancelar</button>
        <button class="btn btn-primary btn-sm" type="button" id="savePropostaBtn" onclick="window.ClientesPage.saveProposta()">Criar proposta</button>
      </div>`;
  }

  function addProposalPriceRow() {
    syncPropostaData();
    state.editData.linhas.push({ categoria: '', preco22Dias: null, valorDia: null, precoHora: null, obsLinha: '' });
    renderNovaProposta();
    focusLastRow();
  }

  function removeProposalPriceRow(index) {
    syncPropostaData();
    state.editData.linhas.splice(index, 1);
    renderNovaProposta();
  }

  async function saveProposta() {
    const c = getSelected();
    if (!c || !state.canEdit || state.saveBusy) return;

    syncPropostaData();
    const nomeProposta    = state.editData.nomeProposta.trim() || 'Proposta sem nome';
    const dataPropostaRaw = state.editData.dataPropostaRaw;
    const nota            = state.editData.nota.trim();
    const anoVigencia     = Number(state.editData.anoVigencia) || null;
    const linhas          = state.editData.linhas.filter(l => l.categoria.trim());

    const btn = document.getElementById('savePropostaBtn');
    if (btn) btn.disabled = true;
    state.saveBusy = true;

    try {
      await window.ClientesService.criarProposta(c.id, { nomeProposta, dataPropostaRaw, nota, anoVigencia, linhas });
      await audit('proposta-criada', c.id, nomeProposta + ' — ' + c.nome);
      state.editMode = null;
      state.editData = null;
      window.toast('Proposta criada com sucesso.');
    } catch (err) {
      console.error(err);
      window.toast(err.message || 'Erro ao criar proposta.');
      if (btn) btn.disabled = false;
    } finally {
      state.saveBusy = false;
    }
  }

  async function aplicarProposta(revisaoIndex) {
    const c = getSelected();
    if (!c || !state.canEdit) return;
    if (!confirm('Aplicar esta proposta vai substituir os preços atuais deste cliente. Continuar?')) return;

    try {
      await window.ClientesService.aplicarProposta(c.id, revisaoIndex);
      await audit('proposta-aplicada', c.id, c.nome);
      window.toast('Proposta aplicada como preços atuais.');
    } catch (err) {
      console.error(err);
      window.toast(err.message || 'Erro ao aplicar proposta.');
    }
  }

  function _removePriceRow(index) {
    if (state.editMode === 'proposta') {
      removeProposalPriceRow(index);
    } else {
      removePriceRow(index);
    }
  }

  // ---- MAIN RENDER ----

  function render() {
    state.filtered = getFiltered();
    renderOfficeOptions();
    renderList();

    // Refresh open drawer if data changed
    if (state.selectedId && dom.drawerOverlay && !dom.drawerOverlay.hidden && !state.editMode) {
      const stillExists = state.clientes.some(c => c.id === state.selectedId);
      if (stillExists) {
        renderDetail();
      } else {
        closeDetail();
      }
    }
  }

  function renderLoading() {
    dom.clientesList.innerHTML = [
      '<div class="skeleton-card"><div class="skeleton skeleton-line w-3/4"></div><div class="skeleton skeleton-line w-1/2"></div></div>',
      '<div class="skeleton-card"><div class="skeleton skeleton-line w-full"></div><div class="skeleton skeleton-line w-1/2"></div></div>',
      '<div class="skeleton-card"><div class="skeleton skeleton-line w-3/4"></div><div class="skeleton skeleton-line w-1/4"></div></div>',
    ].join('');
  }

  function subscribeClientes() {
    renderLoading();
    window.setStatus('A ligar…', '#d97706');

    let firstLoad = true;
    const unsubscribe = window.ClientesService.listenAll({
      onData(clientes) {
        state.clientes = clientes;
        render();
        window.setStatus('✓ Sincronizado', '#16a34a');
        setTimeout(() => window.setStatus(''), 2800);
        if (firstLoad) {
          firstLoad = false;
          autoOpenFromHash();
        }
      },
      onError(err) {
        console.error(err);
        window.setStatus('Erro de ligação', '#dc2626');
        window.toast('Erro ao carregar clientes.');
      },
    });

    window.addEventListener('beforeunload', () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    });
  }

  // ---- EXPOSE ----

  function novaProposta() {
    const c = getSelected();
    if (!c || !state.canPropose) return;
    window.location.href = 'proposta-builder.html?cliente=' + encodeURIComponent(c.id);
  }

  function reabrirProposta(propostaIndex) {
    const c = getSelected();
    if (!c) return;
    window.location.href = 'proposta-builder.html?cliente=' + encodeURIComponent(c.id) +
      '&proposta=' + encodeURIComponent(propostaIndex);
  }

  function criarRevisao(propostaIndex) {
    const c = getSelected();
    if (!c || !state.canPropose) return;
    window.location.href = 'proposta-builder.html?cliente=' + encodeURIComponent(c.id) +
      '&parent=' + encodeURIComponent(propostaIndex);
  }

  function autoOpenFromHash() {
    if (!window.location.hash) return;
    const m = window.location.hash.match(/cliente=([^&]+)/);
    if (!m) return;
    const id = decodeURIComponent(m[1]);
    const exists = state.clientes.some(c => c.id === id);
    if (exists) {
      openDetail(id);
      // Se hash tem tab=propostas|historico|precos|detalhe, usa isso; senão propostas por default
      const tabMatch = window.location.hash.match(/tab=([a-z]+)/i);
      const tab = (tabMatch && ['detalhe', 'precos', 'propostas', 'historico'].includes(tabMatch[1])) ? tabMatch[1] : 'propostas';
      switchDetailTab(tab);
    }
  }

  function toggleProposta(idx) {
    if (state.expandedPropostas.has(idx)) {
      state.expandedPropostas.delete(idx);
    } else {
      state.expandedPropostas.add(idx);
    }
    renderDetail();
  }

  function toggleHistorico(idx) {
    if (state.expandedHistorico.has(idx)) {
      state.expandedHistorico.delete(idx);
    } else {
      state.expandedHistorico.add(idx);
    }
    renderDetail();
  }

  window.ClientesPage = {
    openNovoClienteModal,
    closeNovoClienteModal,
    saveNovoCliente,
    confirmImport,
    cancelImportPreview,
    openFormatoModal,
    closeFormatoModal,
    confirmImportAno,
    cancelImportAno,
    openDetail,
    closeDetail,
    switchDetailTab,
    enterEditCliente,
    saveCliente,
    cancelEdit,
    enterEditPrecos,
    addPriceRow,
    removePriceRow: _removePriceRow,
    savePrecos,
    enterNovaProposta,
    addProposalPriceRow,
    removeProposalPriceRow,
    saveProposta,
    aplicarProposta,
    setViewAno,
    loadMore,
    novaProposta,
    reabrirProposta,
    criarRevisao,
    toggleProposta,
    toggleHistorico,
  };

  window.bootProtectedPage({
    activePage: 'clientes',
    moduleId: 'clientes',
  }, function() {
    cacheDom();
    bindFilters();
    updatePermissions();
    subscribeClientes();
  });
})();
