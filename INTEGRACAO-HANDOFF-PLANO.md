# Plano de Integracao do Handoff Algartempo

Este plano organiza a integracao gradual do template em `algartempo-handoff` na app atual, mantendo a arquitetura existente em HTML/CSS/JS vanilla e reduzindo o risco de regressões.

## Contexto

- App atual: paginas HTML na raiz, CSS em `css/`, JavaScript em `js/`.
- Handoff: prototipo em `algartempo-handoff/project`, com CSS global em `app.css` e componentes JSX em `src/`.
- Estrategia: adaptar visual e padroes do handoff para a app atual, sem introduzir framework nem copiar JSX diretamente.
- Prioridade: preservar IDs, classes e hooks usados pelos scripts existentes.

## Fase 1: Base visual comum

Objetivo: alinhar a app atual com o design do handoff sem mexer ainda na estrutura dos modulos.

- [x] Consolidar tokens do template em `styles.css`.
- [x] Garantir compatibilidade com tokens atuais como `--surface2`, `--muted`, `--accent-light`.
- [x] Normalizar estilos base de `body`, tipografia, links, botoes, inputs, cards, tabelas e badges.
- [x] Manter Inter + Poppins como par tipografico.
- [x] Rever dark mode e temas alternativos: forest, sunset, violet.
- [ ] Evitar hard-code de cores fora dos custom properties.

Resultado esperado: a app comeca a parecer parte do mesmo sistema visual, sem alterar a logica.

## Fase 2: Shell global

Objetivo: aproximar sidebar, topbar e navegacao mobile do template.

- [x] Mapear o comportamento de `algartempo-handoff/project/src/shell.jsx`.
- [x] Adaptar o shell existente em `js/app-platform.js`.
- [x] Criar sidebar com grupos de navegacao.
- [x] Integrar seletor de escritorio.
- [x] Integrar botao de colapsar sidebar.
- [x] Ajustar topbar com pesquisa global, avatar e acoes.
- [x] Garantir drawer ou tabbar funcional em mobile.
- [ ] Colocar os estilos globais do shell em `styles.css`.

Resultado esperado: todas as paginas passam a usar o novo esqueleto visual de forma consistente.

## Fase 3: Primitivos reutilizaveis

Objetivo: criar uma camada comum de componentes visuais em CSS/HTML para reduzir trabalho por modulo.

- [ ] Definir `.page-header`.
- [ ] Definir `.toolbar`.
- [ ] Definir `.panel`.
- [ ] Definir `.stat-card`.
- [ ] Definir `.data-table`.
- [ ] Definir `.status-badge`.
- [ ] Definir `.empty-state`.
- [ ] Definir `.filter-chip`.
- [ ] Definir `.icon-btn`.
- [ ] Definir `.primary-btn`.
- [ ] Definir `.form-grid`.
- [ ] Definir `.drawer`.
- [ ] Definir `.modal`.
- [ ] Adaptar os estilos a partir de `algartempo-handoff/project/app.css`, sem importar ruido desnecessario.

Resultado esperado: os modulos passam a partilhar as mesmas pecas visuais.

## Fase 4: Dashboard piloto

Objetivo: migrar o dashboard primeiro, usando-o como referencia para o resto da app.

- [ ] Comparar `dashboard.html` e `css/dashboard.css` com `algartempo-handoff/project/src/dashboard.jsx`.
- [ ] Manter IDs e hooks usados por `js/dashboard.js`.
- [ ] Substituir visual sem reescrever a logica.
- [ ] Reduzir estilos inline quando for seguro.
- [ ] Garantir que widgets arrastaveis/redimensionaveis continuam a funcionar.
- [ ] Validar responsividade desktop/mobile.
- [ ] Validar dark mode e temas.

Resultado esperado: dashboard completo integrado, servindo de pagina modelo.

## Fase 5: Migracao dos modulos por prioridade

Objetivo: aplicar o novo sistema visual modulo a modulo.

Ordem recomendada:

- [ ] `tarefas`
- [ ] `reclamacoes`
- [ ] `admissoes`
- [ ] `ferias`
- [ ] `clientes`
- [ ] `calendario`
- [ ] `comunicados`
- [ ] `visitas`
- [ ] `despesas`
- [ ] `utilizadores`
- [ ] `definicoes`
- [ ] `perfis`
- [ ] restantes paginas administrativas ou prototipos relevantes

Checklist por modulo:

- [ ] Preservar HTML funcional e IDs usados pelo JavaScript.
- [ ] Aplicar shell e tokens globais.
- [ ] Substituir layout local por primitivas partilhadas.
- [ ] Remover duplicacao de CSS apenas quando for seguro.
- [ ] Verificar estados vazios, loading, erro e permissoes.
- [ ] Testar em desktop e mobile.

Resultado esperado: migracao gradual sem bloquear a app inteira.

## Fase 6: Limpeza e consistencia

Objetivo: reduzir duplicacao e estabilizar o design system.

- [ ] Remover CSS duplicado entre `styles.css` e `css/*.css`.
- [ ] Definir regra clara: estilos globais em `styles.css`, estilos especificos no CSS do modulo.
- [ ] Corrigir textos com encoding quebrado, como `FÃ©rias` ou `ReclamaÃ§Ãµes`.
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

Comecar pela Fase 1 e Fase 2. Estas duas fases dao uma base visual global e um shell consistente antes de investir tempo em cada modulo individual.
