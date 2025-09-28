

-- Script para importar registros ANTT da planilha GDA Transportes
-- Versão corrigida com validações

-- 1. Verificar se a tabela registros_antt existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'registros_antt') THEN
    RAISE EXCEPTION 'Tabela registros_antt não existe. Execute primeiro as migrações.';
  END IF;
  
  RAISE NOTICE 'Tabela registros_antt encontrada. Iniciando importação...';
END $$;

-- 2. Verificar quantos veículos existem das placas da planilha
DO $$
DECLARE
  placas_encontradas INTEGER;
  placas_total INTEGER := 67;
BEGIN
  WITH placas_planilha AS (
    SELECT unnest(ARRAY[
      'PZK6625', 'PWZ8271', 'NRZ1657', 'FFW9954', 'FLR5889', 'IVO5113',
      'ITB2019', 'HRV0378', 'IOW6816', 'IOW6803', 'API8949', 'API8951',
      'MKZ6992', 'QUT6161', 'HRV0377', 'QUY9785', 'MLM6904', 'MML2573',
      'PUJ1216', 'RFB7G29', 'BAC8J40', 'RMF3E85', 'RMF3E90', 'RMW0J37',
      'RNM5J11', 'RNM5J06', 'RFG7H25', 'RFG7H55', 'RFG7G05', 'RFG7G04',
      'IRA3E82', 'IRA3E81', 'RNX5E09', 'RTH4B72', 'RTT2E12', 'RUB3F89',
      'RUE1I38', 'RUG4I48', 'RUI4J00', 'RUW9H50', 'RVN2G00', 'QXD8E44',
      'OQF0E73', 'SHL5H46', 'SHW9A32', 'SHY5E13', 'SYB9E95', 'QWV2I54',
      'OPP8E04', 'QMY5G85', 'RVK8C23', 'TCH9D01', 'TCX3I19', 'HDE8J57',
      'TDD9D41', 'TDG1F07', 'TDI4I56', 'SHL5J67', 'RVY6H13', 'TDT5G33',
      'TEQ7D45', 'TES9A83', 'TER4B25', 'TEW0H66', 'TEW0H64', 'TXC2I20',
      'TEX5B78', 'QIC5497'
    ]) as placa
  )
  SELECT COUNT(*) INTO placas_encontradas
  FROM placas_planilha pp
  JOIN veiculos v ON pp.placa = REPLACE(v.placa, '-', '');
  
  RAISE NOTICE 'Placas encontradas: % de % total', placas_encontradas, placas_total;
  
  IF placas_encontradas = 0 THEN
    RAISE EXCEPTION 'Nenhuma placa da planilha foi encontrada no sistema';
  END IF;
END $$;

-- 3. Inserir registros ANTT - GDA TRANSPORTES (66 veículos)
INSERT INTO registros_antt (
  veiculo_id, 
  cnpj, 
  antt, 
  razao_social_proprietario, 
  inscricao_estadual, 
  uf_registro, 
  empresa_proprietario, 
  ativo, 
  created_at, 
  updated_at
)
SELECT 
  v.id as veiculo_id,
  '19660324000184' as cnpj,
  '47424276' as antt,
  'GDA TRANSPORTES RODOVIARIOS LTDA EPP' as razao_social_proprietario,
  '23036130020' as inscricao_estadual,
  'MG' as uf_registro,
  true as empresa_proprietario,
  true as ativo,
  NOW() as created_at,
  NOW() as updated_at
FROM veiculos v 
WHERE REPLACE(v.placa, '-', '') IN (
  'PZK6625', 'PWZ8271', 'NRZ1657', 'FFW9954', 'FLR5889', 'IVO5113',
  'ITB2019', 'HRV0378', 'IOW6816', 'IOW6803', 'API8949', 'API8951',
  'MKZ6992', 'QUT6161', 'HRV0377', 'QUY9785', 'MLM6904', 'MML2573',
  'PUJ1216', 'RFB7G29', 'BAC8J40', 'RMF3E85', 'RMF3E90', 'RMW0J37',
  'RNM5J11', 'RNM5J06', 'RFG7H25', 'RFG7H55', 'RFG7G05', 'RFG7G04',
  'IRA3E82', 'IRA3E81', 'RNX5E09', 'RTH4B72', 'RTT2E12', 'RUB3F89',
  'RUE1I38', 'RUG4I48', 'RUI4J00', 'RUW9H50', 'RVN2G00', 'QXD8E44',
  'OQF0E73', 'SHL5H46', 'SHW9A32', 'SHY5E13', 'SYB9E95', 'QWV2I54',
  'OPP8E04', 'QMY5G85', 'RVK8C23', 'TCH9D01', 'TCX3I19', 'HDE8J57',
  'TDD9D41', 'TDG1F07', 'TDI4I56', 'SHL5J67', 'RVY6H13', 'TDT5G33',
  'TEQ7D45', 'TES9A83', 'TER4B25', 'TEW0H66', 'TEW0H64', 'TXC2I20',
  'TEX5B78'
)
AND NOT EXISTS (
  SELECT 1 FROM registros_antt ra2 
  WHERE ra2.veiculo_id = v.id AND ra2.antt = '47424276'
);

