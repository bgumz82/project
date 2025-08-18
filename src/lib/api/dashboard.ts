import { query } from '@/lib/db'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface DashboardStats {
  totalVeiculos: number
  manutencoesPendentes: number
  checklistsHoje: number
  abastecimentosHoje: number
  totalCadastros: {
    clientes: number
    fornecedores: number
    postos: number
    total: number
  }
  associacoesAtivas: number
}

export interface ProximasManutencoes {
  id: string
  tipo: string
  data_prevista: string
  veiculo: {
    placa: string
    modelo: string
  }
}

export interface ConsumoMensal {
  mes: string
  total_litros: number
  valor_total: number
}

export interface AssociacaoFrotaAtiva {
  id: string
  motorista_nome: string
  veiculo_principal_placa: string
  veiculo_implemento_placa: string | null
  data_inicio: string
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const hoje = new Date()
    const inicioDia = format(hoje, 'yyyy-MM-dd')

    // Usar Promise.all para fazer todas as consultas em paralelo
    const [
      totalVeiculos,
      manutencoesPendentes,
      checklistsHoje,
      abastecimentosHoje,
      cadastrosStats,
      associacoesAtivas
    ] = await Promise.all([
      query('SELECT COUNT(*) as total FROM veiculos'),
      query(`
        SELECT COUNT(*) as total 
        FROM manutencoes 
        WHERE data_realizada IS NULL 
        AND data_prevista <= $1
      `, [format(hoje, 'yyyy-MM-dd')]),
      query(`
        SELECT COUNT(*) as total 
        FROM checklists 
        WHERE DATE(data_checklist) = $1
      `, [inicioDia]),
      query(`
        SELECT COUNT(*) as total 
        FROM abastecimentos 
        WHERE DATE(data_abastecimento) = $1
      `, [inicioDia]),
      query(`
        SELECT 
          COUNT(CASE WHEN tipo = 'cliente' THEN 1 END) as clientes,
          COUNT(CASE WHEN tipo = 'fornecedor' THEN 1 END) as fornecedores,
          COUNT(CASE WHEN tipo = 'abastecimento' THEN 1 END) as postos,
          COUNT(*) as total
        FROM cadastros 
        WHERE ativo = true
      `, [], false), // Usar banco específico do usuário para cadastros
      query(`
        SELECT COUNT(*) as total 
        FROM associacoes_frota 
        WHERE ativo = true AND data_fim IS NULL
      `)
    ])

    return {
      totalVeiculos: parseInt(totalVeiculos[0]?.total || '0'),
      manutencoesPendentes: parseInt(manutencoesPendentes[0]?.total || '0'),
      checklistsHoje: parseInt(checklistsHoje[0]?.total || '0'),
      abastecimentosHoje: parseInt(abastecimentosHoje[0]?.total || '0'),
      totalCadastros: {
        clientes: parseInt(cadastrosStats[0]?.clientes || '0'),
        fornecedores: parseInt(cadastrosStats[0]?.fornecedores || '0'),
        postos: parseInt(cadastrosStats[0]?.postos || '0'),
        total: parseInt(cadastrosStats[0]?.total || '0')
      },
      associacoesAtivas: parseInt(associacoesAtivas[0]?.total || '0')
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    throw error
  }
}

export async function getProximasManutencoes(): Promise<ProximasManutencoes[]> {
  try {
    const result = await query(`
      SELECT 
        m.id,
        m.tipo,
        m.data_prevista,
        v.placa,
        v.modelo
      FROM manutencoes m
      JOIN veiculos v ON m.veiculo_id = v.id
      WHERE m.data_realizada IS NULL
      ORDER BY m.data_prevista ASC
      LIMIT 5
    `)

    return result.map(item => ({
      id: item.id,
      tipo: item.tipo,
      data_prevista: item.data_prevista,
      veiculo: {
        placa: item.placa,
        modelo: item.modelo
      }
    }))
  } catch (error) {
    console.error('Error fetching próximas manutenções:', error)
    throw error
  }
}

export async function getConsumoMensal(): Promise<ConsumoMensal[]> {
  try {
    console.log('🔍 Buscando consumo mensal de combustível...')
    
    const result = await query(`
      SELECT 
        DATE_TRUNC('month', data_abastecimento) as mes_date,
        TO_CHAR(data_abastecimento, 'YYYY-MM') as mes_string,
        SUM(litros) as total_litros,
        SUM(valor_total) as valor_total
      FROM abastecimentos
      WHERE data_abastecimento >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', data_abastecimento), TO_CHAR(data_abastecimento, 'YYYY-MM')
      ORDER BY mes_date
    `)

    console.log('✅ Consumo mensal encontrado:', result.length, 'registros')
    
    return result.map(item => ({
      mes: item.mes_date ? format(new Date(item.mes_date), 'MMM/yyyy', { locale: ptBR }) : 'N/A',
      total_litros: parseFloat(item.total_litros),
      valor_total: parseFloat(item.valor_total)
    }))
  } catch (error) {
    console.error('Error fetching consumo mensal:', error)
    console.error('❌ Erro ao buscar consumo mensal:', error)
    return []
  }
}

export async function getAssociacoesFrotaAtivas(): Promise<AssociacaoFrotaAtiva[]> {
  try {
    const result = await query(`
      SELECT 
        af.id,
        f.nome as motorista_nome,
        vp.placa as veiculo_principal_placa,
        COALESCE(
          vi.placa,
          CASE 
            WHEN vr1.placa IS NOT NULL AND vr2.placa IS NOT NULL THEN vr1.placa || '+' || vr2.placa
            WHEN vr1.placa IS NOT NULL THEN vr1.placa
            WHEN vr2.placa IS NOT NULL THEN vr2.placa
            ELSE NULL
          END
        ) as veiculo_implemento_placa,
        af.data_inicio
      FROM associacoes_frota af
      JOIN funcionarios f ON af.funcionario_id = f.id
      JOIN veiculos vp ON af.veiculo_principal_id = vp.id
      LEFT JOIN veiculos vr1 ON af.veiculo_reboque1_id = vr1.id
      LEFT JOIN veiculos vr2 ON af.veiculo_reboque2_id = vr2.id
      LEFT JOIN veiculos vi ON af.veiculo_implemento_id = vi.id
      WHERE af.ativo = true AND af.data_fim IS NULL
      ORDER BY f.nome
      LIMIT 5
    `)

    return result.map(item => ({
      id: item.id,
      motorista_nome: item.motorista_nome.split(' ')[0], // Apenas primeiro nome
      veiculo_principal_placa: item.veiculo_principal_placa,
      veiculo_implemento_placa: item.veiculo_implemento_placa,
      data_inicio: item.data_inicio
    }))
  } catch (error) {
    console.error('Error fetching associações frota ativas:', error)
    return []
  }
}