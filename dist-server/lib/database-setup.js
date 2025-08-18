"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseSetup = void 0;
const pg_1 = require("pg");
class DatabaseSetup {
    constructor(config) {
        this.pool = new pg_1.Pool({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.username,
            password: config.password,
            ssl: config.ssl ? { rejectUnauthorized: false } : false,
            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });
    }
    async testConnection() {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            return true;
        }
        catch (error) {
            console.error('Erro ao testar conexão:', error);
            return false;
        }
    }
    async setupDatabase() {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // 1. Criar extensões necessárias
            await this.createExtensions(client);
            // 2. Criar enums
            await this.createEnums(client);
            // 3. Criar tabelas principais
            await this.createTables(client);
            // 4. Criar foreign keys
            await this.createForeignKeys(client);
            // 5. Criar índices
            await this.createIndexes(client);
            // 6. Criar funções e triggers
            await this.createFunctionsAndTriggers(client);
            // 7. Inserir dados iniciais
            await this.insertInitialData(client);
            await client.query('COMMIT');
            console.log('✅ Estrutura do banco de dados criada com sucesso!');
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro ao criar estrutura do banco:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async createExtensions(client) {
        await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    }
    async createEnums(client) {
        // Enum para tipos de usuário
        await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_usuario') THEN
          CREATE TYPE tipo_usuario AS ENUM ('admin', 'operador_checklist', 'operador_abastecimento');
        END IF;
      END $$;
    `);
        // Enum para tipos de cadastro
        await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cadastro_tipo') THEN
          CREATE TYPE cadastro_tipo AS ENUM ('cliente', 'fornecedor', 'abastecimento');
        END IF;
      END $$;
    `);
        // Enum para status de veículo
        await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'veiculo_status') THEN
          CREATE TYPE veiculo_status AS ENUM ('ativo', 'inativo', 'manutencao', 'vendido');
        END IF;
      END $$;
    `);
        // Enum para tipo de combustível
        await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_combustivel_veiculo') THEN
          CREATE TYPE tipo_combustivel_veiculo AS ENUM ('diesel_s10', 'diesel_s500', 'gasolina', 'etanol', 'flex');
        END IF;
      END $$;
    `);
    }
    async createTables(client) {
        // Tabela usuarios
        await client.query(`
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
    `);
        // Tabela veiculos
        await client.query(`
      CREATE TABLE IF NOT EXISTS veiculos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        placa varchar(10) NOT NULL UNIQUE,
        tipo varchar(50) NOT NULL CHECK (tipo IN ('carro', 'caminhao', 'maquina_pesada', 'implementos', 'onibus')),
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
    `);
        // Tabela cadastros
        await client.query(`
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
    `);
        // Tabela abastecimentos
        await client.query(`
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
    `);
        // Tabela manutencoes
        await client.query(`
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
    `);
        // Tabela checklists
        await client.query(`
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
    `);
        // Tabela funcionarios
        await client.query(`
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
        funcao varchar(100) NOT NULL,
        ativo boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
        // Tabela user_permissions
        await client.query(`
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
    `);
        // Tabela centros_custo
        await client.query(`
      CREATE TABLE IF NOT EXISTS centros_custo (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome varchar(255) NOT NULL,
        descricao text,
        ativo boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
        // Tabela contas_pagar
        await client.query(`
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
    `);
        // Tabela contas_receber
        await client.query(`
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
    `);
        // Tabela registros_antt
        await client.query(`
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
    `);
        // Tabela checklist_fotos
        await client.query(`
      CREATE TABLE IF NOT EXISTS checklist_fotos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        checklist_id uuid NOT NULL,
        tipo varchar(50) NOT NULL,
        url text NOT NULL,
        created_at timestamptz DEFAULT now()
      )
    `);
        // Tabela database_configurations
        await client.query(`
      CREATE TABLE IF NOT EXISTS database_configurations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome_empresa text NOT NULL,
        codigo_empresa text UNIQUE NOT NULL,
        host text NOT NULL,
        port integer NOT NULL DEFAULT 5432,
        database_name text NOT NULL,
        username text NOT NULL,
        password text NOT NULL,
        ssl_enabled boolean DEFAULT true,
        connection_string text,
        max_connections integer DEFAULT 10,
        timeout_seconds integer DEFAULT 30,
        ativo boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    }
    async createForeignKeys(client) {
        const foreignKeys = [
            // Abastecimentos
            {
                table: 'abastecimentos',
                constraint: 'abastecimentos_veiculo_id_fkey',
                definition: 'FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)'
            },
            {
                table: 'abastecimentos',
                constraint: 'abastecimentos_operador_id_fkey',
                definition: 'FOREIGN KEY (operador_id) REFERENCES usuarios(id)'
            },
            {
                table: 'abastecimentos',
                constraint: 'abastecimentos_posto_id_fkey',
                definition: 'FOREIGN KEY (posto_id) REFERENCES cadastros(id)'
            },
            // Manutenções
            {
                table: 'manutencoes',
                constraint: 'manutencoes_veiculo_id_fkey',
                definition: 'FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)'
            },
            // Checklists
            {
                table: 'checklists',
                constraint: 'checklists_veiculo_id_fkey',
                definition: 'FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)'
            },
            {
                table: 'checklists',
                constraint: 'checklists_operador_id_fkey',
                definition: 'FOREIGN KEY (operador_id) REFERENCES usuarios(id)'
            },
            // User permissions
            {
                table: 'user_permissions',
                constraint: 'user_permissions_user_id_fkey',
                definition: 'FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE'
            },
            // Registros ANTT
            {
                table: 'registros_antt',
                constraint: 'registros_antt_veiculo_id_fkey',
                definition: 'FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE'
            },
            // Checklist fotos
            {
                table: 'checklist_fotos',
                constraint: 'checklist_fotos_checklist_id_fkey',
                definition: 'FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE'
            },
            // Usuários -> Database config
            {
                table: 'usuarios',
                constraint: 'usuarios_database_config_id_fkey',
                definition: 'FOREIGN KEY (database_config_id) REFERENCES database_configurations(id)'
            }
        ];
        for (const fk of foreignKeys) {
            await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = '${fk.constraint}' 
            AND table_name = '${fk.table}'
          ) THEN
            ALTER TABLE ${fk.table} ADD CONSTRAINT ${fk.constraint} ${fk.definition};
          END IF;
        END $$;
      `);
        }
    }
    async createIndexes(client) {
        const indexes = [
            // Usuários
            'CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)',
            'CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON usuarios(tipo)',
            'CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo)',
            'CREATE INDEX IF NOT EXISTS idx_usuarios_database_config_id ON usuarios(database_config_id)',
            // Veículos
            'CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa)',
            'CREATE INDEX IF NOT EXISTS idx_veiculos_ativo ON veiculos(ativo)',
            'CREATE INDEX IF NOT EXISTS idx_veiculos_tipo ON veiculos(tipo)',
            'CREATE INDEX IF NOT EXISTS idx_veiculos_status ON veiculos(status)',
            'CREATE INDEX IF NOT EXISTS idx_veiculos_renavam ON veiculos(renavam)',
            'CREATE INDEX IF NOT EXISTS idx_veiculos_chassis ON veiculos(chassis)',
            // Cadastros
            'CREATE INDEX IF NOT EXISTS idx_cadastros_tipo ON cadastros(tipo)',
            'CREATE INDEX IF NOT EXISTS idx_cadastros_ativo ON cadastros(ativo)',
            'CREATE INDEX IF NOT EXISTS idx_cadastros_razao_social ON cadastros(razao_social)',
            'CREATE INDEX IF NOT EXISTS idx_cadastros_cnpj ON cadastros(cnpj)',
            // Abastecimentos
            'CREATE INDEX IF NOT EXISTS idx_abastecimentos_data ON abastecimentos(data_abastecimento)',
            'CREATE INDEX IF NOT EXISTS idx_abastecimentos_veiculo ON abastecimentos(veiculo_id)',
            'CREATE INDEX IF NOT EXISTS idx_abastecimentos_posto ON abastecimentos(posto_id)',
            // Manutenções
            'CREATE INDEX IF NOT EXISTS idx_manutencoes_veiculo ON manutencoes(veiculo_id)',
            'CREATE INDEX IF NOT EXISTS idx_manutencoes_data_prevista ON manutencoes(data_prevista)',
            // Checklists
            'CREATE INDEX IF NOT EXISTS idx_checklists_veiculo ON checklists(veiculo_id)',
            'CREATE INDEX IF NOT EXISTS idx_checklists_data ON checklists(data_checklist)',
            // Funcionários
            'CREATE INDEX IF NOT EXISTS idx_funcionarios_cpf ON funcionarios(cpf)',
            'CREATE INDEX IF NOT EXISTS idx_funcionarios_matricula ON funcionarios(matricula)',
            'CREATE INDEX IF NOT EXISTS idx_funcionarios_ativo ON funcionarios(ativo)',
            // Permissões
            'CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON user_permissions(module)',
            'CREATE INDEX IF NOT EXISTS idx_user_permissions_user_module ON user_permissions(user_id, module)',
            // Registros ANTT
            'CREATE INDEX IF NOT EXISTS idx_registros_antt_veiculo_id ON registros_antt(veiculo_id)',
            'CREATE INDEX IF NOT EXISTS idx_registros_antt_antt ON registros_antt(antt)',
            'CREATE INDEX IF NOT EXISTS idx_registros_antt_cnpj ON registros_antt(cnpj)',
            // Database configurations
            'CREATE INDEX IF NOT EXISTS idx_database_configurations_codigo_empresa ON database_configurations(codigo_empresa)',
            'CREATE INDEX IF NOT EXISTS idx_database_configurations_ativo ON database_configurations(ativo)'
        ];
        for (const indexQuery of indexes) {
            await client.query(indexQuery);
        }
    }
    async createFunctionsAndTriggers(client) {
        // Função para criar permissões padrão
        await client.query(`
      CREATE OR REPLACE FUNCTION create_user_permissions_complete(user_id_param uuid, user_type_param text)
      RETURNS INTEGER AS $$
      DECLARE
        permission_count INTEGER := 0;
        user_exists BOOLEAN := false;
        user_email TEXT;
      BEGIN
        -- Verificar se o usuário existe
        SELECT email INTO user_email FROM usuarios WHERE id = user_id_param;
        user_exists := FOUND;
        
        IF NOT user_exists THEN
          RETURN 0;
        END IF;

        -- Limpar permissões existentes
        DELETE FROM user_permissions WHERE user_id = user_id_param;
        
        -- Criar permissões baseadas no tipo
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
          (user_id_param, 'financeiro', true, true, true, true),
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
        // Função para triggers
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
        // Função para gerar connection string
        await client.query(`
      CREATE OR REPLACE FUNCTION generate_connection_string()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.connection_string := format(
          'postgres://%s:%s@%s:%s/%s%s',
          NEW.username,
          NEW.password,
          NEW.host,
          NEW.port,
          NEW.database_name,
          CASE WHEN NEW.ssl_enabled THEN '?sslmode=require' ELSE '' END
        );
        
        NEW.updated_at := now();
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
        // Triggers
        await client.query(`
      DROP TRIGGER IF EXISTS on_user_created ON usuarios;
      CREATE TRIGGER on_user_created
        AFTER INSERT ON usuarios
        FOR EACH ROW
        EXECUTE FUNCTION trigger_setup_user_permissions();
    `);
        await client.query(`
      DROP TRIGGER IF EXISTS on_user_type_updated ON usuarios;
      CREATE TRIGGER on_user_type_updated
        AFTER UPDATE ON usuarios
        FOR EACH ROW
        WHEN (OLD.tipo IS DISTINCT FROM NEW.tipo)
        EXECUTE FUNCTION trigger_setup_user_permissions();
    `);
        await client.query(`
      DROP TRIGGER IF EXISTS generate_connection_string_trigger ON database_configurations;
      CREATE TRIGGER generate_connection_string_trigger
        BEFORE INSERT OR UPDATE ON database_configurations
        FOR EACH ROW
        EXECUTE FUNCTION generate_connection_string();
    `);
    }
    async insertInitialData(client) {
        // Hash bcrypt válido para senha "123456"
        const validHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
        // Inserir usuário admin padrão
        await client.query(`
      INSERT INTO usuarios (email, nome, tipo, senha, ativo) 
      VALUES ('admin@empresa.com', 'Administrador', 'admin', $1, true)
      ON CONFLICT (email) DO NOTHING
    `, [validHash]);
        // Inserir alguns veículos de exemplo
        await client.query(`
      INSERT INTO veiculos (placa, tipo, marca, modelo, ano, qrcode_data, ativo) VALUES
      ('ABC-1234', 'carro', 'Honda', 'Civic', 2020, 'vehicle_ABC-1234', true),
      ('DEF-5678', 'carro', 'Toyota', 'Corolla', 2021, 'vehicle_DEF-5678', true),
      ('GHI-9012', 'caminhao', 'Toyota', 'Hilux', 2019, 'vehicle_GHI-9012', true)
      ON CONFLICT (placa) DO NOTHING
    `);
        // Inserir postos de abastecimento
        await client.query(`
      INSERT INTO cadastros (tipo, razao_social, endereco, cidade, estado, cep, telefone, emails, ativo) VALUES
      ('abastecimento', 'Posto Shell Centro', 'Rua Principal, 123', 'São Paulo', 'SP', '01000-000', '(11) 1234-5678', '["contato@shell.com"]', true),
      ('abastecimento', 'Posto Ipiranga Norte', 'Av. Paulista, 456', 'São Paulo', 'SP', '01310-000', '(11) 8765-4321', '["info@ipiranga.com"]', true),
      ('abastecimento', 'Posto BR Sul', 'Rua das Flores, 789', 'São Paulo', 'SP', '04000-000', '(11) 5555-0000', '["atendimento@br.com"]', true)
      ON CONFLICT DO NOTHING
    `);
        // Inserir centros de custo básicos
        await client.query(`
      INSERT INTO centros_custo (nome, descricao, ativo) VALUES
      ('Administrativo', 'Despesas administrativas gerais', true),
      ('Operacional', 'Despesas operacionais da frota', true),
      ('Manutenção', 'Custos de manutenção de veículos', true)
      ON CONFLICT DO NOTHING
    `);
    }
    async close() {
        await this.pool.end();
    }
}
exports.DatabaseSetup = DatabaseSetup;
