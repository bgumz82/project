/*
  # Criar Módulo Fiscal Completo

  1. Tabelas Fiscais
    - `empresas_fiscais` - Empresas para emissão de documentos
    - `cte_documentos` - Documentos CT-e
    - `mdfe_documentos` - Documentos MDF-e

  2. Controle de Numeração
    - Próximo número CT-e e MDF-e por empresa
    - Séries padrão configuráveis
    - Funções para numeração automática

  3. Gestão de Arquivos
    - Path base para arquivos XML e PDF
    - Status de geração de arquivos
    - Timestamps de criação

  4. Segurança
    - Foreign keys apropriadas
    - Constraints de validação
    - Índices para performance
*/

-- Criar enum para status de empresa fiscal
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'empresa_fiscal_status') THEN
    CREATE TYPE empresa_fiscal_status AS ENUM ('ativo', 'inativo', 'suspenso');
    RAISE NOTICE 'Enum empresa_fiscal_status criado';
  END IF;
END $$;

-- Criar enum para status de documentos CT-e
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cte_status') THEN
    CREATE TYPE cte_status AS ENUM ('pendente', 'emitido', 'cancelado');
    RAISE NOTICE 'Enum cte_status criado';
  END IF;
END $$;

-- Criar enum para status de documentos MDF-e
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mdfe_status') THEN
    CREATE TYPE mdfe_status AS ENUM ('pendente', 'emitido', 'cancelado', 'encerrado');
    RAISE NOTICE 'Enum mdfe_status criado';
  END IF;
END $$;

-- Criar tabela de empresas fiscais
CREATE TABLE IF NOT EXISTS empresas_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  cnpj text NOT NULL,
  ie text,
  endereco_completo text NOT NULL,
  rntrc text,
  status empresa_fiscal_status DEFAULT 'ativo',
  proximo_numero_cte integer DEFAULT 1,
  proximo_numero_mdfe integer DEFAULT 1,
  serie_padrao_cte text DEFAULT '1',
  serie_padrao_mdfe text DEFAULT '1',
  path_arquivos text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de documentos CT-e
CREATE TABLE IF NOT EXISTS cte_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  numero_cte text NOT NULL,
  serie text NOT NULL DEFAULT '1',
  data_emissao date NOT NULL,
  status cte_status DEFAULT 'pendente',
  observacoes text,
  xml_path text,
  pdf_path text,
  xml_gerado boolean DEFAULT false,
  pdf_gerado boolean DEFAULT false,
  xml_gerado_em timestamptz,
  pdf_gerado_em timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de documentos MDF-e
CREATE TABLE IF NOT EXISTS mdfe_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  numero_mdfe text NOT NULL,
  serie text NOT NULL DEFAULT '1',
  data_emissao date NOT NULL,
  status mdfe_status DEFAULT 'pendente',
  observacoes text,
  xml_path text,
  pdf_path text,
  xml_gerado boolean DEFAULT false,
  pdf_gerado boolean DEFAULT false,
  xml_gerado_em timestamptz,
  pdf_gerado_em timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar foreign keys
DO $$
BEGIN
  -- Foreign key CT-e -> empresas_fiscais
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'cte_documentos_empresa_id_fkey' 
    AND table_name = 'cte_documentos'
  ) THEN
    ALTER TABLE cte_documentos 
    ADD CONSTRAINT cte_documentos_empresa_id_fkey 
    FOREIGN KEY (empresa_id) REFERENCES empresas_fiscais(id) ON DELETE CASCADE;
    RAISE NOTICE 'FK cte_documentos -> empresas_fiscais criada';
  END IF;

  -- Foreign key MDF-e -> empresas_fiscais
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mdfe_documentos_empresa_id_fkey' 
    AND table_name = 'mdfe_documentos'
  ) THEN
    ALTER TABLE mdfe_documentos 
    ADD CONSTRAINT mdfe_documentos_empresa_id_fkey 
    FOREIGN KEY (empresa_id) REFERENCES empresas_fiscais(id) ON DELETE CASCADE;
    RAISE NOTICE 'FK mdfe_documentos -> empresas_fiscais criada';
  END IF;
