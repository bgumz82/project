@@ .. @@
     IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'modelo') THEN
       ALTER TABLE veiculos ADD COLUMN modelo varchar(100) NOT NULL DEFAULT 'Modelo não informado';
     END IF;
     
+    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'ativo') THEN
+      ALTER TABLE veiculos ADD COLUMN ativo boolean DEFAULT true;
+    END IF;
+    
     RAISE NOTICE 'Tabela veiculos verificada e atualizada';
   END IF;
 END $$;