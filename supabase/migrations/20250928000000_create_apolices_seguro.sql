
/*
  # Criar Controle de Apólices de Seguro

  1. Tabela de Apólices
    - `apolices_seguro` - Controle de apólices para averbação de CT-e e MDF-e

  2. Campos
    - Identificação: número da apólice, identificador personalizado
    - Vigência: data inicial e final
    - Limite: valor máximo para averbação
    - Controle: status ativo/inativo, empresa

  3. Constraints
    - Foreign key para empresa fiscal
    - Validações de datas e valores
    - Unicidade do número da apólice por empresa
*/

-- Criar enum para status da apólice
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'apolice_status') THEN
    CREATE TYPE apolice_status AS ENUM ('ativa', 'vencida', 'cancelada');
    RAISE NOTICE 'Enum apolice_status criado';
  END IF;
END $$;

-- Criar tabela de apólices de seguro
CREATE TABLE IF NOT EXISTS apolices_seguro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  numero_apolice varchar(50) NOT NULL,
  identificador varchar(100) NOT NULL,
  data_inicial date NOT NULL,
  data_final date NOT NULL,
  limite_averbacao decimal(15,2) NOT NULL CHECK (limite_averbacao > 0),
  valor_utilizado decimal(15,2) DEFAULT 0 CHECK (valor_utilizado >= 0),
  status apolice_status DEFAULT 'ativa',
  observacoes text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar foreign key
ALTER TABLE apolices_seguro 
ADD CONSTRAINT apolices_seguro_empresa_id_fkey 
FOREIGN KEY (empresa_id) REFERENCES empresas_fiscais(id) ON DELETE CASCADE;

-- Adicionar constraint para garantir que data final seja maior que inicial
ALTER TABLE apolices_seguro 
ADD CONSTRAINT apolices_seguro_datas_validas_check 
CHECK (data_final > data_inicial);

-- Adicionar constraint para garantir que valor utilizado não exceda o limite
ALTER TABLE apolices_seguro 
ADD CONSTRAINT apolices_seguro_valor_utilizado_limite_check 
CHECK (valor_utilizado <= limite_averbacao);

-- Adicionar constraint de unicidade do número da apólice por empresa
ALTER TABLE apolices_seguro 
ADD CONSTRAINT apolices_seguro_numero_empresa_unique 
UNIQUE (empresa_id, numero_apolice);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_apolices_seguro_empresa_id ON apolices_seguro(empresa_id);
CREATE INDEX IF NOT EXISTS idx_apolices_seguro_numero_apolice ON apolices_seguro(numero_apolice);
CREATE INDEX IF NOT EXISTS idx_apolices_seguro_status ON apolices_seguro(status);
CREATE INDEX IF NOT EXISTS idx_apolices_seguro_vigencia ON apolices_seguro(data_inicial, data_final);
CREATE INDEX IF NOT EXISTS idx_apolices_seguro_created_at ON apolices_seguro(created_at);

-- Adicionar comentários
COMMENT ON TABLE apolices_seguro IS 'Controle de apólices de seguro para averbação de CT-e e MDF-e';
COMMENT ON COLUMN apolices_seguro.numero_apolice IS 'Número oficial da apólice de seguro';
COMMENT ON COLUMN apolices_seguro.identificador IS 'Identificador personalizado para seleção nos registros de frete';
COMMENT ON COLUMN apolices_seguro.limite_averbacao IS 'Valor máximo permitido para averbação nesta apólice';
COMMENT ON COLUMN apolices_seguro.valor_utilizado IS 'Valor já utilizado/averbado nesta apólice';
COMMENT ON COLUMN apolices_seguro.status IS 'Status da apólice (ativa, vencida, cancelada)';

-- Trigger para updated_at
CREATE TRIGGER update_apolices_seguro_updated_at 
    BEFORE UPDATE ON apolices_seguro 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar status automaticamente baseado na data
CREATE OR REPLACE FUNCTION update_apolice_status()
RETURNS void AS $$
BEGIN
  UPDATE apolices_seguro 
  SET status = 'vencida', updated_at = now()
  WHERE status = 'ativa' 
    AND data_final < CURRENT_DATE
    AND ativo = true;
END;
$$ LANGUAGE plpgsql;

-- Atualizar a tabela frete_documentos para referenciar apólices
ALTER TABLE frete_documentos 
DROP CONSTRAINT IF EXISTS frete_documentos_seguro_carga_id_fkey;

ALTER TABLE frete_documentos 
ADD CONSTRAINT frete_documentos_seguro_carga_id_fkey 
FOREIGN KEY (seguro_carga_id) REFERENCES apolices_seguro(id) ON DELETE SET NULL;

COMMENT ON COLUMN frete_documentos.seguro_carga_id IS 'Referência para a apólice de seguro utilizada';

-- Adicionar algumas funções úteis
CREATE OR REPLACE FUNCTION get_apolices_ativas(empresa_id_param uuid)
RETURNS TABLE (
  id uuid,
  numero_apolice varchar,
  identificador varchar,
  limite_averbacao decimal,
  valor_utilizado decimal,
  saldo_disponivel decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.numero_apolice,
    a.identificador,
    a.limite_averbacao,
    a.valor_utilizado,
    (a.limite_averbacao - a.valor_utilizado) as saldo_disponivel
  FROM apolices_seguro a
  WHERE a.empresa_id = empresa_id_param
    AND a.status = 'ativa'
    AND a.ativo = true
    AND a.data_inicial <= CURRENT_DATE
    AND a.data_final >= CURRENT_DATE
  ORDER BY a.identificador;
END;
$$ LANGUAGE plpgsql;

RAISE NOTICE '✅ Controle de Apólices de Seguro criado com sucesso!';
RAISE NOTICE '📋 Tabela: apolices_seguro';
RAISE NOTICE '🔗 Relacionamento com frete_documentos atualizado';
RAISE NOTICE '⚙️ Funções auxiliares criadas';
