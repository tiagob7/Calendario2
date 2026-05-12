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

  const btnVoz = document.getElementById('btnVoz');
  if (btnVoz && isAdmin) btnVoz.style.display = '';

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
function render() { renderStats(); updatePessoaSelect(); renderKanban(); }

function renderStats() {
  const total = tasks.length;
  const prog  = tasks.filter(t => t.estado === 'progresso').length;
  const urg   = tasks.filter(t => t.prioridade === 'urgente' && t.estado !== 'concluido' && t.estado !== 'cancelado').length;
  const conc  = tasks.filter(t => t.estado === 'concluido').length;
  document.getElementById('statsBar').innerHTML = `
    <div class="stat-tile s-total">
      <div class="stat-tile-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1v3M11 1v3M2 7h12"/></svg></div>
      <div><div class="stat-tile-num">${total}</div><div class="stat-tile-lbl">Total</div></div>
    </div>
    <div class="stat-tile s-progresso">
      <div class="stat-tile-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg></div>
      <div><div class="stat-tile-num">${prog}</div><div class="stat-tile-lbl">Em progresso</div></div>
    </div>
    <div class="stat-tile s-urgente">
      <div class="stat-tile-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2L1.5 13h13L8 2z"/><path d="M8 7v3M8 11.5v.5"/></svg></div>
      <div><div class="stat-tile-num">${urg}</div><div class="stat-tile-lbl">Urgentes</div></div>
    </div>
    <div class="stat-tile s-ok">
      <div class="stat-tile-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8l3.5 3.5L13 4"/></svg></div>
      <div><div class="stat-tile-num">${conc}</div><div class="stat-tile-lbl">Concluídas</div></div>
    </div>`;
}

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

    bodyEl.innerHTML = colTasks.map(t => renderKCard(t)).join('');

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
      <span class="kcard-num">#${t.ordemChegada||''}</span>
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
  document.getElementById('taskDetailTitle').textContent = '#' + (task.ordemChegada || task.id.slice(0,6));
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

// ── VOZ AI (preserved intact) ─────────────────────────────────────────────
const VOZ_CLAUDE_API_KEY = '';

function _vozNormalizarEsc(valor) {
  if (!valor) return '';
  const lista = window.getEscritoriosSync ? window.getEscritoriosSync() : [];
  const limpar = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,' ').trim();
  const v = limpar(valor);
  return (lista.find(e => v.includes(limpar(e.id)) || limpar(e.id).includes(v) || v.includes(limpar(e.nome)) || limpar(e.nome).includes(v)) || {}).id || '';
}

const VOZ_PROMPTS = {
  tarefa: `Analisa este texto em português e extrai os dados para uma tarefa interna.\nResponde APENAS com um objecto JSON válido, sem texto adicional, sem marcadores de código.\nUsa exactamente estas chaves (deixa em branco "" se não mencionado):\n{"titulo":"título curto da tarefa (máx 80 chars)","descricao":"descrição detalhada ou vazio","prioridade":"urgente ou normal ou baixa","escritorio":"quarteira ou albufeira ou lisboa ou porto","departamento":"nome do departamento ou vazio"}`,
  admissao: `Analisa este texto em português e extrai os dados para uma admissão ou cessação.\nResponde APENAS com um objecto JSON válido, sem texto adicional, sem marcadores de código.\nUsa exactamente estas chaves (deixa em branco "" se não mencionado):\n{"tipo":"admissao ou cessacao","nome":"nome completo","numero":"número de colaborador (só dígitos)","nif":"NIF (9 dígitos)","empresa":"nome da empresa utilizadora","categoria":"categoria ou função profissional","escritorio":"quarteira ou albufeira ou lisboa ou porto","dataEntrada":"YYYY-MM-DD ou vazio","valorBase":"valor numérico sem símbolo ex: 1200.00","tipoPagamento":"mes ou hora"}`
};

const VOZ_LABELS = {
  tarefa:   {titulo:'Título',descricao:'Descrição',prioridade:'Prioridade',escritorio:'Escritório',departamento:'Departamento'},
  admissao: {tipo:'Tipo',nome:'Nome',numero:'Nº Colaborador',nif:'NIF',empresa:'Empresa',categoria:'Categoria',escritorio:'Escritório',dataEntrada:'Data entrada',valorBase:'Valor base (€)',tipoPagamento:'Tipo pagamento'}
};

let _vozTipo = 'tarefa', _vozRec = null, _vozGravando = false, _vozTranscricao = '', _vozDados = null;

