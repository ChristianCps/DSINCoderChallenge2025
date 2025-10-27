import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, Calendar, MapPin, Building2, CheckCircle, XCircle, Clock } from 'lucide-react';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 5;

interface MissaoHistorico {
  id: string;
  created_at: string;
  pato_pais: string;
  pato_cidade: string;
  base_nome: string;
  status_missao: string;
  duracao_segundos: number | null;
  logs: string[] | null;
}

interface HistoricoMissoesProps {
  onBack: () => void;
  onViewDetails: (missaoId: string) => void;
}

export default function HistoricoMissoes({ onBack, onViewDetails }: HistoricoMissoesProps) {
  const [historico, setHistorico] = useState<MissaoHistorico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMissoes, setTotalMissoes] = useState(0);

  useEffect(() => {
    async function fetchHistorico() {
      setIsLoading(true);
      setErro(null);

      try {
        const { count, error: countError } = await supabase
          .from('missao_historico')
          .select('id', { count: 'exact', head: true });

        if (count !== null) setTotalMissoes(count);
        else if (countError) setErro(`Erro ao contar missões: ${countError.message}`);

        const from = (currentPage - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from('missao_historico')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) {
          setErro(`Erro ao carregar histórico: ${error.message}`);
        } else {
          setHistorico(data || []);
        }
      } catch (err: any) {
        setErro(`Erro inesperado: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistorico();
  }, [currentPage]);

  const formatarData = (dataISO: string) => {
    const data = new Date(dataISO);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatarDuracao = (segundos: number | null) => {
    if (!segundos) return '-';
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}m ${segs}s`;
  };

  const getStatusIcon = (status: string) => {
    if (status.toLowerCase().includes('sucesso')) {
      return <CheckCircle className="text-green-400" size={20} />;
    }
    return <XCircle className="text-red-400" size={20} />;
  };

  const getStatusColor = (status: string) => {
    if (status.toLowerCase().includes('sucesso')) {
      return 'text-green-400';
    }
    return 'text-red-400';
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-gray-300">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <ArrowLeft size={20} />
        Voltar ao Dashboard
      </button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Histórico de Missões</h1>
        <p className="text-gray-400">Registro completo de todas as operações de captura realizadas pela DSIN</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
      )}

      {erro && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 p-6 rounded-lg">
          <h3 className="font-bold mb-2">Erro</h3>
          <p>{erro}</p>
        </div>
      )}

      {!isLoading && !erro && historico.length === 0 && (
        <div className="bg-gray-800 border border-gray-700 p-8 rounded-lg text-center">
          <p className="text-gray-400 text-lg">Nenhuma missão registrada ainda.</p>
          <p className="text-gray-500 text-sm mt-2">Complete missões de captura para vê-las aqui.</p>
        </div>
      )}

      {!isLoading && !erro && historico.length > 0 && (
        <div className="space-y-4">
          {historico.map((missao) => (
            <div key={missao.id} className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div className="flex items-start gap-3">
                    <Calendar size={20} className="text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {formatarData(missao.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin size={20} className="text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">{missao.pato_pais}</div>
                      <div className="text-xs text-gray-500">{missao.pato_cidade}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Building2 size={20} className="text-gray-400 mt-1 flex-shrink-0" />
                    <div className="text-sm text-gray-300">{missao.base_nome}</div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock size={20} className="text-gray-400 mt-1 flex-shrink-0" />
                    <div className="text-sm text-gray-400">{formatarDuracao(missao.duracao_segundos)}</div>
                  </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(missao.status_missao)}
                    <span className={`text-sm font-medium ${getStatusColor(missao.status_missao)}`}>
                      {missao.status_missao}
                    </span>
                  </div>
                  <button
                    onClick={() => onViewDetails(missao.id)}
                    className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                  >
                    Ver Detalhes
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !erro && historico.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalCount={totalMissoes}
          pageSize={PAGE_SIZE}
          onPageChange={page => setCurrentPage(page)}
        />
      )}
    </div>
  );
}
