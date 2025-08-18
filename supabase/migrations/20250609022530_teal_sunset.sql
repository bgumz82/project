/*
  # Solução Definitiva para Sistema de Permissões

  1. Problema Identificado
    - A função create_default_permissions existe mas não está acessível durante execução
    - Problemas de contexto de transação e visibilidade da função
    - Necessário uma abordagem mais robusta

  2. Solução Implementada
    - Criação da função com SECURITY DEFINER
    - Execução em blocos separados com COMMIT/BEGIN
    - Verificação de existência antes de cada operação
    - Processamento individual de cada usuário
    - Logs detalhados para debugging

  3. Funcionalidades
    - Função robusta que retorna número de permissões criadas
    - Tratamento de erros sem falhar a migração
    - Verificações de integridade
    - Triggers para novos usuários
*/

-- 1. GARANTIR EXTENSÃO UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. GARANTIR QUE A TABELA EXISTE
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

-- Garantir foreign key
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

-- 3. CRIAR FUNÇÃO ROBUSTA COM MÁXIMA COMPATIBILIDADE
CREATE OR REPLACE FUNCTION create_default_permissions(user_id_param uuid, user_type_param text)
RETURNS INTEGER AS $$
DECLARE
  permission_count INTEGER := 0;
  user_exists BOOLEAN := false;
  error_msg TEXT;
BEGIN
  -- Log de início
  RAISE NOTICE 'Iniciando criação de permissões para usuário % (tipo: %)', user_id_param, user_type_param;
  
  -- Verificar se o usuário existe
  BEGIN
    SELECT EXISTS(SELECT 1 FROM usuarios WHERE id = user_id_param) INTO user_exists;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO ao verificar usuário: %', SQLERRM;
    RETURN 0;
  END;
  
  IF NOT user_exists THEN
    RAISE NOTICE 'Usuário % não encontrado na tabela usuarios', user_id_param;
    RETURN 0;
  END IF;

  -- Verificar tipo válido
  IF user_type_param NOT IN ('admin', 'operador_checklist', 'operador_abastecimento') THEN
    RAISE NOTICE 'Tipo de usuário inválido: %', user_type_param;
    RETURN 0;
  END IF;

  -- Limpar permissões existentes
  BEGIN
    DELETE FROM user_permissions WHERE user_id = user_id_param;
    RAISE NOTICE 'Permissões existentes removidas para usuário %', user_id_param;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO ao limpar permissões existentes: %', SQLERRM;
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
    
    RAISE NOTICE 'Inseridas % permissões para usuário % (tipo: %)', permission_count, user_id_param, user_type_param;
    
  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    RAISE NOTICE 'ERRO ao inserir permissões: %', error_msg;
    RETURN 0;
  END;
  
  -- Verificar se as permissões foram realmente criadas
  BEGIN
    SELECT COUNT(*) INTO permission_count 
    FROM user_permissions 
    WHERE user_id = user_id_param;
    
    RAISE NOTICE 'Verificação: % permissões encontradas para usuário %', permission_count, user_id_param;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO na verificação: %', SQLERRM;
    RETURN 0;
  END;
  
  RETURN permission_count;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERRO GERAL na função create_default_permissions: %', SQLERRM;
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. COMMIT PARA GARANTIR QUE A FUNÇÃO ESTÁ DISPONÍVEL
COMMIT;

-- 5. INICIAR NOVA TRANSAÇÃO
BEGIN;

-- 6. TESTAR A FUNÇÃO COM UM USUÁRIO ESPECÍFICO
DO $$
DECLARE
  test_user_id uuid;
  test_user_email text;
  test_user_type text;
  result INTEGER;
