/*
  # Controle de Numeração e Arquivos para Documentos Fiscais

  1. Alterações nas Tabelas
    - Adicionar campos de controle de numeração nas empresas
    - Adicionar campos de path para arquivos XML e PDF
    - Adicionar campos de status de arquivo

  2. Novas Funcionalidades
    - Controle automático de numeração sequencial
    - Armazenamento de paths para XML e PDF
    - Status de geração de arquivos

  3. Segurança
    - Triggers para incrementar numeração automaticamente
    - Validações de integridade
    - Índices para performance
*/

-- Adicionar campos de controle de numeração nas empresas fiscais
DO $$
BEGIN
  -- Próximo número CT-e
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas_fiscais' AND column_name = 'proximo_numero_cte'
  ) THEN
    ALTER TABLE empresas_fiscais ADD COLUMN proximo_numero_cte integer DEFAULT 1;
    RAISE NOTICE 'Coluna proximo_numero_cte adicionada';
  END IF;

  -- Próximo número MDF-e
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas_fiscais' AND column_name = 'proximo_numero_mdfe'
  ) THEN
    ALTER TABLE empresas_fiscais ADD COLUMN proximo_numero_mdfe integer DEFAULT 1;
    RAISE NOTICE 'Coluna proximo_numero_mdfe adicionada';
  END IF;

  -- Série padrão CT-e
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas_fiscais' AND column_name = 'serie_padrao_cte'
  ) THEN
    ALTER TABLE empresas_fiscais ADD COLUMN serie_padrao_cte text DEFAULT '1';
    RAISE NOTICE 'Coluna serie_padrao_cte adicionada';
  END IF;

  -- Série padrão MDF-e
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas_fiscais' AND column_name = 'serie_padrao_mdfe'
  ) THEN
    ALTER TABLE empresas_fiscais ADD COLUMN serie_padrao_mdfe text DEFAULT '1';
    RAISE NOTICE 'Coluna serie_padrao_mdfe adicionada';
  END IF;

  -- Path base para arquivos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas_fiscais' AND column_name = 'path_arquivos'
  ) THEN
    ALTER TABLE empresas_fiscais ADD COLUMN path_arquivos text;
    RAISE NOTICE 'Coluna path_arquivos adicionada';
  END IF;
END $$;

-- Adicionar campos de arquivo nos documentos CT-e
DO $$
BEGIN
  -- Path do arquivo XML
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'xml_path'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN xml_path text;
    RAISE NOTICE 'Coluna xml_path adicionada em cte_documentos';
  END IF;

  -- Path do arquivo PDF
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'pdf_path'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN pdf_path text;
    RAISE NOTICE 'Coluna pdf_path adicionada em cte_documentos';
  END IF;

  -- Status de geração do XML
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'xml_gerado'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN xml_gerado boolean DEFAULT false;
    RAISE NOTICE 'Coluna xml_gerado adicionada em cte_documentos';
  END IF;

  -- Status de geração do PDF
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'pdf_gerado'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN pdf_gerado boolean DEFAULT false;
    RAISE NOTICE 'Coluna pdf_gerado adicionada em cte_documentos';
  END IF;

  -- Data de geração do XML
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'xml_gerado_em'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN xml_gerado_em timestamptz;
    RAISE NOTICE 'Coluna xml_gerado_em adicionada em cte_documentos';
  END IF;

  -- Data de geração do PDF
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'pdf_gerado_em'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN pdf_gerado_em timestamptz;
    RAISE NOTICE 'Coluna pdf_gerado_em adicionada em cte_documentos';
  END IF;
END $$;

-- Adicionar campos de arquivo nos documentos MDF-e
DO $$
BEGIN
  -- Path do arquivo XML
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mdfe_documentos' AND column_name = 'xml_path'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN xml_path text;
    RAISE NOTICE 'Coluna xml_path adicionada em mdfe_documentos';
  END IF;

  -- Path do arquivo PDF
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mdfe_documentos' AND column_name = 'pdf_path'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN pdf_path text;
    RAISE NOTICE 'Coluna pdf_path adicionada em mdfe_documentos';
  END IF;

  -- Status de geração do XML
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mdfe_documentos' AND column_name = 'xml_gerado'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN xml_gerado boolean DEFAULT false;
    RAISE NOTICE 'Coluna xml_gerado adicionada em mdfe_documentos';
  END IF;

  -- Status de geração do PDF
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mdfe_documentos' AND column_name = 'pdf_gerado'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN pdf_gerado boolean DEFAULT false;
    RAISE NOTICE 'Coluna pdf_gerado adicionada em mdfe_documentos';
  END IF;

  -- Data de geração do XML
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mdfe_documentos' AND column_name = 'xml_gerado_em'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN xml_gerado_em timestamptz;
    RAISE NOTICE 'Coluna xml_gerado_em adicionada em mdfe_documentos';
  END IF;

  -- Data de geração do PDF
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mdfe_documentos' AND column_name = 'pdf_gerado_em'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN pdf_gerado_em timestamptz;
    RAISE NOTICE 'Coluna pdf_gerado_em adicionada em mdfe_documentos';
  END IF;
