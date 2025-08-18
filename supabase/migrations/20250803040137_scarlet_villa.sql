@@ .. @@
 -- 14. CRIAR FUNÇÃO PARA PERMISSÕES PADRÃO
-CREATE OR REPLACE FUNCTION setup_user_permissions_final(user_id_param uuid, user_type_param text)
+CREATE OR REPLACE FUNCTION setup_user_permissions_final(user_id_param uuid, user_type_param tipo_usuario)
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
     RETURN 0;
   END IF;

   -- Limpar permissões existentes
   DELETE FROM user_permissions WHERE user_id = user_id_param;
   
   -- Criar permissões baseadas no tipo
-  IF user_type_param = 'admin' THEN
+  IF user_type_param = 'admin'::tipo_usuario THEN
     INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
     (user_id_param, 'dashboard', true, false, false, false),
     (user_id_param, 'veiculos', true, true, true, true),
     (user_id_param, 'abastecimentos', true, true, true, true),
     (user_id_param, 'cadastros', true, true, true, true),
     (user_id_param, 'manutencoes', true, true, true, true),
     (user_id_param, 'checklists', true, true, true, true),
     (user_id_param, 'funcionarios', true, true, true, true),
     (user_id_param, 'usuarios', true, true, true, true),
     (user_id_param, 'permissoes', true, true, true, true),
     (user_id_param, 'financeiro', true, true, true, true),
     (user_id_param, 'relatorios', true, true, false, false);
     
     permission_count := 11;
     
-  ELSIF user_type_param = 'operador_checklist' THEN
+  ELSIF user_type_param = 'operador_checklist'::tipo_usuario THEN
     INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
     (user_id_param, 'dashboard', true, false, false, false),
     (user_id_param, 'checklists', true, true, false, false),
     (user_id_param, 'relatorios', true, false, false, false);
     
     permission_count := 3;
     
-  ELSIF user_type_param = 'operador_abastecimento' THEN
+  ELSIF user_type_param = 'operador_abastecimento'::tipo_usuario THEN
     INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
     (user_id_param, 'dashboard', true, false, false, false),
     (user_id_param, 'abastecimentos', true, true, false, false),
     (user_id_param, 'relatorios', true, false, false, false);
     
     permission_count := 3;
   END IF;
   
   RETURN permission_count;
 END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;

@@ .. @@
 -- 15. CRIAR TRIGGERS PARA PERMISSÕES
 CREATE OR REPLACE FUNCTION trigger_setup_user_permissions()
 RETURNS TRIGGER AS $$
 DECLARE
   result INTEGER;
 BEGIN
   SELECT setup_user_permissions_final(NEW.id, NEW.tipo) INTO result;
   RETURN NEW;
 END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;

@@ .. @@
 -- 16. CRIAR PERMISSÕES PARA USUÁRIOS EXISTENTES
 DO $$
 DECLARE
   user_record RECORD;
   result INTEGER;
 BEGIN
   FOR user_record IN SELECT id, tipo FROM usuarios LOOP
     SELECT setup_user_permissions_final(user_record.id, user_record.tipo) INTO result;
   END LOOP;
   
   RAISE NOTICE 'Permissões criadas para todos os usuários existentes';
 END $$;