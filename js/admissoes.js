/* ── Admissões & Cessações ── */

const col     = window.AdmissoesService.proxy();
const storage = firebase.storage();
window._files = {};

// ── STATE ──────────────────────────────────────────────────────
let processos       = [];
let isGestor        = false;
let selTipoVal      = 'admissao';
let selPagamentoVal = 'mes';
let filterTipo      = 'todos';
let filterEstado    = 'activos';
let filterPrio      = 'todos';
let filtroEscritorio = '';
let searchVal       = '';
let currentView     = 'cards';
let activeDrawerId  = null;
let activeTab       = 'detalhe';
let pendingFilesAdm = [];
let _confirmResolve = null;

// ── HELPERS ─────────────────────────────────────────────────────
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(s) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}
function fmtDateFull(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('pt-PT', { day:'2-digit', month:'short', year:'numeric' });
}
function fmtMoney(v) {
  const n = parseFloat(v);
  return isNaN(n) ? '—' : n.toLocaleString('pt-PT', { style:'currency', currency:'EUR' });
}
function fmtBytes(b) {
  if (!b) return '';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return Math.round(b / 1024) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function admInitials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase() || '?';
}
function admDateStr(p) { return p.tipo === 'admissao' ? p.dataEntrada : p.dataSaida; }
function admAvatarColor(tipo) { return tipo === 'admissao' ? 'green' : 'amber'; }
function setStatus(msg, color) {
  const el = document.getElementById('syncStatus');
  if (el) { el.textContent = msg; el.style.color = color || ''; }
}
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── PRIORIDADE ───────────────────────────────────────────────────
function calcPrioridade(dateStr) {
  if (!dateStr) return 'baixa';
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const diff = Math.round((new Date(dateStr + 'T00:00:00') - hoje) / 86400000);
  if (diff <= 1) return 'alta';
  if (diff <= 3) return 'media';
  return 'baixa';
}
function prioLabel(prio) {
  if (prio === 'alta')  return 'Alta — data iminente';
  if (prio === 'media') return 'Média — em breve';
  return 'Baixa — sem urgência';
}
function updatePrioPreview() {
  const val = document.getElementById('fDataEntrada').value;
  const el  = document.getElementById('prioPreviewAdm');
  if (!val || !el) return;
  const prio = calcPrioridade(val);
  el.innerHTML = `<div class="prio-preview-new ${prio}"><span class="prio-dot ${prio}"></span>Prioridade calculada: ${prioLabel(prio)}</div>`;
  el.style.display = 'block';
}
function updatePrioPreviewCessacao() {
  const val = document.getElementById('fDataSaida').value;
  const el  = document.getElementById('prioPreviewCes');
  if (!val || !el) return;
  const prio = calcPrioridade(val);
  el.innerHTML = `<div class="prio-preview-new ${prio}"><span class="prio-dot ${prio}"></span>Prioridade calculada: ${prioLabel(prio)}</div>`;
  el.style.display = 'block';
}

// ── PILLS HTML ───────────────────────────────────────────────────
function pillTipo(tipo) {
  return tipo === 'admissao'
    ? `<span class="pill green"><span class="pill-dot" style="background:var(--green)"></span>Admissão</span>`
    : `<span class="pill amber"><span class="pill-dot" style="background:var(--amber)"></span>Cessação</span>`;
}
function pillEstado(estado) {
  const map = {
    aguardar:  { cls:'neutral', dot:null,            label:'A aguardar' },
    pendente:  { cls:'blue',   dot:'var(--blue)',   label:'Pendente' },
    concluido: { cls:'green',  dot:'var(--green)',  label:'Concluído' },
    cancelado: { cls:'red',    dot:'var(--red)',    label:'Cancelado' },
  };
  const c = map[estado] || map.aguardar;
  const dotHtml = c.dot ? `<span class="pill-dot" style="background:${c.dot}"></span>` : '';
  return `<span class="pill ${c.cls}">${dotHtml}${c.label}</span>`;
}
function pillPrio(prio) {
  if (prio === 'alta')  return `<span class="pill red"><span class="pill-dot" style="background:var(--red)"></span>Alta</span>`;
  if (prio === 'media') return `<span class="pill amber"><span class="pill-dot" style="background:var(--amber)"></span>Média</span>`;
  return `<span class="pill neutral">Baixa</span>`;
}

// ── FILTERS ──────────────────────────────────────────────────────
function getFiltered() {
  const order = { alta:0, media:1, baixa:2 };
  return processos.filter(p => {
    if (filterTipo !== 'todos' && p.tipo !== filterTipo) return false;
    if (filterPrio !== 'todos' && p.prioridade !== filterPrio) return false;
    if (filtroEscritorio && p.escritorio !== filtroEscritorio) return false;
    if (filterEstado === 'activos') { if (p.estado === 'concluido' || p.estado === 'cancelado') return false; }
    else if (filterEstado !== 'todos' && p.estado !== filterEstado) return false;
    if (searchVal) {
      const s = searchVal.toLowerCase();
      if (![p.nome, p.empresa, p.numero, p.nif, p.categoria].filter(Boolean).some(v => v.toLowerCase().includes(s))) return false;
    }
    return true;
  }).sort((a, b) => {
    const da = (a.estado==='concluido'||a.estado==='cancelado') ? 1 : 0;
    const db = (b.estado==='concluido'||b.estado==='cancelado') ? 1 : 0;
    if (da !== db) return da - db;
    const pd = (order[a.prioridade]??2) - (order[b.prioridade]??2);
    if (pd !== 0) return pd;
    return (b.criadoEm||0) - (a.criadoEm||0);
  });
}

