/* ══════════════════════════════════════════════════════
   CHAT.JS — Lógica principal do módulo de mensagens
   ══════════════════════════════════════════════════════ */

let _uid = '';
let _profile = null;
let _conversas = [];
let _lidos = {};
let _currentConversaId = null;
let _unsubConversas = null;
let _unsubMensagens = null;
let _unsubLidos = null;
let _unsubTyping = null;
let _allUsers = [];
let _groupSelected = [];
let _showInfo = false;
let _allMsgs = [];
let _oldestTs = null;
let _loadingOlder = false;
let _hasMoreOlder = true;
let _renderedMsgIds = new Set();
let _replyingTo = null;       // { msgId, texto, autorNome }
let _searchActive = false;
let _searchQuery = '';
let _typingTimer = null;
let _lastTypingCallTime = 0;

/* ══════════════════════════════════════════════════════
   UTILITÁRIOS
   ══════════════════════════════════════════════════════ */
function uidColor(uid) {
  let h = 0;
  for (let i = 0; i < (uid || '').length; i++) h = (h * 31 + uid.charCodeAt(i)) & 0xffffffff;
  const colors = ['#2563eb','#7c3aed','#db2777','#16a34a','#d97706','#0d9488','#dc2626','#0284c7'];
  return colors[Math.abs(h) % colors.length];
}

function initials(nome) {
  if (!nome) return '?';
  const parts = nome.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return nome.slice(0, 2).toUpperCase();
}

function buildAvatar(nome, uid, size) {
  const sz = size || 32;
  const div = document.createElement('div');
  div.className = 'msg-ava';
  div.style.cssText = `width:${sz}px;height:${sz}px;background:${uidColor(uid)};font-size:${Math.round(sz * .36)}px;`;
  div.textContent = initials(nome);
  return div;
}

function esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTs(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = todayStart - msgDay;
  const hh = d.getHours().toString().padStart(2,'0');
  const mm = d.getMinutes().toString().padStart(2,'0');
  if (diff <= 0) return `${hh}:${mm}`;
  if (diff === 86400000) return 'Ontem';
  return `${d.getDate()}/${(d.getMonth()+1).toString().padStart(2,'0')}`;
}

function formatMsgDay(ts) {
  const d = new Date(ts);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = todayStart - msgDay;
  if (diff <= 0) return 'Hoje';
  if (diff === 86400000) return 'Ontem';
  const DIAS  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
}

function isOnline(u) {
  return u && u.ultimoAcesso && (Date.now() - u.ultimoAcesso < 180000);
}

function scrollToBottom(force) {
  const el = document.getElementById('chatMessages');
  if (!el) return;
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  if (force || nearBottom) el.scrollTop = el.scrollHeight;
}

function conversaNome(c) {
  if (!c) return 'Conversa';
  if (c.tipo === 'grupo') return c.nome || 'Grupo';
  const otherUid = (c.participantes || []).find(u => u !== _uid);
  const other = _allUsers.find(u => u.uid === otherUid);
  return (other && (other.nomeCompleto || other.nome)) || 'Utilizador';
}

function conversaUidRef(c) {
  if (!c || c.tipo === 'grupo') return c ? c.id : '';
  return (c.participantes || []).find(u => u !== _uid) || (c ? c.id : '');
}

function unreadCount(c) {
  const lido = _lidos[c.id] || 0;
  if (!c.ultimaMensagemTs) return 0;
  if (c.ultimaMensagemUid === _uid) return 0;
  return c.ultimaMensagemTs > lido ? 1 : 0;
}

/* ══════════════════════════════════════════════════════
   RENDER — LISTA DE CONVERSAS
   ══════════════════════════════════════════════════════ */
function renderConversaList(filtro) {
  const list = document.getElementById('chatList');
  if (!list) return;

  const search = (filtro || '').toLowerCase().trim();
  let items = _conversas;
  if (search) items = items.filter(c => conversaNome(c).toLowerCase().includes(search));

  if (!items.length) {
    list.innerHTML = '<div class="chat-list-empty">Sem conversas ainda.<br>Clica em + para começar.</div>';
    return;
  }

  const grupos = items.filter(c => c.tipo === 'grupo');
  const dms    = items.filter(c => c.tipo !== 'grupo');

  list.innerHTML = '';

  if (grupos.length) {
    const head = document.createElement('div');
    head.className = 'chat-section-head';
    head.textContent = 'Grupos';
    list.appendChild(head);
    grupos.forEach(c => list.appendChild(buildConversaItem(c)));
  }

  if (dms.length) {
    const head = document.createElement('div');
    head.className = 'chat-section-head';
    if (grupos.length) head.style.marginTop = '6px';
    head.textContent = 'Mensagens diretas';
    list.appendChild(head);
    dms.forEach(c => list.appendChild(buildConversaItem(c)));
  }
}

function buildConversaItem(c) {
  const nome   = conversaNome(c);
  const uid    = conversaUidRef(c);
  const unread = unreadCount(c);
  const isActive = c.id === _currentConversaId;
  const isGrupo  = c.tipo === 'grupo';

  const item = document.createElement('div');
  item.className = 'chat-item' + (isActive ? ' active' : '') + (unread ? ' unread' : '');
  item.dataset.id = c.id;

  if (isGrupo) {
    const hash = document.createElement('div');
    hash.className = 'chat-hash';
    hash.textContent = '#';
    item.appendChild(hash);
  } else {
    const wrap = document.createElement('div');
    wrap.className = 'chat-ava-wrap';
    wrap.appendChild(buildAvatar(nome, uid, 36));
    const dot = document.createElement('span');
    const otherUser = _allUsers.find(u => u.uid === uid);
    dot.className = 'status-dot ' + (isOnline(otherUser) ? 'online' : 'offline');
    wrap.appendChild(dot);
    item.appendChild(wrap);
  }

  const meta = document.createElement('div');
  meta.className = 'chat-item-meta';
  meta.innerHTML = `
    <div class="chat-item-row">
      <span class="chat-item-name">${esc(nome)}</span>
      <span class="chat-item-ts">${formatTs(c.ultimaMensagemTs)}</span>
    </div>
    <div class="chat-item-row">
      <span class="chat-item-preview">${esc(c.ultimaMensagem || 'Sem mensagens')}</span>
      ${unread ? '<span class="chat-unread-badge"></span>' : ''}
    </div>`;
  item.appendChild(meta);

  item.addEventListener('click', () => openConversa(c.id));
  return item;
}

