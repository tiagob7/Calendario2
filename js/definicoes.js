const CORES = [
  '#2563eb', '#7c3aed', '#db2777', '#dc2626',
  '#d97706', '#16a34a', '#0891b2', '#374151',
  '#6366f1', '#059669', '#ea580c', '#9333ea',
];

const CORES_RAPIDAS = [
  { hex: '#0284c7', label: 'Azul' },
  { hex: '#0f766e', label: 'Verde' },
  { hex: '#7c3aed', label: 'Violeta' },
  { hex: '#c2410c', label: 'Terracota' },
  { hex: '#db2777', label: 'Rosa' },
  { hex: '#16a34a', label: 'Esmeralda' },
  { hex: '#d97706', label: 'Âmbar' },
  { hex: '#dc2626', label: 'Vermelho' },
  { hex: '#0891b2', label: 'Ciano' },
  { hex: '#4f46e5', label: 'Índigo' },
  { hex: '#374151', label: 'Grafite' },
  { hex: '#9333ea', label: 'Púrpura' },
];

const FUNDOS_RAPIDOS = [
  { hex: '#f1f5f9', label: 'Slate (predefinição)' },
  { hex: '#f8fafc', label: 'Branco frio' },
  { hex: '#ffffff', label: 'Branco puro' },
  { hex: '#f9f7f4', label: 'Branco quente' },
  { hex: '#fefaf5', label: 'Bege suave' },
  { hex: '#fffbeb', label: 'Âmbar suave' },
  { hex: '#f0fdf4', label: 'Verde suave' },
  { hex: '#f0fffe', label: 'Ciano suave' },
  { hex: '#ecfeff', label: 'Azul claro' },
  { hex: '#faf8ff', label: 'Lavanda' },
  { hex: '#fff1f2', label: 'Rosa suave' },
  { hex: '#f4f4f5', label: 'Cinza neutro' },
];

let paineis = {
  Aparencia: false, Utilizadores: false, Escritorios: false,
  Perfis: false, Auditoria: false, Calendario: false, Seed: false,
  Documentacao: false,
};

const THEME_PRESETS = [
  { id: 'default', label: 'Azul clean',       accent: '#0284c7', bg: '#f1f5f9' },
  { id: 'forest',  label: 'Verde atlântico',  accent: '#0f766e', bg: '#f0fffe' },
  { id: 'sunset',  label: 'Terracota',        accent: '#c2410c', bg: '#fefaf5' },
  { id: 'violet',  label: 'Violeta',          accent: '#7c3aed', bg: '#faf8ff' },
];
let escritoriosData = [];
let utilizadoresAll = [];
let escEditandoId = null;
let escApagarId = null;
let corSel = CORES[0];

function ordenarEscritorios() {
  escritoriosData = (window.OfficesService ? window.OfficesService.normalizeList(escritoriosData) : escritoriosData.slice());
}

