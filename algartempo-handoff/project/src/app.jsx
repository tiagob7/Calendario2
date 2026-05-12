// ============================================================
// App root
// ============================================================

function App(){
  const [page, setPage] = useState(() => {
    return localStorage.getItem('algartempo_page') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('algartempo_page', page);
  }, [page]);

  return (
    <ToastProvider>
      <AppInner page={page} setPage={setPage}/>
      <TweaksPanel/>
    </ToastProvider>
  );
}

function AppInner({ page, setPage }){
  const push = useToast();
  const urgent = FOCUS.filter(f => f.marker === 'red').length;
  return (
    <Shell page={page} onNavigate={setPage} urgentCount={urgent}>
      {page === 'dashboard'   && <Dashboard   onNavigate={setPage} pushToast={push}/>}
      {page === 'ferias'      && <Ferias      pushToast={push}/>}
      {page === 'reclamacoes' && <Reclamacoes pushToast={push}/>}
      {page === 'admissoes'   && <Admissoes   pushToast={push}/>}
      {page === 'tarefas'     && <Tarefas     pushToast={push}/>}
      {page === 'comunicados' && <Comunicados pushToast={push}/>}
      {page === 'chat'        && <Chat        pushToast={push}/>}
      {page === 'clientes'    && <Clientes    pushToast={push}/>}
      {page === 'utilizadores' && <Utilizadores pushToast={push}/>}
      {page === 'definicoes'   && <Definicoes  pushToast={push} onNavigate={setPage}/>}
      {page === 'despesas'    && <Despesas    pushToast={push}/>}
      {page === 'visitas'     && <Visitas     pushToast={push}/>}
      {!['dashboard','ferias','reclamacoes','admissoes','tarefas','comunicados','chat','clientes','utilizadores','definicoes','despesas','visitas'].includes(page) && <StubPage page={page} pushToast={push}/>}
    </Shell>
  );
}

function StubPage({ page, pushToast }){
  const labels = {
    tarefas:'Tarefas', comunicados:'Comunicados', chat:'Chat', admissoes:'Admissões',
    despesas:'Despesas', calendario:'Calendário', clientes:'Clientes', visitas:'Visitas',
    utilizadores:'Utilizadores', definicoes:'Definições',
  };
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Módulo</div>
          <h1>{labels[page] || page}</h1>
          <p className="lede">Este módulo não faz parte deste protótipo. O foco desta iteração é Dashboard, Férias e Reclamações.</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <EmptyState
            icon={<I.paper size={22}/>}
            title="Módulo em preparação"
            sub="Carrega em Dashboard, Férias ou Reclamações para ver o design hi-fi."
            action={<button className="btn btn-primary" onClick={() => pushToast('Stub — sem ação')}>Ver exemplo</button>}
          />
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
