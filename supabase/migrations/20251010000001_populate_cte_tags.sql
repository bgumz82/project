
-- Migration: Popular tags padrão do CT-e baseadas em XML real
-- Descrição: Insere tags do CT-e encontradas no XML de exemplo

-- Função auxiliar para inserir tags para todas as empresas
CREATE OR REPLACE FUNCTION inserir_tag_cte_todas_empresas(
  p_grupo_id UUID,
  p_tag_nome VARCHAR,
  p_tag_path VARCHAR,
  p_valor_padrao TEXT DEFAULT NULL,
  p_obrigatoria BOOLEAN DEFAULT false,
  p_ordem INTEGER DEFAULT 0
) RETURNS void AS $$
BEGIN
  INSERT INTO xml_tags_controle (
    empresa_id, tipo_documento, grupo_id, tag_nome, tag_path,
    valor_padrao, obrigatoria, ordem, ativo, observacoes
  )
  SELECT 
    ef.id,
    'cte'::tipo_documento_fiscal,
    p_grupo_id,
    p_tag_nome,
    p_tag_path,
    p_valor_padrao,
    p_obrigatoria,
    p_ordem,
    true,
    'Tag importada automaticamente do XML de exemplo'
  FROM empresas_fiscais ef
  ON CONFLICT (empresa_id, tipo_documento, tag_path) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Buscar IDs dos grupos
DO $$
DECLARE
  grupo_identificacao UUID;
  grupo_emitente UUID;
  grupo_remetente UUID;
  grupo_destinatario UUID;
  grupo_valores UUID;
  grupo_carga UUID;
  grupo_observacoes UUID;
