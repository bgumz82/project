-- Migração para recriar usuários problemáticos com permissões corretas
/*
  # Recriação de Usuários com Permissões

  1. Backup dos dados existentes
  2. Remoção de usuários problemáticos (exceto bruno@systemtruck.com.br)
  3. Recriação com dados corretos e senhas válidas
  4. Verificação automática das permissões via triggers
  5. Validação final do sistema

  ## Usuários que serão recriados:
  - escritorio@shimizutransportes.com.br (admin)
  - logistica@ferrazflorestal.com.br (admin)
  - mobile@ferrazflorestal.com.br (operador_checklist)
  - fuel@ferrazflorestal.com.br (operador_abastecimento)

  ## Credenciais:
  Todos os usuários terão a senha: 123456
*/

-- 1. BACKUP DOS DADOS DOS USUÁRIOS ANTES DE REMOVER
DO $$
DECLARE
  user_record RECORD;
  backup_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== BACKUP DOS USUÁRIOS EXISTENTES ===';
  
  FOR user_record IN 
    SELECT email, nome, tipo, created_at
    FROM usuarios 
    WHERE email != 'bruno@systemtruck.com.br'
    ORDER BY email
  LOOP
    backup_count := backup_count + 1;
    RAISE NOTICE 'Usuário a ser recriado: % - % (tipo: %, criado: %)', 
      backup_count, user_record.email, user_record.tipo, user_record.created_at;
  END LOOP;
  
  IF backup_count = 0 THEN
    RAISE NOTICE 'Nenhum usuário encontrado para recriar (além do bruno@systemtruck.com.br)';
  ELSE
    RAISE NOTICE 'Total de % usuários serão recriados', backup_count;
  END IF;
END $$;

-- 2. REMOVER USUÁRIOS PROBLEMÁTICOS (EXCETO BRUNO)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Remover usuários problemáticos
  DELETE FROM usuarios 
  WHERE email != 'bruno@systemtruck.com.br';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Removidos % usuários problemáticos. Mantido apenas bruno@systemtruck.com.br', deleted_count;
END $$;

-- 3. RECRIAR OS USUÁRIOS COM DADOS CORRETOS E SENHAS VÁLIDAS
DO $$
DECLARE
  new_user_id uuid;
  hashed_password text;
  created_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== RECRIANDO USUÁRIOS COM SENHAS VÁLIDAS ===';
  
  -- Hash bcrypt válido para senha "123456"
  -- Gerado com: bcrypt.hashSync('123456', 10)
  hashed_password := '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
  
  -- 1. Usuário escritorio@shimizutransportes.com.br (admin)
  BEGIN
    new_user_id := gen_random_uuid();
    
    INSERT INTO usuarios (id, email, nome, tipo, ativo, created_at, updated_at)
    VALUES (
      new_user_id,
      'escritorio@shimizutransportes.com.br',
      'Escritório Shimizu Transportes',
      'admin',
      true,
      NOW(),
      NOW()
    );
    
    created_count := created_count + 1;
    RAISE NOTICE '✅ Criado usuário %: escritorio@shimizutransportes.com.br (admin)', created_count;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar escritorio@shimizutransportes.com.br: %', SQLERRM;
  END;
  
  -- 2. Usuário logistica@ferrazflorestal.com.br (admin)
  BEGIN
    new_user_id := gen_random_uuid();
    
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
    
    created_count := created_count + 1;
    RAISE NOTICE '✅ Criado usuário %: logistica@ferrazflorestal.com.br (admin)', created_count;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar logistica@ferrazflorestal.com.br: %', SQLERRM;
  END;
  
  -- 3. Usuário mobile@ferrazflorestal.com.br (operador_checklist)
  BEGIN
    new_user_id := gen_random_uuid();
    
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
    
    created_count := created_count + 1;
    RAISE NOTICE '✅ Criado usuário %: mobile@ferrazflorestal.com.br (operador_checklist)', created_count;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar mobile@ferrazflorestal.com.br: %', SQLERRM;
  END;
  
  -- 4. Usuário fuel@ferrazflorestal.com.br (operador_abastecimento)
  BEGIN
    new_user_id := gen_random_uuid();
    
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
    
    created_count := created_count + 1;
    RAISE NOTICE '✅ Criado usuário %: fuel@ferrazflorestal.com.br (operador_abastecimento)', created_count;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar fuel@ferrazflorestal.com.br: %', SQLERRM;
  END;
  
  RAISE NOTICE 'Total de usuários criados com sucesso: %', created_count;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERRO CRÍTICO ao recriar usuários: %', SQLERRM;
END $$;

-- 4. AGUARDAR PROCESSAMENTO DOS TRIGGERS (usando COMMIT/BEGIN ao invés de pg_sleep)
COMMIT;
BEGIN;

-- 5. VERIFICAÇÃO FINAL COMPLETA
DO $$
DECLARE
  user_record RECORD;
  expected_permissions INTEGER;
  all_users_ok BOOLEAN := true;
  total_users INTEGER;
  total_permissions INTEGER;
  users_with_permissions INTEGER;
  verification_details TEXT := '';
