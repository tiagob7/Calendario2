# PROPOSTA_PLAN.md — Integração do Gerador de Propostas

Plano e tracker de progresso da integração do `gerador_proposta.html` standalone no módulo Clientes.

## Objetivo

Trazer toda a funcionalidade do gerador (formulário 9 secções + 2 calculadoras + template A4 + export) para dentro do módulo Clientes, com:

- Referência automática (`PROP-2026-NNN`).
- Pré-preenchimento a partir do cliente selecionado e dos preços já guardados.
- Histórico de propostas no Firestore com snapshot de cada documento.
- Defaults globais editáveis (listas de majorações, inclusões, responsabilidades, termos, gestores).
- Exportação para HTML / PDF (via `window.print`) / Impressão.

## Decisões tomadas

| Tópico | Decisão |
|---|---|
| Defaults das listas | Config global editável em `config/proposta_defaults` |
| UI do builder | Página separada `proposta-builder.html` (não modal) |
| Geração de PDF | `window.print()` em janela nova (zero deps) |
| Storage do PDF | Não — regenerar on-demand a partir dos dados |

## Schema Firestore

### `config/propostas_counter`
```js
{ ano: 2026, ultimo: 42, atualizadoEm: <timestamp> }
```

### `config/proposta_defaults`
```js
{
  signatario: { nome, cargo },
  gestores: [{ nome, cargo, telefone, email, escritorio }, ...],
  validade: { num: 30, unidade: 'dias' },
  majoracoes: [{ titulo, descricao }, ...],
  inclusoes: [...],
  respAlgartempo: [...],
  respEmpresa: [...],
  termosEsq: [...],
  termosDir: [...],
  coefRows: [{ rubrica, coef }, ...],
  categoriasDefault: ['Cozinheiro 1ª', ...]
}
```

### `clientes/{id}.revisoes[]` (tipo: 'proposta') alargada
```js
{
  tipo: 'proposta',
  referencia: 'PROP-2026-043',
  importedAt, importedBy, importedByName,
  cliente: { nomeResponsavel, nomeEmpresa },
  validade: { num, unidade },
  signatario: { nome, cargo },
  gestor: { nome, cargo, telefone, email, escritorio },
  tableTypes: { hora: true, coef: false },
  linhas: [{ categoria, preco22Dias, valorDia, precoHora, obsLinha }],
  coefRows: [{ rubrica, coef }],
  majoracoes, inclusoes,
  respAlgartempo, respEmpresa,
  termosEsq, termosDir,
  nota: '',
  aplicada: false
}
```

## Permissão nova

`clientes.propose` — permite criar e re-emitir propostas.

## Estrutura de ficheiros

| Ficheiro | Estado | Função |
|---|---|---|
| `PROPOSTA_PLAN.md` | NOVO | Este documento — tracker |
| `proposta-builder.html` | NOVO | Página com layout step-rail/form/preview |
| `js/proposta-builder.js` | NOVO | Lógica do formulário + calculadoras + integração |
| `js/proposta-template.js` | NOVO | Exporta `window.PropostaTemplate.render(dados)` e `TEMPLATE_HTML` |
| `css/proposta-builder.css` | NOVO | Estilos do builder (adaptados do gerador) |
| `js/clientes-service.js` | ALT | Adicionar `gerarProximaReferencia`, `getDefaultsProposta`, `setDefaultsProposta`, schema alargado em `criarProposta` |
| `js/clientes.js` | ALT | Botão "Nova proposta" → navega para builder; tab Propostas mostra `referencia` + "Re-abrir" |
| `js/perfis-service.js` | ALT | Adicionar acção `propose` em clientes |
| `firestore.rules` | ALT | `clientes` update inclui `propose`; counter/defaults editáveis |
| `gerador_proposta.html` | MOVER | Para `prototipos/` como referência |

## Fases de implementação

### Fase 1 — Backend (service + schema + permissões + rules) ✅
- [x] Criar `PROPOSTA_PLAN.md`
- [x] Adicionar `gerarProximaReferencia()` ao `clientes-service.js` (transaction)
- [x] Adicionar `getDefaultsProposta()` / `setDefaultsProposta()` ao `clientes-service.js` (+ fallback hardcoded)
- [x] Alargar `criarProposta()` para aceitar novo schema (+ adicionei `atualizarProposta()`)
- [x] Adicionar acção `propose` em `perfis-service.js` (`MODULE_ACTIONS`)
- [x] Adicionar `propose` nos perfis predefinidos (gestor-rh + gestor-operacional ganham, restantes false)
- [x] Adicionar `modules.clientes.propose` em `PERMISSION_DEFINITIONS` (auth.js) + default `false`
- [x] Atualizar `firestore.rules` — `clientes` update inclui `propose`; `propostas_counter` e `proposta_defaults` editáveis por quem tem `propose`

