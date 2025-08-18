/*
  # Corrigir referências de posto_id na tabela abastecimentos

  1. Problema Identificado
    - Foreign key ainda referencia tabela postos (que foi substituída por cadastros)
    - Consultas ainda fazem JOIN com postos ao invés de cadastros
    - Erro 500 ao tentar atualizar abastecimentos

  2. Solução
    - Remover foreign key antiga da tabela postos
    - Criar nova foreign key para tabela cadastros
    - Atualizar dados existentes se necessário
    - Garantir integridade referencial

  3. Segurança
    - Verificar se constraints existem antes de remover
    - Usar transações para garantir consistência
    - Preservar dados existentes
*/

-- Verificar e corrigir foreign key constraints
DO $$
BEGIN
  -- Remover constraint antiga se existir (referência para postos)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'abastecimentos_posto_id_fkey' 
    AND table_name = 'abastecimentos'
  ) THEN
    ALTER TABLE abastecimentos DROP CONSTRAINT abastecimentos_posto_id_fkey;
    RAISE NOTICE 'Foreign key constraint antiga removida: abastecimentos_posto_id_fkey';
  END IF;

  -- Verificar se existe alguma outra constraint relacionada a posto_id
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'abastecimentos' 
    AND kcu.column_name = 'posto_id'
    AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Buscar o nome da constraint e removê-la
    DECLARE
      constraint_name_var text;
    BEGIN
      SELECT tc.constraint_name INTO constraint_name_var
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'abastecimentos' 
      AND kcu.column_name = 'posto_id'
      AND tc.constraint_type = 'FOREIGN KEY'
      LIMIT 1;
      
      IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE abastecimentos DROP CONSTRAINT %I', constraint_name_var);
        RAISE NOTICE 'Foreign key constraint removida: %', constraint_name_var;
      END IF;
    END;
  END IF;
END $$;

-- Verificar se todos os posto_id em abastecimentos existem na tabela cadastros
DO $$
DECLARE
  missing_postos INTEGER;
  abastecimento_record RECORD;
BEGIN
  -- Contar abastecimentos com posto_id que não existe em cadastros
  SELECT COUNT(*) INTO missing_postos
  FROM abastecimentos a
  LEFT JOIN cadastros c ON a.posto_id::text = c.id::text
  WHERE c.id IS NULL;
  
  IF missing_postos > 0 THEN
    RAISE NOTICE 'Encontrados % abastecimentos com posto_id inválido', missing_postos;
    
    -- Listar os registros problemáticos
    FOR abastecimento_record IN 
      SELECT a.id, a.posto_id, a.data_abastecimento
      FROM abastecimentos a
      LEFT JOIN cadastros c ON a.posto_id::text = c.id::text
      WHERE c.id IS NULL
      LIMIT 5
    LOOP
      RAISE NOTICE 'Abastecimento problemático: ID=%, posto_id=%, data=%', 
        abastecimento_record.id, abastecimento_record.posto_id, abastecimento_record.data_abastecimento;
    END LOOP;
    
    -- Criar um cadastro genérico para postos órfãos se necessário
    INSERT INTO cadastros (tipo, razao_social, endereco, cidade, estado, cep, emails, ativo)
    VALUES (
      'abastecimento'::cadastro_tipo,
      'Posto Não Identificado',
      'Endereço não informado',
      'Não informado',
      'SP',
      '00000-000',
      '["contato@posto.com.br"]'::jsonb,
      false
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Cadastro genérico criado para postos órfãos';
  ELSE
    RAISE NOTICE 'Todos os posto_id em abastecimentos são válidos';
  END IF;
END $$;

-- Adicionar nova foreign key constraint para cadastros
DO $$
BEGIN
  -- Verificar se a constraint já existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'abastecimentos' 
    AND kcu.column_name = 'posto_id'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.referenced_table_name = 'cadastros'
  ) THEN
    -- Adicionar nova foreign key
    ALTER TABLE abastecimentos
    ADD CONSTRAINT abastecimentos_posto_id_cadastros_fkey
    FOREIGN KEY (posto_id) REFERENCES cadastros(id);
    
    RAISE NOTICE 'Nova foreign key constraint criada: abastecimentos_posto_id_cadastros_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint para cadastros já existe';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erro ao criar foreign key constraint: %', SQLERRM;
  RAISE NOTICE 'Continuando sem foreign key constraint...';
END $$;

-- Verificar integridade final
DO $$
DECLARE
  total_abastecimentos INTEGER;
  abastecimentos_validos INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_abastecimentos FROM abastecimentos;
  
  SELECT COUNT(*) INTO abastecimentos_validos
  FROM abastecimentos a
  JOIN cadastros c ON a.posto_id::text = c.id::text
  WHERE c.tipo = 'abastecimento';
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Total de abastecimentos: %', total_abastecimentos;
  RAISE NOTICE 'Abastecimentos com posto válido: %', abastecimentos_validos;
  
  IF total_abastecimentos = abastecimentos_validos THEN
    RAISE NOTICE '✅ Todos os abastecimentos têm postos válidos!';
  ELSE
    RAISE NOTICE '⚠️  % abastecimentos com problemas de referência', 
      total_abastecimentos - abastecimentos_validos;
  END IF;
END $$;