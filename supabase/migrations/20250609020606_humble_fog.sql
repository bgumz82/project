/*
  # Popular Permissões para Usuários Existentes

  Esta migração executa APÓS a criação da função create_default_permissions
  e popula as permissões para todos os usuários já existentes no sistema.
*/

-- Popular permissões para usuários existentes
DO $$
DECLARE
  user_record RECORD;
  total_users INTEGER := 0;
  processed_users INTEGER := 0;
BEGIN
  -- Contar total de usuários
  SELECT COUNT(*) INTO total_users FROM usuarios;
  RAISE NOTICE 'Iniciando criação de permissões para % usuários existentes', total_users;
  
  -- Processar cada usuário
  FOR user_record IN 
    SELECT id, tipo, email 
    FROM usuarios 
    ORDER BY created_at 
  LOOP
    BEGIN
      -- Criar permissões padrão para este usuário
      PERFORM create_default_permissions(user_record.id, user_record.tipo);
      processed_users := processed_users + 1;
      
      RAISE NOTICE 'Permissões criadas para usuário % (%) - Tipo: %', 
        processed_users, user_record.email, user_record.tipo;
        
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao criar permissões para usuário %: %', 
        user_record.email, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Concluído! Permissões criadas para %/% usuários', processed_users, total_users;
END $$;

-- Verificar se as permissões foram criadas corretamente
DO $$
DECLARE
  permission_count INTEGER;
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO permission_count FROM user_permissions;
  SELECT COUNT(*) INTO user_count FROM usuarios;
  
  RAISE NOTICE 'Verificação final:';
  RAISE NOTICE '- Total de usuários: %', user_count;
  RAISE NOTICE '- Total de permissões criadas: %', permission_count;
  
  IF permission_count > 0 THEN
    RAISE NOTICE '✅ Sistema de permissões configurado com sucesso!';
  ELSE
    RAISE WARNING '⚠️  Nenhuma permissão foi criada. Verifique se existem usuários na tabela.';
  END IF;
END $$;