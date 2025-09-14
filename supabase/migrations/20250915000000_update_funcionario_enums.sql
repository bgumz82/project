
/*
  # Atualizar enums de funcionários

  1. Adicionar novo status "aguardando" ao enum funcionario_status
  2. Adicionar novas funções "motorista_carreta" e "motorista_julieta" ao enum funcionario_funcao
*/

-- Adicionar novo status "aguardando"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'aguardando' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'funcionario_status')
  ) THEN
    ALTER TYPE funcionario_status ADD VALUE 'aguardando';
    RAISE NOTICE 'Status "aguardando" adicionado ao enum funcionario_status';
  ELSE
    RAISE NOTICE 'Status "aguardando" já existe no enum funcionario_status';
  END IF;
END $$;

-- Adicionar novas funções
DO $$
BEGIN
  -- Motorista Carreta
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'motorista_carreta' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'funcionario_funcao')
  ) THEN
    ALTER TYPE funcionario_funcao ADD VALUE 'motorista_carreta';
    RAISE NOTICE 'Função "motorista_carreta" adicionada ao enum funcionario_funcao';
  ELSE
    RAISE NOTICE 'Função "motorista_carreta" já existe no enum funcionario_funcao';
  END IF;

  -- Motorista Julieta
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'motorista_julieta' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'funcionario_funcao')
  ) THEN
    ALTER TYPE funcionario_funcao ADD VALUE 'motorista_julieta';
    RAISE NOTICE 'Função "motorista_julieta" adicionada ao enum funcionario_funcao';
  ELSE
    RAISE NOTICE 'Função "motorista_julieta" já existe no enum funcionario_funcao';
  END IF;
END $$;
