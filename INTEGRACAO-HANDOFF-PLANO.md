# Plano de Integracao do Handoff Algartempo

Este plano organiza a integracao gradual do template em `algartempo-handoff` na app atual, mantendo a arquitetura existente em HTML/CSS/JS vanilla e reduzindo o risco de regressões.

## Contexto

- App atual: paginas HTML na raiz, CSS em `css/`, JavaScript em `js/`.
- Handoff: prototipo em `algartempo-handoff/project`, com CSS global em `app.css` e componentes JSX em `src/`.
- Estrategia: adaptar visual e padroes do handoff para a app atual, sem introduzir framework nem copiar JSX diretamente.
- Prioridade: preservar IDs, classes e hooks usados pelos scripts existentes.

## Fase 1: Base visual comum ✓ CONCLUIDA

Objetivo: alinhar a app atual com o design do handoff sem mexer ainda na estrutura dos modulos.

- [x] Consolidar tokens do template em `styles.css`.
- [x] Garantir compatibilidade com tokens atuais como `--surface2`, `--muted`, `--accent-light`.
- [x] Normalizar estilos base de `body`, tipografia, links, botoes, inputs, cards, tabelas e badges.
- [x] Manter Inter + Poppins como par tipografico.
- [x] Rever dark mode e temas alternativos: forest, sunset, violet.
- [x] Evitar hard-code de cores fora dos custom properties.

Adicionado em `styles.css`: tokens de densidade (`--row-pad-y`, `--card-pad`, `--tabbar-h`), variantes `[data-density="compact|spacious"]`, `.btn-success`, `.btn-lg`, `.btn-icon`, `.timeline` / `.timeline-step` / `.timeline-dot` / `.timeline-body`, `.mobile-tabbar` / `.mobile-tab-item` / `.mobile-tab-badge`, `.app-shell-office-meta` / `.app-shell-office-label`, badge urgente com animacao.

## Fase 2: Shell global ✓ CONCLUIDA

Objetivo: aproximar sidebar, topbar e navegacao mobile do template.

- [x] Mapear o comportamento de `algartempo-handoff/project/src/shell.jsx`.
- [x] Adaptar o shell existente em `js/app-platform.js`.
- [x] Criar sidebar com grupos de navegacao.
- [x] Integrar seletor de escritorio (com label "Escritorio" acima do nome).
- [x] Integrar botao de colapsar sidebar.
- [x] Ajustar topbar com pesquisa global, avatar e acoes (botao de Ajuda adicionado).
- [x] Garantir drawer ou tabbar funcional em mobile (bottom tabbar com 5 modulos principais).
- [x] Colocar os estilos globais do shell em `styles.css`.

Alteracoes em `js/app-platform.js`: office meta label, help button, `ensureMobileTabbar()` com `MOBILE_TAB_IDS = ['dashboard','tarefas','ferias','reclamacoes','chat']`, correcao de encoding (Notificacoes, Modulos, Pesquisar, ⌘K, ☀️/🌙).

## Fase 3: Primitivos reutilizaveis ✓ CONCLUIDA

Objetivo: criar uma camada comum de componentes visuais em CSS/HTML para reduzir trabalho por modulo.

- [x] `.panel`, `.stat-card`, `.status-badge`, `.empty-state`, botoes, modal, toast — ja existiam em `styles.css`.
- [x] `.timeline`, `.mobile-tabbar`, `.avatar` adicionados na Fase 1.
- [x] Primitivos verificados como suficientes para a migracao dos modulos.

## Fase 4: Dashboard piloto — PARCIALMENTE CONCLUIDA

Objetivo: migrar o dashboard primeiro, usando-o como referencia para o resto da app.

- [x] Corrigir encoding garbled em `dashboard.html` (MÃ³dulos→Módulos, CalendÃ¡rio→Calendário, etc.) — via Python cp1252 fix.
- [x] Remover CSS duplicado de `css/dashboard.css`: @import Google Fonts, :root, html.dark, temas, reset/body/h1/a, secao .sidebar completa (240 linhas), .dash-topbar/.dash-modules-*/.sidebar-backdrop. Reducao de 1919→1396 linhas.
- [ ] Comparar visualmente com `algartempo-handoff/project/src/dashboard.jsx`.
- [ ] Validar responsividade desktop/mobile.
- [ ] Validar dark mode e temas.

Resultado esperado: dashboard completo integrado, servindo de pagina modelo.

## Fase 5: Migracao dos modulos por prioridade

Objetivo: aplicar o novo sistema visual modulo a modulo.

Ordem recomendada:

- [x] `tarefas`
- [x] `reclamacoes`
- [x] `admissoes`
- [x] `ferias` (já estava limpo)
- [x] `clientes`
- [x] `calendario` (encoding + CSS)
- [x] `comunicados`
- [x] `visitas`
- [x] `despesas`
- [x] `utilizadores`
- [x] `definicoes`
- [x] `perfis`
- [ ] restantes paginas administrativas ou prototipos relevantes

Checklist por modulo:

- [ ] Preservar HTML funcional e IDs usados pelo JavaScript.
- [ ] Aplicar shell e tokens globais.
- [ ] Substituir layout local por primitivas partilhadas.
- [ ] Remover duplicacao de CSS apenas quando for seguro.
- [ ] Verificar estados vazios, loading, erro e permissoes.
- [ ] Testar em desktop e mobile.

Resultado esperado: migracao gradual sem bloquear a app inteira.

## Fase 6: Limpeza e consistencia — PARCIALMENTE CONCLUIDA

Objetivo: reduzir duplicacao e estabilizar o design system.

- [x] Remover CSS duplicado entre `styles.css` e `css/*.css` — feito nos módulos principais.
- [x] Definir regra clara: estilos globais em `styles.css`, estilos especificos no CSS do modulo.
- [x] Corrigir textos com encoding quebrado — gerir-calendarios.html, escalas.html, seed.html corrigidos.
- [x] Remover @import Google Fonts duplicados em gerir-calendarios.css, escalas.css, comunicados.css, definicoes.css, perfis.css.
- [x] Remover resets globais (*, body, h1) duplicados em todos os módulos que os tinham.
- [ ] Rever consistencia de espacamentos, raios, sombras e estados.
- [ ] Rever contraste WCAG AA minimo.
- [ ] Rever foco de teclado e labels acessiveis.
- [ ] Verificar que todos os temas continuam a funcionar.

Resultado esperado: codigo visual mais limpo, previsivel e facil de manter.

## Fase 7: Validacao visual e funcional

Objetivo: validar cada entrega antes de passar para a proxima fase.

- [ ] Abrir localmente as paginas alteradas.
- [ ] Testar navegacao entre modulos.
- [ ] Testar sidebar expandida e colapsada.
- [ ] Testar mobile.
- [ ] Testar dark mode.
- [ ] Testar temas alternativos.
- [ ] Confirmar que Firebase/Auth/Firestore continuam sem regressao aparente.
- [ ] Comparar visualmente com o handoff.

Resultado esperado: cada fase fica pronta antes de avançar para a seguinte.

## Proxima acao recomendada

Continuar pela Fase 5, modulo a modulo. Por cada modulo:
1. Corrigir encoding garbled no HTML (mesmo metodo Python cp1252 usado no dashboard).
2. Verificar se o CSS do modulo tem :root / html.dark / temas duplicados — remover se existir.
3. Confirmar que o modulo usa `styles.css` como base (ou migrar para isso).
4. Testar shell (sidebar, topbar, mobile tabbar) na pagina do modulo.

Primeiro modulo a tratar: `tarefas.html` + `css/tarefas.css`.
