/*
  # Complementar Cadastro de Veículos

  1. Novas Colunas
    - `renavam` (text, unique)
    - `chassis` (text, unique) 
    - `uf_registro` (text, 2 caracteres)
    - `cor` (text)
    - `tara_kg` (decimal, peso vazio em kg)
    - `carga_kg` (decimal, capacidade de carga em kg)
    - `status` (enum: ativo, inativo, manutencao, vendido)
    - `tipo_combustivel` (enum: diesel_s10, diesel_s500, gasolina, etanol, flex)
    - `validade_tacografo` (date, nullable)

  2. Constraints
    - RENAVAM único quando não nulo
    - Chassis único quando não nulo
    - UF com 2 caracteres
    - Valores de peso positivos
    - Status e combustível válidos

  3. Índices
    - Por RENAVAM
    - Por chassis
    - Por UF de registro
    - Por status
    - Por tipo de combustível
*/

-- Criar enums para status e tipo de combustível
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'veiculo_status') THEN
    CREATE TYPE veiculo_status AS ENUM ('ativo', 'inativo', 'manutencao', 'vendido');
    RAISE NOTICE 'Enum veiculo_status criado';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_combustivel_veiculo') THEN
    CREATE TYPE tipo_combustivel_veiculo AS ENUM ('diesel_s10', 'diesel_s500', 'gasolina', 'etanol', 'flex');
    RAISE NOTICE 'Enum tipo_combustivel_veiculo criado';
  END IF;
END $$;

-- Adicionar novas colunas à tabela veiculos
DO $$
BEGIN
  -- RENAVAM
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veiculos' AND column_name = 'renavam'
  ) THEN
    ALTER TABLE veiculos ADD COLUMN renavam text;
    RAISE NOTICE 'Coluna renavam adicionada';
  END IF;

  -- Chassis
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veiculos' AND column_name = 'chassis'
  ) THEN
    ALTER TABLE veiculos ADD COLUMN chassis text;
    RAISE NOTICE 'Coluna chassis adicionada';
  END IF;

  -- UF Registro
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veiculos' AND column_name = 'uf_registro'
  ) THEN
    ALTER TABLE veiculos ADD COLUMN uf_registro text DEFAULT 'SP';
    RAISE NOTICE 'Coluna uf_registro adicionada';
  END IF;

  -- Cor
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veiculos' AND column_name = 'cor'
  ) THEN
    ALTER TABLE veiculos ADD COLUMN cor text DEFAULT 'Não informado';
    RAISE NOTICE 'Coluna cor adicionada';
  END IF;

  -- Tara (peso vazio em kg)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veiculos' AND column_name = 'tara_kg'
  ) THEN
    ALTER TABLE veiculos ADD COLUMN tara_kg decimal(10,2);
    RAISE NOTICE 'Coluna tara_kg adicionada';
  END IF;

  -- Carga (capacidade de carga em kg)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veiculos' AND column_name = 'carga_kg'
  ) THEN
    ALTER TABLE veiculos ADD COLUMN carga_kg decimal(10,2);
    RAISE NOTICE 'Coluna carga_kg adicionada';
  END IF;

  -- Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veiculos' AND column_name = 'status'
  ) THEN
    ALTER TABLE veiculos ADD COLUMN status veiculo_status DEFAULT 'ativo';
    RAISE NOTICE 'Coluna status adicionada';
  END IF;

  -- Tipo de Combustível
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veiculos' AND column_name = 'tipo_combustivel'
  ) THEN
    ALTER TABLE veiculos ADD COLUMN tipo_combustivel tipo_combustivel_veiculo DEFAULT 'gasolina';
    RAISE NOTICE 'Coluna tipo_combustivel adicionada';
  END IF;

  -- Validade Tacógrafo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'veiculos' AND column_name = 'validade_tacografo'
  ) THEN
    ALTER TABLE veiculos ADD COLUMN validade_tacografo date;
    RAISE NOTICE 'Coluna validade_tacografo adicionada';
  END IF;