function setFilterTipo(v) {
  filterTipo = v;
  document.querySelectorAll('#segTipo .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.ft === v));
  renderList();
}
function setFilterEstado(v) { filterEstado = v; renderList(); }
function setFilterPrio(v)   { filterPrio   = v; renderList(); }
function setSearch(v)        { searchVal   = v; renderList(); }
function setFiltroEscritorioAdm(v) { filtroEscritorio = v; renderStats(); renderList(); }
function setView(v) {
  currentView = v;
  document.getElementById('btnViewCards').classList.toggle('active', v === 'cards');
  document.getElementById('btnViewTable').classList.toggle('active', v === 'table');
  renderList();
}

// ── RENDER ───────────────────────────────────────────────────────
function render() { renderStats(); renderList(); }

function renderStats() {
  const base    = filtroEscritorio ? processos.filter(p => p.escritorio === filtroEscritorio) : processos;
  const activos = base.filter(p => p.estado !== 'concluido' && p.estado !== 'cancelado');
  document.getElementById('statAdm').textContent  = base.filter(p => p.tipo === 'admissao' && p.estado !== 'concluido' && p.estado !== 'cancelado').length;
  document.getElementById('statCes').textContent  = base.filter(p => p.tipo === 'cessacao' && p.estado !== 'concluido' && p.estado !== 'cancelado').length;
  document.getElementById('statAlta').textContent = activos.filter(p => p.prioridade === 'alta').length;
  document.getElementById('statPend').textContent = activos.filter(p => p.estado === 'pendente').length;
  document.getElementById('statConc').textContent = base.filter(p => p.estado === 'concluido').length;
}

function renderList() {
  const container = document.getElementById('listArea');
  const filtered  = getFiltered();
  document.getElementById('countBadge').textContent = filtered.length + ' processo' + (filtered.length !== 1 ? 's' : '');

  if (!filtered.length) {
    container.innerHTML = `
      <div class="adm-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
        <div class="empty-title">Sem processos</div>
        <div class="empty-sub">Ajusta os filtros ou cria um novo processo.</div>
        ${document.getElementById('btnNovoPedido').style.display !== 'none'
          ? `<button class="btn btn-primary btn-sm" onclick="openModalNovo()">+ Novo pedido</button>` : ''}
      </div>`;
    return;
  }

  if (currentView === 'cards') {
    container.innerHTML = `<div class="adm-grid">${filtered.map(renderCard).join('')}</div>`;
  } else {
    container.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th style="width:30%">Colaborador</th>
            <th>Tipo</th>
            <th>Data</th>
            <th>Escritório</th>
            <th>Prio</th>
            <th>Estado</th>
            <th style="text-align:right;padding-right:16px">Anexos</th>
          </tr></thead>
          <tbody>${filtered.map(renderRow).join('')}</tbody>
        </table>
      </div>`;
  }
}

function renderCard(p) {
  const isDone   = p.estado === 'concluido' || p.estado === 'cancelado';
  const dateStr  = admDateStr(p);
  const colorCls = admAvatarColor(p.tipo);
  const initials = admInitials(p.nome);
  const valDisplay = p.tipo === 'admissao'
    ? fmtMoney(p.valorBase || p.valorMes || p.valorHora)
    : (escHtml(p.motivo) || '—');
  const valLabel = p.tipo === 'admissao' ? 'Valor base' : 'Motivo';

  return `
    <button class="adm-card tipo-${escHtml(p.tipo)}${isDone?' done':''}" onclick="openDrawer('${escHtml(p.id)}')">
      <div class="adm-card-stripe"></div>
      <div class="adm-card-head">
        <div class="adm-avatar ${colorCls}">${escHtml(initials)}</div>
        <div style="flex:1;min-width:0">
          <div class="adm-card-name">${escHtml(p.nome)}</div>
          <div class="adm-card-sub">
            <span>${escHtml(p.empresa||'—')}</span>
            ${p.categoria ? `<span style="color:var(--text-4)">·</span><span>${escHtml(p.categoria)}</span>` : ''}
          </div>
        </div>
        <span class="prio-dot ${p.prioridade}" title="Prioridade ${p.prioridade}"></span>
      </div>
      <div class="adm-card-meta">
        <div>
          <div class="adm-meta-lbl">${p.tipo==='admissao'?'Entrada':'Saída'}</div>
          <div class="adm-meta-val" style="font-family:'DM Mono',monospace;font-size:12px">${fmtDate(dateStr)}</div>
        </div>
        <div>
          <div class="adm-meta-lbl">NIF</div>
          <div class="adm-meta-val" style="font-family:'DM Mono',monospace;font-size:12px">${escHtml(p.nif||'—')}</div>
        </div>
        <div>
          <div class="adm-meta-lbl">${escHtml(valLabel)}</div>
          <div class="adm-meta-val">${valDisplay}</div>
        </div>
        <div>
          <div class="adm-meta-lbl">Nº</div>
          <div class="adm-meta-val" style="font-family:'DM Mono',monospace;font-size:12px">${escHtml(p.numero||'—')}</div>
        </div>
      </div>
      <div class="adm-card-foot">
        <div class="adm-card-badges">
          ${pillTipo(p.tipo)}
          ${pillEstado(p.estado)}
        </div>
        <div class="adm-card-hint">
          ${p.ficheiros?.length ? `<span>📎 ${p.ficheiros.length}</span>` : ''}
          ${p.notas ? `<span title="Tem nota interna">✏</span>` : ''}
          <span style="font-family:'DM Mono',monospace;font-size:11px">#${escHtml(p.numero||'—')}</span>
        </div>
      </div>
    </button>`;
}

function renderRow(p) {
  const dateStr = admDateStr(p);
  const initials = admInitials(p.nome);
  const colorCls = admAvatarColor(p.tipo);
  return `
    <tr onclick="openDrawer('${escHtml(p.id)}')">
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="adm-avatar ${colorCls}" style="width:32px;height:32px;font-size:11px">${escHtml(initials)}</div>
          <div style="min-width:0">
            <div style="font-weight:600;font-size:13px">${escHtml(p.nome)}</div>
            <div style="font-size:11.5px;color:var(--text-3)">${escHtml(p.empresa||'—')} · <span style="font-family:'DM Mono',monospace">#${escHtml(p.numero||'—')}</span></div>
          </div>
        </div>
      </td>
      <td>${pillTipo(p.tipo)}</td>
      <td><span style="font-family:'DM Mono',monospace;font-size:12px">${fmtDate(dateStr)}</span></td>
      <td><span style="font-size:12px;color:var(--text-3)">${escHtml(p.escritorio||'—')}</span></td>
      <td>${pillPrio(p.prioridade)}</td>
      <td>${pillEstado(p.estado)}</td>
      <td style="text-align:right;padding-right:16px;font-size:12px;color:var(--text-3)">
        ${p.ficheiros?.length ? `📎 ${p.ficheiros.length}` : '—'}
      </td>
    </tr>`;
}

// ── DRAWER ───────────────────────────────────────────────────────
function openDrawer(id) {
  const proc = processos.find(p => p.id === id);
  if (!proc) return;
  activeDrawerId = id;
  activeTab = 'detalhe';
  renderDrawer(proc);
  document.getElementById('drawerOverlay').classList.add('open');
}

function closeDrawer() {
  document.getElementById('drawerOverlay').classList.remove('open');
  activeDrawerId = null;
}

function getActiveProc() {
  return activeDrawerId ? processos.find(p => p.id === activeDrawerId) : null;
}

function renderDrawer(proc) {
  renderDrawerHead(proc);
  renderDrawerActions(proc);
  renderDrawerTabs(proc);
  renderDrawerBody(proc);
}

function renderDrawerHead(proc) {
  const initials = admInitials(proc.nome);
  const colorCls = admAvatarColor(proc.tipo);
  document.getElementById('drawerHead').innerHTML = `
    <div class="adm-avatar ${colorCls}" style="width:44px;height:44px;font-size:15px;flex-shrink:0">${escHtml(initials)}</div>
    <div class="drawer-head-info">
      <div class="drawer-person-name">${escHtml(proc.nome)}</div>
      <div class="drawer-person-sub">${escHtml(proc.empresa||'—')}${proc.categoria ? ' · ' + escHtml(proc.categoria) : ''}</div>
      <div class="drawer-badges">
        ${pillTipo(proc.tipo)}
        ${pillEstado(proc.estado)}
        ${pillPrio(proc.prioridade)}
      </div>
    </div>
    <button class="drawer-close" onclick="closeDrawer()" title="Fechar">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l10 10M13 3L3 13"/></svg>
    </button>`;
}

function renderDrawerActions(proc) {
  const gestorActions = isGestor ? `
    <select class="drawer-estado" onchange="updateEstado('${escHtml(proc.id)}', this.value)">
      <option value="aguardar"  ${proc.estado==='aguardar' ?'selected':''}>⬜ A aguardar</option>
      <option value="pendente"  ${proc.estado==='pendente' ?'selected':''}>🔵 Pendente</option>
      <option value="concluido" ${proc.estado==='concluido'?'selected':''}>✅ Concluído</option>
      <option value="cancelado" ${proc.estado==='cancelado'?'selected':''}>🔴 Cancelado</option>
    </select>
    <button class="btn btn-secondary btn-sm">✉ Notificar RH</button>
    <span class="drawer-spacer"></span>
    <button class="btn btn-danger btn-sm" onclick="confirmDelete('${escHtml(proc.id)}')">
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10"/></svg>
      Eliminar
    </button>` : '';

  document.getElementById('drawerActions').innerHTML = gestorActions ||
    `<span style="font-size:12px;color:var(--text-3)">Apenas gestores podem alterar o estado.</span>`;
}

function renderDrawerTabs(proc) {
  document.querySelectorAll('.drawer-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === activeTab);
    if (t.dataset.tab === 'anexos') {
      t.textContent = `Anexos${proc.ficheiros?.length ? ' · ' + proc.ficheiros.length : ''}`;
    }
  });
}

function switchTab(tab) {
  activeTab = tab;
  const proc = getActiveProc();
  if (!proc) return;
  renderDrawerTabs(proc);
  renderDrawerBody(proc);
}

function renderDrawerBody(proc) {
  const body = document.getElementById('drawerBody');
  if (activeTab === 'detalhe')   body.innerHTML = renderTabDetalhe(proc);
  if (activeTab === 'checklist') body.innerHTML = renderTabChecklist(proc);
  if (activeTab === 'anexos')    body.innerHTML = renderTabAnexos(proc);
  if (activeTab === 'historico') body.innerHTML = renderTabHistorico(proc);
}

function renderTabDetalhe(proc) {
  const isAdm = proc.tipo === 'admissao';
  let html = `
    <div class="info-block">
      <div class="info-block-label">Identificação</div>
      <div class="info-grid">
        <div class="info-row"><span class="muted">Nome</span><span class="val">${escHtml(proc.nome)}</span></div>
        <div class="info-row"><span class="muted">Nº colaborador</span><span class="val mono">${escHtml(proc.numero||'—')}</span></div>
        <div class="info-row"><span class="muted">NIF</span><span class="val mono">${escHtml(proc.nif||'—')}</span></div>
        <div class="info-row"><span class="muted">Submetido por</span><span class="val">${escHtml(proc.submetidoPor||'—')}</span></div>
        <div class="info-row"><span class="muted">Criado em</span><span class="val">${fmtDateFull(proc.criadoEm)}</span></div>
      </div>
    </div>`;

  if (isAdm) {
    html += `
      <div class="info-block">
        <div class="info-block-label">Empresa &amp; categoria</div>
        <div class="info-grid">
          <div class="info-row"><span class="muted">Empresa</span><span class="val">${escHtml(proc.empresa||'—')}</span></div>
          <div class="info-row"><span class="muted">Categoria</span><span class="val">${escHtml(proc.categoria||'—')}</span></div>
          <div class="info-row"><span class="muted">Escritório</span><span class="val">${escHtml(proc.escritorio||'—')}</span></div>
          <div class="info-row"><span class="muted">Data entrada</span><span class="val mono">${fmtDate(proc.dataEntrada)}</span></div>
        </div>
      </div>
      <div class="info-block">
        <div class="info-block-label">Condições contratuais</div>
        <div class="info-grid">
          <div class="info-row"><span class="muted">Tipo pagamento</span><span class="val">${proc.tipoPagamento==='hora'?'À hora':'Mensal'}</span></div>
          <div class="info-row"><span class="muted">Valor base</span><span class="val mono">${fmtMoney(proc.valorBase)}</span></div>
          <div class="info-row"><span class="muted">Valor mês</span><span class="val mono">${fmtMoney(proc.valorMes)}</span></div>
          <div class="info-row"><span class="muted">Valor hora</span><span class="val mono">${fmtMoney(proc.valorHora)}</span></div>
        </div>
      </div>`;
  } else {
    html += `
      <div class="info-block">
        <div class="info-block-label">Saída</div>
        <div class="info-grid">
          <div class="info-row"><span class="muted">Empresa</span><span class="val">${escHtml(proc.empresa||'—')}</span></div>
          <div class="info-row"><span class="muted">Data saída</span><span class="val mono">${fmtDate(proc.dataSaida)}</span></div>
          <div class="info-row"><span class="muted">Motivo</span><span class="val">${escHtml(proc.motivo||'—')}</span></div>
          <div class="info-row"><span class="muted">Escritório</span><span class="val">${escHtml(proc.escritorio||'—')}</span></div>
        </div>
      </div>`;
  }

  html += `
    <div class="info-block">
      <div class="info-block-label">Nota interna RH</div>
      <textarea class="notas-textarea" placeholder="Nota visível apenas para a equipa de RH…"
        ${!isGestor ? 'readonly' : ''}
        onblur="updateNotas('${escHtml(proc.id)}', this.value)">${escHtml(proc.notas||'')}</textarea>
    </div>`;

  return html;
}

function renderTabChecklist(proc) {
  const isAdm = proc.tipo === 'admissao';
  const items = isAdm ? [
    { label:'Cópia do CC / Cartão de Cidadão',           done:true },
    { label:'Comprovativo de NIB / IBAN',                done:true },
    { label:'Inscrição Segurança Social (NISS)',         done:false },
    { label:'Exame de medicina no trabalho',             done:false },
    { label:'Contrato assinado pelas duas partes',       done:false },
    { label:'Equipamento atribuído (EPIs)',              done:false },
    { label:'Sessão de acolhimento agendada',            done:false },
  ] : [
    { label:'Carta / aviso de cessação recebido',        done:true },
    { label:'Comunicação à Segurança Social',            done:true },
    { label:'Recibo de fim de contrato gerado',          done:false },
    { label:'Devolução de equipamento',                  done:false },
    { label:'Pagamento de proporcionais',                done:false },
    { label:'Encerramento de acessos (email, sistemas)', done:false },
  ];
  const completed = items.filter(i => i.done).length;
  const pct = Math.round(completed / items.length * 100);

  return `
    <div class="checklist-progress">
      <div>
        <div style="font-size:13.5px;font-weight:600">Progresso do processo</div>
        <div style="font-size:12px;color:var(--text-3)">${completed} de ${items.length} concluídos</div>
      </div>
      <div class="checklist-pct">${pct}%</div>
    </div>
    <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
    <div class="checklist-list">
      ${items.map((it, i) => `
        <div class="checklist-item">
          <span class="check-circle${it.done?' done':''}">✓</span>
          <span class="checklist-text${it.done?' done':''}">${escHtml(it.label)}</span>
          ${it.done ? `<span class="checklist-done-lbl">concluído</span>` : ''}
        </div>`).join('')}
    </div>`;
}

function renderTabAnexos(proc) {
  const files = proc.ficheiros || [];
  window._files[proc.id] = files;

  const addBtn = isGestor ? `
    <button class="btn btn-secondary btn-sm" onclick="toast('Seletor de ficheiros — em breve')">
      + Adicionar
    </button>` : '';

  let html = `
    <div class="info-block-label" style="display:flex;align-items:center;justify-content:space-between">
      Documentos anexos ${addBtn}
    </div>`;

  if (!files.length) {
    html += `
      <div style="text-align:center;padding:28px 16px;color:var(--text-3)">
        <div style="font-size:24px;margin-bottom:8px">📄</div>
        <p style="font-size:13px">Sem anexos. Adiciona contratos, CC, IBAN ou outros documentos.</p>
      </div>`;
  } else {
    html += `<div class="file-list">
      ${files.map((f, i) => `
        <div class="file-row">
          <span class="file-icon">📄</span>
          <div class="file-name">
            <strong>${escHtml(f.nome)}</strong>
            <span>${fmtBytes(f.tamanho)}</span>
          </div>
          ${f.url ? `<a class="btn btn-ghost btn-sm" href="${escHtml(f.url)}" target="_blank" rel="noopener">Download</a>` : ''}
          ${isGestor ? `<button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteFicheiro('${escHtml(proc.id)}',${i})">✕</button>` : ''}
        </div>`).join('')}
    </div>`;
  }

  return html;
}

function renderTabHistorico(proc) {
  const events = [
    { tone:'green', icon:'✚', title:'Processo criado',   sub:`Submetido por ${escHtml(proc.submetidoPor||'—')}`, meta:fmtDateFull(proc.criadoEm) },
    { tone:'blue',  icon:'✎', title:'Anexos adicionados',sub:`${proc.ficheiros?.length||0} ficheiro(s)`,           meta:'—' },
    { tone:'blue',  icon:'⚑', title:'Estado pendente',   sub:'Aguarda documentação',                              meta:'—' },
  ];
  return `<ul class="timeline">
    ${events.map(e => `
      <li class="tl-item tone-${e.tone}">
        <span class="tl-marker">${e.icon}</span>
        <div>
          <div class="tl-title">${e.title}</div>
          <div class="tl-sub">${e.sub}</div>
          <div class="tl-meta">${e.meta}</div>
        </div>
      </li>`).join('')}
  </ul>`;
}

// ── CONFIRM ───────────────────────────────────────────────────────
function confirmar({ titulo, btnOk, perigo, body }) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = titulo;
    document.getElementById('confirmBody').innerHTML = body
      ? `<div class="alert-box red"><span class="alert-icon">⚠</span><div>${body}</div></div>`
      : '';
    const okBtn = document.getElementById('confirmOkBtn');
    okBtn.textContent = btnOk || 'Confirmar';
    okBtn.className = `btn ${perigo ? 'btn-danger' : 'btn-primary'}`;
    document.getElementById('confirmModal').classList.add('open');
  });
}
function closeConfirm(result) {
  document.getElementById('confirmModal').classList.remove('open');
  if (_confirmResolve) { _confirmResolve(!!result); _confirmResolve = null; }
}
document.getElementById('confirmOkBtn').addEventListener('click', () => closeConfirm(true));

