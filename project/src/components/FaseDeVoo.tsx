import React, { useState, useEffect } from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { eventosVoo, EventoVoo } from '../data/eventosVoo';
import { PatoPrimordial, BaseOperacional } from '../types';

interface FaseDeVooProps {
  patoAlvo: PatoPrimordial;
  baseDeLancamento: BaseOperacional;
  droneStats: { integridade: number; bateria: number; combustivel: number };
  setDroneStats: React.Dispatch<React.SetStateAction<{ integridade: number; bateria: number; combustivel: number }>>;
  addLog: (log: string) => void;
  setFaseDaMissao: (fase: "preparacao" | "em-voo" | "encontro" | "concluida" | "falha") => void;
  loadout: {
    tanqueExtra: boolean;
    blindagem: boolean;
    droneCarga: boolean;
    camuflagem: boolean;
    reparo: boolean;
    iaRota: boolean;
    propulsores: boolean;
  };
  maxIntegridade: number;
  maxBateria: number;
  maxCombustivel: number;
}

interface OpcaoEvento {
  texto: string;
  efeitos: { stat: string; valor: number }[];
  log: string;
}

function getDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const FaseDeVoo: React.FC<FaseDeVooProps> = ({
  patoAlvo,
  baseDeLancamento,
  droneStats,
  setDroneStats,
  addLog,
  setFaseDaMissao,
  loadout,
  maxIntegridade,
  maxBateria,
  maxCombustivel
}) => {
  const [progresso, setProgresso] = useState(0);
  const [eventoAtual, setEventoAtual] = useState<EventoVoo | null>(null);
  const [distanciaTotal, setDistanciaTotal] = useState(0);
  const [cooldownReparo, setCooldownReparo] = useState(false);
  const [guaranteedEventsTriggered, setGuaranteedEventsTriggered] = useState(0);
  const [totalEventosOcorridos, setTotalEventosOcorridos] = useState(0);

  console.log('[FaseDeVoo] Componente montado.');

  useEffect(() => {
    const dist = getDistanciaKm(
      baseDeLancamento.latitude,
      baseDeLancamento.longitude,
      patoAlvo.localizacao.latitude,
      patoAlvo.localizacao.longitude
    );
    setDistanciaTotal(Math.round(dist));
    addLog(`Iniciando voo. Distância total: ${Math.round(dist)} km.`);
    console.log('[FaseDeVoo] Distância calculada:', Math.round(dist));
  }, [patoAlvo, baseDeLancamento, addLog]);

  useEffect(() => {
    console.log(`[FaseDeVoo Timer Effect] Verificando: progresso=${progresso}, eventoAtual=${eventoAtual ? eventoAtual.id : null}`);

    if (progresso >= 100) {
      console.log('[FaseDeVoo Timer Effect] Progresso >= 100, mudando para "encontro".');
      addLog("Alvo alcançado! Preparando para engajamento.");
      setFaseDaMissao("encontro");
      return;
    }

    if (eventoAtual) {
      console.log('[FaseDeVoo Timer Effect] Evento ativo, timer pausado.');
      return;
    }

    let numeroEventosGarantidos = 2;
    if (loadout.camuflagem) {
      numeroEventosGarantidos = 0;
    } else if (loadout.iaRota || loadout.propulsores) {
      numeroEventosGarantidos = 1;
    }

    console.log('[FaseDeVoo Timer Effect] Criando setInterval...');
    const timer = setInterval(() => {
      console.log('[FaseDeVoo Timer Tick!] Callback do setInterval executado.');

      let progressoTick = 5;
      let consumoCombustivelTick = 1.0;
      let danoIntegridadeTick = 0;

      if (loadout.iaRota) {
        consumoCombustivelTick *= 0.70;
        progressoTick += 2;
      }

      if (loadout.blindagem) consumoCombustivelTick *= 1.1;
      if (loadout.tanqueExtra) consumoCombustivelTick *= 1.05;

      if (loadout.propulsores) {
        progressoTick = progressoTick * 1.8;
        consumoCombustivelTick *= 2.0;
        danoIntegridadeTick = 2;
      }

      progressoTick = Math.round(progressoTick);
      consumoCombustivelTick = Math.round(consumoCombustivelTick * 10) / 10;

      setDroneStats(prev => ({
        ...prev,
        combustivel: Math.max(0, Math.min(maxCombustivel, prev.combustivel - consumoCombustivelTick)),
        integridade: Math.max(0, Math.min(maxIntegridade, prev.integridade - danoIntegridadeTick))
      }));

      let eventTriggeredThisTick = false;

      if (totalEventosOcorridos < 4 && !eventoAtual) {
        if (numeroEventosGarantidos > 0 && guaranteedEventsTriggered < numeroEventosGarantidos) {
          if (progresso >= 30 && guaranteedEventsTriggered === 0) {
            const eventoAleatorio = eventosVoo[Math.floor(Math.random() * eventosVoo.length)];
            console.log('[FaseDeVoo Timer Tick!] Disparando evento garantido #1:', eventoAleatorio.id);
            setEventoAtual(eventoAleatorio);
            addLog(`ALERTA: ${eventoAleatorio.titulo}`);
            setGuaranteedEventsTriggered(1);
            setTotalEventosOcorridos(prev => prev + 1);
            eventTriggeredThisTick = true;
          } else if (numeroEventosGarantidos === 2 && progresso >= 65 && guaranteedEventsTriggered === 1) {
            const eventoAleatorio = eventosVoo[Math.floor(Math.random() * eventosVoo.length)];
            console.log('[FaseDeVoo Timer Tick!] Disparando evento garantido #2:', eventoAleatorio.id);
            setEventoAtual(eventoAleatorio);
            addLog(`ALERTA: ${eventoAleatorio.titulo}`);
            setGuaranteedEventsTriggered(2);
            setTotalEventosOcorridos(prev => prev + 1);
            eventTriggeredThisTick = true;
          }
        }

        if (!eventTriggeredThisTick) {
          const chanceBaseEvento = loadout.camuflagem ? 0.10 : 0.20;

          if (Math.random() < chanceBaseEvento && progresso > 10 && progresso < 90) {
            const eventoAleatorio = eventosVoo[Math.floor(Math.random() * eventosVoo.length)];
            console.log('[FaseDeVoo Timer Tick!] Disparando evento aleatório:', eventoAleatorio.id);
            setEventoAtual(eventoAleatorio);
            addLog(`ALERTA (Aleatório): ${eventoAleatorio.titulo}`);
            setTotalEventosOcorridos(prev => prev + 1);
            eventTriggeredThisTick = true;
          }
        }
      }

      if (!eventTriggeredThisTick && !eventoAtual) {
        setProgresso(prev => {
          const nextProgresso = Math.min(prev + progressoTick, 100);
          console.log(`[FaseDeVoo Timer Tick!] Atualizando progresso de ${prev} para ${nextProgresso}`);
          return nextProgresso;
        });
      }
    }, 2000);

    return () => {
      console.log('[FaseDeVoo Timer Effect] Limpando setInterval (ID:', timer, ')');
      clearInterval(timer);
    };
  }, [progresso, eventoAtual, addLog, setFaseDaMissao, loadout.camuflagem, loadout.iaRota, loadout.propulsores, loadout.blindagem, loadout.tanqueExtra, guaranteedEventsTriggered, totalEventosOcorridos, maxCombustivel, maxIntegridade, setDroneStats]);

  const formatarEfeitosParaTooltip = (efeitos: { stat: string; valor: number }[]): string => {
    if (!efeitos || efeitos.length === 0) return "Nenhum efeito.";

    return efeitos.map(e => {
      const sinal = e.valor > 0 ? '+' : '';
      const cor = e.valor > 0 ? 'text-green-400' : 'text-red-400';
      const statCapitalizado = e.stat.charAt(0).toUpperCase() + e.stat.slice(1);
      return `<span class="${cor}">${sinal}${e.valor}% ${statCapitalizado}</span>`;
    }).join('<br/>');
  };

  const handleDecisao = (opcao: OpcaoEvento) => {
    addLog(opcao.log);
    setDroneStats(prevStats => {
      const statsAtualizados = { ...prevStats };
      for (const efeito of opcao.efeitos) {
        const novoValor = statsAtualizados[efeito.stat as keyof typeof statsAtualizados] + efeito.valor;
        let maxStat = 100;
        if (efeito.stat === 'integridade') maxStat = maxIntegridade;
        else if (efeito.stat === 'combustivel') maxStat = maxCombustivel;
        else if (efeito.stat === 'bateria') maxStat = maxBateria;
        statsAtualizados[efeito.stat as keyof typeof statsAtualizados] = Math.max(0, Math.min(maxStat, novoValor));
      }
      return statsAtualizados;
    });
    console.log('[FaseDeVoo] Evento resolvido, limpando eventoAtual.');
    setEventoAtual(null);
  };

  useEffect(() => {
    if (droneStats.combustivel <= 0) {
      addLog("NÍVEL DE COMBUSTÍVEL CRÍTICO. MISSÃO FALHOU.");
      setFaseDaMissao("falha");
    }
    if (droneStats.integridade <= 0) {
      addLog("INTEGRIDADE DO DRONE COMPROMETIDA. MISSÃO FALHOU.");
      setFaseDaMissao("falha");
    }
  }, [droneStats.combustivel, droneStats.integridade, setFaseDaMissao, addLog]);

  const handleAtivarReparo = () => {
    if (cooldownReparo || droneStats.bateria < 20) {
      if (droneStats.bateria < 20) addLog("Bateria insuficiente para ativar nano-bots.");
      return;
    }

    addLog("Nano-bots de reparo ativados!");

    setDroneStats(prev => ({
      ...prev,
      bateria: Math.max(0, prev.bateria - 20),
      integridade: Math.min(maxIntegridade, prev.integridade + 15)
    }));

    setCooldownReparo(true);
    setTimeout(() => {
      setCooldownReparo(false);
      addLog("Sistemas de reparo prontos.");
    }, 15000);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-4">Voo em Progresso...</h1>
      <p className="text-gray-300 mb-2">Destino: {patoAlvo.localizacao.pais}</p>
      <p className="text-gray-300 mb-6">Distância Total: {distanciaTotal} km</p>

      <div className="w-full bg-gray-600 rounded-full h-6 mb-4 border border-gray-500">
        <div
          className="bg-blue-500 h-6 rounded-full text-center text-white font-bold text-sm transition-all duration-500 flex items-center justify-center"
          style={{ width: `${progresso}%` }}
        >
          {progresso}%
        </div>
      </div>

      {loadout.reparo && (
        <div className="mt-6 text-center">
          <button
            onClick={handleAtivarReparo}
            disabled={cooldownReparo || droneStats.bateria < 20 || droneStats.integridade === 100}
            className={`px-6 py-3 rounded-lg font-bold transition duration-200
                       ${cooldownReparo
                         ? 'bg-gray-500 cursor-not-allowed text-gray-400'
                         : 'bg-green-600 hover:bg-green-700 text-white'
                       }
                       disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {cooldownReparo ? 'RECARREGANDO REPARO' : 'ATIVAR NANO-REPARO (-20% Bat.)'}
          </button>
          {droneStats.bateria < 20 && !cooldownReparo && (
             <p className="text-xs text-yellow-400 mt-2">Bateria baixa para reparos.</p>
           )}
          {droneStats.integridade === 100 && !cooldownReparo && (
             <p className="text-xs text-green-400 mt-2">Integridade máxima.</p>
           )}
        </div>
      )}

      {eventoAtual && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-yellow-500 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">{eventoAtual.titulo}</h2>
            <p className="text-gray-300 mb-6">{eventoAtual.descricao}</p>
            <div className="flex flex-col md:flex-row md:justify-between gap-4">
              {eventoAtual.opcoes.map((opcao, index) => (
                <button
                  key={index}
                  onClick={() => handleDecisao(opcao)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                  data-tooltip-id="event-option-tooltip"
                  data-tooltip-html={formatarEfeitosParaTooltip(opcao.efeitos)}
                >
                  {opcao.texto}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <ReactTooltip
        id="event-option-tooltip"
        style={{ backgroundColor: '#1F2937', color: '#E5E7EB', borderRadius: '4px', zIndex: 9999 }}
      />
    </div>
  );
};

export default FaseDeVoo;
