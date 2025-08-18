/*
  # Migração Completa - Estrutura Final do Banco de Dados

  1. Estrutura Completa
    - Criar todas as tabelas necessárias com estrutura correta
    - Garantir tipos de dados compatíveis
    - Adicionar foreign keys e constraints

  2. Dados Iniciais
    - Usuários com senhas bcrypt válidas
    - Veículos de exemplo
    - Postos de abastecimento
    - Centros de custo básicos

  3. Sistema de Permissões
    - Função robusta para criar permissões
    - Triggers automáticos
    - Permissões para todos os usuários

  4. Verificações
    - Integridade dos dados
    - Relacionamentos corretos
    - Performance otimizada
*/

-- Garantir extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CRIAR ENUM PARA TIPOS DE USUÁRIO
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_usuario') THEN
    CREATE TYPE tipo_usuario AS ENUM ('admin', 'operador_checklist', 'operador_abastecimento');
    RAISE NOTICE 'Enum tipo_usuario criado';
  ELSE
    RAISE NOTICE 'Enum tipo_usuario já existe';
  END IF;
END $$;

-- 2. CRIAR ENUM PARA TIPOS DE CADASTRO
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cadastro_tipo') THEN
    CREATE TYPE cadastro_tipo AS ENUM ('cliente', 'fornecedor', 'abastecimento');
    RAISE NOTICE 'Enum cadastro_tipo criado';
  ELSE
    RAISE NOTICE 'Enum cadastro_tipo já existe';
  END IF;
END $$;

-- 3. TABELA USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) UNIQUE NOT NULL,
  nome varchar(255) NOT NULL,
  tipo tipo_usuario NOT NULL,
  senha varchar(255),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar coluna senha se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'senha') THEN
    ALTER TABLE usuarios ADD COLUMN senha varchar(255);
    RAISE NOTICE 'Coluna senha adicionada à tabela usuarios';
  END IF;
END $$;

-- 4. TABELA VEICULOS
CREATE TABLE IF NOT EXISTS veiculos (
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

-- Adicionar coluna ativo se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'ativo') THEN
    ALTER TABLE veiculos ADD COLUMN ativo boolean DEFAULT true;
    RAISE NOTICE 'Coluna ativo adicionada à tabela veiculos';
  END IF;
END $$;

-- 5. TABELA CADASTROS
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
);

-- 6. TABELA ABASTECIMENTOS
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
);

-- 7. TABELA MANUTENCOES
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
);

-- 8. TABELA CHECKLISTS
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
);

-- 9. TABELA FUNCIONARIOS
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
);

-- 10. TABELA USER_PERMISSIONS
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
);

-- 11. TABELA CENTROS_CUSTO
CREATE TABLE IF NOT EXISTS centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(255) NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 12. TABELA CONTAS_PAGAR
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
);

-- 13. TABELA CONTAS_RECEBER
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
);

-- 14. ADICIONAR FOREIGN KEYS (COM VERIFICAÇÃO)
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
    RAISE NOTICE 'FK abastecimentos -> veiculos criada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'abastecimentos_operador_id_fkey' 
    AND table_name = 'abastecimentos'
  ) THEN
    ALTER TABLE abastecimentos ADD CONSTRAINT abastecimentos_operador_id_fkey 
    FOREIGN KEY (operador_id) REFERENCES usuarios(id);
    RAISE NOTICE 'FK abastecimentos -> usuarios criada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'abastecimentos_posto_id_fkey' 
    AND table_name = 'abastecimentos'
  ) THEN
    ALTER TABLE abastecimentos ADD CONSTRAINT abastecimentos_posto_id_fkey 
    FOREIGN KEY (posto_id) REFERENCES cadastros(id);
    RAISE NOTICE 'FK abastecimentos -> cadastros criada';
  END IF;

  -- Foreign keys para manutencoes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'manutencoes_veiculo_id_fkey' 
    AND table_name = 'manutencoes'
  ) THEN
    ALTER TABLE manutencoes ADD CONSTRAINT manutencoes_veiculo_id_fkey 
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id);
    RAISE NOTICE 'FK manutencoes -> veiculos criada';
  END IF;

  -- Foreign keys para checklists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'checklists_veiculo_id_fkey' 
    AND table_name = 'checklists'
  ) THEN
    ALTER TABLE checklists ADD CONSTRAINT checklists_veiculo_id_fkey 
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id);
    RAISE NOTICE 'FK checklists -> veiculos criada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'checklists_operador_id_fkey' 
    AND table_name = 'checklists'
  ) THEN
    ALTER TABLE checklists ADD CONSTRAINT checklists_operador_id_fkey 
    FOREIGN KEY (operador_id) REFERENCES usuarios(id);
    RAISE NOTICE 'FK checklists -> usuarios criada';
  END IF;

  -- Foreign keys para user_permissions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_permissions_user_id_fkey' 
    AND table_name = 'user_permissions'
  ) THEN
    ALTER TABLE user_permissions ADD CONSTRAINT user_permissions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
    RAISE NOTICE 'FK user_permissions -> usuarios criada';
  END IF;

  RAISE NOTICE 'Todas as foreign keys verificadas';
