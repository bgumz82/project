import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
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
} from '@heroicons/react/24/outline'
import {
  getCTeDocumentos,
  createCTeDocumento,
  updateCTeDocumento,
  deleteCTeDocumento,
  generateCTeFiles,
  getEmpresasFiscais,
  getClientesAtivos,
  getProdutosCTe,
  getCidadesPorNome,
  validarChaveAcesso,
  formatCNPJ,
  formatChaveAcesso,
  getUFFromCode,
  type CTeDocumento,
  type CTeDocumentoCreate,
  type Cidade,
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
  { value: '0', label: '0 - CT-e Normal' },
  { value: '1', label: '1 - CT-e Complemento de Valores' },
  { value: '3', label: '3 - CT-e Substituição' }
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

// Função auxiliar para executar consultas SQL
async function query(sql: string, params: any[] = []) {
  const response = await fetch('/api/db/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth.token')}`
    },
    body: JSON.stringify({
      query: sql,
      params: params
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Erro na resposta da API (query):', response.status, response.statusText, errorText)
    throw new Error(`Erro ${response.status}: ${response.statusText}`)
  }

  const result = await response.json()
  console.log('📊 Resultado da query:', result)
  return result
}

export default function CTe() {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDocumento, setSelectedDocumento] = useState<CTeDocumento | null>(null)
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'emitido' | 'cancelado'>('todos')
  const [activeTab, setActiveTab] = useState('dados-cte')
  const [isModalRapidoOpen, setIsModalRapidoOpen] = useState(false)

  // Estados para pesquisa de cidades
  const [inicioSearchTerm, setInicioSearchTerm] = useState('')
  const [terminoSearchTerm, setTerminoSearchTerm] = useState('')
  const [inicioResults, setInicioResults] = useState<Cidade[]>([])
  const [terminoResults, setTerminoResults] = useState<Cidade[]>([])
  const [selectedInicio, setSelectedInicio] = useState<{codigo: string, nome: string, uf: string} | null>(null)
  const [selectedTermino, setSelectedTermino] = useState<{codigo: string, nome: string, uf: string} | null>(null)
  const [showInicioResults, setShowInicioResults] = useState(false)
  const [showTerminoResults, setShowTerminoResults] = useState(false)
  const [cidadeInicioNome, setCidadeInicioNome] = useState('')
  const [cidadeTerminoNome, setCidadeTerminoNome] = useState('')
  const [cidadeInicioResults, setCidadeInicioResults] = useState<Cidade[]>([])
  const [cidadeTerminoResults, setCidadeTerminoResults] = useState<Cidade[]>([])


  // Estados para validação de chaves de acesso
  const [chaveErrors, setChaveErrors] = useState<{[key: string]: string}>({})

  // Estados para controlar RNTRC e motorista
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('')
  const [rntrcValue, setRntrcValue] = useState<string>('Selecione uma empresa para exibir o RNTRC')
  const [selectedMotoristaId, setSelectedMotoristaId] = useState<string>('')
  const [placaVeiculo, setPlacaVeiculo] = useState<string>('')
  const [placaReboque, setPlacaReboque] = useState<string>('')
  const [motoristaInfo, setMotoristaInfo] = useState<{
    nome: string
    cnh: string
    matricula: string
    validadeCnh: string
  } | null>(null)

  // Estados para persistir dados do formulário entre abas
  const [formData, setFormData] = useState<{
    tomador_id: string
    remetente_id: string
    recebedor_id: string
    destinatario_id: string
    produto_predominante_id: string
    data_emissao: string
    valor_prestacao: string
    valor_receber: string
    valor_tributos: string
    valor_pedagio: string
    valor_seguro: string
    icms_situacao_tributaria: string
    icms_bc_valor: string
    icms_aliquota: string
    icms_valor: string
    valor_carga: string
    quantidade_carga: string
    chave_acesso_1: string
    chave_acesso_2: string
    chave_acesso_3: string
    chave_acesso_4: string
    observacoes: string
    cidade_inicio_ibge: string
    cidade_termino_ibge: string
    uf_inicio: string
    uf_termino: string
    cidade_inicio_nome: string
    cidade_termino_nome: string
    [key: string]: any
  }>({
    tomador_id: '',
    remetente_id: '',
    recebedor_id: '',
    destinatario_id: '',
    produto_predominante_id: '',
    data_emissao: format(new Date(), 'yyyy-MM-dd'),
    valor_prestacao: '',
    valor_receber: '',
    valor_tributos: '',
    valor_pedagio: '',
    valor_seguro: '',
    icms_situacao_tributaria: '',
    icms_bc_valor: '',
    icms_aliquota: '',
    icms_valor: '',
    valor_carga: '',
    quantidade_carga: '',
    chave_acesso_1: '',
    chave_acesso_2: '',
    chave_acesso_3: '',
    chave_acesso_4: '',
    observacoes: '',
    cidade_inicio_ibge: '',
    cidade_termino_ibge: '',
    uf_inicio: '',
    uf_termino: '',
    cidade_inicio_nome: '',
    cidade_termino_nome: ''
  })

  // Estado para controlar a geração de arquivos
  const [isGeneratingFiles, setIsGeneratingFiles] = useState(false)

  // Estados para formulário CT-e Rápido
  const [formRapido, setFormRapido] = useState({
    empresa_id: '',
    associacao_frota_id: '',
    produto_id: '',
    chave_nfe: '',
    cnpj_destinatario: '',
    valor_nota: '',
    quantidade: '',
    cidade_inicio: '',
    cidade_termino: ''
  })

  // Estados para busca de cidades no formulário rápido
  const [rapidoCidadeInicioNome, setRapidoCidadeInicioNome] = useState('')
  const [rapidoCidadeTerminoNome, setRapidoCidadeTerminoNome] = useState('')
  const [rapidoCidadeInicioResults, setRapidoCidadeInicioResults] = useState<Cidade[]>([])
  const [rapidoCidadeTerminoResults, setRapidoCidadeTerminoResults] = useState<Cidade[]>([])
  const [rapidoSelectedInicio, setRapidoSelectedInicio] = useState<{codigo: string, nome: string, uf: string} | null>(null)
  const [rapidoSelectedTermino, setRapidoSelectedTermino] = useState<{codigo: string, nome: string, uf: string} | null>(null)
  const [rapidoShowInicioResults, setRapidoShowInicioResults] = useState(false)
  const [rapidoShowTerminoResults, setRapidoShowTerminoResults] = useState(false)

  // Estado para desabilitar botão de submit durante a submissão do formulário rápido
  const [isSubmittingRapido, setIsSubmittingRapido] = useState(false)


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

  const { data: documentos, isLoading, refetch } = useQuery({
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
  const { data: associacoesFrota, isLoading: isLoadingAssociacoes, error: associacoesError } = useQuery({
    queryKey: ['associacoes-frota-ativas-cte'],
    queryFn: getAssociacoesAtivasParaCTe,
    retry: 3,
    staleTime: 1000 * 60 * 5,
  })

  React.useEffect(() => {
    if (associacoesFrota) {
      console.log('🎯 Associações carregadas no componente CT-e:', associacoesFrota?.length || 0)
      if (associacoesFrota && associacoesFrota.length > 0) {
        console.log('🎯 Primeira associação no componente:', associacoesFrota[0])
        console.log('🎯 Funcionário da primeira associação:', associacoesFrota[0].funcionario)
        console.log('🎯 Veículo principal da primeira associação:', associacoesFrota[0].veiculo_principal)
        console.log('🎯 Estrutura completa da primeira associação:', JSON.stringify(associacoesFrota[0], null, 2))
      }
    }
  }, [associacoesFrota])

  React.useEffect(() => {
    if (associacoesError) {
      console.error('❌ Erro ao carregar associações no componente:', associacoesError)
    }
  }, [associacoesError])

  // Query para buscar estados
  const { data: estados } = useQuery({
    queryKey: ['estados'],
    queryFn: async (): Promise<Estado[]> => {
      const response = await fetch('/api/estados')
      if (!response.ok) throw new Error('Erro ao buscar estados')
      return response.json()
    }
  })

  React.useEffect(() => {
    if (associacoesError) {
      console.error('❌ Erro ao carregar associações:', associacoesError)
    }
  }, [associacoesError])

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

  const statusUpdateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'pendente' | 'emitido' | 'cancelado' }) =>
      updateCTeDocumento(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cte-documentos'] })
      toast.success('Status do CT-e atualizado com sucesso!')
    },
    onError: (error: any) => {
      console.error('Error updating CT-e status:', error)
      toast.error(error.message || 'Erro ao atualizar status do CT-e')
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
    setCidadeInicioNome('')
    setCidadeTerminoNome('')
    setCidadeInicioResults([])
    setCidadeTerminoResults([])
    setChaveErrors({})
    setFormData({
      tomador_id: '',
      remetente_id: '',
      recebedor_id: '',
      destinatario_id: '',
      produto_predominante_id: '',
      data_emissao: format(new Date(), 'yyyy-MM-dd'),
      valor_prestacao: '',
      valor_receber: '',
      valor_tributos: '',
      valor_pedagio: '',
      valor_seguro: '',
      icms_situacao_tributaria: '',
      icms_bc_valor: '',
      icms_aliquota: '',
      icms_valor: '',
      valor_carga: '',
      quantidade_carga: '',
      chave_acesso_1: '',
      chave_acesso_2: '',
      chave_acesso_3: '',
      chave_acesso_4: '',
      observacoes: '',
      cidade_inicio_ibge: '',
      cidade_termino_ibge: '',
      uf_inicio: '',
      uf_termino: '',
      cidade_inicio_nome: '',
      cidade_termino_nome: ''
    })
  }

  const resetFormRapido = () => {
    setFormRapido({
      empresa_id: '',
      associacao_frota_id: '',
      produto_id: '',
      chave_nfe: '',
      cnpj_destinatario: '',
      valor_nota: '',
      quantidade: '',
      cidade_inicio: '',
      cidade_termino: ''
    })
    setRapidoCidadeInicioNome('')
    setRapidoCidadeTerminoNome('')
    setRapidoCidadeInicioResults([])
    setRapidoCidadeTerminoResults([])
    setRapidoSelectedInicio(null)
    setRapidoSelectedTermino(null)
    setRapidoShowInicioResults(false)
    setRapidoShowTerminoResults(false)
  }

  // Função para atualizar dados do formulário
  const handleUpdateFormData = (field: string, value: any) => {
    try {
      console.log(`📝 Atualizando campo ${field}:`, value)

      setFormData(prev => {
        const newData = {
          ...prev,
          [field]: value
        }

        console.log('📋 Estado atualizado:', { campo: field, valor: value })
        return newData
      })

      // Recalcular automaticamente quando pedágio ou seguro mudarem
      if (field === 'valor_pedagio' || field === 'valor_seguro') {
        console.log('💰 Valor financeiro alterado, recalculando impostos...')
        // Usar setTimeout para garantir que o estado foi atualizado
        setTimeout(() => {
          calcularImpostos()
        }, 150)
      }

    } catch (error) {
      console.error('❌ Erro ao atualizar formData:', error)
    }
  }

  // useEffect para carregar dados quando modal CT-e rápido abre
  React.useEffect(() => {
    if (!isModalRapidoOpen) return

    console.log('🚀 Modal CT-e rápido aberto - invalidando cache das associações')
    // Invalidar cache das associações para garantir dados atualizados
    queryClient.invalidateQueries({ queryKey: ['associacoes-frota-ativas-cte'] })
  }, [isModalRapidoOpen, queryClient])

  // useEffect para carregar dados quando modal abre ou documento selecionado muda
  React.useEffect(() => {
    if (!isModalOpen) return

    console.log('📝 Modal CT-e aberto - invalidando cache das associações')
    // Invalidar cache das associações para garantir dados atualizados
    queryClient.invalidateQueries({ queryKey: ['associacoes-frota-ativas-cte'] })

    if (selectedDocumento && empresas) {
      console.log('📝 Carregando documento para edição:', selectedDocumento.id)
      // Carregar dados do documento em edição
      const empresa = empresas.find(emp => emp.id === selectedDocumento.empresa_id)
      setSelectedEmpresaId(selectedDocumento.empresa_id)

      if (empresa?.rntrc) {
        setRntrcValue(empresa.rntrc)
        console.log('✅ RNTRC carregado para edição:', empresa.rntrc)
      } else {
        setRntrcValue('RNTRC não informado para esta empresa')
      }

      // Preencher campos com dados do documento selecionado
      if (selectedDocumento.icms_situacao_tributaria) {
        handleSituacaoTributariaChange(selectedDocumento.icms_situacao_tributaria);
      }

      // Carregar dados do documento nos estados do formulário
      setFormData(prev => ({
        ...prev,
        tomador_id: selectedDocumento.tomador_id || '',
        remetente_id: selectedDocumento.remetente_id || '',
        recebedor_id: selectedDocumento.recebedor_id || '',
        destinatario_id: selectedDocumento.destinatario_id || '',
        produto_predominante_id: selectedDocumento.produto_predominante_id || '',
        data_emissao: selectedDocumento.data_emissao.split('T')[0] || format(new Date(), 'yyyy-MM-dd'),
        valor_prestacao: selectedDocumento.valor_prestacao?.toString() || '',
        valor_receber: selectedDocumento.valor_receber?.toString() || '',
        valor_tributos: selectedDocumento.valor_tributos?.toString() || '',
        valor_pedagio: selectedDocumento.valor_pedagio?.toString() || '',
        valor_seguro: selectedDocumento.valor_seguro?.toString() || '',
        icms_situacao_tributaria: selectedDocumento.icms_situacao_tributaria || '',
        icms_bc_valor: selectedDocumento.icms_bc_valor?.toString() || '',
        icms_aliquota: selectedDocumento.icms_aliquota?.toString() || '',
        icms_valor: selectedDocumento.icms_valor?.toString() || '',
        valor_carga: selectedDocumento.valor_carga?.toString() || '',
        quantidade_carga: selectedDocumento.quantidade_carga?.toString() || '',
        chave_acesso_1: selectedDocumento.chave_acesso_1 || '',
        chave_acesso_2: selectedDocumento.chave_acesso_2 || '',
        chave_acesso_3: selectedDocumento.chave_acesso_3 || '',
        chave_acesso_4: selectedDocumento.chave_acesso_4 || '',
        observacoes: selectedDocumento.observacoes || '',
        cidade_inicio_ibge: selectedDocumento.cidade_inicio_ibge || '',
        cidade_termino_ibge: selectedDocumento.cidade_termino_ibge || '',
        uf_inicio: selectedDocumento.uf_inicio || '',
        uf_termino: selectedDocumento.uf_termino || '',
        cidade_inicio_nome: selectedDocumento.cidade_inicio_nome || '',
        cidade_termino_nome: selectedDocumento.cidade_termino_nome || ''
      }))

      // Definir o local de início e término se existirem
      if (selectedDocumento.cidade_inicio_ibge && estados) {
        const estadoInicio = estados.find(e => e.uf === selectedDocumento.uf_inicio);
        setSelectedInicio({
          codigo: selectedDocumento.cidade_inicio_ibge,
          nome: selectedDocumento.cidade_inicio_nome || '',
          uf: selectedDocumento.uf_inicio || ''
        });
        setCidadeInicioNome(selectedDocumento.cidade_inicio_nome || '');
      }
      if (selectedDocumento.cidade_termino_ibge && estados) {
        const estadoTermino = estados.find(e => e.uf === selectedDocumento.uf_termino);
        setSelectedTermino({
          codigo: selectedDocumento.cidade_termino_ibge,
          nome: selectedDocumento.cidade_termino_nome || '',
          uf: selectedDocumento.uf_termino || ''
        });
        setCidadeTerminoNome(selectedDocumento.cidade_termino_nome || '');
      }

      // Preencher dados de transporte
      if (selectedDocumento.associacao_frota_id) {
        console.log('🚛 Carregando associação de frota do documento:', selectedDocumento.associacao_frota_id)
        handleMotoristaChange(selectedDocumento.associacao_frota_id);
      }

    } else {
      // Reset para novo documento
      console.log('🔄 Reset para novo documento')
      setSelectedEmpresaId('')
      setRntrcValue('Selecione uma empresa para exibir o RNTRC')
      setSelectedMotoristaId('')
      setPlacaVeiculo('')
      setPlacaReboque('')
      setMotoristaInfo(null)
    }
  }, [selectedDocumento, empresas, isModalOpen, queryClient, estados])

  // Função para calcular impostos e valores totais
  const calcularImpostos = () => {
    try {
      console.log('🧮 Iniciando cálculo de impostos...')

      // Buscar elementos do DOM com verificação de existência
      const valorPrestacaoInput = document.getElementById('valor_prestacao') as HTMLInputElement
      const valorTributosInput = document.getElementById('valor_tributos') as HTMLInputElement
      const valorReceberInput = document.getElementById('valor_receber') as HTMLInputElement
      const icmsValorInput = document.getElementById('icms_valor') as HTMLInputElement
      const icmsBcInput = document.getElementById('icms_bc_valor') as HTMLInputElement

      if (!valorPrestacaoInput || !valorTributosInput || !valorReceberInput || !icmsValorInput || !icmsBcInput) {
        console.log('⚠️ Campos necessários não encontrados no DOM, saindo do cálculo')
        return
      }

      // Obter valores com validação segura
      const valorICMS = parseFloat(icmsValorInput.value || '0') || 0
      const valorBaseComICMS = parseFloat(icmsBcInput.value || '0') || 0
      const valorPedagio = parseFloat(formData.valor_pedagio || '0') || 0
      const valorSeguro = parseFloat(formData.valor_seguro || '0') || 0

      console.log('📊 Valores para cálculo:', {
        valorICMS,
        valorBaseComICMS,
        valorPedagio,
        valorSeguro
      })

      // Valor Total da Prestação = Valor base com ICMS + Pedágio + Seguro
      const valorTotalPrestacao = valorBaseComICMS + valorPedagio + valorSeguro

      // Atualizar campos e estado com validação
      const valorPrestacaoFormatado = valorTotalPrestacao.toFixed(2)
      const valorTributosFormatado = valorICMS.toFixed(2)
      const valorReceberFormatado = valorTotalPrestacao.toFixed(2)

      // Atualizar campos do DOM
      valorPrestacaoInput.value = valorPrestacaoFormatado
      valorTributosInput.value = valorTributosFormatado
      valorReceberInput.value = valorReceberFormatado

      // Atualizar estado do componente
      setFormData(prev => ({
        ...prev,
        valor_prestacao: valorPrestacaoFormatado,
        valor_tributos: valorTributosFormatado,
        valor_receber: valorReceberFormatado
      }))

      console.log('💰 Cálculo de impostos concluído:')
      console.log('- Valor base com ICMS:', valorBaseComICMS.toFixed(2))
      console.log('- Valor pedágio:', valorPedagio.toFixed(2))
      console.log('- Valor seguro:', valorSeguro.toFixed(2))
      console.log('- Valor ICMS:', valorICMS.toFixed(2))
      console.log('- Valor total final:', valorTotalPrestacao.toFixed(2))

    } catch (error) {
      console.error('❌ Erro no cálculo de impostos:', error)
    }
  }

  // Função para atualizar dados baseado na empresa selecionada
  const handleEmpresaChange = (empresaId: string) => {
    console.log('🏢 Empresa selecionada:', empresaId)
    setSelectedEmpresaId(empresaId)

    if (empresaId && empresas) {
      const empresa = empresas.find(emp => emp.id === empresaId)
      console.log('🏢 Empresa encontrada:', empresa)

      if (empresa?.rntrc) {
        setRntrcValue(empresa.rntrc)
        console.log('✅ RNTRC atualizado:', empresa.rntrc)
      } else {
        setRntrcValue('RNTRC não informado para esta empresa')
        console.log('⚠️ RNTRC não encontrado para esta empresa')
      }
    } else {
      setRntrcValue('Selecione uma empresa para exibir o RNTRC')
      console.log('🔄 Campo RNTRC resetado')
    }
  }

  // Função para atualizar dados baseado no motorista selecionado
  const handleMotoristaChange = (associacaoId: string) => {
    console.log('🚚 Motorista selecionado:', associacaoId)
    setSelectedMotoristaId(associacaoId)

    if (!associacaoId) {
      setPlacaVeiculo('')
      setPlacaReboque('')
      setMotoristaInfo(null)
      console.log('🔄 Dados do motorista resetados')
      return
    }

    if (!associacoesFrota || associacoesFrota.length === 0) {
      console.log('❌ Nenhuma associação de frota disponível')
      setPlacaVeiculo('')
      setPlacaReboque('')
      setMotoristaInfo(null)
      return
    }

    const associacao = associacoesFrota.find(a => a.id === associacaoId)
    console.log('🔍 Associação encontrada completa:', {
      id: associacao?.id,
      motorista_nome: associacao?.funcionario?.nome,
      veiculo_principal_placa: associacao?.veiculo_principal?.placa,
      veiculo_implemento_placa: associacao?.veiculo_implemento?.placa,
      data_inicio: associacao?.data_inicio
    })

    if (!associacao) {
      console.log('❌ Associação não encontrada para ID:', associacaoId)
      setPlacaVeiculo('')
      setPlacaReboque('')
      setMotoristaInfo(null)
      return
    }

    console.log('🔍 Estrutura completa da associação:', JSON.stringify(associacao, null, 2))
    console.log('👨‍💼 Dados do funcionário na associação:', associacao.funcionario)
    console.log('🚛 Dados do veículo principal na associação:', associacao.veiculo_principal)

    // Definir placa do veículo principal
    const placaPrincipal = associacao.veiculo_principal?.placa || 'Placa não informada'
    setPlacaVeiculo(placaPrincipal)
    console.log('🚛 Placa principal definida:', placaPrincipal)

    // Definir placa do reboque (combinando reboque1 e reboque2 se existirem, ou implemento)
    let placaReboque = ''
    if (associacao.veiculo_implemento?.placa) {
      placaReboque = associacao.veiculo_implemento.placa
      console.log('🚛 Implemento encontrado:', placaReboque)
    } else {
      const placas = []
      if (associacao.veiculo_reboque1?.placa) {
        placas.push(associacao.veiculo_reboque1.placa)
        console.log('🚛 Reboque 1 encontrado:', associacao.veiculo_reboque1.placa)
      }
      if (associacao.veiculo_reboque2?.placa) {
        placas.push(associacao.veiculo_reboque2.placa)
        console.log('🚛 Reboque 2 encontrado:', associacao.veiculo_reboque2.placa)
      }
      placaReboque = placas.join(' + ')
    }
    setPlacaReboque(placaReboque || 'Nenhum reboque/implemento')
    console.log('🚛 Placa reboque/implemento definida:', placaReboque)

    // Definir informações do motorista - usando dados corretos da estrutura mapeada
    const funcionario = associacao.funcionario
    console.log('👨‍💼 Dados do funcionário recebidos:', funcionario)
    console.log('👨‍💼 Nome do funcionário:', funcionario?.nome)
    console.log('👨‍💼 CNH do funcionário:', funcionario?.cnh)
    console.log('👨‍💼 Matrícula do funcionário:', funcionario?.matricula)

    if (!funcionario) {
      console.log('❌ FUNCIONÁrio não encontrado na associação')
      setMotoristaInfo({
        nome: 'Nome não informado',
        cnh: 'CNH não informada',
        matricula: 'Matrícula não informada',
        validadeCnh: 'Não informado'
      })
      return
    }

    const validadeCnh = funcionario.validade_cnh
      ? format(parseISO(funcionario.validade_cnh), 'dd/MM/yyyy')
      : 'Não informado'

    const info = {
      nome: funcionario.nome || 'Nome não informado',
      cnh: funcionario.cnh || 'CNH não informada',
      matricula: funcionario.matricula || 'Matrícula não informada',
      validadeCnh
    }

    setMotoristaInfo(info)
    console.log('✅ Informações do motorista definidas:', info)
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
      const valorICMSFormatado = valorICMS.toFixed(2)
      const valorTotalFormatado = valorTotalComICMS.toFixed(2)

      icmsValorInput.value = valorICMSFormatado
      icmsBcInput.value = valorTotalFormatado

      // Sincronizar com o estado formData
      setFormData(prev => ({
        ...prev,
        icms_valor: valorICMSFormatado,
        icms_bc_valor: valorTotalFormatado
      }))
    } else {
      icmsValorInput.value = '0.00'
      setFormData(prev => ({
        ...prev,
        icms_valor: '0.00'
      }))
    }

    // Recalcular valores totais após atualizar o ICMS
    calcularImpostos()
  }

  // Buscar cidades para início da prestação
  const handleCidadeInicioSearch = async (term: string) => {
    if (term.length < 2) {
      setCidadeInicioResults([])
      return
    }

    try {
      const cities = await getCidadesPorNome(term)
      setCidadeInicioResults(cities)
    } catch (error) {
      console.error('Erro ao buscar cidades:', error)
      setCidadeInicioResults([])
    }
  }

  // Buscar cidades para término da prestação
  const handleCidadeTerminoSearch = async (term: string) => {
    if (term.length < 2) {
      setCidadeTerminoResults([])
      return
    }

    try {
      const cities = await getCidadesPorNome(term)
      setCidadeTerminoResults(cities)
    } catch (error) {
      console.error('Erro ao buscar cidades:', error)
      setCidadeTerminoResults([])
    }
  }

  // Buscar cidades para formulário rápido - início
  const handleRapidoCidadeInicioSearch = async (term: string) => {
    if (term.length < 2) {
      setRapidoCidadeInicioResults([])
      return
    }

    try {
      const cities = await getCidadesPorNome(term)
      setRapidoCidadeInicioResults(cities)
    } catch (error) {
      console.error('Erro ao buscar cidades:', error)
      setRapidoCidadeInicioResults([])
    }
  }

  // Buscar cidades para formulário rápido - término
  const handleRapidoCidadeTerminoSearch = async (term: string) => {
    if (term.length < 2) {
      setRapidoCidadeTerminoResults([])
      return
    }

    try {
      const cities = await getCidadesPorNome(term)
      setRapidoCidadeTerminoResults(cities)
    } catch (error) {
      console.error('Erro ao buscar cidades:', error)
      setRapidoCidadeTerminoResults([])
    }
  }

  // Função para extrair CNPJ da chave de acesso NF-e
  const extrairCNPJDaChave = (chave: string): string => {
    // Chave de 44 dígitos: UF(2) + AAMM(4) + CNPJ(14) + Modelo(2) + Série(3) + Número(9) + Forma(1) + Código(8) + DV(1)
    console.log('🔑 Extraindo CNPJ da chave:', chave)

    if (chave.length !== 44) {
      console.log('❌ Chave inválida - deve ter 44 dígitos, tem:', chave.length)
      return ''
    }

    const cnpjExtraido = chave.substring(6, 20) // Posições 6-19 contêm o CNPJ (14 dígitos)
    console.log('🏢 CNPJ extraído da chave:', cnpjExtraido)

    return cnpjExtraido
  }

  // Função para buscar frete com informações completas
  const buscarFrete = async (cnpjOrigem: string, cnpjDestino: string, tipoReboque: string, cidadeOrigemIbge: string, cidadeDestinoIbge: string) => {
    try {
      console.log('💰 Iniciando busca de frete com parâmetros:')
      console.log('- CNPJ Origem:', cnpjOrigem)
      console.log('- CNPJ Destino:', cnpjDestino)
      console.log('- Tipo Reboque:', tipoReboque)
      console.log('- Cidade Origem IBGE:', cidadeOrigemIbge)
      console.log('- Cidade Destino IBGE:', cidadeDestinoIbge)

      const query = `
        SELECT
          valor_frete,
          valor_pedagio,
          valor_seguro,
          cobranca_pedagio,
          cobranca_seguro,
          tomador_frete
        FROM frete_documentos
        WHERE cliente_origem_id IN (
          SELECT id FROM cadastros WHERE cnpj = $1 AND tipo = 'cliente' AND ativo = true
        )
        AND cliente_destino_id IN (
          SELECT id FROM cadastros WHERE cnpj = $2 AND tipo = 'cliente' AND ativo = true
        )
        AND tipo_reboque = $3
        AND cidade_origem_ibge = $4
        AND cidade_destino_ibge = $5
        AND ativo = true
        LIMIT 1
      `

      const params = [cnpjOrigem, cnpjDestino, tipoReboque, cidadeOrigemIbge, cidadeDestinoIbge]

      console.log('🔍 Query SQL:')
      console.log(query)
      console.log('📋 Parâmetros:')
      console.log(params)

      const response = await fetch('/api/db/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth.token')}`
        },
        body: JSON.stringify({
          query: query,
          params: params
        })
      })

      console.log('🌐 Status da resposta:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Erro na resposta da API:', errorText)
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('📊 Resultado completo da busca de frete:', result)

      // Verificar estrutura da resposta
      const dados = result.data || result.rows || []
      console.log('📄 Dados de frete encontrados:', dados)

      if (dados && dados.length > 0) {
        const frete = dados[0]
        const informacoesFrete = {
          valor_frete: parseFloat(frete.valor_frete),
          valor_pedagio: parseFloat(frete.valor_pedagio || 0),
          valor_seguro: parseFloat(frete.valor_seguro || 0),
          cobranca_pedagio: frete.cobranca_pedagio || false,
          cobranca_seguro: frete.cobranca_seguro || false,
          tomador_frete: frete.tomador_frete || 'remetente'
        }
        console.log('✅ Frete encontrado com informações completas:', informacoesFrete)
        return informacoesFrete
      } else {
        console.log('❌ Nenhum frete encontrado para os parâmetros informados')
        return null
      }
    } catch (error) {
      console.error('❌ Erro ao buscar frete:', error)
      console.error('🔍 Stack trace:', error instanceof Error ? error.stack : 'N/A')
      return null
    }
  }

  // Função para buscar ICMS por UF com regras específicas
  const buscarICMSPorUF = async (ufOrigem: string, ufDestino: string) => {
    try {
      console.log('🏛️ Aplicando regras específicas de ICMS')
      console.log('- UF Origem:', ufOrigem)
      console.log('- UF Destino:', ufDestino)

      // Normalizar nomes dos estados para comparação
      const normalizeUF = (uf: string) => {
        const ufMap: { [key: string]: string } = {
          'Minas Gerais': 'MG',
          'Goiás': 'GO',
          'São Paulo': 'SP',
          'Rio de Janeiro': 'RJ',
          'Bahia': 'BA',
          'Paraná': 'PR',
          'Rio Grande do Sul': 'RS',
          'Pernambuco': 'PE',
          'Ceará': 'CE',
          'Pará': 'PA',
          'Santa Catarina': 'SC',
          'Maranhão': 'MA',
          'Paraíba': 'PB',
          'Espírito Santo': 'ES',
          'Piauí': 'PI',
          'Alagoas': 'AL',
          'Distrito Federal': 'DF',
          'Mato Grosso do Sul': 'MS',
          'Mato Grosso': 'MT',
          'Rio Grande do Norte': 'RN',
          'Sergipe': 'SE',
          'Rondônia': 'RO',
          'Acre': 'AC',
          'Amazonas': 'AM',
          'Roraima': 'RR',
          'Amapá': 'AP',
          'Tocantins': 'TO'
        }
        return ufMap[uf] || uf
      }

      const ufOrigemNorm = normalizeUF(ufOrigem)
      const ufDestinoNorm = normalizeUF(ufDestino)

      console.log('- UF Origem normalizada:', ufOrigemNorm)
      console.log('- UF Destino normalizada:', ufDestinoNorm)

      // Regras específicas implementadas
      if (ufOrigemNorm === 'MG' && ufDestinoNorm === 'GO') {
        console.log('✅ Regra MG → GO: ICMS 7%')
        return 7.0
      }

      if (ufOrigemNorm === 'GO' && ufDestinoNorm === 'MG') {
        console.log('✅ Regra GO → MG: ICMS 12%')
        return 12.0
      }

      if (ufOrigemNorm === 'MG' && ufDestinoNorm === 'MG') {
        console.log('✅ Regra MG → MG: ICMS Isenção (0%)')
        return 0.0
      }

      if (ufOrigemNorm === 'GO' && ufDestinoNorm === 'GO') {
        console.log('✅ Regra GO → GO: ICMS Isenção (0%)')
        return 0.0
      }

      // Para outras UFs, consultar tabela cte_icms
      console.log('🔍 Consultando tabela cte_icms para outras UFs')
      const response = await fetch('/api/db/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth.token')}`
        },
        body: JSON.stringify({
          query: `SELECT "${ufDestinoNorm}" as aliquota FROM cte_icms WHERE "ORIGEM" = $1`,
          params: [ufOrigemNorm]
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar ICMS')
      }

      const result = await response.json()
      const dados = result.data || result.rows || []
      const aliquotaTabela = dados.length > 0 ? parseFloat(dados[0].aliquota) : 7.0
      console.log('📊 ICMS da tabela:', aliquotaTabela + '%')
      return aliquotaTabela
    } catch (error) {
      console.error('❌ Erro ao buscar ICMS:', error)
      return 7.0 // 7% padrão em caso de erro
    }
  }

  // Função para determinar CFOP baseado nas UFs
  const determinarCFOP = (ufOrigem: string, ufDestino: string) => {
    console.log('📋 Determinando CFOP')
    console.log('- UF Origem:', ufOrigem)
    console.log('- UF Destino:', ufDestino)

    // Normalizar nomes dos estados para comparação
    const normalizeUF = (uf: string) => {
      const ufMap: { [key: string]: string } = {
        'Minas Gerais': 'MG',
        'Goiás': 'GO',
        'São Paulo': 'SP',
        'Rio de Janeiro': 'RJ',
        'Bahia': 'BA',
        'Paraná': 'PR',
        'Rio Grande do Sul': 'RS',
        'Pernambuco': 'PE',
        'Ceará': 'CE',
        'Pará': 'PA',
        'Santa Catarina': 'SC',
        'Maranhão': 'MA',
        'Paraíba': 'PB',
        'Espírito Santo': 'ES',
        'Piauí': 'PI',
        'Alagoas': 'AL',
        'Distrito Federal': 'DF',
        'Mato Grosso do Sul': 'MS',
        'Mato Grosso': 'MT',
        'Rio Grande do Norte': 'RN',
        'Sergipe': 'SE',
        'Rondônia': 'RO',
        'Acre': 'AC',
        'Amazonas': 'AM',
        'Roraima': 'RR',
        'Amapá': 'AP',
        'Tocantins': 'TO'
      }
      return ufMap[uf] || uf
    }

    const ufOrigemNorm = normalizeUF(ufOrigem)
    const ufDestinoNorm = normalizeUF(ufDestino)

    console.log('- UF Origem normalizada:', ufOrigemNorm)
    console.log('- UF Destino normalizada:', ufDestinoNorm)

    // Regras específicas implementadas
    if (ufOrigemNorm === 'MG' && ufDestinoNorm === 'GO') {
      console.log('✅ Regra MG → GO: CFOP 6352')
      return '6352'
    }

    if (ufOrigemNorm === 'GO' && ufDestinoNorm === 'MG') {
      console.log('✅ Regra GO → MG: CFOP 6932')
      return '6932'
    }

    if (ufOrigemNorm === 'MG' && ufDestinoNorm === 'MG') {
      console.log('✅ Regra MG → MG: CFOP 5352')
      return '5352'
    }

    if (ufOrigemNorm === 'GO' && ufDestinoNorm === 'GO') {
      console.log('✅ Regra GO → GO: CFOP 5932')
      return '5932'
    }

    // Para outras UFs, usar regra padrão (dentro do estado = 5352, fora do estado = 6352)
    if (ufOrigemNorm === ufDestinoNorm) {
      console.log('📋 Regra padrão dentro do estado: CFOP 5352')
      return '5352'
    } else {
      console.log('📋 Regra padrão fora do estado: CFOP 6352')
      return '6352'
    }
  }

  const handleSubmitRapido = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmittingRapido(true) // Inicia o estado de submissão

    try {
      // Validações básicas
      if (!formRapido.empresa_id) {
        toast.error('Selecione a empresa emitente')
        setIsSubmittingRapido(false)
        return
      }

      if (!formRapido.associacao_frota_id) {
        toast.error('Selecione o motorista e veículo')
        setIsSubmittingRapido(false)
        return
      }

      if (!formRapido.produto_id) {
        toast.error('Selecione o produto')
        setIsSubmittingRapido(false)
        return
      }

      // Limpar e validar chave de NF-e
      const chaveNFeLimpa = formRapido.chave_nfe.replace(/\s/g, '') // Remove todos os espaços
      if (!chaveNFeLimpa || chaveNFeLimpa.length !== 44) {
        toast.error('Informe uma chave de NF-e válida (44 dígitos). Chave atual tem ' + chaveNFeLimpa.length + ' dígitos.')
        setIsSubmittingRapido(false)
        return
      }

      // Validar se chave contém apenas números
      if (!/^\d+$/.test(chaveNFeLimpa)) {
        toast.error('A chave de NF-e deve conter apenas números')
        setIsSubmittingRapido(false)
        return
      }

      // Extrair CNPJ remetente da chave NF-e
      console.log('🚀 Iniciando validação do CT-e rápido')
      const cnpjRemetenteChave = extrairCNPJDaChave(chaveNFeLimpa)
      console.log('🏢 CNPJ remetente extraído:', cnpjRemetenteChave)

      if (!cnpjRemetenteChave) {
        console.error('❌ Falha ao extrair CNPJ da chave NF-e')
        toast.error('Não foi possível extrair o CNPJ do remetente da chave NF-e')
        setIsSubmittingRapido(false)
        return
      }

      if (!formRapido.cnpj_destinatario) {
        toast.error('Informe o CNPJ do destinatário')
        setIsSubmittingRapido(false)
        return
      }

      if (!formRapido.valor_nota || parseFloat(formRapido.valor_nota) <= 0) {
        toast.error('Informe um valor válido da nota fiscal')
        setIsSubmittingRapido(false)
        return
      }

      if (!formRapido.quantidade || parseFloat(formRapido.quantidade) <= 0) {
        toast.error('Informe uma quantidade válida')
        setIsSubmittingRapido(false)
        return
      }

      if (!rapidoSelectedInicio) {
        toast.error('Selecione a cidade de início')
        setIsSubmittingRapido(false)
        return
      }

      if (!rapidoSelectedTermino) {
        toast.error('Selecione a cidade de término')
        setIsSubmittingRapido(false)
        return
      }

      // Buscar remetente por CNPJ extraído da chave
      console.log('🔍 Buscando remetente com CNPJ:', cnpjRemetenteChave)
      const remetente = await buscarClientePorCNPJ(cnpjRemetenteChave)

      if (!remetente) {
        console.error('❌ Remetente não encontrado para CNPJ:', cnpjRemetenteChave)
        toast.error(`Remetente não encontrado com CNPJ ${cnpjRemetenteChave} (extraído da chave NF-e). Cadastre o cliente primeiro.`)
        setIsSubmittingRapido(false)
        return
      }

      console.log('✅ Remetente encontrado:', remetente.razao_social)

      // Buscar destinatário por CNPJ informado
      console.log('🔍 Buscando destinatário com CNPJ:', formRapido.cnpj_destinatario)
      const destinatario = await buscarClientePorCNPJ(formRapido.cnpj_destinatario)

      if (!destinatario) {
        console.error('❌ Destinatário não encontrado para CNPJ:', formRapido.cnpj_destinatario)
        toast.error('Destinatário não encontrado com este CNPJ. Cadastre o cliente primeiro.')
        setIsSubmittingRapido(false)
        return
      }

      console.log('✅ Destinatário encontrado:', destinatario.razao_social)

      // Buscar dados da associação de frota
      const associacao = associacoesFrota?.find(a => a.id === formRapido.associacao_frota_id)
      if (!associacao) {
        toast.error('Associação de frota não encontrada')
        setIsSubmittingRapido(false)
        return
      }

      // Buscar empresa selecionada
      const empresaSelecionada = empresas?.find(e => e.id === formRapido.empresa_id)
      if (!empresaSelecionada) {
        toast.error('Empresa selecionada não encontrada')
        setIsSubmittingRapido(false)
        return
      }

      // Determinar tipo de reboque/implemento para busca de frete
      let tipoReboque = 'padrao'
      if (associacao.veiculo_implemento?.tipo) {
        tipoReboque = associacao.veiculo_implemento.tipo
      } else if (associacao.veiculo_reboque1?.tipo) {
        tipoReboque = associacao.veiculo_reboque1.tipo
      } else if (associacao.veiculo_reboque2?.tipo) {
        tipoReboque = associacao.veiculo_reboque2.tipo
      }

      // Manter tipos bi_trem conforme banco de dados
      if (tipoReboque === 'bi_trem_1_reboque' || tipoReboque === 'bi_trem_2_reboque') {
        tipoReboque = 'bi_trem'
      }

      console.log('🚛 Tipo de reboque para consulta de frete:', tipoReboque)

      // Buscar informações completas do frete cadastrado (obrigatório)
      const informacoesFrete = await buscarFrete(
        cnpjRemetenteChave,
        formRapido.cnpj_destinatario,
        tipoReboque,
        rapidoSelectedInicio.codigo,
        rapidoSelectedTermino.codigo
      )

      // Verificar se frete foi encontrado - obrigatório para criar CT-e
      if (!informacoesFrete) {
        console.error('❌ Frete não encontrado - abortar criação do CT-e')
        toast.error('Não foi possível criar o CT-e. Frete não está cadastrado para esta origem/destino e tipo de reboque.')
        setIsSubmittingRapido(false)
        return
      }

      console.log('✅ Informações do frete encontradas:', informacoesFrete)

      // Definir tomador baseado na configuração do frete
      let tomadorIdFinal = ''
      let remetenteIdFinal = ''
      let destinatarioIdFinal = ''

      // Buscar IDs dos participantes pelos CNPJs
      const remetenteQuery = `SELECT id FROM cadastros WHERE cnpj = $1 AND tipo = 'cliente' AND ativo = true LIMIT 1`
      const destinatarioQuery = `SELECT id FROM cadastros WHERE cnpj = $1 AND tipo = 'cliente' AND ativo = true LIMIT 1`

      try {
        const [remetenteResult, destinatarioResult] = await Promise.all([
          query(remetenteQuery, [cnpjRemetenteChave]),
          query(destinatarioQuery, [formRapido.cnpj_destinatario])
        ])

        if (remetenteResult?.rows?.length > 0) {
          remetenteIdFinal = remetenteResult.rows[0].id
          console.log('✅ Remetente encontrado:', remetenteIdFinal)
        }

        if (destinatarioResult?.rows?.length > 0) {
          destinatarioIdFinal = destinatarioResult.rows[0].id
          console.log('✅ Destinatário encontrado:', destinatarioIdFinal)
        }

        // Definir tomador baseado na configuração do frete - SALVAR VALOR LITERAL igual ao CT-e Auto
        if (informacoesFrete.tomador_frete === 'remetente') {
          tomadorIdFinal = 'remetente'  // Salvar literal, não UUID
          console.log('👤 Tomador definido como REMETENTE (valor literal):', tomadorIdFinal)
        } else if (informacoesFrete.tomador_frete === 'destinatario') {
          tomadorIdFinal = 'destinatario'  // Salvar literal, não UUID
          console.log('👤 Tomador definido como DESTINATÁRIO (valor literal):', tomadorIdFinal)
        }

      } catch (error) {
        console.error('❌ Erro ao buscar participantes:', error)
        toast.error('Erro ao buscar dados dos participantes')
        setIsSubmittingRapido(false)
        return
      }

      console.log('✅ Informações do frete encontradas:', informacoesFrete)


      // Calcular valor base do frete
      let valorBaseFrete = informacoesFrete.valor_frete

      // Adicionar pedágio se configurado para cobrança
      if (informacoesFrete.cobranca_pedagio && informacoesFrete.valor_pedagio > 0) {
        valorBaseFrete += informacoesFrete.valor_pedagio
        console.log(`💰 Pedágio adicionado: R$ ${informacoesFrete.valor_pedagio.toFixed(2)}`)
      }

      // Adicionar seguro se configurado para cobrança
      if (informacoesFrete.cobranca_seguro && informacoesFrete.valor_seguro > 0) {
        valorBaseFrete += informacoesFrete.valor_seguro
        console.log(`🛡️ Seguro adicionado: R$ ${informacoesFrete.valor_seguro.toFixed(2)}`)
      }

      console.log(`💰 Valor base do frete calculado: R$ ${valorBaseFrete.toFixed(2)}`)

      // Usar o valor calculado
      const valorFrete = valorBaseFrete

      // Aplicar regras específicas de ICMS e CFOP
      console.log('🏛️ Aplicando regras específicas de ICMS e CFOP')
      console.log('- UF Origem:', rapidoSelectedInicio.uf)
      console.log('- UF Destino:', rapidoSelectedTermino.uf)

      let aliquotaICMS = 0
      let cfopCalculado = '5352'
      let situacaoTributaria = '40' // Isenção por padrão

      // Regras específicas implementadas
      if (rapidoSelectedInicio.uf === 'Minas Gerais' && rapidoSelectedTermino.uf === 'Goiás') {
        aliquotaICMS = 7.0
        cfopCalculado = '6352'
        situacaoTributaria = '00'
        console.log('✅ Regra MG → GO: ICMS 7%, CFOP 6352')
      } else if (rapidoSelectedInicio.uf === 'Goiás' && rapidoSelectedTermino.uf === 'Minas Gerais') {
        aliquotaICMS = 12.0
        cfopCalculado = '6932'
        situacaoTributaria = '00'
        console.log('✅ Regra GO → MG: ICMS 12%, CFOP 6932')
      } else if (rapidoSelectedInicio.uf === 'Minas Gerais' && rapidoSelectedTermino.uf === 'Minas Gerais') {
        aliquotaICMS = 0.0
        cfopCalculado = '5352'
        situacaoTributaria = '40'
        console.log('✅ Regra MG → MG: ICMS Isenção, CFOP 5352')
      } else if (rapidoSelectedInicio.uf === 'Goiás' && rapidoSelectedTermino.uf === 'Goiás') {
        aliquotaICMS = 0.0
        cfopCalculado = '5932'
        situacaoTributaria = '40'
        console.log('✅ Regra GO → GO: ICMS Isenção, CFOP 5932')
      } else {
        // Para outras UFs, buscar na tabela cte_icms
        console.log('🔍 Buscando ICMS na tabela para outras UFs')
        aliquotaICMS = await buscarICMSPorUF(rapidoSelectedInicio.uf, rapidoSelectedTermino.uf)
        cfopCalculado = rapidoSelectedInicio.uf === rapidoSelectedTermino.uf ? '5352' : '6352'
        situacaoTributaria = aliquotaICMS > 0 ? '00' : '40'
        console.log(`📊 ICMS da tabela: ${aliquotaICMS}%, CFOP: ${cfopCalculado}`)
      }

      // Calcular ICMS
      let valorTotalComICMS = valorFrete
      let valorICMS = 0

      if (aliquotaICMS > 0) {
        // Com ICMS: Valor Base / (1 - Alíquota) - para incluir ICMS no valor
        const aliquotaDecimal = aliquotaICMS / 100
        valorTotalComICMS = valorFrete / (1 - aliquotaDecimal)
        valorICMS = valorTotalComICMS - valorFrete
        console.log(`💰 ICMS calculado: ${aliquotaICMS}% = R$ ${valorICMS.toFixed(2)}`)
      } else {
        // Isenção: não há ICMS
        valorTotalComICMS = valorFrete
        valorICMS = 0
        console.log('🆓 ICMS Isenção aplicada')
      }

      const documentoData: CTeDocumentoCreate = {
        empresa_id: empresaSelecionada.id,
        data_emissao: format(new Date(), 'yyyy-MM-dd'),
        codigo_uf: empresaSelecionada.codigo_uf,
        serie: empresaSelecionada.serie_padrao_cte,
        cidade_inicio_ibge: rapidoSelectedInicio.codigo,
        cidade_termino_ibge: rapidoSelectedTermino.codigo,
        uf_inicio: rapidoSelectedInicio.uf,
        uf_termino: rapidoSelectedTermino.uf,
        cidade_inicio_nome: rapidoSelectedInicio.nome,
        cidade_termino_nome: rapidoSelectedTermino.nome,
        forma_emissao: 1,
        status: 'pendente',
        // Participantes - usar IDs encontrados e tomador baseado no frete
        tomador_id: tomadorIdFinal,
        remetente_id: remetenteIdFinal,
        destinatario_id: destinatarioIdFinal,
        recebedor_id: null,
        // Valores calculados
        valor_prestacao: valorTotalComICMS,
        valor_receber: valorTotalComICMS,
        valor_tributos: valorICMS,
        valor_pedagio: informacoesFrete.cobranca_pedagio ? informacoesFrete.valor_pedagio : 0,
        valor_seguro: informacoesFrete.cobranca_seguro ? informacoesFrete.valor_seguro : 0,
        icms_situacao_tributaria: situacaoTributaria,
        icms_bc_valor: valorTotalComICMS,
        icms_aliquota: aliquotaICMS,
        icms_valor: valorICMS,
        // Dados da carga
        valor_carga: parseFloat(formRapido.valor_nota),
        quantidade_carga: parseFloat(formRapido.quantidade),
        produto_predominante_id: formRapido.produto_id,
        chave_acesso_1: chaveNFeLimpa,
        // Dados padrão
        tipo_servico: '0',
        finalidade_cte: '0',
        cfop: cfopCalculado,
        // Dados de transporte
        associacao_frota_id: formRapido.associacao_frota_id,
        rntrc: empresaSelecionada.rntrc,
        motorista_nome: associacao.funcionario?.nome,
        motorista_cnh: associacao.funcionario?.cnh,
        motorista_matricula: associacao.funcionario?.matricula,
        motorista_validade_cnh: associacao.funcionario?.validade_cnh,
        placa_veiculo: associacao.veiculo_principal?.placa,
        placa_reboque: associacao.veiculo_implemento?.placa ||
          [associacao.veiculo_reboque1?.placa, associacao.veiculo_reboque2?.placa]
            .filter(Boolean).join(' + ') || null
      }

      // Criar o documento
      await createMutation.mutateAsync(documentoData)

      // Construir mensagem detalhada com composição completa
      let mensagemDetalhes = []

      // Composição detalhada do frete
      let composicaoFrete = [`Frete: R$ ${informacoesFrete.valor_frete.toFixed(2)}`]
      let valorPedagio = 0
      let valorSeguro = 0

      if (informacoesFrete.cobranca_pedagio && informacoesFrete.valor_pedagio > 0) {
        valorPedagio = informacoesFrete.valor_pedagio
        composicaoFrete.push(`Pedágio: R$ ${valorPedagio.toFixed(2)}`)
      }

      if (informacoesFrete.cobranca_seguro && informacoesFrete.valor_seguro > 0) {
        valorSeguro = informacoesFrete.valor_seguro
        composicaoFrete.push(`Seguro: R$ ${valorSeguro.toFixed(2)}`)
      }

      // Mostrar subtotal antes do ICMS
      const subtotalAntesTributos = informacoesFrete.valor_frete + valorPedagio + valorSeguro
      console.log(`💰 Subtotal antes dos tributos: R$ ${subtotalAntesTributos.toFixed(2)}`)

      // Informações fiscais
      const ufOrigemAbrev = normalizeUF(rapidoSelectedInicio.uf)
      const ufDestinoAbrev = normalizeUF(rapidoSelectedTermino.uf)

      if (aliquotaICMS > 0) {
        mensagemDetalhes.push(`ICMS ${aliquotaICMS}% = R$ ${valorICMS.toFixed(2)} (${ufOrigemAbrev}→${ufDestinoAbrev})`)
        composicaoFrete.push(`ICMS ${aliquotaICMS}%: R$ ${valorICMS.toFixed(2)}`)
      } else {
        mensagemDetalhes.push(`ICMS Isenção (${ufOrigemAbrev}→${ufDestinoAbrev})`)
      }

      mensagemDetalhes.push(`CFOP: ${cfopCalculado}`)
      mensagemDetalhes.push(`Tomador: ${informacoesFrete.tomador_frete === 'remetente' ? 'Remetente' : 'Destinatário'}`)

      // Log detalhado da composição
      console.log('📋 Composição Detalhada do Frete:')
      console.log(`  - Frete Base: R$ ${informacoesFrete.valor_frete.toFixed(2)}`)
      if (valorPedagio > 0) {
        console.log(`  - Pedágio: R$ ${valorPedagio.toFixed(2)} ${informacoesFrete.cobranca_pedagio ? '✅ Incluído' : '❌ Não cobrado'}`)
      }
      if (valorSeguro > 0) {
        console.log(`  - Seguro: R$ ${valorSeguro.toFixed(2)} ${informacoesFrete.cobranca_seguro ? '✅ Incluído' : '❌ Não cobrado'}`)
      }
      if (valorICMS > 0) {
        console.log(`  - ICMS ${aliquotaICMS}%: R$ ${valorICMS.toFixed(2)}`)
      }
      console.log(`  - TOTAL FINAL: R$ ${valorTotalComICMS.toFixed(2)}`)

      // Função auxiliar para normalizar UF
      function normalizeUF(uf: string): string {
        const ufMap: { [key: string]: string } = {
          'Minas Gerais': 'MG',
          'Goiás': 'GO',
          'São Paulo': 'SP',
          'Rio de Janeiro': 'RJ',
          'Bahia': 'BA',
          'Paraná': 'PR',
          'Rio Grande do Sul': 'RS',
          'Pernambuco': 'PE',
          'Ceará': 'CE',
          'Pará': 'PA',
          'Santa Catarina': 'SC',
          'Maranhão': 'MA',
          'Paraíba': 'PB',
          'Espírito Santo': 'ES',
          'Piauí': 'PI',
          'Alagoas': 'AL',
          'Distrito Federal': 'DF',
          'Mato Grosso do Sul': 'MS',
          'Mato Grosso': 'MT',
          'Rio Grande do Norte': 'RN',
          'Sergipe': 'SE',
          'Rondônia': 'RO',
          'Acre': 'AC',
          'Amazonas': 'AM',
          'Roraima': 'RR',
          'Amapá': 'AP',
          'Tocantins': 'TO'
        }
        return ufMap[uf] || uf
      }

      toast.success(
        `CT-e rápido criado! ${composicaoFrete.join(' + ')} | ${mensagemDetalhes.join(' | ')} | Total: R$ ${valorTotalComICMS.toFixed(2)}`
      )

      setIsModalRapidoOpen(false)
      resetFormRapido()

    } catch (error) {
      console.error('Erro ao criar CT-e rápido:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar CT-e rápido')
    } finally {
      setIsSubmittingRapido(false) // Finaliza o estado de submissão
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formDataElement = new FormData(e.currentTarget)

    // Use o estado `selectedEmpresaId` para garantir que a empresa selecionada seja usada
    const empresaIdValue = selectedEmpresaId || ''

    // Validar adicional do empresa_id
    if (!empresaIdValue || empresaIdValue.trim() === '') {
      toast.error('Por favor, selecione uma empresa antes de prosseguir.')
      return
    }

    // Validar data de emissão usando estado controlado
    if (!formData.data_emissao || formData.data_emissao.trim() === '') {
      toast.error('Por favor, informe a data de emissão.')
      return
    }

    // Validar tomador
    if (!formData.tomador_id || formData.tomador_id.trim() === '') {
      toast.error('Por favor, selecione o tomador do serviço.')
      return
    }

    // Validar remetente
    if (!formData.remetente_id || formData.remetente_id.trim() === '') {
      toast.error('Por favor, selecione o remetente.')
      return
    }

    // Validar destinatário
    if (!formData.destinatario_id || formData.destinatario_id.trim() === '') {
      toast.error('Por favor, selecione o destinatário.')
      return
    }

    // Validar produto predominante
    if (!formData.produto_predominante_id || formData.produto_predominante_id.trim() === '') {
      toast.error('Por favor, selecione o produto predominante.')
      return
    }

    // Validar chave de acesso 1 obrigatória
    if (!formData.chave_acesso_1 || formData.chave_acesso_1.trim() === '') {
      toast.error('Por favor, informe pelo menos a Chave de Acesso 1.')
      return
    }

    // Validar locais de início e término
    if (!selectedInicio && !formData.cidade_inicio_nome) {
      toast.error('Por favor, informe o local de início da prestação.')
      return
    }

    if (!selectedTermino && !formData.cidade_termino_nome) {
      toast.error('Por favor, selecione o local de término da prestação.')
      return
    }

    // Buscar dados da associação de frota selecionada
    const associacaoSelecionada = selectedMotoristaId && associacoesFrota
      ? associacoesFrota.find(a => a.id === selectedMotoristaId)
      : null

    // Buscar RNTRC da empresa selecionada
    const empresaSelecionada = empresas?.find(e => e.id === empresaIdValue)

    const documentoData: CTeDocumentoCreate = {
      empresa_id: empresaIdValue,
      numero_cte: formDataElement.get('numero_cte') === 'AUTO' || !formDataElement.get('numero_cte') ? null : formDataElement.get('numero_cte') as string,
      serie: formDataElement.get('serie') as string || null,
      data_emissao: formData.data_emissao,
      cidade_inicio_ibge: selectedInicio?.codigo || formData.cidade_inicio_ibge || null,
      cidade_termino_ibge: selectedTermino?.codigo || formData.cidade_termino_ibge || null,
      uf_inicio: selectedInicio?.uf || formData.uf_inicio || null,
      uf_termino: selectedTermino?.uf || formData.uf_termino || null,
      cidade_inicio_nome: selectedInicio?.nome || formData.cidade_inicio_nome || null,
      cidade_termino_nome: selectedTermino?.nome || formData.cidade_termino_nome || null,
      forma_emissao: parseInt(formDataElement.get('forma_emissao') as string) || 1,
      status: formDataElement.get('status') as 'pendente' | 'emitido' | 'cancelado',
      observacoes: formData.observacoes || null,
      tomador_id: formData.tomador_id || null,
      remetente_id: formData.remetente_id || null,
      recebedor_id: formData.recebedor_id || null,
      destinatario_id: formData.destinatario_id || null,
      // Campos de serviços e impostos
      valor_prestacao: formData.valor_prestacao ? parseFloat(formData.valor_prestacao) : null,
      valor_receber: formData.valor_receber ? parseFloat(formData.valor_receber) : null,
      valor_tributos: formData.valor_tributos ? parseFloat(formData.valor_tributos) : null,
      valor_pedagio: formData.valor_pedagio ? parseFloat(formData.valor_pedagio) : null,
      valor_seguro: formData.valor_seguro ? parseFloat(formData.valor_seguro) : null,
      icms_situacao_tributaria: formData.icms_situacao_tributaria || null,
      icms_bc_valor: formData.icms_bc_valor ? parseFloat(formData.icms_bc_valor) : null,
      icms_aliquota: formData.icms_aliquota ? parseFloat(formData.icms_aliquota) : null,
      icms_valor: formData.icms_valor ? parseFloat(formData.icms_valor) : null,
      // Campos de dados fiscais
      valor_carga: parseFloat(formData.valor_carga) || null,
      quantidade_carga: parseFloat(formData.quantidade_carga) || null,
      produto_predominante_id: formData.produto_predominante_id || null,
      chave_acesso_1: formData.chave_acesso_1 || null,
      chave_acesso_2: formData.chave_acesso_2 || null,
      chave_acesso_3: formData.chave_acesso_3 || null,
      chave_acesso_4: formData.chave_acesso_4 || null,
      // Campos de transporte
      associacao_frota_id: selectedMotoristaId || null,
      rntrc: empresaSelecionada?.rntrc || null,
      motorista_nome: associacaoSelecionada?.funcionario?.nome || null,
      motorista_cnh: associacaoSelecionada?.funcionario?.cnh || null,
      motorista_matricula: associacaoSelecionada?.funcionario?.matricula || null,
      motorista_validade_cnh: associacaoSelecionada?.funcionario?.validade_cnh || null,
      placa_veiculo: placaVeiculo || null,
      placa_reboque: placaReboque || null,
      cfop: formDataElement.get('cfop') as string || null,
      finalidade_cte: formDataElement.get('finalidade_cte') as string || null,
      tipo_servico: formDataElement.get('tipo_servico') as string || null
    }

    // Verifica se há erros de validação de chave de acesso antes de submeter
    if (Object.keys(chaveErrors).length > 0) {
      toast.error('Por favor, corrija os erros nas chaves de acesso antes de prosseguir.')
      return
    }

    // Preencher dados do documento selecionado para edição
    if (selectedDocumento) {
      updateMutation.mutate({ id: selectedDocumento.id, data: documentoData })
    } else {
      createMutation.mutate(documentoData)
    }
  }

  const handleEdit = (documento: CTeDocumento) => {
    console.log('✅ RNTRC carregado para edição:', documento.rntrc)
    console.log('📝 Dados do documento para edição:', documento)

    setSelectedDocumento(documento); // Define o documento selecionado para edição

    // Preenche os campos de busca de cidade para exibição
    setCidadeInicioNome(documento.cidade_inicio_nome || '');
    setCidadeTerminoNome(documento.cidade_termino_nome || '');

    // Preenche TODOS os dados do formulário com os dados do documento
    setFormData({
      empresa_id: documento.empresa_id || '',
      numero_cte: documento.numero_cte || '',
      serie: documento.serie || '',
      data_emissao: documento.data_emissao ? new Date(documento.data_emissao).toISOString().split('T')[0] : '',
      codigo_uf: documento.codigo_uf || '',
      status: documento.status || 'pendente',
      observacoes: documento.observacoes || '',
      // PARTICIPANTES - DADOS PRINCIPAIS
      tomador_id: documento.tomador_id || '',
      remetente_id: documento.remetente_id || '',
      recebedor_id: documento.recebedor_id || '',
      destinatario_id: documento.destinatario_id || '',
      // VALORES FINANCEIROS
      valor_prestacao: documento.valor_prestacao || '',
      valor_receber: documento.valor_receber || '',
      valor_tributos: documento.valor_tributos || '',
      valor_pedagio: documento.valor_pedagio || '',
      valor_seguro: documento.valor_seguro || '',
      icms_situacao_tributaria: documento.icms_situacao_tributaria || '',
      icms_bc_valor: documento.icms_bc_valor || '',
      icms_aliquota: documento.icms_aliquota || '',
      icms_valor: documento.icms_valor || '',
      // DADOS FISCAIS
      cfop: documento.cfop || '',
      finalidade_cte: documento.finalidade_cte || '',
      tipo_servico: documento.tipo_servico || '',
      // DADOS DA CARGA
      valor_carga: documento.valor_carga || '',
      quantidade_carga: documento.quantidade_carga || '',
      produto_predominante_id: documento.produto_predominante_id || '',
      // CHAVES DE ACESSO NF-e
      chave_acesso_1: documento.chave_acesso_1 || '',
      chave_acesso_2: documento.chave_acesso_2 || '',
      chave_acesso_3: documento.chave_acesso_3 || '',
      chave_acesso_4: documento.chave_acesso_4 || '',
    });

    // Preenche os campos de endereço se existirem
    if (documento.cidade_inicio_codigo) {
      setSelectedInicio({
        codigo: documento.cidade_inicio_codigo,
        nome: documento.cidade_inicio_nome || '',
        uf: documento.cidade_inicio_uf || ''
      });
    }

    if (documento.cidade_termino_codigo) {
      setSelectedTermino({
        codigo: documento.cidade_termino_codigo,
        nome: documento.cidade_termino_nome || '',
        uf: documento.cidade_termino_uf || ''
      });
    }

    // Preenche dados do motorista/associação se existirem
    if (documento.associacao_frota_id) {
      setSelectedMotoristaId(documento.associacao_frota_id);
    }

    console.log('✅ Formulário preenchido com dados do documento');
    setIsModalOpen(true);
  };


  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este CT-e?')) {
      return
    }

    // Confirmação adicional para exclusão
    if (!window.confirm('Exclusão de CT-e é uma operação definitiva. Deseja continuar?')) {
      return
    }

    // Usar a mutação de exclusão
    deleteMutation.mutate(id)
  }

  const handleStatusChange = (id: string, newStatus: 'pendente' | 'emitido' | 'cancelado') => {
    const statusLabels = {
      pendente: 'Pendente',
      emitido: 'Emitido',
      cancelado: 'Cancelado'
    }

    const confirmed = confirm(`Tem certeza que deseja alterar o status para "${statusLabels[newStatus]}"?`)
    if (confirmed) {
      statusUpdateMutation.mutate({ id, status: newStatus })
    }
  }

  const handleGenerateFiles = async (id: string) => {
    setIsGeneratingFiles(true)
    try {
      // Verifica se o documento já tem XML gerado
      const documento = documentos?.find(d => d.id === id)

      if (documento?.xml_gerado) {
        // Se já tem XML gerado, altera status para pendente antes de gerar novamente
        await updateCTeDocumento(id, { status: 'pendente' })
        console.log('📝 Status alterado para pendente - regenerando arquivos para documento:', id)
      }

      // Chama a função para gerar os arquivos
      await generateCTeFiles(id)
      // Invalida a query para atualizar a lista de documentos com os novos status
      await refetch()
      toast.success('Arquivos XML e PDF gerados com sucesso!')
    } catch (error) {
      console.error('❌ Erro ao gerar arquivos CT-e:', error)
      console.error('❌ Detalhes do erro:', {
        tipo: typeof error,
        mensagem: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'Sem stack'
      })
      // Exibe mensagem de erro específica
      const errorMessage = error instanceof Error
        ? error.message
        : `Erro ao gerar arquivos CT-e: ${String(error)}`;
      toast.error(errorMessage)
    } finally {
      setIsGeneratingFiles(false) // Finaliza o estado de carregamento
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

  // Função para buscar cliente por CNPJ
  const buscarClientePorCNPJ = async (cnpj: string) => {
    try {
      console.log('🔍 Buscando cliente por CNPJ:', cnpj)

      const cnpjLimpo = cnpj.replace(/\D/g, '')
      console.log('🧹 CNPJ limpo:', cnpjLimpo)

      if (cnpjLimpo.length !== 14) {
        console.log('❌ CNPJ inválido - deve ter 14 dígitos, tem:', cnpjLimpo.length)
        return null
      }

      // Usar a mesma query que funcionou no teste direto
      const query = `
        SELECT * FROM cadastros
        WHERE cnpj = $1 AND tipo = 'cliente' AND ativo = true
        LIMIT 1
      `
      const params = [cnpjLimpo]

      console.log('🔍 Executando query:')
      console.log('📋 SQL:', query.trim())
      console.log('📋 Parâmetros:', params)

      const response = await fetch('/api/db/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth.token')}`
        },
        body: JSON.stringify({
          query: query,
          params: params
        })
      })

      if (!response.ok) {
        console.error('❌ Erro na resposta da API:', response.status, response.statusText)
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('📊 Resultado completo da API:', result)

      // A API pode retornar tanto result.data quanto result.rows dependendo do endpoint
      const dados = result.data || result.rows || []

      if (dados && dados.length > 0) {
        console.log('✅ Cliente encontrado:', dados[0].razao_social)
        return dados[0]
      }

      console.log('❌ Nenhum cliente encontrado com CNPJ:', cnpjLimpo)
      return null
    } catch (error) {
      console.error('❌ Erro ao buscar cliente por CNPJ:', error)
      return null
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
          <div className="flex space-x-2">
            <button
              onClick={() => {
                console.log('🔄 Atualizando lista de CT-e manualmente')
                refetch()
                toast.success('Lista de CT-e atualizada!')
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0113.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Atualizar Dados
            </button>
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
            <button
              onClick={() => {
                resetFormRapido()
                setIsModalRapidoOpen(true)
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Novo CT-e Rápido
            </button>
            <button
              onClick={() => {
                console.log('🎯 Navegando para Novo CT-e Auto')
                try {
                  navigate('/fiscal/cte-auto')
                } catch (error) {
                  console.error('❌ Erro na navegação:', error)
                  window.location.href = '/fiscal/cte-auto'
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Novo CT-e Auto
            </button>
          </div>
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
                      <th className="px-2 py-3.5 text-left text-sm font-semibold text-gray-900 w-32">
                        Numero CT-e
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
                        <td className="px-2 py-4 text-sm">
                          <div className="font-mono font-medium text-gray-900">
                            {documento.numero_cte.padStart(9, '0')}
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
                              {format(parseISO(documento.xml_gerado_em), 'dd/MM/ HH:mm')}
                            </div>
                          )}
                          {documento.xml_gerado && documento.xml_path && (
                            <div className="flex space-x-1 mt-1">
                              <a
                                href={`/${documento.xml_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                Ver XML
                              </a>
                              <a
                                href={`/${documento.xml_path}`}
                                download={`${documento.numero_cte}-cte.xml`}
                                className="text-xs text-green-600 hover:text-green-800 underline"
                              >
                                Baixar
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {documento.pdf_gerado && documento.pdf_path && (
                              <button
                                onClick={() => handleViewPDF(documento)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Visualizar PDF"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleGenerateFiles(documento.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Gerar arquivos"
                              disabled={isGeneratingFiles}
                            >
                              <DocumentArrowDownIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEdit(documento)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Editar"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>

                            {/* Status Change Buttons */}
                            <div className="flex items-center gap-1 ml-2 border-l pl-2">
                              {documento.status === 'pendente' && (
                                <button
                                  onClick={() => handleStatusChange(documento.id, 'emitido')}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 hover:bg-green-200"
                                  title="Emitir CT-e"
                                >
                                  ✓ Emitir
                                </button>
                              )}
                              {(documento.status === 'emitido' || documento.status === 'pendente') && (
                                <button
                                  onClick={() => handleStatusChange(documento.id, 'cancelado')}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 hover:bg-red-200"
                                  title="Cancelar CT-e"
                                >
                                  ❌
                                </button>
                              )}
                              {(documento.status === 'cancelado' || documento.status === 'emitido') && (
                                <button
                                  onClick={() => handleStatusChange(documento.id, 'pendente')}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                  title="Marcar como pendente"
                                >
                                  ⚠️
                                </button>
                              )}
                            </div>

                            <button
                              onClick={() => handleDelete(documento.id)}
                              className="text-red-600 hover:text-red-900 ml-2"
                              title="Excluir"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
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
                      value={selectedDocumento?.empresa_id || selectedEmpresaId}
                      required
                      onChange={(e) => handleEmpresaChange(e.target.value)}
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
                        defaultValue={selectedDocumento?.numero_cte || ''}
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
                        defaultValue={selectedDocumento?.serie || ''}
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
                        value={formData.data_emissao}
                        onChange={(e) => handleUpdateFormData('data_emissao', e.target.value)}
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
                        defaultValue={selectedDocumento?.hora_emissao || format(new Date(), 'HH:mm')}
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
                        defaultValue={selectedDocumento?.tipo_servico || "0"}
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
                        defaultValue={selectedDocumento?.finalidade_cte || "0"}
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
                        defaultValue={selectedDocumento?.cfop || "5352"}
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
                        id="local_inicio"
                        value={cidadeInicioNome}
                        onChange={(e) => {
                          const value = e.target.value
                          setCidadeInicioNome(value)
                          setInicioSearchTerm(value)
                          setSelectedInicio(null)
                          handleCidadeInicioSearch(value)
                          setShowInicioResults(true)
                        }}
                        onFocus={() => setShowInicioResults(true)}
                        onBlur={() => setTimeout(() => setShowInicioResults(false), 150)}
                        placeholder="Digite o nome da cidade..."
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <input
                        type="hidden"
                        name="cidade_inicio_ibge"
                        value={selectedInicio?.codigo || formData.cidade_inicio_ibge || ''}
                      />
                       <input
                        type="hidden"
                        name="uf_inicio"
                        value={selectedInicio?.uf || formData.uf_inicio || ''}
                      />

                      {showInicioResults && cidadeInicioResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
                          {cidadeInicioResults.map((cidade) => (
                            <div
                              key={cidade.cod_city}
                              onClick={() => {
                                const cidadeSelecionada = {
                                  codigo: cidade.cod_city,
                                  nome: cidade.name,
                                  uf: cidade.uf || ''
                                }
                                setSelectedInicio(cidadeSelecionada)
                                setFormData(prev => ({
                                  ...prev,
                                  cidade_inicio_ibge: cidade.cod_city,
                                  cidade_inicio_nome: cidade.name,
                                  uf_inicio: cidade.uf
                                }))
                                setCidadeInicioNome(cidade.name)
                                setInicioSearchTerm(cidade.name)
                                setShowInicioResults(false)
                                setCidadeInicioResults([])
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
                        id="local_termino"
                        value={cidadeTerminoNome}
                        onChange={(e) => {
                          const value = e.target.value
                          setCidadeTerminoNome(value)
                          setTerminoSearchTerm(value)
                          setSelectedTermino(null)
                          handleCidadeTerminoSearch(value)
                          setShowTerminoResults(true)
                        }}
                        onFocus={() => setShowTerminoResults(true)}
                        onBlur={() => setTimeout(() => setShowTerminoResults(false), 150)}
                        placeholder="Digite o nome da cidade..."
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <input
                        type="hidden"
                        name="cidade_termino_ibge"
                        value={selectedTermino?.codigo || formData.cidade_termino_ibge || ''}
                      />
                       <input
                        type="hidden"
                        name="uf_termino"
                        value={selectedTermino?.uf || formData.uf_termino || ''}
                      />

                      {showTerminoResults && cidadeTerminoResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
                          {cidadeTerminoResults.map((cidade) => (
                            <div
                              key={cidade.cod_city}
                              onClick={() => {
                                const cidadeSelecionada = {
                                  codigo: cidade.cod_city,
                                  nome: cidade.name,
                                  uf: cidade.uf || ''
                                }
                                setSelectedTermino(cidadeSelecionada)
                                setFormData(prev => ({
                                  ...prev,
                                  cidade_termino_ibge: cidade.cod_city,
                                  cidade_termino_nome: cidade.name,
                                  uf_termino: cidade.uf
                                }))
                                setCidadeTerminoNome(cidade.name)
                                setTerminoSearchTerm(cidade.name)
                                setShowTerminoResults(false)
                                setCidadeTerminoResults([])
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
                      value={formData.tomador_id}
                      onChange={(e) => handleUpdateFormData('tomador_id', e.target.value)}
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
                      value={formData.remetente_id}
                      onChange={(e) => handleUpdateFormData('remetente_id', e.target.value)}
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
                      value={formData.recebedor_id}
                      onChange={(e) => handleUpdateFormData('recebedor_id', e.target.value)}
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
                      value={formData.destinatario_id}
                      onChange={(e) => handleUpdateFormData('destinatario_id', e.target.value)}
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

                  {/* Composição do Frete */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">🚛 Composição do Frete</h4>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="valor_pedagio" className="block text-sm font-medium text-gray-700">
                          Valor do Pedágio
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">R$</span>
                          </div>
                          <input
                            type="number"
                            name="valor_pedagio"
                            id="valor_pedagio"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={formData.valor_pedagio || ''}
                            onChange={(e) => handleUpdateFormData('valor_pedagio', e.target.value)}
                            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Valor do pedágio incluído no frete
                        </p>
                      </div>

                      <div>
                        <label htmlFor="valor_seguro" className="block text-sm font-medium text-gray-700">
                          Valor do Seguro
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">R$</span>
                          </div>
                          <input
                            type="number"
                            name="valor_seguro"
                            id="valor_seguro"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={formData.valor_seguro || ''}
                            onChange={(e) => handleUpdateFormData('valor_seguro', e.target.value)}
                            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Valor do seguro incluído no frete
                        </p>
                      </div>
                    </div>

                    {/* Resumo da Composição do Frete */}
                    {(parseFloat(formData.valor_pedagio || '0') > 0 || parseFloat(formData.valor_seguro || '0') > 0) && (
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <h5 className="text-sm font-medium text-green-900 mb-2">📊 Resumo da Composição</h5>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          {parseFloat(formData.valor_pedagio || '0') > 0 && (
                            <div className="flex justify-between">
                              <span className="text-green-700">🛣️ Pedágio:</span>
                              <span className="font-medium text-green-900">
                                R$ {parseFloat(formData.valor_pedagio || '0').toFixed(2)}
                              </span>
                            </div>
                          )}
                          {parseFloat(formData.valor_seguro || '0') > 0 && (
                            <div className="flex justify-between">
                              <span className="text-green-700">🛡️ Seguro:</span>
                              <span className="font-medium text-green-900">
                                R$ {parseFloat(formData.valor_seguro || '0').toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-green-300 pt-2">
                            <span className="text-green-800 font-medium">💰 Total Adicional:</span>
                            <span className="font-bold text-green-900">
                              R$ {(parseFloat(formData.valor_pedagio || '0') + parseFloat(formData.valor_seguro || '0')).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
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
                          value={formData.valor_prestacao || ''}
                          onChange={(e) => handleUpdateFormData('valor_prestacao', e.target.value)}
                          readOnly
                          className="pl-10 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <p id="valor_prestacao_desc" className="mt-1 text-xs text-gray-500">
                        Calculado automaticamente (Frete + Pedágio + Seguro + ICMS)
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
                          value={formData.valor_receber || ''}
                          onChange={(e) => handleUpdateFormData('valor_receber', e.target.value)}
                          readOnly
                          className="pl-10 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <p id="valor_receber_desc" className="mt-1 text-xs text-gray-500">
                        Valor total a receber (Frete + Pedágio + Seguro + ICMS)
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
                          value={formData.valor_tributos || ''}
                          onChange={(e) => handleUpdateFormData('valor_tributos', e.target.value)}
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
                        value={formData.icms_situacao_tributaria || ''}
                        required
                        onChange={(e) => {
                          const situacao = e.target.value;
                          handleUpdateFormData('icms_situacao_tributaria', situacao);
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
                            value={formData.icms_bc_valor || ''}
                            onChange={(e) => handleUpdateFormData('icms_bc_valor', e.target.value)}
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
                            value={formData.icms_aliquota || ''}
                            onChange={(e) => handleUpdateFormData('icms_aliquota', e.target.value)}
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
                            value={formData.icms_valor || ''}
                            onChange={(e) => handleUpdateFormData('icms_valor', e.target.value)}
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
                            defaultValue={selectedDocumento?.valor_carga || formData.valor_carga || ''}
                            onChange={(e) => handleUpdateFormData('valor_carga', e.target.value)}
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
                            defaultValue={selectedDocumento?.quantidade_carga || formData.quantidade_carga || ''}
                            onChange={(e) => handleUpdateFormData('quantidade_carga', e.target.value)}
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
                        value={formData.produto_predominante_id}
                        onChange={(e) => handleUpdateFormData('produto_predominante_id', e.target.value)}
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
                          Chave de Acesso 1 *
                        </label>
                        <input
                          type="text"
                          name="chave_acesso_1"
                          id="chave_acesso_1"
                          maxLength={44}
                          placeholder="Digite apenas números (44 dígitos) - OBRIGATÓRIO"
                          defaultValue={selectedDocumento?.chave_acesso_1 || formData.chave_acesso_1 || ''}
                          required
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '')
                            e.target.value = value
                            handleUpdateFormData('chave_acesso_1', value)
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
                          maxLength={44}
                          placeholder="Digite apenas números (44 dígitos)"
                          defaultValue={selectedDocumento?.chave_acesso_2 || formData.chave_acesso_2 || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '')
                            e.target.value = value
                            handleUpdateFormData('chave_acesso_2', value)
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
                          maxLength={44}
                          placeholder="Digite apenas números (44 dígitos)"
                          defaultValue={selectedDocumento?.chave_acesso_3 || formData.chave_acesso_3 || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '')
                            e.target.value = value
                            handleUpdateFormData('chave_acesso_3', value)
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
                          maxLength={44}
                          placeholder="Digite apenas números (44 dígitos)"
                          defaultValue={selectedDocumento?.chave_acesso_4 || formData.chave_acesso_4 || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '')
                            e.target.value = value
                            handleUpdateFormData('chave_acesso_4', value)
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
                      <p>💡 <strong>Dica:</strong> Cole as chaves completas de 44 dígitos. A Chave 1 é obrigatória.</p>
                      <p>✅ Uma chave válida tem formato: 31200614200166000188550010000000012345678901 (44 dígitos)</p>
                      <p>⚠️ <strong>Importante:</strong> Pelo menos a Chave de Acesso 1 deve estar preenchida.</p>
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
                      value={rntrcValue}
                      readOnly
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
                      value={selectedMotoristaId}
                      onChange={(e) => handleMotoristaChange(e.target.value)}
                      disabled={isLoadingAssociacoes}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                    >
                      <option value="">
                        {isLoadingAssociacoes ? 'Carregando motoristas...' : 'Selecione um motorista'}
                      </option>
                      {associacoesFrota?.map((associacao) => (
                        <option key={associacao.id} value={associacao.id}>
                          {associacao.funcionario?.nome || 'Nome não informado'}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {isLoadingAssociacoes ? 'Carregando...' : 'Lista apenas motoristas com associações ativas de frota'}
                      {associacoesError && (
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
                        value={placaVeiculo}
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
                        value={placaReboque}
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
                  {motoristaInfo && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">👨‍💼 Informações do Motorista</h5>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Nome:</span>
                          <span className="ml-2 text-gray-600">{motoristaInfo.nome}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">CNH:</span>
                          <span className="ml-2 text-gray-600 font-mono">{motoristaInfo.cnh}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Validade CNH:</span>
                          <span className="ml-2 text-gray-600">{motoristaInfo.validadeCnh}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Matrícula:</span>
                          <span className="ml-2 text-gray-600">{motoristaInfo.matricula}</span>
                        </div>
                      </div>
                    </div>
                  )}

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
                      defaultValue={selectedDocumento?.observacoes || formData.observacoes || ''}
                      onChange={(e) => handleUpdateFormData('observacoes', e.target.value)}
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

                  {activeTab !== 'observacoes' && (
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
                  )}

                  {activeTab === 'observacoes' && (
                    <button
                      type="submit"
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

      {/* Modal de CT-e Rápido */}
      {isModalRapidoOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-green-600">
                🚀 Novo CT-e Rápido
              </h2>
              <button
                onClick={() => setIsModalRapidoOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <h4 className="text-sm font-medium text-green-900 mb-2">💡 CT-e Rápido</h4>
              <p className="text-sm text-green-700">
                Crie um CT-e rapidamente informando apenas os dados essenciais.
                Os demais campos serão preenchidos automaticamente com valores padrão.
              </p>
            </div>

            <form onSubmit={handleSubmitRapido}>
              <div className="space-y-6">
                {/* Empresa Emitente */}
                <div>
                  <label htmlFor="rapido_empresa_id" className="block text-sm font-medium text-gray-700">
                    Empresa Emitente *
                  </label>
                  <select
                    name="rapido_empresa_id"
                    id="rapido_empresa_id"
                    value={formRapido.empresa_id}
                    onChange={(e) => setFormRapido(prev => ({ ...prev, empresa_id: e.target.value }))}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  >
                    <option value="">Selecione a empresa</option>
                    {empresas?.filter(e => e.status === 'ativo').map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.razao_social} - {formatCNPJ(empresa.cnpj)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Empresa responsável pela emissão do CT-e
                  </p>
                </div>

                {/* Motorista e Veículo */}
                <div>
                  <label htmlFor="rapido_associacao_frota_id" className="block text-sm font-medium text-gray-700">
                    Motorista e Veículo *
                  </label>
                  <select
                    name="rapido_associacao_frota_id"
                    id="rapido_associacao_frota_id"
                    value={formRapido.associacao_frota_id}
                    onChange={(e) => setFormRapido(prev => ({ ...prev, associacao_frota_id: e.target.value }))}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  >
                    <option value="">Selecione motorista e veículo</option>
                    {associacoesFrota?.map((associacao) => {
                      console.log('🔍 Renderizando associação no select:', {
                        id: associacao.id,
                        funcionario: associacao.funcionario,
                        veiculo_principal: associacao.veiculo_principal,
                        veiculo_implemento: associacao.veiculo_implemento
                      })

                      // Construir descrição do conjunto
                      const motorista = associacao.funcionario?.nome || 'Nome não informado'
                      const veiculo = associacao.veiculo_principal?.placa || 'Sem placa'

                      // Coletar implementos/reboques
                      const implementos = []
                      if (associacao.veiculo_implemento?.placa) {
                        implementos.push(`${associacao.veiculo_implemento.placa} (${associacao.veiculo_implemento.tipo || 'implemento'})`)
                      }
                      if (associacao.veiculo_reboque1?.placa) {
                        implementos.push(`${associacao.veiculo_reboque1.placa} (${associacao.veiculo_reboque1.tipo || 'reboque'})`)
                      }
                      if (associacao.veiculo_reboque2?.placa) {
                        implementos.push(`${associacao.veiculo_reboque2.placa} (${associacao.veiculo_reboque2.tipo || 'reboque'})`)
                      }

                      const implementosTexto = implementos.length > 0 ? ` + ${implementos.join(' + ')}` : ''

                      console.log('🔍 Descrição da opção:', `🚛 ${motorista} - ${veiculo}${implementosTexto}`)

                      return (
                        <option key={associacao.id} value={associacao.id}>
                          🚛 {motorista} - {veiculo}{implementosTexto}
                        </option>
                      )
                    })}
                  </select>
                </div>

                {/* Produto */}
                <div>
                  <label htmlFor="rapido_produto_id" className="block text-sm font-medium text-gray-700">
                    Produto *
                  </label>
                  <select
                    name="rapido_produto_id"
                    id="rapido_produto_id"
                    value={formRapido.produto_id}
                    onChange={(e) => setFormRapido(prev => ({ ...prev, produto_id: e.target.value }))}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  >
                    <option value="">Selecione o produto</option>
                    {produtos?.map((produto) => (
                      <option key={produto.id} value={produto.id}>
                        {produto.cod_ncm} - {produto.descricao}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* Chave NF-e */}
                  <div>
                    <label htmlFor="rapido_chave_nfe" className="block text-sm font-medium text-gray-700">
                      Chave de Acesso da NF-e *
                    </label>
                    <input
                      type="text"
                      name="rapido_chave_nfe"
                      id="rapido_chave_nfe"
                      value={formRapido.chave_nfe}
                      onChange={(e) => {
                        // Remove espaços e caracteres não numéricos
                        const value = e.target.value.replace(/\D/g, '').substring(0, 44)
                        setFormRapido(prev => ({ ...prev, chave_nfe: value }))

                        // Auto-preencher CNPJ do remetente se chave tiver 44 dígitos
                        if (value.length === 44) {
                          const cnpjExtraido = value.substring(6, 20)
                          console.log('🔑 CNPJ extraído da chave:', cnpjExtraido)
                        }
                      }}
                      placeholder="Cole a chave da NF-e aqui (44 dígitos)"
                      required
                      className={`mt-1 block w-full rounded-md shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm font-mono ${
                        formRapido.chave_nfe.length === 44
                          ? 'border-green-300 bg-green-50'
                          : formRapido.chave_nfe.length > 0 && formRapido.chave_nfe.length !== 44
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      }`}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {formRapido.chave_nfe.length > 0 && (
                        <span className={formRapido.chave_nfe.length === 44 ? 'text-green-600' : 'text-red-600'}>
                          {formRapido.chave_nfe.length}/44 dígitos
                          {formRapido.chave_nfe.length === 44 && ' ✓ Válida'}
                          {formRapido.chave_nfe.length > 0 && formRapido.chave_nfe.length !== 44 && ' ⚠️ Incompleta'}
                        </span>
                      )}
                      {formRapido.chave_nfe.length === 0 && 'Cole ou digite a chave da NF-e (remove espaços automaticamente)'}
                    </p>
                    {formRapido.chave_nfe.length === 44 && (
                      <p className="mt-1 text-xs text-blue-600">
                        🏢 CNPJ do remetente (extraído): {extrairCNPJDaChave(formRapido.chave_nfe)}
                      </p>
                    )}
          </div>

          {/* CNPJ Destinatário */}
          <div>
            <label htmlFor="rapido_cnpj_destinatario" className="block text-sm font-medium text-gray-700">
              CNPJ do Destinatário *
            </label>
            <input
              type="text"
              name="rapido_cnpj_destinatario"
              id="rapido_cnpj_destinatario"
              value={formRapido.cnpj_destinatario}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                setFormRapido(prev => ({ ...prev, cnpj_destinatario: value }))
              }}
              placeholder="Apenas números"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Cliente deve estar cadastrado no sistema
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Valor da Nota */}
          <div>
            <label htmlFor="rapido_valor_nota" className="block text-sm font-medium text-gray-700">
              Valor da Nota Fiscal (R$) *
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="number"
                name="rapido_valor_nota"
                id="rapido_valor_nota"
                step="0.01"
                min="0"
                value={formRapido.valor_nota}
                onChange={(e) => setFormRapido(prev => ({ ...prev, valor_nota: e.target.value }))}
                placeholder="0,00"
                required
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <label htmlFor="rapido_quantidade" className="block text-sm font-medium text-gray-700">
              Quantidade (Litros) *
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                name="rapido_quantidade"
                id="rapido_quantidade"
                step="0.001"
                min="0"
                value={formRapido.quantidade}
                onChange={(e) => setFormRapido(prev => ({ ...prev, quantidade: e.target.value }))}
                placeholder="0,000"
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">L</span>
              </div>
            </div>
          </div>
        </div>

        {/* Local de Início */}
        <div>
          <label htmlFor="rapido_cidade_inicio" className="block text-sm font-medium text-gray-700">
            Local de Início da Prestação *
          </label>
          <div className="relative">
            <input
              type="text"
              id="rapido_cidade_inicio"
              value={rapidoCidadeInicioNome}
              onChange={(e) => {
                const value = e.target.value
                setRapidoCidadeInicioNome(value)
                setRapidoSelectedInicio(null)
                handleRapidoCidadeInicioSearch(value)
                setRapidoShowInicioResults(true)
              }}
              onFocus={() => setRapidoShowInicioResults(true)}
              onBlur={() => setTimeout(() => setRapidoShowInicioResults(false), 150)}
              placeholder="Digite o nome da cidade..."
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            />

            {rapidoShowInicioResults && rapidoCidadeInicioResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
                {rapidoCidadeInicioResults.map((cidade) => (
                  <div
                    key={cidade.cod_city}
                    onClick={() => {
                      const cidadeSelecionada = {
                        codigo: cidade.cod_city,
                        nome: cidade.name,
                        uf: cidade.uf || ''
                      }
                      setRapidoSelectedInicio(cidadeSelecionada)
                      setRapidoCidadeInicioNome(cidade.name)
                      setRapidoShowInicioResults(false)
                      setRapidoCidadeInicioResults([])
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

        {/* Local de Término */}
        <div>
          <label htmlFor="rapido_cidade_termino" className="block text-sm font-medium text-gray-700">
            Local de Término da Prestação *
          </label>
          <div className="relative">
            <input
              type="text"
              id="rapido_cidade_termino"
              value={rapidoCidadeTerminoNome}
              onChange={(e) => {
                const value = e.target.value
                setRapidoCidadeTerminoNome(value)
                setRapidoSelectedTermino(null)
                handleRapidoCidadeTerminoSearch(value)
                setRapidoShowTerminoResults(true)
              }}
              onFocus={() => setRapidoShowTerminoResults(true)}
              onBlur={() => setTimeout(() => setRapidoShowTerminoResults(false), 150)}
              placeholder="Digite o nome da cidade..."
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            />

            {rapidoShowTerminoResults && rapidoCidadeTerminoResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
                {rapidoCidadeTerminoResults.map((cidade) => (
                  <div
                    key={cidade.cod_city}
                    onClick={() => {
                      const cidadeSelecionada = {
                        codigo: cidade.cod_city,
                        nome: cidade.name,
                        uf: cidade.uf || ''
                      }
                      setRapidoSelectedTermino(cidadeSelecionada)
                      setRapidoCidadeTerminoNome(cidade.name)
                      setRapidoShowTerminoResults(false)
                      setRapidoCidadeTerminoResults([])
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
                    {formRapido.chave_nfe.length === 44 && (
                      <p className="mt-1 text-xs text-blue-600">
                        🏢 CNPJ do remetente (extraído): {extrairCNPJDaChave(formRapido.chave_nfe)}
                      </p>
                    )}</old_str>
            {formRapido.chave_nfe.length === 44 && (
              <p className="mt-1 text-xs text-blue-600">
                🏢 CNPJ do remetente (extraído): {extrairCNPJDaChave(formRapido.chave_nfe)}
              </p>
            )}
          </div>

          {/* CNPJ Destinatário */}
          <div>
            <label htmlFor="rapido_cnpj_destinatario" className="block text-sm font-medium text-gray-700">
              CNPJ do Destinatário *
            </label>
            <input
              type="text"
              name="rapido_cnpj_destinatario"
              id="rapido_cnpj_destinatario"
              value={formRapido.cnpj_destinatario}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                setFormRapido(prev => ({ ...prev, cnpj_destinatario: value }))
              }}
              placeholder="Apenas números"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Cliente deve estar cadastrado no sistema
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Valor da Nota */}
          <div>
            <label htmlFor="rapido_valor_nota" className="block text-sm font-medium text-gray-700">
              Valor da Nota Fiscal (R$) *
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="number"
                name="rapido_valor_nota"
                id="rapido_valor_nota"
                step="0.01"
                min="0"
                value={formRapido.valor_nota}
                onChange={(e) => setFormRapido(prev => ({ ...prev, valor_nota: e.target.value }))}
                placeholder="0,00"
                required
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <label htmlFor="rapido_quantidade" className="block text-sm font-medium text-gray-700">
              Quantidade (Litros) *
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                name="rapido_quantidade"
                id="rapido_quantidade"
                step="0.001"
                min="0"
                value={formRapido.quantidade}
                onChange={(e) => setFormRapido(prev => ({ ...prev, quantidade: e.target.value }))}
                placeholder="0,000"
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">L</span>
              </div>
            </div>
          </div>
        </div>

        {/* Local de Início */}
        <div>
          <label htmlFor="rapido_cidade_inicio" className="block text-sm font-medium text-gray-700">
            Local de Início da Prestação *
          </label>
          <div className="relative">
            <input
              type="text"
              id="rapido_cidade_inicio"
              value={rapidoCidadeInicioNome}
              onChange={(e) => {
                const value = e.target.value
                setRapidoCidadeInicioNome(value)
                setRapidoSelectedInicio(null)
                handleRapidoCidadeInicioSearch(value)
                setRapidoShowInicioResults(true)
              }}
              onFocus={() => setRapidoShowInicioResults(true)}
              onBlur={() => setTimeout(() => setRapidoShowInicioResults(false), 150)}
              placeholder="Digite o nome da cidade..."
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            />

            {rapidoShowInicioResults && rapidoCidadeInicioResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
                {rapidoCidadeInicioResults.map((cidade) => (
                  <div
                    key={cidade.cod_city}
                    onClick={() => {
                      const cidadeSelecionada = {
                        codigo: cidade.cod_city,
                        nome: cidade.name,
                        uf: cidade.uf || ''
                      }
                      setRapidoSelectedInicio(cidadeSelecionada)
                      setRapidoCidadeInicioNome(cidade.name)
                      setRapidoShowInicioResults(false)
                      setRapidoCidadeInicioResults([])
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

        {/* Local de Término */}
        <div>
          <label htmlFor="rapido_cidade_termino" className="block text-sm font-medium text-gray-700">
            Local de Término da Prestação *
          </label>
          <div className="relative">
            <input
              type="text"
              id="rapido_cidade_termino"
              value={rapidoCidadeTerminoNome}
              onChange={(e) => {
                const value = e.target.value
                setRapidoCidadeTerminoNome(value)
                setRapidoSelectedTermino(null)
                handleRapidoCidadeTerminoSearch(value)
                setRapidoShowTerminoResults(true)
              }}
              onFocus={() => setRapidoShowTerminoResults(true)}
              onBlur={() => setTimeout(() => setRapidoShowTerminoResults(false), 150)}
              placeholder="Digite o nome da cidade..."
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            />

            {rapidoShowTerminoResults && rapidoCidadeTerminoResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
                {rapidoCidadeTerminoResults.map((cidade) => (
                  <div
                    key={cidade.cod_city}
                    onClick={() => {
                      const cidadeSelecionada = {
                        codigo: cidade.cod_city,
                        nome: cidade.name,
                        uf: cidade.uf || ''
                      }
                      setRapidoSelectedTermino(cidadeSelecionada)
                      setRapidoCidadeTerminoNome(cidade.name)
                      setRapidoShowTerminoResults(false)
                      setRapidoCidadeTerminoResults([])
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


      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={() => setIsModalRapidoOpen(false)}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmittingRapido}
          className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
        >
          {isSubmittingRapido ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Criando...
            </>
          ) : (
            '🚀 Criar CT-e Rápido'
          )}
        </button>
      </div>
    </form>
  </div>
</div>
)}
</div>
)
}