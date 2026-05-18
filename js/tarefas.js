const db = firebase.firestore();
const storage = firebase.storage();

let col;
let tasks = [], selPrioVal = 'normal', filterMode = 'activos', filterPessoa = '';
let filterEscritorio = '';
let pendingFiles = [];
window._files = {};
let _dragging = null;
let _activeDetailId = null;
let _confirmResolve = null;

// Arquivo state
let _arquivoLastDocConc = null;
let _arquivoLastDocCanc = null;
let _arquivoItems       = [];
let _arquivoSearch      = '';
let _arquivoLoading     = false;
const ARQUIVO_PAGE       = 30;
const KANBAN_CONC_LIMIT  = 20;

const PRIO_ORDER  = { urgente:0, normal:1, baixa:2 };
const ESTADO_LABEL = { aguardar:'A aguardar', progresso:'Em progresso', concluido:'Concluído', cancelado:'Cancelado', pendente:'Pendente' };
const PRIO_LABEL   = { urgente:'Urgente', normal:'Normal', baixa:'Baixa' };

const KANBAN_COLS = [
  { id:'aguardar',  label:'A aguardar',   dot:'#94a3b8' },
  { id:'progresso', label:'Em progresso', dot:'var(--blue)' },
  { id:'pendente',  label:'Pendente',     dot:'var(--amber)' },
  { id:'concluido', label:'Concluído',    dot:'var(--green)' },
];

// ── Boot ──────────────────────────────────────────────────────────────────
window.bootProtectedPage({
  activePage: 'tarefas',
  moduleId: 'tarefas',
}, ({ profile, isAdmin, escritorio }) => {

  const canCreate = window.temPermissao('modules.tarefas.create');
  const btnNova = document.getElementById('btnNovaTarefa');
  if (btnNova && !canCreate) btnNova.style.display = 'none';

  if (profile) {
    const nome = profile.nomeCompleto || profile.nome || profile.email || '?';
    const el = document.getElementById('userName');
    const av = document.getElementById('userAvatar');
    if (el) el.textContent = nome;
    if (av) av.textContent = nome.charAt(0).toUpperCase();
  }

  window.loadEscritorios().then(lista => {
    const selEsc = document.getElementById('fEscritorio');
    const selFil = document.getElementById('filterEscritorio');
    if (selEsc) {
      selEsc.innerHTML = lista.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
      if (profile && profile.escritorio && lista.find(e => e.id === profile.escritorio))
        selEsc.value = profile.escritorio;
    }
    if (selFil) {
      selFil.innerHTML = '<option value="">Todos os escritórios</option>' +
        lista.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
      if (filterEscritorio) selFil.value = filterEscritorio;
    }
  });

  const feEl = document.getElementById('filterEscritorio');
  if (feEl) feEl.style.display = '';

  if (isAdmin) {
    filterEscritorio = (escritorio && escritorio !== 'todos') ? escritorio : '';
  } else {
    filterEscritorio = profile ? (profile.escritorio || '') : '';
  }
  if (filterEscritorio) { const fe = document.getElementById('filterEscritorio'); if (fe) fe.value = filterEscritorio; }

  col = window.TasksService.proxy();
  setStatus('A ligar…', '#f59e0b');

  function buildQuery() {
    let q = col;
    if (filterEscritorio) q = q.where('escritorio', '==', filterEscritorio);
    return q.orderBy('ordemChegada', 'asc').limit(100);
  }

  function subscribe() {
    if (window._tarefasUnsub) window._tarefasUnsub();
    const unsub = buildQuery().onSnapshot(snap => {
      tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      render();
      setStatus('✓ Sincronizado', '#16a34a');
      setTimeout(() => setStatus(''), 3000);
    }, err => {
      console.error('tarefas:', err);
      let qFb = col;
      if (filterEscritorio) qFb = qFb.where('escritorio', '==', filterEscritorio);
      window._tarefasUnsub = qFb.limit(100).onSnapshot(snap => {
        tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        render();
        setStatus('✓ Sincronizado', '#16a34a');
        setTimeout(() => setStatus(''), 3000);
      }, err2 => { console.error(err2); setStatus('Erro de ligação', '#dc2626'); });
    });
    window._tarefasUnsub = unsub;
  }

  subscribe();
  window._tarefasResubscribe = subscribe;
  window.addEventListener('beforeunload', () => { if (window._tarefasUnsub) window._tarefasUnsub(); });
});

