import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PatoPrimordial, BaseOperacional } from '../types';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Clock, MapPin, Target, Building2, Activity } from 'lucide-react';

interface MissaoDetalhada {
  id: string;
  created_at: string;
  pato_id: string;
  base_id: string;
  pato_pais: string;
  pato_cidade: string;
  base_nome: string;
  status_missao: string;
  duracao_segundos: number | null;
  logs: string[] | null;
  pato: PatoPrimordial | null;
  base: BaseOperacional | null;
}

interface DetalhesMissaoProps {
  missaoId: string;
  onBack: () => void;
  onViewPato: (patoId: string) => void;
}

export default function DetalhesMissao({ missaoId, onBack, onViewPato }: DetalhesMissaoProps) {
  const [missao, setMissao] = useState<MissaoDetalhada | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetalhesMissao() {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from('missao_historico')
          .select(`
            *,
            pato:patos_primordiais (
              *,
              marca:drone_marcas(
                nome,
                fabricante:drone_fabricantes(nome)
              )
            ),
            base:bases_operacionais (*)
          `)
          .eq('id', missaoId)
          .maybeSingle();

        if (dbError) throw dbError;

        if (data) {
          setMissao(data as MissaoDetalhada);
        } else {
          setError('Missão não encontrada.');
        }
      } catch (err: any) {
        console.error('Erro ao buscar detalhes da missão:', err);
        setError(`Falha ao carregar detalhes: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetalhesMissao();
  }, [missaoId]);

  const formatarDuracao = (segundos: number | null) => {
    if (segundos === null || segundos === undefined) return 'N/A';
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusInfo = (status: string) => {
    if (status.startsWith('Sucesso')) return { icon: CheckCircle, color: 'text-green-400' };
    if (status.startsWith('Falha - Drone Destruído') || status.startsWith('Falha - Alvo Morto'))
      return { icon: XCircle, color: 'text-red-400' };
    if (status.startsWith('Falha')) return { icon: AlertCircle, color: 'text-yellow-400' };
    return { icon: AlertCircle, color: 'text-gray-400' };
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen text-gray-300 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen text-gray-300">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft size={20} /> Voltar ao Histórico
        </button>
        <div className="bg-red-900/50 border border-red-700 text-red-200 p-6 rounded-lg">
          <h3 className="font-bold mb-2">Erro</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!missao) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen text-gray-300">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft size={20} /> Voltar ao Histórico
        </button>
        <p>Missão não encontrada.</p>
      </div>
    );
  }

  const StatusIcon = getStatusInfo(missao.status_missao).icon;
  const statusColor = getStatusInfo(missao.status_missao).color;

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-gray-300">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <ArrowLeft size={20} /> Voltar ao Histórico
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Detalhes da Missão <span className="text-gray-500 text-lg font-mono">#{missao.id.substring(0, 8)}</span>
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-gray-400 text-sm">
          <span className="flex items-center gap-1">
            <Clock size={16} /> {new Date(missao.created_at).toLocaleString('pt-BR')}
          </span>
          <span className={`flex items-center gap-1 font-semibold ${statusColor}`}>
            <StatusIcon size={16} /> {missao.status_missao}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={16} /> Duração: {formatarDuracao(missao.duracao_segundos)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <Target size={20} /> Alvo
          </h2>
          {missao.pato ? (
            <div className="space-y-2 text-sm">
              <p>
                <strong className="text-gray-400">ID:</strong>{' '}
                <button
                  onClick={() => onViewPato(missao.pato_id)}
                  className="text-cyan-400 hover:underline"
                >
                  {missao.pato_id.substring(0, 8)}
                </button>
              </p>
              <p>
                <strong className="text-gray-400">Local:</strong> {missao.pato_cidade || 'N/A'}, {missao.pato_pais}
              </p>
              <p>
                <strong className="text-gray-400">Status:</strong> {missao.pato.status_hibernacao}
              </p>
              <p>
                <strong className="text-gray-400">Mutações:</strong> {missao.pato.quantidade_mutacoes}
              </p>
              {missao.pato.superpoder && (
                <p>
                  <strong className="text-gray-400">Poder:</strong> {missao.pato.superpoder.nome} (
                  {missao.pato.superpoder.tipo})
                </p>
              )}
              {missao.pato.batimentos_cardiacos_bpm && (
                <p>
                  <strong className="text-gray-400">BPM:</strong> {missao.pato.batimentos_cardiacos_bpm}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 italic">
              Detalhes do Pato não disponíveis (registro pode ter sido excluído).
            </p>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <Building2 size={20} /> Base de Lançamento
          </h2>
          {missao.base ? (
            <div className="space-y-2 text-sm">
              <p>
                <strong className="text-gray-400">Nome:</strong> {missao.base.nome}{' '}
                {missao.base.is_sede && <span className="text-yellow-400">(SEDE)</span>}
              </p>
              <p>
                <strong className="text-gray-400">Local:</strong> {missao.base.cidade || 'N/A'}, {missao.base.pais}
              </p>
              <p>
                <strong className="text-gray-400">Coords:</strong> {missao.base.latitude.toFixed(4)},{' '}
                {missao.base.longitude.toFixed(4)}
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p>
                <strong className="text-gray-400">Nome:</strong> {missao.base_nome}
              </p>
              <p className="text-gray-500 italic">Detalhes completos não disponíveis.</p>
            </div>
          )}
        </div>

        {missao.pato?.marca && (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-blue-400 mb-3 flex items-center gap-2">
              <Activity size={20} /> Drone Utilizado
            </h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong className="text-gray-400">Nº Série:</strong> {missao.pato.drone_numero_serie || 'N/A'}
              </p>
              <p>
                <strong className="text-gray-400">Marca:</strong> {missao.pato.marca.nome}
              </p>
              <p>
                <strong className="text-gray-400">Fabricante:</strong>{' '}
                {missao.pato.marca.fabricante?.nome || 'N/A'}
              </p>
              <p>
                <strong className="text-gray-400">País:</strong> {missao.pato.drone_pais_origem || 'N/A'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
        <h2 className="text-xl font-semibold text-blue-400 mb-3 flex items-center gap-2">
          <MapPin size={20} /> Log Detalhado da Missão
        </h2>
        <div className="bg-gray-900 p-4 rounded max-h-96 overflow-y-auto border border-gray-600">
          {missao.logs && missao.logs.length > 0 ? (
            missao.logs
              .slice()
              .reverse()
              .map((log, index) => (
                <p key={index} className="text-sm text-gray-300 font-mono mb-1 leading-relaxed">
                  <span className="text-blue-500 mr-2">{'>'}</span>
                  {log}
                </p>
              ))
          ) : (
            <p className="text-sm text-gray-500 italic">Nenhum log detalhado registrado para esta missão.</p>
          )}
        </div>
      </div>
    </div>
  );
}
