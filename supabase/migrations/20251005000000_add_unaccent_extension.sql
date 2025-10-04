
-- Migration: Adicionar extensão unaccent
-- Descrição: Permite buscar cidades sem se preocupar com acentuação

-- Criar a extensão unaccent se não existir
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Comentário explicativo
COMMENT ON EXTENSION unaccent IS 'Extensão para remoção de acentos em buscas de texto';