END $$;

-- Adicionar constraints de validação
DO $$
BEGIN
  -- CNPJ único por empresa
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'empresas_fiscais_cnpj_unique'
  ) THEN
    ALTER TABLE empresas_fiscais ADD CONSTRAINT empresas_fiscais_cnpj_unique UNIQUE (cnpj);
    RAISE NOTICE 'Constraint CNPJ único adicionada';
  END IF;

  -- Número CT-e único por empresa/série
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'cte_documentos_numero_serie_unique'
  ) THEN
    ALTER TABLE cte_documentos ADD CONSTRAINT cte_documentos_numero_serie_unique 
    UNIQUE (empresa_id, numero_cte, serie);
    RAISE NOTICE 'Constraint número CT-e único adicionada';
  END IF;

  -- Número MDF-e único por empresa/série
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'mdfe_documentos_numero_serie_unique'
  ) THEN
    ALTER TABLE mdfe_documentos ADD CONSTRAINT mdfe_documentos_numero_serie_unique 
    UNIQUE (empresa_id, numero_mdfe, serie);
    RAISE NOTICE 'Constraint número MDF-e único adicionada';
  END IF;

  -- Validação de numeração positiva
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'empresas_fiscais_numeracao_positiva'
  ) THEN
    ALTER TABLE empresas_fiscais ADD CONSTRAINT empresas_fiscais_numeracao_positiva 
    CHECK (proximo_numero_cte > 0 AND proximo_numero_mdfe > 0);
    RAISE NOTICE 'Constraint numeração positiva adicionada';
  END IF;
END $$;

-- Função para obter próximo número CT-e
CREATE OR REPLACE FUNCTION get_next_cte_number(empresa_id_param uuid)
RETURNS integer AS $$
DECLARE
  next_number integer;
BEGIN
  -- Obter e incrementar o próximo número atomicamente
  UPDATE empresas_fiscais 
  SET proximo_numero_cte = proximo_numero_cte + 1,
      updated_at = now()
  WHERE id = empresa_id_param
  RETURNING proximo_numero_cte - 1 INTO next_number;
  
  IF next_number IS NULL THEN
    RAISE EXCEPTION 'Empresa fiscal não encontrada: %', empresa_id_param;
  END IF;
  
  RAISE NOTICE 'Próximo número CT-e para empresa %: %', empresa_id_param, next_number;
  RETURN next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter próximo número MDF-e
CREATE OR REPLACE FUNCTION get_next_mdfe_number(empresa_id_param uuid)
RETURNS integer AS $$
DECLARE
  next_number integer;
BEGIN
  -- Obter e incrementar o próximo número atomicamente
  UPDATE empresas_fiscais 
  SET proximo_numero_mdfe = proximo_numero_mdfe + 1,
      updated_at = now()
  WHERE id = empresa_id_param
  RETURNING proximo_numero_mdfe - 1 INTO next_number;
  
  IF next_number IS NULL THEN
    RAISE EXCEPTION 'Empresa fiscal não encontrada: %', empresa_id_param;
  END IF;
  
  RAISE NOTICE 'Próximo número MDF-e para empresa %: %', empresa_id_param, next_number;
  RETURN next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para gerar paths dos arquivos automaticamente
CREATE OR REPLACE FUNCTION generate_document_paths()
RETURNS TRIGGER AS $$
DECLARE
  empresa_path text;
  base_filename text;
