/*
  # Sistema de Permissões de Usuário

  1. Estrutura
    - Tabela `user_permissions` para controle granular de acesso
    - Relacionamento com tabela `usuarios`
    - Permissões por módulo e ação (access, create, edit, delete)

  2. Funcionalidades
    - Função para criar permissões padrão por tipo de usuário
    - Triggers automáticos para novos usuários e mudanças de tipo
    - Índices para performance otimizada

  3. Tipos de Usuário
    - Admin: acesso completo a todos os módulos
    - Operador Checklist: dashboard, checklists e relatórios
    - Operador Abastecimento: dashboard, abastecimentos e relatórios

  4. Módulos do Sistema
    - dashboard, veiculos, abastecimentos, manutencoes
    - checklists, funcionarios, usuarios, financeiro, relatorios
*/

-- Criar extensão para UUID se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CRIAR TABELA DE PERMISSÕES
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Adicionar foreign key para usuarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_permissions_user_id_fkey' 
    AND table_name = 'user_permissions'
  ) THEN
    ALTER TABLE user_permissions 
    ADD CONSTRAINT user_permissions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. CRIAR FUNÇÃO PRINCIPAL PARA PERMISSÕES PADRÃO
CREATE OR REPLACE FUNCTION create_default_permissions(user_id_param uuid, user_type_param text)
RETURNS void AS $$
BEGIN
  -- Limpar permissões existentes para este usuário
  DELETE FROM user_permissions WHERE user_id = user_id_param;
  
  -- Permissões para ADMIN - acesso completo
  IF user_type_param = 'admin' THEN
    INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
    (user_id_param, 'dashboard', true, false, false, false),
    (user_id_param, 'veiculos', true, true, true, true),
    (user_id_param, 'abastecimentos', true, true, true, true),
    (user_id_param, 'manutencoes', true, true, true, true),
    (user_id_param, 'checklists', true, true, true, true),
    (user_id_param, 'funcionarios', true, true, true, true),
    (user_id_param, 'usuarios', true, true, true, true),
    (user_id_param, 'financeiro', true, true, true, true),
    (user_id_param, 'relatorios', true, true, false, false); -- Relatórios apenas visualização
  
  -- Permissões para OPERADOR DE CHECKLIST
  ELSIF user_type_param = 'operador_checklist' THEN
    INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
    (user_id_param, 'dashboard', true, false, false, false),
    (user_id_param, 'checklists', true, true, false, false), -- Pode criar checklists
    (user_id_param, 'relatorios', true, false, false, false); -- Apenas visualizar relatórios
  
  -- Permissões para OPERADOR DE ABASTECIMENTO
  ELSIF user_type_param = 'operador_abastecimento' THEN
    INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
    (user_id_param, 'dashboard', true, false, false, false),
    (user_id_param, 'abastecimentos', true, true, false, false), -- Pode criar abastecimentos
    (user_id_param, 'relatorios', true, false, false, false); -- Apenas visualizar relatórios
  END IF;
  
  -- Log da operação
  RAISE NOTICE 'Permissões criadas para usuário % com tipo %', user_id_param, user_type_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CRIAR FUNÇÕES PARA TRIGGERS
CREATE OR REPLACE FUNCTION trigger_create_user_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar permissões padrão para o novo usuário
  PERFORM create_default_permissions(NEW.id, NEW.tipo);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_update_user_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o tipo de usuário mudou, recriar as permissões
  IF OLD.tipo IS DISTINCT FROM NEW.tipo THEN
    PERFORM create_default_permissions(NEW.id, NEW.tipo);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. REMOVER TRIGGERS EXISTENTES (se houver)
DROP TRIGGER IF EXISTS on_user_created ON usuarios;
DROP TRIGGER IF EXISTS on_user_type_updated ON usuarios;

-- 5. CRIAR NOVOS TRIGGERS
CREATE TRIGGER on_user_created
  AFTER INSERT ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_user_permissions();

CREATE TRIGGER on_user_type_updated
  AFTER UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_permissions();

-- 6. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON user_permissions(module);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_module ON user_permissions(user_id, module);
CREATE INDEX IF NOT EXISTS idx_user_permissions_access ON user_permissions(user_id, module, can_access);