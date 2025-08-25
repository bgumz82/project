import { query, queryOne } from '@/lib/db'

export interface AssociacaoFrota {
  id: string
  funcionario_id: string
  veiculo_principal_id: string
  veiculo_reboque1_id: string | null
  veiculo_reboque2_id: string | null
  veiculo_implemento_id: string | null
  data_inicio: string
  data_fim: string | null
  ativo: boolean
  observacoes: string | null
  created_at: string
  updated_at: string
  funcionario?: {
    nome: string
    matricula: string
    cnh: string | null
    validade_cnh: string | null
  }
  veiculo_principal?: {
    placa: string
    modelo: string
    marca: string
    tipo: string
  }
  veiculo_reboque1?: {
    placa: string
    modelo: string
    marca: string
    tipo: string
  } | null
  veiculo_reboque2?: {
    placa: string
    modelo: string
    marca: string
    tipo: string
  } | null
  veiculo_implemento?: {
    placa: string
    modelo: string
    marca: string
    tipo: string
  } | null
}

export interface AssociacaoFrotaCreate {
  funcionario_id: string
  veiculo_principal_id: string
  veiculo_reboque1_id?: string | null
  veiculo_reboque2_id?: string | null
  veiculo_implemento_id?: string | null
  data_inicio: string
  data_fim?: string | null
  ativo?: boolean
  observacoes?: string | null
}

export async function getAssociacoesFrota(): Promise<AssociacaoFrota[]> {
  try {
    console.log('🔍 Buscando associações de frota')
    
    const result = await query(`
      SELECT 
        af.*,
        f.nome as funcionario_nome,
        f.matricula as funcionario_matricula,
        f.cnh as funcionario_cnh,
        f.validade_cnh as funcionario_validade_cnh,
        vp.placa as veiculo_principal_placa,
        vp.modelo as veiculo_principal_modelo,
        vp.marca as veiculo_principal_marca,
        vp.tipo as veiculo_principal_tipo,
        vr1.placa as veiculo_reboque1_placa,
        vr1.modelo as veiculo_reboque1_modelo,
        vr1.marca as veiculo_reboque1_marca,
        vr1.tipo as veiculo_reboque1_tipo,
        vr2.placa as veiculo_reboque2_placa,
        vr2.modelo as veiculo_reboque2_modelo,
        vr2.marca as veiculo_reboque2_marca,
        vr2.tipo as veiculo_reboque2_tipo,
        vi.placa as veiculo_implemento_placa,
        vi.modelo as veiculo_implemento_modelo,
        vi.marca as veiculo_implemento_marca,
        vi.tipo as veiculo_implemento_tipo
      FROM associacoes_frota af
      JOIN funcionarios f ON af.funcionario_id = f.id
      JOIN veiculos vp ON af.veiculo_principal_id = vp.id
      LEFT JOIN veiculos vr1 ON af.veiculo_reboque1_id = vr1.id
      LEFT JOIN veiculos vr2 ON af.veiculo_reboque2_id = vr2.id
      LEFT JOIN veiculos vi ON af.veiculo_implemento_id = vi.id
      ORDER BY af.data_inicio DESC, vp.placa
    `)
    
    console.log('✅ Associações de frota encontradas:', result.length)
    
    return result.map(associacao => ({
      ...associacao,
      funcionario: {
        nome: associacao.funcionario_nome,
        matricula: associacao.funcionario_matricula,
        cnh: associacao.funcionario_cnh,
        validade_cnh: associacao.funcionario_validade_cnh
      },
      veiculo_principal: {
        placa: associacao.veiculo_principal_placa,
        modelo: associacao.veiculo_principal_modelo,
        marca: associacao.veiculo_principal_marca,
        tipo: associacao.veiculo_principal_tipo
      },
      veiculo_reboque1: associacao.veiculo_reboque1_placa ? {
        placa: associacao.veiculo_reboque1_placa,
        modelo: associacao.veiculo_reboque1_modelo,
        marca: associacao.veiculo_reboque1_marca,
        tipo: associacao.veiculo_reboque1_tipo
      } : null,
      veiculo_reboque2: associacao.veiculo_reboque2_placa ? {
        placa: associacao.veiculo_reboque2_placa,
        modelo: associacao.veiculo_reboque2_modelo,
        marca: associacao.veiculo_reboque2_marca,
        tipo: associacao.veiculo_reboque2_tipo
      } : null,
      veiculo_implemento: associacao.veiculo_implemento_placa ? {
        placa: associacao.veiculo_implemento_placa,
        modelo: associacao.veiculo_implemento_modelo,
        marca: associacao.veiculo_implemento_marca,
        tipo: associacao.veiculo_implemento_tipo
      } : null
    }))
  } catch (error) {
    console.error('❌ Erro ao buscar associações de frota:', error)
    throw error
  }
}

