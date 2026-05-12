// ============================================================
// Seed data for the Algartempo hub prototype
// ============================================================

const OFFICES = [
  { id: 'lisboa', name: 'Lisboa — Saldanha', city: 'Lisboa', color: '#0284c7' },
  { id: 'porto',  name: 'Porto — Boavista',  city: 'Porto',  color: '#0d9488' },
  { id: 'faro',   name: 'Faro — Centro',      city: 'Faro',   color: '#d97706' },
  { id: 'braga',  name: 'Braga — Avenida',    city: 'Braga',  color: '#7c3aed' },
];

const ME = {
  id: 'u1',
  name: 'Sofia Marques',
  role: 'Gestora Operações',
  initials: 'SM',
  email: 'sofia.marques@algartempo.pt',
  officeId: 'lisboa',
  isAdmin: true,
};

const COLLEAGUES = [
  { id: 'u2', name: 'João Pereira',   initials: 'JP', officeId: 'lisboa', color: '#f59e0b' },
  { id: 'u3', name: 'Inês Rocha',     initials: 'IR', officeId: 'porto',  color: '#10b981' },
  { id: 'u4', name: 'Miguel Santos',  initials: 'MS', officeId: 'faro',   color: '#8b5cf6' },
  { id: 'u5', name: 'Beatriz Costa',  initials: 'BC', officeId: 'lisboa', color: '#ec4899' },
  { id: 'u6', name: 'Rui Fernandes',  initials: 'RF', officeId: 'braga',  color: '#06b6d4' },
  { id: 'u7', name: 'Ana Lima',       initials: 'AL', officeId: 'porto',  color: '#ef4444' },
];

// ── Dashboard KPIs ──────────────────────────────────────────
const KPIS = [
  { key: 'tarefas',     label: 'Tarefas abertas',    value: 23,  delta: +4,   deltaLabel: 'vs semana passada', trend: [3,5,4,6,4,7,8,6,9,7,10,11] },
  { key: 'reclamacoes', label: 'Reclamações em curso', value: 7,   delta: -2, deltaLabel: 'esta semana',        trend: [9,8,10,9,7,8,6,7,5,6,7,7] },
  { key: 'ferias',      label: 'Pedidos de férias',   value: 4,  delta: +1,    deltaLabel: 'pendentes',          trend: [2,2,3,3,4,4,3,4,5,4,4,4] },
  { key: 'admissoes',   label: 'Admissões ativas',    value: 12, delta: 0,    deltaLabel: 'em processamento',    trend: [10,11,11,12,12,11,12,12,13,12,12,12] },
];

// ── Activity feed ──────────────────────────────────────────
const ACTIVITY = [
  { id: 'a1', actor: 'Inês Rocha',    actorInitials: 'IR', verb: 'aprovou',   target: 'Reclamação #R-2048', desc: 'Cliente conforme, resposta enviada por email.', time: 'há 14 min', type: 'approve' },
  { id: 'a2', actor: 'João Pereira',  actorInitials: 'JP', verb: 'submeteu',  target: 'Pedido de férias',   desc: '12–19 Mai · 5 dias úteis · motivo: pessoal.',    time: 'há 38 min', type: 'submit'  },
  { id: 'a3', actor: 'Miguel Santos', actorInitials: 'MS', verb: 'criou',     target: 'Comunicado',          desc: 'Manutenção nocturna do sistema — terça 02h-04h.', time: 'há 1 h',    type: 'create'  },
  { id: 'a4', actor: 'Beatriz Costa', actorInitials: 'BC', verb: 'atualizou', target: 'Admissão #A-117',     desc: 'Documentação completa, aguarda assinatura.',     time: 'há 2 h',    type: 'update'  },
  { id: 'a5', actor: 'Rui Fernandes', actorInitials: 'RF', verb: 'fechou',    target: 'Tarefa #T-339',       desc: 'Relatório mensal Cliente Portcel — entregue.',    time: 'há 3 h',    type: 'close'   },
];

