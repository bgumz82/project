
-- Migration para adicionar todos os campos necessários na tabela cte_documentos

DO $$
BEGIN
  -- Campos de serviços e impostos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'valor_prestacao'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN valor_prestacao numeric(15,2);
    RAISE NOTICE 'Coluna valor_prestacao adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'valor_receber'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN valor_receber numeric(15,2);
    RAISE NOTICE 'Coluna valor_receber adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'valor_tributos'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN valor_tributos numeric(15,2);
    RAISE NOTICE 'Coluna valor_tributos adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'icms_situacao_tributaria'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN icms_situacao_tributaria text;
    RAISE NOTICE 'Coluna icms_situacao_tributaria adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'icms_bc_valor'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN icms_bc_valor numeric(15,2);
    RAISE NOTICE 'Coluna icms_bc_valor adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'icms_aliquota'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN icms_aliquota numeric(5,2);
    RAISE NOTICE 'Coluna icms_aliquota adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'icms_valor'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN icms_valor numeric(15,2);
    RAISE NOTICE 'Coluna icms_valor adicionada';
  END IF;

  -- Campos CT-e adicionais
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'tipo_servico'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN tipo_servico text DEFAULT '0';
    RAISE NOTICE 'Coluna tipo_servico adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'finalidade_cte'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN finalidade_cte text DEFAULT '0';
    RAISE NOTICE 'Coluna finalidade_cte adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'cfop'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN cfop text DEFAULT '5352';
    RAISE NOTICE 'Coluna cfop adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'cidade_inicio_ibge'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN cidade_inicio_ibge text;
    RAISE NOTICE 'Coluna cidade_inicio_ibge adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'cidade_termino_ibge'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN cidade_termino_ibge text;
    RAISE NOTICE 'Coluna cidade_termino_ibge adicionada';
  END IF;

  -- Campos de transporte
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'rntrc'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN rntrc text;
    RAISE NOTICE 'Coluna rntrc adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'motorista_nome'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN motorista_nome text;
    RAISE NOTICE 'Coluna motorista_nome adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'motorista_cnh'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN motorista_cnh text;
    RAISE NOTICE 'Coluna motorista_cnh adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'motorista_matricula'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN motorista_matricula text;
    RAISE NOTICE 'Coluna motorista_matricula adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'motorista_validade_cnh'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN motorista_validade_cnh text;
    RAISE NOTICE 'Coluna motorista_validade_cnh adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'placa_veiculo'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN placa_veiculo text;
    RAISE NOTICE 'Coluna placa_veiculo adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'placa_reboque'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN placa_reboque text;
    RAISE NOTICE 'Coluna placa_reboque adicionada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cte_documentos' AND column_name = 'associacao_frota_id'
  ) THEN
    ALTER TABLE cte_documentos ADD COLUMN associacao_frota_id uuid;
    RAISE NOTICE 'Coluna associacao_frota_id adicionada';
  END IF;

  -- Adicionar foreign key para associacao_frota_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'cte_documentos_associacao_frota_id_fkey' 
    AND table_name = 'cte_documentos'
  ) THEN
    ALTER TABLE cte_documentos 
    ADD CONSTRAINT cte_documentos_associacao_frota_id_fkey 
    FOREIGN KEY (associacao_frota_id) REFERENCES associacoes_frota(id) ON DELETE SET NULL;
    RAISE NOTICE 'FK cte_documentos -> associacoes_frota adicionada';
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_cte_documentos_cidade_inicio ON cte_documentos(cidade_inicio_ibge);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_cidade_termino ON cte_documentos(cidade_termino_ibge);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_rntrc ON cte_documentos(rntrc);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_associacao_frota ON cte_documentos(associacao_frota_id);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_motorista_cnh ON cte_documentos(motorista_cnh);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_cfop ON cte_documentos(cfop);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_icms_situacao ON cte_documentos(icms_situacao_tributaria);

-- Comentários nas colunas para documentação
COMMENT ON COLUMN cte_documentos.valor_prestacao IS 'Valor total da prestação de serviço';
COMMENT ON COLUMN cte_documentos.valor_receber IS 'Valor total a receber';
COMMENT ON COLUMN cte_documentos.valor_tributos IS 'Valor total dos tributos';
COMMENT ON COLUMN cte_documentos.icms_situacao_tributaria IS 'Código da situação tributária do ICMS';
COMMENT ON COLUMN cte_documentos.icms_bc_valor IS 'Valor da base de cálculo do ICMS';
COMMENT ON COLUMN cte_documentos.icms_aliquota IS 'Alíquota do ICMS em percentual';
COMMENT ON COLUMN cte_documentos.icms_valor IS 'Valor do ICMS';
COMMENT ON COLUMN cte_documentos.tipo_servico IS 'Tipo do serviço (0=Normal, 1=Subcontratação, etc.)';
COMMENT ON COLUMN cte_documentos.finalidade_cte IS 'Finalidade do CT-e (0=Normal, 1=Complemento, etc.)';
COMMENT ON COLUMN cte_documentos.cfop IS 'Código Fiscal de Operações e Prestações';
COMMENT ON COLUMN cte_documentos.cidade_inicio_ibge IS 'Código IBGE da cidade de início da prestação';
COMMENT ON COLUMN cte_documentos.cidade_termino_ibge IS 'Código IBGE da cidade de término da prestação';
COMMENT ON COLUMN cte_documentos.rntrc IS 'Registro Nacional de Transportadores Rodoviários de Carga';
COMMENT ON COLUMN cte_documentos.motorista_nome IS 'Nome do motorista responsável';
COMMENT ON COLUMN cte_documentos.motorista_cnh IS 'Número da CNH do motorista';
COMMENT ON COLUMN cte_documentos.motorista_matricula IS 'Matrícula do motorista na empresa';
COMMENT ON COLUMN cte_documentos.motorista_validade_cnh IS 'Data de validade da CNH do motorista';
COMMENT ON COLUMN cte_documentos.placa_veiculo IS 'Placa do veículo principal';
COMMENT ON COLUMN cte_documentos.placa_reboque IS 'Placa(s) do(s) reboque(s)/implemento(s)';
COMMENT ON COLUMN cte_documentos.associacao_frota_id IS 'ID da associação de frota utilizada';
