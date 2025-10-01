-- Migration para corrigir geração automática de chave de acesso do CT-e

-- Função para calcular dígito verificador módulo 11 - ALGORITMO CORRETO
CREATE OR REPLACE FUNCTION calcular_dv_mod11(chave_base text)
RETURNS text AS $$
DECLARE
  soma integer := 0;
  peso integer := 2;
  i integer;
  resto integer;
  dv integer;
  digito integer;
BEGIN
  -- Validar entrada
  IF chave_base IS NULL OR LENGTH(chave_base) != 43 THEN
    RAISE EXCEPTION 'Chave base deve ter exatamente 43 dígitos, recebido: %', LENGTH(chave_base);
  END IF;

  -- Calcular soma ponderada de trás para frente
  FOR i IN REVERSE LENGTH(chave_base)..1 LOOP
    digito := SUBSTRING(chave_base, i, 1)::integer;
    soma := soma + (digito * peso);
    peso := peso + 1;
    IF peso > 9 THEN
      peso := 2;
    END IF;
  END LOOP;

  -- Calcular resto da divisão por 11
  resto := soma % 11;

  -- Determinar dígito verificador conforme regra da Receita Federal
  IF resto = 0 OR resto = 1 THEN
    dv := 0;
  ELSE
    dv := 11 - resto;
  END IF;

  RETURN dv::text;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar chave de acesso do CT-e - VERSÃO CORRIGIDA
CREATE OR REPLACE FUNCTION gerar_chave_acesso_cte()
RETURNS TRIGGER AS $$
DECLARE
  empresa_cnpj text;
  empresa_cnpj_limpo text;
  codigo_numerico text;
  dv_calculado text;
  chave_completa text;
  codigo_uf_final text;
  forma_emissao_final text;
BEGIN
  -- Buscar CNPJ da empresa e limpar formatação
  SELECT REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') 
  INTO empresa_cnpj_limpo
  FROM empresas_fiscais
  WHERE id = NEW.empresa_id;

  -- Garantir que CNPJ tenha 14 dígitos
  empresa_cnpj_limpo := LPAD(empresa_cnpj_limpo, 14, '0');

  -- Definir código UF padrão se não informado
  codigo_uf_final := COALESCE(NEW.codigo_uf, '31');
  codigo_uf_final := LPAD(codigo_uf_final, 2, '0');

  -- Definir forma de emissão padrão se não informada
  forma_emissao_final := COALESCE(NEW.forma_emissao::text, '1');

  -- Gerar código numérico aleatório (8 dígitos) se não existir
  IF NEW.codigo_numerico IS NULL OR LENGTH(NEW.codigo_numerico) != 8 THEN
    codigo_numerico := LPAD(FLOOR(RANDOM() * 99999999 + 10000000)::text, 8, '0');
    NEW.codigo_numerico := codigo_numerico;
  ELSE
    codigo_numerico := NEW.codigo_numerico;
  END IF;

  -- Atualizar codigo_uf se estava NULL
  NEW.codigo_uf := codigo_uf_final;

  -- Construir chave base (43 dígitos)
  chave_completa :=codigo_uf_final || -- UF (2 dígitos)
                   TO_CHAR(NEW.data_emissao, 'YYMM') || -- AAMM (4 dígitos)
                   empresa_cnpj_limpo || -- CNPJ (14 dígitos)
                   '57' || -- Modelo CT-e (2 dígitos)
                   LPAD(NEW.serie, 3, '0') || -- Série (3 dígitos)
                   LPAD(NEW.numero_cte, 9, '0') || -- Número (9 dígitos)
                   forma_emissao_final || -- Forma emissão (1 dígito)
                   codigo_numerico; -- Código numérico (8 dígitos)

  -- Calcular dígito verificador
  SELECT calcular_dv_mod11(chave_completa) INTO dv_calculado;

  -- Definir DV
  NEW.dv := dv_calculado;

  -- Gerar chave completa (44 dígitos)
  NEW.chave_acesso := chave_completa || dv_calculado;

  RAISE NOTICE 'Chave de acesso gerada para CT-e %: %', NEW.numero_cte, NEW.chave_acesso;

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