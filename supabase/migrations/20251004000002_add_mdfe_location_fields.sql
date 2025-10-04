
-- Migration: Adicionar campos de localização ao MDF-e
-- Descrição: Adiciona campos para armazenar cidades e UFs de início e término

DO $$
BEGIN
  -- Adicionar cidade_inicio_ibge
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mdfe_documentos' AND column_name='cidade_inicio_ibge'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN cidade_inicio_ibge text;
  END IF;

  -- Adicionar cidade_inicio_nome
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mdfe_documentos' AND column_name='cidade_inicio_nome'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN cidade_inicio_nome text;
  END IF;

  -- Adicionar uf_inicio
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mdfe_documentos' AND column_name='uf_inicio'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN uf_inicio text;
  END IF;

  -- Adicionar cidade_termino_ibge
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mdfe_documentos' AND column_name='cidade_termino_ibge'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN cidade_termino_ibge text;
  END IF;

  -- Adicionar cidade_termino_nome
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mdfe_documentos' AND column_name='cidade_termino_nome'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN cidade_termino_nome text;
  END IF;

  -- Adicionar uf_termino
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mdfe_documentos' AND column_name='uf_termino'
  ) THEN
    ALTER TABLE mdfe_documentos ADD COLUMN uf_termino text;
  END IF;
END $$;

-- Comentários nas colunas
COMMENT ON COLUMN mdfe_documentos.cidade_inicio_ibge IS 'Código IBGE da cidade de início da viagem';
COMMENT ON COLUMN mdfe_documentos.cidade_inicio_nome IS 'Nome da cidade de início da viagem';
COMMENT ON COLUMN mdfe_documentos.uf_inicio IS 'UF da cidade de início da viagem';
COMMENT ON COLUMN mdfe_documentos.cidade_termino_ibge IS 'Código IBGE da cidade de término da viagem';
COMMENT ON COLUMN mdfe_documentos.cidade_termino_nome IS 'Nome da cidade de término da viagem';
COMMENT ON COLUMN mdfe_documentos.uf_termino IS 'UF da cidade de término da viagem';
