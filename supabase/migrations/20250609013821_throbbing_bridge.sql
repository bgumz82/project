/*
  # Fix foreign key constraints for centro_custo_id columns

  This migration fixes the foreign key constraint issues when changing centro_custo_id 
  from UUID to TEXT type to support both regular cost centers and vehicle references.

  ## Changes Made

  1. **Drop Foreign Key Constraints**: Remove existing foreign key constraints that prevent type changes
  2. **Change Column Types**: Convert centro_custo_id columns from UUID to TEXT
  3. **Update NULL Constraints**: Ensure date columns allow NULL values
  
  ## Important Notes
  
  - This allows centro_custo_id to store both UUID values (for cost centers) and prefixed strings (for vehicles)
  - Foreign key constraints are removed to allow this flexibility
  - The application logic handles the relationship validation
*/

-- Fix contas_pagar table
DO $$
BEGIN
  -- Drop foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contas_pagar_centro_custo_id_fkey' 
    AND table_name = 'contas_pagar'
  ) THEN
    ALTER TABLE contas_pagar DROP CONSTRAINT contas_pagar_centro_custo_id_fkey;
  END IF;

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

-- Fix contas_receber table
DO $$
BEGIN
  -- Drop foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contas_receber_centro_custo_id_fkey' 
    AND table_name = 'contas_receber'
  ) THEN
    ALTER TABLE contas_receber DROP CONSTRAINT contas_receber_centro_custo_id_fkey;
  END IF;

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