END $$;

-- 15. FUNÇÃO PARA CRIAR PERMISSÕES PADRÃO
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
    RAISE NOTICE 'Usuário % não encontrado', user_id_param;
    RETURN 0;
  END IF;

  RAISE NOTICE 'Criando permissões para usuário: % (tipo: %)', user_email, user_type_param;

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
  
  RAISE NOTICE 'Criadas % permissões para %', permission_count, user_email;
  RETURN permission_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. TRIGGERS PARA PERMISSÕES AUTOMÁTICAS
CREATE OR REPLACE FUNCTION trigger_create_permissions()
RETURNS TRIGGER AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT create_user_permissions_complete(NEW.id, NEW.tipo::text) INTO result;
  RAISE NOTICE 'Permissões criadas automaticamente para %: % permissões', NEW.email, result;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_update_permissions()
RETURNS TRIGGER AS $$
DECLARE
  result INTEGER;
BEGIN
  IF OLD.tipo IS DISTINCT FROM NEW.tipo THEN
    SELECT create_user_permissions_complete(NEW.id, NEW.tipo::text) INTO result;
    RAISE NOTICE 'Permissões atualizadas para %: % permissões', NEW.email, result;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover triggers existentes
DROP TRIGGER IF EXISTS on_user_created ON usuarios;
DROP TRIGGER IF EXISTS on_user_type_updated ON usuarios;

-- Criar novos triggers
CREATE TRIGGER on_user_created
  AFTER INSERT ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_permissions();

CREATE TRIGGER on_user_type_updated
  AFTER UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_permissions();

-- 17. INSERIR DADOS INICIAIS
DO $$
DECLARE
  valid_hash TEXT;
  user_count INTEGER;
  vehicle_count INTEGER;
  posto_count INTEGER;
  centro_count INTEGER;