// ── Submit tarefa ─────────────────────────────────────────────────────────
let _submitLoading = false;

async function submitTarefa() {
  if (_submitLoading) return;
  const titulo    = (document.getElementById('fTitulo') || {}).value?.trim() || '';
  const descricao = (document.getElementById('fDescricao') || {}).value?.trim() || '';
  const destino   = (document.getElementById('fEscritorio') || {}).value || '';
  if (!titulo) { toast('Introduz o título da tarefa!'); return; }

  _submitLoading = true;
  const submitBtn = document.querySelector('#taskFormModal .btn-primary');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '.6'; }

  const profile = window.userProfile;
  const solicitante = profile ? (profile.nomeCompleto || profile.nome || profile.email) : '—';
  const escritorioOrigem = profile && profile.escritorio ? profile.escritorio : '';
  const maxOrdem = tasks.length ? Math.max(...tasks.map(t => t.ordemChegada || 0)) : 0;

  try {
    const dados = {
      titulo, descricao, solicitante,
      prioridade: selPrioVal, estado: 'aguardar', notas: '',
      criadaEm: Date.now(), ordemChegada: maxOrdem + 1,
      escritorio: destino, escritorioOrigem,
      criadoPor: window.currentUser ? window.currentUser.uid : ''
    };
    const docRef = await col.add(dados);
    await registarAuditoria({ modulo:'tarefas', acao:'criado', docId:docRef.id, titulo, depois:dados });

    if (pendingFiles.length) {
      const statusEl = document.getElementById('formUploadStatus');
      if (statusEl) statusEl.textContent = 'A carregar anexos…';
      const ficheiros = [];
      for (const file of pendingFiles) {
        const path = `tarefas/${docRef.id}/${Date.now()}_${file.name}`;
        try {
          const ref  = storage.ref(path);
          const snap = await ref.put(file);
          const url  = await snap.ref.getDownloadURL();
          ficheiros.push({ nome:file.name, url, tamanho:file.size, criadoEm:Date.now(), path });
        } catch(e) { console.error(e); toast('Erro ao carregar: ' + file.name); }
      }
      if (ficheiros.length) await docRef.update({ ficheiros });
      if (statusEl) statusEl.textContent = '';
    }

    pendingFiles = [];
    renderPendingFilesList();
    const fTitulo = document.getElementById('fTitulo'); if (fTitulo) fTitulo.value = '';
    const fDesc   = document.getElementById('fDescricao'); if (fDesc) fDesc.value = '';
    selPrio('normal');
    closeTaskForm();
    toast('✓ Tarefa adicionada!');
  } catch(e) { console.error(e); toast('Erro ao adicionar.'); }
  finally {
    _submitLoading = false;
    if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; }
  }
}

// ── Update / Delete ───────────────────────────────────────────────────────
async function updateEstado(id, val) {
  try {
    const snap = await col.doc(id).get();
    const antes = snap.data();
    await col.doc(id).update({ estado: val });
    await registarAuditoria({ modulo:'tarefas', acao:'estado', docId:id, titulo:antes.titulo, antes:{estado:antes.estado}, depois:{estado:val} });
    tasks = tasks.map(t => t.id === id ? {...t, estado:val} : t);
    if (_activeDetailId === id) {
      const task = tasks.find(t => t.id === id);
      if (task) renderDetailBody(task);
    }
    renderKanban();
  } catch(e) { toast('Erro.'); }
}

async function updateNotas(id, val) {
  try {
    const snap = await col.doc(id).get();
    const antes = snap.data();
    await col.doc(id).update({ notas: val });
    await registarAuditoria({ modulo:'tarefas', acao:'atualizado', docId:id, titulo:antes.titulo, antes:{notas:antes.notas}, depois:{notas:val} });
    tasks = tasks.map(t => t.id === id ? {...t, notas:val} : t);
  } catch(e) {}
}

