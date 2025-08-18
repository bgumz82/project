/*
  # Corrigir sistema de permissões para PostgreSQL padrão

  1. Alterações
    - Remove dependências da função auth.uid() do Supabase
    - Adapta políticas RLS para PostgreSQL padrão
    - Mantém funcionalidade de permissões sem auth.uid()

  2. Segurança
    - Remove RLS que dependia de auth.uid()
    - Sistema funcionará com controle de acesso via aplicação
*/

-- Remover políticas RLS que usam auth.uid()
DROP POLICY IF EXISTS "Users can view own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can manage all permissions" ON user_permissions;

-- Desabilitar RLS temporariamente para user_permissions
ALTER TABLE user_permissions DISABLE ROW LEVEL SECURITY;

-- Recriar função sem dependência de auth.uid()
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

-- Recriar permissões para usuários existentes
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id, tipo FROM usuarios LOOP
    PERFORM create_default_permissions(user_record.id, user_record.tipo);
  END LOOP;
END $$;

-- Recriar triggers sem dependência de auth.uid()
DROP TRIGGER IF EXISTS on_user_created ON usuarios;
DROP TRIGGER IF EXISTS on_user_type_updated ON usuarios;

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