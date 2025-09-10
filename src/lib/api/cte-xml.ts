import { CTeDocumento } from './fiscal'
import { query } from '@/lib/db'
import { getCityCodeFromFallback } from './cities-fallback'

// Função para remover acentuação
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

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
  cidade?: string
  estado?: string
  cep?: string
  codigo_uf: string
  rntrc: string
}


export async function generateCTeXML(
  documento: CTeDocumento,
  empresa: EmpresaInfo,
  remetente: ClienteInfo | null,
  destinatario: ClienteInfo | null,
): Promise<string> {

  const dataEmissao = new Date(documento.data_emissao)
  const dataEmissaoFormatada = dataEmissao.toISOString().slice(0, 19) + '-03:00'

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CTe xmlns="http://www.portalfiscal.inf.br/cte">
<infCte versao="4.00" Id="CTe${documento.chave_acesso}">
<ide>
<cUF>${documento.codigo_uf}</cUF>
<cCT>${documento.codigo_numerico}</cCT>
<CFOP>${documento.cfop || '6352'}</CFOP>
<natOp>PRESTACAO DE SERVICO DE TRANSPORTE</natOp>
<mod>57</mod>
<serie>${parseInt(documento.serie || '1')}</serie>
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
<xMunEnv>${removeAccents(documento.cidade_inicio_nome || 'NAO INFORMADO').toUpperCase()}</xMunEnv>
<UFEnv>${await getUFFromCityCode(documento.cidade_inicio_ibge || '3550308')}</UFEnv>
<modal>01</modal>
<tpServ>${documento.tipo_servico || '0'}</tpServ>
<cMunIni>${documento.cidade_inicio_ibge}</cMunIni>
<xMunIni>${removeAccents(documento.cidade_inicio_nome || 'NAO INFORMADO').toUpperCase()}</xMunIni>
<UFIni>${await getUFFromCityCode(documento.cidade_inicio_ibge || '3550308')}</UFIni>
<cMunFim>${documento.cidade_termino_ibge}</cMunFim>
<xMunFim>${removeAccents(documento.cidade_termino_nome || 'NAO INFORMADO').toUpperCase()}</xMunFim>
<UFFim>${await getUFFromCityCode(documento.cidade_termino_ibge || '3550308')}</UFFim>
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
<IE>${empresa.ie || 'ISENTO</IE>'}</IE>
<xNome>${empresa.razao_social || 'NAO INFORMADO'}</xNome>
<enderEmit>
<xLgr>${removeAccents(parseEndereco(empresa.endereco_completo, empresa.cidade, empresa.estado, empresa.cep).logradouro).toUpperCase()}</xLgr>
<nro>${parseEndereco(empresa.endereco_completo, empresa.cidade, empresa.estado, empresa.cep).numero}</nro>
<xBairro>${removeAccents(parseEndereco(empresa.endereco_completo, empresa.cidade, empresa.estado, empresa.cep).bairro).toUpperCase()}</xBairro>
<cMun>${await getCityCode(parseEndereco(empresa.endereco_completo, empresa.cidade, empresa.estado, empresa.cep).cidade, parseEndereco(empresa.endereco_completo, empresa.cidade, empresa.estado, empresa.cep).uf)}</cMun>
<xMun>${removeAccents(parseEndereco(empresa.endereco_completo, empresa.cidade, empresa.estado, empresa.cep).cidade).toUpperCase()}</xMun>
<CEP>${parseEndereco(empresa.endereco_completo, empresa.cidade, empresa.estado, empresa.cep).cep}</CEP>
<UF>${parseEndereco(empresa.endereco_completo, empresa.cidade, empresa.estado, empresa.cep).uf.toUpperCase()}</UF>
</enderEmit>
<CRT>3</CRT>
</emit>
<rem>
<CNPJ>${remetente.cnpj?.replace(/\D/g, '') || '00000000000000'}</CNPJ>
${remetente.ie ? `<IE>${remetente.ie}</IE>` : '<IE>ISENTO</IE>'}
<xNome>${remetente.razao_social || 'NAO INFORMADO'}</xNome>
<enderReme>
<xLgr>${removeAccents(parseEndereco(remetente.endereco_completo || remetente.endereco, remetente.cidade, remetente.estado, remetente.cep).logradouro).toUpperCase()}</xLgr>
<nro>${parseEndereco(remetente.endereco_completo || remetente.endereco, remetente.cidade, remetente.estado, remetente.cep).numero}</nro>
<xBairro>${removeAccents(parseEndereco(remetente.endereco_completo || remetente.endereco, remetente.cidade, remetente.estado, remetente.cep).bairro).toUpperCase()}</xBairro>
<cMun>${remetente.codigo_ibge || await getCityCode(remetente.cidade || 'NAO INFORMADO', remetente.estado || 'SP')}</cMun>
<xMun>${removeAccents(remetente.cidade || 'NAO INFORMADO').toUpperCase()}</xMun>
<CEP>${(remetente.cep || '00000000').replace(/\D/g, '')}</CEP>
<UF>${(remetente.estado || 'SP').toUpperCase()}</UF>
<cPais>1058</cPais>
<xPais>BRASIL</xPais>
</enderReme>
</rem>
<dest>
<CNPJ>${destinatario.cnpj?.replace(/\D/g, '') || '00000000000000'}</CNPJ>
${destinatario.ie ? `<IE>${destinatario.ie}</IE>` : '<IE>ISENTO</IE>'}
<xNome>${destinatario.razao_social || 'NAO INFORMADO'}</xNome>
<enderDest>
<xLgr>${removeAccents(parseEndereco(destinatario.endereco_completo || destinatario.endereco, destinatario.cidade, destinatario.estado, destinatario.cep).logradouro).toUpperCase()}</xLgr>
<nro>${parseEndereco(destinatario.endereco_completo || destinatario.endereco, destinatario.cidade, destinatario.estado, destinatario.cep).numero}</nro>
<xBairro>${removeAccents(parseEndereco(destinatario.endereco_completo || destinatario.endereco, destinatario.cidade, destinatario.estado, destinatario.cep).bairro).toUpperCase()}</xBairro>
<cMun>${destinatario.codigo_ibge || await getCityCode(destinatario.cidade || 'NAO INFORMADO', destinatario.estado || 'SP')}</cMun>
<xMun>${removeAccents(destinatario.cidade || 'NAO INFORMADO').toUpperCase()}</xMun>
<CEP>${(destinatario.cep || '00000000').replace(/\D/g, '')}</CEP>
<UF>${(destinatario.estado || 'SP').toUpperCase()}</UF>
<cPais>1058</cPais>
<xPais>BRASIL</xPais>
</enderDest>
</dest>
<vPrest>
<vTPrest>${(parseFloat(documento.valor_prestacao as any) || 0).toFixed(2)}</vTPrest>
<vRec>${(parseFloat(documento.valor_receber as any) || 0).toFixed(2)}</vRec>
${(() => {
  // Calcular valor do frete base (sem pedágio, seguro e ICMS)
  const valorPrestacao = parseFloat(documento.valor_prestacao as any) || 0;
  const valorPedagio = parseFloat(documento.valor_pedagio as any) || 0;
  const valorSeguro = parseFloat(documento.valor_seguro as any) || 0;
  const valorICMS = parseFloat(documento.icms_valor as any) || 0;

  const valorFreteBase = valorPrestacao - valorPedagio - valorSeguro - valorICMS;

  let componentes = '';

  // Componente FRETE (sempre presente)
  if (valorFreteBase > 0) {
    componentes += `<Comp>
<xNome>FRETE</xNome>
<vComp>${valorFreteBase.toFixed(2)}</vComp>
</Comp>
`;
  }

  // Componente PEDAGIO (quando houver)
  if (valorPedagio > 0) {
    componentes += `<Comp>
<xNome>PEDAGIO</xNome>
<vComp>${valorPedagio.toFixed(2)}</vComp>
</Comp>
`;
  }

  // Componente SEGURO (quando houver)
  if (valorSeguro > 0) {
    componentes += `<Comp>
<xNome>SEGURO</xNome>
<vComp>${valorSeguro.toFixed(2)}</vComp>
</Comp>
`;
  }

  // Componente ICMS (quando houver)
  if (valorICMS > 0) {
    componentes += `<Comp>
<xNome>ICMS</xNome>
<vComp>${valorICMS.toFixed(2)}</vComp>
</Comp>
`;
  }

  return componentes;
})()}
</vPrest>
<imp>
<ICMS>
${documento.icms_situacao_tributaria === '00' ? `<ICMS00>
<CST>00</CST>
<vBC>${(parseFloat(documento.icms_bc_valor as any) || 0).toFixed(2)}</vBC>
<pICMS>${(parseFloat(documento.icms_aliquota as any) || 0).toFixed(2)}</pICMS>
<vICMS>${(parseFloat(documento.icms_valor as any) || 0).toFixed(2)}</vICMS>
</ICMS00>` : documento.icms_situacao_tributaria === '40' ? `<ICMS45>
<CST>40</CST>
</ICMS45>` : `<ICMSSN>
<CST>90</CST>
<indSN>1</indSN>
</ICMSSN>`}
</ICMS>
<vTotTrib>${(parseFloat(documento.valor_tributos as any) || 0).toFixed(2)}</vTotTrib>
${documento.valor_tributos && parseFloat(documento.valor_tributos as any) > 0 ? `<infAdFisco>O valor aproximado de tributos incidentes sobre o preco deste servico e de R$: ${(parseFloat(documento.valor_tributos as any) || 0).toFixed(2).replace('.', ',')}</infAdFisco>` : ''}
</imp>
<infCTeNorm>
<infCarga>
<vCarga>${(parseFloat(documento.valor_carga as any) || 0).toFixed(2)}</vCarga>
<proPred>${produto.descricao}</proPred>
<xOutCat>LIQUIDO</xOutCat>
<infQ>
<cUnid>04</cUnid>
<tpMed>LT</tpMed>
<qCarga>${(parseFloat(documento.quantidade_carga as any) || 0).toFixed(4)}</qCarga>
</infQ>
<vCargaAverb>${(parseFloat(documento.valor_carga as any) || 0).toFixed(2)}</vCargaAverb>
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

function parseEndereco(enderecoCompleto: string | undefined | null, cidade?: string, estado?: string, cep?: string) {
  if (!enderecoCompleto) {
    return {
      logradouro: 'NAO INFORMADO',
      numero: 'SN',
      bairro: 'NAO INFORMADO',
      cidade: cidade || 'NAO INFORMADO',
      uf: estado || 'SP',
      cep: (cep || '00000000').replace(/\D/g, '')
    }
  }

  const partes = enderecoCompleto.split(',').map(parte => parte.trim())

  // Se tem 6 partes, é endereço completo: "Rua Exemplo, 123, Centro, Iraí de Minas, MG, 01234-567"
  if (partes.length >= 6) {
    return {
      logradouro: partes[0] || 'NAO INFORMADO',
      numero: partes[1] || 'SN',
      bairro: partes[2] || 'NAO INFORMADO',
      cidade: partes[3] || 'NAO INFORMADO',
      uf: partes[4] || 'SP',
      cep: (partes[5] || '00000000').replace(/\D/g, '')
    }
  }

  // Se tem 5 partes, pode ser: "Rua Exemplo, 123, Centro, Cidade, UF" (sem CEP)
  if (partes.length === 5) {
    return {
      logradouro: partes[0] || 'NAO INFORMADO',
      numero: partes[1] || 'SN',
      bairro: partes[2] || 'NAO INFORMADO',
      cidade: partes[3] || cidade || 'NAO INFORMADO',
      uf: partes[4] || estado || 'SP',
      cep: (cep || '00000000').replace(/\D/g, '')
    }
  }

  // Se tem 3 partes ou menos, é endereço básico: "Rua Exemplo, 123, Centro"
  return {
    logradouro: partes[0] || 'NAO INFORMADO',
    numero: partes[1] || 'SN',
    bairro: partes[2] || 'NAO INFORMADO',
    cidade: cidade || 'NAO INFORMADO',
    uf: estado || 'SP',
    cep: (cep || '00000000').replace(/\D/g, '')
  }
}

// Função para buscar código IBGE da cidade
async function getCityCode(cityName: string, uf: string): Promise<string> {
  try {
    console.log('🔍 Buscando código IBGE para cidade:', cityName, 'UF:', uf)

    // Normalizar nome da cidade (remover acentos manualmente)
    const normalizedCity = removeAccents(cityName.toUpperCase().trim())

    try {
      // Buscar com JOIN correto entre cities e states, normalizando acentuação
      let result = await query(`
        SELECT c.cod_city, c.name, s.uf
        FROM cities c
        JOIN states s ON c.state_id = s.id
        WHERE UPPER(TRIM(TRANSLATE(c.name, 
          'ÀÁÂÃÄÅàáâãäåÒÓÔÕÖØòóôõöøÈÉÊËèéêëÇçÌÍÎÏìíîïÙÚÛÜùúûüÿÑñ', 
          'AAAAAAaaaaaaOOOOOOooooooEEEEeeeeeCcIIIIiiiiUUUUuuuuyNn'))) = $1
        AND UPPER(s.uf) = UPPER($2)
        LIMIT 1
      `, [normalizedCity, uf])

      if (result && result.length > 0) {
        console.log('✅ Código IBGE encontrado diretamente:', result[0].cod_city, 'para cidade:', result[0].name)
        return result[0].cod_city
      }

      // Tentar busca com LIKE para cidades com nomes similares, normalizando acentuação
      result = await query(`
        SELECT c.cod_city, c.name, s.uf
        FROM cities c
        JOIN states s ON c.state_id = s.id
        WHERE UPPER(TRIM(TRANSLATE(c.name, 
          'ÀÁÂÃÄÅàáâãäåÒÓÔÕÖØòóôõöøÈÉÊËèéêëÇçÌÍÎÏìíîïÙÚÛÜùúûüÿÑñ', 
          'AAAAAAaaaaaaOOOOOOooooooEEEEeeeeeCcIIIIiiiiUUUUuuuuyNn'))) LIKE $1
        AND UPPER(s.uf) = UPPER($2)
        LIMIT 1
      `, [`%${normalizedCity}%`, uf])

      if (result && result.length > 0) {
        console.log('✅ Código IBGE encontrado com LIKE:', result[0].cod_city, 'para cidade:', result[0].name)
        return result[0].cod_city
      }

      // Tentar busca alternativa por nome do estado, normalizando acentuação
      result = await query(`
        SELECT c.cod_city, c.name, s.uf
        FROM cities c
        JOIN states s ON c.state_id = s.id
        WHERE UPPER(TRIM(TRANSLATE(c.name, 
          'ÀÁÂÃÄÅàáâãäåÒÓÔÕÖØòóôõöøÈÉÊËèéêëÇçÌÍÎÏìíîïÙÚÛÜùúûüÿÑñ', 
          'AAAAAAaaaaaaOOOOOOooooooEEEEeeeeeCcIIIIiiiiUUUUuuuuyNn'))) = $1
        AND (UPPER(s.name) = UPPER($2) OR UPPER(s.uf) = UPPER($2))
        LIMIT 1
      `, [normalizedCity, uf])

      if (result && result.length > 0) {
        console.log('✅ Código IBGE encontrado via nome estado:', result[0].cod_city, 'para cidade:', result[0].name)
        return result[0].cod_city
      }
    } catch (dbError) {
      console.log('⚠️ Erro na consulta SQL, usando fallback:', dbError instanceof Error ? dbError.message : String(dbError))
    }

    // Tentar usar fallback de cidades conhecidas
    const fallbackCode = getCityCodeFromFallback(cityName, uf)
    if (fallbackCode) {
      console.log('✅ Código encontrado no fallback:', fallbackCode)
      return fallbackCode
    }

    console.log('⚠️ Cidade não encontrada, usando fallback genérico para UF:', uf)
    // Fallback: retornar código genérico baseado na UF
    const ufMap: { [key: string]: string } = {
      "AC": "1200000", "AL": "2700000", "AP": "1600000", "AM": "1300000", 
      "BA": "2900000", "CE": "2300000", "DF": "5300000", "ES": "3200000",
      "GO": "5200000", "MA": "2100000", "MT": "5100000", "MS": "5000000",
      "MG": "3100000", "PA": "1500000", "PB": "2500000", "PR": "4100000",
      "PE": "2600000", "PI": "2200000", "RJ": "3300000", "RN": "2400000",
      "RS": "4300000", "RO": "1100000", "RR": "1400000", "SC": "4200000",
      "SP": "3500000", "SE": "2800000", "TO": "1700000"
    }

    const genericCode = ufMap[uf.toUpperCase()] || '3550308'
    console.log('📍 Código genérico para', uf, ':', genericCode)
    return genericCode
  } catch (error) {
    console.error('❌ Erro ao buscar código da cidade:', error)
    return '3550308' // Default para São Paulo
  }
}

// Função para buscar UF baseada no código IBGE da cidade
async function getUFFromCityCode(cityCode: string): Promise<string> {
  try {
    console.log('🔍 Buscando UF para código da cidade:', cityCode)

    // Primeiro tentar usar o mapeamento por código IBGE (mais rápido e confiável)
    const ufFromCode = getUFFromCode(cityCode?.substring(0, 2) || '35')
    console.log('📍 UF do mapeamento por código:', ufFromCode)

    // Se conseguiu mapear por código, usar esse resultado
    if (ufFromCode !== 'SP' || cityCode?.substring(0, 2) === '35') {
      return ufFromCode
    }

    // Se não conseguiu mapear ou é código padrão, tentar buscar no banco
    try {
      // Buscar com JOIN correto entre cities e states
      const result = await query(`
        SELECT s.uf, s.name as uf_name
        FROM cities c
        JOIN states s ON c.state_id = s.id
        WHERE c.cod_city = $1
        LIMIT 1
      `, [cityCode])

      if (result && result.length > 0) {
        const uf = result[0].uf
        if (uf) {
          console.log('✅ UF encontrada via JOIN com states:', uf)
          return uf.toUpperCase()
        }
      }
    } catch (dbError) {
      console.log('⚠️ Erro ao consultar banco, usando mapeamento por código:', dbError instanceof Error ? dbError.message : String(dbError))
    }

    console.log('⚠️ UF não encontrada na tabela, usando fallback final')
    return ufFromCode
  } catch (error) {
    console.error('❌ Erro ao buscar UF da cidade:', error)
    return 'SP' // Default para São Paulo
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

  const uf = ufMap[codigo] || "SP"
  console.log('🗺️ Mapeamento código para UF - Código:', codigo, '→ UF:', uf)
  return uf
}