-- 4. Inserir registro MARCOS ROGERIO DE SOUSA TRANSPORTES ME (1 veículo)
INSERT INTO registros_antt (
  veiculo_id, 
  cnpj, 
  antt, 
  razao_social_proprietario, 
  inscricao_estadual, 
  uf_registro, 
  empresa_proprietario, 
  ativo, 
  created_at, 
  updated_at
)
SELECT 
  v.id as veiculo_id,
  '18939057000116' as cnpj,
  '49284900' as antt,
  'MARCOS ROGERIO DE SOUSA TRANSPORTES ME' as razao_social_proprietario,
  '22292180014' as inscricao_estadual,
  'MG' as uf_registro,
  false as empresa_proprietario,
  true as ativo,
  NOW() as created_at,
  NOW() as updated_at
FROM veiculos v 
WHERE REPLACE(v.placa, '-', '') = 'QIC5497'
AND NOT EXISTS (
  SELECT 1 FROM registros_antt ra2 
  WHERE ra2.veiculo_id = v.id AND ra2.antt = '49284900'
);

-- 5. Relatório final
DO $$
DECLARE
  total_inseridos INTEGER;
  gda_inseridos INTEGER;
  marcos_inseridos INTEGER;
BEGIN
  -- Contar registros inseridos
  SELECT COUNT(*) INTO gda_inseridos 
  FROM registros_antt 
  WHERE antt = '47424276';
  
  SELECT COUNT(*) INTO marcos_inseridos 
  FROM registros_antt 
  WHERE antt = '49284900';
  
  total_inseridos := gda_inseridos + marcos_inseridos;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== RELATÓRIO DE IMPORTAÇÃO ===';
  RAISE NOTICE 'GDA Transportes (ANTT 47424276): % registros', gda_inseridos;
  RAISE NOTICE 'Marcos Rogério (ANTT 49284900): % registros', marcos_inseridos;
  RAISE NOTICE 'Total importado: % registros', total_inseridos;
  RAISE NOTICE '';
  
  IF total_inseridos > 0 THEN
    RAISE NOTICE '✅ Importação concluída com sucesso!';
  ELSE
    RAISE NOTICE '⚠️  Nenhum registro foi importado (possivelmente já existiam)';
  END IF;
END $$;

-- 6. Listar placas não encontradas
SELECT 
  '❌ Placas não encontradas:' as status,
  string_agg(placa_busca, ', ') as placas_nao_encontradas
FROM (
  SELECT unnest(ARRAY[
    'PZK6625', 'PWZ8271', 'NRZ1657', 'FFW9954', 'FLR5889', 'IVO5113',
    'ITB2019', 'HRV0378', 'IOW6816', 'IOW6803', 'API8949', 'API8951',
    'MKZ6992', 'QUT6161', 'HRV0377', 'QUY9785', 'MLM6904', 'MML2573',
    'PUJ1216', 'RFB7G29', 'BAC8J40', 'RMF3E85', 'RMF3E90', 'RMW0J37',
    'RNM5J11', 'RNM5J06', 'RFG7H25', 'RFG7H55', 'RFG7G05', 'RFG7G04',
    'IRA3E82', 'IRA3E81', 'RNX5E09', 'RTH4B72', 'RTT2E12', 'RUB3F89',
    'RUE1I38', 'RUG4I48', 'RUI4J00', 'RUW9H50', 'RVN2G00', 'QXD8E44',
    'OQF0E73', 'SHL5H46', 'SHW9A32', 'SHY5E13', 'SYB9E95', 'QWV2I54',
    'OPP8E04', 'QMY5G85', 'RVK8C23', 'TCH9D01', 'TCX3I19', 'HDE8J57',
    'TDD9D41', 'TDG1F07', 'TDI4I56', 'SHL5J67', 'RVY6H13', 'TDT5G33',
    'TEQ7D45', 'TES9A83', 'TER4B25', 'TEW0H66', 'TEW0H64', 'TXC2I20',
    'TEX5B78', 'QIC5497'
  ]) as placa_busca
) placas_planilha
WHERE placa_busca NOT IN (SELECT REPLACE(placa, '-', '') FROM veiculos)
HAVING COUNT(*) > 0;

