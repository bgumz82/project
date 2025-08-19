/*
  # Sistema de Chave de Acesso para Documentos Fiscais

  1. Estrutura da Chave de Acesso (44 dígitos)
    - Código UF (2 dígitos)
    - Data emissão AAMM (4 dígitos)
    - CNPJ emitente (14 dígitos)
    - Modelo documento (2 dígitos: 57=CTe, 58=MDFe)
    - Série (3 dígitos)
    - Número documento (9 dígitos)
    - Forma emissão (1 dígito: 1=normal, 8=contingência)
    - Código numérico (8 dígitos aleatórios)
    - Dígito verificador (1 dígito - Módulo 11)

  2. Nomes de Arquivos
    - CTe: {chave_acesso}-procCTe.xml, {chave_acesso}-cte.xml, {chave_acesso}-dacte.pdf
    - MDFe: {chave_acesso}-procMDFe.xml, {chave_acesso}-mdfe.xml, {chave_acesso}-damdfe.pdf

  3. Novas Colunas
    - chave_acesso (text, 44 caracteres)
    - codigo_uf (text, 2 dígitos)
    - forma_emissao (integer, 1 ou 8)
    - codigo_numerico (text, 8 dígitos)
    - dv (text, 1 dígito)
*/

-- Garantir extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar enum para status de empresa fiscal se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'empresa_fiscal_status') THEN
    CREATE TYPE empresa_fiscal_status AS ENUM ('ativo', 'inativo', 'suspenso');
  END IF;
END $$;

-- Criar enum para status de documentos CT-e se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cte_status') THEN
    CREATE TYPE cte_status AS ENUM ('pendente', 'emitido', 'cancelado');
  END IF;
END $$;

-- Criar enum para status de documentos MDF-e se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mdfe_status') THEN
    CREATE TYPE mdfe_status AS ENUM ('pendente', 'emitido', 'cancelado', 'encerrado');
  END IF;
END $$;

-- Criar tabela de empresas fiscais
CREATE TABLE IF NOT EXISTS empresas_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  cnpj text NOT NULL,
  ie text,
  endereco_completo text NOT NULL,
  codigo_uf text NOT NULL DEFAULT '35', -- SP por padrão
  rntrc text,
  status empresa_fiscal_status DEFAULT 'ativo',
  proximo_numero_cte integer DEFAULT 1,
  proximo_numero_mdfe integer DEFAULT 1,
  serie_padrao_cte text DEFAULT '001',
  serie_padrao_mdfe text DEFAULT '001',
  path_arquivos text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de documentos CT-e
CREATE TABLE IF NOT EXISTS cte_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  numero_cte text NOT NULL,
  serie text NOT NULL DEFAULT '001',
  data_emissao date NOT NULL,
  chave_acesso text,
  codigo_uf text NOT NULL DEFAULT '35',
  forma_emissao integer DEFAULT 1,
  codigo_numerico text,
  dv text,
  status cte_status DEFAULT 'pendente',
  observacoes text,
  xml_proc_path text,
  xml_path text,
  pdf_path text,
  xml_gerado boolean DEFAULT false,
  pdf_gerado boolean DEFAULT false,
  xml_gerado_em timestamptz,
  pdf_gerado_em timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de documentos MDF-e
