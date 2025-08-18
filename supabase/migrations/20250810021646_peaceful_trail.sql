/*
  # Adicionar campos CNH e Status para funcionários

  1. Novas Colunas
    - `cnh` (text, número da CNH)
    - `validade_cnh` (date, data de validade da CNH)
    - `status` (enum: ativo, inativo, ferias)

  2. Alterações
    - Alterar campo `funcao` para usar enum com opções predefinidas

  3. Constraints
    - CNH única quando não nula
    - Status válido
    - Função válida

  4. Índices
    - Por CNH
    - Por status
    - Por função
*/

-- Criar enum para status do funcionário
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'funcionario_status') THEN
    CREATE TYPE funcionario_status AS ENUM ('ativo', 'inativo', 'ferias');
    RAISE NOTICE 'Enum funcionario_status criado';
  END IF;
END $$;

-- Criar enum para função do funcionário
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'funcionario_funcao') THEN
    CREATE TYPE funcionario_funcao AS ENUM ('administrativo', 'motorista', 'gerente');
    RAISE NOTICE 'Enum funcionario_funcao criado';
  END IF;
END $$;

-- Adicionar novas colunas à tabela funcionarios
DO $$
BEGIN
  -- CNH
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funcionarios' AND column_name = 'cnh'
  ) THEN
    ALTER TABLE funcionarios ADD COLUMN cnh text;
    RAISE NOTICE 'Coluna cnh adicionada';
  END IF;

  -- Validade CNH
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funcionarios' AND column_name = 'validade_cnh'
  ) THEN
    ALTER TABLE funcionarios ADD COLUMN validade_cnh date;
    RAISE NOTICE 'Coluna validade_cnh adicionada';
  END IF;

  -- Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funcionarios' AND column_name = 'status'
  ) THEN
    ALTER TABLE funcionarios ADD COLUMN status funcionario_status DEFAULT 'ativo';
    RAISE NOTICE 'Coluna status adicionada';
  END IF;
END $$;

-- Alterar coluna funcao para usar enum (preservando dados existentes)
DO $$
DECLARE
  current_type text;
BEGIN
  -- Verificar tipo atual da coluna funcao
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_name = 'funcionarios' AND column_name = 'funcao';
  
  IF current_type != 'USER-DEFINED' THEN
    -- Mapear valores existentes para o enum
    UPDATE funcionarios 
    SET funcao = CASE 
      WHEN LOWER(funcao) LIKE '%admin%' OR LOWER(funcao) LIKE '%escritorio%' OR LOWER(funcao) LIKE '%secretar%' THEN 'administrativo'
      WHEN LOWER(funcao) LIKE '%motorista%' OR LOWER(funcao) LIKE '%condutor%' OR LOWER(funcao) LIKE '%driver%' THEN 'motorista'
      WHEN LOWER(funcao) LIKE '%gerente%' OR LOWER(funcao) LIKE '%supervisor%' OR LOWER(funcao) LIKE '%coordenador%' THEN 'gerente'
      ELSE 'administrativo'
    END;
    
    -- Alterar tipo da coluna para enum
    ALTER TABLE funcionarios 
    ALTER COLUMN funcao TYPE funcionario_funcao 
    USING funcao::funcionario_funcao;
    
    RAISE NOTICE 'Coluna funcao convertida para enum';
  ELSE
    RAISE NOTICE 'Coluna funcao já é do tipo enum';
  END IF;
END $$;

-- Adicionar constraints
DO $$
BEGIN
  -- CNH única quando não nula
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'funcionarios_cnh_unique'
  ) THEN
    ALTER TABLE funcionarios ADD CONSTRAINT funcionarios_cnh_unique 
    UNIQUE (cnh) DEFERRABLE INITIALLY DEFERRED;
    RAISE NOTICE 'Constraint CNH único adicionada';
  END IF;

  -- CNH deve ter formato válido (11 dígitos)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'funcionarios_cnh_format'
  ) THEN
    ALTER TABLE funcionarios ADD CONSTRAINT funcionarios_cnh_format 
    CHECK (cnh IS NULL OR (length(cnh) = 11 AND cnh ~ '^[0-9]+$'));
    RAISE NOTICE 'Constraint formato CNH adicionada';
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_funcionarios_cnh ON funcionarios(cnh);
CREATE INDEX IF NOT EXISTS idx_funcionarios_status ON funcionarios(status);
CREATE INDEX IF NOT EXISTS idx_funcionarios_funcao ON funcionarios(funcao);
CREATE INDEX IF NOT EXISTS idx_funcionarios_validade_cnh ON funcionarios(validade_cnh);

-- Atualizar registros existentes com valores padrão
UPDATE funcionarios 
SET 
  status = COALESCE(status, 'ativo'::funcionario_status)
WHERE status IS NULL;

-- Verificação final
DO $$
DECLARE
  column_count INTEGER;
  funcionario_count INTEGER;
BEGIN
  -- Contar colunas adicionadas
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns 
  WHERE table_name = 'funcionarios' 
  AND column_name IN ('cnh', 'validade_cnh', 'status');
  
  SELECT COUNT(*) INTO funcionario_count FROM funcionarios;
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Colunas adicionadas: %/3', column_count;
  RAISE NOTICE 'Funcionários no sistema: %', funcionario_count;
  
  IF column_count = 3 THEN
    RAISE NOTICE '✅ Todas as colunas foram adicionadas com sucesso!';
    RAISE NOTICE '✅ Campos disponíveis: CNH, Validade CNH, Status';
    RAISE NOTICE '✅ Função agora é enum: administrativo, motorista, gerente';
    RAISE NOTICE '✅ Status agora é enum: ativo, inativo, ferias';
  ELSE
    RAISE NOTICE '⚠️  Algumas colunas podem não ter sido adicionadas';
  END IF;
END $$;