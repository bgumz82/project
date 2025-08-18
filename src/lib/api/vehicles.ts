import { query, queryOne } from '../db'

// Cache key for vehicles
const VEHICLES_CACHE_KEY = 'vehicles_cache'

export interface Vehicle {
  id: string
  placa: string
  tipo: 'carro' | 'caminhao' | 'maquina_pesada' | 'implementos' | 'onibus' | 'bi_trem_1_reboque' | 'bi_trem_2_reboque' | 'vanderleia_3_eixos' | 'vanderleia_4_eixos' | 'julieta'
  marca: string
  modelo: string
  ano: number
  qrcode_data: string
  renavam?: string | null
  chassis?: string | null
  uf_registro?: string
  cor?: string
  tara_kg?: number | null
  carga_kg?: number | null
  status?: string
  tipo_combustivel?: string
  validade_tacografo?: string | null
  ativo?: boolean
  created_at: string
  updated_at: string
}

export interface VehicleInsert {
  placa: string
  tipo: 'carro' | 'caminhao' | 'maquina_pesada' | 'implementos' | 'onibus' | 'bi_trem_1_reboque' | 'bi_trem_2_reboque' | 'vanderleia_3_eixos' | 'vanderleia_4_eixos' | 'julieta'
  marca: string
  modelo: string
  ano: number
  qrcode_data: string
}

// Save vehicles to cache
const saveVehiclesToCache = (vehicles: Vehicle[]) => {
  try {
    localStorage.setItem(VEHICLES_CACHE_KEY, JSON.stringify(vehicles))
  } catch (error) {
    console.error('Erro ao salvar veículos no cache:', error)
  }
}

// Get vehicles from cache
const getVehiclesFromCache = (): Vehicle[] => {
  try {
    const cached = localStorage.getItem(VEHICLES_CACHE_KEY)
    return cached ? JSON.parse(cached) : []
  } catch (error) {
    console.error('Erro ao obter veículos do cache:', error)
    return []
  }
}

export async function getVehicles() {
  try {
    if (navigator.onLine) {
      const vehicles = await query(`
        SELECT *
        FROM veiculos
        ORDER BY created_at DESC
      `)

      if (vehicles) {
        saveVehiclesToCache(vehicles)
      }

      return vehicles
    }

    return getVehiclesFromCache()
  } catch (error) {
    console.error('Erro ao buscar veículos:', error)
    return getVehiclesFromCache()
  }
}

export async function getVehicle(id: string) {
  try {
    if (navigator.onLine) {
      const vehicle = await queryOne(`
        SELECT *
        FROM veiculos
        WHERE id = $1
      `, [id])

      return vehicle
    }

    const vehicles = getVehiclesFromCache()
    return vehicles.find(v => v.id === id) || null
  } catch (error) {
    console.error('Erro ao buscar veículo:', error)
    const vehicles = getVehiclesFromCache()
    return vehicles.find(v => v.id === id) || null
  }
}

export async function getVehicleByPlate(placa: string) {
  try {
    if (navigator.onLine) {
      const vehicle = await queryOne(`
        SELECT *
        FROM veiculos
        WHERE placa = $1
      `, [placa])

      return vehicle
    }

    const vehicles = getVehiclesFromCache()
    return vehicles.find(v => v.placa === placa) || null
  } catch (error) {
    console.error('Erro ao buscar veículo pela placa:', error)
    const vehicles = getVehiclesFromCache()
    return vehicles.find(v => v.placa === placa) || null
  }
}

export async function getVehicleByQRCode(qrcode: string) {
  try {
    const placa = qrcode.replace('vehicle_', '')
    
    if (navigator.onLine) {
      const vehicle = await queryOne(`
        SELECT *
        FROM veiculos
        WHERE placa = $1
      `, [placa])

      if (!vehicle) {
        throw new Error('Veículo não encontrado')
      }

      return vehicle
    }

    const vehicles = getVehiclesFromCache()
    const vehicle = vehicles.find(v => v.placa === placa)
    
    if (!vehicle) {
      throw new Error('Veículo não encontrado no cache local')
    }
    
    return vehicle
  } catch (error) {
    console.error('Erro ao buscar veículo por QR Code:', error)
    throw error
  }
}

