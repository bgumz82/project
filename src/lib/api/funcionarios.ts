import { query, queryOne } from '@/lib/db'

export interface Funcionario {
  id: string
  nome: string
  cpf: string
  rg: string
  matricula: string
  data_admissao: string
  data_nascimento: string
  telefone: string | null
  foto_url: string | null
  funcao: 'administrativo' | 'motorista' | 'motorista_carreta' | 'motorista_julieta' | 'gerente'
  cnh: string | null
  validade_cnh: string | null
  status: 'ativo' | 'inativo' | 'ferias' | 'aguardando'
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface FuncionarioCreate {
  nome: string
  cpf: string
  rg: string
  matricula: string
  data_admissao: string
  data_nascimento: string
  telefone?: string | null
  funcao: 'administrativo' | 'motorista' | 'motorista_carreta' | 'motorista_julieta' | 'gerente'
  cnh?: string | null
  validade_cnh?: string | null
  status?: 'ativo' | 'inativo' | 'ferias' | 'aguardando'
  ativo?: boolean
}

export interface CreateFuncionarioParams {
  funcionario: FuncionarioCreate
  foto: File
}

export interface UpdateFuncionarioParams {
  id: string
  funcionario: Partial<FuncionarioCreate>
  foto?: File
}

export async function getFuncionarios(): Promise<Funcionario[]> {
  return await query(`
    SELECT *
    FROM funcionarios
    ORDER BY nome
  `)
}

export async function getFuncionario(id: string): Promise<Funcionario | null> {
  return await queryOne(`
    SELECT *
    FROM funcionarios
    WHERE id = $1
  `, [id])
}

export async function createFuncionario(params: CreateFuncionarioParams): Promise<Funcionario> {
  const { funcionario } = params

  const result = await queryOne(`
    INSERT INTO funcionarios (
      nome,
      cpf,
      rg,
      matricula,
      data_admissao,
      data_nascimento,
      telefone,
      funcao,
      cnh,
      validade_cnh,
      status,
      ativo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    funcionario.nome,
    funcionario.cpf,
    funcionario.rg,
    funcionario.matricula,
    funcionario.data_admissao,
    funcionario.data_nascimento,
    funcionario.telefone,
    funcionario.funcao,
    funcionario.cnh,
    funcionario.validade_cnh,
    funcionario.status || 'ativo',
    funcionario.ativo || true
  ])

  if (!result) {
    throw new Error('Erro ao criar funcionário')
  }

  return result
}

export async function updateFuncionario(params: UpdateFuncionarioParams): Promise<Funcionario> {
  const { id, funcionario } = params

  const result = await queryOne(`
    UPDATE funcionarios
    SET
      nome = COALESCE($1, nome),
      cpf = COALESCE($2, cpf),
      rg = COALESCE($3, rg),
      matricula = COALESCE($4, matricula),
      data_admissao = COALESCE($5, data_admissao),
      data_nascimento = COALESCE($6, data_nascimento),
      telefone = COALESCE($7, telefone),
      funcao = COALESCE($8, funcao),
      cnh = COALESCE($9, cnh),
      validade_cnh = COALESCE($10, validade_cnh),
      status = COALESCE($11, status),
      ativo = COALESCE($12, ativo),
      updated_at = NOW()
    WHERE id = $13
    RETURNING *
  `, [
    funcionario.nome,
    funcionario.cpf,
    funcionario.rg,
    funcionario.matricula,
    funcionario.data_admissao,
    funcionario.data_nascimento,
    funcionario.telefone,
    funcionario.funcao,
    funcionario.cnh,
    funcionario.validade_cnh,
    funcionario.status,
    funcionario.ativo,
    id
  ])

  if (!result) {
    throw new Error('Funcionário não encontrado')
  }

  return result
}

export async function deleteFuncionario(id: string): Promise<void> {
  await query('DELETE FROM funcionarios WHERE id = $1', [id])
}