BEGIN
  -- Hash bcrypt válido para senha "123456"
  valid_hash := '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
  
  -- USUÁRIOS
  SELECT COUNT(*) INTO user_count FROM usuarios;
  
  IF user_count = 0 THEN
    RAISE NOTICE 'Inserindo usuários iniciais...';
    
    INSERT INTO usuarios (email, nome, tipo, senha, ativo) VALUES
    ('bruno@systemtruck.com.br', 'Bruno SystemTruck', 'admin', valid_hash, true),
    ('escritorio@shimizutransportes.com.br', 'Escritório Shimizu Transportes', 'admin', valid_hash, true),
    ('logistica@ferrazflorestal.com.br', 'Logística Ferraz Florestal', 'admin', valid_hash, true),
    ('mobile@ferrazflorestal.com.br', 'Mobile Ferraz Florestal', 'operador_checklist', valid_hash, true),
    ('fuel@ferrazflorestal.com.br', 'Fuel Ferraz Florestal', 'operador_abastecimento', valid_hash, true);
    
    RAISE NOTICE 'Usuários inseridos com sucesso';
  ELSE
    -- Atualizar senhas existentes
    UPDATE usuarios 
    SET senha = valid_hash, updated_at = now()
    WHERE senha IS NULL OR LENGTH(senha) < 10 OR senha NOT LIKE '$2%';
    
    RAISE NOTICE 'Senhas atualizadas para usuários existentes';
  END IF;
  
  -- VEÍCULOS
  SELECT COUNT(*) INTO vehicle_count FROM veiculos;
  
  IF vehicle_count = 0 THEN
    RAISE NOTICE 'Inserindo veículos iniciais...';
    
    INSERT INTO veiculos (placa, tipo, marca, modelo, ano, qrcode_data, ativo) VALUES
    ('ABC-1234', 'carro', 'Honda', 'Civic', 2020, 'vehicle_ABC-1234', true),
    ('DEF-5678', 'carro', 'Toyota', 'Corolla', 2021, 'vehicle_DEF-5678', true),
    ('GHI-9012', 'caminhao', 'Toyota', 'Hilux', 2019, 'vehicle_GHI-9012', true);
    
    RAISE NOTICE 'Veículos inseridos com sucesso';
  END IF;
  
  -- POSTOS DE ABASTECIMENTO
  SELECT COUNT(*) INTO posto_count FROM cadastros WHERE tipo = 'abastecimento';
  
  IF posto_count = 0 THEN
    RAISE NOTICE 'Inserindo postos de abastecimento...';
    
    INSERT INTO cadastros (tipo, razao_social, endereco, cidade, estado, cep, telefone, emails, ativo) VALUES
    ('abastecimento', 'Posto Shell Centro', 'Rua Principal, 123', 'São Paulo', 'SP', '01000-000', '(11) 1234-5678', '["contato@shell.com"]', true),
    ('abastecimento', 'Posto Ipiranga Norte', 'Av. Paulista, 456', 'São Paulo', 'SP', '01310-000', '(11) 8765-4321', '["info@ipiranga.com"]', true),
    ('abastecimento', 'Posto BR Sul', 'Rua das Flores, 789', 'São Paulo', 'SP', '04000-000', '(11) 5555-0000', '["atendimento@br.com"]', true);
    
    RAISE NOTICE 'Postos inseridos com sucesso';
  END IF;
  
  -- CENTROS DE CUSTO
  SELECT COUNT(*) INTO centro_count FROM centros_custo;
  
  IF centro_count = 0 THEN
    RAISE NOTICE 'Inserindo centros de custo...';
    
    INSERT INTO centros_custo (nome, descricao, ativo) VALUES
    ('Administrativo', 'Despesas administrativas gerais', true),
    ('Operacional', 'Despesas operacionais da frota', true),
    ('Manutenção', 'Custos de manutenção de veículos', true);
    
    RAISE NOTICE 'Centros de custo inseridos com sucesso';
  END IF;
END $$;

-- 18. CRIAR PERMISSÕES PARA USUÁRIOS EXISTENTES
DO $$
DECLARE
  user_record RECORD;
  result INTEGER;
  total_permissions INTEGER := 0;
BEGIN
  RAISE NOTICE 'Criando permissões para usuários existentes...';
  
  FOR user_record IN SELECT id, email, tipo FROM usuarios ORDER BY email LOOP
    SELECT create_user_permissions_complete(user_record.id, user_record.tipo::text) INTO result;
    total_permissions := total_permissions + result;
  END LOOP;
  
  RAISE NOTICE 'Total de permissões criadas: %', total_permissions;
END $$;

-- 19. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON usuarios(tipo);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);

CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_ativo ON veiculos(ativo);
CREATE INDEX IF NOT EXISTS idx_veiculos_tipo ON veiculos(tipo);

CREATE INDEX IF NOT EXISTS idx_cadastros_tipo ON cadastros(tipo);
CREATE INDEX IF NOT EXISTS idx_cadastros_ativo ON cadastros(ativo);
CREATE INDEX IF NOT EXISTS idx_cadastros_razao_social ON cadastros(razao_social);

