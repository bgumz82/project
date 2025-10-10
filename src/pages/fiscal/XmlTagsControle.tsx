
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XMarkIcon,
  FolderIcon
} from '@heroicons/react/24/outline'
import {
  getXmlTagsControle,
  getXmlTagGrupos,
  getXmlTagTemplates,
  createXmlTagControle,
  updateXmlTagControle,
  deleteXmlTagControle,
  aplicarTemplate,
  type XmlTagControle,
  type XmlTagGrupo,
  type TipoDocumentoFiscal
} from '@/lib/api/xml-tags'
import { getEmpresasFiscais } from '@/lib/api/fiscal'

export default function XmlTagsControle() {
  const [empresaSelecionada, setEmpresaSelecionada] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoFiscal>('cte')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTag, setSelectedTag] = useState<XmlTagControle | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  const queryClient = useQueryClient()

  const { data: empresas } = useQuery({
    queryKey: ['empresas-fiscais'],
    queryFn: getEmpresasFiscais
  })

  const { data: grupos } = useQuery({
    queryKey: ['xml-tag-grupos', tipoDocumento],
    queryFn: () => getXmlTagGrupos(tipoDocumento)
  })

  const { data: tags, isLoading } = useQuery({
    queryKey: ['xml-tags-controle', empresaSelecionada, tipoDocumento],
    queryFn: () => getXmlTagsControle(empresaSelecionada, tipoDocumento),
    enabled: !!empresaSelecionada
  })

  const { data: templates } = useQuery({
    queryKey: ['xml-tag-templates', tipoDocumento],
    queryFn: () => getXmlTagTemplates(tipoDocumento),
    enabled: showTemplates
  })

  const createMutation = useMutation({
    mutationFn: createXmlTagControle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['xml-tags-controle'] })
      toast.success('Tag criada com sucesso!')
      setIsModalOpen(false)
      setSelectedTag(null)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar tag')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<XmlTagControle> }) =>
      updateXmlTagControle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['xml-tags-controle'] })
      toast.success('Tag atualizada com sucesso!')
      setIsModalOpen(false)
      setSelectedTag(null)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar tag')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteXmlTagControle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['xml-tags-controle'] })
      toast.success('Tag excluída com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir tag')
    }
  })

  const templateMutation = useMutation({
    mutationFn: ({ empresaId, templateId }: { empresaId: string; templateId: string }) =>
      aplicarTemplate(empresaId, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['xml-tags-controle'] })
      toast.success('Template aplicado com sucesso!')
      setShowTemplates(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao aplicar template')
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const tagData: any = {
      empresa_id: empresaSelecionada,
      tipo_documento: tipoDocumento,
      grupo_id: formData.get('grupo_id') || null,
      tag_nome: formData.get('tag_nome') as string,
      tag_path: formData.get('tag_path') as string,
      valor_padrao: formData.get('valor_padrao') as string || null,
      obrigatoria: formData.get('obrigatoria') === 'true',
      ordem: parseInt(formData.get('ordem') as string) || 0,
      ativo: formData.get('ativo') === 'true',
      observacoes: formData.get('observacoes') as string || null
    }

    if (selectedTag) {
      updateMutation.mutate({ id: selectedTag.id, data: tagData })
    } else {
      createMutation.mutate(tagData)
    }
  }

  const tagsAgrupadas = tags?.reduce((acc, tag) => {
    const grupoNome = tag.grupo?.nome || 'Sem Grupo'
    if (!acc[grupoNome]) {
      acc[grupoNome] = []
    }
    acc[grupoNome].push(tag)
    return acc
  }, {} as Record<string, XmlTagControle[]>)

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-indigo-600 mr-3" />
            <h1 className="text-2xl font-semibold text-gray-900">
              Controle de Tags XML
            </h1>
          </div>
        </div>

        {/* Filtros */}
        <div className="mt-6 bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empresa *
              </label>
              <select
                value={empresaSelecionada}
                onChange={(e) => setEmpresaSelecionada(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Selecione uma empresa</option>
                {empresas?.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.razao_social}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Documento
              </label>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value as TipoDocumentoFiscal)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="cte">CT-e</option>
                <option value="mdfe">MDF-e</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={() => setShowTemplates(true)}
                disabled={!empresaSelecionada}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <FolderIcon className="h-5 w-5 mr-2" />
                Templates
              </button>
              <button
                onClick={() => {
                  setSelectedTag(null)
                  setIsModalOpen(true)
                }}
                disabled={!empresaSelecionada}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Nova Tag
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Tags Agrupadas */}
        {empresaSelecionada && (
          <div className="mt-6 space-y-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : tagsAgrupadas && Object.keys(tagsAgrupadas).length > 0 ? (
              Object.entries(tagsAgrupadas).map(([grupoNome, tagsDoGrupo]) => (
                <div key={grupoNome} className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">{grupoNome}</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {tagsDoGrupo.map((tag) => (
                      <div key={tag.id} className="px-4 py-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h4 className="text-sm font-medium text-gray-900">
                                {tag.tag_nome}
                              </h4>
                              {tag.obrigatoria && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  Obrigatória
                                </span>
                              )}
                              {!tag.ativo && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  Inativa
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-gray-500 font-mono">{tag.tag_path}</p>
                            {tag.valor_padrao && (
                              <p className="mt-1 text-sm text-gray-600">
                                Valor padrão: <span className="font-medium">{tag.valor_padrao}</span>
                              </p>
                            )}
                            {tag.observacoes && (
                              <p className="mt-1 text-sm text-gray-500">{tag.observacoes}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedTag(tag)
                                setIsModalOpen(true)
                              }}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Tem certeza que deseja excluir esta tag?')) {
                                  deleteMutation.mutate(tag.id)
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white shadow rounded-lg">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma tag configurada</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comece criando uma nova tag ou aplicando um template
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal de Edição/Criação */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium">
                  {selectedTag ? 'Editar Tag XML' : 'Nova Tag XML'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                    setSelectedTag(null)
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Grupo
                    </label>
                    <select
                      name="grupo_id"
                      defaultValue={selectedTag?.grupo_id || ''}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Sem grupo</option>
                      {grupos?.map((grupo) => (
                        <option key={grupo.id} value={grupo.id}>
                          {grupo.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nome da Tag *
                    </label>
                    <input
                      type="text"
                      name="tag_nome"
                      required
                      defaultValue={selectedTag?.tag_nome}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Ex: Código do Município"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Caminho da Tag (Path) *
                    </label>
                    <input
                      type="text"
                      name="tag_path"
                      required
                      defaultValue={selectedTag?.tag_path}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
                      placeholder="Ex: infCte/ide/cMunEnv"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Valor Padrão
                    </label>
                    <input
                      type="text"
                      name="valor_padrao"
                      defaultValue={selectedTag?.valor_padrao || ''}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Ordem
                      </label>
                      <input
                        type="number"
                        name="ordem"
                        defaultValue={selectedTag?.ordem || 0}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="obrigatoria"
                          value="true"
                          defaultChecked={selectedTag?.obrigatoria}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Obrigatória</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="ativo"
                          value="true"
                          defaultChecked={selectedTag?.ativo !== false}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Ativa</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Observações
                    </label>
                    <textarea
                      name="observacoes"
                      rows={3}
                      defaultValue={selectedTag?.observacoes || ''}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false)
                      setSelectedTag(null)
                    }}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                  >
                    {selectedTag ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Templates */}
        {showTemplates && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium">Templates de Tags XML</h2>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates?.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-500 cursor-pointer"
                    onClick={() => {
                      if (confirm(`Deseja aplicar o template "${template.nome}"?`)) {
                        templateMutation.mutate({
                          empresaId: empresaSelecionada,
                          templateId: template.id
                        })
                      }
                    }}
                  >
                    <h3 className="font-medium text-gray-900">{template.nome}</h3>
                    {template.descricao && (
                      <p className="mt-1 text-sm text-gray-500">{template.descricao}</p>
                    )}
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      {template.tags_json?.length || 0} tags
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
