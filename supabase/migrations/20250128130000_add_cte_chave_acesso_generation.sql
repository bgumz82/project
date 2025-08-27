
-- Migration para adicionar geração automática de chave de acesso do CT-e

-- Função para gerar chave de acesso do CT-e
CREATE OR REPLACE FUNCTION gerar_chave_acesso_cte()
RETURNS TRIGGER AS $$
DECLARE
  empresa_cnpj text;
  codigo_numerico text;
  dv_calculado text;
  chave_completa text;
BEGIN
  -- Buscar CNPJ da empresa
  SELECT cnpj INTO empresa_cnpj
  FROM empresas_fiscais
  WHERE id = NEW.empresa_id;
  
  -- Gerar código numérico aleatório (8 dígitos) se não existir
  IF NEW.codigo_numerico IS NULL THEN
    NEW.codigo_numerico := LPAD(FLOOR(RANDOM() * 99999999)::text, 8, '0');
  END IF;
  
  -- Construir chave base (43 dígitos)
  chave_completa := NEW.codigo_uf || -- UF (2 dígitos)
                   TO_CHAR(NEW.data_emissao, 'YYMM') || -- AAMM (4 dígitos)
                   empresa_cnpj || -- CNPJ (14 dígitos)
                   '57' || -- Modelo CT-e (2 dígitos)
                   LPAD(NEW.serie, 3, '0') || -- Série (3 dígitos)
                   LPAD(NEW.numero_cte, 9, '0') || -- Número (9 dígitos)
                   NEW.forma_emissao::text || -- Forma emissão (1 dígito)
                   NEW.codigo_numerico; -- Código numérico (8 dígitos)
  
  -- Calcular dígito verificador
  SELECT calcular_dv_mod11(chave_completa) INTO dv_calculado;
  
  -- Definir DV
  NEW.dv := dv_calculado;
  
  -- Gerar chave completa (44 dígitos)
  NEW.chave_acesso := chave_completa || dv_calculado;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular dígito verificador módulo 11
CREATE OR REPLACE FUNCTION calcular_dv_mod11(chave_base text)
RETURNS text AS $$
DECLARE
  soma integer := 0;
  peso integer := 2;
  i integer;
  resto integer;
  dv integer;
BEGIN
  -- Calcular soma ponderada de trás para frente
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
    dv := 0;
  ELSE
    dv := 11 - resto;
  END IF;
  
  RETURN dv::text;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar chave de acesso automaticamente
DROP TRIGGER IF EXISTS trigger_gerar_chave_cte ON cte_documentos;
CREATE TRIGGER trigger_gerar_chave_cte
  BEFORE INSERT OR UPDATE ON cte_documentos
  FOR EACH ROW
  WHEN (NEW.chave_acesso IS NULL OR NEW.chave_acesso = '')
  EXECUTE FUNCTION gerar_chave_acesso_cte();

-- Comentários
COMMENT ON FUNCTION gerar_chave_acesso_cte() IS 'Gera automaticamente a chave de acesso do CT-e com 44 dígitos';
COMMENT ON FUNCTION calcular_dv_mod11(text) IS 'Calcula o dígito verificador usando algoritmo módulo 11';
