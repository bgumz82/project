/*
  # Estrutura Completa do Banco de Dados - Correção de Erros

  1. Verificar e criar todas as tabelas necessárias
  2. Garantir que todas as colunas existam com tipos corretos
  3. Adicionar dados de exemplo se necessário
  4. Corrigir foreign keys e constraints
  5. Atualizar senhas com hashes bcrypt válidos

  ## Tabelas que serão verificadas/criadas:
  - usuarios (com coluna senha)
  - veiculos (com coluna ativo)
  - cadastros (substituindo postos)
  - abastecimentos (com foreign keys corretas)
  - manutencoes
  - checklists
  - funcionarios
  - user_permissions
  - centros_custo
  - contas_pagar
  - contas_receber
*/

-- Garantir extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CRIAR/VERIFICAR TABELA USUARIOS
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usuarios') THEN
    CREATE TABLE usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email varchar(255) UNIQUE NOT NULL,
      nome varchar(255) NOT NULL,
      tipo varchar(50) NOT NULL CHECK (tipo IN ('admin', 'operador_checklist', 'operador_abastecimento')),
      senha varchar(255) NOT NULL,
      ativo boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    RAISE NOTICE 'Tabela usuarios criada';
  ELSE
    -- Verificar e adicionar colunas faltantes
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'senha') THEN
      ALTER TABLE usuarios ADD COLUMN senha varchar(255);
      RAISE NOTICE 'Coluna senha adicionada à tabela usuarios';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'ativo') THEN
      ALTER TABLE usuarios ADD COLUMN ativo boolean DEFAULT true;
      RAISE NOTICE 'Coluna ativo adicionada à tabela usuarios';
    END IF;
    
    RAISE NOTICE 'Tabela usuarios verificada';
  END IF;
END $$;

-- 2. CRIAR/VERIFICAR TABELA VEICULOS
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'veiculos') THEN
    CREATE TABLE veiculos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      placa varchar(10) NOT NULL UNIQUE,
      tipo varchar(50) NOT NULL CHECK (tipo IN ('carro', 'caminhao', 'maquina_pesada', 'implementos', 'onibus')),
      marca varchar(100) NOT NULL,
      modelo varchar(100) NOT NULL,
      ano integer NOT NULL,
      qrcode_data varchar(255) NOT NULL,
      ativo boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    RAISE NOTICE 'Tabela veiculos criada';
  ELSE
    -- Verificar e adicionar colunas faltantes
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'ativo') THEN
      ALTER TABLE veiculos ADD COLUMN ativo boolean DEFAULT true;
      RAISE NOTICE 'Coluna ativo adicionada à tabela veiculos';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'qrcode_data') THEN
      ALTER TABLE veiculos ADD COLUMN qrcode_data varchar(255);
      UPDATE veiculos SET qrcode_data = 'vehicle_' || placa WHERE qrcode_data IS NULL;
      ALTER TABLE veiculos ALTER COLUMN qrcode_data SET NOT NULL;
      RAISE NOTICE 'Coluna qrcode_data adicionada à tabela veiculos';
    END IF;
    
    RAISE NOTICE 'Tabela veiculos verificada';
  END IF;
END $$;

-- 3. CRIAR/VERIFICAR TABELA CADASTROS
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cadastros') THEN
    -- Criar enum se não existir
    DO $enum$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cadastro_tipo') THEN
        CREATE TYPE cadastro_tipo AS ENUM ('cliente', 'fornecedor', 'abastecimento');
      END IF;
    END $enum$;
    
    CREATE TABLE cadastros (
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
    );
    RAISE NOTICE 'Tabela cadastros criada';
  ELSE
    RAISE NOTICE 'Tabela cadastros já existe';
  END IF;
END $$;

-- 4. CRIAR/VERIFICAR TABELA ABASTECIMENTOS
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'abastecimentos') THEN
    CREATE TABLE abastecimentos (
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
    );
    RAISE NOTICE 'Tabela abastecimentos criada';
  ELSE
    RAISE NOTICE 'Tabela abastecimentos já existe';
  END IF;
END $$;

