import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { DroneFabricante } from '../types';
import ModalFabricante from '../components/ModalFabricante';
import ConfirmationModal from '../components/ConfirmationModal';

interface GerenciarFabricantesProps {
  onBack: () => void;
  onEdit: (id: string) => void;
}

export default function GerenciarFabricantes({ onBack, onEdit }: GerenciarFabricantesProps) {
  const [fabricantes, setFabricantes] = useState<DroneFabricante[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [itemToDeleteName, setItemToDeleteName] = useState<string>('');

  useEffect(() => {
    fetchFabricantes();
  }, []);

  async function fetchFabricantes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('drone_fabricantes')
      .select('*')
      .order('nome');

    if (data) {
      setFabricantes(data as DroneFabricante[]);
    }

    if (error) {
      console.error('Erro ao buscar fabricantes:', error);
      toast.error('Erro ao buscar fabricantes');
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
      .from('drone_fabricantes')
      .delete()
      .eq('id', itemToDeleteId);

    if (error) {
      console.error('Erro ao excluir fabricante:', error);
      toast.error('Erro ao excluir fabricante: ' + error.message);
    } else {
      toast.success('Fabricante excluído com sucesso!');
      setFabricantes(prev => prev.filter(f => f.id !== itemToDeleteId));
    }

    closeModal();
  };

  const closeModal = () => {
    setIsDeleteModalOpen(false);
    setItemToDeleteId(null);
    setItemToDeleteName('');
  };

  const handleNewFabricante = (fabricante: DroneFabricante) => {
    setFabricantes(prev => [...prev, fabricante]);
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
          <h1 className="text-3xl font-bold text-cyan-400 mb-2">Gerenciar Fabricantes</h1>
          <p className="text-gray-400">Visualize, edite ou remova fabricantes de drones</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg transition-all shadow-lg shadow-cyan-500/30"
        >
          <Plus size={20} />
          <span>Novo Fabricante</span>
        </button>
      </div>

      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-950 border-b border-cyan-500/30">
            <tr>
              <th className="text-left px-6 py-4 text-cyan-400 font-semibold">Nome</th>
              <th className="text-left px-6 py-4 text-cyan-400 font-semibold">País de Origem</th>
              <th className="text-left px-6 py-4 text-cyan-400 font-semibold">Sistema de Unidades</th>
              <th className="text-right px-6 py-4 text-cyan-400 font-semibold">Ações</th>
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
                        onClick={() => onEdit(fabricante.id!)}
                        className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(fabricante.id!, fabricante.nome)}
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

      <ModalFabricante
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleNewFabricante}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeModal}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão de Fabricante"
        message={
          <span>
            Tem certeza que deseja excluir permanentemente{' '}
            <strong>{itemToDeleteName}</strong>?
            <span className="block mt-2 text-yellow-400">
              Atenção: Excluir um fabricante também excluirá todas as suas marcas associadas!
            </span>
            <span className="block mt-1">
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
