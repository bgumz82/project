/*
  # Correção Final do Sistema de Permissões - Processamento Individual

  1. Problema Identificado
    - Algumas permissões foram criadas para bruno@systemtruck.com.br
    - Outros usuários não tiveram permissões criadas
    - Necessário processamento individual mais robusto

  2. Solução
    - Função melhorada com logs detalhados
    - Processamento individual de cada usuário
    - Verificações de integridade em cada etapa
    - Rollback automático em caso de erro
    - Relatório detalhado do resultado

  3. Segurança
    - Transações individuais para cada usuário
    - Logs detalhados para debugging
    - Verificação de integridade após cada operação
*/

-- 1. FUNÇÃO ULTRA-ROBUSTA COM LOGS DETALHADOS
CREATE OR REPLACE FUNCTION create_default_permissions_v2(user_id_param uuid, user_type_param text)
RETURNS INTEGER AS $$
DECLARE
  permission_count INTEGER := 0;
  user_exists BOOLEAN := false;
  user_email TEXT;
  inserted_count INTEGER;
BEGIN
  -- Buscar informações do usuário
  BEGIN
    SELECT email INTO user_email FROM usuarios WHERE id = user_id_param;
    user_exists := FOUND;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO ao buscar usuário %: %', user_id_param, SQLERRM;
    RETURN 0;
  END;
  
  IF NOT user_exists THEN
    RAISE NOTICE 'Usuário % não encontrado', user_id_param;
    RETURN 0;
  END IF;

  RAISE NOTICE 'Processando usuário: % (ID: %, Tipo: %)', user_email, user_id_param, user_type_param;

  -- Verificar tipo válido
  IF user_type_param NOT IN ('admin', 'operador_checklist', 'operador_abastecimento') THEN
    RAISE NOTICE 'Tipo inválido para usuário %: %', user_email, user_type_param;
    RETURN 0;
  END IF;

  -- Limpar permissões existentes
  BEGIN
    DELETE FROM user_permissions WHERE user_id = user_id_param;
    GET DIAGNOSTICS permission_count = ROW_COUNT;
    RAISE NOTICE 'Removidas % permissões existentes para %', permission_count, user_email;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO ao limpar permissões para %: %', user_email, SQLERRM;
    RETURN 0;
  END;
  
  -- Criar permissões baseadas no tipo
  BEGIN
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
      
      GET DIAGNOSTICS inserted_count = ROW_COUNT;
      
    ELSIF user_type_param = 'operador_checklist' THEN
      INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
      (user_id_param, 'dashboard', true, false, false, false),
      (user_id_param, 'checklists', true, true, false, false),
      (user_id_param, 'relatorios', true, false, false, false);
      
      GET DIAGNOSTICS inserted_count = ROW_COUNT;
      
    ELSIF user_type_param = 'operador_abastecimento' THEN
      INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
      (user_id_param, 'dashboard', true, false, false, false),
      (user_id_param, 'abastecimentos', true, true, false, false),
      (user_id_param, 'relatorios', true, false, false, false);
      
      GET DIAGNOSTICS inserted_count = ROW_COUNT;
    END IF;
    
    RAISE NOTICE 'Inseridas % permissões para %', inserted_count, user_email;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO ao inserir permissões para %: %', user_email, SQLERRM;
    RETURN 0;
  END;
  
  -- Verificar se as permissões foram realmente criadas
  BEGIN
    SELECT COUNT(*) INTO permission_count 
    FROM user_permissions 
    WHERE user_id = user_id_param;
    
    IF permission_count = inserted_count AND permission_count > 0 THEN
      RAISE NOTICE '✅ SUCESSO: % permissões verificadas para %', permission_count, user_email;
      RETURN permission_count;
    ELSE
      RAISE NOTICE '❌ FALHA na verificação para %: esperado %, encontrado %', 
        user_email, inserted_count, permission_count;
      RETURN 0;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO na verificação para %: %', user_email, SQLERRM;
    RETURN 0;
  END;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERRO GERAL para usuário %: %', COALESCE(user_email, user_id_param::text), SQLERRM;
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. PROCESSAR CADA USUÁRIO INDIVIDUALMENTE COM TRANSAÇÕES SEPARADAS
DO $$
DECLARE
  user_record RECORD;
  total_users INTEGER := 0;
  processed_users INTEGER := 0;
  failed_users INTEGER := 0;
  total_permissions INTEGER := 0;
  result INTEGER;
  user_list TEXT := '';