CREATE TABLE IF NOT EXISTS mdfe_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  numero_mdfe text NOT NULL,
  serie text NOT NULL DEFAULT '001',
  data_emissao date NOT NULL,
  chave_acesso text,
  codigo_uf text NOT NULL DEFAULT '35',
  forma_emissao integer DEFAULT 1,
  codigo_numerico text,
  dv text,
  status mdfe_status DEFAULT 'pendente',
  observacoes text,
  xml_proc_path text,
  xml_path text,
  pdf_path text,
  xml_gerado boolean DEFAULT false,
  pdf_gerado boolean DEFAULT false,
  xml_gerado_em timestamptz,
  pdf_gerado_em timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'cte_documentos_empresa_id_fkey' 
    AND table_name = 'cte_documentos'
  ) THEN
    ALTER TABLE cte_documentos 
    ADD CONSTRAINT cte_documentos_empresa_id_fkey 
    FOREIGN KEY (empresa_id) REFERENCES empresas_fiscais(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mdfe_documentos_empresa_id_fkey' 
    AND table_name = 'mdfe_documentos'
  ) THEN
    ALTER TABLE mdfe_documentos 
    ADD CONSTRAINT mdfe_documentos_empresa_id_fkey 
    FOREIGN KEY (empresa_id) REFERENCES empresas_fiscais(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Função para calcular dígito verificador (Módulo 11)
CREATE OR REPLACE FUNCTION calcular_dv_modulo11(chave_sem_dv text)
RETURNS text AS $$
DECLARE
  soma integer := 0;
  peso integer := 2;
  i integer;
  digito integer;
  resto integer;
  dv integer;
BEGIN
  -- Processar cada dígito da direita para esquerda
  FOR i IN REVERSE length(chave_sem_dv) .. 1 LOOP
    digito := substring(chave_sem_dv from i for 1)::integer;
    soma := soma + (digito * peso);
    peso := peso + 1;
    
    -- Reiniciar peso quando chegar a 10
    IF peso > 9 THEN
      peso := 2;
    END IF;
  END LOOP;
  
  -- Calcular resto da divisão por 11
  resto := soma % 11;
  
  -- Calcular DV
  IF resto < 2 THEN
    dv := 0;
  ELSE
    dv := 11 - resto;
  END IF;
  
  RETURN dv::text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para gerar código numérico aleatório (8 dígitos)
CREATE OR REPLACE FUNCTION gerar_codigo_numerico()
RETURNS text AS $$
BEGIN
  RETURN LPAD(floor(random() * 100000000)::text, 8, '0');
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Função para gerar chave de acesso completa
CREATE OR REPLACE FUNCTION gerar_chave_acesso(
  codigo_uf_param text,
  data_emissao_param date,
  cnpj_param text,
  modelo_param text,
  serie_param text,
  numero_param text,
  forma_emissao_param integer,
  codigo_numerico_param text DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  cnpj_limpo text;
  aamm text;
  chave_sem_dv text;
  codigo_numerico_final text;
  dv_calculado text;
  chave_completa text;
BEGIN
  -- Limpar CNPJ (apenas números)
  cnpj_limpo := regexp_replace(cnpj_param, '[^0-9]', '', 'g');
  
  -- Validar CNPJ
  IF length(cnpj_limpo) != 14 THEN
    RAISE EXCEPTION 'CNPJ deve ter exatamente 14 dígitos';
  END IF;
  
  -- Extrair ano e mês da data de emissão (AAMM)
  aamm := to_char(data_emissao_param, 'YYMM');
  
  -- Gerar código numérico se não fornecido
  codigo_numerico_final := COALESCE(codigo_numerico_param, gerar_codigo_numerico());
  
  -- Montar chave sem DV (43 dígitos)
  chave_sem_dv := 
    LPAD(codigo_uf_param, 2, '0') ||           -- UF (2)
    aamm ||                                    -- AAMM (4)
    cnpj_limpo ||                             -- CNPJ (14)
    LPAD(modelo_param, 2, '0') ||             -- Modelo (2)
    LPAD(serie_param, 3, '0') ||              -- Série (3)
    LPAD(numero_param, 9, '0') ||             -- Número (9)
    forma_emissao_param::text ||              -- Forma emissão (1)
    codigo_numerico_final;                    -- Código numérico (8)
  
  -- Calcular dígito verificador
  dv_calculado := calcular_dv_modulo11(chave_sem_dv);
  
  -- Montar chave completa (44 dígitos)
  chave_completa := chave_sem_dv || dv_calculado;
  
  RETURN chave_completa;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para gerar paths dos arquivos baseados na chave de acesso
CREATE OR REPLACE FUNCTION generate_fiscal_document_paths()
RETURNS TRIGGER AS $$
DECLARE
  empresa_record RECORD;
  chave_acesso_gerada text;
  codigo_numerico_gerado text;
  dv_calculado text;
  base_path text;
  doc_type text;
BEGIN
  -- Buscar dados da empresa
  SELECT codigo_uf, cnpj, path_arquivos INTO empresa_record
  FROM empresas_fiscais
  WHERE id = NEW.empresa_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa fiscal não encontrada: %', NEW.empresa_id;
  END IF;
  
  -- Gerar código numérico se não fornecido
  IF NEW.codigo_numerico IS NULL THEN
    NEW.codigo_numerico := gerar_codigo_numerico();
  END IF;
  
  -- Definir código UF se não fornecido
  IF NEW.codigo_uf IS NULL THEN
    NEW.codigo_uf := empresa_record.codigo_uf;
  END IF;
  
  -- Gerar chave de acesso
  IF TG_TABLE_NAME = 'cte_documentos' THEN
    chave_acesso_gerada := gerar_chave_acesso(
      NEW.codigo_uf,
      NEW.data_emissao,
      empresa_record.cnpj,
      '57', -- Modelo CT-e
      NEW.serie,
      NEW.numero_cte,
      NEW.forma_emissao,
      NEW.codigo_numerico
    );
    doc_type := 'cte';
  ELSIF TG_TABLE_NAME = 'mdfe_documentos' THEN
    chave_acesso_gerada := gerar_chave_acesso(
      NEW.codigo_uf,
      NEW.data_emissao,
      empresa_record.cnpj,
      '58', -- Modelo MDF-e
      NEW.serie,
      NEW.numero_mdfe,
      NEW.forma_emissao,
      NEW.codigo_numerico
    );
    doc_type := 'mdfe';
  END IF;
  
  -- Atualizar chave de acesso e DV
  NEW.chave_acesso := chave_acesso_gerada;
  NEW.dv := right(chave_acesso_gerada, 1);
  
  -- Definir path base
  base_path := COALESCE(empresa_record.path_arquivos, '/uploads/fiscal/' || NEW.empresa_id);
  
  -- Gerar paths dos arquivos baseados na chave de acesso
  IF TG_TABLE_NAME = 'cte_documentos' THEN
    NEW.xml_proc_path := base_path || '/cte/' || chave_acesso_gerada || '-procCTe.xml';
    NEW.xml_path := base_path || '/cte/' || chave_acesso_gerada || '-cte.xml';
    NEW.pdf_path := base_path || '/cte/' || chave_acesso_gerada || '-dacte.pdf';
  ELSIF TG_TABLE_NAME = 'mdfe_documentos' THEN
    NEW.xml_proc_path := base_path || '/mdfe/' || chave_acesso_gerada || '-procMDFe.xml';
    NEW.xml_path := base_path || '/mdfe/' || chave_acesso_gerada || '-mdfe.xml';
    NEW.pdf_path := base_path || '/mdfe/' || chave_acesso_gerada || '-damdfe.pdf';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para gerar chave de acesso e paths automaticamente
DROP TRIGGER IF EXISTS generate_cte_access_key ON cte_documentos;
CREATE TRIGGER generate_cte_access_key
  BEFORE INSERT OR UPDATE ON cte_documentos
  FOR EACH ROW
  EXECUTE FUNCTION generate_fiscal_document_paths();

DROP TRIGGER IF EXISTS generate_mdfe_access_key ON mdfe_documentos;
CREATE TRIGGER generate_mdfe_access_key
  BEFORE INSERT OR UPDATE ON mdfe_documentos
  FOR EACH ROW
  EXECUTE FUNCTION generate_fiscal_document_paths();

-- Função para obter próximo número CT-e
CREATE OR REPLACE FUNCTION get_next_cte_number(empresa_id_param uuid)
RETURNS integer AS $$
DECLARE
  next_number integer;
BEGIN
  UPDATE empresas_fiscais 
  SET proximo_numero_cte = proximo_numero_cte + 1,
      updated_at = now()
  WHERE id = empresa_id_param
  RETURNING proximo_numero_cte - 1 INTO next_number;
  
  IF next_number IS NULL THEN
    RAISE EXCEPTION 'Empresa fiscal não encontrada: %', empresa_id_param;
  END IF;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter próximo número MDF-e
CREATE OR REPLACE FUNCTION get_next_mdfe_number(empresa_id_param uuid)
RETURNS integer AS $$
DECLARE
  next_number integer;
BEGIN
  UPDATE empresas_fiscais 
  SET proximo_numero_mdfe = proximo_numero_mdfe + 1,
      updated_at = now()
  WHERE id = empresa_id_param
  RETURNING proximo_numero_mdfe - 1 INTO next_number;
  
  IF next_number IS NULL THEN
    RAISE EXCEPTION 'Empresa fiscal não encontrada: %', empresa_id_param;
  END IF;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar constraints
DO $$
BEGIN
  -- CNPJ único por empresa
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'empresas_fiscais_cnpj_unique'
    AND table_name = 'empresas_fiscais'
  ) THEN
    ALTER TABLE empresas_fiscais ADD CONSTRAINT empresas_fiscais_cnpj_unique UNIQUE (cnpj);
  END IF;

  -- Chave de acesso única para CT-e
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'cte_documentos_chave_acesso_unique'
    AND table_name = 'cte_documentos'
  ) THEN
    ALTER TABLE cte_documentos ADD CONSTRAINT cte_documentos_chave_acesso_unique UNIQUE (chave_acesso);
  END IF;

  -- Chave de acesso única para MDF-e
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'mdfe_documentos_chave_acesso_unique'
    AND table_name = 'mdfe_documentos'
  ) THEN
    ALTER TABLE mdfe_documentos ADD CONSTRAINT mdfe_documentos_chave_acesso_unique UNIQUE (chave_acesso);
  END IF;

  -- Validação de chave de acesso (44 dígitos)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'cte_chave_acesso_length'
    AND table_name = 'cte_documentos'
  ) THEN
    ALTER TABLE cte_documentos ADD CONSTRAINT cte_chave_acesso_length 
    CHECK (chave_acesso IS NULL OR length(chave_acesso) = 44);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'mdfe_chave_acesso_length'
    AND table_name = 'mdfe_documentos'
  ) THEN
    ALTER TABLE mdfe_documentos ADD CONSTRAINT mdfe_chave_acesso_length 
    CHECK (chave_acesso IS NULL OR length(chave_acesso) = 44);
  END IF;

  -- Validação de forma de emissão
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'cte_forma_emissao_valid'
    AND table_name = 'cte_documentos'
  ) THEN
    ALTER TABLE cte_documentos ADD CONSTRAINT cte_forma_emissao_valid 
    CHECK (forma_emissao IN (1, 8));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'mdfe_forma_emissao_valid'
    AND table_name = 'mdfe_documentos'
  ) THEN
    ALTER TABLE mdfe_documentos ADD CONSTRAINT mdfe_forma_emissao_valid 
    CHECK (forma_emissao = 1);
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_empresas_fiscais_cnpj ON empresas_fiscais(cnpj);
CREATE INDEX IF NOT EXISTS idx_empresas_fiscais_status ON empresas_fiscais(status);
CREATE INDEX IF NOT EXISTS idx_empresas_fiscais_codigo_uf ON empresas_fiscais(codigo_uf);

