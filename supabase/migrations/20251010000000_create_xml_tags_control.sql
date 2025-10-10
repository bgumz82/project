
-- Migration: Sistema de Controle de Tags XML para CT-e e MDF-e
-- Descrição: Permite gerenciar tags XML personalizadas por empresa

-- Criar enum para tipo de documento
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_documento_fiscal') THEN
    CREATE TYPE tipo_documento_fiscal AS ENUM ('cte', 'mdfe');
  END IF;
END $$;

-- Tabela de grupos de tags (para organização)
CREATE TABLE IF NOT EXISTS xml_tag_grupos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  tipo_documento tipo_documento_fiscal NOT NULL,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela principal de controle de tags XML
CREATE TABLE IF NOT EXISTS xml_tags_controle (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas_fiscais(id) ON DELETE CASCADE,
  tipo_documento tipo_documento_fiscal NOT NULL,
  grupo_id UUID REFERENCES xml_tag_grupos(id) ON DELETE SET NULL,
  tag_nome VARCHAR(100) NOT NULL,
  tag_path VARCHAR(500) NOT NULL, -- Caminho completo da tag no XML (ex: infCte/ide/cMunEnv)
  valor_padrao TEXT,
  obrigatoria BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, tipo_documento, tag_path)
);

-- Tabela de valores customizados por documento
CREATE TABLE IF NOT EXISTS xml_tags_valores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_controle_id UUID NOT NULL REFERENCES xml_tags_controle(id) ON DELETE CASCADE,
  documento_id UUID NOT NULL, -- ID do CT-e ou MDF-e
  tipo_documento tipo_documento_fiscal NOT NULL,
  valor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tag_controle_id, documento_id)
);

-- Tabela de templates de tags (pré-configurados)
CREATE TABLE IF NOT EXISTS xml_tags_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  tipo_documento tipo_documento_fiscal NOT NULL,
  tags_json JSONB NOT NULL, -- Array de tags com configurações
  publico BOOLEAN DEFAULT false, -- Se está disponível para todas as empresas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_xml_tags_controle_empresa ON xml_tags_controle(empresa_id);
CREATE INDEX IF NOT EXISTS idx_xml_tags_controle_tipo ON xml_tags_controle(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_xml_tags_controle_ativo ON xml_tags_controle(ativo);
CREATE INDEX IF NOT EXISTS idx_xml_tags_valores_documento ON xml_tags_valores(documento_id, tipo_documento);
CREATE INDEX IF NOT EXISTS idx_xml_tag_grupos_tipo ON xml_tag_grupos(tipo_documento);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_xml_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_xml_tags_controle_updated_at ON xml_tags_controle;
CREATE TRIGGER update_xml_tags_controle_updated_at
  BEFORE UPDATE ON xml_tags_controle
  FOR EACH ROW
  EXECUTE FUNCTION update_xml_tags_updated_at();

DROP TRIGGER IF EXISTS update_xml_tag_grupos_updated_at ON xml_tag_grupos;
CREATE TRIGGER update_xml_tag_grupos_updated_at
  BEFORE UPDATE ON xml_tag_grupos
  FOR EACH ROW
  EXECUTE FUNCTION update_xml_tags_updated_at();

-- Inserir grupos padrão para CT-e
INSERT INTO xml_tag_grupos (nome, descricao, tipo_documento, ordem) VALUES
  ('Identificação', 'Tags de identificação do documento', 'cte', 1),
  ('Emitente', 'Dados do emitente', 'cte', 2),
  ('Remetente', 'Dados do remetente', 'cte', 3),
  ('Destinatário', 'Dados do destinatário', 'cte', 4),
  ('Valores', 'Valores e impostos', 'cte', 5),
  ('Carga', 'Informações da carga', 'cte', 6),
  ('Transporte', 'Dados de transporte', 'cte', 7),
  ('Observações', 'Observações e dados complementares', 'cte', 8)
ON CONFLICT DO NOTHING;

-- Inserir grupos padrão para MDF-e
INSERT INTO xml_tag_grupos (nome, descricao, tipo_documento, ordem) VALUES
  ('Identificação', 'Tags de identificação do manifesto', 'mdfe', 1),
  ('Emitente', 'Dados do emitente', 'mdfe', 2),
  ('Percurso', 'Percurso e municípios', 'mdfe', 3),
  ('Veículos', 'Informações dos veículos', 'mdfe', 4),
  ('Condutores', 'Dados dos condutores', 'mdfe', 5),
  ('Documentos', 'Documentos vinculados', 'mdfe', 6),
  ('Totalizadores', 'Totais do manifesto', 'mdfe', 7)
ON CONFLICT DO NOTHING;

-- Comentários
COMMENT ON TABLE xml_tags_controle IS 'Controle de tags XML personalizadas por empresa';
COMMENT ON TABLE xml_tag_grupos IS 'Grupos organizacionais de tags XML';
COMMENT ON TABLE xml_tags_valores IS 'Valores customizados de tags por documento';
COMMENT ON TABLE xml_tags_templates IS 'Templates pré-configurados de tags XML';

-- Adicionar permissão para o módulo
INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete)
SELECT id, 'xml_tags_controle', true, true, true, true
FROM usuarios 
WHERE tipo = 'admin'
ON CONFLICT (user_id, module) DO UPDATE SET
  can_access = true,
  can_create = true,
  can_edit = true,
  can_delete = true;
