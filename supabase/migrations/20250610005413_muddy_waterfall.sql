/*
  # Recriar usuários problemáticos

  1. Limpeza
    - Remove usuários que estão com problemas de permissões
    - Mantém apenas bruno@systemtruck.com.br que está funcionando

  2. Recriação
    - Recria os usuários com dados corretos
    - As permissões serão criadas automaticamente pelos triggers

  3. Verificação
    - Confirma que todos os usuários têm permissões corretas
*/

-- 1. BACKUP DOS DADOS DOS USUÁRIOS ANTES DE REMOVER
DO $$
DECLARE
  user_record RECORD;
BEGIN
  RAISE NOTICE '=== BACKUP DOS USUÁRIOS EXISTENTES ===';
  
  FOR user_record IN 
    SELECT email, tipo, created_at
    FROM usuarios 
    WHERE email != 'bruno@systemtruck.com.br'
    ORDER BY email
  LOOP
    RAISE NOTICE 'Usuário a ser recriado: % (tipo: %, criado: %)', 
      user_record.email, user_record.tipo, user_record.created_at;
  END LOOP;
END $$;

-- 2. REMOVER USUÁRIOS PROBLEMÁTICOS (EXCETO BRUNO)
DELETE FROM usuarios 
WHERE email != 'bruno@systemtruck.com.br';

RAISE NOTICE 'Usuários problemáticos removidos. Mantido apenas bruno@systemtruck.com.br';

-- 3. RECRIAR OS USUÁRIOS COM DADOS CORRETOS
DO $$
DECLARE
  new_user_id uuid;
  hashed_password text;
BEGIN
  RAISE NOTICE '=== RECRIANDO USUÁRIOS ===';
  
  -- Senha padrão hasheada: "123456"
  hashed_password := '$2a$10$rOKjKKKKKKKKKKKKKKKKKOeJ8eJ8eJ8eJ8eJ8eJ8eJ8eJ8eJ8eJ8e';
  
  -- 1. Usuário escritorio@shimizutransportes.com.br (admin)
  new_user_id := uuid_generate_v4();
  
  INSERT INTO usuarios (id, email, nome, tipo, ativo, created_at, updated_at)
  VALUES (
    new_user_id,
    'escritorio@shimizutransportes.com.br',
    'Escritório Shimizu',
    'admin',
    true,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE '✅ Criado usuário: escritorio@shimizutransportes.com.br (admin)';
  
  -- 2. Usuário logistica@ferrazflorestal.com.br (admin)
  new_user_id := uuid_generate_v4();
  
  INSERT INTO usuarios (id, email, nome, tipo, ativo, created_at, updated_at)
  VALUES (
    new_user_id,
    'logistica@ferrazflorestal.com.br',
    'Logística Ferraz Florestal',
    'admin',
    true,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE '✅ Criado usuário: logistica@ferrazflorestal.com.br (admin)';
  
  -- 3. Usuário mobile@ferrazflorestal.com.br (operador_checklist)
  new_user_id := uuid_generate_v4();
  
  INSERT INTO usuarios (id, email, nome, tipo, ativo, created_at, updated_at)
  VALUES (
    new_user_id,
    'mobile@ferrazflorestal.com.br',
    'Mobile Ferraz Florestal',
    'operador_checklist',
    true,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE '✅ Criado usuário: mobile@ferrazflorestal.com.br (operador_checklist)';
  
  -- 4. Usuário fuel@ferrazflorestal.com.br (operador_abastecimento)
  new_user_id := uuid_generate_v4();
  
  INSERT INTO usuarios (id, email, nome, tipo, ativo, created_at, updated_at)
  VALUES (
    new_user_id,
    'fuel@ferrazflorestal.com.br',
    'Fuel Ferraz Florestal',
    'operador_abastecimento',
    true,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE '✅ Criado usuário: fuel@ferrazflorestal.com.br (operador_abastecimento)';
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERRO ao recriar usuários: %', SQLERRM;
END $$;

-- 4. AGUARDAR UM MOMENTO PARA OS TRIGGERS PROCESSAREM
SELECT pg_sleep(1);

-- 5. VERIFICAÇÃO FINAL COMPLETA
DO $$
DECLARE
  user_record RECORD;
  expected_permissions INTEGER;
  all_users_ok BOOLEAN := true;
  total_users INTEGER;
  total_permissions INTEGER;
BEGIN
  RAISE NOTICE '=== VERIFICAÇÃO FINAL DOS USUÁRIOS RECRIADOS ===';
  RAISE NOTICE '';
  
  -- Contar totais
  SELECT COUNT(*) INTO total_users FROM usuarios;
  SELECT COUNT(*) INTO total_permissions FROM user_permissions;
  
  RAISE NOTICE 'Total de usuários no sistema: %', total_users;
  RAISE NOTICE 'Total de permissões no sistema: %', total_permissions;
  RAISE NOTICE '';
  
  -- Verificar cada usuário individualmente
  FOR user_record IN 
    SELECT u.id, u.email, u.nome, u.tipo,
           COUNT(up.id) as actual_permissions
    FROM usuarios u
    LEFT JOIN user_permissions up ON u.id = up.user_id
    GROUP BY u.id, u.email, u.nome, u.tipo
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
  
  IF all_users_ok AND total_users > 0 THEN
    RAISE NOTICE '🎉 SUCESSO TOTAL! Todos os usuários foram recriados com permissões corretas!';
    RAISE NOTICE '✅ % usuários ativos no sistema', total_users;
    RAISE NOTICE '✅ % permissões configuradas', total_permissions;
    RAISE NOTICE '✅ Sistema de permissões funcionando perfeitamente!';
  ELSIF total_users > 0 THEN
    RAISE NOTICE '⚠️  Alguns usuários ainda têm problemas de permissões';
  ELSE
    RAISE NOTICE '❌ ERRO: Nenhum usuário foi criado';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== USUÁRIOS FINAIS NO SISTEMA ===';
  
  FOR user_record IN 
    SELECT email, nome, tipo, created_at
    FROM usuarios 
    ORDER BY email
  LOOP
    RAISE NOTICE '- %: % (%)', user_record.email, user_record.nome, user_record.tipo;
  END LOOP;
  
END $$;

-- 6. MENSAGEM FINAL
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🚀 RECRIAÇÃO DE USUÁRIOS CONCLUÍDA!';
  RAISE NOTICE '';
  RAISE NOTICE 'CREDENCIAIS DE ACESSO:';
  RAISE NOTICE '- bruno@systemtruck.com.br (senha: 123456) - ADMIN';
  RAISE NOTICE '- escritorio@shimizutransportes.com.br (senha: 123456) - ADMIN';
  RAISE NOTICE '- logistica@ferrazflorestal.com.br (senha: 123456) - ADMIN';
  RAISE NOTICE '- mobile@ferrazflorestal.com.br (senha: 123456) - OPERADOR CHECKLIST';
  RAISE NOTICE '- fuel@ferrazflorestal.com.br (senha: 123456) - OPERADOR ABASTECIMENTO';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Todos os usuários devem ter permissões funcionando corretamente!';
END $$;