### Fase 2 — UI Builder (HTML/CSS) ✅
- [x] Criar `proposta-builder.html` com layout do gerador (step-rail + form-pane + preview-pane + 2 modais de calculadora)
- [x] Criar `css/proposta-builder.css` (cópia adaptada do gerador)
- [x] Adicionar scripts Firebase + base comum + permissões

### Fase 3 — Template & Render ✅
- [x] Extrair `TEMPLATE_HTML` para `js/proposta-template.js` (1026 linhas, 1.36MB com base64 inline preservado)
- [x] Função `window.PropostaTemplate.render(dados)` que substitui tokens
- [x] Preservar SVGs/imagens base64 inline do gerador (via concatenação bash)
- [x] Sintaxe JS validada com `node -c`

### Fase 4 — Lógica do builder & Integração ✅
- [x] Criar `js/proposta-builder.js`:
  - [x] Boot com `bootProtectedPage` (moduleId: 'clientes', renderNavbar: false)
  - [x] Ler `?cliente=<id>&proposta=<index>` da URL
  - [x] Carregar cliente, defaults, proposta existente (se aplicável)
  - [x] Renderizar 9 secções do formulário
  - [x] Implementar Calculadora Simples + Calculadora com Bases
  - [x] Preview iframe com tokens (debounce 500ms)
  - [x] Botões: Gerar referência / Guardar / Descarregar HTML / Descarregar PDF / Imprimir
  - [x] Botão "Importar preços do cliente" (popula tabela com `cliente.precosAtuais`)
- [x] Atualizar `js/clientes.js`:
  - [x] Adicionar `canPropose` ao state
  - [x] Botão "Nova proposta" navega para `proposta-builder.html?cliente=<id>`
  - [x] Tab Propostas mostra `referencia` da revisão
  - [x] Botão "Re-abrir" navega para `proposta-builder.html?cliente=<id>&proposta=<index>`
  - [x] `autoOpenFromHash()` — abre o drawer + tab Preços quando vem com `#cliente=<id>` do builder

### Fase 5 — Cleanup ✅
- [x] Mover `gerador_proposta.html` para `prototipos/gerador_proposta.html` (manter como referência)
- [x] Atualizar `CLAUDE.md`: módulo Clientes, services novos, permissões específicas, schemas Firestore novos
- [x] Atualizar este plano com lições aprendidas

## Lições aprendidas