function vozAbrir(tipo) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { toast('A Web Speech API só funciona no Chrome ou Edge.'); return; }
  _vozTipo = tipo; _vozDados = null; _vozTranscricao = '';
  const overlay = document.getElementById('vozModal');
  overlay.classList.add('open');
  document.getElementById('vozModalTitulo').textContent = tipo === 'tarefa' ? 'Nova tarefa por voz' : 'Novo processo por voz';
  document.getElementById('vozTranscript').classList.remove('visible');
  document.getElementById('vozFields').classList.remove('visible');
  document.getElementById('vozFields').innerHTML = '';
  document.getElementById('vozLoading').classList.remove('visible');
  document.getElementById('vozTranscriptFinal').textContent = '';
  document.getElementById('vozTranscriptInterim').textContent = '';
  document.getElementById('vozStatus').textContent = 'Clica para falar';
  document.getElementById('vozStatus').className = 'voz-status';
  document.getElementById('vozMicBtn').classList.remove('recording');
  document.getElementById('vozActions').innerHTML = '<button class="voz-btn voz-btn-cancel" onclick="vozFechar()">Cancelar</button>';
  overlay.classList.remove('recording');
}
function vozFechar() { if (_vozGravando) vozParar(); document.getElementById('vozModal').classList.remove('open'); }
function vozToggle() { if (_vozGravando) vozParar(); else vozIniciar(); }

function vozIniciar() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  _vozRec = new SR();
  _vozRec.lang = 'pt-PT'; _vozRec.continuous = true; _vozRec.interimResults = true; _vozTranscricao = '';
  document.getElementById('vozTranscript').classList.add('visible');
  document.getElementById('vozTranscriptFinal').textContent = '';
  document.getElementById('vozTranscriptInterim').textContent = '';
  _vozRec.onstart = () => {
    _vozGravando = true;
    document.getElementById('vozMicBtn').classList.add('recording');
    document.getElementById('vozModal').classList.add('recording');
    document.getElementById('vozStatus').textContent = 'A ouvir… (clica para parar)';
    document.getElementById('vozStatus').className = 'voz-status rec';
    document.getElementById('vozMicIcon').innerHTML = '<rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" stroke="none"/>';
  };
  _vozRec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) _vozTranscricao += t + ' ';
      else interim = t;
    }
    document.getElementById('vozTranscriptFinal').textContent = _vozTranscricao;
    document.getElementById('vozTranscriptInterim').textContent = interim;
  };
  _vozRec.onerror = () => vozParar();
  _vozRec.onend = () => { if (_vozGravando) _vozRec.start(); };
  _vozRec.start();
}

function vozParar() {
  _vozGravando = false;
  if (_vozRec) { _vozRec.onend = null; _vozRec.stop(); }
  document.getElementById('vozMicBtn').classList.remove('recording');
  document.getElementById('vozModal').classList.remove('recording');
  document.getElementById('vozStatus').textContent = 'Clica para falar';
  document.getElementById('vozStatus').className = 'voz-status';
  document.getElementById('vozMicIcon').innerHTML = '<rect x="5" y="1" width="6" height="9" rx="3"/><path d="M2 8c0 3.3 2.7 6 6 6s6-2.7 6-6"/><path d="M8 14v2"/>';
  const texto = _vozTranscricao.trim();
  if (texto) vozProcessar(texto);
}

async function vozProcessar(texto) {
  document.getElementById('vozLoading').classList.add('visible');
  document.getElementById('vozFields').classList.remove('visible');
  document.getElementById('vozActions').innerHTML = '';
  try {
    let dados;
    if (!VOZ_CLAUDE_API_KEY) {
      await new Promise(r => setTimeout(r, 1400));
      dados = vozSimular(texto, _vozTipo);
    } else {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':VOZ_CLAUDE_API_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:800, messages:[{role:'user',content:VOZ_PROMPTS[_vozTipo]+'\n\nTexto: "'+texto+'"'}] })
      });
      const data = await resp.json();
      const raw = data.content?.[0]?.text || '{}';
      dados = JSON.parse(raw.replace(/```json|```/g,'').trim());
    }
    _vozDados = dados;
    vozMostrarCampos(dados);
  } catch(e) {
    document.getElementById('vozLoading').classList.remove('visible');
    document.getElementById('vozStatus').textContent = 'Erro: ' + e.message;
    document.getElementById('vozActions').innerHTML = '<button class="voz-btn voz-btn-retry" onclick="vozProcessar(_vozTranscricao.trim())">Tentar novamente</button><button class="voz-btn voz-btn-cancel" onclick="vozFechar()">Cancelar</button>';
  }
}

function vozMostrarCampos(dados) {
  document.getElementById('vozLoading').classList.remove('visible');
  const labels = VOZ_LABELS[_vozTipo];
  const fields = document.getElementById('vozFields');
  const fullFields = _vozTipo === 'tarefa' ? ['descricao'] : ['empresa'];
  fields.innerHTML = Object.entries(dados).map(([k,v]) => {
    if (!(k in labels)) return '';
    const empty = !v || v === '' || v === 'vazio';
    const full = fullFields.includes(k);
    return '<div class="voz-field'+(full?' full':'')+'"><div class="voz-field-key">'+labels[k]+'</div><div class="voz-field-val'+(empty?' empty':'')+'">'+( empty?'—':String(v))+'</div></div>';
  }).join('');
  fields.classList.add('visible');
  document.getElementById('vozActions').innerHTML = `
    <button class="voz-btn voz-btn-confirm" onclick="vozConfirmar()">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8l3.5 3.5L13 4"/></svg>
      Preencher formulário
    </button>
    <button class="voz-btn voz-btn-retry" onclick="vozToggle()">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8A6 6 0 1114 8"/><path d="M2 8V4H6"/></svg>
      Regravar
    </button>`;
}

