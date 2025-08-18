/*
  # Atualizar dados existentes na tabela postos

  1. Problema Identificado
    - Registros existentes têm campos vazios ou nulos
    - Dados só aparecem após atualização manual
    - Necessário popular campos faltantes

  2. Solução
    - Atualizar todos os registros existentes com valores padrão
    - Garantir que todos os campos tenham valores válidos
    - Corrigir campos vazios ou nulos

  3. Campos a serem atualizados
    - endereco: valor padrão se vazio
    - cidade: valor padrão se vazio  
    - estado: 'SP' se vazio
    - cep: '00000-000' se vazio
    - ativo: true se nulo
    - updated_at: timestamp atual
*/

-- Verificar dados atuais antes da correção
DO $$
DECLARE
  posto_record RECORD;
  total_postos INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_postos FROM postos;
  RAISE NOTICE '=== DADOS ATUAIS DOS POSTOS (% registros) ===', total_postos;
  
  FOR posto_record IN 
    SELECT id, nome, endereco, cidade, estado, cep, telefone, cnpj, ativo
    FROM postos 
    ORDER BY nome
  LOOP
    RAISE NOTICE 'Posto: % | Endereço: % | Cidade: % | Estado: % | CEP: % | Ativo: %',
      posto_record.nome,
      COALESCE(NULLIF(posto_record.endereco, ''), 'VAZIO'),
      COALESCE(NULLIF(posto_record.cidade, ''), 'VAZIO'),
      COALESCE(NULLIF(posto_record.estado, ''), 'VAZIO'),
      COALESCE(NULLIF(posto_record.cep, ''), 'VAZIO'),
      COALESCE(posto_record.ativo::text, 'NULL');
  END LOOP;
END $$;

-- Atualizar todos os registros existentes com valores padrão válidos
UPDATE postos 
SET 
  endereco = CASE 
    WHEN endereco IS NULL OR endereco = '' THEN 'Endereço não informado'
    ELSE endereco
  END,
  cidade = CASE 
    WHEN cidade IS NULL OR cidade = '' THEN 'Não informado'
    ELSE cidade
  END,
  estado = CASE 
    WHEN estado IS NULL OR estado = '' THEN 'SP'
    ELSE estado
  END,
  cep = CASE 
    WHEN cep IS NULL OR cep = '' THEN '00000-000'
    ELSE cep
  END,
  ativo = COALESCE(ativo, true),
  updated_at = now()
WHERE 
  endereco IS NULL OR endereco = '' OR
  cidade IS NULL OR cidade = '' OR
  estado IS NULL OR estado = '' OR
  cep IS NULL OR cep = '' OR
  ativo IS NULL OR
  updated_at IS NULL;

-- Verificar quantos registros foram atualizados
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Atualizados % registros na tabela postos', updated_count;
END $$;

-- Verificar dados após a correção
DO $$
DECLARE
  posto_record RECORD;
  total_postos INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_postos FROM postos;
  RAISE NOTICE '=== DADOS APÓS CORREÇÃO (% registros) ===', total_postos;
  
  FOR posto_record IN 
    SELECT id, nome, endereco, cidade, estado, cep, telefone, cnpj, ativo
    FROM postos 
    ORDER BY nome
  LOOP
    RAISE NOTICE 'Posto: % | Endereço: % | Cidade: % | Estado: % | CEP: % | Telefone: % | CNPJ: % | Ativo: %',
      posto_record.nome,
      posto_record.endereco,
      posto_record.cidade,
      posto_record.estado,
      posto_record.cep,
      COALESCE(posto_record.telefone, 'NULL'),
      COALESCE(posto_record.cnpj, 'NULL'),
      posto_record.ativo;
  END LOOP;
  
  RAISE NOTICE '=== CORREÇÃO CONCLUÍDA ===';
  RAISE NOTICE '✅ Todos os postos agora têm dados válidos!';
END $$;