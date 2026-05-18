# CLAUDE.md — Algartempo

## O que é esta app

**Algartempo** é um sistema interno de gestão multi-escritório para RH e operações. Construído em HTML/CSS/JavaScript vanilla com Firebase (Auth + Firestore + Storage).

### Módulos principais

| Módulo | Grupo | Ordem | Cross-office | Notas |
|---|---|---|---|---|
| Tarefas | main | 10 | — | Por escritório |
| Comunicados | main | 20 | — | Por destino |
| Chat | main | 25 | ✓ | Mensagens diretas e grupos |
| Calendário | main | 30 | — | Carga de trabalho por mês |
| Admissões | main | 40 | — | Com anexos e modo gestor |
| Reclamações | main | 50 | — | Com exportação e anexos |
| Escalas | main | 60 | — | Sub-coleção Firestore por escritório |
| Clientes | main | 65 | ✓ | Gestão de clientes |
| Férias | main | 67 | — | Gestão de marcação de férias |
| Visitas | main | 68 | — | Registo de visitas |
| Despesas | main | 69 | — | Gestão de despesas |
| Definições | admin | 100 | — | Gestão de escritórios e seed |
| Utilizadores | admin | 110 | — | Contas, roles, permissões |
| Perfis | admin | 115 | — | Perfis de permissão reutilizáveis |
| Gerir Calendários | admin | 120 | — | Publicação de calendários |
| Auditoria | admin | 130 | — | Histórico de alterações |

---

## Arquitetura

### Duas entidades nucleares

**Utilizadores** + **Escritórios** — tudo encaixa nesta lógica:
- Autenticação → Firebase Authentication (email/password)
- Sessão → Firestore `utilizadores/{uid}`
- Escopo → Escritório ativo do utilizador
- Permissões → Definidas por role + permissões granulares (denormalizadas no documento do utilizador)

### Services comuns (base da app)

| Ficheiro | Função |
|---|---|
| `js/firebase-init.js` | Inicialização do Firebase (expõe `window.firebaseAuth`, `window.firebaseDb`) |
| `js/utils.js` | Utilitários partilhados (datas, UI, strings, `window.escHtml`, `window.toast`) |
| `js/auth.js` | Autenticação, sessão, helpers de permissão + mapa de permissões legacy |
| `js/auditoria.js` | Registo de alterações no Firestore (`window.registarAuditoria`) |
| `js/users-service.js` | Serviço de utilizadores (CRUD, listeners, permissões) |
| `js/offices-service.js` | Serviço de escritórios (CRUD, ordenação, cleanup) |
| `js/config-escritorios.js` | Cache e helpers de escritório activo |
| `js/module-registry.js` | Registry central dos módulos (navegação, ordem, visibilidade, `canAccess`) |
| `js/app-platform.js` | Bootstrap, sidebar, topbar, menu mobile e listeners de plataforma |
| `js/dashboard-customizer.js` | Gestão de temas de cor e personalização do dashboard |

### Services de domínio

| Ficheiro | Módulo |
|---|---|
| `js/tasks-service.js` | Tarefas |
| `js/comunicados-service.js` | Comunicados |
| `js/chat-service.js` | Chat (`window.ChatService`) |
| `js/perfis-service.js` | Perfis (`window.PerfisService`) — inclui `MODULE_ACTIONS` |
| `js/admissoes-service.js` | Admissões |
| `js/calendario-service.js` | Calendário |
| `js/reclamacoes-service.js` | Reclamações |
| `js/clientes-service.js` | Clientes |
| `js/ferias-service.js` | Férias |
| `js/visitas-service.js` | Visitas |
| `js/despesas-service.js` | Despesas |

Novos módulos devem criar um service análogo se tiverem dados próprios.

---

## Como criar um módulo novo

### 1. Criar os ficheiros

- `[modulo].html`
- `js/[modulo].js`
- `css/[modulo].css`
- `js/[modulo]-service.js` (se tiver dados Firestore)

### 2. Registar em `js/module-registry.js`

```js
{
  id: 'frota',
  label: 'Frota',
  href: 'frota.html',
  group: 'main',          // 'main' ou 'admin'
  order: 70,
  adminOnly: false,
  requiredPermissions: ['modules.frota.view'],
  usesEscritorio: true,   // false para módulos cross-office
}
```

### 3. HTML da página (ordem de carregamento importa)

```html
<!-- Firebase -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>

<!-- Base comum -->
<script src="js/firebase-init.js"></script>
<script src="js/utils.js"></script>
<script src="js/module-registry.js"></script>
<script src="js/auth.js"></script>
<script src="js/offices-service.js"></script>
<script src="js/config-escritorios.js"></script>
<script src="js/app-platform.js"></script>

<!-- Opcional: carregar depois de auth.js -->
<script src="js/auditoria.js"></script>
<script src="js/users-service.js"></script>

<!-- Módulo -->
<script src="js/frota.js"></script>
```