/* ══════════════════════════════════════════════════════
   CONSTRUÇÃO DE ELEMENTO DE MENSAGEM
   ══════════════════════════════════════════════════════ */
function buildMsgEl(msg, grouped, isGroup, highlight) {
  const isOwn = msg.autorUid === _uid;

  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap ' + (isOwn ? 'msg-own' : 'msg-other') + (grouped ? ' grouped' : '');
  wrap.dataset.msgId = msg.id;

  // Avatar slot
  const avaSlot = document.createElement('div');
  avaSlot.className = 'msg-avatar-slot';
  if (!grouped && !isOwn) avaSlot.appendChild(buildAvatar(msg.autorNome, msg.autorUid, 32));
  wrap.appendChild(avaSlot);

  // Message body
  const body = document.createElement('div');
  body.className = 'msg-body';

  // Floating action toolbar (reply button)
  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  const replyBtn = document.createElement('button');
  replyBtn.className = 'msg-action-btn';
  replyBtn.title = 'Responder';
  replyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>`;
  replyBtn.addEventListener('click', e => { e.stopPropagation(); setReplyTo(msg); });
  actions.appendChild(replyBtn);
  body.appendChild(actions);

  if (!grouped) {
    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    if (isOwn) {
      meta.innerHTML = `<span class="msg-time">${formatTs(msg.ts)}</span><span class="msg-name">Tu</span>`;
      meta.style.flexDirection = 'row-reverse';
    } else {
      meta.innerHTML = `<span class="msg-name">${esc(msg.autorNome || 'Utilizador')}</span><span class="msg-time">${formatTs(msg.ts)}</span>`;
    }
    body.appendChild(meta);
  }

  // Reply quote context
  if (msg.replyTo) {
    const quote = document.createElement('div');
    quote.className = 'msg-reply-quote';
    quote.innerHTML = `<span class="reply-quote-name">${esc(msg.replyTo.autorNome || '')}</span><span class="reply-quote-text">${esc((msg.replyTo.texto || '').slice(0, 120))}</span>`;
    body.appendChild(quote);
  }

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  let textHtml = esc(msg.texto).replace(/\n/g, '<br>');
  if (highlight && highlight.length >= 1) {
    const escapedTerm = esc(highlight).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    textHtml = textHtml.replace(new RegExp(escapedTerm, 'gi'), m => `<mark class="msg-highlight">${m}</mark>`);
  }
  bubble.innerHTML = textHtml;
  body.appendChild(bubble);

  wrap.appendChild(body);
  return wrap;
}

/* ══════════════════════════════════════════════════════
   ABRIR CONVERSA
   ══════════════════════════════════════════════════════ */
function openConversa(conversaId) {
  _currentConversaId = conversaId;
  const conversa = _conversas.find(c => c.id === conversaId);

  // Mobile slide
  const chatWrap = document.getElementById('chatWrap');
  if (!chatWrap.classList.contains('chat-view-thread')) {
    chatWrap.classList.add('chat-view-thread');
    history.pushState({ chatThread: conversaId }, '');
  }

  document.getElementById('chatEmpty').style.display = 'none';
  document.getElementById('threadInner').style.display = 'flex';

  renderThreadHead(conversa);
  renderConversaList(document.getElementById('chatSearch').value);

  // Cleanup previous listeners and state
  if (_unsubMensagens) { _unsubMensagens(); _unsubMensagens = null; }
  if (_unsubTyping) { _unsubTyping(); _unsubTyping = null; }
  if (_typingTimer) { clearTimeout(_typingTimer); _typingTimer = null; }
  clearReply();
  document.getElementById('chatMessages').innerHTML = '';
  document.getElementById('chatTyping').innerHTML = '';
  _allMsgs = [];
  _oldestTs = null;
  _loadingOlder = false;
  _hasMoreOlder = true;
  _renderedMsgIds = new Set();

  // If search was active, close it
  if (_searchActive) {
    _searchActive = false;
    _searchQuery = '';
    document.getElementById('chatSearchBar').style.display = 'none';
    document.getElementById('chatSearchInput').value = '';
  }

  let isFirstSnapshot = true;
  _unsubMensagens = ChatService.listenMensagens(conversaId, 40, msgs => {
    if (isFirstSnapshot) {
      isFirstSnapshot = false;
      _allMsgs = msgs;
      if (msgs.length > 0) {
        _oldestTs = msgs[0].ts;
        if (msgs.length < 40) _hasMoreOlder = false;
      }
      renderMensagens(_allMsgs, conversa || { tipo: 'dm' });
      _renderedMsgIds = new Set(_allMsgs.map(m => m.id));
    } else {
      const newOnes = msgs.filter(m => !_renderedMsgIds.has(m.id));
      if (newOnes.length) {
        const prevMsg = _allMsgs.length ? _allMsgs[_allMsgs.length - 1] : null;
        _allMsgs = [..._allMsgs, ...newOnes];
        appendMessages(newOnes, conversa || { tipo: 'dm' }, prevMsg);
      }
    }

    if (_allMsgs.length) {
      const lastTs = _allMsgs[_allMsgs.length - 1].ts;
      ChatService.markRead(_uid, conversaId, lastTs).catch(() => {});
      _lidos[conversaId] = lastTs;
      renderConversaList(document.getElementById('chatSearch').value);
    }
  });

  // Typing listener
  _unsubTyping = ChatService.listenTyping(conversaId, typingUsers => {
    renderTypingIndicator(typingUsers.filter(t => t.uid !== _uid));
  });

  if (_showInfo) renderInfoPanel(conversa);

  setTimeout(() => document.getElementById('chatInput').focus(), 80);
}

/* ── Thread header ── */
function renderThreadHead(conversa) {
  const nome    = conversaNome(conversa);
  const uid     = conversaUidRef(conversa);
  const isGrupo = conversa && conversa.tipo === 'grupo';
  const head    = document.getElementById('threadHead');
  head.innerHTML = '';

  // Back btn (mobile)
  const backBtn = document.createElement('button');
  backBtn.className = 'chat-back-btn';
  backBtn.innerHTML = '&#8249;';
  backBtn.onclick = closeThread;
  head.appendChild(backBtn);

  // Avatar or hash
  if (isGrupo) {
    const hash = document.createElement('div');
    hash.className = 'chat-hash';
    hash.style.cssText = 'width:36px;height:36px;flex-shrink:0;';
    hash.textContent = '#';
    head.appendChild(hash);
  } else {
    head.appendChild(buildAvatar(nome, uid, 36));
  }

  // Name + sub
  const info = document.createElement('div');
  info.className = 'thread-info';
  const sub = isGrupo
    ? `${(conversa.participantes || []).length} participantes`
    : 'Mensagem direta';
  info.innerHTML = `
    <div class="thread-name">${isGrupo ? '<span class="hash">#</span>' : ''}${esc(nome)}</div>
    <div class="thread-sub">${sub}</div>`;
  head.appendChild(info);

  const spacer = document.createElement('div');
  spacer.style.flex = '1';
  head.appendChild(spacer);

  // Search toggle btn
  const searchBtn = document.createElement('button');
  searchBtn.className = 'head-icon-btn' + (_searchActive ? ' active' : '');
  searchBtn.id = 'btnToggleSearch';
  searchBtn.title = 'Pesquisar na conversa';
  searchBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  searchBtn.onclick = toggleThreadSearch;
  head.appendChild(searchBtn);

  // Info toggle btn
  const infoBtn = document.createElement('button');
  infoBtn.className = 'head-icon-btn' + (_showInfo ? ' active' : '');
  infoBtn.id = 'btnToggleInfo';
  infoBtn.title = 'Detalhes';
  infoBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  infoBtn.onclick = toggleInfoPanel;
  head.appendChild(infoBtn);
}

/* ── Info panel ── */
function toggleInfoPanel() {
  _showInfo = !_showInfo;
  const panel = document.getElementById('chatInfoPanel');
  panel.style.display = _showInfo ? '' : 'none';
  const btn = document.getElementById('btnToggleInfo');
  if (btn) btn.classList.toggle('active', _showInfo);

  if (_showInfo) {
    const conversa = _conversas.find(c => c.id === _currentConversaId);
    renderInfoPanel(conversa);
  }
}

function renderInfoPanel(conversa) {
  const body = document.getElementById('chatInfoBody');
  if (!body || !conversa) return;

  const nome    = conversaNome(conversa);
  const uid     = conversaUidRef(conversa);
  const isGrupo = conversa.tipo === 'grupo';
  const isCreator = conversa.criadoPor === _uid;
  const canManage = window.isAdmin ? window.isAdmin() : false;

  if (isGrupo) {
    const memberCount = (conversa.participantes || []).length;
    body.innerHTML = '';

    // Group name with rename button
    const nameSection = document.createElement('div');
    nameSection.id = 'infoGroupNameSection';
    nameSection.innerHTML = `
      <div class="chat-info-name-display" id="infoNameDisplay">
        <div class="chat-info-big">#${esc(nome)}</div>
        ${(isCreator || canManage) ? `<button class="info-rename-btn" id="btnRenameGroup" title="Renomear">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>` : ''}
      </div>
      <div class="chat-info-sub">${memberCount} participantes</div>`;
    body.appendChild(nameSection);

    if (isCreator || canManage) {
      document.getElementById('btnRenameGroup').onclick = () => startRenameGroup(conversa);
    }

    // Members section
    const membersSection = document.createElement('div');
    membersSection.className = 'chat-info-section';
    const membersLabel = document.createElement('div');
    membersLabel.className = 'chat-info-label';
    membersLabel.innerHTML = `Membros · ${memberCount}
      ${(isCreator || canManage) ? `<button class="info-add-member-btn" id="btnAddMember" title="Adicionar membro">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v12M2 8h12"/></svg>
        Adicionar
      </button>` : ''}`;
    membersSection.appendChild(membersLabel);

    if (isCreator || canManage) {
      membersLabel.querySelector('#btnAddMember').onclick = () => openAddMemberModal(conversa.id);
    }

    (conversa.participantes || []).forEach(pUid => {
      const u = _allUsers.find(x => x.uid === pUid);
      const uNome = u ? (u.nomeCompleto || u.nome || 'Utilizador') : (pUid === _uid ? ((_profile && _profile.nomeCompleto) || 'Tu') : 'Utilizador');
      const memberRow = document.createElement('div');
      memberRow.className = 'chat-member';
      const ava = document.createElement('div');
      ava.className = 'msg-ava';
      ava.style.cssText = `width:28px;height:28px;background:${uidColor(pUid)};font-size:10px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Poppins',sans-serif;font-weight:700;flex-shrink:0;`;
      ava.textContent = initials(uNome);
      memberRow.appendChild(ava);
      const nameSpan = document.createElement('span');
      nameSpan.style.flex = '1';
      nameSpan.innerHTML = `${esc(uNome)}${pUid === _uid ? ' <span style="color:var(--text-4);font-size:11px">(tu)</span>' : ''}`;
      memberRow.appendChild(nameSpan);
      if ((isCreator || canManage) && pUid !== _uid) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'member-remove-btn';
        removeBtn.title = 'Remover do grupo';
        removeBtn.textContent = '✕';
        removeBtn.onclick = () => doRemoveMember(conversa.id, pUid, uNome);
        memberRow.appendChild(removeBtn);
      }
      membersSection.appendChild(memberRow);
    });
    body.appendChild(membersSection);

    // Leave group button
    const actionsSection = document.createElement('div');
    actionsSection.className = 'chat-info-section';
    const leaveBtn = document.createElement('button');
    leaveBtn.className = 'info-action-btn danger';
    leaveBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Sair do grupo`;
    leaveBtn.onclick = () => doLeaveGroup(conversa.id);
    actionsSection.appendChild(leaveBtn);
    body.appendChild(actionsSection);

  } else {
    // DM info — simplified (removed dead "chamada áudio" button)
    const other = _allUsers.find(u => u.uid === uid);
    const oNome = other ? (other.nomeCompleto || other.nome || 'Utilizador') : 'Utilizador';
    body.innerHTML = `
      <div class="chat-info-avatar-center">
        <div class="msg-ava" style="width:56px;height:56px;background:${uidColor(uid)};font-size:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Poppins',sans-serif;font-weight:700;">${initials(oNome)}</div>
        <div class="chat-info-avatar-name">${esc(oNome)}</div>
        <div class="chat-info-status">
          <span class="status-dot-inline ${isOnline(other) ? 'online' : 'offline'}"></span>${isOnline(other) ? 'Online' : 'Offline'}
        </div>
      </div>
      <div class="chat-info-section">
        <div class="chat-info-label">Informação</div>
        <div class="chat-info-row"><span class="muted">Função</span><span>${esc(other?.funcao || '—')}</span></div>
        <div class="chat-info-row"><span class="muted">Escritório</span><span>${esc(other?.escritorio || '—')}</span></div>
      </div>`;
  }
}

/* ── Renomear grupo ── */
function startRenameGroup(conversa) {
  const section = document.getElementById('infoGroupNameSection');
  if (!section) return;
  const display = document.getElementById('infoNameDisplay');
  if (!display) return;
  const nomeAtual = conversa.nome || '';
  display.innerHTML = `
    <div class="chat-info-name-edit">
      <input class="chat-info-name-input" id="renameInput" value="${esc(nomeAtual)}" maxlength="60">
      <button class="chat-info-name-save" id="btnSaveRename">Guardar</button>
      <button class="chat-info-name-cancel" id="btnCancelRename">✕</button>
    </div>`;
  const inp = document.getElementById('renameInput');
  inp.focus();
  inp.select();
  document.getElementById('btnSaveRename').onclick = () => saveGroupName(conversa.id, conversa);
  document.getElementById('btnCancelRename').onclick = () => renderInfoPanel(conversa);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveGroupName(conversa.id, conversa);
    if (e.key === 'Escape') renderInfoPanel(conversa);
  });
}

async function saveGroupName(conversaId, conversa) {
  const inp = document.getElementById('renameInput');
  if (!inp) return;
  const nome = inp.value.trim();
  if (!nome) return;
  try {
    await ChatService.renameGroup(conversaId, nome);
    // Update local state
    const idx = _conversas.findIndex(c => c.id === conversaId);
    if (idx !== -1) _conversas[idx].nome = nome;
    renderConversaList(document.getElementById('chatSearch').value);
    const updatedConversa = { ...conversa, nome };
    renderInfoPanel(updatedConversa);
    renderThreadHead(updatedConversa);
  } catch (e) {
    console.error('[chat] renameGroup error', e);
    if (typeof window.toast === 'function') window.toast('Erro ao renomear grupo.', 'error');
  }
}

/* ── Adicionar membros ── */
function openAddMemberModal(conversaId) {
  const modal = document.getElementById('addMemberModal');
  if (!modal) return;
  modal.classList.add('open');
  modal.dataset.conversaId = conversaId;
  renderAddMemberList('', conversaId);
  setTimeout(() => document.getElementById('addMemberSearch').focus(), 80);
}

function closeAddMemberModal() {
  const modal = document.getElementById('addMemberModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.getElementById('addMemberSearch').value = '';
}

function renderAddMemberList(search, conversaId) {
  const el = document.getElementById('addMemberList');
  if (!el) return;
  const conversaIdToUse = conversaId || document.getElementById('addMemberModal').dataset.conversaId;
  const conversa = _conversas.find(c => c.id === conversaIdToUse);
  const existing = new Set((conversa && conversa.participantes) || []);

  const q = (search || '').toLowerCase().trim();
  const users = _allUsers.filter(u => {
    if (existing.has(u.uid)) return false;
    const nome = (u.nomeCompleto || u.nome || '').toLowerCase();
    return !q || nome.includes(q);
  });

  if (!users.length) {
    el.innerHTML = '<div class="picker-empty">Sem utilizadores para adicionar.</div>';
    return;
  }

  el.innerHTML = '';
  users.slice(0, 20).forEach(u => {
    const nome = u.nomeCompleto || u.nome || 'Utilizador';
    const row = document.createElement('div');
    row.className = 'picker-row';
    row.appendChild(buildAvatar(nome, u.uid, 32));
    const nameEl = document.createElement('span');
    nameEl.className = 'picker-name';
    nameEl.textContent = nome;
    if (u.funcao) {
      const sub = document.createElement('span');
      sub.className = 'picker-sub';
      sub.textContent = u.funcao;
      nameEl.appendChild(sub);
    }
    row.appendChild(nameEl);
    row.onclick = async () => {
      row.style.opacity = '.5';
      row.style.pointerEvents = 'none';
      try {
        await ChatService.addGroupMembers(conversaIdToUse, [u.uid]);
        closeAddMemberModal();
      } catch (e) {
        console.error('[chat] addGroupMembers error', e);
        if (typeof window.toast === 'function') window.toast('Erro ao adicionar membro.', 'error');
        row.style.opacity = '';
        row.style.pointerEvents = '';
      }
    };
    el.appendChild(row);
  });
}

async function doRemoveMember(conversaId, uid, nome) {
  if (!confirm(`Remover ${nome || 'este membro'} do grupo?`)) return;
  try {
    await ChatService.removeMember(conversaId, uid);
  } catch (e) {
    console.error('[chat] removeMember error', e);
    if (typeof window.toast === 'function') window.toast('Erro ao remover membro.', 'error');
  }
}

async function doLeaveGroup(conversaId) {
  if (!confirm('Sair deste grupo? Não poderás voltar a ver as mensagens.')) return;
  try {
    await ChatService.removeMember(conversaId, _uid);
    closeThread();
  } catch (e) {
    console.error('[chat] leaveGroup error', e);
    if (typeof window.toast === 'function') window.toast('Erro ao sair do grupo.', 'error');
  }
}

/* ── Fechar thread (mobile back) ── */
function closeThread() {
  if (_unsubMensagens) { _unsubMensagens(); _unsubMensagens = null; }
  if (_unsubTyping) { _unsubTyping(); _unsubTyping = null; }
  if (_typingTimer) { clearTimeout(_typingTimer); _typingTimer = null; }
  ChatService.clearTyping(_currentConversaId, _uid).catch(() => {});
  _currentConversaId = null;
  document.getElementById('chatWrap').classList.remove('chat-view-thread');
  document.getElementById('chatEmpty').style.display = 'flex';
  document.getElementById('threadInner').style.display = 'none';
  clearReply();
  renderConversaList(document.getElementById('chatSearch').value);
}

/* ══════════════════════════════════════════════════════
   RENDER — MENSAGENS (full re-render)
   ══════════════════════════════════════════════════════ */
function renderMensagens(msgs, conversa, skipScroll) {
  const el = document.getElementById('chatMessages');
  const isGroup = conversa && conversa.tipo === 'grupo';
  el.innerHTML = '';
  _renderedMsgIds = new Set();
  let lastDay = null;

  msgs.forEach((msg, i) => {
    const dayKey = new Date(msg.ts).toDateString();
    if (dayKey !== lastDay) {
      lastDay = dayKey;
      const sep = document.createElement('div');
      sep.className = 'msg-day-sep';
      sep.textContent = formatMsgDay(msg.ts);
      el.appendChild(sep);
    }

    const prev = msgs[i - 1];
    const prevMin = prev ? Math.floor(prev.ts / 60000) : -1;
    const currMin = Math.floor(msg.ts / 60000);
    const grouped = prev && prev.autorUid === msg.autorUid && prevMin === currMin;

    el.appendChild(buildMsgEl(msg, grouped, isGroup, _searchQuery));
    _renderedMsgIds.add(msg.id);
  });

  if (!skipScroll) scrollToBottom(true);
}

/* ══════════════════════════════════════════════════════
   APPEND MESSAGES — incremental (só novas mensagens)
   ══════════════════════════════════════════════════════ */
function appendMessages(newMsgs, conversa, prevMsg) {
  if (!newMsgs.length) return;
  const el = document.getElementById('chatMessages');
  const isGroup = conversa && conversa.tipo === 'grupo';

  let lastDay = prevMsg ? new Date(prevMsg.ts).toDateString() : null;
  let lastAuthorUid = prevMsg ? prevMsg.autorUid : null;
  let lastMin = prevMsg ? Math.floor(prevMsg.ts / 60000) : -1;

  newMsgs.forEach(msg => {
    const dayKey = new Date(msg.ts).toDateString();
    if (dayKey !== lastDay) {
      lastDay = dayKey;
      const sep = document.createElement('div');
      sep.className = 'msg-day-sep';
      sep.textContent = formatMsgDay(msg.ts);
      el.appendChild(sep);
    }

    const currMin = Math.floor(msg.ts / 60000);
    const grouped = lastAuthorUid === msg.autorUid && lastMin === currMin;
    lastAuthorUid = msg.autorUid;
    lastMin = currMin;

    el.appendChild(buildMsgEl(msg, grouped, isGroup, _searchQuery));
    _renderedMsgIds.add(msg.id);
  });

  // Only scroll to bottom if user was already near bottom
  scrollToBottom(false);

  // Push notification for messages from others while tab is hidden
  newMsgs.forEach(msg => {
    if (msg.autorUid !== _uid) showNotification(conversa, msg);
  });
}

/* ══════════════════════════════════════════════════════
   PAGINAÇÃO — CARREGAR MENSAGENS ANTERIORES
   ══════════════════════════════════════════════════════ */
async function loadOlderMessages() {
  if (_loadingOlder || !_hasMoreOlder || !_currentConversaId || _oldestTs === null) return;
  _loadingOlder = true;

  const msgsEl = document.getElementById('chatMessages');
  const spinner = document.createElement('div');
  spinner.id = 'chatLoadSpinner';
  spinner.className = 'chat-load-spinner';
  msgsEl.prepend(spinner);

  try {
    const older = await ChatService.loadMensagensAnteriores(_currentConversaId, _oldestTs, 40);
    const sp = document.getElementById('chatLoadSpinner');
    if (sp) sp.remove();

    if (!older.length) { _hasMoreOlder = false; return; }

    const prevScrollHeight = msgsEl.scrollHeight;
    const existingIds = new Set(_allMsgs.map(m => m.id));
    const fresh = older.filter(m => !existingIds.has(m.id));
    _allMsgs = [...fresh, ..._allMsgs];
    _oldestTs = _allMsgs[0].ts;
    if (fresh.length < 40) _hasMoreOlder = false;

    const conversa = _conversas.find(c => c.id === _currentConversaId);
    renderMensagens(_allMsgs, conversa || { tipo: 'dm' }, true);
    msgsEl.scrollTop = msgsEl.scrollHeight - prevScrollHeight;
  } catch (e) {
    console.warn('[chat] loadOlderMessages error', e);
    const sp = document.getElementById('chatLoadSpinner');
    if (sp) sp.remove();
  } finally {
    _loadingOlder = false;
  }
}

/* ══════════════════════════════════════════════════════
   TYPING INDICATOR
   ══════════════════════════════════════════════════════ */
function handleInputTyping() {
  if (!_currentConversaId) return;
  const now = Date.now();
  if (_typingTimer) clearTimeout(_typingTimer);
  // Throttle: só escreve no Firestore se passaram mais de 3s
  if (now - _lastTypingCallTime > 3000) {
    _lastTypingCallTime = now;
    ChatService.setTyping(_currentConversaId, _uid).catch(() => {});
  }
  // Apaga após 4s de inatividade
  _typingTimer = setTimeout(() => {
    _typingTimer = null;
    ChatService.clearTyping(_currentConversaId, _uid).catch(() => {});
  }, 4000);
}

function renderTypingIndicator(typingUsers) {
  const el = document.getElementById('chatTyping');
  if (!el) return;
  if (!typingUsers.length) { el.innerHTML = ''; return; }

  const names = typingUsers.map(t => {
    const u = _allUsers.find(x => x.uid === t.uid);
    return u ? (u.nomeCompleto || u.nome || 'Alguém').split(' ')[0] : 'Alguém';
  });

  let text;
  if (names.length === 1) text = `${names[0]} está a escrever`;
  else if (names.length === 2) text = `${names[0]} e ${names[1]} estão a escrever`;
  else text = 'Vários utilizadores estão a escrever';

  el.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div><span>${esc(text)}…</span>`;
}

