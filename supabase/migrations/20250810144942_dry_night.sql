/*
  # Atualizar estrutura das Associações de Frota

  1. Nova Estrutura
    - Motorista + Caminhão (obrigatório)
    - + Bi-Trem 1º Reboque + Bi-Trem 2º Reboque (opcionais)
    - OU Vanderleia 3/4 Eixos (opcional)
    - OU Julieta (opcional)

  2. Alterações na Tabela
    - Renomear veiculo_id para veiculo_principal_id (caminhão)
    - Adicionar veiculo_reboque1_id (bi-trem 1º reboque)
    - Adicionar veiculo_reboque2_id (bi-trem 2º reboque)
    - Adicionar veiculo_implemento_id (vanderleia ou julieta)

  3. Constraints
    - veiculo_principal_id deve ser caminhão
    - veiculo_reboque1_id deve ser bi_trem_1_reboque
    - veiculo_reboque2_id deve ser bi_trem_2_reboque
    - veiculo_implemento_id deve ser vanderleia ou julieta
*/

-- Adicionar novas colunas para múltiplos veículos
DO $$
BEGIN
  -- Renomear veiculo_id para veiculo_principal_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'associacoes_frota' AND column_name = 'veiculo_id'
  ) THEN
    ALTER TABLE associacoes_frota RENAME COLUMN veiculo_id TO veiculo_principal_id;
    RAISE NOTICE 'Coluna veiculo_id renomeada para veiculo_principal_id';
  END IF;

  -- Adicionar veiculo_reboque1_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'associacoes_frota' AND column_name = 'veiculo_reboque1_id'
  ) THEN
    ALTER TABLE associacoes_frota ADD COLUMN veiculo_reboque1_id uuid;
    RAISE NOTICE 'Coluna veiculo_reboque1_id adicionada';
  END IF;

  -- Adicionar veiculo_reboque2_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'associacoes_frota' AND column_name = 'veiculo_reboque2_id'
  ) THEN
    ALTER TABLE associacoes_frota ADD COLUMN veiculo_reboque2_id uuid;
    RAISE NOTICE 'Coluna veiculo_reboque2_id adicionada';
  END IF;

  -- Adicionar veiculo_implemento_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'associacoes_frota' AND column_name = 'veiculo_implemento_id'
  ) THEN
    ALTER TABLE associacoes_frota ADD COLUMN veiculo_implemento_id uuid;
    RAISE NOTICE 'Coluna veiculo_implemento_id adicionada';
  END IF;
END $$;

-- Remover foreign keys antigas e criar novas
DO $$
BEGIN
  -- Remover foreign key antiga
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'associacoes_frota_veiculo_id_fkey' 
    AND table_name = 'associacoes_frota'
  ) THEN
    ALTER TABLE associacoes_frota DROP CONSTRAINT associacoes_frota_veiculo_id_fkey;
    RAISE NOTICE 'Foreign key antiga removida';
  END IF;

  -- Adicionar novas foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'associacoes_frota_veiculo_principal_id_fkey' 
    AND table_name = 'associacoes_frota'
  ) THEN
    ALTER TABLE associacoes_frota 
    ADD CONSTRAINT associacoes_frota_veiculo_principal_id_fkey 
    FOREIGN KEY (veiculo_principal_id) REFERENCES veiculos(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key veiculo_principal_id criada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'associacoes_frota_veiculo_reboque1_id_fkey' 
    AND table_name = 'associacoes_frota'
  ) THEN
    ALTER TABLE associacoes_frota 
    ADD CONSTRAINT associacoes_frota_veiculo_reboque1_id_fkey 
    FOREIGN KEY (veiculo_reboque1_id) REFERENCES veiculos(id) ON DELETE SET NULL;
    RAISE NOTICE 'Foreign key veiculo_reboque1_id criada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'associacoes_frota_veiculo_reboque2_id_fkey' 
    AND table_name = 'associacoes_frota'
  ) THEN
    ALTER TABLE associacoes_frota 
    ADD CONSTRAINT associacoes_frota_veiculo_reboque2_id_fkey 
    FOREIGN KEY (veiculo_reboque2_id) REFERENCES veiculos(id) ON DELETE SET NULL;
    RAISE NOTICE 'Foreign key veiculo_reboque2_id criada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'associacoes_frota_veiculo_implemento_id_fkey' 
    AND table_name = 'associacoes_frota'
  ) THEN
    ALTER TABLE associacoes_frota 
    ADD CONSTRAINT associacoes_frota_veiculo_implemento_id_fkey 
    FOREIGN KEY (veiculo_implemento_id) REFERENCES veiculos(id) ON DELETE SET NULL;
    RAISE NOTICE 'Foreign key veiculo_implemento_id criada';
  END IF;
END $$;

-- Atualizar índices
DROP INDEX IF EXISTS idx_associacoes_frota_veiculo_id;
DROP INDEX IF EXISTS idx_associacoes_frota_veiculo_ativo;

CREATE INDEX IF NOT EXISTS idx_associacoes_frota_veiculo_principal_id ON associacoes_frota(veiculo_principal_id);
CREATE INDEX IF NOT EXISTS idx_associacoes_frota_veiculo_reboque1_id ON associacoes_frota(veiculo_reboque1_id);
CREATE INDEX IF NOT EXISTS idx_associacoes_frota_veiculo_reboque2_id ON associacoes_frota(veiculo_reboque2_id);
CREATE INDEX IF NOT EXISTS idx_associacoes_frota_veiculo_implemento_id ON associacoes_frota(veiculo_implemento_id);

-- Criar índice único para garantir apenas um motorista ativo por veículo principal
CREATE UNIQUE INDEX IF NOT EXISTS idx_associacoes_frota_veiculo_principal_ativo 
ON associacoes_frota(veiculo_principal_id) 
WHERE ativo = true AND data_fim IS NULL;

-- Atualizar função do trigger para trabalhar com múltiplos veículos
CREATE OR REPLACE FUNCTION finalizar_associacao_anterior()
RETURNS TRIGGER AS $$
BEGIN
  -- Se está criando uma nova associação ativa
  IF NEW.ativo = true AND NEW.data_fim IS NULL THEN
    -- Finalizar outras associações ativas para o mesmo veículo principal
    UPDATE associacoes_frota 
    SET ativo = false, 
        data_fim = NEW.data_inicio,
        updated_at = now()
    WHERE veiculo_principal_id = NEW.veiculo_principal_id 
    AND ativo = true 
    AND data_fim IS NULL 
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificação final
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  -- Contar colunas de veículos
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns 
  WHERE table_name = 'associacoes_frota' 
  AND column_name IN ('veiculo_principal_id', 'veiculo_reboque1_id', 'veiculo_reboque2_id', 'veiculo_implemento_id');
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Colunas de veículos criadas: %/4', column_count;
  
  IF column_count = 4 THEN
    RAISE NOTICE '✅ Estrutura atualizada com sucesso!';
    RAISE NOTICE '✅ Agora suporta: Motorista + Caminhão + Reboques/Implementos';
  ELSE
    RAISE NOTICE '⚠️  Algumas colunas podem não ter sido criadas';
  END IF;
END $$;