### 4. Bootstrap da página

```js
window.bootProtectedPage({
  activePage: 'frota',
  moduleId: 'frota',
}, ({ profile, isAdmin, escritorio }) => {
  // inicialização
});

// Para páginas administrativas (requireAdmin: true redireciona não-admins)
window.bootProtectedPage({
  activePage: 'utilizadores',
  moduleId: 'utilizadores',
  requireAdmin: true,
}, ({ profile }) => {
  // só admins chegam aqui
});
```

### 5. CSS do módulo

Duas estratégias existentes:

**Base partilhada** (`styles.css` como base) — tarefas, admissoes, reclamacoes, utilizadores, auditoria, perfis, chat:
```html
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="css/frota.css">
```

**CSS standalone** (tem `:root` e `[data-theme]` próprios) — comunicados, calendario, gerir-calendarios, escalas, definicoes:
```css
/* frota.css */
:root { --accent: #0284c7; ... }
[data-theme="forest"] { --accent: #0f766e; ... }
```

### 6. Integrar permissões no `perfis-service.js`

Adicionar o módulo a `MODULE_ACTIONS` em `js/perfis-service.js` para que apareça nos perfis configuráveis.

### 7. Partir dos templates

- `templates/module-template.html`
- `templates/module-template.js`
- `templates/module-template.css`

---

## APIs globais disponíveis

| API | Função |
|---|---|
| `window.userProfile` | Objeto do utilizador autenticado |
| `window.currentUser` | Objeto Firebase Auth |
| `window.isAdmin()` | Verifica se é admin |
| `window.temPermissao(p)` | Verifica permissão do utilizador atual |
| `window.temPermissaoNoPerfil(profile, p)` | Verifica permissão num perfil arbitrário |
| `window.escritorioAtivo()` | ID do escritório activo |
| `window.loadEscritorios()` | Lista de escritórios (Promise) |
| `window.getEscritoriosSync()` | Lista de escritórios (síncrono, da cache) |
| `window.nomeEscritorio(id)` | Nome legível do escritório |
| `window.renderNavbar(page)` | Re-renderiza sidebar + topbar |
| `window.registarAuditoria({acao, dados})` | Grava entrada de auditoria |
| `window.PerfisService` | API de perfis de permissão |
| `window.ChatService` | API de chat (conversas e mensagens) |
| `firebase.firestore()` | Referência Firestore — usar diretamente, **`window.db` não existe** |

> `firebase-init.js` expõe `window.firebaseAuth` e `window.firebaseDb` mas a convenção nos services é usar `firebase.firestore()` diretamente.

---

## Sistema de permissões

### Arquitetura

Permissões escritas diretamente em `utilizadores/{uid}.permissoes` (denormalizadas). As Firestore Rules lêem via `map.get()` dinâmico — escalável para qualquer módulo novo sem alterar as rules.

Quando um perfil é aplicado a um utilizador, as permissões são propagadas automaticamente.

### Permissões canónicas (novos módulos)

Padrão: `modules.<modulo>.<acao>`

| Ação | Descrição |
|---|---|
| `view` | Ver o módulo (se `false`, não aparece na navegação) |
| `create` | Criar novos registos |
| `resolve` | Gerir/fechar registos existentes |
| `edit` | Editar conteúdo |
| `manage` | Criar, editar e apagar |

### Permissões legacy (ainda em uso via `LEGACY_PERMISSION_MAP` em `auth.js`)

`criarTarefas`, `resolverTarefas`, `gerirComunicados`, `criarAdmissoes`, `resolverAdmissoes`, `editarCalendario`, `criarReclamacoes`

---

## Estrutura Firestore

| Coleção | Notas |
|---|---|
| `utilizadores/{uid}` | Perfil, permissões, escritório — fonte de verdade das rules |
| `config/escritorios` | `{ lista: [...] }` — lista de escritórios |
| `config/perfis` | `{ lista: [...] }` — perfis de permissão |
| `tarefas_todo/{id}` | Filtrado por `escritorio` |
| `comunicados/{id}` | Filtrado por `destinosEscritorio` |
| `admissoes/{id}` | Filtrado por `escritorio` |
| `reclamacoes_horas/{id}` | Filtrado por `escritorio` |
| `calendarios/{id}` | Acesso universal |
| `escalas/{escritorioId}/dias/{YYYY-MM-DD}` | Sub-coleção por escritório (**path antigo `escalas/{date}` já não é lido**) |
| `conversas/{id}` | Cross-office, protegido por `participantes[]` |
| `conversas/{id}/mensagens/{id}` | Imutável após criação |
| `chat_lidos/{uid}_{conversaId}` | Timestamp de último lido por utilizador |
| `auditoria/{id}` | Append-only (update/delete proibidos nas rules) |

### Escritórios

