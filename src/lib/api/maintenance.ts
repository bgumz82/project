import { query, queryOne } from '@/lib/db'

export interface Maintenance {
  id: string
  veiculo_id: string
  tipo: string
  descricao: string
  data_prevista: string
  data_realizada: string | null
  alerta_enviado: boolean
  created_at: string
  updated_at: string
  veiculo: {
    placa: string
    modelo: string
  }
}

export interface MaintenanceCreate {
  veiculo_id: string
  tipo: string
  descricao: string
  data_prevista: string
  data_realizada?: string | null
  alerta_enviado?: boolean
}

export async function getMaintenances(): Promise<Maintenance[]> {
  const maintenances = await query(`
    SELECT 
      m.*,
      v.placa as veiculo_placa,
      v.modelo as veiculo_modelo
    FROM manutencoes m
    JOIN veiculos v ON m.veiculo_id = v.id
    ORDER BY m.data_prevista ASC
  `)

  return maintenances.map(maintenance => ({
    ...maintenance,
    veiculo: {
      placa: maintenance.veiculo_placa,
      modelo: maintenance.veiculo_modelo
    }
  }))
}

export async function createMaintenance(maintenance: MaintenanceCreate): Promise<Maintenance> {
  const result = await queryOne(`
    INSERT INTO manutencoes (
      veiculo_id,
      tipo,
      descricao,
      data_prevista,
      data_realizada,
      alerta_enviado
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    maintenance.veiculo_id,
    maintenance.tipo,
    maintenance.descricao,
    maintenance.data_prevista,
    maintenance.data_realizada,
    maintenance.alerta_enviado || false
  ])

  if (!result) {
    throw new Error('Erro ao criar manutenção')
  }

  return {
    ...result,
    veiculo: {
      placa: '',
      modelo: ''
    }
  }
}

export async function updateMaintenance(id: string, maintenance: Partial<MaintenanceCreate>): Promise<Maintenance> {
  const result = await queryOne(`
    UPDATE manutencoes
    SET
      veiculo_id = COALESCE($1, veiculo_id),
      tipo = COALESCE($2, tipo),
      descricao = COALESCE($3, descricao),
      data_prevista = COALESCE($4, data_prevista),
      data_realizada = $5,
      alerta_enviado = COALESCE($6, alerta_enviado),
      updated_at = NOW()
    WHERE id = $7
    RETURNING *
  `, [
    maintenance.veiculo_id,
    maintenance.tipo,
    maintenance.descricao,
    maintenance.data_prevista,
    maintenance.data_realizada,
    maintenance.alerta_enviado,
    id
  ])

  if (!result) {
    throw new Error('Manutenção não encontrada')
  }

  return {
    ...result,
    veiculo: {
      placa: '',
      modelo: ''
    }
  }
}

export async function deleteMaintenance(id: string): Promise<void> {
  await query('DELETE FROM manutencoes WHERE id = $1', [id])
}