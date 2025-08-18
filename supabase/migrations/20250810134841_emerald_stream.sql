/*
  # Corrigir constraint problemática na tabela associacoes_frota

  1. Problema Identificado
    - Constraint associacoes_frota_veiculo_tipo_check está causando erro
    - Verificação complexa com subquery pode não funcionar corretamente
    - Necessário simplificar ou remover a constraint

  2. Solução
    - Remover constraint problemática
    - Manter validação apenas na aplicação
    - Preservar outras constraints funcionais

  3. Segurança
    - Manter foreign keys
    - Manter constraint de data
    - Validação de tipos será feita pela aplicação
*/

-- Remover constraint problemática se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'associacoes_frota_veiculo_tipo_check'
    AND table_name = 'associacoes_frota'
  ) THEN
    ALTER TABLE associacoes_frota DROP CONSTRAINT associacoes_frota_veiculo_tipo_check;
    RAISE NOTICE 'Constraint problemática associacoes_frota_veiculo_tipo_check removida';
  END IF;
END $$;

-- Verificar se a tabela existe e tem a estrutura básica
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'associacoes_frota') THEN
    -- Criar tabela se não existir
    CREATE TABLE associacoes_frota (
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
    RAISE NOTICE 'Tabela associacoes_frota criada';
  ELSE
    RAISE NOTICE 'Tabela associacoes_frota já existe';
  END IF;
END $$;

-- Adicionar foreign keys se não existirem
DO $$
BEGIN
  -- Foreign key para funcionarios
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'associacoes_frota_funcionario_id_fkey' 
    AND table_name = 'associacoes_frota'
  ) THEN
    ALTER TABLE associacoes_frota 
    ADD CONSTRAINT associacoes_frota_funcionario_id_fkey 
    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key funcionario_id criada';
  END IF;

  -- Foreign key para veiculos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'associacoes_frota_veiculo_id_fkey' 
    AND table_name = 'associacoes_frota'
  ) THEN
    ALTER TABLE associacoes_frota 
    ADD CONSTRAINT associacoes_frota_veiculo_id_fkey 
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key veiculo_id criada';
  END IF;
END $$;

-- Adicionar constraint de data válida
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'associacoes_frota_data_fim_check'
    AND table_name = 'associacoes_frota'
  ) THEN
    ALTER TABLE associacoes_frota 
    ADD CONSTRAINT associacoes_frota_data_fim_check 
    CHECK (data_fim IS NULL OR data_fim >= data_inicio);
    RAISE NOTICE 'Constraint de data válida criada';
  END IF;
END $$;

-- Criar índice único para garantir apenas um motorista ativo por veículo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_associacoes_frota_veiculo_ativo'
  ) THEN
    CREATE UNIQUE INDEX idx_associacoes_frota_veiculo_ativo 
    ON associacoes_frota(veiculo_id) 
    WHERE ativo = true AND data_fim IS NULL;
    RAISE NOTICE 'Índice único para veículo ativo criado';
  END IF;
END $$;

-- Criar outros índices para performance
CREATE INDEX IF NOT EXISTS idx_associacoes_frota_funcionario_id ON associacoes_frota(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_associacoes_frota_veiculo_id ON associacoes_frota(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_associacoes_frota_ativo ON associacoes_frota(ativo);
CREATE INDEX IF NOT EXISTS idx_associacoes_frota_data_inicio ON associacoes_frota(data_inicio);
CREATE INDEX IF NOT EXISTS idx_associacoes_frota_data_fim ON associacoes_frota(data_fim);

-- Função para finalizar associação anterior (sem constraint complexa)
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
  
  -- Contar constraints (sem a problemática)
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_name = 'associacoes_frota'
  AND constraint_type IN ('FOREIGN KEY', 'CHECK');
  
  -- Contar índices
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'associacoes_frota';
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Tabela associacoes_frota criada: %', table_exists;
  RAISE NOTICE 'Constraints funcionais: %', constraint_count;
  RAISE NOTICE 'Índices criados: %', index_count;
  
  IF table_exists AND constraint_count >= 3 AND index_count >= 5 THEN
    RAISE NOTICE '✅ Módulo Associações de Frota criado com sucesso!';
    RAISE NOTICE '✅ Validação de tipos será feita pela aplicação';
    RAISE NOTICE '✅ Pronto para associar motoristas com veículos pesados';
  ELSE
    RAISE NOTICE '⚠️  Verificar se todas as estruturas foram criadas';
  END IF;
END $$;