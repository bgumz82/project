
-- Migration completa para recriar a tabela cte_documentos com todos os campos
-- Baseada na interface CTeDocumento do arquivo fiscal.ts

-- Primeiro, fazer backup dos dados existentes se houver
DO $$
BEGIN
  -- Criar tabela de backup se cte_documentos existir e tiver dados
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cte_documentos') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS cte_documentos_backup AS SELECT * FROM cte_documentos';
    RAISE NOTICE 'Backup da tabela cte_documentos criado';
  END IF;
END $$;

-- Criar tipos ENUM se não existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cte_status') THEN
    CREATE TYPE cte_status AS ENUM ('pendente', 'emitido', 'cancelado');
    RAISE NOTICE 'Enum cte_status criado';
  END IF;
END $$;

-- Remover tabela existente se houver
DROP TABLE IF EXISTS cte_documentos CASCADE;

-- Criar tabela cte_documentos completa
CREATE TABLE cte_documentos (
  -- Campos básicos
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  numero_cte text NOT NULL,
  serie text NOT NULL DEFAULT '001',
  data_emissao date NOT NULL,
  
  -- Campos de chave de acesso
  chave_acesso text,
  chave_acesso_1 text,
  chave_acesso_2 text,
  chave_acesso_3 text,
  chave_acesso_4 text,
  
  -- Campos fiscais básicos
  codigo_uf text NOT NULL DEFAULT '35',
  forma_emissao integer DEFAULT 1,
  codigo_numerico text,
  dv text,
  
  -- Status e observações
  status cte_status DEFAULT 'pendente',
  observacoes text,
  
  -- Campos de participantes (foreign keys para cadastros)
  tomador_id uuid,
  remetente_id uuid,
  recebedor_id uuid,
  destinatario_id uuid,
  
  -- Campos de valores e impostos
  valor_prestacao numeric(15,2),
  valor_receber numeric(15,2),
  valor_tributos numeric(15,2),
  icms_situacao_tributaria text,
  icms_bc_valor numeric(15,2),
  icms_aliquota numeric(5,2),
  icms_valor numeric(15,2),
  
  -- Campos de carga
  valor_carga numeric(15,2),
  quantidade_carga numeric(15,3),
  produto_predominante_id uuid,
  
  -- Campos CT-e específicos
  tipo_servico text DEFAULT '0',
  finalidade_cte text DEFAULT '0',
  cfop text DEFAULT '5352',
  
  -- Campos de localização
  cidade_inicio_ibge text,
  cidade_termino_ibge text,
  uf_inicio text,
  uf_termino text,
  cidade_inicio_nome text,
  cidade_termino_nome text,
  
  -- Campos de transporte
  rntrc text,
  motorista_nome text,
  motorista_cnh text,
  motorista_matricula text,
  motorista_validade_cnh text,
  placa_veiculo text,
  placa_reboque text,
  associacao_frota_id uuid,
  
  -- Campos de arquivos
  xml_proc_path text,
  xml_path text,
  pdf_path text,
  xml_gerado boolean DEFAULT false,
  pdf_gerado boolean DEFAULT false,
  xml_gerado_em timestamptz,
  pdf_gerado_em timestamptz,
  
  -- Campos de auditoria
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar foreign keys
ALTER TABLE cte_documentos 
ADD CONSTRAINT cte_documentos_empresa_id_fkey 
FOREIGN KEY (empresa_id) REFERENCES empresas_fiscais(id) ON DELETE CASCADE;

ALTER TABLE cte_documentos 
ADD CONSTRAINT cte_documentos_tomador_id_fkey 
FOREIGN KEY (tomador_id) REFERENCES cadastros(id) ON DELETE SET NULL;

ALTER TABLE cte_documentos 
ADD CONSTRAINT cte_documentos_remetente_id_fkey 
FOREIGN KEY (remetente_id) REFERENCES cadastros(id) ON DELETE SET NULL;

ALTER TABLE cte_documentos 
ADD CONSTRAINT cte_documentos_recebedor_id_fkey 
FOREIGN KEY (recebedor_id) REFERENCES cadastros(id) ON DELETE SET NULL;

ALTER TABLE cte_documentos 
ADD CONSTRAINT cte_documentos_destinatario_id_fkey 
FOREIGN KEY (destinatario_id) REFERENCES cadastros(id) ON DELETE SET NULL;

ALTER TABLE cte_documentos 
ADD CONSTRAINT cte_documentos_produto_predominante_id_fkey 
FOREIGN KEY (produto_predominante_id) REFERENCES cte_produtos(id) ON DELETE SET NULL;

-- Adicionar FK para associacao_frota_id se a tabela existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'associacoes_frota') THEN
    ALTER TABLE cte_documentos 
    ADD CONSTRAINT cte_documentos_associacao_frota_id_fkey 
    FOREIGN KEY (associacao_frota_id) REFERENCES associacoes_frota(id) ON DELETE SET NULL;
    RAISE NOTICE 'FK cte_documentos -> associacoes_frota adicionada';
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX idx_cte_documentos_empresa_id ON cte_documentos(empresa_id);
CREATE INDEX idx_cte_documentos_numero_serie ON cte_documentos(empresa_id, numero_cte, serie);
CREATE INDEX idx_cte_documentos_data_emissao ON cte_documentos(data_emissao);
CREATE INDEX idx_cte_documentos_status ON cte_documentos(status);
CREATE INDEX idx_cte_documentos_chave_acesso ON cte_documentos(chave_acesso);
CREATE INDEX idx_cte_documentos_tomador_id ON cte_documentos(tomador_id);
CREATE INDEX idx_cte_documentos_remetente_id ON cte_documentos(remetente_id);
CREATE INDEX idx_cte_documentos_recebedor_id ON cte_documentos(recebedor_id);
CREATE INDEX idx_cte_documentos_destinatario_id ON cte_documentos(destinatario_id);
CREATE INDEX idx_cte_documentos_produto_predominante_id ON cte_documentos(produto_predominante_id);
CREATE INDEX idx_cte_documentos_cidade_inicio ON cte_documentos(cidade_inicio_ibge);
CREATE INDEX idx_cte_documentos_cidade_termino ON cte_documentos(cidade_termino_ibge);
CREATE INDEX idx_cte_documentos_rntrc ON cte_documentos(rntrc);
CREATE INDEX idx_cte_documentos_associacao_frota ON cte_documentos(associacao_frota_id);
CREATE INDEX idx_cte_documentos_motorista_cnh ON cte_documentos(motorista_cnh);
CREATE INDEX idx_cte_documentos_cfop ON cte_documentos(cfop);
CREATE INDEX idx_cte_documentos_icms_situacao ON cte_documentos(icms_situacao_tributaria);
CREATE INDEX idx_cte_documentos_xml_gerado ON cte_documentos(xml_gerado);
CREATE INDEX idx_cte_documentos_pdf_gerado ON cte_documentos(pdf_gerado);
CREATE INDEX idx_cte_documentos_xml_path ON cte_documentos(xml_path);
CREATE INDEX idx_cte_documentos_pdf_path ON cte_documentos(pdf_path);