-- 5. CRIAR/VERIFICAR TABELA MANUTENCOES
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'manutencoes') THEN
    CREATE TABLE manutencoes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      veiculo_id uuid NOT NULL,
      tipo varchar(100) NOT NULL,
      descricao text NOT NULL,
      data_prevista date NOT NULL,
      data_realizada date,
      alerta_enviado boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    RAISE NOTICE 'Tabela manutencoes criada';
  ELSE
    RAISE NOTICE 'Tabela manutencoes já existe';
  END IF;
END $$;

-- 6. CRIAR/VERIFICAR TABELA CHECKLISTS
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'checklists') THEN
    CREATE TABLE checklists (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      veiculo_id uuid NOT NULL,
      operador_id uuid NOT NULL,
      data_checklist timestamptz NOT NULL DEFAULT now(),
      itens jsonb NOT NULL,
      observacoes text,
      email_enviado boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    RAISE NOTICE 'Tabela checklists criada';
  ELSE
    RAISE NOTICE 'Tabela checklists já existe';
  END IF;
END $$;

-- 7. CRIAR/VERIFICAR TABELA FUNCIONARIOS
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'funcionarios') THEN
    CREATE TABLE funcionarios (
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
    );
    RAISE NOTICE 'Tabela funcionarios criada';
  ELSE
    RAISE NOTICE 'Tabela funcionarios já existe';
  END IF;
END $$;

-- 8. CRIAR/VERIFICAR TABELA USER_PERMISSIONS
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_permissions') THEN
    CREATE TABLE user_permissions (
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
    );
    RAISE NOTICE 'Tabela user_permissions criada';
  ELSE
    RAISE NOTICE 'Tabela user_permissions já existe';
  END IF;
END $$;

-- 9. CRIAR/VERIFICAR TABELA CENTROS_CUSTO
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'centros_custo') THEN
    CREATE TABLE centros_custo (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome varchar(255) NOT NULL,
      descricao text,
      ativo boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    RAISE NOTICE 'Tabela centros_custo criada';
  ELSE
    RAISE NOTICE 'Tabela centros_custo já existe';
  END IF;
END $$;

-- 10. CRIAR/VERIFICAR TABELA CONTAS_PAGAR
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contas_pagar') THEN
    CREATE TABLE contas_pagar (
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
    );
    RAISE NOTICE 'Tabela contas_pagar criada';
  ELSE
    RAISE NOTICE 'Tabela contas_pagar já existe';
  END IF;
END $$;

-- 11. CRIAR/VERIFICAR TABELA CONTAS_RECEBER
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contas_receber') THEN
    CREATE TABLE contas_receber (
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
    );
    RAISE NOTICE 'Tabela contas_receber criada';
  ELSE
    RAISE NOTICE 'Tabela contas_receber já existe';
  END IF;
END $$;

-- 12. ADICIONAR FOREIGN KEYS (SEM FALHAR SE JÁ EXISTIREM)
DO $$
BEGIN
  -- Foreign keys para abastecimentos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'abastecimentos_veiculo_id_fkey' 
    AND table_name = 'abastecimentos'
  ) THEN
    ALTER TABLE abastecimentos ADD CONSTRAINT abastecimentos_veiculo_id_fkey 
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'abastecimentos_operador_id_fkey' 
    AND table_name = 'abastecimentos'
  ) THEN
    ALTER TABLE abastecimentos ADD CONSTRAINT abastecimentos_operador_id_fkey 
    FOREIGN KEY (operador_id) REFERENCES usuarios(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'abastecimentos_posto_id_fkey' 
    AND table_name = 'abastecimentos'
  ) THEN
    ALTER TABLE abastecimentos ADD CONSTRAINT abastecimentos_posto_id_fkey 
    FOREIGN KEY (posto_id) REFERENCES cadastros(id);
  END IF;

  -- Foreign keys para manutencoes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'manutencoes_veiculo_id_fkey' 
    AND table_name = 'manutencoes'
  ) THEN
    ALTER TABLE manutencoes ADD CONSTRAINT manutencoes_veiculo_id_fkey 
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id);
  END IF;

  -- Foreign keys para checklists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'checklists_veiculo_id_fkey' 
    AND table_name = 'checklists'
  ) THEN
    ALTER TABLE checklists ADD CONSTRAINT checklists_veiculo_id_fkey 
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'checklists_operador_id_fkey' 
    AND table_name = 'checklists'
  ) THEN
    ALTER TABLE checklists ADD CONSTRAINT checklists_operador_id_fkey 
    FOREIGN KEY (operador_id) REFERENCES usuarios(id);
  END IF;

  -- Foreign keys para user_permissions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_permissions_user_id_fkey' 
    AND table_name = 'user_permissions'
  ) THEN
    ALTER TABLE user_permissions ADD CONSTRAINT user_permissions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
  END IF;

  RAISE NOTICE 'Foreign keys verificadas e criadas conforme necessário';