BEGIN
  -- Buscar um usuário específico para teste
  SELECT id, email, tipo INTO test_user_id, test_user_email, test_user_type
  FROM usuarios 
  WHERE email = 'bruno@systemtruck.com.br'
  LIMIT 1;
  
  IF FOUND THEN
    RAISE NOTICE '=== TESTE DA FUNÇÃO ===';
    RAISE NOTICE 'Testando com usuário: % (ID: %, Tipo: %)', test_user_email, test_user_id, test_user_type;
    
    -- Executar a função
    SELECT create_default_permissions(test_user_id, test_user_type) INTO result;
    
    IF result > 0 THEN
      RAISE NOTICE '✅ TESTE PASSOU! Função criou % permissões', result;
    ELSE
      RAISE NOTICE '❌ TESTE FALHOU! Função retornou 0';
    END IF;
  ELSE
    RAISE NOTICE 'Usuário bruno@systemtruck.com.br não encontrado para teste';
    
    -- Tentar com qualquer usuário admin
    SELECT id, email, tipo INTO test_user_id, test_user_email, test_user_type
    FROM usuarios 
    WHERE tipo = 'admin'
    LIMIT 1;
    
    IF FOUND THEN
      RAISE NOTICE 'Testando com usuário admin: %', test_user_email;
      SELECT create_default_permissions(test_user_id, test_user_type) INTO result;
      
      IF result > 0 THEN
        RAISE NOTICE '✅ TESTE PASSOU! Função criou % permissões', result;
      ELSE
        RAISE NOTICE '❌ TESTE FALHOU! Função retornou 0';
      END IF;
    ELSE
      RAISE NOTICE 'Nenhum usuário encontrado para teste';
    END IF;
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERRO NO TESTE: %', SQLERRM;
END $$;

-- 7. PROCESSAR TODOS OS USUÁRIOS SE O TESTE PASSOU
DO $$
DECLARE
  user_record RECORD;
  total_users INTEGER := 0;
  processed_users INTEGER := 0;
  failed_users INTEGER := 0;
  total_permissions INTEGER := 0;
  result INTEGER;
BEGIN
  -- Contar usuários
  SELECT COUNT(*) INTO total_users FROM usuarios;
  
  IF total_users = 0 THEN
    RAISE NOTICE 'Nenhum usuário encontrado na tabela usuarios';
    RETURN;
  END IF;
  
  RAISE NOTICE '=== PROCESSAMENTO EM MASSA ===';
  RAISE NOTICE 'Processando % usuários...', total_users;
  
  -- Processar cada usuário
  FOR user_record IN 
    SELECT id, tipo, email 
    FROM usuarios 
    ORDER BY created_at 
  LOOP
    BEGIN
      RAISE NOTICE 'Processando usuário: % (tipo: %)', user_record.email, user_record.tipo;
      
      -- Executar função
      SELECT create_default_permissions(user_record.id, user_record.tipo) INTO result;
      
      IF result > 0 THEN
        processed_users := processed_users + 1;
        total_permissions := total_permissions + result;
        RAISE NOTICE '✅ Usuário % processado: % permissões', user_record.email, result;
      ELSE
        failed_users := failed_users + 1;
        RAISE NOTICE '❌ Falha ao processar usuário %', user_record.email;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      failed_users := failed_users + 1;
      RAISE NOTICE '❌ ERRO ao processar usuário %: %', user_record.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '=== RESULTADO FINAL ===';
  RAISE NOTICE 'Total de usuários: %', total_users;
  RAISE NOTICE 'Processados com sucesso: %', processed_users;
  RAISE NOTICE 'Falharam: %', failed_users;
  RAISE NOTICE 'Total de permissões criadas: %', total_permissions;
  
  IF processed_users = total_users THEN
    RAISE NOTICE '🎉 SUCESSO TOTAL! Todos os usuários foram processados!';
  ELSIF processed_users > 0 THEN
    RAISE NOTICE '⚠️  SUCESSO PARCIAL: %/% usuários processados', processed_users, total_users;
  ELSE
    RAISE NOTICE '❌ FALHA TOTAL: Nenhum usuário foi processado';
  END IF;
END $$;

-- 8. VERIFICAÇÃO FINAL DETALHADA
DO $$
DECLARE
  permission_count INTEGER;
  user_count INTEGER;
  users_with_permissions INTEGER;
  admin_count INTEGER;
  admin_permissions INTEGER;
  operator_checklist_count INTEGER;
  operator_checklist_permissions INTEGER;
  operator_abastecimento_count INTEGER;
  operator_abastecimento_permissions INTEGER;
