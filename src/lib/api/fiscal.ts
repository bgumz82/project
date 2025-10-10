import { query, queryOne } from "@/lib/db";

// Tipos para Empresas Fiscais
export interface EmpresaFiscal {
  id: string;
  razao_social: string;
  cnpj: string;
  ie: string | null;
  endereco_completo: string;
  codigo_uf: string;
  rntrc: string | null;
  status: "ativo" | "inativo" | "suspenso";
  proximo_numero_cte: number;
  proximo_numero_mdfe: number;
  serie_padrao_cte: string;
  serie_padrao_mdfe: string;
  path_arquivos: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmpresaFiscalCreate {
  razao_social: string;
  cnpj: string;
  ie?: string | null;
  endereco_completo: string;
  codigo_uf?: string;
  rntrc?: string | null;
  status?: "ativo" | "inativo" | "suspenso";
  proximo_numero_cte?: number;
  proximo_numero_mdfe?: number;
  serie_padrao_cte?: string;
  serie_padrao_mdfe?: string;
  path_arquivos?: string | null;
}

// Tipos para CT-e
export interface CTeDocumento {
  id: string;
  empresa_id: string;
  numero_cte: string;
  serie: string;
  data_emissao: string;
  chave_acesso: string | null;
  codigo_uf: string;
  forma_emissao: number;
  codigo_numerico: string | null;
  dv: string | null;
  status: "pendente" | "emitido" | "cancelado";
  observacoes: string | null;
  xml_proc_path: string | null;
  xml_path: string | null;
  pdf_path: string | null;
  xml_gerado: boolean;
  pdf_gerado: boolean;
  xml_gerado_em: string | null;
  pdf_gerado_em: string | null;
  created_at: string;
  updated_at: string;
  empresa?: {
    razao_social: string;
    cnpj: string;
  };
  // Campos para participantes (podem ser UUIDs de clientes ou valores especiais)
  tomador_id?: string | null;
  remetente_id?: string | null;
  recebedor_id?: string | null;
  destinatario_id?: string | null;
  // Campos para serviços e impostos
  valor_prestacao?: number | null;
  valor_receber?: number | null;
  valor_tributos?: number | null;
  valor_pedagio?: number | null;
  valor_seguro?: number | null;
  icms_situacao_tributaria?: string | null;
  icms_bc_valor?: number | null;
  icms_aliquota?: number | null;
  icms_valor?: number | null;
  // Campos para dados fiscais
  valor_carga?: number | null;
  quantidade_carga?: number | null;
  produto_predominante_id?: string | null;
  chave_acesso_1?: string | null;
  chave_acesso_2?: string | null;
  chave_acesso_3?: string | null;
  chave_acesso_4?: string | null;
  // Campos CT-e adicionais
  tipo_servico?: string | null;
  finalidade_cte?: string | null;
  cfop?: string | null;
  cidade_inicio_ibge?: string | null;
  cidade_termino_ibge?: string | null;
  uf_inicio?: string | null;
  uf_termino?: string | null;
  cidade_inicio_nome?: string | null;
  cidade_termino_nome?: string | null;
  // Campos de transporte
  rntrc?: string | null;
  motorista_nome?: string | null;
  motorista_cnh?: string | null;
  motorista_matricula?: string | null;
  motorista_validade_cnh?: string | null;
  placa_veiculo?: string | null;
  placa_reboque?: string | null;
  associacao_frota_id?: string | null;
}

export interface CTeDocumentoCreate {
  empresa_id: string;
  numero_cte?: string;
  serie?: string;
  data_emissao: string;
  codigo_uf?: string;
  forma_emissao?: number;
  status?: "pendente" | "emitido" | "cancelado";
  observacoes?: string | null;
  // Campos para participantes (podem ser UUIDs de clientes ou valores especiais)
  tomador_id?: string | null;
  remetente_id?: string | null;
  recebedor_id?: string | null;
  destinatario_id?: string | null;
  // Campos para serviços e impostos
  valor_prestacao?: number | null;
  valor_receber?: number | null;
  valor_tributos?: number | null;
  valor_pedagio?: number | null;
  valor_seguro?: number | null;
  icms_situacao_tributaria?: string | null;
  icms_bc_valor?: number | null;
  icms_aliquota?: number | null;
  icms_valor?: number | null;
  // Campos para dados fiscais
  valor_carga?: number | null;
  quantidade_carga?: number | null;
  produto_predominante_id?: string | null;
  chave_acesso_1?: string | null;
  chave_acesso_2?: string | null;
  chave_acesso_3?: string | null;
  chave_acesso_4?: string | null;
  // Campos CT-e adicionais
  tipo_servico?: string | null;
  finalidade_cte?: string | null;
  cfop?: string | null;
  cidade_inicio_ibge?: string | null;
  cidade_termino_ibge?: string | null;
  uf_inicio?: string | null;
  uf_termino?: string | null;
  cidade_inicio_nome?: string | null;
  cidade_termino_nome?: string | null;
  // Campos de transporte
  rntrc?: string | null;
  motorista_nome?: string | null;
  motorista_cnh?: string | null;
  motorista_matricula?: string | null;
  motorista_validade_cnh?: string | null;
  placa_veiculo?: string | null;
  placa_reboque?: string | null;
  associacao_frota_id?: string | null;
}

// Tipos para MDF-e
export interface MDFeDocumento {
  id: string;
  empresa_id: string;
  numero_mdfe: string;
  serie: string;
  data_emissao: string;
  chave_acesso: string | null;
  codigo_uf: string;
  forma_emissao: number;
  codigo_numerico: string | null;
  dv: string | null;
  status: "pendente" | "aguardando" | "emitido" | "cancelado" | "encerrado";
  observacoes: string | null;
  xml_proc_path: string | null;
  xml_path: string | null;
  pdf_path: string | null;
  xml_gerado: boolean;
  pdf_gerado: boolean;
  xml_gerado_em: string | null;
  pdf_gerado_em: string | null;
  created_at: string;
  updated_at: string;
  empresa?: EmpresaFiscal;
  ctes_vinculados?: Array<{
    id: string
    numero_cte: string
    serie: string
    data_emissao: string
    chave_acesso?: string
    status: string
  }>
}

export interface MDFeDocumentoCreate {
  empresa_id: string;
  numero_mdfe?: string;
  serie?: string;
  data_emissao: string;
  codigo_uf?: string;
  forma_emissao?: number;
  status?: "pendente" | "aguardando" | "emitido" | "cancelado" | "encerrado";
  observacoes?: string | null;
  // CT-es relacionados
  cte_ids?: string[];
}

// Códigos UF do Brasil
export const CODIGOS_UF = {
  AC: "12",
  AL: "27",
  AP: "16",
  AM: "13",
  BA: "29",
  CE: "23",
  DF: "53",
  ES: "32",
  GO: "52",
  MA: "21",
  MT: "51",
  MS: "50",
  MG: "31",
  PA: "15",
  PB: "25",
  PR: "41",
  PE: "26",
  PI: "22",
  RJ: "33",
  RN: "24",
  RS: "43",
  RO: "11",
  RR: "14",
  SC: "42",
  SP: "35",
  SE: "28",
  TO: "17",
};

// ===== EMPRESAS FISCAIS =====

export async function getEmpresasFiscais(): Promise<EmpresaFiscal[]> {
  try {
    console.log("🔍 Buscando empresas fiscais");

    const result = await query(`
      SELECT *
      FROM empresas_fiscais
      ORDER BY razao_social
    `); // 🎯 USAR BANCO DO USUÁRIO

    console.log("✅ Empresas fiscais encontradas:", result.length);
    return result;
  } catch (error) {
    console.error("❌ Erro ao buscar empresas fiscais:", error);
    throw error;
  }
}

export async function getEmpresaFiscal(
  id: string,
): Promise<EmpresaFiscal | null> {
  try {
    const result = await queryOne(
      `
      SELECT *
      FROM empresas_fiscais
      WHERE id = $1
    `,
      [id]
    ); // 🎯 USAR BANCO DO USUÁRIO

    return result;
  } catch (error) {
    console.error("❌ Erro ao buscar empresa fiscal:", error);
    throw error;
  }
}

export async function createEmpresaFiscal(
  empresa: EmpresaFiscalCreate,
): Promise<EmpresaFiscal> {
  try {
    console.log("📝 Criando nova empresa fiscal:", empresa);

    // Limpar e validar CNPJ
    const cnpjLimpo = empresa.cnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) {
      throw new Error("CNPJ deve conter exatamente 14 dígitos");
    }

    // Verificar se CNPJ já existe
    const existingEmpresa = await queryOne(
      `
      SELECT id FROM empresas_fiscais WHERE cnpj = $1
    `,
      [cnpjLimpo]
    ); // 🎯 USAR BANCO DO USUÁRIO

    if (existingEmpresa) {
      throw new Error("CNPJ já cadastrado no sistema");
    }

    const result = await queryOne(
      `
      INSERT INTO empresas_fiscais (
        razao_social,
        cnpj,
        ie,
        endereco_completo,
        codigo_uf,
        rntrc,
        status,
        proximo_numero_cte,
        proximo_numero_mdfe,
        serie_padrao_cte,
        serie_padrao_mdfe,
        path_arquivos,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `,
      [
        empresa.razao_social,
        cnpjLimpo,
        empresa.ie,
        empresa.endereco_completo,
        empresa.codigo_uf || "35", // SP por padrão
        empresa.rntrc,
        empresa.status || "ativo",
        empresa.proximo_numero_cte || 1,
        empresa.proximo_numero_mdfe || 1,
        empresa.serie_padrao_cte || "001",
        empresa.serie_padrao_mdfe || "001",
        empresa.path_arquivos ? (empresa.path_arquivos.startsWith('./') ? empresa.path_arquivos.substring(2) : empresa.path_arquivos.startsWith('/') ? empresa.path_arquivos.substring(1) : empresa.path_arquivos) : empresa.path_arquivos,
      ]
    ); // 🎯 USAR BANCO DO USUÁRIO

    if (!result) {
      throw new Error("Erro ao criar empresa fiscal");
    }

    console.log("✅ Empresa fiscal criada com sucesso:", result.id);
    return result;
  } catch (error) {
    console.error("❌ Erro ao criar empresa fiscal:", error);
    throw error;
  }
}

