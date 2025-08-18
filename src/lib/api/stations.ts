import { query, queryOne } from '@/lib/db'

export interface Station {
  id: string
  nome: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone: string | null
  cnpj: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface StationInsert {
  nome: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone?: string | null
  cnpj?: string | null
  ativo?: boolean
}

export async function getStations(): Promise<Station[]> {
  try {
    console.log('=== INICIANDO BUSCA DE POSTOS ===')
    
    // Query mais simples para debug
    const queryText = `
      SELECT 
        id,
        nome,
        endereco,
        cidade,
        estado,
        cep,
        telefone,
        cnpj,
        ativo,
        created_at,
        updated_at
      FROM postos 
      WHERE ativo = true
      ORDER BY nome
    `
    
    console.log('Query SQL:', queryText)
    
    const result = await query(queryText)
    
    console.log('=== RESULTADO DA QUERY ===')
    console.log('Resultado bruto da query:', result)
    console.log('Tipo do resultado:', typeof result)
    console.log('É array?', Array.isArray(result))
    console.log('Número de registros:', result?.length || 0)
    
    if (result && result.length > 0) {
      console.log('Primeiro registro completo:', result[0])
      console.log('Campos do primeiro registro:', Object.keys(result[0]))
      console.log('Valores do primeiro registro:', Object.values(result[0]))
    }
    
    if (!result || !Array.isArray(result)) {
      console.error('Resultado inválido da query:', result)
      return []
    }
    
    if (result.length === 0) {
      console.log('Nenhum posto ativo encontrado')
      return []
    }
    
    // Retornar dados como estão para debug
    const stations = result.map((station: any) => ({
      id: station.id,
      nome: station.nome,
      endereco: station.endereco || 'Endereço não informado',
      cidade: station.cidade || 'Não informado',
      estado: station.estado || 'SP',
      cep: station.cep || '00000-000',
      telefone: station.telefone || null,
      cnpj: station.cnpj || null,
      ativo: station.ativo !== false,
      created_at: station.created_at,
      updated_at: station.updated_at
    }))
    
    console.log('=== POSTOS PROCESSADOS COM SUCESSO ===')
    console.log('Total de postos:', stations.length)
    console.log('Primeiro posto processado:', stations[0])
    
    return stations
    
  } catch (error) {
    console.error('=== ERRO NA BUSCA DE POSTOS ===')
    console.error('Erro completo:', error)
    console.error('Stack trace:', (error as Error)?.stack)
    throw new Error(`Falha ao carregar postos: ${(error as Error)?.message || 'Erro desconhecido'}`)
  }
}

export async function getStation(id: string): Promise<Station | null> {
  try {
    const station = await queryOne(`
      SELECT *
      FROM postos
      WHERE id = $1
    `, [id])
    
    if (!station) return null
    
    return {
      ...station,
      endereco: station.endereco || 'Endereço não informado',
      cidade: station.cidade || 'Não informado',
      estado: station.estado || 'SP',
      cep: station.cep || '00000-000',
      ativo: station.ativo === true || station.ativo === 't',
      telefone: station.telefone || null,
      cnpj: station.cnpj || null
    }
  } catch (error) {
    console.error('Erro ao buscar posto:', error)
    throw error
  }
}

export async function createStation(station: StationInsert): Promise<Station> {
  try {
    console.log('Criando posto com dados:', station)
    
    const result = await queryOne(`
      INSERT INTO postos (
        nome,
        endereco,
        cidade,
        estado,
        cep,
        telefone,
        cnpj,
        ativo,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [
      station.nome,
      station.endereco,
      station.cidade,
      station.estado,
      station.cep,
      station.telefone,
      station.cnpj,
      station.ativo !== undefined ? station.ativo : true
    ])

    if (!result) {
      throw new Error('Erro ao criar posto - nenhum resultado retornado')
    }

    console.log('Posto criado com sucesso:', result)
    return result
  } catch (error) {
    console.error('Erro ao criar posto:', error)
    throw error
  }
}

export async function updateStation(id: string, station: Partial<StationInsert>): Promise<Station> {
  try {
    console.log('Atualizando posto:', id, 'com dados:', station)
    
    const result = await queryOne(`
      UPDATE postos
      SET
        nome = COALESCE($1, nome),
        endereco = COALESCE($2, endereco),
        cidade = COALESCE($3, cidade),
        estado = COALESCE($4, estado),
        cep = COALESCE($5, cep),
        telefone = $6,
        cnpj = $7,
        ativo = COALESCE($8, ativo),
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      station.nome,
      station.endereco,
      station.cidade,
      station.estado,
      station.cep,
      station.telefone,
      station.cnpj,
      station.ativo,
      id
    ])

    if (!result) {
      throw new Error('Posto não encontrado')
    }

    console.log('Posto atualizado com sucesso:', result)
    return result
  } catch (error) {
    console.error('Erro ao atualizar posto:', error)
    throw error
  }
}

export async function deleteStation(id: string): Promise<void> {
  try {
    console.log('Excluindo posto:', id)
    await query('DELETE FROM postos WHERE id = $1', [id])
    console.log('Posto excluído com sucesso')
  } catch (error) {
    console.error('Erro ao excluir posto:', error)
    throw error
  }
}