- **Template extraction**: O `TEMPLATE_HTML` (~860 linhas, 1.35MB com base64 images embedded) foi extraído via `awk` para um ficheiro temporário e concatenado com prefix/suffix (helpers + `render()`). Não usar `Read` directo — ficheiros >25K tokens excedem o limite. Validação final com `node -c`.
- **Backticks no template**: Verificar que o template raw não tem `` ` `` nem `${` interpoláveis antes de o embrulhar em template literal JS. Neste caso foi limpo (2 backticks totais = open/close).
- **Trailing tags**: O `awk` extraiu também os `</script></body></html>` do outer page. Necessário cortar essas 3 linhas finais antes de concatenar, senão sintaxe JS quebra.
- **Permissões**: 4 sítios para sincronizar quando adiciono uma permissão nova — `auth.js` (`PERMISSION_DEFINITIONS`, `createDefaultPermissions`), `perfis-service.js` (`MODULE_ACTIONS` + 4 `DEFAULT_PROFILES`), `firestore.rules`, e o serviço/UI do módulo.
- **Counter atómico**: `firestore.runTransaction` resolve race conditions na geração de referência. Quando o ano muda, reset implícito (set sem merge, com `ano: novo`).
- **Defaults com fallback**: Em vez de obrigar a admin a criar o doc `config/proposta_defaults` antes da primeira utilização, o service tem `PROPOSTA_FALLBACK_DEFAULTS` hardcoded. `mergeDefaultsWithFallback()` faz override por chave: se o doc tem `gestores` mas não `coefRows`, usa o doc.gestores + fallback.coefRows.
- **Iframe + srcdoc**: Para preview do documento sem poluir CSS global, o builder usa `<iframe srcdoc=...>` igual ao gerador. Manipulação do scroll-height precisa de `try/catch` (sandbox issues).
- **Navegação inter-módulos**: `proposta-builder.html?cliente=<id>` recebe param via URL; ao voltar usa hash `clientes.html#cliente=<id>` que o `autoOpenFromHash()` consome para re-abrir o drawer + tab Preços.

## Round 2 — Feedback do utilizador (após testes iniciais)

| Pedido | Estado | Ficheiros |
|---|---|---|
| Validade pequeno | ✅ | `css/proposta-builder.css` (grid 90px + 1fr) |
| Referência profissional | ✅ | `PROP-2026-C42-001`; revisões `/V2`. Contador per-cliente em `cliente.propostasContador` |
| Tab Propostas separada | ✅ | 4ª tab no drawer; cards com Re-abrir / Criar revisão / Aplicar |
| Histórico completo | ✅ | Tab Histórico mostra todas as `revisoes[]` com badge por tipo |
| Selecionar proposta como base | ✅ | Botão "Criar revisão" → URL `?cliente=X&parent=N`; builder pré-preenche do parent |

### Schema atualizado

```js
// clientes/{id}
{
  ...
  numeroCliente: '42',
  propostasContador: { ano: 2026, ultimo: 5, atualizadoEm: <ts> },  // novo, per-cliente
  revisoes: [
    {
      tipo: 'proposta',
      referencia: 'PROP-2026-C42-001',
      parentReferencia: '',         // novo — vazio para originais
      versao: 1,                     // novo
      ...
    },
    {
      tipo: 'proposta',
      referencia: 'PROP-2026-C42-001/V2',
      parentReferencia: 'PROP-2026-C42-001',
      versao: 2,
      ...
    }
  ]
}
```

### API alargada

- `gerarProximaReferencia(clienteId, opts)` — agora recebe clienteId (obrigatório). Se `opts.parentReferencia` passado → gera `/V2`, `/V3` (conta versões existentes em `revisoes[]`). Senão → transaction sobre o doc cliente, incrementa `propostasContador`.
- `getClientePrefix(cliente)` — devolve `C<numeroCliente>` ou fallback `CX<idSlice4>`.
- `nextRevisionNumber(revisoes, parentRef)` — varre `revisoes[]` à procura da maior versão associada a este parent.

### Fluxo de revisão

1. User abre cliente → tab Propostas → clica "Criar revisão" numa proposta X.
2. Navega para `proposta-builder.html?cliente=ID&parent=indexDeX`.
3. Builder em `loadDados()`: carrega proposta X, define `state.parentReferencia = X.referencia` (ou se X já é V*, herda o `X.parentReferencia` para evitar V2/V2).
4. Builder em `preencherFormulario()`: usa parent como base do form, **NÃO** mostra referência ainda.
5. User clica "Gerar" → `gerarProximaReferencia(clienteId, { parentReferencia: '...' })` devolve `PROP-2026-C42-001/V2`.
6. User edita e clica "Guardar" → `criarProposta()` cria nova entrada em `revisoes[]` com `parentReferencia` e `versao` preenchidos. URL passa de `?parent=N` para `?proposta=K` (nova posição).

### Histórico completo

A tab Histórico agora itera `cliente.revisoes[]` inteiro (sem filtros). Cada evento recebe badge por tipo:

| Tipo | Badge | Cor |
|---|---|---|
| `importacao` | "Importação Excel" | new (verde) |
| `edicao-manual` | "Edição manual" | warning (amarelo) |
| `proposta` | "Proposta" | update (azul) |

Mostra também `atualizadoEm` quando uma proposta foi editada depois de criada, e o link `parentReferencia` quando é revisão.

## Próximos passos opcionais (não pedidos)

- Editor admin do `config/proposta_defaults` (página `definicoes.html`?)
- Snapshot do PDF no Storage (se algum dia quiserem auditoria forte das propostas enviadas)
- Refactor: remover código legacy `enterNovaProposta` / `renderNovaProposta` / `addProposalPriceRow` / `removeProposalPriceRow` / `saveProposta` em [clientes.js](js/clientes.js) — agora substituído pelo builder, mas mantido por backwards compat dos exports
- Botão "Duplicar proposta" no histórico (cria nova entrada com mesma data inicial)
- Notificação quando uma proposta é aplicada (`registarAuditoria`)

## Notas de implementação

- O contador atómico usa `firestore.runTransaction` para evitar race conditions em criações simultâneas.
- Quando o ano muda, o contador reinicia (`ano !== anoAtual` → reset para 1).
- Propostas legacy (sem `referencia`/`cliente`/etc) continuam a abrir mas mostram badge "Sem referência" e abrem em modo view-only.
- O `proposta-builder.html` **não** está registado no module-registry — só é acessível por link directo (URL com `?cliente=<id>`).
- A página requer `modules.clientes.propose` para criar/editar, mas `modules.clientes.view` é suficiente para re-abrir propostas existentes em modo view.