/* ══════════════════════════════════════════════════════
   REPLY / QUOTE
   ══════════════════════════════════════════════════════ */
function setReplyTo(msg) {
  _replyingTo = { msgId: msg.id, texto: msg.texto, autorNome: msg.autorNome || 'Utilizador' };
  document.getElementById('replyToName').textContent = msg.autorUid === _uid ? 'ti' : (msg.autorNome || 'Utilizador');
  document.getElementById('replyToText').textContent = (msg.texto || '').slice(0, 100);
  document.getElementById('chatReplyBar').style.display = '';
  document.getElementById('chatInput').focus();
}

function clearReply() {
  _replyingTo = null;
  const bar = document.getElementById('chatReplyBar');
  if (bar) bar.style.display = 'none';
  const nameEl = document.getElementById('replyToName');
  const textEl = document.getElementById('replyToText');
  if (nameEl) nameEl.textContent = '';
  if (textEl) textEl.textContent = '';
}

/* ══════════════════════════════════════════════════════
   PESQUISA DENTRO DA CONVERSA
   ══════════════════════════════════════════════════════ */
function toggleThreadSearch() {
  _searchActive = !_searchActive;
  const bar = document.getElementById('chatSearchBar');
  const btn = document.getElementById('btnToggleSearch');
  bar.style.display = _searchActive ? '' : 'none';
  if (btn) btn.classList.toggle('active', _searchActive);
  if (_searchActive) {
    document.getElementById('chatSearchInput').focus();
  } else {
    _searchQuery = '';
    document.getElementById('chatSearchInput').value = '';
    // Re-render without highlight
    const conversa = _conversas.find(c => c.id === _currentConversaId);
    renderMensagens(_allMsgs, conversa || { tipo: 'dm' });
  }
}