function confirmDelete(id) {
  const proc = processos.find(p => p.id === id);
  if (!proc) return;
  confirmar({
    titulo: 'Eliminar este processo?',
    btnOk: 'Eliminar',
    perigo: true,
    body: `O processo de <b>${escHtml(proc.nome)}</b> será removido permanentemente. Os anexos no Storage também serão apagados.`
  }).then(ok => { if (ok) deleteProcesso(id); });
}

// ── MODAL NOVO ────────────────────────────────────────────────────
function openModalNovo() {
  resetForm();
  document.getElementById('modalNovo').classList.add('open');
}
function closeModalNovo() {
  document.getElementById('modalNovo').classList.remove('open');
}

function selTipo(t) {
  selTipoVal = t;
  document.getElementById('tipoCardAdm').className = `adm-tipo-card${t==='admissao'?' sel-green':''}`;
  document.getElementById('tipoCardCes').className = `adm-tipo-card${t==='cessacao'?' sel-amber':''}`;
  document.getElementById('blocoCamposAdmissao').style.display = t === 'admissao' ? '' : 'none';
  document.getElementById('blocoCamposCessacao').style.display = t === 'cessacao' ? '' : 'none';
  document.getElementById('prioPreviewAdm').style.display = 'none';
  document.getElementById('prioPreviewCes').style.display = 'none';
}