BEGIN
  -- Estatísticas gerais
  SELECT COUNT(*) INTO permission_count FROM user_permissions;
  SELECT COUNT(*) INTO user_count FROM usuarios;
  SELECT COUNT(DISTINCT user_id) INTO users_with_permissions FROM user_permissions;
  
  -- Estatísticas por tipo de usuário
  SELECT COUNT(*) INTO admin_count FROM usuarios WHERE tipo = 'admin';
  SELECT COUNT(*) INTO admin_permissions 
  FROM user_permissions up 
  JOIN usuarios u ON up.user_id = u.id 
  WHERE u.tipo = 'admin';
  
  SELECT COUNT(*) INTO operator_checklist_count FROM usuarios WHERE tipo = 'operador_checklist';
  SELECT COUNT(*) INTO operator_checklist_permissions 
  FROM user_permissions up 
  JOIN usuarios u ON up.user_id = u.id 
  WHERE u.tipo = 'operador_checklist';
  
  SELECT COUNT(*) INTO operator_abastecimento_count FROM usuarios WHERE tipo = 'operador_abastecimento';
  SELECT COUNT(*) INTO operator_abastecimento_permissions 
  FROM user_permissions up 
  JOIN usuarios u ON up.user_id = u.id 
  WHERE u.tipo = 'operador_abastecimento';
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL COMPLETA ===';
  RAISE NOTICE 'USUÁRIOS:';
  RAISE NOTICE '- Total no sistema: %', user_count;
  RAISE NOTICE '- Admins: %', admin_count;
  RAISE NOTICE '- Operadores checklist: %', operator_checklist_count;
  RAISE NOTICE '- Operadores abastecimento: %', operator_abastecimento_count;
  RAISE NOTICE '';
  RAISE NOTICE 'PERMISSÕES:';
  RAISE NOTICE '- Total de permissões: %', permission_count;
  RAISE NOTICE '- Usuários com permissões: %', users_with_permissions;
  RAISE NOTICE '- Permissões de admin: %', admin_permissions;
  RAISE NOTICE '- Permissões de op. checklist: %', operator_checklist_permissions;
  RAISE NOTICE '- Permissões de op. abastecimento: %', operator_abastecimento_permissions;
  RAISE NOTICE '';
  
  IF users_with_permissions = user_count AND permission_count > 0 THEN
    RAISE NOTICE '🎉 SISTEMA DE PERMISSÕES FUNCIONANDO PERFEITAMENTE!';
    RAISE NOTICE '✅ Todos os % usuários têm suas permissões configuradas', user_count;
    RAISE NOTICE '✅ Total de % permissões criadas', permission_count;
  ELSIF permission_count > 0 THEN
    RAISE NOTICE '⚠️  Sistema parcialmente configurado';
    RAISE NOTICE '- %/% usuários com permissões', users_with_permissions, user_count;
    RAISE NOTICE '- % permissões criadas', permission_count;
  ELSE
    RAISE NOTICE '❌ SISTEMA DE PERMISSÕES NÃO CONFIGURADO';
    RAISE NOTICE '- Nenhuma permissão foi criada';
  END IF;
  
  RAISE NOTICE '=== FIM DA VERIFICAÇÃO ===';
END $$;

-- 9. CRIAR TRIGGERS PARA NOVOS USUÁRIOS
DROP TRIGGER IF EXISTS on_user_created ON usuarios;
DROP TRIGGER IF EXISTS on_user_type_updated ON usuarios;

CREATE OR REPLACE FUNCTION trigger_create_user_permissions()
RETURNS TRIGGER AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT create_default_permissions(NEW.id, NEW.tipo) INTO result;
  
  IF result > 0 THEN
    RAISE NOTICE 'Permissões criadas automaticamente para novo usuário %: % permissões', NEW.email, result;
  ELSE
    RAISE NOTICE 'ERRO: Falha ao criar permissões para novo usuário %', NEW.email;
  END IF;
  
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
    
    IF result > 0 THEN
      RAISE NOTICE 'Permissões atualizadas para usuário % (tipo alterado de % para %): % permissões', 
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
  EXECUTE FUNCTION trigger_create_user_permissions();

CREATE TRIGGER on_user_type_updated
  AFTER UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_permissions();

-- 10. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON user_permissions(module);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_module ON user_permissions(user_id, module);
CREATE INDEX IF NOT EXISTS idx_user_permissions_access ON user_permissions(user_id, module, can_access);

-- 11. COMMIT FINAL
COMMIT;