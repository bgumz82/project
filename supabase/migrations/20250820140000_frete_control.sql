
/*
  # Criar Controle de Frete

  1. Tabela de Frete
    - `frete_documentos` - Documentos de frete com todas as informações necessárias

  2. Campos
    - Identificação: empresa, clientes origem/destino
    - Localização: códigos IBGE das cidades
    - Valores: frete, pedágio, seguro, comissão
    - Detalhes: KM, tipo reboque, tipo produto, tomador
    - Configurações: cobrança de pedágio/seguro, emissão automática

  3. Constraints
    - Foreign keys para empresas e clientes
    - Validações de valores positivos
    - Enums para campos específicos
*/

-- Criar enums para frete
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tomador_frete_type') THEN
    CREATE TYPE tomador_frete_type AS ENUM ('remetente', 'destinatario');
    RAISE NOTICE 'Enum tomador_frete_type criado';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_reboque_frete') THEN
    CREATE TYPE tipo_reboque_frete AS ENUM ('vanderleia', 'vanderleia_4_eixos', 'bi_trem', 'julieta');
    RAISE NOTICE 'Enum tipo_reboque_frete criado';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_produto_frete') THEN
    CREATE TYPE tipo_produto_frete AS ENUM ('LEITE', 'CREME', 'SORO');
    RAISE NOTICE 'Enum tipo_produto_frete criado';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'frete_status') THEN
    CREATE TYPE frete_status AS ENUM ('pendente', 'emitido', 'cancelado');
    RAISE NOTICE 'Enum frete_status criado';
  END IF;
END $$;

-- Criar tabela de documentos de frete
CREATE TABLE IF NOT EXISTS frete_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  cliente_origem_id uuid NOT NULL,
  cliente_destino_id uuid NOT NULL,
  cidade_origem_ibge varchar(7) NOT NULL,
  cidade_destino_ibge varchar(7) NOT NULL,
  valor_frete decimal(10,2) NOT NULL CHECK (valor_frete >= 0),
  valor_pedagio decimal(10,2) DEFAULT 0 CHECK (valor_pedagio >= 0),
  valor_seguro decimal(10,2) DEFAULT 0 CHECK (valor_seguro >= 0),
  valor_comissao decimal(10,2) DEFAULT 0 CHECK (valor_comissao >= 0),
  km integer NOT NULL CHECK (km > 0),
  seguro_carga_id uuid,
  cobranca_pedagio boolean DEFAULT true,
  cobranca_seguro boolean DEFAULT true,
  tomador_frete tomador_frete_type NOT NULL,
  tipo_reboque tipo_reboque_frete NOT NULL,
  tipo_produto tipo_produto_frete NOT NULL,
  emissao_automatica boolean DEFAULT true,
  status frete_status DEFAULT 'pendente',
  ativo boolean DEFAULT true,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar foreign keys
ALTER TABLE frete_documentos 
ADD CONSTRAINT frete_documentos_empresa_id_fkey 
FOREIGN KEY (empresa_id) REFERENCES empresas_fiscais(id) ON DELETE CASCADE;

ALTER TABLE frete_documentos 
ADD CONSTRAINT frete_documentos_cliente_origem_id_fkey 
FOREIGN KEY (cliente_origem_id) REFERENCES cadastros(id) ON DELETE CASCADE;

ALTER TABLE frete_documentos 
ADD CONSTRAINT frete_documentos_cliente_destino_id_fkey 
FOREIGN KEY (cliente_destino_id) REFERENCES cadastros(id) ON DELETE CASCADE;

-- Adicionar constraint para garantir que origem e destino sejam diferentes
ALTER TABLE frete_documentos 
ADD CONSTRAINT frete_documentos_origem_destino_diferentes_check 
CHECK (cliente_origem_id != cliente_destino_id);

-- Adicionar constraint para garantir que códigos IBGE sejam válidos (7 dígitos)
ALTER TABLE frete_documentos 
ADD CONSTRAINT frete_documentos_cidade_origem_ibge_check 
CHECK (cidade_origem_ibge ~ '^\d{7}$');

ALTER TABLE frete_documentos 
ADD CONSTRAINT frete_documentos_cidade_destino_ibge_check 
CHECK (cidade_destino_ibge ~ '^\d{7}$');

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_frete_documentos_empresa_id ON frete_documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_frete_documentos_cliente_origem_id ON frete_documentos(cliente_origem_id);
CREATE INDEX IF NOT EXISTS idx_frete_documentos_cliente_destino_id ON frete_documentos(cliente_destino_id);
CREATE INDEX IF NOT EXISTS idx_frete_documentos_status ON frete_documentos(status);
CREATE INDEX IF NOT EXISTS idx_frete_documentos_created_at ON frete_documentos(created_at);
CREATE INDEX IF NOT EXISTS idx_frete_documentos_tipo_produto ON frete_documentos(tipo_produto);
CREATE INDEX IF NOT EXISTS idx_frete_documentos_tipo_reboque ON frete_documentos(tipo_reboque);

-- Adicionar comentários
COMMENT ON TABLE frete_documentos IS 'Controle de documentos de frete com informações completas de origem, destino, valores e configurações';
COMMENT ON COLUMN frete_documentos.cidade_origem_ibge IS 'Código IBGE da cidade de origem (7 dígitos)';
COMMENT ON COLUMN frete_documentos.cidade_destino_ibge IS 'Código IBGE da cidade de destino (7 dígitos)';
COMMENT ON COLUMN frete_documentos.seguro_carga_id IS 'Referência para futuro controle de seguros de carga';
COMMENT ON COLUMN frete_documentos.km IS 'Quilometragem do trajeto';
COMMENT ON COLUMN frete_documentos.tomador_frete IS 'Quem será o tomador do serviço de frete';
COMMENT ON COLUMN frete_documentos.emissao_automatica IS 'Se deve emitir automaticamente os documentos fiscais';

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_frete_documentos_updated_at 
    BEFORE UPDATE ON frete_documentos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
