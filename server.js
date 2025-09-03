require('dotenv').config();

const express = require('express');
const compression = require('compression');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Compressão gzip
app.use(compression());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware para verificar JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, role = 'user' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM auth.users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Usuário já existe' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);



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

  }
});

    // Create user
    const result = await pool.query(
      `INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
       VALUES ($1, $2, NOW(), NOW(), NOW(), $3)
       RETURNING id, email, created_at`,
      [email, hashedPassword, JSON.stringify({ name, role })]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        name,
        role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name,
        role,
        created_at: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, encrypted_password, raw_user_meta_data FROM auth.users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];
    const userData = JSON.parse(user.raw_user_meta_data || '{}');

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.encrypted_password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        name: userData.name,
        role: userData.role || 'user'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: userData.name,
        role: userData.role || 'user'
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logout realizado com sucesso' });
});

// Database query endpoint
app.post('/api/db/query', authenticateToken, async (req, res) => {
  try {
    const { query, params = [] } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query é obrigatória' });
    }

    const result = await pool.query(query, params);
    res.json({ data: result.rows, rowCount: result.rowCount });

  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Erro na consulta ao banco de dados' });
  }
});

// Generic CRUD endpoints for different entities
const createCrudRoutes = (tableName, entityName) => {
  // Get all
  app.get(`/api/${tableName}`, authenticateToken, async (req, res) => {
    try {
      // Query específica para postos para garantir todos os campos
      let query = `SELECT * FROM ${tableName} ORDER BY created_at DESC`;
      
      if (tableName === 'postos') {
        query = `
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
          FROM postos 
          ORDER BY nome
        `;
      }
      
      console.log(`Executando query para ${tableName}:`, query);
      const result = await pool.query(query);
      console.log(`Resultado para ${tableName}:`, result.rows.length, 'registros');
      
      if (tableName === 'postos' && result.rows.length > 0) {
        console.log('Primeiro posto do backend:', result.rows[0]);
      }
      
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

// Create CRUD routes for different entities
createCrudRoutes('users', 'usuário');
createCrudRoutes('vehicles', 'veículo');
createCrudRoutes('supplies', 'suprimento');
createCrudRoutes('maintenance', 'manutenção');
createCrudRoutes('checklists', 'checklist');
createCrudRoutes('funcionarios', 'funcionário');
createCrudRoutes('reports', 'relatório');

// CT-e documentos route
app.post('/api/cte-documentos', authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    
    // Get next CT-e number if not provided
    if (!data.numero_cte) {
      const lastCte = await pool.query(
        'SELECT numero_cte FROM cte_documentos WHERE empresa_id = $1 ORDER BY numero_cte DESC LIMIT 1',
        [data.empresa_id]
      );
      data.numero_cte = lastCte.rows.length > 0 ? lastCte.rows[0].numero_cte + 1 : 1;
    }
    
    // Set default series if not provided
    if (!data.serie) {
      data.serie = 1;
    }
    
    const result = await pool.query(
      `INSERT INTO cte_documentos (
        empresa_id,
        numero_cte,
        serie,
        data_emissao,
        status,
        observacoes,
        tomador_id,
        remetente_id,
        recebedor_id,
        destinatario_id,
        valor_prestacao,
        valor_receber,
        valor_tributos,
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
        valor_pedagio,
        valor_seguro,
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
        associacao_frota_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43
      ) RETURNING *`,
      [
        data.empresa_id,
        data.numero_cte,
        data.serie,
        data.data_emissao,
        data.status || 'rascunho',
        data.observacoes,
        data.tomador_id,
        data.remetente_id,
        data.recebedor_id,
        data.destinatario_id,
        data.valor_prestacao,
        data.valor_receber,
        data.valor_tributos,
        data.icms_situacao_tributaria,
        data.icms_bc_valor,
        data.icms_aliquota,
        data.icms_valor,
        data.valor_carga,
        data.quantidade_carga,
        data.produto_predominante_id,
        data.chave_acesso_1,
        data.chave_acesso_2,
        data.chave_acesso_3,
        data.chave_acesso_4,
        data.valor_pedagio,
        data.valor_seguro,
        data.tipo_servico,
        data.finalidade_cte,
        data.cfop,
        data.cidade_inicio_ibge,
        data.cidade_termino_ibge,
        data.uf_inicio,
        data.uf_termino,
        data.cidade_inicio_nome,
        data.cidade_termino_nome,
        data.rntrc,
        data.motorista_nome,
        data.motorista_cnh,
        data.motorista_matricula,
        data.motorista_validade_cnh,
        data.placa_veiculo,
        data.placa_reboque,
        data.associacao_frota_id
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Create CT-e error:', error);
    res.status(500).json({ error: 'Erro ao criar documento CT-e' });
  }
});

// Cache para arquivos estáticos
app.use(express.static('dist', {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Todas as rotas direcionam para o index.html (deve vir por último)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});