CREATE INDEX IF NOT EXISTS idx_cte_documentos_empresa_id ON cte_documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_chave_acesso ON cte_documentos(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_data_emissao ON cte_documentos(data_emissao);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_status ON cte_documentos(status);
CREATE INDEX IF NOT EXISTS idx_cte_documentos_numero_serie ON cte_documentos(empresa_id, numero_cte, serie);

CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_empresa_id ON mdfe_documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_chave_acesso ON mdfe_documentos(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_data_emissao ON mdfe_documentos(data_emissao);
CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_status ON mdfe_documentos(status);
CREATE INDEX IF NOT EXISTS idx_mdfe_documentos_numero_serie ON mdfe_documentos(empresa_id, numero_mdfe, serie);

-- Inserir empresa fiscal de exemplo
INSERT INTO empresas_fiscais (
  razao_social,
  cnpj,
  ie,
  endereco_completo,
  codigo_uf,
  rntrc,
  status,
  proximo_numero_cte,
  proximo_numero_mdfe,
  serie_padrao_cte,
  serie_padrao_mdfe,
  path_arquivos
) VALUES (
  'Empresa Exemplo Ltda',
  '19660324000184',
  '123456789012',
  'Rua Exemplo, 123, Centro, São Paulo, SP, 01234-567',
  '35', -- SP
  '12345678',
  'ativo',
  1,
  1,
  '001',
  '001',
  '/uploads/fiscal/empresa_exemplo'
) ON CONFLICT (cnpj) DO NOTHING;

-- Adicionar permissões fiscais para administradores
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM usuarios WHERE tipo = 'admin'
  LOOP
    INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete)
    VALUES 
    (user_record.id, 'fiscal', true, true, true, true),
    (user_record.id, 'empresas_fiscais', true, true, true, true),
    (user_record.id, 'cte', true, true, true, true),
    (user_record.id, 'mdfe', true, true, true, true)
    ON CONFLICT (user_id, module) DO UPDATE SET
      can_access = true,
      can_create = true,
      can_edit = true,
      can_delete = true,
      updated_at = now();
  END LOOP;
  
  RAISE NOTICE 'Permissões fiscais adicionadas para administradores';
END $$;

-- Verificação final
DO $$
DECLARE
  empresas_count INTEGER;
  permissions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO empresas_count FROM empresas_fiscais;
  SELECT COUNT(*) INTO permissions_count FROM user_permissions WHERE module IN ('fiscal', 'empresas_fiscais', 'cte', 'mdfe');
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Empresas fiscais: %', empresas_count;
  RAISE NOTICE 'Permissões fiscais: %', permissions_count;
  RAISE NOTICE '✅ Sistema de chave de acesso implementado!';
  RAISE NOTICE '✅ Nomes de arquivos no formato correto!';
  RAISE NOTICE '✅ Cálculo de DV Módulo 11 implementado!';
END $$;