
-- Migration: Popular tags XML do MDF-e
-- Descrição: Insere tags padrão do MDF-e com base na estrutura real do XML

-- Função auxiliar para inserir tags do MDF-e
CREATE OR REPLACE FUNCTION inserir_tag_mdfe(
  p_empresa_id UUID,
  p_grupo_nome TEXT,
  p_tag_nome TEXT,
  p_tag_path TEXT,
  p_valor_padrao TEXT DEFAULT NULL,
  p_obrigatoria BOOLEAN DEFAULT false,
  p_ordem INTEGER DEFAULT 0
) RETURNS VOID AS $$
DECLARE
  v_grupo_id UUID;
BEGIN
  -- Buscar ID do grupo
  SELECT id INTO v_grupo_id
  FROM xml_tag_grupos
  WHERE nome = p_grupo_nome AND tipo_documento = 'mdfe';

  -- Inserir tag se não existir
  INSERT INTO xml_tags_controle (
    empresa_id, tipo_documento, grupo_id, tag_nome, tag_path,
    valor_padrao, obrigatoria, ordem, ativo
  )
  VALUES (
    p_empresa_id, 'mdfe', v_grupo_id, p_tag_nome, p_tag_path,
    p_valor_padrao, p_obrigatoria, p_ordem, true
  )
  ON CONFLICT (empresa_id, tipo_documento, tag_path) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Popular tags para cada empresa fiscal ativa
DO $$
DECLARE
  empresa RECORD;
  ordem_counter INTEGER;
