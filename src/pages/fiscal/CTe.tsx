import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  DocumentTextIcon,
  XMarkIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline'
import {
  getCTeDocumentos,
  createCTeDocumento,
  updateCTeDocumento,
  deleteCTeDocumento,
  getEmpresasFiscais,
  updateDocumentFiles,
  formatCNPJ,
  formatChaveAcesso,
  getUFFromCode,
  getCidadesPorNome,
  getClientesAtivos,
  getProdutosCTe,
  validarChaveAcesso,
  type CTeDocumento,
  type CTeDocumentoCreate,
  type Cidade,
  type ProdutoCTe
} from '@/lib/api/fiscal'
import {
  getAssociacoesAtivasParaCTe,
  type AssociacaoFrota
} from '@/lib/api/fleet-associations'

const STATUS_LABELS = {
  pendente: 'Pendente',
  emitido: 'Emitido',
  cancelado: 'Cancelado'
}

const STATUS_COLORS = {
  pendente: 'bg-yellow-100 text-yellow-800',
  emitido: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800'
}

const CFOP_OPTIONS = [
  { value: '5352', label: '5352 - Prestação de serviço de transporte dentro do Estado' },
  { value: '6352', label: '6352 - Prestação de serviço de transporte fora do Estado' },
  { value: '5932', label: '5932 - Prestação de serviço de transporte - Subcontratação' },
  { value: '6932', label: '6932 - Prestação de serviço de transporte - Subcontratação fora do Estado' }
]

const FINALIDADE_OPTIONS = [
  { value: '0', label: '0 - CT-e de Complemento de Valores' },
  { value: '1', label: '1 - CT-e de Complemento de Valores' },
  { value: '2', label: '2 - CT-e de Anulação' },
  { value: '3', label: '3 - CT-e Substituto' }
]

const TIPO_SERVICO_OPTIONS = [
  { value: '0', label: '0 - Normal' },
  { value: '1', label: '1 - Subcontratação' },
  { value: '2', label: '2 - Redespacho' },
  { value: '3', label: '3 - Redespacho Intermediário' },
  { value: '4', label: '4 - Serviço Vinculado a Multimodal' }
]

interface Estado {
  id: string;
  name: string;
  uf: string;
}