BEGIN
  -- Contar e listar usuários
  SELECT COUNT(*) INTO total_users FROM usuarios;
  
  FOR user_record IN SELECT email FROM usuarios ORDER BY email LOOP
    user_list := user_list || user_record.email || ', ';
  END LOOP;
  
  RAISE NOTICE '=== PROCESSAMENTO INDIVIDUAL DE USUÁRIOS ===';
  RAISE NOTICE 'Total de usuários encontrados: %', total_users;
  RAISE NOTICE 'Usuários: %', TRIM(TRAILING ', ' FROM user_list);
  RAISE NOTICE '';
  
  IF total_users = 0 THEN
    RAISE NOTICE '❌ Nenhum usuário encontrado na tabela usuarios';
    RETURN;
  END IF;
  
  -- Processar cada usuário em uma transação separada
  FOR user_record IN 
    SELECT id, tipo, email, created_at
    FROM usuarios 
    ORDER BY created_at 
  LOOP
    BEGIN
      RAISE NOTICE '--- Processando usuário % ---', user_record.email;
      RAISE NOTICE 'ID: %, Tipo: %, Criado em: %', 
        user_record.id, user_record.tipo, user_record.created_at;
      
      -- Executar função para este usuário
      SELECT create_default_permissions_v2(user_record.id, user_record.tipo) INTO result;
      
      IF result > 0 THEN
        processed_users := processed_users + 1;
        total_permissions := total_permissions + result;
        RAISE NOTICE '✅ SUCESSO: % permissões criadas para %', result, user_record.email;
      ELSE
        failed_users := failed_users + 1;
        RAISE NOTICE '❌ FALHA: Nenhuma permissão criada para %', user_record.email;
      END IF;
      
      RAISE NOTICE '';
      
    EXCEPTION WHEN OTHERS THEN
      failed_users := failed_users + 1;
      RAISE NOTICE '❌ ERRO CRÍTICO ao processar %: %', user_record.email, SQLERRM;
      RAISE NOTICE '';
    END;
  END LOOP;
  
  RAISE NOTICE '=== RESULTADO FINAL DO PROCESSAMENTO ===';
  RAISE NOTICE 'Total de usuários: %', total_users;
  RAISE NOTICE 'Processados com sucesso: %', processed_users;
  RAISE NOTICE 'Falharam: %', failed_users;
  RAISE NOTICE 'Total de permissões criadas: %', total_permissions;
  RAISE NOTICE '';
  
  IF processed_users = total_users THEN
    RAISE NOTICE '🎉 SUCESSO TOTAL! Todos os % usuários foram processados!', total_users;
  ELSIF processed_users > 0 THEN
    RAISE NOTICE '⚠️  SUCESSO PARCIAL: %/% usuários processados', processed_users, total_users;
  ELSE
    RAISE NOTICE '❌ FALHA TOTAL: Nenhum usuário foi processado com sucesso';
  END IF;
END $$;

-- 3. VERIFICAÇÃO DETALHADA POR USUÁRIO
DO $$
DECLARE
  user_record RECORD;
  permission_count INTEGER;
  expected_permissions INTEGER;
  all_users_ok BOOLEAN := true;
BEGIN
  RAISE NOTICE '=== VERIFICAÇÃO DETALHADA POR USUÁRIO ===';
  
  FOR user_record IN 
    SELECT u.id, u.email, u.tipo,
           COUNT(up.id) as actual_permissions
    FROM usuarios u
    LEFT JOIN user_permissions up ON u.id = up.user_id
    GROUP BY u.id, u.email, u.tipo
    ORDER BY u.email
  LOOP
    -- Determinar quantas permissões são esperadas
    CASE user_record.tipo
      WHEN 'admin' THEN expected_permissions := 9;
      WHEN 'operador_checklist' THEN expected_permissions := 3;
      WHEN 'operador_abastecimento' THEN expected_permissions := 3;
      ELSE expected_permissions := 0;
    END CASE;
    
    IF user_record.actual_permissions = expected_permissions THEN
      RAISE NOTICE '✅ %: % permissões (correto)', user_record.email, user_record.actual_permissions;
    ELSE
      RAISE NOTICE '❌ %: % permissões (esperado: %)', 
        user_record.email, user_record.actual_permissions, expected_permissions;
      all_users_ok := false;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  
  IF all_users_ok THEN
    RAISE NOTICE '🎉 VERIFICAÇÃO PASSOU! Todos os usuários têm as permissões corretas!';
  ELSE
    RAISE NOTICE '⚠️  VERIFICAÇÃO FALHOU! Alguns usuários não têm as permissões corretas.';
  END IF;
END $$;

-- 4. ESTATÍSTICAS FINAIS COMPLETAS
DO $$
DECLARE
  total_users INTEGER;
  users_with_permissions INTEGER;
  total_permissions INTEGER;
  admin_users INTEGER;
  admin_permissions INTEGER;
  checklist_users INTEGER;
  checklist_permissions INTEGER;
  abastecimento_users INTEGER;
  abastecimento_permissions INTEGER;
