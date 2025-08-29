
import { CTeDocumento } from './fiscal'

interface ClienteInfo {
  id: string
  razao_social?: string
  cnpj?: string
  ie?: string
  endereco_completo?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  codigo_ibge?: string
}

interface EmpresaInfo {
  id: string
  razao_social: string
  cnpj: string
  ie: string
  endereco_completo: string
  codigo_uf: string
  rntrc: string
}

interface ProdutoInfo {
  cod_ncm: string
  descricao: string
}

export async function generateCTeXML(
  documento: CTeDocumento,
  empresa: EmpresaInfo,
  tomador: ClienteInfo | null,
  remetente: ClienteInfo,
  destinatario: ClienteInfo,
  recebedor: ClienteInfo | null,
  produto: ProdutoInfo
): Promise<string> {
  
  const dataEmissao = new Date(documento.data_emissao)
  const dataEmissaoFormatada = dataEmissao.toISOString().slice(0, 19) + '-03:00'
  
  // Determinar quem é o tomador
  let tomadorFinal = tomador
  if (documento.tomador_id === 'remetente') {
    tomadorFinal = remetente
  } else if (documento.tomador_id === 'destinatario') {
    tomadorFinal = destinatario
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CTe xmlns="http://www.portalfiscal.inf.br/cte">
<infCte versao="4.00" Id="CTe${documento.chave_acesso}">
<ide>
<cUF>${documento.codigo_uf}</cUF>
<cCT>${documento.codigo_numerico}</cCT>
<CFOP>${documento.cfop || '6352'}</CFOP>
<natOp>PRESTACAO DE SERVICO DE TRANSPORTE</natOp>
<mod>57</mod>
<serie>${documento.serie}</serie>
<nCT>${documento.numero_cte}</nCT>
<dhEmi>${dataEmissaoFormatada}</dhEmi>
<tpImp>1</tpImp>
<tpEmis>${documento.forma_emissao}</tpEmis>
<cDV>${documento.dv}</cDV>
<tpAmb>1</tpAmb>
<tpCTe>${documento.finalidade_cte || '0'}</tpCTe>
<procEmi>0</procEmi>
<verProc>4.00</verProc>
<cMunEnv>${documento.cidade_inicio_ibge}</cMunEnv>
<xMunEnv>${documento.cidade_inicio_nome}</xMunEnv>
<UFEnv>${documento.uf_inicio}</UFEnv>
<modal>01</modal>
<tpServ>${documento.tipo_servico || '0'}</tpServ>
<cMunIni>${documento.cidade_inicio_ibge}</cMunIni>
<xMunIni>${documento.cidade_inicio_nome}</xMunIni>
<UFIni>${documento.uf_inicio}</UFIni>
<cMunFim>${documento.cidade_termino_ibge}</cMunFim>
<xMunFim>${documento.cidade_termino_nome}</xMunFim>
<UFFim>${documento.uf_termino}</UFFim>
<retira>1</retira>
<xDetRetira>CONFORME SOLICITACAO</xDetRetira>
<indIEToma>1</indIEToma>
<toma3>
<toma>${documento.tomador_id === 'remetente' ? '0' : documento.tomador_id === 'destinatario' ? '1' : '4'}</toma>
</toma3>
</ide>
${documento.observacoes ? `<compl>
<xObs>${documento.observacoes}</xObs>
</compl>` : ''}
<emit>
<CNPJ>${empresa.cnpj?.replace(/\D/g, '') || '00000000000000'}</CNPJ>
<IE>${empresa.ie || 'ISENTO'}</IE>
<xNome>${empresa.razao_social || 'NAO INFORMADO'}</xNome>
<enderEmit>
<xLgr>${parseEndereco(empresa.endereco_completo).logradouro}</xLgr>
<nro>${parseEndereco(empresa.endereco_completo).numero}</nro>
<xBairro>${parseEndereco(empresa.endereco_completo).bairro}</xBairro>
<cMun>${empresa.codigo_uf}99999</cMun>
<xMun>NAO INFORMADO</xMun>
<CEP>00000000</CEP>
<UF>${getUFFromCode(empresa.codigo_uf)}</UF>
</enderEmit>
<CRT>3</CRT>
</emit>
<rem>
<CNPJ>${remetente.cnpj?.replace(/\D/g, '') || '00000000000000'}</CNPJ>
${remetente.ie ? `<IE>${remetente.ie}</IE>` : '<IE>ISENTO</IE>'}
<xNome>${remetente.razao_social || 'NAO INFORMADO'}</xNome>
<enderReme>
<xLgr>${parseEndereco(remetente.endereco_completo || remetente.endereco).logradouro}</xLgr>
<nro>${parseEndereco(remetente.endereco_completo || remetente.endereco).numero}</nro>
<xBairro>${parseEndereco(remetente.endereco_completo || remetente.endereco).bairro}</xBairro>
<cMun>${remetente.codigo_ibge || '9999999'}</cMun>
<xMun>${remetente.cidade || 'NAO INFORMADO'}</xMun>
<CEP>${(remetente.cep || '00000000').replace(/\D/g, '')}</CEP>
<UF>${remetente.estado || 'SP'}</UF>
<cPais>1058</cPais>
<xPais>BRASIL</xPais>
</enderReme>
</rem>
<dest>
<CNPJ>${destinatario.cnpj?.replace(/\D/g, '') || '00000000000000'}</CNPJ>
${destinatario.ie ? `<IE>${destinatario.ie}</IE>` : '<IE>ISENTO</IE>'}
<xNome>${destinatario.razao_social || 'NAO INFORMADO'}</xNome>
<enderDest>
<xLgr>${parseEndereco(destinatario.endereco_completo || destinatario.endereco).logradouro}</xLgr>
<nro>${parseEndereco(destinatario.endereco_completo || destinatario.endereco).numero}</nro>
<xBairro>${parseEndereco(destinatario.endereco_completo || destinatario.endereco).bairro}</xBairro>
<cMun>${destinatario.codigo_ibge || '9999999'}</cMun>
<xMun>${destinatario.cidade || 'NAO INFORMADO'}</xMun>
<CEP>${(destinatario.cep || '00000000').replace(/\D/g, '')}</CEP>
<UF>${destinatario.estado || 'SP'}</UF>
<cPais>1058</cPais>
<xPais>BRASIL</xPais>
</enderDest>
</dest>
<vPrest>
<vTPrest>${documento.valor_prestacao?.toFixed(2) || '0.00'}</vTPrest>
<vRec>${documento.valor_receber?.toFixed(2) || '0.00'}</vRec>
<Comp>
<xNome>FRETE</xNome>
<vComp>${((documento.valor_prestacao || 0) - (documento.icms_valor || 0)).toFixed(2)}</vComp>
</Comp>
${documento.icms_valor && documento.icms_valor > 0 ? `<Comp>
<xNome>ICMS</xNome>
<vComp>${documento.icms_valor.toFixed(2)}</vComp>
</Comp>` : ''}
</vPrest>
<imp>
<ICMS>
${documento.icms_situacao_tributaria === '00' ? `<ICMS00>
<CST>00</CST>
<vBC>${documento.icms_bc_valor?.toFixed(2) || '0.00'}</vBC>
<pICMS>${documento.icms_aliquota?.toFixed(2) || '0.00'}</pICMS>
<vICMS>${documento.icms_valor?.toFixed(2) || '0.00'}</vICMS>
</ICMS00>` : documento.icms_situacao_tributaria === '40' ? `<ICMS45>
<CST>40</CST>
</ICMS45>` : `<ICMSSN>
<CST>90</CST>
<indSN>1</indSN>
</ICMSSN>`}
</ICMS>
<vTotTrib>${documento.valor_tributos?.toFixed(2) || '0.00'}</vTotTrib>
${documento.valor_tributos && documento.valor_tributos > 0 ? `<infAdFisco>O valor aproximado de tributos incidentes sobre o preco deste servico e de R$: ${documento.valor_tributos.toFixed(2).replace('.', ',')}</infAdFisco>` : ''}
</imp>
<infCTeNorm>
<infCarga>
<vCarga>${documento.valor_carga?.toFixed(2) || '0.00'}</vCarga>
<proPred>${produto.descricao}</proPred>
<xOutCat>LIQUIDO</xOutCat>
<infQ>
<cUnid>04</cUnid>
<tpMed>LT</tpMed>
<qCarga>${documento.quantidade_carga?.toFixed(4) || '0.0000'}</qCarga>
</infQ>
<vCargaAverb>${documento.valor_carga?.toFixed(2) || '0.00'}</vCargaAverb>
</infCarga>
<infDoc>
${documento.chave_acesso_1 ? `<infNFe>
<chave>${documento.chave_acesso_1}</chave>
</infNFe>` : ''}
${documento.chave_acesso_2 ? `<infNFe>
<chave>${documento.chave_acesso_2}</chave>
</infNFe>` : ''}
${documento.chave_acesso_3 ? `<infNFe>
<chave>${documento.chave_acesso_3}</chave>
</infNFe>` : ''}
${documento.chave_acesso_4 ? `<infNFe>
<chave>${documento.chave_acesso_4}</chave>
</infNFe>` : ''}
</infDoc>
<infModal versaoModal="4.00">
<rodo>
<RNTRC>${documento.rntrc || empresa.rntrc}</RNTRC>
</rodo>
</infModal>
</infCTeNorm>
</infCte>
<infCTeSupl>
<qrCodCTe>https://cte.fazenda.mg.gov.br/portalcte/sistema/qrcode.xhtml?chCTe=${documento.chave_acesso}&amp;tpAmb=1</qrCodCTe>
</infCTeSupl>
</CTe>`

  return xml
}

function parseEndereco(enderecoCompleto: string | undefined | null) {
  // Parse básico do endereço completo - tratar casos undefined/null
  if (!enderecoCompleto) {
    return {
      logradouro: 'NAO INFORMADO',
      numero: 'SN',
      bairro: 'NAO INFORMADO'
    }
  }
  
  const partes = enderecoCompleto.split(',')
  return {
    logradouro: partes[0]?.trim() || 'NAO INFORMADO',
    numero: partes[1]?.trim() || 'SN',
    bairro: partes[2]?.trim() || 'NAO INFORMADO'
  }
}

function getUFFromCode(codigo: string): string {
  const ufMap: { [key: string]: string } = {
    "12": "AC", "27": "AL", "16": "AP", "13": "AM", "29": "BA", "23": "CE",
    "53": "DF", "32": "ES", "52": "GO", "21": "MA", "51": "MT", "50": "MS",
    "31": "MG", "15": "PA", "25": "PB", "41": "PR", "26": "PE", "22": "PI",
    "33": "RJ", "24": "RN", "43": "RS", "11": "RO", "14": "RR", "42": "SC",
    "35": "SP", "28": "SE", "17": "TO"
  }
  return ufMap[codigo] || "SP"
}