// ── Focus (urgent items) ───────────────────────────────────
const FOCUS = [
  { id: 'f1', marker: 'red',   title: 'Reclamação #R-2053 · Lisboa', meta: 'Prioridade alta · aberta há 4 dias', module: 'reclamacoes' },
  { id: 'f2', marker: 'amber', title: 'Aprovar férias · Beatriz Costa', meta: 'Submetido há 2 dias · 8 dias', module: 'ferias' },
  { id: 'f3', marker: 'red',   title: 'Admissão #A-122 expira amanhã', meta: 'Falta documento de identificação', module: 'admissoes' },
  { id: 'f4', marker: 'amber', title: 'Tarefa #T-345 · vence hoje',    meta: 'Relatório SEPA · escritório Porto', module: 'tarefas' },
  { id: 'f5', marker: 'blue',  title: '3 comunicados por ler',        meta: 'Última hora · escritório Lisboa',  module: 'comunicados' },
];

// ── Férias (balance + requests) ────────────────────────────
const FERIAS_BALANCE = {
  total: 22, used: 6, pending: 3, left: 13, year: 2026,
};

let FERIAS_REQUESTS = [
  { id: 'fr1', userId: 'u2', user: 'João Pereira',  tipo: 'ferias',  inicio: '2026-05-12', fim: '2026-05-19', dias: 5,  estado: 'pendente', motivo: 'Viagem de família, já marcada.',           submetido: '2026-04-17' },
  { id: 'fr2', userId: 'u5', user: 'Beatriz Costa', tipo: 'ferias',  inicio: '2026-04-27', fim: '2026-05-04', dias: 6,  estado: 'pendente', motivo: 'Descanso planeado.',                       submetido: '2026-04-15' },
  { id: 'fr3', userId: 'u3', user: 'Inês Rocha',    tipo: 'folga',   inicio: '2026-04-24', fim: '2026-04-24', dias: 1,  estado: 'aprovado', motivo: 'Compensação do feriado de 25 de Abril.',   submetido: '2026-04-10' },
  { id: 'fr4', userId: 'u1', user: 'Sofia Marques', tipo: 'ferias',  inicio: '2026-07-06', fim: '2026-07-17', dias: 10, estado: 'aprovado', motivo: 'Férias de verão — confirmado em janeiro.', submetido: '2026-01-20' },
  { id: 'fr5', userId: 'u4', user: 'Miguel Santos', tipo: 'licenca', inicio: '2026-05-20', fim: '2026-05-22', dias: 3,  estado: 'rejeitado', motivo: 'Casamento familiar.',                     submetido: '2026-04-01', obs: 'Conflito com outro colaborador em licença.' },
  { id: 'fr6', userId: 'u7', user: 'Ana Lima',      tipo: 'ferias',  inicio: '2026-06-15', fim: '2026-06-26', dias: 10, estado: 'aprovado', motivo: 'Férias planeadas há 3 meses.',             submetido: '2026-03-05' },
  { id: 'fr7', userId: 'u6', user: 'Rui Fernandes', tipo: 'folga',   inicio: '2026-04-30', fim: '2026-04-30', dias: 1,  estado: 'pendente', motivo: 'Consulta médica.',                         submetido: '2026-04-18' },
];

