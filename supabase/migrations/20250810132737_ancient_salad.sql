/*
  # Adicionar tipo de veículo Julieta

  1. Problema Identificado
    - Tipo "julieta" não está incluído no CHECK constraint
    - Necessário adicionar à lista de tipos válidos

  2. Solução
    - Remover constraint antiga
    - Criar nova constraint incluindo "julieta"
    - Manter todos os tipos existentes

  3. Tipos Válidos Finais
    - carro, caminhao, maquina_pesada, implementos, onibus
    - bi_trem_1_reboque, bi_trem_2_reboque
    - vanderleia_3_eixos, vanderleia_4_eixos
    - julieta (NOVO)
*/

-- Remover constraint antiga se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'veiculos_tipo_check'
    AND table_name = 'veiculos'
  ) THEN
    ALTER TABLE veiculos DROP CONSTRAINT veiculos_tipo_check;
    RAISE NOTICE 'Constraint antiga veiculos_tipo_check removida';
  END IF;
END $$;

-- Adicionar nova constraint com todos os tipos válidos incluindo Julieta
DO $$
BEGIN
  ALTER TABLE veiculos 
  ADD CONSTRAINT veiculos_tipo_check 
  CHECK (tipo IN (
    'carro', 
    'caminhao', 
    'maquina_pesada', 
    'implementos', 
    'onibus',
    'bi_trem_1_reboque',
    'bi_trem_2_reboque', 
    'vanderleia_3_eixos',
    'vanderleia_4_eixos',
    'julieta'
  ));
  
  RAISE NOTICE 'Nova constraint veiculos_tipo_check criada incluindo tipo Julieta';
END $$;

-- Verificação final
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'veiculos_tipo_check'
    AND table_name = 'veiculos'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE '✅ Constraint atualizada com sucesso!';
    RAISE NOTICE 'Tipos válidos: carro, caminhao, maquina_pesada, implementos, onibus, bi_trem_1_reboque, bi_trem_2_reboque, vanderleia_3_eixos, vanderleia_4_eixos, julieta';
  ELSE
    RAISE NOTICE '❌ Erro: Constraint não foi criada';
  END IF;
END $$;