export async function createVehicle(vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) {
  const result = await queryOne(`
    INSERT INTO veiculos (
      placa,
      tipo,
      marca,
      modelo,
      ano,
      qrcode_data
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    vehicle.placa,
    vehicle.tipo,
    vehicle.marca,
    vehicle.modelo,
    vehicle.ano,
    `vehicle_${vehicle.placa}`
  ])

  return result
}

export async function updateVehicle(id: string, vehicle: Partial<Vehicle>) {
  // Construir query dinamicamente baseada nos campos fornecidos
  const updates: string[] = []
  const values: any[] = [id] // ID sempre como primeiro parâmetro
  let paramIndex = 2 // Começar do parâmetro 2

  if (vehicle.placa !== undefined) {
    updates.push(`placa = $${paramIndex}`)
    values.push(vehicle.placa)
    paramIndex++
  }

  if (vehicle.tipo !== undefined) {
    updates.push(`tipo = $${paramIndex}`)
    values.push(vehicle.tipo)
    paramIndex++
  }

  if (vehicle.marca !== undefined) {
    updates.push(`marca = $${paramIndex}`)
    values.push(vehicle.marca)
    paramIndex++
  }

  if (vehicle.modelo !== undefined) {
    updates.push(`modelo = $${paramIndex}`)
    values.push(vehicle.modelo)
    paramIndex++
  }

  if (vehicle.ano !== undefined) {
    updates.push(`ano = $${paramIndex}`)
    values.push(vehicle.ano)
    paramIndex++
  }

  if (vehicle.renavam !== undefined) {
    updates.push(`renavam = $${paramIndex}`)
    values.push(vehicle.renavam)
    paramIndex++
  }

  if (vehicle.chassis !== undefined) {
    updates.push(`chassis = $${paramIndex}`)
    values.push(vehicle.chassis)
    paramIndex++
  }

  if (vehicle.uf_registro !== undefined) {
    updates.push(`uf_registro = $${paramIndex}`)
    values.push(vehicle.uf_registro)
    paramIndex++
  }

  if (vehicle.cor !== undefined) {
    updates.push(`cor = $${paramIndex}`)
    values.push(vehicle.cor)
    paramIndex++
  }

  if (vehicle.tara_kg !== undefined) {
    updates.push(`tara_kg = $${paramIndex}`)
    values.push(vehicle.tara_kg)
    paramIndex++
  }

  if (vehicle.carga_kg !== undefined) {
    updates.push(`carga_kg = $${paramIndex}`)
    values.push(vehicle.carga_kg)
    paramIndex++
  }

  if (vehicle.status !== undefined) {
    updates.push(`status = $${paramIndex}`)
    values.push(vehicle.status)
    paramIndex++
  }

  if (vehicle.tipo_combustivel !== undefined) {
    updates.push(`tipo_combustivel = $${paramIndex}`)
    values.push(vehicle.tipo_combustivel)
    paramIndex++
  }

  if (vehicle.validade_tacografo !== undefined) {
    updates.push(`validade_tacografo = $${paramIndex}`)
    values.push(vehicle.validade_tacografo)
    paramIndex++
  }

  // Atualizar QR code se a placa mudou
  if (vehicle.placa !== undefined) {
    updates.push(`qrcode_data = $${paramIndex}`)
    values.push(`vehicle_${vehicle.placa}`)
    paramIndex++
  }

  // Sempre atualizar updated_at
  updates.push(`updated_at = NOW()`)

  if (updates.length === 1) { // Apenas updated_at
    throw new Error('Nenhum campo para atualizar')
  }

  const result = await queryOne(`
    UPDATE veiculos
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING *
  `, values)

  if (!result) {
    throw new Error('Veículo não encontrado')
  }

  return result
}

export async function deleteVehicle(id: string) {
  await query('DELETE FROM veiculos WHERE id = $1', [id])
}