export async function updateEmpresaFiscal(
  id: string,
  empresa: Partial<EmpresaFiscalCreate>,
): Promise<EmpresaFiscal> {
  try {
    console.log("📝 Atualizando empresa fiscal:", id, empresa);

    let cnpjLimpo: string | undefined;

    // Limpar e validar CNPJ se fornecido
    if (empresa.cnpj) {
      cnpjLimpo = empresa.cnpj.replace(/\D/g, "");
      if (cnpjLimpo.length !== 14) {
        throw new Error("CNPJ deve conter exatamente 14 dígitos");
      }

      // Verificar se CNPJ já existe em outra empresa
      const existingEmpresa = await queryOne(
        `
        SELECT id FROM empresas_fiscais WHERE cnpj = $1 AND id != $2
      `,
        [cnpjLimpo, id]
      ); // 🎯 USAR BANCO DO USUÁRIO

      if (existingEmpresa) {
        throw new Error("CNPJ já cadastrado em outra empresa");
      }
    }

    // Normalizar path_arquivos se fornecido
    if (empresa.path_arquivos !== undefined && empresa.path_arquivos) {
      let pathNormalizado = empresa.path_arquivos;

      // Remover "./" do início se existir
      if (pathNormalizado.startsWith('./')) {
        pathNormalizado = pathNormalizado.substring(2);
      }

      // Garantir que não comece com "/"
      if (pathNormalizado.startsWith('/')) {
        pathNormalizado = pathNormalizado.substring(1);
      }

      empresa.path_arquivos = pathNormalizado;
    }

    // Construir query dinamicamente
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (empresa.razao_social !== undefined) {
      updates.push(`razao_social = $${paramIndex}`);
      values.push(empresa.razao_social);
      paramIndex++;
    }

    if (cnpjLimpo !== undefined) {
      updates.push(`cnpj = $${paramIndex}`);
      values.push(cnpjLimpo);
      paramIndex++;
    }

    if (empresa.ie !== undefined) {
      updates.push(`ie = $${paramIndex}`);
      values.push(empresa.ie);
      paramIndex++;
    }

    if (empresa.endereco_completo !== undefined) {
      updates.push(`endereco_completo = $${paramIndex}`);
      values.push(empresa.endereco_completo);
      paramIndex++;
    }

    if (empresa.codigo_uf !== undefined) {
      updates.push(`codigo_uf = $${paramIndex}`);
      values.push(empresa.codigo_uf);
      paramIndex++;
    }

    if (empresa.rntrc !== undefined) {
      updates.push(`rntrc = $${paramIndex}`);
      values.push(empresa.rntrc);
      paramIndex++;
    }

    if (empresa.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(empresa.status);
      paramIndex++;
    }

    if (empresa.proximo_numero_cte !== undefined) {
      updates.push(`proximo_numero_cte = $${paramIndex}`);
      values.push(empresa.proximo_numero_cte);
      paramIndex++;
    }

    if (empresa.proximo_numero_mdfe !== undefined) {
      updates.push(`proximo_numero_mdfe = $${paramIndex}`);
      values.push(empresa.proximo_numero_mdfe);
      paramIndex++;
    }

    if (empresa.serie_padrao_cte !== undefined) {
      updates.push(`serie_padrao_cte = $${paramIndex}`);
      values.push(empresa.serie_padrao_cte);
      paramIndex++;
    }

    if (empresa.serie_padrao_mdfe !== undefined) {
      updates.push(`serie_padrao_mdfe = $${paramIndex}`);
      values.push(empresa.serie_padrao_mdfe);
      paramIndex++;
    }

    if (empresa.path_arquivos !== undefined) {
      let pathFinal = empresa.path_arquivos;

      // Normalizar path se não for null
      if (pathFinal) {
        // Remover "./" do início se existir
        if (pathFinal.startsWith('./')) {
          pathFinal = pathFinal.substring(2);
        }

        // Garantir que não comece com "/"
        if (pathFinal.startsWith('/')) {
          pathFinal = pathFinal.substring(1);
        }
      }

      updates.push(`path_arquivos = $${paramIndex}`);
      values.push(pathFinal);
      paramIndex++;
    }

    // Sempre atualizar updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Apenas updated_at
      throw new Error("Nenhum campo para atualizar");
    }

    // Adicionar ID como último parâmetro
    values.push(id);

    const result = await queryOne(
      `
      UPDATE empresas_fiscais
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values
    ); // 🎯 USAR BANCO DO USUÁRIO

    if (!result) {
      throw new Error("Empresa fiscal não encontrada");
    }

    console.log("✅ Empresa fiscal atualizada com sucesso:", result.id);
    return result;
  } catch (error) {
    console.error("❌ Erro ao atualizar empresa fiscal:", error);
    throw error;
  }
}

export async function deleteEmpresaFiscal(id: string): Promise<void> {
  try {
    console.log("🗑️ Excluindo empresa fiscal:", id);

    // Verificar se há documentos vinculados
    const cteCount = await queryOne(
      `
      SELECT COUNT(*) as count FROM cte_documentos WHERE empresa_id = $1
    `,
      [id]
    ); // 🎯 USAR BANCO DO USUÁRIO

    const mdfeCount = await queryOne(
      `
      SELECT COUNT(*) as count FROM mdfe_documentos WHERE empresa_id = $1
    `,
      [id]
    ); // 🎯 USAR BANCO DO USUÁRIO

    if (
      (cteCount && parseInt(cteCount.count) > 0) ||
      (mdfeCount && parseInt(mdfeCount.count) > 0)
    ) {
      throw new Error(
        "Não é possível excluir empresa com documentos fiscais vinculados",
      );
    }

    await query("DELETE FROM empresas_fiscais WHERE id = $1", [id]); // 🎯 USAR BANCO DO USUÁRIO
    console.log("✅ Empresa fiscal excluída com sucesso");
  } catch (error) {
    console.error("❌ Erro ao excluir empresa fiscal:", error);
    throw error;
  }
}

// ===== CT-e DOCUMENTOS =====

export async function getCTeDocumentos(): Promise<CTeDocumento[]> {
  try {
    console.log("🔍 Buscando documentos CT-e");

    const result = await query(`
      SELECT 
        c.*,
        e.razao_social as empresa_razao_social,
        e.cnpj as empresa_cnpj
      FROM cte_documentos c
      JOIN empresas_fiscais e ON c.empresa_id = e.id
      ORDER BY c.data_emissao DESC, c.numero_cte DESC
    `); // 🎯 USAR BANCO DO USUÁRIO

    console.log("✅ Documentos CT-e encontrados:", result.length);

    return result.map((doc) => ({
      ...doc,
      empresa: {
        razao_social: doc.empresa_razao_social,
        cnpj: doc.empresa_cnpj,
      },
    }));
  } catch (error) {
    console.error("❌ Erro ao buscar documentos CT-e:", error);
    throw error;
  }
}

export async function createCTeDocumento(
  documento: CTeDocumentoCreate,
): Promise<CTeDocumento> {
  try {
    console.log("📝 Criando novo documento CT-e:", documento);
    console.log("🔍 Validando empresa_id:", {
      valor: documento.empresa_id,
      tipo: typeof documento.empresa_id,
      existe: !!documento.empresa_id,
      temConteudo: documento.empresa_id && documento.empresa_id.toString().trim() !== ''
    });

    // Validar campos obrigatórios
    if (!documento.empresa_id || typeof documento.empresa_id !== 'string' || documento.empresa_id.trim() === '') {
      console.error("❌ empresa_id inválido:", documento.empresa_id);
      throw new Error("Campo empresa_id é obrigatório");
    }

    // Verificar se empresa existe e buscar dados
    console.log("🔍 Verificando empresa_id:", documento.empresa_id);

    const empresa = await queryOne(
      `
      SELECT id, serie_padrao_cte, codigo_uf, status FROM empresas_fiscais WHERE id = $1
    `,
      [documento.empresa_id]
    ); // 🎯 USAR BANCO DO USUÁRIO

    console.log("🏢 Empresa encontrada:", empresa);

    if (!empresa) {
      console.error("❌ Empresa não encontrada para ID:", documento.empresa_id);
      throw new Error("Empresa fiscal não encontrada");
    }

    if (empresa.status !== 'ativo') {
      console.error("❌ Empresa não está ativa:", empresa.status);
      throw new Error("Empresa fiscal não está ativa");
    }

    // Obter próximo número automaticamente se não fornecido
    let numeroFinal = documento.numero_cte;
    if (!numeroFinal || numeroFinal === "AUTO" || numeroFinal.trim() === "") {
      const nextNumber = await query(
        `
        SELECT get_next_cte_number($1) as numero
      `,
        [documento.empresa_id],
      );
      numeroFinal = nextNumber[0].numero.toString();
    }

    // Usar série padrão da empresa se não fornecida
    const serieFinal = documento.serie || empresa.serie_padrao_cte || "001";

    // Verificar se número/série já existe para esta empresa
    const existingDoc = await queryOne(
      `
      SELECT id FROM cte_documentos 
      WHERE empresa_id = $1 AND numero_cte = $2 AND serie = $3
    `,
      [documento.empresa_id, numeroFinal, serieFinal],
    );

    if (existingDoc) {
      throw new Error("Número CT-e e série já existem para esta empresa");
    }

    // Validação obrigatória da Chave de Acesso 1
    if (!documento.chave_acesso_1 || documento.chave_acesso_1.trim() === '') {
      throw new Error("Chave de Acesso 1 é obrigatória.");
    }

    // Validação das chaves de acesso (44 dígitos completos incluindo DV)
    if (documento.chave_acesso_1.length !== 44) {
      throw new Error("Chave de Acesso 1 deve conter 44 dígitos.");
    }
    if (documento.chave_acesso_2 && documento.chave_acesso_2 !== null && documento.chave_acesso_2 !== undefined && documento.chave_acesso_2.trim() !== '' && documento.chave_acesso_2.length !== 44) {
      throw new Error("Chave de Acesso 2 deve conter 44 dígitos.");
    }
    if (documento.chave_acesso_3 && documento.chave_acesso_3 !== null && documento.chave_acesso_3 !== undefined && documento.chave_acesso_3.trim() !== '' && documento.chave_acesso_3.length !== 44) {
      throw new Error("Chave de Acesso 3 deve conter 44 dígitos.");
    }
    if (documento.chave_acesso_4 && documento.chave_acesso_4 !== null && documento.chave_acesso_4 !== undefined && documento.chave_acesso_4.trim() !== '' && documento.chave_acesso_4.length !== 44) {
      throw new Error("Chave de Acesso 4 deve conter 44 dígitos.");
    }

    // ATENÇÃO: chave_acesso_1, 2, 3, 4 são chaves das NF-es referenciadas (não do CT-e)
    // A chave_acesso principal será gerada automaticamente pelo sistema para o CT-e

    // Validar chaves das NF-es referenciadas (se fornecidas)
    const chavesNFe = [documento.chave_acesso_1, documento.chave_acesso_2, documento.chave_acesso_3, documento.chave_acesso_4]
      .filter(chave => chave && chave.trim() !== '');

    // Validar cada chave de NF-e fornecida
    chavesNFe.forEach((chave, index) => {
      if (chave && chave.length !== 44) {
        throw new Error(`Chave de Acesso ${index + 1} (NF-e) deve conter 44 dígitos.`);
      }
    });

    // A chave de acesso do CT-e será gerada automaticamente pelo trigger do banco

    // Usar API do servidor ao invés de query direta
    const response = await fetch('/api/cte-documentos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth.token')}`
      },
      body: JSON.stringify(documento)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao criar documento CT-e');
    }

    const result = await response.json();

    // Verificar se a chave de acesso foi gerada e forçar regeneração se necessário
    if (!result.chave_acesso) {
      console.log("⚠️ Chave de acesso não gerada, forçando regeneração...");

      const updatedResult = await queryOne(
        `
        UPDATE cte_documentos 
        SET chave_acesso = NULL,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `, [result.id]);

      if (updatedResult) {
        console.log("✅ Chave de acesso regenerada:", updatedResult.chave_acesso);
        return updatedResult;
      }
    }

    if (!result) {
      throw new Error("Erro ao criar documento CT-e");
    }

    console.log("✅ Documento CT-e criado com sucesso:", result.id);
    return result;
  } catch (error) {
    console.error("❌ Erro ao criar documento CT-e:", error);
    throw error;
  }
}

