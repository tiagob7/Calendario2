const db = firebase.firestore();
let col;
let comunicados = [], selTipoVal = 'geral', filterCat = 'todos', searchQuery = '', showArquivados = false;
let filtroEscritorio = '';
let escDestinosSel = ['todos'];
let _confirmResolve = null;

const TIPO_LABEL = { geral:'Geral', urgente:'Urgente', info:'Info', aviso:'Aviso' };

const TIPO_ICON = {
  geral:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 5h10M3 8h7M3 11h5"/></svg>',
  urgente: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2L1.5 13h13L8 2z"/><path d="M8 7v3M8 11.5v.5"/></svg>',
  info:    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 7v5M8 5v.5"/></svg>',
  aviso:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2L1.5 13h13L8 2z"/><path d="M8 6v4M8 11v.5"/></svg>',
};

// ── Cache ─────────────────────────────────────────────────────────────────
const _comCache = { data: null, ts: 0, escritorio: '__uninit__' };
const COM_CACHE_TTL = 5 * 60 * 1000;

function _comCacheValid(escritorio) {
  return _comCache.data !== null &&
    _comCache.escritorio === (escritorio || '') &&
    (Date.now() - _comCache.ts) < COM_CACHE_TTL;
}
function _invalidateComCache() { _comCache.ts = 0; _comCache.data = null; }

// ── Boot ──────────────────────────────────────────────────────────────────
window.bootProtectedPage({
  activePage: 'comunicados',
  moduleId: 'comunicados',
}, ({ profile, isAdmin, escritorio }) => {

  if (window.temPermissao('modules.comunicados.manage')) {
    const btn = document.getElementById('btnNovoCom');
    if (btn) btn.style.display = '';
    if (profile) {
      const fAutor = document.getElementById('fAutor');
      if (fAutor) fAutor.value = profile.nomeCompleto || profile.nome || '';
    }
  }

  filtroEscritorio = isAdmin
    ? ((escritorio && escritorio !== 'todos') ? escritorio : '')
    : (profile ? (profile.escritorio || '') : '');

  const feEl = document.getElementById('filterEscritorioCom');
  if (feEl) {
    feEl.style.display = '';
    loadEscritorios().then(lista => {
      feEl.innerHTML = '<option value="">Todos os escritórios</option>' +
        lista.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
      if (filtroEscritorio) feEl.value = filtroEscritorio;

      const row = document.getElementById('escDestRow');
      if (row) {
        row.innerHTML = '';
        const btnTodos = document.createElement('button');
        btnTodos.type = 'button';
        btnTodos.className = 'esc-pill esc-pill-todos sel';
        btnTodos.dataset.e = 'todos';
        btnTodos.textContent = 'Todos';
        btnTodos.onclick = function() { toggleEscDestino('todos', this); };
        row.appendChild(btnTodos);
        lista.forEach(e => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'esc-pill'; b.dataset.e = e.id; b.textContent = e.nome;
          b.onclick = function() { toggleEscDestino(e.id, this); };
          row.appendChild(b);
        });
      }
    }).catch(() => { if (filtroEscritorio) feEl.value = filtroEscritorio; });
  }

  col = window.ComunicadosService.proxy();

  function carregarComunicados() {
    if (_comCacheValid(filtroEscritorio)) {
      comunicados = _comCache.data;
      render();
      return;
    }
    setStatus('A carregar…', '#f59e0b');
    col.orderBy('criadoEm', 'desc').limit(200).get()
      .then(snap => {
        comunicados = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _comCache.data = comunicados;
        _comCache.ts = Date.now();
        _comCache.escritorio = filtroEscritorio || '';
        render();
        setStatus('✓ Carregado', '#16a34a');
        setTimeout(() => setStatus(''), 3000);
      })
      .catch(err => { console.error(err); setStatus('Erro', '#dc2626'); });
  }

  carregarComunicados();

  if (new URLSearchParams(location.search).get('novo') === '1' &&
      window.temPermissao('modules.comunicados.manage')) {
    openNovoModal();
  }
});

