// ============================================================
// Gerador de Contratos — Algartempo
// ============================================================

const { useState, useEffect, useRef, useMemo } = React;

// ── Data ──────────────────────────────────────────────────
const CONTRACT_TYPES = [
  { id: 'sem-termo',   title: 'Sem termo',          sub: 'Contrato de trabalho por tempo indeterminado.', meta: 'CT Art. 147', icon: 'infinity' },
  { id: 'termo-certo', title: 'A termo certo',       sub: 'Duração definida com início e fim previsto.',   meta: 'CT Art. 148', icon: 'calendar' },
  { id: 'termo-incerto', title: 'A termo incerto',  sub: 'Vinculado a tarefa ou substituição.',           meta: 'CT Art. 140', icon: 'clock' },
  { id: 'estagio',     title: 'Estágio profissional', sub: 'Programa IEFP ou estágio curricular.',         meta: 'Port. 326/2024', icon: 'star' },
  { id: 'prest-serv',  title: 'Prestação de serviços', sub: 'Trabalhador independente, em regime livre.',  meta: 'CC Art. 1154', icon: 'briefcase' },
  { id: 'tempo-parc',  title: 'Tempo parcial',         sub: 'Período normal inferior ao regime completo.', meta: 'CT Art. 150', icon: 'half' },
];

const TEMPLATES = [
  { id: 't1', name: 'Termo certo · 12 meses · Operacional', uses: 47 },
  { id: 't2', name: 'Sem termo · Administrativo · Lisboa', uses: 31 },
  { id: 't3', name: 'Estágio profissional IEFP · 9 meses', uses: 12 },
];

const STEPS = [
  { id: 'tipo',        label: 'Tipo de contrato',  sub: 'Modalidade e enquadramento legal' },
  { id: 'empresa',     label: 'Empregador',         sub: 'Dados da Algartempo' },
  { id: 'trabalhador', label: 'Trabalhador',        sub: 'Identificação e contactos' },
  { id: 'termos',      label: 'Termos do contrato', sub: 'Função, duração e remuneração' },
  { id: 'clausulas',   label: 'Cláusulas e anexos', sub: 'Confidencialidade, formação, etc.' },
  { id: 'revisao',     label: 'Revisão e geração',  sub: 'Pré-visualização final' },
];

const FUNCOES = [
  'Administrativo(a)','Assistente Operacional','Técnico de Contabilidade','Técnico Comercial',
  'Auxiliar de Limpeza','Motorista','Recepcionista','Designer','Programador',
];

// ── Tweakable defaults ────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "layout": "split",
  "density": "balanced",
  "preview_mode": "live",
  "doc_zoom": 0.78,
  "show_clause_numbers": true,
  "highlight_recent": true
}/*EDITMODE-END*/;

// ── Initial form state ────────────────────────────────────
const INITIAL_FORM = {
  type: 'termo-certo',
  // Empregador
  emp_razao: 'Algartempo — Trabalho Temporário, S.A.',
  emp_nipc: '503 224 891',
  emp_morada: 'Av. da República, 88, 4º Esq., 1050-191 Lisboa',
  emp_repr: 'Maria João Cardoso',
  emp_repr_role: 'Directora de Recursos Humanos',
  // Trabalhador
  tr_nome: '',
  tr_nif: '',
  tr_cc: '',
  tr_dn: '',
  tr_morada: '',
  tr_email: '',
  tr_tel: '',
  // Termos
  funcao: 'Técnico de Contabilidade',
  categoria: 'Nível IV',
  local: 'Escritório Lisboa — Av. da República, 88',
  inicio: '2026-06-01',
  fim: '2027-05-31',
  duracao: 12,
  motivo_termo: 'Acréscimo excepcional de actividade no encerramento do exercício de 2026 e preparação da campanha de IRS de 2027.',
  remun_base: 1180,
  remun_subs: 7.63,
  horario: '40h semanais — segunda a sexta, 09h00–18h00 com 1h almoço',
  ferias: 22,
  exp: 30,
  // Cláusulas
  c_confid: true,
  c_exclusiv: false,
  c_naoconc: false,
  c_naoconc_meses: 6,
  c_form: true,
  c_form_horas: 40,
  c_iso: true,
  c_protec: true,
  c_dispos: false,
  notas: '',
};

// ── Local icons (fallback if global I missing) ────────────
const SI = (window.I) || {};

