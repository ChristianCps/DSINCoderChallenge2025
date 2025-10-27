import { useState, useEffect } from 'react';
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { PatoPrimordial } from '../types';
import { countries } from '../data/countries';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';
import { getRiskLevel } from '../utils/classification';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

interface CatalogProps {
  onSelectDuck: (id: strFng) => void;
  onNewRecord: () => void;
  onEditRecord: (id: string) => void;
}

export default function Catalog({ onSelectDuck, onNewRecord, onEditRecord }: CatalogProps) {
  const [patos, setPatos] = useState<PatoPrimordial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroPais, setFiltroPais] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroRisco, setFiltroRisco] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [itemToDeleteName, setItemToDeleteName] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPatos, setTotalPatos] = useState(0);

  useEffect(() => {
    fetchPatos();
  }, [filtroPais, filtroStatus, filtroRisco, currentPage]);

  async function fetchPatos() {
    setLoading(true);

    let query = supabase
      .from('patos_primordiais')
      .select('id, drone_numero_serie, drone_marca_id, status_hibernacao, localizacao, quantidade_mutacoes, capturado, superpoder, batimentos_cardiacos_bpm');

    let countQuery = supabase
      .from('patos_primordiais')
      .select('id', { count: 'exact', head: true });

    if (filtroPais) {
      query = query.eq('localizacao->>pais', filtroPais);
      countQuery = countQuery.eq('localizacao->>pais', filtroPais);
    }
    if (filtroStatus) {
      if (filtroStatus === 'Capturado') {
        query = query.eq('capturado', true);
        countQuery = countQuery.eq('capturado', true);
      } else {
        query = query.eq('status_hibernacao', filtroStatus).eq('capturado', false);
        countQuery = countQuery.eq('status_hibernacao', filtroStatus).eq('capturado', false);
      }
    }

    const { count, error: countError } = await countQuery;
    if (count !== null) setTotalPatos(count);
    else if (countError) toast.error(`Erro ao contar patos: ${countError.message}`);

    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error } = await query;

    if (data) {
      let filteredData = data as PatoPrimordial[];

      if (filtroRisco) {
        filteredData = filteredData.filter(pato => {
          const riscoLabel = getRiskLevel(pato).label;
          return riscoLabel === filtroRisco;
        });
      }

      setPatos(filteredData);
    }

    if (error) {
      console.error('Erro ao buscar patos:', error);
      toast.error('Falha ao carregar catálogo.');
    }

    setLoading(false);
  }

  const openDeleteModal = (id: string, name: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setItemToDeleteId(id);
    setItemToDeleteName(name);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDeleteId) return;

    try {
      const { error } = await supabase
        .from('patos_primordiais')
        .delete()
        .eq('id', itemToDeleteId);

      if (error) {
        throw error;
      }

      setPatos(patosAtuais => patosAtuais.filter(pato => pato.id !== itemToDeleteId));
      toast.success('Pato excluído com sucesso!');

    } catch (error) {
      console.error('Erro ao excluir pato:', error);
      toast.error('Falha ao excluir o registro: ' + (error as Error).message);
    }

    closeModal();
  };

  const closeModal = () => {
    setIsDeleteModalOpen(false);
    setItemToDeleteId(null);
    setItemToDeleteName('');
  };

  const getStatusColor = (pato: PatoPrimordial) => {
    if (pato.capturado) {
      return 'text-green-400 bg-green-500/20 border-green-500/50';
    }
    switch (pato.status_hibernacao) {
      case 'Desperto': return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'Em Transe': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'Hibernação Profunda': return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  const getStatusLabel = (pato: PatoPrimordial) => {
    return pato.capturado ? 'Capturado' : pato.status_hibernacao;
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-cyan-400">Catálogo de Patos Primordiais</h1>
        <button
          onClick={onNewRecord}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
        >
          <Plus size={20} />
          <span className="font-medium">Adicionar Novo Registro</span>
        </button>
      </div>

      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-cyan-400 mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filtrar por País
            </label>
            <select
              value={filtroPais}
              onChange={(e) => setFiltroPais(e.target.value)}
              className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">Todos os Países</option>
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filtrar por Status
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">Todos os Status</option>
              <option value="Desperto">Desperto</option>
              <option value="Em Transe">Em Transe</option>
              <option value="Hibernação Profunda">Hibernação Profunda</option>
              <option value="Capturado">Capturado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filtrar por Risco
            </label>
            <select
              value={filtroRisco}
              onChange={(e) => setFiltroRisco(e.target.value)}
              className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">Todos os Riscos</option>
              <option value="Nenhum">Nenhum (Capturado)</option>
              <option value="Baixo">Baixo (Hibernação)</option>
              <option value="Médio">Médio (Transe)</option>
              <option value="Alto">Alto (Transe/Desperto)</option>
              <option value="Crítico">Crítico (Desperto+)</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
        </div>
      ) : patos.length === 0 ? (
        <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-12 text-center">
          <p className="text-gray-400 text-lg mb-4">Nenhum Pato Primordial catalogado ainda</p>
          <button
            onClick={onNewRecord}
            className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg transition-all duration-200"
          >
            <Plus size={20} />
            <span>Adicionar Primeiro Registro</span>
          </button>
        </div>
      ) : (
        <>
          <div className="bg-gray-900 border border-cyan-500/30 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="bg-gray-950 border-b border-cyan-500/30">
                    <th className="text-left p-4 text-cyan-400 font-semibold whitespace-nowrap">ID</th>
                    <th className="text-left p-4 text-cyan-400 font-semibold whitespace-nowrap">Nº Série Drone</th>
                    <th className="text-left p-4 text-cyan-400 font-semibold whitespace-nowrap">Status</th>
                    <th className="text-left p-4 text-cyan-400 font-semibold whitespace-nowrap">Cidade</th>
                    <th className="text-left p-4 text-cyan-400 font-semibold whitespace-nowrap">País</th>
                    <th className="text-left p-4 text-cyan-400 font-semibold whitespace-nowrap">Nível de Mutação</th>
                    <th className="text-left p-4 text-cyan-400 font-semibold whitespace-nowrap">Risco</th>
                    <th className="text-left p-4 text-cyan-400 font-semibold whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {patos.map((pato, index) => {
                    const risco = getRiskLevel(pato);
                    return (
                      <tr
                        key={pato.id}
                        onClick={() => pato.id && onSelectDuck(pato.id)}
                        className={`border-b border-cyan-500/10 hover:bg-cyan-500/10 cursor-pointer transition-all duration-200 ${
                          index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'
                        }`}
                      >
                        <td className="p-4 text-cyan-300 font-mono whitespace-nowrap">{pato.id?.substring(0, 8)}</td>
                        <td className="p-4 text-gray-300 font-mono whitespace-nowrap">{pato.drone_numero_serie || 'N/A'}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(pato)}`}>
                            {getStatusLabel(pato)}
                          </span>
                        </td>
                        <td className="p-4 text-gray-300">{pato.localizacao.cidade}</td>
                        <td className="p-4 text-gray-300">
                          {countries.find(c => c.value === pato.localizacao.pais)?.label || pato.localizacao.pais}
                        </td>
                        <td className="p-4 text-cyan-300 font-bold text-center">{pato.quantidade_mutacoes}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${risco.className}`}>
                            {risco.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                pato.id && onEditRecord(pato.id);
                              }}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              title="Alterar"
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                            <button
                              onClick={(e) => pato.id && openDeleteModal(pato.id, pato.drone_numero_serie || pato.id.substring(0, 8), e)}
                              className="text-red-500 hover:text-red-400 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            totalCount={totalPatos}
            pageSize={PAGE_SIZE}
            onPageChange={page => setCurrentPage(page)}
          />
        </>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeModal}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão de Pato"
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
