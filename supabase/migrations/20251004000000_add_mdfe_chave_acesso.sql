-- Migration: Adicionar colunas de chave de acesso ao MDF-e
-- Descrição: Adiciona as colunas chave_acesso, codigo_numerico, dv e paths de arquivos
--            necessárias para geração automática da chave de acesso do MDF-e

-- Adicionar colunas se não existirem
DO $$
BEGIN
  -- Adicionar chave_acesso
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mdfe_documentos' AND column_name='chave_acesso'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN chave_acesso varchar(44);
  END IF;

  -- Adicionar codigo_numerico
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mdfe_documentos' AND column_name='codigo_numerico'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN codigo_numerico varchar(8);
  END IF;

  -- Adicionar dv (dígito verificador)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mdfe_documentos' AND column_name='dv'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN dv varchar(1);
  END IF;

  -- Adicionar xml_proc_path
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mdfe_documentos' AND column_name='xml_proc_path'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN xml_proc_path text;
  END IF;

  -- Adicionar xml_path
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mdfe_documentos' AND column_name='xml_path'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN xml_path text;
  END IF;

  -- Adicionar pdf_path
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mdfe_documentos' AND column_name='pdf_path'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN pdf_path text;
  END IF;
END $$;

-- Backfill: Gerar codigo_numerico aleatório para registros existentes que não têm
UPDATE mdfe_documentos 
SET codigo_numerico = LPAD(FLOOR(random() * 90000000 + 10000000)::text, 8, '0')
WHERE codigo_numerico IS NULL;

-- Backfill: Garantir forma_emissao padrão
UPDATE mdfe_documentos 
SET forma_emissao = COALESCE(forma_emissao, 1)
WHERE forma_emissao IS NULL;

-- Criar índice para chave_acesso se não existir
CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_chave_acesso ON mdfe_documentos(chave_acesso);

-- Comentário nas colunas
COMMENT ON COLUMN mdfe_documentos.chave_acesso IS 'Chave de acesso de 44 dígitos do MDF-e (gerada automaticamente pela trigger)';
COMMENT ON COLUMN mdfe_documentos.codigo_numerico IS 'Código numérico aleatório de 8 dígitos usado na chave de acesso';
COMMENT ON COLUMN mdfe_documentos.dv IS 'Dígito verificador da chave de acesso (Módulo 11)';
COMMENT ON COLUMN mdfe_documentos.xml_proc_path IS 'Caminho do arquivo XML processado (-procMDFe.xml)';
COMMENT ON COLUMN mdfe_documentos.xml_path IS 'Caminho do arquivo XML original (-mdfe.xml)';
COMMENT ON COLUMN mdfe_documentos.pdf_path IS 'Caminho do arquivo PDF DAMDFE (-damdfe.pdf)';
