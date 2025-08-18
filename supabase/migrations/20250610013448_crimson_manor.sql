-- Migração para corrigir a função de permissões que está faltando

-- 1. GARANTIR EXTENSÃO UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. GARANTIR QUE A TABELA EXISTE
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

-- 3. CRIAR A FUNÇÃO QUE ESTAVA FALTANDO
CREATE OR REPLACE FUNCTION setup_user_permissions_final(user_id_param uuid, user_type_param text)
RETURNS INTEGER AS $$
DECLARE
  permission_count INTEGER := 0;
  user_exists BOOLEAN := false;
  user_email TEXT;
  inserted_count INTEGER;
BEGIN
  -- Verificar se o usuário existe
  BEGIN
    SELECT email INTO user_email FROM usuarios WHERE id = user_id_param;
    user_exists := FOUND;
    
    IF NOT user_exists THEN
      RAISE NOTICE 'ERRO: Usuário % não encontrado', user_id_param;
      RETURN 0;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO ao buscar usuário %: %', user_id_param, SQLERRM;
    RETURN 0;
  END;

  RAISE NOTICE 'Processando usuário: % (Tipo: %)', user_email, user_type_param;

  -- Verificar tipo válido
  IF user_type_param NOT IN ('admin', 'operador_checklist', 'operador_abastecimento') THEN
    RAISE NOTICE 'ERRO: Tipo inválido: %', user_type_param;
    RETURN 0;
  END IF;

  -- Limpar permissões existentes
  BEGIN
    DELETE FROM user_permissions WHERE user_id = user_id_param;
    GET DIAGNOSTICS permission_count = ROW_COUNT;
    RAISE NOTICE 'Removidas % permissões existentes para %', permission_count, user_email;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO ao limpar permissões: %', SQLERRM;
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
    RAISE NOTICE 'ERRO ao inserir permissões: %', SQLERRM;
    RETURN 0;
  END;
  
  -- Verificar se as permissões foram criadas
  BEGIN
    SELECT COUNT(*) INTO permission_count 
    FROM user_permissions 
    WHERE user_id = user_id_param;
    
    IF permission_count = inserted_count AND permission_count > 0 THEN
      RAISE NOTICE '✅ SUCESSO: % permissões verificadas para %', permission_count, user_email;
      RETURN permission_count;
    ELSE
      RAISE NOTICE '❌ FALHA na verificação: esperado %, encontrado %', inserted_count, permission_count;
      RETURN 0;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERRO na verificação: %', SQLERRM;
    RETURN 0;
  END;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERRO GERAL: %', SQLERRM;
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. PROCESSAR TODOS OS USUÁRIOS EXISTENTES
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
  
  RAISE NOTICE '=== PROCESSANDO % USUÁRIOS ===', total_users;
  
  IF total_users = 0 THEN
    RAISE NOTICE '❌ Nenhum usuário encontrado';
    RETURN;
  END IF;
  
  -- Processar cada usuário
  FOR user_record IN 
    SELECT id, tipo, email
    FROM usuarios 
    ORDER BY email
  LOOP
    BEGIN
      RAISE NOTICE 'Processando: %', user_record.email;
      
      -- Executar função
      SELECT setup_user_permissions_final(user_record.id, user_record.tipo) INTO result;
      
      IF result > 0 THEN
        processed_users := processed_users + 1;
        total_permissions := total_permissions + result;
        RAISE NOTICE '✅ %: % permissões criadas', user_record.email, result;
      ELSE
        failed_users := failed_users + 1;
        RAISE NOTICE '❌ %: falha ao criar permissões', user_record.email;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      failed_users := failed_users + 1;
      RAISE NOTICE '❌ ERRO ao processar %: %', user_record.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== RESULTADO FINAL ===';
  RAISE NOTICE 'Total de usuários: %', total_users;
  RAISE NOTICE 'Processados com sucesso: %', processed_users;
  RAISE NOTICE 'Falharam: %', failed_users;
  RAISE NOTICE 'Total de permissões criadas: %', total_permissions;
  
  IF processed_users = total_users THEN
    RAISE NOTICE '🎉 SUCESSO TOTAL! Todos os usuários processados!';
  ELSIF processed_users > 0 THEN
    RAISE NOTICE '⚠️  SUCESSO PARCIAL: %/% usuários', processed_users, total_users;
  ELSE
    RAISE NOTICE '❌ FALHA TOTAL: Nenhum usuário processado';
  END IF;
