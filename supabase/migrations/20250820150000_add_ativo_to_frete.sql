
/*
  # Adicionar campo ativo à tabela frete_documentos

  1. Adiciona campo ativo (boolean) com valor padrão true
  2. Cria índice para performance nas consultas
*/

-- Adicionar campo ativo se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'frete_documentos' AND column_name = 'ativo'
  ) THEN
    ALTER TABLE frete_documentos 
    ADD COLUMN ativo boolean DEFAULT true;
    
    -- Atualizar registros existentes
    UPDATE frete_documentos SET ativo = true WHERE ativo IS NULL;
    
    -- Criar índice para performance
    CREATE INDEX IF NOT EXISTS idx_frete_documentos_ativo ON frete_documentos(ativo);
    
    RAISE NOTICE 'Campo ativo adicionado à tabela frete_documentos';
  ELSE
    RAISE NOTICE 'Campo ativo já existe na tabela frete_documentos';
  END IF;
END $$;