/* ══════════════════════════════════════════════════════
   PUSH NOTIFICATIONS
   ══════════════════════════════════════════════════════ */
function initNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    // Pede permissão após interação com o chat (primeira mensagem enviada)
  }
}

function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

function showNotification(conversa, msg) {
  if (!document.hidden) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!msg || msg.autorUid === _uid) return;

  const nome = conversaNome(conversa);
  const body = `${msg.autorNome || 'Utilizador'}: ${(msg.texto || '').slice(0, 80)}`;
  try {
    const n = new Notification(nome, { body, tag: conversa.id, icon: 'favicon.ico' });
    n.onclick = () => {
      window.focus();
      if (conversa) openConversa(conversa.id);
      n.close();
    };
  } catch (_) {}
}

/* ══════════════════════════════════════════════════════
   ENVIAR MENSAGEM
   ══════════════════════════════════════════════════════ */
function sendMessage() {
  const input = document.getElementById('chatInput');
  const texto = input.value.trim();
  if (!texto || !_currentConversaId) return;

  input.value = '';
  input.style.height = 'auto';
  updateSendBtn();

  // Limpar typing e reply
  if (_typingTimer) { clearTimeout(_typingTimer); _typingTimer = null; }
  ChatService.clearTyping(_currentConversaId, _uid).catch(() => {});
  const replyTo = _replyingTo ? { ..._replyingTo } : null;
  clearReply();

  // Pedir permissão de notificações na primeira mensagem enviada
  requestNotificationPermission();

  const nome = _profile ? (_profile.nomeCompleto || _profile.nome || 'Utilizador') : 'Utilizador';
  ChatService.sendMensagem(_currentConversaId, texto, _uid, nome, replyTo)
    .then(() => scrollToBottom(true))
    .catch(() => {
      if (typeof window.toast === 'function') window.toast('Erro ao enviar mensagem. Tenta novamente.', 'error');
    });
}