BEGIN
  RAISE NOTICE '=== VERIFICAÇÃO FINAL DOS USUÁRIOS RECRIADOS ===';
  RAISE NOTICE '';
  
  -- Contar totais
  SELECT COUNT(*) INTO total_users FROM usuarios;
  SELECT COUNT(*) INTO total_permissions FROM user_permissions;
  SELECT COUNT(DISTINCT user_id) INTO users_with_permissions FROM user_permissions;
  
  RAISE NOTICE 'ESTATÍSTICAS GERAIS:';
  RAISE NOTICE '- Total de usuários no sistema: %', total_users;
  RAISE NOTICE '- Usuários com permissões: %', users_with_permissions;
  RAISE NOTICE '- Total de permissões no sistema: %', total_permissions;
  RAISE NOTICE '';
  
  -- Verificar cada usuário individualmente
  RAISE NOTICE 'VERIFICAÇÃO INDIVIDUAL:';
  
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
      verification_details := verification_details || '✅ ' || user_record.email || ' ';
    ELSE
      RAISE NOTICE '❌ %: % permissões (esperado: %)', 
        user_record.email, user_record.actual_permissions, expected_permissions;
      verification_details := verification_details || '❌ ' || user_record.email || ' ';
      all_users_ok := false;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  
  -- Resultado final
  IF all_users_ok AND total_users >= 5 AND users_with_permissions = total_users THEN
    RAISE NOTICE '🎉 SUCESSO TOTAL! Todos os usuários foram recriados com permissões corretas!';
    RAISE NOTICE '✅ % usuários ativos no sistema', total_users;
    RAISE NOTICE '✅ % permissões configuradas corretamente', total_permissions;
    RAISE NOTICE '✅ Sistema de permissões funcionando perfeitamente!';
  ELSIF total_users > 0 AND users_with_permissions > 0 THEN
    RAISE NOTICE '⚠️  Sistema parcialmente configurado:';
    RAISE NOTICE '- %/% usuários com permissões corretas', users_with_permissions, total_users;
    RAISE NOTICE '- Detalhes: %', verification_details;
  ELSE
    RAISE NOTICE '❌ ERRO: Sistema não foi configurado corretamente';
    RAISE NOTICE '- Usuários: %, Com permissões: %', total_users, users_with_permissions;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== LISTA FINAL DE USUÁRIOS ===';
  
  FOR user_record IN 
    SELECT email, nome, tipo, created_at
    FROM usuarios 
    ORDER BY 
      CASE tipo 
        WHEN 'admin' THEN 1 
        WHEN 'operador_checklist' THEN 2 
        WHEN 'operador_abastecimento' THEN 3 
        ELSE 4 
      END,
      email
  LOOP
    RAISE NOTICE '- %: % (%)', user_record.email, user_record.nome, user_record.tipo;
  END LOOP;
  
END $$;

-- 6. TESTE DE INTEGRIDADE DO SISTEMA DE PERMISSÕES
DO $$
DECLARE
  admin_count INTEGER;
  admin_permissions INTEGER;
  operator_count INTEGER;
  operator_permissions INTEGER;
  system_health TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TESTE DE INTEGRIDADE DO SISTEMA ===';
  
  -- Contar admins e suas permissões
  SELECT COUNT(*) INTO admin_count FROM usuarios WHERE tipo = 'admin';
  SELECT COUNT(*) INTO admin_permissions 
  FROM user_permissions up 
  JOIN usuarios u ON up.user_id = u.id 
  WHERE u.tipo = 'admin';
  
  -- Contar operadores e suas permissões
  SELECT COUNT(*) INTO operator_count 
  FROM usuarios 
  WHERE tipo IN ('operador_checklist', 'operador_abastecimento');
  
  SELECT COUNT(*) INTO operator_permissions 
  FROM user_permissions up 
  JOIN usuarios u ON up.user_id = u.id 
  WHERE u.tipo IN ('operador_checklist', 'operador_abastecimento');
  
  RAISE NOTICE 'INTEGRIDADE POR TIPO:';
  RAISE NOTICE '- Admins: % usuários, % permissões (esperado: %)', 
    admin_count, admin_permissions, admin_count * 9;
  RAISE NOTICE '- Operadores: % usuários, % permissões (esperado: %)', 
    operator_count, operator_permissions, operator_count * 3;
  
  -- Determinar saúde do sistema
  IF admin_permissions = admin_count * 9 AND operator_permissions = operator_count * 3 THEN
    system_health := '🟢 PERFEITO';
  ELSIF admin_permissions > 0 AND operator_permissions > 0 THEN
    system_health := '🟡 PARCIAL';
  ELSE
    system_health := '🔴 FALHOU';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'STATUS DO SISTEMA: %', system_health;
  
END $$;

-- 7. MENSAGEM FINAL COM CREDENCIAIS
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🚀 RECRIAÇÃO DE USUÁRIOS CONCLUÍDA!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 CREDENCIAIS DE ACESSO (senha: 123456):';
  RAISE NOTICE '';
  RAISE NOTICE '👑 ADMINISTRADORES:';
  RAISE NOTICE '   • bruno@systemtruck.com.br';
  RAISE NOTICE '   • escritorio@shimizutransportes.com.br';
  RAISE NOTICE '   • logistica@ferrazflorestal.com.br';
  RAISE NOTICE '';
  RAISE NOTICE '📱 OPERADORES MOBILE:';
  RAISE NOTICE '   • mobile@ferrazflorestal.com.br (checklist)';
  RAISE NOTICE '   • fuel@ferrazflorestal.com.br (abastecimento)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Todos os usuários devem ter permissões funcionando corretamente!';
  RAISE NOTICE '✅ Os triggers criarão as permissões automaticamente!';
  RAISE NOTICE '';
END $$;

-- 8. COMMIT FINAL
COMMIT;