END $$;

-- 5. VERIFICAÇÃO FINAL
DO $$
DECLARE
  user_record RECORD;
  expected_permissions INTEGER;
  all_users_ok BOOLEAN := true;
  total_users INTEGER;
  total_permissions INTEGER;
  users_with_permissions INTEGER;
BEGIN
  -- Estatísticas
  SELECT COUNT(*) INTO total_users FROM usuarios;
  SELECT COUNT(*) INTO total_permissions FROM user_permissions;
  SELECT COUNT(DISTINCT user_id) INTO users_with_permissions FROM user_permissions;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Total de usuários: %', total_users;
  RAISE NOTICE 'Usuários com permissões: %', users_with_permissions;
  RAISE NOTICE 'Total de permissões: %', total_permissions;
  RAISE NOTICE '';
  
  -- Verificar cada usuário
  FOR user_record IN 
    SELECT u.id, u.email, u.tipo,
           COUNT(up.id) as actual_permissions
    FROM usuarios u
    LEFT JOIN user_permissions up ON u.id = up.user_id
    GROUP BY u.id, u.email, u.tipo
    ORDER BY u.email
  LOOP
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
  
  IF all_users_ok AND users_with_permissions = total_users AND total_permissions > 0 THEN
    RAISE NOTICE '🎉 SISTEMA DE PERMISSÕES FUNCIONANDO PERFEITAMENTE!';
    RAISE NOTICE '✅ % usuários com permissões corretas', total_users;
    RAISE NOTICE '✅ % permissões ativas', total_permissions;
  ELSIF users_with_permissions > 0 THEN
    RAISE NOTICE '⚠️  Sistema parcialmente configurado';
    RAISE NOTICE '- %/% usuários com permissões', users_with_permissions, total_users;
  ELSE
    RAISE NOTICE '❌ Sistema não configurado';
  END IF;
END $$;

-- 6. ATUALIZAR TRIGGERS
DROP TRIGGER IF EXISTS on_user_created ON usuarios;
DROP TRIGGER IF EXISTS on_user_type_updated ON usuarios;

CREATE OR REPLACE FUNCTION trigger_setup_user_permissions()
RETURNS TRIGGER AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT setup_user_permissions_final(NEW.id, NEW.tipo) INTO result;
  
  IF result > 0 THEN
    RAISE NOTICE 'Permissões criadas para novo usuário %: % permissões', NEW.email, result;
  ELSE
    RAISE NOTICE 'ERRO: Falha ao criar permissões para %', NEW.email;
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
    SELECT setup_user_permissions_final(NEW.id, NEW.tipo) INTO result;
    
    IF result > 0 THEN
      RAISE NOTICE 'Permissões atualizadas para %: % permissões', NEW.email, result;
    ELSE
      RAISE NOTICE 'ERRO: Falha ao atualizar permissões para %', NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created
  AFTER INSERT ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_setup_user_permissions();

CREATE TRIGGER on_user_type_updated
  AFTER UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_permissions();

-- 7. CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON user_permissions(module);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_module ON user_permissions(user_id, module);

-- 8. MENSAGEM FINAL
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🚀 FUNÇÃO DE PERMISSÕES CORRIGIDA!';
  RAISE NOTICE '✅ Função setup_user_permissions_final criada';
  RAISE NOTICE '✅ Todos os usuários processados';
  RAISE NOTICE '✅ Triggers atualizados';
  RAISE NOTICE '✅ Sistema deve estar funcionando agora!';
  RAISE NOTICE '';
END $$;