export async function getAssociacaoFrota(id: string): Promise<AssociacaoFrota | null> {
  try {
    const result = await queryOne(`
      SELECT 
        af.*,
        f.nome as funcionario_nome,
        f.matricula as funcionario_matricula,
        f.cnh as funcionario_cnh,
        f.validade_cnh as funcionario_validade_cnh,
        vp.placa as veiculo_principal_placa,
        vp.modelo as veiculo_principal_modelo,
        vp.marca as veiculo_principal_marca,
        vp.tipo as veiculo_principal_tipo,
        vr1.placa as veiculo_reboque1_placa,
        vr1.modelo as veiculo_reboque1_modelo,
        vr1.marca as veiculo_reboque1_marca,
        vr1.tipo as veiculo_reboque1_tipo,
        vr2.placa as veiculo_reboque2_placa,
        vr2.modelo as veiculo_reboque2_modelo,
        vr2.marca as veiculo_reboque2_marca,
        vr2.tipo as veiculo_reboque2_tipo,
        vi.placa as veiculo_implemento_placa,
        vi.modelo as veiculo_implemento_modelo,
        vi.marca as veiculo_implemento_marca,
        vi.tipo as veiculo_implemento_tipo
      FROM associacoes_frota af
      JOIN funcionarios f ON af.funcionario_id = f.id
      JOIN veiculos vp ON af.veiculo_principal_id = vp.id
      LEFT JOIN veiculos vr1 ON af.veiculo_reboque1_id = vr1.id
      LEFT JOIN veiculos vr2 ON af.veiculo_reboque2_id = vr2.id
      LEFT JOIN veiculos vi ON af.veiculo_implemento_id = vi.id
      WHERE af.id = $1
    `, [id])
    
    if (!result) return null
    
    return {
      ...result,
      funcionario: {
        nome: result.funcionario_nome,
        matricula: result.funcionario_matricula,
        cnh: result.funcionario_cnh,
        validade_cnh: result.funcionario_validade_cnh
      },
      veiculo_principal: {
        placa: result.veiculo_principal_placa,
        modelo: result.veiculo_principal_modelo,
        marca: result.veiculo_principal_marca,
        tipo: result.veiculo_principal_tipo
      },
      veiculo_reboque1: result.veiculo_reboque1_placa ? {
        placa: result.veiculo_reboque1_placa,
        modelo: result.veiculo_reboque1_modelo,
        marca: result.veiculo_reboque1_marca,
        tipo: result.veiculo_reboque1_tipo
      } : null,
      veiculo_reboque2: result.veiculo_reboque2_placa ? {
        placa: result.veiculo_reboque2_placa,
        modelo: result.veiculo_reboque2_modelo,
        marca: result.veiculo_reboque2_marca,
        tipo: result.veiculo_reboque2_tipo
      } : null,
      veiculo_implemento: result.veiculo_implemento_placa ? {
        placa: result.veiculo_implemento_placa,
        modelo: result.veiculo_implemento_modelo,
        marca: result.veiculo_implemento_marca,
        tipo: result.veiculo_implemento_tipo
      } : null
    }
  } catch (error) {
    console.error('❌ Erro ao buscar associação de frota:', error)
    throw error
  }
}

export async function getMotoristasPorVeiculo(): Promise<any[]> {
  try {
    const result = await query(`
      SELECT 
        f.id,
        f.nome,
        f.matricula,
        f.cnh,
        f.validade_cnh,
        f.status
      FROM funcionarios f
      WHERE f.funcao = 'motorista' 
      AND f.status = 'ativo'
      AND f.cnh IS NOT NULL
      ORDER BY f.nome
    `)
    
    return result
  } catch (error) {
    console.error('❌ Erro ao buscar motoristas:', error)
    throw error
  }
}