BEGIN
  -- Buscar path base da empresa
  SELECT COALESCE(path_arquivos, '/uploads/fiscal/' || id::text) INTO empresa_path
  FROM empresas_fiscais
  WHERE id = NEW.empresa_id;
  
  -- Gerar nome base do arquivo
  IF TG_TABLE_NAME = 'cte_documentos' THEN
    base_filename := 'CTe_' || LPAD(NEW.numero_cte, 9, '0') || '_serie_' || NEW.serie;
    
    -- Gerar paths se não existirem
    IF NEW.xml_path IS NULL THEN
      NEW.xml_path := empresa_path || '/cte/' || base_filename || '.xml';
    END IF;
    
    IF NEW.pdf_path IS NULL THEN
      NEW.pdf_path := empresa_path || '/cte/' || base_filename || '.pdf';
    END IF;
    
  ELSIF TG_TABLE_NAME = 'mdfe_documentos' THEN
    base_filename := 'MDFe_' || LPAD(NEW.numero_mdfe, 9, '0') || '_serie_' || NEW.serie;
    
    -- Gerar paths se não existirem
    IF NEW.xml_path IS NULL THEN
      NEW.xml_path := empresa_path || '/mdfe/' || base_filename || '.xml';
    END IF;
    
    IF NEW.pdf_path IS NULL THEN
      NEW.pdf_path := empresa_path || '/mdfe/' || base_filename || '.pdf';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para gerar paths automaticamente
DROP TRIGGER IF EXISTS generate_cte_paths ON cte_documentos;
CREATE TRIGGER generate_cte_paths
  BEFORE INSERT OR UPDATE ON cte_documentos
  FOR EACH ROW
  EXECUTE FUNCTION generate_document_paths();

DROP TRIGGER IF EXISTS generate_mdfe_paths ON mdfe_documentos;
CREATE TRIGGER generate_mdfe_paths
  BEFORE INSERT OR UPDATE ON mdfe_documentos
  FOR EACH ROW
  EXECUTE FUNCTION generate_document_paths();

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_empresas_fiscais_cnpj ON empresas_fiscais(cnpj);
CREATE INDEX IF NOT EXISTS idx_empresas_fiscais_status ON empresas_fiscais(status);
CREATE INDEX IF NOT EXISTS idx_empresas_fiscais_proximo_cte ON empresas_fiscais(proximo_numero_cte);
CREATE INDEX IF NOT EXISTS idx_empresas_fiscais_proximo_mdfe ON empresas_fiscais(proximo_numero_mdfe);

CREATE INDEX IF NOT EXISTS idx_cte_documentos_empresa_id ON cte_documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_numero_serie ON cte_documentos(empresa_id, numero_cte, serie);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_data_emissao ON cte_documentos(data_emissao);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_status ON cte_documentos(status);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_xml_gerado ON cte_documentos(xml_gerado);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_pdf_gerado ON cte_documentos(pdf_gerado);

CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_empresa_id ON mdfe_documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_numero_serie ON mdfe_documentos(empresa_id, numero_mdfe, serie);
CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_data_emissao ON mdfe_documentos(data_emissao);
CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_status ON mdfe_documentos(status);
CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_xml_gerado ON mdfe_documentos(xml_gerado);
CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_pdf_gerado ON mdfe_documentos(pdf_gerado);

-- Inserir empresa fiscal de exemplo
INSERT INTO empresas_fiscais (
  razao_social,
  cnpj,
  ie,
  endereco_completo,
  rntrc,
  status,
  proximo_numero_cte,
  proximo_numero_mdfe,
  serie_padrao_cte,
  serie_padrao_mdfe,
  path_arquivos
) VALUES (
  'Empresa Exemplo Ltda',
  '12345678000190',
  '123456789012',
  'Rua Exemplo, 123, Centro, São Paulo, SP, 01234-567',
  '12345678',
  'ativo',
  1,
  1,
  '1',
  '1',
  '/uploads/fiscal/empresa_exemplo'
) ON CONFLICT (cnpj) DO NOTHING;

