/*
  # Criar sistema de permissões de usuário

  1. Nova Tabela
    - `user_permissions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key para usuarios)
      - `module` (text, nome do módulo)
      - `can_access` (boolean, pode acessar)
      - `can_create` (boolean, pode criar)
      - `can_edit` (boolean, pode editar)
      - `can_delete` (boolean, pode excluir)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Funções
    - `create_default_permissions()` - cria permissões padrão
    - Triggers para automatizar criação de permissões

  3. Dados Iniciais
    - Permissões para todos os usuários existentes
*/

-- Criar extensão para UUID se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela de permissões de usuário
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

-- Função para criar permissões padrão para um usuário
CREATE OR REPLACE FUNCTION create_default_permissions(user_id_param uuid, user_type_param text)
RETURNS void AS $$
BEGIN
  -- Limpar permissões existentes
  DELETE FROM user_permissions WHERE user_id = user_id_param;
  
  -- Permissões para admin
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
    (user_id_param, 'relatorios', true, true, false, false);
  
  -- Permissões para operador de checklist
  ELSIF user_type_param = 'operador_checklist' THEN
    INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
    (user_id_param, 'dashboard', true, false, false, false),
    (user_id_param, 'checklists', true, true, false, false),
    (user_id_param, 'relatorios', true, false, false, false);
  
  -- Permissões para operador de abastecimento
  ELSIF user_type_param = 'operador_abastecimento' THEN
    INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
    (user_id_param, 'dashboard', true, false, false, false),
    (user_id_param, 'abastecimentos', true, true, false, false),
    (user_id_param, 'relatorios', true, false, false, false);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Criar permissões para usuários existentes
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id, tipo FROM usuarios LOOP
    PERFORM create_default_permissions(user_record.id, user_record.tipo);
  END LOOP;
END $$;

-- Trigger para criar permissões automaticamente quando um usuário é criado
CREATE OR REPLACE FUNCTION trigger_create_user_permissions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_permissions(NEW.id, NEW.tipo);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS on_user_created ON usuarios;

-- Criar novo trigger
CREATE TRIGGER on_user_created
  AFTER INSERT ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_user_permissions();

-- Trigger para atualizar permissões quando o tipo de usuário muda
CREATE OR REPLACE FUNCTION trigger_update_user_permissions()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.tipo != NEW.tipo THEN
    PERFORM create_default_permissions(NEW.id, NEW.tipo);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS on_user_type_updated ON usuarios;

-- Criar novo trigger
CREATE TRIGGER on_user_type_updated
  AFTER UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_permissions();

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON user_permissions(module);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_module ON user_permissions(user_id, module);