async function deleteTask(id) {
  if (!await confirmar({ titulo:'Eliminar esta tarefa?', btnOk:'Confirmar', perigo:true })) return;
  try {
    const snap = await col.doc(id).get();
    const antes = snap.data();
    await col.doc(id).delete();
    await registarAuditoria({ modulo:'tarefas', acao:'eliminado', docId:id, titulo:antes.titulo, antes });
    tasks = tasks.filter(t => t.id !== id);
    closeTaskDetail();
    renderKanban();
    toast('Eliminada.');
  } catch(e) { toast('Erro.'); }
}

// ── Filter helpers ────────────────────────────────────────────────────────
function getFiltered() {
  let out = tasks;
  if (filterMode === 'activos')   out = out.filter(t => t.estado !== 'concluido' && t.estado !== 'cancelado');
  if (filterMode === 'concluido') out = out.filter(t => t.estado === 'concluido' || t.estado === 'cancelado');
  if (filterPessoa)               out = out.filter(t => t.solicitante === filterPessoa);
  if (filterEscritorio)           out = out.filter(t => t.escritorio === filterEscritorio);
  return out;
}

function setFilter(mode) {
  filterMode = mode;
  document.querySelectorAll('#filterBtns .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.f === mode));
  renderKanban();
}
function setFilterPessoa(val) { filterPessoa = val; renderKanban(); }
function setFilterEscritorio(val) {
  filterEscritorio = val;
  if (window._tarefasResubscribe) window._tarefasResubscribe();
  else renderKanban();
}

// ── Render ────────────────────────────────────────────────────────────────
function render() { updatePessoaSelect(); renderKanban(); }

function updatePessoaSelect() {
  const names = [...new Set(tasks.map(t => t.solicitante).filter(Boolean))].sort();
  const sel = document.getElementById('filterPessoa'), cur = filterPessoa;
  if (!sel) return;
  sel.innerHTML = '<option value="">Todos os criadores</option>';
  names.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; if (n === cur) o.selected = true; sel.appendChild(o); });
}

function renderKanban() {
  const filtered = getFiltered();
  const cb = document.getElementById('countBadge');
  if (cb) cb.textContent = filtered.length + ' tarefa' + (filtered.length !== 1 ? 's' : '');

  KANBAN_COLS.forEach(col => {
    const colTasks = filtered
      .filter(t => col.id === 'concluido'
        ? (t.estado === 'concluido' || t.estado === 'cancelado')
        : t.estado === col.id)
      .sort((a, b) => (PRIO_ORDER[a.prioridade]??1) - (PRIO_ORDER[b.prioridade]??1));

    const countEl = document.getElementById('count-' + col.id);
    const bodyEl  = document.getElementById('body-' + col.id);
    if (!countEl || !bodyEl) return;

    countEl.textContent = colTasks.length;

    if (!colTasks.length) {
      bodyEl.innerHTML = '<div class="kcol-empty">Arrasta para cá</div>';
      return;
    }

    if (col.id === 'concluido') {
      colTasks.sort((a, b) => (b.criadaEm || 0) - (a.criadaEm || 0));
      const shown   = colTasks.slice(0, KANBAN_CONC_LIMIT);
      const surplus = colTasks.length - shown.length;
      bodyEl.innerHTML = shown.map(t => renderKCard(t)).join('');
      const arquivoBtn = document.createElement('button');
      arquivoBtn.className = 'col-arquivo-link';
      arquivoBtn.textContent = surplus > 0 ? `Arquivo · ver ${surplus} mais` : 'Arquivo';
      arquivoBtn.addEventListener('click', openArquivoModal);
      bodyEl.appendChild(arquivoBtn);
    } else {
      bodyEl.innerHTML = colTasks.map(t => renderKCard(t)).join('');
    }

    bodyEl.querySelectorAll('.kcard').forEach(el => {
      const id = el.dataset.id;
      el.draggable = true;
      el.addEventListener('dragstart', e => {
        _dragging = id;
        setTimeout(() => el.classList.add('dragging'), 0);
      });
      el.addEventListener('dragend', () => {
        _dragging = null;
        el.classList.remove('dragging');
        document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
      });
      el.addEventListener('click', () => openTaskDetail(id));
    });
  });
}