END $$;

-- Função para obter próximo número CT-e
CREATE OR REPLACE FUNCTION get_next_cte_number(empresa_id_param uuid)
RETURNS integer AS $$
DECLARE
  next_number integer;
BEGIN
  -- Obter e incrementar o próximo número
  UPDATE empresas_fiscais 
  SET proximo_numero_cte = proximo_numero_cte + 1,
      updated_at = now()
  WHERE id = empresa_id_param
  RETURNING proximo_numero_cte - 1 INTO next_number;
  
  IF next_number IS NULL THEN
    RAISE EXCEPTION 'Empresa fiscal não encontrada: %', empresa_id_param;
  END IF;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter próximo número MDF-e
CREATE OR REPLACE FUNCTION get_next_mdfe_number(empresa_id_param uuid)
RETURNS integer AS $$
DECLARE
  next_number integer;
BEGIN
  -- Obter e incrementar o próximo número
  UPDATE empresas_fiscais 
  SET proximo_numero_mdfe = proximo_numero_mdfe + 1,
      updated_at = now()
  WHERE id = empresa_id_param
  RETURNING proximo_numero_mdfe - 1 INTO next_number;
  
  IF next_number IS NULL THEN
    RAISE EXCEPTION 'Empresa fiscal não encontrada: %', empresa_id_param;
  END IF;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para gerar paths dos arquivos
CREATE OR REPLACE FUNCTION generate_document_paths()
RETURNS TRIGGER AS $$
DECLARE
  empresa_path text;
  base_filename text;
BEGIN
  -- Buscar path base da empresa
  SELECT path_arquivos INTO empresa_path
  FROM empresas_fiscais
  WHERE id = NEW.empresa_id;
  
  -- Se não tem path configurado, usar padrão
  IF empresa_path IS NULL OR empresa_path = '' THEN
    empresa_path := '/uploads/fiscal/' || NEW.empresa_id;
  END IF;
  
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

-- Atualizar empresas existentes com valores padrão
UPDATE empresas_fiscais 
SET 
  proximo_numero_cte = COALESCE(proximo_numero_cte, 1),
  proximo_numero_mdfe = COALESCE(proximo_numero_mdfe, 1),
  serie_padrao_cte = COALESCE(serie_padrao_cte, '1'),
  serie_padrao_mdfe = COALESCE(serie_padrao_mdfe, '1'),
  path_arquivos = COALESCE(path_arquivos, '/uploads/fiscal/' || id::text),
  updated_at = now()
WHERE 
  proximo_numero_cte IS NULL OR 
  proximo_numero_mdfe IS NULL OR 
  serie_padrao_cte IS NULL OR 
  serie_padrao_mdfe IS NULL OR 
  path_arquivos IS NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_cte_documentos_xml_path ON cte_documentos(xml_path);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_pdf_path ON cte_documentos(pdf_path);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_xml_gerado ON cte_documentos(xml_gerado);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_pdf_gerado ON cte_documentos(pdf_gerado);

CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_xml_path ON mdfe_documentos(xml_path);
CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_pdf_path ON mdfe_documentos(pdf_path);
CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_xml_gerado ON mdfe_documentos(xml_gerado);
CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_pdf_gerado ON mdfe_documentos(pdf_gerado);

CREATE INDEX IF NOT EXISTS idx_empresas_fiscais_proximo_cte ON empresas_fiscais(proximo_numero_cte);
CREATE INDEX IF NOT EXISTS idx_empresas_fiscais_proximo_mdfe ON empresas_fiscais(proximo_numero_mdfe);

-- Verificação final
DO $$
DECLARE
  empresas_count INTEGER;
  cte_count INTEGER;
  mdfe_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO empresas_count FROM empresas_fiscais;
  SELECT COUNT(*) INTO cte_count FROM cte_documentos;
  SELECT COUNT(*) INTO mdfe_count FROM mdfe_documentos;
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Empresas fiscais: %', empresas_count;
  RAISE NOTICE 'Documentos CT-e: %', cte_count;
  RAISE NOTICE 'Documentos MDF-e: %', mdfe_count;
  
  RAISE NOTICE '✅ Controle de numeração e arquivos implementado!';
  RAISE NOTICE '✅ Paths automáticos configurados';
  RAISE NOTICE '✅ Funções de numeração sequencial criadas';
END $$;