// ── Reclamações ────────────────────────────────────────────
let RECLAMACOES = [
  {
    id: 'R-2053', cliente: 'Paula Ribeiro', canal: 'email', prioridade: 'alta', estado: 'aberto',
    escritorio: 'lisboa', atribuido: 'u1', dataAbertura: '2026-04-15',
    assunto: 'Cobrança indevida · abril', excerpt: 'Fui cobrada duas vezes no mesmo mês pela subscrição. Recebi a fatura dupla e o cartão já foi debitado. Peço verificação urgente e reembolso imediato do valor em duplicado.',
    mensagens: [
      { from: 'Paula Ribeiro', out: false, text: 'Bom dia, fui cobrada duas vezes este mês. Podem verificar por favor?', time: '15 Abr · 09:12' },
      { from: 'Sofia Marques', out: true,  text: 'Olá Paula, pedimos desculpa pelo incómodo. Estamos a verificar o seu caso e voltaremos em 24h.', time: '15 Abr · 11:47' },
      { from: 'Paula Ribeiro', out: false, text: 'Já vi que o valor foi debitado duas vezes na conta. Envio em anexo o extrato.', time: '16 Abr · 08:30' },
    ],
  },
  {
    id: 'R-2052', cliente: 'Tiago Mendes', canal: 'livro', prioridade: 'media', estado: 'em-analise',
    escritorio: 'porto', atribuido: 'u3', dataAbertura: '2026-04-14',
    assunto: 'Atraso no atendimento · balcão Boavista', excerpt: 'Esperei mais de 40 minutos na fila apesar de ter agendamento confirmado por SMS. O atendimento precisa de mais pessoal aos sábados de manhã.',
    mensagens: [],
  },
  {
    id: 'R-2051', cliente: 'Empresa Marítima Lda.', canal: 'email', prioridade: 'alta', estado: 'em-analise',
    escritorio: 'faro', atribuido: 'u4', dataAbertura: '2026-04-12',
    assunto: 'Contrato — cláusulas omissas', excerpt: 'Na última revisão contratual, algumas cláusulas previamente acordadas não foram incluídas. Solicitamos revisão imediata e esclarecimento do departamento jurídico.',
    mensagens: [],
  },
  {
    id: 'R-2050', cliente: 'Carla Sousa', canal: 'telefone', prioridade: 'baixa', estado: 'resolvido',
    escritorio: 'lisboa', atribuido: 'u1', dataAbertura: '2026-04-08',
    assunto: 'Dúvida sobre extracto', excerpt: 'Cliente pedia esclarecimento sobre valores. Foi explicado detalhadamente por telefone e cliente concordou.',
    mensagens: [],
  },
  {
    id: 'R-2049', cliente: 'José Fontes', canal: 'loja', prioridade: 'media', estado: 'resolvido',
    escritorio: 'braga', atribuido: 'u6', dataAbertura: '2026-04-05',
    assunto: 'Troca de equipamento defeituoso', excerpt: 'Equipamento avariado à segunda utilização. Efetuada troca por unidade nova e cliente satisfeito.',
    mensagens: [],
  },
  {
    id: 'R-2048', cliente: 'Marta Vieira', canal: 'email', prioridade: 'baixa', estado: 'resolvido',
    escritorio: 'porto', atribuido: 'u3', dataAbertura: '2026-04-02',
    assunto: 'Informação em falta no portal', excerpt: 'Cliente indicou que a informação de contato estava desatualizada. Corrigido e notificado.',
    mensagens: [],
  },
];