-- Adicionar comentários nas colunas
COMMENT ON TABLE cte_documentos IS 'Tabela para armazenar documentos CT-e (Conhecimento de Transporte Eletrônico)';
COMMENT ON COLUMN cte_documentos.id IS 'Identificador único do documento CT-e';
COMMENT ON COLUMN cte_documentos.empresa_id IS 'Referência para a empresa fiscal emitente';
COMMENT ON COLUMN cte_documentos.numero_cte IS 'Número do CT-e';
COMMENT ON COLUMN cte_documentos.serie IS 'Série do CT-e';
COMMENT ON COLUMN cte_documentos.data_emissao IS 'Data de emissão do CT-e';
COMMENT ON COLUMN cte_documentos.chave_acesso IS 'Chave de acesso completa de 44 dígitos';
COMMENT ON COLUMN cte_documentos.chave_acesso_1 IS 'Primeira parte da chave de acesso (43 dígitos)';
COMMENT ON COLUMN cte_documentos.chave_acesso_2 IS 'Segunda parte da chave de acesso (43 dígitos)';
COMMENT ON COLUMN cte_documentos.chave_acesso_3 IS 'Terceira parte da chave de acesso (43 dígitos)';
COMMENT ON COLUMN cte_documentos.chave_acesso_4 IS 'Quarta parte da chave de acesso (43 dígitos)';
COMMENT ON COLUMN cte_documentos.codigo_uf IS 'Código da Unidade Federativa';
COMMENT ON COLUMN cte_documentos.forma_emissao IS 'Forma de emissão do CT-e';
COMMENT ON COLUMN cte_documentos.codigo_numerico IS 'Código numérico que compõe a chave de acesso';
COMMENT ON COLUMN cte_documentos.dv IS 'Dígito verificador da chave de acesso';
COMMENT ON COLUMN cte_documentos.status IS 'Status do documento CT-e';
COMMENT ON COLUMN cte_documentos.observacoes IS 'Observações gerais do CT-e';
COMMENT ON COLUMN cte_documentos.tomador_id IS 'Referência para o tomador do serviço';
COMMENT ON COLUMN cte_documentos.remetente_id IS 'Referência para o remetente da carga';
COMMENT ON COLUMN cte_documentos.recebedor_id IS 'Referência para o recebedor da carga';
COMMENT ON COLUMN cte_documentos.destinatario_id IS 'Referência para o destinatário da carga';
COMMENT ON COLUMN cte_documentos.valor_prestacao IS 'Valor da prestação do serviço';
COMMENT ON COLUMN cte_documentos.valor_receber IS 'Valor a receber';
COMMENT ON COLUMN cte_documentos.valor_tributos IS 'Valor total dos tributos';
COMMENT ON COLUMN cte_documentos.icms_situacao_tributaria IS 'Situação tributária do ICMS';
COMMENT ON COLUMN cte_documentos.icms_bc_valor IS 'Base de cálculo do ICMS';
COMMENT ON COLUMN cte_documentos.icms_aliquota IS 'Alíquota do ICMS';
COMMENT ON COLUMN cte_documentos.icms_valor IS 'Valor do ICMS';
COMMENT ON COLUMN cte_documentos.valor_carga IS 'Valor da carga transportada';
COMMENT ON COLUMN cte_documentos.quantidade_carga IS 'Quantidade da carga transportada';
COMMENT ON COLUMN cte_documentos.produto_predominante_id IS 'Referência para o produto predominante';
COMMENT ON COLUMN cte_documentos.tipo_servico IS 'Tipo de serviço de transporte';
COMMENT ON COLUMN cte_documentos.finalidade_cte IS 'Finalidade da emissão do CT-e';
COMMENT ON COLUMN cte_documentos.cfop IS 'Código Fiscal de Operações e Prestações';
COMMENT ON COLUMN cte_documentos.cidade_inicio_ibge IS 'Código IBGE da cidade de início da prestação';
COMMENT ON COLUMN cte_documentos.cidade_termino_ibge IS 'Código IBGE da cidade de término da prestação';
COMMENT ON COLUMN cte_documentos.uf_inicio IS 'UF de início da prestação';
COMMENT ON COLUMN cte_documentos.uf_termino IS 'UF de término da prestação';
COMMENT ON COLUMN cte_documentos.cidade_inicio_nome IS 'Nome da cidade de início da prestação';
COMMENT ON COLUMN cte_documentos.cidade_termino_nome IS 'Nome da cidade de término da prestação';
COMMENT ON COLUMN cte_documentos.rntrc IS 'Registro Nacional de Transportadores Rodoviários de Carga';
COMMENT ON COLUMN cte_documentos.motorista_nome IS 'Nome do motorista responsável';
COMMENT ON COLUMN cte_documentos.motorista_cnh IS 'Número da CNH do motorista';
COMMENT ON COLUMN cte_documentos.motorista_matricula IS 'Matrícula do motorista na empresa';
COMMENT ON COLUMN cte_documentos.motorista_validade_cnh IS 'Data de validade da CNH do motorista';
COMMENT ON COLUMN cte_documentos.placa_veiculo IS 'Placa do veículo principal';
COMMENT ON COLUMN cte_documentos.placa_reboque IS 'Placa(s) do(s) reboque(s)/implemento(s)';
COMMENT ON COLUMN cte_documentos.associacao_frota_id IS 'Referência para a associação de frota (motorista + veículos)';
COMMENT ON COLUMN cte_documentos.xml_proc_path IS 'Caminho do arquivo XML processado';
COMMENT ON COLUMN cte_documentos.xml_path IS 'Caminho do arquivo XML original';
COMMENT ON COLUMN cte_documentos.pdf_path IS 'Caminho do arquivo PDF (DACTE)';
COMMENT ON COLUMN cte_documentos.xml_gerado IS 'Indica se o XML foi gerado';
COMMENT ON COLUMN cte_documentos.pdf_gerado IS 'Indica se o PDF foi gerado';
COMMENT ON COLUMN cte_documentos.xml_gerado_em IS 'Data e hora da geração do XML';
COMMENT ON COLUMN cte_documentos.pdf_gerado_em IS 'Data e hora da geração do PDF';