export async function updateCTeDocumento(
  id: string,
  documento: Partial<CTeDocumentoCreate>,
): Promise<CTeDocumento> {
  try {
    console.log("📝 Atualizando documento CT-e:", id, documento);

    // Verificar se o CT-e existe
    const cteExistente = await queryOne(
      `SELECT empresa_id FROM cte_documentos WHERE id = $1`,
      [id]
    );

    if (!cteExistente) {
      throw new Error("Documento CT-e não encontrado");
    }

    // Se empresa_id está sendo alterado, verificar se a nova empresa existe
    if (documento.empresa_id) {
      const empresa = await queryOne(
        `SELECT id FROM empresas_fiscais WHERE id = $1`,
        [documento.empresa_id]
      );

      if (!empresa) {
        throw new Error("Empresa fiscal não encontrada");
      }
    }

    // Validação das chaves de acesso (44 dígitos completos incluindo DV)
    const validarChave = (chave: string | undefined | null, numero: number) => {
      if (chave && typeof chave === 'string' && chave.trim() !== '') {
        const chaveLimpa = chave.replace(/\D/g, ''); // Remove caracteres não numéricos
        if (chaveLimpa.length !== 44) {
          throw new Error(`Chave de Acesso ${numero} (NF-e) deve conter 44 dígitos. Encontrados: ${chaveLimpa.length}`);
        }
      }
    };

    try {
      validarChave(documento.chave_acesso_1, 1);
      validarChave(documento.chave_acesso_2, 2);
      validarChave(documento.chave_acesso_3, 3);
      validarChave(documento.chave_acesso_4, 4);
      console.log('✅ Validação das chaves de acesso aprovada');
    } catch (error) {
      console.error('❌ Erro na validação das chaves:', error);
      throw error;
    }

    // Construir query dinamicamente apenas com campos que têm valores válidos
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Campos obrigatórios - sempre incluir se fornecidos
    if (documento.empresa_id) {
      updates.push(`empresa_id = $${paramIndex}`);
      values.push(documento.empresa_id);
      paramIndex++;
    }

    if (documento.data_emissao) {
      updates.push(`data_emissao = $${paramIndex}`);
      values.push(documento.data_emissao);
      paramIndex++;
    }

    // Campos opcionais - só incluir se não forem null/undefined/empty
    if (documento.numero_cte) {
      updates.push(`numero_cte = $${paramIndex}`);
      values.push(documento.numero_cte);
      paramIndex++;
    }

    if (documento.serie) {
      updates.push(`serie = $${paramIndex}`);
      values.push(documento.serie);
      paramIndex++;
    }

    if (documento.forma_emissao !== undefined && documento.forma_emissao !== null) {
      updates.push(`forma_emissao = $${paramIndex}`);
      values.push(documento.forma_emissao);
      paramIndex++;
    }

    if (documento.status) {
      updates.push(`status = $${paramIndex}`);
      values.push(documento.status);
      paramIndex++;
    }

    if (documento.observacoes !== undefined) {
      updates.push(`observacoes = $${paramIndex}`);
      values.push(documento.observacoes);
      paramIndex++;
    }

    if (documento.valor_carga !== undefined && documento.valor_carga !== null) {
      updates.push(`valor_carga = $${paramIndex}`);
      values.push(documento.valor_carga);
      paramIndex++;
    }

    if (documento.quantidade_carga !== undefined && documento.quantidade_carga !== null) {
      updates.push(`quantidade_carga = $${paramIndex}`);
      values.push(documento.quantidade_carga);
      paramIndex++;
    }

    if (documento.produto_predominante_id) {
      updates.push(`produto_predominante_id = $${paramIndex}`);
      values.push(documento.produto_predominante_id);
      paramIndex++;
    }

    if (documento.chave_acesso_1) {
      updates.push(`chave_acesso_1 = $${paramIndex}`);
      values.push(documento.chave_acesso_1);
      paramIndex++;
    }

    if (documento.chave_acesso_2) {
      updates.push(`chave_acesso_2 = $${paramIndex}`);
      values.push(documento.chave_acesso_2);
      paramIndex++;
    }

    if (documento.chave_acesso_3) {
      updates.push(`chave_acesso_3 = $${paramIndex}`);
      values.push(documento.chave_acesso_3);
      paramIndex++;
    }

    if (documento.chave_acesso_4) {
      updates.push(`chave_acesso_4 = $${paramIndex}`);
      values.push(documento.chave_acesso_4);
      paramIndex++;
    }

    // Participantes
    if (documento.tomador_id) {
      updates.push(`tomador_id = $${paramIndex}`);
      values.push(documento.tomador_id);
      paramIndex++;
    }

    if (documento.remetente_id) {
      updates.push(`remetente_id = $${paramIndex}`);
      values.push(documento.remetente_id);
      paramIndex++;
    }

    if (documento.recebedor_id) {
      updates.push(`recebedor_id = $${paramIndex}`);
      values.push(documento.recebedor_id);
      paramIndex++;
    }

    if (documento.destinatario_id) {
      updates.push(`destinatario_id = $${paramIndex}`);
      values.push(documento.destinatario_id);
      paramIndex++;
    }

    // Valores financeiros com validação
    const validarValorFinanceiro = (valor: any, nome: string) => {
      if (valor !== undefined && valor !== null) {
        const valorNum = typeof valor === 'string' ? parseFloat(valor) : valor;
        if (isNaN(valorNum) || valorNum < 0) {
          throw new Error(`Valor inválido para ${nome}: ${valor}`);
        }
        return valorNum;
      }
      return null;
    };

    const valorPrestacaoValidado = validarValorFinanceiro(documento.valor_prestacao, 'Valor da Prestação');
    if (valorPrestacaoValidado !== null) {
      updates.push(`valor_prestacao = $${paramIndex}`);
      values.push(valorPrestacaoValidado);
      paramIndex++;
    }

    const valorReceberValidado = validarValorFinanceiro(documento.valor_receber, 'Valor a Receber');
    if (valorReceberValidado !== null) {
      updates.push(`valor_receber = $${paramIndex}`);
      values.push(valorReceberValidado);
      paramIndex++;
    }

    const valorTributosValidado = validarValorFinanceiro(documento.valor_tributos, 'Valor dos Tributos');
    if (valorTributosValidado !== null) {
      updates.push(`valor_tributos = $${paramIndex}`);
      values.push(valorTributosValidado);
      paramIndex++;
    }

    // Adicionar os novos campos de pedágio e seguro com validação
    const valorPedagioValidado = validarValorFinanceiro(documento.valor_pedagio, 'Valor do Pedágio');
    if (valorPedagioValidado !== null) {
      updates.push(`valor_pedagio = $${paramIndex}`);
      values.push(valorPedagioValidado);
      paramIndex++;
    }

    const valorSeguroValidado = validarValorFinanceiro(documento.valor_seguro, 'Valor do Seguro');
    if (valorSeguroValidado !== null) {
      updates.push(`valor_seguro = $${paramIndex}`);
      values.push(valorSeguroValidado);
      paramIndex++;
    }

    // ICMS
    if (documento.icms_situacao_tributaria) {
      updates.push(`icms_situacao_tributaria = $${paramIndex}`);
      values.push(documento.icms_situacao_tributaria);
      paramIndex++;
    }

    if (documento.icms_bc_valor !== undefined && documento.icms_bc_valor !== null) {
      updates.push(`icms_bc_valor = $${paramIndex}`);
      values.push(documento.icms_bc_valor);
      paramIndex++;
    }

    if (documento.icms_aliquota !== undefined && documento.icms_aliquota !== null) {
      updates.push(`icms_aliquota = $${paramIndex}`);
      values.push(documento.icms_aliquota);
      paramIndex++;
    }

    if (documento.icms_valor !== undefined && documento.icms_valor !== null) {
      updates.push(`icms_valor = $${paramIndex}`);
      values.push(documento.icms_valor);
      paramIndex++;
    }

    // Localização
    if (documento.cidade_inicio_ibge) {
      updates.push(`cidade_inicio_ibge = $${paramIndex}`);
      values.push(documento.cidade_inicio_ibge);
      paramIndex++;
    }

    if (documento.cidade_termino_ibge) {
      updates.push(`cidade_termino_ibge = $${paramIndex}`);
      values.push(documento.cidade_termino_ibge);
      paramIndex++;
    }

    if (documento.uf_inicio) {
      updates.push(`uf_inicio = $${paramIndex}`);
      values.push(documento.uf_inicio);
      paramIndex++;
    }

    if (documento.uf_termino) {
      updates.push(`uf_termino = $${paramIndex}`);
      values.push(documento.uf_termino);
      paramIndex++;
    }

    if (documento.cidade_inicio_nome) {
      updates.push(`cidade_inicio_nome = $${paramIndex}`);
      values.push(documento.cidade_inicio_nome);
      paramIndex++;
    }

    if (documento.cidade_termino_nome) {
      updates.push(`cidade_termino_nome = $${paramIndex}`);
      values.push(documento.cidade_termino_nome);
      paramIndex++;
    }

    // Transporte
    if (documento.rntrc) {
      updates.push(`rntrc = $${paramIndex}`);
      values.push(documento.rntrc);
      paramIndex++;
    }

    if (documento.motorista_nome) {
      updates.push(`motorista_nome = $${paramIndex}`);
      values.push(documento.motorista_nome);
      paramIndex++;
    }

    if (documento.motorista_cnh) {
      updates.push(`motorista_cnh = $${paramIndex}`);
      values.push(documento.motorista_cnh);
      paramIndex++;
    }

    if (documento.motorista_matricula) {
      updates.push(`motorista_matricula = $${paramIndex}`);
      values.push(documento.motorista_matricula);
      paramIndex++;
    }

    if (documento.motorista_validade_cnh) {
      updates.push(`motorista_validade_cnh = $${paramIndex}`);
      values.push(documento.motorista_validade_cnh);
      paramIndex++;
    }

    if (documento.placa_veiculo) {
      updates.push(`placa_veiculo = $${paramIndex}`);
      values.push(documento.placa_veiculo);
      paramIndex++;
    }

    if (documento.placa_reboque) {
      updates.push(`placa_reboque = $${paramIndex}`);
      values.push(documento.placa_reboque);
      paramIndex++;
    }

    if (documento.associacao_frota_id) {
      updates.push(`associacao_frota_id = $${paramIndex}`);
      values.push(documento.associacao_frota_id);
      paramIndex++;
    }

    // Sempre atualizar updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Apenas updated_at
      throw new Error("Nenhum campo para atualizar");
    }

    // Adicionar ID como último parâmetro
    values.push(id);

    console.log("🔍 Query de UPDATE:", updates);
    console.log("📋 Valores para UPDATE:", values);
    console.log("🔍 Query completa:", `UPDATE cte_documentos SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`);

    // Validar se todos os valores são válidos antes da query
    values.forEach((value, index) => {
      if (value !== null && value !== undefined) {
        console.log(`📋 Parâmetro ${index + 1}:`, { tipo: typeof value, valor: value });
      }
    });

    const result = await queryOne(
      `
      UPDATE cte_documentos
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values,
    );

    if (!result) {
      throw new Error("Documento CT-e não encontrado");
    }

    console.log("✅ Documento CT-e atualizado com sucesso:", result.id);
    return result;
  } catch (error) {
    console.error("❌ Erro ao atualizar documento CT-e:", error);
    throw error;
  }
}

export async function deleteCTeDocumento(id: string): Promise<void> {
  try {
    console.log("🗑️ Excluindo documento CT-e:", id);

    await query("DELETE FROM cte_documentos WHERE id = $1", [id]);
    console.log("✅ Documento CT-e excluído com sucesso");
  } catch (error) {
    console.error("❌ Erro ao excluir documento CT-e:", error);
    throw error;
  }
}

// Função para mudar status de CT-e para emitido (para teste do MDF-e)
export async function emitirCTeParaTeste(id: string): Promise<void> {
  try {
    console.log("🚀 Emitindo CT-e para teste:", id);

    await query("UPDATE cte_documentos SET status = 'emitido' WHERE id = $1", [id]);
    console.log("✅ CT-e status alterado para 'emitido' com sucesso");
  } catch (error) {
    console.error("❌ Erro ao emitir CT-e:", error);
    throw error;
  }
}

// ===== CT-es EMITIDOS PARA MDF-e =====

export async function getCTeEmitidosParaMDFe(): Promise<CTeDocumento[]> {
  try {
    console.log("🔍 Buscando CT-es emitidos disponíveis para MDF-e");

    // Primeiro verificar quantos CT-es existem por status
    const statusCount = await query(`
      SELECT status, COUNT(*) as total 
      FROM cte_documentos 
      GROUP BY status
    `);
    console.log("📊 CT-es por status:", statusCount);

    // Primeiro, verificar se a tabela mdfe_cte_relacionados existe
    let tabelaExiste = true;
    try {
      await query("SELECT 1 FROM mdfe_cte_relacionados LIMIT 1");
      console.log("✅ Tabela mdfe_cte_relacionados existe");
    } catch (error) {
      console.log("❌ Tabela mdfe_cte_relacionados NÃO existe:", error);
      tabelaExiste = false;
    }

    // Query sem verificar relacionamentos se tabela não existir
    const querySQL = tabelaExiste ? `
      SELECT 
        c.*,
        e.razao_social as empresa_razao_social,
        e.cnpj as empresa_cnpj
      FROM cte_documentos c
      JOIN empresas_fiscais e ON c.empresa_id = e.id
      WHERE c.status = 'emitido'
      AND c.id NOT IN (
        SELECT DISTINCT cte_documento_id 
        FROM mdfe_cte_relacionados 
        WHERE cte_documento_id IS NOT NULL
      )
      ORDER BY c.data_emissao DESC, c.numero_cte DESC
    ` : `
      SELECT 
        c.*,
        e.razao_social as empresa_razao_social,
        e.cnpj as empresa_cnpj
      FROM cte_documentos c
      JOIN empresas_fiscais e ON c.empresa_id = e.id
      WHERE c.status = 'emitido'
      ORDER BY c.data_emissao DESC, c.numero_cte DESC
    `;

    console.log("🔍 Query SQL que será executada:", querySQL);

    const result = await query(querySQL);

    console.log("✅ CT-es emitidos disponíveis para MDF-e:", result.length);

    // Se não houver CT-es emitidos, mostrar quais existem
    if (result.length === 0) {
      const todosCTes = await query(`
        SELECT numero_cte, status, data_emissao 
        FROM cte_documentos 
        ORDER BY numero_cte DESC 
        LIMIT 5
      `);
      console.log("🚨 Nenhum CT-e emitido encontrado. CT-es existentes:", todosCTes);
    }

    return result.map((doc) => ({
      ...doc,
      empresa: {
        razao_social: doc.empresa_razao_social,
        cnpj: doc.empresa_cnpj,
      },
    }));
  } catch (error) {
    console.error("❌ Erro ao buscar CT-es emitidos para MDF-e:", error);
    throw error;
  }
}

// Função para buscar CT-es vinculados a um MDF-e
export async function getCTesVinculadosMDFe(mdfeId: string): Promise<CTeDocumento[]> {
  try {
    console.log("🔍 Buscando CT-es vinculados ao MDF-e:", mdfeId);

    const result = await query(`
      SELECT 
        c.id,
        c.numero_cte,
        c.serie,
        c.data_emissao,
        c.chave_acesso,
        c.status
      FROM cte_documentos c
      JOIN mdfe_cte_relacionados mcr ON c.id = mcr.cte_documento_id
      WHERE mcr.mdfe_documento_id = $1
      ORDER BY c.numero_cte
    `, [mdfeId]);

    console.log("✅ CT-es vinculados encontrados:", result.length);
    return result;
  } catch (error) {
    console.error("❌ Erro ao buscar CT-es vinculados:", error);
    throw error;
  }
}

// ===== MDF-e DOCUMENTOS =====

export async function getMDFeDocumentos(): Promise<MDFeDocumento[]> {
  try {
    console.log("🔍 Buscando documentos MDF-e");

    const response = await fetch('/api/mdfe-documentos', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth.token')}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro na resposta:", response.status, errorText);
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error("❌ Resposta não é JSON:", responseText.substring(0, 200));
      throw new Error('Servidor retornou HTML ao invés de JSON. Verifique se a rota está configurada corretamente.');
    }

    const documentos = await response.json();
    console.log("✅ Documentos MDF-e encontrados:", documentos.length);

    return documentos;
  } catch (error) {
    console.error("❌ Erro ao buscar documentos MDF-e:", error);
    throw error;
  }
}

export async function createMDFeDocumento(
  documento: MDFeDocumentoCreate,
): Promise<MDFeDocumento> {
  try {
    console.log("📝 Criando novo documento MDF-e:", documento);

    // Validar se há CT-es selecionados
    if (!documento.cte_ids || documento.cte_ids.length === 0) {
      throw new Error("É necessário selecionar pelo menos um CT-e emitido para criar o MDF-e");
    }

    // Verificar se todos os CT-es estão emitidos
    const ctesValidation = await query(
      `
      SELECT id, numero_cte, status 
      FROM cte_documentos 
      WHERE id = ANY($1) AND empresa_id = $2
    `,
      [documento.cte_ids, documento.empresa_id],
    );

    if (ctesValidation.length !== documento.cte_ids.length) {
      throw new Error("Alguns CT-es selecionados não foram encontrados ou não pertencem à empresa");
    }

    const ctesNaoEmitidos = ctesValidation.filter(cte => cte.status !== 'emitido');
    if (ctesNaoEmitidos.length > 0) {
      throw new Error(`CT-es ${ctesNaoEmitidos.map(c => c.numero_cte).join(', ')} não estão emitidos`);
    }

    console.log("✅ CT-es validados:", ctesValidation.length);

    // Verificar se empresa existe e buscar dados
    const empresa = await queryOne(
      `
      SELECT id, serie_padrao_mdfe, codigo_uf, proximo_numero_mdfe FROM empresas_fiscais WHERE id = $1
    `,
      [documento.empresa_id],
    );

    if (!empresa) {
      throw new Error("Empresa fiscal não encontrada");
    }

    // APLICAR MESMA LÓGICA DE NUMERAÇÃO SEQUENCIAL DO CT-e
    let numeroFinal = documento.numero_mdfe;
    if (!numeroFinal || numeroFinal === "AUTO" || numeroFinal.trim() === "") {
      console.log("🔒 Obtendo próximo número MDF-e da empresa cadastrada...");

      // Buscar último número real usado nos documentos desta empresa
      const ultimoNumeroResult = await query(`
        SELECT COALESCE(MAX(CAST(numero_mdfe AS INTEGER)), 0) as ultimo_numero
        FROM mdfe_documentos
        WHERE empresa_id = $1
        AND numero_mdfe ~ '^[0-9]+$'
      `, [documento.empresa_id]);

      const ultimoNumeroReal = ultimoNumeroResult[0].ultimo_numero || 0;
      const proximoNumeroCalculado = ultimoNumeroReal + 1;

      console.log("📋 ÚLTIMO NÚMERO MDF-e REAL NA BASE:", ultimoNumeroReal);
      console.log("📋 PRÓXIMO NÚMERO MDF-e CALCULADO:", proximoNumeroCalculado);
      console.log("📋 VALOR NA EMPRESA (campo):", empresa.proximo_numero_mdfe);

      // Usar o maior entre calculado e campo da empresa
      numeroFinal = Math.max(proximoNumeroCalculado, empresa.proximo_numero_mdfe).toString();
      console.log("📋 NÚMERO MDF-e FINAL ESCOLHIDO:", numeroFinal);

      // Verificar se já existe (prevenção contra duplicatas)
      const existeResult = await query(`
        SELECT id FROM mdfe_documentos 
        WHERE empresa_id = $1 AND numero_mdfe = $2
      `, [documento.empresa_id, numeroFinal]);

      if (existeResult.length > 0) {
        let tentativas = 0;
        do {
          numeroFinal = (parseInt(numeroFinal) + 1).toString();
          tentativas++;
          const novaVerificacao = await query(`
            SELECT id FROM mdfe_documentos 
            WHERE empresa_id = $1 AND numero_mdfe = $2
          `, [documento.empresa_id, numeroFinal]);

          if (novaVerificacao.length === 0) break;

          if (tentativas > 100) {
            throw new Error('Erro interno: não foi possível encontrar número MDF-e disponível');
          }
        } while (true);

        console.log('📋 Número MDF-e ajustado para evitar duplicata:', numeroFinal);
      }

      // Atualizar o próximo número na empresa
      await query(`
        UPDATE empresas_fiscais 
        SET proximo_numero_mdfe = $2
        WHERE id = $1
      `, [documento.empresa_id, parseInt(numeroFinal) + 1]);

      console.log('📋 Próximo número MDF-e atualizado na empresa para:', parseInt(numeroFinal) + 1);
    }

    // Usar série padrão da empresa se não fornecida
    const serieFinal = documento.serie || empresa.serie_padrao_mdfe || "001";

    // SEMPRE usar código UF da empresa (não permitir override)
    const codigoUFFinal = empresa.codigo_uf || "35";

    // Gerar código numérico aleatório (8 dígitos) - usado na chave de acesso
    const codigoNumerico = Math.floor(Math.random() * 90000000) + 10000000;

    // Buscar dados de início/término dos CT-es selecionados
    const primeiroCtE = await queryOne(`
      SELECT cidade_inicio_ibge, cidade_inicio_nome, uf_inicio,
             cidade_termino_ibge, cidade_termino_nome, uf_termino
      FROM cte_documentos
      WHERE id = $1
    `, [documento.cte_ids[0]]);

    const result = await queryOne(
      `
      INSERT INTO mdfe_documentos (
        empresa_id,
        numero_mdfe,
        serie,
        data_emissao,
        codigo_uf,
        forma_emissao,
        codigo_numerico,
        status,
        observacoes,
        cidade_inicio_ibge,
        cidade_inicio_nome,
        uf_inicio,
        cidade_termino_ibge,
        cidade_termino_nome,
        uf_termino,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *
    `,
      [
        documento.empresa_id,
        numeroFinal,
        serieFinal,
        documento.data_emissao,
        codigoUFFinal,
        documento.forma_emissao || 1,
        codigoNumerico.toString(),
        documento.status || "pendente",
        documento.observacoes,
        primeiroCtE?.cidade_inicio_ibge || null,
        primeiroCtE?.cidade_inicio_nome || null,
        primeiroCtE?.uf_inicio || null,
        primeiroCtE?.cidade_termino_ibge || null,
        primeiroCtE?.cidade_termino_nome || null,
        primeiroCtE?.uf_termino || null,
      ],
    );

    if (!result) {
      throw new Error("Erro ao criar documento MDF-e");
    }

    // Vincular CT-es ao MDF-e
    console.log("🔗 Vinculando CT-es ao MDF-e...");
    for (const cteId of documento.cte_ids) {
      await query(
        `
        INSERT INTO mdfe_cte_relacionados (mdfe_documento_id, cte_documento_id, created_at)
        VALUES ($1, $2, NOW())
      `,
        [result.id, cteId],
      );
    }

    console.log("✅ Documento MDF-e criado com sucesso:", result.id);
    console.log("✅ CT-es vinculados:", documento.cte_ids.length);

    // Gerar XML automaticamente após criar o documento
    try {
      console.log("🚀 Gerando XML do MDF-e automaticamente...");
      await generateMDFeFiles(result.id);
      console.log("✅ XML do MDF-e gerado com sucesso");
    } catch (xmlError) {
      console.error("❌ Erro ao gerar XML do MDF-e:", xmlError);
      // Não falhar a criação por causa do XML
    }

    return result;
  } catch (error) {
    console.error("❌ Erro ao criar documento MDF-e:", error);
    throw error;
  }
}

export async function updateMDFeDocumento(
  id: string,
  documento: Partial<MDFeDocumentoCreate>,
): Promise<MDFeDocumento> {
  try {
    console.log("📝 Atualizando documento MDF-e:", id, documento);

    // Se estiver atualizando apenas o status, usar endpoint específico
    const keys = Object.keys(documento);
    if (keys.length === 1 && keys[0] === 'status') {
      const response = await fetch(`/api/mdfe-documentos/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth.token')}`
        },
        body: JSON.stringify({ status: documento.status })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar status do MDF-e');
      }

      const result = await response.json();
      console.log("✅ Status atualizado:", result.status);

      // Buscar documento atualizado
      const mdfeDocumentos = await getMDFeDocumentos();
      const updatedDoc = mdfeDocumentos.find((doc: MDFeDocumento) => doc.id === id);
      if (!updatedDoc) {
        throw new Error("Documento não encontrado após atualização");
      }
      return updatedDoc;
    }

    // Atualização normal via query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (documento.empresa_id !== undefined) {
      updates.push(`empresa_id = $${paramIndex}`);
      values.push(documento.empresa_id);
      paramIndex++;
    }

    if (documento.numero_mdfe !== undefined) {
      updates.push(`numero_mdfe = $${paramIndex}`);
      values.push(documento.numero_mdfe);
      paramIndex++;
    }

    if (documento.serie !== undefined) {
      updates.push(`serie = $${paramIndex}`);
      values.push(documento.serie);
      paramIndex++;
    }

    if (documento.data_emissao !== undefined) {
      updates.push(`data_emissao = $${paramIndex}`);
      values.push(documento.data_emissao);
      paramIndex++;
    }

    if (documento.codigo_uf !== undefined) {
      updates.push(`codigo_uf = $${paramIndex}`);
      values.push(documento.codigo_uf);
      paramIndex++;
    }

    if (documento.forma_emissao !== undefined) {
      updates.push(`forma_emissao = $${paramIndex}`);
      values.push(documento.forma_emissao);
      paramIndex++;
    }

    if (documento.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(documento.status);
      paramIndex++;
    }

    if (documento.observacoes !== undefined) {
      updates.push(`observacoes = $${paramIndex}`);
      values.push(documento.observacoes);
      paramIndex++;
    }

    // Sempre atualizar updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Apenas updated_at
      throw new Error("Nenhum campo para atualizar");
    }

    // Adicionar ID como último parâmetro
    values.push(id);

    const result = await queryOne(
      `
      UPDATE mdfe_documentos
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values,
    );

    if (!result) {
      throw new Error("Documento MDF-e não encontrado");
    }

    console.log("✅ Documento MDF-e atualizado com sucesso:", result.id);
    return result;
  } catch (error) {
    console.error("❌ Erro ao atualizar documento MDF-e:", error);
    throw error;
  }
}

export async function verificarArquivosMDFe(): Promise<{ atualizados: number; total: number; message: string }> {
  try {
    console.log("🔍 Verificando arquivos de MDF-es em aguardando...");

    const response = await fetch('/api/mdfe-documentos/verificar-arquivos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth.token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao verificar arquivos');
    }

    const result = await response.json();
    console.log("✅ Verificação concluída:", result);
    return result;
  } catch (error) {
    console.error("❌ Erro ao verificar arquivos:", error);
    throw error;
  }
}

export async function deleteMDFeDocumento(id: string): Promise<void> {
  try {
    console.log("🗑️ Excluindo documento MDF-e:", id);

    // Fazer a exclusão via API do servidor que já tem toda a lógica implementada
    const response = await fetch(`/api/mdfe-documentos/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth.token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao excluir documento MDF-e');
    }

    const result = await response.json();
    console.log("✅ Documento MDF-e excluído com sucesso:", result.message);

    if (result.ctesLiberados && result.ctesLiberados.length > 0) {
      console.log("🔗 CT-es liberados:", result.ctesLiberados);
    }
  } catch (error) {
    console.error("❌ Erro ao excluir documento MDF-e:", error);
    throw error;
  }
}

