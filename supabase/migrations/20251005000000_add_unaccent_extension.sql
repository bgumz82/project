
-- Migration: Adicionar extensão unaccent e função helper
-- Descrição: Permite buscar cidades sem se preocupar com acentuação

-- Criar a extensão unaccent se não existir
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Comentário explicativo
COMMENT ON EXTENSION unaccent IS 'Extensão para remoção de acentos em buscas de texto';

-- Criar função helper para buscar cidades ignorando acentuação
CREATE OR REPLACE FUNCTION buscar_cidade_por_nome(nome_cidade TEXT)
RETURNS TABLE (
  cod_city TEXT,
  name TEXT,
  uf TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.cod_city::TEXT,
    c.name::TEXT,
    s.name::TEXT as uf
  FROM cities c
  LEFT JOIN states s ON c.state_id = s.id
  WHERE LOWER(UNACCENT(c.name)) = LOWER(UNACCENT(nome_cidade))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Comentário na função
COMMENT ON FUNCTION buscar_cidade_por_nome(TEXT) IS 'Busca cidade por nome ignorando acentuação e maiúsculas/minúsculas';

-- Criar índice para melhorar performance de buscas sem acentuação
CREATE INDEX IF NOT EXISTS idx_cities_name_unaccent ON cities (LOWER(UNACCENT(name)));

-- Comentário no índice
COMMENT ON INDEX idx_cities_name_unaccent IS 'Índice para buscas de cidades sem acentuação';
