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
let _allUsers = [];
let _groupSelected = [];
let _showInfo = false;

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
    // Hash icon for groups
    const hash = document.createElement('div');
    hash.className = 'chat-hash';
    hash.textContent = '#';
    item.appendChild(hash);
  } else {
    // Avatar with status dot wrap
    const wrap = document.createElement('div');
    wrap.className = 'chat-ava-wrap';
    wrap.appendChild(buildAvatar(nome, uid, 36));
    const dot = document.createElement('span');
    dot.className = 'status-dot offline';
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
      ${unread ? '<span class="chat-unread-badge">1</span>' : ''}
    </div>`;
  item.appendChild(meta);

  item.addEventListener('click', () => openConversa(c.id));
  return item;
}

/* ══════════════════════════════════════════════════════
   ABRIR CONVERSA
   ══════════════════════════════════════════════════════ */
function openConversa(conversaId) {
  _currentConversaId = conversaId;
  const conversa = _conversas.find(c => c.id === conversaId);

  // Mobile slide
  const wrap = document.getElementById('chatWrap');
  if (!wrap.classList.contains('chat-view-thread')) {
    wrap.classList.add('chat-view-thread');
    history.pushState({ chatThread: conversaId }, '');
  }

  document.getElementById('chatEmpty').style.display = 'none';
  document.getElementById('threadInner').style.display = 'flex';

  renderThreadHead(conversa);
  renderConversaList(document.getElementById('chatSearch').value);

  if (_unsubMensagens) { _unsubMensagens(); _unsubMensagens = null; }
  document.getElementById('chatMessages').innerHTML = '';

  _unsubMensagens = ChatService.listenMensagens(conversaId, 40, msgs => {
    renderMensagens(msgs, conversa || { tipo: 'dm' });
    if (msgs.length) {
      const lastTs = msgs[msgs.length - 1].ts;
      ChatService.markRead(_uid, conversaId, lastTs).catch(() => {});
      _lidos[conversaId] = lastTs;
      renderConversaList(document.getElementById('chatSearch').value);
    }
  });

  // Show info panel if open
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
    const ava = buildAvatar(nome, uid, 36);
    head.appendChild(ava);
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

  // Spacer
  const spacer = document.createElement('div');
  spacer.style.flex = '1';
  head.appendChild(spacer);

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

  if (isGrupo) {
    const memberCount = (conversa.participantes || []).length;
    body.innerHTML = `
      <div>
        <div class="chat-info-big">#${esc(nome)}</div>
        <div class="chat-info-sub">${memberCount} participantes</div>
      </div>
      <div class="chat-info-section">
        <div class="chat-info-label">Membros · ${memberCount}</div>
        ${(conversa.participantes || []).slice(0, 8).map(pUid => {
          const u = _allUsers.find(x => x.uid === pUid);
          const uNome = u ? (u.nomeCompleto || u.nome || 'Utilizador') : (pUid === _uid ? 'Tu' : 'Utilizador');
          return `<div class="chat-member">
            <div class="msg-ava" style="width:28px;height:28px;background:${uidColor(pUid)};font-size:10px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Poppins',sans-serif;font-weight:700;flex-shrink:0;">${initials(uNome)}</div>
            <span>${esc(uNome)}${pUid === _uid ? ' <span style="color:var(--text-4);font-size:11px">(tu)</span>' : ''}</span>
          </div>`;
        }).join('')}
        ${memberCount > 8 ? `<div style="font-size:11.5px;color:var(--text-3);padding-top:2px;">+ ${memberCount - 8} outros</div>` : ''}
      </div>
      <div class="chat-info-section">
        <div class="chat-info-label">Fixados</div>
        <div style="font-size:12.5px;color:var(--text-3)">Sem mensagens fixadas.</div>
      </div>`;
  } else {
    const other = _allUsers.find(u => u.uid === uid);
    const oNome = other ? (other.nomeCompleto || other.nome || 'Utilizador') : 'Utilizador';
    body.innerHTML = `
      <div class="chat-info-avatar-center">
        <div class="msg-ava" style="width:56px;height:56px;background:${uidColor(uid)};font-size:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Poppins',sans-serif;font-weight:700;">${initials(oNome)}</div>
        <div class="chat-info-avatar-name">${esc(oNome)}</div>
        <div class="chat-info-status">
          <span class="status-dot-inline offline"></span>Offline
        </div>
      </div>
      <div class="chat-info-section">
        <div class="chat-info-label">Informação</div>
        <div class="chat-info-row"><span class="muted">Função</span><span>${esc(other?.funcao || '—')}</span></div>
        <div class="chat-info-row"><span class="muted">Escritório</span><span>${esc(other?.escritorio || '—')}</span></div>
      </div>
      <div class="chat-info-section">
        <button class="btn-full">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.65A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8a16 16 0 006.29 6.29l1.17-1.17a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.03z"/></svg>
          Chamada áudio
        </button>
      </div>`;
  }
}

/* ── Fechar thread (mobile back) ── */
function closeThread() {
  _currentConversaId = null;
  document.getElementById('chatWrap').classList.remove('chat-view-thread');
  if (_unsubMensagens) { _unsubMensagens(); _unsubMensagens = null; }
  document.getElementById('chatEmpty').style.display = 'flex';
  document.getElementById('threadInner').style.display = 'none';
  renderConversaList(document.getElementById('chatSearch').value);
}

/* ══════════════════════════════════════════════════════
   RENDER — MENSAGENS
   ══════════════════════════════════════════════════════ */
function renderMensagens(msgs, conversa) {
  const el = document.getElementById('chatMessages');
  const isGroup = conversa && conversa.tipo === 'grupo';
  el.innerHTML = '';
  let lastDay = null;

  msgs.forEach((msg, i) => {
    const isOwn  = msg.autorUid === _uid;
    const dayKey = new Date(msg.ts).toDateString();

    // Day separator
    if (dayKey !== lastDay) {
      lastDay = dayKey;
      const sep = document.createElement('div');
      sep.className = 'msg-day-sep';
      sep.textContent = formatMsgDay(msg.ts);
      el.appendChild(sep);
    }

    // Group consecutive messages from same sender (same minute)
    const prev = msgs[i - 1];
    const prevMin = prev ? Math.floor(prev.ts / 60000) : -1;
    const currMin = Math.floor(msg.ts / 60000);
    const grouped = prev && prev.autorUid === msg.autorUid && prevMin === currMin;

    const wrap = document.createElement('div');
    wrap.className = 'msg-wrap ' + (isOwn ? 'msg-own' : 'msg-other') + (grouped ? ' grouped' : '');

    // Avatar slot
    const avaSlot = document.createElement('div');
    avaSlot.className = 'msg-avatar-slot';
    if (!grouped && !isOwn) avaSlot.appendChild(buildAvatar(msg.autorNome, msg.autorUid, 32));
    wrap.appendChild(avaSlot);

    // Message body
    const body = document.createElement('div');
    body.className = 'msg-body';

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

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = esc(msg.texto).replace(/\n/g, '<br>');
    body.appendChild(bubble);

    wrap.appendChild(body);
    el.appendChild(wrap);
  });

  scrollToBottom(true);
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

  const nome = _profile ? (_profile.nomeCompleto || _profile.nome || 'Utilizador') : 'Utilizador';
  ChatService.sendMensagem(_currentConversaId, texto, _uid, nome)
    .then(() => scrollToBottom(true))
    .catch(err => console.error('[chat] send error', err));
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
  if (chatList) {
    chatList.innerHTML = '<div class="chat-list-empty">A carregar conversas...</div>';
  }

  ChatService.loadUtilizadores()
    .then(users => { _allUsers = users; })
    .catch(err => console.warn('[chat] loadUtilizadores error', err));

  _unsubLidos = ChatService.listenUnreadCounts(_uid, lidos => {
    _lidos = lidos;
    renderConversaList(document.getElementById('chatSearch').value);
  });

  _unsubConversas = ChatService.listenConversas(_uid, conversas => {
    _conversas = conversas;
    renderConversaList(document.getElementById('chatSearch').value);
  });

  // Search
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
    if (e.key === 'Enter') {
      e.preventDefault();
      doCreateGroup();
    }
  });

  // Attachments are not implemented yet: keep users informed instead of a dead button.
  const attachBtn = document.querySelector('.attach-btn');
  if (attachBtn) {
    attachBtn.addEventListener('click', () => {
      if (typeof window.toast === 'function') {
        window.toast('Anexos no chat estao a caminho.');
      }
    });
  }

  // Composer
  const chatInput = document.getElementById('chatInput');
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
    updateSendBtn();
  });
  document.getElementById('btnSend').addEventListener('click', sendMessage);

  // Mobile back
  window.addEventListener('popstate', () => {
    if (document.getElementById('chatWrap').classList.contains('chat-view-thread')) closeThread();
  });

  window.addEventListener('beforeunload', () => {
    if (_unsubConversas) _unsubConversas();
    if (_unsubMensagens) _unsubMensagens();
    if (_unsubLidos)     _unsubLidos();
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;

    const newChatModal = document.getElementById('newChatModal');
    if (newChatModal && newChatModal.classList.contains('open')) {
      closeNewChatModal();
      return;
    }

    if (_showInfo) {
      _showInfo = false;
      const infoPanel = document.getElementById('chatInfoPanel');
      if (infoPanel) infoPanel.style.display = 'none';
      const btn = document.getElementById('btnToggleInfo');
      if (btn) btn.classList.remove('active');
      return;
    }

    if (document.getElementById('chatWrap').classList.contains('chat-view-thread')) {
      closeThread();
    }
  });
});
