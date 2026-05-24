(function() {
  const COLLECTION = 'clientes';
  const HEADER_ROW_INDEX = 1;
  const DATA_START_ROW_INDEX = 2;
  const MAX_BATCH_OPERATIONS = 400;
  const DEFAULTS_DOC = 'proposta_defaults';
  const REFERENCIA_PREFIX = 'PROP';

  const COLUMN_ALIASES = {
    numeroCliente: ['n cliente', 'no cliente', 'numero cliente', 'num cliente', 'n cliente ', 'n cliente'],
    nome: ['cliente', 'nome cliente', 'hotel', 'nome'],
    grupo: ['grupo'],
    escritorio: ['escritorio', 'escritório', 'office'],
    categoria: ['categoria'],
    preco22Dias: ['preco 22 dias', 'preço 22 dias', 'preco22dias', 'preco 22d'],
    valorDia: ['valor dia', 'valor/dia', 'valor dia ', 'valordia'],
    precoHora: ['preco hora', 'preço hora', 'preco/hora', 'preco hora '],
    propostaData: ['data proposta contrato', 'data proposta / contrato', 'data proposta', 'proposta data', 'contrato'],
    obs: ['obs', 'observacoes', 'observações', 'observacao', 'observação'],
  };

  function db() {
    return firebase.firestore();
  }

  function collection() {
    return db().collection(COLLECTION);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeText(value) {
    return String(value == null ? '' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function normalizeDocString(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeCategoryKey(value) {
    return normalizeText(value).replace(/\s+/g, '-');
  }

  function stringifyCell(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (value instanceof Date) return value.toISOString();
    return String(value).trim();
  }

  function parseNumeric(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;

    const raw = String(value).trim();
    if (!raw) return null;

    const compact = raw.replace(/\s/g, '').replace(/€/g, '');
    const normalizedBase = /^\d{1,3}(\.\d{3})+$/.test(compact)
      ? compact.replace(/\./g, '')
      : /^\d{1,3}(,\d{3})+$/.test(compact)
        ? compact.replace(/,/g, '')
        : compact;
    const normalized = normalizedBase.includes(',') && normalizedBase.includes('.')
      ? normalizedBase.replace(/\./g, '').replace(',', '.')
      : normalizedBase.includes(',')
        ? normalizedBase.replace(',', '.')
        : normalizedBase;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatNumberForDoc(value) {
    if (value == null || !Number.isFinite(value)) return null;
    return Math.round(value * 10000) / 10000;
  }

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => resolve(event.target.result);
      reader.onerror = () => reject(new Error('Não foi possível ler o ficheiro.'));
      reader.readAsArrayBuffer(file);
    });
  }

  function buildColumnMap(headers) {
    const normalizedHeaders = headers.map(normalizeText);
    const result = {};

    Object.keys(COLUMN_ALIASES).forEach(key => {
      const aliases = COLUMN_ALIASES[key];
      const idx = normalizedHeaders.findIndex(header => aliases.some(alias => header === normalizeText(alias)));
      result[key] = idx;
    });

    return result;
  }

  function requireColumns(columnMap, requiredKeys) {
    const missing = requiredKeys.filter(key => columnMap[key] == null || columnMap[key] < 0);
    if (missing.length) {
      throw new Error('Colunas em falta no ficheiro: ' + missing.join(', '));
    }
  }

  function parseWorkbook(buffer) {
    if (!window.XLSX) throw new Error('A biblioteca XLSX não está disponível nesta página.');

    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('O ficheiro não contém folhas para importar.');

    const worksheet = workbook.Sheets[firstSheetName];
    const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' });
    const headers = matrix[HEADER_ROW_INDEX] || [];
    const columnMap = buildColumnMap(headers);

    requireColumns(columnMap, ['nome', 'categoria']);

    return {
      sheetName: firstSheetName,
      columnMap,
      rows: matrix.slice(DATA_START_ROW_INDEX),
    };
  }

  function buildCurrentPricesMap(lines) {
    const map = {};

    (lines || []).forEach(line => {
      const key = normalizeCategoryKey(line.categoria);
      if (!key) return;

      map[key] = {
        categoria: line.categoria,
        preco22Dias: line.preco22Dias,
        valorDia: line.valorDia,
        precoHora: line.precoHora,
        obsLinha: line.obsLinha || '',
      };
    });

    return map;
  }

  function summarizeRevision(lines) {
    const rows = Array.isArray(lines) ? lines : [];
    return {
      totalCategorias: rows.length,
      comPrecoHora: rows.filter(line => line.precoHora != null).length,
      comValorDia: rows.filter(line => line.valorDia != null).length,
      comPreco22Dias: rows.filter(line => line.preco22Dias != null).length,
    };
  }

  function parseClientRows(parsedWorkbook) {
    const groups = new Map();
    const ignoredRows = [];

    parsedWorkbook.rows.forEach((row, index) => {
      const rowNumber = DATA_START_ROW_INDEX + index + 1;
      const numeroCliente = normalizeDocString(row[parsedWorkbook.columnMap.numeroCliente]);
      const nome = normalizeDocString(row[parsedWorkbook.columnMap.nome]);
      const categoria = normalizeDocString(row[parsedWorkbook.columnMap.categoria]);
      const grupo = normalizeDocString(row[parsedWorkbook.columnMap.grupo]);
      const escritorio = normalizeDocString(row[parsedWorkbook.columnMap.escritorio]);
      const propostaDataRaw = stringifyCell(row[parsedWorkbook.columnMap.propostaData]);
      const obs = normalizeDocString(row[parsedWorkbook.columnMap.obs]);

      if (!nome || !categoria) {
        ignoredRows.push({
          rowNumber,
          reason: !nome ? 'Linha ignorada sem nome de cliente.' : 'Linha ignorada sem categoria.',
        });
        return;
      }

      const groupingKey = numeroCliente ? 'num:' + numeroCliente : 'name:' + normalizeText(nome);
      if (!groups.has(groupingKey)) {
        groups.set(groupingKey, {
          groupingKey,
          numeroCliente,
          nome,
          grupo,
          escritorioOrigem: escritorio,
          obs,
          propostaDataRaw,
          linhas: [],
        });
      }

      const current = groups.get(groupingKey);
      if (!current.grupo && grupo) current.grupo = grupo;
      if (!current.escritorioOrigem && escritorio) current.escritorioOrigem = escritorio;
      if (!current.obs && obs) current.obs = obs;
      if (!current.propostaDataRaw && propostaDataRaw) current.propostaDataRaw = propostaDataRaw;

      current.linhas.push({
        categoria,
        preco22Dias: formatNumberForDoc(parseNumeric(row[parsedWorkbook.columnMap.preco22Dias])),
        valorDia: formatNumberForDoc(parseNumeric(row[parsedWorkbook.columnMap.valorDia])),
        precoHora: formatNumberForDoc(parseNumeric(row[parsedWorkbook.columnMap.precoHora])),
        obsLinha: obs,
        sourceRowNumber: rowNumber,
      });
    });

    return {
      clients: Array.from(groups.values()),
      ignoredRows,
    };
  }

  async function fetchExistingClientes() {
    const snap = await collection().get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  function matchExistingClient(importClient, existingClientes) {
    if (importClient.numeroCliente) {
      const byNumber = existingClientes.find(item => normalizeDocString(item.numeroCliente) === importClient.numeroCliente);
      if (byNumber) return { client: byNumber, matchType: 'numeroCliente' };
    }

    const normalizedName = normalizeText(importClient.nome);
    if (!normalizedName) return { client: null, matchType: 'novo' };

    const candidates = existingClientes.filter(item => !normalizeDocString(item.numeroCliente) && normalizeText(item.nome) === normalizedName);
    if (candidates.length === 1) return { client: candidates[0], matchType: 'nomeExato' };
    if (candidates.length > 1) return { client: null, matchType: 'nomeExatoMultiplo' };

    return { client: null, matchType: 'novo' };
  }

  async function previewImport(file) {
    if (!file) throw new Error('Seleciona um ficheiro para importar.');

    const buffer = await readFileAsArrayBuffer(file);
    const parsedWorkbook = parseWorkbook(buffer);
    const extracted = parseClientRows(parsedWorkbook);
    const existingClientes = await fetchExistingClientes();

    const previewItems = extracted.clients.map(item => {
      const match = matchExistingClient(item, existingClientes);
      const existing = match.client || null;
      const ambiguous = match.matchType === 'nomeExatoMultiplo';

      return {
        clientId: existing ? existing.id : '',
        matchType: match.matchType,
        isExisting: !!existing,
        isAmbiguous: ambiguous,
        isBlocked: ambiguous,
        numeroCliente: item.numeroCliente,
        nome: item.nome,
        grupo: item.grupo,
        escritorioOrigem: item.escritorioOrigem,
        obs: item.obs,
        propostaDataRaw: item.propostaDataRaw,
        linhas: clone(item.linhas),
        precosAtuais: buildCurrentPricesMap(item.linhas),
        summary: summarizeRevision(item.linhas),
        warnings: [
          !item.numeroCliente ? 'Sem numero de cliente no Excel; o match depende do nome.' : '',
          ambiguous ? 'Encontrados varios clientes existentes com o mesmo nome sem numero associado.' : '',
        ].filter(Boolean),
      };
    });

    return {
      fileName: file.name,
      sourceSheet: parsedWorkbook.sheetName,
      importedAtPreview: Date.now(),
      clients: previewItems,
      ignoredRows: extracted.ignoredRows,
      summary: {
        totalClientes: previewItems.length,
        novos: previewItems.filter(item => !item.isExisting).length,
        existentes: previewItems.filter(item => item.isExisting).length,
        ambiguos: previewItems.filter(item => item.isAmbiguous).length,
        bloqueados: previewItems.filter(item => item.isBlocked).length,
        linhasIgnoradas: extracted.ignoredRows.length,
        totalCategorias: previewItems.reduce((acc, item) => acc + item.summary.totalCategorias, 0),
      },
    };
  }

  async function commitBatches(operations) {
    if (!operations.length) return;

    for (let index = 0; index < operations.length; index += MAX_BATCH_OPERATIONS) {
      const slice = operations.slice(index, index + MAX_BATCH_OPERATIONS);
      const batch = db().batch();
      slice.forEach(operation => batch.set(operation.ref, operation.data, { merge: true }));
      await batch.commit();
    }
  }

  async function applyImport(previewPayload, opts) {
    if (!previewPayload || !Array.isArray(previewPayload.clients) || !previewPayload.clients.length) {
      throw new Error('Não existe preview válido para aplicar.');
    }

    const importableClients = previewPayload.clients.filter(item => !item.isBlocked);
    if (!importableClients.length) {
      throw new Error('O preview so contem clientes bloqueados por ambiguidade de correspondencia.');
    }

    const now = Date.now();
    const uid = window.currentUser ? window.currentUser.uid : '';
    const profile = window.userProfile || {};
    const importedByName = profile.nomeCompleto || profile.nome || (window.currentUser && window.currentUser.email) || '';
    const anoVigencia = (opts && opts.anoVigencia) ? Number(opts.anoVigencia) : null;

    const existingSnapshots = await Promise.all(
      importableClients
        .filter(item => item.clientId)
        .map(item => collection().doc(item.clientId).get())
    );

    const existingMap = new Map();
    existingSnapshots.forEach(snap => {
      if (snap.exists) existingMap.set(snap.id, { id: snap.id, ...snap.data() });
    });

    const operations = [];
    const resultClients = [];

    importableClients.forEach(item => {
      const current = item.clientId ? existingMap.get(item.clientId) : null;
      const ref = current ? collection().doc(current.id) : collection().doc();
      const revision = {
        tipo: 'importacao',
        importedAt: now,
        importedBy: uid,
        importedByName,
        sourceFile: previewPayload.fileName,
        sourceSheet: previewPayload.sourceSheet,
        propostaDataRaw: item.propostaDataRaw || '',
        linhas: clone(item.linhas),
      };

      const revisoes = (current && Array.isArray(current.revisoes) ? current.revisoes.slice() : []);
      revisoes.push(revision);

      const data = {
        numeroCliente: item.numeroCliente || '',
        nome: item.nome,
        grupo: item.grupo || '',
        escritorioOrigem: item.escritorioOrigem || '',
        obs: item.obs || (current && current.obs) || '',
        ultimaPropostaRef: current && current.ultimaPropostaRef ? current.ultimaPropostaRef : '',
        ultimaPropostaData: item.propostaDataRaw || (current && current.ultimaPropostaData) || '',
        updatedAt: now,
        updatedBy: uid,
        updatedByName: importedByName,
        revisoes,
        precosAtuais: buildCurrentPricesMap(item.linhas),
        ultimaRevisaoResumo: {
          ...summarizeRevision(item.linhas),
          importedAt: now,
          importedByName,
          sourceFile: previewPayload.fileName,
        },
      };

      // Ano de vigência: snapshot do precos anterior + registo do novo ano
      if (anoVigencia) {
        const precosPorAno = clone((current && current.precosPorAno) || {});
        const anoAtual = current && current.anoVigenciaAtual;
        if (anoAtual && anoAtual !== anoVigencia && current.precosAtuais && Object.keys(current.precosAtuais).length) {
          precosPorAno[String(anoAtual)] = clone(current.precosAtuais);
        }
        precosPorAno[String(anoVigencia)] = data.precosAtuais;
        data.precosPorAno = precosPorAno;
        data.anoVigenciaAtual = anoVigencia;
      }

      if (!current) {
        data.createdAt = now;
        data.createdBy = uid;
        data.createdByName = importedByName;
      }

      operations.push({ ref, data });
      resultClients.push({
        id: ref.id,
        nome: item.nome,
        numeroCliente: item.numeroCliente || '',
        action: current ? 'updated' : 'created',
        totalCategorias: item.linhas.length,
      });
    });

    await commitBatches(operations);

    return {
      importedAt: now,
      sourceFile: previewPayload.fileName,
      totalClientes: resultClients.length,
      clients: resultClients,
    };
  }

  function getActorInfo() {
    const uid = window.currentUser ? window.currentUser.uid : '';
    const profile = window.userProfile || {};
    const name = profile.nomeCompleto || profile.nome || (window.currentUser && window.currentUser.email) || '';
    return { uid, name };
  }

  async function criarCliente(data) {
    if (!data || !data.nome) throw new Error('O nome do cliente é obrigatório.');
    const now = Date.now();
    const { uid, name } = getActorInfo();

    const ref = collection().doc();
    await ref.set({
      nome:             data.nome.trim(),
      numeroCliente:    (data.numeroCliente || '').trim(),
      grupo:            (data.grupo || '').trim(),
      escritorioOrigem: (data.escritorioOrigem || '').trim(),
      obs:              (data.obs || '').trim(),
      precosAtuais:     {},
      revisoes:         [],
      createdAt:        now,
      createdBy:        uid,
      createdByName:    name,
      updatedAt:        now,
      updatedBy:        uid,
      updatedByName:    name,
    });
    return ref.id;
  }

  async function updateCliente(id, data) {
    if (!id) throw new Error('ID de cliente em falta.');
    const now = Date.now();
    const { uid, name } = getActorInfo();

    const allowed = ['nome', 'numeroCliente', 'grupo', 'escritorioOrigem', 'obs'];
    const update = { updatedAt: now, updatedBy: uid, updatedByName: name };
    allowed.forEach(field => {
      if (data[field] !== undefined) update[field] = data[field];
    });

    await collection().doc(id).update(update);
  }

  async function updatePrecos(id, novasLinhas) {
    if (!id) throw new Error('ID de cliente em falta.');
    const now = Date.now();
    const { uid, name } = getActorInfo();

    const precosAtuais = buildCurrentPricesMap(novasLinhas);
    const revision = {
      tipo: 'edicao-manual',
      importedAt: now,
      importedBy: uid,
      importedByName: name,
      sourceFile: 'Edição manual',
      sourceSheet: '',
      propostaDataRaw: '',
      linhas: clone(novasLinhas),
    };

    const snap = await collection().doc(id).get();
    if (!snap.exists) throw new Error('Cliente não encontrado.');
    const current = snap.data();
    const revisoes = Array.isArray(current.revisoes) ? current.revisoes.slice() : [];
    revisoes.push(revision);

    await collection().doc(id).update({
      precosAtuais,
      revisoes,
      updatedAt: now,
      updatedBy: uid,
      updatedByName: name,
      ultimaRevisaoResumo: {
        ...summarizeRevision(novasLinhas),
        importedAt: now,
        importedByName: name,
        sourceFile: 'Edição manual',
      },
    });
  }

  async function criarProposta(id, payload) {
    if (!id) throw new Error('ID de cliente em falta.');
    const now = Date.now();
    const { uid, name } = getActorInfo();
    const data = payload || {};

    const revision = {
      tipo: 'proposta',
      importedAt: now,
      importedBy: uid,
      importedByName: name,
      sourceFile: 'Proposta manual',
      sourceSheet: '',
      aplicada: false,
      // Identificação da proposta
      referencia: data.referencia || '',
      parentReferencia: data.parentReferencia || '',
      versao: Number(data.versao) || 1,
      nomeProposta: data.nomeProposta || data.referencia || 'Proposta sem nome',
      propostaDataRaw: data.propostaDataRaw || data.dataProposta || '',
      anoVigencia: data.anoVigencia ? Number(data.anoVigencia) : null,
      nota: data.nota || '',
      // Cabeçalho / metadata
      cliente: data.cliente ? clone(data.cliente) : null,
      validade: data.validade ? clone(data.validade) : null,
      signatario: data.signatario ? clone(data.signatario) : null,
      gestor: data.gestor ? clone(data.gestor) : null,
      // Preços
      tableTypes: data.tableTypes ? clone(data.tableTypes) : { hora: true, coef: false },
      linhas: clone(data.linhas || []),
      coefRows: clone(data.coefRows || []),
      // Listas configuráveis
      majoracoes: clone(data.majoracoes || []),
      inclusoes: clone(data.inclusoes || []),
      respAlgartempo: clone(data.respAlgartempo || []),
      respEmpresa: clone(data.respEmpresa || []),
      termosEsq: clone(data.termosEsq || []),
      termosDir: clone(data.termosDir || []),
    };

    const snap = await collection().doc(id).get();
    if (!snap.exists) throw new Error('Cliente não encontrado.');
    const current = snap.data();
    const revisoes = Array.isArray(current.revisoes) ? current.revisoes.slice() : [];
    revisoes.push(revision);

    const updateData = {
      revisoes,
      updatedAt: now,
      updatedBy: uid,
      updatedByName: name,
    };
    if (revision.referencia) {
      updateData.ultimaPropostaRef = revision.referencia;
    }
    if (revision.propostaDataRaw) {
      updateData.ultimaPropostaData = revision.propostaDataRaw;
    }

    await collection().doc(id).update(updateData);
    return { revisaoIndex: revisoes.length - 1, referencia: revision.referencia };
  }

  async function atualizarProposta(id, revisaoIndex, payload) {
    if (!id) throw new Error('ID de cliente em falta.');
    const now = Date.now();
    const { uid, name } = getActorInfo();
    const data = payload || {};

    const snap = await collection().doc(id).get();
    if (!snap.exists) throw new Error('Cliente não encontrado.');
    const current = snap.data();
    const revisoes = Array.isArray(current.revisoes) ? current.revisoes.slice() : [];

    if (revisaoIndex < 0 || revisaoIndex >= revisoes.length) throw new Error('Índice de revisão inválido.');
    const existing = revisoes[revisaoIndex];
    if (!existing || existing.tipo !== 'proposta') throw new Error('A revisão selecionada não é uma proposta.');
    if (existing.aplicada) throw new Error('Propostas já aplicadas não podem ser editadas.');

    const merged = {
      ...existing,
      nomeProposta:     data.nomeProposta     !== undefined ? data.nomeProposta     : existing.nomeProposta,
      propostaDataRaw:  data.propostaDataRaw  !== undefined ? data.propostaDataRaw  : existing.propostaDataRaw,
      nota:             data.nota             !== undefined ? data.nota             : existing.nota,
      anoVigencia:      data.anoVigencia      !== undefined ? (data.anoVigencia ? Number(data.anoVigencia) : null) : existing.anoVigencia,
      cliente:          data.cliente          !== undefined ? clone(data.cliente)   : existing.cliente,
      validade:         data.validade         !== undefined ? clone(data.validade)  : existing.validade,
      signatario:       data.signatario       !== undefined ? clone(data.signatario): existing.signatario,
      gestor:           data.gestor           !== undefined ? clone(data.gestor)    : existing.gestor,
      tableTypes:       data.tableTypes       !== undefined ? clone(data.tableTypes): existing.tableTypes,
      linhas:           data.linhas           !== undefined ? clone(data.linhas)    : existing.linhas,
      coefRows:         data.coefRows         !== undefined ? clone(data.coefRows)  : existing.coefRows,
      majoracoes:       data.majoracoes       !== undefined ? clone(data.majoracoes): existing.majoracoes,
      inclusoes:        data.inclusoes        !== undefined ? clone(data.inclusoes) : existing.inclusoes,
      respAlgartempo:   data.respAlgartempo   !== undefined ? clone(data.respAlgartempo) : existing.respAlgartempo,
      respEmpresa:      data.respEmpresa      !== undefined ? clone(data.respEmpresa)    : existing.respEmpresa,
      termosEsq:        data.termosEsq        !== undefined ? clone(data.termosEsq) : existing.termosEsq,
      termosDir:        data.termosDir        !== undefined ? clone(data.termosDir) : existing.termosDir,
      atualizadoEm: now,
      atualizadoPor: name,
    };
    revisoes[revisaoIndex] = merged;

    const updateData = {
      revisoes,
      updatedAt: now,
      updatedBy: uid,
      updatedByName: name,
    };

    await collection().doc(id).update(updateData);
    return { revisaoIndex, referencia: merged.referencia };
  }

  function getClientePrefix(cliente) {
    const num = String((cliente && cliente.numeroCliente) || '').trim();
    if (num) {
      const safe = num.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      if (safe) return 'C' + safe;
    }
    const idSlice = String((cliente && cliente.id) || '').replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase();
    return 'CX' + (idSlice || 'NEW');
  }

  function nextRevisionNumber(revisoes, parentRef) {
    let maxV = 1;
    (revisoes || []).forEach(r => {
      if (!r || r.tipo !== 'proposta') return;
      if (r.parentReferencia === parentRef && r.versao) {
        maxV = Math.max(maxV, Number(r.versao) || 1);
      } else if (typeof r.referencia === 'string' && r.referencia.startsWith(parentRef + '/V')) {
        const m = r.referencia.match(/\/V(\d+)$/);
        if (m) maxV = Math.max(maxV, parseInt(m[1], 10));
      } else if (r.referencia === parentRef) {
        maxV = Math.max(maxV, 1);
      }
    });
    return maxV + 1;
  }

  async function gerarProximaReferencia(clienteId, opts) {
    if (!clienteId) throw new Error('ID de cliente em falta.');
    const options = opts || {};
    const ano = new Date().getFullYear();
    const ref = collection().doc(clienteId);

    // Modo revisão — não incrementa o contador, conta versões existentes
    if (options.parentReferencia) {
      const snap = await ref.get();
      if (!snap.exists) throw new Error('Cliente não encontrado.');
      const revisoes = snap.data().revisoes || [];
      const versao = nextRevisionNumber(revisoes, options.parentReferencia);
      return {
        referencia: options.parentReferencia + '/V' + versao,
        parentReferencia: options.parentReferencia,
        versao,
      };
    }

    // Original — transaction sobre o doc do cliente
    return db().runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Cliente não encontrado.');
      const cliente = snap.data();
      const counter = cliente.propostasContador || { ano: 0, ultimo: 0 };
      const mesmoAno = Number(counter.ano) === ano;
      const proximo = mesmoAno ? (Number(counter.ultimo || 0) + 1) : 1;
      const prefix = getClientePrefix({ id: clienteId, numeroCliente: cliente.numeroCliente });
      const padded = String(proximo).padStart(3, '0');
      const referencia = REFERENCIA_PREFIX + '-' + ano + '-' + prefix + '-' + padded;
      tx.update(ref, {
        propostasContador: { ano, ultimo: proximo, atualizadoEm: Date.now() },
      });
      return { referencia, parentReferencia: '', versao: 1 };
    });
  }

  async function getDefaultsProposta() {
    const ref = db().collection('config').doc(DEFAULTS_DOC);
    try {
      const snap = await ref.get();
      if (snap.exists) {
        const data = snap.data() || {};
        return mergeDefaultsWithFallback(data);
      }
    } catch (err) {
      console.warn('[ClientesService] getDefaultsProposta falhou, usar fallback:', err);
    }
    return mergeDefaultsWithFallback({});
  }

  async function setDefaultsProposta(data) {
    const ref = db().collection('config').doc(DEFAULTS_DOC);
    const now = Date.now();
    const { uid, name } = getActorInfo();
    await ref.set({
      ...data,
      atualizadoEm: now,
      atualizadoPor: name || uid || 'sistema',
    }, { merge: true });
  }

  // Fallback values — usados quando o doc não existe ou tem campos em falta.
  const PROPOSTA_FALLBACK_DEFAULTS = {
    signatario: { nome: 'Jorge Madeira', cargo: 'CEO · ALGARTEMPO' },
    gestores: [
      { nome: 'André Guerra',  cargo: 'Area Manager Porto',     telefone: '+351 961 508 131', email: 'andre.guerra@algartempo.pt',  escritorio: 'R. de Sacadura Cabral 118, 4050-169 Porto' },
      { nome: 'Cristina Cruz', cargo: 'Area Manager Lisboa',    telefone: '+351 966 089 425', email: 'cristina.cruz@algartempo.pt', escritorio: 'R. Ernesto da Silva 49, 1495-110 Algés' },
      { nome: 'Joana Bicho',   cargo: 'Area Manager Quarteira', telefone: '+351 962 422 529', email: 'joana.bicho@algartempo.pt',   escritorio: 'Avenida de Ceuta, Edifício A Nora, Lote 2, Loja 1, 8125-116 Quarteira' },
      { nome: 'José Silva',    cargo: 'Area Manager Portimão',  telefone: '+351 969 787 702', email: 'jose.silva@algartempo.pt',    escritorio: 'Av. 25 de Abril, lote 21 R/C B, 8500-511 Portimão' },
      { nome: 'Ricardo Ramos', cargo: 'Area Manager Albufeira', telefone: '+351 966 932 951', email: 'ricardo.ramos@algartempo.pt', escritorio: 'Rua do Movimento das Forças Armadas 74 loja B, 8200-019 Albufeira' },
    ],
    validade: { num: 30, unidade: 'dias' },
    coefRows: [
      { rubrica: 'Vencimento', coef: '1,80' },
      { rubrica: 'Outras rubricas tributáveis (ex: trab. suplementar ou nocturno)', coef: '1,42' },
      { rubrica: 'Outras rubricas não tributáveis (ex: valor de sub. de alimentação não tributável, abono de falhas)', coef: '1,07' },
      { rubrica: 'Ausência (baixas médicas, faltas e férias)', coef: '-1,25' },
    ],
    categoriasDefault: [
      'Bagageiro(a) / Porteiro(a)', 'Rececionista de Hotel',
      'Empregado(a) de Mesa 1.ª', 'Empregado(a) de Mesa 2.ª',
      'Chefe de Cozinha', 'Subchefe de Cozinha',
      'Cozinheiro(a) 1.ª', 'Cozinheiro(a) 2.ª', 'Cozinheiro(a) 3.ª',
      'Copeiro(a)', 'Empregado(a) de Limpeza', 'Governante(a)',
      'Empregado(a) de Manutenção', 'Piscineiro(a)', 'Polivalente', 'Operador(a) de Economato',
    ],
    majoracoes: [
      { titulo: 'Trabalho noturno',        descricao: 'Acréscimo de 50% sobre o valor/hora para horas trabalhadas entre as 00h00 e as 07h00.' },
      { titulo: 'Feriados obrigatórios',   descricao: 'Acréscimo de 100% sobre o valor/hora nos feriados nacionais e municipais oficialmente estabelecidos.' },
      { titulo: 'Trabalho suplementar',    descricao: 'Conforme Código do Trabalho: +25% na 1.ª hora extra, +37,5% nas seguintes e +50% em dia de descanso.' },
      { titulo: 'Subsídio de alimentação', descricao: 'Quando não fornecida em espécie, será faturado o valor praticado para colaboradores no mesmo posto na Empresa Utilizadora.' },
    ],
    inclusoes: [
      { titulo: 'Encargos Sociais',                descricao: 'Inclui Taxa Social Única (TSU) e demais encargos legais aplicáveis no âmbito do contrato de trabalho.' },
      { titulo: 'Seguro de acidentes de trabalho', descricao: 'Apólice obrigatória em nome da ALGARTEMPO para todos os trabalhadores colocados.' },
      { titulo: 'Recrutamento e Seleção',          descricao: 'Processo completo de triagem, entrevistas e validação documental, sem custos adicionais.' },
      { titulo: 'Gestão administrativa',           descricao: 'Contratos, recibos, declarações, renovações e comunicações legais.' },
      { titulo: 'Gestor de Conta Dedicado',        descricao: 'Acompanhamento contínuo com interlocutor único e tempo de resposta até 24 horas úteis.' },
    ],
    respAlgartempo: [
      { titulo: 'Recrutamento e seleção',          descricao: 'Apresentação de candidatos adequados à categoria profissional e função requisitada.' },
      { titulo: 'Celebração de contratos',         descricao: 'Celebração de contratos de trabalho temporário nos termos legais, incluindo a respetiva fundamentação do recurso.' },
      { titulo: 'Processamento salarial',          descricao: 'Processamento mensal de remunerações, retenções e demais obrigações fiscais e contributivas.' },
      { titulo: 'Seguro de acidentes de trabalho', descricao: 'Cobertura obrigatória durante todo o período de colocação.' },
      { titulo: 'Formação obrigatória',            descricao: 'Garantia da formação legalmente exigida em matéria de higiene, segurança e saúde no trabalho.' },
      { titulo: 'Substituição',                    descricao: 'Em caso de falta injustificada ou inadequação ao posto de trabalho, substituição no prazo máximo de 48 horas úteis.' },
    ],
    respEmpresa: [
      { titulo: 'Condições da colocação',        descricao: 'Categoria profissional, funções, horário, local de trabalho, data de início e fim e motivo justificativo do recurso ao trabalho temporário.' },
      { titulo: 'Acolhimento e integração',      descricao: 'Receção e integração do trabalhador, apresentação da equipa e enquadramento das tarefas.' },
      { titulo: 'Condições no local de trabalho',descricao: 'Garantia das condições de higiene, segurança e disponibilização do equipamento de proteção individual necessário.' },
      { titulo: 'Registo e validação de horas',  descricao: 'Confirmação quinzenal ou mensal das horas efetivamente prestadas.' },
      { titulo: 'Pagamento de faturas',          descricao: 'Liquidação das faturas nos termos acordados, no prazo de 30 dias após a data de emissão.' },
      { titulo: 'Comunicação de ocorrências',    descricao: 'Comunicação atempada à ALGARTEMPO de qualquer incidente, acidente ou situação de inadequação.' },
    ],
    termosEsq: [
      { titulo: 'Contratação direta',       descricao: 'A contratação direta de um trabalhador colocado pela ALGARTEMPO, dentro de 6 meses após o início da colocação, implica uma compensação equivalente a 1 mês da remuneração base bruta.' },
      { titulo: 'Rescisão antecipada',      descricao: 'Qualquer das partes pode terminar a colocação antecipadamente com 10 dias úteis de aviso prévio escrito, ou 30 dias em colocações superiores a 6 meses. O incumprimento deste prazo implica o pagamento do período em falta.' },
      { titulo: 'Processamento de ausências',descricao: 'Faltas justificadas por nojo, casamento ou dispensas autorizadas são faturadas normalmente, sem acréscimos ou deduções.' },
    ],
    termosDir: [
      { titulo: 'Condições de pagamento',    descricao: 'Faturação quinzenal ou mensal, conforme acordado. Pagamento a 30 dias. Atrasos ficam sujeitos a juros legais. Em caso de incumprimento do prazo de pagamento, a ALGARTEMPO reserva-se o direito de suspender os serviços mediante pré-aviso de 24 horas.' },
      { titulo: 'Confidencialidade',         descricao: 'Toda a informação partilhada entre as partes é confidencial durante a vigência do acordo e nos 3 anos seguintes.' },
      { titulo: 'Proteção de dados',         descricao: 'Os dados pessoais são tratados em conformidade com o Regulamento (UE) 2016/679 (RGPD) e a Lei n.º 58/2019, exclusivamente para efeitos da presente prestação de serviços.' },
      { titulo: 'Limite de responsabilidade',descricao: 'A ALGARTEMPO responde pelas obrigações assumidas nesta proposta. Informações incorretas da Empresa Utilizadora ou casos de força maior estão fora desse âmbito. Em qualquer situação, as partes comprometem-se a encontrar uma solução em conjunto.' },
    ],
  };

  function mergeDefaultsWithFallback(data) {
    const out = {};
    Object.keys(PROPOSTA_FALLBACK_DEFAULTS).forEach(key => {
      const incoming = data ? data[key] : undefined;
      if (incoming === undefined || incoming === null) {
        out[key] = clone(PROPOSTA_FALLBACK_DEFAULTS[key]);
      } else {
        out[key] = Array.isArray(incoming) || typeof incoming === 'object' ? clone(incoming) : incoming;
      }
    });
    return out;
  }

  async function aplicarProposta(id, revisaoIndex) {
    if (!id) throw new Error('ID de cliente em falta.');
    const now = Date.now();
    const { uid, name } = getActorInfo();

    const snap = await collection().doc(id).get();
    if (!snap.exists) throw new Error('Cliente não encontrado.');
    const current = snap.data();
    const revisoes = Array.isArray(current.revisoes) ? current.revisoes.slice() : [];

    if (revisaoIndex < 0 || revisaoIndex >= revisoes.length) throw new Error('Índice de revisão inválido.');
    const proposta = revisoes[revisaoIndex];
    if (!proposta || proposta.tipo !== 'proposta') throw new Error('A revisão selecionada não é uma proposta.');

    const linhas = proposta.linhas || [];
    const novosPrecos = buildCurrentPricesMap(linhas);
    const anoVigencia = proposta.anoVigencia ? Number(proposta.anoVigencia) : null;

    // ── Preços por ano ──────────────────────────────────────────
    const precosPorAno = clone(current.precosPorAno || {});

    if (anoVigencia) {
      // Guardar snapshot dos preços actuais sob o seu ano de vigência
      const anoAtual = current.anoVigenciaAtual || null;
      const anoSnapshot = anoAtual && anoAtual !== anoVigencia
        ? anoAtual
        : (anoVigencia - 1); // fallback: ano anterior ao da proposta
      if (current.precosAtuais && Object.keys(current.precosAtuais).length) {
        precosPorAno[String(anoSnapshot)] = clone(current.precosAtuais);
      }
      // Guardar os novos preços sob o ano de vigência da proposta
      precosPorAno[String(anoVigencia)] = novosPrecos;
    }

    revisoes[revisaoIndex] = { ...proposta, aplicada: true, aplicadaAt: now, aplicadaPor: name };

    const updatePayload = {
      precosAtuais: novosPrecos,
      revisoes,
      updatedAt: now,
      updatedBy: uid,
      updatedByName: name,
      ultimaRevisaoResumo: {
        ...summarizeRevision(linhas),
        importedAt: now,
        importedByName: name,
        sourceFile: proposta.nomeProposta || 'Proposta',
      },
    };
    if (anoVigencia) {
      updatePayload.precosPorAno = precosPorAno;
      updatePayload.anoVigenciaAtual = anoVigencia;
    }

    await collection().doc(id).update(updatePayload);
  }

  function listenAll(options) {
    const cfg = options || {};
    const onData = cfg.onData || function() {};
    const onError = cfg.onError || function() {};

    const primary = collection().orderBy('nome', 'asc').onSnapshot(snap => {
      onData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, err => {
      console.warn('[ClientesService] orderBy fallback:', err);
      const fallback = collection().onSnapshot(snap => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-PT'));
        onData(list);
      }, onError);

      if (typeof cfg.onFallback === 'function') cfg.onFallback(fallback);
    });

    return primary;
  }

  async function listClientes() {
    return fetchExistingClientes();
  }

  async function getCliente(id) {
    if (!id) throw new Error('ID de cliente em falta.');
    const snap = await collection().doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }

  window.ClientesService = {
    listenAll,
    listClientes,
    getCliente,
    previewImport,
    applyImport,
    criarCliente,
    updateCliente,
    updatePrecos,
    criarProposta,
    atualizarProposta,
    aplicarProposta,
    gerarProximaReferencia,
    getDefaultsProposta,
    setDefaultsProposta,
    fallbackDefaults: clone(PROPOSTA_FALLBACK_DEFAULTS),
  };
})();