BEGIN
  -- Estatísticas gerais
  SELECT COUNT(*) INTO total_users FROM usuarios;
  SELECT COUNT(DISTINCT user_id) INTO users_with_permissions FROM user_permissions;
  SELECT COUNT(*) INTO total_permissions FROM user_permissions;
  
  -- Estatísticas por tipo
  SELECT COUNT(*) INTO admin_users FROM usuarios WHERE tipo = 'admin';
  SELECT COUNT(*) INTO admin_permissions 
  FROM user_permissions up 
  JOIN usuarios u ON up.user_id = u.id 
  WHERE u.tipo = 'admin';
  
  SELECT COUNT(*) INTO checklist_users FROM usuarios WHERE tipo = 'operador_checklist';
  SELECT COUNT(*) INTO checklist_permissions 
  FROM user_permissions up 
  JOIN usuarios u ON up.user_id = u.id 
  WHERE u.tipo = 'operador_checklist';
  
  SELECT COUNT(*) INTO abastecimento_users FROM usuarios WHERE tipo = 'operador_abastecimento';
  SELECT COUNT(*) INTO abastecimento_permissions 
  FROM user_permissions up 
  JOIN usuarios u ON up.user_id = u.id 
  WHERE u.tipo = 'operador_abastecimento';
  
  RAISE NOTICE '=== ESTATÍSTICAS FINAIS COMPLETAS ===';
  RAISE NOTICE '';
  RAISE NOTICE 'USUÁRIOS POR TIPO:';
  RAISE NOTICE '- Total de usuários: %', total_users;
  RAISE NOTICE '- Administradores: %', admin_users;
  RAISE NOTICE '- Operadores checklist: %', checklist_users;
  RAISE NOTICE '- Operadores abastecimento: %', abastecimento_users;
  RAISE NOTICE '';
  RAISE NOTICE 'PERMISSÕES POR TIPO:';
  RAISE NOTICE '- Total de permissões: %', total_permissions;
  RAISE NOTICE '- Usuários com permissões: %', users_with_permissions;
  RAISE NOTICE '- Permissões de admin: % (esperado: %)', admin_permissions, admin_users * 9;
  RAISE NOTICE '- Permissões de op. checklist: % (esperado: %)', checklist_permissions, checklist_users * 3;
  RAISE NOTICE '- Permissões de op. abastecimento: % (esperado: %)', abastecimento_permissions, abastecimento_users * 3;
  RAISE NOTICE '';
  
  -- Verificação final
  IF users_with_permissions = total_users AND total_permissions > 0 THEN
    RAISE NOTICE '🎉 SISTEMA DE PERMISSÕES FUNCIONANDO PERFEITAMENTE!';
    RAISE NOTICE '✅ Todos os % usuários têm permissões configuradas', total_users;
    RAISE NOTICE '✅ Total de % permissões ativas no sistema', total_permissions;
  ELSIF users_with_permissions > 0 THEN
    RAISE NOTICE '⚠️  Sistema parcialmente configurado:';
    RAISE NOTICE '- %/% usuários com permissões', users_with_permissions, total_users;
    RAISE NOTICE '- % permissões criadas', total_permissions;
    RAISE NOTICE '- Usuários sem permissões: %', total_users - users_with_permissions;
  ELSE
    RAISE NOTICE '❌ SISTEMA DE PERMISSÕES NÃO CONFIGURADO';
    RAISE NOTICE '- Nenhuma permissão foi criada';
    RAISE NOTICE '- Todos os % usuários estão sem permissões', total_users;
  END IF;
  
  RAISE NOTICE '=== FIM DAS ESTATÍSTICAS ===';
END $$;

-- 5. ATUALIZAR TRIGGERS PARA USAR A NOVA FUNÇÃO
DROP TRIGGER IF EXISTS on_user_created ON usuarios;
DROP TRIGGER IF EXISTS on_user_type_updated ON usuarios;

CREATE OR REPLACE FUNCTION trigger_create_user_permissions_v2()
RETURNS TRIGGER AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT create_default_permissions_v2(NEW.id, NEW.tipo) INTO result;
  
  IF result > 0 THEN
    RAISE NOTICE 'Permissões criadas automaticamente para novo usuário %: % permissões', NEW.email, result;
  ELSE
    RAISE NOTICE 'ERRO: Falha ao criar permissões para novo usuário %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_update_user_permissions_v2()
RETURNS TRIGGER AS $$
DECLARE
  result INTEGER;
BEGIN
  IF OLD.tipo IS DISTINCT FROM NEW.tipo THEN
    SELECT create_default_permissions_v2(NEW.id, NEW.tipo) INTO result;
    
    IF result > 0 THEN
      RAISE NOTICE 'Permissões atualizadas para usuário % (tipo: % → %): % permissões', 
        NEW.email, OLD.tipo, NEW.tipo, result;
    ELSE
      RAISE NOTICE 'ERRO: Falha ao atualizar permissões para usuário %', NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created
  AFTER INSERT ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_user_permissions_v2();

CREATE TRIGGER on_user_type_updated
  AFTER UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_permissions_v2();