```js
{ id: 'quarteira', nome: 'Quarteira', cor: '#0284c7', default: true, ativo: true, ordem: 10 }
```

Escritórios inativos não aparecem nos módulos. Usar sempre `loadEscritorios()`, nunca arrays hardcoded.

---

## Firestore Rules

Ficheiro: `firestore.rules` + índices: `firestore.indexes.json`

- `canonicalPerm(module, action)` — verifica permissão canónica via `map.get()` dinâmico
- `legacyPerm(module, action)` — fallback para permissões antigas
- `officeMatches()` + `destinosMatch()` — controlo por escritório
- Chat protegido por `participantes[]`
- Auditoria append-only

---

## Visual e temas

### Fontes

- **Inter** — corpo de texto, inputs, botões, labels
- **Poppins** — títulos, headings de painéis
- **Sora** — números, valores numéricos, classe `.mono`

### Tokens de cor base

```css
--bg: #f1f5f9       /* fundo da página */
--surface: #fff     /* cards e painéis */
--border: #e2e8f0   /* bordas */
--text: #0f172a     /* texto principal */
--muted: #94a3b8    /* texto secundário */
--accent: #0284c7   /* cor de ação (muda com o tema) */
```

### Temas de cor (geridos por `js/dashboard-customizer.js`)

| Tema | Accent | Sidebar |
|---|---|---|
| `default` | Sky blue `#0284c7` | Navy `#0f172a` |
| `forest` | Teal `#0f766e` | Dark teal `#12312b` |
| `sunset` | Orange `#c2410c` | Dark brown `#3c1f12` |
| `violet` | Violet `#7c3aed` | Dark purple `#21163d` |

Tema ativo guardado em Firestore (`preferencias.dashboard.themePreset`) e aplicado via `data-theme` no `<html>`.

---

## Estrutura de ficheiros

```text
hub-algartempo/
├── styles.css                  ← base partilhada (tokens, temas, componentes)
├── login.html / dashboard.html / [modulo].html
├── design-system.html          ← referência visual dos componentes
├── seed.html                   ← seed de dados (admin)
│
├── css/
│   ├── login.css / dashboard2.css / dashboard2-real.css
│   ├── perfis.css / auditoria.css / escalas.css
│   ├── calendario.css / gerir-calendarios.css (standalone)
│   └── ...
│
├── js/
│   ├── (base comum — ver tabela acima)
│   ├── (services de domínio — ver tabela acima)
│   ├── dashboard.js / tarefas.js / comunicados.js / admissoes.js
│   ├── reclamacoes.js / calendario.js / escalas.js / chat.js
│   ├── perfis.js / definicoes.js / utilizadores.js
│   ├── gerir-calendarios.js / auditoria-page.js
│   ├── clientes.js / ferias.js / visitas.js / despesas.js
│   └── voz-ai.js
│
├── templates/                  ← ponto de partida para módulos novos
├── prototipos/                 ← fora do escopo (não tocar)
├── firestore.rules
├── firestore.indexes.json      ← índice composto para chat
├── storage.rules
├── firebase.json / .firebaserc
```

---

## Firebase CLI

**projectId:** `hub-algartempo`

```bash
# Login
firebase login --reauth
firebase use hub-algartempo

# Deploy regras + índices (recomendado após alterações)
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project hub-algartempo

# Deploy storage
firebase deploy --only storage

# Testar localmente
firebase emulators:start --only firestore,storage
```

> Usar `npx firebase-tools` em vez de `firebase` para evitar problemas de execution policy no Windows.

Testar com VS Code + Live Server: abrir `login.html`.

---

## Convenções

| Item | Padrão |
|---|---|
| IDs de escritório | `lowercase-sem-espacos` |
| IDs de módulo | Mesmo que `id` no registry |
| Permissões legacy | `camelCase` |
| Permissões canónicas | `modules.<id>.<acao>` |
| Variáveis globais | `window.*` |
| Coleções Firestore | `minusculas` ou `kebab-case` |
| Firestore direto | `firebase.firestore()` (não `window.db`) |
| Auditoria | `window.registarAuditoria()` (não `logAuditoria()`) |

---

## Limitações conhecidas

| Item | Estado |
|---|---|
| Firestore Security Rules | Precisam de endurecimento antes de produção |
| Criação de utilizadores | Feita do lado do cliente admin |
| Dark mode | Estrutura preparada (classe `.dark`) mas não implementado na maioria das páginas |
| Dados de escalas antigos | Path `escalas/{date}` não é lido; novo path é `escalas/{escritorioId}/dias/{date}` |

---

## Próximos passos

- [ ] Endurecer Firestore Rules e Storage Rules antes de produção
- [ ] Migrar criação de utilizadores para backend/server-side
- [ ] Implementar dark mode completo
- [ ] Migrar dados existentes de escalas para o novo path com sub-coleção
- [ ] Adicionar testes para fluxos críticos de auth, escritório e permissões