export default function CTe() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDocumento, setSelectedDocumento] = useState<CTeDocumento | null>(null)
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'emitido' | 'cancelado'>('todos')
  const [activeTab, setActiveTab] = useState('dados-cte')

  // Estados para pesquisa de cidades
  const [inicioSearchTerm, setInicioSearchTerm] = useState('')
  const [terminoSearchTerm, setTerminoSearchTerm] = useState('')
  const [inicioResults, setInicioResults] = useState<Cidade[]>([])
  const [terminoResults, setTerminoResults] = useState<Cidade[]>([])
  const [selectedInicio, setSelectedInicio] = useState<{codigo: string, nome: string, uf: string} | null>(null)
  const [selectedTermino, setSelectedTermino] = useState<{codigo: string, nome: string, uf: string} | null>(null)
  const [showInicioResults, setShowInicioResults] = useState(false)
  const [showTerminoResults, setShowTerminoResults] = useState(false)

  // Estados para validação de chaves de acesso
  const [chaveErrors, setChaveErrors] = useState<{[key: string]: string}>({})

  // Função para validar chave de acesso em tempo real
  const validateChaveAcesso = (value: string, fieldName: string) => {
    const chaveNumerica = value.replace(/\D/g, '')
    const newErrors = { ...chaveErrors }

    if (chaveNumerica.length === 0) {
      delete newErrors[fieldName]
    } else if (chaveNumerica.length !== 44) {
      newErrors[fieldName] = 'Chave deve ter exatamente 44 dígitos'
    } else if (!validarChaveAcesso(chaveNumerica)) {
      newErrors[fieldName] = 'Chave de acesso inválida - dígito verificador incorreto'
    } else {
      delete newErrors[fieldName]
    }

    setChaveErrors(newErrors)
  }

  const queryClient = useQueryClient()

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['cte-documentos'],
    queryFn: getCTeDocumentos,
    retry: 3,
    staleTime: 1000 * 60 * 5
  })

  const { data: empresas } = useQuery({
    queryKey: ['empresas-fiscais'],
    queryFn: getEmpresasFiscais
  })

  // Query para buscar clientes
  const { data: clientes } = useQuery({
    queryKey: ['clientes-ativos'],
    queryFn: getClientesAtivos
  })

  // Query para buscar produtos CT-e
  const { data: produtos } = useQuery({
    queryKey: ['produtos-cte'],
    queryFn: getProdutosCTe
  })

  // Query para buscar associações de frota ativas
  const { data: associacoesFrota, isLoading: isLoadingAssociacoes, error: errorAssociacoes } = useQuery({
    queryKey: ['associacoes-frota-ativas'],
    queryFn: getAssociacoesAtivasParaCTe,
    retry: 2,
    staleTime: 1000 * 60 * 5,
  })

  // Query para buscar estados
  const { data: estados } = useQuery({
    queryKey: ['estados'],
    queryFn: async (): Promise<Estado[]> => {
      const response = await fetch('/api/estados')
      if (!response.ok) throw new Error('Erro ao buscar estados')
      return response.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: createCTeDocumento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cte-documentos'] })
      queryClient.invalidateQueries({ queryKey: ['empresas-fiscais'] })
      toast.success('Documento CT-e criado com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error creating CT-e:', error)
      toast.error(error.message || 'Erro ao criar documento CT-e')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CTeDocumentoCreate> }) =>
      updateCTeDocumento(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cte-documentos'] })
      toast.success('Documento CT-e atualizado com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error updating CT-e:', error)
      toast.error(error.message || 'Erro ao atualizar documento CT-e')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCTeDocumento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cte-documentos'] })
      toast.success('Documento CT-e excluído com sucesso!')
    },
    onError: (error: any) => {
      console.error('Error deleting CT-e:', error)
      toast.error(error.message || 'Erro ao excluir documento CT-e')
    }
  })

  const resetForm = () => {
    setSelectedDocumento(null)
    setActiveTab('dados-cte')
    setInicioSearchTerm('')
    setTerminoSearchTerm('')
    setInicioResults([])
    setTerminoResults([])
    setSelectedInicio(null)
    setSelectedTermino(null)
    setShowInicioResults(false)
    setShowTerminoResults(false)
    setChaveErrors({})
  }

  // useEffect para carregar RNTRC inicial e quando empresas carregam
  React.useEffect(() => {
    if (!isModalOpen) return

    const updateRNTRC = () => {
      const rntrcInput = document.getElementById('rntrc_display') as HTMLInputElement
      if (!rntrcInput) {
        console.log('❌ Input RNTRC não encontrado no DOM')
        return
      }

      if (selectedDocumento && empresas) {
        const empresa = empresas.find(emp => emp.id === selectedDocumento.empresa_id)
        if (empresa) {
          rntrcInput.value = empresa.rntrc || 'RNTRC não informado'
          console.log('✅ RNTRC carregado para documento:', empresa.rntrc)
        }
      } else if (!selectedDocumento) {
        rntrcInput.value = 'Selecione uma empresa para exibir o RNTRC'
        console.log('⚠️ Nenhum documento selecionado, campo RNTRC resetado')
      }
    }

    // Tentar com múltiplos delays para garantir que o DOM seja renderizado
    const timeouts = [0, 100, 300, 500]
    timeouts.forEach(delay => {
      setTimeout(updateRNTRC, delay)
    })
    
    return () => {
      // Limpar timeouts se o componente desmontar
    }
  }, [selectedDocumento, empresas, isModalOpen])

  // Função para calcular impostos e valores totais
  const calcularImpostos = () => {
    const valorPrestacaoInput = document.getElementById('valor_prestacao') as HTMLInputElement
    const valorTributosInput = document.getElementById('valor_tributos') as HTMLInputElement
    const valorReceberInput = document.getElementById('valor_receber') as HTMLInputElement
    const icmsValorInput = document.getElementById('icms_valor') as HTMLInputElement
    const icmsBcInput = document.getElementById('icms_bc_valor') as HTMLInputElement

    if (!valorPrestacaoInput || !valorTributosInput || !valorReceberInput || !icmsValorInput || !icmsBcInput) return

    const valorICMS = parseFloat(icmsValorInput.value) || 0
    const valorTotalComICMS = parseFloat(icmsBcInput.value) || 0

    // Valor Total da Prestação = Valor total já calculado com ICMS
    const valorTotalPrestacao = valorTotalComICMS

    // Atualizar campos
    valorPrestacaoInput.value = valorTotalPrestacao.toFixed(2)
    valorTributosInput.value = valorICMS.toFixed(2)
    valorReceberInput.value = valorTotalPrestacao.toFixed(2) // Valor a receber = valor total
  }

  // Função para atualizar placas baseado no motorista selecionado
  const handleMotoristaChange = (associacaoId: string) => {
    console.log('🚚 Motorista selecionado:', associacaoId)
    console.log('📋 Associações disponíveis:', associacoesFrota)
    
    const placaVeiculoInput = document.getElementById('placa_veiculo') as HTMLInputElement
    const placaReboqueInput = document.getElementById('placa_reboque') as HTMLInputElement
    const infoMotorista = document.getElementById('info-motorista')
    const motoristaNome = document.getElementById('motorista-nome')
    const motoristaCnh = document.getElementById('motorista-cnh')
    const motoristaValidadeCnh = document.getElementById('motorista-validade-cnh')
    const motoristaMatricula = document.getElementById('motorista-matricula')

    if (!placaVeiculoInput || !placaReboqueInput) {
      console.log('❌ Inputs de placa não encontrados')
      return
    }

    if (!associacaoId) {
      placaVeiculoInput.value = ''
      placaReboqueInput.value = ''
      if (infoMotorista) infoMotorista.classList.add('hidden')
      return
    }

    const associacao = associacoesFrota?.find(a => a.id === associacaoId)
    console.log('🔍 Associação encontrada:', associacao)
    
    if (!associacao) {
      console.log('❌ Associação não encontrada para ID:', associacaoId)
      return
    }

    // Definir placa do veículo principal - usar dados diretos da associação
    const placaPrincipal = associacao.veiculo_principal?.placa || 'Placa não informada'
    placaVeiculoInput.value = placaPrincipal
    console.log('🚛 Placa principal definida:', placaPrincipal)

    // Definir placa do reboque (combinando reboque1 e reboque2 se existirem, ou implemento)
    let placaReboque = ''
    if (associacao.veiculo_implemento?.placa) {
      placaReboque = associacao.veiculo_implemento.placa
    } else {
      const placas = []
      if (associacao.veiculo_reboque1?.placa) placas.push(associacao.veiculo_reboque1.placa)
      if (associacao.veiculo_reboque2?.placa) placas.push(associacao.veiculo_reboque2.placa)
      placaReboque = placas.join(' + ')
    }
    placaReboqueInput.value = placaReboque || 'Nenhum reboque/implemento'
    console.log('🚛 Placa reboque/implemento definida:', placaReboque)

    // Mostrar informações do motorista - usar dados diretos da associação
    const nomeMotorista = associacao.funcionario?.nome || 'Nome não informado'
    const cnhMotorista = associacao.funcionario?.cnh || 'CNH não informada'
    const matriculaMotorista = associacao.funcionario?.matricula || 'Matrícula não informada'
    
    if (motoristaNome) motoristaNome.textContent = nomeMotorista
    if (motoristaCnh) motoristaCnh.textContent = cnhMotorista
    if (motoristaMatricula) motoristaMatricula.textContent = matriculaMotorista
    
    if (motoristaValidadeCnh) {
      const validadeCnh = associacao.funcionario?.validade_cnh
      const validadeTexto = validadeCnh ? format(parseISO(validadeCnh), 'dd/MM/yyyy') : 'Não informado'
      motoristaValidadeCnh.textContent = validadeTexto
    }
    
    console.log('👨‍💼 Informações do motorista definidas:', {
      nome: nomeMotorista,
      cnh: cnhMotorista,
      matricula: matriculaMotorista
    })
    
    if (infoMotorista) infoMotorista.classList.remove('hidden')
  }

  // Função para lidar com mudança na situação tributária
  const handleSituacaoTributariaChange = (situacao: string) => {
    const icmsBcInput = document.getElementById('icms_bc_valor') as HTMLInputElement
    const icmsAliquotaInput = document.getElementById('icms_aliquota') as HTMLInputElement
    const icmsValorInput = document.getElementById('icms_valor') as HTMLInputElement
    const valorPrestacaoInput = document.getElementById('valor_prestacao') as HTMLInputElement
    const valorReceberInput = document.getElementById('valor_receber') as HTMLInputElement
    const valorTributosInput = document.getElementById('valor_tributos') as HTMLInputElement
    const icmsIsencaoInfo = document.getElementById('icms-isencao-info')
    const valorPrestacaoDesc = document.getElementById('valor_prestacao_desc')
    const valorReceberDesc = document.getElementById('valor_receber_desc')

    if (!icmsBcInput || !icmsAliquotaInput || !icmsValorInput || !valorPrestacaoInput || !valorReceberInput || !valorTributosInput || !icmsIsencaoInfo) return

    if (situacao === '40') { // ICMS Isenção
      // Zerar campos ICMS
      icmsBcInput.value = '0.00'
      icmsBcInput.disabled = true
      icmsAliquotaInput.value = '0.00'
      icmsAliquotaInput.disabled = true
      icmsValorInput.value = '0.00'

      // Zerar campo de tributos
      valorTributosInput.value = '0.00'

      // Liberar campos de valor para edição manual
      valorPrestacaoInput.readOnly = false
      valorPrestacaoInput.classList.remove('bg-gray-50')
      valorPrestacaoInput.classList.add('bg-white')

      valorReceberInput.readOnly = false
      valorReceberInput.classList.remove('bg-gray-50')
      valorReceberInput.classList.add('bg-white')

      // Limpar descrições dos campos de valor
      if (valorPrestacaoDesc) valorPrestacaoDesc.textContent = ''
      if (valorReceberDesc) valorReceberDesc.textContent = ''

      // Mostrar informação sobre isenção
      icmsIsencaoInfo.classList.remove('hidden')
    } else {
      // Habilitar campos ICMS
      icmsBcInput.disabled = false
      icmsAliquotaInput.disabled = false

      // Tornar campos de valor total somente leitura (calculados automaticamente)
      valorPrestacaoInput.readOnly = true
      valorPrestacaoInput.classList.add('bg-gray-50')
      valorPrestacaoInput.classList.remove('bg-white')

      valorReceberInput.readOnly = true
      valorReceberInput.classList.add('bg-gray-50')
      valorReceberInput.classList.remove('bg-white')

      // Restaurar descrições dos campos de valor
      if (valorPrestacaoDesc) valorPrestacaoDesc.textContent = 'Calculado automaticamente (Base + ICMS)'
      if (valorReceberDesc) valorReceberDesc.textContent = 'Valor total a receber (Base + ICMS)'

      // Esconder informação sobre isenção
      icmsIsencaoInfo.classList.add('hidden')

      // Para tributação normal (00) e Simples Nacional (90), recalcular
      if (situacao === '00' || situacao === '90') {
        recalcularICMS()
      }
    }
  }

  // Função para recalcular ICMS
  const recalcularICMS = () => {
    const icmsBcInput = document.getElementById('icms_bc_valor') as HTMLInputElement
    const icmsAliquotaInput = document.getElementById('icms_aliquota') as HTMLInputElement
    const icmsValorInput = document.getElementById('icms_valor') as HTMLInputElement

    if (!icmsBcInput || !icmsAliquotaInput || !icmsValorInput) return

    const valorBase = parseFloat(icmsBcInput.value) || 0
    const aliquotaDecimal = (parseFloat(icmsAliquotaInput.value) || 0) / 100

    if (valorBase > 0 && aliquotaDecimal > 0) {
      // Fórmula: Valor Base / (1 - Alíquota ICMS)
      const valorTotalComICMS = valorBase / (1 - aliquotaDecimal)
      const valorICMS = valorTotalComICMS - valorBase

      // Atualizar o valor do ICMS
      icmsValorInput.value = valorICMS.toFixed(2)

      // Atualizar a base de cálculo para o valor total com ICMS
      icmsBcInput.value = valorTotalComICMS.toFixed(2)
    } else {
      icmsValorInput.value = '0.00'
    }

    // Recalcular valores totais após atualizar o ICMS
    calcularImpostos()
  }

  // Buscar cidades para início da prestação
  const searchInicioCity = async (term: string) => {
    if (term.length < 2) {
      setInicioResults([])
      return
    }

    try {
      const cities = await getCidadesPorNome(term)
      setInicioResults(cities)
    } catch (error) {
      console.error('Erro ao buscar cidades:', error)
      setInicioResults([])
    }
  }

  // Buscar cidades para término da prestação
  const searchTerminoCity = async (term: string) => {
    if (term.length < 2) {
      setTerminoResults([])
      return
    }

    try {
      const cities = await getCidadesPorNome(term)
      setTerminoResults(cities)
    } catch (error) {
      console.error('Erro ao buscar cidades:', error)
      setTerminoResults([])
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const documentoData: CTeDocumentoCreate = {
      empresa_id: formData.get('empresa_id') as string,
      numero_cte: formData.get('numero_cte') as string,
      serie: formData.get('serie') as string,
      data_emissao: formData.get('data_emissao') as string,
      codigo_uf: formData.get('codigo_uf') as string,
      forma_emissao: parseInt(formData.get('forma_emissao') as string) || 1,
      status: formData.get('status') as 'pendente' | 'emitido' | 'cancelado',
      observacoes: formData.get('observacoes') as string || null,
      tomador_id: formData.get('tomador_id') as string || null,
      remetente_id: formData.get('remetente_id') as string || null,
      recebedor_id: formData.get('recebedor_id') as string || null,
      destinatario_id: formData.get('destinatario_id') as string || null,
      // Campos de serviços e impostos
      valor_prestacao: parseFloat(formData.get('valor_prestacao') as string) || null,
      valor_receber: parseFloat(formData.get('valor_receber') as string) || null,
      valor_tributos: parseFloat(formData.get('valor_tributos') as string) || null,
      icms_situacao_tributaria: formData.get('icms_situacao_tributaria') as string || null,
      icms_bc_valor: parseFloat(formData.get('icms_bc_valor') as string) || null,
      icms_aliquota: parseFloat(formData.get('icms_aliquota') as string) || null,
      icms_valor: parseFloat(formData.get('icms_valor') as string) || null,
      // Campos de dados fiscais
      valor_carga: parseFloat(formData.get('valor_carga') as string) || null,
      quantidade_carga: parseFloat(formData.get('quantidade_carga') as string) || null,
      produto_predominante_id: formData.get('produto_predominante_id') as string || null,
      chave_acesso_1: formData.get('chave_acesso_1') as string || null,
      chave_acesso_2: formData.get('chave_acesso_2') as string || null,
      chave_acesso_3: formData.get('chave_acesso_3') as string || null,
      chave_acesso_4: formData.get('chave_acesso_4') as string || null
    }

    if (selectedDocumento) {
      updateMutation.mutate({ id: selectedDocumento.id, data: documentoData })
    } else {
      createMutation.mutate(documentoData)
    }
  }

  const handleEdit = (documento: CTeDocumento) => {
    setSelectedDocumento(documento)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este documento CT-e?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleViewPDF = (documento: CTeDocumento) => {
    if (documento.pdf_path && documento.pdf_gerado) {
      window.open(documento.pdf_path, '_blank')
    } else {
      toast.error('PDF não disponível para este documento')
    }
  }

  const handleCopyChaveAcesso = (chave: string) => {
    navigator.clipboard.writeText(chave)
    toast.success('Chave de acesso copiada!')
  }

  const handleGenerateFiles = async (documento: CTeDocumento) => {
    try {
      toast.success('Gerando arquivos XML e PDF...')

      await updateDocumentFiles('cte', documento.id, {
        xmlGerado: true,
        pdfGerado: true
      })

      queryClient.invalidateQueries({ queryKey: ['cte-documentos'] })

      toast.success('Arquivos gerados com sucesso!')
    } catch (error: any) {
      console.error('Error generating files:', error)
      toast.error('Erro ao gerar arquivos')
    }
  }

  const tabs = [
    { id: 'dados-cte', label: 'Dados CT-e' },
    { id: 'tomador', label: 'Tomador' },
    { id: 'remetente', label: 'Remetente' },
    { id: 'recebedor', label: 'Recebedor' },
    { id: 'destinatario', label: 'Destinatário' },
    { id: 'servicos-impostos', label: 'Serviços e Impostos' },
    { id: 'dados-fiscais', label: 'Dados Fiscais' },
    { id: 'dados-transporte', label: 'Dados Transporte' },
    { id: 'observacoes', label: 'Observações' }
  ]

  const filteredDocumentos = filterStatus === 'todos'
    ? documentos
    : documentos?.filter(d => d.status === filterStatus)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-indigo-600 mr-3" />
            <h1 className="text-2xl font-semibold text-gray-900">Documentos CT-e</h1>
          </div>
          <button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Novo CT-e
          </button>
        </div>

        {/* Filtros */}
        <div className="mt-6 bg-white shadow rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filtrar por status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="todos">Todos</option>
              <option value="pendente">Pendes</option>
              <option value="emitido">Emitidos</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Número/Série
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Empresa
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Chave de Acesso
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Data Emissão
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Arquivos
                      </th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredDocumentos?.map((documento) => (
                      <tr key={documento.id}>
                        <td className="px-3 py-4 text-sm">
                          <div>
                            <div className="font-mono font-medium text-gray-900">
                              {documento.numero_cte.padStart(9, '0')}
                            </div>
                            <div className="text-xs text-gray-500">
                              Série: {documento.serie} • UF: {getUFFromCode(documento.codigo_uf)} • Forma: {documento.forma_emissao === 1 ? 'Normal' : 'Contingência'}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <div>
                            <div className="font-medium">{documento.empresa?.razao_social}</div>
                            <div className="text-xs text-gray-400 font-mono">{formatCNPJ(documento.empresa?.cnpj || '')}</div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm">
                          {documento.chave_acesso ? (
                            <div className="group">
                              <button
                                onClick={() => handleCopyChaveAcesso(documento.chave_acesso!)}
                                className="font-mono text-xs text-gray-600 hover:text-indigo-600 cursor-pointer break-all"
                                title="Clique para copiar"
                              >
                                {formatChaveAcesso(documento.chave_acesso)}
                              </button>
                              <div className="text-xs text-gray-400 mt-1">
                                DV: {documento.dv}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Chave não gerada</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {format(parseISO(documento.data_emissao), 'dd/MM/yyyy')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            STATUS_COLORS[documento.status]
                          }`}>
                            {STATUS_LABELS[documento.status]}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                              documento.xml_gerado
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              XML {documento.xml_gerado ? '✓' : '○'}
                            </span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                              documento.pdf_gerado
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              PDF {documento.pdf_gerado ? '✓' : '○'}
                            </span>
                          </div>
                          {documento.xml_gerado && documento.xml_gerado_em && (
                            <div className="text-xs text-gray-400 mt-1">
                              {format(parseISO(documento.xml_gerado_em), 'dd/MM HH:mm')}
                            </div>
                          )}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          {documento.pdf_gerado && documento.pdf_path && (
                            <button
                              onClick={() => handleViewPDF(documento)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                              title="Visualizar PDF"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleGenerateFiles(documento)}
                            className="text-green-600 hover:text-green-900 mr-4"
                            title="Gerar arquivos"
                          >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(documento)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(documento.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full p-6 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">
                {selectedDocumento ? 'Editar Documento CT-e' : 'Novo Documento CT-e'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Navegação por Abas */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Aba Dados CT-e */}
              {activeTab === 'dados-cte' && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="empresa_id" className="block text-sm font-medium text-gray-700">
                      Empresa Emitente *
                    </label>
                    <select
                      name="empresa_id"
                      id="empresa_id"
                      defaultValue={selectedDocumento?.empresa_id}
                      required
                      onChange={(e) => {
                        const empresaId = e.target.value
                        console.log('🏢 Empresa selecionada:', empresaId)
                        
                        const updateRNTRCField = () => {
                          const empresa = empresas?.find(emp => emp.id === empresaId)
                          const rntrcInput = document.getElementById('rntrc_display') as HTMLInputElement
                          
                          console.log('🏢 Empresa encontrada:', empresa)
                          console.log('🏢 RNTRC da empresa:', empresa?.rntrc)
                          
                          if (rntrcInput) {
                            if (empresa?.rntrc) {
                              rntrcInput.value = empresa.rntrc
                              console.log('✅ RNTRC atualizado:', empresa.rntrc)
                            } else if (empresaId) {
                              rntrcInput.value = 'RNTRC não informado'
                              console.log('⚠️ RNTRC não encontrado para esta empresa')
                            } else {
                              rntrcInput.value = 'Selecione uma empresa para exibir o RNTRC'
                            }
                          } else {
                            console.log('❌ Input RNTRC não encontrado')
                          }
                        }
                        
                        // Executar imediatamente e com delay
                        updateRNTRCField()
                        setTimeout(updateRNTRCField, 100)
                        setTimeout(updateRNTRCField, 300)
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Selecione uma empresa</option>
                      {empresas?.filter(e => e.status === 'ativo').map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.razao_social} - {formatCNPJ(empresa.cnpj)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                      <label htmlFor="numero_cte" className="block text-sm font-medium text-gray-700">
                        Número CT-e
                      </label>
                      <input
                        type="text"
                        name="numero_cte"
                        id="numero_cte"
                        defaultValue={selectedDocumento?.numero_cte}
                        placeholder="AUTO"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Deixe vazio ou "AUTO" para numeração automática
                      </p>
                    </div>

                    <div>
                      <label htmlFor="serie" className="block text-sm font-medium text-gray-700">
                        Série
                      </label>
                      <input
                        type="text"
                        name="serie"
                        id="serie"
                        defaultValue={selectedDocumento?.serie}
                        placeholder="Série padrão"
                        maxLength={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Deixe vazio para usar série padrão da empresa
                      </p>
                    </div>

                    <div>
                      <label htmlFor="forma_emissao" className="block text-sm font-medium text-gray-700">
                        Forma Emissão
                      </label>
                      <select
                        name="forma_emissao"
                        id="forma_emissao"
                        defaultValue={selectedDocumento?.forma_emissao || 1}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value={1}>1 - Normal</option>
                        <option value={8}>8 - Contingência</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="data_emissao" className="block text-sm font-medium text-gray-700">
                        Data de Emissão *
                      </label>
                      <input
                        type="date"
                        name="data_emissao"
                        id="data_emissao"
                        defaultValue={selectedDocumento?.data_emissao.split('T')[0] || format(new Date(), 'yyyy-MM-dd')}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="hora_emissao" className="block text-sm font-medium text-gray-700">
                        Hora de Emissão
                      </label>
                      <input
                        type="time"
                        name="hora_emissao"
                        id="hora_emissao"
                        defaultValue="12:00"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                      <label htmlFor="tipo_servico" className="block text-sm font-medium text-gray-700">
                        Tipo do Serviço
                      </label>
                      <select
                        name="tipo_servico"
                        id="tipo_servico"
                        defaultValue="0"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        {TIPO_SERVICO_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="finalidade_cte" className="block text-sm font-medium text-gray-700">
                        Finalidade CT-e
                      </label>
                      <select
                        name="finalidade_cte"
                        id="finalidade_cte"
                        defaultValue="0"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        {FINALIDADE_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="cfop" className="block text-sm font-medium text-gray-700">
                        CFOP
                      </label>
                      <select
                        name="cfop"
                        id="cfop"
                        defaultValue="5352"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        {CFOP_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Local de Início da Prestação */}
                  <div>
                    <label htmlFor="local_inicio" className="block text-sm font-medium text-gray-700">
                      Local de Início da Prestação *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="local_inicio"
                        id="local_inicio"
                        value={selectedInicio ? `${selectedInicio.nome}/${selectedInicio.uf}` : inicioSearchTerm}
                        onChange={(e) => {
                          const value = e.target.value
                          setInicioSearchTerm(value)
                          if (selectedInicio) setSelectedInicio(null)
                          searchInicioCity(value)
                          setShowInicioResults(true)
                        }}
                        onFocus={() => setShowInicioResults(true)}
                        placeholder="Digite o nome da cidade..."
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <input
                        type="hidden"
                        name="cidade_inicio_ibge"
                        value={selectedInicio?.codigo || ''}
                      />

                      {showInicioResults && inicioResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
                          {inicioResults.map((cidade) => (
                            <div
                              key={cidade.cod_city}
                              onClick={() => {
                                setSelectedInicio({
                                  codigo: cidade.cod_city,
                                  nome: cidade.name,
                                  uf: cidade.uf || ''
                                })
                                setInicioSearchTerm('')
                                setShowInicioResults(false)
                              }}
                              className="cursor-pointer hover:bg-gray-100 px-4 py-2 flex justify-between items-center"
                            >
                              <span>{cidade.name}/{cidade.uf || ''}</span>
                              <span className="text-xs text-gray-500 font-mono">
                                {cidade.cod_city}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Local de Término da Prestação */}
                  <div>
                    <label htmlFor="local_termino" className="block text-sm font-medium text-gray-700">
                      Local de Término da Prestação *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="local_termino"
                        id="local_termino"
                        value={selectedTermino ? `${selectedTermino.nome}/${selectedTermino.uf}` : terminoSearchTerm}
                        onChange={(e) => {
                          const value = e.target.value
                          setTerminoSearchTerm(value)
                          if (selectedTermino) setSelectedTermino(null)
                          searchTerminoCity(value)
                          setShowTerminoResults(true)
                        }}
                        onFocus={() => setShowTerminoResults(true)}
                        placeholder="Digite o nome da cidade..."
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <input
                        type="hidden"
                        name="cidade_termino_ibge"
                        value={selectedTermino?.codigo || ''}
                      />

                      {showTerminoResults && terminoResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
                          {terminoResults.map((cidade) => (
                            <div
                              key={cidade.cod_city}
                              onClick={() => {
                                setSelectedTermino({
                                  codigo: cidade.cod_city,
                                  nome: cidade.name,
                                  uf: cidade.uf || ''
                                })
                                setTerminoSearchTerm('')
                                setShowTerminoResults(false)
                              }}
                              className="cursor-pointer hover:bg-gray-100 px-4 py-2 flex justify-between items-center"
                            >
                              <span>{cidade.name}/{cidade.uf || ''}</span>
                              <span className="text-xs text-gray-500 font-mono">
                                {cidade.cod_city}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      name="status"
                      id="status"
                      defaultValue={selectedDocumento?.status || 'pendente'}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="emitido">Emitido</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Aba Tomador */}
              {activeTab === 'tomador' && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="tomador_id" className="block text-sm font-medium text-gray-700">
                      Tomador do Serviço *
                    </label>
                    <select
                      name="tomador_id"
                      id="tomador_id"
                      defaultValue={selectedDocumento?.tomador_id || ''}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Selecione o tomador</option>
                      <option value="remetente">🚚 Remetente</option>
                      <option value="destinatario">📦 Destinatário</option>
                      {clientes?.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.razao_social} - {cliente.cidade}/{cliente.estado}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">ℹ️ Informação sobre Tomador</h4>
                    <p className="text-sm text-blue-700">
                      O tomador é quem contrata e paga pelo serviço de transporte. Pode ser o remetente,
                      destinatário ou um terceiro (cliente cadastrado).
                    </p>
                  </div>
                </div>
              )}

              {/* Aba Remetente */}
              {activeTab === 'remetente' && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="remetente_id" className="block text-sm font-medium text-gray-700">
                      Remetente *
                    </label>
                    <select
                      name="remetente_id"
                      id="remetente_id"
                      defaultValue={selectedDocumento?.remetente_id || ''}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Selecione o remetente</option>
                      {clientes?.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.razao_social} - {cliente.cidade}/{cliente.estado}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-green-900 mb-2">🚚 Informação sobre Remetente</h4>
                    <p className="text-sm text-green-700">
                      O remetente é quem entrega a mercadoria para transporte. É o ponto de origem da carga.
                    </p>
                  </div>
                </div>
              )}

              {/* Aba Recebedor */}
              {activeTab === 'recebedor' && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="recebedor_id" className="block text-sm font-medium text-gray-700">
                      Recebedor
                    </label>
                    <select
                      name="recebedor_id"
                      id="recebedor_id"
                      defaultValue={selectedDocumento?.recebedor_id || ''}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">❌ Sem Recebedor</option>
                      {clientes?.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.razao_social} - {cliente.cidade}/{cliente.estado}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-yellow-900 mb-2">⚠️ Informação sobre Recebedor</h4>
                    <p className="text-sm text-yellow-700">
                      O recebedor é opcional e representa quem efetivamente recebe a mercadoria,
                      quando for diferente do destinatário. Pode ser deixado como "Sem Recebedor"
                      se o próprio destinatário for receber.
                    </p>
                  </div>
                </div>
              )}

              {/* Aba Destinatário */}
              {activeTab === 'destinatario' && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="destinatario_id" className="block text-sm font-medium text-gray-700">
                      Destinatário *
                    </label>
                    <select
                      name="destinatario_id"
                      id="destinatario_id"
                      defaultValue={selectedDocumento?.destinatario_id || ''}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Selecione o destinatário</option>
                      {clientes?.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.razao_social} - {cliente.cidade}/{cliente.estado}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-purple-900 mb-2">📦 Informação sobre Destinatário</h4>
                    <p className="text-sm text-purple-700">
                      O destinatário é quem deve receber a mercadoria. É o ponto de destino da carga
                      e consta obrigatoriamente no CT-e.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'servicos-impostos' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">💰 Valores do Serviço</h4>
                    <p className="text-sm text-blue-700">
                      Configure os valores da prestação de serviço e tributos aplicáveis.
                    </p>
                  </div>

                  {/* Valores da Prestação */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                      <label htmlFor="valor_prestacao" className="block text-sm font-medium text-gray-700">
                        Valor Total da Prestação de Serviço
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">R$</span>
                        </div>
                        <input
                          type="number"
                          name="valor_prestacao"
                          id="valor_prestacao"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          readOnly
                          className="pl-10 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <p id="valor_prestacao_desc" className="mt-1 text-xs text-gray-500">
                        Calculado automaticamente (Base + ICMS)
                      </p>
                    </div>

                    <div>
                      <label htmlFor="valor_receber" className="block text-sm font-medium text-gray-700">
                        Valor Total a Receber
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">R$</span>
                        </div>
                        <input
                          type="number"
                          name="valor_receber"
                          id="valor_receber"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          readOnly
                          className="pl-10 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <p id="valor_receber_desc" className="mt-1 text-xs text-gray-500">
                        Valor total a receber (Base + ICMS)
                      </p>
                    </div>

                    <div>
                      <label htmlFor="valor_tributos" className="block text-sm font-medium text-gray-700">
                        Valor Total dos Tributos
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">R$</span>
                        </div>
                        <input
                          type="number"
                          name="valor_tributos"
                          id="valor_tributos"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          readOnly
                          className="pl-10 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Calculado automaticamente baseado no ICMS
                      </p>
                    </div>
                  </div>

                  {/* Separador */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">🏛️ ICMS - Imposto sobre Circulação de Mercadorias e Serviços</h4>
                  </div>

                  {/* ICMS */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <div>
                      <label htmlFor="icms_situacao_tributaria" className="block text-sm font-medium text-gray-700">
                        Código da Situação Tributária *
                      </label>
                      <select
                        name="icms_situacao_tributaria"
                        id="icms_situacao_tributaria"
                        required
                        onChange={(e) => {
                          const situacao = e.target.value;
                          handleSituacaoTributariaChange(situacao);
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="">Selecione a situação tributária</option>
                        <option value="00">00 - Tributação Normal do ICMS</option>
                        <option value="40">40 - ICMS Isenção</option>
                        <option value="90">90 - Simples Nacional</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                      <div>
                        <label htmlFor="icms_bc_valor" className="block text-sm font-medium text-gray-700">
                          Valor da BC do ICMS
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">R$</span>
                          </div>
                          <input
                            type="number"
                            name="icms_bc_valor"
                            id="icms_bc_valor"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            onBlur={recalcularICMS}
                            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Valor do serviço SEM ICMS (será recalculado automaticamente)
                        </p>
                      </div>

                      <div>
                        <label htmlFor="icms_aliquota" className="block text-sm font-medium text-gray-700">
                          Alíquota do ICMS (%)
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="number"
                            name="icms_aliquota"
                            id="icms_aliquota"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0,00"
                            onBlur={recalcularICMS}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">%</span>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Percentual de ICMS aplicável
                        </p>
                      </div>

                      <div>
                        <label htmlFor="icms_valor" className="block text-sm font-medium text-gray-700">
                          Valor do ICMS
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">R$</span>
                          </div>
                          <input
                            type="number"
                            name="icms_valor"
                            id="icms_valor"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            readOnly
                            className="pl-10 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Calculado automaticamente (BC × Alíquota)
                        </p>
                      </div>
                    </div>

                    {/* Botão Calcular ICMS */}
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={recalcularICMS}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        🧮 Calcular ICMS
                      </button>
                    </div>

                    {/* Informações sobre ICMS Isenção */}
                    <div id="icms-isencao-info" className="hidden bg-yellow-50 p-3 rounded-md">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            ICMS Isenção Selecionado
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>Com ICMS Isenção, não há cobrança de imposto. Os campos de base de cálculo, alíquota e valor serão zerados automaticamente.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'dados-fiscais' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">📋 Dados Fiscais da Carga</h4>
                    <p className="text-sm text-blue-700">
                      Informações sobre a carga transportada e chaves de acesso dos documentos relacionados.
                    </p>
                  </div>

                  {/* Dados da Carga */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">🚚 Dados da Carga</h4>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="valor_carga" className="block text-sm font-medium text-gray-700">
                          Valor da Carga
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">R$</span>
                          </div>
                          <input
                            type="number"
                            name="valor_carga"
                            id="valor_carga"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="quantidade_carga" className="block text-sm font-medium text-gray-700">
                          Quantidade da Carga
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="number"
                            name="quantidade_carga"
                            id="quantidade_carga"
                            step="0.001"
                            min="0"
                            placeholder="0,000"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">Litros</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="produto_predominante_id" className="block text-sm font-medium text-gray-700">
                        Produto Predominante *
                      </label>
                      <select
                        name="produto_predominante_id"
                        id="produto_predominante_id"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="">Selecione o produto predominante</option>
                        {produtos?.map((produto) => (
                          <option key={produto.id} value={produto.id}>
                            {produto.cod_ncm} - {produto.descricao}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Chaves de Acesso de Documentos Relacionados */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">🔑 Chaves de Acesso de Documentos Relacionados</h4>

                    <div className="bg-yellow-50 p-3 rounded-md">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Informação sobre Chaves de Acesso
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>As chaves de acesso devem conter exatamente 44 dígitos numéricos e ter um dígito verificador válido.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="chave_acesso_1" className="block text-sm font-medium text-gray-700">
                          Chave de Acesso 1
                        </label>
                        <input
                          type="text"
                          name="chave_acesso_1"
                          id="chave_acesso_1"
                          maxLength="44"
                          placeholder="Digite apenas números (44 dígitos)"
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '')
                            e.target.value = value
                            validateChaveAcesso(value, 'chave_acesso_1')
                          }}
                          className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm font-mono ${
                            chaveErrors.chave_acesso_1
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-300 focus:border-indigo-500'
                          }`}
                        />
                        {chaveErrors.chave_acesso_1 && (
                          <p className="mt-1 text-xs text-red-600">{chaveErrors.chave_acesso_1}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="chave_acesso_2" className="block text-sm font-medium text-gray-700">
                          Chave de Acesso 2
                        </label>
                        <input
                          type="text"
                          name="chave_acesso_2"
                          id="chave_acesso_2"
                          maxLength="44"
                          placeholder="Digite apenas números (44 dígitos)"
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '')
                            e.target.value = value
                            validateChaveAcesso(value, 'chave_acesso_2')
                          }}
                          className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm font-mono ${
                            chaveErrors.chave_acesso_2
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-300 focus:border-indigo-500'
                          }`}
                        />
                        {chaveErrors.chave_acesso_2 && (
                          <p className="mt-1 text-xs text-red-600">{chaveErrors.chave_acesso_2}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="chave_acesso_3" className="block text-sm font-medium text-gray-700">
                          Chave de Acesso 3
                        </label>
                        <input
                          type="text"
                          name="chave_acesso_3"
                          id="chave_acesso_3"
                          maxLength="44"
                          placeholder="Digite apenas números (44 dígitos)"
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '')
                            e.target.value = value
                            validateChaveAcesso(value, 'chave_acesso_3')
                          }}
                          className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm font-mono ${
                            chaveErrors.chave_acesso_3
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-300 focus:border-indigo-500'
                          }`}
                        />
                        {chaveErrors.chave_acesso_3 && (
                          <p className="mt-1 text-xs text-red-600">{chaveErrors.chave_acesso_3}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="chave_acesso_4" className="block text-sm font-medium text-gray-700">
                          Chave de Acesso 4
                        </label>
                        <input
                          type="text"
                          name="chave_acesso_4"
                          id="chave_acesso_4"
                          maxLength="44"
                          placeholder="Digite apenas números (44 dígitos)"
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '')
                            e.target.value = value
                            validateChaveAcesso(value, 'chave_acesso_4')
                          }}
                          className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm font-mono ${
                            chaveErrors.chave_acesso_4
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-300 focus:border-indigo-500'
                          }`}
                        />
                        {chaveErrors.chave_acesso_4 && (
                          <p className="mt-1 text-xs text-red-600">{chaveErrors.chave_acesso_4}</p>
                        )}
                      </div>
                    </div>

                    {/* Contador de caracteres para as chaves */}
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>💡 <strong>Dica:</strong> Cole as chaves completas de 44 dígitos. O sistema validará automaticamente.</p>
                      <p>✅ Uma chave válida tem formato: 31200614200166000188550010000000012345678901</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'dados-transporte' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">🚛 Dados do Transporte</h4>
                    <p className="text-sm text-blue-700">
                      Informações sobre o transportador, motorista e veículos utilizados no transporte.
                    </p>
                  </div>

                  {/* RNTRC */}
                  <div>
                    <label htmlFor="rntrc_display" className="block text-sm font-medium text-gray-700">
                      RNTRC da Empresa Transportadora
                    </label>
                    <input
                      type="text"
                      name="rntrc_display"
                      id="rntrc_display"
                      readOnly
                      placeholder="Selecione uma empresa para exibir o RNTRC"
                      className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      RNTRC é obtido automaticamente da empresa selecionada
                    </p>
                  </div>

                  {/* Motorista */}
                  <div>
                    <label htmlFor="associacao_frota_id" className="block text-sm font-medium text-gray-700">
                      Motorista (Associação de Frota) *
                    </label>
                    <select
                      name="associacao_frota_id"
                      id="associacao_frota_id"
                      onChange={(e) => handleMotoristaChange(e.target.value)}
                      disabled={isLoadingAssociacoes}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                    >
                      <option value="">
                        {isLoadingAssociacoes ? 'Carregando motoristas...' : 'Selecione um motorista'}
                      </option>
                      {associacoesFrota?.map((associacao) => (
                        <option key={associacao.id} value={associacao.id}>
                          {associacao.funcionario?.nome || 'Nome não informado'} - CNH: {associacao.funcionario?.cnh || 'CNH não informada'} - {associacao.veiculo_principal?.placa || 'Placa não informada'}
                          {associacao.veiculo_implemento?.placa && ` + ${associacao.veiculo_implemento.placa}`}
                          {associacao.veiculo_reboque1?.placa && ` + ${associacao.veiculo_reboque1.placa}`}
                          {associacao.veiculo_reboque2?.placa && ` + ${associacao.veiculo_reboque2.placa}`}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {isLoadingAssociacoes ? 'Carregando...' : 'Lista apenas motoristas com associações ativas de frota'}
                      {errorAssociacoes && (
                        <span className="text-red-600 ml-2">
                          ⚠️ Erro ao carregar dados
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Placas do Veículo e Reboque */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="placa_veiculo" className="block text-sm font-medium text-gray-700">
                        Placa do Veículo Principal
                      </label>
                      <input
                        type="text"
                        name="placa_veiculo"
                        id="placa_veiculo"
                        readOnly
                        placeholder="Será preenchido automaticamente"
                        className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono text-center"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Placa do caminhão principal
                      </p>
                    </div>

                    <div>
                      <label htmlFor="placa_reboque" className="block text-sm font-medium text-gray-700">
                        Placa(s) do(s) Reboque(s)/Implemento(s)
                      </label>
                      <input
                        type="text"
                        name="placa_reboque"
                        id="placa_reboque"
                        readOnly
                        placeholder="Será preenchido automaticamente"
                        className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono text-center"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Implementos, reboques ou vanderleia associados
                      </p>
                    </div>
                  </div>

                  {/* Informações do Motorista Selecionado */}
                  <div id="info-motorista" className="hidden bg-gray-50 p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">👨‍💼 Informações do Motorista</h5>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Nome:</span>
                        <span id="motorista-nome" className="ml-2 text-gray-600"></span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">CNH:</span>
                        <span id="motorista-cnh" className="ml-2 text-gray-600 font-mono"></span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Validade CNH:</span>
                        <span id="motorista-validade-cnh" className="ml-2 text-gray-600"></span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Matrícula:</span>
                        <span id="motorista-matricula" className="ml-2 text-gray-600"></span>
                      </div>
                    </div>
                  </div>

                  {/* Aviso quando não há associações */}
                  {!associacoesFrota || associacoesFrota.length === 0 && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Nenhuma Associação de Frota Ativa
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>Não há motoristas com associações ativas de frota. Para usar esta funcionalidade, é necessário primeiro criar associações entre motoristas e veículos no módulo "Associações de Frota".</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'observacoes' && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700">
                      Observações
                    </label>
                    <textarea
                      name="observacoes"
                      id="observacoes"
                      rows={6}
                      defaultValue={selectedDocumento?.observacoes || ''}
                      placeholder="Observações sobre o documento CT-e..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Informações da Chave de Acesso */}
              {selectedDocumento?.chave_acesso && activeTab === 'dados-cte' && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Informações da Chave de Acesso</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-medium">Chave Completa:</span>
                      <div className="font-mono mt-1 break-all">{selectedDocumento.chave_acesso}</div>
                    </div>
                    <div>
                      <span className="font-medium">Arquivos Gerados:</span>
                      <div className="mt-1 space-y-1">
                        {selectedDocumento.xml_proc_path && (
                          <div className="font-mono text-gray-600">{selectedDocumento.xml_proc_path.split('/').pop()}</div>
                        )}
                        {selectedDocumento.xml_path && (
                          <div className="font-mono text-gray-600">{selectedDocumento.xml_path.split('/').pop()}</div>
                        )}
                        {selectedDocumento.pdf_path && (
                          <div className="font-mono text-gray-600">{selectedDocumento.pdf_path.split('/').pop()}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="flex space-x-3">
                  {activeTab !== 'dados-cte' && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
                        if (currentIndex > 0) {
                          setActiveTab(tabs[currentIndex - 1].id)
                        }
                      }}
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                  )}

                  {activeTab !== 'observacoes' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
                        if (currentIndex < tabs.length - 1) {
                          setActiveTab(tabs[currentIndex + 1].id)
                        }
                      }}
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                    >
                      Próximo
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      {createMutation.isPending || updateMutation.isPending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {selectedDocumento ? 'Atualizando...' : 'Cadastrando...'}
                        </>
                      ) : (
                        selectedDocumento ? 'Atualizar' : 'Cadastrar'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}