// proposta-builder.js — Lógica do builder de propostas integrado no módulo Clientes.
// Porta adaptada do gerador_proposta.html standalone.

(function() {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  const state = {
    clienteId: '',
    cliente: null,
    propostaIndex: -1,       // -1 = nova; >= 0 = editar existente
    propostaExistente: null,
    parentIndex: -1,         // se >= 0, modo revisão a partir desta proposta
    parentProposta: null,
    parentReferencia: '',
    versao: 1,
    defaults: null,
    tableState: { hora: true, coef: false },
    saveBusy: false,
    podeEditar: false,
    podeVer: false,
  };

  const PALETTE = [];
  let _calcsMargens = [7, 10, 13, 15];
  let _calcModelo = 1;
  let _calcMargem = 10;
  let _previewTimer = null;
  let _previewOpen = false;

  // ── Boot ───────────────────────────────────────────────────
  window.bootProtectedPage({
    activePage: 'clientes',
    moduleId: 'clientes',
    renderNavbar: false,
  }, async function(ctx) {
    state.podeVer = ctx.isAdmin || (typeof window.temPermissao === 'function' && window.temPermissao('modules.clientes.view'));
    state.podeEditar = ctx.isAdmin || (typeof window.temPermissao === 'function' && window.temPermissao('modules.clientes.propose'));

    if (!state.podeVer) {
      window.location.href = 'dashboard.html';
      return;
    }

    const params = new URLSearchParams(window.location.search);
    state.clienteId = params.get('cliente') || '';
    const propostaParam = params.get('proposta');
    state.propostaIndex = propostaParam != null && propostaParam !== '' ? parseInt(propostaParam, 10) : -1;
    const parentParam = params.get('parent');
    state.parentIndex = parentParam != null && parentParam !== '' ? parseInt(parentParam, 10) : -1;

    if (!state.clienteId) {
      window.toast && window.toast('Cliente não especificado. A redirecionar…');
      setTimeout(() => { window.location.href = 'clientes.html'; }, 1200);
      return;
    }

    document.getElementById('pbBack').addEventListener('click', () => voltarAoCliente());

    try {
      await loadDados();
      bindForm();
      preencherFormulario();
      updateBadge();
      atualizarSaveBtn();
    } catch (err) {
      console.error('[ProposalBuilder]', err);
      toast('Erro ao carregar dados da proposta.', true);
    }
  });

  function voltarAoCliente() {
    window.location.href = 'clientes.html#cliente=' + encodeURIComponent(state.clienteId);
  }

  async function loadDados() {
    state.cliente = await window.ClientesService.getCliente(state.clienteId);
    if (!state.cliente) throw new Error('Cliente não encontrado.');

    state.defaults = await window.ClientesService.getDefaultsProposta();

    const revisoes = Array.isArray(state.cliente.revisoes) ? state.cliente.revisoes : [];

    if (state.propostaIndex >= 0) {
      const rev = revisoes[state.propostaIndex];
      if (!rev || rev.tipo !== 'proposta') {
        toast('Proposta não encontrada.', true);
        state.propostaIndex = -1;
      } else {
        state.propostaExistente = rev;
        state.parentReferencia = rev.parentReferencia || '';
        state.versao = Number(rev.versao) || 1;
      }
    } else if (state.parentIndex >= 0) {
      const parent = revisoes[state.parentIndex];
      if (!parent || parent.tipo !== 'proposta') {
        toast('Proposta de origem não encontrada.', true);
        state.parentIndex = -1;
      } else {
        state.parentProposta = parent;
        // Se a parent já é uma revisão (tem parentReferencia), a nova revisão herda o mesmo parent
        state.parentReferencia = parent.parentReferencia || parent.referencia || '';
      }
    }

    document.getElementById('pbCrumbCliente').textContent = state.cliente.nome || 'Cliente';
    document.getElementById('railTitle').textContent =
      state.propostaIndex >= 0 ? 'Editar proposta' :
      state.parentIndex >= 0 ? 'Nova revisão' :
      'Nova proposta';
  }

  // ── Form binding ───────────────────────────────────────────
  function bindForm() {
    const formPane = document.querySelector('.pb-form-pane');
    if (formPane) {
      formPane.addEventListener('input', e => {
        if (e.target && e.target.tagName === 'TEXTAREA') autoResizeTextarea(e.target);
        schedulePreview();
        updateBadge();
      });
      formPane.addEventListener('change', schedulePreview);
    }

    document.getElementById('referencia').addEventListener('input', updateBadge);
    document.getElementById('nome-cliente').addEventListener('input', updateBadge);
    document.getElementById('btnGerarRef').addEventListener('click', gerarReferencia);

    // Step rail navigation
    document.querySelectorAll('.nav-list a').forEach(a => {
      a.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.getElementById(this.getAttribute('href').slice(1));
        const pane = document.querySelector('.pb-form-pane');
        if (!target || !pane) return;
        const paneRect = pane.getBoundingClientRect();
        const targetTop = target.getBoundingClientRect().top - paneRect.top + pane.scrollTop - 20;
        pane.scrollTo({ top: targetTop, behavior: 'smooth' });
        setActiveNav(target.id);
      });
    });

    const pane = document.querySelector('.pb-form-pane');
    if (pane) {
      pane.addEventListener('scroll', updateActiveNav);
      window.addEventListener('resize', updateActiveNav);
    }

    // Resize observer for preview
    const wrap = document.querySelector('.preview-frame-wrap');
    if (wrap && window.ResizeObserver) {
      new ResizeObserver(() => scalePreviewFrame()).observe(wrap);
    }

    // Modal click-outside to close
    document.getElementById('calcs-overlay').addEventListener('click', function(e) {
      if (e.target === this) fecharCalculadoraSimples();
    });
    document.getElementById('calc-overlay').addEventListener('click', function(e) {
      if (e.target === this) fecharCalculadora();
    });
  }

  function preencherFormulario() {
    const d = state.defaults || {};
    // Em modo revisão usamos o parent como "base" do formulário (sem ref ainda)
    const p = state.propostaExistente || state.parentProposta;
    const isRevisao = state.parentIndex >= 0 && !state.propostaExistente;

    // 1 — Identificação
    document.getElementById('referencia').value = (state.propostaExistente && state.propostaExistente.referencia) || '';
    document.getElementById('data-proposta').value = p
      ? (parseDateToIso(p.propostaDataRaw) || new Date().toISOString().slice(0, 10))
      : new Date().toISOString().slice(0, 10);
    const validade = (p && p.validade) || d.validade || { num: 30, unidade: 'dias' };
    document.getElementById('validade-num').value = validade.num || 30;
    document.getElementById('validade-unit').value = validade.unidade || 'dias';

    // Ano de vigência
    const anoSelect = document.getElementById('ano-vigencia');
    if (anoSelect) {
      const anoAtual = new Date().getFullYear();
      const anosOpt = [anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2];
      anoSelect.innerHTML = '<option value="">— Não especificar —</option>' +
        anosOpt.map(a => '<option value="' + a + '">' + a + '</option>').join('');
      const anoExistente = (p && p.anoVigencia) || (state.cliente && state.cliente.anoVigenciaAtual
        ? state.cliente.anoVigenciaAtual + 1
        : anoAtual + 1);
      anoSelect.value = anoExistente || '';
    }

    // 2 — Cliente
    const cli = (p && p.cliente) || { nomeResponsavel: '', nomeEmpresa: state.cliente.nome || '' };
    document.getElementById('nome-cliente').value = cli.nomeResponsavel || '';
    document.getElementById('industria').value = cli.nomeEmpresa || state.cliente.nome || '';

    // 3 — Signatário
    const sig = (p && p.signatario) || d.signatario || { nome: '', cargo: '' };
    document.getElementById('sig-nome').value = sig.nome || '';
    document.getElementById('sig-cargo').value = sig.cargo || '';

    // 4 — Tabela de preços
    state.tableState = (p && p.tableTypes) || { hora: true, coef: false };
    aplicarToggleVisual();
    const linhas = (p && p.linhas) || precosFromCliente() || categoriasFromDefaults();
    document.getElementById('tabela-hora-body').innerHTML = '';
    linhas.forEach(l => addHoraRow(l.categoria, formatNumInput(l.precoHora), formatNumInput(l.preco22Dias)));
    if (!linhas.length) addHoraRow();
    bindHoraDrag();

    const coefRows = (p && p.coefRows) || d.coefRows || [];
    document.getElementById('coef-body').innerHTML = '';
    coefRows.forEach(r => addCoefRow('coef-body', r.rubrica, r.coef));
    if (!coefRows.length) addCoefRow('coef-body', '', '');

    // 5 — Majorações
    fillListEditor('majoracoes-body', (p && p.majoracoes) || d.majoracoes || []);
    // 6 — Inclusões
    fillListEditor('inclusoes-body', (p && p.inclusoes) || d.inclusoes || []);
    // 7 — Responsabilidades
    fillListEditor('resp-algartempo-body', (p && p.respAlgartempo) || d.respAlgartempo || []);
    fillListEditor('resp-empresa-body', (p && p.respEmpresa) || d.respEmpresa || []);
    // 8 — Termos
    fillListEditor('termos-esq-body', (p && p.termosEsq) || d.termosEsq || []);
    fillListEditor('termos-dir-body', (p && p.termosDir) || d.termosDir || []);

    // 9 — Gestor: popular preset
    const gestoresPreset = d.gestores || [];
    const presetEl = document.getElementById('gestor-preset');
    presetEl.innerHTML = '<option value="">— outro / preencher manualmente —</option>' +
      gestoresPreset.map((g, i) =>
        '<option value="' + i + '">' + escHtml(g.nome) + ' — ' + escHtml(g.cargo) + '</option>'
      ).join('');
    const gestor = (p && p.gestor) || gestoresPreset[2] || { nome: '', cargo: '', telefone: '', email: '', escritorio: '' };
    document.getElementById('gestor-nome').value = gestor.nome || '';
    document.getElementById('gestor-cargo').value = gestor.cargo || '';
    document.getElementById('telefone').value = gestor.telefone || '';
    document.getElementById('email').value = gestor.email || '';
    document.getElementById('gestor-escritorio').value = gestor.escritorio || '';
  }

  function precosFromCliente() {
    if (!state.cliente || !state.cliente.precosAtuais) return null;
    const list = Object.values(state.cliente.precosAtuais);
    if (!list.length) return null;
    return list
      .sort((a, b) => String(a.categoria || '').localeCompare(String(b.categoria || ''), 'pt-PT'))
      .map(p => ({
        categoria: p.categoria || '',
        precoHora: p.precoHora,
        preco22Dias: p.preco22Dias,
        valorDia: null,
      }));
  }

  function categoriasFromDefaults() {
    const cats = (state.defaults && state.defaults.categoriasDefault) || [];
    return cats.map(c => ({ categoria: c, precoHora: null, preco22Dias: null, valorDia: null }));
  }

  function fillListEditor(containerId, items) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    (items || []).forEach(it => addListRow(containerId, it.titulo || '', it.descricao || ''));
    if (!items || !items.length) addListRow(containerId, '', '');
  }

  // ── Reference generator ───────────────────────────────────
  async function gerarReferencia() {
    if (!state.podeEditar) {
      toast('Sem permissão para criar propostas.', true);
      return;
    }
    const btn = document.getElementById('btnGerarRef');
    btn.disabled = true;
    btn.textContent = 'A gerar…';
    try {
      const opts = {};
      if (state.parentIndex >= 0 && state.parentReferencia) {
        opts.parentReferencia = state.parentReferencia;
      }
      const result = await window.ClientesService.gerarProximaReferencia(state.clienteId, opts);
      document.getElementById('referencia').value = result.referencia;
      state.versao = result.versao || 1;
      state.parentReferencia = result.parentReferencia || state.parentReferencia || '';
      updateBadge();
      schedulePreview();
      toast('Referência ' + result.referencia + ' gerada.');
    } catch (err) {
      console.error(err);
      toast(err.message || 'Erro ao gerar referência.', true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Gerar';
    }
  }

  // ── Save ──────────────────────────────────────────────────
  async function guardarProposta() {
    if (!state.podeEditar) {
      toast('Sem permissão para guardar propostas.', true);
      return;
    }
    if (state.saveBusy) return;
    if (!validar()) {
      toast('Preenche os campos obrigatórios.', true);
      return;
    }

    const payload = readFormData();
    const btn = document.getElementById('btnGuardar');
    btn.disabled = true;
    btn.textContent = '⏳ A guardar…';
    state.saveBusy = true;

    try {
      let result;
      if (state.propostaIndex >= 0) {
        result = await window.ClientesService.atualizarProposta(state.clienteId, state.propostaIndex, payload);
        toast('Proposta atualizada.');
      } else {
        result = await window.ClientesService.criarProposta(state.clienteId, payload);
        state.propostaIndex = result.revisaoIndex;
        state.parentIndex = -1;
        state.parentProposta = null;
        // Sincronizar URL: tirar ?parent, meter ?proposta
        const url = new URL(window.location.href);
        url.searchParams.delete('parent');
        url.searchParams.set('proposta', String(result.revisaoIndex));
        window.history.replaceState(null, '', url.toString());
        toast('Proposta guardada: ' + (result.referencia || '—'));
      }
      if (typeof window.registarAuditoria === 'function') {
        try {
          await window.registarAuditoria({
            modulo: 'clientes',
            acao: state.propostaIndex >= 0 ? 'proposta-atualizada' : 'proposta-criada',
            docId: state.clienteId,
            titulo: (payload.referencia || 'Proposta') + ' — ' + (state.cliente && state.cliente.nome || ''),
          });
        } catch (_) { /* ignore */ }
      }
      // Reload to refresh state
      await loadDados();
      preencherFormulario();
    } catch (err) {
      console.error(err);
      toast(err.message || 'Erro ao guardar.', true);
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Guardar proposta';
      state.saveBusy = false;
      atualizarSaveBtn();
    }
  }

  function readFormData() {
    return {
      referencia: document.getElementById('referencia').value.trim(),
      parentReferencia: state.parentReferencia || '',
      versao: state.versao || 1,
      propostaDataRaw: document.getElementById('data-proposta').value,
      nomeProposta: document.getElementById('referencia').value.trim() || 'Proposta',
      validade: {
        num: parseInt(document.getElementById('validade-num').value, 10) || 30,
        unidade: document.getElementById('validade-unit').value || 'dias',
      },
      cliente: {
        nomeResponsavel: document.getElementById('nome-cliente').value.trim(),
        nomeEmpresa: document.getElementById('industria').value.trim(),
      },
      signatario: {
        nome: document.getElementById('sig-nome').value.trim(),
        cargo: document.getElementById('sig-cargo').value.trim(),
      },
      gestor: {
        nome: document.getElementById('gestor-nome').value.trim(),
        cargo: document.getElementById('gestor-cargo').value.trim(),
        telefone: document.getElementById('telefone').value.trim(),
        email: document.getElementById('email').value.trim(),
        escritorio: document.getElementById('gestor-escritorio').value.trim(),
      },
      anoVigencia: Number(document.getElementById('ano-vigencia').value) || null,
      tableTypes: { hora: !!state.tableState.hora, coef: !!state.tableState.coef },
      linhas: readHoraRows(),
      coefRows: readCoefRows(),
      majoracoes: readListEditor('majoracoes-body'),
      inclusoes: readListEditor('inclusoes-body'),
      respAlgartempo: readListEditor('resp-algartempo-body'),
      respEmpresa: readListEditor('resp-empresa-body'),
      termosEsq: readListEditor('termos-esq-body'),
      termosDir: readListEditor('termos-dir-body'),
    };
  }

  function readHoraRows() {
    return Array.from(document.querySelectorAll('#tabela-hora-body tr')).map(tr => {
      const cat = tr.querySelector('.inp-cat').value.trim();
      const vh = parseNumInput(tr.querySelector('.inp-vh').value);
      const vm = parseNumInput(tr.querySelector('.inp-vm').value);
      return {
        categoria: cat,
        precoHora: vh,
        preco22Dias: vm,
        valorDia: null,
        obsLinha: '',
      };
    }).filter(r => r.categoria);
  }

  function readCoefRows() {
    return Array.from(document.querySelectorAll('#coef-body .list-editor-row')).map(row => {
      const inputs = row.querySelectorAll('input');
      return { rubrica: inputs[0].value.trim(), coef: inputs[1].value.trim() };
    }).filter(r => r.rubrica);
  }

  function readListEditor(containerId) {
    return Array.from(document.querySelectorAll('#' + containerId + ' .list-editor-row')).map(row => {
      const inputs = row.querySelectorAll('input, textarea');
      return { titulo: inputs[0].value.trim(), descricao: inputs[1].value.trim() };
    }).filter(r => r.titulo);
  }

  function validar() {
    let ok = true;
    function check(fId, iId, cond) {
      const f = document.getElementById(fId);
      const v = document.getElementById(iId).value.trim();
      if (!cond(v)) { f.classList.add('has-error'); ok = false; } else f.classList.remove('has-error');
    }
    check('field-referencia', 'referencia', v => v.length > 0);
    check('field-data', 'data-proposta', v => v.length > 0 && !isNaN(new Date(v).getTime()));
    check('field-industria', 'industria', v => v.length > 0);
    return ok;
  }

  function atualizarSaveBtn() {
    const btn = document.getElementById('btnGuardar');
    if (!btn) return;
    if (!state.podeEditar) {
      btn.disabled = true;
      btn.title = 'Sem permissão para criar propostas';
    }
  }

  // ── Toggle table ──────────────────────────────────────────
  window.PropostaBuilder = window.PropostaBuilder || {};
  window.PropostaBuilder.toggleTable = function(which) {
    state.tableState[which] = !state.tableState[which];
    if (!state.tableState.hora && !state.tableState.coef) state.tableState[which] = true;
    aplicarToggleVisual();
    schedulePreview();
  };
  function aplicarToggleVisual() {
    document.getElementById('tog-hora').classList.toggle('active', state.tableState.hora);
    document.getElementById('tog-coef').classList.toggle('active', state.tableState.coef);
    document.getElementById('panel-hora').classList.toggle('visible', state.tableState.hora);
    document.getElementById('panel-coef').classList.toggle('visible', state.tableState.coef);
  }

  // ── Hora rows ─────────────────────────────────────────────
  function addHoraRow(cat, vh, vm) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td><span class="drag-handle" title="Arrastar para reordenar">⋮⋮</span></td>' +
      '<td><input type="text" class="inp-cat" value="' + escHtml(cat || '') + '" placeholder="Categoria"></td>' +
      '<td><input type="text" class="inp-vh r" value="' + escHtml(vh || '') + '" placeholder="0,00 €"></td>' +
      '<td><input type="text" class="inp-vm r" value="' + escHtml(vm || '') + '" placeholder="0,00 €"></td>' +
      '<td><button type="button" class="btn-remove-row" onclick="window.PropostaBuilder.removeHoraRow(this)">×</button></td>';
    const handle = tr.querySelector('.drag-handle');
    handle.addEventListener('mousedown', () => { tr.draggable = true; });
    handle.addEventListener('mouseup', () => { tr.draggable = false; });
    document.getElementById('tabela-hora-body').appendChild(tr);
    updateRemoveBtns('tabela-hora-body');
  }
  window.PropostaBuilder.addHoraRow = function() { addHoraRow(); schedulePreview(); };

  window.PropostaBuilder.removeHoraRow = function(btn) {
    btn.closest('tr').remove();
    updateRemoveBtns('tabela-hora-body');
    schedulePreview();
  };

  window.PropostaBuilder.limparTabelaPrecos = function() {
    if (!confirm('Apagar todas as categorias?')) return;
    document.getElementById('tabela-hora-body').innerHTML = '';
    addHoraRow();
    schedulePreview();
  };

  window.PropostaBuilder.importarPrecosCliente = function() {
    const linhas = precosFromCliente();
    if (!linhas || !linhas.length) {
      toast('Este cliente ainda não tem preços guardados.', true);
      return;
    }
    document.getElementById('tabela-hora-body').innerHTML = '';
    linhas.forEach(l => addHoraRow(l.categoria, formatNumInput(l.precoHora), formatNumInput(l.preco22Dias)));
    if (!state.tableState.hora) window.PropostaBuilder.toggleTable('hora');
    toast(linhas.length + ' categorias importadas dos preços do cliente.');
    schedulePreview();
  };

  function bindHoraDrag() {
    const tbody = document.getElementById('tabela-hora-body');
    if (!tbody || tbody._dragBound) return;
    tbody._dragBound = true;
    let dragSrc = null;
    tbody.addEventListener('dragstart', e => {
      dragSrc = e.target.closest('tr');
      if (!dragSrc) return;
      dragSrc.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    tbody.addEventListener('dragover', e => {
      e.preventDefault();
      const target = e.target.closest('tr');
      if (!target || target === dragSrc) return;
      document.querySelectorAll('#tabela-hora-body tr.drag-over').forEach(r => r.classList.remove('drag-over'));
      target.classList.add('drag-over');
    });
    tbody.addEventListener('dragleave', e => {
      const target = e.target.closest('tr');
      if (target) target.classList.remove('drag-over');
    });
    tbody.addEventListener('drop', e => {
      e.preventDefault();
      const target = e.target.closest('tr');
      if (!target || target === dragSrc) return;
      const rows = Array.from(tbody.children);
      const srcIdx = rows.indexOf(dragSrc);
      const tgtIdx = rows.indexOf(target);
      if (srcIdx < tgtIdx) tbody.insertBefore(dragSrc, target.nextSibling);
      else tbody.insertBefore(dragSrc, target);
      schedulePreview();
    });
    tbody.addEventListener('dragend', () => {
      document.querySelectorAll('#tabela-hora-body tr').forEach(r => {
        r.classList.remove('dragging', 'drag-over');
        r.draggable = false;
      });
      dragSrc = null;
    });
  }

  // ── Coef + List rows ──────────────────────────────────────
  function addCoefRow(containerId, rubrica, coef) {
    const row = document.createElement('div');
    row.className = 'list-editor-row coef-row';
    row.innerHTML =
      '<input type="text" value="' + escHtml(rubrica || '') + '" placeholder="Rubrica">' +
      '<input type="text" class="r" value="' + escHtml(coef || '') + '" placeholder="0,00">' +
      '<button type="button" class="btn-remove-row" onclick="window.PropostaBuilder.removeRow(this,\'' + containerId + '\')">×</button>';
    document.getElementById(containerId).appendChild(row);
    updateRemoveBtns(containerId);
  }
  window.PropostaBuilder.addCoefRow = function(cId) { addCoefRow(cId, '', ''); schedulePreview(); };

  function addListRow(containerId, titulo, desc) {
    const row = document.createElement('div');
    row.className = 'list-editor-row';
    row.innerHTML =
      '<input type="text" class="bold-input" value="' + escHtml(titulo || '') + '" placeholder="Título">' +
      '<textarea placeholder="Descrição" rows="1">' + escHtml(desc || '') + '</textarea>' +
      '<button type="button" class="btn-remove-row" onclick="window.PropostaBuilder.removeRow(this,\'' + containerId + '\')">×</button>';
    document.getElementById(containerId).appendChild(row);
    autoResizeTextarea(row.querySelector('textarea'));
    updateRemoveBtns(containerId);
  }
  window.PropostaBuilder.addListRow = function(cId) { addListRow(cId, '', ''); schedulePreview(); };

  window.PropostaBuilder.removeRow = function(btn, cId) {
    btn.closest('.list-editor-row').remove();
    updateRemoveBtns(cId);
    schedulePreview();
  };

  function updateRemoveBtns(cId) {
    const sel = (cId === 'tabela-hora-body') ? '#' + cId + ' .btn-remove-row' : '#' + cId + ' .btn-remove-row';
    const btns = document.querySelectorAll(sel);
    btns.forEach(b => b.disabled = btns.length === 1);
  }

  // ── Gestor preset ─────────────────────────────────────────
  window.PropostaBuilder.aplicarGestor = function(val) {
    const gestores = (state.defaults && state.defaults.gestores) || [];
    if (!val) return;
    const idx = parseInt(val, 10);
    const g = gestores[idx];
    if (!g) return;
    document.getElementById('gestor-nome').value = g.nome || '';
    document.getElementById('gestor-cargo').value = g.cargo || '';
    document.getElementById('telefone').value = g.telefone || '';
    document.getElementById('email').value = g.email || '';
    document.getElementById('gestor-escritorio').value = g.escritorio || '';
    schedulePreview();
  };

  // ── Preview ───────────────────────────────────────────────
  function renderPreview() {
    const frame = document.getElementById('preview-frame');
    if (!frame || !_previewOpen) return;
    const html = window.PropostaTemplate.render(buildPreviewDados());
    frame.srcdoc = html;
    frame.onload = function() {
      try {
        const h = frame.contentDocument.documentElement.scrollHeight;
        if (h > 0) {
          frame.style.height = h + 'px';
          scalePreviewFrame();
        }
      } catch (_) { /* sandbox */ }
    };
  }

  function buildPreviewDados() {
    const f = readFormData();
    return {
      referencia: f.referencia,
      dataPropostaIso: f.propostaDataRaw,
      cliente: f.cliente,
      validade: f.validade,
      signatario: f.signatario,
      gestor: f.gestor,
      tableTypes: f.tableTypes,
      linhas: f.linhas,
      coefRows: f.coefRows,
      majoracoes: f.majoracoes,
      inclusoes: f.inclusoes,
      respAlgartempo: f.respAlgartempo,
      respEmpresa: f.respEmpresa,
      termosEsq: f.termosEsq,
      termosDir: f.termosDir,
    };
  }

  function schedulePreview() {
    if (!_previewOpen) return;
    clearTimeout(_previewTimer);
    _previewTimer = setTimeout(renderPreview, 500);
  }

  function scalePreviewFrame() {
    const wrap = document.querySelector('.preview-frame-wrap');
    const scaler = document.querySelector('.preview-frame-scaler');
    const frame = document.getElementById('preview-frame');
    if (!wrap || !scaler || !frame) return;
    const mmToPx = 96 / 25.4;
    const naturalW = 210 * mmToPx;
    const available = wrap.clientWidth - 24;
    const scale = Math.min(1, available / naturalW);
    frame.style.transform = 'scale(' + scale + ')';
    scaler.style.width = Math.round(naturalW * scale) + 'px';
    scaler.style.height = Math.round(frame.offsetHeight * scale) + 'px';
  }

  window.PropostaBuilder.previsualizar = function() {
    _previewOpen = !_previewOpen;
    const ws = document.querySelector('.pb-workspace');
    const btn = document.getElementById('btn-preview');
    ws.classList.toggle('preview-open', _previewOpen);
    btn.classList.toggle('preview-active', _previewOpen);
    btn.textContent = _previewOpen ? '✕ Fechar preview' : '👁 Pré-visualizar';
    if (_previewOpen) renderPreview();
  };
  window.PropostaBuilder.fecharPreview = function() {
    _previewOpen = false;
    document.querySelector('.pb-workspace').classList.remove('preview-open');
    const btn = document.getElementById('btn-preview');
    btn.classList.remove('preview-active');
    btn.textContent = '👁 Pré-visualizar';
  };

  // ── Exports ───────────────────────────────────────────────
  window.PropostaBuilder.descarregar = function() {
    if (!validar()) { toast('Preenche os campos obrigatórios.', true); return; }
    const ref = document.getElementById('referencia').value.trim() || 'proposta';
    const nome = document.getElementById('industria').value.trim() || 'cliente';
    const fname = ('Proposta_Comercial_' + nome + '_' + ref + '.html').replace(/[^a-zA-Z0-9_\-.]/g, '_');
    const blob = new Blob([window.PropostaTemplate.render(buildPreviewDados())], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('"' + fname + '" gerado.');
  };

  window.PropostaBuilder.descarregarPDF = function() {
    if (!validar()) { toast('Preenche os campos obrigatórios.', true); return; }
    const html = window.PropostaTemplate.render(buildPreviewDados());
    const win = window.open('', '_blank');
    if (!win) { toast('Permite pop-ups para gerar o PDF.', true); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    const triggerPrint = () => setTimeout(() => win.print(), 800);
    win.onload = triggerPrint;
    if (win.document.readyState === 'complete') triggerPrint();
    toast('Escolhe "Guardar como PDF" no diálogo de impressão.');
  };

  window.PropostaBuilder.imprimir = function() {
    if (!validar()) { toast('Preenche os campos obrigatórios.', true); return; }
    const html = window.PropostaTemplate.render(buildPreviewDados());
    const win = window.open('', '_blank');
    if (!win) { toast('Permite pop-ups para imprimir.', true); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    const triggerPrint = () => setTimeout(() => win.print(), 800);
    win.onload = triggerPrint;
    if (win.document.readyState === 'complete') triggerPrint();
  };

  // Expose save
  window.PropostaBuilder.guardarProposta = guardarProposta;

  // ── Calculadora Simples ───────────────────────────────────
  window.PropostaBuilder.abrirCalculadoraSimples = function() {
    document.getElementById('calcs-overlay').classList.add('open');
    if (!document.querySelectorAll('#calcs-tbody tr').length) calcsAddRow();
    calcsRenderMargens();
    calcsRebuildHeaders();
  };
  function fecharCalculadoraSimples() {
    document.getElementById('calcs-overlay').classList.remove('open');
  }
  window.PropostaBuilder.fecharCalculadoraSimples = fecharCalculadoraSimples;

  function calcsRenderMargens() {
    const list = document.getElementById('calcs-margens-list');
    list.innerHTML = '';
    _calcsMargens.forEach((m, i) => {
      const pill = document.createElement('div');
      pill.className = 'calcs-mpill-edit';
      pill.innerHTML =
        '<input class="mpill-inp" type="number" value="' + m + '" min="0" max="99" step="0.5">' +
        '<span class="mpill-pct">%</span>' +
        (_calcsMargens.length > 1 ? '<button class="mpill-del" title="Remover">×</button>' : '');
      pill.querySelector('.mpill-inp').addEventListener('change', function() {
        calcsUpdateMargemValue(i, this.value);
      });
      if (_calcsMargens.length > 1) {
        pill.querySelector('.mpill-del').addEventListener('click', () => calcsRemoveMargem(i));
      }
      list.appendChild(pill);
    });
  }

  window.PropostaBuilder.calcsAddMargem = function() {
    const rows = calcsGetRowData();
    _calcsMargens.push(Math.round(Math.max.apply(null, _calcsMargens) + 2));
    calcsRenderMargens();
    calcsRebuildHeaders();
    calcsRestoreRows(rows);
  };
  function calcsRemoveMargem(idx) {
    if (_calcsMargens.length <= 1) return;
    const rows = calcsGetRowData();
    _calcsMargens.splice(idx, 1);
    rows.forEach(r => {
      ['selH', 'selM'].forEach(k => {
        if (r[k] !== '' && r[k] !== 'custo') {
          const n = parseInt(r[k], 10);
          r[k] = n === idx ? '' : n > idx ? String(n - 1) : r[k];
        }
      });
    });
    calcsRenderMargens();
    calcsRebuildHeaders();
    calcsRestoreRows(rows);
  }
  function calcsUpdateMargemValue(idx, val) {
    _calcsMargens[idx] = parseFloat(val) || 0;
    const fmtM = m => m % 1 === 0 ? m + '%' : m.toFixed(1) + '%';
    document.querySelectorAll('#calcs-thead th[data-midx]').forEach(th => {
      if (parseInt(th.dataset.midx, 10) === idx) th.textContent = fmtM(_calcsMargens[idx]);
    });
    calcsRecalcular();
  }

  function calcsRebuildHeaders() {
    const N = _calcsMargens.length;
    const fmtM = m => m % 1 === 0 ? m + '%' : m.toFixed(1) + '%';
    const hCols = _calcsMargens.map((m, i) => '<th data-midx="' + i + '">' + fmtM(m) + '</th>').join('');
    const mCols = _calcsMargens.map((m, i) => '<th data-midx="' + i + '">' + fmtM(m) + '</th>').join('');
    let cols = '<col style="width:180px">';
    cols += '<col style="width:140px"><col style="width:70px">';
    for (let i = 0; i < N; i++) cols += '<col style="width:58px">';
    cols += '<col style="width:6px">';
    cols += '<col style="width:140px"><col style="width:75px">';
    for (let i = 0; i < N; i++) cols += '<col style="width:75px">';
    cols += '<col style="width:30px">';
    document.getElementById('calcs-colgroup').innerHTML = cols;
    document.getElementById('calcs-thead').innerHTML =
      '<tr><th rowspan="2" style="text-align:left">Categoria</th>' +
        '<th colspan="' + (2 + N) + '">Hora</th>' +
        '<th class="th-sep" rowspan="2"></th>' +
        '<th colspan="' + (2 + N) + '">Mês</th>' +
        '<th rowspan="2" style="background:var(--accent-ink)"></th></tr>' +
      '<tr class="subhead">' +
        '<th class="th-left">V. (c/duodécimos)</th><th>Custo</th>' + hCols +
        '<th class="th-left">V. (c/duodécimos)</th><th>Custo</th>' + mCols +
      '</tr>';
  }

  function calcsGetRowData() {
    return Array.from(document.querySelectorAll('#calcs-tbody tr')).map(tr => {
      const ins = tr.querySelectorAll('input');
      return {
        cat: ins[0] ? ins[0].value : '',
        vh: ins[1] ? ins[1].value : '',
        vm: ins[2] ? ins[2].value : '',
        selH: tr.dataset.selH || '',
        selM: tr.dataset.selM || '',
      };
    });
  }

  function calcsRestoreRows(rows) {
    document.getElementById('calcs-tbody').innerHTML = '';
    rows.forEach(r => calcsAddRow(r.cat, r.vh, r.vm, r.selH, r.selM));
    if (!rows.length) calcsAddRow();
  }

  window.PropostaBuilder.calcsImportarCategorias = function() {
    const cats = (state.defaults && state.defaults.categoriasDefault) || [];
    cats.forEach(c => calcsAddRow(c));
    calcsRecalcular();
  };
  window.PropostaBuilder.calcsLimpar = function() {
    document.getElementById('calcs-tbody').innerHTML = '';
    calcsAddRow();
  };
  window.PropostaBuilder.calcsAddRow = function() { calcsAddRow(); };

  function calcsAddRow(cat, vh, vm, selH, selM) {
    const N = _calcsMargens.length;
    const tr = document.createElement('tr');
    tr.dataset.selH = selH || '';
    tr.dataset.selM = selM || '';
    let hCells = '', mCells = '';
    for (let i = 0; i < N; i++) {
      hCells += '<td class="cv preco clickable" data-hm="h" data-col="' + i + '">—</td>';
      mCells += '<td class="cv preco clickable" data-hm="m" data-col="' + i + '">—</td>';
    }
    tr.innerHTML =
      '<td><input class="calcs-inp-cat" type="text" value="' + escHtml(cat || '') + '" placeholder="Categoria"></td>' +
      '<td><input class="calcs-inp-val" type="number" min="0" step="0.01" value="' + (vh || '') + '" placeholder="0,00"></td>' +
      '<td class="cv clickable" data-hm="h" data-col="custo">—</td>' +
      hCells +
      '<td class="td-sep"></td>' +
      '<td><input class="calcs-inp-val calcs-inp-val-m" type="number" min="0" step="0.01" value="' + (vm || '') + '" placeholder="0,00"></td>' +
      '<td class="cv clickable" data-hm="m" data-col="custo">—</td>' +
      mCells +
      '<td><button class="calcs-btn-del" title="Remover">×</button></td>';
    tr.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => calcsUpdateRow(tr)));
    tr.querySelectorAll('td[data-hm]').forEach(td => td.addEventListener('click', () => calcsSelectCell(tr, td)));
    tr.querySelector('.calcs-btn-del').addEventListener('click', () => { tr.remove(); _calcsUpdateDelBtns(); });
    document.getElementById('calcs-tbody').appendChild(tr);
    _calcsUpdateDelBtns();
    if ((vh && parseFloat(vh) > 0) || (vm && parseFloat(vm) > 0)) calcsUpdateRow(tr);
    if (selH || selM) calcsApplySel(tr);
  }

  function _calcsUpdateDelBtns() {
    const btns = document.querySelectorAll('#calcs-tbody .calcs-btn-del');
    btns.forEach(b => b.disabled = btns.length === 1);
  }

  function calcsUpdateRow(tr) {
    const mult = parseFloat(document.getElementById('calcs-mult').value) || 1.2575;
    const ins = tr.querySelectorAll('input');
    const vh = parseFloat(ins[1] ? ins[1].value : 0) || 0;
    const vm = parseFloat(ins[2] ? ins[2].value : 0) || 0;
    const ch = vh * mult, cm = vm * mult;
    const fv = v => v > 0 ? v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
    const tch = tr.querySelector("td[data-hm='h'][data-col='custo']");
    const tcm = tr.querySelector("td[data-hm='m'][data-col='custo']");
    if (tch) tch.textContent = fv(ch);
    if (tcm) tcm.textContent = fv(cm);
    _calcsMargens.forEach((m, i) => {
      const p = m / 100;
      const ph = p < 1 && ch > 0 ? ch / (1 - p) : 0;
      const pm = p < 1 && cm > 0 ? cm / (1 - p) : 0;
      const tdh = tr.querySelector("td[data-hm='h'][data-col='" + i + "']");
      const tdm = tr.querySelector("td[data-hm='m'][data-col='" + i + "']");
      if (tdh) tdh.textContent = fv(ph);
      if (tdm) tdm.textContent = fv(pm);
    });
  }
  window.PropostaBuilder.calcsRecalcular = function() {
    document.querySelectorAll('#calcs-tbody tr').forEach(calcsUpdateRow);
  };
  function calcsRecalcular() { window.PropostaBuilder.calcsRecalcular(); }

  function calcsSelectCell(tr, td) {
    const hm = td.dataset.hm, col = td.dataset.col;
    const key = hm === 'h' ? 'selH' : 'selM';
    const cls = hm === 'h' ? 'sel-h' : 'sel-m';
    tr.querySelectorAll("td[data-hm='" + hm + "']").forEach(c => c.classList.remove('sel-h', 'sel-m'));
    if (tr.dataset[key] === col) tr.dataset[key] = '';
    else { tr.dataset[key] = col; td.classList.add(cls); }
  }
  function calcsApplySel(tr) {
    ['selH', 'selM'].forEach(key => {
      const col = tr.dataset[key];
      if (!col) return;
      const hm = key === 'selH' ? 'h' : 'm';
      const td = tr.querySelector("td[data-hm='" + hm + "'][data-col='" + col + "']");
      if (td) td.classList.add(key === 'selH' ? 'sel-h' : 'sel-m');
    });
  }

  window.PropostaBuilder.calcsInserirTodas = function() {
    const mult = parseFloat(document.getElementById('calcs-mult').value) || 1.2575;
    let count = 0;
    document.querySelectorAll('#calcs-tbody tr').forEach(tr => {
      const ins = tr.querySelectorAll('input');
      const cat = ins[0] ? ins[0].value.trim() : '';
      const vh = parseFloat(ins[1] ? ins[1].value : 0) || 0;
      const vm = parseFloat(ins[2] ? ins[2].value : 0) || 0;
      if (!vh && !vm) return;
      const selH = tr.dataset.selH, selM = tr.dataset.selM;
      if (!selH && !selM) return;
      function resolve(val, sel) {
        if (!sel || !val) return 0;
        const cost = val * mult;
        if (sel === 'custo') return cost;
        const p = _calcsMargens[parseInt(sel, 10)] / 100;
        return p < 1 ? cost / (1 - p) : 0;
      }
      const fmt = v => v > 0 ? v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
      addHoraRow(cat, fmt(resolve(vh, selH)), fmt(resolve(vm, selM)));
      count++;
    });
    if (!count) { toast('Clica numa célula para selecionar o valor a inserir.', true); return; }
    if (!state.tableState.hora) window.PropostaBuilder.toggleTable('hora');
    toast(count + (count === 1 ? ' linha inserida' : ' linhas inseridas') + '.');
    fecharCalculadoraSimples();
    schedulePreview();
  };

  // ── Calculadora com Bases ─────────────────────────────────
  window.PropostaBuilder.abrirCalculadora = function() {
    document.getElementById('calc-overlay').classList.add('open');
    calcRecalcular();
  };
  function fecharCalculadora() {
    document.getElementById('calc-overlay').classList.remove('open');
  }
  window.PropostaBuilder.fecharCalculadora = fecharCalculadora;

  window.PropostaBuilder.calcSetModelo = function(m) {
    _calcModelo = m;
    document.getElementById('calc-tab-m1').classList.toggle('active', m === 1);
    document.getElementById('calc-tab-m2').classList.toggle('active', m === 2);
    document.getElementById('calc-panel-m1').style.display = m === 1 ? '' : 'none';
    document.getElementById('calc-panel-m2').style.display = m === 2 ? '' : 'none';
    calcRecalcular();
  };
  window.PropostaBuilder.calcSetMargem = function(val) {
    _calcMargem = val;
    document.querySelectorAll('.calc-mpill').forEach(p => p.classList.toggle('active', parseFloat(p.dataset.m) === val));
    document.getElementById('calc-mcustom-wrap').classList.remove('active');
    document.getElementById('calc-margem-custom').value = '';
    calcRecalcular();
  };
  window.PropostaBuilder.calcSetMargemCustom = function(val) {
    const v = parseFloat(val);
    if (isNaN(v) || val === '') return;
    _calcMargem = v;
    document.querySelectorAll('.calc-mpill').forEach(p => p.classList.remove('active'));
    document.getElementById('calc-mcustom-wrap').classList.add('active');
    calcRecalcular();
  };
  function fmtCalc(val) {
    if (!isFinite(val) || val === null) return '—';
    return val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }
  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = fmtCalc(val);
  }
  function calcRecalcular() {
    const base = parseFloat(document.getElementById('calc-base').value) || 0;
    const horas = parseFloat(document.getElementById('calc-horas').value) || 176;
    let custoMes = 0;
    if (_calcModelo === 1) {
      const cf = parseFloat(document.getElementById('c1-cf').value) || 0;
      const cn = parseFloat(document.getElementById('c1-cn').value) || 0;
      const cfer = parseFloat(document.getElementById('c1-cfer').value) || 0;
      const ccomp = parseFloat(document.getElementById('c1-ccomp').value) || 0;
      const tss = (parseFloat(document.getElementById('c1-tss').value) || 0) / 100;
      const tseg = (parseFloat(document.getElementById('c1-tseg').value) || 0) / 100;
      const gross = base * (1 + cf + cn + cfer + ccomp);
      const ss = base * (1 + cf + cn + cfer) * tss;
      const seg = gross * tseg;
      custoMes = gross + ss + seg;
      setEl('c1-venc', base); setEl('c1-subf', base * cf); setEl('c1-subn', base * cn);
      setEl('c1-fer', base * cfer); setEl('c1-comp', base * ccomp);
      setEl('c1-gross', gross); setEl('c1-ss', ss); setEl('c1-seg', seg); setEl('c1-total', custoMes);
      const coefTot = (1 + cf + cn + cfer + ccomp).toFixed(4);
      const el = document.getElementById('c1-coef-total');
      if (el) el.textContent = '×' + coefTot;
      const lTss = document.getElementById('c1-tss-label');
      if (lTss) lTss.textContent = (tss * 100).toFixed(2) + '%';
      const lSeg = document.getElementById('c1-tseg-label');
      if (lSeg) lSeg.textContent = (tseg * 100).toFixed(2) + '%';
    } else {
      const tss = (parseFloat(document.getElementById('c2-tss').value) || 0) / 100;
      const tseg = (parseFloat(document.getElementById('c2-tseg').value) || 0) / 100;
      const usaFerias = document.getElementById('calc2-ferias').checked;
      const usaComp = document.getElementById('calc2-comp').checked;
      const usaForm = document.getElementById('calc2-form').checked;
      const usaMedica = document.getElementById('calc2-medica').checked;
      const vencAnual = base * 12;
      const subF = base, subN = base;
      const ferias = usaFerias ? base : 0;
      const comp = usaComp ? base / 30 * 24 : 0;
      const form = usaForm ? base / horas * 40 : 0;
      const medica = usaMedica ? 17 : 0;
      const bruto = vencAnual + subF + subN + ferias + comp + form;
      const ssMeses = 12 + 1 + 1 + (usaFerias ? 1 : 0);
      const ss = base * ssMeses * tss + (usaForm ? form * tss : 0);
      const seg = bruto * tseg;
      const anual = bruto + ss + seg + medica;
      custoMes = anual / 12;
      setEl('c2-venc', vencAnual / 12); setEl('c2-subf', subF / 12); setEl('c2-subn', subN / 12);
      setEl('c2-fer', ferias / 12); setEl('c2-comp', comp / 12); setEl('c2-form', form / 12);
      setEl('c2-bruto', bruto / 12); setEl('c2-ss', ss / 12); setEl('c2-seg', seg / 12);
      setEl('c2-med', medica / 12); setEl('c2-total', custoMes);
    }
    const custoHora = horas > 0 ? custoMes / horas : 0;
    const m = _calcMargem / 100;
    const precoMes = m < 1 && custoMes > 0 ? custoMes / (1 - m) : 0;
    const precoHora = m < 1 && custoHora > 0 ? custoHora / (1 - m) : 0;
    document.getElementById('calc-res-custo-mes').textContent = fmtCalc(custoMes);
    document.getElementById('calc-res-custo-hora').textContent = fmtCalc(custoHora);
    document.getElementById('calc-res-preco-mes').textContent = fmtCalc(precoMes);
    document.getElementById('calc-res-preco-hora').textContent = fmtCalc(precoHora);
    const ml = _calcMargem % 1 === 0 ? _calcMargem + '%' : _calcMargem.toFixed(1) + '%';
    document.getElementById('calc-res-margem-label').textContent = ml;
    document.getElementById('calc-res-margem-label2').textContent = ml;
    window._calcPrecoHora = precoHora;
    window._calcPrecoMes = precoMes;
  }
  window.PropostaBuilder.calcRecalcular = calcRecalcular;

  window.PropostaBuilder.calcInserir = function() {
    if (!window._calcPrecoHora && !window._calcPrecoMes) {
      toast('Insere um salário base para calcular.', true);
      return;
    }
    const cat = document.getElementById('calc-categoria').value.trim();
    const fmt = v => v > 0 ? v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
    addHoraRow(cat, fmt(window._calcPrecoHora), fmt(window._calcPrecoMes));
    if (!state.tableState.hora) window.PropostaBuilder.toggleTable('hora');
    toast('Linha adicionada.');
    fecharCalculadora();
    schedulePreview();
  };

  // ── Helpers ───────────────────────────────────────────────
  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function parseNumInput(val) {
    if (val == null || val === '') return null;
    const cleaned = String(val).replace(/€/g, '').replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : null;
  }

  function formatNumInput(v) {
    if (v == null || !isFinite(v)) return '';
    const n = Number(v);
    return n.toLocaleString('pt-PT', { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 4 });
  }

  function parseDateToIso(raw) {
    if (!raw) return '';
    // tenta ISO já
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    // tenta dd/mm/yyyy
    const m = String(raw).match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (m) {
      const d = m[1].padStart(2, '0');
      const mo = m[2].padStart(2, '0');
      return m[3] + '-' + mo + '-' + d;
    }
    return '';
  }

  function updateBadge() {
    document.getElementById('badgeRef').textContent =
      document.getElementById('referencia').value.trim() || '—';
    document.getElementById('badgeCliente').textContent =
      document.getElementById('industria').value.trim() ||
      document.getElementById('nome-cliente').value.trim() || '—';
  }

  function toast(msg, isError) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.background = isError ? '#c62828' : 'var(--accent, #1A206D)';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
  }

  function setActiveNav(id) {
    document.querySelectorAll('.nav-list a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });
  }
  function updateActiveNav() {
    const pane = document.querySelector('.pb-form-pane');
    if (!pane) return;
    const sections = document.querySelectorAll('.section-card');
    let activeId = null;
    if (pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 8) {
      activeId = sections.length ? sections[sections.length - 1].id : null;
    }
    if (!activeId) {
      sections.forEach(s => {
        const top = s.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop;
        if (top <= pane.scrollTop + 80) activeId = s.id;
      });
    }
    if (activeId) setActiveNav(activeId);
  }

})();