export async function getVeiculosPesados(): Promise<any[]> {
  try {
    const result = await query(`
      SELECT 
        v.id,
        v.placa,
        v.modelo,
        v.marca,
        v.tipo,
        v.status,
        CASE 
          WHEN af.id IS NOT NULL AND af.ativo = true THEN f.nome
          ELSE NULL
        END as motorista_atual
      FROM veiculos v
      LEFT JOIN associacoes_frota af ON v.id = af.veiculo_id AND af.ativo = true AND af.data_fim IS NULL
      LEFT JOIN funcionarios f ON af.funcionario_id = f.id
      WHERE v.tipo IN ('caminhao', 'bi_trem_1_reboque', 'bi_trem_2_reboque', 'vanderleia_3_eixos', 'vanderleia_4_eixos', 'julieta')
      AND v.ativo = true
      ORDER BY v.placa
    `)
    
    return result
  } catch (error) {
    console.error('❌ Erro ao buscar veículos pesados:', error)
    throw error
  }
}

export async function createAssociacaoFrota(associacao: AssociacaoFrotaCreate): Promise<AssociacaoFrota> {
  try {
    console.log('📝 Criando nova associação de frota:', associacao)
    
    // Validar se o funcionário é motorista
    const funcionario = await queryOne(`
      SELECT funcao, status, cnh FROM funcionarios WHERE id = $1
    `, [associacao.funcionario_id])
    
    if (!funcionario) {
      throw new Error('Funcionário não encontrado')
    }
    
    if (funcionario.funcao !== 'motorista') {
      throw new Error('Apenas funcionários com função "Motorista" podem ser associados a veículos')
    }
    
    if (funcionario.status !== 'ativo') {
      throw new Error('Apenas funcionários ativos podem ser associados a veículos')
    }
    
    if (!funcionario.cnh) {
      throw new Error('Funcionário deve ter CNH cadastrada para ser associado a veículos')
    }
    
    // Validar se o veículo é pesado
    const veiculo = await queryOne(`
      SELECT tipo, status FROM veiculos WHERE id = $1
    `, [associacao.veiculo_principal_id])
    
    if (!veiculo) {
      throw new Error('Veículo não encontrado')
    }
    
    if (veiculo.tipo !== 'caminhao') {
      throw new Error('O veículo principal deve ser um caminhão')
    }
    
    if (veiculo.status !== 'ativo') {
      throw new Error('Apenas veículos ativos podem ter motoristas associados')
    }
    
    // Verificar se já existe associação ativa para este veículo
    const associacaoExistente = await queryOne(`
      SELECT id FROM associacoes_frota 
      WHERE veiculo_principal_id = $1 AND ativo = true AND data_fim IS NULL
    `, [associacao.veiculo_principal_id])
    
    if (associacaoExistente) {
      throw new Error('Este veículo já possui um motorista associado. Finalize a associação atual primeiro.')
    }
    
    const result = await queryOne(`
      INSERT INTO associacoes_frota (
        funcionario_id,
        veiculo_principal_id,
        veiculo_reboque1_id,
        veiculo_reboque2_id,
        veiculo_implemento_id,
        data_inicio,
        data_fim,
        ativo,
        observacoes,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [
      associacao.funcionario_id,
      associacao.veiculo_principal_id,
      associacao.veiculo_reboque1_id,
      associacao.veiculo_reboque2_id,
      associacao.veiculo_implemento_id,
      associacao.data_inicio,
      associacao.data_fim,
      associacao.ativo !== undefined ? associacao.ativo : true,
      associacao.observacoes
    ])

    if (!result) {
      throw new Error('Erro ao criar associação de frota')
    }

    console.log('✅ Associação de frota criada com sucesso:', result.id)
    
    return result
  } catch (error) {
    console.error('❌ Erro ao criar associação de frota:', error)
    throw error
  }
}

export async function updateAssociacaoFrota(id: string, associacao: Partial<AssociacaoFrotaCreate>): Promise<AssociacaoFrota> {
  try {
    console.log('📝 Atualizando associação de frota:', id, associacao)
    
    // Construir query dinamicamente
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (associacao.funcionario_id !== undefined) {
      // Validar funcionário se mudou
      const funcionario = await queryOne(`
        SELECT funcao, status, cnh FROM funcionarios WHERE id = $1
      `, [associacao.funcionario_id])
      
      if (!funcionario || funcionario.funcao !== 'motorista' || funcionario.status !== 'ativo' || !funcionario.cnh) {
        throw new Error('Funcionário deve ser um motorista ativo com CNH')
      }
      
      updates.push(`funcionario_id = $${paramIndex}`)
      values.push(associacao.funcionario_id)
      paramIndex++
    }

    if (associacao.veiculo_principal_id !== undefined) {
      // Validar veículo se mudou
      const veiculo = await queryOne(`
        SELECT tipo, status FROM veiculos WHERE id = $1
      `, [associacao.veiculo_principal_id])
      
      if (!veiculo || veiculo.tipo !== 'caminhao') {
        throw new Error('O veículo principal deve ser um caminhão')
      }
      
      updates.push(`veiculo_principal_id = $${paramIndex}`)
      values.push(associacao.veiculo_principal_id)
      paramIndex++
    }

    if (associacao.veiculo_reboque1_id !== undefined) {
      updates.push(`veiculo_reboque1_id = $${paramIndex}`)
      values.push(associacao.veiculo_reboque1_id)
      paramIndex++
    }

    if (associacao.veiculo_reboque2_id !== undefined) {
      updates.push(`veiculo_reboque2_id = $${paramIndex}`)
      values.push(associacao.veiculo_reboque2_id)
      paramIndex++
    }

    if (associacao.veiculo_implemento_id !== undefined) {
      updates.push(`veiculo_implemento_id = $${paramIndex}`)
      values.push(associacao.veiculo_implemento_id)
      paramIndex++
    }

    if (associacao.data_inicio !== undefined) {
      updates.push(`data_inicio = $${paramIndex}`)
      values.push(associacao.data_inicio)
      paramIndex++
    }

    if (associacao.data_fim !== undefined) {
      updates.push(`data_fim = $${paramIndex}`)
      values.push(associacao.data_fim)
      paramIndex++
    }

    if (associacao.ativo !== undefined) {
      updates.push(`ativo = $${paramIndex}`)
      values.push(associacao.ativo)
      paramIndex++
    }

    if (associacao.observacoes !== undefined) {
      updates.push(`observacoes = $${paramIndex}`)
      values.push(associacao.observacoes)
      paramIndex++
    }

    // Sempre atualizar updated_at
    updates.push(`updated_at = NOW()`)

    if (updates.length === 1) { // Apenas updated_at
      throw new Error('Nenhum campo para atualizar')
    }

    // Adicionar ID como último parâmetro
    values.push(id)

    const result = await queryOne(`
      UPDATE associacoes_frota
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values)

    if (!result) {
      throw new Error('Associação de frota não encontrada')
    }

    console.log('✅ Associação de frota atualizada com sucesso:', result.id)

    return result
  } catch (error) {
    console.error('❌ Erro ao atualizar associação de frota:', error)
    throw error
  }
}

