import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PatoPrimordial, BaseOperacional } from '../types';
import { calcularVisaoDeCaptura, ClassificacaoPato } from '../utils/classification';
import { Target, AlertTriangle, DollarSign, Award, MapPin, Rocket } from 'lucide-react';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

interface VisaoCapturaProps {
  onStartMission: (patoId: string, baseId: string) => void;
}

export default function VisaoCaptura({ onStartMission }: VisaoCapturaProps) {
  const [bases, setBases] = useState<BaseOperacional[]>([]);
  const [patos, setPatos] = useState<PatoPrimordial[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<string>('');
  const [classificacoes, setClassificacoes] = useState<Map<string, ClassificacaoPato>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPatos, setTotalPatos] = useState(0);

  useEffect(() => {
    async function fetchInitialData() {
      setIsLoading(true);
      setError(null);

      try {
        const { count, error: countError } = await supabase
          .from('patos_primordiais')
          .select('id', { count: 'exact', head: true })
          .eq('capturado', false);

        if (count !== null) setTotalPatos(count);
        else if (countError) throw new Error(`Erro ao contar patos: ${countError.message}`);

        const from = (currentPage - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const [patosResponse, basesResponse] = await Promise.all([
          supabase.from('patos_primordiais').select('*').eq('capturado', false).range(from, to),
          supabase.from('bases_operacionais').select('*').order('is_sede', { ascending: false })
        ]);

        if (patosResponse.error) {
          throw new Error(`Falha ao buscar patos: ${patosResponse.error.message}`);
        }
        if (basesResponse.error) {
          throw new Error(`Falha ao buscar bases: ${basesResponse.error.message}`);
        }

        setPatos(patosResponse.data || []);

        const basesData = basesResponse.data || [];
        setBases(basesData);

        if (basesData.length > 0) {
          setSelectedBaseId(basesData[0].id!);
        } else {
          setError("Nenhuma Base Operacional cadastrada. Por favor, adicione uma base primeiro.");
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInitialData();
  }, [currentPage]);

  useEffect(() => {
    if (!selectedBaseId || patos.length === 0 || bases.length === 0) return;

    const baseSelecionada = bases.find(b => b.id === selectedBaseId);
    if (!baseSelecionada) return;

    const novasClassificacoes = new Map<string, ClassificacaoPato>();

    for (const pato of patos) {
      try {
        const classificacao = calcularVisaoDeCaptura(pato, baseSelecionada);
        novasClassificacoes.set(pato.id!, classificacao);
      } catch (e: any) {
        console.error(`Falha ao classificar pato ${pato.id}: ${e.message}`);
      }
    }

    setClassificacoes(novasClassificacoes);

  }, [selectedBaseId, patos, bases]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Desperto':
        return 'text-red-400';
      case 'Em Transe':
        return 'text-yellow-400';
      case 'Hibernação Profunda':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getCustoColor = (custo: string) => {
    switch (custo) {
      case 'Extremo':
        return 'text-red-500 font-bold';
      case 'Alto':
        return 'text-orange-400';
      case 'Médio':
        return 'text-yellow-400';
      case 'Baixo':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getRiscoColor = (risco: string) => {
    switch (risco) {
      case 'Extremo':
        return 'text-red-500 font-bold';
      case 'Alto':
        return 'text-yellow-500';
      case 'Médio':
        return 'text-blue-400';
      case 'Baixo':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getValorColor = (valor: string) => {
    switch (valor) {
      case 'Inestimável':
        return 'text-purple-400 font-bold';
      case 'Alto':
        return 'text-green-400';
      case 'Médio':
        return 'text-gray-300';
      case 'Baixo':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  };

  const getDificuldadeColor = (nivel: string) => {
    if (nivel === "Extrema") return "text-red-500 font-bold";
    if (nivel === "Alta") return "text-orange-400";
    if (nivel === "Moderada") return "text-yellow-400";
    if (nivel === "Baixa") return "text-blue-400";
    return "text-green-400";
  };

  const baseSelecionada = bases.find(b => b.id === selectedBaseId);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Target className="text-cyan-400" size={32} />
            <h1 className="text-3xl font-bold text-white">Operação Visão de Captura</h1>
          </div>
          <p className="text-gray-400">Sistema de Análise Tática para Missões de Captura</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg">
                <h3 className="font-bold mb-1">Erro de Missão</h3>
                <p>{error}</p>
              </div>
            )}

            {bases.length > 0 && (
            <div className="mb-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div>
                <label htmlFor="baseSelect" className="block text-sm font-medium text-gray-300 mb-2">
                  <MapPin className="inline mr-2" size={18} />
                  Planejar Lançamento da Base:
                </label>
                <select
                  id="baseSelect"
                  value={selectedBaseId}
                  onChange={(e) => setSelectedBaseId(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                >
                  <option value="" disabled>Selecione uma base...</option>
                  {bases.map(base => (
                    <option key={base.id} value={base.id}>
                      {base.is_sede ? `🏢 [SEDE] ${base.nome}` : `📍 [FILIAL] ${base.nome}`} - {base.cidade ? `${base.cidade}, ` : ''}{base.pais}
                    </option>
                  ))}
                </select>
                {baseSelecionada && (
                  <div className="mt-3 text-sm text-gray-400">
                    Base: <span className="text-cyan-400 font-medium">{baseSelecionada.nome}</span>
                    {' '}• Coordenadas: {baseSelecionada.latitude.toFixed(4)}, {baseSelecionada.longitude.toFixed(4)}
                  </div>
                )}
              </div>
            </div>
            )}

            {patos.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                <p className="text-gray-400">Nenhum Pato Primordial registrado no sistema.</p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-750">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Alvo (País)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          <MapPin className="inline mr-1" size={14} />
                          Distância (KM)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          <DollarSign className="inline mr-1" size={14} />
                          Custo Op.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          <AlertTriangle className="inline mr-1" size={14} />
                          Risco
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          <Award className="inline mr-1" size={14} />
                          Ganho Científico
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          <Target className="inline mr-1" size={14} />
                          Dificuldade
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Ação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {patos.map((pato) => {
                        const stats = classificacoes.get(pato.id!);

                        if (!stats) {
                          return (
                            <tr key={pato.id}>
                              <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                                Calculando...
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={pato.id} className="hover:bg-gray-750 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">
                                {pato.localizacao.cidade || 'Desconhecida'}
                              </div>
                              <div className="text-sm text-gray-400">
                                {pato.localizacao.pais}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-medium ${getStatusColor(pato.status_hibernacao)}`}>
                                {pato.status_hibernacao}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {stats.distanciaKm.toLocaleString()} km
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={getCustoColor(stats.custoOperacional)}>
                                {stats.custoOperacional}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                {stats.pontos.custo} pts
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={getRiscoColor(stats.grauDeRisco)}>
                                {stats.grauDeRisco}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                {stats.pontos.risco} pts
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={getValorColor(stats.ganhoCientifico)}>
                                {stats.ganhoCientifico}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                {stats.pontos.valor} pts
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={getDificuldadeColor(stats.dificuldade)}>
                                {stats.dificuldade}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => onStartMission(pato.id!, selectedBaseId)}
                                disabled={!selectedBaseId}
                                title="Iniciar Missão de Captura"
                                className="inline-flex items-center justify-center p-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-full transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Rocket size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {patos.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalCount={totalPatos}
                pageSize={PAGE_SIZE}
                onPageChange={page => setCurrentPage(page)}
              />
            )}

            <div className="mt-8 p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Legenda de Análise</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h3 className="font-bold text-blue-400 mb-2 border-b border-gray-700 pb-1">Custo Operacional</h3>
                  <p className="text-xs text-gray-400 mb-2 italic">
                    Calculado com base em: Distância da base, Tamanho/Peso do alvo (transporte), e Nº de Mutações (custo de sequenciamento).
                  </p>
                  <ul className="space-y-1 text-gray-300">
                    <li><strong className="text-green-400">Baixo:</strong> Missão local/regional, alvo pequeno/médio, poucas mutações.</li>
                    <li><strong className="text-blue-400">Médio:</strong> Missão continental, alvo médio, mutações moderadas.</li>
                    <li><strong className="text-yellow-400">Alto:</strong> Missão intercontinental, alvo grande/pesado, muitas mutações.</li>
                    <li><strong className="text-red-500">Extremo:</strong> Missão trans-global, alvo gigante/massivo, mutações extremas ou combinação de fatores altos.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-blue-400 mb-2 border-b border-gray-700 pb-1">Grau de Risco</h3>
                  <p className="text-xs text-gray-400 mb-2 italic">
                    Calculado com base em: Status (Desperto &gt; Transe &gt; Hibernando), BPM (se dormente), Tipo/Notas do Superpoder, Dificuldade do Terreno (Ponto Ref.), e Precisão da Coleta.
                  </p>
                  <ul className="space-y-1 text-gray-300">
                    <li><strong className="text-green-400">Baixo:</strong> Alvo em hibernação profunda e estável, terreno simples, boa precisão.</li>
                    <li><strong className="text-blue-400">Médio:</strong> Alvo em transe (BPM baixo/médio), poder não-bélico, terreno moderado.</li>
                    <li><strong className="text-yellow-500">Alto:</strong> Alvo desperto (poder fraco/médio), transe instável (BPM alto), terreno difícil OU baixa precisão.</li>
                    <li><strong className="text-red-500">Extremo:</strong> Alvo desperto com poder bélico/alto risco, terreno extremo, baixa precisão, ou combinação de fatores altos.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-blue-400 mb-2 border-b border-gray-700 pb-1">Ganho Científico</h3>
                  <p className="text-xs text-gray-400 mb-2 italic">
                    Calculado com base em: Nº de Mutações, Raridade do Superpoder, Anomalias de Tamanho/Peso, e Status (valor de estudo).
                  </p>
                  <ul className="space-y-1 text-gray-300">
                    <li><strong className="text-gray-500">Baixo:</strong> Poucas mutações, sem poder ou poder comum, sem anomalias.</li>
                    <li><strong className="text-gray-300">Médio:</strong> Mutações moderadas OU poder incomum/raro OU anomalia leve OU estado de estudo interessante (Hibernação).</li>
                    <li><strong className="text-green-400">Alto:</strong> Muitas mutações OU poder raro/épico OU anomalia significativa OU estado Desperto.</li>
                    <li><strong className="text-purple-400">Inestimável:</strong> Combinação de fatores altos, especialmente mutações extremas e/ou poder Lendário. Representa uma descoberta potencialmente revolucionária.</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