// ── Tarefas (kanban) ──────────────────────────────────────
let TAREFAS = [
  { id: 'T-341', title: 'Rever orçamento Q2 · escritório Lisboa',     desc: 'Confirmar valores com Finance antes de sexta.',                 estado: 'todo', prioridade: 'alta',  atribuido: 'u1', due: '2026-04-24', tag: 'Finanças',    checklist: [{t:'Reunião com CFO', done:true},{t:'Ajustar spreadsheet', done:false},{t:'Enviar aprovação', done:false}] },
  { id: 'T-342', title: 'Actualizar política de férias · RH',          desc: 'Reflectir novas regras legais do DL 2026.',                    estado: 'todo', prioridade: 'media', atribuido: 'u5', due: '2026-04-30', tag: 'Recursos Humanos', checklist: [{t:'Consultar jurídico', done:false},{t:'Rascunho novo manual', done:false}] },
  { id: 'T-343', title: 'Contactar fornecedores de economato',         desc: 'Pedir 3 propostas para renegociar contrato anual.',            estado: 'todo', prioridade: 'baixa', atribuido: 'u3', due: '2026-05-05', tag: 'Operações' },
  { id: 'T-344', title: 'Preparar onboarding · 2 admissões Porto',     desc: 'Documentos, acessos e plano de integração 30/60/90.',          estado: 'doing', prioridade: 'alta', atribuido: 'u3', due: '2026-04-22', tag: 'Recursos Humanos', checklist: [{t:'Criar contas email', done:true},{t:'Equipamento', done:true},{t:'Buddy assignment', done:false}] },
  { id: 'T-345', title: 'Relatório SEPA · Porto',                       desc: 'Compilação mensal obrigatória — vence hoje.',                  estado: 'doing', prioridade: 'alta', atribuido: 'u3', due: '2026-04-19', tag: 'Finanças' },
  { id: 'T-346', title: 'Auditoria interna · processos Faro',           desc: 'Visitar escritório e recolher amostra de 30 processos.',      estado: 'doing', prioridade: 'media', atribuido: 'u4', due: '2026-04-28', tag: 'Qualidade' },
  { id: 'T-347', title: 'Revisão do website institucional',             desc: 'Team de marketing pediu review até dia 20.',                   estado: 'review', prioridade: 'media', atribuido: 'u5', due: '2026-04-20', tag: 'Marketing' },
  { id: 'T-348', title: 'Propostas para formação Excel avançado',       desc: 'Agendar sessão com formador externo para equipa de Lisboa.',  estado: 'review', prioridade: 'baixa', atribuido: 'u1', due: '2026-05-10', tag: 'Formação' },
  { id: 'T-339', title: 'Relatório mensal Cliente Portcel',             desc: 'Entregue e validado pelo cliente.',                            estado: 'done', prioridade: 'media', atribuido: 'u6', due: '2026-04-15', tag: 'Operações' },
  { id: 'T-338', title: 'Actualizar inventário · equipamentos IT',      desc: 'Inclui novos portáteis entregues na semana passada.',          estado: 'done', prioridade: 'baixa', atribuido: 'u4', due: '2026-04-14', tag: 'IT' },
  { id: 'T-337', title: 'Definir tema da festa anual',                  desc: 'Votação interna concluída — escolhido "Navegação".',          estado: 'done', prioridade: 'baixa', atribuido: 'u5', due: '2026-04-10', tag: 'Cultura' },
];

const TAREFA_ESTADOS = [
  { id: 'todo',   label: 'A fazer',     color: '#64748b' },
  { id: 'doing',  label: 'Em curso',    color: '#0284c7' },
  { id: 'review', label: 'Em revisão',  color: '#d97706' },
  { id: 'done',   label: 'Concluídas',  color: '#059669' },
];

// ── Comunicados ───────────────────────────────────────────
let COMUNICADOS = [
  { id: 'c1', titulo: 'Manutenção nocturna do sistema', resumo: 'Terça 21 Abril, entre as 02h e as 04h, o sistema interno estará indisponível para actualizações.', autor: 'Miguel Santos', autorId: 'u4', categoria: 'Sistemas', escritorios: ['todos'], publicado: '2026-04-18', pinned: true, lido: false, icon: 'alert', views: 48 },
  { id: 'c2', titulo: 'Novos feriados municipais 2026', resumo: 'O calendário de feriados municipais para 2026 foi actualizado. Consultem o PDF anexo para cada escritório.', autor: 'Sofia Marques', autorId: 'u1', categoria: 'Recursos Humanos', escritorios: ['todos'], publicado: '2026-04-16', pinned: true, lido: false, icon: 'calendar', views: 67 },
  { id: 'c3', titulo: 'Festa de Primavera · 30 de Maio', resumo: 'Guardem a data! Jantar e actividades em Sintra, com convite para +1. Inscrições abrem na próxima semana.', autor: 'Beatriz Costa', autorId: 'u5', categoria: 'Cultura', escritorios: ['todos'], publicado: '2026-04-14', pinned: false, lido: false, icon: 'star', views: 112 },
  { id: 'c4', titulo: 'Nova política de despesas', resumo: 'Foi actualizado o limite para refeições em deslocação e o processo de submissão no portal.', autor: 'Sofia Marques', autorId: 'u1', categoria: 'Finanças', escritorios: ['todos'], publicado: '2026-04-11', pinned: false, lido: true, icon: 'receipt', views: 89 },
  { id: 'c5', titulo: 'Boas-vindas · Carolina Dias', resumo: 'A Carolina junta-se à equipa de Marketing no escritório do Porto a partir de segunda. Deem-lhe as boas-vindas!', autor: 'Inês Rocha', autorId: 'u3', categoria: 'Pessoas', escritorios: ['porto','lisboa'], publicado: '2026-04-10', pinned: false, lido: true, icon: 'users', views: 76 },
  { id: 'c6', titulo: 'Alteração horário · balcão Faro', resumo: 'Durante Maio o balcão do Faro abre às 10h às quintas-feiras devido a formação interna.', autor: 'Miguel Santos', autorId: 'u4', categoria: 'Operações', escritorios: ['faro'], publicado: '2026-04-08', pinned: false, lido: true, icon: 'clock', views: 34 },
  { id: 'c7', titulo: 'Resultados do inquérito de clima', resumo: 'Obrigado a todos pela participação. Já estão disponíveis os resultados consolidados no portal de RH.', autor: 'Sofia Marques', autorId: 'u1', categoria: 'Recursos Humanos', escritorios: ['todos'], publicado: '2026-04-05', pinned: false, lido: true, icon: 'check2', views: 143 },
];

