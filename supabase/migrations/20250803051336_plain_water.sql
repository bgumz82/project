/*
  # Atualizar permissões para incluir módulo ANTT

  1. Adicionar permissão ANTT para administradores
  2. Atualizar função de criação de permissões padrão
  3. Aplicar permissões para usuários existentes
*/

-- Adicionar permissão ANTT para todos os administradores existentes
DO $$
DECLARE
  user_record RECORD;
  permission_exists BOOLEAN;
BEGIN
  RAISE NOTICE 'Adicionando permissões ANTT para administradores...';
  
  FOR user_record IN 
    SELECT id, email FROM usuarios WHERE tipo = 'admin'
  LOOP
    -- Verificar se a permissão já existe
    SELECT EXISTS(
      SELECT 1 FROM user_permissions 
      WHERE user_id = user_record.id AND module = 'antt'
    ) INTO permission_exists;
    
    IF NOT permission_exists THEN
      INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete)
      VALUES (user_record.id, 'antt', true, true, true, true);
      
      RAISE NOTICE 'Permissão ANTT adicionada para: %', user_record.email;
    ELSE
      RAISE NOTICE 'Permissão ANTT já existe para: %', user_record.email;
    END IF;
  END LOOP;
END $$;

-- Atualizar função de criação de permissões padrão para incluir ANTT
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
    (user_id_param, 'antt', true, true, true, true),
    (user_id_param, 'abastecimentos', true, true, true, true),
    (user_id_param, 'cadastros', true, true, true, true),
    (user_id_param, 'manutencoes', true, true, true, true),
    (user_id_param, 'checklists', true, true, true, true),
    (user_id_param, 'funcionarios', true, true, true, true),
    (user_id_param, 'usuarios', true, true, true, true),
    (user_id_param, 'permissoes', true, true, true, true),
    (user_id_param, 'financeiro', true, true, true, true),
    (user_id_param, 'relatorios', true, true, false, false);
    
    permission_count := 12;
    
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

-- Verificação final
DO $$
DECLARE
  admin_count INTEGER;
  antt_permissions INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM usuarios WHERE tipo = 'admin';
  SELECT COUNT(*) INTO antt_permissions FROM user_permissions WHERE module = 'antt';
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Administradores no sistema: %', admin_count;
  RAISE NOTICE 'Permissões ANTT criadas: %', antt_permissions;
  
  IF antt_permissions >= admin_count THEN
    RAISE NOTICE '✅ Permissões ANTT configuradas com sucesso!';
  ELSE
    RAISE NOTICE '⚠️  Algumas permissões ANTT podem estar faltando';
  END IF;
END $$;