function vozConfirmar() {
  if (!_vozDados) return;
  if (_vozTipo === 'tarefa') vozPreencherTarefa(_vozDados);
  else vozPreencherAdmissao(_vozDados);
  vozFechar();
  openTaskForm();
}

function vozPreencherTarefa(d) {
  if (d.titulo)    { const el = document.getElementById('fTitulo');    if (el) el.value = d.titulo.trim(); }
  if (d.descricao) { const el = document.getElementById('fDescricao'); if (el) el.value = d.descricao.trim(); }
  const escId = _vozNormalizarEsc(d.escritorio);
  if (escId) { const sel = document.getElementById('fEscritorio'); if (sel) [...sel.options].forEach(o => { if (o.value === escId) sel.value = o.value; }); }
  if (d.prioridade && typeof selPrio === 'function') { const p = String(d.prioridade).toLowerCase().trim(); selPrio(['urgente','normal','baixa'].includes(p) ? p : 'normal'); }
  toast('Formulário preenchido por voz ✓');
}

function vozPreencherAdmissao(d) {
  if (d.tipo && typeof selTipo === 'function') selTipo(d.tipo === 'cessacao' ? 'cessacao' : 'admissao');
  ['nome','numero','nif'].forEach(k => { if (d[k]) { const el = document.getElementById('f'+k.charAt(0).toUpperCase()+k.slice(1)); if (el) el.value = String(d[k]).trim(); } });
  if (d.empresa)  { const el = document.getElementById('fEmpresa');   if (el) el.value = d.empresa.trim(); }
  if (d.categoria){ const el = document.getElementById('fCategoria'); if (el) el.value = d.categoria.trim(); }
  if (d.valorBase){ const el = document.getElementById('fValorBase'); if (el) el.value = String(d.valorBase).replace(/[^0-9.]/g,''); }
  if (d.dataEntrada){ const el = document.getElementById('fDataEntrada'); if (el) { el.value = d.dataEntrada; if (typeof updatePrioPreview === 'function') updatePrioPreview(); } }
  const escId = _vozNormalizarEsc(d.escritorio);
  if (escId) { const sel = document.getElementById('fEscritorioAdm'); if (sel) [...sel.options].forEach(o => { if (o.value === escId) sel.value = o.value; }); }
  if (d.tipoPagamento && typeof selPagamento === 'function') selPagamento(String(d.tipoPagamento).toLowerCase() === 'hora' ? 'hora' : 'mes');
  toast('Formulário preenchido por voz ✓');
}

function vozSimular(texto, tipo) {
  const t = texto.toLowerCase();
  const nome = (texto.match(/\b([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)+)\b/) || [])[1] || '';
  const esc  = _vozNormalizarEsc((window.getEscritoriosSync ? window.getEscritoriosSync() : []).map(e => e.id).find(e => t.includes(e)) || '');
  const data = (texto.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/) || [])[1] || '';
  const numero = (texto.match(/(?:n[uúº°]mero|n[oº]\.?)\s*(\d+)/i) || [])[1] || '';
  const empM = texto.match(/(?:empresa|para\s+(?:a\s+)?empresa)\s+([A-Za-zÀ-ÿ0-9 &,\.]+?)(?:\s+(?:base|categoria|nif|n[uú]mero|escritório|€|\d))/i);
  const catM = texto.match(/categoria\s+([A-Za-zÀ-ÿ ]+?)(?:\s+(?:base|empresa|nif|escritório|€|\d|$))/i);
  const valM = texto.match(/(?:base\s+|salário\s+)?(\d[\d\s]*(?:[.,]\d{1,2})?)\s*€/i) || texto.match(/base\s+(\d[\d\s]*(?:[.,]\d{1,2})?)/i);
  const nif  = (texto.match(/\b(\d{9})\b/) || [])[1] || '';
  if (tipo === 'tarefa') {
    return { titulo:texto.split(' ').slice(0,7).join(' ').replace(/^\w/,c=>c.toUpperCase()), descricao:texto.length>50?texto:'', prioridade:t.includes('urgente')?'urgente':t.includes('baixa')?'baixa':'normal', escritorio:esc, departamento:t.includes('contabil')?'Contabilidade':t.includes('payroll')||t.includes('rh')?'Payroll':'' };
  }
  return { tipo:t.includes('cessa')||t.includes('saída')||t.includes('saida')?'cessacao':'admissao', nome, numero, nif, empresa:empM?empM[1].trim():'', categoria:catM?catM[1].trim():'', escritorio:esc, dataEntrada:data, valorBase:valM?valM[1].replace(/\s/g,'').replace(',','.'):'' , tipoPagamento:t.includes(' hora')||t.includes('horário')?'hora':'mes' };
}

document.getElementById('vozModal').addEventListener('click', function(e) { if (e.target === this) vozFechar(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { vozFechar(); closeTaskDetail(); closeTaskForm(); } });