// Tipos para Apólices de Seguro
export interface ApoliceSeguro {
  id: string;
  empresa_id: string;
  numero_apolice: string;
  identificador: string;
  data_inicial: string;
  data_final: string;
  limite_averbacao: number;
  seguradora_nome: string;
  seguradora_cnpj: string;
  status: "ativa" | "vencida" | "cancelada";
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresa?: {
    razao_social: string;
    cnpj: string;
  };
}

export interface ApoliceSeguroCreate {
  empresa_id: string;
  numero_apolice: string;
  identificador: string;
  data_inicial: string;
  data_final: string;
  limite_averbacao: number;
  seguradora_nome: string;
  seguradora_cnpj: string;
  status?: "ativa" | "vencida" | "cancelada";
  observacoes?: string | null;
  ativo?: boolean;
}

// Tipos para Controle de Frete
export interface FreteDocumento {
  id: string;
  empresa_id: string;
  cliente_origem_id: string;
  cliente_destino_id: string;
  cidade_origem_ibge: string;
  cidade_destino_ibge: string;
  valor_frete: number;
  valor_pedagio: number;
  valor_seguro: number;
  valor_comissao: number;
  km: number;
  seguro_carga_id: string | null;
  cobranca_pedagio: boolean;
  cobranca_seguro: boolean;
  tomador_frete: "remetente" | "destinatario";
  tipo_reboque: "vanderleia" | "vanderleia_4_eixos" | "bi_trem" | "julieta";
  tipo_produto: "LEITE" | "CREME" | "SORO";
  emissao_automatica: boolean;
  status: "pendente" | "emitido" | "cancelado";
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  cidade_origem_nome?: string;
  cidade_destino_nome?: string;
  empresa?: {
    razao_social: string;
    cnpj: string;
  };
  cliente_origem?: {
    razao_social: string;
    cidade: string;
    estado: string;
  };
  cliente_destino?: {
    razao_social: string;
    cidade: string;
    estado: string;
  };
}

export interface FreteDocumentoCreate {
  empresa_id: string;
  cliente_origem_id: string;
  cliente_destino_id: string;
  cidade_origem_ibge: string;
  cidade_destino_ibge: string;
  valor_frete: number;
  valor_pedagio?: number;
  valor_seguro?: number;
  valor_comissao?: number;
  km: number;
  seguro_carga_id?: string | null;
  cobranca_pedagio?: boolean;
  cobranca_seguro?: boolean;
  tomador_frete: "remetente" | "destinatario";
  tipo_reboque: "vanderleia" | "vanderleia_4_eixos" | "bi_trem" | "julieta";
  tipo_produto: "LEITE" | "CREME" | "SORO";
  emissao_automatica?: boolean;
  status?: "pendente" | "emitido" | "cancelado";
  observacoes?: string | null;
  ativo?: boolean;
}

// ===== FUNÇÕES AUXILIARES =====

export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/[^\d]/g, "");
  return cleaned.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    "$1.$2.$3/$4-$5",
  );
}

export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/[^\d]/g, "");
  return cleaned.length === 14;
}

export function formatChaveAcesso(chave: string): string {
  // Retornar chave sem formatação (sem espaços)
  return chave || "";
}

export function getUFFromCode(codigo: string): string {
  const ufMap: { [key: string]: string } = {
    "12": "AC",
    "27": "AL",
    "16": "AP",
    "23": "AM",
    "29": "BA",
    "13": "CE",
    "53": "DF",
    "32": "ES",
    "52": "GO",
    "21": "MA",
    "51": "MT",
    "50": "MS",
    "31": "MG",
    "15": "PA",
    "25": "PB",
    "41": "PR",
    "26": "PE",
    "22": "PI",
    "33": "RJ",
    "24": "RN",
    "43": "RS",
    "11": "RO",
    "14": "RR",
    "42": "SC",
    "35": "SP",
    "28": "SE",
    "17": "TO",
  };

  return ufMap[codigo] || codigo;
}

// ===== FUNÇÕES PARA CONTROLE DE ARQUIVOS =====

export async function updateDocumentFiles(
  documentType: "cte" | "mdfe",
  documentId: string,
  files: {
    xmlProcPath?: string;
    xmlPath?: string;
    pdfPath?: string;
    xmlGerado?: boolean;
    pdfGerado?: boolean;
  },
): Promise<void> {
  try {
    console.log(
      "📁 Atualizando arquivos do documento:",
      documentType,
      documentId,
      files,
    );

    const tableName =
      documentType === "cte" ? "cte_documentos" : "mdfe_documentos";

    // Construir query dinamicamente
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (files.xmlProcPath !== undefined) {
      updates.push(`xml_proc_path = $${paramIndex}`);
      values.push(files.xmlProcPath);
      paramIndex++;
    }

    if (files.xmlPath !== undefined) {
      updates.push(`xml_path = $${paramIndex}`);
      values.push(files.xmlPath);
      paramIndex++;
    }

    if (files.pdfPath !== undefined) {
      updates.push(`pdf_path = $${paramIndex}`);
      values.push(files.pdfPath);
      paramIndex++;
    }

    if (files.xmlGerado !== undefined) {
      updates.push(`xml_gerado = $${paramIndex}`);
      values.push(files.xmlGerado);
      paramIndex++;

      if (files.xmlGerado) {
        updates.push(`xml_gerado_em = NOW()`);
      }
    }

    if (files.pdfGerado !== undefined) {
      updates.push(`pdf_gerado = $${paramIndex}`);
      values.push(files.pdfGerado);
      paramIndex++;

      if (files.pdfGerado) {
        updates.push(`pdf_gerado_em = NOW()`);
      }
    }

    // Sempre atualizar updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Apenas updated_at
      throw new Error("Nenhum arquivo para atualizar");
    }

    // Adicionar ID como último parâmetro
    values.push(documentId);

    await query(
      `
      UPDATE ${tableName}
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
    `,
      values,
    );

    console.log("✅ Arquivos do documento atualizados com sucesso");
  } catch (error) {
    console.error("❌ Erro ao atualizar arquivos do documento:", error);
    throw error;
  }
}

export async function getNextDocumentNumber(
  empresaId: string,
  documentType: "cte" | "mdfe",
): Promise<number> {
  try {
    const functionName =
      documentType === "cte" ? "get_next_cte_number" : "get_next_mdfe_number";

    const result = await query(
      `
      SELECT ${functionName}($1) as numero
    `,
      [empresaId],
    );

    return result[0].numero;
  } catch (error) {
    console.error("❌ Erro ao obter próximo número:", error);
    throw error;
  }
}