END $$;

-- Adicionar constraints
DO $$
BEGIN
  -- RENAVAM único quando não nulo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'veiculos_renavam_unique'
  ) THEN
    ALTER TABLE veiculos ADD CONSTRAINT veiculos_renavam_unique 
    UNIQUE (renavam) DEFERRABLE INITIALLY DEFERRED;
    RAISE NOTICE 'Constraint RENAVAM único adicionada';
  END IF;

  -- Chassis único quando não nulo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'veiculos_chassis_unique'
  ) THEN
    ALTER TABLE veiculos ADD CONSTRAINT veiculos_chassis_unique 
    UNIQUE (chassis) DEFERRABLE INITIALLY DEFERRED;
    RAISE NOTICE 'Constraint chassis único adicionada';
  END IF;

  -- UF com 2 caracteres
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'veiculos_uf_length'
  ) THEN
    ALTER TABLE veiculos ADD CONSTRAINT veiculos_uf_length 
    CHECK (length(uf_registro) = 2);
    RAISE NOTICE 'Constraint UF length adicionada';
  END IF;

  -- Tara positiva
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'veiculos_tara_positive'
  ) THEN
    ALTER TABLE veiculos ADD CONSTRAINT veiculos_tara_positive 
    CHECK (tara_kg IS NULL OR tara_kg > 0);
    RAISE NOTICE 'Constraint tara positiva adicionada';
  END IF;

  -- Carga positiva
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'veiculos_carga_positive'
  ) THEN
    ALTER TABLE veiculos ADD CONSTRAINT veiculos_carga_positive 
    CHECK (carga_kg IS NULL OR carga_kg > 0);
    RAISE NOTICE 'Constraint carga positiva adicionada';
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_veiculos_renavam ON veiculos(renavam);
CREATE INDEX IF NOT EXISTS idx_veiculos_chassis ON veiculos(chassis);
CREATE INDEX IF NOT EXISTS idx_veiculos_uf_registro ON veiculos(uf_registro);
CREATE INDEX IF NOT EXISTS idx_veiculos_status ON veiculos(status);
CREATE INDEX IF NOT EXISTS idx_veiculos_tipo_combustivel ON veiculos(tipo_combustivel);
CREATE INDEX IF NOT EXISTS idx_veiculos_validade_tacografo ON veiculos(validade_tacografo);

-- Atualizar registros existentes com valores padrão
UPDATE veiculos 
SET 
  uf_registro = COALESCE(uf_registro, 'SP'),
  cor = COALESCE(cor, 'Não informado'),
  status = COALESCE(status, 'ativo'::veiculo_status),
  tipo_combustivel = COALESCE(tipo_combustivel, 'gasolina'::tipo_combustivel_veiculo)
WHERE 
  uf_registro IS NULL OR 
  cor IS NULL OR 
  status IS NULL OR 
  tipo_combustivel IS NULL;

-- Estados brasileiros para referência
COMMENT ON COLUMN veiculos.uf_registro IS 'UF de registro do veículo (AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO)';

-- Verificação final
DO $$
DECLARE
  column_count INTEGER;
  vehicle_count INTEGER;
BEGIN
  -- Contar colunas adicionadas
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns 
  WHERE table_name = 'veiculos' 
  AND column_name IN ('renavam', 'chassis', 'uf_registro', 'cor', 'tara_kg', 'carga_kg', 'status', 'tipo_combustivel', 'validade_tacografo');
  
  SELECT COUNT(*) INTO vehicle_count FROM veiculos;
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Colunas adicionadas: %/9', column_count;
  RAISE NOTICE 'Veículos no sistema: %', vehicle_count;
  
  IF column_count = 9 THEN
    RAISE NOTICE '✅ Todas as colunas foram adicionadas com sucesso!';
  ELSE
    RAISE NOTICE '⚠️  Algumas colunas podem não ter sido adicionadas';
  END IF;
END $$;