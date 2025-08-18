/*
  # Módulo de Cadastros - Fornecedores e Clientes

  1. Nova Tabela
    - `cadastros`
      - `id` (uuid, primary key)
      - `tipo` (enum: cliente, fornecedor, abastecimento)
      - `razao_social` (text, not null)
      - `cnpj` (text, unique)
      - `ie` (text, nullable)
      - `endereco` (text)
      - `cidade` (text)
      - `estado` (text, 2 caracteres)
      - `cep` (text)
      - `telefone` (text, nullable)
      - `emails` (jsonb, array de emails)
      - `ativo` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Índices
    - Por tipo de cadastro
    - Por CNPJ
    - Por cidade/estado
    - Por status ativo

  3. Constraints
    - CNPJ único quando não nulo
    - Estado com 2 caracteres
    - Tipo válido
    - Pelo menos um email no array
*/

-- Criar enum para tipo de cadastro
CREATE TYPE cadastro_tipo AS ENUM ('cliente', 'fornecedor', 'abastecimento');

-- Criar tabela de cadastros
CREATE TABLE IF NOT EXISTS cadastros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo cadastro_tipo NOT NULL,
  razao_social text NOT NULL,
  cnpj text,
  ie text,
  endereco text NOT NULL DEFAULT '',
  cidade text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'SP',
  cep text NOT NULL DEFAULT '',
  telefone text,
  emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar constraints
ALTER TABLE cadastros ADD CONSTRAINT cadastros_cnpj_unique 
  UNIQUE (cnpj) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE cadastros ADD CONSTRAINT cadastros_estado_length 
  CHECK (length(estado) = 2);

ALTER TABLE cadastros ADD CONSTRAINT cadastros_emails_not_empty 
  CHECK (jsonb_array_length(emails) > 0);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_cadastros_tipo ON cadastros(tipo);
CREATE INDEX IF NOT EXISTS idx_cadastros_cnpj ON cadastros(cnpj);
CREATE INDEX IF NOT EXISTS idx_cadastros_cidade_estado ON cadastros(cidade, estado);
CREATE INDEX IF NOT EXISTS idx_cadastros_ativo ON cadastros(ativo);
CREATE INDEX IF NOT EXISTS idx_cadastros_razao_social ON cadastros(razao_social);

-- Inserir alguns dados de exemplo
INSERT INTO cadastros (tipo, razao_social, cnpj, endereco, cidade, estado, cep, telefone, emails) VALUES
('abastecimento', 'Posto Shell Centro', '12.345.678/0001-90', 'Rua Principal, 123', 'São Paulo', 'SP', '01234-567', '(11) 1234-5678', '["contato@shell.com.br", "vendas@shell.com.br"]'),
('abastecimento', 'Posto Ipiranga Norte', '98.765.432/0001-10', 'Av. Norte, 456', 'São Paulo', 'SP', '02345-678', '(11) 9876-5432', '["atendimento@ipiranga.com.br"]'),
('fornecedor', 'Oficina Mecânica Silva', '11.222.333/0001-44', 'Rua das Flores, 789', 'São Paulo', 'SP', '03456-789', '(11) 1111-2222', '["contato@oficinasilva.com.br"]'),
('cliente', 'Empresa ABC Ltda', '55.666.777/0001-88', 'Av. Comercial, 321', 'São Paulo', 'SP', '04567-890', '(11) 5555-6666', '["financeiro@empresaabc.com.br", "compras@empresaabc.com.br"]');

-- Migrar dados dos postos existentes para cadastros
INSERT INTO cadastros (tipo, razao_social, cnpj, endereco, cidade, estado, cep, telefone, emails)
SELECT 
  'abastecimento'::cadastro_tipo,
  nome as razao_social,
  cnpj,
  COALESCE(endereco, 'Endereço não informado'),
  COALESCE(cidade, 'Não informado'),
  COALESCE(estado, 'SP'),
  COALESCE(cep, '00000-000'),
  telefone,
  CASE 
    WHEN telefone IS NOT NULL AND telefone != '' THEN 
      jsonb_build_array('contato@' || lower(replace(nome, ' ', '')) || '.com.br')
    ELSE 
      jsonb_build_array('contato@posto.com.br')
  END as emails
FROM postos
WHERE ativo = true
ON CONFLICT (cnpj) DO NOTHING;

-- Atualizar sistema de permissões para incluir o módulo cadastros
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Adicionar permissão de cadastros para todos os admins
  FOR user_record IN 
    SELECT id FROM usuarios WHERE tipo = 'admin'
  LOOP
    INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete)
    VALUES (user_record.id, 'cadastros', true, true, true, true)
    ON CONFLICT (user_id, module) DO UPDATE SET
      can_access = true,
      can_create = true,
      can_edit = true,
      can_delete = true,
      updated_at = now();
  END LOOP;
  
  RAISE NOTICE 'Permissões do módulo cadastros adicionadas para todos os administradores';
END $$;