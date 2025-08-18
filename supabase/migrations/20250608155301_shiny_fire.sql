/*
  # Fix contas_receber table schema issues

  1. Schema Changes
    - Ensure `data_recebimento` column allows NULL values
    - Change `centro_custo_id` from UUID to TEXT to support vehicle references like "veiculo_123"
    - Update `data_pagamento` in contas_pagar table as well for consistency

  2. Data Safety
    - Use conditional alterations to prevent errors if changes already exist
    - Preserve existing data during type conversions
*/

-- Fix contas_receber table
DO $$
BEGIN
  -- Ensure data_recebimento allows NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contas_receber' 
    AND column_name = 'data_recebimento' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE contas_receber ALTER COLUMN data_recebimento DROP NOT NULL;
  END IF;

  -- Change centro_custo_id to TEXT if it's currently UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contas_receber' 
    AND column_name = 'centro_custo_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE contas_receber ALTER COLUMN centro_custo_id TYPE TEXT USING centro_custo_id::TEXT;
  END IF;
END $$;

-- Fix contas_pagar table for consistency
DO $$
BEGIN
  -- Ensure data_pagamento allows NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contas_pagar' 
    AND column_name = 'data_pagamento' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE contas_pagar ALTER COLUMN data_pagamento DROP NOT NULL;
  END IF;

  -- Change centro_custo_id to TEXT if it's currently UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contas_pagar' 
    AND column_name = 'centro_custo_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE contas_pagar ALTER COLUMN centro_custo_id TYPE TEXT USING centro_custo_id::TEXT;
  END IF;
END $$;