BEGIN
  FOR empresa IN SELECT id FROM empresas_fiscais WHERE status = 'ativo' LOOP
    ordem_counter := 1;

    -- ========== GRUPO: Identificação ==========
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'UF', 'infMDFe/ide/cUF', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Tipo Ambiente', 'infMDFe/ide/tpAmb', '1', true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Tipo Emitente', 'infMDFe/ide/tpEmit', '1', true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Modelo', 'infMDFe/ide/mod', '58', true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Série', 'infMDFe/ide/serie', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Número MDF-e', 'infMDFe/ide/nMDF', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Código MDF-e', 'infMDFe/ide/cMDF', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Dígito Verificador', 'infMDFe/ide/cDV', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Modal', 'infMDFe/ide/modal', '1', true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Data/Hora Emissão', 'infMDFe/ide/dhEmi', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Forma Emissão', 'infMDFe/ide/tpEmis', '1', true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Processo Emissão', 'infMDFe/ide/procEmi', '0', true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Versão Processo', 'infMDFe/ide/verProc', '3.0.12', true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'UF Início', 'infMDFe/ide/UFIni', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'UF Fim', 'infMDFe/ide/UFFim', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Município Carregamento', 'infMDFe/ide/infMunCarrega/cMunCarrega', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Nome Município Carregamento', 'infMDFe/ide/infMunCarrega/xMunCarrega', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;

    -- ========== GRUPO: Emitente ==========
    ordem_counter := 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Emitente', 'CNPJ Emitente', 'infMDFe/emit/CNPJ', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Emitente', 'IE Emitente', 'infMDFe/emit/IE', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Emitente', 'Razão Social', 'infMDFe/emit/xNome', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Emitente', 'Logradouro', 'infMDFe/emit/enderEmit/xLgr', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Emitente', 'Número', 'infMDFe/emit/enderEmit/nro', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Emitente', 'Bairro', 'infMDFe/emit/enderEmit/xBairro', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Emitente', 'Município', 'infMDFe/emit/enderEmit/cMun', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Emitente', 'Nome Município', 'infMDFe/emit/enderEmit/xMun', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Emitente', 'CEP', 'infMDFe/emit/enderEmit/CEP', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Emitente', 'UF', 'infMDFe/emit/enderEmit/UF', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Emitente', 'Telefone', 'infMDFe/emit/enderEmit/fone', NULL, false, ordem_counter); ordem_counter := ordem_counter + 1;

    -- ========== GRUPO: Veículos ==========
    ordem_counter := 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'RNTRC', 'infMDFe/infModal/rodo/infANTT/RNTRC', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'Código Interno Tração', 'infMDFe/infModal/rodo/veicTracao/cInt', NULL, false, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'Placa Tração', 'infMDFe/infModal/rodo/veicTracao/placa', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'RENAVAM Tração', 'infMDFe/infModal/rodo/veicTracao/RENAVAM', NULL, false, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'Tara Tração', 'infMDFe/infModal/rodo/veicTracao/tara', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'Capacidade KG Tração', 'infMDFe/infModal/rodo/veicTracao/capKG', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'Tipo Rodado', 'infMDFe/infModal/rodo/veicTracao/tpRod', '01', true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'Tipo Carroceria', 'infMDFe/infModal/rodo/veicTracao/tpCar', '00', true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'UF Veículo', 'infMDFe/infModal/rodo/veicTracao/UF', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'Código Interno Reboque', 'infMDFe/infModal/rodo/veicReboque/cInt', NULL, false, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'Placa Reboque', 'infMDFe/infModal/rodo/veicReboque/placa', NULL, false, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'RENAVAM Reboque', 'infMDFe/infModal/rodo/veicReboque/RENAVAM', NULL, false, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'Tara Reboque', 'infMDFe/infModal/rodo/veicReboque/tara', NULL, false, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'Capacidade KG Reboque', 'infMDFe/infModal/rodo/veicReboque/capKG', NULL, false, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'Tipo Carroceria Reboque', 'infMDFe/infModal/rodo/veicReboque/tpCar', '00', false, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Veículos', 'UF Reboque', 'infMDFe/infModal/rodo/veicReboque/UF', NULL, false, ordem_counter); ordem_counter := ordem_counter + 1;

    -- ========== GRUPO: Condutores ==========
    ordem_counter := 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Condutores', 'Nome Condutor', 'infMDFe/infModal/rodo/veicTracao/condutor/xNome', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Condutores', 'CPF Condutor', 'infMDFe/infModal/rodo/veicTracao/condutor/CPF', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;

    -- ========== GRUPO: Documentos ==========
    ordem_counter := 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Documentos', 'Município Descarga', 'infMDFe/infDoc/infMunDescarga/cMunDescarga', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Documentos', 'Nome Município Descarga', 'infMDFe/infDoc/infMunDescarga/xMunDescarga', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Documentos', 'Chave CT-e', 'infMDFe/infDoc/infMunDescarga/infCTe/chCTe', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Documentos', 'Tipo Unidade Transporte', 'infMDFe/infDoc/infMunDescarga/infCTe/infUnidTransp/tpUnidTransp', NULL, false, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Documentos', 'ID Unidade Transporte', 'infMDFe/infDoc/infMunDescarga/infCTe/infUnidTransp/idUnidTransp', NULL, false, ordem_counter); ordem_counter := ordem_counter + 1;

    -- ========== GRUPO: Totalizadores ==========
    ordem_counter := 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Quantidade CT-e', 'infMDFe/tot/qCTe', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Valor Carga', 'infMDFe/tot/vCarga', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Código Unidade', 'infMDFe/tot/cUnid', '01', true, ordem_counter); ordem_counter := ordem_counter + 1;
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Quantidade Carga', 'infMDFe/tot/qCarga', NULL, true, ordem_counter); ordem_counter := ordem_counter + 1;

    -- ========== Tags Adicionais (Seguro, Produto, etc.) ==========
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Responsável Seguro', 'infMDFe/seg/infResp/respSeg', '1', true, 100);
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Seguradora Nome', 'infMDFe/seg/infSeg/xSeg', NULL, false, 101);
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Seguradora CNPJ', 'infMDFe/seg/infSeg/CNPJ', NULL, false, 102);
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Número Apólice', 'infMDFe/seg/nApol', NULL, false, 103);
    PERFORM inserir_tag_mdfe(empresa.id, 'Identificação', 'Número Averbação', 'infMDFe/seg/nAver', NULL, false, 104);
    
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Tipo Carga', 'infMDFe/prodPred/tpCarga', NULL, true, 50);
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Produto', 'infMDFe/prodPred/xProd', NULL, true, 51);
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'NCM', 'infMDFe/prodPred/NCM', NULL, false, 52);
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'CEP Carregamento', 'infMDFe/prodPred/infLotacao/infLocalCarrega/CEP', NULL, false, 53);
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'CEP Descarregamento', 'infMDFe/prodPred/infLotacao/infLocalDescarrega/CEP', NULL, false, 54);
    
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Informações Complementares', 'infMDFe/infAdic/infCpl', NULL, false, 60);
    
    -- Tags de Contratante e Pagamento (ANTT)
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'CNPJ Contratante', 'infMDFe/infModal/rodo/infANTT/infContratante/CNPJ', NULL, true, 70);
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'CNPJ Pagamento', 'infMDFe/infModal/rodo/infANTT/infPag/CNPJ', NULL, true, 71);
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Tipo Componente', 'infMDFe/infModal/rodo/infANTT/infPag/Comp/tpComp', '04', true, 72);
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Valor Componente', 'infMDFe/infModal/rodo/infANTT/infPag/Comp/vComp', NULL, true, 73);
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Valor Contrato', 'infMDFe/infModal/rodo/infANTT/infPag/vContrato', NULL, true, 74);
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Indicador Pagamento', 'infMDFe/infModal/rodo/infANTT/infPag/indPag', '1', true, 75);
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Número Parcela', 'infMDFe/infModal/rodo/infANTT/infPag/infPrazo/nParcela', NULL, false, 76);
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Data Vencimento', 'infMDFe/infModal/rodo/infANTT/infPag/infPrazo/dVenc', NULL, false, 77);
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Valor Parcela', 'infMDFe/infModal/rodo/infANTT/infPag/infPrazo/vParcela', NULL, false, 78);
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Código Banco', 'infMDFe/infModal/rodo/infANTT/infPag/infBanc/codBanco', NULL, false, 79);
    PERFORM inserir_tag_mdfe(empresa.id, 'Totalizadores', 'Código Agência', 'infMDFe/infModal/rodo/infANTT/infPag/infBanc/codAgencia', NULL, false, 80);

  END LOOP;
END $$;

-- Remover função auxiliar
DROP FUNCTION IF EXISTS inserir_tag_mdfe(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER);

-- Comentário
COMMENT ON TABLE xml_tags_controle IS 'Tags XML do MDF-e populadas automaticamente baseadas na estrutura oficial';
