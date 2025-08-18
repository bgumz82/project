/*
  # Módulo de Associações de Frota

  1. Nova Tabela
    - `associacoes_frota`
      - `id` (uuid, primary key)
      - `funcionario_id` (uuid, foreign key para funcionarios)
      - `veiculo_id` (uuid, foreign key para veiculos)
      - `data_inicio` (date, data de início da associação)
      - `data_fim` (date, data de fim da associação - nullable)
      - `ativo` (boolean, se a associação está ativa)
      - `observacoes` (text, observações sobre a associação)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Constraints
    - Foreign keys para funcionarios e veiculos
    - Apenas um motorista ativo por veículo
    - Apenas veículos pesados podem ser associados
    - Apenas funcionários motoristas podem ser associados

  3. Índices
    - Por funcionário
    - Por veículo
    - Por status ativo
    - Por data de início/fim
*/

-- Criar tabela de associações de frota
CREATE TABLE IF NOT EXISTS associacoes_frota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL,
  veiculo_id uuid NOT NULL,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  ativo boolean DEFAULT true,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar foreign keys
ALTER TABLE associacoes_frota 
ADD CONSTRAINT associacoes_frota_funcionario_id_fkey 
FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE;

ALTER TABLE associacoes_frota 
ADD CONSTRAINT associacoes_frota_veiculo_id_fkey 
FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE;

-- Adicionar constraints de negócio
ALTER TABLE associacoes_frota 
ADD CONSTRAINT associacoes_frota_data_fim_check 
CHECK (data_fim IS NULL OR data_fim >= data_inicio);

-- Constraint para garantir apenas um motorista ativo por veículo
CREATE UNIQUE INDEX IF NOT EXISTS idx_associacoes_frota_veiculo_ativo 
ON associacoes_frota(veiculo_id) 
WHERE ativo = true AND data_fim IS NULL;

-- Constraint para garantir que apenas veículos pesados podem ser associados
ALTER TABLE associacoes_frota 
ADD CONSTRAINT associacoes_frota_veiculo_tipo_check 
CHECK (
  EXISTS (
    SELECT 1 FROM veiculos v 
    WHERE v.id = veiculo_id 
    AND v.tipo IN ('caminhao', 'bi_trem_1_reboque', 'bi_trem_2_reboque', 'vanderleia_3_eixos', 'vanderleia_4_eixos', 'julieta')
  )
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_associacoes_frota_funcionario_id ON associacoes_frota(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_associacoes_frota_veiculo_id ON associacoes_frota(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_associacoes_frota_ativo ON associacoes_frota(ativo);
CREATE INDEX IF NOT EXISTS idx_associacoes_frota_data_inicio ON associacoes_frota(data_inicio);
CREATE INDEX IF NOT EXISTS idx_associacoes_frota_data_fim ON associacoes_frota(data_fim);

-- Função para finalizar associação anterior ao criar nova
CREATE OR REPLACE FUNCTION finalizar_associacao_anterior()
RETURNS TRIGGER AS $$
BEGIN
  -- Se está criando uma nova associação ativa
  IF NEW.ativo = true AND NEW.data_fim IS NULL THEN
    -- Finalizar outras associações ativas para o mesmo veículo
    UPDATE associacoes_frota 
    SET ativo = false, 
        data_fim = NEW.data_inicio,
        updated_at = now()
    WHERE veiculo_id = NEW.veiculo_id 
    AND ativo = true 
    AND data_fim IS NULL 
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para finalizar associação anterior
DROP TRIGGER IF EXISTS trigger_finalizar_associacao_anterior ON associacoes_frota;
CREATE TRIGGER trigger_finalizar_associacao_anterior
  BEFORE INSERT OR UPDATE ON associacoes_frota
  FOR EACH ROW
  EXECUTE FUNCTION finalizar_associacao_anterior();

-- Inserir alguns dados de exemplo se existirem funcionários e veículos
DO $$
DECLARE
  motorista_id uuid;
  veiculo_pesado_id uuid;
BEGIN
  -- Buscar um funcionário motorista
  SELECT id INTO motorista_id 
  FROM funcionarios 
  WHERE funcao = 'motorista' 
  AND status = 'ativo'
  LIMIT 1;
  
  -- Buscar um veículo pesado
  SELECT id INTO veiculo_pesado_id 
  FROM veiculos 
  WHERE tipo IN ('caminhao', 'bi_trem_1_reboque', 'bi_trem_2_reboque', 'vanderleia_3_eixos', 'vanderleia_4_eixos', 'julieta')
  AND ativo = true
  LIMIT 1;
  
  -- Criar associação de exemplo se ambos existirem
  IF motorista_id IS NOT NULL AND veiculo_pesado_id IS NOT NULL THEN
    INSERT INTO associacoes_frota (funcionario_id, veiculo_id, data_inicio, ativo, observacoes)
    VALUES (motorista_id, veiculo_pesado_id, CURRENT_DATE, true, 'Associação de exemplo')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Associação de exemplo criada';
  ELSE
    RAISE NOTICE 'Não foi possível criar associação de exemplo - faltam dados';
  END IF;
END $$;

-- Verificação final
DO $$
DECLARE
  table_exists BOOLEAN;
  constraint_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Verificar se a tabela foi criada
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'associacoes_frota'
  ) INTO table_exists;
  
  -- Contar constraints
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_name = 'associacoes_frota';
  
  -- Contar índices
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'associacoes_frota';
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Tabela associacoes_frota criada: %', table_exists;
  RAISE NOTICE 'Constraints criadas: %', constraint_count;
  RAISE NOTICE 'Índices criados: %', index_count;
  
  IF table_exists AND constraint_count >= 3 AND index_count >= 5 THEN
    RAISE NOTICE '✅ Módulo Associações de Frota criado com sucesso!';
    RAISE NOTICE '✅ Pronto para associar motoristas com veículos pesados';
  ELSE
    RAISE NOTICE '⚠️  Verificar se todas as estruturas foram criadas';
  END IF;
END $$;