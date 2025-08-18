/*
  # Corrigir estrutura das tabelas para resolver erros 500

  1. Verificar e criar tabela veiculos se não existir
  2. Verificar e corrigir estrutura da tabela cadastros
  3. Garantir que os tipos de dados estejam corretos
  4. Adicionar dados de exemplo se necessário
*/

-- Verificar se a tabela veiculos existe, se não, criar
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'veiculos') THEN
    CREATE TABLE veiculos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      placa varchar(10) NOT NULL UNIQUE,
      modelo varchar(100) NOT NULL,
      marca varchar(50),
      ano integer,
      cor varchar(30),
      combustivel varchar(20) DEFAULT 'gasolina',
      ativo boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    -- Inserir alguns veículos de exemplo
    INSERT INTO veiculos (placa, modelo, marca, ano, cor, combustivel) VALUES
    ('ABC-1234', 'Civic', 'Honda', 2020, 'Branco', 'gasolina'),
    ('DEF-5678', 'Corolla', 'Toyota', 2021, 'Prata', 'gasolina'),
    ('GHI-9012', 'Hilux', 'Toyota', 2019, 'Preto', 'diesel');
    
    RAISE NOTICE 'Tabela veiculos criada com dados de exemplo';
  ELSE
    -- Verificar se as colunas necessárias existem
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'placa') THEN
      ALTER TABLE veiculos ADD COLUMN placa varchar(10) NOT NULL DEFAULT 'SEM-PLACA';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'modelo') THEN
      ALTER TABLE veiculos ADD COLUMN modelo varchar(100) NOT NULL DEFAULT 'Modelo não informado';
    END IF;
    
    RAISE NOTICE 'Tabela veiculos verificada e atualizada';
  END IF;
END $$;

-- Verificar se a tabela cadastros existe e tem a estrutura correta
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cadastros') THEN
    CREATE TABLE cadastros (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tipo varchar(20) NOT NULL CHECK (tipo IN ('cliente', 'fornecedor', 'abastecimento')),
      razao_social varchar(200) NOT NULL,
      cnpj varchar(18),
      ie varchar(20),
      endereco text NOT NULL,
      cidade varchar(100) NOT NULL,
      estado varchar(2) NOT NULL DEFAULT 'SP',
      cep varchar(10) NOT NULL,
      telefone varchar(20),
      emails jsonb DEFAULT '[]'::jsonb,
      ativo boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    -- Inserir alguns postos de exemplo
    INSERT INTO cadastros (tipo, razao_social, endereco, cidade, estado, cep, telefone, emails) VALUES
    ('abastecimento', 'Posto Shell Centro', 'Rua Principal, 123', 'São Paulo', 'SP', '01000-000', '(11) 1234-5678', '["contato@shell.com"]'),
    ('abastecimento', 'Posto Ipiranga Norte', 'Av. Paulista, 456', 'São Paulo', 'SP', '01310-000', '(11) 8765-4321', '["info@ipiranga.com"]'),
    ('abastecimento', 'Posto BR Sul', 'Rua das Flores, 789', 'São Paulo', 'SP', '04000-000', '(11) 5555-0000', '["atendimento@br.com"]');
    
    RAISE NOTICE 'Tabela cadastros criada com dados de exemplo';
  ELSE
    -- Verificar se as colunas necessárias existem
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'cadastros' AND column_name = 'tipo') THEN
      ALTER TABLE cadastros ADD COLUMN tipo varchar(20) NOT NULL DEFAULT 'cliente' CHECK (tipo IN ('cliente', 'fornecedor', 'abastecimento'));
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'cadastros' AND column_name = 'razao_social') THEN
      ALTER TABLE cadastros ADD COLUMN razao_social varchar(200) NOT NULL DEFAULT 'Razão Social não informada';
    END IF;
    
    RAISE NOTICE 'Tabela cadastros verificada e atualizada';
  END IF;
END $$;

-- Verificar se a tabela usuarios existe para os operadores
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usuarios') THEN
    CREATE TABLE usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome varchar(100) NOT NULL,
      email varchar(100) UNIQUE NOT NULL,
      senha varchar(255) NOT NULL,
      role varchar(20) DEFAULT 'user',
      ativo boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    -- Inserir um usuário de exemplo
    INSERT INTO usuarios (nome, email, senha, role) VALUES
    ('Operador Teste', 'operador@teste.com', '$2a$10$example', 'user');
    
    RAISE NOTICE 'Tabela usuarios criada com dados de exemplo';
  END IF;
END $$;

-- Verificar se a tabela abastecimentos existe e tem a estrutura correta
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'abastecimentos') THEN
    CREATE TABLE abastecimentos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      veiculo_id uuid NOT NULL,
      operador_id uuid NOT NULL,
      posto_id uuid NOT NULL,
      tipo_combustivel varchar(20) NOT NULL CHECK (tipo_combustivel IN ('gasolina', 'diesel', 'etanol', 'gnv')),
      litros decimal(10,3) NOT NULL,
      valor_total decimal(10,2) NOT NULL,
      data_abastecimento timestamptz NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      FOREIGN KEY (veiculo_id) REFERENCES veiculos(id),
      FOREIGN KEY (operador_id) REFERENCES usuarios(id),
      FOREIGN KEY (posto_id) REFERENCES cadastros(id)
    );
    
    RAISE NOTICE 'Tabela abastecimentos criada';
  ELSE
    -- Verificar se o posto_id é UUID
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'abastecimentos' 
      AND column_name = 'posto_id' 
      AND data_type != 'uuid'
    ) THEN
      -- Remover foreign keys antigas
      ALTER TABLE abastecimentos DROP CONSTRAINT IF EXISTS abastecimentos_posto_id_fkey;
      
      -- Converter para UUID se necessário
      ALTER TABLE abastecimentos ALTER COLUMN posto_id TYPE uuid USING posto_id::uuid;
      
      -- Adicionar nova foreign key
      ALTER TABLE abastecimentos ADD CONSTRAINT abastecimentos_posto_id_fkey 
        FOREIGN KEY (posto_id) REFERENCES cadastros(id);
      
      RAISE NOTICE 'Campo posto_id convertido para UUID';
    END IF;
  END IF;
END $$;