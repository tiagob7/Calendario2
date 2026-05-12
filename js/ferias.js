(function() {
  // ── State ──────────────────────────────────────────────────
  let allPedidos = [];
  let viewMode = 'lista';
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth();
  let collabColors = {};
  let hiddenUids = new Set();
  let calEstados = ['pendente', 'aprovado'];
  let filtroEscritorio = '';
  let filtroEstadoLista = 'todos';
  let selStart = null;
  let isAdmin = false;
  let podeGerir = false;
  let currentUid = '';
  let unsub = null;

  const PALETTE = [
    '#0284c7','#16a34a','#dc2626','#d97706','#7c3aed',
    '#0d9488','#db2777','#65a30d','#ea580c','#0891b2',
    '#9333ea','#ca8a04','#be123c','#0369a1','#15803d',
  ];
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DIAS_SEMANA = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const todayStr = new Date().toISOString().split('T')[0];

  // ── Boot ───────────────────────────────────────────────────
  window.bootProtectedPage({
    activePage: 'ferias',
    moduleId: 'ferias',
  }, ({ profile, escritorio }) => {
    isAdmin = profile.role === 'admin';
    podeGerir = isAdmin || window.temPermissao('modules.ferias.manage');
    currentUid = profile.uid;
    document.getElementById('pageSubtitle').textContent =
      podeGerir ? 'Gestão de pedidos de ausência' : 'Os teus pedidos de ausência';
    if (podeGerir) {
      document.getElementById('fEscritorioWrap').style.display = '';
      popularEscritorios();
    }
    setDataDefaults();
    startSync();
  });

  function setDataDefaults() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('fInicio').value = hoje;
    document.getElementById('fFim').value = hoje;
  }

  function popularEscritorios() {
    window.loadEscritorios && window.loadEscritorios().then(lista => {
      document.getElementById('fEscritorio').innerHTML =
        lista.map(e => `<option value="${window.escHtml(e.id)}">${window.escHtml(e.nome)}</option>`).join('');
      document.getElementById('filterEscritorio').innerHTML =
        '<option value="">Todos os escritórios</option>' +
        lista.map(e => `<option value="${window.escHtml(e.id)}">${window.escHtml(e.nome)}</option>`).join('');
    });
  }

  // ── Sync ───────────────────────────────────────────────────
  function startSync() {
    if (unsub) unsub();
    window.setStatus('A sincronizar…');
    unsub = window.FeriasService.listenAll({
      onData(docs) {
        allPedidos = docs;
        assignColors();
        render();
        window.setStatus('✓ Sincronizado');
      },
      onError(err) {
        console.error('[ferias]', err);
        window.setStatus('Erro ao carregar', 'var(--red)');
      },
    });
  }

  function assignColors() {
    let idx = Object.keys(collabColors).length;
    allPedidos.forEach(p => {
      if (!collabColors[p.uid]) {
        collabColors[p.uid] = PALETTE[idx % PALETTE.length];
        idx++;
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────
  function getInitials(nome) {
    if (!nome) return '?';
    const parts = nome.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── Filtering ──────────────────────────────────────────────
  function pedidosVisiveis(opts) {
    const forCal = (opts || {}).forCal;
    return allPedidos.filter(p => {
      if (!podeGerir && p.uid !== currentUid) return false;
      if (filtroEscritorio && p.escritorio !== filtroEscritorio) return false;
      if (forCal) {
        if (!calEstados.includes(p.estado)) return false;
        if (hiddenUids.has(p.uid)) return false;
      } else {
        if (filtroEstadoLista !== 'todos' && p.estado !== filtroEstadoLista) return false;
      }
      return true;
    });
  }

  // ── Date helpers ───────────────────────────────────────────
  function datesInRange(s, e) {
    if (!s || !e) return [];
    const out = [];
    const cur = new Date(s + 'T00:00:00');
    const end = new Date(e + 'T00:00:00');
    while (cur <= end) { out.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1); }
    return out;
  }

  function buildDayMap(pedidos) {
    const map = {};
    pedidos.forEach(p => {
      const cor = collabColors[p.uid] || '#94a3b8';
      datesInRange(p.dataInicio, p.dataFim).forEach(d => {
        if (!map[d]) map[d] = [];
        map[d].push({ uid: p.uid, nome: p.nomeCompleto || p.email || '?', estado: p.estado, cor });
      });
    });
    return map;
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function toDateStr(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

  function monthOffset(year, month, i) {
    const firstDay = new Date(year, month, 1).getDay();
    const offset   = firstDay === 0 ? 6 : firstDay - 1;
    const daysInM  = new Date(year, month + 1, 0).getDate();
    const daysInP  = new Date(year, month, 0).getDate();
    let dayNum, dateStr, isOther = false;
    if (i < offset) {
      dayNum = daysInP - offset + 1 + i;
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      dateStr = toDateStr(py, pm, dayNum); isOther = true;
    } else if (i >= offset + daysInM) {
      dayNum = i - offset - daysInM + 1;
      const nm = month === 11 ? 0 : month + 1;
      const ny = month === 11 ? year + 1 : year;
      dateStr = toDateStr(ny, nm, dayNum); isOther = true;
    } else {
      dayNum = i - offset + 1;
      dateStr = toDateStr(year, month, dayNum);
    }
    const dow = (new Date(dateStr + 'T00:00:00').getDay() + 6) % 7;
    return { dayNum, dateStr, isOther, isWeekend: dow >= 5 };
  }

  // ── Render dispatcher ──────────────────────────────────────
  function render() {
    renderStats();
    renderCollabChips();
    if (viewMode === 'lista')        renderLista();
    else if (viewMode === 'mensal')  renderMensal();
    else                             renderAnual();
  }

  // ── Stats ──────────────────────────────────────────────────
  function renderStats() {
    const ano = new Date().getFullYear();
    const set = podeGerir ? allPedidos : allPedidos.filter(p => p.uid === currentUid);
    setText('statTotal',    set.length);
    setText('statPendente', set.filter(p => p.estado === 'pendente').length);
    setText('statAprovado', set.filter(p => p.estado === 'aprovado').length);
    const dias = set
      .filter(p => p.estado === 'aprovado' && p.tipo === 'ferias' && new Date(p.dataInicio + 'T00:00:00').getFullYear() === ano)
      .reduce((acc, p) => {
        const d = Math.round((new Date(p.dataFim + 'T00:00:00') - new Date(p.dataInicio + 'T00:00:00')) / 86400000) + 1;
        return acc + (d > 0 ? d : 0);
      }, 0);
    setText('statDias', dias);

    // Tab counts (respect escritório filter but not estado filter)
    const visBase = allPedidos.filter(p => {
      if (!podeGerir && p.uid !== currentUid) return false;
      if (filtroEscritorio && p.escritorio !== filtroEscritorio) return false;
      return true;
    });
    setText('tabCountTodos',      visBase.length);
    setText('tabCountPendente',   visBase.filter(p => p.estado === 'pendente').length);
    setText('tabCountAprovado',   visBase.filter(p => p.estado === 'aprovado').length);
    setText('tabCountRejeitado',  visBase.filter(p => p.estado === 'rejeitado').length);
  }

  // ── Collaborator chips ─────────────────────────────────────
  function renderCollabChips() {
    const container = document.getElementById('collabChips');
    if (!container) return;
    const seen = new Map();
    allPedidos.forEach(p => {
      if (!podeGerir && p.uid !== currentUid) return;
      if (filtroEscritorio && p.escritorio !== filtroEscritorio) return;
      if (!seen.has(p.uid)) seen.set(p.uid, p.nomeCompleto || p.email || p.uid);
    });
    if (seen.size <= 1) { container.innerHTML = ''; return; }

    const allHidden = seen.size > 0 && [...seen.keys()].every(uid => hiddenUids.has(uid));
    let html = `<button class="chip-todos" onclick="chipToggleAll()">${allHidden ? 'Mostrar todos' : 'Ocultar todos'}</button>`;
    seen.forEach((nome, uid) => {
      const cor = collabColors[uid] || '#94a3b8';
      const oculto = hiddenUids.has(uid);
      html += `<button class="collab-chip${oculto ? ' oculto' : ''}" style="border-color:${cor};color:${cor};"
                  onclick="chipToggle('${uid}')">
        <span class="chip-dot" style="background:${cor}"></span>
        <span class="chip-name">${window.escHtml(nome)}</span>
      </button>`;
    });
    container.innerHTML = html;
  }

  window.chipToggle = function(uid) {
    if (hiddenUids.has(uid)) hiddenUids.delete(uid); else hiddenUids.add(uid);
    render();
  };

  window.chipToggleAll = function() {
    const seen = new Set(allPedidos.filter(p => podeGerir || p.uid === currentUid).map(p => p.uid));
    const allHidden = seen.size > 0 && [...seen].every(uid => hiddenUids.has(uid));
    if (allHidden) hiddenUids.clear(); else seen.forEach(uid => hiddenUids.add(uid));
    render();
  };

  // ── Cal estado toggles ─────────────────────────────────────
  window.toggleCalEstado = function(estado, btn) {
    const idx = calEstados.indexOf(estado);
    if (idx === -1) { calEstados.push(estado); btn.classList.add('active'); }
    else { calEstados.splice(idx, 1); btn.classList.remove('active'); }
    render();
  };

  // ── LISTA view ─────────────────────────────────────────────
  function renderLista() {
    const lista = pedidosVisiveis();
    const el = document.getElementById('feriasList');
    if (!lista.length) { el.innerHTML = '<div class="empty-msg">Nenhum pedido encontrado.</div>'; return; }
    el.innerHTML = lista.map(reqRowHtml).join('');
  }

  function reqRowHtml(p) {
    const meu = p.uid === currentUid;
    const inicio = p.dataInicio ? new Date(p.dataInicio + 'T00:00:00').toLocaleDateString('pt-PT') : '—';
    const fim    = p.dataFim   ? new Date(p.dataFim   + 'T00:00:00').toLocaleDateString('pt-PT') : '—';
    const dias   = p.dataInicio && p.dataFim
      ? Math.round((new Date(p.dataFim + 'T00:00:00') - new Date(p.dataInicio + 'T00:00:00')) / 86400000) + 1 : '?';
    const tipoLabel = { ferias:'Férias', folga:'Folga', licenca:'Licença', outro:'Outro' }[p.tipo] || p.tipo;
    const estadoLabel = { pendente:'Pendente', aprovado:'Aprovado', rejeitado:'Rejeitado', cancelado:'Cancelado' }[p.estado] || p.estado;
    const cor = collabColors[p.uid] || '#94a3b8';
    const initials = getInitials(p.nomeCompleto || p.email || '');

    const inlineActions = (podeGerir && p.estado === 'pendente') ? `
      <div class="req-actions-inline">
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();aprovarRapido('${p.id}')" title="Aprovar">✓</button>
        <button class="btn btn-red btn-sm" onclick="event.stopPropagation();rejeitarRapido('${p.id}')" title="Rejeitar">✕</button>
      </div>` : '';

    const bodyActions = [];
    if (podeGerir && p.estado === 'pendente') bodyActions.push(`
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <input class="obs-input" id="obs_${p.id}" placeholder="Observação (opcional)">
        <button class="btn btn-secondary btn-sm" onclick="aprovar('${p.id}')">✓ Aprovar</button>
        <button class="btn btn-red btn-sm" onclick="rejeitar('${p.id}')">✕ Rejeitar</button>
      </div>`);
    if (meu && p.estado === 'pendente') bodyActions.push(
      `<button class="btn btn-secondary btn-sm" onclick="cancelar('${p.id}')">Cancelar pedido</button>`);

    return `
      <div class="req-item estado-${window.escHtml(p.estado)}" id="card_${p.id}">
        <div class="req-row" onclick="toggleCard('${p.id}')">
          <div class="req-avatar" style="background:${cor}">${window.escHtml(initials)}</div>
          <div class="req-info">
            <div class="req-name">${window.escHtml(p.nomeCompleto || p.email || '—')}</div>
            <div class="req-sub">${window.escHtml(tipoLabel)}${p.escritorio ? ' · ' + window.escHtml(p.escritorio) : ''} · ${inicio} → ${fim}</div>
          </div>
          <span class="tipo-tag">${window.escHtml(tipoLabel)}</span>
          <span class="estado-pill ${window.escHtml(p.estado)}">${window.escHtml(estadoLabel)}</span>
          ${inlineActions}
          <svg class="req-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6l4 4 4-4"/></svg>
        </div>
        <div class="req-body" id="body_${p.id}">
          <div class="card-detail-row">
            <span class="detail-item">
              <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1v3M11 1v3M2 7h12"/></svg>
              ${inicio} → ${fim} (${dias} dia${dias !== 1 ? 's' : ''})
            </span>
            ${p.escritorio ? `<span class="detail-item">${window.escHtml(p.escritorio)}</span>` : ''}
            <span class="detail-item">${window.escHtml(window.fmtShort ? window.fmtShort(p.criadoEm) : '')}</span>
          </div>
          ${p.motivo ? `<div class="card-motivo">${window.escHtml(p.motivo)}</div>` : ''}
          ${p.observacao ? `<div class="card-obs">Obs: ${window.escHtml(p.observacao)}</div>` : ''}
          ${bodyActions.length ? `<div class="card-actions">${bodyActions.join('')}</div>` : ''}
        </div>
      </div>`;
  }

  // ── MENSAL view ────────────────────────────────────────────
  function renderMensal() {
    document.getElementById('calMonthLabel').textContent = MESES[currentMonth] + ' ' + currentYear;
    const dayMap = buildDayMap(pedidosVisiveis({ forCal: true }));
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const offset   = firstDay === 0 ? 6 : firstDay - 1;
    const daysInM  = new Date(currentYear, currentMonth + 1, 0).getDate();
    const total    = Math.ceil((offset + daysInM) / 7) * 7;
    let html = '';
    for (let i = 0; i < total; i++) {
      const { dayNum, dateStr, isOther, isWeekend } = monthOffset(currentYear, currentMonth, i);
      const isToday = dateStr === todayStr;
      const isSel   = dateStr === selStart;
      const entries = isOther ? [] : (dayMap[dateStr] || []);
      const visible = entries.slice(0, 3);
      const extra   = entries.length - 3;
      const bars = visible.map(e =>
        `<div class="cal-bar ${window.escHtml(e.estado)}" style="background:${e.cor}" title="${window.escHtml(e.nome)}">${window.escHtml(e.nome)}</div>`
      ).join('') + (extra > 0 ? `<div class="cal-more">+${extra} mais</div>` : '');
      html += `<div class="cal-day${isOther ? ' other-month' : ''}${isWeekend ? ' weekend' : ''}${isToday ? ' today' : ''}${isSel ? ' sel-start' : ''}"
                    onclick="calDayClick('${dateStr}')">
        <div class="cal-day-num">${dayNum}</div>
        <div class="cal-bars">${bars}</div>
      </div>`;
    }
    document.getElementById('calMensalGrid').innerHTML = html;
    const hint = document.getElementById('selHint');
    if (selStart) {
      hint.textContent = `Início: ${new Date(selStart + 'T00:00:00').toLocaleDateString('pt-PT')} — clica no dia de fim para preencher o formulário`;
      hint.classList.add('visible');
    } else {
      hint.classList.remove('visible');
    }
  }

  window.calDayClick = function(dateStr) {
    if (!selStart) {
      selStart = dateStr;
      renderMensal();
    } else if (dateStr < selStart) {
      selStart = dateStr;
      renderMensal();
    } else {
      document.getElementById('fInicio').value = selStart;
      document.getElementById('fFim').value   = dateStr;
      selStart = null;
      abrirFormulario();
      renderMensal();
    }
  };

  window.prevMonth = function() {
    if (currentMonth === 0) { currentMonth = 11; currentYear--; } else currentMonth--;
    selStart = null; renderMensal();
  };
  window.nextMonth = function() {
    if (currentMonth === 11) { currentMonth = 0; currentYear++; } else currentMonth++;
    selStart = null; renderMensal();
  };

  // ── ANUAL view ─────────────────────────────────────────────
  function renderAnual() {
    document.getElementById('calYearLabel').textContent = currentYear;
    const dayMap = buildDayMap(pedidosVisiveis({ forCal: true }));
    document.getElementById('calAnualGrid').innerHTML =
      Array.from({ length: 12 }, (_, m) => miniMonthHtml(currentYear, m, dayMap)).join('');
  }

  function miniMonthHtml(year, month, dayMap) {
    const firstDay = new Date(year, month, 1).getDay();
    const offset   = firstDay === 0 ? 6 : firstDay - 1;
    const daysInM  = new Date(year, month + 1, 0).getDate();
    const total    = Math.ceil((offset + daysInM) / 7) * 7;
    const wdHtml   = DIAS_SEMANA.map(d => `<div class="cal-mini-wd">${d[0]}</div>`).join('');
    let daysHtml   = '';
    for (let i = 0; i < total; i++) {
      const { dayNum, dateStr, isOther } = monthOffset(year, month, i);
      const isToday = dateStr === todayStr;
      const entries = isOther ? [] : (dayMap[dateStr] || []);
      const dots = entries.slice(0, 4).map(e =>
        `<span class="cal-mini-dot ${window.escHtml(e.estado)}" style="background:${e.cor}" title="${window.escHtml(e.nome)}"></span>`
      ).join('') + (entries.length > 4 ? `<span class="cal-mini-dot" style="background:var(--text-3)"></span>` : '');
      daysHtml += `<div class="cal-mini-day${isOther ? ' other-month' : ''}${isToday ? ' today' : ''}">
        <div class="cal-mini-num">${isOther ? '' : dayNum}</div>
        <div class="cal-mini-dots">${dots}</div>
      </div>`;
    }
    return `<div class="cal-mini" onclick="goToMonth(${month})">
      <div class="cal-mini-title">${MESES[month]}</div>
      <div class="cal-mini-weekdays">${wdHtml}</div>
      <div class="cal-mini-days">${daysHtml}</div>
    </div>`;
  }

  window.goToMonth = function(month) { currentMonth = month; setView('mensal'); };
  window.prevYear  = function() { currentYear--; renderAnual(); };
  window.nextYear  = function() { currentYear++; renderAnual(); };

  // ── View switching ─────────────────────────────────────────
  window.setView = function(v) {
    viewMode = v; selStart = null;
    document.querySelectorAll('.fer-view-btn').forEach(b => b.classList.toggle('active', b.dataset.v === v));
    document.getElementById('listaView').style.display  = v === 'lista'  ? '' : 'none';
    document.getElementById('mensalView').style.display = v === 'mensal' ? '' : 'none';
    document.getElementById('anualView').style.display  = v === 'anual'  ? '' : 'none';
    const isCal = v !== 'lista';
    const tabsEl = document.getElementById('estadoTabsLista');
    const calEl  = document.getElementById('calEstadoWrap');
    if (tabsEl) tabsEl.style.display = isCal ? 'none' : '';
    if (calEl)  calEl.style.display  = isCal ? '' : 'none';
    render();
  };

  // ── Shared actions ─────────────────────────────────────────
  window.setFiltroEscritorio = function(v) { filtroEscritorio = v; render(); };

  window.setFiltro = function(f) {
    filtroEstadoLista = f;
    document.querySelectorAll('.fer-tab[data-f]').forEach(b => b.classList.toggle('active', b.dataset.f === f));
    renderLista();
  };

  window.toggleCard = function(id) {
    const item = document.getElementById('card_' + id);
    if (item) item.classList.toggle('open');
  };

  window.toggleForm = function() { document.getElementById('formPanel').classList.toggle('open'); };

  window.abrirFormulario = function() {
    document.getElementById('formPanel').classList.add('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Submit / Aprovar / Rejeitar / Cancelar ─────────────────
  window.submitPedido = async function() {
    const inicio = document.getElementById('fInicio').value;
    const fim    = document.getElementById('fFim').value;
    if (!inicio || !fim)  { window.toast('Preenche as datas.'); return; }
    if (fim < inicio)     { window.toast('A data de fim não pode ser anterior ao início.'); return; }
    const profile = window.userProfile;
    const escritorio = isAdmin
      ? (document.getElementById('fEscritorio').value || window.escritorioAtivo())
      : window.escritorioAtivo();
    const data = {
      uid: profile.uid,
      nomeCompleto: profile.nomeCompleto || profile.nome || profile.email,
      email: profile.email, escritorio,
      tipo: document.getElementById('fTipo').value,
      dataInicio: inicio, dataFim: fim,
      motivo: document.getElementById('fMotivo').value.trim(),
      estado: 'pendente', criadoEm: Date.now(),
    };
    try {
      await window.FeriasService.create(data);
      window.toast('Pedido submetido com sucesso.');
      document.getElementById('fMotivo').value = '';
      setDataDefaults();
      document.getElementById('formPanel').classList.remove('open');
      if (typeof window.logAuditoria === 'function') window.logAuditoria('ferias', 'create', data);
    } catch(e) { console.error(e); window.toast('Erro ao submeter pedido.'); }
  };

  window.aprovar = async function(id) {
    const obs = (document.getElementById('obs_' + id) || {}).value || '';
    try {
      await window.FeriasService.update(id, { estado: 'aprovado', observacao: obs, resolvidoEm: Date.now(), resolvidoPor: window.userProfile.uid });
      window.toast('Pedido aprovado.');
      if (typeof window.logAuditoria === 'function') window.logAuditoria('ferias', 'aprovar', { id, obs });
    } catch(e) { window.toast('Erro ao aprovar.'); }
  };

  window.rejeitar = async function(id) {
    const obs = (document.getElementById('obs_' + id) || {}).value || '';
    try {
      await window.FeriasService.update(id, { estado: 'rejeitado', observacao: obs, resolvidoEm: Date.now(), resolvidoPor: window.userProfile.uid });
      window.toast('Pedido rejeitado.');
      if (typeof window.logAuditoria === 'function') window.logAuditoria('ferias', 'rejeitar', { id, obs });
    } catch(e) { window.toast('Erro ao rejeitar.'); }
  };

  // Quick approve/reject from inline buttons (no obs input)
  window.aprovarRapido = async function(id) {
    try {
      await window.FeriasService.update(id, { estado: 'aprovado', resolvidoEm: Date.now(), resolvidoPor: window.userProfile.uid });
      window.toast('Pedido aprovado.');
    } catch(e) { window.toast('Erro ao aprovar.'); }
  };

  window.rejeitarRapido = async function(id) {
    try {
      await window.FeriasService.update(id, { estado: 'rejeitado', resolvidoEm: Date.now(), resolvidoPor: window.userProfile.uid });
      window.toast('Pedido rejeitado.');
    } catch(e) { window.toast('Erro ao rejeitar.'); }
  };

  window.cancelar = async function(id) {
    if (!confirm('Cancelar este pedido?')) return;
    try {
      await window.FeriasService.update(id, { estado: 'cancelado' });
      window.toast('Pedido cancelado.');
    } catch(e) { window.toast('Erro ao cancelar.'); }
  };
})();