BEGIN
  -- Buscar IDs dos grupos
  SELECT id INTO grupo_identificacao FROM xml_tag_grupos WHERE nome = 'Identificação' AND tipo_documento = 'cte';
  SELECT id INTO grupo_emitente FROM xml_tag_grupos WHERE nome = 'Emitente' AND tipo_documento = 'cte';
  SELECT id INTO grupo_remetente FROM xml_tag_grupos WHERE nome = 'Remetente' AND tipo_documento = 'cte';
  SELECT id INTO grupo_destinatario FROM xml_tag_grupos WHERE nome = 'Destinatário' AND tipo_documento = 'cte';
  SELECT id INTO grupo_valores FROM xml_tag_grupos WHERE nome = 'Valores' AND tipo_documento = 'cte';
  SELECT id INTO grupo_carga FROM xml_tag_grupos WHERE nome = 'Carga' AND tipo_documento = 'cte';
  SELECT id INTO grupo_observacoes FROM xml_tag_grupos WHERE nome = 'Observações' AND tipo_documento = 'cte';

  -- Tags de Identificação (grupo ide)
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Código UF', 'infCte/ide/cUF', NULL, true, 1);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Código Numérico CT-e', 'infCte/ide/cCT', NULL, true, 2);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'CFOP', 'infCte/ide/CFOP', '5932', true, 3);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Natureza da Operação', 'infCte/ide/natOp', 'PREST. DE SERV. DE TRANSP. A ESTAB. INDUST.', true, 4);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Modelo', 'infCte/ide/mod', '57', true, 5);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Série', 'infCte/ide/serie', NULL, true, 6);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Número CT-e', 'infCte/ide/nCT', NULL, true, 7);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Data/Hora Emissão', 'infCte/ide/dhEmi', NULL, true, 8);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Tipo Impressão', 'infCte/ide/tpImp', '1', true, 9);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Tipo Emissão', 'infCte/ide/tpEmis', '1', true, 10);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Dígito Verificador', 'infCte/ide/cDV', NULL, true, 11);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Tipo Ambiente', 'infCte/ide/tpAmb', '1', true, 12);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Tipo CT-e', 'infCte/ide/tpCTe', '0', true, 13);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Processo Emissão', 'infCte/ide/procEmi', '0', true, 14);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Versão Processo', 'infCte/ide/verProc', '3.1.00', true, 15);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Código Município Envio', 'infCte/ide/cMunEnv', NULL, true, 16);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Nome Município Envio', 'infCte/ide/xMunEnv', NULL, true, 17);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'UF Envio', 'infCte/ide/UFEnv', NULL, true, 18);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Modal', 'infCte/ide/modal', '01', true, 19);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Tipo Serviço', 'infCte/ide/tpServ', '0', true, 20);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Código Município Início', 'infCte/ide/cMunIni', NULL, true, 21);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Nome Município Início', 'infCte/ide/xMunIni', NULL, true, 22);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'UF Início', 'infCte/ide/UFIni', NULL, true, 23);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Código Município Fim', 'infCte/ide/cMunFim', NULL, true, 24);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Nome Município Fim', 'infCte/ide/xMunFim', NULL, true, 25);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'UF Fim', 'infCte/ide/UFFim', NULL, true, 26);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Retira', 'infCte/ide/retira', '1', false, 27);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Detalhes Retira', 'infCte/ide/xDetRetira', 'ENTREGA DESTINATARIO-RECEBEDOR', false, 28);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Indicador IE Tomador', 'infCte/ide/indIEToma', '1', true, 29);
  PERFORM inserir_tag_cte_todas_empresas(grupo_identificacao, 'Tomador', 'infCte/ide/toma3/toma', '0', true, 30);

  -- Tags do Emitente
  PERFORM inserir_tag_cte_todas_empresas(grupo_emitente, 'CNPJ Emitente', 'infCte/emit/CNPJ', NULL, true, 1);
  PERFORM inserir_tag_cte_todas_empresas(grupo_emitente, 'IE Emitente', 'infCte/emit/IE', NULL, true, 2);
  PERFORM inserir_tag_cte_todas_empresas(grupo_emitente, 'Nome Emitente', 'infCte/emit/xNome', NULL, true, 3);
  PERFORM inserir_tag_cte_todas_empresas(grupo_emitente, 'Logradouro Emitente', 'infCte/emit/enderEmit/xLgr', NULL, true, 4);
  PERFORM inserir_tag_cte_todas_empresas(grupo_emitente, 'Número Emitente', 'infCte/emit/enderEmit/nro', NULL, true, 5);
  PERFORM inserir_tag_cte_todas_empresas(grupo_emitente, 'Bairro Emitente', 'infCte/emit/enderEmit/xBairro', NULL, true, 6);
  PERFORM inserir_tag_cte_todas_empresas(grupo_emitente, 'Código Município Emitente', 'infCte/emit/enderEmit/cMun', NULL, true, 7);
  PERFORM inserir_tag_cte_todas_empresas(grupo_emitente, 'Nome Município Emitente', 'infCte/emit/enderEmit/xMun', NULL, true, 8);
  PERFORM inserir_tag_cte_todas_empresas(grupo_emitente, 'CEP Emitente', 'infCte/emit/enderEmit/CEP', NULL, true, 9);
  PERFORM inserir_tag_cte_todas_empresas(grupo_emitente, 'UF Emitente', 'infCte/emit/enderEmit/UF', NULL, true, 10);
  PERFORM inserir_tag_cte_todas_empresas(grupo_emitente, 'Telefone Emitente', 'infCte/emit/enderEmit/fone', NULL, false, 11);
  PERFORM inserir_tag_cte_todas_empresas(grupo_emitente, 'CRT Emitente', 'infCte/emit/CRT', '3', true, 12);

  -- Tags do Remetente
  PERFORM inserir_tag_cte_todas_empresas(grupo_remetente, 'CNPJ Remetente', 'infCte/rem/CNPJ', NULL, true, 1);
  PERFORM inserir_tag_cte_todas_empresas(grupo_remetente, 'IE Remetente', 'infCte/rem/IE', NULL, false, 2);
  PERFORM inserir_tag_cte_todas_empresas(grupo_remetente, 'Nome Remetente', 'infCte/rem/xNome', NULL, true, 3);
  PERFORM inserir_tag_cte_todas_empresas(grupo_remetente, 'Logradouro Remetente', 'infCte/rem/enderReme/xLgr', NULL, true, 4);
  PERFORM inserir_tag_cte_todas_empresas(grupo_remetente, 'Número Remetente', 'infCte/rem/enderReme/nro', NULL, true, 5);
  PERFORM inserir_tag_cte_todas_empresas(grupo_remetente, 'Bairro Remetente', 'infCte/rem/enderReme/xBairro', NULL, true, 6);
  PERFORM inserir_tag_cte_todas_empresas(grupo_remetente, 'Código Município Remetente', 'infCte/rem/enderReme/cMun', NULL, true, 7);
  PERFORM inserir_tag_cte_todas_empresas(grupo_remetente, 'Nome Município Remetente', 'infCte/rem/enderReme/xMun', NULL, true, 8);
  PERFORM inserir_tag_cte_todas_empresas(grupo_remetente, 'CEP Remetente', 'infCte/rem/enderReme/CEP', NULL, true, 9);
  PERFORM inserir_tag_cte_todas_empresas(grupo_remetente, 'UF Remetente', 'infCte/rem/enderReme/UF', NULL, true, 10);
  PERFORM inserir_tag_cte_todas_empresas(grupo_remetente, 'Código País Remetente', 'infCte/rem/enderReme/cPais', '1058', false, 11);
  PERFORM inserir_tag_cte_todas_empresas(grupo_remetente, 'Nome País Remetente', 'infCte/rem/enderReme/xPais', 'BRASIL', false, 12);

  -- Tags do Destinatário
  PERFORM inserir_tag_cte_todas_empresas(grupo_destinatario, 'CNPJ Destinatário', 'infCte/dest/CNPJ', NULL, true, 1);
  PERFORM inserir_tag_cte_todas_empresas(grupo_destinatario, 'IE Destinatário', 'infCte/dest/IE', NULL, false, 2);
  PERFORM inserir_tag_cte_todas_empresas(grupo_destinatario, 'Nome Destinatário', 'infCte/dest/xNome', NULL, true, 3);
  PERFORM inserir_tag_cte_todas_empresas(grupo_destinatario, 'Logradouro Destinatário', 'infCte/dest/enderDest/xLgr', NULL, true, 4);
  PERFORM inserir_tag_cte_todas_empresas(grupo_destinatario, 'Número Destinatário', 'infCte/dest/enderDest/nro', NULL, true, 5);
  PERFORM inserir_tag_cte_todas_empresas(grupo_destinatario, 'Bairro Destinatário', 'infCte/dest/enderDest/xBairro', NULL, true, 6);
  PERFORM inserir_tag_cte_todas_empresas(grupo_destinatario, 'Código Município Destinatário', 'infCte/dest/enderDest/cMun', NULL, true, 7);
  PERFORM inserir_tag_cte_todas_empresas(grupo_destinatario, 'Nome Município Destinatário', 'infCte/dest/enderDest/xMun', NULL, true, 8);
  PERFORM inserir_tag_cte_todas_empresas(grupo_destinatario, 'CEP Destinatário', 'infCte/dest/enderDest/CEP', NULL, true, 9);
  PERFORM inserir_tag_cte_todas_empresas(grupo_destinatario, 'UF Destinatário', 'infCte/dest/enderDest/UF', NULL, true, 10);
  PERFORM inserir_tag_cte_todas_empresas(grupo_destinatario, 'Código País Destinatário', 'infCte/dest/enderDest/cPais', '1058', false, 11);
  PERFORM inserir_tag_cte_todas_empresas(grupo_destinatario, 'Nome País Destinatário', 'infCte/dest/enderDest/xPais', 'BRASIL', false, 12);

  -- Tags de Valores
  PERFORM inserir_tag_cte_todas_empresas(grupo_valores, 'Valor Total Prestação', 'infCte/vPrest/vTPrest', NULL, true, 1);
  PERFORM inserir_tag_cte_todas_empresas(grupo_valores, 'Valor a Receber', 'infCte/vPrest/vRec', NULL, true, 2);
  PERFORM inserir_tag_cte_todas_empresas(grupo_valores, 'Nome Componente', 'infCte/vPrest/Comp/xNome', 'FRETE', false, 3);
  PERFORM inserir_tag_cte_todas_empresas(grupo_valores, 'Valor Componente', 'infCte/vPrest/Comp/vComp', NULL, false, 4);
  PERFORM inserir_tag_cte_todas_empresas(grupo_valores, 'CST ICMS', 'infCte/imp/ICMS/ICMS45/CST', '40', true, 5);

  -- Tags de Carga
  PERFORM inserir_tag_cte_todas_empresas(grupo_carga, 'Valor da Carga', 'infCte/infCTeNorm/infCarga/vCarga', NULL, true, 1);
  PERFORM inserir_tag_cte_todas_empresas(grupo_carga, 'Produto Predominante', 'infCte/infCTeNorm/infCarga/proPred', NULL, true, 2);
  PERFORM inserir_tag_cte_todas_empresas(grupo_carga, 'Outras Características', 'infCte/infCTeNorm/infCarga/xOutCat', NULL, false, 3);
  PERFORM inserir_tag_cte_todas_empresas(grupo_carga, 'Código Unidade', 'infCte/infCTeNorm/infCarga/infQ/cUnid', '04', true, 4);
  PERFORM inserir_tag_cte_todas_empresas(grupo_carga, 'Tipo Medida', 'infCte/infCTeNorm/infCarga/infQ/tpMed', NULL, true, 5);
  PERFORM inserir_tag_cte_todas_empresas(grupo_carga, 'Quantidade Carga', 'infCte/infCTeNorm/infCarga/infQ/qCarga', NULL, true, 6);
  PERFORM inserir_tag_cte_todas_empresas(grupo_carga, 'Valor Carga Averbado', 'infCte/infCTeNorm/infCarga/vCargaAverb', NULL, false, 7);
  PERFORM inserir_tag_cte_todas_empresas(grupo_carga, 'Chave NFe', 'infCte/infCTeNorm/infDoc/infNFe/chave', NULL, true, 8);
  PERFORM inserir_tag_cte_todas_empresas(grupo_carga, 'RNTRC', 'infCte/infCTeNorm/infModal/rodo/RNTRC', NULL, true, 9);

  -- Tags de Observações
  PERFORM inserir_tag_cte_todas_empresas(grupo_observacoes, 'Fluxo', 'infCte/compl/fluxo', NULL, false, 1);
  PERFORM inserir_tag_cte_todas_empresas(grupo_observacoes, 'Observações', 'infCte/compl/xObs', NULL, false, 2);
  PERFORM inserir_tag_cte_todas_empresas(grupo_observacoes, 'QR Code', 'infCTeSupl/qrCodCTe', NULL, true, 3);

END $$;

-- Limpar função auxiliar
DROP FUNCTION inserir_tag_cte_todas_empresas;

-- Comentário
COMMENT ON COLUMN xml_tags_controle.observacoes IS 'Tag importada automaticamente do XML de exemplo';
