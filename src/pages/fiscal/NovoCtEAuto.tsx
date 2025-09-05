import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { getAssociacoesFrota } from '@/lib/api/fleet-associations'
import { validarChaveAcesso, createCTeDocumento, getEmpresasFiscais } from '@/lib/api/fiscal'
import { query } from '@/lib/db'
import type { AssociacaoFrota } from '@/lib/api/fleet-associations'
import type { EmpresaFiscal } from '@/lib/api/fiscal'

interface NFEData {
  remetente: {
    razao_social: string
    cnpj: string
    ie: string
    endereco: string
    cidade: string
    estado: string
    cep: string
  }
  destinatario: {
    razao_social: string
    cnpj: string
    ie: string
    endereco: string
    cidade: string
    estado: string
    cep: string
  }
  produto: {
    descricao: string
    codigo_ncm: string
    valor_total: number
    peso_total: number
    quantidade_total: number
  }
  transporte: {
    valor_frete?: number
    modal_transporte: string
  }
  numero_nfe: string
  serie: string
  data_emissao: string
  chave_acesso: string
  observacoes?: string // Campo para observações da NF-e
}

export default function NovoCtEAuto() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [chaveNFE, setChaveNFE] = useState('')
  const [chaveValida, setChaveValida] = useState<boolean | null>(null)
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('')
  const [associacaoSelecionada, setAssociacaoSelecionada] = useState<string>('')
  const [nfeData, setNfeData] = useState<NFEData | null>(null)
  const [consultandoNFE, setConsultandoNFE] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [remetenteExiste, setRemetenteExiste] = useState<boolean | null>(null)
  const [destinatarioExiste, setDestinatarioExiste] = useState<boolean | null>(null)
  const [cadastrandoCliente, setCadastrandoCliente] = useState<'remetente' | 'destinatario' | null>(null)

  // Função para formatar nome do motorista com placa do último reboque
  const formatarNomeMotorista = (associacao: any) => {
    if (!associacao?.funcionario?.nome) return 'Motorista não informado'
    
    const primeiroNome = associacao.funcionario.nome.split(' ')[0]
    
    // Determinar placa do último reboque (priorizando reboque2 para Bi-Trem)
    let placaUltimoReboque = ''
    
    if (associacao.veiculo_reboque2?.placa) {
      // Se tem reboque2, é Bi-Trem - usar sempre o 2º reboque
      placaUltimoReboque = associacao.veiculo_reboque2.placa
    } else if (associacao.veiculo_reboque1?.placa) {
      // Se só tem reboque1, usar reboque1
      placaUltimoReboque = associacao.veiculo_reboque1.placa
    } else if (associacao.veiculo_implemento?.placa) {
      // Se tem implemento, usar implemento
      placaUltimoReboque = associacao.veiculo_implemento.placa
    } else {
      // Se não tem reboque, usar placa do veículo principal
      placaUltimoReboque = associacao.veiculo_principal?.placa || 'SEM_PLACA'
    }
    
    return `${primeiroNome} - ${placaUltimoReboque}`
  }

  // Buscar empresas fiscais
  const { data: empresasFiscais } = useQuery({
    queryKey: ['empresas-fiscais'],
    queryFn: getEmpresasFiscais,
    staleTime: 1000 * 60 * 5
  })

  // Buscar associações (motorista/reboque)
  const { data: associacoes } = useQuery({
    queryKey: ['associacoes-frota'],
    queryFn: getAssociacoesFrota,
    staleTime: 1000 * 60 * 5
  })

  // Função para consultar NFE no webservice
  const consultarNFE = async (chave: string) => {
    try {
      console.log('🔍 Consultando NF-e via servidor:', chave)
      
      const response = await fetch('/api/consultar-nfe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ chaveNFE: chave })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Erro na resposta:', response.status, errorText)
        throw new Error(`Erro na consulta da NF-e: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Resposta recebida do servidor:', result)
      
      return result
    } catch (error) {
      console.error('❌ Erro ao consultar NF-e:', error)
      throw error
    }
  }

  // Função para verificar se cliente existe por CNPJ (usando banco remoto)
  const verificarCliente = async (cnpj: string) => {
    try {
      console.log('🔍 Verificando cliente no banco remoto:', cnpj)
      
      const result = await query(`
        SELECT id FROM cadastros 
        WHERE cnpj = $1 AND tipo = 'cliente' AND ativo = true
        LIMIT 1
      `, [cnpj])
      
      const existe = result.length > 0
      console.log('✅ Cliente existe no banco remoto:', existe)
      return existe
    } catch (error) {
      console.error('❌ Erro ao verificar cliente no banco remoto:', error)
      return false
    }
  }

  // Função para cadastrar cliente automaticamente (usando banco remoto)
  const cadastrarClienteNFE = async (tipo: 'remetente' | 'destinatario') => {
    if (!nfeData) return
    
    setCadastrandoCliente(tipo)
    
    try {
      const dadosCliente = tipo === 'remetente' ? nfeData.remetente : nfeData.destinatario
      
      console.log('📝 Cadastrando cliente no banco remoto:', dadosCliente)
      
      // Inserir no banco remoto usando query com todos os campos obrigatórios
      await query(`
        INSERT INTO cadastros (
          id, tipo, razao_social, cnpj, ie, endereco, cidade, estado, cep, telefone, emails, ativo, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 'cliente', $1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW()
        )
      `, [
        dadosCliente.razao_social,
        dadosCliente.cnpj,
        dadosCliente.ie || null, // ie da NF-e
        dadosCliente.endereco,
        dadosCliente.cidade,
        dadosCliente.estado,
        dadosCliente.cep,
        null, // telefone
        null // emails como null
      ])
      
      toast.success(`${tipo === 'remetente' ? 'Remetente' : 'Destinatário'} cadastrado com sucesso!`)
      
      // Atualizar status
      if (tipo === 'remetente') {
        setRemetenteExiste(true)
      } else {
        setDestinatarioExiste(true)
      }
      
      // Invalidar cache dos cadastros para recarregar lista atualizada
      queryClient.invalidateQueries({ queryKey: ['cadastros'] })
      
    } catch (error) {
      console.error('❌ Erro ao cadastrar cliente no banco remoto:', error)
      toast.error('Erro ao cadastrar cliente')
    } finally {
      setCadastrandoCliente(null)
    }
  }

  // Mutation para consultar NF-e
  const consultarNFEMutation = useMutation({
    mutationFn: consultarNFE,
    onSuccess: async (data) => {
      setNfeData(data)
      toast.success('NF-e consultada com sucesso!')
      
      // Verificar se remetente e destinatário existem
      const remetenteExists = await verificarCliente(data.remetente.cnpj)
      const destinatarioExists = await verificarCliente(data.destinatario.cnpj)
      
      setRemetenteExiste(remetenteExists)
      setDestinatarioExiste(destinatarioExists)
    },
    onError: (error) => {
      console.error('Erro na consulta:', error)
      toast.error('Erro ao consultar NF-e. Verifique a chave de acesso.')
    },
    onSettled: () => {
      setConsultandoNFE(false)
    }
  })

  // Mutation para criar CT-e
  const createCTeMutation = useMutation({
    mutationFn: createCTeDocumento,
    onSuccess: () => {
      toast.success('CT-e criado automaticamente com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cte-documentos'] })
      navigate('/fiscal/cte')
    },
    onError: (error) => {
      console.error('Erro ao criar CT-e:', error)
      toast.error('Erro ao criar CT-e automaticamente')
    },
    onSettled: () => {
      setIsSubmitting(false)
    }
  })

  const handleChaveChange = (value: string) => {
    // Remove espaços e caracteres especiais
    const chaveFormatada = value.replace(/\s/g, '').replace(/\D/g, '')
    setChaveNFE(chaveFormatada)
    
    // Valida a chave
    if (chaveFormatada.length === 44) {
      const isValid = validarChaveAcesso(chaveFormatada)
      setChaveValida(isValid)
    } else {
      setChaveValida(null)
    }
    
    // Reset dados da NF-e se chave mudou
    setNfeData(null)
  }

  const handleConsultarNFE = () => {
    if (!chaveValida || !chaveNFE) {
      toast.error('Informe uma chave de acesso válida')
      return
    }

    setConsultandoNFE(true)
    consultarNFEMutation.mutate(chaveNFE)
  }

  const handleCriarCTE = () => {
    if (!nfeData || !associacaoSelecionada || !empresaSelecionada) {
      toast.error('Consulte a NF-e, selecione a empresa emitente e o motorista/reboque')
      return
    }

    const associacao = associacoes?.find(a => a.id === associacaoSelecionada)
    if (!associacao) {
      toast.error('Associação não encontrada')
      return
    }

    const empresa = empresasFiscais?.find(e => e.id === empresaSelecionada)
    if (!empresa) {
      toast.error('Empresa fiscal não encontrada')
      return
    }

    // Mapear dados da NF-e para o CT-e
    const cteData = {
      empresa_id: empresaSelecionada,
      data_emissao: new Date().toISOString().split('T')[0], // Data atual
      chave_acesso_1: chaveNFE,
      numero_cte: 'AUTO', // Deixar o servidor gerar automaticamente
      serie: empresa.serie_padrao_cte || '001',
      codigo_uf: empresa.codigo_uf || '35', // Usar código UF da empresa
      status: 'pendente' as const,
      // Dados básicos para o CT-e
      tipo_servico: '0', // Normal
      finalidade_cte: '0', // Normal
      cfop: '5352', // Prestação de serviços de transporte
      // Dados da associação/motorista
      associacao_frota_id: associacaoSelecionada,
      motorista_nome: associacao.funcionario?.nome || null,
      motorista_cnh: associacao.funcionario?.cnh || null,
      motorista_matricula: associacao.funcionario?.matricula || null,
      motorista_validade_cnh: associacao.funcionario?.validade_cnh ? new Date(associacao.funcionario.validade_cnh).toISOString().split('T')[0] : null,
      placa_veiculo: associacao.veiculo_principal?.placa || null,
      placa_reboque: associacao.veiculo_reboque1?.placa || associacao.veiculo_reboque2?.placa || associacao.veiculo_implemento?.placa || null,
      // Dados do produto/carga da NF-e
      valor_carga: nfeData.produto.valor_total,
      quantidade_carga: nfeData.produto.quantidade_total,
      // Observações da NF-e
      observacoes: nfeData.observacoes ? `Referente à NF-e ${nfeData.numero_nfe}/${nfeData.serie}. ${nfeData.observacoes}` : `Referente à NF-e ${nfeData.numero_nfe}/${nfeData.serie}`
    }

    console.log('📝 Criando novo documento CT-e:', cteData)

    setIsSubmitting(true)
    createCTeMutation.mutate(cteData)
  }

  const associacao = associacoes?.find(a => a.id === associacaoSelecionada)

  return (
    <div className="py-6">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/fiscal/cte')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Voltar para CT-e
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Novo CT-e Auto</h1>
          <p className="text-sm text-gray-600 mt-1">
            Crie um CT-e automaticamente a partir de uma chave de acesso NF-e
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário */}
          <div className="space-y-6">
            {/* Chave NF-e */}
            <div>
              <label htmlFor="chave-nfe" className="block text-sm font-medium text-gray-700 mb-2">
                Chave de Acesso NF-e *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="chave-nfe"
                  value={chaveNFE}
                  onChange={(e) => handleChaveChange(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pr-10"
                  placeholder="Cole aqui a chave de 44 dígitos"
                  maxLength={44}
                />
                {chaveValida === true && (
                  <CheckCircleIcon className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                )}
                {chaveValida === false && (
                  <ExclamationTriangleIcon className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {chaveNFE.length}/44 dígitos
                {chaveValida === false && (
                  <span className="text-red-600 ml-2">Chave inválida</span>
                )}
              </p>
            </div>

            {/* Botão Consultar */}
            <button
              onClick={handleConsultarNFE}
              disabled={!chaveValida || consultandoNFE}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
              {consultandoNFE ? 'Consultando...' : 'Consultar NF-e'}
            </button>

            {/* Seleção de Empresa Emitente */}
            {nfeData && (
              <div>
                <label htmlFor="empresa" className="block text-sm font-medium text-gray-700 mb-2">
                  Empresa Emitente *
                </label>
                <select
                  id="empresa"
                  value={empresaSelecionada}
                  onChange={(e) => setEmpresaSelecionada(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Selecione a empresa...</option>
                  {empresasFiscais?.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.razao_social}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Seleção de Motorista/Reboque */}
            {nfeData && (
              <div>
                <label htmlFor="associacao" className="block text-sm font-medium text-gray-700 mb-2">
                  Motorista/Reboque *
                </label>
                <select
                  id="associacao"
                  value={associacaoSelecionada}
                  onChange={(e) => setAssociacaoSelecionada(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Selecione...</option>
                  {associacoes?.map((assoc) => (
                    <option key={assoc.id} value={assoc.id}>
                      {formatarNomeMotorista(assoc)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Botão Criar CT-e */}
            {nfeData && associacaoSelecionada && (
              <button
                onClick={handleCriarCTE}
                disabled={isSubmitting}
                className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
              >
                <TruckIcon className="h-5 w-5 mr-2" />
                {isSubmitting ? 'Criando CT-e...' : 'Criar CT-e Automaticamente'}
              </button>
            )}
          </div>

          {/* Preview dos Dados */}
          <div>
            {nfeData && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Dados da NF-e Consultada
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-700">Remetente</h4>
                      {remetenteExiste === false && (
                        <button
                          onClick={() => cadastrarClienteNFE('remetente')}
                          disabled={cadastrandoCliente === 'remetente'}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          {cadastrandoCliente === 'remetente' ? 'Cadastrando...' : 'Cadastrar Cliente'}
                        </button>
                      )}
                      {remetenteExiste === true && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                          ✓ Cliente já cadastrado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{nfeData.remetente.razao_social}</p>
                    <p className="text-sm text-gray-600">{nfeData.remetente.cnpj}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-700">Destinatário</h4>
                      {destinatarioExiste === false && (
                        <button
                          onClick={() => cadastrarClienteNFE('destinatario')}
                          disabled={cadastrandoCliente === 'destinatario'}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          {cadastrandoCliente === 'destinatario' ? 'Cadastrando...' : 'Cadastrar Cliente'}
                        </button>
                      )}
                      {destinatarioExiste === true && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                          ✓ Cliente já cadastrado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{nfeData.destinatario.razao_social}</p>
                    <p className="text-sm text-gray-600">{nfeData.destinatario.cnpj}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700">Produto</h4>
                    <p className="text-sm text-gray-600">{nfeData.produto.descricao}</p>
                    <p className="text-sm text-gray-600">
                      Quantidade: {nfeData.produto.quantidade_total} Litros | 
                      Valor: R$ {nfeData.produto.valor_total.toFixed(2)}
                    </p>
                  </div>

                  {/* Observações da NF-e */}
                  {nfeData.observacoes && (
                    <div>
                      <h4 className="font-medium text-gray-700">Observações da NF-e</h4>
                      <p className="text-sm text-gray-600">{nfeData.observacoes}</p>
                    </div>
                  )}

                  {associacao && (
                    <div>
                      <h4 className="font-medium text-gray-700">Motorista/Veículo</h4>
                      <p className="text-sm text-gray-600">{associacao.funcionario?.nome}</p>
                      <p className="text-sm text-gray-600">
                        {associacao.veiculo_principal?.placa}
                        {associacao.veiculo_implemento?.placa && ` + ${associacao.veiculo_implemento.placa}`}
                        {associacao.veiculo_reboque1?.placa && ` + ${associacao.veiculo_reboque1.placa}`}
                        {associacao.veiculo_reboque2?.placa && ` + ${associacao.veiculo_reboque2.placa}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}