// ── Derived helpers ───────────────────────────────────────
function fmtDate(iso){
  if(!iso) return '';
  const [y,m,d] = iso.split('-');
  if(!y) return iso;
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${parseInt(d,10)} de ${months[parseInt(m,10)-1]} de ${y}`;
}
function fmtEur(n){
  if(n === '' || n === null || n === undefined) return '';
  return new Intl.NumberFormat('pt-PT', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(Number(n)) + ' €';
}
function pad(n){return String(n).padStart(2,'0');}
function todayRef(){
  const d = new Date();
  return `CT-${d.getFullYear()}-${pad(d.getMonth()+1)}${pad(d.getDate())}-0142`;
}
function completion(form){
  const required = ['tr_nome','tr_nif','tr_cc','tr_dn','tr_morada','funcao','local','inicio','remun_base'];
  const filled = required.filter(k => form[k] && String(form[k]).trim().length).length;
  return Math.round((filled / required.length) * 100);
}
function stepCompletion(form){
  return {
    tipo: !!form.type,
    empresa: !!(form.emp_razao && form.emp_nipc && form.emp_morada && form.emp_repr),
    trabalhador: !!(form.tr_nome && form.tr_nif && form.tr_cc && form.tr_dn && form.tr_morada),
    termos: !!(form.funcao && form.local && form.inicio && form.remun_base),
    clausulas: true,
    revisao: false,
  };
}

// ============================================================
// Top bar
// ============================================================
function TopBar({ ref: docRef, onAction, autosaved }){
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">A</div>
      </div>
      <div className="crumbs">
        <span className="muted">Admissões</span>
        <span className="sep">/</span>
        <span className="muted">Novo processo · A-127</span>
        <span className="sep">/</span>
        <span className="here">Gerador de contratos</span>
      </div>
      <span className="pill" style={{marginLeft: 4}}>
        <span className="pill-dot" style={{background: 'var(--text-4)'}}/>
        Rascunho · <span className="mono" style={{marginLeft:4}}>{docRef}</span>
      </span>
      <div className="topbar-right">
        <span style={{fontSize:12, color:'var(--text-4)', display:'flex', alignItems:'center', gap:6}}>
          <span style={{width:6, height:6, borderRadius:'50%', background:'var(--green)'}}/>
          Guardado {autosaved}
        </span>
        <button className="topbar-btn" onClick={() => onAction('preview')}>
          <SvgIcon name="eye"/> Pré-visualizar
        </button>
        <button className="topbar-btn" onClick={() => onAction('share')}>
          <SvgIcon name="users"/> Convidar revisor
        </button>
        <button className="icon-btn" onClick={() => onAction('settings')}><SvgIcon name="more"/></button>
      </div>
    </header>
  );
}

// ============================================================
// Step rail (left)
// ============================================================
function StepRail({ active, onChange, form }){
  const status = stepCompletion(form);
  const pct = completion(form);
  return (
    <aside className="step-rail">
      <div className="rail-head">
        <div className="rail-eyebrow">Processo A-127</div>
        <div className="rail-title">Novo contrato</div>
        <div className="rail-progress">
          <div className="rail-progress-fill" style={{width: pct + '%'}}/>
        </div>
        <div className="rail-progress-meta">
          <span>{pct}% completo</span>
          <span className="tnum">{Object.values(status).filter(Boolean).length}/{STEPS.length}</span>
        </div>
      </div>

      <div className="step-divider">Etapas</div>
      {STEPS.map((s, i) => {
        const done = status[s.id];
        const isActive = active === s.id;
        return (
          <button key={s.id}
            className={`step-item ${isActive ? 'active' : ''} ${done && !isActive ? 'done' : ''}`}
            onClick={() => onChange(s.id)}>
            <div className="step-num">{done && !isActive ? <SvgIcon name="check" size={12}/> : i+1}</div>
            <div className="step-meta">
              <div className="step-label">{s.label}</div>
              <div className="step-sub">{s.sub}</div>
            </div>
            <div className={`step-status ${done ? 'ok' : ''}`}>
              {done ? <SvgIcon name="check" size={13}/> : ''}
            </div>
          </button>
        );
      })}

      <div className="rail-foot">
        <div className="template-card">
          <h4><SvgIcon name="layers" size={13}/> Modelos guardados</h4>
          <p>Aplica um modelo da equipa para pré-preencher tipo, cláusulas e termos típicos.</p>
          <div className="row">
            <button className="btn btn-secondary btn-sm" style={{flex:1}}>
              <SvgIcon name="folder" size={13}/> Escolher
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ============================================================
// Form pane
// ============================================================
function FormPane({ active, setActive, form, setForm, onGenerate, recentField }){
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <main className="form-pane">
      {active === 'tipo'        && <SectionTipo form={form} setField={setField}/>}
      {active === 'empresa'     && <SectionEmpresa form={form} setField={setField}/>}
      {active === 'trabalhador' && <SectionTrabalhador form={form} setField={setField}/>}
      {active === 'termos'      && <SectionTermos form={form} setField={setField}/>}
      {active === 'clausulas'   && <SectionClausulas form={form} setField={setField}/>}
      {active === 'revisao'     && <SectionRevisao form={form} onGenerate={onGenerate}/>}

      <div className="form-footer">
        <span className="help"><SvgIcon name="info" size={13}/> As alterações são guardadas automaticamente.</span>
        <span className="spacer"/>
        {active !== STEPS[0].id && (
          <button className="btn btn-secondary" onClick={() => {
            const i = STEPS.findIndex(s => s.id === active);
            setActive(STEPS[Math.max(0, i-1)].id);
          }}>
            <SvgIcon name="arrowLeft" size={14}/> Anterior
          </button>
        )}
        {active !== 'revisao' ? (
          <button className="btn btn-primary" onClick={() => {
            const i = STEPS.findIndex(s => s.id === active);
            setActive(STEPS[Math.min(STEPS.length-1, i+1)].id);
          }}>
            Continuar <SvgIcon name="arrowRight" size={14}/>
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onGenerate}>
            <SvgIcon name="check" size={14}/> Gerar contrato
          </button>
        )}
      </div>
    </main>
  );
}

// ── Section: Tipo ────────────────────────────────────────
function SectionTipo({ form, setField }){
  return (
    <section className="section">
      <div className="section-head">
        <span className="step-tag">01 / 06</span>
        <h2>Tipo de contrato</h2>
      </div>
      <p className="section-sub">Escolhe a modalidade. Cláusulas obrigatórias e campos serão ajustados ao enquadramento legal correspondente.</p>

      <div className="card">
        <div className="card-body">
          <div className="type-grid">
            {CONTRACT_TYPES.map(t => (
              <button key={t.id}
                className={`type-card ${form.type === t.id ? 'selected' : ''}`}
                onClick={() => setField('type', t.id)}>
                <div className="type-ico"><SvgIcon name={t.icon} size={18}/></div>
                <div className="type-title">{t.title}</div>
                <div className="type-sub">{t.sub}</div>
                <div className="type-meta">{t.meta}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{marginTop: 18}} className="card">
        <div className="card-body" style={{display:'flex', alignItems:'flex-start', gap:14}}>
          <div style={{
            width:36, height:36, borderRadius:10, background:'var(--accent-soft)',
            color:'var(--accent)', display:'grid', placeItems:'center', flexShrink:0
          }}><SvgIcon name="info" size={18}/></div>
          <div style={{flex:1}}>
            <div style={{fontFamily:'Sora,sans-serif',fontWeight:700,fontSize:13.5,letterSpacing:'-0.01em'}}>Atenção ao enquadramento legal</div>
            <p style={{fontSize:12.5, color:'var(--text-3)', marginTop:4, lineHeight:1.55}}>
              Contratos a termo certo exigem fundamentação concreta nos termos do Art. 140.º do Código do Trabalho. A Algartempo
              só celebra contratos a termo quando se verifique acréscimo excepcional, substituição de trabalhador ausente, ou
              actividades sazonais devidamente justificadas.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section: Empresa ─────────────────────────────────────
function SectionEmpresa({ form, setField }){
  return (
    <section className="section">
      <div className="section-head">
        <span className="step-tag">02 / 06</span>
        <h2>Empregador</h2>
      </div>
      <p className="section-sub">Dados da entidade empregadora. Pré-preenchidos a partir do escritório associado ao processo.</p>

      <div className="card">
        <div className="card-body">
          <div className="form-grid">
            <div className="field full">
              <label className="field-label">Razão social <span className="req">*</span></label>
              <input className="input" value={form.emp_razao} onChange={e => setField('emp_razao', e.target.value)}/>
            </div>
            <div className="field">
              <label className="field-label">NIPC <span className="req">*</span></label>
              <input className="input" value={form.emp_nipc} onChange={e => setField('emp_nipc', e.target.value)}/>
            </div>
            <div className="field">
              <label className="field-label">Capital social</label>
              <div className="input-wrap">
                <input className="input" defaultValue="2 500 000"/>
                <span className="affix-r">€</span>
              </div>
            </div>
            <div className="field full">
              <label className="field-label">Morada da sede <span className="req">*</span></label>
              <input className="input" value={form.emp_morada} onChange={e => setField('emp_morada', e.target.value)}/>
            </div>
            <div className="field">
              <label className="field-label">Representante <span className="req">*</span></label>
              <input className="input" value={form.emp_repr} onChange={e => setField('emp_repr', e.target.value)}/>
            </div>
            <div className="field">
              <label className="field-label">Cargo</label>
              <input className="input" value={form.emp_repr_role} onChange={e => setField('emp_repr_role', e.target.value)}/>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section: Trabalhador ─────────────────────────────────
function SectionTrabalhador({ form, setField }){
  const [nifLookup, setNifLookup] = useState(null);

  const triggerLookup = () => {
    if (form.tr_nif && form.tr_nif.replace(/\s/g,'').length >= 9) {
      setNifLookup({ matched: true, source: 'AT · ViesAPI' });
    } else {
      setNifLookup(null);
    }
  };

  return (
    <section className="section">
      <div className="section-head">
        <span className="step-tag">03 / 06</span>
        <h2>Trabalhador</h2>
      </div>
      <p className="section-sub">Identificação completa. Os campos NIF e CC são validados em tempo real contra os serviços da AT e SEF.</p>

      <div className="card">
        <div className="card-body">
          <div className="form-grid">
            <div className="field full">
              <label className="field-label">Nome completo <span className="req">*</span></label>
              <input className="input" placeholder="Ex: Mariana Silva Costa"
                value={form.tr_nome} onChange={e => setField('tr_nome', e.target.value)}/>
            </div>
            <div className="field">
              <label className="field-label">NIF <span className="req">*</span></label>
              <div className="input-wrap">
                <span className="affix mono">PT</span>
                <input className="input has-affix mono" placeholder="123 456 789"
                  value={form.tr_nif}
                  onChange={e => setField('tr_nif', e.target.value)}
                  onBlur={triggerLookup}/>
              </div>
              {nifLookup && nifLookup.matched && (
                <div className="nif-result">
                  <span className="check-ico"><SvgIcon name="check" size={11}/></span>
                  <div>
                    <strong>{form.tr_nome || 'Trabalhador identificado'}</strong>
                    <div style={{fontSize:11, opacity:.8}}>NIF activo · sem dívidas fiscais reportadas</div>
                  </div>
                  <span className="src">{nifLookup.source}</span>
                </div>
              )}
            </div>
            <div className="field">
              <label className="field-label">Cartão de cidadão <span className="req">*</span></label>
              <input className="input mono" placeholder="00000000 0 ZZ0"
                value={form.tr_cc} onChange={e => setField('tr_cc', e.target.value)}/>
            </div>
            <div className="field">
              <label className="field-label">Data de nascimento <span className="req">*</span></label>
              <input type="date" className="input" value={form.tr_dn} onChange={e => setField('tr_dn', e.target.value)}/>
            </div>
            <div className="field">
              <label className="field-label">Estado civil</label>
              <select className="select" defaultValue="solteiro">
                <option value="solteiro">Solteiro(a)</option>
                <option value="casado">Casado(a)</option>
                <option value="uniao">União de facto</option>
                <option value="divorciado">Divorciado(a)</option>
                <option value="viuvo">Viúvo(a)</option>
              </select>
            </div>
            <div className="field full">
              <label className="field-label">Morada <span className="req">*</span></label>
              <input className="input" placeholder="Rua, número, código postal, localidade"
                value={form.tr_morada} onChange={e => setField('tr_morada', e.target.value)}/>
            </div>
            <div className="field">
              <label className="field-label">Email</label>
              <input className="input" type="email" placeholder="nome@exemplo.pt"
                value={form.tr_email} onChange={e => setField('tr_email', e.target.value)}/>
            </div>
            <div className="field">
              <label className="field-label">Telefone</label>
              <div className="input-wrap">
                <span className="affix mono">+351</span>
                <input className="input has-affix mono" placeholder="000 000 000"
                  value={form.tr_tel} onChange={e => setField('tr_tel', e.target.value)}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section: Termos ──────────────────────────────────────
function SectionTermos({ form, setField }){
  const isTermo = form.type === 'termo-certo' || form.type === 'termo-incerto';
  return (
    <section className="section">
      <div className="section-head">
        <span className="step-tag">04 / 06</span>
        <h2>Termos do contrato</h2>
      </div>
      <p className="section-sub">Função, local de trabalho, duração e condições remuneratórias.</p>

      <div className="card" style={{marginBottom: 16}}>
        <div className="card-body">
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Função <span className="req">*</span></label>
              <input className="input" list="funcoes" value={form.funcao}
                onChange={e => setField('funcao', e.target.value)}/>
              <datalist id="funcoes">
                {FUNCOES.map(f => <option key={f} value={f}/>)}
              </datalist>
            </div>
            <div className="field">
              <label className="field-label">Categoria profissional</label>
              <input className="input" value={form.categoria}
                onChange={e => setField('categoria', e.target.value)}/>
            </div>
            <div className="field full">
              <label className="field-label">Local de trabalho <span className="req">*</span></label>
              <input className="input" value={form.local} onChange={e => setField('local', e.target.value)}/>
              <span className="field-hint">O local pode ser alterado por mobilidade contratual nos termos do Art. 194.º CT.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom: 16}}>
        <div className="card-body">
          <div style={{fontFamily:'Sora,sans-serif',fontWeight:700,fontSize:13.5,marginBottom:14,letterSpacing:'-0.01em'}}>Duração</div>
          <div className="form-grid three">
            <div className="field">
              <label className="field-label">Início <span className="req">*</span></label>
              <input type="date" className="input" value={form.inicio} onChange={e => setField('inicio', e.target.value)}/>
            </div>
            {isTermo && (
              <>
                <div className="field">
                  <label className="field-label">Fim previsto</label>
                  <input type="date" className="input" value={form.fim} onChange={e => setField('fim', e.target.value)}/>
                </div>
                <div className="field">
                  <label className="field-label">Duração</label>
                  <div className="input-wrap">
                    <input className="input mono" value={form.duracao} type="number"
                      onChange={e => setField('duracao', e.target.value)}/>
                    <span className="affix-r">meses</span>
                  </div>
                </div>
              </>
            )}
            <div className="field">
              <label className="field-label">Período experimental</label>
              <div className="input-wrap">
                <input className="input mono" value={form.exp} type="number"
                  onChange={e => setField('exp', e.target.value)}/>
                <span className="affix-r">dias</span>
              </div>
            </div>
          </div>
          {isTermo && (
            <div className="field full" style={{marginTop: 14}}>
              <label className="field-label">Motivo justificativo do termo <span className="req">*</span></label>
              <textarea className="textarea" value={form.motivo_termo}
                onChange={e => setField('motivo_termo', e.target.value)}/>
              <span className="field-hint">Obrigatório. Deve descrever circunstâncias concretas e objectivamente verificáveis.</span>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div style={{fontFamily:'Sora,sans-serif',fontWeight:700,fontSize:13.5,marginBottom:14,letterSpacing:'-0.01em'}}>Remuneração e horário</div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Remuneração base <span className="req">*</span></label>
              <div className="input-wrap">
                <input className="input mono" type="number" value={form.remun_base}
                  onChange={e => setField('remun_base', e.target.value)}/>
                <span className="affix-r">€ / mês</span>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Subsídio de refeição</label>
              <div className="input-wrap">
                <input className="input mono" type="number" step="0.01" value={form.remun_subs}
                  onChange={e => setField('remun_subs', e.target.value)}/>
                <span className="affix-r">€ / dia</span>
              </div>
            </div>
            <div className="field full">
              <label className="field-label">Horário</label>
              <input className="input" value={form.horario} onChange={e => setField('horario', e.target.value)}/>
            </div>
            <div className="field">
              <label className="field-label">Férias anuais</label>
              <div className="input-wrap">
                <input className="input mono" type="number" value={form.ferias}
                  onChange={e => setField('ferias', e.target.value)}/>
                <span className="affix-r">dias úteis</span>
              </div>
            </div>
            <div className="field">
              <label className="field-label">IRS — taxa de retenção</label>
              <select className="select" defaultValue="auto">
                <option value="auto">Automática (Tabelas 2026)</option>
                <option value="0">0%</option>
                <option value="custom">Definir manualmente</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section: Cláusulas ───────────────────────────────────
function SectionClausulas({ form, setField }){
  const Toggle = ({ field, on }) => (
    <div className={`switch ${form[field] ? 'on' : ''}`} onClick={() => setField(field, !form[field])}/>
  );
  return (
    <section className="section">
      <div className="section-head">
        <span className="step-tag">05 / 06</span>
        <h2>Cláusulas e anexos</h2>
      </div>
      <p className="section-sub">Activa cláusulas adicionais conforme o tipo de função e a sensibilidade da informação acedida.</p>

      <div className="card">
        <div className="card-body">
          <div className="clause-list">
            <ClauseRow
              title="Confidencialidade e protecção de dados"
              tone="accent"
              required
              sub="Trabalhador obriga-se a manter sigilo sobre informações comerciais, técnicas e dos clientes da Algartempo, inclusive após cessação do contrato."
              control={<Toggle field="c_confid"/>}
            />
            <ClauseRow
              title="Exclusividade"
              sub="Impede o exercício de actividade profissional concorrente ou conflituante. Carece de fundamentação."
              control={<Toggle field="c_exclusiv"/>}
            />
            <ClauseRow
              title="Pacto de não concorrência"
              sub="Limita a actividade após cessação do vínculo. Apenas válido com compensação adequada e fundamentação. Máx. 2 anos."
              control={<Toggle field="c_naoconc"/>}
              extra={form.c_naoconc && (
                <div className="form-grid" style={{marginTop:6}}>
                  <div className="field">
                    <label className="field-label">Duração</label>
                    <div className="input-wrap">
                      <input className="input mono" type="number" value={form.c_naoconc_meses}
                        onChange={e => setField('c_naoconc_meses', e.target.value)}/>
                      <span className="affix-r">meses</span>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Compensação mensal</label>
                    <div className="input-wrap">
                      <input className="input mono" type="number" defaultValue="350"/>
                      <span className="affix-r">€ / mês</span>
                    </div>
                  </div>
                </div>
              )}
            />
            <ClauseRow
              title="Formação contínua"
              sub="A Algartempo compromete-se a assegurar formação profissional certificada anual."
              control={<Toggle field="c_form"/>}
              extra={form.c_form && (
                <div className="field" style={{marginTop:6, maxWidth:200}}>
                  <label className="field-label">Horas anuais</label>
                  <div className="input-wrap">
                    <input className="input mono" type="number" value={form.c_form_horas}
                      onChange={e => setField('c_form_horas', e.target.value)}/>
                    <span className="affix-r">horas</span>
                  </div>
                </div>
              )}
            />
            <ClauseRow
              title="Acordo ISO 27001 / segurança da informação"
              sub="Adesão ao manual interno de segurança da informação e procedimentos de gestão de incidentes."
              control={<Toggle field="c_iso"/>}
            />
            <ClauseRow
              title="Compromisso de protecção de dados (RGPD)"
              tone="accent"
              required
              sub="Trabalhador reconhece a Política de Privacidade e procedimentos do DPO."
              control={<Toggle field="c_protec"/>}
            />
            <ClauseRow
              title="Disponibilidade fora do horário"
              sub="Aplicável a funções com regime de prevenção. Adicional remuneratório aplicável."
              control={<Toggle field="c_dispos"/>}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop: 16}}>
        <div className="card-body">
          <div className="field">
            <label className="field-label">Notas internas (não constam do contrato)</label>
            <textarea className="textarea" placeholder="Notas para a equipa de RH, observações para revisão jurídica, etc."
              value={form.notas} onChange={e => setField('notas', e.target.value)}/>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClauseRow({ title, sub, control, extra, tone, required }){
  return (
    <div className="clause-row">
      <div className="c-main">
        <div className="c-title">
          {title}
          {required && <span className="pill pill-accent">Obrigatório</span>}
          {tone === 'accent' && !required && <span className="pill pill-accent">Recomendado</span>}
        </div>
        <div className="c-sub">{sub}</div>
        {extra && <div className="c-extra">{extra}</div>}
      </div>
      <div>{control}</div>
    </div>
  );
}

// ── Section: Revisão ─────────────────────────────────────
function SectionRevisao({ form, onGenerate }){
  const checks = [
    { ok: !!form.tr_nome,                     label: 'Identificação completa do trabalhador' },
    { ok: !!form.funcao && !!form.local,      label: 'Função e local de trabalho definidos' },
    { ok: !!form.inicio,                      label: 'Data de início definida' },
    { ok: form.type !== 'termo-certo' || !!(form.motivo_termo && form.motivo_termo.length > 30), label: 'Motivo do termo fundamentado' },
    { ok: !!form.remun_base,                  label: 'Remuneração definida' },
    { ok: form.c_confid && form.c_protec,     label: 'Cláusulas obrigatórias activas' },
  ];
  const allOk = checks.every(c => c.ok);
  return (
    <section className="section">
      <div className="section-head">
        <span className="step-tag">06 / 06</span>
        <h2>Revisão e geração</h2>
      </div>
      <p className="section-sub">Última verificação antes de gerar o contrato em PDF assinável.</p>

      <div className="card" style={{marginBottom: 16}}>
        <div className="card-body">
          <div style={{fontFamily:'Sora,sans-serif',fontWeight:700,fontSize:13.5,marginBottom:12,letterSpacing:'-0.01em',display:'flex',alignItems:'center',gap:8}}>
            <SvgIcon name="check2" size={16} color={allOk ? 'var(--green)' : 'var(--amber)'}/>
            Verificação pré-geração
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:0}}>
            {checks.map((c, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'10px 0', borderBottom: i < checks.length-1 ? '1px solid var(--divider)' : 'none'
              }}>
                <span style={{
                  width:18, height:18, borderRadius:'50%',
                  background: c.ok ? 'var(--green)' : 'var(--amber-soft)',
                  color: c.ok ? 'white' : 'var(--amber)',
                  display:'grid', placeItems:'center', flexShrink:0,
                  border: c.ok ? 'none' : '1px solid var(--amber-border)'
                }}>
                  <SvgIcon name={c.ok ? 'check' : 'alert'} size={11}/>
                </span>
                <span style={{fontSize:13, fontWeight: c.ok ? 500 : 600, color: c.ok ? 'var(--text-2)' : 'var(--amber-ink)'}}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div style={{fontFamily:'Sora,sans-serif',fontWeight:700,fontSize:13.5,marginBottom:12,letterSpacing:'-0.01em'}}>Output</div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Formato</label>
              <select className="select" defaultValue="pdf-sign">
                <option value="pdf-sign">PDF + assinatura digital qualificada</option>
                <option value="pdf">PDF</option>
                <option value="docx">Word (.docx) editável</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Envio</label>
              <select className="select" defaultValue="email">
                <option value="email">Email para o trabalhador</option>
                <option value="portal">Portal do colaborador</option>
                <option value="manual">Apenas guardar — sem envio</option>
              </select>
            </div>
            <div className="field full" style={{marginTop:4}}>
              <label className="checkbox-row">
                <input type="checkbox" defaultChecked/>
                <span className="cb-label">Anexar política RGPD e regulamento interno</span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" defaultChecked/>
                <span className="cb-label">Solicitar revisão ao Departamento Jurídico antes de envio</span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox"/>
                <span className="cb-label">Guardar como modelo reutilizável</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Document preview pane
// ============================================================
function DocPane({ form, docRef, zoom, setZoom }){
  const tr_nome = form.tr_nome.trim();
  const tr_nif = form.tr_nif.trim();
  const tr_cc = form.tr_cc.trim();
  const isTermo = form.type === 'termo-certo' || form.type === 'termo-incerto';

  const F = ({ value, ph, recent }) => {
    if (!value) return <span className="doc-fillable empty">[{ph}]</span>;
    return <span className={`doc-fillable ${recent ? 'recent' : ''}`}>{value}</span>;
  };

  const typeLabel = (CONTRACT_TYPES.find(t => t.id === form.type) || {}).title || '';

  return (
    <aside className="doc-pane">
      <div className="doc-toolbar">
        <div className="doc-name">
          <SvgIcon name="paper" size={14}/>
          <span>Pré-visualização</span>
          <span className="mono">· {docRef}</span>
        </div>
        <span className="spacer"/>
        <span className="pill pill-accent" style={{fontSize:10.5}}>
          <span className="pill-dot" style={{background:'var(--accent)'}}/>
          A4 · pág 1/3
        </span>
        <div className="zoom-ctl">
          <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} title="Reduzir">−</button>
          <span className="zoom-val">{Math.round(zoom*100)}%</span>
          <button onClick={() => setZoom(z => Math.min(1.4, z + 0.1))} title="Aumentar">+</button>
        </div>
        <button className="icon-btn" title="Abrir em separador novo"><SvgIcon name="external" size={14}/></button>
      </div>

      <div className="doc-scroll">
        <div className="doc-page" style={{transform:`scale(${zoom})`, marginBottom: `${(1-zoom)*-1123 + 28}px`}}>
          <div className="doc-header">
            <div className="doc-brand">
              <div className="doc-mark">A</div>
              <div>
                <div className="doc-brand-name">Algartempo, S.A.</div>
                <div className="doc-brand-sub">Recursos Humanos</div>
              </div>
            </div>
            <div className="doc-ref">
              REF · {docRef}<br/>
              {fmtDate(new Date().toISOString().slice(0,10))}
            </div>
          </div>

          <div className="doc-title">CONTRATO DE TRABALHO</div>
          <div className="doc-subtitle">{typeLabel}</div>

          <p className="doc-block">
            Entre <strong>{form.emp_razao}</strong>, NIPC <span className="mono">{form.emp_nipc}</span>, com sede na{' '}
            {form.emp_morada}, neste acto representada por <strong>{form.emp_repr}</strong>, na qualidade de {form.emp_repr_role},
            adiante designada por <strong>Primeira Outorgante</strong> ou <strong>Empregador</strong>;
          </p>

          <p className="doc-block">
            E <F value={tr_nome} ph="nome do trabalhador"/>, contribuinte fiscal n.º <F value={tr_nif} ph="NIF"/>,
            titular do CC n.º <F value={tr_cc} ph="cartão de cidadão"/>, nascido(a) em <F value={fmtDate(form.tr_dn)} ph="data de nascimento"/>,
            residente em <F value={form.tr_morada} ph="morada"/>, adiante designado(a) por{' '}
            <strong>Segundo Outorgante</strong> ou <strong>Trabalhador</strong>;
          </p>

          <p className="doc-block">É celebrado, livremente e de boa fé, o presente contrato, que se rege pelas cláusulas seguintes:</p>

          <div className="doc-clause">
            <div className="doc-clause-num">Cláusula 1.ª</div>
            <div className="doc-clause-title">Objecto e função</div>
            <p>
              Pelo presente contrato, o Empregador admite ao seu serviço o Trabalhador, que aceita, para exercer as funções
              inerentes à categoria profissional de <F value={form.funcao} ph="função"/>
              {form.categoria ? <> ({form.categoria})</> : null}, no local de trabalho situado em <F value={form.local} ph="local"/>.
            </p>
          </div>

          {isTermo && (
            <div className="doc-clause">
              <div className="doc-clause-num">Cláusula 2.ª</div>
              <div className="doc-clause-title">Duração e fundamentação</div>
              <p>
                O presente contrato celebra-se na modalidade de <strong>{typeLabel}</strong>, com início em{' '}
                <F value={fmtDate(form.inicio)} ph="data de início"/> e termo previsto a{' '}
                <F value={fmtDate(form.fim)} ph="data de fim"/>, com a duração de <F value={form.duracao} ph="meses"/> meses.
                Fundamenta-se nos seguintes termos: <em>{form.motivo_termo || <span className="doc-fillable empty">[motivo do termo]</span>}</em>
              </p>
            </div>
          )}

          {!isTermo && (
            <div className="doc-clause">
              <div className="doc-clause-num">Cláusula 2.ª</div>
              <div className="doc-clause-title">Início de funções</div>
              <p>O contrato produz efeitos a <F value={fmtDate(form.inicio)} ph="data de início"/>, com período experimental de <F value={form.exp} ph="dias"/> dias.</p>
            </div>
          )}

          <div className="doc-clause">
            <div className="doc-clause-num">Cláusula 3.ª</div>
            <div className="doc-clause-title">Remuneração</div>
            <p>
              O Trabalhador auferirá a remuneração mensal base de <F value={fmtEur(form.remun_base)} ph="valor"/>,
              acrescida de subsídio de refeição no valor de <F value={fmtEur(form.remun_subs)} ph="subsídio"/> por dia útil
              de trabalho efectivo, pagos até ao último dia útil de cada mês por transferência bancária.
            </p>
          </div>

          <div className="doc-clause">
            <div className="doc-clause-num">Cláusula 4.ª</div>
            <div className="doc-clause-title">Horário e período de trabalho</div>
            <p>O período normal de trabalho é de <F value={form.horario} ph="horário"/>.</p>
          </div>

          {form.c_confid && (
            <div className="doc-clause">
              <div className="doc-clause-num">Cláusula 5.ª</div>
              <div className="doc-clause-title">Confidencialidade</div>
              <p>O Trabalhador obriga-se a manter o mais absoluto sigilo sobre toda a informação a que tenha acesso por força das suas funções, mesmo após a cessação do contrato.</p>
            </div>
          )}

          {form.c_form && (
            <div className="doc-clause">
              <div className="doc-clause-num">Cláusula 6.ª</div>
              <div className="doc-clause-title">Formação profissional</div>
              <p>O Empregador assegurará ao Trabalhador, anualmente, um mínimo de <F value={form.c_form_horas} ph="horas"/> horas de formação profissional certificada.</p>
            </div>
          )}

          {form.c_naoconc && (
            <div className="doc-clause">
              <div className="doc-clause-num">Cláusula 7.ª</div>
              <div className="doc-clause-title">Pacto de não concorrência</div>
              <p>Durante <F value={form.c_naoconc_meses} ph="meses"/> meses após cessação, o Trabalhador abster-se-á de exercer actividade concorrente, recebendo compensação adequada.</p>
            </div>
          )}

          <div className="doc-clause">
            <div className="doc-clause-num">Cláusula final</div>
            <div className="doc-clause-title">Foro</div>
            <p>Para dirimir qualquer litígio emergente do presente contrato, é competente o foro da Comarca de Lisboa, com expressa renúncia a qualquer outro.</p>
          </div>

          <div className="doc-sigs">
            <div className="doc-sig">
              <div className="sig-line"/>
              <div className="sig-name">{form.emp_repr}</div>
              <div className="sig-role">Pelo Empregador · {form.emp_repr_role}</div>
            </div>
            <div className="doc-sig">
              <div className="sig-line"/>
              <div className="sig-name">{tr_nome || <span style={{color:'#c44',fontStyle:'italic'}}>[nome do trabalhador]</span>}</div>
              <div className="sig-role">O Trabalhador</div>
            </div>
          </div>

          <div className="doc-foot">
            <span>Algartempo, S.A. · NIPC 503 224 891</span>
            <span>Página 1 de 3</span>
          </div>
        </div>

        <div className="preview-hint">
          <span className="dot"/>
          Sincronizado com o formulário
        </div>
      </div>
    </aside>
  );
}

// ============================================================
// Tweaks panel
// ============================================================
function TweaksPanel(){
  const [open, setOpen] = useState(false);
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);

  useEffect(() => {
    const onMsg = (e) => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') setOpen(true);
      if (e.data.type === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({type: '__edit_mode_available'}, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Apply tweaks to root element
  useEffect(() => {
    document.documentElement.dataset.layout = tweaks.layout;
    document.documentElement.dataset.density = tweaks.density;
  }, [tweaks]);

  const setTweak = (k, v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    window.parent.postMessage({type: '__edit_mode_set_keys', edits: {[k]: v}}, '*');
  };

  const close = () => {
    setOpen(false);
    window.parent.postMessage({type: '__edit_mode_dismissed'}, '*');
  };

  if (!open) return null;

  return (
    <div className="tweaks-panel">
      <div className="tweaks-head">
        <h3><SvgIcon name="sliders" size={14}/> Tweaks</h3>
        <button className="icon-btn" onClick={close}><SvgIcon name="close" size={14}/></button>
      </div>
      <div className="tweaks-body">
        <div>
          <div className="tweak-label">Layout</div>
          <div className="tweak-options">
            {[
              {v:'split', l:'Split (rail + form + doc)'},
              {v:'centered', l:'Form centrado (sem preview)'}
            ].map(o => (
              <button key={o.v}
                className={`tweak-opt ${tweaks.layout === o.v ? 'active' : ''}`}
                onClick={() => setTweak('layout', o.v)}>{o.l}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="tweak-label">Tema</div>
          <div className="tweak-options">
            <button className="tweak-opt"
              onClick={() => document.documentElement.classList.toggle('dark')}>
              Alternar dark mode
            </button>
          </div>
        </div>
        <div>
          <div className="tweak-label">Acento</div>
          <div className="tweak-options">
            {[
              {v:'#0284c7', l:'Azul Algartempo'},
              {v:'#7c3aed', l:'Violeta'},
              {v:'#16a34a', l:'Verde'},
              {v:'#0d9488', l:'Teal'},
            ].map(c => (
              <button key={c.v}
                className="tweak-opt"
                style={{background: c.v, color: 'white', borderColor: c.v}}
                onClick={() => {
                  document.documentElement.style.setProperty('--accent', c.v);
                }}>{c.l}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="tweak-label">Estado da pré-visualização</div>
          <div className="tweak-options">
            <button className="tweak-opt active">Live</button>
            <button className="tweak-opt">Diff vs último guardado</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Inline icons local (fallback)
// ============================================================
function SvgIcon({ name, size=16, color }){
  const s = { width: size, height: size, color };
  const props = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { color, flexShrink: 0 }
  };
  switch(name){
    case 'check':       return <svg {...props}><path d="M5 12l5 5L20 7"/></svg>;
    case 'check2':      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>;
    case 'close':       return <svg {...props}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'arrowLeft':   return <svg {...props}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
    case 'arrowRight':  return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'eye':         return <svg {...props}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'paper':       return <svg {...props}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></svg>;
    case 'info':        return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>;
    case 'alert':       return <svg {...props}><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>;
    case 'sliders':     return <svg {...props}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h14M18 18h2"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></svg>;
    case 'users':       return <svg {...props}><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0114 0"/><circle cx="17" cy="10" r="3"/><path d="M15 21h7a5 5 0 00-3.5-4.8"/></svg>;
    case 'more':        return <svg {...props}><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/></svg>;
    case 'external':    return <svg {...props}><path d="M15 3h6v6M10 14L21 3M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5"/></svg>;
    case 'folder':      return <svg {...props}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>;
    case 'layers':      return <svg {...props}><path d="M12 2l10 6-10 6L2 8l10-6z"/><path d="M2 14l10 6 10-6M2 12l10 6 10-6"/></svg>;
    case 'infinity':    return <svg {...props}><path d="M18 12c0 2.2-1.8 4-4 4s-4-1.8-4-4-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4 4-1.8 4-4 1.8-4 4-4 4 1.8 4 4z"/></svg>;
    case 'calendar':    return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>;
    case 'clock':       return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'star':        return <svg {...props}><path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg>;
    case 'briefcase':   return <svg {...props}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18"/></svg>;
    case 'half':        return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 010 18" fill="currentColor" stroke="none"/></svg>;
    default:            return <svg {...props}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

// ============================================================
// Toast (simple)
// ============================================================
function useToasts(){
  const [items, setItems] = useState([]);
  const push = (msg, kind='success') => {
    const id = Math.random().toString(36).slice(2);
    setItems(t => [...t, { id, msg, kind }]);
    setTimeout(() => setItems(t => t.filter(x => x.id !== id)), 2600);
  };
  const node = (
    <div className="toast-stack">
      {items.map(t => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <SvgIcon name="check" size={14}/>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
  return { push, node };
}

// ============================================================
// App root
// ============================================================
function App(){
  const [active, setActive] = useState('trabalhador');
  const [form, setForm] = useState(INITIAL_FORM);
  const [zoom, setZoom] = useState(0.78);
  const [docRef] = useState(todayRef);
  const [autosaved, setAutosaved] = useState('agora mesmo');
  const { push, node: toastNode } = useToasts();

  // Apply layout default
  useEffect(() => {
    document.documentElement.dataset.layout = TWEAK_DEFAULTS.layout;
  }, []);

  // Autosave indicator
  useEffect(() => {
    const t = setTimeout(() => setAutosaved('há instantes'), 800);
    return () => clearTimeout(t);
  }, [form]);

  const onAction = (a) => {
    if (a === 'preview') push('Pré-visualização aberta em nova janela');
    if (a === 'share')   push('Convite enviado ao revisor jurídico');
    if (a === 'settings') push('Definições do gerador');
  };

  const onGenerate = () => {
    push('Contrato gerado · enviado para revisão jurídica');
  };

  return (
    <div className="app">
      <TopBar docRef={docRef} onAction={onAction} autosaved={autosaved}/>
      <div className="workspace">
        <StepRail active={active} onChange={setActive} form={form}/>
        <FormPane active={active} setActive={setActive}
          form={form} setForm={setForm} onGenerate={onGenerate}/>
        <DocPane form={form} docRef={docRef} zoom={zoom} setZoom={setZoom}/>
      </div>
      <TweaksPanel/>
      {toastNode}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
