/*
  # Corrigir acesso à função create_default_permissions

  1. Problema Identificado
    - A função create_default_permissions existe mas não está acessível
    - Problemas de contexto de execução e transação
    - Necessário garantir que a função seja executada corretamente

  2. Solução
    - Recriar a função com SECURITY DEFINER
    - Executar em blocos separados para garantir disponibilidade
    - Adicionar verificações robustas de erro
    - Testar a função antes de processar todos os usuários
*/

-- 1. GARANTIR QUE A EXTENSÃO UUID EXISTE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. RECRIAR A FUNÇÃO COM MÁXIMA COMPATIBILIDADE
CREATE OR REPLACE FUNCTION create_default_permissions(user_id_param uuid, user_type_param text)
RETURNS INTEGER AS $$
DECLARE
  permission_count INTEGER := 0;
  user_exists BOOLEAN := false;
BEGIN
  -- Verificar se o usuário existe
  SELECT EXISTS(SELECT 1 FROM usuarios WHERE id = user_id_param) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE NOTICE 'ERRO: Usuário com ID % não encontrado', user_id_param;
    RETURN 0;
  END IF;

  -- Verificar se o tipo de usuário é válido
  IF user_type_param NOT IN ('admin', 'operador_checklist', 'operador_abastecimento') THEN
    RAISE NOTICE 'ERRO: Tipo de usuário inválido: %', user_type_param;
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
    (user_id_param, 'manutencoes', true, true, true, true),
    (user_id_param, 'checklists', true, true, true, true),
    (user_id_param, 'funcionarios', true, true, true, true),
    (user_id_param, 'usuarios', true, true, true, true),
    (user_id_param, 'financeiro', true, true, true, true),
    (user_id_param, 'relatorios', true, true, false, false);
    
    permission_count := 9;
    
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
  
  RAISE NOTICE 'Criadas % permissões para usuário % (tipo: %)', permission_count, user_id_param, user_type_param;
  
  RETURN permission_count;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERRO ao criar permissões para usuário %: %', user_id_param, SQLERRM;
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. COMMIT PARA GARANTIR QUE A FUNÇÃO ESTÁ DISPONÍVEL
COMMIT;
BEGIN;

-- 4. TESTAR A FUNÇÃO COM UM USUÁRIO REAL
DO $$
DECLARE
  test_user_record RECORD;
  result INTEGER;
BEGIN
  -- Pegar um usuário admin para teste
  SELECT id, tipo, email INTO test_user_record 
  FROM usuarios 
  WHERE tipo = 'admin'
  LIMIT 1;
  
  IF FOUND THEN
    RAISE NOTICE 'Testando função com usuário: % (tipo: %)', test_user_record.email, test_user_record.tipo;
    
    -- Executar a função e capturar o resultado
    SELECT create_default_permissions(test_user_record.id, test_user_record.tipo) INTO result;
    
    IF result > 0 THEN
      RAISE NOTICE '✅ Função testada com sucesso! Criadas % permissões', result;
    ELSE
      RAISE EXCEPTION 'Função retornou 0 permissões - há um problema';
    END IF;
  ELSE
    RAISE NOTICE 'Nenhum usuário admin encontrado para teste';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERRO no teste da função: %', SQLERRM;
END $$;

-- 5. PROCESSAR TODOS OS USUÁRIOS
DO $$
DECLARE
  user_record RECORD;
  total_users INTEGER := 0;
  processed_users INTEGER := 0;
  total_permissions INTEGER := 0;
  result INTEGER;
