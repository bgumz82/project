
-- Migration para corrigir geração automática de chave de acesso do CT-e

-- Função atualizada para gerar chave de acesso do CT-e
CREATE OR REPLACE FUNCTION gerar_chave_acesso_cte()
RETURNS TRIGGER AS $$
DECLARE
  empresa_cnpj text;
  codigo_numerico text;
  chave_base text;
  soma integer := 0;
  peso integer := 2;
  i integer;
  resto integer;
  dv_calculado text;
  chave_completa text;
BEGIN
  -- Buscar CNPJ da empresa (já limpo)
  SELECT cnpj INTO empresa_cnpj
  FROM empresas_fiscais
  WHERE id = NEW.empresa_id;
  
  IF empresa_cnpj IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada: %', NEW.empresa_id;
  END IF;
  
  -- Gerar código numérico aleatório (8 dígitos) se não existir
  IF NEW.codigo_numerico IS NULL OR NEW.codigo_numerico = '' THEN
    NEW.codigo_numerico := LPAD(FLOOR(RANDOM() * 99999999)::text, 8, '0');
  END IF;
  
  -- Construir chave base (43 dígitos)
  chave_base := 
    LPAD(NEW.codigo_uf, 2, '0') ||                          -- UF (2 dígitos)
    TO_CHAR(NEW.data_emissao, 'YYMM') ||                    -- AAMM (4 dígitos)
    empresa_cnpj ||                                         -- CNPJ (14 dígitos)
    '57' ||                                                 -- Modelo CT-e (2 dígitos)
    LPAD(NEW.serie, 1, '0') ||                             -- Série (1 dígito)
    LPAD(NEW.numero_cte, 9, '0') ||                        -- Número (9 dígitos)
    NEW.forma_emissao::text ||                             -- Forma emissão (1 dígito)
    NEW.codigo_numerico;                                   -- Código numérico (8 dígitos)
  
  -- Calcular dígito verificador módulo 11
  FOR i IN REVERSE LENGTH(chave_base)..1 LOOP
    soma := soma + (SUBSTRING(chave_base, i, 1)::integer * peso);
    peso := peso + 1;
    IF peso > 9 THEN
      peso := 2;
    END IF;
  END LOOP;
  
  -- Calcular resto da divisão por 11
  resto := soma % 11;
  
  -- Determinar dígito verificador
  IF resto < 2 THEN
    dv_calculado := '0';
  ELSE
    dv_calculado := (11 - resto)::text;
  END IF;
  
  -- Definir DV
  NEW.dv := dv_calculado;
  
  -- Gerar chave completa (44 dígitos)
  NEW.chave_acesso := chave_base || dv_calculado;
  
  -- Log para debug
  RAISE NOTICE 'Chave de acesso gerada: % para CT-e %/%', NEW.chave_acesso, NEW.numero_cte, NEW.serie;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_gerar_chave_cte ON cte_documentos;

-- Criar novo trigger para gerar chave de acesso automaticamente
CREATE TRIGGER trigger_gerar_chave_cte
  BEFORE INSERT OR UPDATE ON cte_documentos
  FOR EACH ROW
  WHEN (NEW.chave_acesso IS NULL OR NEW.chave_acesso = '')
  EXECUTE FUNCTION gerar_chave_acesso_cte();

-- Atualizar documentos existentes que não têm chave de acesso
UPDATE cte_documentos 
SET chave_acesso = NULL -- Forçar regeneração
WHERE chave_acesso IS NULL OR chave_acesso = '';

-- Comentários
COMMENT ON FUNCTION gerar_chave_acesso_cte() IS 'Gera automaticamente a chave de acesso do CT-e com 44 dígitos e dígito verificador correto';
COMMENT ON TRIGGER trigger_gerar_chave_cte ON cte_documentos IS 'Trigger para gerar chave de acesso automaticamente antes de inserir/atualizar CT-e';

RAISE NOTICE 'Trigger de geração de chave de acesso do CT-e corrigido e aplicado';
