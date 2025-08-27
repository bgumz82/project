
-- Migration para corrigir formato dos paths dos arquivos CT-e

-- Função atualizada para gerar paths dos arquivos automaticamente
CREATE OR REPLACE FUNCTION generate_cte_document_paths()
RETURNS TRIGGER AS $$
DECLARE
  empresa_path text;
  chave_cte text;
BEGIN
  -- Buscar path base da empresa
  SELECT COALESCE(path_arquivos, '/uploads/fiscal/' || id::text) INTO empresa_path
  FROM empresas_fiscais
  WHERE id = NEW.empresa_id;
  
  -- SEMPRE usar a chave de acesso do CT-e (nunca usar número e série)
  IF NEW.chave_acesso IS NOT NULL AND LENGTH(NEW.chave_acesso) = 44 THEN
    chave_cte := NEW.chave_acesso;
    
    -- Gerar paths usando formato correto com chave de acesso do CT-e
    IF NEW.xml_path IS NULL THEN
      NEW.xml_path := empresa_path || '/cte/' || chave_cte || '-cte.xml';
    END IF;
    
    IF NEW.pdf_path IS NULL THEN
      NEW.pdf_path := empresa_path || '/cte/' || chave_cte || '-dacte.pdf';
    END IF;
    
    IF NEW.xml_proc_path IS NULL THEN
      NEW.xml_proc_path := empresa_path || '/cte/' || chave_cte || '-procCTe.xml';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atualizar paths dos documentos existentes para usar formato correto
UPDATE cte_documentos 
SET 
  xml_path = (
    SELECT COALESCE(ef.path_arquivos, '/uploads/fiscal/' || ef.id::text) || '/cte/' || cd.chave_acesso || '-cte.xml'
    FROM empresas_fiscais ef 
    WHERE ef.id = cte_documentos.empresa_id
  ),
  pdf_path = (
    SELECT COALESCE(ef.path_arquivos, '/uploads/fiscal/' || ef.id::text) || '/cte/' || cd.chave_acesso || '-dacte.pdf'
    FROM empresas_fiscais ef 
    WHERE ef.id = cte_documentos.empresa_id
  ),
  xml_proc_path = (
    SELECT COALESCE(ef.path_arquivos, '/uploads/fiscal/' || ef.id::text) || '/cte/' || cd.chave_acesso || '-procCTe.xml'
    FROM empresas_fiscais ef 
    WHERE ef.id = cte_documentos.empresa_id
  )
WHERE chave_acesso IS NOT NULL AND LENGTH(chave_acesso) = 44;

RAISE NOTICE 'Paths dos arquivos CT-e atualizados para usar chave de acesso';
