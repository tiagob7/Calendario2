/* ══════════════════════════════════════════════════════
   CHAT-BADGE.JS
   Listener leve de não-lidos — incluir em todas as páginas
   exceto chat.html (que tem a lógica completa própria).
   Atualiza #sidebarBadgeChat e #tabbarBadgeChat.
   ══════════════════════════════════════════════════════ */
(function () {
  if (window.__chatBadgeInit) return;
  window.__chatBadgeInit = true;

  let _unsubConversas = null;
  let _unsubLidos = null;
  let _conversas = [];
  let _lidos = {};
  let _uid = '';

  function calcUnread() {
    let n = 0;
    _conversas.forEach(function (c) {
      if (!c.ultimaMensagemTs) return;
      if (c.ultimaMensagemUid === _uid) return;
      if (c.ultimaMensagemTs > (_lidos[c.id] || 0)) n++;
    });
    return n;
  }

  function updateBadges(n) {
    ['sidebarBadgeChat', 'tabbarBadgeChat'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (n > 0) {
        el.textContent = n > 99 ? '99+' : String(n);
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });
  }

  function stop() {
    if (_unsubConversas) { _unsubConversas(); _unsubConversas = null; }
    if (_unsubLidos)     { _unsubLidos();     _unsubLidos = null; }
    _conversas = [];
    _lidos = {};
  }

  function start(uid) {
    _uid = uid;
    var db = firebase.firestore();

    _unsubLidos = db.collection('chat_lidos')
      .where('uid', '==', uid)
      .onSnapshot(function (snap) {
        _lidos = {};
        snap.docs.forEach(function (d) {
          _lidos[d.data().conversaId] = d.data().ultimoLidoTs;
        });
        updateBadges(calcUnread());
      }, function () {});

    _unsubConversas = db.collection('conversas')
      .where('participantes', 'array-contains', uid)
      .onSnapshot(function (snap) {
        _conversas = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        updateBadges(calcUnread());
      }, function () {});
  }

  firebase.auth().onAuthStateChanged(function (user) {
    stop();
    if (user) start(user.uid);
    else updateBadges(0);
  });

  window.addEventListener('beforeunload', stop);
})();
