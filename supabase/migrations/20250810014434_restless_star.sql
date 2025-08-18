/*
  # Atualizar constraint de tipos de veículos

  1. Problema Identificado
    - CHECK constraint "veiculos_tipo_check" não inclui os novos tipos
    - Bi-Trem (1º e 2º reboque) e Vanderleia (3 e 4 eixos) não são aceitos
    - Erro ao inserir novos veículos com esses tipos

  2. Solução
    - Remover constraint antiga
    - Criar nova constraint com todos os tipos válidos
    - Incluir tipos originais + novos tipos

  3. Tipos Válidos
    - carro, caminhao, maquina_pesada, implementos, onibus
    - bi_trem_1_reboque, bi_trem_2_reboque
    - vanderleia_3_eixos, vanderleia_4_eixos
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

-- Adicionar nova constraint com todos os tipos válidos
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
    'vanderleia_4_eixos'
  ));
  
  RAISE NOTICE 'Nova constraint veiculos_tipo_check criada com todos os tipos válidos';
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
    RAISE NOTICE 'Tipos válidos: carro, caminhao, maquina_pesada, implementos, onibus, bi_trem_1_reboque, bi_trem_2_reboque, vanderleia_3_eixos, vanderleia_4_eixos';
  ELSE
    RAISE NOTICE '❌ Erro: Constraint não foi criada';
  END IF;
END $$;