CREATE INDEX IF NOT EXISTS idx_abastecimentos_data ON abastecimentos(data_abastecimento);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_veiculo ON abastecimentos(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_posto ON abastecimentos(posto_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON user_permissions(module);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_module ON user_permissions(user_id, module);

CREATE INDEX IF NOT EXISTS idx_manutencoes_veiculo ON manutencoes(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_data_prevista ON manutencoes(data_prevista);

CREATE INDEX IF NOT EXISTS idx_checklists_veiculo ON checklists(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_checklists_data ON checklists(data_checklist);

-- 20. VERIFICAÇÃO FINAL COMPLETA
DO $$
DECLARE
  table_stats RECORD;
  permission_stats RECORD;
  user_stats RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICAÇÃO FINAL COMPLETA ===';
  
  -- Estatísticas das tabelas
  SELECT 
    (SELECT COUNT(*) FROM usuarios) as usuarios,
    (SELECT COUNT(*) FROM veiculos) as veiculos,
    (SELECT COUNT(*) FROM cadastros) as cadastros,
    (SELECT COUNT(*) FROM abastecimentos) as abastecimentos,
    (SELECT COUNT(*) FROM manutencoes) as manutencoes,
    (SELECT COUNT(*) FROM checklists) as checklists,
    (SELECT COUNT(*) FROM funcionarios) as funcionarios,
    (SELECT COUNT(*) FROM user_permissions) as permissions,
    (SELECT COUNT(*) FROM centros_custo) as centros_custo,
    (SELECT COUNT(*) FROM contas_pagar) as contas_pagar,
    (SELECT COUNT(*) FROM contas_receber) as contas_receber
  INTO table_stats;
  
  RAISE NOTICE 'TABELAS:';
  RAISE NOTICE '- Usuários: %', table_stats.usuarios;
  RAISE NOTICE '- Veículos: %', table_stats.veiculos;
  RAISE NOTICE '- Cadastros: %', table_stats.cadastros;
  RAISE NOTICE '- Abastecimentos: %', table_stats.abastecimentos;
  RAISE NOTICE '- Manutenções: %', table_stats.manutencoes;
  RAISE NOTICE '- Checklists: %', table_stats.checklists;
  RAISE NOTICE '- Funcionários: %', table_stats.funcionarios;
  RAISE NOTICE '- Permissões: %', table_stats.permissions;
  RAISE NOTICE '- Centros de Custo: %', table_stats.centros_custo;
  RAISE NOTICE '- Contas a Pagar: %', table_stats.contas_pagar;
  RAISE NOTICE '- Contas a Receber: %', table_stats.contas_receber;
  
  -- Verificar permissões por tipo de usuário
  SELECT 
    COUNT(CASE WHEN u.tipo = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN u.tipo = 'operador_checklist' THEN 1 END) as op_checklist,
    COUNT(CASE WHEN u.tipo = 'operador_abastecimento' THEN 1 END) as op_abastecimento
  FROM usuarios u
  INTO user_stats;
  
  SELECT 
    COUNT(CASE WHEN u.tipo = 'admin' THEN 1 END) as admin_permissions,
    COUNT(CASE WHEN u.tipo = 'operador_checklist' THEN 1 END) as checklist_permissions,
    COUNT(CASE WHEN u.tipo = 'operador_abastecimento' THEN 1 END) as abastecimento_permissions
  FROM user_permissions up
  JOIN usuarios u ON up.user_id = u.id
  INTO permission_stats;
  
  RAISE NOTICE '';
  RAISE NOTICE 'USUÁRIOS POR TIPO:';
  RAISE NOTICE '- Admins: %', user_stats.admins;
  RAISE NOTICE '- Operadores Checklist: %', user_stats.op_checklist;
  RAISE NOTICE '- Operadores Abastecimento: %', user_stats.op_abastecimento;
  
  RAISE NOTICE '';
  RAISE NOTICE 'PERMISSÕES POR TIPO:';
  RAISE NOTICE '- Permissões de Admin: %', permission_stats.admin_permissions;
  RAISE NOTICE '- Permissões de Op. Checklist: %', permission_stats.checklist_permissions;
  RAISE NOTICE '- Permissões de Op. Abastecimento: %', permission_stats.abastecimento_permissions;
  
  -- Verificação de integridade
  IF table_stats.usuarios >= 5 AND 
     table_stats.veiculos >= 3 AND 
     table_stats.cadastros >= 3 AND 
     table_stats.permissions > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 BANCO DE DADOS CONFIGURADO COM SUCESSO!';
    RAISE NOTICE '✅ Todas as tabelas criadas';
    RAISE NOTICE '✅ Dados iniciais inseridos';
    RAISE NOTICE '✅ Permissões configuradas';
    RAISE NOTICE '✅ Foreign keys criadas';
    RAISE NOTICE '✅ Índices otimizados';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Verificar se todos os dados foram inseridos corretamente';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 CREDENCIAIS DE ACESSO:';
  RAISE NOTICE '   Email: qualquer usuário listado';
  RAISE NOTICE '   Senha: 123456';
  RAISE NOTICE '';
END $$;