import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { DroneMarca, DroneFabricante } from '../types';
import ModalMarca from '../components/ModalMarca';
import ConfirmationModal from '../components/ConfirmationModal';

interface GerenciarMarcasProps {
  onBack: () => void;
  onEdit: (id: string) => void;
}

export default function GerenciarMarcas({ onBack, onEdit }: GerenciarMarcasProps) {
  const [marcas, setMarcas] = useState<DroneMarca[]>([]);
  const [fabricantes, setFabricantes] = useState<DroneFabricante[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [itemToDeleteName, setItemToDeleteName] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    const [marcasResult, fabricantesResult] = await Promise.all([
      supabase
        .from('drone_marcas')
        .select(`
          *,
          fabricante:drone_fabricantes (
            nome
          )
        `)
        .order('nome'),
      supabase
        .from('drone_fabricantes')
        .select('*')
        .order('nome')
    ]);

    if (marcasResult.data) {
      setMarcas(marcasResult.data as any);
    }

    if (fabricantesResult.data) {
      setFabricantes(fabricantesResult.data as DroneFabricante[]);
    }

    if (marcasResult.error) {
      console.error('Erro ao buscar marcas:', marcasResult.error);
      toast.error('Erro ao buscar marcas');
    }

    if (fabricantesResult.error) {
      console.error('Erro ao buscar fabricantes:', fabricantesResult.error);
    }

    setLoading(false);
  }

  const openDeleteModal = (id: string, nome: string) => {
    setItemToDeleteId(id);
    setItemToDeleteName(nome);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDeleteId) return;

    const { error } = await supabase
      .from('drone_marcas')
      .delete()
      .eq('id', itemToDeleteId);

    if (error) {
      console.error('Erro ao excluir marca:', error);
      toast.error('Erro ao excluir marca: ' + error.message);
    } else {
      toast.success('Marca excluída com sucesso!');
      setMarcas(prev => prev.filter(m => m.id !== itemToDeleteId));
    }

    closeModal();
  };

  const closeModal = () => {
    setIsDeleteModalOpen(false);
    setItemToDeleteId(null);
    setItemToDeleteName('');
  };

  const handleNewMarca = (marca: DroneMarca) => {
    fetchData();
  };

  if (loading) {
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

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400 mb-2">Gerenciar Marcas</h1>
          <p className="text-gray-400">Visualize, edite ou remova marcas de drones</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg transition-all shadow-lg shadow-cyan-500/30"
        >
          <Plus size={20} />
          <span>Nova Marca</span>
        </button>
      </div>

      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-950 border-b border-cyan-500/30">
            <tr>
              <th className="text-left px-6 py-4 text-cyan-400 font-semibold">Nome</th>
              <th className="text-left px-6 py-4 text-cyan-400 font-semibold">Fabricante</th>
              <th className="text-left px-6 py-4 text-cyan-400 font-semibold">Precisão GPS</th>
              <th className="text-right px-6 py-4 text-cyan-400 font-semibold">Ações</th>
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
                        onClick={() => onEdit(marca.id!)}
                        className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(marca.id!, marca.nome)}
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

      <ModalMarca
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleNewMarca}
        fabricantes={fabricantes}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeModal}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão de Marca"
        message={
          <span>
            Tem certeza que deseja excluir permanentemente{' '}
            <strong>{itemToDeleteName}</strong>?
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
