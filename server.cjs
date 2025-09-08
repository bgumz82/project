const express = require('express');
const compression = require('compression');
const path = require('path');
const helmet = require('helmet');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const cors = require('cors');
const xml2js = require('xml2js');

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Configurar CORS
app.use(cors());

// FORÇA O BANCO CORRETO - HARDCODED PARA GARANTIR FUNCIONAMENTO
const FORCE_DATABASE_URL = 'postgres://postgres:bytecross8682@db.systemtruck.com.br:5454/frota_management';

// Configurar pool de conexão com o banco
const pool = new Pool({
  connectionString: FORCE_DATABASE_URL,
  ssl: false
});

console.log('🔍 FORÇADO DATABASE_URL:', FORCE_DATABASE_URL);

// Pool principal para usuários e permissões (sempre frota_management)
const mainPool = pool; // O pool principal já está configurado para frota_management

// Testar conexão com o banco
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
  } else {
    console.log('Conexão com o banco de dados estabelecida com sucesso');
  }
});

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Compressão gzip
app.use(compression());

// Parse JSON bodies
app.use(express.json());

// Middleware para logging de requisições
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Servir arquivos estáticos com cache
app.use(express.static('dist', {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Criar pasta uploads se não existir
const uploadsDir = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadsDir)) {
  require('fs').mkdirSync(uploadsDir, { recursive: true });
}

// Servir uploads com cache
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Middleware para verificar JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  if (!JWT_SECRET) {
    console.error('JWT_SECRET não configurado');
    return res.status(500).json({ error: 'Erro de configuração do servidor' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Depois adicionar o endpoint:
app.post('/api/consultar-nfe', async (req, res) => {
  try {
    const { chaveNFE } = req.body;

    if (!chaveNFE || chaveNFE.length !== 44) {
      return res.status(400).json({ error: 'Chave de acesso NF-e deve ter 44 dígitos' });
    }
    const token = '44B4845C-05F4-7E99-2DFF-8EAE5746E9BA';
    const url = `https://www.roveri.inf.br/consultas/nfe.php?token=${token}&chave=${chaveNFE}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Fleet-Management-System/1.0',
        'Accept': 'application/json, text/plain, */*'
      }
    });
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
    }
    const responseText = await response.text();
    console.log('📄 Resposta do webservice:', responseText);

    // Verificar se é um erro em formato de mensagem
    if (responseText.includes('Chave inválida') || responseText.includes('erro') || responseText.includes('error')) {
      throw new Error(`Erro do webservice: ${responseText}`);
    }

    // Tentar fazer parse como JSON primeiro
    let nfeData;
    try {
      nfeData = JSON.parse(responseText);
      console.log('✅ Dados JSON recebidos:', nfeData);
    } catch (jsonError) {
      // Se não for JSON válido, assumir que é XML
      if (responseText.includes('<?xml')) {
        console.log('📄 Resposta em formato XML, fazendo parse...');
        const parser = new xml2js.Parser({ explicitArray: false });
        const parsed = await parser.parseStringPromise(responseText);

        // Extrair dados principais da NF-e
        const infNFe = parsed?.nfeProc?.NFe?.infNFe || parsed?.NFe?.infNFe;

        if (infNFe) {
          nfeData = {
            remetente: {
              razao_social: infNFe.emit?.xNome || '',
              cnpj: infNFe.emit?.CNPJ || '',
              ie: infNFe.emit?.IE || '',
              endereco: `${infNFe.emit?.enderEmit?.xLgr || ''}, ${infNFe.emit?.enderEmit?.nro || ''}`,
              cidade: infNFe.emit?.enderEmit?.xMun || '',
              estado: infNFe.emit?.enderEmit?.UF || '',
              cep: infNFe.emit?.enderEmit?.CEP || ''
            },
            destinatario: {
              razao_social: infNFe.dest?.xNome || '',
              cnpj: infNFe.dest?.CNPJ || '',
              ie: infNFe.dest?.IE || '',
              endereco: `${infNFe.dest?.enderDest?.xLgr || ''}, ${infNFe.dest?.enderDest?.nro || ''}`,
              cidade: infNFe.dest?.enderDest?.xMun || '',
              estado: infNFe.dest?.enderDest?.UF || '',
              cep: infNFe.dest?.enderDest?.CEP || ''
            },
            produto: {
              descricao: Array.isArray(infNFe.det) ? infNFe.det[0]?.prod?.xProd : infNFe.det?.prod?.xProd || '',
              codigo_ncm: Array.isArray(infNFe.det) ? infNFe.det[0]?.prod?.NCM : infNFe.det?.prod?.NCM || '',
              valor_total: parseFloat(infNFe.total?.ICMSTot?.vNF || 0),
              peso_total: parseFloat(infNFe.total?.ICMSTot?.vPeso || 0),
              quantidade_total: Array.isArray(infNFe.det) ?
                infNFe.det.reduce((acc, item) => acc + parseFloat(item.prod?.qCom || 0), 0) :
                parseFloat(infNFe.det?.prod?.qCom || 0)
            },
            transporte: {
              valor_frete: parseFloat(infNFe.total?.ICMSTot?.vFrete || 0),
              modal_transporte: infNFe.transp?.modFrete || '1'
            },
            numero_nfe: infNFe.ide?.nNF || '',
            serie: infNFe.ide?.serie || '',
            data_emissao: infNFe.ide?.dhEmi || infNFe.ide?.dEmi || '',
            chave_acesso: chaveNFE,
            observacoes: infNFe.infAdic?.infCpl || ''
          };
        } else {
          throw new Error('XML da NF-e não possui estrutura válida');
        }
      } else {
        throw new Error(`Resposta não é JSON nem XML válido: ${responseText}`);
      }
    }

    console.log('✅ Dados da NF-e processados:', nfeData);
    res.json(nfeData);
  } catch (error) {
    res.status(500).json({
      error: 'Erro ao consultar NF-e no webservice',
      details: error.message
    });
  }
});

// Endpoint para buscar todos os cadastros (SEM autenticação para funcionar no frontend)
app.get('/cadastros-publico', async (req, res) => {
  try {
    console.log('🔍 Buscando todos os cadastros no banco local');

    const result = await pool.query(`
      SELECT
        id,
        tipo,
        razao_social,
        cnpj,
        ie,
        endereco,
        cidade,
        estado,
        cep,
        telefone,
        emails,
        ativo,
        created_at,
        updated_at
      FROM cadastros
      WHERE ativo = true
      ORDER BY razao_social
    `);

    console.log('✅ Cadastros encontrados no banco local:', result.rows.length);

    const cadastros = result.rows.map(cadastro => ({
      ...cadastro,
      emails: Array.isArray(cadastro.emails) ? cadastro.emails : []
    }));

    res.json(cadastros);
  } catch (error) {
    console.error('❌ Erro ao buscar cadastros:', error);
    res.status(500).json({
      error: 'Erro ao buscar cadastros no banco de dados',
      details: error.message
    });
  }
});

// Endpoint para verificar se cliente existe por CNPJ
app.get('/api/verificar-cliente/:cnpj', async (req, res) => {
  try {
    const { cnpj } = req.params;

    if (!cnpj) {
      return res.status(400).json({ error: 'CNPJ é obrigatório' });
    }

    const result = await pool.query(`
      SELECT
        id,
        tipo,
        razao_social,
        cnpj,
        endereco,
        cidade,
        estado,
        cep
      FROM cadastros
      WHERE cnpj = $1 AND tipo = 'cliente' AND ativo = true
    `, [cnpj]);

    if (result.rows.length > 0) {
      console.log('✅ Cliente encontrado:', result.rows[0].razao_social);
      res.json({ exists: true, cliente: result.rows[0] });
    } else {
      console.log('❌ Cliente não encontrado para CNPJ:', cnpj);
      res.json({ exists: false });
    }
  } catch (error) {
    console.error('❌ Erro ao verificar cliente:', error);
    res.status(500).json({
      error: 'Erro ao verificar cliente no banco de dados',
      details: error.message
    });
  }
});

// Endpoint para cadastrar cliente automaticamente da NF-e
app.post('/api/cadastrar-cliente-nfe', async (req, res) => {
  try {
    const { dadosCliente } = req.body;

    if (!dadosCliente || !dadosCliente.razao_social || !dadosCliente.cnpj) {
      return res.status(400).json({ error: 'Dados do cliente são obrigatórios' });
    }

    // Verificar se já existe
    const existingResult = await pool.query(`
      SELECT id FROM cadastros WHERE cnpj = $1
    `, [dadosCliente.cnpj]);

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Cliente já cadastrado no sistema' });
    }

    // Preparar dados para inserção
    const insertData = [
      'cliente',
      dadosCliente.razao_social,
      dadosCliente.cnpj,
      dadosCliente.endereco || '',
      dadosCliente.cidade || '',
      dadosCliente.estado || 'GO',
      dadosCliente.cep || '',
      JSON.stringify([]), // Array vazio para emails
      true
    ];

    console.log('📝 SQL INSERT que será executado:');
    console.log(`INSERT INTO cadastros (
      tipo,
      razao_social,
      cnpj,
      endereco,
      cidade,
      estado,
      cep,
      emails,
      ativo,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`);
    console.log('📊 Dados do INSERT:', insertData);

    // Cadastrar novo cliente
    const result = await pool.query(`
      INSERT INTO cadastros (
        tipo,
        razao_social,
        cnpj,
        endereco,
        cidade,
        estado,
        cep,
        emails,
        ativo,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, insertData);

    if (result.rows.length > 0) {
      console.log('✅ Cliente cadastrado automaticamente:', result.rows[0].razao_social);
      res.json({
        success: true,
        cliente: result.rows[0],
        message: 'Cliente cadastrado com sucesso a partir da NF-e'
      });
    } else {
      throw new Error('Falha ao inserir cliente no banco de dados');
    }
  } catch (error) {
    console.error('❌ Erro ao cadastrar cliente:', error);
    res.status(500).json({
      error: 'Erro ao cadastrar cliente automaticamente',
      details: error.message
    });
  }
});

// Rotas de autenticação
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('Tentativa de login para:', email);

    // Verificar se email e senha foram fornecidos
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const userResult = await pool.query(`
      SELECT id, email, nome, tipo, ativo,
             senha
      FROM usuarios
      WHERE email = $1
    `, [email]);

    if (userResult.rows.length === 0) {
      console.log('Usuário não encontrado:', email);
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const user = userResult.rows[0];

    if (!user.ativo) {
      console.log('Usuário inativo:', email);
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    // Verificar se o usuário tem senha
    if (!user.senha) {
      console.error('Usuário sem senha:', email);
      return res.status(500).json({ error: 'Erro na configuração do usuário' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.senha);
    if (!validPassword) {
      console.log('Senha inválida para:', email);
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    // Verificar se JWT_SECRET está definido
    if (!JWT_SECRET) {
      console.error('JWT_SECRET não configurado');
      return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }

    // Gerar token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        tipo: user.tipo
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remover senha do objeto de resposta
    delete user.senha;

    console.log('Login bem-sucedido para:', email);

    res.json({
      user,
      session: {
        access_token: token,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Rota para criar usuários (signup) - VERSÃO CORRIGIDA
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, nome, tipo } = req.body;

  try {
    console.log('Tentativa de criação de usuário:', email);

    // Verificar se todos os campos obrigatórios foram fornecidos
    if (!email || !password || !nome || !tipo) {
      return res.status(400).json({ error: 'Email, senha, nome e tipo são obrigatórios' });
    }

    // Verificar se o usuário já existe
    const existingUser = await pool.query(`
      SELECT id FROM usuarios WHERE email = $1
    `, [email]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    // Criptografar senha
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Criar usuário - deixar os triggers do banco gerenciarem as permissões
    const result = await pool.query(`
      INSERT INTO usuarios (email, nome, tipo, senha, ativo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      RETURNING id, email, nome, tipo, created_at
    `, [email, nome, tipo, hashedPassword]);

    const newUser = result.rows[0];

    console.log('Usuário criado com sucesso:', email);

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        nome: newUser.nome,
        tipo: newUser.tipo,
        ativo: true,
        created_at: newUser.created_at
      },
      message: 'Usuário criado com sucesso'
    });

  } catch (error) {
    console.error('Erro na criação do usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  const { token } = req.body;

  try {
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    if (!JWT_SECRET) {
      console.error('JWT_SECRET não configurado');
      return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(`
      SELECT id, email, nome, tipo, ativo
      FROM usuarios
      WHERE id = $1
    `, [decoded.id]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];

    if (!user.ativo) {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    res.json({
      id: user.id,
      email: user.email,
      nome: user.nome,
      tipo: user.tipo
    });
  } catch (error) {
    console.error('Erro na verificação do token:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logout realizado com sucesso' });
});

// Rota para alterar senha
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    console.log('🔐 Recebida requisição para alterar senha do usuário:', userId);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    // Buscar usuário atual
    const userResult = await pool.query(`
      SELECT id, email, senha
      FROM usuarios
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];

    // Verificar senha atual
    const validCurrentPassword = await bcrypt.compare(currentPassword, user.senha);
    if (!validCurrentPassword) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    // Criptografar nova senha
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Atualizar senha no banco
    await pool.query(`
      UPDATE usuarios
      SET senha = $1, updated_at = NOW()
      WHERE id = $2
    `, [hashedNewPassword, userId]);

    console.log('✅ Senha alterada com sucesso para usuário:', user.email);

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao alterar senha:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
    )
  }
}
)

// Rota para testar conexão com banco de dados
app.post('/api/database-config/test-connection', authenticateToken, async (req, res) => {
  try {
    const config = req.body;
    console.log('🔍 Testando conexão com banco de dados:', config.host);

    // Criar pool de conexão temporário para teste
    const { Pool } = require('pg');
    const testPool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database_name,
      user: config.username,
      password: config.password,
      ssl: config.ssl_enabled ? { rejectUnauthorized: false } : false,
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
    });

    try {
      // Testar conexão básica
      const client = await testPool.connect();
      await client.query('SELECT NOW()');

      console.log('✅ Conexão testada com sucesso, criando estrutura...');

      // Criar estrutura do banco de dados
      await createDatabaseStructure(client);

      client.release();

      console.log('✅ Estrutura do banco criada com sucesso');
      res.json({
        success: true,
        message: 'Conexão testada e estrutura criada com sucesso'
      });
    } finally {
      await testPool.end();
    }
  } catch (error) {
    console.error('❌ Erro no teste de conexão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao testar conexão com banco de dados',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Função para criar estrutura completa do banco de dados
async function createDatabaseStructure(client) {
  try {
    console.log('📦 Criando extensões...');
    // 1. Criar extensões necessárias
    await createExtensions(client);

    console.log('🏷️ Criando enums...');
    // 2. Criar enums
    await createEnums(client);

    console.log('🗃️ Criando tabelas...');
    // 3. Criar tabelas principais
    await createTables(client);

    console.log('🔧 Ajustando estrutura de cte_produtos...');
    // 3.5. Ajustar estrutura de cte_produtos
    await ensureCteProductsStructure(client);

    console.log('🔗 Criando foreign keys...');
    // 4. Criar foreign keys
    await createForeignKeys(client);

    console.log('📊 Criando índices...');
    // 5. Criar índices
    await createIndexes(client);

    console.log('⚙️ Criando funções e triggers...');
    // 6. Criar funções e triggers
    await createFunctionsAndTriggers(client);

    console.log('📝 Inserindo dados iniciais...');
    // 7. Inserir dados iniciais
    await insertInitialData(client);

    console.log('✅ Estrutura do banco de dados criada com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar estrutura do banco:', error);
    throw error;
  }
}

// Função para criar extensões
async function createExtensions(client) {
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ Extensão uuid-ossp criada/verificada');
  } catch (error) {
    console.log('⚠️ Erro ao criar extensão:', error.message);
  }
}

// Função para criar enums
async function createEnums(client) {
  const enums = [
    {
      name: 'tipo_usuario',
      values: ['admin', 'operador_checklist', 'operador_abastecimento']
    },
    {
      name: 'cadastro_tipo',
      values: ['cliente', 'fornecedor', 'abastecimento']
    },
    {
      name: 'veiculo_status',
      values: ['ativo', 'inativo', 'manutencao', 'vendido']
    },
    {
      name: 'tipo_combustivel_veiculo',
      values: ['diesel_s10', 'diesel_s500', 'gasolina', 'etanol', 'flex']
    }
  ];

  for (const enumDef of enums) {
    try {
      // Verificar se o enum já existe
      const enumExists = await client.query(
        "SELECT 1 FROM pg_type WHERE typname = $1",
        [enumDef.name]
      );

      if (enumExists.rows.length === 0) {
        const enumValues = enumDef.values.map(v => `'${v}'`).join(', ');
        await client.query(`CREATE TYPE ${enumDef.name} AS ENUM (${enumValues})`);
        console.log(`✅ Enum ${enumDef.name} criado`);
      } else {
        console.log(`✅ Enum ${enumDef.name} já existe`);
      }
    } catch (error) {
      console.log(`⚠️ Erro ao criar enum ${enumDef.name}:`, error.message);
    }
  }
}

// Função para criar tabelas
async function createTables(client) {
  const tables = [
    {
      name: 'usuarios',
      query: `
        CREATE TABLE IF NOT EXISTS usuarios (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email varchar(255) UNIQUE NOT NULL,
          nome varchar(255) NOT NULL,
          tipo tipo_usuario NOT NULL,
          senha varchar(255),
          database_config_id uuid,
          ativo boolean DEFAULT true,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'veiculos',
      query: `
        CREATE TABLE IF NOT EXISTS veiculos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          placa varchar(10) NOT NULL UNIQUE,
          tipo varchar(50) NOT NULL CHECK (tipo IN ('carro', 'caminhao', 'maquina_pesada', 'implementos', 'onibus', 'bi_trem_1_reboque', 'bi_trem_2_reboque', 'vanderleia_3_eixos', 'vanderleia_4_eixos', 'julieta')),
          marca varchar(100) NOT NULL,
          modelo varchar(100) NOT NULL,
          ano integer NOT NULL,
          qrcode_data varchar(255) NOT NULL,
          renavam text,
          chassis text,
          uf_registro text DEFAULT 'SP',
          cor text DEFAULT 'Não informado',
          tara_kg decimal(10,2),
          carga_kg decimal(10,2),
          status veiculo_status DEFAULT 'ativo',
          tipo_combustivel tipo_combustivel_veiculo DEFAULT 'gasolina',
          validade_tacografo date,
          ativo boolean DEFAULT true,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'cadastros',
      query: `
        CREATE TABLE IF NOT EXISTS cadastros (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tipo cadastro_tipo NOT NULL,
          razao_social text NOT NULL,
          cnpj text,
          ie text,
          endereco text NOT NULL DEFAULT '',
          cidade text NOT NULL DEFAULT '',
          estado text NOT NULL DEFAULT 'SP',
          cep text NOT NULL DEFAULT '',
          telefone text,
          emails jsonb NOT NULL DEFAULT '[]'::jsonb,
          ativo boolean NOT NULL DEFAULT true,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'abastecimentos',
      query: `
        CREATE TABLE IF NOT EXISTS abastecimentos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          veiculo_id uuid NOT NULL,
          operador_id uuid NOT NULL,
          posto_id uuid NOT NULL,
          tipo_combustivel varchar(20) NOT NULL CHECK (tipo_combustivel IN ('gasolina', 'diesel', 'etanol', 'gnv')),
          litros decimal(10,3) NOT NULL,
          valor_total decimal(10,2) NOT NULL,
          data_abastecimento timestamptz NOT NULL DEFAULT now(),
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'manutencoes',
      query: `
        CREATE TABLE IF NOT EXISTS manutencoes (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          veiculo_id uuid NOT NULL,
          tipo varchar(100) NOT NULL,
          descricao text NOT NULL,
          data_prevista date NOT NULL,
          data_realizada date,
          alerta_enviado boolean DEFAULT false,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'checklists',
      query: `
        CREATE TABLE IF NOT EXISTS checklists (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          veiculo_id uuid NOT NULL,
          operador_id uuid NOT NULL,
          data_checklist timestamptz NOT NULL DEFAULT now(),
          itens jsonb NOT NULL,
          observacoes text,
          email_enviado boolean DEFAULT false,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'funcionarios',
      query: `
        CREATE TABLE IF NOT EXISTS funcionarios (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          nome varchar(255) NOT NULL,
          cpf varchar(14) UNIQUE NOT NULL,
          rg varchar(20) NOT NULL,
          matricula varchar(50) UNIQUE NOT NULL,
          data_admissao date NOT NULL,
          data_nascimento date NOT NULL,
          telefone varchar(20),
          foto_url text,
          funcao varchar(100) NOT NULL DEFAULT 'administrativo',
          cnh text,
          validade_cnh date,
          status varchar(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'ferias')),
          ativo boolean DEFAULT true,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'user_permissions',
      query: `
        CREATE TABLE IF NOT EXISTS user_permissions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL,
          module text NOT NULL,
          can_access boolean DEFAULT true,
          can_create boolean DEFAULT false,
          can_edit boolean DEFAULT false,
          can_delete boolean DEFAULT false,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          UNIQUE(user_id, module)
        )
      `
    },
    {
      name: 'centros_custo',
      query: `
        CREATE TABLE IF NOT EXISTS centros_custo (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          nome varchar(255) NOT NULL,
          descricao text,
          ativo boolean DEFAULT true,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'contas_pagar',
      query: `
        CREATE TABLE IF NOT EXISTS contas_pagar (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          descricao text NOT NULL,
          valor decimal(10,2) NOT NULL,
          data_vencimento date NOT NULL,
          data_pagamento date,
          centro_custo_id text NOT NULL,
          fornecedor varchar(255) NOT NULL,
          status varchar(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
          observacao text,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'contas_receber',
      query: `
        CREATE TABLE IF NOT EXISTS contas_receber (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          descricao text NOT NULL,
          valor decimal(10,2) NOT NULL,
          data_vencimento date NOT NULL,
          data_recebimento date,
          centro_custo_id text NOT NULL,
          cliente varchar(255) NOT NULL,
          status varchar(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'cancelado')),
          observacao text,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'registros_antt',
      query: `
        CREATE TABLE IF NOT EXISTS registros_antt (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          veiculo_id uuid NOT NULL,
          cnpj text NOT NULL,
          antt text NOT NULL,
          razao_social_proprietario text NOT NULL,
          inscricao_estadual text,
          uf_registro text NOT NULL,
          empresa_proprietario boolean NOT NULL,
          ativo boolean DEFAULT true,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'checklist_fotos',
      query: `
        CREATE TABLE IF NOT EXISTS checklist_fotos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          checklist_id uuid NOT NULL,
          tipo varchar(50) NOT NULL,
          url text NOT NULL,
          created_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'states',
      query: `
        CREATE TABLE IF NOT EXISTS states (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          uf varchar(2) UNIQUE NOT NULL,
          name varchar(255) NOT NULL,
          created_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'cities',
      query: `
        CREATE TABLE IF NOT EXISTS cities (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          cod_city varchar(7) UNIQUE NOT NULL,
          name varchar(255) NOT NULL,
          state_id uuid NOT NULL,
          created_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'empresas_fiscais',
      query: `
        CREATE TABLE IF NOT EXISTS empresas_fiscais (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          razao_social varchar(255) NOT NULL,
          nome_fantasia varchar(255),
          cnpj varchar(18) UNIQUE NOT NULL,
          inscricao_estadual varchar(20),
          inscricao_municipal varchar(20),
          endereco varchar(255),
          cidade varchar(100),
          estado varchar(2),
          cep varchar(10),
          telefone varchar(20),
          email varchar(255),
          regime_tributario varchar(50) DEFAULT 'Simples Nacional',
          certidao_ssl_path text,
          certidao_ssl_password text,
          certificado_a1_path text,
          certificado_a1_password text,
          certificado_a3_token text,
          certificado_a3_pin text,
          certificado_a3_password text,
          uf_emissao_nfe varchar(2) DEFAULT 'SP',
          ambiente_nfce varchar(10) DEFAULT '1' CHECK (ambiente_nfce IN ('1', '2')),
          ambiente_cte varchar(10) DEFAULT '1' CHECK (ambiente_cte IN ('1', '2')),
          numero_ult_nfce integer DEFAULT 0,
          numero_ult_cte integer DEFAULT 0,
          proximo_numero_cte integer DEFAULT 1,
          serie_padrao_nfce varchar(3) DEFAULT '1',
          serie_padrao_cte varchar(3) DEFAULT '1',
          status varchar(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'cte_documentos',
      query: `
        CREATE TABLE IF NOT EXISTS cte_documentos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          empresa_id uuid NOT NULL,
          numero_cte varchar(10) NOT NULL,
          serie varchar(3) NOT NULL,
          data_emissao timestamptz NOT NULL DEFAULT now(),
          status varchar(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'autorizado', 'cancelado', 'inutilizado')),
          chave_acesso_completa varchar(44),
          chave_acesso_1 varchar(11),
          chave_acesso_2 varchar(11),
          chave_acesso_3 varchar(11),
          chave_acesso_4 varchar(11),
          valor_total_prestacao decimal(12,2),
          valor_receber decimal(12,2),
          valor_tributos decimal(12,2),
          valor_carga decimal(12,2),
          quantidade_carga integer,
          observacoes text,
          tomador_id varchar(20),
          remetente_id uuid,
          recebedor_id uuid,
          destinatario_id uuid,
          icms_situacao_tributaria varchar(5),
          icms_bc_valor decimal(12,2),
          icms_aliquota decimal(5,2),
          icms_valor decimal(12,2),
          valor_pedagio decimal(10,2),
          valor_seguro decimal(10,2),
          tipo_servico varchar(2) DEFAULT '00',
          finalidade_cte varchar(1) DEFAULT '0',
          cfop varchar(4) DEFAULT '5352',
          cidade_inicio_ibge varchar(7),
          cidade_termino_ibge varchar(7),
          uf_inicio varchar(2),
          uf_termino varchar(2),
          cidade_inicio_nome varchar(255),
          cidade_termino_nome varchar(255),
          rntrc varchar(20),
          motorista_nome varchar(255),
          motorista_cnh varchar(20),
          motorista_matricula varchar(50),
          motorista_validade_cnh date,
          placa_veiculo varchar(10),
          placa_reboque varchar(10),
          associacao_frota_id uuid,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'cte_produtos',
      query: `
        CREATE TABLE IF NOT EXISTS cte_produtos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          cte_documento_id uuid,
          sequencia integer NOT NULL DEFAULT 1,
          codigo_produto varchar(50),
          descricao_produto text NOT NULL,
          ncm_produto varchar(15),
          quantidade decimal(12,4),
          unidade_medida varchar(10),
          valor_bruto_kg decimal(12,2),
          valor_carga decimal(12,2),
          cfop varchar(4),
          valor_seguro decimal(12,2),
          valor_frete decimal(12,2),
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'cte_nfe_relacionadas',
      query: `
        CREATE TABLE IF NOT EXISTS cte_nfe_relacionadas (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          cte_documento_id uuid NOT NULL,
          chave_acesso varchar(44) NOT NULL,
          CONSTRAINT fk_cte_documento
            FOREIGN KEY(cte_documento_id)
            REFERENCES cte_documentos(id)
            ON DELETE CASCADE
        )
      `
    },
    {
      name: 'cte_outros_valores',
      query: `
        CREATE TABLE IF NOT EXISTS cte_outros_valores (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          cte_documento_id uuid NOT NULL,
          tipo_valor varchar(50),
          percentual decimal(5,2),
          valor decimal(12,2) NOT NULL,
          CONSTRAINT fk_cte_documento
            FOREIGN KEY(cte_documento_id)
            REFERENCES cte_documentos(id)
            ON DELETE CASCADE
        )
      `
    },
    {
      name: 'cte_componentes_redespacho',
      query: `
        CREATE TABLE IF NOT EXISTS cte_componentes_redespacho (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          cte_documento_id uuid NOT NULL,
          sequencia integer NOT NULL,
          cidade_prestacao_id uuid,
          cidade_prestacao_nome varchar(255),
          uf_prestacao varchar(2),
          valor_prestacao decimal(12,2),
          CONSTRAINT fk_cte_documento
            FOREIGN KEY(cte_documento_id)
            REFERENCES cte_documentos(id)
            ON DELETE CASCADE
        )
      `
    },
    {
      name: 'cte_remetente',
      query: `
        CREATE TABLE IF NOT EXISTS cte_remetente (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          cte_documento_id uuid NOT NULL,
          nome_razao_social varchar(255) NOT NULL,
          cnpj_cpf varchar(18) NOT NULL,
          ie varchar(20),
          telefone varchar(20),
          email varchar(255),
          endereco_logradouro varchar(255),
          endereco_numero varchar(20),
          endereco_complemento varchar(100),
          endereco_bairro varchar(100),
          endereco_cidade_id uuid,
          endereco_cidade_nome varchar(255),
          endereco_uf varchar(2),
          endereco_cep varchar(10),
          CONSTRAINT fk_cte_documento
            FOREIGN KEY(cte_documento_id)
            REFERENCES cte_documentos(id)
            ON DELETE CASCADE
        )
      `
    },
    {
      name: 'cte_recebedor',
      query: `
        CREATE TABLE IF NOT EXISTS cte_recebedor (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          cte_documento_id uuid NOT NULL,
          nome_razao_social varchar(255) NOT NULL,
          cnpj_cpf varchar(18) NOT NULL,
          ie varchar(20),
          telefone varchar(20),
          email varchar(255),
          endereco_logradouro varchar(255),
          endereco_numero varchar(20),
          endereco_complemento varchar(100),
          endereco_bairro varchar(100),
          endereco_cidade_id uuid,
          endereco_cidade_nome varchar(255),
          endereco_uf varchar(2),
          endereco_cep varchar(10),
          CONSTRAINT fk_cte_documento
            FOREIGN KEY(cte_documento_id)
            REFERENCES cte_documentos(id)
            ON DELETE CASCADE
        )
      `
    },
    {
      name: 'cte_destinatario',
      query: `
        CREATE TABLE IF NOT EXISTS cte_destinatario (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          cte_documento_id uuid NOT NULL,
          nome_razao_social varchar(255) NOT NULL,
          cnpj_cpf varchar(18) NOT NULL,
          ie varchar(20),
          telefone varchar(20),
          email varchar(255),
          endereco_logradouro varchar(255),
          endereco_numero varchar(20),
          endereco_complemento varchar(100),
          endereco_bairro varchar(100),
          endereco_cidade_id uuid,
          endereco_cidade_nome varchar(255),
          endereco_uf varchar(2),
          endereco_cep varchar(10),
          CONSTRAINT fk_cte_documento
            FOREIGN KEY(cte_documento_id)
            REFERENCES cte_documentos(id)
            ON DELETE CASCADE
        )
      `
    },
    {
      name: 'cte_tomador',
      query: `
        CREATE TABLE IF NOT EXISTS cte_tomador (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          cte_documento_id uuid NOT NULL,
          nome_razao_social varchar(255) NOT NULL,
          cnpj_cpf varchar(18) NOT NULL,
          ie varchar(20),
          telefone varchar(20),
          email varchar(255),
          endereco_logradouro varchar(255),
          endereco_numero varchar(20),
          endereco_complemento varchar(100),
          endereco_bairro varchar(100),
          endereco_cidade_id uuid,
          endereco_cidade_nome varchar(255),
          endereco_uf varchar(2),
          endereco_cep varchar(10),
          CONSTRAINT fk_cte_documento
            FOREIGN KEY(cte_documento_id)
            REFERENCES cte_documentos(id)
            ON DELETE CASCADE
        )
      `
    },
    {
      name: 'database_configurations',
      query: `
        CREATE TABLE IF NOT EXISTS database_configurations (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          nome_empresa varchar(255) NOT NULL,
          host varchar(255) NOT NULL,
          port integer NOT NULL DEFAULT 5432,
          database_name varchar(255) NOT NULL,
          username varchar(255) NOT NULL,
          password text NOT NULL,
          ssl_enabled boolean DEFAULT false,
          max_connections integer DEFAULT 10,
          timeout_seconds integer DEFAULT 30,
          ativo boolean DEFAULT true,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    },
    {
      name: 'mdfe_cte_relacionados',
      query: `
        CREATE TABLE IF NOT EXISTS mdfe_cte_relacionados (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          mdfe_documento_id uuid NOT NULL,
          cte_documento_id uuid NOT NULL,
          created_at timestamptz DEFAULT now(),
          UNIQUE(mdfe_documento_id, cte_documento_id)
        )
      `
    }
  ];

  // Criar cada tabela individualmente
  for (const table of tables) {
    try {
      await client.query(table.query);
      console.log(`✅ Tabela ${table.name} criada/verificada`);
    } catch (error) {
      console.log(`⚠️ Erro na tabela ${table.name}:`, error.message);
    }
  }
}

// Função para adicionar coluna cte_documento_id em cte_produtos se não existir
async function ensureCteProductsStructure(client) {
  try {
    // Verificar se a coluna cte_documento_id existe
    const columnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cte_produtos' AND column_name = 'cte_documento_id'
    `);

    if (columnExists.rows.length === 0) {
      console.log('🔧 Adicionando coluna cte_documento_id à tabela cte_produtos...');
      await client.query(`
        ALTER TABLE cte_produtos 
        ADD COLUMN cte_documento_id uuid
      `);
      console.log('✅ Coluna cte_documento_id adicionada com sucesso');
    } else {
      console.log('✅ Coluna cte_documento_id já existe em cte_produtos');
    }

    // Agora adicionar a foreign key se não existir
    const fkExists = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints
      WHERE constraint_name = 'cte_produtos_cte_documento_id_fkey' 
      AND table_name = 'cte_produtos'
    `);

    if (fkExists.rows.length === 0) {
      console.log('🔧 Adicionando foreign key cte_produtos_cte_documento_id_fkey...');
      await client.query(`
        ALTER TABLE cte_produtos
        ADD CONSTRAINT cte_produtos_cte_documento_id_fkey
        FOREIGN KEY (cte_documento_id) REFERENCES cte_documentos(id)
        ON DELETE CASCADE
      `);
      console.log('✅ Foreign key cte_produtos_cte_documento_id_fkey criada');
    } else {
      console.log('✅ Foreign key cte_produtos_cte_documento_id_fkey já existe');
    }

  } catch (error) {
    console.log('⚠️ Erro ao ajustar estrutura de cte_produtos:', error.message);
  }
}

// Função para criar foreign keys
async function createForeignKeys(client) {
  const foreignKeys = [
    {
      table: 'abastecimentos',
      column: 'veiculo_id',
      references: 'veiculos(id)',
      name: 'abastecimentos_veiculo_id_fkey'
    },
    {
      table: 'abastecimentos',
      column: 'operador_id',
      references: 'usuarios(id)',
      name: 'abastecimentos_operador_id_fkey'
    },
    {
      table: 'abastecimentos',
      column: 'posto_id',
      references: 'cadastros(id)',
      name: 'abastecimentos_posto_id_fkey'
    },
    {
      table: 'manutencoes',
      column: 'veiculo_id',
      references: 'veiculos(id)',
      name: 'manutencoes_veiculo_id_fkey'
    },
    {
      table: 'checklists',
      column: 'veiculo_id',
      references: 'veiculos(id)',
      name: 'checklists_veiculo_id_fkey'
    },
    {
      table: 'checklists',
      column: 'operador_id',
      references: 'usuarios(id)',
      name: 'checklists_operador_id_fkey'
    },
    {
      table: 'user_permissions',
      column: 'user_id',
      references: 'usuarios(id)',
      name: 'user_permissions_user_id_fkey',
      onDelete: 'CASCADE'
    },
    {
      table: 'registros_antt',
      column: 'veiculo_id',
      references: 'veiculos(id)',
      name: 'registros_antt_veiculo_id_fkey',
      onDelete: 'CASCADE'
    },
    {
      table: 'checklist_fotos',
      column: 'checklist_id',
      references: 'checklists(id)',
      name: 'checklist_fotos_checklist_id_fkey',
      onDelete: 'CASCADE'
    },
    {
      table: 'cities',
      column: 'state_id',
      references: 'states(id)',
      name: 'cities_state_id_fkey'
    },
    {
      table: 'usuarios',
      column: 'database_config_id',
      references: 'database_configurations(id)',
      name: 'usuarios_database_config_id_fkey',
      onDelete: 'SET NULL'
    },
    {
      table: 'cte_documentos',
      column: 'empresa_id',
      references: 'empresas_fiscais(id)',
      name: 'cte_documentos_empresa_id_fkey'
    },
    
    {
      table: 'cte_documentos',
      column: 'produto_predominante_id',
      references: 'cte_produtos(id)',
      name: 'cte_documentos_produto_predominante_id_fkey',
      onDelete: 'SET NULL'
    },
    {
      table: 'cte_nfe_relacionadas',
      column: 'cte_documento_id',
      references: 'cte_documentos(id)',
      name: 'cte_nfe_relacionadas_cte_documento_id_fkey',
      onDelete: 'CASCADE'
    },
    {
      table: 'cte_outros_valores',
      column: 'cte_documento_id',
      references: 'cte_documentos(id)',
      name: 'cte_outros_valores_cte_documento_id_fkey',
      onDelete: 'CASCADE'
    },
    {
      table: 'cte_componentes_redespacho',
      column: 'cte_documento_id',
      references: 'cte_documentos(id)',
      name: 'cte_componentes_redespacho_cte_documento_id_fkey',
      onDelete: 'CASCADE'
    },
    {
      table: 'cte_componentes_redespacho',
      column: 'cidade_prestacao_id',
      references: 'cities(id)',
      name: 'cte_componentes_redespacho_cidade_prestacao_id_fkey',
      onDelete: 'SET NULL'
    },
    {
      table: 'cte_remetente',
      column: 'cte_documento_id',
      references: 'cte_documentos(id)',
      name: 'cte_remetente_cte_documento_id_fkey',
      onDelete: 'CASCADE'
    },
    {
      table: 'cte_remetente',
      column: 'endereco_cidade_id',
      references: 'cities(id)',
      name: 'cte_remetente_endereco_cidade_id_fkey',
      onDelete: 'SET NULL'
    },
    {
      table: 'cte_recebedor',
      column: 'cte_documento_id',
      references: 'cte_documentos(id)',
      name: 'cte_recebedor_cte_documento_id_fkey',
      onDelete: 'CASCADE'
    },
    {
      table: 'cte_recebedor',
      column: 'endereco_cidade_id',
      references: 'cities(id)',
      name: 'cte_recebedor_endereco_cidade_id_fkey',
      onDelete: 'SET NULL'
    },
    {
      table: 'cte_destinatario',
      column: 'cte_documento_id',
      references: 'cte_documentos(id)',
      name: 'cte_destinatario_cte_documento_id_fkey',
      onDelete: 'CASCADE'
    },
    {
      table: 'cte_destinatario',
      column: 'endereco_cidade_id',
      references: 'cities(id)',
      name: 'cte_destinatario_endereco_cidade_id_fkey',
      onDelete: 'SET NULL'
    },
    {
      table: 'cte_tomador',
      column: 'cte_documento_id',
      references: 'cte_documentos(id)',
      name: 'cte_tomador_cte_documento_id_fkey',
      onDelete: 'CASCADE'
    },
    {
      table: 'cte_tomador',
      column: 'endereco_cidade_id',
      references: 'cities(id)',
      name: 'cte_tomador_endereco_cidade_id_fkey',
      onDelete: 'SET NULL'
    }
  ];

  for (const fk of foreignKeys) {
    try {
      // Verificar se a constraint já existe
      const constraintExists = await client.query(`
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = $1 AND table_name = $2
      `, [fk.name, fk.table]);

      if (constraintExists.rows.length === 0) {
        const onDeleteClause = fk.onDelete ? ` ON DELETE ${fk.onDelete}` : '';
        await client.query(`
          ALTER TABLE ${fk.table}
          ADD CONSTRAINT ${fk.name}
          FOREIGN KEY (${fk.column}) REFERENCES ${fk.references}${onDeleteClause}
        `);
        console.log(`✅ Foreign key ${fk.name} criada`);
      } else {
        console.log(`✅ Foreign key ${fk.name} já existe`);
      }
    } catch (error) {
      console.log(`⚠️ Erro na foreign key ${fk.name}:`, error.message);
    }
  }
}

// Função para criar índices
async function createIndexes(client) {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)',
    'CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON usuarios(tipo)',
    'CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa)',
    'CREATE INDEX IF NOT EXISTS idx_veiculos_ativo ON veiculos(ativo)',
    'CREATE INDEX IF NOT EXISTS idx_cadastros_tipo ON cadastros(tipo)',
    'CREATE INDEX IF NOT EXISTS idx_cadastros_ativo ON cadastros(ativo)',
    'CREATE INDEX IF NOT EXISTS idx_abastecimentos_data ON abastecimentos(data_abastecimento)',
    'CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON user_permissions(module)',
    'CREATE INDEX IF NOT EXISTS idx_empresas_fiscais_cnpj ON empresas_fiscais(cnpj)',
    'CREATE INDEX IF NOT EXISTS idx_cte_documentos_empresa_id ON cte_documentos(empresa_id)',
    'CREATE INDEX IF NOT EXISTS idx_cte_documentos_numero_cte ON cte_documentos(numero_cte)',
    'CREATE INDEX IF NOT EXISTS idx_cte_documentos_data_emissao ON cte_documentos(data_emissao)',
    'CREATE INDEX IF NOT EXISTS idx_cte_produtos_cte_documento_id ON cte_produtos(cte_documento_id)',
    'CREATE INDEX IF NOT EXISTS idx_cte_nfe_relacionadas_cte_documento_id ON cte_nfe_relacionadas(cte_documento_id)',
    'CREATE INDEX IF NOT EXISTS idx_cte_outros_valores_cte_documento_id ON cte_outros_valores(cte_documento_id)',
    'CREATE INDEX IF NOT EXISTS idx_cte_componentes_redespacho_cte_documento_id ON cte_componentes_redespacho(cte_documento_id)',
    'CREATE INDEX IF NOT EXISTS idx_cte_remetente_cte_documento_id ON cte_remetente(cte_documento_id)',
    'CREATE INDEX IF NOT EXISTS idx_cte_recebedor_cte_documento_id ON cte_recebedor(cte_documento_id)',
    'CREATE INDEX IF NOT EXISTS idx_cte_destinatario_cte_documento_id ON cte_destinatario(cte_documento_id)',
    'CREATE INDEX IF NOT EXISTS idx_cte_tomador_cte_documento_id ON cte_tomador(cte_documento_id)'
  ];

  for (const indexQuery of indexes) {
    try {
      await client.query(indexQuery);
    } catch (error) {
      console.log('⚠️ Erro ao criar índice:', error.message);
    }
  }
  console.log('✅ Índices criados/verificados');
}

// Função para criar funções e triggers
async function createFunctionsAndTriggers(client) {
  try {
    // Função para permissões
    await client.query(`
      CREATE OR REPLACE FUNCTION create_user_permissions_complete(user_id_param uuid, user_type_param text)
      RETURNS INTEGER AS $$
      DECLARE
        permission_count INTEGER := 0;
        user_exists BOOLEAN := false;
        user_email TEXT;
      BEGIN
        SELECT email INTO user_email FROM usuarios WHERE id = user_id_param;
        user_exists := FOUND;

        IF NOT user_exists THEN
          RETURN 0;
        END IF;

        DELETE FROM user_permissions WHERE user_id = user_id_param;

        IF user_type_param = 'admin' THEN
          INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
          (user_id_param, 'dashboard', true, false, false, false),
          (user_id_param, 'veiculos', true, true, true, true),
          (user_id_param, 'antt', true, true, true, true),
          (user_id_param, 'abastecimentos', true, true, true, true),
          (user_id_param, 'cadastros', true, true, true, true),
          (user_id_param, 'manutencoes', true, true, true, true),
          (user_id_param, 'checklists', true, true, true, true),
          (user_id_param, 'funcionarios', true, true, true, true),
          (user_id_param, 'usuarios', true, true, true, true),
          (user_id_param, 'permissoes', true, true, true, true),
          (user_id_param, 'configuracoes_banco', true, true, true, true),
          (user_id_param, 'financeiro', true, true, true, false),
          (user_id_param, 'relatorios', true, true, false, false);

          permission_count := 13;

        ELSIF user_type_param = 'operador_checklist' THEN
          INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
          (user_id_param, 'dashboard', true, false, false, false),
          (user_id_param, 'checklists', true, true, false, false),
          (user_id_param, 'relatorios', true, false, false, false);

          permission_count := 3;

        ELSIF user_type_param = 'operador_abastecimento' THEN
          INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
          (user_id_param, 'dashboard', true, false, false, false),
          (user_id_param, 'abastecimentos', true, true, false, false),
          (user_id_param, 'relatorios', true, false, false, false);

          permission_count := 3;
        END IF;

        RETURN permission_count;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('✅ Função de permissões criada');

    // Função para trigger
    await client.query(`
      CREATE OR REPLACE FUNCTION trigger_setup_user_permissions()
      RETURNS TRIGGER AS $$
      DECLARE
        result INTEGER;
      BEGIN
        SELECT create_user_permissions_complete(NEW.id, NEW.tipo) INTO result;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Trigger
    await client.query('DROP TRIGGER IF EXISTS on_user_created ON usuarios');
    await client.query(`
      CREATE TRIGGER on_user_created
        AFTER INSERT ON usuarios
        FOR EACH ROW
        EXECUTE FUNCTION trigger_setup_user_permissions()
    `);
    console.log('✅ Triggers criados');
  } catch (error) {
    console.log('⚠️ Erro ao criar funções/triggers:', error.message);
  }
}

// Função para inserir dados iniciais
async function insertInitialData(client) {
  const validHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

  try {
    await client.query(`
      INSERT INTO usuarios (id, email, nome, tipo, senha, ativo, created_at, updated_at)
      VALUES (gen_random_uuid(), 'admin@empresa.com', 'Administrador', 'admin', $1, true, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `, [validHash]);
    console.log('✅ Usuário admin criado');
  } catch (error) {
    console.log('⚠️ Erro ao criar usuário admin:', error.message);
  }

  try {
    await client.query(`
      INSERT INTO veiculos (placa, tipo, marca, modelo, ano, qrcode_data, ativo) VALUES
      ('ABC-1234', 'carro', 'Honda', 'Civic', 2020, 'vehicle_ABC-1234', true),
      ('DEF-5678', 'carro', 'Toyota', 'Corolla', 2021, 'vehicle_DEF-5678', true),
      ('GHI-9012', 'caminhao', 'Toyota', 'Hilux', 2019, 'vehicle_GHI-9012', true)
      ON CONFLICT (placa) DO NOTHING
    `);
    console.log('✅ Veículos de exemplo criados');
  } catch (error) {
    console.log('⚠️ Erro ao criar veículos:', error.message);
  }

  try {
    await client.query(`
      INSERT INTO cadastros (tipo, razao_social, endereco, cidade, estado, cep, telefone, emails, ativo) VALUES
      ('abastecimento', 'Posto Shell Centro', 'Rua Principal, 123', 'São Paulo', 'SP', '01000-000', '(11) 1234-5678', '["contato@shell.com"]', true),
      ('abastecimento', 'Posto Ipiranga Norte', 'Av. Paulista, 456', 'São Paulo', 'SP', '01310-000', '(11) 8765-4321', '["info@ipiranga.com"]', true),
      ('abastecimento', 'Posto BR Sul', 'Rua das Flores, 789', 'São Paulo', 'SP', '04000-000', '(11) 5555-0000', '["atendimento@br.com"]', true)
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Postos de exemplo criados');
  } catch (error) {
    console.log('⚠️ Erro ao criar postos:', error.message);
  }

  try {
    await client.query(`
      INSERT INTO centros_custo (nome, descricao, ativo) VALUES
      ('Administrativo', 'Despesas administrativas gerais', true),
      ('Operacional', 'Despesas operacionais da frota', true),
      ('Manutenção', 'Custos de manutenção de veículos', true)
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Centros de custo criados');
  } catch (error) {
    console.log('⚠️ Erro ao criar centros de custo:', error.message);
  }

  // Inserir estados brasileiros
  try {
    await client.query(`
      INSERT INTO states (id, uf, name, created_at) VALUES
      (gen_random_uuid(), 'AC', 'Acre', NOW()),
      (gen_random_uuid(), 'AL', 'Alagoas', NOW()),
      (gen_random_uuid(), 'AP', 'Amapá', NOW()),
      (gen_random_uuid(), 'AM', 'Amazonas', NOW()),
      (gen_random_uuid(), 'BA', 'Bahia', NOW()),
      (gen_random_uuid(), 'CE', 'Ceará', NOW()),
      (gen_random_uuid(), 'DF', 'Distrito Federal', NOW()),
      (gen_random_uuid(), 'ES', 'Espírito Santo', NOW()),
      (gen_random_uuid(), 'GO', 'Goiás', NOW()),
      (gen_random_uuid(), 'MA', 'Maranhão', NOW()),
      (gen_random_uuid(), 'MT', 'Mato Grosso', NOW()),
      (gen_random_uuid(), 'MS', 'Mato Grosso do Sul', NOW()),
      (gen_random_uuid(), 'MG', 'Minas Gerais', NOW()),
      (gen_random_uuid(), 'PA', 'Pará', NOW()),
      (gen_random_uuid(), 'PB', 'Paraíba', NOW()),
      (gen_random_uuid(), 'PR', 'Paraná', NOW()),
      (gen_random_uuid(), 'PE', 'Pernambuco', NOW()),
      (gen_random_uuid(), 'PI', 'Piauí', NOW()),
      (gen_random_uuid(), 'RJ', 'Rio de Janeiro', NOW()),
      (gen_random_uuid(), 'RN', 'Rio Grande do Norte', NOW()),
      (gen_random_uuid(), 'RS', 'Rio Grande do Sul', NOW()),
      (gen_random_uuid(), 'RO', 'Rondônia', NOW()),
      (gen_random_uuid(), 'RR', 'Roraima', NOW()),
      (gen_random_uuid(), 'SC', 'Santa Catarina', NOW()),
      (gen_random_uuid(), 'SP', 'São Paulo', NOW()),
      (gen_random_uuid(), 'SE', 'Sergipe', NOW()),
      (gen_random_uuid(), 'TO', 'Tocantins', NOW())
      ON CONFLICT (uf) DO NOTHING
    `);
    console.log('✅ Estados brasileiros criados');
  } catch (error) {
    console.log('⚠️ Erro ao criar estados:', error.message);
  }

  // Inserir algumas cidades importantes
  try {
    // Primeiro buscar IDs dos estados
    const spState = await client.query(`SELECT id FROM states WHERE uf = 'SP' LIMIT 1`);
    const mgState = await client.query(`SELECT id FROM states WHERE uf = 'MG' LIMIT 1`);
    const goState = await client.query(`SELECT id FROM states WHERE uf = 'GO' LIMIT 1`);

    if (spState.rows.length > 0 && mgState.rows.length > 0 && goState.rows.length > 0) {
      await client.query(`
        INSERT INTO cities (id, cod_city, name, state_id, created_at) VALUES
        (gen_random_uuid(), '3550308', 'São Paulo', $1, NOW()),
        (gen_random_uuid(), '3518800', 'Guarulhos', $1, NOW()),
        (gen_random_uuid(), '3509502', 'Campinas', $1, NOW()),
        (gen_random_uuid(), '3106200', 'Belo Horizonte', $2, NOW()),
        (gen_random_uuid(), '3131604', 'Iraí de Minas', $2, NOW()),
        (gen_random_uuid(), '5208707', 'Goiânia', $3, NOW()),
        (gen_random_uuid(), '5203302', 'Bela Vista de Goiás', $3, NOW())
        ON CONFLICT (cod_city) DO NOTHING
      `, [spState.rows[0].id, mgState.rows[0].id, goState.rows[0].id]);
      console.log('✅ Cidades importantes criadas');
    }
  } catch (error) {
    console.log('⚠️ Erro ao criar cidades:', error.message);
  }

  // Inserir dados de exemplo para empresas fiscais
  try {
    await client.query(`
      INSERT INTO empresas_fiscais (
        razao_social, cnpj, inscricao_estadual, endereco, cidade, estado,
        uf_emissao_nfe, ambiente_nfce, ambiente_cte, serie_padrao_cte, status,
        codigo_uf, created_at, updated_at
      ) VALUES (
        'EMPRESA DE EXEMPLO LTDA', '00.000.000/0001-00', '123.456.789.012',
        'Rua das Amostras, 100', 'São Paulo', 'SP', 'SP', '1', '1', '001', 'ativo',
        '35', NOW(), NOW()
      )
      ON CONFLICT (cnpj) DO NOTHING
    `);
    console.log('✅ Empresa fiscal de exemplo criada');
  } catch (error) {
    console.log('⚠️ Erro ao criar empresa fiscal de exemplo:', error.message);
  }
}

// Função para obter pool de conexão baseado no usuário
async function getUserDatabasePool(userId) {
  try {
    console.log('🔍 Buscando configuração de banco para usuário:', userId);

    // Buscar configuração de banco do usuário
    const userConfigResult = await pool.query(`
      SELECT dc.*
      FROM usuarios u
      JOIN database_configurations dc ON u.database_config_id = dc.id
      WHERE u.id = $1 AND dc.ativo = true
    `, [userId]);

    if (userConfigResult.rows.length === 0) {
      console.log('⚠️ Usuário sem configuração específica, usando pool padrão');
      // Se não tem configuração específica, usar pool padrão
      return pool;
    }

    const config = userConfigResult.rows[0];
    console.log('✅ Configuração encontrada:', config.nome_empresa);

    // Criar pool específico para este usuário
    const userPool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database_name,
      user: config.username,
      password: config.password,
      ssl: config.ssl_enabled ? { rejectUnauthorized: false } : false,
      max: config.max_connections || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: (config.timeout_seconds || 30) * 1000,
    });

    console.log('🔗 Pool específico criado para:', config.nome_empresa);
    return userPool;
  } catch (error) {
    console.error('❌ Erro ao obter pool do usuário:', error);
    console.log('🔄 Retornando pool padrão como fallback');
    return pool; // Fallback para pool padrão
  }
}

// Middleware para usar banco de dados correto baseado no usuário
const withUserDatabase = (handler) => {
  return async (req, res, next) => {
    try {
      console.log('🔍 Configurando banco para usuário:', req.user.email);
      const userPool = await getUserDatabasePool(req.user.id);
      req.userPool = userPool;
      console.log('✅ Pool de banco configurado para usuário:', req.user.email);
      return handler(req, res, next);
    } catch (error) {
      console.error('❌ Erro ao configurar banco do usuário:', error);
      console.log('🔄 Usando pool padrão como fallback');
      req.userPool = pool; // Fallback
      return handler(req, res, next);
    }
  };
};

// Atualizar rota de query para usar banco correto do usuário
app.post('/api/db/query', authenticateToken, async (req, res) => {
  console.log('📡 Recebida requisição de query do usuário:', req.user.email);

  let client;

  try {
    // Obter pool correto para o usuário
    const userPool = await getUserDatabasePool(req.user.id);
    client = await userPool.connect();

    const { query, params = [] } = req.body;

    console.log('🔍 Executando query no banco específico do usuário:', req.user.email);
    console.log('📋 Query:', query);

    if (!query) {
      return res.status(400).json({ error: 'Query é obrigatória' });
    }

    const result = await client.query(query, params);

    console.log('✅ Query executada com sucesso. Registros:', result.rows.length);

    res.json({
      rows: result.rows,
      rowCount: result.rowCount
    });
  } catch (error) {
    console.error('❌ Erro na query:', error.message);
    res.status(500).json({
      error: 'Erro ao executar query',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Rota específica para queries no banco principal (usuários e permissões)
app.post('/api/db/query-main', authenticateToken, async (req, res) => {
  console.log('📡 Recebida requisição de query para banco PRINCIPAL do usuário:', req.user.email);

  let client;

  try {
    // SEMPRE usar o pool principal para usuários e permissões
    client = await mainPool.connect();

    const { query, params = [] } = req.body;

    console.log('🔍 Executando query no banco PRINCIPAL');
    console.log('📋 Query:', query);

    if (!query) {
      return res.status(400).json({ error: 'Query é obrigatória' });
    }

    const result = await client.query(query, params);

    console.log('✅ Query executada com sucesso no banco principal. Registros:', result.rows.length);

    res.json({
      rows: result.rows,
      rowCount: result.rowCount
    });
  } catch (error) {
    console.error('❌ Erro na query do banco principal:', error.message);
    res.status(500).json({
      error: 'Erro ao executar query no banco principal',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Rota específica para CT-e documentos - USAR BANCO DO USUÁRIO
app.post('/api/cte-documentos', (req, res, next) => {
  console.log('🔥 REQUISIÇÃO CHEGOU NA ROTA /api/cte-documentos');
  console.log('🔥 Headers:', req.headers);
  console.log('🔥 Body preview:', JSON.stringify(req.body, null, 2).substring(0, 500));
  next();
}, authenticateToken, async (req, res) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  try {
    const data = req.body;
    console.log(`🚨 [${requestId}] === INÍCIO CRIAÇÃO CT-e ===`);
    console.log(`📝 [${requestId}] Dados RAW recebidos da interface:`, JSON.stringify(data, null, 2));

    // LOG ESPECIAL PARA DADOS DA NFE
    console.log('🔍 Dados específicos da NF-e recebidos:', {
      nfe_remetente_cnpj: data.nfe_remetente_cnpj,
      nfe_remetente_razao_social: data.nfe_remetente_razao_social,
      nfe_destinatario_cnpj: data.nfe_destinatario_cnpj,
      nfe_destinatario_razao_social: data.nfe_destinatario_razao_social,
      temDadosNfe: !!(data.nfe_remetente_cnpj || data.nfe_destinatario_cnpj)
    });

    console.log(`🔍 [${requestId}] USANDO BANCO DO USUÁRIO:`, req.user.email);

    // 🎯 USAR BANCO DO USUÁRIO - MESMA LÓGICA DE /api/db/query
    const userId = req.user.id;
    let client;

    // Buscar configuração de banco do usuário
    const userConfigResult = await mainPool.query(`
      SELECT dc.*
      FROM usuarios u
      JOIN database_configurations dc ON u.database_config_id = dc.id
      WHERE u.id = $1 AND dc.ativo = true
    `, [userId]);

    if (userConfigResult.rows.length === 0) {
      console.log('⚠️ Usuário sem configuração específica, usando pool padrão');
      client = await pool.connect();
    } else {
      const dbConfig = userConfigResult.rows[0];
      console.log('🔗 Conectando ao banco do usuário:', dbConfig.nome_empresa);
      
      const userPool = new Pool({
        connectionString: dbConfig.connection_string,
        ssl: dbConfig.ssl_enabled
      });
      
      client = await userPool.connect();
    }

    try {
      // Validar empresa no banco correto do usuário
      const empresaResult = await client.query(
        'SELECT * FROM empresas_fiscais WHERE id = $1',
        [data.empresa_id]
      );

      console.log(`📋 [${requestId}] Resultado da query empresa:`, empresaResult.rows.length, 'registros');

      if (empresaResult.rows.length === 0) {
        return res.status(400).json({ error: 'Empresa fiscal não encontrada' });
      }

      const empresa = empresaResult.rows[0];
      console.log('🏢 Status da empresa:', empresa.status);

      if (empresa.status !== 'ativo') {
        return res.status(400).json({ error: 'Empresa fiscal não está ativa' });
      }

      console.log('🏢 Empresa validada:', empresa.razao_social);
      console.log('📋 VALOR ATUAL proximo_numero_cte:', empresa.proximo_numero_cte);
      
      // 🎯 CORREÇÃO FORÇADA: Se proximo_numero_cte for > 10, resetar para 1
      if (empresa.proximo_numero_cte > 10) {
        console.log('🔧 RESETANDO próximo número CT-e para 1...');
        await client.query(`
          UPDATE empresas_fiscais 
          SET proximo_numero_cte = 1
          WHERE id = $1
        `, [data.empresa_id]);
        empresa.proximo_numero_cte = 1;
        console.log('✅ Próximo número resetado para 1');
      }
      
      console.log('✅ Passando para geração do número CT-e...');

      // USAR PRÓXIMO NÚMERO CADASTRADO NA EMPRESA
      let numeroFinal = data.numero_cte;
      
      if (!numeroFinal || numeroFinal === 'AUTO') {
        console.log('🔒 Obtendo próximo número CT-e da empresa cadastrada...');
        
        // 🔍 VERIFICAR NÚMEROS EXISTENTES PARA DEBUG
        const numerosExistentes = await client.query(`
          SELECT numero_cte 
          FROM cte_documentos 
          WHERE empresa_id = $1 
          ORDER BY CAST(numero_cte AS INTEGER)
        `, [data.empresa_id]);
        
        console.log('🔍 NÚMEROS CT-E JÁ EXISTENTES:', numerosExistentes.rows.map(r => r.numero_cte));
        console.log('🔍 TOTAL DE CT-ES EXISTENTES:', numerosExistentes.rows.length);
        
        // CALCULAR PRÓXIMO NÚMERO CORRETO
        const ultimoNumeroResult = await client.query(`
          SELECT COALESCE(MAX(CAST(numero_cte AS INTEGER)), 0) as ultimo_numero
          FROM cte_documentos
          WHERE empresa_id = $1
          AND numero_cte ~ '^[0-9]+$'
        `, [data.empresa_id]);
        
        const ultimoNumeroReal = ultimoNumeroResult.rows[0].ultimo_numero || 0;
        const proximoNumeroCalculado = ultimoNumeroReal + 1;
        
        console.log('📋 ÚLTIMO NÚMERO REAL NA BASE:', ultimoNumeroReal);
        console.log('📋 PRÓXIMO NÚMERO CALCULADO:', proximoNumeroCalculado);
        console.log('📋 VALOR NA EMPRESA (campo):', empresa.proximo_numero_cte);
        
        // USAR O MAIOR ENTRE CALCULADO E CAMPO DA EMPRESA
        numeroFinal = Math.max(proximoNumeroCalculado, empresa.proximo_numero_cte);
        console.log('📋 NÚMERO FINAL ESCOLHIDO:', numeroFinal);
        
        // VERIFICAR SE JÁ EXISTE (prevenção contra duplicatas)
        const existeResult = await client.query(`
          SELECT id FROM cte_documentos 
          WHERE empresa_id = $1 AND numero_cte = $2
        `, [data.empresa_id, numeroFinal.toString()]);
        
        if (existeResult.rows.length > 0) {
          console.log('⚠️ Número já existe, incrementando automaticamente...');
          // Se já existe, incrementar até encontrar número livre
          let tentativas = 0;
          do {
            numeroFinal++;
            tentativas++;
            const novaVerificacao = await client.query(`
              SELECT id FROM cte_documentos 
              WHERE empresa_id = $1 AND numero_cte = $2
            `, [data.empresa_id, numeroFinal.toString()]);
            
            if (novaVerificacao.rows.length === 0) break;
            
            if (tentativas > 100) {
              throw new Error('Erro interno: não foi possível encontrar número CT-e disponível');
            }
          } while (true);
          
          console.log('📋 Número ajustado para evitar duplicata:', numeroFinal);
        }
        
        // ATUALIZAR O PRÓXIMO NÚMERO NA EMPRESA
        await client.query(`
          UPDATE empresas_fiscais 
          SET proximo_numero_cte = $2
          WHERE id = $1
        `, [data.empresa_id, numeroFinal + 1]);
        
        console.log('📋 Próximo número atualizado na empresa para:', numeroFinal + 1);
      } else {
        // Converter número fornecido para integer
        numeroFinal = parseInt(numeroFinal, 10);
      }

      // Usar série padrão se não fornecida
      const serieFinal = data.serie || empresa.serie_padrao_cte || '001';
      console.log('📋 Série final:', serieFinal);

      // Usar código UF da empresa ou fallback para SP
      const codigoUFFinal = data.codigo_uf || empresa.codigo_uf || '35';
      console.log('UF final:', codigoUFFinal);

      // ==== MAPEAMENTO AUTOMÁTICO DE PARTICIPANTES E PRODUTOS ====

      console.log('🔍 Dados recebidos para mapeamento:', {
        nfe_remetente_cnpj: data.nfe_remetente_cnpj,
        nfe_remetente_razao_social: data.nfe_remetente_razao_social,
        nfe_destinatario_cnpj: data.nfe_destinatario_cnpj,
        nfe_destinatario_razao_social: data.nfe_destinatario_razao_social,
        tomador_id: data.tomador_id,
        remetente_id: data.remetente_id,
        destinatario_id: data.destinatario_id
      });

      let tomadorIdFinal = data.tomador_id;
      let remetenteIdFinal = data.remetente_id;
      let destinatarioIdFinal = data.destinatario_id;
      let produtoPredominanteIdFinal = data.produto_predominante_id;

      // 1. MAPEAR REMETENTE pelo CNPJ da NF-e
      if (data.nfe_remetente_cnpj && !remetenteIdFinal) {
        console.log('🔍 Buscando remetente por CNPJ:', data.nfe_remetente_cnpj);

        const remetenteResult = await client.query(
          'SELECT id FROM cadastros WHERE cnpj = $1 AND tipo = $2 AND ativo = true LIMIT 1',
          [data.nfe_remetente_cnpj, 'cliente']
        );

        if (remetenteResult.rows.length > 0) {
          remetenteIdFinal = remetenteResult.rows[0].id;
          console.log('✅ Remetente encontrado:', remetenteIdFinal);
        } else {
          // Criar remetente automaticamente se não existir
          console.log('📝 Criando remetente automaticamente para CNPJ:', data.nfe_remetente_cnpj);

          const novoRemetenteResult = await client.query(`
            INSERT INTO cadastros (
              id, tipo, razao_social, cnpj, ie, endereco, cidade, estado, cep, telefone, emails, ativo, created_at, updated_at
            ) VALUES (
              gen_random_uuid(), 'cliente', $1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW()
            )
            RETURNING id
          `, [
            data.nfe_remetente_razao_social || 'Cliente NFe',
            data.nfe_remetente_cnpj,
            data.nfe_remetente_ie || null,
            data.nfe_remetente_endereco || null,
            data.nfe_remetente_cidade || null,
            data.nfe_remetente_estado || null,
            data.nfe_remetente_cep || null,
            null, // telefone
            null  // emails
          ]);

          if (novoRemetenteResult.rows.length > 0) {
            remetenteIdFinal = novoRemetenteResult.rows[0].id;
            console.log('✅ Remetente criado automaticamente:', remetenteIdFinal);
          }
        }
      }

      // 2. MAPEAR DESTINATÁRIO pelo CNPJ da NF-e
      if (data.nfe_destinatario_cnpj && !destinatarioIdFinal) {
        console.log('🔍 Buscando destinatário por CNPJ:', data.nfe_destinatario_cnpj);

        const destinatarioResult = await client.query(
          'SELECT id FROM cadastros WHERE cnpj = $1 AND tipo = $2 AND ativo = true LIMIT 1',
          [data.nfe_destinatario_cnpj, 'cliente']
        );

        if (destinatarioResult.rows.length > 0) {
          destinatarioIdFinal = destinatarioResult.rows[0].id;
          console.log('✅ Destinatário encontrado:', destinatarioIdFinal);
        } else {
          // Criar destinatário automaticamente se não existir
          console.log('📝 Criando destinatário automaticamente para CNPJ:', data.nfe_destinatario_cnpj);

          const novoDestinatarioResult = await client.query(`
            INSERT INTO cadastros (
              id, tipo, razao_social, cnpj, ie, endereco, cidade, estado, cep, telefone, emails, ativo, created_at, updated_at
            ) VALUES (
              gen_random_uuid(), 'cliente', $1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW()
            )
            RETURNING id
          `, [
            data.nfe_destinatario_razao_social || 'Cliente NFe',
            data.nfe_destinatario_cnpj,
            data.nfe_destinatario_ie || null,
            data.nfe_destinatario_endereco || null,
            data.nfe_destinatario_cidade || null,
            data.nfe_destinatario_estado || null,
            data.nfe_destinatario_cep || null,
            null, // telefone
            null  // emails
          ]);

          if (novoDestinatarioResult.rows.length > 0) {
            destinatarioIdFinal = novoDestinatarioResult.rows[0].id;
            console.log('✅ Destinatário criado automaticamente:', destinatarioIdFinal);
          }
        }
      }

      // 3. TOMADOR - Buscar no cadastro de frete (OBRIGATÓRIO)
      if (!tomadorIdFinal && remetenteIdFinal && destinatarioIdFinal) {
        console.log('🔍 Buscando configuração de tomador no cadastro de frete');

        try {
          const freteResult = await client.query(`
            SELECT tomador_frete
            FROM frete_documentos
            WHERE cliente_origem_id = $1
            AND cliente_destino_id = $2
            AND ativo = true
            LIMIT 1
          `, [remetenteIdFinal, destinatarioIdFinal]);

          if (freteResult.rows.length > 0) {
            const tomadorFrete = freteResult.rows[0].tomador_frete;
            console.log('📋 Tomador definido no frete:', tomadorFrete);

            // Salvar o valor literal, não o UUID
            tomadorIdFinal = tomadorFrete; // "remetente" ou "destinatario"
            console.log('✅ Tomador definido como valor literal (baseado no frete):', tomadorIdFinal);
          } else {
            // ABORTAR se não encontrar frete cadastrado
            console.error('❌ Frete não encontrado - abortar criação do CT-e');
            console.error('❌ Parâmetros de busca:', {
              remetente: remetenteIdFinal,
              destinatario: destinatarioIdFinal,
              remetente_razao: data.nfe_remetente_razao_social,
              destinatario_razao: data.nfe_destinatario_razao_social
            });

            return res.status(400).json({
              error: `Frete não cadastrado. É necessário cadastrar o frete para a rota: ${data.nfe_remetente_razao_social || 'Remetente'} → ${data.nfe_destinatario_razao_social || 'Destinatário'}. Acesse o módulo de Controle de Frete para cadastrar esta rota antes de criar o CT-e.`
            });
          }
        } catch (error) {
          console.error('❌ Erro ao buscar tomador no frete:', error);
          return res.status(500).json({
            error: `Erro ao verificar frete cadastrado: ${error.message}. Verifique se os clientes estão cadastrados corretamente e se existe uma rota de frete configurada entre ${data.nfe_remetente_razao_social || 'o remetente'} e ${data.nfe_destinatario_razao_social || 'o destinatário'}.`
          });
        }
      }

      // LÓGICA ESPECIAL PARA CT-e RÁPIDO: Aplicar configuração do frete
      if (data.tomador_id && ['remetente', 'destinatario'].includes(data.tomador_id)) {
        // Se o tomador foi selecionado manualmente no CT-e Rápido, usar o valor selecionado
        tomadorIdFinal = data.tomador_id;
        console.log('✅ Tomador definido manualmente no CT-e Rápido:', tomadorIdFinal);
      } else if (data.tomador_id && data.tomador_id !== 'AUTO') {
        // Se foi selecionado um cliente específico como tomador
        tomadorIdFinal = data.tomador_id;
        console.log('✅ Cliente específico selecionado como tomador:', tomadorIdFinal);
      }

      // 4. MAPEAR/CRIAR PRODUTO PREDOMINANTE pelo NCM da NF-e - TEMPORARIAMENTE DESABILITADO
      // COMENTADO PARA RESOLVER PROBLEMA DE CONEXÃO DE BANCO
      console.log('⚠️ Busca de produto temporariamente desabilitada devido a problema de conexão');
      console.log('🔍 NCM informado na NF-e:', data.nfe_produto_ncm);
      console.log('📝 Descrição informada na NF-e:', data.nfe_produto_descricao);
      
      // Produto será null por enquanto - CT-e será criado sem produto específico
      produtoPredominanteIdFinal = null;

      console.log('📋 Participantes mapeados:', {
        tomador: tomadorIdFinal,
        remetente: remetenteIdFinal,
        destinatario: destinatarioIdFinal,
        produto_predominante: produtoPredominanteIdFinal
      });

      // NORMALIZAR PARTICIPANTES PARA INSERÇÃO NO BANCO
      // Se tomador for "remetente" ou "destinatario", manter o valor literal
      // Caso contrário, deve ser um UUID válido de cliente
      let tomadorParaInserir = tomadorIdFinal;
      let remetenteParaInserir = remetenteIdFinal;
      let destinatarioParaInserir = destinatarioIdFinal;

      // Se o tomador for valor literal, deixar como está
      if (['remetente', 'destinatario', 'recebedor', 'tomador', 'outros'].includes(tomadorIdFinal)) {
        tomadorParaInserir = tomadorIdFinal;
        console.log('🏷️ Tomador é valor literal, mantendo:', tomadorParaInserir);
      }

      // LOG EXTRA PARA DEBUG
      console.log('🔍 DEBUG - Valores que serão inseridos no banco:');
      console.log('  empresa_id:', data.empresa_id);
      console.log('  numeroFinal:', numeroFinal, 'tipo:', typeof numeroFinal);
      console.log('  tomadorParaInserir:', tomadorParaInserir, 'tipo:', typeof tomadorParaInserir);
      console.log('  remetenteParaInserir:', remetenteParaInserir, 'tipo:', typeof remetenteParaInserir);
      console.log('  destinatarioParaInserir:', destinatarioParaInserir, 'tipo:', typeof destinatarioParaInserir);

      // VALIDAÇÃO FINAL - Verificar se algum participante foi criado/encontrado
      if (!tomadorIdFinal && !remetenteIdFinal && !destinatarioIdFinal) {
        console.log('⚠️ NENHUM PARTICIPANTE FOI MAPEADO - Isso pode ser um problema!');
        console.log('Dados NFe recebidos:', {
          remetente_cnpj: data.nfe_remetente_cnpj,
          destinatario_cnpj: data.nfe_destinatario_cnpj
        });
      }

      // Validar se client ainda está conectado antes de executar query
      if (!client) {
        throw new Error('Cliente de banco não está conectado');
      }

      console.log('🔧 Preparando inserção no banco de dados...');

      // Validar parâmetros obrigatórios antes da inserção
      if (!data.empresa_id) {
        throw new Error('empresa_id é obrigatório');
      }
      if (!numeroFinal) {
        throw new Error('número do CT-e é obrigatório');
      }
      if (!serieFinal) {
        throw new Error('série do CT-e é obrigatória');
      }
      if (!data.data_emissao) {
        throw new Error('data de emissão é obrigatória');
      }

      console.log('✅ Parâmetros validados, executando INSERT...');

      // Inserir documento CT-e com tratamento de erro melhorado
      const result = await client.query(`
        INSERT INTO cte_documentos (
          empresa_id,
          numero_cte,
          serie,
          data_emissao,
          codigo_uf,
          status,
          observacoes,
          tomador_id,
          remetente_id,
          recebedor_id,
          destinatario_id,
          valor_prestacao,
          valor_receber,
          valor_tributos,
          valor_pedagio,
          valor_seguro,
          icms_situacao_tributaria,
          icms_bc_valor,
          icms_aliquota,
          icms_valor,
          valor_carga,
          quantidade_carga,
          produto_predominante_id,
          chave_acesso_1,
          chave_acesso_2,
          chave_acesso_3,
          chave_acesso_4,
          tipo_servico,
          finalidade_cte,
          cfop,
          cidade_inicio_ibge,
          cidade_termino_ibge,
          uf_inicio,
          uf_termino,
          cidade_inicio_nome,
          cidade_termino_nome,
          rntrc,
          motorista_nome,
          motorista_cnh,
          motorista_matricula,
          motorista_validade_cnh,
          placa_veiculo,
          placa_reboque,
          associacao_frota_id,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
          $22, $23, $24, $25, $26, $27, $28, $29, $30, $31,
          $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
          $42, $43, $44, NOW(), NOW()
        ) RETURNING *
      `, [
        data.empresa_id,
        numeroFinal,
        serieFinal,
        data.data_emissao,
        codigoUFFinal,
        data.status || 'pendente',
        data.observacoes || null,
        tomadorParaInserir || null,
        remetenteParaInserir || null,
        data.recebedor_id || null,
        destinatarioParaInserir || null,
        data.valor_prestacao || null,
        data.valor_receber || null,
        data.valor_tributos || null,
        data.valor_pedagio || null,
        data.valor_seguro || null,
        data.icms_situacao_tributaria || null,
        data.icms_bc_valor || null,
        data.icms_aliquota || null,
        data.icms_valor || null,
        data.valor_carga || null,
        data.quantidade_carga || null,
        produtoPredominanteIdFinal || null,
        data.chave_acesso_1 || null,
        data.chave_acesso_2 || null,
        data.chave_acesso_3 || null,
        data.chave_acesso_4 || null,
        data.tipo_servico || '0',
        data.finalidade_cte || '0',
        data.cfop || '5352',
        data.cidade_inicio_ibge || null,
        data.cidade_termino_ibge || null,
        data.uf_inicio || null,
        data.uf_termino || null,
        data.cidade_inicio_nome || null,
        data.cidade_termino_nome || null,
        data.rntrc || null,
        data.motorista_nome || null,
        data.motorista_cnh || null,
        data.motorista_matricula || null,
        data.motorista_validade_cnh || null,
        data.placa_veiculo || null,
        data.placa_reboque || null,
        data.associacao_frota_id || null
      ].filter(param => param !== undefined)); // Filtrar parâmetros undefined

      console.log('✅ Documento CT-e criado com sucesso:', result.rows[0].id);

      // LOG CRÍTICO - Ver o que foi REALMENTE salvo no banco
      console.log('🔍 VALORES SALVOS NO BANCO:');
      console.log('  ID:', result.rows[0].id);
      console.log('  Número CT-e:', result.rows[0].numero_cte);
      console.log('  Tomador ID salvo:', result.rows[0].tomador_id);
      console.log('  Remetente ID salvo:', result.rows[0].remetente_id);
      console.log('  Destinatário ID salvo:', result.rows[0].destinatario_id);
      console.log('  Produto ID salvo:', result.rows[0].produto_predominante_id);

      res.status(201).json(result.rows[0]);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error(`❌ [${requestId}] Erro ao criar documento CT-e:`, error);
    console.error(`❌ [${requestId}] Stack trace completo:`, error.stack);
    console.error(`❌ [${requestId}] Tipo do erro:`, typeof error);
    console.error(`❌ [${requestId}] Nome do erro:`, error.name);
    console.error(`❌ [${requestId}] Mensagem do erro:`, error.message);
    
    // Se for erro de SQL, incluir mais detalhes
    if (error.code) {
      console.error(`❌ [${requestId}] Código de erro SQL:`, error.code);
      console.error(`❌ [${requestId}] Detalhes SQL:`, error.detail);
      console.error(`❌ [${requestId}] Hint SQL:`, error.hint);
      console.error(`❌ [${requestId}] Posição SQL:`, error.position);
    }

    // Mensagem de erro mais específica baseada no tipo
    let errorMessage = 'Erro ao criar documento CT-e';
    if (error.code === '23505') {
      errorMessage = 'Erro: Documento CT-e com esse número já existe';
    } else if (error.code === '23503') {
      errorMessage = 'Erro: Referência a registro não encontrado (empresa, cliente, etc.)';
    } else if (error.code === '23502') {
      errorMessage = 'Erro: Campo obrigatório não preenchido';
    }

    res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId: requestId
    });
  }
});

// Rota de teste do banco
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// ROTA ESPECÍFICA PARA POSTOS - DEVE VIR ANTES DAS ROTAS GENÉRICAS
app.get('/api/postos', authenticateToken, async (req, res) => {
  try {
    console.log('=== EXECUTANDO ROTA ESPECÍFICA PARA POSTOS ===');

    const query = `
      SELECT
        id,
        nome,
        COALESCE(endereco, 'Endereço não informado') as endereco,
        COALESCE(cidade, 'Não informado') as cidade,
        COALESCE(estado, 'SP') as estado,
        COALESCE(cep, '00000-000') as cep,
        telefone,
        cnpj,
        COALESCE(ativo, true) as ativo,
        created_at,
        updated_at
      FROM cadastros
      WHERE tipo = 'abastecimento'
      ORDER BY nome
    `;

    console.log('Query SQL para postos:', query);

    const result = await pool.query(query);

    console.log('=== RESULTADO DA QUERY POSTOS ===');
    console.log('Número de registros:', result.rows.length);

    if (result.rows.length > 0) {
      console.log('Primeiro posto completo do backend:', JSON.stringify(result.rows[0], null, 2));
      console.log('Campos do primeiro posto:', Object.keys(result.rows[0]));
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar postos:', error);
    res.status(500).json({ error: 'Erro ao buscar postos' });
  }
});

// Função para consultar dados da NF-e
async function getNFeData(chaveNFE) {
  try {
    if (!chaveNFE || chaveNFE.length !== 44) {
      throw new Error('Chave de acesso NF-e deve ter 44 dígitos');
    }

    const token = '44B4845C-05F4-7E99-2DFF-8EAE5746E9BA';
    const url = `https://www.roveri.inf.br/consultas/nfe.php?token=${token}&chave=${chaveNFE}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Fleet-Management-System/1.0',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log('📄 Resposta do webservice:', responseText);

    // Verificar se é um erro em formato de mensagem
    if (responseText.includes('Chave inválida') || responseText.includes('erro') || responseText.includes('error')) {
      throw new Error(`Erro do webservice: ${responseText}`);
    }

    // Tentar fazer parse como JSON primeiro
    let nfeData;
    try {
      nfeData = JSON.parse(responseText);
      console.log('✅ Dados JSON recebidos:', nfeData);
    } catch (jsonError) {
      // Se não for JSON válido, assumir que é XML
      if (responseText.includes('<?xml')) {
        console.log('📄 Resposta em formato XML, fazendo parse...');
        const parser = new xml2js.Parser({ explicitArray: false });
        const parsed = await parser.parseStringPromise(responseText);

        // Extrair dados principais da NF-e
        const infNFe = parsed?.nfeProc?.NFe?.infNFe || parsed?.NFe?.infNFe;

        if (infNFe) {
          nfeData = {
            remetente: {
              razao_social: infNFe.emit?.xNome || '',
              cnpj: infNFe.emit?.CNPJ || '',
              ie: infNFe.emit?.IE || '',
              endereco: `${infNFe.emit?.enderEmit?.xLgr || ''}, ${infNFe.emit?.enderEmit?.nro || ''}`,
              cidade: infNFe.emit?.enderEmit?.xMun || '',
              estado: infNFe.emit?.enderEmit?.UF || '',
              cep: infNFe.emit?.enderEmit?.CEP || ''
            },
            destinatario: {
              razao_social: infNFe.dest?.xNome || '',
              cnpj: infNFe.dest?.CNPJ || '',
              ie: infNFe.dest?.IE || '',
              endereco: `${infNFe.dest?.enderDest?.xLgr || ''}, ${infNFe.dest?.enderDest?.nro || ''}`,
              cidade: infNFe.dest?.enderDest?.xMun || '',
              estado: infNFe.dest?.enderDest?.UF || '',
              cep: infNFe.dest?.enderDest?.CEP || ''
            },
            produto: {
              descricao: Array.isArray(infNFe.det) ? infNFe.det[0]?.prod?.xProd : infNFe.det?.prod?.xProd || '',
              codigo_ncm: Array.isArray(infNFe.det) ? infNFe.det[0]?.prod?.NCM : infNFe.det?.prod?.NCM || '',
              valor_total: parseFloat(infNFe.total?.ICMSTot?.vNF || 0),
              peso_total: parseFloat(infNFe.total?.ICMSTot?.vPeso || 0),
              quantidade_total: Array.isArray(infNFe.det) ?
                infNFe.det.reduce((acc, item) => acc + parseFloat(item.prod?.qCom || 0), 0) :
                parseFloat(infNFe.det?.prod?.qCom || 0)
            },
            transporte: {
              valor_frete: parseFloat(infNFe.total?.ICMSTot?.vFrete || 0),
              modal_transporte: infNFe.transp?.modFrete || '1'
            },
            numero_nfe: infNFe.ide?.nNF || '',
            serie: infNFe.ide?.serie || '',
            data_emissao: infNFe.ide?.dhEmi || infNFe.ide?.dEmi || '',
            chave_acesso: chaveNFE,
            observacoes: infNFe.infAdic?.infCpl || ''
          };
        } else {
          throw new Error('XML da NF-e não possui estrutura válida');
        }
      } else {
        throw new Error(`Resposta não é JSON nem XML válido: ${responseText}`);
      }
    }

    console.log('✅ Dados da NF-e processados:', nfeData);
    return nfeData;
  } catch (error) {
    console.error('❌ Erro ao consultar NF-e:', error.message);
    return null;
  }
}

// Rota para criação automática de CT-e a partir de NF-e
app.post('/api/fiscal/cte-auto-test', async (req, res) => {
  try {
    console.log('🚀 Iniciando criação automática de CT-e...');
    const data = req.body;
    console.log('📝 Dados recebidos:', data);

    // Verificar campos obrigatórios
    if (!data.empresa_id) {
      return res.status(400).json({ error: 'empresa_id é obrigatório' });
    }
    if (!data.chave_nfe) {
      return res.status(400).json({ error: 'chave_nfe é obrigatória' });
    }

    // Buscar dados da NF-e
    console.log('🔍 Consultando NF-e:', data.chave_nfe);
    const nfeData = await getNFeData(data.chave_nfe);

    if (!nfeData) {
      return res.status(400).json({ error: 'NF-e não encontrada ou inválida' });
    }

    // Para teste, usar o banco principal diretamente
    const client = await pool.connect();

    try {
      // Montar dados para criação do CT-e
      const cteData = {
        empresa_id: data.empresa_id,
        numero_cte: data.numero_cte || 'AUTO',
        nfe_remetente_cnpj: nfeData.remetente?.cnpj,
        nfe_remetente_razao_social: nfeData.remetente?.razao_social,
        nfe_destinatario_cnpj: nfeData.destinatario?.cnpj,
        nfe_destinatario_razao_social: nfeData.destinatario?.razao_social,
        produto_predominante_id: nfeData.produto?.id,
        valor_prestacao: nfeData.produto?.valor_total || 0,
        observacoes: `CT-e criado automaticamente a partir da NF-e ${data.chave_nfe}`
      };

      console.log('📋 Dados do CT-e montados:', cteData);

      // Simular criação básica de CT-e por enquanto
      const result = await client.query(`
        INSERT INTO cte_documentos (
          empresa_id, numero_cte, serie, data_emissao, codigo_uf,
          valor_prestacao, observacoes
        ) VALUES (
          $1, $2, '001', NOW(), '31',
          $3, $4
        ) RETURNING id, numero_cte, valor_prestacao
      `, [
        cteData.empresa_id,
        88888, // número fixo para teste
        cteData.valor_prestacao,
        cteData.observacoes
      ]);

      console.log('✅ CT-e criado automaticamente com sucesso!');
      res.json({
        success: true,
        message: 'CT-e criado automaticamente a partir da NF-e',
        data: result.rows[0]
      });

    } catch (error) {
      console.error('❌ Erro ao criar CT-e automaticamente:', error);
      if (client) client.release();
      res.status(500).json({
        error: 'Erro ao criar CT-e automaticamente',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

  } catch (error) {
    console.error('❌ Erro geral na criação automática:', error);
    res.status(500).json({
      error: 'Erro na criação automática de CT-e',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Função para criar rotas CRUD genéricas
const createCrudRoutes = (tableName, entityName) => {
  // Get all
  app.get(`/api/${tableName}`, authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} ORDER BY created_at DESC`);
      res.json(result.rows);
    } catch (error) {
      console.error(`Get ${entityName} error:`, error);
      res.status(500).json({ error: `Erro ao buscar ${entityName}` });
    }
  });

  // Get by ID
  app.get(`/api/${tableName}/:id`, authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: `${entityName} não encontrado` });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error(`Get ${entityName} by ID error:`, error);
      res.status(500).json({ error: `Erro ao buscar ${entityName}` });
    }
  });

  // Create
  app.post(`/api/${tableName}`, authenticateToken, async (req, res) => {
    try {
      const data = req.body;
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')}, created_at, updated_at)
        VALUES (${placeholders}, NOW(), NOW())
        RETURNING *
      `;

      const result = await pool.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error(`Create ${entityName} error:`, error);
      res.status(500).json({ error: `Erro ao criar ${entityName}` });
    }
  });

  // Update
  app.put(`/api/${tableName}/:id`, authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const columns = Object.keys(data);
      const values = Object.values(data);

      const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');

      const query = `
        UPDATE ${tableName}
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, [id, ...values]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: `${entityName} não encontrado` });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error(`Update ${entityName} error:`, error);
      res.status(500).json({ error: `Erro ao atualizar ${entityName}` });
    }
  });

  // Delete
  app.delete(`/api/${tableName}/:id`, authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING *`, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: `${entityName} não encontrado` });
      }

      res.json({ message: `${entityName} deletado com sucesso` });
    } catch (error) {
      console.error(`Delete ${entityName} error:`, error);
      res.status(500).json({ error: `Erro ao deletar ${entityName}` });
    }
  });
};

// Criar rotas CRUD para diferentes entidades
createCrudRoutes('usuarios', 'usuário');
createCrudRoutes('veiculos', 'veículo');
createCrudRoutes('abastecimentos', 'abastecimento');
createCrudRoutes('manutencoes', 'manutenção');
createCrudRoutes('checklists', 'checklist');
createCrudRoutes('funcionarios', 'funcionário');
createCrudRoutes('cadastros', 'cadastro');
createCrudRoutes('empresas_fiscais', 'empresa fiscal');

// Rotas específicas para o módulo financeiro
createCrudRoutes('centros_custo', 'centro de custo');
createCrudRoutes('contas_pagar', 'conta a pagar');
createCrudRoutes('contas_receber', 'conta a receber');

// ===== ROTAS MDF-e DOCUMENTOS =====

// Rota para criar documento MDF-e
app.post('/api/mdfe-documentos', authenticateToken, async (req, res) => {
  const requestId = generateRequestId();
  let client;

  try {
    console.log(`🚨 [${requestId}] === INÍCIO CRIAÇÃO MDF-e ===`);
    console.log(`📝 [${requestId}] Dados RAW recebidos da interface:`, JSON.stringify(req.body, null, 2));

    // Conectar ao banco do usuário
    console.log(`🔍 [${requestId}] USANDO BANCO DO USUÁRIO: ${req.user.email}`);
    const userDbConfig = await getUserDbConfig(req.user.email);
    
    if (!userDbConfig || !userDbConfig.configuracao_padrao) {
      throw new Error('Configuração de banco de dados do usuário não encontrada');
    }

    console.log(`🔗 Conectando ao banco do usuário: ${userDbConfig.configuracao_padrao.nome_empresa}`);
    client = new Client(userDbConfig.configuracao_padrao);
    await client.connect();

    const data = req.body;

    // Validar dados obrigatórios
    if (!data.empresa_id) {
      throw new Error('ID da empresa é obrigatório');
    }

    if (!data.cte_ids || !Array.isArray(data.cte_ids) || data.cte_ids.length === 0) {
      throw new Error('É necessário selecionar pelo menos um CT-e emitido para criar o MDF-e');
    }

    console.log(`✅ CT-es selecionados para MDF-e: ${data.cte_ids.length}`);

    // Verificar se todos os CT-es estão emitidos e pertencem à empresa
    const ctesValidation = await client.query(`
      SELECT id, numero_cte, status, chave_acesso 
      FROM cte_documentos 
      WHERE id = ANY($1) AND empresa_id = $2
    `, [data.cte_ids, data.empresa_id]);

    if (ctesValidation.rows.length !== data.cte_ids.length) {
      throw new Error('Alguns CT-es selecionados não foram encontrados ou não pertencem à empresa');
    }

    const ctesNaoEmitidos = ctesValidation.rows.filter(cte => cte.status !== 'emitido');
    if (ctesNaoEmitidos.length > 0) {
      throw new Error(`CT-es ${ctesNaoEmitidos.map(c => c.numero_cte).join(', ')} não estão emitidos`);
    }

    console.log(`✅ Todos os CT-es validados: ${ctesValidation.rows.map(c => c.numero_cte).join(', ')}`);

    // Buscar dados da empresa
    const empresa = await client.query(
      `SELECT id, serie_padrao_mdfe, codigo_uf, proximo_numero_mdfe FROM empresas_fiscais WHERE id = $1`,
      [data.empresa_id]
    );

    if (empresa.rows.length === 0) {
      throw new Error('Empresa fiscal não encontrada');
    }

    const empresaData = empresa.rows[0];
    console.log(`🏢 Empresa validada: ${empresaData.id}`);

    // APLICAR MESMA LÓGICA DE NUMERAÇÃO SEQUENCIAL DO CT-e
    let numeroFinal = data.numero_mdfe;
    if (!numeroFinal || numeroFinal === "AUTO" || numeroFinal.trim() === "") {
      console.log('🔒 Obtendo próximo número MDF-e da empresa cadastrada...');
      
      // Buscar último número real usado nos documentos desta empresa
      const ultimoNumeroResult = await client.query(`
        SELECT COALESCE(MAX(CAST(numero_mdfe AS INTEGER)), 0) as ultimo_numero
        FROM mdfe_documentos
        WHERE empresa_id = $1
        AND numero_mdfe ~ '^[0-9]+$'
      `, [data.empresa_id]);

      const ultimoNumeroReal = ultimoNumeroResult.rows[0].ultimo_numero || 0;
      const proximoNumeroCalculado = ultimoNumeroReal + 1;
      
      console.log('📋 ÚLTIMO NÚMERO MDF-e REAL NA BASE:', ultimoNumeroReal);
      console.log('📋 PRÓXIMO NÚMERO MDF-e CALCULADO:', proximoNumeroCalculado);
      console.log('📋 VALOR NA EMPRESA (campo):', empresaData.proximo_numero_mdfe);
      
      // Usar o maior entre calculado e campo da empresa
      numeroFinal = Math.max(proximoNumeroCalculado, empresaData.proximo_numero_mdfe);
      console.log('📋 NÚMERO MDF-e FINAL ESCOLHIDO:', numeroFinal);

      // Atualizar o próximo número na empresa
      await client.query(`
        UPDATE empresas_fiscais 
        SET proximo_numero_mdfe = $2
        WHERE id = $1
      `, [data.empresa_id, numeroFinal + 1]);
      
      console.log('📋 Próximo número MDF-e atualizado na empresa para:', numeroFinal + 1);
    }

    // Usar série padrão da empresa se não fornecida
    const serieFinal = data.serie || empresaData.serie_padrao_mdfe || "001";

    // Criar o documento MDF-e
    const result = await client.query(`
      INSERT INTO mdfe_documentos (
        empresa_id,
        numero_mdfe,
        serie,
        data_emissao,
        codigo_uf,
        forma_emissao,
        status,
        observacoes,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [
      data.empresa_id,
      numeroFinal.toString(),
      serieFinal,
      data.data_emissao,
      empresaData.codigo_uf || "31",
      data.forma_emissao || 1,
      data.status || "pendente",
      data.observacoes
    ]);

    if (result.rows.length === 0) {
      throw new Error("Erro ao criar documento MDF-e");
    }

    const mdfeDoc = result.rows[0];

    // Vincular CT-es ao MDF-e
    console.log('🔗 Vinculando CT-es ao MDF-e...');
    for (const cteId of data.cte_ids) {
      await client.query(`
        INSERT INTO mdfe_cte_relacionados (mdfe_documento_id, cte_documento_id, created_at)
        VALUES ($1, $2, NOW())
      `, [mdfeDoc.id, cteId]);
    }

    console.log(`✅ Documento MDF-e criado com sucesso: ${mdfeDoc.id}`);
    console.log(`✅ CT-es vinculados: ${data.cte_ids.length}`);

    res.json({
      message: 'Documento MDF-e criado com sucesso',
      documento: mdfeDoc
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Erro ao criar documento MDF-e:`, error);
    res.status(400).json({ 
      error: error.message || 'Erro interno do servidor',
      details: error.stack
    });
  } finally {
    if (client) {
      await client.end();
    }
  }
});

// Rotas específicas para CT-e
app.get('/api/cte-documentos', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        e.razao_social as empresa_razao_social,
        e.cnpj as empresa_cnpj
      FROM cte_documentos c
      JOIN empresas_fiscais e ON c.empresa_id = e.id
      ORDER BY c.data_emissao DESC, CAST(c.numero_cte AS INTEGER) DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get CT-e documents error:', error);
    res.status(500).json({ error: 'Erro ao buscar documentos CT-e' });
  }
});

// Rota para buscar documentos CT-e pendentes
app.get('/api/cte-documentos/pendentes', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Buscando documentos CT-e pendentes...');

    const result = await pool.query(`
      SELECT * FROM cte_documentos
      WHERE status = 'pendente' AND xml_gerado = 'true'
      ORDER BY created_at ASC
    `);

    console.log(`✅ Encontrados ${result.rows.length} documentos pendentes`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao buscar documentos CT-e pendentes:', error);
    res.status(500).json({ error: 'Erro ao buscar documento CT-e' });
  }
});

// Rota para atualizar status de um CT-e
app.put('/api/cte-documentos/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, processado } = req.body;

    console.log(`🔄 Atualizando status do CT-e ${id} para: ${status}`);

    const result = await pool.query(`
      UPDATE cte_documentos
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento CT-e não encontrado' });
    }

    console.log(`✅ Status do CT-e ${id} atualizado com sucesso`);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Erro ao atualizar status do CT-e:', error);
    res.status(500).json({ error: 'Erro ao atualizar status do documento CT-e' });
  }
});

app.get('/api/cte-documentos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM cte_documentos WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento CT-e não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get CT-e document by ID error:', error);
    res.status(500).json({ error: 'Erro ao buscar documento CT-e' });
  }
});

// Rota para limpar permissões órfãs
app.delete('/api/user-permissions/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verificar se o usuário realmente não existe
    const userExists = await pool.query('SELECT id FROM usuarios WHERE id = $1', [userId]);

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Usuário ainda existe no sistema' });
    }

    // Remover permissões órfãs
    const result = await pool.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);

    res.json({
      message: 'Permissões órfãs removidas com sucesso',
      deletedCount: result.rowCount
    });
  } catch (error) {
    console.error('Error cleaning up orphaned permissions:', error);
    res.status(500).json({ error: 'Erro ao remover permissões órfãs' });
  }
});

// Rota para verificar inconsistências entre usuários e permissões
app.get('/api/permissions/audit', authenticateToken, async (req, res) => {
  try {
    // Buscar permissões órfãs (permissões sem usuário correspondente)
    const orphanedPermissions = await pool.query(`
      SELECT DISTINCT up.user_id, COUNT(*) as permission_count
      FROM user_permissions up
      LEFT JOIN usuarios u ON up.user_id = u.id
      WHERE u.id IS NULL
      GROUP BY up.user_id
    `);

    // Buscar usuários sem permissões
    const usersWithoutPermissions = await pool.query(`
      SELECT u.id, u.email, u.nome, u.tipo
      FROM usuarios u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      WHERE up.user_id IS NULL
    `);

    res.json({
      orphanedPermissions: orphanedPermissions.rows,
      usersWithoutPermissions: usersWithoutPermissions.rows
    });
  } catch (error) {
    console.error('Error auditing permissions:', error);
    res.status(500).json({ error: 'Erro ao auditar permissões' });
  }
});

// Todas as outras rotas direcionam para o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Endpoint para upload de arquivos XML
app.post('/api/upload-xml', async (req, res) => {
  try {
    const { content, path, filename } = req.body;

    if (!content || !path || !filename) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    console.log("📁 Recebendo arquivo XML para salvar:", path);

    // Criar diretório se não existir
    const fs = require('fs').promises;
    const pathLib = require('path');

    const fullPath = pathLib.join(__dirname, path);
    const directory = pathLib.dirname(fullPath);

    // Criar diretórios recursivamente
    await fs.mkdir(directory, { recursive: true });

    // Salvar arquivo
    await fs.writeFile(fullPath, content, 'utf8');

    console.log("✅ Arquivo XML salvo com sucesso:", fullPath);

    res.json({
      success: true,
      path: path,
      size: content.length
    });

  } catch (error) {
    console.error("❌ Erro ao salvar arquivo XML:", error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Servir arquivos XML estáticos
app.get('/uploads/*', (req, res) => {
  const fs = require('fs');
  const path = require('path');

  const filePath = path.join(__dirname, req.path);

  // Verificar se o arquivo existe
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  // Definir tipo de conteúdo baseado na extensão
  const ext = path.extname(filePath).toLowerCase();
  let contentType = 'application/octet-stream';

  if (ext === '.xml') {
    contentType = 'application/xml';
  } else if (ext === '.pdf') {
    contentType = 'application/pdf';
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);

  // Enviar arquivo
  res.sendFile(filePath);
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro Interno do Servidor' });
});

// Iniciar servidor
const server = app.listen(PORT, 'localhost', () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);

  // Inicializar estrutura do banco principal na inicialização com client válido
  pool.connect()
    .then(async (client) => {
      try {
        await createDatabaseStructure(client);
        console.log('✅ Estrutura do banco principal inicializada com sucesso');
      } catch (error) {
        console.error('❌ Erro ao inicializar estrutura do banco principal:', error);
      } finally {
        client.release();
      }
    })
    .catch((error) => {
      console.error('❌ Erro ao conectar com o banco para inicialização:', error);
    });
});

// Tratamento de sinais para encerramento gracioso
const gracefulShutdown = () => {
  console.log('Iniciando encerramento gracioso...');
  server.close(async () => {
    await mainPool.end();
    console.log('Servidor encerrado com sucesso');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);