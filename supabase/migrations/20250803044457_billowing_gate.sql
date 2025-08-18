/*
  # Módulo de Registro ANTT

  1. Nova Tabela
    - `registros_antt`
      - `id` (uuid, primary key)
      - `veiculo_id` (uuid, foreign key para veiculos)
      - `cnpj` (text, not null)
      - `antt` (text, 8 dígitos, not null)
      - `razao_social_proprietario` (text, not null)
      - `inscricao_estadual` (text, nullable)
      - `uf_registro` (text, 2 caracteres, not null)
      - `empresa_proprietario` (boolean, not null)
      - `ativo` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Constraints
    - ANTT único
    - UF com 2 caracteres
    - ANTT com exatamente 8 dígitos
    - Foreign key para veículos

  3. Índices
    - Por veículo
    - Por ANTT
    - Por CNPJ
    - Por status ativo
*/

-- Criar tabela de registros ANTT
CREATE TABLE IF NOT EXISTS registros_antt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL,
  cnpj text NOT NULL,
  antt text NOT NULL,
  razao_social_proprietario text NOT NULL,
  inscricao_estadual text,
  uf_registro text NOT NULL,
  empresa_proprietario boolean NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar foreign key para veículos
ALTER TABLE registros_antt 
ADD CONSTRAINT registros_antt_veiculo_id_fkey 
FOREIGN KEY (veiculo_id) REFERENCES veiculos(id) ON DELETE CASCADE;

-- Adicionar constraints
ALTER TABLE registros_antt 
ADD CONSTRAINT registros_antt_antt_unique UNIQUE (antt);

ALTER TABLE registros_antt 
ADD CONSTRAINT registros_antt_antt_length CHECK (length(antt) = 8);

ALTER TABLE registros_antt 
ADD CONSTRAINT registros_antt_uf_length CHECK (length(uf_registro) = 2);

ALTER TABLE registros_antt 
ADD CONSTRAINT registros_antt_cnpj_format CHECK (length(cnpj) >= 14);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_registros_antt_veiculo_id ON registros_antt(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_registros_antt_antt ON registros_antt(antt);
CREATE INDEX IF NOT EXISTS idx_registros_antt_cnpj ON registros_antt(cnpj);
CREATE INDEX IF NOT EXISTS idx_registros_antt_ativo ON registros_antt(ativo);
CREATE INDEX IF NOT EXISTS idx_registros_antt_uf ON registros_antt(uf_registro);

-- Inserir alguns dados de exemplo
INSERT INTO registros_antt (veiculo_id, cnpj, antt, razao_social_proprietario, inscricao_estadual, uf_registro, empresa_proprietario, ativo)
SELECT 
  v.id,
  '12.345.678/0001-90',
  '12345678',
  'Empresa Exemplo Ltda',
  '123.456.789.012',
  'SP',
  true,
  true
FROM veiculos v
WHERE v.placa = 'ABC-1234'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Atualizar sistema de permissões para incluir o módulo antt
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Adicionar permissão de antt para todos os admins
  FOR user_record IN 
    SELECT id FROM usuarios WHERE tipo = 'admin'
  LOOP
    INSERT INTO user_permissions (user_id, module, can_access, can_create, can_edit, can_delete)
    VALUES (user_record.id, 'antt', true, true, true, true)
    ON CONFLICT (user_id, module) DO UPDATE SET
      can_access = true,
      can_create = true,
      can_edit = true,
      can_delete = true,
      updated_at = now();
  END LOOP;
  
  RAISE NOTICE 'Permissões do módulo ANTT adicionadas para todos os administradores';
END $$;