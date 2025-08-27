
-- Alterar os campos de participantes para aceitar tanto UUIDs quanto valores especiais
-- Primeiro, vamos alterar o tipo dos campos para TEXT
ALTER TABLE cte_documentos 
  ALTER COLUMN tomador_id TYPE TEXT,
  ALTER COLUMN remetente_id TYPE TEXT,
  ALTER COLUMN recebedor_id TYPE TEXT,
  ALTER COLUMN destinatario_id TYPE TEXT;

-- Adicionar comentários explicativos
COMMENT ON COLUMN cte_documentos.tomador_id IS 'ID do tomador do serviço - pode ser UUID de cliente ou valores especiais: remetente, destinatario, recebedor, tomador, outros';
COMMENT ON COLUMN cte_documentos.remetente_id IS 'ID do remetente - pode ser UUID de cliente ou valores especiais: remetente, destinatario, recebedor, tomador, outros';
COMMENT ON COLUMN cte_documentos.recebedor_id IS 'ID do recebedor - pode ser UUID de cliente ou valores especiais: remetente, destinatario, recebedor, tomador, outros';
COMMENT ON COLUMN cte_documentos.destinatario_id IS 'ID do destinatário - pode ser UUID de cliente ou valores especiais: remetente, destinatario, recebedor, tomador, outros';

-- Criar função para validar campos de participantes
CREATE OR REPLACE FUNCTION validate_participante_field(value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Se valor é nulo ou vazio, é válido
  IF value IS NULL OR TRIM(value) = '' THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar se é um dos valores especiais permitidos
  IF LOWER(TRIM(value)) IN ('remetente', 'destinatario', 'recebedor', 'tomador', 'outros') THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar se é um UUID válido
  IF value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN TRUE;
  END IF;
  
  -- Caso contrário, inválido
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Adicionar constraints para validar os campos
ALTER TABLE cte_documentos 
  ADD CONSTRAINT chk_tomador_id_valid 
  CHECK (validate_participante_field(tomador_id));

ALTER TABLE cte_documentos 
  ADD CONSTRAINT chk_remetente_id_valid 
  CHECK (validate_participante_field(remetente_id));

ALTER TABLE cte_documentos 
  ADD CONSTRAINT chk_recebedor_id_valid 
  CHECK (validate_participante_field(recebedor_id));

ALTER TABLE cte_documentos 
  ADD CONSTRAINT chk_destinatario_id_valid 
  CHECK (validate_participante_field(destinatario_id));