END $$;

-- 13. INSERIR DADOS DE EXEMPLO SE AS TABELAS ESTIVEREM VAZIAS
DO $$
DECLARE
  valid_hash TEXT;
  user_count INTEGER;
  vehicle_count INTEGER;
  posto_count INTEGER;
BEGIN
  -- Hash bcrypt válido para senha "123456"
  valid_hash := '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
  
  -- Verificar se existem usuários
  SELECT COUNT(*) INTO user_count FROM usuarios;
  
  IF user_count = 0 THEN
    RAISE NOTICE 'Inserindo usuários de exemplo...';
    
    INSERT INTO usuarios (email, nome, tipo, senha, ativo) VALUES
    ('bruno@systemtruck.com.br', 'Bruno SystemTruck', 'admin', valid_hash, true),
    ('escritorio@shimizutransportes.com.br', 'Escritório Shimizu Transportes', 'admin', valid_hash, true),
    ('logistica@ferrazflorestal.com.br', 'Logística Ferraz Florestal', 'admin', valid_hash, true),
    ('mobile@ferrazflorestal.com.br', 'Mobile Ferraz Florestal', 'operador_checklist', valid_hash, true),
    ('fuel@ferrazflorestal.com.br', 'Fuel Ferraz Florestal', 'operador_abastecimento', valid_hash, true);
    
    RAISE NOTICE 'Usuários de exemplo inseridos';
  ELSE
    -- Atualizar senhas existentes se necessário
    UPDATE usuarios 
    SET senha = valid_hash, updated_at = now()
    WHERE senha IS NULL OR LENGTH(senha) < 10 OR senha NOT LIKE '$2%';
    
    RAISE NOTICE 'Senhas dos usuários existentes atualizadas';
  END IF;
  
  -- Verificar se existem veículos
  SELECT COUNT(*) INTO vehicle_count FROM veiculos;
  
  IF vehicle_count = 0 THEN
    RAISE NOTICE 'Inserindo veículos de exemplo...';
    
    INSERT INTO veiculos (placa, tipo, marca, modelo, ano, qrcode_data, ativo) VALUES
    ('ABC-1234', 'carro', 'Honda', 'Civic', 2020, 'vehicle_ABC-1234', true),
    ('DEF-5678', 'carro', 'Toyota', 'Corolla', 2021, 'vehicle_DEF-5678', true),
    ('GHI-9012', 'caminhao', 'Toyota', 'Hilux', 2019, 'vehicle_GHI-9012', true);
    
    RAISE NOTICE 'Veículos de exemplo inseridos';
  END IF;
  
  -- Verificar se existem postos/cadastros
  SELECT COUNT(*) INTO posto_count FROM cadastros WHERE tipo = 'abastecimento';
  
  IF posto_count = 0 THEN
    RAISE NOTICE 'Inserindo postos de exemplo...';
    
    INSERT INTO cadastros (tipo, razao_social, endereco, cidade, estado, cep, telefone, emails, ativo) VALUES
    ('abastecimento', 'Posto Shell Centro', 'Rua Principal, 123', 'São Paulo', 'SP', '01000-000', '(11) 1234-5678', '["contato@shell.com"]', true),
    ('abastecimento', 'Posto Ipiranga Norte', 'Av. Paulista, 456', 'São Paulo', 'SP', '01310-000', '(11) 8765-4321', '["info@ipiranga.com"]', true),
    ('abastecimento', 'Posto BR Sul', 'Rua das Flores, 789', 'São Paulo', 'SP', '04000-000', '(11) 5555-0000', '["atendimento@br.com"]', true);
    
    RAISE NOTICE 'Postos de exemplo inseridos';
  END IF;
