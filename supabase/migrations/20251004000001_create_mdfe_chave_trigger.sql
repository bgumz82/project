-- Migration: Criar trigger para gerar chave de acesso do MDF-e automaticamente
-- Descrição: Cria função e trigger para calcular e inserir a chave de acesso de 44 dígitos
--            Formato: UF(2) + AAMM(4) + CNPJ(14) + MOD(2) + SERIE(3) + NUM(9) + EMIS(1) + COD_NUM(8) + DV(1)

-- Função para calcular dígito verificador (Módulo 11)
CREATE OR REPLACE FUNCTION calcular_dv_modulo11(chave_sem_dv TEXT)
RETURNS TEXT AS $$
DECLARE
  soma INTEGER := 0;
  peso INTEGER := 2;
  i INTEGER;
  digito INTEGER;
  dv TEXT;
BEGIN
  -- Percorrer a chave da direita para esquerda
  FOR i IN REVERSE LENGTH(chave_sem_dv)..1 LOOP
    soma := soma + (SUBSTRING(chave_sem_dv FROM i FOR 1)::INTEGER * peso);
    peso := peso + 1;
    IF peso > 9 THEN
      peso := 2;
    END IF;
  END LOOP;
  
  -- Calcular o dígito verificador
  digito := 11 - (soma % 11);
  
  -- Se o dígito for 0, 10 ou 11, usar 0
  IF digito >= 10 THEN
    dv := '0';
  ELSE
    dv := digito::TEXT;
  END IF;
  
  RETURN dv;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função trigger para gerar chave de acesso do MDF-e
CREATE OR REPLACE FUNCTION gerar_chave_mdfe()
RETURNS TRIGGER AS $$
DECLARE
  cnpj_emitente TEXT;
  data_emissao_formatada TEXT;
  numero_formatado TEXT;
  serie_formatada TEXT;
  chave_sem_dv TEXT;
  dv_calculado TEXT;
BEGIN
  -- Só gerar se não tiver chave e tiver codigo_numerico
  IF NEW.chave_acesso IS NULL AND NEW.codigo_numerico IS NOT NULL THEN
    
    -- Buscar CNPJ da empresa
    SELECT cnpj INTO cnpj_emitente 
    FROM empresas_fiscais 
    WHERE id = NEW.empresa_id;
    
    -- Formatar data (AAMM)
    data_emissao_formatada := TO_CHAR(NEW.data_emissao, 'YYMM');
    
    -- Formatar número (9 dígitos)
    numero_formatado := LPAD(NEW.numero_mdfe, 9, '0');
    
    -- Formatar série (3 dígitos)
    serie_formatada := LPAD(NEW.serie, 3, '0');
    
    -- Montar chave sem DV (43 dígitos)
    -- Formato: UF(2) + AAMM(4) + CNPJ(14) + MOD(2) + SERIE(3) + NUM(9) + EMIS(1) + COD_NUM(8)
    chave_sem_dv := 
      NEW.codigo_uf ||                    -- UF (2 dígitos)
      data_emissao_formatada ||           -- AAMM (4 dígitos)
      cnpj_emitente ||                    -- CNPJ (14 dígitos)
      '58' ||                             -- Modelo 58 = MDF-e (2 dígitos)
      serie_formatada ||                  -- Série (3 dígitos)
      numero_formatado ||                 -- Número (9 dígitos)
      COALESCE(NEW.forma_emissao, 1)::TEXT || -- Forma emissão (1 dígito)
      NEW.codigo_numerico;                -- Código numérico (8 dígitos)
    
    -- Calcular DV
    dv_calculado := calcular_dv_modulo11(chave_sem_dv);
    
    -- Atualizar registro com chave completa e DV
    NEW.chave_acesso := chave_sem_dv || dv_calculado;
    NEW.dv := dv_calculado;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger BEFORE INSERT OR UPDATE
DROP TRIGGER IF EXISTS trigger_gerar_chave_mdfe ON mdfe_documentos;
CREATE TRIGGER trigger_gerar_chave_mdfe
  BEFORE INSERT OR UPDATE ON mdfe_documentos
  FOR EACH ROW
  EXECUTE FUNCTION gerar_chave_mdfe();

-- Comentário
COMMENT ON FUNCTION gerar_chave_mdfe() IS 'Gera automaticamente a chave de acesso de 44 dígitos para MDF-e seguindo padrão da Receita Federal';
COMMENT ON FUNCTION calcular_dv_modulo11(TEXT) IS 'Calcula dígito verificador usando algoritmo Módulo 11';
