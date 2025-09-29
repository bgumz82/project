
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ShieldCheckIcon,
  XMarkIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import {
  getApolicesSeguro,
  createApoliceSeguro,
  updateApoliceSeguro,
  deleteApoliceSeguro,
  getEmpresasFiscais,
  formatCNPJ,
  type ApoliceSeguro,
  type ApoliceSeguroCreate,
} from "@/lib/api/fiscal";
import toast from "react-hot-toast";

const STATUS_LABELS = {
  ativa: "Ativa",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

const STATUS_COLORS = {
  ativa: "bg-green-100 text-green-800",
  vencida: "bg-red-100 text-red-800", 
  cancelada: "bg-gray-100 text-gray-800",
};

export default function ApolicesSeguro() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApolice, setSelectedApolice] = useState<ApoliceSeguro | null>(null);
  const [filterStatus, setFilterStatus] = useState<"todos" | "ativa" | "vencida" | "cancelada">("todos");
  const [filterAtivo, setFilterAtivo] = useState<"todos" | "ativo" | "inativo">("todos");

  const queryClient = useQueryClient();

  const { data: apolices, isLoading } = useQuery({
    queryKey: ["apolices-seguro"],
    queryFn: getApolicesSeguro,
    retry: 3,
    staleTime: 1000 * 60 * 5,
  });

  const { data: empresas } = useQuery({
    queryKey: ["empresas-fiscais"],
    queryFn: getEmpresasFiscais,
  });

  const createMutation = useMutation({
    mutationFn: createApoliceSeguro,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apolices-seguro"] });
      toast.success("Apólice de seguro criada com sucesso!");
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Error creating apolice:", error);
      toast.error(error.message || "Erro ao criar apólice de seguro");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ApoliceSeguroCreate>;
    }) => updateApoliceSeguro(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apolices-seguro"] });
      toast.success("Apólice de seguro atualizada com sucesso!");
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Error updating apolice:", error);
      toast.error(error.message || "Erro ao atualizar apólice de seguro");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApoliceSeguro,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apolices-seguro"] });
      toast.success("Apólice de seguro excluída com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error deleting apolice:", error);
      toast.error(error.message || "Erro ao excluir apólice de seguro");
    },
  });

  const resetForm = () => {
    setSelectedApolice(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Validar campos obrigatórios no frontend
    const empresa_id = formData.get("empresa_id") as string;
    const numero_apolice = formData.get("numero_apolice") as string;
    const identificador = formData.get("identificador") as string;
    const data_inicial = formData.get("data_inicial") as string;
    const data_final = formData.get("data_final") as string;
    const limite_averbacao = parseFloat(formData.get("limite_averbacao") as string) || 0;

    // Validações
    if (!empresa_id) {
      toast.error("Selecione uma empresa");
      return;
    }
    if (!numero_apolice.trim()) {
      toast.error("Número da apólice é obrigatório");
      return;
    }
    if (!identificador.trim()) {
      toast.error("Identificador é obrigatório");
      return;
    }
    if (!data_inicial) {
      toast.error("Data inicial é obrigatória");
      return;
    }
    if (!data_final) {
      toast.error("Data final é obrigatória");
      return;
    }
    if (limite_averbacao <= 0) {
      toast.error("Limite de averbação deve ser maior que zero");
      return;
    }

    const seguradora_nome = formData.get("seguradora_nome") as string;
    const seguradora_cnpj = formData.get("seguradora_cnpj") as string;
    
    if (!seguradora_nome.trim()) {
      toast.error("Nome da seguradora é obrigatório");
      return;
    }
    
    if (!seguradora_cnpj.trim()) {
      toast.error("CNPJ da seguradora é obrigatório");
      return;
    }
    
    const cnpjLimpo = seguradora_cnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) {
      toast.error("CNPJ da seguradora deve conter 14 dígitos");
      return;
    }

    // Validar datas
    const dataIni = new Date(data_inicial);
    const dataFim = new Date(data_final);
    
    if (dataFim <= dataIni) {
      toast.error("Data final deve ser maior que a data inicial");
      return;
    }

    const apoliceData: ApoliceSeguroCreate = {
      empresa_id,
      numero_apolice: numero_apolice.trim(),
      identificador: identificador.trim(),
      data_inicial,
      data_final,
      limite_averbacao,
      seguradora_nome: seguradora_nome.trim(),
      seguradora_cnpj: cnpjLimpo,
      status: formData.get("status") as "ativa" | "vencida" | "cancelada",
      observacoes: (formData.get("observacoes") as string) || null,
      ativo: formData.get("ativo") !== "false",
    };

    if (selectedApolice) {
      updateMutation.mutate({ id: selectedApolice.id, data: apoliceData });
    } else {
      createMutation.mutate(apoliceData);
    }
  };

  const handleEdit = (apolice: ApoliceSeguro) => {
    setSelectedApolice(apolice);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (
      window.confirm("Tem certeza que deseja excluir esta apólice de seguro?")
    ) {
      deleteMutation.mutate(id);
    }
  };

  const filteredApolices = apolices?.filter((a) => {
    try {
      const statusMatch =
        filterStatus === "todos" || a.status === filterStatus;
      const ativoMatch =
        filterAtivo === "todos" ||
        (filterAtivo === "ativo" && a.ativo) ||
        (filterAtivo === "inativo" && !a.ativo);
      return statusMatch && ativoMatch;
    } catch (error) {
      console.error("Erro ao filtrar apólice:", a, error);
      return false;
    }
  }) || [];

  // Verificar status automaticamente baseado na data
  useEffect(() => {
    if (apolices && apolices.length > 0) {
      try {
        const hoje = new Date();
        apolices.forEach((apolice) => {
          if (apolice.data_final && apolice.status === "ativa") {
            const dataFinal = new Date(apolice.data_final);
            if (!isNaN(dataFinal.getTime()) && dataFinal < hoje) {
              // Atualizar status para vencida automaticamente
              updateMutation.mutate({ 
                id: apolice.id, 
                data: { status: "vencida" } 
              });
            }
          }
        });
      } catch (error) {
        console.error("Erro ao verificar status das apólices:", error);
      }
    }
  }, [apolices]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-8 w-8 text-indigo-600 mr-3" />
            <h1 className="text-2xl font-semibold text-gray-900">
              Apólices de Seguro
            </h1>
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Nova Apólice
          </button>
        </div>

        {/* Filtros */}
        <div className="mt-6 bg-white shadow rounded-lg p-4">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                Status:
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="todos">Todos</option>
                <option value="ativa">Ativas</option>
                <option value="vencida">Vencidas</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                Situação:
              </label>
              <select
                value={filterAtivo}
                onChange={(e) => setFilterAtivo(e.target.value as any)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="todos">Todos</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
              </select>
            </div>
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
                        Empresa
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Apólice
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Vigência
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Limite / Seguradora
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredApolices && filteredApolices.length > 0 ? filteredApolices.map((apolice) => (
                      <tr key={apolice.id}>
                        <td className="px-3 py-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">
                              {apolice.empresa?.razao_social || "N/A"}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              {apolice.empresa?.cnpj ? formatCNPJ(apolice.empresa.cnpj) : "N/A"}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">
                              {apolice.numero_apolice}
                            </div>
                            <div className="text-sm text-gray-600">
                              {apolice.identificador}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <div className="space-y-1">
                            <div className="flex items-center text-green-600">
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              <span className="text-xs">
                                {apolice.data_inicial ? new Date(apolice.data_inicial).toLocaleDateString("pt-BR") : "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center text-red-600">
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              <span className="text-xs">
                                {apolice.data_final ? new Date(apolice.data_final).toLocaleDateString("pt-BR") : "N/A"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <CurrencyDollarIcon className="h-4 w-4 text-green-500 mr-1" />
                              <span className="font-medium">
                                R$ {(apolice.limite_averbacao || 0).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600">
                              {apolice.seguradora_nome || "N/A"}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {apolice.seguradora_cnpj ? formatCNPJ(apolice.seguradora_cnpj) : "N/A"}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <div className="space-y-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                STATUS_COLORS[apolice.status]
                              }`}
                            >
                              {STATUS_LABELS[apolice.status]}
                            </span>
                            <div>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  apolice.ativo
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {apolice.ativo ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleEdit(apolice)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(apolice.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                          {isLoading ? "Carregando..." : "Nenhuma apólice encontrada"}
                        </td>
                      </tr>
                    )}
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
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">
                {selectedApolice
                  ? "Editar Apólice de Seguro"
                  : "Nova Apólice de Seguro"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-1">
                  <div>
                    <label
                      htmlFor="empresa_id"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Empresa (Emissor) *
                    </label>
                    <select
                      name="empresa_id"
                      id="empresa_id"
                      defaultValue={selectedApolice?.empresa_id}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Selecione uma empresa</option>
                      {empresas
                        ?.filter((e) => e.status === "ativo")
                        .map((empresa) => (
                          <option key={empresa.id} value={empresa.id}>
                            {empresa.razao_social} - {formatCNPJ(empresa.cnpj)}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Informações da Apólice */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Informações da Apólice
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="numero_apolice"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Número da Apólice *
                      </label>
                      <input
                        type="text"
                        name="numero_apolice"
                        id="numero_apolice"
                        defaultValue={selectedApolice?.numero_apolice}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Ex: 123456789"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="identificador"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Identificador *
                      </label>
                      <input
                        type="text"
                        name="identificador"
                        id="identificador"
                        defaultValue={selectedApolice?.identificador}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Ex: Apólice Principal 2025"
                      />
                    </div>
                  </div>
                </div>

                {/* Vigência */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Vigência
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="data_inicial"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Data Inicial *
                      </label>
                      <input
                        type="date"
                        name="data_inicial"
                        id="data_inicial"
                        defaultValue={selectedApolice?.data_inicial?.split('T')[0]}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="data_final"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Data Final *
                      </label>
                      <input
                        type="date"
                        name="data_final"
                        id="data_final"
                        defaultValue={selectedApolice?.data_final?.split('T')[0]}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Seguradora */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Dados da Seguradora
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="seguradora_nome"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Nome da Seguradora *
                      </label>
                      <input
                        type="text"
                        name="seguradora_nome"
                        id="seguradora_nome"
                        defaultValue={selectedApolice?.seguradora_nome}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Ex: Seguradora ABC S/A"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="seguradora_cnpj"
                        className="block text-sm font-medium text-gray-700"
                      >
                        CNPJ da Seguradora *
                      </label>
                      <input
                        type="text"
                        name="seguradora_cnpj"
                        id="seguradora_cnpj"
                        defaultValue={selectedApolice?.seguradora_cnpj}
                        required
                        maxLength={18}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                  </div>
                </div>

                {/* Valores */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Limite de Averbação
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-1">
                    <div>
                      <label
                        htmlFor="limite_averbacao"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Limite de Averbação (R$) *
                      </label>
                      <input
                        type="number"
                        name="limite_averbacao"
                        id="limite_averbacao"
                        step="0.01"
                        min="0"
                        defaultValue={selectedApolice?.limite_averbacao}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Configurações */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Configurações
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="status"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Status
                      </label>
                      <select
                        name="status"
                        id="status"
                        defaultValue={selectedApolice?.status || "ativa"}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="ativa">Ativa</option>
                        <option value="vencida">Vencida</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="ativo"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Situação
                      </label>
                      <select
                        name="ativo"
                        id="ativo"
                        defaultValue={
                          selectedApolice?.ativo !== false ? "true" : "false"
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="observacoes"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Observações
                  </label>
                  <textarea
                    name="observacoes"
                    id="observacoes"
                    rows={3}
                    defaultValue={selectedApolice?.observacoes || ""}
                    placeholder="Observações sobre a apólice..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {selectedApolice ? "Atualizando..." : "Cadastrando..."}
                    </>
                  ) : selectedApolice ? (
                    "Atualizar"
                  ) : (
                    "Cadastrar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