const COM_CATEGORIAS = ['Todas', 'Recursos Humanos', 'Sistemas', 'Finanças', 'Operações', 'Cultura', 'Pessoas'];

// ── Chat ──────────────────────────────────────────────────
const CHAT_CHANNELS = [
  { id: 'ch1', type: 'channel', name: 'geral',          desc: 'Anúncios transversais',          unread: 0,  members: 42 },
  { id: 'ch2', type: 'channel', name: 'operacoes',      desc: 'Coordenação operacional diária', unread: 3,  members: 18 },
  { id: 'ch3', type: 'channel', name: 'lisboa',         desc: 'Escritório Lisboa',              unread: 1,  members: 14 },
  { id: 'ch4', type: 'channel', name: 'porto',          desc: 'Escritório Porto',               unread: 0,  members: 9 },
  { id: 'ch5', type: 'channel', name: 'reclamacoes',    desc: 'Canal de apoio a casos',         unread: 5,  members: 6, urgent: true },
  { id: 'ch6', type: 'channel', name: 'random',         desc: 'Conversa casual',                unread: 12, members: 38 },
];
const CHAT_DMS = [
  { id: 'dm1', type: 'dm', userId: 'u3', name: 'Inês Rocha',    initials: 'IR', color: '#10b981', unread: 2, status: 'online',  lastSeen: 'agora' },
  { id: 'dm2', type: 'dm', userId: 'u2', name: 'João Pereira',  initials: 'JP', color: '#f59e0b', unread: 0, status: 'online',  lastSeen: 'há 3 min' },
  { id: 'dm3', type: 'dm', userId: 'u4', name: 'Miguel Santos', initials: 'MS', color: '#8b5cf6', unread: 1, status: 'away',    lastSeen: 'há 22 min' },
  { id: 'dm4', type: 'dm', userId: 'u5', name: 'Beatriz Costa', initials: 'BC', color: '#ec4899', unread: 0, status: 'offline', lastSeen: 'há 2 h' },
];