-- Restaurar dados do backup se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cte_documentos_backup') THEN
    -- Inserir dados do backup na nova tabela
    INSERT INTO cte_documentos (
      id, empresa_id, numero_cte, serie, data_emissao, chave_acesso, codigo_uf, 
      forma_emissao, codigo_numerico, dv, status, observacoes, 
      tomador_id, remetente_id, recebedor_id, destinatario_id,
      valor_prestacao, valor_receber, valor_tributos,
      icms_situacao_tributaria, icms_bc_valor, icms_aliquota, icms_valor,
      valor_carga, quantidade_carga, produto_predominante_id,
      chave_acesso_1, chave_acesso_2, chave_acesso_3, chave_acesso_4,
      tipo_servico, finalidade_cte, cfop,
      cidade_inicio_ibge, cidade_termino_ibge, uf_inicio, uf_termino,
      cidade_inicio_nome, cidade_termino_nome,
      rntrc, motorista_nome, motorista_cnh, motorista_matricula, motorista_validade_cnh,
      placa_veiculo, placa_reboque, associacao_frota_id,
      xml_proc_path, xml_path, pdf_path, xml_gerado, pdf_gerado,
      xml_gerado_em, pdf_gerado_em, created_at, updated_at
    )
    SELECT 
      COALESCE(id, gen_random_uuid()),
      empresa_id,
      numero_cte,
      COALESCE(serie, '001'),
      data_emissao,
      chave_acesso,
      COALESCE(codigo_uf, '35'),
      COALESCE(forma_emissao, 1),
      codigo_numerico,
      dv,
      COALESCE(status::text::cte_status, 'pendente'),
      observacoes,
      tomador_id,
      remetente_id,
      recebedor_id,
      destinatario_id,
      valor_prestacao,
      valor_receber,
      valor_tributos,
      icms_situacao_tributaria,
      icms_bc_valor,
      icms_aliquota,
      icms_valor,
      valor_carga,
      quantidade_carga,
      produto_predominante_id,
      chave_acesso_1,
      chave_acesso_2,
      chave_acesso_3,
      chave_acesso_4,
      COALESCE(tipo_servico, '0'),
      COALESCE(finalidade_cte, '0'),
      COALESCE(cfop, '5352'),
      cidade_inicio_ibge,
      cidade_termino_ibge,
      uf_inicio,
      uf_termino,
      cidade_inicio_nome,
      cidade_termino_nome,
      rntrc,
      motorista_nome,
      motorista_cnh,
      motorista_matricula,
      motorista_validade_cnh,
      placa_veiculo,
      placa_reboque,
      associacao_frota_id,
      xml_proc_path,
      xml_path,
      pdf_path,
      COALESCE(xml_gerado, false),
      COALESCE(pdf_gerado, false),
      xml_gerado_em,
      pdf_gerado_em,
      COALESCE(created_at, now()),
      COALESCE(updated_at, now())
    FROM cte_documentos_backup;
    
    -- Remover tabela de backup
    DROP TABLE cte_documentos_backup;
    RAISE NOTICE 'Dados restaurados do backup e tabela de backup removida';
  END IF;
