/*
  # Adicionar colunas faltantes na tabela postos

  1. Novas Colunas
    - `cidade` (text) - Cidade do posto
    - `estado` (text) - Estado do posto (2 caracteres)
    - `cep` (text) - CEP do posto
    - `telefone` (text, nullable) - Telefone do posto
    - `cnpj` (text, nullable) - CNPJ do posto
    - `ativo` (boolean) - Status ativo/inativo do posto

  2. Segurança
    - Usar IF NOT EXISTS para evitar erros se as colunas já existirem
    - Definir valores padrão apropriados
    - Manter dados existentes intactos
*/

-- Adicionar coluna cidade se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'postos' AND column_name = 'cidade'
  ) THEN
    ALTER TABLE postos ADD COLUMN cidade text DEFAULT '';
  END IF;
END $$;

-- Adicionar coluna estado se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'postos' AND column_name = 'estado'
  ) THEN
    ALTER TABLE postos ADD COLUMN estado text DEFAULT '';
  END IF;
END $$;

-- Adicionar coluna cep se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'postos' AND column_name = 'cep'
  ) THEN
    ALTER TABLE postos ADD COLUMN cep text DEFAULT '';
  END IF;
END $$;

-- Adicionar coluna telefone se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'postos' AND column_name = 'telefone'
  ) THEN
    ALTER TABLE postos ADD COLUMN telefone text;
  END IF;
END $$;

-- Adicionar coluna cnpj se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'postos' AND column_name = 'cnpj'
  ) THEN
    ALTER TABLE postos ADD COLUMN cnpj text;
  END IF;
END $$;

-- Adicionar coluna ativo se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'postos' AND column_name = 'ativo'
  ) THEN
    ALTER TABLE postos ADD COLUMN ativo boolean DEFAULT true;
  END IF;
END $$;

-- Atualizar registros existentes para ter valores padrão válidos
UPDATE postos 
SET 
  cidade = COALESCE(cidade, 'Não informado'),
  estado = COALESCE(estado, 'SP'),
  cep = COALESCE(cep, '00000-000'),
  ativo = COALESCE(ativo, true)
WHERE cidade = '' OR estado = '' OR cep = '' OR ativo IS NULL;

-- Adicionar constraints para garantir integridade dos dados
DO $$
BEGIN
  -- Constraint para estado ter exatamente 2 caracteres
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'postos_estado_length'
  ) THEN
    ALTER TABLE postos ADD CONSTRAINT postos_estado_length CHECK (length(estado) = 2);
  END IF;
END $$;

-- Criar índice para melhorar performance nas consultas por cidade/estado
CREATE INDEX IF NOT EXISTS idx_postos_cidade_estado ON postos(cidade, estado);
CREATE INDEX IF NOT EXISTS idx_postos_ativo ON postos(ativo);