import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PatoPrimordial, BaseOperacional } from '../types';
import { calcularVisaoDeCaptura, ClassificacaoPato } from '../utils/classification';
import DroneStatus from '../components/DroneStatus';
import LogDeMissao from '../components/LogDeMissao';
import FaseDeVoo from '../components/FaseDeVoo';
import FaseDeEncontro from '../components/FaseDeEncontro';
import { ArrowLeft, Crosshair } from 'lucide-react';
import { armasDrone } from '../data/armasDrone';
import ConfirmationModal from '../components/ConfirmationModal';

type FaseDaMissao = "preparacao" | "em-voo" | "encontro" | "concluida" | "falha";

interface MissaoCapturaProps {
  patoId: string;
  baseId: string;
  onBack: () => void;
}

export default function MissaoCaptura({ patoId, baseId, onBack }: MissaoCapturaProps) {
  const [patoAlvo, setPatoAlvo] = useState<PatoPrimordial | null>(null);
  const [baseDeLancamento, setBaseDeLancamento] = useState<BaseOperacional | null>(null);
  const [faseDaMissao, setFaseDaMissao] = useState<FaseDaMissao>("preparacao");
  const [isLoading, setIsLoading] = useState(true);

  const [droneStats, setDroneStats] = useState({
    integridade: 100,
    bateria: 100,
    combustivel: 100,
  });

  const [maxIntegridade, setMaxIntegridade] = useState(100);
  const [maxBateria, setMaxBateria] = useState(100);
  const [maxCombustivel, setMaxCombustivel] = useState(100);

  const [logs, setLogs] = useState<string[]>([]);
  const [classificacaoAlvo, setClassificacaoAlvo] = useState<ClassificacaoPato | null>(null);

  const [loadoutTanqueExtra, setLoadoutTanqueExtra] = useState(false);
  const [loadoutBlindagem, setLoadoutBlindagem] = useState(false);
  const [loadoutDroneCarga, setLoadoutDroneCarga] = useState(false);
  const [loadoutCamuflagem, setLoadoutCamuflagem] = useState(false);
  const [loadoutReparo, setLoadoutReparo] = useState(false);
  const [loadoutIA, setLoadoutIA] = useState(false);
  const [loadoutPropulsores, setLoadoutPropulsores] = useState(false);

  const [selectedSpecialWeaponId, setSelectedSpecialWeaponId] = useState<string | null>(null);

  type DroneApoio = 'nenhum' | 'energia' | 'integridade' | 'combustivel';
  const [droneDeApoio, setDroneDeApoio] = useState<DroneApoio>('nenhum');

  const initialLogsAdded = useRef(false);
  const [isAbandonModalOpen, setIsAbandonModalOpen] = useState(false);

  const addLog = useCallback((mensagem: string) => {
    setLogs(prev => [mensagem, ...prev]);
  }, []);

  const handleMissaoCompleta = useCallback(async (status: string, duracaoSegundos: number, finalLogMessage: string) => {
      if (!patoAlvo || !baseDeLancamento) {
         console.error("handleMissaoCompleta chamado sem patoAlvo ou baseDeLancamento");
         return;
      }
  
      let logsParaSalvar: string[] = [];
      setLogs(currentLogs => {
          logsParaSalvar = [finalLogMessage, ...currentLogs];
          return logsParaSalvar; 
      });
  
      // Espera um tick para garantir que logsParaSalvar foi populado
      await new Promise(resolve => setTimeout(resolve, 0)); 
  
      try {
        const { error } = await supabase
          .from('missao_historico')
          .insert({
            pato_id: patoAlvo.id,
            base_id: baseDeLancamento.id,
            pato_pais: patoAlvo.localizacao.pais,
            pato_cidade: patoAlvo.localizacao.cidade,
            base_nome: baseDeLancamento.nome,
            status_missao: status,
            duracao_segundos: duracaoSegundos,
            logs: logsParaSalvar // Usa o array atualizado
          });
  
        if (error) {
          console.error(`Erro ao salvar no histórico: ${error.message}`);
          addLog(`⚠️ Erro ao registrar missão no histórico.`);
        } else {
          console.log('Missão registrada no histórico com logs finais.');
          // O addLog de sucesso já acontece no filho
        }
      } catch (err: any) {
         console.error(`Erro inesperado ao salvar histórico: ${err.message}`);
         addLog(`⚠️ Erro inesperado ao registrar missão.`);
      }
  
    }, [patoAlvo, baseDeLancamento, addLog, setLogs]);

  useEffect(() => {
    if (!patoId || !baseId) return;

    async function fetchMissaoData() {
      setIsLoading(true);

      try {
        const [patoResponse, baseResponse] = await Promise.all([
          supabase.from('patos_primordiais').select('*').eq('id', patoId).single(),
          supabase.from('bases_operacionais').select('*').eq('id', baseId).single()
        ]);

        if (patoResponse.error) {
          if (!initialLogsAdded.current) {
            addLog(`ERRO: Falha ao buscar pato - ${patoResponse.error.message}`);
          }
        }
        if (baseResponse.error) {
          if (!initialLogsAdded.current) {
            addLog(`ERRO: Falha ao buscar base - ${baseResponse.error.message}`);
          }
        }

        if (patoResponse.data && baseResponse.data) {
          setPatoAlvo(patoResponse.data);
          setBaseDeLancamento(baseResponse.data);

          const classificacaoInicial = calcularVisaoDeCaptura(patoResponse.data, baseResponse.data);
          setClassificacaoAlvo(classificacaoInicial);

          if (!initialLogsAdded.current) {
            addLog("Buscando dados do alvo e da base...");
            addLog(`Alvo ${patoResponse.data.localizacao.pais} e Base ${baseResponse.data.nome} carregados.`);
            addLog("Análise tática disponível. Configure o drone.");
            initialLogsAdded.current = true;
          }
        } else {
          if (!initialLogsAdded.current) {
            addLog("ERRO: Dados da missão não encontrados.");
            initialLogsAdded.current = true;
          }
        }
      } catch (err: any) {
        if (!initialLogsAdded.current) {
          addLog(`ERRO: ${err.message}`);
          initialLogsAdded.current = true;
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchMissaoData();
  }, [patoId, baseId, addLog]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (faseDaMissao === 'em-voo' || faseDaMissao === 'encontro') {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [faseDaMissao]);

  if (isLoading && !patoAlvo) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen text-gray-300 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!patoAlvo || !baseDeLancamento) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen text-gray-300">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft size={20} />
          Voltar para Visão de Captura
        </button>
        <div className="bg-red-900/50 border border-red-700 text-red-200 p-6 rounded-lg">
          <h3 className="font-bold mb-2">Erro de Missão</h3>
          <p>Alvo ou Base não encontrados.</p>
        </div>
      </div>
    );
  }

  const getRiscoColor = (nivel: string) => {
    if (!nivel) return "text-gray-500";
    if (nivel === "Extremo") return "text-red-500 font-bold";
    if (nivel === "Alto") return "text-yellow-500";
    if (nivel === "Médio") return "text-blue-400";
    return "text-green-400";
  };

  const getValorColor = (nivel: string) => {
    if (!nivel) return "text-gray-500";
    if (nivel === "Inestimável") return "text-purple-400 font-bold";
    if (nivel === "Alto") return "text-green-400";
    if (nivel === "Médio") return "text-gray-300";
    return "text-gray-500";
  };

  const handleLaunch = () => {
    const maxIntegridadeCalc = loadoutBlindagem ? 120 : 100;
    const maxCombustivelCalc = loadoutTanqueExtra ? 130 : 100;
    const maxBateriaCalc = 100;

    setMaxIntegridade(maxIntegridadeCalc);
    setMaxCombustivel(maxCombustivelCalc);
    setMaxBateria(maxBateriaCalc);

    let initialStats = { integridade: 100, bateria: 100, combustivel: 100 };
    let logMessages = ["Drone Mk-II lançado!"];

    if (loadoutTanqueExtra) {
      initialStats.combustivel = Math.min(maxCombustivelCalc, initialStats.combustivel + 30);
      initialStats.integridade = Math.max(0, initialStats.integridade - 5);
      logMessages.push("Tanque de combustível extra equipado.");
    }
    if (loadoutBlindagem) {
      initialStats.integridade = Math.min(maxIntegridadeCalc, initialStats.integridade + 20);
      initialStats.combustivel = Math.max(0, initialStats.combustivel - 10);
      logMessages.push("Blindagem reforçada equipada.");
    }
    if (loadoutDroneCarga) {
      initialStats.bateria = Math.max(0, initialStats.bateria - 15);
      logMessages.push("Drone de carga extra acoplado.");
    }
    if (loadoutCamuflagem) {
      initialStats.bateria = Math.max(0, initialStats.bateria - 5);
      logMessages.push("Sistema de camuflagem ativado.");
    }
    if (loadoutReparo) {
      initialStats.bateria = Math.max(0, initialStats.bateria - 10);
      logMessages.push("Nano-bots de reparo equipados.");
    }
    if (loadoutIA) {
      initialStats.bateria = Math.max(0, initialStats.bateria - 15);
      logMessages.push("IA de otimização de rota ativada.");
    }

    logMessages.reverse().forEach(msg => addLog(msg));

    setDroneStats(initialStats);
    setFaseDaMissao("em-voo");
  };

  const loadoutSelecionadoCount = [
    loadoutTanqueExtra,
    loadoutBlindagem,
    loadoutDroneCarga,
    loadoutCamuflagem,
    loadoutReparo,
    loadoutIA,
    loadoutPropulsores,
  ].filter(Boolean).length;

  const limiteLoadoutAtingido = loadoutSelecionadoCount >= 2;

  const armasEspeciais = armasDrone.filter(arma => arma.id !== 'laser_padrao');
  const armaEspecialSelecionada = armasEspeciais.find(a => a.id === selectedSpecialWeaponId);

  const handleBackClick = () => {
    if (faseDaMissao === 'em-voo' || faseDaMissao === 'encontro') {
      setIsAbandonModalOpen(true);
    } else {
      onBack();
    }
  };

  const confirmAbandon = async () => {
    setIsAbandonModalOpen(false);
    const msgAbandono = "⚠️ MISSÃO ABANDONADA PELO OPERADOR.";
    addLog(msgAbandono);
    await handleMissaoCompleta("Falha - Abandono", 0, msgAbandono);
    setFaseDaMissao("falha");
  };

  const cancelAbandon = () => {
    setIsAbandonModalOpen(false);
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-gray-300">
      <button
        onClick={handleBackClick}
        className="mb-6 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <ArrowLeft size={20} />
        Voltar para Visão de Captura
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-1 space-y-6">
          <DroneStatus
            integridade={droneStats.integridade}
            bateria={droneStats.bateria}
            combustivel={droneStats.combustivel}
            maxIntegridade={maxIntegridade}
            maxBateria={maxBateria}
            maxCombustivel={maxCombustivel}
          />

          <LogDeMissao logs={logs} />
        </div>

        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 min-h-[600px]">

          {faseDaMissao === "preparacao" && patoAlvo && baseDeLancamento && classificacaoAlvo && (
            <div>
              <h1 className="text-3xl font-bold text-white mb-6">Preparação da Missão</h1>

              <div className="mb-8 p-4 bg-gray-700 rounded-lg border border-gray-600">
                <h2 className="text-xl font-semibold text-blue-400 mb-3">Análise Tática do Alvo</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <p><strong>Alvo:</strong> {patoAlvo.localizacao.pais} ({patoAlvo.status_hibernacao})</p>
                  <p><strong>Base:</strong> {baseDeLancamento.nome}</p>
                  <p><strong>Distância:</strong> {classificacaoAlvo.distanciaKm} km</p>
                  <p><strong>Risco Estimado:</strong> <span className={getRiscoColor(classificacaoAlvo.grauDeRisco)}>{classificacaoAlvo.grauDeRisco}</span></p>
                  <p><strong>Custo Operacional:</strong> <span className={getRiscoColor(classificacaoAlvo.custoOperacional)}>{classificacaoAlvo.custoOperacional}</span></p>
                  <p><strong>Valor Científico:</strong> <span className={getValorColor(classificacaoAlvo.ganhoCientifico)}>{classificacaoAlvo.ganhoCientifico}</span></p>
                  {patoAlvo.altura_cm > 250 && <p className="text-yellow-400 col-span-2"><strong>Alerta:</strong> Alvo de Grande Porte!</p>}
                  {patoAlvo.superpoder && <p className="text-red-400 col-span-2"><strong>Alerta:</strong> Super-poder Detectado ({patoAlvo.superpoder.tipo})!</p>}
                </div>
              </div>

              <div className="mb-8 p-4 bg-gray-700 rounded-lg border border-gray-600">
                <h2 className="text-xl font-semibold text-blue-400 mb-1">Configuração do Drone Mk-II</h2>
                <p className={`text-sm mb-3 ${limiteLoadoutAtingido ? 'text-yellow-400' : 'text-gray-400'}`}>
                  Selecione no máximo 2 módulos ({loadoutSelecionadoCount}/2 selecionados)
                </p>
                <div className="space-y-4">
                  <label className={`flex items-center space-x-3 ${limiteLoadoutAtingido && !loadoutTanqueExtra ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={loadoutTanqueExtra}
                      onChange={() => setLoadoutTanqueExtra(!loadoutTanqueExtra)}
                      disabled={limiteLoadoutAtingido && !loadoutTanqueExtra}
                      className="h-5 w-5 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-gray-300">
                      Instalar Tanque de Combustível Extra
                      <span className="text-xs text-gray-500 ml-2">(+30% Comb., -5% Int.)</span>
                    </span>
                  </label>

                  <label className={`flex items-center space-x-3 ${limiteLoadoutAtingido && !loadoutBlindagem ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={loadoutBlindagem}
                      onChange={() => setLoadoutBlindagem(!loadoutBlindagem)}
                      disabled={limiteLoadoutAtingido && !loadoutBlindagem}
                      className="h-5 w-5 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-gray-300">
                      Instalar Blindagem Reforçada
                      <span className="text-xs text-gray-500 ml-2">(+20% Int., -10% Comb.)</span>
                    </span>
                  </label>

                  {patoAlvo.altura_cm > 250 && (
                    <label className={`flex items-center space-x-3 ${limiteLoadoutAtingido && !loadoutDroneCarga ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={loadoutDroneCarga}
                        onChange={() => setLoadoutDroneCarga(!loadoutDroneCarga)}
                        disabled={limiteLoadoutAtingido && !loadoutDroneCarga}
                        className="h-5 w-5 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="text-yellow-400">
                        Requisitar Drone de Carga Extra (Obrigatório para Alvo Grande)
                        <span className="text-xs text-gray-500 ml-2">(-15% Bateria Inicial)</span>
                      </span>
                    </label>
                  )}

                  <label className={`flex items-center space-x-3 ${limiteLoadoutAtingido && !loadoutCamuflagem ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={loadoutCamuflagem}
                      onChange={() => setLoadoutCamuflagem(!loadoutCamuflagem)}
                      disabled={limiteLoadoutAtingido && !loadoutCamuflagem}
                      className="h-5 w-5 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-gray-300">
                      Ativar Sistema de Camuflagem
                      <span className="text-xs text-gray-500 ml-2">(-5% Bateria Inicial, Reduz Chance Eventos)</span>
                    </span>
                  </label>

                  <label className={`flex items-center space-x-3 ${limiteLoadoutAtingido && !loadoutReparo ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={loadoutReparo}
                      onChange={() => setLoadoutReparo(!loadoutReparo)}
                      disabled={limiteLoadoutAtingido && !loadoutReparo}
                      className="h-5 w-5 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-gray-300">
                      Carregar Nano-bots de Reparo
                      <span className="text-xs text-gray-500 ml-2">(-10% Bateria Inicial, Habilidade Ativa: Repara Integridade)</span>
                    </span>
                  </label>

                  <label className={`flex items-center space-x-3 ${limiteLoadoutAtingido && !loadoutIA ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={loadoutIA}
                      onChange={() => setLoadoutIA(!loadoutIA)}
                      disabled={limiteLoadoutAtingido && !loadoutIA}
                      className="h-5 w-5 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-gray-300">
                      Ativar IA de Otimização de Rota
                      <span className="text-xs text-gray-500 ml-2">(-15% Bateria Inicial, -30% Consumo Combustível, +Velocidade Passiva)</span>
                    </span>
                  </label>

                  <label className={`flex items-center space-x-3 ${limiteLoadoutAtingido && !loadoutPropulsores ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={loadoutPropulsores}
                      onChange={() => setLoadoutPropulsores(!loadoutPropulsores)}
                      disabled={limiteLoadoutAtingido && !loadoutPropulsores}
                      className="h-5 w-5 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-gray-300">
                      Equipar Propulsores Contínuos
                      <span className="text-xs text-gray-500 ml-2">(Passivo: +Velocidade, Dobro Consumo Combustível, -1% Integridade/s)</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-8 mb-8 p-4 bg-gray-700 rounded-lg border border-gray-600">
                <h2 className="text-xl font-semibold text-blue-400 mb-3">
                  <Crosshair className="inline mr-2" size={20} />
                  Seleção de Arma Especial
                </h2>
                <p className="text-xs text-gray-400 mb-3">O Laser Padrão Mk-I está sempre equipado. Selecione UMA arma especial adicional.</p>

                <label htmlFor="armaEspecialSelect" className="block text-sm font-medium text-gray-300 mb-1">
                  Arma Especial:
                </label>
                <select
                  id="armaEspecialSelect"
                  value={selectedSpecialWeaponId ?? ''}
                  onChange={(e) => setSelectedSpecialWeaponId(e.target.value || null)}
                  className="w-full bg-gray-600 border border-gray-500 text-white rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Nenhuma Arma Especial</option>
                  {armasEspeciais.map(arma => (
                    <option key={arma.id} value={arma.id}>
                      {arma.nome} (-{arma.custoBateria}% Bat.)
                    </option>
                  ))}
                </select>

                {armaEspecialSelecionada && (
                  <div className="mt-3 text-sm border-t border-gray-600 pt-3">
                    <p className="text-gray-300">{armaEspecialSelecionada.descricao}</p>
                    {armaEspecialSelecionada.tipoEficazContra.length > 0 && (
                      <p className="text-green-400 mt-1">
                        <span className="font-semibold">Eficaz contra:</span> {armaEspecialSelecionada.tipoEficazContra.join(', ')}
                      </p>
                    )}
                    <p className="text-gray-400 text-xs mt-1">Cooldown: {armaEspecialSelecionada.cooldownTurns} turno(s) após o uso.</p>
                  </div>
                )}
              </div>

              <div className="mt-8 mb-8 p-4 bg-gray-700 rounded-lg border border-gray-600">
                <h2 className="text-xl font-semibold text-blue-400 mb-3">
                  Drone de Apoio (Uso Único)
                </h2>
                <p className="text-xs text-gray-400 mb-3">Selecione um suporte tático. Só pode ser usado uma vez por missão.</p>

                <label htmlFor="droneApoioSelect" className="block text-sm font-medium text-gray-300 mb-1">
                  Tipo de Suporte:
                </label>
                <select
                  id="droneApoioSelect"
                  value={droneDeApoio}
                  onChange={(e) => setDroneDeApoio(e.target.value as DroneApoio)}
                  className="w-full bg-gray-600 border border-gray-500 text-white rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="nenhum">Nenhum Drone de Apoio</option>
                  <option value="energia">Suporte de Bateria (+20% Bateria)</option>
                  <option value="integridade">Suporte de Reparo (+25% Integridade)</option>
                  <option value="combustivel">Suporte de Reabastecimento (+15% Combustível)</option>
                </select>
              </div>

              <button
                onClick={handleLaunch}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-xl transition duration-200"
              >
                LANÇAR DRONE
              </button>
            </div>
          )}

          {faseDaMissao === "em-voo" && (
            <FaseDeVoo
              patoAlvo={patoAlvo}
              baseDeLancamento={baseDeLancamento}
              droneStats={droneStats}
              setDroneStats={setDroneStats}
              addLog={addLog}
              setFaseDaMissao={setFaseDaMissao}
              loadout={{
                tanqueExtra: loadoutTanqueExtra,
                blindagem: loadoutBlindagem,
                droneCarga: loadoutDroneCarga,
                camuflagem: loadoutCamuflagem,
                reparo: loadoutReparo,
                iaRota: loadoutIA,
                propulsores: loadoutPropulsores,
              }}
              maxIntegridade={maxIntegridade}
              maxBateria={maxBateria}
              maxCombustivel={maxCombustivel}
            />
          )}

          {faseDaMissao === "encontro" && patoAlvo && baseDeLancamento && (
            <FaseDeEncontro
              patoAlvo={patoAlvo}
              baseDeLancamento={baseDeLancamento}
              droneStats={droneStats}
              setDroneStats={setDroneStats}
              addLog={addLog}
              setFaseDaMissao={setFaseDaMissao}
              onMissaoCompleta={handleMissaoCompleta}
              loadout={{
                tanqueExtra: loadoutTanqueExtra,
                blindagem: loadoutBlindagem,
                droneCarga: loadoutDroneCarga,
                camuflagem: loadoutCamuflagem,
                reparo: loadoutReparo,
                iaRota: loadoutIA,
                propulsores: loadoutPropulsores,
              }}
              selectedSpecialWeaponId={selectedSpecialWeaponId}
              droneDeApoioSelecionado={droneDeApoio}
              maxIntegridade={maxIntegridade}
              maxBateria={maxBateria}
              maxCombustivel={maxCombustivel}
            />
          )}

          {faseDaMissao === "falha" && (
            <div>
              <h1 className="text-3xl font-bold text-red-500 mb-4">MISSÃO FALHOU</h1>
              <div className="bg-red-900/30 border border-red-700 p-6 rounded-lg mb-6">
                <p className="text-gray-300 text-lg mb-4">
                  O drone foi perdido. A DSIN lamenta a perda do equipamento.
                </p>
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <h3 className="text-white font-semibold mb-2">Status Final:</h3>
                  <ul className="space-y-1 text-sm text-gray-400">
                    <li>• Integridade: {droneStats.integridade}%</li>
                    <li>• Bateria: {droneStats.bateria}%</li>
                    <li>• Combustível: {droneStats.combustivel}%</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={onBack}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg text-xl transition-colors"
              >
                Retornar à Visão de Captura
              </button>
            </div>
          )}

          {faseDaMissao === "concluida" && (
            <div>
              <h1 className="text-3xl font-bold text-green-500 mb-4">MISSÃO CUMPRIDA!</h1>
              <div className="bg-green-900/30 border border-green-700 p-6 rounded-lg mb-6">
                <p className="text-gray-300 text-lg mb-4">
                  O Pato Primordial foi capturado com sucesso e está sendo transportado para a DSIN.
                </p>
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <h3 className="text-white font-semibold mb-2">Status Final do Drone:</h3>
                  <ul className="space-y-1 text-sm text-gray-400">
                    <li>• Integridade: {droneStats.integridade}%</li>
                    <li>• Bateria: {droneStats.bateria}%</li>
                    <li>• Combustível: {droneStats.combustivel}%</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={onBack}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-xl transition-colors"
              >
                Retornar à Visão de Captura
              </button>
            </div>
          )}

        </div>
      </div>

      <ConfirmationModal
        isOpen={isAbandonModalOpen}
        onClose={cancelAbandon}
        onConfirm={confirmAbandon}
        title="Abandonar Missão?"
        message="Sair agora resultará em falha da missão e será registrado como 'Abandono' no histórico. Deseja continuar?"
        confirmText="Abandonar Missão"
        confirmVariant="danger"
      />
    </div>
  );
}
