/*
  # Verificar e corrigir estrutura da tabela postos

  1. Verificação da estrutura atual
    - Verificar quais colunas existem na tabela postos
    - Adicionar colunas faltantes se necessário
    - Garantir tipos de dados corretos

  2. Colunas necessárias
    - id (uuid, primary key)
    - nome (text, not null)
    - endereco (text)
    - cidade (text)
    - estado (text)
    - cep (text)
    - telefone (text, nullable)
    - cnpj (text, nullable)
    - ativo (boolean, default true)
    - created_at (timestamptz)
    - updated_at (timestamptz)

  3. Segurança
    - Usar IF NOT EXISTS para evitar erros
    - Preservar dados existentes
    - Adicionar valores padrão para registros existentes
*/

-- Verificar se a tabela postos existe, se não, criar
CREATE TABLE IF NOT EXISTS postos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  endereco text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar coluna cidade se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'postos' AND column_name = 'cidade'
  ) THEN
    ALTER TABLE postos ADD COLUMN cidade text DEFAULT 'Não informado';
    RAISE NOTICE 'Coluna cidade adicionada à tabela postos';
  ELSE
    RAISE NOTICE 'Coluna cidade já existe na tabela postos';
  END IF;
END $$;

-- Adicionar coluna estado se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'postos' AND column_name = 'estado'
  ) THEN
    ALTER TABLE postos ADD COLUMN estado text DEFAULT 'SP';
    RAISE NOTICE 'Coluna estado adicionada à tabela postos';
  ELSE
    RAISE NOTICE 'Coluna estado já existe na tabela postos';
  END IF;
END $$;

-- Adicionar coluna cep se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'postos' AND column_name = 'cep'
  ) THEN
    ALTER TABLE postos ADD COLUMN cep text DEFAULT '00000-000';
    RAISE NOTICE 'Coluna cep adicionada à tabela postos';
  ELSE
    RAISE NOTICE 'Coluna cep já existe na tabela postos';
  END IF;
END $$;

-- Adicionar coluna telefone se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'postos' AND column_name = 'telefone'
  ) THEN
    ALTER TABLE postos ADD COLUMN telefone text;
    RAISE NOTICE 'Coluna telefone adicionada à tabela postos';
  ELSE
    RAISE NOTICE 'Coluna telefone já existe na tabela postos';
  END IF;
END $$;

-- Adicionar coluna cnpj se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'postos' AND column_name = 'cnpj'
  ) THEN
    ALTER TABLE postos ADD COLUMN cnpj text;
    RAISE NOTICE 'Coluna cnpj adicionada à tabela postos';
  ELSE
    RAISE NOTICE 'Coluna cnpj já existe na tabela postos';
  END IF;
END $$;

-- Adicionar coluna ativo se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'postos' AND column_name = 'ativo'
  ) THEN
    ALTER TABLE postos ADD COLUMN ativo boolean DEFAULT true;
    RAISE NOTICE 'Coluna ativo adicionada à tabela postos';
  ELSE
    RAISE NOTICE 'Coluna ativo já existe na tabela postos';
  END IF;
END $$;

-- Adicionar coluna updated_at se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'postos' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE postos ADD COLUMN updated_at timestamptz DEFAULT now();
    RAISE NOTICE 'Coluna updated_at adicionada à tabela postos';
  ELSE
    RAISE NOTICE 'Coluna updated_at já existe na tabela postos';
  END IF;
END $$;

-- Atualizar registros existentes que podem ter campos vazios ou nulos
UPDATE postos 
SET 
  endereco = COALESCE(NULLIF(endereco, ''), 'Endereço não informado'),
  cidade = COALESCE(NULLIF(cidade, ''), 'Não informado'),
  estado = COALESCE(NULLIF(estado, ''), 'SP'),
  cep = COALESCE(NULLIF(cep, ''), '00000-000'),
  ativo = COALESCE(ativo, true),
  updated_at = COALESCE(updated_at, now())
WHERE 
  endereco IS NULL OR endereco = '' OR
  cidade IS NULL OR cidade = '' OR
  estado IS NULL OR estado = '' OR
  cep IS NULL OR cep = '' OR
  ativo IS NULL OR
  updated_at IS NULL;

-- Verificar estrutura final da tabela
DO $$
DECLARE
  column_record RECORD;
  column_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== ESTRUTURA FINAL DA TABELA POSTOS ===';
  
  FOR column_record IN 
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'postos' 
    ORDER BY ordinal_position
  LOOP
    column_count := column_count + 1;
    RAISE NOTICE 'Coluna %: % (tipo: %, nulo: %, padrão: %)', 
      column_count, 
      column_record.column_name, 
      column_record.data_type, 
      column_record.is_nullable,
      COALESCE(column_record.column_default, 'nenhum');
  END LOOP;
  
  RAISE NOTICE 'Total de colunas na tabela postos: %', column_count;
  
  -- Verificar se temos registros
  SELECT COUNT(*) INTO column_count FROM postos;
  RAISE NOTICE 'Total de registros na tabela postos: %', column_count;
  
  RAISE NOTICE '=== VERIFICAÇÃO CONCLUÍDA ===';
END $$;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_postos_nome ON postos(nome);
CREATE INDEX IF NOT EXISTS idx_postos_cidade_estado ON postos(cidade, estado);
CREATE INDEX IF NOT EXISTS idx_postos_ativo ON postos(ativo);