export async function deleteAssociacaoFrota(id: string): Promise<void> {
  try {
    console.log('🗑️ Excluindo associação de frota:', id)
    
    await query('DELETE FROM associacoes_frota WHERE id = $1', [id])
    console.log('✅ Associação de frota excluída com sucesso')
  } catch (error) {
    console.error('❌ Erro ao excluir associação de frota:', error)
    throw error
  }
}

export async function finalizarAssociacaoFrota(id: string, dataFim: string): Promise<AssociacaoFrota> {
  try {
    console.log('🏁 Finalizando associação de frota:', id, 'em', dataFim)
    
    const result = await queryOne(`
      UPDATE associacoes_frota
      SET 
        data_fim = $1,
        ativo = false,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [dataFim, id])

    if (!result) {
      throw new Error('Associação de frota não encontrada')
    }

    console.log('✅ Associação de frota finalizada com sucesso:', result.id)

    return result
  } catch (error) {
    console.error('❌ Erro ao finalizar associação de frota:', error)
    throw error
  }
}

// Função para obter motoristas disponíveis (sem associação ativa)
export async function getMotoristasDisponiveis(): Promise<any[]> {
  try {
    const result = await query(`
      SELECT 
        f.id,
        f.nome,
        f.matricula,
        f.cnh,
        f.validade_cnh
      FROM funcionarios f
      WHERE f.funcao = 'motorista' 
      AND f.status = 'ativo'
      AND f.cnh IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM associacoes_frota af 
        WHERE af.funcionario_id = f.id 
        AND af.ativo = true 
        AND af.data_fim IS NULL
      )
      ORDER BY f.nome
    `)
    
    return result
  } catch (error) {
    console.error('❌ Erro ao buscar motoristas disponíveis:', error)
    throw error
  }
}

// Função para obter caminhões disponíveis (veículo principal)
export async function getCaminhoesDisponiveis(): Promise<any[]> {
  try {
    const result = await query(`
      SELECT v.*
      FROM veiculos v
      WHERE v.ativo = true 
        AND v.tipo = 'caminhao'
        AND v.id NOT IN (
          SELECT veiculo_principal_id
          FROM associacoes_frota 
          WHERE ativo = true 
            AND (data_fim IS NULL OR data_fim > CURRENT_DATE)
        )
      ORDER BY v.placa
    `)
    
    return result
  } catch (error) {
    console.error('❌ Erro ao buscar caminhões disponíveis:', error)
    throw error
  }
}

// Função para obter reboques disponíveis (bi-trem)
export async function getReboquesDisponiveis(): Promise<any[]> {
  try {
    const result = await query(`
      SELECT v.*
      FROM veiculos v
      WHERE v.ativo = true 
        AND v.tipo IN ('bi_trem_1_reboque', 'bi_trem_2_reboque')
        AND v.id NOT IN (
          SELECT COALESCE(veiculo_reboque1_id, '00000000-0000-0000-0000-000000000000')
          FROM associacoes_frota 
          WHERE ativo = true 
            AND (data_fim IS NULL OR data_fim > CURRENT_DATE)
            AND veiculo_reboque1_id IS NOT NULL
          UNION
          SELECT COALESCE(veiculo_reboque2_id, '00000000-0000-0000-0000-000000000000')
          FROM associacoes_frota 
          WHERE ativo = true 
            AND (data_fim IS NULL OR data_fim > CURRENT_DATE)
            AND veiculo_reboque2_id IS NOT NULL
        )
      ORDER BY v.placa
    `)
    
    return result
  } catch (error) {
    console.error('❌ Erro ao buscar reboques disponíveis:', error)
    throw error
  }
}

// Função para obter implementos disponíveis (vanderleia e julieta)
export async function getImplementosDisponiveis(): Promise<any[]> {
  try {
    const result = await query(`
      SELECT v.*
      FROM veiculos v
      WHERE v.ativo = true 
        AND v.tipo IN ('vanderleia_3_eixos', 'vanderleia_4_eixos', 'julieta')
        AND v.id NOT IN (
          SELECT COALESCE(veiculo_implemento_id, '00000000-0000-0000-0000-000000000000')
          FROM associacoes_frota 
          WHERE ativo = true 
            AND (data_fim IS NULL OR data_fim > CURRENT_DATE)
            AND veiculo_implemento_id IS NOT NULL
        )
      ORDER BY v.placa
    `)
    
    return result
  } catch (error) {
    console.error('❌ Erro ao buscar implementos disponíveis:', error)
    throw error
  }
}

// Função para obter histórico de associações de um funcionário
export async function getHistoricoAssociacoesFuncionario(funcionarioId: string): Promise<AssociacaoFrota[]> {
  try {
    const result = await query(`
      SELECT 
        af.*,
        v.placa as veiculo_placa,
        v.modelo as veiculo_modelo,
        v.marca as veiculo_marca,
        v.tipo as veiculo_tipo
      FROM associacoes_frota af
      JOIN veiculos v ON af.veiculo_id = v.id
      WHERE af.funcionario_id = $1
      ORDER BY af.data_inicio DESC
    `, [funcionarioId])
    
    return result.map(associacao => ({
      ...associacao,
      veiculo: {
        placa: associacao.veiculo_placa,
        modelo: associacao.veiculo_modelo,
        marca: associacao.veiculo_marca,
        tipo: associacao.veiculo_tipo
      }
    }))
  } catch (error) {
    console.error('❌ Erro ao buscar histórico de associações:', error)
    throw error
  }
}

// Função para obter histórico de associações de um veículo
export async function getHistoricoAssociacoesVeiculo(veiculoId: string): Promise<AssociacaoFrota[]> {
  try {
    const result = await query(`
      SELECT 
        af.*,
        f.nome as funcionario_nome,
        f.matricula as funcionario_matricula,
        f.cnh as funcionario_cnh
      FROM associacoes_frota af
      JOIN funcionarios f ON af.funcionario_id = f.id
      WHERE af.veiculo_id = $1
      ORDER BY af.data_inicio DESC
    `, [veiculoId])
    
    return result.map(associacao => ({
      ...associacao,
      funcionario: {
        nome: associacao.funcionario_nome,
        matricula: associacao.funcionario_matricula,
        cnh: associacao.funcionario_cnh,
        validade_cnh: null
      }
    }))
  } catch (error) {
    console.error('❌ Erro ao buscar histórico de associações do veículo:', error)
    throw error
  }
}

// Função para obter associações ativas para uso em CT-e
export async function getAssociacoesAtivasParaCTe(): Promise<AssociacaoFrota[]> {
  try {
    console.log('🔍 Buscando associações ativas para CT-e')
    
    const result = await query(`
      SELECT 
        af.*,
        f.nome as funcionario_nome,
        f.matricula as funcionario_matricula,
        f.cnh as funcionario_cnh,
        f.validade_cnh as funcionario_validade_cnh,
        vp.placa as veiculo_principal_placa,
        vp.modelo as veiculo_principal_modelo,
        vp.marca as veiculo_principal_marca,
        vp.tipo as veiculo_principal_tipo,
        vr1.placa as veiculo_reboque1_placa,
        vr1.modelo as veiculo_reboque1_modelo,
        vr1.marca as veiculo_reboque1_marca,
        vr1.tipo as veiculo_reboque1_tipo,
        vr2.placa as veiculo_reboque2_placa,
        vr2.modelo as veiculo_reboque2_modelo,
        vr2.marca as veiculo_reboque2_marca,
        vr2.tipo as veiculo_reboque2_tipo,
        vi.placa as veiculo_implemento_placa,
        vi.modelo as veiculo_implemento_modelo,
        vi.marca as veiculo_implemento_marca,
        vi.tipo as veiculo_implemento_tipo
      FROM associacoes_frota af
      JOIN funcionarios f ON af.funcionario_id = f.id
      JOIN veiculos vp ON af.veiculo_principal_id = vp.id
      LEFT JOIN veiculos vr1 ON af.veiculo_reboque1_id = vr1.id
      LEFT JOIN veiculos vr2 ON af.veiculo_reboque2_id = vr2.id
      LEFT JOIN veiculos vi ON af.veiculo_implemento_id = vi.id
      WHERE af.ativo = true 
        AND (af.data_fim IS NULL OR af.data_fim > CURRENT_DATE)
        AND f.status = 'ativo'
        AND f.funcao = 'motorista'
        AND f.cnh IS NOT NULL
      ORDER BY f.nome, vp.placa
    `)
    
    console.log('✅ Associações ativas para CT-e encontradas:', result.length)
    if (result.length > 0) {
      console.log('📊 Primeiro resultado:', result[0])
    }
    
    return result.map(associacao => ({
      ...associacao,
      funcionario: {
        nome: associacao.funcionario_nome || 'Nome não informado',
        matricula: associacao.funcionario_matricula || 'Matrícula não informada',
        cnh: associacao.funcionario_cnh || 'CNH não informada',
        validade_cnh: associacao.funcionario_validade_cnh
      },
      veiculo_principal: {
        placa: associacao.veiculo_principal_placa || 'Placa não informada',
        modelo: associacao.veiculo_principal_modelo || 'Modelo não informado',
        marca: associacao.veiculo_principal_marca || 'Marca não informada',
        tipo: associacao.veiculo_principal_tipo || 'Tipo não informado'
      },
      veiculo_reboque1: associacao.veiculo_reboque1_placa ? {
        placa: associacao.veiculo_reboque1_placa,
        modelo: associacao.veiculo_reboque1_modelo || 'Modelo não informado',
        marca: associacao.veiculo_reboque1_marca || 'Marca não informada',
        tipo: associacao.veiculo_reboque1_tipo || 'Tipo não informado'
      } : null,
      veiculo_reboque2: associacao.veiculo_reboque2_placa ? {
        placa: associacao.veiculo_reboque2_placa,
        modelo: associacao.veiculo_reboque2_modelo || 'Modelo não informado',
        marca: associacao.veiculo_reboque2_marca || 'Marca não informada',
        tipo: associacao.veiculo_reboque2_tipo || 'Tipo não informado'
      } : null,
      veiculo_implemento: associacao.veiculo_implemento_placa ? {
        placa: associacao.veiculo_implemento_placa,
        modelo: associacao.veiculo_implemento_modelo || 'Modelo não informado',
        marca: associacao.veiculo_implemento_marca || 'Marca não informada',
        tipo: associacao.veiculo_implemento_tipo || 'Tipo não informado'
      } : null
    }))
  } catch (error) {
    console.error('❌ Erro ao buscar associações ativas para CT-e:', error)
    console.error('❌ Detalhes do erro:', error)
    return [] // Retorna array vazio em caso de erro para evitar quebrar a tela
  }
}