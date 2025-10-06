
-- Adicionar status 'aguardando' ao enum de status do MDF-e
DO $$
BEGIN
  -- Verificar se o tipo enum existe
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mdfe_status_enum') THEN
    -- Adicionar o novo valor ao enum se não existir
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumtypid = 'mdfe_status_enum'::regtype 
      AND enumlabel = 'aguardando'
    ) THEN
      ALTER TYPE mdfe_status_enum ADD VALUE 'aguardando';
    END IF;
  ELSE
    -- Criar o enum se não existir
    CREATE TYPE mdfe_status_enum AS ENUM ('pendente', 'aguardando', 'emitido', 'cancelado', 'encerrado');
  END IF;
END $$;

-- Atualizar a coluna status para usar o enum (se ainda não estiver usando)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mdfe_documentos' 
    AND column_name = 'status' 
    AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE mdfe_documentos 
    ALTER COLUMN status TYPE mdfe_status_enum 
    USING status::mdfe_status_enum;
  END IF;
END $$;

COMMENT ON TYPE mdfe_status_enum IS 'Status possíveis para MDF-e: pendente (rascunho), aguardando (XML gerado, aguardando retorno), emitido (processado pela SEFAZ), cancelado, encerrado';
