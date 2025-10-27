import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Wrench } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { DroneFabricante, DroneMarca } from '../types';
import ModalFabricante from '../components/ModalFabricante';
import ModalMarca from '../components/ModalMarca';
import ConfirmationModal from '../components/ConfirmationModal';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

type ActiveTab = 'fabricantes' | 'marcas';

interface GerenciarDronesProps {
  onBack: () => void;
  onEditFabricante: (id: string) => void;
  onEditMarca: (id: string) => void;
}

export default function GerenciarDrones({ onBack, onEditFabricante, onEditMarca }: GerenciarDronesProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('fabricantes');
  const [fabricantes, setFabricantes] = useState<DroneFabricante[]>([]);
  const [marcas, setMarcas] = useState<DroneMarca[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalFabricanteOpen, setModalFabricanteOpen] = useState(false);
  const [modalMarcaOpen, setModalMarcaOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, nome: string} | null>(null);
  const [currentPageFabricantes, setCurrentPageFabricantes] = useState(1);
  const [totalFabricantes, setTotalFabricantes] = useState(0);
  const [currentPageMarcas, setCurrentPageMarcas] = useState(1);
  const [totalMarcas, setTotalMarcas] = useState(0);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const fromFab = (currentPageFabricantes - 1) * PAGE_SIZE;
    const toFab = fromFab + PAGE_SIZE - 1;

    const fromMarca = (currentPageMarcas - 1) * PAGE_SIZE;
    const toMarca = fromMarca + PAGE_SIZE - 1;

    const [fabResponse, fabCountResponse, marcaResponse, marcaCountResponse] = await Promise.all([
      supabase.from('drone_fabricantes').select('*').order('nome').range(fromFab, toFab),
      supabase.from('drone_fabricantes').select('id', { count: 'exact', head: true }),
      supabase.from('drone_marcas').select(`
        *,
        fabricante:drone_fabricantes (
          nome
        )
      `).order('nome').range(fromMarca, toMarca),
      supabase.from('drone_marcas').select('id', { count: 'exact', head: true })
    ]);

    if (fabResponse.data) {
      setFabricantes(fabResponse.data as DroneFabricante[]);
    }

    if (marcaResponse.data) {
      setMarcas(marcaResponse.data as any);
    }

    if (fabCountResponse.count !== null) setTotalFabricantes(fabCountResponse.count);
    if (marcaCountResponse.count !== null) setTotalMarcas(marcaCountResponse.count);

    if (fabResponse.error) {
      console.error('Erro Fabricantes:', fabResponse.error);
      toast.error(`Erro ao buscar fabricantes: ${fabResponse.error.message}`);
    }

    if (marcaResponse.error) {
      console.error('Erro Marcas:', marcaResponse.error);
      toast.error(`Erro ao buscar marcas: ${marcaResponse.error.message}`);
    }

    setIsLoading(false);
  }, [currentPageFabricantes, currentPageMarcas]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDeleteModal = (id: string, nome: string) => {
    setItemToDelete({ id, nome });
    setIsDeleteModalOpen(true);
  };

  const closeModal = () => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const isFabricante = activeTab === 'fabricantes';
    const tabela = isFabricante ? 'drone_fabricantes' : 'drone_marcas';

    const { error } = await supabase.from(tabela).delete().eq('id', itemToDelete.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${isFabricante ? 'Fabricante' : 'Marca'} "${itemToDelete.nome}" excluído(a).`);
      fetchData();
    }
    closeModal();
  };

  const handleDeleteFabricante = async (id: string, nome: string) => {
    const { data: marcasData } = await supabase
      .from('drone_marcas')
      .select('id')
      .eq('fabricante_id', id);

    if (marcasData && marcasData.length > 0) {
      const marcaIds = marcasData.map(m => m.id);
      const { count } = await supabase
        .from('patos_primordiais')
        .select('id', { count: 'exact', head: true })
        .in('drone_marca_id', marcaIds);

      if (count && count > 0) {
        toast.error(`Não é possível excluir: Marcas deste fabricante estão vinculadas a ${count} pato(s) registrado(s).`);
        return;
      }
    }

    openDeleteModal(id, nome);
  };

  const handleDeleteMarca = async (id: string, nome: string) => {
    const { count } = await supabase
      .from('patos_primordiais')
      .select('id', { count: 'exact', head: true })
      .eq('drone_marca_id', id);

    if (count && count > 0) {
      toast.error(`Não é possível excluir: Esta marca está vinculada a ${count} pato(s) registrado(s).`);
      return;
    }

    openDeleteModal(id, nome);
  };

  const handleNewFabricante = (fabricante: DroneFabricante) => {
    fetchData();
  };

  const handleNewMarca = (marca: DroneMarca) => {
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 transition-colors duration-200"
        >
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </button>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 transition-colors duration-200"
      >
        <ArrowLeft size={20} />
        <span>Voltar</span>
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Wrench className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">Gerenciar Drones</h1>
          <p className="text-gray-400">Configure fabricantes e marcas de drones</p>
        </div>
      </div>

      <div className="mb-6 border-b border-cyan-500/30">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('fabricantes')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'fabricantes'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-500'
            }`}
          >
            Fabricantes ({fabricantes.length})
          </button>
          <button
            onClick={() => setActiveTab('marcas')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'marcas'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-500'
            }`}
          >
            Marcas ({marcas.length})
          </button>
        </nav>
      </div>

      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg overflow-hidden">
        {activeTab === 'fabricantes' && (
          <div>
            <div className="flex justify-between items-center p-6 border-b border-cyan-500/30">
              <h2 className="text-xl font-semibold text-white">Fabricantes Cadastrados</h2>
              <button
                onClick={() => setModalFabricanteOpen(true)}
                className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg transition-all shadow-lg shadow-cyan-500/30"
              >
                <Plus size={20} />
                <span>Novo Fabricante</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-950 border-b border-cyan-500/30">
                  <tr>
                    <th className="text-left px-6 py-4 text-cyan-400 font-semibold whitespace-nowrap">Nome</th>
                    <th className="text-left px-6 py-4 text-cyan-400 font-semibold whitespace-nowrap">País de Origem</th>
                    <th className="text-left px-6 py-4 text-cyan-400 font-semibold whitespace-nowrap">Sistema de Unidades</th>
                    <th className="text-right px-6 py-4 text-cyan-400 font-semibold whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {fabricantes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Nenhum fabricante cadastrado
                    </td>
                  </tr>
                ) : (
                  fabricantes.map((fabricante) => (
                    <tr key={fabricante.id} className="border-b border-cyan-500/10 hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-gray-200">{fabricante.nome}</td>
                      <td className="px-6 py-4 text-gray-200">{fabricante.pais_origem}</td>
                      <td className="px-6 py-4 text-gray-200">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                          fabricante.unidade_medida_padrao === 'metrico'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                        }`}>
                          {fabricante.unidade_medida_padrao === 'metrico' ? 'Métrico' : 'Imperial'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => onEditFabricante(fabricante.id!)}
                            className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteFabricante(fabricante.id!, fabricante.nome)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPageFabricantes}
              totalCount={totalFabricantes}
              pageSize={PAGE_SIZE}
              onPageChange={page => setCurrentPageFabricantes(page)}
            />
          </div>
        )}

        {activeTab === 'marcas' && (
          <div>
            <div className="flex justify-between items-center p-6 border-b border-cyan-500/30">
              <h2 className="text-xl font-semibold text-white">Marcas Cadastradas</h2>
              <button
                onClick={() => setModalMarcaOpen(true)}
                className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg transition-all shadow-lg shadow-cyan-500/30"
              >
                <Plus size={20} />
                <span>Nova Marca</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-950 border-b border-cyan-500/30">
                  <tr>
                    <th className="text-left px-6 py-4 text-cyan-400 font-semibold whitespace-nowrap">Nome</th>
                    <th className="text-left px-6 py-4 text-cyan-400 font-semibold whitespace-nowrap">Fabricante</th>
                    <th className="text-left px-6 py-4 text-cyan-400 font-semibold whitespace-nowrap">Precisão GPS</th>
                    <th className="text-right px-6 py-4 text-cyan-400 font-semibold whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {marcas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma marca cadastrada
                    </td>
                  </tr>
                ) : (
                  marcas.map((marca) => (
                    <tr key={marca.id} className="border-b border-cyan-500/10 hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-gray-200">{marca.nome}</td>
                      <td className="px-6 py-4 text-gray-200">
                        {(marca as any).fabricante?.nome || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-gray-200">
                        <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 px-3 py-1 rounded-full text-sm">
                          {marca.precisao_valor} {marca.precisao_unidade}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => onEditMarca(marca.id!)}
                            className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteMarca(marca.id!, marca.nome)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPageMarcas}
              totalCount={totalMarcas}
              pageSize={PAGE_SIZE}
              onPageChange={page => setCurrentPageMarcas(page)}
            />
          </div>
        )}
      </div>

      <ModalFabricante
        isOpen={modalFabricanteOpen}
        onClose={() => setModalFabricanteOpen(false)}
        onSuccess={handleNewFabricante}
      />

      <ModalMarca
        isOpen={modalMarcaOpen}
        onClose={() => setModalMarcaOpen(false)}
        onSuccess={handleNewMarca}
        fabricantes={fabricantes}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeModal}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message={
          <span>
            Tem certeza que deseja excluir permanentemente{' '}
            <strong>{itemToDelete?.nome || ''}</strong>?
            {activeTab === 'fabricantes' &&
              <span className="block mt-2 text-yellow-400">
                Atenção: Excluir este fabricante também excluirá todas as suas marcas associadas (que não tenham patos vinculados).
              </span>
            }
            <span className="block mt-2 text-yellow-400">
              Esta ação não pode ser desfeita.
            </span>
          </span>
        }
        confirmText="Excluir"
        confirmVariant="danger"
      />
    </div>
  );
}