// ── Modal: novo comunicado ────────────────────────────────────────────────
function openNovoModal() {
  const fTitulo = document.getElementById('fTitulo');
  const fTexto  = document.getElementById('fTexto');
  const fDept   = document.getElementById('fDept');
  if (fTitulo) fTitulo.value = '';
  if (fTexto)  fTexto.value  = '';
  if (fDept)   fDept.value   = '';
  selTipo('geral');
  escDestinosSel = ['todos'];
  document.querySelectorAll('.esc-pill').forEach(b => b.classList.remove('sel'));
  const todosBtn = document.querySelector('.esc-pill-todos');
  if (todosBtn) todosBtn.classList.add('sel');
  document.getElementById('novoModal').classList.add('open');
}
function closeNovoModal() {
  document.getElementById('novoModal').classList.remove('open');
}

// ── Submit ────────────────────────────────────────────────────────────────
async function submitComunicado() {
  const titulo = document.getElementById('fTitulo').value.trim();
  const texto  = document.getElementById('fTexto').value.trim();
  const autor  = document.getElementById('fAutor').value.trim() || 'Administração';
  const deptEl = document.getElementById('fDept');
  const dept   = deptEl ? deptEl.value : '';
  if (!titulo) { toast('Preenche o título!'); return; }
  if (!texto)  { toast('Escreve a mensagem!'); return; }
  let destinos = escDestinosSel && escDestinosSel.length ? [...escDestinosSel] : [];
  const escrOrigem = window.userProfile ? (window.userProfile.escritorio || '') : '';
  if (!destinos.length && escrOrigem) destinos = [escrOrigem];
  try {
    const dados = {
      titulo, texto, autor, dept,
      tipo: selTipoVal,
      arquivado: false,
      criadoEm: Date.now(),
      escritorio: escrOrigem,
      destinosEscritorio: destinos,
      criadoPor: window.currentUser ? window.currentUser.uid : ''
    };
    const docRef = await col.add(dados);
    _invalidateComCache();
    await registarAuditoria({ modulo:'comunicados', acao:'criado', docId:docRef.id, titulo:dados.titulo, depois:dados });
    closeNovoModal();
    toast('✓ Comunicado publicado!');
  } catch(e) { toast('Erro ao publicar.'); }
}

// ── Archive / Delete ──────────────────────────────────────────────────────
async function togglePin(id, current) {
  try {
    await col.doc(id).update({ pinned: !current });
    _invalidateComCache();
    comunicados = comunicados.map(c => c.id === id ? {...c, pinned: !current} : c);
    render();
    toast(current ? 'Comunicado desafixado.' : 'Comunicado afixado.');
  } catch(e) { toast('Erro ao afixar.'); }
}

async function toggleArquivado(id, current) {
  try {
    await col.doc(id).update({ arquivado: !current });
    _invalidateComCache();
    const com = comunicados.find(c => c.id === id);
    await registarAuditoria({ modulo:'comunicados', acao:'estado', docId:id, titulo:com?com.titulo:id, antes:{arquivado:current}, depois:{arquivado:!current} });
    comunicados = comunicados.map(c => c.id === id ? {...c, arquivado: !current} : c);
    render();
  } catch(e) { toast('Erro.'); }
}

async function deleteComunicado(id) {
  if (!await confirmar({ titulo:'Eliminar este comunicado?', btnOk:'Confirmar', perigo:true })) return;
  try {
    const com = comunicados.find(c => c.id === id);
    await col.doc(id).delete();
    _invalidateComCache();
    await registarAuditoria({ modulo:'comunicados', acao:'eliminado', docId:id, titulo:com?com.titulo:id, antes:com||{} });
    comunicados = comunicados.filter(c => c.id !== id);
    closeDetail();
    render();
    toast('Eliminado.');
  } catch(e) { toast('Erro.'); }
}