function updateSendBtn() {
  const btn   = document.getElementById('btnSend');
  const input = document.getElementById('chatInput');
  if (!btn || !input) return;
  btn.disabled = !input.value.trim();
}

/* ══════════════════════════════════════════════════════
   MODAL — NOVA CONVERSA
   ══════════════════════════════════════════════════════ */
function openNewChatModal() {
  document.getElementById('newChatModal').classList.add('open');
  switchModalTab('dm');
  renderUserPicker('', 'dm');
  const input = document.getElementById('userSearch');
  if (input) input.focus();
}

function closeNewChatModal() {
  document.getElementById('newChatModal').classList.remove('open');
  document.getElementById('userSearch').value = '';
  document.getElementById('groupName').value = '';
  document.getElementById('groupUserSearch').value = '';
  _groupSelected = [];
  renderGroupSelected();
}

function switchModalTab(tab) {
  document.querySelectorAll('.modal-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.getElementById('tabDm').style.display    = tab === 'dm'    ? 'flex' : 'none';
  document.getElementById('tabGrupo').style.display = tab === 'grupo' ? 'flex' : 'none';
  if (tab === 'dm')    renderUserPicker(document.getElementById('userSearch').value, 'dm');
  if (tab === 'grupo') renderUserPicker(document.getElementById('groupUserSearch').value, 'grupo');
}

function renderUserPicker(search, mode) {
  const listId = mode === 'dm' ? 'userList' : 'groupUserList';
  const el = document.getElementById(listId);
  if (!el) return;

  const q = (search || '').toLowerCase().trim();
  const users = _allUsers.filter(u => {
    if (u.uid === _uid) return false;
    if (mode === 'grupo' && _groupSelected.includes(u.uid)) return false;
    const nome = (u.nomeCompleto || u.nome || '').toLowerCase();
    return !q || nome.includes(q);
  });

  if (!users.length) {
    el.innerHTML = '<div class="picker-empty">Sem resultados</div>';
    return;
  }

  el.innerHTML = '';
  users.slice(0, 25).forEach(u => {
    const nome = u.nomeCompleto || u.nome || 'Utilizador';
    const row  = document.createElement('div');
    row.className = 'picker-row';
    row.appendChild(buildAvatar(nome, u.uid, 32));

    const nameEl = document.createElement('span');
    nameEl.className = 'picker-name';
    nameEl.textContent = nome;
    if (u.funcao) {
      const sub = document.createElement('span');
      sub.className = 'picker-sub';
      sub.textContent = u.funcao;
      nameEl.appendChild(sub);
    }
    row.appendChild(nameEl);

    if (mode === 'dm') {
      row.onclick = async () => {
        closeNewChatModal();
        const id = await ChatService.getOrCreateDm(_uid, u.uid);
        if (!_conversas.find(c => c.id === id)) {
          _conversas.unshift({ id, tipo:'dm', participantes:[_uid, u.uid], ultimaMensagem:null, ultimaMensagemTs:Date.now(), ultimaMensagemUid:null, nome:null });
        }
        openConversa(id);
      };
    } else {
      row.onclick = () => {
        _groupSelected.push(u.uid);
        renderGroupSelected();
        renderUserPicker(document.getElementById('groupUserSearch').value, 'grupo');
      };
    }
    el.appendChild(row);
  });
}

function renderGroupSelected() {
  const el = document.getElementById('groupSelected');
  if (!el) return;
  if (!_groupSelected.length) { el.innerHTML = ''; return; }
  el.innerHTML = _groupSelected.map(uid => {
    const u = _allUsers.find(x => x.uid === uid);
    const nome = u ? (u.nomeCompleto || u.nome || 'Utilizador') : 'Utilizador';
    return `<span class="group-sel-chip">${esc(nome)}<button class="chip-remove" data-uid="${uid}">✕</button></span>`;
  }).join('');
  el.querySelectorAll('.chip-remove').forEach(btn => {
    btn.onclick = () => {
      _groupSelected = _groupSelected.filter(u => u !== btn.dataset.uid);
      renderGroupSelected();
      renderUserPicker(document.getElementById('groupUserSearch').value, 'grupo');
    };
  });
}

async function doCreateGroup() {
  const nome = document.getElementById('groupName').value.trim();
  if (!nome)                { document.getElementById('groupName').focus(); return; }
  if (!_groupSelected.length) { document.getElementById('groupUserSearch').focus(); return; }
  const btn = document.getElementById('btnCreateGroup');
  btn.disabled = true;
  btn.textContent = 'A criar…';
  try {
    const participantes = [_uid, ..._groupSelected];
    const id = await ChatService.createGroup(nome, participantes, _uid);
    closeNewChatModal();
    if (!_conversas.find(c => c.id === id)) {
      _conversas.unshift({ id, tipo:'grupo', participantes, ultimaMensagem:null, ultimaMensagemTs:Date.now(), ultimaMensagemUid:null, nome });
    }
    openConversa(id);
  } catch(e) {
    console.error('[chat] createGroup error', e);
    if (typeof window.toast === 'function') window.toast('Erro ao criar grupo. Tenta novamente.', 'error');
    btn.disabled = false;
    btn.textContent = 'Criar grupo';
  }
}

/* ══════════════════════════════════════════════════════
   INICIALIZAÇÃO
   ══════════════════════════════════════════════════════ */
window.bootProtectedPage({ activePage:'chat', moduleId:'chat' }, ({ profile }) => {
  _profile = profile;
  _uid = (profile && profile.uid) || (window.currentUser && window.currentUser.uid) || '';
  const chatList = document.getElementById('chatList');
  if (chatList) chatList.innerHTML = '<div class="chat-list-empty">A carregar conversas...</div>';

  initNotifications();

  function refreshUsers() {
    ChatService.loadUtilizadores()
      .then(users => {
        _allUsers = users;
        renderConversaList(document.getElementById('chatSearch').value);
      })
      .catch(err => console.warn('[chat] loadUtilizadores error', err));
  }
  refreshUsers();
  // Refresh silencioso a cada 10 min (cache já trata do Firestore)
  setInterval(refreshUsers, 600000);

  _unsubLidos = ChatService.listenUnreadCounts(_uid, lidos => {
    _lidos = lidos;
    renderConversaList(document.getElementById('chatSearch').value);
  });

  _unsubConversas = ChatService.listenConversas(_uid, conversas => {
    _conversas = conversas;
    renderConversaList(document.getElementById('chatSearch').value);
    // Atualiza info panel se aberto
    if (_showInfo && _currentConversaId) {
      const c = _conversas.find(x => x.id === _currentConversaId);
      if (c) renderInfoPanel(c);
    }
  });

  // Pesquisa na sidebar
  document.getElementById('chatSearch').addEventListener('input', e => {
    renderConversaList(e.target.value);
  });

  // Botão nova conversa
  document.getElementById('btnNewDm').addEventListener('click', openNewChatModal);
  document.getElementById('btnCloseNewChat').addEventListener('click', closeNewChatModal);
  document.getElementById('newChatModal').addEventListener('click', e => {
    if (e.target === document.getElementById('newChatModal')) closeNewChatModal();
  });

  // Fechar info panel
  document.getElementById('btnCloseInfo').addEventListener('click', () => {
    _showInfo = false;
    document.getElementById('chatInfoPanel').style.display = 'none';
    const btn = document.getElementById('btnToggleInfo');
    if (btn) btn.classList.remove('active');
  });

  // Modal tabs
  document.querySelectorAll('.modal-tab').forEach(btn => {
    btn.addEventListener('click', () => switchModalTab(btn.dataset.tab));
  });

  document.getElementById('userSearch').addEventListener('input', e => renderUserPicker(e.target.value, 'dm'));
  document.getElementById('groupUserSearch').addEventListener('input', e => renderUserPicker(e.target.value, 'grupo'));
  document.getElementById('btnCreateGroup').addEventListener('click', doCreateGroup);
  document.getElementById('btnCancelGroup').addEventListener('click', closeNewChatModal);
  document.getElementById('groupName').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); doCreateGroup(); }
  });

  // Botão annexos (ainda não implementado)
  const attachBtn = document.querySelector('.attach-btn');
  if (attachBtn) {
    attachBtn.addEventListener('click', () => {
      if (typeof window.toast === 'function') window.toast('Anexos estão a caminho numa próxima versão.');
    });
  }

  // Composer — typing e envio
  const chatInput = document.getElementById('chatInput');
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
    updateSendBtn();
    handleInputTyping();
  });
  document.getElementById('btnSend').addEventListener('click', sendMessage);

  // Cancelar reply
  document.getElementById('btnCancelReply').addEventListener('click', clearReply);

  // Pesquisa dentro da conversa
  document.getElementById('chatSearchInput').addEventListener('input', e => {
    _searchQuery = e.target.value.trim();
    const conversa = _conversas.find(c => c.id === _currentConversaId);
    const filtered = _searchQuery
      ? _allMsgs.filter(m => m.texto && m.texto.toLowerCase().includes(_searchQuery.toLowerCase()))
      : _allMsgs;
    renderMensagens(filtered, conversa || { tipo: 'dm' });
  });
  document.getElementById('btnCloseSearch').addEventListener('click', () => {
    _searchActive = true; // toggleThreadSearch vai inverter para false
    toggleThreadSearch();
  });

  // Modal de adicionar membro
  document.getElementById('btnCloseAddMember').addEventListener('click', closeAddMemberModal);
  document.getElementById('addMemberModal').addEventListener('click', e => {
    if (e.target === document.getElementById('addMemberModal')) closeAddMemberModal();
  });
  document.getElementById('addMemberSearch').addEventListener('input', e => {
    renderAddMemberList(e.target.value);
  });

  // Scroll-up para carregar mensagens anteriores
  document.getElementById('chatMessages').addEventListener('scroll', function () {
    if (this.scrollTop < 60) loadOlderMessages();
  });

  // Mobile back
  window.addEventListener('popstate', () => {
    if (document.getElementById('chatWrap').classList.contains('chat-view-thread')) closeThread();
  });

  window.addEventListener('beforeunload', () => {
    if (_currentConversaId) ChatService.clearTyping(_currentConversaId, _uid).catch(() => {});
    if (_unsubConversas) _unsubConversas();
    if (_unsubMensagens) _unsubMensagens();
    if (_unsubLidos)     _unsubLidos();
    if (_unsubTyping)    _unsubTyping();
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;

    const addMemberModal = document.getElementById('addMemberModal');
    if (addMemberModal && addMemberModal.classList.contains('open')) {
      closeAddMemberModal(); return;
    }

    const newChatModal = document.getElementById('newChatModal');
    if (newChatModal && newChatModal.classList.contains('open')) {
      closeNewChatModal(); return;
    }

    if (_searchActive) { toggleThreadSearch(); return; }

    if (_showInfo) {
      _showInfo = false;
      const infoPanel = document.getElementById('chatInfoPanel');
      if (infoPanel) infoPanel.style.display = 'none';
      const btn = document.getElementById('btnToggleInfo');
      if (btn) btn.classList.remove('active');
      return;
    }

    if (_replyingTo) { clearReply(); return; }

    if (document.getElementById('chatWrap').classList.contains('chat-view-thread')) {
      closeThread();
    }
  });
});
