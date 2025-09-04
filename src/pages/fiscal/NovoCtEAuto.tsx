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
import { validarChaveAcesso, createCTeDocumento } from '@/lib/api/fiscal'
import type { AssociacaoFrota } from '@/lib/api/fleet-associations'

interface NFEData {
  remetente: {
    razao_social: string
    cnpj: string
    endereco: string
    cidade: string
    estado: string
    cep: string
  }
  destinatario: {
    razao_social: string
    cnpj: string
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
}

export default function NovoCtEAuto() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [chaveNFE, setChaveNFE] = useState('')
  const [chaveValida, setChaveValida] = useState<boolean | null>(null)
  const [associacaoSelecionada, setAssociacaoSelecionada] = useState<string>('')
  const [nfeData, setNfeData] = useState<NFEData | null>(null)
  const [consultandoNFE, setConsultandoNFE] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Buscar associações (motorista/reboque)
  const { data: associacoes } = useQuery({
    queryKey: ['associacoes-frota'],
    queryFn: getAssociacoesFrota,
    staleTime: 1000 * 60 * 5
  })

  // Função para consultar NFE no webservice
  const consultarNFE = async (chave: string) => {
    try {
      console.log('🔍 Consultando NF-e diretamente no webservice:', chave)
      
      const token = '44B4845C-05F4-7E99-2DFF-8EAE5746E9BA'
      const url = `https://www.roveri.inf.br/consultas/nfe.php?token=${token}&chave=${chave}`
      
      console.log('📡 URL da consulta:', url)

      // Fazer requisição direta ao webservice
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`)
      }

      const responseText = await response.text()
      console.log('📄 Resposta do webservice:', responseText)

      // Verificar se é um erro
      if (responseText.includes('Chave inválida') || responseText.includes('erro') || responseText.includes('error')) {
        throw new Error(`Erro do webservice: ${responseText}`)
      }

      // Tentar fazer parse como JSON
      let nfeData
      try {
        nfeData = JSON.parse(responseText)
        console.log('✅ Dados JSON recebidos:', nfeData)
        return nfeData
      } catch (jsonError) {
        // Se não for JSON, assumir que é uma mensagem de erro em texto
        if (responseText.trim()) {
          throw new Error(`Resposta do webservice: ${responseText}`)
        } else {
          throw new Error('Resposta vazia do webservice')
        }
      }
    } catch (error) {
      console.error('Erro ao consultar NF-e:', error)
      throw error
    }
  }

  // Mutation para consultar NF-e
  const consultarNFEMutation = useMutation({
    mutationFn: consultarNFE,
    onSuccess: (data) => {
      setNfeData(data)
      toast.success('NF-e consultada com sucesso!')
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
    if (!nfeData || !associacaoSelecionada) {
      toast.error('Consulte a NF-e e selecione o motorista/reboque')
      return
    }

    const associacao = associacoes?.find(a => a.id === associacaoSelecionada)
    if (!associacao) {
      toast.error('Associação não encontrada')
      return
    }

    // Mapear dados da NF-e para o CT-e
    const cteData = {
      // Será implementado no próximo passo
      chave_acesso_1: chaveNFE,
      // ... outros campos mapeados automaticamente
    }

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
                      {assoc.funcionario?.nome} - {assoc.veiculo_principal?.placa}
                      {assoc.veiculo_reboque1 && ` + ${assoc.veiculo_reboque1.placa}`}
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
                    <h4 className="font-medium text-gray-700">Remetente</h4>
                    <p className="text-sm text-gray-600">{nfeData.remetente.razao_social}</p>
                    <p className="text-sm text-gray-600">{nfeData.remetente.cnpj}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700">Destinatário</h4>
                    <p className="text-sm text-gray-600">{nfeData.destinatario.razao_social}</p>
                    <p className="text-sm text-gray-600">{nfeData.destinatario.cnpj}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700">Produto</h4>
                    <p className="text-sm text-gray-600">{nfeData.produto.descricao}</p>
                    <p className="text-sm text-gray-600">
                      Peso: {nfeData.produto.peso_total}kg | 
                      Valor: R$ {nfeData.produto.valor_total.toFixed(2)}
                    </p>
                  </div>

                  {associacao && (
                    <div>
                      <h4 className="font-medium text-gray-700">Motorista/Veículo</h4>
                      <p className="text-sm text-gray-600">
                        {associacao.funcionario?.nome}
                      </p>
                      <p className="text-sm text-gray-600">
                        {associacao.veiculo_principal?.placa} - {associacao.veiculo_principal?.modelo}
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