BEGIN
  -- Contar usuários
  SELECT COUNT(*) INTO total_users FROM usuarios;
  RAISE NOTICE 'Iniciando criação de permissões para % usuários', total_users;
  
  -- Processar cada usuário individualmente
  FOR user_record IN 
    SELECT id, tipo, email 
    FROM usuarios 
    ORDER BY created_at 
  LOOP
    BEGIN
      -- Executar função e capturar resultado
      SELECT create_default_permissions(user_record.id, user_record.tipo) INTO result;
      
      IF result > 0 THEN
        processed_users := processed_users + 1;
        total_permissions := total_permissions + result;
        RAISE NOTICE 'Usuário % processado: % permissões criadas', user_record.email, result;
      ELSE
        RAISE NOTICE 'FALHA ao processar usuário %', user_record.email;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERRO ao processar usuário %: %', user_record.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Processamento concluído:';
  RAISE NOTICE '- Total de usuários: %', total_users;
  RAISE NOTICE '- Processados com sucesso: %', processed_users;
  RAISE NOTICE '- Total de permissões criadas: %', total_permissions;
  
  IF processed_users = total_users AND total_permissions > 0 THEN
    RAISE NOTICE '🎉 SUCESSO! Todos os usuários foram processados!';
  ELSIF processed_users > 0 THEN
    RAISE NOTICE '⚠️  Processamento parcial: %/% usuários', processed_users, total_users;
  ELSE
    RAISE NOTICE '❌ FALHA: Nenhum usuário foi processado';
  END IF;
END $$;

-- 6. VERIFICAÇÃO FINAL COMPLETA
DO $$
DECLARE
  permission_count INTEGER;
  user_count INTEGER;
  users_with_permissions INTEGER;
  admin_permissions INTEGER;
  operator_permissions INTEGER;
BEGIN
  -- Estatísticas gerais
  SELECT COUNT(*) INTO permission_count FROM user_permissions;
  SELECT COUNT(*) INTO user_count FROM usuarios;
  SELECT COUNT(DISTINCT user_id) INTO users_with_permissions FROM user_permissions;
  
  -- Estatísticas por tipo
  SELECT COUNT(*) INTO admin_permissions 
  FROM user_permissions up 
  JOIN usuarios u ON up.user_id = u.id 
  WHERE u.tipo = 'admin';
  
  SELECT COUNT(*) INTO operator_permissions 
  FROM user_permissions up 
  JOIN usuarios u ON up.user_id = u.id 
  WHERE u.tipo IN ('operador_checklist', 'operador_abastecimento');
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL DO SISTEMA DE PERMISSÕES ===';
  RAISE NOTICE 'Total de usuários no sistema: %', user_count;
  RAISE NOTICE 'Usuários com permissões: %', users_with_permissions;
  RAISE NOTICE 'Total de permissões criadas: %', permission_count;
  RAISE NOTICE 'Permissões de admin: %', admin_permissions;
  RAISE NOTICE 'Permissões de operadores: %', operator_permissions;
  
  IF users_with_permissions = user_count AND permission_count > 0 THEN
    RAISE NOTICE '🎉 SISTEMA DE PERMISSÕES FUNCIONANDO PERFEITAMENTE!';
    RAISE NOTICE '✅ Todos os usuários têm suas permissões configuradas';
  ELSIF permission_count > 0 THEN
    RAISE NOTICE '⚠️  Sistema parcialmente configurado (%/% usuários)', users_with_permissions, user_count;
  ELSE
    RAISE NOTICE '❌ SISTEMA DE PERMISSÕES NÃO CONFIGURADO';
  END IF;
  
  RAISE NOTICE '=== FIM DA VERIFICAÇÃO ===';
END $$;

-- 7. RECRIAR TRIGGERS PARA NOVOS USUÁRIOS
DROP TRIGGER IF EXISTS on_user_created ON usuarios;
DROP TRIGGER IF EXISTS on_user_type_updated ON usuarios;

CREATE OR REPLACE FUNCTION trigger_create_user_permissions()
RETURNS TRIGGER AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT create_default_permissions(NEW.id, NEW.tipo) INTO result;
  RAISE NOTICE 'Permissões criadas para novo usuário: % (% permissões)', NEW.email, result;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_update_user_permissions()
RETURNS TRIGGER AS $$
DECLARE
  result INTEGER;
BEGIN
  IF OLD.tipo IS DISTINCT FROM NEW.tipo THEN
    SELECT create_default_permissions(NEW.id, NEW.tipo) INTO result;
    RAISE NOTICE 'Permissões atualizadas para usuário %: % permissões', NEW.email, result;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created
  AFTER INSERT ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_user_permissions();

CREATE TRIGGER on_user_type_updated
  AFTER UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_permissions();