-- Adicionar permissões para módulos fiscais
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Adicionar permissões fiscais para todos os admins
  FOR user_record IN 
    SELECT id FROM usuarios WHERE tipo = 'admin'
  LOOP
    -- Módulo fiscal geral
    INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete)
    VALUES (user_record.id, 'fiscal', true, true, true, true)
    ON CONFLICT (user_id, module) DO UPDATE SET
      can_access = true,
      can_create = true,
      can_edit = true,
      can_delete = true,
      updated_at = now();

    -- Módulo empresas fiscais
    INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete)
    VALUES (user_record.id, 'empresas_fiscais', true, true, true, true)
    ON CONFLICT (user_id, module) DO UPDATE SET
      can_access = true,
      can_create = true,
      can_edit = true,
      can_delete = true,
      updated_at = now();

    -- Módulo CT-e
    INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete)
    VALUES (user_record.id, 'cte', true, true, true, true)
    ON CONFLICT (user_id, module) DO UPDATE SET
      can_access = true,
      can_create = true,
      can_edit = true,
      can_delete = true,
      updated_at = now();

    -- Módulo MDF-e
    INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete)
    VALUES (user_record.id, 'mdfe', true, true, true, true)
    ON CONFLICT (user_id, module) DO UPDATE SET
      can_access = true,
      can_create = true,
      can_edit = true,
      can_delete = true,
      updated_at = now();
  END LOOP;
  
  RAISE NOTICE 'Permissões fiscais adicionadas para todos os administradores';
END $$;

-- Atualizar função de criação de permissões padrão para incluir módulos fiscais
CREATE OR REPLACE FUNCTION create_user_permissions_complete(user_id_param uuid, user_type_param text)
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
  IF user_type_param = 'admin' THEN
    INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete) VALUES
    (user_id_param, 'dashboard', true, false, false, false),
    (user_id_param, 'veiculos', true, true, true, true),
    (user_id_param, 'antt', true, true, true, true),
    (user_id_param, 'associacoes_frota', true, true, true, true),
    (user_id_param, 'abastecimentos', true, true, true, true),
    (user_id_param, 'cadastros', true, true, true, true),
    (user_id_param, 'manutencoes', true, true, true, true),
    (user_id_param, 'checklists', true, true, true, true),
    (user_id_param, 'funcionarios', true, true, true, true),
    (user_id_param, 'usuarios', true, true, true, true),
    (user_id_param, 'permissoes', true, true, true, true),
    (user_id_param, 'configuracoes_banco', true, true, true, true),
    (user_id_param, 'financeiro', true, true, true, true),
    (user_id_param, 'fiscal', true, true, true, true),
    (user_id_param, 'empresas_fiscais', true, true, true, true),
    (user_id_param, 'cte', true, true, true, true),
    (user_id_param, 'mdfe', true, true, true, true),
    (user_id_param, 'relatorios', true, true, false, false);
    
    permission_count := 18;
    
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
  
  RETURN permission_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificação final
DO $$
DECLARE
  empresas_count INTEGER;
  cte_count INTEGER;
  mdfe_count INTEGER;
  permissions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO empresas_count FROM empresas_fiscais;
  SELECT COUNT(*) INTO cte_count FROM cte_documentos;
  SELECT COUNT(*) INTO mdfe_count FROM mdfe_documentos;
  SELECT COUNT(*) INTO permissions_count FROM user_permissions WHERE module IN ('fiscal', 'empresas_fiscais', 'cte', 'mdfe');
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Empresas fiscais: %', empresas_count;
  RAISE NOTICE 'Documentos CT-e: %', cte_count;
  RAISE NOTICE 'Documentos MDF-e: %', mdfe_count;
  RAISE NOTICE 'Permissões fiscais: %', permissions_count;
  
  RAISE NOTICE '✅ Módulo fiscal criado com controle de numeração!';
  RAISE NOTICE '✅ Paths automáticos configurados';
  RAISE NOTICE '✅ Funções de numeração sequencial criadas';
  RAISE NOTICE '✅ Permissões fiscais adicionadas para admins';
END $$;