END $$;

-- 14. CRIAR FUNÇÃO PARA PERMISSÕES PADRÃO
CREATE OR REPLACE FUNCTION setup_user_permissions_final(user_id_param uuid, user_type_param text)
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
    (user_id_param, 'abastecimentos', true, true, true, true),
    (user_id_param, 'cadastros', true, true, true, true),
    (user_id_param, 'manutencoes', true, true, true, true),
    (user_id_param, 'checklists', true, true, true, true),
    (user_id_param, 'funcionarios', true, true, true, true),
    (user_id_param, 'usuarios', true, true, true, true),
    (user_id_param, 'permissoes', true, true, true, true),
    (user_id_param, 'financeiro', true, true, true, true),
    (user_id_param, 'relatorios', true, true, false, false);
    
    permission_count := 11;
    
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

-- 15. CRIAR TRIGGERS PARA PERMISSÕES
CREATE OR REPLACE FUNCTION trigger_setup_user_permissions()
RETURNS TRIGGER AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT setup_user_permissions_final(NEW.id, NEW.tipo) INTO result;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover triggers existentes e criar novos
DROP TRIGGER IF EXISTS on_user_created ON usuarios;
DROP TRIGGER IF EXISTS on_user_type_updated ON usuarios;

CREATE TRIGGER on_user_created
  AFTER INSERT ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_setup_user_permissions();

CREATE TRIGGER on_user_type_updated
  AFTER UPDATE ON usuarios
  FOR EACH ROW
  WHEN (OLD.tipo IS DISTINCT FROM NEW.tipo)
  EXECUTE FUNCTION trigger_setup_user_permissions();

-- 16. CRIAR PERMISSÕES PARA USUÁRIOS EXISTENTES
DO $$
DECLARE
  user_record RECORD;
  result INTEGER;
BEGIN
  FOR user_record IN SELECT id, tipo FROM usuarios LOOP
    SELECT setup_user_permissions_final(user_record.id, user_record.tipo) INTO result;
  END LOOP;
  
  RAISE NOTICE 'Permissões criadas para todos os usuários existentes';
END $$;

-- 17. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON usuarios(tipo);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_ativo ON veiculos(ativo);
CREATE INDEX IF NOT EXISTS idx_cadastros_tipo ON cadastros(tipo);
CREATE INDEX IF NOT EXISTS idx_cadastros_ativo ON cadastros(ativo);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_data ON abastecimentos(data_abastecimento);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON user_permissions(module);

-- 18. VERIFICAÇÃO FINAL
DO $$
DECLARE
  table_count INTEGER;
  user_count INTEGER;
  vehicle_count INTEGER;
  permission_count INTEGER;
BEGIN
  -- Contar tabelas criadas
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_name IN ('usuarios', 'veiculos', 'cadastros', 'abastecimentos', 'manutencoes', 'checklists', 'funcionarios', 'user_permissions', 'centros_custo', 'contas_pagar', 'contas_receber');
  
  SELECT COUNT(*) INTO user_count FROM usuarios;
  SELECT COUNT(*) INTO vehicle_count FROM veiculos;
  SELECT COUNT(*) INTO permission_count FROM user_permissions;
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Tabelas criadas/verificadas: %', table_count;
  RAISE NOTICE 'Usuários no sistema: %', user_count;
  RAISE NOTICE 'Veículos no sistema: %', vehicle_count;
  RAISE NOTICE 'Permissões configuradas: %', permission_count;
  
  IF table_count >= 11 AND user_count >= 5 AND vehicle_count >= 3 AND permission_count > 0 THEN
    RAISE NOTICE '🎉 BANCO DE DADOS CONFIGURADO COM SUCESSO!';
  ELSE
    RAISE NOTICE '⚠️  Verificar se todas as tabelas foram criadas corretamente';
  END IF;
END $$;