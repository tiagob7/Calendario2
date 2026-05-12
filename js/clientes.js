(function() {
  const state = {
    clientes: [],
    filtered: [],
    selectedId: '',
    view: 'tabela',        // 'tabela' | 'cards'
    activeTab: 'detalhe',  // 'detalhe' | 'precos' | 'historico'
    canImport: false,
    canEdit: false,
    preview: null,
    importBusy: false,
    saveBusy: false,
    editMode: null,   // null | 'cliente' | 'precos' | 'proposta'
    editData: null,
  };

  const dom = {};

  // ---- DOM CACHE ----

  function cacheDom() {
    dom.statsBar       = document.getElementById('statsBar');
    dom.clientesList   = document.getElementById('clientesList');
    dom.clienteDetail  = document.getElementById('clienteDetail');
    dom.drawerOverlay  = document.getElementById('drawerOverlay');
    dom.clientsCount   = document.getElementById('clientsCountLabel');
    dom.filterSearch   = document.getElementById('filterSearch');
    dom.filterOffice   = document.getElementById('filterOffice');
    dom.filterStatus   = document.getElementById('filterStatus');
    dom.viewBtnTabela  = document.getElementById('viewBtnTabela');
    dom.viewBtnCards   = document.getElementById('viewBtnCards');
    dom.importPanel    = document.getElementById('importPanel');
    dom.importDropzone = document.getElementById('importDropzone');
    dom.importFile     = document.getElementById('clientesImportFile');
    dom.importBusy     = document.getElementById('importBusyState');
    dom.importPreview  = document.getElementById('importPreviewWrap');
    dom.importHint     = document.getElementById('importPermissionHint');
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
    state.canImport = check('modules.clientes.import');
    state.canEdit   = check('modules.clientes.edit');

    dom.importHint.textContent = state.canImport ? 'Importação disponível' : 'Sem permissão de importação';

    if (!state.canImport) {
      dom.importDropzone.style.opacity = '.65';
      dom.importDropzone.style.pointerEvents = 'none';
      dom.importPreview.innerHTML = '<div class="clientes-preview-note">Sem permissão de importação (<code>modules.clientes.import</code>).</div>';
    }
  }

  // ---- IMPORT ----

  function toggleImportPanel() {
    dom.importPanel && dom.importPanel.classList.toggle('open');
  }

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
      dom.importPanel.classList.add('open');
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

  async function confirmImport() {
    if (!state.preview || !state.canImport) return;
    try {
      setImportBusy(true);
      const result = await window.ClientesService.applyImport(state.preview);
      await audit('importado', 'import-' + result.importedAt, result.sourceFile);
      state.preview = null;
      dom.importFile.value = '';
      dom.importPreview.innerHTML = '';
      window.toast('Importação concluída com sucesso.');
    } catch (err) {
      console.error(err);
      window.toast(err.message || 'Erro ao aplicar a importação.');
    } finally {
      setImportBusy(false);
    }
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
    dom.filterSearch.addEventListener('input', render);
    dom.filterOffice.addEventListener('change', render);
    dom.filterStatus.addEventListener('change', render);

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

  // ---- RENDER STATS ----

  function renderStats() {
    const total = state.clientes.length;
    const withPrices = state.clientes.filter(hasPrices).length;
    const offices = new Set(state.clientes.map(c => c.escritorioOrigem).filter(Boolean)).size;
    const revised = state.clientes.filter(c => !!lastRevision(c)).length;
    const withoutPrices = Math.max(total - withPrices, 0);

    dom.statsBar.innerHTML = `
      <div class="cli-stat">
        <div class="cli-stat-lbl">Total</div>
        <div class="cli-stat-val">${total}</div>
      </div>
      <div class="cli-stat">
        <div class="cli-stat-lbl">Com preços</div>
        <div class="cli-stat-val" style="color:var(--blue)">${withPrices}</div>
      </div>
      <div class="cli-stat">
        <div class="cli-stat-lbl">Sem preços</div>
        <div class="cli-stat-val" style="color:var(--amber)">${withoutPrices}</div>
      </div>
      <div class="cli-stat">
        <div class="cli-stat-lbl">Escritórios</div>
        <div class="cli-stat-val" style="color:var(--teal)">${offices}</div>
      </div>
      <div class="cli-stat">
        <div class="cli-stat-lbl">Com revisões</div>
        <div class="cli-stat-val" style="color:var(--green)">${revised}</div>
      </div>`;
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

  function renderTable() {
    const rows = state.filtered.map(c => {
      const priceCount = Object.keys(c.precosAtuais || {}).length;
      const rev = lastRevision(c);
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
          <td><span class="clientes-status-badge ${hasPrices(c) ? 'update' : 'warning'}">${hasPrices(c) ? 'Com preços' : 'Sem preços'}</span></td>
          <td><span class="cli-tnum">${rev ? window.fmtDataHora(rev.importedAt) : '—'}</span></td>
        </tr>`;
    }).join('');

    dom.clientesList.innerHTML = `
      <div class="cli-table-wrap">
        <table class="cli-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Grupo</th>
              <th>Escritório</th>
              <th>Categorias</th>
              <th>Estado</th>
              <th>Última importação</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    dom.clientesList.querySelectorAll('[data-id]').forEach(row => {
      row.addEventListener('click', () => openDetail(row.getAttribute('data-id')));
    });
  }

  function renderCards() {
    const cards = state.filtered.map(c => {
      const priceCount = Object.keys(c.precosAtuais || {}).length;
      const rev = lastRevision(c);
      const initials = getAvatarInitials(c);
      const isActive = c.id === state.selectedId;
      return `
        <article class="cli-card${isActive ? ' active' : ''}" data-id="${window.escHtml(c.id)}">
          <div class="cli-card-head">
            <div class="cli-avatar lg empresa">${window.escHtml(initials)}</div>
            <span class="clientes-status-badge ${hasPrices(c) ? 'update' : 'warning'}">${hasPrices(c) ? 'Com preços' : 'Sem preços'}</span>
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
              <div class="cli-stat-lbl">Última imp.</div>
              <div class="cli-tnum">${rev ? window.fmtDataHora(rev.importedAt) : '—'}</div>
            </div>
          </div>
          ${c.numeroCliente ? `<div class="cli-card-foot"><span>Nº ${window.escHtml(c.numeroCliente)}</span></div>` : ''}
        </article>`;
    }).join('');

    dom.clientesList.innerHTML = `<div class="cli-grid">${cards}</div>`;

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
    const importRevs = allRevs.filter(r => r.tipo !== 'proposta').reverse();
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
            ${rev ? `<div><span class="cli-info-key">Última importação</span><span>${window.fmtDataHora(rev.importedAt)}</span></div>` : ''}
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
      const pricesTable = priceEntries.length
        ? `<div class="clientes-prices-wrap">
             <table class="clientes-prices-table">
               <thead><tr><th>Categoria</th><th>22 dias</th><th>Valor dia</th><th>Hora</th></tr></thead>
               <tbody>
                 ${priceEntries.map(p => `
                   <tr>
                     <td>
                       <span class="clientes-price-main">${window.escHtml(p.categoria || '—')}</span>
                       ${p.obsLinha ? `<span class="clientes-price-sub">${window.escHtml(p.obsLinha)}</span>` : ''}
                     </td>
                     <td>${formatMoney(p.preco22Dias)}</td>
                     <td>${formatMoney(p.valorDia)}</td>
                     <td>${formatMoney(p.precoHora)}</td>
                   </tr>`).join('')}
               </tbody>
             </table>
           </div>`
        : `<div class="clientes-empty-note">${state.canEdit ? 'Ainda sem preços. Clica em "Editar" para adicionar.' : 'Ainda não existem preços importados para este cliente.'}</div>`;

      const proposalsHtml = proposals.length ? `
        <section class="clientes-section">
          <div class="clientes-section-head">
            <h3>Propostas</h3>
            <span class="clientes-soft-badge">${proposals.length}</span>
          </div>
          <div class="clientes-history-list">
            ${proposals.map(p => `
              <article class="clientes-history-item">
                <div class="clientes-history-item-head">
                  <div>
                    <h4>${window.escHtml(p.nomeProposta || 'Proposta sem nome')}</h4>
                    <p>${window.fmtDataHora(p.importedAt)} · ${window.escHtml(p.importedByName || 'Desconhecido')}${p.propostaDataRaw ? ' · ' + window.escHtml(p.propostaDataRaw) : ''}</p>
                    ${p.nota ? `<p style="margin-top:4px;">${window.escHtml(p.nota)}</p>` : ''}
                  </div>
                  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
                    <span class="clientes-soft-badge">${Array.isArray(p.linhas) ? p.linhas.length : 0} cat.</span>
                    ${p.aplicada
                      ? '<span class="clientes-status-badge new">Aplicada</span>'
                      : (state.canEdit ? `<button class="btn btn-secondary btn-sm" type="button" onclick="window.ClientesPage.aplicarProposta(${p._idx})">Aplicar</button>` : '')}
                  </div>
                </div>
                ${Array.isArray(p.linhas) && p.linhas.length ? `
                  <div class="clientes-proposal-preview">
                    <table class="clientes-prices-table">
                      <thead><tr><th>Categoria</th><th>22 dias</th><th>Valor dia</th><th>Hora</th></tr></thead>
                      <tbody>
                        ${p.linhas.slice(0, 5).map(l => `
                          <tr>
                            <td>${window.escHtml(l.categoria || '—')}</td>
                            <td>${formatMoney(l.preco22Dias)}</td>
                            <td>${formatMoney(l.valorDia)}</td>
                            <td>${formatMoney(l.precoHora)}</td>
                          </tr>`).join('')}
                        ${p.linhas.length > 5 ? `<tr><td colspan="4" style="color:var(--muted);font-size:10px;padding:6px 10px;">…mais ${p.linhas.length - 5} categorias</td></tr>` : ''}
                      </tbody>
                    </table>
                  </div>` : ''}
              </article>`).join('')}
          </div>
        </section>` : '';

      tabContent = `
        <section class="clientes-section">
          <div class="clientes-section-head">
            <h3>Preços atuais</h3>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="clientes-soft-badge">${priceEntries.length} cat.</span>
              ${state.canEdit ? `<button class="btn btn-secondary btn-sm" type="button" onclick="window.ClientesPage.enterEditPrecos()">Editar</button>` : ''}
            </div>
          </div>
          ${pricesTable}
        </section>
        ${proposalsHtml}`;
    }

    else if (tab === 'historico') {
      const historyHtml = importRevs.length
        ? `<div class="clientes-history-list">
             ${importRevs.map(r => `
               <article class="clientes-history-item">
                 <div class="clientes-history-item-head">
                   <div>
                     <h4>${window.fmtDataHora(r.importedAt)}</h4>
                     <p>${window.escHtml(r.importedByName || 'Utilizador desconhecido')} · ${window.escHtml(r.sourceFile || 'Importação manual')}${r.tipo === 'edicao-manual' ? ' · Edição manual' : ''}</p>
                   </div>
                   <span class="clientes-soft-badge">${Array.isArray(r.linhas) ? r.linhas.length : 0} cat.</span>
                 </div>
                 <div class="clientes-history-tags">
                   ${r.propostaDataRaw ? `<span class="clientes-soft-badge">Proposta: ${window.escHtml(r.propostaDataRaw)}</span>` : ''}
                   <span class="clientes-soft-badge">${Array.isArray(r.linhas) ? r.linhas.filter(l => l.precoHora != null).length : 0} c/ hora</span>
                   <span class="clientes-soft-badge">${Array.isArray(r.linhas) ? r.linhas.filter(l => l.valorDia != null).length : 0} c/ dia</span>
                 </div>
               </article>`).join('')}
           </div>`
        : '<div class="clientes-empty-note">Sem histórico de importações.</div>';

      tabContent = `
        <section class="clientes-section">
          <div class="clientes-section-head">
            <h3>Histórico de importações</h3>
            <span class="clientes-soft-badge">${importRevs.length} entrada${importRevs.length !== 1 ? 's' : ''}</span>
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

      ${state.canEdit ? `
      <div class="side-drawer-actions">
        <button class="btn btn-secondary btn-sm" onclick="window.ClientesPage.enterEditCliente()">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 2l3 3-8 8H3v-3l8-8z"/></svg>
          Editar
        </button>
        <button class="btn btn-primary btn-sm" onclick="window.ClientesPage.enterNovaProposta()">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3v10M3 8h10"/></svg>
          Nova proposta
        </button>
      </div>` : ''}

      <nav class="cli-drawer-tabs">
        <button class="cli-tab-btn ${tab === 'detalhe' ? 'active' : ''}" onclick="window.ClientesPage.switchDetailTab('detalhe')">Detalhe</button>
        <button class="cli-tab-btn ${tab === 'precos' ? 'active' : ''}" onclick="window.ClientesPage.switchDetailTab('precos')">Preços</button>
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
      valorDia:     parseNumInput(row.querySelector('[data-field="valorDia"]').value),
      precoHora:    parseNumInput(row.querySelector('[data-field="precoHora"]').value),
      obsLinha:     '',
    })).filter(r => r.categoria);
  }

  function syncPriceRows() {
    if (state.editData) state.editData.linhas = readPriceRows();
  }

  function priceRowHtml(l, i) {
    return `<tr data-price-row="${i}">
      <td><input class="form-input" data-field="categoria" value="${window.escHtml(l.categoria || '')}" placeholder="Categoria"></td>
      <td><input class="form-input" type="number" step="0.01" min="0" data-field="preco22Dias" value="${l.preco22Dias != null ? l.preco22Dias : ''}"></td>
      <td><input class="form-input" type="number" step="0.01" min="0" data-field="valorDia" value="${l.valorDia != null ? l.valorDia : ''}"></td>
      <td><input class="form-input" type="number" step="0.01" min="0" data-field="precoHora" value="${l.precoHora != null ? l.precoHora : ''}"></td>
      <td><button class="clientes-row-remove" type="button" onclick="window.ClientesPage.removePriceRow(${i})" title="Remover">×</button></td>
    </tr>`;
  }

  function priceEditTableHtml(linhas) {
    return `
      <div class="clientes-prices-wrap">
        <table class="clientes-prices-table edit-mode">
          <thead><tr><th>Categoria</th><th>Preço 22 dias</th><th>Valor dia</th><th>Preço hora</th><th></th></tr></thead>
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
    state.editData = {
      nomeProposta: '',
      dataPropostaRaw: '',
      nota: '',
      linhas: linhasFromPrecos(c.precosAtuais),
    };
    renderNovaProposta();
  }

  function syncPropostaData() {
    if (!state.editData || state.editMode !== 'proposta') return;
    const n = document.getElementById('propostaNome');
    const d = document.getElementById('propostaData');
    const nota = document.getElementById('propostaNota');
    if (n) state.editData.nomeProposta = n.value;
    if (d) state.editData.dataPropostaRaw = d.value;
    if (nota) state.editData.nota = nota.value;
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
            <div class="cli-detail-kicker">Nova proposta para</div>
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
            <input class="form-input" id="propostaNome" value="${window.escHtml(d.nomeProposta)}" placeholder="Ex: Revisão anual 2025">
          </label>
          <label class="clientes-edit-field">
            <span class="field-label">Data</span>
            <input class="form-input" type="date" id="propostaData" value="${window.escHtml(d.dataPropostaRaw)}">
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
    const linhas          = state.editData.linhas.filter(l => l.categoria.trim());

    const btn = document.getElementById('savePropostaBtn');
    if (btn) btn.disabled = true;
    state.saveBusy = true;

    try {
      await window.ClientesService.criarProposta(c.id, { nomeProposta, dataPropostaRaw, nota, linhas });
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
    renderStats();
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

    const unsubscribe = window.ClientesService.listenAll({
      onData(clientes) {
        state.clientes = clientes;
        render();
        window.setStatus('✓ Sincronizado', '#16a34a');
        setTimeout(() => window.setStatus(''), 2800);
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

  window.ClientesPage = {
    toggleImportPanel,
    confirmImport,
    cancelImportPreview,
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
