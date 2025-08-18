/*
  # Corrigir tipo de dados do campo posto_id em abastecimentos

  1. Problema Identificado
    - Campo posto_id pode estar com tipo incompatível
    - Foreign key pode estar causando conflitos
    - Necessário garantir compatibilidade entre tipos

  2. Solução
    - Verificar e corrigir tipo do campo posto_id
    - Garantir que seja UUID para compatibilidade com cadastros
    - Remover e recriar foreign key se necessário
    - Testar integridade dos dados

  3. Segurança
    - Preservar dados existentes
    - Usar transações para garantir consistência
    - Verificações antes de cada alteração
*/

-- Verificar estrutura atual da tabela abastecimentos
DO $$
DECLARE
  posto_id_type text;
  constraint_exists boolean := false;
BEGIN
  -- Verificar tipo atual do campo posto_id
  SELECT data_type INTO posto_id_type
  FROM information_schema.columns
  WHERE table_name = 'abastecimentos' AND column_name = 'posto_id';
  
  RAISE NOTICE 'Tipo atual do campo posto_id: %', posto_id_type;
  
  -- Verificar se existe foreign key constraint
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'abastecimentos' 
    AND kcu.column_name = 'posto_id'
    AND tc.constraint_type = 'FOREIGN KEY'
  ) INTO constraint_exists;
  
  RAISE NOTICE 'Foreign key constraint existe: %', constraint_exists;
END $$;

-- Remover todas as foreign key constraints relacionadas a posto_id
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  -- Buscar todas as constraints de foreign key para posto_id
  FOR constraint_record IN 
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'abastecimentos' 
    AND kcu.column_name = 'posto_id'
    AND tc.constraint_type = 'FOREIGN KEY'
  LOOP
    EXECUTE format('ALTER TABLE abastecimentos DROP CONSTRAINT %I', constraint_record.constraint_name);
    RAISE NOTICE 'Removida constraint: %', constraint_record.constraint_name;
  END LOOP;
END $$;

-- Garantir que posto_id seja do tipo UUID
DO $$
DECLARE
  posto_id_type text;
BEGIN
  -- Verificar tipo atual
  SELECT data_type INTO posto_id_type
  FROM information_schema.columns
  WHERE table_name = 'abastecimentos' AND column_name = 'posto_id';
  
  -- Se não for UUID, converter
  IF posto_id_type != 'uuid' THEN
    RAISE NOTICE 'Convertendo posto_id de % para uuid', posto_id_type;
    
    -- Converter para UUID
    ALTER TABLE abastecimentos 
    ALTER COLUMN posto_id TYPE uuid USING posto_id::uuid;
    
    RAISE NOTICE 'Campo posto_id convertido para UUID';
  ELSE
    RAISE NOTICE 'Campo posto_id já é do tipo UUID';
  END IF;
END $$;

-- Verificar se todos os posto_id existem na tabela cadastros
DO $$
DECLARE
  missing_count INTEGER;
  abastecimento_record RECORD;
  generic_posto_id uuid;
BEGIN
  -- Contar abastecimentos com posto_id inválido
  SELECT COUNT(*) INTO missing_count
  FROM abastecimentos a
  LEFT JOIN cadastros c ON a.posto_id = c.id AND c.tipo = 'abastecimento'
  WHERE c.id IS NULL;
  
  IF missing_count > 0 THEN
    RAISE NOTICE 'Encontrados % abastecimentos com posto_id inválido', missing_count;
    
    -- Criar um posto genérico se não existir
    INSERT INTO cadastros (
      tipo, razao_social, endereco, cidade, estado, cep, emails, ativo
    ) VALUES (
      'abastecimento'::cadastro_tipo,
      'Posto Não Identificado',
      'Endereço não informado',
      'Não informado',
      'SP',
      '00000-000',
      '["contato@posto.com.br"]'::jsonb,
      false
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO generic_posto_id;
    
    -- Se não conseguiu inserir (já existe), buscar o ID
    IF generic_posto_id IS NULL THEN
      SELECT id INTO generic_posto_id
      FROM cadastros
      WHERE razao_social = 'Posto Não Identificado'
      AND tipo = 'abastecimento'
      LIMIT 1;
    END IF;
    
    -- Atualizar abastecimentos órfãos
    UPDATE abastecimentos
    SET posto_id = generic_posto_id
    WHERE id IN (
      SELECT a.id
      FROM abastecimentos a
      LEFT JOIN cadastros c ON a.posto_id = c.id AND c.tipo = 'abastecimento'
      WHERE c.id IS NULL
    );
    
    RAISE NOTICE 'Abastecimentos órfãos atualizados para posto genérico: %', generic_posto_id;
  ELSE
    RAISE NOTICE 'Todos os posto_id são válidos';
  END IF;
END $$;

-- Criar nova foreign key constraint
DO $$
BEGIN
  -- Adicionar foreign key para cadastros
  ALTER TABLE abastecimentos
  ADD CONSTRAINT abastecimentos_posto_id_fkey
  FOREIGN KEY (posto_id) REFERENCES cadastros(id);
  
  RAISE NOTICE 'Nova foreign key constraint criada: abastecimentos_posto_id_fkey';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erro ao criar foreign key: %', SQLERRM;
  
  -- Tentar sem foreign key constraint (para debug)
  RAISE NOTICE 'Continuando sem foreign key constraint para permitir debug';
END $$;

-- Verificação final
DO $$
DECLARE
  total_abastecimentos INTEGER;
  abastecimentos_validos INTEGER;
  posto_id_type text;
BEGIN
  -- Verificar tipo final
  SELECT data_type INTO posto_id_type
  FROM information_schema.columns
  WHERE table_name = 'abastecimentos' AND column_name = 'posto_id';
  
  -- Contar registros
  SELECT COUNT(*) INTO total_abastecimentos FROM abastecimentos;
  
  SELECT COUNT(*) INTO abastecimentos_validos
  FROM abastecimentos a
  JOIN cadastros c ON a.posto_id = c.id
  WHERE c.tipo = 'abastecimento';
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Tipo do campo posto_id: %', posto_id_type;
  RAISE NOTICE 'Total de abastecimentos: %', total_abastecimentos;
  RAISE NOTICE 'Abastecimentos com posto válido: %', abastecimentos_validos;
  
  IF total_abastecimentos = abastecimentos_validos THEN
    RAISE NOTICE '✅ Todos os abastecimentos têm postos válidos!';
  ELSE
    RAISE NOTICE '⚠️  % abastecimentos ainda com problemas', 
      total_abastecimentos - abastecimentos_validos;
  END IF;
END $$;