function selPagamento(p) {
  selPagamentoVal = p;
  document.querySelectorAll('.pag-seg-btn').forEach(b => b.classList.toggle('sel', b.dataset.p === p));
}

function resetForm() {
  selTipo('admissao');
  selPagamento('mes');
  ['fNome','fNumero','fNif','fEmpresa','fCategoria','fEmpresaCes',
   'fValorBase','fValorMes','fValorHora','fDataEntrada','fDataSaida'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const mot = document.getElementById('fMotivo');
  if (mot) mot.value = '';
  document.getElementById('prioPreviewAdm').style.display = 'none';
  document.getElementById('prioPreviewCes').style.display = 'none';
  pendingFilesAdm = [];
  renderPendingFilesAdmList();
  const st = document.getElementById('formAdmUploadStatus');
  if (st) st.textContent = '';
}

// ── GESTOR MODE ───────────────────────────────────────────────────
function openGestor() {
  if (isGestor) {
    isGestor = false;
    document.getElementById('btnGestor').classList.remove('active');
    toast('Modo gestor desactivado.');
    if (activeDrawerId) {
      const proc = getActiveProc();
      if (proc) renderDrawer(proc);
    }
    return;
  }
  // Para admins/resolvers, activar directamente (sem PIN)
  // — o fluxo com PIN foi removido; a permissão é gerida pelo authReady abaixo
  toast('Sem permissão de gestor.');
}

// ── FIREBASE CRUD ─────────────────────────────────────────────────
async function submitProcesso() {
  const btn = document.getElementById('btnSubmeterProcesso');
  if (btn) btn.disabled = true;
  try {
    const profile       = window.userProfile;
    const submetidoPor  = profile ? (profile.nomeCompleto || profile.nome || profile.email) : '—';
    const nome          = document.getElementById('fNome').value.trim();

    if (!nome) { toast('Preenche o nome do colaborador!'); return; }

    let empresa = '';
    if (selTipoVal === 'admissao') {
      empresa = document.getElementById('fEmpresa').value.trim();
      if (!empresa) { toast('Preenche a empresa utilizadora!'); return; }
    } else {
      empresa = document.getElementById('fEmpresaCes').value.trim();
    }

    let dataRef = '';
    if (selTipoVal === 'admissao') {
      dataRef = document.getElementById('fDataEntrada').value;
      if (!dataRef) { toast('Selecciona a data de entrada!'); return; }
    } else {
      dataRef = document.getElementById('fDataSaida').value;
      if (!dataRef) { toast('Selecciona a data de saída!'); return; }
    }

    const doc = {
      tipo:         selTipoVal,
      submetidoPor,
      numero:       document.getElementById('fNumero').value.trim(),
      nome,
      nif:          document.getElementById('fNif').value.trim(),
      empresa,
      categoria:    document.getElementById('fCategoria')?.value.trim() || '',
      prioridade:   calcPrioridade(dataRef),
      estado:       'aguardar',
      notas:        '',
      criadoEm:     Date.now(),
      escritorio:   (document.getElementById('fEscritorioAdm')?.value)
                    || (window.userProfile?.escritorio) || '',
      escritorioOrigem: window.userProfile?.escritorio || '',
      criadoPor:    window.currentUser?.uid || '',
    };

    if (selTipoVal === 'admissao') {
      doc.tipoPagamento = selPagamentoVal;
      doc.valorBase     = document.getElementById('fValorBase').value || '';
      doc.valorHora     = document.getElementById('fValorHora').value || '';
      doc.valorMes      = document.getElementById('fValorMes').value  || '';
      doc.dataEntrada   = dataRef;
    } else {
      doc.dataSaida = dataRef;
      doc.motivo    = document.getElementById('fMotivo').value;
    }

    const docRef = await col.add(doc);
    await registarAuditoria({
      modulo: 'admissoes', acao: 'criado',
      docId: docRef.id,
      titulo: doc.nome + (doc.tipo === 'admissao' ? ' — Admissão' : ' — Cessação'),
      depois: doc,
    });

    if (pendingFilesAdm.length) {
      const statusEl = document.getElementById('formAdmUploadStatus');
      if (statusEl) statusEl.textContent = 'A carregar anexos…';
      const ficheiros = [];
      for (const file of pendingFilesAdm) {
        try {
          const uploaded = await window.AdmissoesService.uploadFiles(docRef.id, [file]);
          if (uploaded.length) ficheiros.push(uploaded[0]);
        } catch(e) { toast('Erro ao carregar: ' + file.name); }
      }
      if (ficheiros.length) await docRef.update({ ficheiros });
      if (statusEl) statusEl.textContent = '';
    }

    _invalidateAdmCache();
    closeModalNovo();
    startSync();
    toast('✓ Processo submetido!');
  } catch(e) {
    console.error(e);
    toast('Erro ao submeter.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function updateEstado(id, val) {
  try {
    const snap  = await col.doc(id).get();
    const antes = snap.data();
    await col.doc(id).update({ estado: val });
    _invalidateAdmCache();
    const proc = processos.find(p => p.id === id);
    if (proc) { proc.estado = val; render(); }
    if (activeDrawerId === id) {
      const updated = getActiveProc();
      if (updated) renderDrawer(updated);
    }
    await registarAuditoria({
      modulo: 'admissoes', acao: 'estado', docId: id,
      titulo: antes.nome + (antes.tipo === 'admissao' ? ' — Admissão' : ' — Cessação'),
      antes: { estado: antes.estado }, depois: { estado: val },
    });
    toast('✓ Estado atualizado.');
  } catch(e) { toast('Erro ao actualizar.'); }
}

async function updateNotas(id, val) {
  try {
    const snap  = await col.doc(id).get();
    const antes = snap.data();
    await col.doc(id).update({ notas: val });
    const proc = processos.find(p => p.id === id);
    if (proc) proc.notas = val;
    await registarAuditoria({
      modulo: 'admissoes', acao: 'atualizado', docId: id,
      titulo: antes.nome + (antes.tipo === 'admissao' ? ' — Admissão' : ' — Cessação'),
      antes: { notas: antes.notas }, depois: { notas: val },
    });
  } catch(e) {}
}

async function deleteProcesso(id) {
  try {
    const snap  = await col.doc(id).get();
    const antes = snap.data();
    await col.doc(id).delete();
    await registarAuditoria({
      modulo: 'admissoes', acao: 'eliminado', docId: id,
      titulo: antes.nome + (antes.tipo === 'admissao' ? ' — Admissão' : ' — Cessação'),
      antes,
    });
    closeDrawer();
    _invalidateAdmCache();
    startSync();
    toast('Processo eliminado.');
  } catch(e) { toast('Erro ao eliminar.'); }
}

async function deleteFicheiro(docId, index) {
  const f = (window._files[docId] || [])[index];
  if (!f) return;
  const ok = await confirmar({ titulo:'Remover este anexo?', btnOk:'Remover', perigo:true });
  if (!ok) return;
  try {
    await window.AdmissoesService.removeFile(docId, f);
    const proc = processos.find(p => p.id === docId);
    if (proc && proc.ficheiros) { proc.ficheiros.splice(index, 1); }
    renderDrawerBody(getActiveProc());
    toast('Ficheiro removido.');
  } catch(e) { toast('Erro ao remover.'); }
}

// ── PENDING FILES ────────────────────────────────────────────────
function onPendingFilesAdmChange(input) {
  Array.from(input.files).forEach(f => {
    if (f.size > 15 * 1024 * 1024) { toast('Ficheiro demasiado grande (máx 15 MB): ' + f.name); return; }
    pendingFilesAdm.push(f);
  });
  input.value = '';
  renderPendingFilesAdmList();
}
function renderPendingFilesAdmList() {
  const container = document.getElementById('pendingFilesAdmList');
  if (!container) return;
  if (!pendingFilesAdm.length) { container.innerHTML = ''; return; }
  container.innerHTML = pendingFilesAdm.map((f, i) => `
    <div class="file-row" style="border:1px solid var(--border);border-radius:8px;margin-bottom:4px">
      <span class="file-icon">📄</span>
      <div class="file-name"><strong>${escHtml(f.name)}</strong><span>${fmtBytes(f.size)}</span></div>
      <button class="btn btn-ghost btn-sm" onclick="removePendingFileAdm(${i})">✕</button>
    </div>`).join('');
}
function removePendingFileAdm(i) {
  pendingFilesAdm.splice(i, 1);
  renderPendingFilesAdmList();
}

// ── CACHE ─────────────────────────────────────────────────────────
const _admCache = { ts: 0 };
const ADM_CACHE_TTL = 3 * 60 * 1000;
function _admCacheValid() { return processos.length > 0 && (Date.now() - _admCache.ts) < ADM_CACHE_TTL; }
function _invalidateAdmCache() { _admCache.ts = 0; }

function startSync() {
  if (_admCacheValid()) { render(); setStatus('✓ Carregado', '#16a34a'); setTimeout(() => setStatus(''), 2000); return; }
  setStatus('A carregar…', '#f59e0b');
  col.orderBy('criadoEm', 'desc').limit(100).get()
    .then(snap => {
      processos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _admCache.ts = Date.now();
      render();
      setStatus('✓ Carregado', '#16a34a');
      setTimeout(() => setStatus(''), 3000);
    })
    .catch(err => { console.error(err); setStatus('Erro de ligação', '#dc2626'); });
}

// ── INIT ──────────────────────────────────────────────────────────
document.addEventListener('authReady', ({ detail }) => {
  window.renderNavbar('admissoes');
  const isAdmin    = window.isAdmin();
  const escritorio = window.escritorioAtivo();
  const profile    = detail.profile;

  // Preencher nome no form
  if (profile) {
    const nome = profile.nomeCompleto || profile.nome || profile.email || '—';
    const el = document.getElementById('fSubmetidoPorDisplay');
    if (el) el.textContent = nome;
  }

  // Permissões
  const canCriar   = window.temPermissao('modules.admissoes.create');
  const canResolver = isAdmin || window.temPermissao('modules.admissoes.resolve');

  // Botão "Novo pedido"
  const btnNovo = document.getElementById('btnNovoPedido');
  if (btnNovo) btnNovo.style.display = canCriar ? '' : 'none';

  // Botão VOZ
  const btnVoz = document.getElementById('btnVozAdm');
  if (btnVoz) btnVoz.style.display = isAdmin ? '' : 'none';

  // Modo gestor
  if (canResolver) {
    isGestor = true;
    const btnG = document.getElementById('btnGestor');
    if (btnG) {
      btnG.classList.add('active');
      btnG.onclick = function() {
        isGestor = !isGestor;
        btnG.classList.toggle('active', isGestor);
        if (activeDrawerId) { const p = getActiveProc(); if (p) renderDrawer(p); }
        toast(isGestor ? '✓ Modo gestor activado.' : 'Modo gestor desactivado.');
      };
    }
    // Mostrar filtro de escritório
    const feEl = document.getElementById('filterEscritorioAdm');
    if (feEl) feEl.style.display = '';
  }

  // Filtro de escritório por defeito
  filtroEscritorio = isAdmin
    ? ((escritorio && escritorio !== 'todos') ? escritorio : '')
    : (profile?.escritorio || '');

  // Preencher selects de escritório
  if (window.loadEscritorios) {
    loadEscritorios().then(lista => {
      const feEl = document.getElementById('filterEscritorioAdm');
      if (feEl) {
        feEl.innerHTML = '<option value="">Todos os escritórios</option>' +
          lista.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
        if (filtroEscritorio) feEl.value = filtroEscritorio;
      }
      const fEsc = document.getElementById('fEscritorioAdm');
      if (fEsc) {
        fEsc.innerHTML = lista.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');
        if (profile?.escritorio && lista.some(e => e.id === profile.escritorio))
          fEsc.value = profile.escritorio;
      }
    }).catch(() => {});
  }

  startSync();
});

// ── VOZ AI ────────────────────────────────────────────────────────
function _vozNormalizarEsc(valor) {
  if (!valor) return '';
  const lista = window.getEscritoriosSync ? window.getEscritoriosSync() : [];
  const limpar = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,' ').trim();
  const v = limpar(valor);
  return (lista.find(e => v.includes(limpar(e.id)) || limpar(e.id).includes(v) || v.includes(limpar(e.nome)) || limpar(e.nome).includes(v)) || {}).id || '';
}

function _vozPreencherAdmissao(d) {
  if (d.tipo) selTipo(d.tipo === 'cessacao' ? 'cessacao' : 'admissao');
  if (d.nome)     document.getElementById('fNome').value    = d.nome.trim();
  if (d.numero)   document.getElementById('fNumero').value  = String(d.numero).trim();
  if (d.nif)      document.getElementById('fNif').value     = String(d.nif).trim();
  if (d.empresa)  { const el = document.getElementById('fEmpresa'); if (el) el.value = d.empresa.trim(); }
  if (d.categoria){ const el = document.getElementById('fCategoria'); if (el) el.value = d.categoria.trim(); }
  if (d.valorBase){ const el = document.getElementById('fValorBase'); if (el) el.value = String(d.valorBase).replace(/[^0-9.]/g,''); }
  if (d.dataEntrada) {
    const el = document.getElementById('fDataEntrada');
    if (el) { el.value = d.dataEntrada; updatePrioPreview(); }
  }
  const escId = _vozNormalizarEsc(d.escritorio);
  if (escId) {
    const sel = document.getElementById('fEscritorioAdm');
    if (sel) [...sel.options].forEach(o => { if (o.value === escId) sel.value = o.value; });
  }
  if (d.tipoPagamento) selPagamento(String(d.tipoPagamento).toLowerCase() === 'hora' ? 'hora' : 'mes');
  openModalNovo();
}

document.addEventListener('authReady', () => {
  if (!window.VozAI) return;
  VozAI.registarTipo('admissao', {
    titulo: 'Novo processo por voz',
    prompt: `Analisa este texto em português e extrai os dados para uma admissão ou cessação.
Responde APENAS com um objecto JSON válido, sem texto adicional, sem marcadores de código.
Usa exactamente estas chaves (deixa em branco "" se não mencionado):
{"tipo":"admissao ou cessacao","nome":"nome completo","numero":"número de colaborador (só dígitos)","nif":"NIF (9 dígitos)","empresa":"nome da empresa utilizadora","categoria":"categoria ou função profissional","escritorio":"id do escritório","dataEntrada":"YYYY-MM-DD ou vazio","valorBase":"valor numérico sem símbolo ex: 1200.00","tipoPagamento":"mes ou hora"}`,
    labels: { tipo:'Tipo', nome:'Nome', numero:'Nº Colaborador', nif:'NIF', empresa:'Empresa', categoria:'Categoria', escritorio:'Escritório', dataEntrada:'Data entrada', valorBase:'Valor base (€)', tipoPagamento:'Tipo pagamento' },
    fullFields: ['empresa'],
    preencher: _vozPreencherAdmissao,
    simular(texto) {
      const t = texto.toLowerCase();
      const nome = (texto.match(/\b([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)+)\b/) || [])[1] || '';
      const esc  = _vozNormalizarEsc((window.getEscritoriosSync ? window.getEscritoriosSync() : []).map(e => e.id).find(e => t.includes(e)) || '');
      const data = (texto.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/) || [])[1] || '';
      const numero = (texto.match(/(?:n[uúº°]mero|n[oº]\.?)\s*(\d+)/i) || [])[1] || '';
      const empM = texto.match(/(?:empresa|para\s+(?:a\s+)?empresa)\s+([A-Za-zÀ-ÿ0-9 &,\.]+?)(?:\s+(?:base|categoria|nif|n[uú]mero|escritório|€|\d))/i);
      const catM = texto.match(/categoria\s+([A-Za-zÀ-ÿ ]+?)(?:\s+(?:base|empresa|nif|escritório|€|\d|$))/i);
      const valM = texto.match(/(?:base\s+|salário\s+)?(\d[\d\s]*(?:[.,]\d{1,2})?)\s*€/i) || texto.match(/base\s+(\d[\d\s]*(?:[.,]\d{1,2})?)/i);
      const nif  = (texto.match(/\b(\d{9})\b/) || [])[1] || '';
      return {
        tipo:          t.includes('cessa') || t.includes('saída') || t.includes('saida') ? 'cessacao' : 'admissao',
        nome, numero, nif,
        empresa:       empM ? empM[1].trim() : '',
        categoria:     catM ? catM[1].trim() : '',
        escritorio:    esc,
        dataEntrada:   data,
        valorBase:     valM ? valM[1].replace(/\s/g,'').replace(',','.') : '',
        tipoPagamento: t.includes(' hora') || t.includes('horário') ? 'hora' : 'mes',
      };
    },
  });
}, { once: true });
