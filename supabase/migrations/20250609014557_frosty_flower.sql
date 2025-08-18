/*
  # Sistema de Controle de Módulos por Usuário

  1. Nova Tabela
    - `user_permissions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key para usuarios)
      - `module` (text, nome do módulo)
      - `can_access` (boolean, se pode acessar)
      - `can_create` (boolean, se pode criar)
      - `can_edit` (boolean, se pode editar)
      - `can_delete` (boolean, se pode excluir)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Módulos Disponíveis
    - dashboard
    - veiculos
    - abastecimentos
    - manutencoes
    - checklists
    - funcionarios
    - usuarios
    - financeiro
    - relatorios

  3. Segurança
    - Enable RLS na tabela user_permissions
    - Políticas para controle de acesso
*/

-- Criar tabela de permissões de usuário
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_access boolean DEFAULT true,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module)
);

-- Enable RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own permissions"
  ON user_permissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all permissions"
  ON user_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND tipo = 'admin'
    )
  );

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_type_updated
  AFTER UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_permissions();