END $$;

-- Função para gerar paths dos arquivos automaticamente
CREATE OR REPLACE FUNCTION generate_cte_document_paths()
RETURNS TRIGGER AS $$
DECLARE
  empresa_path text;
  chave_cte text;
BEGIN
  -- Buscar path base da empresa
  SELECT COALESCE(path_arquivos, '/uploads/fiscal/' || id::text) INTO empresa_path
  FROM empresas_fiscais
  WHERE id = NEW.empresa_id;
  
  -- SEMPRE usar a chave de acesso do CT-e (nunca usar número e série)
  IF NEW.chave_acesso IS NOT NULL AND LENGTH(NEW.chave_acesso) = 44 THEN
    chave_cte := NEW.chave_acesso;
    
    -- Gerar paths usando formato correto com chave de acesso do CT-e
    IF NEW.xml_path IS NULL THEN
      NEW.xml_path := empresa_path || '/cte/' || chave_cte || '-cte.xml';
    END IF;
    
    IF NEW.pdf_path IS NULL THEN
      NEW.pdf_path := empresa_path || '/cte/' || chave_cte || '-dacte.pdf';
    END IF;
    
    IF NEW.xml_proc_path IS NULL THEN
      NEW.xml_proc_path := empresa_path || '/cte/' || chave_cte || '-procCTe.xml';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar paths automaticamente
DROP TRIGGER IF EXISTS generate_cte_paths ON cte_documentos;
CREATE TRIGGER generate_cte_paths
  BEFORE INSERT OR UPDATE ON cte_documentos
  FOR EACH ROW
  EXECUTE FUNCTION generate_cte_document_paths();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_cte_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cte_updated_at ON cte_documentos;
CREATE TRIGGER update_cte_updated_at
  BEFORE UPDATE ON cte_documentos
  FOR EACH ROW
  EXECUTE FUNCTION update_cte_updated_at();

RAISE NOTICE 'Tabela cte_documentos recriada com sucesso com todos os campos necessários';