// ── Filter / search ───────────────────────────────────────────────────────
function getFiltered() {
  let out = comunicados;
  if (filtroEscritorio)    out = out.filter(c => matchComunicadoEscritorio(c, filtroEscritorio));
  if (!showArquivados)     out = out.filter(c => !c.arquivado);
  if (filterCat !== 'todos') out = out.filter(c => c.tipo === filterCat);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    out = out.filter(c =>
      (c.titulo||'').toLowerCase().includes(q) ||
      (c.texto||'').toLowerCase().includes(q) ||
      (c.autor||'').toLowerCase().includes(q)
    );
  }
  return out;
}

function setCat(cat) {
  filterCat = cat;
  document.querySelectorAll('#catFilters .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  renderList();
}

function onSearchInput(val) { searchQuery = val; renderList(); }
function toggleShowArquivados(val) { showArquivados = val; renderList(); }

function setFiltroEscritorioCom(val) {
  filtroEscritorio = val;
  renderList();
}

// ── Render ────────────────────────────────────────────────────────────────
function render() { renderUrgenteBanner(); renderList(); }

function renderUrgenteBanner() {
  const banner = document.getElementById('urgenteBanner');
  const base   = filtroEscritorio ? comunicados.filter(c => matchComunicadoEscritorio(c, filtroEscritorio)) : comunicados;
  const urgentes = base.filter(c => c.tipo === 'urgente' && !c.arquivado);
  if (!urgentes.length || filterCat === 'urgente') { banner.innerHTML = ''; return; }
  banner.innerHTML = urgentes.map(u => `
    <div class="urgente-banner">
      ${TIPO_ICON.urgente}
      <div><strong>${escHtml(u.titulo)}</strong> — ${escHtml(u.autor||'')} · ${fmtShort(u.criadoEm)}</div>
    </div>`).join('');
}

function renderList() {
  const filtered = getFiltered();
  const cb = document.getElementById('countBadge');
  if (cb) cb.textContent = filtered.length + ' comunicado' + (filtered.length !== 1 ? 's' : '');

  const isPinnedActive = c => c.pinned && !c.arquivado;
  const pinned   = filtered.filter(c => isPinnedActive(c));
  const urgentes = filtered.filter(c => c.tipo === 'urgente' && !isPinnedActive(c));
  const rest     = filtered.filter(c => c.tipo !== 'urgente' && !isPinnedActive(c));

  const afixadosSection = document.getElementById('afixadosSection');
  const afixadosGrid    = document.getElementById('afixadosGrid');
  const pinnedSection   = document.getElementById('pinnedSection');
  const comGrid         = document.getElementById('comGrid');
  const comList         = document.getElementById('comunicadosList');

  if (pinned.length) {
    afixadosSection.style.display = '';
    afixadosGrid.innerHTML = pinned.map(c => renderComCard(c)).join('');
  } else {
    afixadosSection.style.display = 'none';
  }

  if (urgentes.length) {
    pinnedSection.style.display = '';
    comGrid.innerHTML = urgentes.map(c => renderComCard(c)).join('');
  } else {
    pinnedSection.style.display = 'none';
  }

  if (!rest.length && !urgentes.length) {
    comList.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><p>Nenhum comunicado encontrado.</p></div>';
    return;
  }
  comList.innerHTML = rest.map(c => renderComRow(c)).join('');
}

function renderComCard(c) {
  const isArq    = c.arquivado;
  const iniciais = (c.autor || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  const canGerir = window.temPermissao && window.temPermissao('modules.comunicados.manage');
  const starSvg  = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 2l1.545 3.13L13 5.633l-2.5 2.437.59 3.44L8 9.75l-3.09 1.76.59-3.44L3 5.633l3.455-.503z"/></svg>';
  const starBtn  = canGerir ? `<button class="btn-star${c.pinned?' active':''}" onclick="event.stopPropagation();togglePin('${c.id}',${!!c.pinned})" title="${c.pinned?'Desafixar':'Afixar'}">${starSvg}</button>` : '';
  const deptLabel = escHtml(c.dept || TIPO_LABEL[c.tipo] || c.tipo);
  const icon      = TIPO_ICON[c.tipo] || TIPO_ICON.geral;
  return `<article class="com-card tipo-${c.tipo}${isArq?' arquivado':''}${c.pinned?' pinned':''}" onclick="openDetail('${c.id}')">
    <div class="com-card-head">
      <span class="com-card-tipo-icon">${icon}</span>
      <div style="flex:1;min-width:0;">
        <div class="com-card-meta">
          <span class="pill neutral">${deptLabel}</span>
          <span class="tipo-dot ${c.tipo}"></span>
          ${isArq?'<span class="pill neutral">Arquivado</span>':''}
        </div>
        <div class="com-card-title">${escHtml(c.titulo)}</div>
      </div>
      ${starBtn}
    </div>
    <p class="com-card-resumo">${escHtml(c.texto||'')}</p>
    <div class="com-card-foot">
      <div style="display:flex;align-items:center;gap:7px;">
        <div class="com-ava">${escHtml(iniciais)}</div>
        <span class="com-meta-text">${escHtml(c.autor||'—')} · ${fmtShort(c.criadoEm)}</span>
      </div>
    </div>
  </article>`;
}

function renderComRow(c) {
  const isArq    = c.arquivado;
  const iniciais = (c.autor || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  const canGerir = window.temPermissao && window.temPermissao('modules.comunicados.manage');
  const starSvg  = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 2l1.545 3.13L13 5.633l-2.5 2.437.59 3.44L8 9.75l-3.09 1.76.59-3.44L3 5.633l3.455-.503z"/></svg>';
  const starBtn  = canGerir ? `<button class="btn-star${c.pinned?' active':''}" onclick="event.stopPropagation();togglePin('${c.id}',${!!c.pinned})" title="${c.pinned?'Desafixar':'Afixar'}">${starSvg}</button>` : '';
  const deptLabel = escHtml(c.dept || TIPO_LABEL[c.tipo] || c.tipo);
  return `<div class="com-row${isArq?' arquivado':''}" onclick="openDetail('${c.id}')">
    ${starBtn}
    <div class="com-row-body">
      <div class="com-row-top">
        <span class="pill neutral">${deptLabel}</span>
        <span class="tipo-dot ${c.tipo}"></span>
        ${isArq?'<span class="pill neutral">Arquivado</span>':''}
        <span class="com-row-date">${fmtShort(c.criadoEm)}</span>
      </div>
      <div class="com-row-title">${escHtml(c.titulo)}</div>
      <div class="com-row-resumo">${escHtml((c.texto||'').substring(0,140))}</div>
    </div>
    <div class="com-row-right">
      <div class="com-ava">${escHtml(iniciais)}</div>
    </div>
  </div>`;
}

// ── Detail modal ──────────────────────────────────────────────────────────
function openDetail(id) {
  const c = comunicados.find(x => x.id === id);
  if (!c) return;
  const canGerir = window.temPermissao && window.temPermissao('modules.comunicados.manage');
  const isArq    = c.arquivado;
  const iniciais = (c.autor || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  const icon     = TIPO_ICON[c.tipo] || TIPO_ICON.geral;

  const titleEl = document.getElementById('detailTitle');
  titleEl.innerHTML = `<div class="com-icon sm">${icon}</div><span>${escHtml(c.titulo)}</span>`;

  let dests = '';
  if (c.destinosEscritorio && Array.isArray(c.destinosEscritorio)) {
    dests = c.destinosEscritorio.includes('todos')
      ? 'Todos os escritórios'
      : c.destinosEscritorio.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(' · ');
  }

  document.getElementById('detailBody').innerHTML = `
    <div class="detail-meta-row">
      <span class="pill ${c.tipo}">${TIPO_LABEL[c.tipo]||c.tipo}</span>
      ${isArq?'<span class="pill neutral">Arquivado</span>':''}
      <div style="display:flex;align-items:center;gap:6px;margin-left:2px;">
        <div class="com-ava">${escHtml(iniciais)}</div>
        <span class="com-meta-text">${escHtml(c.autor||'—')} · ${fmtDateFull(c.criadoEm)}</span>
      </div>
    </div>
    <div class="detail-text">${escHtml(c.texto||'')}</div>
    ${dests ? `<div class="detail-dest-box"><strong>Destinatários:</strong> ${escHtml(dests)}</div>` : ''}
    ${canGerir ? `<div class="com-admin-row">
      <button class="btn-archive${c.pinned?' active':''}" onclick="togglePin('${c.id}',${!!c.pinned});closeDetail()">★ ${c.pinned?'Desafixar':'Afixar'}</button>
      <button class="btn-archive${isArq?' active':''}" onclick="toggleArquivado('${c.id}',${isArq})">${isArq?'↩ Restaurar':'Arquivar'}</button>
      <button class="btn-del" onclick="deleteComunicado('${c.id}')">Eliminar</button>
    </div>` : ''}`;

  document.getElementById('detailModal').classList.add('open');
}

function closeDetail() {
  document.getElementById('detailModal').classList.remove('open');
}

// ── Helpers ───────────────────────────────────────────────────────────────
function selTipo(t) {
  selTipoVal = t;
  document.querySelectorAll('.tipo-pill').forEach(b => b.classList.toggle('sel', b.dataset.t === t));
}

function toggleEscDestino(code, btn) {
  const todosBtn = document.querySelector('.esc-pill-todos');
  if (code === 'todos') {
    escDestinosSel = ['todos'];
    document.querySelectorAll('.esc-pill').forEach(b => b.classList.remove('sel'));
    if (todosBtn) todosBtn.classList.add('sel');
    return;
  }
  escDestinosSel = escDestinosSel.filter(e => e !== 'todos');
  if (todosBtn) todosBtn.classList.remove('sel');
  if (escDestinosSel.includes(code)) {
    escDestinosSel = escDestinosSel.filter(e => e !== code);
    btn.classList.remove('sel');
  } else {
    escDestinosSel.push(code);
    btn.classList.add('sel');
  }
}

function matchComunicadoEscritorio(c, esc) {
  if (!esc) return true;
  const dests = c.destinosEscritorio;
  if (dests && Array.isArray(dests) && dests.length) {
    if (dests.includes('todos')) return true;
    return dests.includes(esc);
  }
  return (c.escritorio || '') === esc;
}

// ── Confirm modal ─────────────────────────────────────────────────────────
function confirmar({ titulo, btnOk, perigo, body }) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = titulo || 'Confirmar';
    const cb = document.getElementById('confirmBody');
    if (cb) cb.textContent = body || '';
    const okBtn = document.getElementById('confirmOk');
    okBtn.textContent = btnOk || 'Confirmar';
    okBtn.className = 'btn ' + (perigo ? 'btn-danger' : 'btn-primary');
    okBtn.onclick = () => { document.getElementById('confirmModal').classList.remove('open'); resolve(true); };
    document.getElementById('confirmCancel').onclick = () => { document.getElementById('confirmModal').classList.remove('open'); resolve(false); };
    document.getElementById('confirmModal').classList.add('open');
  });
}

// ── Compat shim (old filter-btn references) ───────────────────────────────
function setFilter(mode) {
  if (mode === 'activos')   { showArquivados = false; filterCat = 'todos'; }
  if (mode === 'todos')     { showArquivados = true;  filterCat = 'todos'; }
  if (mode === 'urgente')   { showArquivados = false; filterCat = 'urgente'; }
  if (mode === 'arquivado') { showArquivados = true;  filterCat = 'todos'; }
  renderList();
}