window.bootProtectedPage({
  activePage: 'definicoes',
  moduleId: 'definicoes',
  requireAdmin: true,
  onDenied() {
    document.querySelector('.page').innerHTML =
      '<div style="text-align:center;padding:80px 20px;font-size:13px;color:var(--muted);">Acesso restrito a administradores.</div>';
  },
}, async () => {
  renderColorSwatches();

  // Load hero stats eagerly
  try {
    const [usrs, escs] = await Promise.all([
      window.UsersService.listAll(),
      window.OfficesService ? window.OfficesService.load({ includeInactive: false }) : Promise.resolve([]),
    ]);
    utilizadoresAll = usrs;
    if (escs && escs.length) escritoriosData = escs;
    const total  = usrs.length;
    const admins = usrs.filter(u => u.role === 'admin').length;
    const escN   = escs.length;
    const heroSub = document.getElementById('heroSub');
    if (heroSub) heroSub.textContent = `${total} utilizador${total !== 1 ? 'es' : ''} · ${admins} admin${admins !== 1 ? 's' : ''} · ${escN} escritório${escN !== 1 ? 's' : ''}`;
  } catch (_) { /* silently skip hero stats */ }

  document.getElementById('escNome').addEventListener('input', function() {
    if (!escEditandoId) {
      document.getElementById('escId').value = this.value
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') fecharTodosModais();
    if (e.key === 'Enter' && document.getElementById('modalEscritorio').classList.contains('open')) {
      guardarEscritorio();
    }
  });

  document.querySelectorAll('.modal-overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) fecharTodosModais(); })
  );
});

function togglePainel(nome) {
  const jaAberto = paineis[nome];
  Object.keys(paineis).forEach(k => {
    paineis[k] = false;
    const panel = document.getElementById('panel' + k);
    const card  = document.getElementById('card' + k);
    if (panel) panel.classList.remove('open');
    if (card)  card.classList.remove('active');
  });

  if (!jaAberto) {
    paineis[nome] = true;
    const panel = document.getElementById('panel' + nome);
    const card  = document.getElementById('card' + nome);
    if (panel) panel.classList.add('open');
    if (card)  card.classList.add('active');
    setTimeout(() => panel && panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    if (nome === 'Aparencia')    carregarAparencia();
    if (nome === 'Utilizadores') carregarUtilizadores();
    if (nome === 'Escritorios')  carregarEscritorios();
    if (nome === 'Perfis')       defCarregarPerfis();
    if (nome === 'Auditoria')    defCarregarAuditoria();
    if (nome === 'Calendario')   defCarregarCalendario();
    if (nome === 'Seed')         defCarregarSeed();
    // Documentação não precisa de carregar dados
  }
}

function carregarAparencia() {
  renderAparencia();
}

function renderAparencia() {
  const body = document.getElementById('aparenciaBody');
  const temaAtual = document.documentElement.getAttribute('data-theme') || 'default';
  const dark = document.documentElement.classList.contains('dark');
  const corAtual = document.documentElement.style.getPropertyValue('--accent').trim() || '';
  const bgAtual = document.documentElement.style.getPropertyValue('--bg').trim() || '';
  const accentPadrao = THEME_PRESETS.find(t => t.id === temaAtual)?.accent || '#0284c7';
  const bgPadrao = THEME_PRESETS.find(t => t.id === temaAtual)?.bg || '#f1f5f9';

  body.innerHTML = `
    <p class="field-label" style="margin-bottom:10px;">Tema de cor</p>
    <div class="tema-grid">
      ${THEME_PRESETS.map(t => `
        <button class="tema-card ${t.id === temaAtual ? 'sel' : ''}" onclick="definirTema('${t.id}')">
          <div class="tema-swatches">
            <div class="tema-swatch" style="background:${t.accent};"></div>
            <div class="tema-swatch" style="background:${t.bg};border:1px solid #d1d5db;"></div>
          </div>
          <div class="tema-label">${t.label}</div>
          ${t.id === temaAtual ? '<div class="tema-check">✓</div>' : ''}
        </button>`).join('')}
    </div>

    <div class="cor-custom-section">
      <div class="cor-custom-header">
        <p class="field-label" style="margin:0;">Cor de destaque</p>
        ${corAtual ? `<button class="cor-reset-btn" onclick="resetCorPersonalizada()">Repor</button>` : ''}
      </div>
      <p class="cor-custom-desc">Botões, links e elementos ativos.</p>
      <div class="cor-custom-row">
        <label class="cor-picker-wrap" title="Escolher cor">
          <input type="color" id="corPickerInput" value="${corAtual || accentPadrao}" oninput="previewCorPersonalizada(this.value)">
          <div class="cor-picker-preview" style="background:${corAtual || accentPadrao};"></div>
          <span class="cor-picker-label">${(corAtual || accentPadrao).toUpperCase()}</span>
        </label>
        <div class="cor-rapidas">
          ${CORES_RAPIDAS.map(c => `
            <button class="cor-rapida-btn ${c.hex === corAtual ? 'sel' : ''}" style="background:${c.hex};" title="${c.label}" onclick="aplicarCorPersonalizada('${c.hex}')"></button>
          `).join('')}
        </div>
      </div>
      <div class="cor-preview-bar">
        <span class="cor-preview-btn" id="corPreviewBtn" style="background:${corAtual || accentPadrao};">Botão</span>
        <span class="cor-preview-link" id="corPreviewLink" style="color:${corAtual || accentPadrao};">Link de exemplo</span>
        <span class="cor-preview-badge" id="corPreviewBadge" style="background:${corAtual || accentPadrao}1a;color:${corAtual || accentPadrao};border-color:${corAtual || accentPadrao}40;">Etiqueta</span>
      </div>
      <button class="btn btn-primary" style="margin-top:10px;background:${corAtual || accentPadrao};" onclick="aplicarCorPersonalizada(document.getElementById('corPickerInput').value)">Aplicar cor</button>
    </div>

    <div class="cor-custom-section" style="margin-top:10px;">
      <div class="cor-custom-header">
        <p class="field-label" style="margin:0;">Fundo da página</p>
        ${bgAtual ? `<button class="cor-reset-btn" onclick="resetFundoPersonalizado()">Repor</button>` : ''}
      </div>
      <p class="cor-custom-desc">Cor de fundo geral da interface (não afeta o modo escuro).</p>
      <div class="cor-custom-row">
        <label class="cor-picker-wrap" title="Escolher cor de fundo">
          <input type="color" id="bgPickerInput" value="${bgAtual || bgPadrao}" oninput="previewFundoPersonalizado(this.value)">
          <div class="cor-picker-preview" style="background:${bgAtual || bgPadrao};border:1px solid #d1d5db;"></div>
          <span class="cor-picker-label">${(bgAtual || bgPadrao).toUpperCase()}</span>
        </label>
        <div class="cor-rapidas">
          ${FUNDOS_RAPIDOS.map(c => `
            <button class="cor-rapida-btn fundo-btn ${c.hex === bgAtual ? 'sel' : ''}" style="background:${c.hex};border:1px solid #d1d5db;" title="${c.label}" onclick="aplicarFundoPersonalizado('${c.hex}')"></button>
          `).join('')}
        </div>
      </div>
      <div class="fundo-preview-wrap" id="fundoPreviewWrap" style="background:${bgAtual || bgPadrao};">
        <div class="fundo-preview-card">
          <div class="fundo-preview-line" style="background:${corAtual || accentPadrao};width:40%;"></div>
          <div class="fundo-preview-line" style="width:70%;"></div>
          <div class="fundo-preview-line" style="width:55%;"></div>
        </div>
        <div class="fundo-preview-card">
          <div class="fundo-preview-line" style="width:60%;"></div>
          <div class="fundo-preview-line" style="width:80%;"></div>
        </div>
      </div>
      <button class="btn btn-secondary" style="margin-top:10px;" onclick="aplicarFundoPersonalizado(document.getElementById('bgPickerInput').value)">Aplicar fundo</button>
    </div>

    <p class="field-label" style="margin-top:20px;margin-bottom:10px;">Modo de visualização</p>
    <div class="toggle-dark-row ${dark ? 'on' : ''}" onclick="toggleModoEscuro()">
      <div class="toggle-dark-track"><div class="toggle-dark-thumb"></div></div>
      <span class="toggle-dark-label">${dark ? 'Modo escuro ativo' : 'Modo claro ativo'}</span>
      <span style="font-size:18px;line-height:1;">${dark ? '🌙' : '☀️'}</span>
    </div>`;
}

function previewCorPersonalizada(cor) {
  const input = document.getElementById('corPickerInput');
  if (input) {
    const label = input.closest('.cor-picker-wrap')?.querySelector('.cor-picker-label');
    const preview = input.closest('.cor-picker-wrap')?.querySelector('.cor-picker-preview');
    if (label) label.textContent = cor.toUpperCase();
    if (preview) preview.style.background = cor;
  }
  const btn = document.getElementById('corPreviewBtn');
  const link = document.getElementById('corPreviewLink');
  const badge = document.getElementById('corPreviewBadge');
  if (btn) btn.style.background = cor;
  if (link) link.style.color = cor;
  if (badge) {
    badge.style.background = cor + '1a';
    badge.style.color = cor;
    badge.style.borderColor = cor + '40';
  }
}

function previewFundoPersonalizado(cor) {
  const input = document.getElementById('bgPickerInput');
  if (input) {
    const label = input.closest('.cor-picker-wrap')?.querySelector('.cor-picker-label');
    const preview = input.closest('.cor-picker-wrap')?.querySelector('.cor-picker-preview');
    if (label) label.textContent = cor.toUpperCase();
    if (preview) preview.style.background = cor;
  }
  const wrap = document.getElementById('fundoPreviewWrap');
  if (wrap) wrap.style.background = cor;
}

async function aplicarFundoPersonalizado(cor) {
  const uid = firebase.auth().currentUser?.uid;
  if (!uid) return;
  document.documentElement.style.setProperty('--bg', cor);
  localStorage.setItem('customBg', cor);
  try {
    await window.db.collection('utilizadores').doc(uid).update({ 'preferencias.dashboard.customBg': cor });
  } catch(e) {
    toast('Erro ao guardar fundo: ' + (e.code || e.message));
    return;
  }
  renderAparencia();
  toast('Fundo aplicado');
}

async function resetFundoPersonalizado() {
  const uid = firebase.auth().currentUser?.uid;
  if (!uid) return;
  document.documentElement.style.removeProperty('--bg');
  localStorage.removeItem('customBg');
  try {
    await window.db.collection('utilizadores').doc(uid).update({ 'preferencias.dashboard.customBg': firebase.firestore.FieldValue.delete() });
  } catch(e) {
    toast('Erro ao repor fundo: ' + (e.code || e.message));
    return;
  }
  renderAparencia();
  toast('Fundo reposto');
}

async function definirTema(id) {
  const uid = firebase.auth().currentUser?.uid;
  if (!uid) return;
  if (id === 'default') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', id);
  try {
    await window.db.collection('utilizadores').doc(uid).update({ 'preferencias.dashboard.themePreset': id });
  } catch(e) { /* silently ignore */ }
  renderAparencia();
  toast('Tema aplicado');
}

function aplicarVarsAccent(cor) {
  const r = parseInt(cor.slice(1,3),16), g = parseInt(cor.slice(3,5),16), b = parseInt(cor.slice(5,7),16);
  document.documentElement.style.setProperty('--accent', cor);
  document.documentElement.style.setProperty('--blue', cor);
  document.documentElement.style.setProperty('--blue-bg', `rgba(${r},${g},${b},.10)`);
  document.documentElement.style.setProperty('--blue-border', `rgba(${r},${g},${b},.28)`);
  document.documentElement.style.setProperty('--sidebar-active-color', cor);
  document.documentElement.style.setProperty('--sidebar-active-bg', `rgba(${r},${g},${b},.18)`);
  document.documentElement.style.setProperty('--sidebar-active-icon-bg', `rgba(${r},${g},${b},.22)`);
}

function limparVarsAccent() {
  ['--accent','--blue','--blue-bg','--blue-border',
   '--sidebar-active-color','--sidebar-active-bg','--sidebar-active-icon-bg']
    .forEach(v => document.documentElement.style.removeProperty(v));
}

async function aplicarCorPersonalizada(cor) {
  const uid = firebase.auth().currentUser?.uid;
  if (!uid) return;
  aplicarVarsAccent(cor);
  localStorage.setItem('customAccent', cor);
  try {
    await window.db.collection('utilizadores').doc(uid).update({ 'preferencias.dashboard.customAccent': cor });
  } catch(e) {
    toast('Erro ao guardar cor: ' + (e.code || e.message));
    return;
  }
  renderAparencia();
  toast('Cor aplicada');
}

async function resetCorPersonalizada() {
  const uid = firebase.auth().currentUser?.uid;
  if (!uid) return;
  limparVarsAccent();
  localStorage.removeItem('customAccent');
  try {
    await window.db.collection('utilizadores').doc(uid).update({ 'preferencias.dashboard.customAccent': firebase.firestore.FieldValue.delete() });
  } catch(e) {
    toast('Erro ao repor cor: ' + (e.code || e.message));
    return;
  }
  renderAparencia();
  toast('Cor reposta');
}

function toggleModoEscuro() {
  if (window.toggleDarkMode) window.toggleDarkMode();
  renderAparencia();
}

function _defAvatarColor(str) {
  const palette = ['linear-gradient(135deg,#f472b6,#8b5cf6)','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4','#ef4444','#14b8a6','#0284c7'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

async function carregarUtilizadores() {
  const body = document.getElementById('utilizadoresBody');
  const subtitle = document.getElementById('utilizadoresSubtitle');
  if (!body) return;

  try {
    utilizadoresAll = await window.UsersService.listAll();
    const sorted = utilizadoresAll
      .slice()
      .sort((a, b) => (a.nomeCompleto || a.nome || '').localeCompare((b.nomeCompleto || b.nome || ''), 'pt-PT'));

    // Update hero sub
    const heroSub = document.getElementById('heroSub');
    if (heroSub) {
      const total = sorted.length;
      const admins = sorted.filter(u => u.role === 'admin').length;
      const escCount = escritoriosData.length || '—';
      heroSub.textContent = `${total} utilizador${total !== 1 ? 'es' : ''} · ${admins} admin${admins !== 1 ? 's' : ''} · ${escCount} escritório${escCount !== 1 ? 's' : ''}`;
    }
    if (subtitle) {
      const total = sorted.length;
      const admins = sorted.filter(u => u.role === 'admin').length;
      const pendentes = sorted.filter(u => u.ativo === false).length;
      subtitle.textContent = `${total} contas · ${admins} administrador${admins !== 1 ? 'es' : ''} · ${pendentes} inativo${pendentes !== 1 ? 's' : ''}`;
    }

    if (!sorted.length) {
      body.innerHTML = '<p style="font-size:12px;color:var(--muted);text-align:center;padding:20px 0;">Sem utilizadores.</p>';
      return;
    }

    const preview = sorted.slice(0, 6);
    body.innerHTML = `
      <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;">
        ${preview.map((u, i) => {
          const nome = u.nomeCompleto || u.nome || '';
          const email = u.email || '';
          const role = u.role || 'colaborador';
          const ativo = u.ativo !== false;
          const initials = nome
            ? nome.trim().split(/\s+/).slice(0,2).map(p => p[0]).join('').toUpperCase()
            : (email[0] || '?').toUpperCase();
          const bg = _defAvatarColor(nome || email);
          const isLast = i === preview.length - 1;
          return `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:${isLast ? 'none' : '1px solid var(--divider)'};">
              <span class="avatar sm" style="background:${bg};">${escHtml(initials)}</span>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(nome || email)}</div>
                <div style="font-size:11.5px;color:var(--muted);">${window.nomeEscritorio ? window.nomeEscritorio(u.escritorio) : (u.escritorio || '—')}</div>
              </div>
              ${role === 'admin'
                ? '<span class="pill pill-accent" style="flex-shrink:0;">Admin</span>'
                : `<span class="pill" style="flex-shrink:0;background:${ativo ? 'var(--green-bg)' : 'var(--surface2)'};color:${ativo ? 'var(--green)' : 'var(--muted)'};border-color:${ativo ? 'var(--green-border)' : 'var(--border)'};">${ativo ? 'Ativo' : 'Inativo'}</span>`}
            </div>`;
        }).join('')}
      </div>
      ${sorted.length > 6 ? `<p style="font-size:11.5px;color:var(--muted);margin-top:10px;text-align:center;">+ ${sorted.length - 6} mais. <a href="utilizadores.html" style="color:var(--accent);font-weight:600;">Ver todos →</a></p>` : ''}
      <div style="font-size:12px;color:var(--muted);background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin-top:14px;display:flex;gap:8px;align-items:center;">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:13px;height:13px;flex-shrink:0;"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5"/><circle cx="8" cy="11" r=".5" fill="currentColor"/></svg>
        Para criar, editar ou remover contas, abre a gestão completa.
      </div>`;
  } catch (e) {
    if (body) body.innerHTML = `<p style="font-size:12px;color:var(--red);text-align:center;padding:16px 0;">Erro: ${escHtml(e.message)}</p>`;
  }
}

async function carregarEscritorios() {
  const wrap = document.getElementById('escritoriosList');
  if (wrap) wrap.innerHTML = '<p style="font-size:12px;color:var(--muted);text-align:center;padding:20px 0;">A carregar…</p>';

  try {
    escritoriosData = await window.OfficesService.load({ includeInactive: true });
    utilizadoresAll = utilizadoresAll.length ? utilizadoresAll : await window.UsersService.listAll();
  } catch (e) {
    escritoriosData = window.OfficesService ? window.OfficesService.DEFAULT_OFFICES.slice() : [];
  }

  ordenarEscritorios();
  renderLista();

  // Refresh hero subtitle with office count
  const heroSub = document.getElementById('heroSub');
  if (heroSub && escritoriosData.length) {
    const total = utilizadoresAll.length;
    const admins = utilizadoresAll.filter(u => u.role === 'admin').length;
    heroSub.textContent = `${total} utilizador${total !== 1 ? 'es' : ''} · ${admins} admin${admins !== 1 ? 's' : ''} · ${escritoriosData.length} escritório${escritoriosData.length !== 1 ? 's' : ''}`;
  }
}

function renderLista() {
  const wrap = document.getElementById('escritoriosList');
  if (!wrap) return;

  if (!escritoriosData.length) {
    wrap.innerHTML = '<p style="font-size:11px;color:var(--muted);text-align:center;padding:20px 0;">Nenhum escritório configurado.</p>';
    return;
  }

  wrap.innerHTML = `
    <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;">
      ${escritoriosData.map((esc, i) => {
        const n = utilizadoresAll.filter(u => u.escritorio === esc.id).length;
        const isLast = i === escritoriosData.length - 1;
        return `
          <div style="display:grid;grid-template-columns:auto 1fr auto auto auto;gap:12px;align-items:center;padding:12px 16px;border-bottom:${isLast ? 'none' : '1px solid var(--divider)'};">
            <div style="width:34px;height:34px;border-radius:9px;background:${esc.cor || '#aaa'};display:grid;place-items:center;color:#fff;flex-shrink:0;">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:14px;height:14px;"><rect x="1" y="7" width="6" height="8" rx="1"/><rect x="9" y="4" width="6" height="11" rx="1"/><path d="M4 7V4a3 3 0 016 0v7"/></svg>
            </div>
            <div style="min-width:0;">
              <div style="font-size:13.5px;font-weight:600;">${escHtml(esc.nome)}</div>
              <div style="font-size:11.5px;color:var(--muted);">id: <span class="mono" style="font-size:11px;">${escHtml(esc.id)}</span> · ordem ${esc.ordem} · ${n} utilizador${n !== 1 ? 'es' : ''}</div>
            </div>
            <span class="pill ${esc.ativo !== false ? 'pill-green' : ''}">
              ${esc.ativo !== false
                ? '<span class="pill-dot" style="background:var(--green);"></span>Ativo'
                : 'Inativo'}
            </span>
            <button class="btn btn-secondary btn-sm" onclick='abrirEditar(${JSON.stringify(esc)})'>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:10px;height:10px;"><path d="M11 2.5l2 2L5 13H3v-2L11 2.5z"/></svg>
              Editar
            </button>
            ${!esc.default
              ? `<button class="btn btn-danger btn-sm" onclick="pedirApagar('${esc.id}','${escHtml(esc.nome)}',${n})">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:10px;height:10px;"><path d="M3 5h10l-1 9H4L3 5z"/><path d="M1 5h14M6 5V3h4v2"/></svg>
                </button>`
              : '<span style="font-size:10px;color:var(--muted);padding:0 6px;white-space:nowrap;">padrão</span>'}
          </div>`;
      }).join('')}
    </div>`;
}

function abrirModalNovo() {
  escEditandoId = null;
  document.getElementById('modalTitulo').textContent = 'Novo Escritorio';
  document.getElementById('escNome').value = '';
  document.getElementById('escId').value = '';
  document.getElementById('escId').readOnly = false;
  document.getElementById('escAtivo').checked = true;
  document.getElementById('escOrdem').value = escritoriosData.length
    ? Math.max(...escritoriosData.map(e => e.ordem || 0)) + 10
    : 10;
  corSel = CORES[0];
  renderColorSwatches();
  document.getElementById('modalEscritorio').classList.add('open');
  setTimeout(() => document.getElementById('escNome').focus(), 80);
}

function abrirEditar(esc) {
  escEditandoId = esc.id;
  document.getElementById('modalTitulo').textContent = 'Editar Escritorio';
  document.getElementById('escNome').value = esc.nome;
  document.getElementById('escId').value = esc.id;
  document.getElementById('escId').readOnly = true;
  document.getElementById('escAtivo').checked = esc.ativo !== false;
  document.getElementById('escOrdem').value = esc.ordem || 10;
  corSel = esc.cor || CORES[0];
  renderColorSwatches();
  document.getElementById('modalEscritorio').classList.add('open');
  setTimeout(() => document.getElementById('escNome').focus(), 80);
}

async function guardarEscritorio() {
  const nome = document.getElementById('escNome').value.trim();
  const id = document.getElementById('escId').value.trim().toLowerCase();
  const ativo = document.getElementById('escAtivo').checked;
  const ordem = parseInt(document.getElementById('escOrdem').value, 10);

  if (!nome) { toast('Introduz o nome do escritorio.'); return; }
  if (!id || !/^[a-z0-9]+$/.test(id)) { toast('O ID so pode ter letras minusculas e numeros, sem espacos.'); return; }
  if (!Number.isFinite(ordem)) { toast('Define uma ordem numerica valida.'); return; }

  const btn = document.getElementById('btnGuardar');
  btn.disabled = true;
  btn.textContent = 'A guardar...';

  try {
    if (!escEditandoId && escritoriosData.find(e => e.id === id)) {
      toast('Ja existe um escritorio com esse ID.');
      btn.disabled = false;
      btn.textContent = 'Guardar';
      return;
    }

    escritoriosData = await window.OfficesService.upsert({
      id: escEditandoId || id,
      nome,
      cor: corSel,
      ativo,
      ordem,
      default: escritoriosData.find(e => e.id === (escEditandoId || id) && e.default === true) ? true : false,
    });
    fecharModal();
    renderLista();
  } catch (e) {
    toast('Erro ao guardar: ' + e.message);
  }

  btn.disabled = false;
  btn.textContent = 'Guardar';
}

function pedirApagar(id, nome, nUsers) {
  escApagarId = id;
  let msg = `Tens a certeza que queres apagar o escritorio <b>${nome}</b>?`;
  if (nUsers > 0) {
    msg += `<br><br><span style="color:#dc2626;">Tem <b>${nUsers} utilizador(es)</b> associado(s). O campo escritorio deles ficara vazio.</span>`;
  }
  document.getElementById('confirmarTexto').innerHTML = msg;
  document.getElementById('modalConfirmar').classList.add('open');
}

async function confirmarApagar() {
  if (!escApagarId) return;
  const btn = document.getElementById('btnConfirmar');
  btn.disabled = true;

  try {
    escritoriosData = await window.OfficesService.remove(escApagarId);
    utilizadoresAll = await window.UsersService.listAll();
    fecharModal();
    renderLista();
  } catch (e) {
    toast('Erro ao apagar: ' + e.message);
  }

  btn.disabled = false;
  escApagarId = null;
}

function renderColorSwatches() {
  document.getElementById('colorSwatches').innerHTML = CORES.map(c => `
    <div class="swatch ${c === corSel ? 'selected' : ''}" style="background:${c};" onclick="selecionarCor('${c}')"></div>
  `).join('');
}

function selecionarCor(c) {
  corSel = c;
  renderColorSwatches();
}

function fecharModal() {
  // Fechar modais de escritórios
  ['modalEscritorio','modalConfirmar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  });
  escEditandoId = null;
}

function fecharTodosModais() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  escEditandoId = null;
  defFecharModalPerfil();
  defFecharConfirmPerfil();
}

// ══════════════════════════════════════════════════════════════════
// PAINEL PERFIS DE PERMISSÃO
// ══════════════════════════════════════════════════════════════════

const DEF_ALL_ACTIONS = [
  { key: 'view',   label: 'Ver' },
  { key: 'create', label: 'Criar' },
  { key: 'gerir',  label: 'Gerir' },
];
const DEF_GERIR_KEYS = ['resolve', 'edit', 'manage'];

let _defEditingPerfilId = null;
let _defDraft = {};
let _defPendingDeletePerfilId = null;
let _defPerfisCache = [];

function _defGetModuleActions() {
  return window.PerfisService ? window.PerfisService.getModuleActions() : [];
}

function _defGerirKeyFor(mod) {
  return mod.actions.find(a => DEF_GERIR_KEYS.includes(a.key));
}

function _defDraftGet(draft, moduleId, actionKey) {
  return !!(draft[moduleId] && draft[moduleId][actionKey]);
}

function _defModTagsHtml(perfil) {
  const mods = (perfil.permissoes && perfil.permissoes.modules) || {};
  return _defGetModuleActions()
    .filter(m => { const mp = mods[m.id] || {}; return mp.view !== false; })
    .map(m => {
      const mp = mods[m.id] || {};
      const hasManage = m.actions.filter(a => a.key !== 'view').some(a => !!mp[a.key]);
      return `<span class="def-mod-tag${hasManage ? ' has-manage' : ''}">${escHtml(m.label)}</span>`;
    }).join('');
}

async function defCarregarPerfis() {
  const grid = document.getElementById('defPerfisGrid');
  const subtitle = document.getElementById('perfisSubtitle');
  if (!grid) return;

  grid.innerHTML = '<p style="font-size:11px;color:var(--muted);text-align:center;padding:20px 0;">A carregar…</p>';
  try {
    if (!window.PerfisService) throw new Error('PerfisService não disponível');
    _defPerfisCache = await window.PerfisService.loadPerfis();
    defRenderPerfisGrid(_defPerfisCache);
    if (subtitle) subtitle.textContent = `${_defPerfisCache.length} perfil${_defPerfisCache.length !== 1 ? 'is' : ''} configurado${_defPerfisCache.length !== 1 ? 's' : ''}`;
  } catch (e) {
    grid.innerHTML = `<p style="font-size:11px;color:var(--red);text-align:center;padding:16px 0;">Erro ao carregar perfis: ${escHtml(e.message)}</p>`;
  }
}

function defRenderPerfisGrid(perfis) {
  const grid = document.getElementById('defPerfisGrid');
  if (!grid) return;

  if (!perfis.length) {
    grid.innerHTML = `
      <div class="def-perfil-card card-novo-def" onclick="defAbrirNovoPerfil()" style="border-style:dashed;display:flex;align-items:center;justify-content:center;min-height:96px;cursor:pointer;color:var(--muted);font-size:11px;gap:6px;border:1px dashed var(--border);border-radius:12px;">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M8 2v12M2 8h12"/></svg>
        Criar primeiro perfil
      </div>`;
    return;
  }

  grid.innerHTML = `
    <div class="def-perfis-grid-inner">
      ${perfis.map(p => `
        <div class="def-perfil-card">
          <div class="def-perfil-card-head">
            <span class="def-perfil-nome">${escHtml(p.nome)}</span>
          </div>
          <div class="def-perfil-modulos">${_defModTagsHtml(p)}</div>
          <div class="def-perfil-actions">
            <button class="btn btn-secondary btn-sm" onclick="defAbrirModalPerfil('${escHtml(p.id)}')">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:10px;height:10px;"><path d="M11 2.5l2 2L5 13H3v-2L11 2.5z"/></svg>
              Editar
            </button>
            <button class="btn btn-danger btn-sm" onclick="defConfirmarApagarPerfil('${escHtml(p.id)}','${escHtml(p.nome)}')">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:10px;height:10px;"><path d="M3 5h10l-1 9H4L3 5z"/><path d="M1 5h14M6 5V3h4v2"/></svg>
            </button>
          </div>
        </div>`).join('')}
      <div class="def-perfil-card card-novo-def" onclick="defAbrirNovoPerfil()" style="border-style:dashed;display:flex;align-items:center;justify-content:center;min-height:96px;cursor:pointer;color:var(--muted);font-size:11px;gap:6px;">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><path d="M8 2v12M2 8h12"/></svg>
        Novo perfil
      </div>
    </div>`;
}

function defAbrirNovoPerfil() {
  defAbrirModalPerfil(null);
}

function defAbrirModalPerfil(perfilId) {
  _defEditingPerfilId = perfilId;
  _defDraft = {};
  const titleEl = document.getElementById('defModalPerfilTitle');
  const nomeEl  = document.getElementById('defPerfilNome');
  if (titleEl) titleEl.textContent = perfilId ? 'Editar Perfil' : 'Novo Perfil';

  if (perfilId) {
    const perfil = _defPerfisCache.find(p => p.id === perfilId);
    if (perfil && nomeEl) nomeEl.value = perfil.nome;
    const mods = (perfil && perfil.permissoes && perfil.permissoes.modules) || {};
    _defGetModuleActions().forEach(m => {
      _defDraft[m.id] = {};
      m.actions.forEach(a => { _defDraft[m.id][a.key] = !!(mods[m.id] && mods[m.id][a.key]); });
    });
  } else {
    if (nomeEl) nomeEl.value = '';
    _defGetModuleActions().forEach(m => {
      _defDraft[m.id] = { view: true };
      m.actions.forEach(a => { if (a.key !== 'view') _defDraft[m.id][a.key] = false; });
    });
  }

  defRenderPerfilMatrix();
  const modal = document.getElementById('modalPerfilDef');
  if (modal) { modal.classList.add('open'); setTimeout(() => nomeEl && nomeEl.focus(), 80); }
}

function defFecharModalPerfil() {
  const modal = document.getElementById('modalPerfilDef');
  if (modal) modal.classList.remove('open');
  _defEditingPerfilId = null;
  _defDraft = {};
}

function defRenderPerfilMatrix() {
  const container = document.getElementById('defPermMatrix');
  if (!container) return;
  const mods = _defGetModuleActions();

  let html = `
    <div class="matrix-row header">
      <div class="matrix-cell header-cell">Módulo</div>
      ${DEF_ALL_ACTIONS.map(a => `<div class="matrix-cell header-cell">${a.label}</div>`).join('')}
    </div>`;

  mods.forEach(mod => {
    const viewOn = _defDraftGet(_defDraft, mod.id, 'view');
    const gerirAction = _defGerirKeyFor(mod);

    html += `<div class="matrix-row${viewOn ? '' : ' disabled-row'}" id="defmatrow_${mod.id}">`;
    html += `<div class="matrix-cell mod-name">${escHtml(mod.label)}</div>`;

    const hasView = mod.actions.some(a => a.key === 'view');
    html += `<div class="matrix-cell matrix-check">${hasView
      ? `<input type="checkbox" data-mod="${mod.id}" data-action="view" ${viewOn ? 'checked' : ''}>`
      : `<span class="empty">—</span>`}</div>`;

    const hasCreate = mod.actions.some(a => a.key === 'create');
    html += `<div class="matrix-cell matrix-check">${hasCreate
      ? `<input type="checkbox" data-mod="${mod.id}" data-action="create" ${_defDraftGet(_defDraft, mod.id, 'create') ? 'checked' : ''} ${!viewOn ? 'disabled' : ''}>`
      : `<span class="empty">—</span>`}</div>`;

    html += `<div class="matrix-cell matrix-check">${gerirAction
      ? `<input type="checkbox" data-mod="${mod.id}" data-action="${gerirAction.key}" ${_defDraftGet(_defDraft, mod.id, gerirAction.key) ? 'checked' : ''} ${!viewOn ? 'disabled' : ''}>`
      : `<span class="empty">—</span>`}</div>`;
    html += `</div>`;
  });

  container.innerHTML = html;

  container.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const mod = cb.getAttribute('data-mod');
      const action = cb.getAttribute('data-action');
      _defDraft[mod] = _defDraft[mod] || {};
      _defDraft[mod][action] = cb.checked;
      if (action === 'view') {
        const row = document.getElementById('defmatrow_' + mod);
        if (row) row.classList.toggle('disabled-row', !cb.checked);
        container.querySelectorAll(`input[data-mod="${mod}"]:not([data-action="view"])`).forEach(other => {
          other.disabled = !cb.checked;
          if (!cb.checked) { other.checked = false; _defDraft[mod][other.getAttribute('data-action')] = false; }
        });
      }
    });
  });
}

