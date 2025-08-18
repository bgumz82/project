/*
  # Corrigir função de permissões de usuário

  1. Estrutura
    - Recriar função com verificações de segurança
    - Garantir que a função seja criada antes de ser usada
    - Adicionar logs detalhados para debug

  2. Segurança
    - Função com SECURITY DEFINER
    - Verificações de integridade dos dados
    - Tratamento de erros robusto

  3. Funcionalidade
    - Criar permissões padrão baseadas no tipo de usuário
    - Limpar permissões existentes antes de criar novas
    - Logs detalhados do processo
*/

-- Garantir que a extensão UUID existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. RECRIAR A FUNÇÃO COM VERIFICAÇÕES ROBUSTAS
CREATE OR REPLACE FUNCTION create_default_permissions(user_id_param uuid, user_type_param text)
RETURNS void AS $$
DECLARE
  permission_count INTEGER := 0;
BEGIN
  -- Verificar se o usuário existe
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = user_id_param) THEN
    RAISE EXCEPTION 'Usuário com ID % não encontrado', user_id_param;
  END IF;

  -- Verificar se o tipo de usuário é válido
  IF user_type_param NOT IN ('admin', 'operador_checklist', 'operador_abastecimento') THEN
    RAISE EXCEPTION 'Tipo de usuário inválido: %', user_type_param;
  END IF;

  -- Limpar permissões existentes para este usuário
  DELETE FROM user_permissions WHERE user_id = user_id_param;
  
  -- Criar permissões baseadas no tipo de usuário
  CASE user_type_param
    WHEN 'admin' THEN
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
      
      GET DIAGNOSTICS permission_count = ROW_COUNT;
      
    WHEN 'operador_checklist' THEN
      INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
      (user_id_param, 'dashboard', true, false, false, false),
      (user_id_param, 'checklists', true, true, false, false),
      (user_id_param, 'relatorios', true, false, false, false);
      
      GET DIAGNOSTICS permission_count = ROW_COUNT;
      
    WHEN 'operador_abastecimento' THEN
      INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
      (user_id_param, 'dashboard', true, false, false, false),
      (user_id_param, 'abastecimentos', true, true, false, false),
      (user_id_param, 'relatorios', true, false, false, false);
      
      GET DIAGNOSTICS permission_count = ROW_COUNT;
  END CASE;
  
  -- Log do resultado
  RAISE NOTICE 'Criadas % permissões para usuário % (tipo: %)', permission_count, user_id_param, user_type_param;
  
  -- Verificar se as permissões foram criadas
  IF permission_count = 0 THEN
    RAISE WARNING 'Nenhuma permissão foi criada para o usuário %', user_id_param;
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erro ao criar permissões para usuário %: %', user_id_param, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TESTAR A FUNÇÃO COM UM USUÁRIO EXISTENTE
DO $$
DECLARE
  test_user_record RECORD;
BEGIN
  -- Pegar o primeiro usuário para teste
  SELECT id, tipo, email INTO test_user_record 
  FROM usuarios 
  LIMIT 1;
  
  IF FOUND THEN
    RAISE NOTICE 'Testando função com usuário: % (tipo: %)', test_user_record.email, test_user_record.tipo;
    
    -- Testar a função
    PERFORM create_default_permissions(test_user_record.id, test_user_record.tipo);
    
    RAISE NOTICE '✅ Função testada com sucesso!';
  ELSE
    RAISE NOTICE 'Nenhum usuário encontrado para teste';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erro no teste da função: %', SQLERRM;
END $$;

-- 3. POPULAR PERMISSÕES PARA TODOS OS USUÁRIOS
DO $$
DECLARE
  user_record RECORD;
  total_users INTEGER := 0;
  processed_users INTEGER := 0;
  failed_users INTEGER := 0;
BEGIN
  -- Contar total de usuários
  SELECT COUNT(*) INTO total_users FROM usuarios;
  RAISE NOTICE 'Iniciando criação de permissões para % usuários', total_users;
  
  -- Processar cada usuário
  FOR user_record IN 
    SELECT id, tipo, email 
    FROM usuarios 
    ORDER BY created_at 
  LOOP
    BEGIN
      -- Criar permissões para este usuário
      PERFORM create_default_permissions(user_record.id, user_record.tipo);
      processed_users := processed_users + 1;
      
    EXCEPTION WHEN OTHERS THEN
      failed_users := failed_users + 1;
      RAISE WARNING 'Erro ao processar usuário % (%): %', 
        user_record.email, user_record.tipo, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Processamento concluído:';
  RAISE NOTICE '- Total de usuários: %', total_users;
  RAISE NOTICE '- Processados com sucesso: %', processed_users;
  RAISE NOTICE '- Falharam: %', failed_users;
  
  IF processed_users > 0 THEN
    RAISE NOTICE '✅ Sistema de permissões configurado!';
  ELSE
    RAISE WARNING '⚠️  Nenhuma permissão foi criada com sucesso';
  END IF;
END $$;

-- 4. VERIFICAÇÃO FINAL
DO $$
DECLARE
  permission_count INTEGER;
  user_count INTEGER;
  users_with_permissions INTEGER;
BEGIN
  SELECT COUNT(*) INTO permission_count FROM user_permissions;
  SELECT COUNT(*) INTO user_count FROM usuarios;
  SELECT COUNT(DISTINCT user_id) INTO users_with_permissions FROM user_permissions;
  
  RAISE NOTICE 'Verificação final do sistema:';
  RAISE NOTICE '- Total de usuários: %', user_count;
  RAISE NOTICE '- Usuários com permissões: %', users_with_permissions;
  RAISE NOTICE '- Total de permissões: %', permission_count;
  
  IF users_with_permissions = user_count AND permission_count > 0 THEN
    RAISE NOTICE '🎉 Sistema de permissões funcionando perfeitamente!';
  ELSIF permission_count > 0 THEN
    RAISE NOTICE '⚠️  Sistema parcialmente configurado (%/% usuários)', users_with_permissions, user_count;
  ELSE
    RAISE WARNING '❌ Sistema de permissões não foi configurado';
  END IF;
END $$;