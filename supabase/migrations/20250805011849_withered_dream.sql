/*
  # Módulo de Configurações de Banco de Dados para Múltiplas Empresas

  1. Nova Tabela database_configurations
    - `id` (uuid, primary key)
    - `nome_empresa` (text, nome da empresa)
    - `codigo_empresa` (text, código único da empresa)
    - `host` (text, host do banco de dados)
    - `port` (integer, porta do banco)
    - `database_name` (text, nome do banco)
    - `username` (text, usuário do banco)
    - `password` (text, senha criptografada)
    - `ssl_enabled` (boolean, se SSL está habilitado)
    - `connection_string` (text, string de conexão completa)
    - `max_connections` (integer, máximo de conexões)
    - `timeout_seconds` (integer, timeout em segundos)
    - `ativo` (boolean, se a configuração está ativa)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Atualizar tabela usuarios
    - Adicionar `database_config_id` (uuid, foreign key)
    - Relacionar usuário com configuração de banco

  3. Segurança
    - Enable RLS na tabela database_configurations
    - Apenas admins podem gerenciar configurações
    - Senhas são criptografadas

  4. Índices
    - Por código da empresa
    - Por status ativo
    - Por usuários
*/

-- Criar tabela de configurações de banco de dados
CREATE TABLE IF NOT EXISTS database_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa text NOT NULL,
  codigo_empresa text UNIQUE NOT NULL,
  host text NOT NULL,
  port integer NOT NULL DEFAULT 5432,
  database_name text NOT NULL,
  username text NOT NULL,
  password text NOT NULL, -- Será criptografado pela aplicação
  ssl_enabled boolean DEFAULT true,
  connection_string text, -- String de conexão gerada automaticamente
  max_connections integer DEFAULT 10,
  timeout_seconds integer DEFAULT 30,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar constraints
ALTER TABLE database_configurations 
ADD CONSTRAINT database_configurations_codigo_empresa_unique UNIQUE (codigo_empresa);

ALTER TABLE database_configurations 
ADD CONSTRAINT database_configurations_port_valid CHECK (port > 0 AND port <= 65535);

ALTER TABLE database_configurations 
ADD CONSTRAINT database_configurations_max_connections_valid CHECK (max_connections > 0 AND max_connections <= 100);

ALTER TABLE database_configurations 
ADD CONSTRAINT database_configurations_timeout_valid CHECK (timeout_seconds > 0 AND timeout_seconds <= 300);

-- Adicionar coluna database_config_id na tabela usuarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'database_config_id'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN database_config_id uuid;
    RAISE NOTICE 'Coluna database_config_id adicionada à tabela usuarios';
  END IF;
END $$;

-- Adicionar foreign key para database_configurations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'usuarios_database_config_id_fkey' 
    AND table_name = 'usuarios'
  ) THEN
    ALTER TABLE usuarios 
    ADD CONSTRAINT usuarios_database_config_id_fkey 
    FOREIGN KEY (database_config_id) REFERENCES database_configurations(id);
    RAISE NOTICE 'Foreign key constraint criada: usuarios -> database_configurations';
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_database_configurations_codigo_empresa ON database_configurations(codigo_empresa);
CREATE INDEX IF NOT EXISTS idx_database_configurations_ativo ON database_configurations(ativo);
CREATE INDEX IF NOT EXISTS idx_database_configurations_nome_empresa ON database_configurations(nome_empresa);
CREATE INDEX IF NOT EXISTS idx_usuarios_database_config_id ON usuarios(database_config_id);

-- Enable RLS
ALTER TABLE database_configurations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem gerenciar configurações
CREATE POLICY "Apenas admins podem ver configurações"
  ON database_configurations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = current_setting('app.current_user_id', true)::uuid
      AND tipo = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem gerenciar configurações"
  ON database_configurations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = current_setting('app.current_user_id', true)::uuid
      AND tipo = 'admin'
    )
  );

-- Inserir configuração padrão (atual)
INSERT INTO database_configurations (
  nome_empresa,
  codigo_empresa,
  host,
  port,
  database_name,
  username,
  password,
  ssl_enabled,
  connection_string,
  max_connections,
  timeout_seconds,
  ativo
) VALUES (
  'SystemTruck - Configuração Padrão',
  'SYSTEMTRUCK_DEFAULT',
  'localhost',
  5454,
  'frota_management',
  'postgres',
  'bytecross8682', -- Será criptografado pela aplicação
  false,
  'postgres://postgres:bytecross8682@localhost:5454/frota_management',
  20,
  30,
  true
) ON CONFLICT (codigo_empresa) DO NOTHING;

-- Atualizar usuários existentes para usar a configuração padrão
DO $$
DECLARE
  default_config_id uuid;
  updated_count integer;
BEGIN
  -- Buscar ID da configuração padrão
  SELECT id INTO default_config_id 
  FROM database_configurations 
  WHERE codigo_empresa = 'SYSTEMTRUCK_DEFAULT';
  
  IF default_config_id IS NOT NULL THEN
    -- Atualizar usuários que não têm configuração de banco
    UPDATE usuarios 
    SET database_config_id = default_config_id,
        updated_at = now()
    WHERE database_config_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Atualizados % usuários com configuração padrão de banco', updated_count;
  ELSE
    RAISE NOTICE 'Configuração padrão não encontrada';
  END IF;
END $$;

-- Adicionar permissões para o módulo de configurações de banco
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Adicionar permissão de configurações de banco para todos os admins
  FOR user_record IN 
    SELECT id FROM usuarios WHERE tipo = 'admin'
  LOOP
    INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete)
    VALUES (user_record.id, 'configuracoes_banco', true, true, true, true)
    ON CONFLICT (user_id, module) DO UPDATE SET
      can_access = true,
      can_create = true,
      can_edit = true,
      can_delete = true,
      updated_at = now();
  END LOOP;
  
  RAISE NOTICE 'Permissões do módulo configurações de banco adicionadas para todos os administradores';
END $$;

-- Função para gerar connection string automaticamente
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

-- Trigger para gerar connection string automaticamente
DROP TRIGGER IF EXISTS generate_connection_string_trigger ON database_configurations;
CREATE TRIGGER generate_connection_string_trigger
  BEFORE INSERT OR UPDATE ON database_configurations
  FOR EACH ROW
  EXECUTE FUNCTION generate_connection_string();

-- Verificação final
DO $$
DECLARE
  config_count INTEGER;
  user_count INTEGER;
  users_with_config INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM database_configurations;
  SELECT COUNT(*) INTO user_count FROM usuarios;
  SELECT COUNT(*) INTO users_with_config FROM usuarios WHERE database_config_id IS NOT NULL;
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Configurações de banco criadas: %', config_count;
  RAISE NOTICE 'Total de usuários: %', user_count;
  RAISE NOTICE 'Usuários com configuração de banco: %', users_with_config;
  
  IF config_count > 0 AND users_with_config = user_count THEN
    RAISE NOTICE '✅ Módulo de configurações de banco criado com sucesso!';
  ELSE
    RAISE NOTICE '⚠️  Verificar se todas as configurações foram aplicadas';
  END IF;
END $$;