async function defGuardarPerfil() {
  const nome = (document.getElementById('defPerfilNome').value || '').trim();
  if (!nome) { toast('Nome do perfil é obrigatório.'); return; }

  const btn = document.getElementById('defBtnGuardarPerfil');
  if (btn) { btn.disabled = true; btn.textContent = 'A guardar…'; }

  const modules = {};
  _defGetModuleActions().forEach(mod => {
    modules[mod.id] = {};
    mod.actions.forEach(a => { modules[mod.id][a.key] = !!(_defDraft[mod.id] && _defDraft[mod.id][a.key]); });
  });

  const id = _defEditingPerfilId || nome.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  try {
    await window.PerfisService.upsertPerfil({ id, nome, permissoes: { modules } });
    defFecharModalPerfil();
    window.PerfisService.invalidateCache();
    _defPerfisCache = await window.PerfisService.loadPerfis();
    defRenderPerfisGrid(_defPerfisCache);
    const subtitle = document.getElementById('perfisSubtitle');
    if (subtitle) subtitle.textContent = `${_defPerfisCache.length} perfil${_defPerfisCache.length !== 1 ? 'is' : ''} configurado${_defPerfisCache.length !== 1 ? 's' : ''}`;
    toast('Perfil guardado.');
  } catch (err) {
    toast('Erro ao guardar perfil: ' + (err.message || err));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
  }
}

