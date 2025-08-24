
-- Migration: Create cte_produtos table
-- Description: Cria tabela para armazenar produtos predominantes utilizados no CT-e

-- Criar tabela cte_produtos se não existir
CREATE TABLE IF NOT EXISTS cte_produtos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cod_ncm VARCHAR(8) NOT NULL,
    descricao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_cte_produtos_cod_ncm ON cte_produtos(cod_ncm);
CREATE INDEX IF NOT EXISTS idx_cte_produtos_descricao ON cte_produtos(descricao);

-- Inserir alguns produtos exemplo se a tabela estiver vazia
INSERT INTO cte_produtos (cod_ncm, descricao)
SELECT * FROM (VALUES
    ('04011010', 'Leite fluido'),
    ('04011090', 'Leite em pó integral'),
    ('04022110', 'Leite em pó desnatado'),
    ('04051000', 'Manteiga'),
    ('04061000', 'Queijo fresco'),
    ('04069000', 'Queijos, exceto queijo fresco'),
    ('04091000', 'Leite e creme de leite concentrados'),
    ('04099000', 'Outros produtos lácteos'),
    ('23099090', 'Outras preparações para alimentação animal'),
    ('87042110', 'Caminhões de peso em carga máxima superior a 5 toneladas, mas não superior a 20 toneladas'),
    ('87042290', 'Outros veículos automóveis para transporte de mercadorias')
) AS v(cod_ncm, descricao)
WHERE NOT EXISTS (SELECT 1 FROM cte_produtos);

-- Comentário na tabela
COMMENT ON TABLE cte_produtos IS 'Tabela para armazenar produtos predominantes utilizados no CT-e';
COMMENT ON COLUMN cte_produtos.cod_ncm IS 'Código NCM do produto';
COMMENT ON COLUMN cte_produtos.descricao IS 'Descrição do produto';