function renderKCard(t) {
  const isDone = t.estado === 'concluido' || t.estado === 'cancelado';
  const iniciais = (t.solicitante || '?').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();
  const pilltone = t.prioridade === 'urgente' ? 'urgente' : t.prioridade === 'baixa' ? 'baixa' : 'normal';

  const ficheiros = t.ficheiros && t.ficheiros.length;
  const notas     = t.notas && t.notas.trim();

  return `<div class="kcard prio-${t.prioridade} estado-${t.estado}" data-id="${t.id}" title="${escHtml(t.titulo)}">
    <div class="kcard-top">
      <span class="kcard-num">T-${t.ordemChegada||''}</span>
      <span class="pill ${pilltone}">${PRIO_LABEL[t.prioridade]||t.prioridade}</span>
    </div>
    <div class="kcard-title${isDone?' done':''}">${escHtml(t.titulo)}</div>
    ${notas ? `<div style="font-size:10px;color:var(--text-4);margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(notas)}</div>` : ''}
    <div class="kcard-foot">
      <div class="kcard-meta">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="6" r="2.5"/><path d="M3 13c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5"/></svg>
        ${escHtml(t.solicitante||'—')}
        ${ficheiros ? `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-left:4px"><path d="M13.5 9.5l-5.5 5.5a4 4 0 01-5.66-5.66L8.5 2.5a2.67 2.67 0 013.77 3.77L6 12.5a1.33 1.33 0 01-1.88-1.88L9.5 5"/></svg>` : ''}
      </div>
      <div class="kcard-ava">${escHtml(iniciais)}</div>
    </div>
  </div>`;
}

// ── Drag & drop ───────────────────────────────────────────────────────────
function onDragOver(colId) {
  if (!_dragging) return;
  document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
  const el = document.getElementById('col-' + colId);
  if (el) el.classList.add('drag-over');
}
function onDragLeave(colId) {
  const el = document.getElementById('col-' + colId);
  if (el) el.classList.remove('drag-over');
}
async function onDrop(colId) {
  document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
  if (!_dragging) return;
  const id = _dragging;
  _dragging = null;
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const newEstado = colId === 'concluido' ? 'concluido' : colId;
  if (task.estado === newEstado) return;
  await updateEstado(id, newEstado);
}

// ── Task Detail Modal ─────────────────────────────────────────────────────
function openTaskDetail(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  _activeDetailId = id;
  document.getElementById('taskDetailTitle').textContent = 'T-' + (task.ordemChegada || task.id.slice(0,6));
  renderDetailBody(task);

  const canResolve = window.temPermissao && window.temPermissao('modules.tarefas.resolve');
  const foot = document.getElementById('taskDetailFoot');
  foot.innerHTML = '';
  if (canResolve) {
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-secondary';
    delBtn.style.marginRight = 'auto';
    delBtn.textContent = 'Eliminar';
    delBtn.onclick = () => deleteTask(id);
    foot.appendChild(delBtn);
  }
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-secondary';
  closeBtn.textContent = 'Fechar';
  closeBtn.onclick = closeTaskDetail;
  foot.appendChild(closeBtn);

  document.getElementById('taskDetailModal').classList.add('open');
}

function renderDetailBody(task) {
  const canResolve = window.temPermissao && window.temPermissao('modules.tarefas.resolve');
  const prioTone = task.prioridade === 'urgente' ? 'urgente' : task.prioridade === 'baixa' ? 'baixa' : 'normal';
  const estadoTone = { aguardar:'neutral', progresso:'blue', concluido:'green', cancelado:'urgente', pendente:'amber' }[task.estado] || 'neutral';

  document.getElementById('taskDetailBody').innerHTML = `
    <div class="task-detail-grid">
      <div>
        <div class="task-detail-title">${escHtml(task.titulo)}</div>
        <div class="task-meta-chips">
          <span class="pill ${prioTone}">${PRIO_LABEL[task.prioridade]||task.prioridade}</span>
          <span class="pill ${estadoTone}">${ESTADO_LABEL[task.estado]||task.estado}</span>
          ${task.escritorio ? `<span class="pill neutral">${escHtml(task.escritorio)}</span>` : ''}
        </div>
        ${task.descricao ? `<div class="task-detail-desc">${escHtml(task.descricao)}</div>` : ''}
        ${canResolve ? `<div class="task-detail-notas">
          <label>Nota interna</label>
          <textarea id="notasInput" onchange="updateNotas('${task.id}',this.value)" placeholder="Escreve uma nota…">${escHtml(task.notas||'')}</textarea>
        </div>` : (task.notas ? `<div class="task-detail-notas"><label>Nota interna</label><div style="font-size:12px;color:var(--text-3);line-height:1.6;padding:8px 0">${escHtml(task.notas)}</div></div>` : '')}
        ${(task.ficheiros && task.ficheiros.length) ? `<div class="card-files">
          <div class="files-header"><span class="files-lbl">Anexos</span></div>
          ${renderFicheiros(task.id, task.ficheiros, canResolve)}
        </div>` : ''}
      </div>
      <div>
        <div class="task-side-card">
          <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-bottom:4px;">Detalhes</div>
          <div class="task-side-row">
            <span>Solicitante</span>
            <span style="font-weight:500">${escHtml(task.solicitante||'—')}</span>
          </div>
          <div class="task-side-row">
            <span>Criado em</span>
            <span>${fmtDateFull(task.criadaEm)}</span>
          </div>
          <div class="task-side-row">
            <span>Prioridade</span>
            <span class="pill ${prioTone}">${PRIO_LABEL[task.prioridade]||task.prioridade}</span>
          </div>
          ${canResolve ? `<div class="task-side-row" style="flex-direction:column;align-items:flex-start;gap:6px;">
            <span>Estado</span>
            <select class="estado-select" onchange="updateEstado('${task.id}',this.value)">
              <option value="aguardar"  ${task.estado==='aguardar' ?'selected':''}>A aguardar</option>
              <option value="progresso" ${task.estado==='progresso'?'selected':''}>Em progresso</option>
              <option value="pendente"  ${task.estado==='pendente' ?'selected':''}>Pendente</option>
              <option value="concluido" ${task.estado==='concluido'?'selected':''}>Concluído</option>
              <option value="cancelado" ${task.estado==='cancelado'?'selected':''}>Cancelado</option>
            </select>
          </div>` : ''}
        </div>
      </div>
    </div>`;
}

function closeTaskDetail() {
  document.getElementById('taskDetailModal').classList.remove('open');
  _activeDetailId = null;
}

// ── Task Form Modal ───────────────────────────────────────────────────────
function openTaskForm() {
  const fTitulo = document.getElementById('fTitulo'); if (fTitulo) fTitulo.value = '';
  const fDesc   = document.getElementById('fDescricao'); if (fDesc) fDesc.value = '';
  selPrio('normal');
  pendingFiles = [];
  renderPendingFilesList();
  document.getElementById('taskFormModal').classList.add('open');
  if (fTitulo) setTimeout(() => fTitulo.focus(), 0);
}
function closeTaskForm() {
  document.getElementById('taskFormModal').classList.remove('open');
}

// ── Pending files ─────────────────────────────────────────────────────────
function onPendingFilesChange(input) {
  Array.from(input.files).forEach(f => {
    if (f.size > 15 * 1024 * 1024) { toast('Ficheiro demasiado grande (máx 15 MB): ' + f.name); return; }
    pendingFiles.push(f);
  });
  input.value = '';
  renderPendingFilesList();
}
function renderPendingFilesList() {
  const container = document.getElementById('pendingFilesList');
  if (!container) return;
  if (!pendingFiles.length) { container.innerHTML = ''; return; }
  container.innerHTML = pendingFiles.map((f, i) => `
    <div class="file-item">
      <span>📄</span>
      <span class="file-item-name" title="${escHtml(f.name)}">${escHtml(f.name)}</span>
      <span class="file-item-size">${fmtBytes(f.size)}</span>
      <button class="file-item-del" onclick="removePendingFile(${i})" title="Remover">✕</button>
    </div>`).join('');
}
function removePendingFile(i) { pendingFiles.splice(i, 1); renderPendingFilesList(); }

// ── File list render ──────────────────────────────────────────────────────
function renderFicheiros(docId, ficheiros, canDel) {
  window._files[docId] = ficheiros;
  if (!ficheiros.length) return '<div class="files-empty">Sem anexos</div>';
  return ficheiros.map((f, i) => `
    <div class="file-item">
      <span>📄</span>
      <span class="file-item-name" title="${escHtml(f.nome)}">${escHtml(f.nome)}</span>
      <span class="file-item-size">${fmtBytes(f.tamanho)}</span>
      <a class="file-item-dl" href="${escHtml(f.url)}" target="_blank" rel="noopener">⬇ Download</a>
      ${canDel ? `<button class="file-item-del" onclick="event.stopPropagation();deleteFicheiro('${escHtml(docId)}',${i})" title="Remover">✕</button>` : ''}
    </div>`).join('');
}

async function deleteFicheiro(docId, index) {
  const f = (window._files[docId] || [])[index];
  if (!f || !await confirmar({ titulo:'Remover este anexo?', btnOk:'Remover', perigo:true })) return;
  try {
    if (f.path) await storage.ref(f.path).delete().catch(()=>{});
    await col.doc(docId).update({ ficheiros: firebase.firestore.FieldValue.arrayRemove(f) });
    toast('Ficheiro removido.');
  } catch(e) { toast('Erro ao remover.'); }
}

function fmtBytes(b) {
  if (!b) return '';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return Math.round(b / 1024) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

// ── Arquivo modal ─────────────────────────────────────────────────────────
function openArquivoModal() {
  _arquivoItems = []; _arquivoLastDocConc = null; _arquivoLastDocCanc = null; _arquivoSearch = '';
  const listEl = document.getElementById('arquivoList');
  const infoEl = document.getElementById('arquivoCountInfo');
  const moreEl = document.getElementById('arquivoLoadMore');
  const searchEl = document.getElementById('arquivoSearch');
  if (listEl)   listEl.innerHTML = '';
  if (infoEl)   infoEl.textContent = '';
  if (moreEl)   moreEl.style.display = 'none';
  if (searchEl) searchEl.value = '';
  document.getElementById('arquivoModal').classList.add('open');
  _arquivoFetch();
}

function closeArquivoModal() {
  const modal = document.getElementById('arquivoModal');
  if (modal) modal.classList.remove('open');
  _arquivoItems = []; _arquivoLastDocConc = null; _arquivoLastDocCanc = null;
}

async function _arquivoFetch() {
  if (_arquivoLoading) return;
  _arquivoLoading = true;

  const listEl = document.getElementById('arquivoList');
  if (_arquivoItems.length === 0 && listEl)
    listEl.innerHTML = '<div class="arquivo-empty">A carregar…</div>';

  try {
    const base = firebase.firestore().collection('tarefas_todo');

    let qConc = base.where('estado', '==', 'concluido').orderBy('criadaEm', 'desc').limit(ARQUIVO_PAGE);
    let qCanc = base.where('estado', '==', 'cancelado').orderBy('criadaEm', 'desc').limit(ARQUIVO_PAGE);
    if (_arquivoLastDocConc) qConc = qConc.startAfter(_arquivoLastDocConc);
    if (_arquivoLastDocCanc) qCanc = qCanc.startAfter(_arquivoLastDocCanc);

    const [snapConc, snapCanc] = await Promise.all([qConc.get(), qCanc.get()]);

    if (snapConc.docs.length) _arquivoLastDocConc = snapConc.docs[snapConc.docs.length - 1];
    if (snapCanc.docs.length) _arquivoLastDocCanc = snapCanc.docs[snapCanc.docs.length - 1];

    const merged = [...snapConc.docs, ...snapCanc.docs]
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.criadaEm || 0) - (a.criadaEm || 0))
      .slice(0, ARQUIVO_PAGE);

    const hasMore = snapConc.docs.length === ARQUIVO_PAGE || snapCanc.docs.length === ARQUIVO_PAGE;

    _arquivoItems = [..._arquivoItems, ...merged];

    const moreEl = document.getElementById('arquivoLoadMore');
    if (moreEl) moreEl.style.display = hasMore ? '' : 'none';

    renderArquivoList();

    const infoEl = document.getElementById('arquivoCountInfo');
    if (infoEl) infoEl.textContent = _arquivoItems.length + ' tarefa' + (_arquivoItems.length !== 1 ? 's' : '') + ' carregada' + (_arquivoItems.length !== 1 ? 's' : '');
  } catch(e) {
    console.error('arquivo:', e);
    const listEl = document.getElementById('arquivoList');
    if (listEl) listEl.innerHTML = '<div class="arquivo-empty">Erro ao carregar o arquivo.</div>';
  } finally {
    _arquivoLoading = false;
  }
}

function renderArquivoList() {
  const listEl = document.getElementById('arquivoList');
  if (!listEl) return;

  const term = _arquivoSearch;
  const visible = term
    ? _arquivoItems.filter(t => (t.titulo || '').toLowerCase().includes(term))
    : _arquivoItems;

  if (!visible.length) {
    listEl.innerHTML = '<div class="arquivo-empty">' + (term ? 'Nenhuma tarefa encontrada.' : 'Sem tarefas no arquivo.') + '</div>';
    return;
  }

  listEl.innerHTML = visible.map(t => {
    const estadoTone = t.estado === 'concluido' ? 'green' : 'neutral';
    const estadoLbl  = t.estado === 'concluido' ? 'Concluído' : 'Cancelado';
    const prioTone   = t.prioridade === 'urgente' ? 'urgente' : t.prioridade === 'baixa' ? 'baixa' : 'normal';
    const data       = fmtDateFull ? fmtDateFull(t.criadaEm) : (t.criadaEm ? new Date(t.criadaEm).toLocaleDateString('pt-PT') : '—');
    const escLabel   = t.escritorio ? `<span class="pill neutral">${escHtml(t.escritorio)}</span>` : '';
    return `<div class="arquivo-row">
      <span class="arquivo-row-num">T-${t.ordemChegada || ''}</span>
      <span class="arquivo-row-title" title="${escHtml(t.titulo || '')}">${escHtml(t.titulo || '—')}</span>
      <div class="arquivo-row-pills">
        <span class="pill ${estadoTone}">${estadoLbl}</span>
        <span class="pill ${prioTone}">${PRIO_LABEL[t.prioridade] || t.prioridade || ''}</span>
        ${escLabel}
      </div>
      <span class="arquivo-row-meta">${escHtml(t.solicitante || '—')} · ${data}</span>
      <button class="btn btn-secondary arquivo-row-ver" onclick="openTaskDetail('${escHtml(t.id)}');closeArquivoModal()">Ver</button>
    </div>`;
  }).join('');
}

function onArquivoSearch(value) {
  _arquivoSearch = value.trim().toLowerCase();
  renderArquivoList();
}

function loadMaisArquivo() { _arquivoFetch(); }

// ── Confirm modal ─────────────────────────────────────────────────────────
function confirmar({ titulo, btnOk, perigo, body }) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = titulo || 'Confirmar';
    const cb = document.getElementById('confirmBody'); if (cb) cb.textContent = body || '';
    const okBtn = document.getElementById('confirmOk');
    okBtn.textContent = btnOk || 'Confirmar';
    okBtn.className = 'btn ' + (perigo ? 'btn-danger' : 'btn-primary');
    okBtn.onclick = () => { document.getElementById('confirmModal').classList.remove('open'); resolve(true); };
    document.getElementById('confirmCancel').onclick = () => { document.getElementById('confirmModal').classList.remove('open'); resolve(false); };
    document.getElementById('confirmModal').classList.add('open');
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────
function selPrio(p) {
  selPrioVal = p;
  document.querySelectorAll('.prio-pill').forEach(b => b.classList.toggle('sel', b.dataset.p === p));
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────

document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeTaskDetail(); closeTaskForm(); closeArquivoModal(); } });
