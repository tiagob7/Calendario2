// ============================================================
// Chat — channels + DMs + message view
// ============================================================

function Chat({ pushToast }){
  const [activeId, setActiveId] = useState('ch2');
  const [messages, setMessages] = useState(CHAT_MESSAGES);
  const [draft, setDraft] = useState('');
  const [showInfo, setShowInfo] = useState(true);
  const [search, setSearch] = useState('');
  const endRef = useRef(null);

  const allConvos = [...CHAT_CHANNELS, ...CHAT_DMS];
  const active = allConvos.find(c => c.id === activeId);
  const msgs = messages[activeId] || [];

  useEffect(() => {
    if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight;
  }, [activeId, msgs.length]);

  const send = () => {
    if (!draft.trim()) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const m = { id: 'm'+Math.random(), userId: ME.id, name: ME.name, initials: ME.initials, color: 'linear-gradient(135deg,#f472b6,#8b5cf6)', text: draft, time, me: true };
    setMessages(prev => ({ ...prev, [activeId]: [...(prev[activeId]||[]), m] }));
    setDraft('');
  };

  const filteredChannels = CHAT_CHANNELS.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredDms = CHAT_DMS.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="chat-layout">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-head">
          <h1 style={{fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:700, letterSpacing:'-.015em', margin:0}}>Conversas</h1>
          <button className="icon-btn" title="Nova conversa"><I.plus size={14}/></button>
        </div>
        <div style={{position:'relative', padding:'0 14px 12px'}}>
          <I.search size={13} style={{position:'absolute', left:24, top:'50%', transform:'translateY(-50%)', color:'var(--text-4)'}}/>
          <input className="input" style={{paddingLeft:30, width:'100%', height:34}} placeholder="Pesquisar…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>

        <div className="chat-list">
          <div className="chat-list-head">Canais</div>
          {filteredChannels.map(c => (
            <button key={c.id} className={`chat-item ${activeId===c.id?'active':''}`} onClick={() => setActiveId(c.id)}>
              <span className={`chat-hash ${c.urgent?'urgent':''}`}>#</span>
              <span className="chat-item-name">{c.name}</span>
              {c.unread > 0 && <span className={`chat-unread ${c.urgent?'urgent':''}`}>{c.unread}</span>}
            </button>
          ))}

          <div className="chat-list-head" style={{marginTop:14}}>Mensagens diretas</div>
          {filteredDms.map(d => (
            <button key={d.id} className={`chat-item ${activeId===d.id?'active':''}`} onClick={() => setActiveId(d.id)}>
              <span className="chat-ava-wrap">
                <Avatar initials={d.initials} size="sm" color={d.color}/>
                <span className={`status-dot ${d.status}`}/>
              </span>
              <span className="chat-item-name">{d.name}</span>
              {d.unread > 0 && <span className="chat-unread">{d.unread}</span>}
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-main">
        <header className="chat-header">
          <div className="chat-header-title">
            {active?.type === 'channel' ? (
              <><span className="chat-hash big">#</span><span>{active.name}</span></>
            ) : (
              <>
                <Avatar initials={active?.initials} size="sm" color={active?.color}/>
                <span>{active?.name}</span>
              </>
            )}
          </div>
          <div className="chat-header-sub">
            {active?.type === 'channel' ? `${active.members} membros · ${active.desc}` : active?.status === 'online' ? 'Online agora' : `Última atividade ${active?.lastSeen}`}
          </div>
          <div style={{flex:1}}/>
          <button className="icon-btn" title="Pesquisar"><I.search size={15}/></button>
          <button className="icon-btn" title="Informação" onClick={() => setShowInfo(s => !s)}><I.help size={15}/></button>
        </header>

        <div className="chat-messages" ref={endRef}>
          {msgs.length === 0 && (
            <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-3)', fontSize:13}}>
              <div style={{fontFamily:"'Sora',sans-serif", fontSize:17, color:'var(--text-1)', fontWeight:700, marginBottom:6}}>
                {active?.type==='channel' ? `Bem-vindo a #${active.name}` : `Começa a conversa com ${active?.name?.split(' ')[0]}`}
              </div>
              <div>Não há mensagens ainda. Sê a primeira pessoa a escrever!</div>
            </div>
          )}
          {msgs.map((m, i) => {
            const prev = msgs[i-1];
            const grouped = prev && prev.userId === m.userId && prev.time === m.time;
            return (
              <div key={m.id} className={`chat-msg ${m.me?'me':''} ${grouped?'grouped':''}`}>
                {!grouped ? <Avatar initials={m.initials} size="sm" color={m.color}/> : <span style={{width:28}}/>}
                <div className="chat-msg-body">
                  {!grouped && (
                    <div className="chat-msg-meta">
                      <span className="chat-msg-name">{m.me ? 'Tu' : m.name}</span>
                      <span className="chat-msg-time">{m.time}</span>
                    </div>
                  )}
                  <div className="chat-msg-text">{m.text}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="chat-composer">
          <button className="icon-btn" title="Anexo"><I.paperclip size={16}/></button>
          <input
            className="chat-input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={active?.type==='channel' ? `Mensagem #${active.name}` : `Mensagem para ${active?.name?.split(' ')[0]}`}
          />
          <button className={`btn ${draft.trim()?'btn-primary':'btn-secondary'}`} onClick={send} disabled={!draft.trim()}>
            <I.send size={14}/> Enviar
          </button>
        </div>
      </section>

      {showInfo && active && (
        <aside className="chat-info">
          <div className="chat-info-head">
            <h3>Detalhes</h3>
            <button className="icon-btn" onClick={() => setShowInfo(false)}><I.close size={14}/></button>
          </div>
          {active.type === 'channel' ? (
            <>
              <div className="chat-info-big">#{active.name}</div>
              <div className="chat-info-sub">{active.desc}</div>
              <div className="chat-info-section">
                <div className="chat-info-label">Membros · {active.members}</div>
                <div className="chat-members">
                  {[ME, ...COLLEAGUES].slice(0,6).map(c => (
                    <div key={c.id} className="chat-member">
                      <Avatar initials={c.initials} size="sm" color={c.color || 'linear-gradient(135deg,#f472b6,#8b5cf6)'}/>
                      <span>{c.name}{c.id === ME.id ? ' (tu)' : ''}</span>
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" style={{justifyContent:'flex-start'}}>+ {active.members - 6} outros</button>
                </div>
              </div>
              <div className="chat-info-section">
                <div className="chat-info-label">Fixados</div>
                <div style={{fontSize:12.5, color:'var(--text-3)'}}>Sem mensagens fixadas neste canal.</div>
              </div>
            </>
          ) : (
            <>
              <div style={{textAlign:'center', padding:'10px 0 16px'}}>
                <div style={{display:'inline-block', marginBottom:10}}>
                  <Avatar initials={active.initials} size="lg" color={active.color}/>
                </div>
                <div style={{fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:700}}>{active.name}</div>
                <div style={{fontSize:12, color:'var(--text-3)', marginTop:3}}>
                  <span className={`status-dot ${active.status}`} style={{display:'inline-block', marginRight:6}}/>
                  {active.status === 'online' ? 'Online agora' : active.status === 'away' ? 'Ausente' : 'Offline'}
                </div>
              </div>
              <div className="chat-info-section">
                <div className="chat-info-label">Informação</div>
                <div style={{fontSize:13, display:'flex', flexDirection:'column', gap:8, color:'var(--text-2)'}}>
                  <div className="row between"><span className="muted">Última atividade</span><span>{active.lastSeen}</span></div>
                  <div className="row between"><span className="muted">Escritório</span><span>Porto</span></div>
                  <div className="row between"><span className="muted">Função</span><span>Gestora Cliente</span></div>
                </div>
              </div>
              <div className="chat-info-section">
                <button className="btn btn-secondary" style={{width:'100%', justifyContent:'center'}}><I.phone size={14}/> Chamada áudio</button>
              </div>
            </>
          )}
        </aside>
      )}
    </div>
  );
}

window.Chat = Chat;