const CHAT_MESSAGES = {
  'ch2': [
    { id: 'm1', userId: 'u3', name: 'Inês Rocha',    initials: 'IR', color: '#10b981', text: 'Bom dia equipa! Os números do Q1 ficaram no portal para quem quiser ver antes da call das 10h.', time: '09:04' },
    { id: 'm2', userId: 'u2', name: 'João Pereira',  initials: 'JP', color: '#f59e0b', text: 'Obrigado Inês! Vou dar uma olhada agora.',                                                  time: '09:07' },
    { id: 'm3', userId: 'u4', name: 'Miguel Santos', initials: 'MS', color: '#8b5cf6', text: 'Alguém consegue aceitar a deslocação ao Faro na próxima quinta? O cliente quer fazer review presencial.', time: '09:12' },
    { id: 'm4', userId: 'u1', name: 'Sofia Marques', initials: 'SM', color: 'linear-gradient(135deg,#f472b6,#8b5cf6)', text: 'Eu consigo. Faz marcação por favor e envia agenda.', time: '09:15', me: true },
    { id: 'm5', userId: 'u4', name: 'Miguel Santos', initials: 'MS', color: '#8b5cf6', text: 'Perfeito, envio em seguida.', time: '09:16' },
    { id: 'm6', userId: 'u3', name: 'Inês Rocha',    initials: 'IR', color: '#10b981', text: 'A propósito — o PDF do onboarding novo já está pronto. Link no canal #lisboa.', time: '09:21' },
  ],
  'ch5': [
    { id: 'm1', userId: 'u1', name: 'Sofia Marques', initials: 'SM', color: 'linear-gradient(135deg,#f472b6,#8b5cf6)', text: 'Recebemos mais uma reclamação de cobrança indevida hoje. #R-2053', time: '08:41', me: true },
    { id: 'm2', userId: 'u3', name: 'Inês Rocha',    initials: 'IR', color: '#10b981', text: 'Já vi. Acho que é o mesmo padrão de ontem. Vou investigar com Finance.',             time: '08:43' },
    { id: 'm3', userId: 'u2', name: 'João Pereira',  initials: 'JP', color: '#f59e0b', text: 'Confirmo que o sistema está a processar duplicados em alguns casos. Abri ticket IT-811.', time: '08:52' },
  ],
  'dm1': [
    { id: 'm1', userId: 'u3', name: 'Inês Rocha', initials: 'IR', color: '#10b981', text: 'Sofia, podes rever o draft do comunicado da festa? Acho que falta a morada.', time: 'ontem 17:22' },
    { id: 'm2', userId: 'u1', name: 'Sofia',       initials: 'SM', color: 'linear-gradient(135deg,#f472b6,#8b5cf6)', text: 'Claro! Mando review hoje à tarde.', time: 'ontem 17:30', me: true },
    { id: 'm3', userId: 'u3', name: 'Inês Rocha', initials: 'IR', color: '#10b981', text: 'Perfeito, obrigada 🙏', time: 'ontem 17:31' },
    { id: 'm4', userId: 'u3', name: 'Inês Rocha', initials: 'IR', color: '#10b981', text: 'Já viste o número do Porto este mês? Subimos 12% face a Março.', time: '08:12' },
    { id: 'm5', userId: 'u3', name: 'Inês Rocha', initials: 'IR', color: '#10b981', text: 'Quando tiveres 5 minutos para uma call?', time: '09:44' },
  ],
};

Object.assign(window, {
  get TAREFAS(){ return TAREFAS; }, set TAREFAS(v){ TAREFAS = v; },
  TAREFA_ESTADOS,
  get COMUNICADOS(){ return COMUNICADOS; }, set COMUNICADOS(v){ COMUNICADOS = v; },
  COM_CATEGORIAS,
  CHAT_CHANNELS, CHAT_DMS, CHAT_MESSAGES,
});

const CHANNEL_LABEL = {
  email: 'Email', livro: 'Livro Reclamações', loja: 'Presencial', telefone: 'Telefone',
};

const ESTADO_LABEL = {
  aberto: 'Aberto', 'em-analise': 'Em análise', resolvido: 'Resolvido', fechado: 'Fechado',
};

Object.assign(window, {
  OFFICES, ME, COLLEAGUES, KPIS, ACTIVITY, FOCUS,
  FERIAS_BALANCE,
  get FERIAS_REQUESTS(){ return FERIAS_REQUESTS; },
  set FERIAS_REQUESTS(v){ FERIAS_REQUESTS = v; },
  get RECLAMACOES(){ return RECLAMACOES; },
  set RECLAMACOES(v){ RECLAMACOES = v; },
  CHANNEL_LABEL, ESTADO_LABEL,
});