function defConfirmarApagarPerfil(perfilId, perfilNome) {
  _defPendingDeletePerfilId = perfilId;
  const texto = document.getElementById('defConfirmPerfilTexto');
  if (texto) texto.innerHTML = `Vais apagar o perfil <b>"${escHtml(perfilNome)}"</b>. Os utilizadores com este perfil atribuído perderão as permissões associadas. Esta ação não pode ser desfeita.`;
  const modal = document.getElementById('modalConfirmPerfilDef');
  if (modal) modal.classList.add('open');
}

function defFecharConfirmPerfil() {
  const modal = document.getElementById('modalConfirmPerfilDef');
  if (modal) modal.classList.remove('open');
  _defPendingDeletePerfilId = null;
}

async function defExecutarApagarPerfil() {
  if (!_defPendingDeletePerfilId) return;
  const btn = document.getElementById('defBtnConfirmApagarPerfil');
  if (btn) btn.disabled = true;
  try {
    await window.PerfisService.deletePerfil(_defPendingDeletePerfilId);
    defFecharConfirmPerfil();
    window.PerfisService.invalidateCache();
    _defPerfisCache = await window.PerfisService.loadPerfis();
    defRenderPerfisGrid(_defPerfisCache);
    const subtitle = document.getElementById('perfisSubtitle');
    if (subtitle) subtitle.textContent = `${_defPerfisCache.length} perfil${_defPerfisCache.length !== 1 ? 'is' : ''} configurado${_defPerfisCache.length !== 1 ? 's' : ''}`;
    toast('Perfil apagado.');
  } catch (err) {
    toast('Erro ao apagar perfil: ' + (err.message || err));
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ══════════════════════════════════════════════════════════════════
// PAINEL AUDITORIA
// ══════════════════════════════════════════════════════════════════

const DEF_AUD_PAGE_SIZE = 30;
let _defAudAll = [];
let _defAudFiltered = [];
let _defAudLastDoc = null;
let _defAudLoading = false;

async function defCarregarAuditoria(mais = false) {
  if (_defAudLoading) return;
  _defAudLoading = true;

  const timeline = document.getElementById('defTimeline');
  const loadMore = document.getElementById('defLoadMoreWrap');
  if (!mais && timeline) timeline.innerHTML = '<p style="font-size:11px;color:var(--muted);text-align:center;padding:20px 0;">A carregar…</p>';

  try {
    const db = firebase.firestore();
    let q = db.collection('auditoria').orderBy('ts', 'desc').limit(DEF_AUD_PAGE_SIZE);
    if (mais && _defAudLastDoc) q = q.startAfter(_defAudLastDoc);

    const snap = await q.get();
    if (!snap.empty) {
      _defAudLastDoc = snap.docs[snap.docs.length - 1];
      const novos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _defAudAll = mais ? [..._defAudAll, ...novos] : novos;
    }

    if (loadMore) loadMore.style.display = snap.size === DEF_AUD_PAGE_SIZE ? 'block' : 'none';
  } catch (e) {
    if (timeline && !mais) timeline.innerHTML = `<p style="font-size:11px;color:var(--red);text-align:center;padding:16px 0;">Erro: ${escHtml(e.message)}</p>`;
  } finally {
    _defAudLoading = false;
  }

  defAplicarFiltros();
}

function defAplicarFiltros() {
  const modulo  = (document.getElementById('defFiltroModulo')?.value  || '').toLowerCase();
  const acao    = (document.getElementById('defFiltroAcao')?.value    || '').toLowerCase();
  const texto   = (document.getElementById('defFiltroTexto')?.value   || '').toLowerCase();

  _defAudFiltered = _defAudAll.filter(r => {
    if (modulo && (r.modulo || '').toLowerCase() !== modulo) return false;
    if (acao   && (r.acao   || '').toLowerCase() !== acao)   return false;
    if (texto  && !(
      (r.titulo || '').toLowerCase().includes(texto) ||
      (r.utilizador || r.autor || '').toLowerCase().includes(texto)
    )) return false;
    return true;
  });

  defRenderStats();
  defRenderTimeline();
}

function defLimparFiltros() {
  ['defFiltroModulo','defFiltroAcao','defFiltroTexto'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  defAplicarFiltros();
}

function defRenderStats() {
  const el = document.getElementById('defStatsAuditoria');
  if (!el) return;
  const total = _defAudFiltered.length;
  const criados   = _defAudFiltered.filter(r => (r.acao||'').toLowerCase() === 'criado').length;
  const atualizados = _defAudFiltered.filter(r => (r.acao||'').toLowerCase() === 'atualizado').length;
  el.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      <span class="def-stat-pill"><strong>${total}</strong> registos</span>
      ${criados    ? `<span class="def-stat-pill" style="color:var(--green);"><strong>${criados}</strong> criados</span>` : ''}
      ${atualizados? `<span class="def-stat-pill" style="color:var(--amber);"><strong>${atualizados}</strong> atualizados</span>` : ''}
    </div>`;
}

function defRenderTimeline() {
  const container = document.getElementById('defTimeline');
  if (!container) return;

  if (!_defAudFiltered.length) {
    container.innerHTML = '<p style="font-size:11px;color:var(--muted);text-align:center;padding:20px 0;">Sem registos para os filtros aplicados.</p>';
    return;
  }

  // Agrupar por data
  const grupos = {};
  _defAudFiltered.forEach(r => {
    const ts = r.ts?.toDate ? r.ts.toDate() : (r.ts ? new Date(r.ts) : new Date());
    const dateKey = ts.toLocaleDateString('pt-PT', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    if (!grupos[dateKey]) grupos[dateKey] = [];
    grupos[dateKey].push({ ...r, _date: ts });
  });

  const acaoCores = { criado:'var(--green)', eliminado:'var(--red)', estado:'var(--blue)', permissao:'var(--purple)', atualizado:'var(--amber)' };

  container.innerHTML = Object.entries(grupos).map(([date, entries]) => `
    <div class="def-tl-group">
      <div class="def-tl-date">${date}</div>
      ${entries.map(r => {
        const ts = r._date;
        const hora = ts.toLocaleTimeString('pt-PT', { hour:'2-digit', minute:'2-digit' });
        const acao = (r.acao || 'atualizado').toLowerCase();
        const cor  = acaoCores[acao] || 'var(--muted)';
        const modulo = r.modulo || '';
        const titulo = r.titulo || r.descricao || '—';
        const autor  = r.utilizador || r.autor || '';
        return `
          <div class="def-tl-entry" onclick="this.classList.toggle('expanded')">
            <div class="def-tl-dot" style="background:${cor};"></div>
            <div class="def-tl-content">
              <div class="def-tl-top">
                ${modulo ? `<span class="def-tl-mod">${escHtml(modulo)}</span>` : ''}
                <span class="def-tl-acao" style="color:${cor};">${escHtml(acao)}</span>
                <span class="def-tl-titulo">${escHtml(titulo)}</span>
                <span class="def-tl-hora">${hora}</span>
              </div>
              ${autor ? `<div class="def-tl-user">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:10px;height:10px;"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3 2-5 6-5s6 2 6 5"/></svg>
                ${escHtml(autor)}
              </div>` : ''}
              ${r.dados && Object.keys(r.dados).length ? `
                <div class="def-tl-diff">
                  <table class="def-diff-table">
                    <thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead>
                    <tbody>
                      ${Object.entries(r.dados).map(([k,v]) => `
                        <tr>
                          <td class="diff-campo">${escHtml(k)}</td>
                          <td class="diff-antes">${v && v.antes !== undefined ? escHtml(String(v.antes)) : '<span class="diff-empty">—</span>'}</td>
                          <td class="diff-depois">${v && v.depois !== undefined ? escHtml(String(v.depois)) : '<span class="diff-empty">—</span>'}</td>
                        </tr>`).join('')}
                    </tbody>
                  </table>
                </div>` : ''}
            </div>
          </div>`;
      }).join('')}
    </div>`).join('');
}

function defCarregarMaisAuditoria() {
  defCarregarAuditoria(true);
}

// ══════════════════════════════════════════════════════════════════
// PAINEL CALENDÁRIO
// ══════════════════════════════════════════════════════════════════

async function defCarregarCalendario() {
  const body = document.getElementById('defCalendarioBody');
  if (!body) return;

  body.innerHTML = '<p style="font-size:11px;color:var(--muted);text-align:center;padding:16px 0;">A carregar…</p>';

  let stats = '';
  try {
    const db = firebase.firestore();
    const snap = await db.collection('calendarios').get();
    const count = snap.size;
    const escritorios = [...new Set(snap.docs.map(d => d.data().escritorio).filter(Boolean))];
    stats = `<span class="def-stat-pill"><strong>${count}</strong> calendário${count !== 1 ? 's' : ''} publicado${count !== 1 ? 's' : ''}</span>`;
    if (escritorios.length) stats += `<span class="def-stat-pill"><strong>${escritorios.length}</strong> escritório${escritorios.length !== 1 ? 's' : ''} com dados</span>`;
  } catch (_) {}

  body.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;">
      ${stats}
    </div>
    <div class="def-info-note-v2" style="margin-bottom:18px;">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:14px;height:14px;flex-shrink:0;"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5"/><circle cx="8" cy="11" r=".5" fill="currentColor"/></svg>
      <span>A gestão de calendários envolve publicação de feriados, eventos personalizados e remoção por múltiplos escritórios. Toda a configuração avançada está disponível na página dedicada.</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
      <a href="gerir-calendarios.html" class="def-cal-action-card">
        <div style="width:34px;height:34px;border-radius:9px;background:var(--purple-bg);display:grid;place-items:center;color:var(--purple);flex-shrink:0;">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:16px;height:16px;"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1v3M11 1v3M2 7h12"/><circle cx="8" cy="11" r="1.5" fill="currentColor" stroke="none"/></svg>
        </div>
        <div>
          <div style="font-size:12px;font-weight:600;">Publicar Feriados</div>
          <div style="font-size:10px;color:var(--muted);">Feriados nacionais por período</div>
        </div>
      </a>
      <a href="gerir-calendarios.html#tab-eventos" class="def-cal-action-card">
        <div style="width:34px;height:34px;border-radius:9px;background:var(--blue-bg);display:grid;place-items:center;color:var(--accent);flex-shrink:0;">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:16px;height:16px;"><path d="M3 4h10M3 8h7M3 12h5"/><path d="M13 10l-2 2 1 3 2-1 1-3-2-1z"/></svg>
        </div>
        <div>
          <div style="font-size:12px;font-weight:600;">Publicar Eventos</div>
          <div style="font-size:10px;color:var(--muted);">Eventos em múltiplos escritórios</div>
        </div>
      </a>
      <a href="gerir-calendarios.html#tab-apagar" class="def-cal-action-card">
        <div style="width:34px;height:34px;border-radius:9px;background:var(--red-bg);display:grid;place-items:center;color:var(--red);flex-shrink:0;">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:16px;height:16px;"><path d="M3 5h10l-1 9H4L3 5z"/><path d="M1 5h14M6 5V3h4v2"/></svg>
        </div>
        <div>
          <div style="font-size:12px;font-weight:600;">Apagar Eventos</div>
          <div style="font-size:10px;color:var(--muted);">Remover eventos por período</div>
        </div>
      </a>
      <a href="gerir-calendarios.html#tab-ver" class="def-cal-action-card">
        <div style="width:34px;height:34px;border-radius:9px;background:var(--green-bg);display:grid;place-items:center;color:var(--green);flex-shrink:0;">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:16px;height:16px;"><circle cx="7" cy="7" r="4"/><path d="M11 11l3 3"/></svg>
        </div>
        <div>
          <div style="font-size:12px;font-weight:600;">Ver / Pesquisar</div>
          <div style="font-size:10px;color:var(--muted);">Consultar eventos existentes</div>
        </div>
      </a>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════
// PAINEL SEED
// ══════════════════════════════════════════════════════════════════

function defCarregarSeed() {
  // O painel já tem conteúdo estático no HTML, nada a fazer
}

// ══════════════════════════════════════════════════════════════════
// INFO DO SISTEMA
// ══════════════════════════════════════════════════════════════════

async function abrirInfoSistema() {
  const modal = document.getElementById('modalInfoSistema');
  const body  = document.getElementById('infoSistemaBody');
  if (!modal || !body) return;

  modal.classList.add('open');
  body.innerHTML = '<p style="font-size:11px;color:var(--muted);text-align:center;padding:16px 0;">A carregar…</p>';

  // Recolher dados
  let totalUsers = utilizadoresAll.length;
  let totalEscs  = escritoriosData.length;
  let totalPerfis = _defPerfisCache.length;
  let totalAuditoria = '—';
  let buildTs = '—';

  try {
    // Se ainda não carregámos users/escritorios, fazer fetch agora
    if (!totalUsers) {
      const u = await window.UsersService.listAll();
      totalUsers = u.length;
    }
    if (!totalEscs) {
      const e = await window.OfficesService.load({ includeInactive: true });
      totalEscs = e.length;
    }
    if (!totalPerfis && window.PerfisService) {
      const p = await window.PerfisService.loadPerfis();
      totalPerfis = p.length;
    }
    // Contar registos de auditoria (estimativa via query limitada)
    const db = firebase.firestore();
    const audSnap = await db.collection('auditoria').limit(1).get();
    totalAuditoria = audSnap.empty ? '0' : '≥ 1';
  } catch (_) {}

  // Data/hora atual como proxy de "última sincronização"
  const agora = new Date().toLocaleString('pt-PT', { dateStyle:'short', timeStyle:'short' });

  const item = (label, value, mono = false) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--divider);">
      <span style="font-size:11.5px;color:var(--muted);">${label}</span>
      <span style="font-size:12px;font-weight:600;${mono ? 'font-family:monospace;font-size:11px;' : ''}">${value}</span>
    </div>`;

  body.innerHTML = `
    <!-- Projeto Firebase -->
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:8px;">Infraestrutura</div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:0 14px;margin-bottom:18px;">
      ${item('Projeto Firebase', 'hub-algartempo', true)}
      ${item('Base de dados', 'Cloud Firestore (Europa)', false)}
      ${item('Autenticação', 'Firebase Auth — Email/Password', false)}
      ${item('Storage', 'Firebase Storage', false)}
    </div>

    <!-- Estatísticas globais -->
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:8px;">Estatísticas globais</div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:0 14px;margin-bottom:18px;">
      ${item('Total de utilizadores', totalUsers)}
      ${item('Escritórios configurados', totalEscs)}
      ${item('Perfis de permissão', totalPerfis)}
      ${item('Registos de auditoria', totalAuditoria)}
    </div>

    <!-- Plataforma -->
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:8px;">Plataforma</div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:0 14px;margin-bottom:6px;">
      ${item('Aplicação', 'Algartempo Hub')}
      ${item('Stack', 'HTML · CSS · JS Vanilla + Firebase 9')}
      ${item('Sincronizado em', agora)}
    </div>`;
}