export async function checkDocumentFileExists(
  filePath: string,
): Promise<boolean> {
  try {
    const response = await fetch(filePath, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function generateAccessKey(
  codigoUF: string,
  dataEmissao: string,
  cnpj: string,
  modelo: string,
  serie: string,
  numero: string,
  formaEmissao: number,
): Promise<string> {
  try {
    const result = await query(
      `
      SELECT gerar_chave_acesso($1, $2::date, $3, $4, $5, $6, $7) as chave_acesso
    `,
      [codigoUF, dataEmissao, cnpj, modelo, serie, numero, formaEmissao],
    );

    return result[0].chave_acesso;
  } catch (error) {
    console.error("❌ Erro ao gerar chave de acesso:", error);
    throw error;
  }
}

// Função para gerar arquivos XML e PDF do MDF-e
export async function generateMDFeFiles(documentoId: string): Promise<void> {
  try {
    console.log("📄 Iniciando geração de arquivos para MDF-e:", documentoId);

    // Buscar dados completos do MDF-e
    console.log("🔍 Buscando dados completos do documento...");
    const documento = await queryOne(`
      SELECT m.*, e.razao_social as empresa_razao_social, e.cnpj as empresa_cnpj, 
             e.ie as empresa_ie, e.endereco_completo as empresa_endereco, 
             e.codigo_uf as empresa_codigo_uf, e.rntrc as empresa_rntrc,
             e.path_arquivos as empresa_path
      FROM mdfe_documentos m
      JOIN empresas_fiscais e ON m.empresa_id = e.id
      WHERE m.id = $1
    `, [documentoId]);

    if (!documento) {
      throw new Error("Documento MDF-e não encontrado");
    }

    console.log("✅ Documento MDF-e encontrado:", documento.numero_mdfe);

    // Buscar CT-es vinculados ao MDF-e com todos os dados necessários
    console.log("🔍 Buscando CT-es vinculados ao MDF-e...");
    const ctesRelacionados = await query(`
      SELECT 
        c.id,
        c.numero_cte,
        c.chave_acesso,
        c.placa_veiculo,
        c.placa_reboque,
        c.motorista_nome,
        c.valor_carga,
        c.quantidade_carga,
        c.cidade_termino_ibge,
        c.cidade_termino_nome,
        p.descricao as produto_nome
      FROM mdfe_cte_relacionados mcr
      JOIN cte_documentos c ON mcr.cte_documento_id = c.id
      LEFT JOIN cte_produtos p ON c.produto_predominante_id = p.id
      WHERE mcr.mdfe_documento_id = $1
      ORDER BY c.numero_cte
    `, [documentoId]);

    if (!ctesRelacionados || ctesRelacionados.length === 0) {
      throw new Error("Nenhum CT-e vinculado encontrado para este MDF-e");
    }

    console.log("📋 CT-es relacionados encontrados:", ctesRelacionados.length);
    console.log("📋 Primeiro CT-e:", ctesRelacionados[0]);

    // Construir caminhos dos arquivos
    const basePath = documento.empresa_path || `uploads/fiscal/${documento.empresa_cnpj}`;
    const chaveAcesso = documento.chave_acesso;

    // Estrutura de pastas: {empresa_path}/mdfe/
    const xmlPath = `${basePath}/mdfe/${chaveAcesso}-mdfe.xml`;
    const pdfPath = `${basePath}/mdfe/${chaveAcesso}-damdfe.pdf`;
    const xmlProcPath = `${basePath}/mdfe/${chaveAcesso}-procMDFe.xml`;

    console.log("📁 Caminhos dos arquivos:", {
      xml: xmlPath,
      pdf: pdfPath,
      xmlProc: xmlProcPath
    });

    // Gerar conteúdo XML do MDF-e
    const xmlContent = await generateMDFeXML(documento, ctesRelacionados);

    // Salvar arquivo XML fisicamente
    try {
      const xmlFileName = `${chaveAcesso}-mdfe.xml`;
      const fullXmlPath = `${basePath}/mdfe/${xmlFileName}`;

      console.log("💾 Salvando arquivo XML...");
      console.log("📁 Salvando arquivo em:", fullXmlPath);
      const response = await fetch('/api/upload-xml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: xmlContent,
          path: fullXmlPath,
          filename: xmlFileName
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Arquivo XML salvo fisicamente:", result.path);
      } else {
        console.log("⚠️ Erro no upload, mas XML foi gerado:", await response.text());
      }

      console.log("📄 Preview do XML:", xmlContent.substring(0, 300) + "...");

    } catch (writeError) {
      console.error("❌ Erro ao salvar arquivo XML:", writeError);
      console.log("📄 Conteúdo XML gerado:", xmlContent.substring(0, 200) + "...");
    }

    // Atualizar status dos arquivos no banco
    await query(`
      UPDATE mdfe_documentos 
      SET xml_path = $1, pdf_path = $2, xml_proc_path = $3,
          xml_gerado = true, pdf_gerado = false,
          xml_gerado_em = NOW(), pdf_gerado_em = NULL,
          updated_at = NOW()
      WHERE id = $4
    `, [xmlPath, pdfPath, xmlProcPath, documentoId]);

    console.log("✅ Arquivo MDF-e processado com sucesso:", {
      xml: xmlPath,
      pdf: pdfPath,
      xmlProc: xmlProcPath,
      xmlGerado: true
    });

  } catch (error) {
    console.error("❌ Erro ao gerar arquivos MDF-e:", error);
    throw error;
  }
}

// Função auxiliar para remover hífens da placa
function formatPlacaParaCInt(placa: string): string {
  if (!placa) return '0001';
  // Remove hífen e retorna apenas os números/letras finais (últimos 4 caracteres sem hífen)
  const placaSemHifen = placa.replace(/-/g, '');
  return placaSemHifen.substring(3); // Pega do 4º caractere em diante
}

// Função auxiliar para parsear endereço
function parseEnderecoMDFe(enderecoCompleto: string): {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
} {
  // Formato esperado: "LOGRADOURO, NUMERO, BAIRRO, CIDADE, UF, CEP"
  const partes = enderecoCompleto.split(',').map(p => p.trim());

  return {
    logradouro: partes[0] || 'NAO INFORMADO',
    numero: partes[1] || 'SN',
    bairro: partes[2] || 'CENTRO',
    cidade: partes[3] || 'NAO INFORMADO',
    uf: partes[4] || 'MG',
    cep: (partes[5] || '00000000').replace(/\D/g, '')
  };
}

// Função para gerar conteúdo XML do MDF-e
async function generateMDFeXML(documento: any, ctesRelacionados: any[]): Promise<string> {
  // Usar a data/hora atual para dhEmi (momento da geração do XML)
  const agora = new Date();
  const dataEmissao = agora.toISOString().split('T')[0].replace(/-/g, '').substring(2); // AAMMDD
  const horaEmissao = agora.toTimeString().split(' ')[0]; // HH:MM:SS
  const dhEmi = `20${dataEmissao.substring(0,2)}-${dataEmissao.substring(2,4)}-${dataEmissao.substring(4,6)}T${horaEmissao}-03:00`;

  // Calcular totais dos CT-es relacionados
  const totalValorCarga = ctesRelacionados.reduce((sum, cte) => sum + parseFloat(cte.valor_carga || 0), 0);
  const totalQuantidadeCarga = ctesRelacionados.reduce((sum, cte) => sum + parseFloat(cte.quantidade_carga || 0), 0);

  // Pegar dados do primeiro CT-e para veículos e motorista
  const primeiroCtE = ctesRelacionados[0] || {};
  const produtoPredominante = ctesRelacionados.find(cte => cte.produto_nome) || {};

  // Buscar dados completos do motorista (incluindo CPF)
  let motoristaData: any = null;
  if (primeiroCtE.motorista_nome) {
    motoristaData = await queryOne(`
      SELECT nome, cpf, cnh, matricula
      FROM funcionarios
      WHERE nome = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [primeiroCtE.motorista_nome]);
  }

  // Buscar dados completos dos veículos do primeiro CT-e
  let veiculoTracao: any = null;
  let veiculoReboque: any = null;

  if (primeiroCtE.placa_veiculo) {
    veiculoTracao = await queryOne(`
      SELECT placa, renavam, marca, modelo, ano, tara_kg, carga_kg, uf_registro, cor
      FROM veiculos
      WHERE placa = $1
    `, [primeiroCtE.placa_veiculo]);
  }

  if (primeiroCtE.placa_reboque) {
    veiculoReboque = await queryOne(`
      SELECT placa, renavam, marca, modelo, ano, tara_kg, carga_kg, uf_registro, cor
      FROM veiculos
      WHERE placa = $1
    `, [primeiroCtE.placa_reboque]);
  }

  // Parsear endereço da empresa
  const enderecoEmpresa = parseEnderecoMDFe(documento.empresa_endereco || '');

  // Buscar código IBGE da cidade da empresa usando função helper
  let codigoMunEmpresa = '3132404'; // Padrão Iraí de Minas
  let cepCarregamento = enderecoEmpresa.cep || '00000000';
  try {
    const cidadeEmpresa = await queryOne(`
      SELECT * FROM buscar_cidade_por_nome($1)
    `, [enderecoEmpresa.cidade]);
    if (cidadeEmpresa) {
      codigoMunEmpresa = cidadeEmpresa.cod_city;
    }
  } catch (error) {
    console.warn('⚠️ Não foi possível buscar código IBGE da cidade da empresa:', error);
  }

  // Extrair UF início e término dos CT-es
  const ufInicio = documento.uf_inicio || 'MG';
  const ufTermino = documento.uf_termino || 'MG';
  const cidadeInicioIbge = documento.cidade_inicio_ibge || codigoMunEmpresa;
  const cidadeInicioNome = documento.cidade_inicio_nome || enderecoEmpresa.cidade;

  // Agrupar CT-es por município de descarga com busca correta do código IBGE
  const municipiosDescarga = new Map<string, any[]>();

  for (const cte of ctesRelacionados) {
    let codigoIbge = cte.cidade_termino_ibge;
    const nomeCidade = cte.cidade_termino_nome || 'NAO INFORMADO';

    // Se não tem código IBGE ou está inválido, buscar no banco
    if (!codigoIbge || codigoIbge === '0000000' || codigoIbge.length !== 7) {
      try {
        const cidadeResult = await queryOne(`
          SELECT cod_city FROM cities 
          WHERE LOWER(UNACCENT(name)) = LOWER(UNACCENT($1))
          LIMIT 1
        `, [nomeCidade]);

        if (cidadeResult) {
          codigoIbge = cidadeResult.cod_city;
          console.log(`✅ Código IBGE encontrado para ${nomeCidade}: ${codigoIbge}`);
        } else {
          console.warn(`⚠️ Código IBGE não encontrado para: ${nomeCidade}`);
          codigoIbge = '0000000';
        }
      } catch (error) {
        console.error(`❌ Erro ao buscar código IBGE para ${nomeCidade}:`, error);
        codigoIbge = '0000000';
      }
    }

    const chave = `${codigoIbge}|${nomeCidade}`;

    if (!municipiosDescarga.has(chave)) {
      municipiosDescarga.set(chave, []);
    }
    municipiosDescarga.get(chave)!.push(cte);
  }

  // Buscar CEP da cidade de descarregamento (última cidade dos CT-es)
  let cepDescarregamento = '00000000';
  if (ctesRelacionados.length > 0) {
    const ultimoCte = ctesRelacionados[ctesRelacionados.length - 1];
    const cidadeDescarregamento = ultimoCte.cidade_termino_nome;

    if (cidadeDescarregamento) {
      try {
        const cadastroResult = await queryOne(`
          SELECT cep FROM cadastros 
          WHERE LOWER(UNACCENT(cidade)) = LOWER(UNACCENT($1))
          AND cep IS NOT NULL
          LIMIT 1
        `, [cidadeDescarregamento]);

        if (cadastroResult && cadastroResult.cep) {
          cepDescarregamento = cadastroResult.cep.replace(/\D/g, '');
        }
      } catch (error) {
        console.warn('⚠️ Não foi possível buscar CEP de descarregamento:', error);
      }
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<MDFe xmlns="http://www.portalfiscal.inf.br/mdfe">
  <infMDFe versao="3.00" Id="MDFe${documento.chave_acesso}">
    <ide>
      <cUF>${documento.codigo_uf || '31'}</cUF>
      <tpAmb>2</tpAmb>
      <tpEmit>1</tpEmit>
      <tpTransp>1</tpTransp>
      <mod>58</mod>
      <serie>${documento.serie}</serie>
      <nMDF>${documento.numero_mdfe}</nMDF>
      <cMDF>${documento.codigo_numerico || '00000000'}</cMDF>
      <cDV>${documento.dv}</cDV>
      <modal>1</modal>
      <dhEmi>${dhEmi}</dhEmi>
      <tpEmis>1</tpEmis>
      <procEmi>0</procEmi>
      <verProc>1.0</verProc>
      <UFIni>${ufInicio}</UFIni>
      <UFFim>${ufTermino}</UFFim>
      <infMunCarrega>
        <cMunCarrega>${cidadeInicioIbge}</cMunCarrega>
        <xMunCarrega>${cidadeInicioNome}</xMunCarrega>
      </infMunCarrega>
${Array.from(municipiosDescarga.entries()).map(([chave]) => {
  const [codigoIbge, nomeCidade] = chave.split('|');
  return `      <infMunDescarga>
        <cMunDescarga>${codigoIbge}</cMunDescarga>
        <xMunDescarga>${nomeCidade}</xMunDescarga>
      </infMunDescarga>`;
}).join('\n')}
    </ide>
    <emit>
      <CNPJ>${documento.empresa_cnpj.replace(/\D/g, '')}</CNPJ>
      <IE>${documento.empresa_ie || 'ISENTO'}</IE>
      <xNome>${documento.empresa_razao_social}</xNome>
      <enderEmit>
        <xLgr>${enderecoEmpresa.logradouro}</xLgr>
        <nro>${enderecoEmpresa.numero}</nro>
        <xBairro>${enderecoEmpresa.bairro}</xBairro>
        <cMun>${codigoMunEmpresa}</cMun>
        <xMun>${enderecoEmpresa.cidade}</xMun>
        <CEP>${enderecoEmpresa.cep}</CEP>
        <UF>${enderecoEmpresa.uf}</UF>
      </enderEmit>
    </emit>
    <infModal versaoModal="3.00">
      <rodo>
        <infANTT>
          <RNTRC>${documento.empresa_rntrc || '00000000'}</RNTRC>
          <infContratante>
            <CNPJ>${documento.empresa_cnpj.replace(/\D/g, '')}</CNPJ>
          </infContratante>
        </infANTT>
        <veicTracao>
          <cInt>${formatPlacaParaCInt(veiculoTracao?.placa || primeiroCtE.placa_veiculo || 'ABC1234')}</cInt>
          <placa>${(veiculoTracao?.placa || primeiroCtE.placa_veiculo || 'ABC1234').replace(/-/g, '')}</placa>
          <RENAVAM>${veiculoTracao?.renavam || '00000000000'}</RENAVAM>
          <tara>${veiculoTracao?.tara_kg || 9000}</tara>
          <capKG>${veiculoTracao?.carga_kg || 21000}</capKG>
          ${motoristaData ? `<condutor>
            <xNome>${motoristaData.nome}</xNome>
            <CPF>${motoristaData.cpf.replace(/\D/g, '')}</CPF>
          </condutor>` : ''}
          <tpRod>01</tpRod>
          <tpCar>00</tpCar>
          <UF>${veiculoTracao?.uf_registro || 'MG'}</UF>
        </veicTracao>
        ${veiculoReboque ? `<veicReboque>
          <cInt>${formatPlacaParaCInt(veiculoReboque.placa)}</cInt>
          <placa>${veiculoReboque.placa.replace(/-/g, '')}</placa>
          <RENAVAM>${veiculoReboque.renavam || '00000000000'}</RENAVAM>
          <tara>${veiculoReboque.tara_kg || 9500}</tara>
          <capKG>${veiculoReboque.carga_kg || 35000}</capKG>
          <tpCar>00</tpCar>
          <UF>${veiculoReboque.uf_registro || 'MG'}</UF>
        </veicReboque>` : ''}
      </rodo>
    </infModal>
    <prodPred>
      <tpCarga>02</tpCarga>
      <xProd>${produtoPredominante.produto_nome || 'MERCADORIAS EM GERAL'}</xProd>
      <infLotacao>
        <infLocalCarrega>
          <CEP>${cepCarregamento}</CEP>
        </infLocalCarrega>
        <infLocalDescarrega>
          <CEP>${cepDescarregamento}</CEP>
        </infLocalDescarrega>
      </infLotacao>
    </prodPred>
    <infDoc>
${Array.from(municipiosDescarga.entries()).map(([chave]) => {
  const [codigoIbge, nomeCidade] = chave.split('|');
  return `      <infMunDescarga>
        <cMunDescarga>${codigoIbge}</cMunDescarga>
        <xMunDescarga>${nomeCidade}</xMunDescarga>
${ctesRelacionados.filter(cte => {
  let cteCodigoIbge = cte.cidade_termino_ibge;
  const cteNomeCidade = cte.cidade_termino_nome || 'NAO INFORMADO';
  if (!cteCodigoIbge || cteCodigoIbge === '0000000' || cteCodigoIbge.length !== 7) {
    // Tentar buscar código IBGE novamente se necessário
    // Este é um fallback, idealmente o código já estaria correto
  }
  return `${cteCodigoIbge}|${cteNomeCidade}` === chave;
}).map(cte => `        <infCTe>
          <chCTe>${cte.chave_acesso}</chCTe>
        </infCTe>`).join('\n')}
      </infMunDescarga>`;
}).join('\n')}
    </infDoc>
    <tot>
      <qCTe>${ctesRelacionados.length}</qCTe>
      <vCarga>${totalValorCarga.toFixed(2)}</vCarga>
      <cUnid>01</cUnid>
      <qCarga>${totalQuantidadeCarga.toFixed(4)}</qCarga>
    </tot>
  </infMDFe>
</MDFe>`;

  // Aplicar tags customizadas antes de retornar
  const xmlModificado = await aplicarTagsCustomizadasMDFe(
    xml,
    documento.empresa_id,
    documento.id
  )

  return xmlModificado
}

// Função para gerar arquivos XML e PDF do CT-e
export async function generateCTeFiles(documentoId: string): Promise<void> {
  try {
    console.log("📄 Iniciando geração de arquivos para CT-e:", documentoId);

    // Buscar dados completos do CT-e
    console.log("🔍 Buscando dados completos do documento...");
    const documento = await queryOne(`
      SELECT c.*, e.razao_social as empresa_razao_social, e.cnpj as empresa_cnpj, 
             e.ie as empresa_ie, e.endereco_completo as empresa_endereco, 
             e.codigo_uf as empresa_codigo_uf, e.rntrc as empresa_rntrc,
             e.path_arquivos as empresa_path
      FROM cte_documentos c
      JOIN empresas_fiscais e ON c.empresa_id = e.id
      WHERE c.id = $1
    `, [documentoId]);

    if (!documento) {
      throw new Error("Documento CT-e não encontrado");
    }

    console.log("✅ Documento encontrado:", {
      id: documento.id,
      numero: documento.numero_cte,
      empresa: documento.empresa_razao_social,
      chave_acesso: documento.chave_acesso
    });

    // Buscar dados dos participantes
    console.log("🔍 Buscando dados dos participantes...");
    console.log("📋 IDs para busca:", {
      tomador_id: documento.tomador_id,
      remetente_id: documento.remetente_id,
      destinatario_id: documento.destinatario_id,
      recebedor_id: documento.recebedor_id,
      produto_predominante_id: documento.produto_predominante_id
    });

    const [tomador, remetente, destinatario, recebedor, produto] = await Promise.all([
      documento.tomador_id && !['remetente', 'destinatario'].includes(documento.tomador_id) 
        ? queryOne(`SELECT * FROM cadastros WHERE id = $1`, [documento.tomador_id])
        : null,
      queryOne(`SELECT * FROM cadastros WHERE id = $1`, [documento.remetente_id]),
      queryOne(`SELECT * FROM cadastros WHERE id = $1`, [documento.destinatario_id]),
      documento.recebedor_id ? queryOne(`SELECT * FROM cadastros WHERE id = $1`, [documento.recebedor_id]) : null,
      queryOne(`SELECT * FROM cte_produtos WHERE id = $1`, [documento.produto_predominante_id])
    ]);

    console.log("✅ Participantes encontrados:", {
      tomador: tomador ? 'OK' : 'N/A',
      remetente: remetente ? 'OK' : 'FALTANDO',
      destinatario: destinatario ? 'OK' : 'FALTANDO',
      recebedor: recebedor ? 'OK' : 'N/A',
      produto: produto ? 'OK' : 'FALTANDO'
    });

    if (!remetente || !destinatario || !produto) {
      const faltando = [];
      if (!remetente) faltando.push('remetente');
      if (!destinatario) faltando.push('destinatário');
      if (!produto) faltando.push('produto');
      throw new Error(`Dados obrigatórios não encontrados: ${faltando.join(', ')}`);
    }

    // Importar função de geração XML
    console.log("📦 Importando módulo de geração XML...");
    const { generateCTeXML } = await import('./cte-xml');
    console.log("✅ Módulo importado com sucesso");

    // Gerar XML
    console.log("🔧 Iniciando geração do conteúdo XML...");
    const xmlContent = await generateCTeXML(
      documento,
      {
        id: documento.empresa_id,
        razao_social: documento.empresa_razao_social,
        cnpj: documento.empresa_cnpj,
        ie: documento.empresa_ie,
        endereco_completo: documento.empresa_endereco,
        codigo_uf: documento.empresa_codigo_uf,
        rntrc: documento.empresa_rntrc
      },
      remetente,
      destinatario,
      produto
    );

    // Normalizar basePath - sempre usar padrão sem "./" no início
    let basePath = documento.empresa_path || `uploads/fiscal/${documento.empresa_cnpj}`;

    // Remover "./" do início se existir
    if (basePath.startsWith('./')) {
      basePath = basePath.substring(2);
    }

    // Garantir que não comece com "/"
    if (basePath.startsWith('/')) {
      basePath = basePath.substring(1);
    }

    const xmlPath = `${basePath}/cte/${documento.chave_acesso}-cte.xml`;
    const pdfPath = `${basePath}/cte/${documento.chave_acesso}-dacte.pdf`;
    const xmlProcPath = `${basePath}/cte/${documento.chave_acesso}-procCTe.xml`;

    console.log("📁 Paths gerados:", {
      basePath,
      xmlPath,
      pdfPath,
      xmlProcPath
    });

    // Salvar o arquivo usando fetch para o servidor
    try {
      console.log("💾 Tentando salvar arquivo XML fisicamente...");

      const fileName = `${documento.chave_acesso}-cte.xml`;
      const fullXmlPath = `${basePath}/cte/${fileName}`;

      console.log("📁 Salvando arquivo em:", fullXmlPath);
      console.log("📄 Tamanho do conteúdo XML:", xmlContent.length, "caracteres");

      // Fazer upload do arquivo para o servidor
      const response = await fetch('/api/upload-xml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: xmlContent,
          path: fullXmlPath,
          filename: fileName
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Arquivo XML salvo fisicamente:", result.path);
      } else {
        console.log("⚠️ Erro no upload, mas XML foi gerado:", await response.text());
      }

      console.log("📄 Preview do XML:", xmlContent.substring(0, 300) + "...");

    } catch (writeError) {
      console.error("❌ Erro ao salvar arquivo XML:", writeError);
      console.log("📄 Conteúdo XML gerado:", xmlContent.substring(0, 200) + "...");

      // Mesmo com erro de salvamento, continue o processo
    }

    // Atualizar status dos arquivos no banco
    await query(`
      UPDATE cte_documentos 
      SET xml_path = $1, pdf_path = $2, xml_proc_path = $3,
          xml_gerado = true, pdf_gerado = false,
          xml_gerado_em = NOW(), pdf_gerado_em = NULL,
          updated_at = NOW()
      WHERE id = $4
    `, [xmlPath, pdfPath, xmlProcPath, documentoId]);

    console.log("✅ Arquivo CT-e processado com sucesso:", {
      xml: xmlPath,
      pdf: pdfPath,
      xmlProc: xmlProcPath,
      xmlGerado: true
    });

  } catch (error) {
    console.error("❌ Erro ao gerar arquivos CT-e:", error);
    console.error("❌ Tipo do erro:", typeof error);
    console.error("❌ Stack trace:", error instanceof Error ? error.stack : 'Sem stack trace');
    console.error("❌ Mensagem:", error instanceof Error ? error.message : String(error));

    // Melhorar a mensagem de erro
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro desconhecido na geração de arquivos CT-e';

    throw new Error(errorMessage);
  }
}

// ===== APÓLICES DE SEGURO =====

export async function getApolicesSeguro(): Promise<ApoliceSeguro[]> {
  try {
    console.log("🔍 Buscando apólices de seguro");

    const result = await query(`
      SELECT 
        a.*,
        e.razao_social as empresa_razao_social,
        e.cnpj as empresa_cnpj
      FROM apolices_seguro a
      JOIN empresas_fiscais e ON a.empresa_id = e.id
      ORDER BY a.created_at DESC
    `);

    console.log("✅ Apólices de seguro encontradas:", result.length);

    return result.map((apolice) => ({
      ...apolice,
      empresa: {
        razao_social: apolice.empresa_razao_social,
        cnpj: apolice.empresa_cnpj,
      },
    }));
  } catch (error) {
    console.error("❌ Erro ao buscar apólices de seguro:", error);
    throw error;
  }
}

export async function getApoliceSeguro(id: string): Promise<ApoliceSeguro | null> {
  try {
    const result = await queryOne(
      `
      SELECT 
        a.*,
        e.razao_social as empresa_razao_social,
        e.cnpj as empresa_cnpj
      FROM apolices_seguro a
      JOIN empresas_fiscais e ON a.empresa_id = e.id
      WHERE a.id = $1
    `,
      [id],
    );

    if (!result) return null;

    return {
      ...result,
      empresa: {
        razao_social: result.empresa_razao_social,
        cnpj: result.empresa_cnpj,
      },
    };
  } catch (error) {
    console.error("❌ Erro ao buscar apólice de seguro:", error);
    throw error;
  }
}

export async function createApoliceSeguro(
  apolice: ApoliceSeguroCreate,
): Promise<ApoliceSeguro> {
  try {
    console.log("📝 Criando nova apólice de seguro:", apolice);

    // Validações básicas
    if (!apolice.empresa_id) {
      throw new Error("Empresa é obrigatória");
    }
    if (!apolice.numero_apolice) {
      throw new Error("Número da apólice é obrigatório");
    }
    if (!apolice.identificador) {
      throw new Error("Identificador é obrigatório");
    }
    if (!apolice.data_inicial) {
      throw new Error("Data inicial é obrigatória");
    }
    if (!apolice.data_final) {
      throw new Error("Data final é obrigatória");
    }
    if (!apolice.limite_averbacao || apolice.limite_averbacao <= 0) {
      throw new Error("Limite de averbação deve ser maior que zero");
    }
    if (!apolice.seguradora_nome || !apolice.seguradora_nome.trim()) {
      throw new Error("Nome da seguradora é obrigatório");
    }
    if (!apolice.seguradora_cnpj || !apolice.seguradora_cnpj.trim()) {
      throw new Error("CNPJ da seguradora é obrigatório");
    }

    // Validar CNPJ da seguradora
    const cnpjSeguradora = apolice.seguradora_cnpj.replace(/\D/g, "");
    if (cnpjSeguradora.length !== 14) {
      throw new Error("CNPJ da seguradora deve conter exatamente 14 dígitos");
    }

    // Validar datas
    const dataInicial = new Date(apolice.data_inicial);
    const dataFinal = new Date(apolice.data_final);

    if (dataFinal <= dataInicial) {
      throw new Error("Data final deve ser maior que a data inicial");
    }

    // Verificar se empresa existe e está ativa
    const empresa = await queryOne(
      `
      SELECT id FROM empresas_fiscais WHERE id = $1 AND status = 'ativo'
    `,
      [apolice.empresa_id],
    );

    if (!empresa) {
      throw new Error("Empresa fiscal não encontrada ou inativa");
    }

    // Verificar se número da apólice já existe para esta empresa
    const existingApolice = await queryOne(
      `
      SELECT id FROM apolices_seguro 
      WHERE empresa_id = $1 AND numero_apolice = $2
    `,
      [apolice.empresa_id, apolice.numero_apolice],
    );

    if (existingApolice) {
      throw new Error("Número da apólice já existe para esta empresa");
    }

    // Determinar status baseado nas datas
    const hoje = new Date();
    let status = apolice.status || "ativa";

    if (dataFinal < hoje) {
      status = "vencida";
    } else if (dataInicial > hoje) {
      status = "ativa"; // Futura, mas consideramos ativa
    }

    const result = await queryOne(
      `
      INSERT INTO apolices_seguro (
        empresa_id,
        numero_apolice,
        identificador,
        data_inicial,
        data_final,
        limite_averbacao,
        seguradora_nome,
        seguradora_cnpj,
        status,
        observacoes,
        ativo,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `,
      [
        apolice.empresa_id,
        apolice.numero_apolice,
        apolice.identificador,
        apolice.data_inicial,
        apolice.data_final,
        apolice.limite_averbacao,
        apolice.seguradora_nome.trim(),
        cnpjSeguradora,
        status,
        apolice.observacoes || null,
        apolice.ativo !== false,
      ],
    );

    if (!result) {
      throw new Error("Erro ao criar apólice de seguro");
    }

    console.log("✅ Apólice de seguro criada com sucesso:", result.id);
    return result;
  } catch (error) {
    console.error("❌ Erro ao criar apólice de seguro:", error);
    throw error;
  }
}

export async function updateApoliceSeguro(
  id: string,
  apolice: Partial<ApoliceSeguroCreate>,
): Promise<ApoliceSeguro> {
  try {
    console.log("📝 Atualizando apólice de seguro:", id, apolice);

    // Construir query dinamicamente
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (apolice.empresa_id !== undefined) {
      // Verificar se empresa existe e está ativa
      const empresa = await queryOne(
        `SELECT id FROM empresas_fiscais WHERE id = $1 AND status = 'ativo'`,
        [apolice.empresa_id]
      );
      if (!empresa) {
        throw new Error("Empresa fiscal não encontrada ou inativa");
      }

      updates.push(`empresa_id = $${paramIndex}`);
      values.push(apolice.empresa_id);
      paramIndex++;
    }

    if (apolice.numero_apolice !== undefined) {
      updates.push(`numero_apolice = $${paramIndex}`);
      values.push(apolice.numero_apolice);
      paramIndex++;
    }

    if (apolice.identificador !== undefined) {
      updates.push(`identificador = $${paramIndex}`);
      values.push(apolice.identificador);
      paramIndex++;
    }

    if (apolice.data_inicial !== undefined) {
      updates.push(`data_inicial = $${paramIndex}`);
      values.push(apolice.data_inicial);
      paramIndex++;
    }

    if (apolice.data_final !== undefined) {
      updates.push(`data_final = $${paramIndex}`);
      values.push(apolice.data_final);
      paramIndex++;
    }

    if (apolice.limite_averbacao !== undefined) {
      if (apolice.limite_averbacao <= 0) {
        throw new Error("Limite de averbação deve ser maior que zero");
      }
      updates.push(`limite_averbacao = $${paramIndex}`);
      values.push(apolice.limite_averbacao);
      paramIndex++;
    }

    if (apolice.seguradora_nome !== undefined) {
      if (!apolice.seguradora_nome.trim()) {
        throw new Error("Nome da seguradora é obrigatório");
      }
      updates.push(`seguradora_nome = $${paramIndex}`);
      values.push(apolice.seguradora_nome.trim());
      paramIndex++;
    }

    if (apolice.seguradora_cnpj !== undefined) {
      if (!apolice.seguradora_cnpj.trim()) {
        throw new Error("CNPJ da seguradora é obrigatório");
      }
      const cnpjLimpo = apolice.seguradora_cnpj.replace(/\D/g, "");
      if (cnpjLimpo.length !== 14) {
        throw new Error("CNPJ da seguradora deve conter exatamente 14 dígitos");
      }
      updates.push(`seguradora_cnpj = $${paramIndex}`);
      values.push(cnpjLimpo);
      paramIndex++;
    }

    if (apolice.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(apolice.status);
      paramIndex++;
    }

    if (apolice.observacoes !== undefined) {
      updates.push(`observacoes = $${paramIndex}`);
      values.push(apolice.observacoes);
      paramIndex++;
    }

    if (apolice.ativo !== undefined) {
      updates.push(`ativo = $${paramIndex}`);
      values.push(apolice.ativo);
      paramIndex++;
    }

    // Sempre atualizar updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Apenas updated_at
      throw new Error("Nenhum campo para atualizar");
    }

    // Adicionar ID como último parâmetro
    values.push(id);

    const result = await queryOne(
      `
      UPDATE apolices_seguro
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values,
    );

    if (!result) {
      throw new Error("Apólice de seguro não encontrada");
    }

    console.log("✅ Apólice de seguro atualizada com sucesso:", result.id);
    return result;
  } catch (error) {
    console.error("❌ Erro ao atualizar apólice de seguro:", error);
    throw error;
  }
}

export async function deleteApoliceSeguro(id: string): Promise<void> {
  try {
    console.log("🗑️ Excluindo apólice de seguro:", id);

    // Verificar se há documentos de frete vinculados
    const freteVinculado = await queryOne(
      `
      SELECT COUNT(*) as count FROM frete_documentos WHERE seguro_carga_id = $1
    `,
      [id]
    );

    if (freteVinculado && parseInt(freteVinculado.count) > 0) {
      throw new Error(
        "Não é possível excluir apólice com documentos de frete vinculados"
      );
    }

    await query("DELETE FROM apolices_seguro WHERE id = $1", [id]);
    console.log("✅ Apólice de seguro excluída com sucesso");
  } catch (error) {
    console.error("❌ Erro ao excluir apólice de seguro:", error);
    throw error;
  }
}

export async function getApolicesAtivasPorEmpresa(empresaId: string): Promise<ApoliceSeguro[]> {
  try {
    console.log("🔍 Buscando apólices ativas para empresa:", empresaId);

    const result = await query(`
      SELECT * FROM get_apolices_ativas($1)
    `, [empresaId]);

    console.log("✅ Apólices ativas encontradas:", result.length);
    return result;
  } catch (error) {
    console.error("❌ Erro ao buscar apólices ativas:", error);
    throw error;
  }
}

// ===== CONTROLE DE FRETE =====

export async function getFreteDocumentos(): Promise<FreteDocumento[]> {
  try {
    console.log("🔍 Buscando documentos de frete");

    const result = await query(`
      SELECT 
        f.*,
        e.razao_social as empresa_razao_social,
        e.cnpj as empresa_cnpj,
        co.razao_social as cliente_origem_razao_social,
        co.cidade as cliente_origem_cidade,
        co.estado as cliente_origem_estado,
        cd.razao_social as cliente_destino_razao_social,
        cd.cidade as cliente_destino_cidade,
        cd.estado as cliente_destino_estado,
        COALESCE(cio.name, 'Cidade não encontrada') as cidade_origem_nome,
        COALESCE(cid.name, 'Cidade não encontrada') as cidade_destino_nome
      FROM frete_documentos f
      JOIN empresas_fiscais e ON f.empresa_id = e.id
      JOIN cadastros co ON f.cliente_origem_id = co.id
      JOIN cadastros cd ON f.cliente_destino_id = cd.id
      LEFT JOIN cities cio ON f.cidade_origem_ibge = cio.cod_city
      LEFT JOIN cities cid ON f.cidade_destino_ibge = cid.cod_city
      ORDER BY f.created_at DESC
    `);

    console.log("✅ Documentos de frete encontrados:", result.length);

    return result.map((doc) => ({
      ...doc,
      empresa: {
        razao_social: doc.empresa_razao_social,
        cnpj: doc.empresa_cnpj,
      },
      cliente_origem: {
        razao_social: doc.cliente_origem_razao_social,
        cidade: doc.cliente_origem_cidade,
        estado: doc.cliente_origem_estado,
      },
      cliente_destino: {
        razao_social: doc.cliente_destino_razao_social,
        cidade: doc.cliente_destino_cidade,
        estado: doc.cliente_destino_estado,
      },
      cidade_origem_nome: doc.cidade_origem_nome,
      cidade_destino_nome: doc.cidade_destino_nome,
    }));
  } catch (error) {
    console.error("❌ Erro ao buscar documentos de frete:", error);
    throw error;
  }
}

export async function getFreteDocumento(id: string): Promise<FreteDocumento | null> {
  try {
    const result = await queryOne(
      `
      SELECT 
        f.*,
        e.razao_social as empresa_razao_social,
        e.cnpj as empresa_cnpj,
        co.razao_social as cliente_origem_razao_social,
        co.cidade as cliente_origem_cidade,
        co.estado as cliente_origem_estado,
        cd.razao_social as cliente_destino_razao_social,
        cd.cidade as cliente_destino_cidade,
        cd.estado as cliente_destino_estado,
        COALESCE(cio.name, 'Cidade não encontrada') as cidade_origem_nome,
        COALESCE(cid.name, 'Cidade não encontrada') as cidade_destino_nome
      FROM frete_documentos f
      JOIN empresas_fiscais e ON f.empresa_id = e.id
      JOIN cadastros co ON f.cliente_origem_id = co.id
      JOIN cadastros cd ON f.cliente_destino_id = cd.id
      LEFT JOIN cities cio ON f.cidade_origem_ibge = cio.cod_city
      LEFT JOIN cities cid ON f.cidade_destino_ibge = cid.cod_city
      WHERE f.id = $1
    `,
      [id],
    );

    if (!result) return null;

    return {
      ...result,
      empresa: {
        razao_social: result.empresa_razao_social,
        cnpj: result.empresa_cnpj,
      },
      cliente_origem: {
        razao_social: result.cliente_origem_razao_social,
        cidade: result.cliente_origem_cidade,
        estado: result.cliente_origem_estado,
      },
      cliente_destino: {
        razao_social: result.cliente_destino_razao_social,
        cidade: result.cliente_destino_cidade,
        estado: result.cliente_destino_estado,
      },
      cidade_origem_nome: result.cidade_origem_nome,
      cidade_destino_nome: result.cidade_destino_nome,
    };
  } catch (error) {
    console.error("❌ Erro ao buscar documento de frete:", error);
    throw error;
  }
}

export async function createFreteDocumento(
  documento: FreteDocumentoCreate,
): Promise<FreteDocumento> {
  try {
    console.log("📝 Criando novo documento de frete:", documento);

    // Validações básicas sem conversões desnecessárias
    console.log("🔍 Validando campos obrigatórios:");
    console.log("- empresa_id:", documento.empresa_id);
    console.log("- cliente_origem_id:", documento.cliente_origem_id);
    console.log("- cliente_destino_id:", documento.cliente_destino_id);
    console.log("- cidade_origem_ibge:", documento.cidade_origem_ibge);
    console.log("- cidade_destino_ibge:", documento.cidade_destino_ibge);
    console.log("- valor_frete:", documento.valor_frete);
    console.log("- km:", documento.km);
    console.log("- tomador_frete:", documento.tomador_frete);
    console.log("- tipo_reboque:", documento.tipo_reboque);
    console.log("- tipo_produto:", documento.tipo_produto);

    // Validações obrigatórias
    if (!documento.empresa_id) {
      throw new Error("Empresa é obrigatória");
    }
    if (!documento.cliente_origem_id) {
      throw new Error("Cliente de origem é obrigatório");
    }
    if (!documento.cliente_destino_id) {
      throw new Error("Cliente de destino é obrigatório");
    }
    if (!documento.cidade_origem_ibge) {
      throw new Error("Cidade de origem é obrigatória");
    }
    if (!documento.cidade_destino_ibge) {
      throw new Error("Cidade de destino é obrigatória");
    }
    if (!documento.valor_frete || documento.valor_frete <= 0) {
      throw new Error("Valor do frete deve ser maior que zero");
    }
    if (!documento.km || documento.km <= 0) {
      throw new Error("KM deve ser maior que zero");
    }
    if (!documento.tomador_frete) {
      throw new Error("Tomador do frete é obrigatório");
    }
    if (!documento.tipo_reboque) {
      throw new Error("Tipo de reboque é obrigatório");
    }
    if (!documento.tipo_produto) {
      throw new Error("Tipo de produto é obrigatório");
    }

    console.log("✅ Validações iniciais aprovadas");

    // Verificar se empresa existe e está ativa
    console.log("🏢 Verificando empresa fiscal...");
    const empresa = await queryOne(
      `
      SELECT id FROM empresas_fiscais WHERE id = $1 AND status = 'ativo'
    `,
      [documento.empresa_id],
    );

    if (!empresa) {
      throw new Error("Empresa fiscal não encontrada ou inativa");
    }
    console.log("✅ Empresa fiscal válida");

    // Verificar se cliente de origem existe e está ativo
    console.log("👤 Verificando cliente de origem...");
    const clienteOrigem = await queryOne(
      `
      SELECT id FROM cadastros WHERE id = $1 AND tipo = 'cliente' AND ativo = true
    `,
      [documento.cliente_origem_id],
    );

    if (!clienteOrigem) {
      throw new Error("Cliente de origem não encontrado ou inativo");
    }
    console.log("✅ Cliente de origem válido");

    // Verificar se cliente de destino existe e está ativo
    console.log("👤 Verificando cliente de destino...");
    const clienteDestino = await queryOne(
      `
      SELECT id FROM cadastros WHERE id = $1 AND tipo = 'cliente' AND ativo = true
    `,
      [documento.cliente_destino_id],
    );

    if (!clienteDestino) {
      throw new Error("Cliente de destino não encontrado ou inativo");
    }
    console.log("✅ Cliente de destino válido");

    // Verificar se as cidades existem na tabela cities
    console.log("🏙️ Verificando cidade de origem...");
    const cidadeOrigem = await getCidadePorCodigo(documento.cidade_origem_ibge);
    if (!cidadeOrigem) {
      throw new Error(`Cidade de origem com código IBGE ${documento.cidade_origem_ibge} não encontrada`);
    }
    console.log("✅ Cidade de origem válida:", cidadeOrigem.name);

    console.log("🏙️ Verificando cidade de destino...");
    const cidadeDestino = await getCidadePorCodigo(documento.cidade_destino_ibge);
    if (!cidadeDestino) {
      throw new Error(`Cidade de destino com código IBGE ${documento.cidade_destino_ibge} não encontrada`);
    }
    console.log("✅ Cidade de destino válida:", cidadeDestino.name);

    // Preparar valores finais (já foram validados)
    console.log("💰 Valores a serem inseridos:");
    console.log("- Valor do frete:", documento.valor_frete);
    console.log("- Valor do pedágio:", documento.valor_pedagio || 0);
    console.log("- Valor do seguro:", documento.valor_seguro || 0);
    console.log("- Valor da comissão:", documento.valor_comissao || 0);
    console.log("- KM:", documento.km);

    // Inserir o documento de frete
    console.log("📄 Inserindo documento de frete no banco de dados...");
    const result = await queryOne(
      `
      INSERT INTO frete_documentos (
        empresa_id,
        cliente_origem_id,
        cliente_destino_id,
        cidade_origem_ibge,
        cidade_destino_ibge,
        valor_frete,
        valor_pedagio,
        valor_seguro,
        valor_comissao,
        km,
        seguro_carga_id,
        cobranca_pedagio,
        cobranca_seguro,
        tomador_frete,
        tipo_reboque,
        tipo_produto,
        emissao_automatica,
        status,
        observacoes,
        ativo,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
      RETURNING *
    `,
      [
        documento.empresa_id,
        documento.cliente_origem_id,
        documento.cliente_destino_id,
        documento.cidade_origem_ibge,
        documento.cidade_destino_ibge,
        documento.valor_frete,
        documento.valor_pedagio || 0,
        documento.valor_seguro || 0,
        documento.valor_comissao || 0,
        documento.km,
        documento.seguro_carga_id || null,
        documento.cobranca_pedagio !== false,
        documento.cobranca_seguro !== false,
        documento.tomador_frete,
        documento.tipo_reboque,
        documento.tipo_produto,
        documento.emissao_automatica !== false,
        documento.status || "pendente",
        documento.observacoes || null,
        documento.ativo !== false,
      ],
    );

    if (!result) {
      throw new Error("Erro ao inserir documento de frete no banco de dados");
    }

    console.log("✅ Documento de frete criado com sucesso:", result.id);
    console.log("🎉 Operação concluída com êxito!");

    return result;
  } catch (error) {
    console.error("❌ Erro ao criar documento de frete:", error);
    console.error("🔍 Stack trace:", error instanceof Error ? error.stack : "N/A");
    throw error;
  }
}

export async function updateFreteDocumento(
  id: string,
  documento: Partial<FreteDocumentoCreate>,
): Promise<FreteDocumento> {
  try {
    console.log("📝 Atualizando documento de frete:", id, documento);

    // Construir query dinamicamente
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (documento.empresa_id !== undefined) {
      updates.push(`empresa_id = $${paramIndex}`);
      values.push(documento.empresa_id);
      paramIndex++;
    }

    if (documento.cliente_origem_id !== undefined) {
      updates.push(`cliente_origem_id = $${paramIndex}`);
      values.push(documento.cliente_origem_id);
      paramIndex++;
    }

    if (documento.cliente_destino_id !== undefined) {
      updates.push(`cliente_destino_id = $${paramIndex}`);
      values.push(documento.cliente_destino_id);
      paramIndex++;
    }

    if (documento.cidade_origem_ibge !== undefined) {
      updates.push(`cidade_origem_ibge = $${paramIndex}`);
      values.push(documento.cidade_origem_ibge);
      paramIndex++;
    }

    if (documento.cidade_destino_ibge !== undefined) {
      updates.push(`cidade_destino_ibge = $${paramIndex}`);
      values.push(documento.cidade_destino_ibge);
      paramIndex++;
    }

    if (documento.valor_frete !== undefined) {
      updates.push(`valor_frete = $${paramIndex}`);
      values.push(documento.valor_frete);
      paramIndex++;
    }

    if (documento.valor_pedagio !== undefined) {
      updates.push(`valor_pedagio = $${paramIndex}`);
      values.push(documento.valor_pedagio);
      paramIndex++;
    }

    if (documento.valor_seguro !== undefined) {
      updates.push(`valor_seguro = $${paramIndex}`);
      values.push(documento.valor_seguro);
      paramIndex++;
    }

    if (documento.valor_comissao !== undefined) {
      updates.push(`valor_comissao = $${paramIndex}`);
      values.push(documento.valor_comissao);
      paramIndex++;
    }

    if (documento.km !== undefined) {
      updates.push(`km = $${paramIndex}`);
      values.push(documento.km);
      paramIndex++;
    }

    if (documento.seguro_carga_id !== undefined) {
      updates.push(`seguro_carga_id = $${paramIndex}`);
      values.push(documento.seguro_carga_id);
      paramIndex++;
    }

    if (documento.cobranca_pedagio !== undefined) {
      updates.push(`cobranca_pedagio = $${paramIndex}`);
      values.push(documento.cobranca_pedagio);
      paramIndex++;
    }

    if (documento.cobranca_seguro !== undefined) {
      updates.push(`cobranca_seguro = $${paramIndex}`);
      values.push(documento.cobranca_seguro);
      paramIndex++;
    }

    if (documento.tomador_frete !== undefined) {
      updates.push(`tomador_frete = $${paramIndex}`);
      values.push(documento.tomador_frete);
      paramIndex++;
    }

    if (documento.tipo_reboque !== undefined) {
      updates.push(`tipo_reboque = $${paramIndex}`);
      values.push(documento.tipo_reboque);
      paramIndex++;
    }

    if (documento.tipo_produto !== undefined) {
      updates.push(`tipo_produto = $${paramIndex}`);
      values.push(documento.tipo_produto);
      paramIndex++;
    }

    if (documento.emissao_automatica !== undefined) {
      updates.push(`emissao_automatica = $${paramIndex}`);
      values.push(documento.emissao_automatica);
      paramIndex++;
    }

    if (documento.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(documento.status);
      paramIndex++;
    }

    if (documento.observacoes !== undefined) {
      updates.push(`observacoes = $${paramIndex}`);
      values.push(documento.observacoes);
      paramIndex++;
    }

    if (documento.ativo !== undefined) {
      updates.push(`ativo = $${paramIndex}`);
      values.push(documento.ativo);
      paramIndex++;
    }

    // Sempre atualizar updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Apenas updated_at
      throw new Error("Nenhum campo para atualizar");
    }

    // Adicionar ID como último parâmetro
    values.push(id);

    const result = await queryOne(
      `
      UPDATE frete_documentos
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values,
    );

    if (!result) {
      throw new Error("Documento de frete não encontrado");
    }

    console.log("✅ Documento de frete atualizado com sucesso:", result.id);
    return result;
  } catch (error) {
    console.error("❌ Erro ao atualizar documento de frete:", error);
    throw error;
  }
}

export async function deleteFreteDocumento(id: string): Promise<void> {
  try {
    console.log("🗑️ Excluindo documento de frete:", id);

    await query("DELETE FROM frete_documentos WHERE id = $1", [id]);
    console.log("✅ Documento de frete excluído com sucesso");
  } catch (error) {
    console.error("❌ Erro ao excluir documento de frete:", error);
    throw error;
  }
}

// Tipos para cidades
export interface Cidade {
  cod_city: string;
  name: string;
  uf?: string;
}

// Função para buscar cidades pelo nome
export async function getCidadesPorNome(nome: string): Promise<Cidade[]> {
  try {
    if (!nome || nome.trim().length < 2) {
      return [];
    }

    console.log("🔍 Buscando cidades por nome:", nome);

    const result = await query(`
      SELECT 
        c.cod_city, 
        c.name,
        s.name as uf
      FROM cities c
      LEFT JOIN states s ON c.state_id = s.id
      WHERE LOWER(c.name) ILIKE LOWER($1)
      ORDER BY c.name, s.name
      LIMIT 20
    `, [`%${nome.trim()}%`]);

    console.log("✅ Cidades encontradas:", result.length);
    return result;
  } catch (error) {
    console.error("❌ Erro ao buscar cidades:", error);
    throw error;
  }
}

// Função para buscar cidade por código IBGE
export async function getCidadePorCodigo(codigo: string): Promise<Cidade | null> {
  try {
    if (!codigo || codigo.trim().length === 0) {
      return null;
    }

    console.log("🔍 Buscando cidade por código:", codigo);

    const result = await queryOne(`
      SELECT 
        c.cod_city, 
        c.name,
        s.name as uf
      FROM cities c
      LEFT JOIN states s ON c.state_id = s.id
      WHERE c.cod_city = $1
    `, [codigo.trim()]);

    console.log("✅ Cidade encontrada:", result);
    return result;
  } catch (error) {
    console.error("❌ Erro ao buscar cidade por código:", error);
    throw error;
  }
}

// Função para buscar clientes ativos
export async function getClientesAtivos() {
  try {
    const result = await query(`
      SELECT id, razao_social, cidade, estado, cep
      FROM cadastros 
      WHERE tipo = 'cliente' AND ativo = true
      ORDER BY razao_social
    `);

    return result;
  } catch (error) {
    console.error("❌ Erro ao buscar clientes ativos:", error);
    throw error;
  }
}

// Tipos para produtos CT-e
export interface ProdutoCTe {
  id: string;
  cod_ncm: string;
  descricao: string;
}

// Função para buscar produtos CT-e
export async function getProdutosCTe(): Promise<ProdutoCTe[]> {
  try {
    console.log("🔍 Buscando produtos CT-e");

    const result = await query(`
      SELECT id, cod_ncm, descricao
      FROM cte_produtos
      ORDER BY descricao
    `);

    console.log("✅ Produtos CT-e encontrados:", result.length);
    return result;
  } catch (error) {
    console.error("❌ Erro ao buscar produtos CT-e:", error);
    throw error;
  }
}

// Função para validar chave de acesso
export function validarChaveAcesso(chave: string): boolean {
  try {
    // Remove caracteres não numéricos
    const chaveNumerica = chave.replace(/\D/g, '');

    // Deve ter exatamente 44 dígitos
    if (chaveNumerica.length !== 44) {
      return false;
    }

    // Calcula o dígito verificador
    const chaveBase = chaveNumerica.substring(0, 43);
    const dv = chaveNumerica.substring(43, 44);

    let soma = 0;
    let peso = 2;

    // Cálculo do DV (algoritmo módulo 11)
    for (let i = chaveBase.length - 1; i >= 0; i--) {
      soma += parseInt(chaveBase[i]) * peso;
      peso++;
      if (peso > 9) peso = 2;
    }

    const resto = soma % 11;
    const dvCalculado = resto < 2 ? 0 : 11 - resto;

    return parseInt(dv) === dvCalculado;
  } catch (error) {
    console.error("❌ Erro ao validar chave de acesso:", error);
    return false;
  }
}

// --- FUNÇÃO DE INTEGRAÇÃO DE TAGS CUSTOMIZADAS ---
// Esta função será chamada para aplicar tags customizadas antes de retornar o XML.
// Ela deve buscar as tags customizadas associadas à empresa e ao documento e inseri-las no XML.
async function aplicarTagsCustomizadasMDFe(xmlContent: string, empresaId: string, documentoId: string): Promise<string> {
  try {
    console.log("✨ Aplicando tags customizadas ao XML do MDF-e...");

    // Buscar tags customizadas do banco de dados
    const tagsCustomizadas = await query(`
      SELECT nome_tag, valor_tag, tipo
      FROM mdfe_tags_customizadas
      WHERE empresa_id = $1 AND documento_id = $2
      ORDER BY ordem
    `, [empresaId, documentoId]);

    if (tagsCustomizadas.length === 0) {
      console.log("ℹ️ Nenhuma tag customizada encontrada para este MDF-e.");
      return xmlContent;
    }

    console.log(`ℹ️ Encontradas ${tagsCustomizadas.length} tags customizadas.`);

    let xmlModificado = xmlContent;

    // Inserir as tags customizadas no local apropriado do XML.
    // A lógica exata de inserção dependerá da estrutura do XML e de onde as tags devem ser adicionadas.
    // Por exemplo, se as tags devem ir dentro de <infMDFe> ou em um local específico.
    // Para este exemplo, vamos assumir que elas devem ser inseridas antes da tag de fechamento </infMDFe>.

    const insertionPoint = xmlModificado.lastIndexOf('</infMDFe>');
    if (insertionPoint === -1) {
      console.warn("⚠️ Ponto de inserção para tags customizadas não encontrado (</infMDFe>). Tags não serão aplicadas.");
      return xmlContent;
    }

    let tagsString = '';
    tagsCustomizadas.forEach(tag => {
      // Tratar tipos diferentes de tags (texto, número, boolean, etc.)
      let valorParaXml = tag.valor_tag;
      if (tag.tipo === 'boolean') {
        valorParaXml = valorParaXml ? 'true' : 'false';
      } else if (tag.tipo === 'number') {
        // Formatar número conforme necessário, mas geralmente string é aceitável
        valorParaXml = valorParaXml.toString();
      }
      // Escapar caracteres especiais se necessário, mas para XML, geralmente é feito automaticamente se o parser for robusto.
      // No entanto, para garantir, podemos escapar alguns caracteres comuns:
      valorParaXml = String(valorParaXml)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      tagsString += `    <tagCustomizada nome="${tag.nome_tag}">${valorParaXml}</tagCustomizada>\n`;
    });

    // Inserir as tags antes do fechamento de </infMDFe>
    xmlModificado = xmlModificado.substring(0, insertionPoint) + tagsString + xmlModificado.substring(insertionPoint);

    console.log("✨ Tags customizadas aplicadas com sucesso.");
    return xmlModificado;

  } catch (error) {
    console.error("❌ Erro ao aplicar tags customizadas:", error);
    // Se houver erro, retornar o XML original para não falhar a geração do arquivo
    return xmlContent;
  }
}