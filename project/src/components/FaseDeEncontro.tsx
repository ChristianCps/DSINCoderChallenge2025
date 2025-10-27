import { useState, useEffect, useCallback, useRef } from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { PatoPrimordial, BaseOperacional, TipoPoder, RaridadePoder, Superpoder } from '../types';
import { supabase } from '../lib/supabaseClient';
import { armasDrone, ArmaDrone } from '../data/armasDrone';
import { defesasPorTipo } from '../data/sgdaDefesas';

type PatoStatusEncontro = "Hibernação Profunda" | "Em Transe" | "Desperto" | "Atordoado" | "Capturado" | "Fugindo";

export type PontoFracoLocal = "Cabeça" | "Bico" | "Asas" | "Cauda" | "Peito" | "Dorso" | "Pés" | "Olhos";

export type NivelFraqueza = "Pouco Eficaz" | "Eficaz" | "Muito Eficaz";

const DANO_MULTIPLIER: Record<NivelFraqueza, number> = {
  "Pouco Eficaz": 1.2,
  "Eficaz": 1.5,
  "Muito Eficaz": 1.8,
};

export interface PontoFracoDescoberto {
  local: PontoFracoLocal;
  nivel: NivelFraqueza;
}

interface FraquezaIdentificada {
  tipo: 'poder' | 'fisico' | 'aleatorio';
  descricao: string;
  acaoSugerida?: string;
  multiplicadorDano: number;
}

type DroneApoio = 'nenhum' | 'energia' | 'integridade' | 'combustivel';

interface FaseDeEncontroProps {
  patoAlvo: PatoPrimordial;
  baseDeLancamento: BaseOperacional;
  droneStats: { integridade: number; bateria: number; combustivel: number };
  setDroneStats: React.Dispatch<React.SetStateAction<{ integridade: number; bateria: number; combustivel: number }>>;
  addLog: (log: string) => void;
  setFaseDaMissao: (fase: "preparacao" | "em-voo" | "encontro" | "concluida" | "falha") => void;
  onMissaoCompleta: (status: string, duracaoSegundos: number, finalLogMessage: string) => void;
  loadout: {
    tanqueExtra: boolean;
    blindagem: boolean;
    droneCarga: boolean;
    camuflagem: boolean;
    reparo: boolean;
    iaRota: boolean;
    propulsores: boolean;
  };
  selectedSpecialWeaponId: string | null;
  droneDeApoioSelecionado: DroneApoio;
  maxIntegridade: number;
  maxBateria: number;
  maxCombustivel: number;
}

const HP_MAX_PATO_BASE = 150;
const CHANCE_DESVIO_BASE = 10;
const CAPTURA_THRESHOLD_HP = 30;

const chanceFalhaScan: Record<RaridadePoder, number> = {
  "Comum": 5, "Incomum": 10, "Raro": 20, "Épico": 35, "Lendário": 50
};

const fraquezasPoder: Record<TipoPoder, { desc: string, acao: string, danoMult: number }> = {
  "Bélico": { desc: "Recarga Lenta", acao: "Atacar Durante Recarga", danoMult: 2 },
  "Defensivo": { desc: "Gerador Exposto", acao: "Focar Gerador", danoMult: 2 },
  "Elemental": { desc: "Vulnerabilidade Oposta", acao: "Ataque Elemental Contrário", danoMult: 2 },
  "Tecnológico": { desc: "Sensível a PEM", acao: "Pulso Eletromagnético", danoMult: 2 },
  "Psíquico": { desc: "Vulnerável a Sônico", acao: "Usar Pulso Sônico", danoMult: 2 },
  "Biológico": { desc: "Instabilidade Metabólica", acao: "Toxina Neutralizante", danoMult: 2 },
  "Espacial": { desc: "Ancoragem Dimensional Frágil", acao: "Disruptor Gravitacional", danoMult: 2 },
  "Místico": { desc: "Interferência Arcana", acao: "Campo de Nulificação", danoMult: 2 },
  "Sônico": { desc: "Feedback Acústico", acao: "Absorvedor de Som", danoMult: 2 },
  "Caótico": { desc: "Sobrecarga Energética", acao: "Drenar Energia", danoMult: 2 },
  "Outro": { desc: "Padrão Desconhecido", acao: "Análise Contínua", danoMult: 1 }
};

const getFraquezaFisica = (pato: PatoPrimordial): { desc: string, acao: string, danoMult: number } | null => {
  if (pato.altura_cm > 400) return { desc: "Articulações Lentas", acao: "Atacar Pernas/Asas", danoMult: 1.5 };
  if (pato.altura_cm < 20) return { desc: "Estrutura Frágil", acao: "Contenção Leve", danoMult: 1.5 };
  if (pato.peso_g > 150000) return { desc: "Mobilidade Reduzida", acao: "Manter Distância", danoMult: 1.5 };
  if (pato.quantidade_mutacoes > 15) return { desc: "Áreas Mutantes Instáveis", acao: "Focar Mutações", danoMult: 1.5 };
  return null;
};

type MenuPrincipal = "raiz" | "atacar" | "opcoes" | "captura" | "selecionar_alvo";

export default function FaseDeEncontro({
  patoAlvo: patoInicial,
  droneStats,
  setDroneStats,
  addLog,
  setFaseDaMissao,
  onMissaoCompleta,
  loadout,
  selectedSpecialWeaponId,
  droneDeApoioSelecionado,
  maxIntegridade,
  maxBateria,
  maxCombustivel
}: FaseDeEncontroProps) {
  const [patoAlvo, setPatoAlvo] = useState<PatoPrimordial>(patoInicial);
  const [patoMaxHP, setPatoMaxHP] = useState(HP_MAX_PATO_BASE);
  const [patoHP, setPatoHP] = useState(HP_MAX_PATO_BASE);
  const [patoChanceDesvio, setPatoChanceDesvio] = useState(CHANCE_DESVIO_BASE);
  const [patoStatusAtual, setPatoStatusAtual] = useState<PatoStatusEncontro>(patoInicial.status_hibernacao);
  const [patoBPMAtual, setPatoBPMAtual] = useState<number | undefined>(patoInicial.batimentos_cardiacos_bpm || undefined);
  const [falhasCapturaConsecutivas, setFalhasCapturaConsecutivas] = useState(0);
  const [tipoPoderDespertado, setTipoPoderDespertado] = useState<TipoPoder | null>(null);
  const [armaSelecionada, setArmaSelecionada] = useState<ArmaDrone | undefined>(undefined);
  const [armaCooldown, setArmaCooldown] = useState(0);
  const pontosFracosOcultos = useRef<Map<PontoFracoLocal, NivelFraqueza>>(new Map());
  const [pontosFracosDescobertos, setPontosFracosDescobertos] = useState<PontoFracoDescoberto[]>([]);
  const [scansConsecutivosFalhos, setScansConsecutivosFalhos] = useState(0);
  const [scanBloqueado, setScanBloqueado] = useState(false);
  const [ultimoScanResultado, setUltimoScanResultado] = useState<string | null>(null);
  const [sgdaCooldown, setSgdaCooldown] = useState(0);
  const [isSgdaActive, setIsSgdaActive] = useState(false);
  const [nanoCooldown, setNanoCooldown] = useState(0);
  const [escudoAtivo, setEscudoAtivo] = useState(false);
  const [isAbsorvendo, setIsAbsorvendo] = useState(false);
  const [absorverCooldown, setAbsorverCooldown] = useState(0);
  const [patoCarregandoPoder, setPatoCarregandoPoder] = useState(false);
  const [turno, setTurno] = useState<'drone' | 'pato'>('drone');
  const [menuAtual, setMenuAtual] = useState<MenuPrincipal>('raiz');
  const [ataquePendente, setAtaquePendente] = useState<{ tipo: 'basico' | 'arma'; arma?: ArmaDrone } | null>(null);
  const [patoStunnedTurns, setPatoStunnedTurns] = useState(0);
  const [mostrarModalDespertar, setMostrarModalDespertar] = useState(false);
  const inicioMissao = useRef(Date.now());
  const [missaoFinalizada, setMissaoFinalizada] = useState(false);
  const [redeTitanioCargas, setRedeTitanioCargas] = useState(3);
  const [campoEstaseUsado, setCampoEstaseUsado] = useState(false);
  const [droneDeApoioUsado, setDroneDeApoioUsado] = useState(false);

  useEffect(() => {
    setArmaSelecionada(armasDrone.find(a => a.id === selectedSpecialWeaponId));
  }, [selectedSpecialWeaponId]);

  const getRandomInt = (min: number, max: number) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const calcularNovoBPMTranse = (bpmBase?: number): number => {
    const aumento = getRandomInt(15, 30);
    const novoBPM = (bpmBase || 30) + aumento;
    addLog(`BPM aumentou em ${aumento}! Novo BPM: ${novoBPM}`);
    return novoBPM;
  };

  const calcularNovoBPMDesperto = (bpmBase?: number): number => {
    const aumento = getRandomInt(35, 100);
    const novoBPM = (bpmBase || 60) + aumento;
    addLog(`BPM aumentou drasticamente em ${aumento}! Novo BPM: ${novoBPM}`);
    return novoBPM;
  };

  const calcularChanceScanSucesso = useCallback((mutacoes: number): number => {
    const mutacoesClamped = Math.max(0, Math.min(mutacoes, 25));
    const chance = 95 - (70 / 25) * mutacoesClamped;
    return Math.round(chance);
  }, []);

  const updatePatoStatusInDB = useCallback(async (updates: Partial<PatoPrimordial>) => {
    if (!patoAlvo?.id) return;

    addLog("Atualizando status do Pato no banco de dados...");
    const { error } = await supabase
      .from('patos_primordiais')
      .update(updates)
      .eq('id', patoAlvo.id);

    if (error) {
      addLog(`⚠️ ERRO ao salvar status do Pato: ${error.message}`);
    } else {
      addLog("✅ Status do Pato salvo no banco de dados.");
    }
  }, [patoAlvo?.id, addLog]);

  const handleDespertarPato = useCallback(() => {
    if (patoStatusAtual === 'Desperto') return;

    addLog("🚨 ALERTA MÁXIMO! O PATO DESPERTOU!");
    setPatoChanceDesvio(prev => Math.min(prev + 15, 60));

    if (!patoAlvo.superpoder) {
      const tiposPoder: TipoPoder[] = ["Bélico", "Defensivo", "Elemental", "Tecnológico", "Psíquico", "Biológico", "Espacial", "Místico", "Sônico", "Caótico"];
      const tipoAleatorio = tiposPoder[Math.floor(Math.random() * tiposPoder.length)];
      setTipoPoderDespertado(tipoAleatorio);
      setMostrarModalDespertar(true);
    } else {
      addLog(`Poder conhecido: ${patoAlvo.superpoder.nome} (${patoAlvo.superpoder.tipo})`);
    }
  }, [patoStatusAtual, patoAlvo, addLog]);

  const changePatoStatus = useCallback((novoStatus: PatoStatusEncontro) => {
    if (novoStatus === patoStatusAtual) return;

    let novoBPM = patoBPMAtual;
    let updatesForDB: Partial<PatoPrimordial> = { status_hibernacao: novoStatus };

    if (novoStatus === 'Em Transe' && patoStatusAtual === 'Hibernação Profunda') {
      novoBPM = calcularNovoBPMTranse(patoBPMAtual);
      updatesForDB.batimentos_cardiacos_bpm = novoBPM;
    } else if (novoStatus === 'Desperto' && (patoStatusAtual === 'Hibernação Profunda' || patoStatusAtual === 'Em Transe')) {
      novoBPM = calcularNovoBPMDesperto(patoBPMAtual);
      updatesForDB.batimentos_cardiacos_bpm = novoBPM;
    }

    setPatoStatusAtual(novoStatus);
    setPatoBPMAtual(novoBPM);

    updatePatoStatusInDB(updatesForDB);

    setFalhasCapturaConsecutivas(0);

    if (novoStatus === 'Desperto') {
      handleDespertarPato();
    }
  }, [patoStatusAtual, patoBPMAtual, updatePatoStatusInDB, handleDespertarPato]);

  const handleFimMissao = useCallback(async (statusFinal: string, finalLogMessage: string) => {
    if (missaoFinalizada) return;
    setMissaoFinalizada(true);

    const duracaoSegundos = Math.floor((Date.now() - inicioMissao.current) / 1000);

    if (statusFinal.startsWith("Sucesso")) {
      if (patoAlvo.id) {
        const { error: updateError } = await supabase
          .from('patos_primordiais')
          .update({ capturado: true })
          .eq('id', patoAlvo.id);

        if (updateError) {
          addLog("⚠️ ERRO: Falha ao atualizar status do pato no banco de dados.");
        } else {
          addLog("✅ Status do Pato atualizado para 'Capturado' no banco de dados.");
        }
      }
    }

    setTimeout(() => {
      onMissaoCompleta(statusFinal, duracaoSegundos, finalLogMessage);
      if (statusFinal.startsWith("Sucesso")) {
        setFaseDaMissao("concluida");
      } else {
        setFaseDaMissao("falha");
      }
    }, 1500);
  }, [missaoFinalizada, inicioMissao, patoAlvo, addLog, onMissaoCompleta, setFaseDaMissao]);

  useEffect(() => {
    let hp = HP_MAX_PATO_BASE;
    let desvio = CHANCE_DESVIO_BASE;

    if (patoInicial.superpoder) {
      const bonusRaridade: Record<RaridadePoder, number> = {
        "Comum": 0, "Incomum": 20, "Raro": 40, "Épico": 60, "Lendário": 100
      };
      hp += bonusRaridade[patoInicial.superpoder.raridade] || 0;
      desvio += Math.floor((bonusRaridade[patoInicial.superpoder.raridade] || 0) / 10);
    }

    if (patoInicial.altura_cm > 300) hp += 30;
    if (patoInicial.peso_g > 100000) hp += 25;
    if (patoInicial.quantidade_mutacoes > 10) {
      hp += patoInicial.quantidade_mutacoes * 2;
      desvio += Math.floor(patoInicial.quantidade_mutacoes / 3);
    }

    if (patoInicial.status_hibernacao === "Desperto") {
      desvio += 15;
    } else if (patoInicial.status_hibernacao === "Em Transe") {
      desvio += 5;
    }

    setPatoMaxHP(hp);
    setPatoHP(hp);
    setPatoChanceDesvio(Math.min(desvio, 50));

    const locaisPossiveis: PontoFracoLocal[] = ["Cabeça", "Bico", "Asas", "Cauda", "Peito", "Dorso", "Pés", "Olhos"];
    const niveisPossiveis: NivelFraqueza[] = ["Pouco Eficaz", "Eficaz", "Muito Eficaz"];
    const numeroDeFraquezas = 3;

    const fraquezasGeradas = new Map<PontoFracoLocal, NivelFraqueza>();
    const locaisSelecionados: PontoFracoLocal[] = [];
    while (locaisSelecionados.length < numeroDeFraquezas) {
      const localAleatorio = locaisPossiveis[Math.floor(Math.random() * locaisPossiveis.length)];
      if (!locaisSelecionados.includes(localAleatorio)) {
        locaisSelecionados.push(localAleatorio);
      }
    }

    locaisSelecionados.forEach(local => {
      const nivelEscolhido = niveisPossiveis[Math.floor(Math.random() * niveisPossiveis.length)];
      fraquezasGeradas.set(local, nivelEscolhido);
    });

    pontosFracosOcultos.current = fraquezasGeradas;

    addLog(`--- FASE DE ENCONTRO INICIADA ---`);
    addLog(`Alvo: ${patoInicial.localizacao.pais} | Status: ${patoInicial.status_hibernacao}`);
    addLog(`HP do Pato: ${hp} | Chance de Desvio: ${Math.min(desvio, 50)}%`);
    if (armaSelecionada) {
      addLog(`Arma Especial Selecionada: ${armaSelecionada.nome}`);
    } else {
      addLog(`Arma Equipada: Laser Padrão Mk-I (Padrão)`);
    }
  }, [patoInicial, armaSelecionada, addLog]);

  const proximoTurno = useCallback(() => {
    if (armaCooldown > 0) setArmaCooldown(prev => prev - 1);
    if (nanoCooldown > 0) setNanoCooldown(prev => prev - 1);
    if (absorverCooldown > 0) setAbsorverCooldown(prev => prev - 1);
    if (patoStunnedTurns > 0) setPatoStunnedTurns(prev => prev - 1);
    if (sgdaCooldown > 0) setSgdaCooldown(prev => prev - 1);
    if (escudoAtivo && turno === 'drone') {
      addLog("Escudo desativado.");
      setEscudoAtivo(false);
    }

    setTurno(prev => prev === 'drone' ? 'pato' : 'drone');
    setMenuAtual('raiz');
  }, [armaCooldown, nanoCooldown, absorverCooldown, patoStunnedTurns, sgdaCooldown, escudoAtivo, turno, addLog]);

  const handleScan = useCallback(() => {
    if (turno !== 'drone' || scanBloqueado || droneStats.bateria < 10 || pontosFracosDescobertos.length >= 3) {
      if (scanBloqueado) addLog("SCAN BLOQUEADO: Limite de falhas ou pontos fracos atingido.");
      else if (pontosFracosDescobertos.length >= 3) addLog("SCAN BLOQUEADO: Máximo de 3 pontos fracos encontrados.");
      else if (droneStats.bateria < 10) addLog("Bateria insuficiente para Scan.");
      return;
    }

    addLog("Iniciando Scan Tático (-10% Bateria)...");
    setDroneStats(prev => ({ ...prev, bateria: Math.max(0, prev.bateria - 10) }));
    setUltimoScanResultado(null);

    const chanceSucesso = calcularChanceScanSucesso(patoAlvo.quantidade_mutacoes);
    const rolagemSucesso = Math.random() * 100 < chanceSucesso;

    if (rolagemSucesso) {
      setScansConsecutivosFalhos(0);

      const ocultosNaoDescobertos: PontoFracoLocal[] = [];
      pontosFracosOcultos.current.forEach((nivel, local) => {
        if (!pontosFracosDescobertos.some(pf => pf.local === local)) {
          ocultosNaoDescobertos.push(local);
        }
      });

      if (ocultosNaoDescobertos.length > 0) {
        const localRevelado = ocultosNaoDescobertos[Math.floor(Math.random() * ocultosNaoDescobertos.length)];
        const nivelRevelado = pontosFracosOcultos.current.get(localRevelado)!;

        const novoPontoFraco: PontoFracoDescoberto = { local: localRevelado, nivel: nivelRevelado };
        setPontosFracosDescobertos(prev => [...prev, novoPontoFraco]);

        const msg = `SCAN SUCESSO! Ponto Fraco encontrado: ${localRevelado} (${nivelRevelado})!`;
        addLog(msg);
        setUltimoScanResultado(`Encontrado: ${localRevelado} (${nivelRevelado})`);

        if (pontosFracosDescobertos.length + 1 >= 3) {
          addLog("Limite de 3 pontos fracos atingido. Scan bloqueado.");
          setScanBloqueado(true);
        }
      } else {
        addLog("Scan: Todos os 3 pontos fracos já foram descobertos. Scan bloqueado.");
        setUltimoScanResultado("Todos os PFs já descobertos.");
        setScanBloqueado(true);
      }
    } else {
      const novasFalhas = scansConsecutivosFalhos + 1;
      setScansConsecutivosFalhos(novasFalhas);
      const msgFalha = `SCAN FALHOU! (Chance era ${chanceSucesso}%)`;
      addLog(msgFalha);
      setUltimoScanResultado(`Falha na rolagem (${novasFalhas}/2)`);

      if (novasFalhas >= 2) {
        addLog("Scan falhou 2 vezes consecutivas. Scan bloqueado.");
        setScanBloqueado(true);
      }
    }

    proximoTurno();
  }, [
    turno, scanBloqueado, droneStats.bateria, patoAlvo.quantidade_mutacoes,
    pontosFracosDescobertos, scansConsecutivosFalhos,
    addLog, setDroneStats, proximoTurno, calcularChanceScanSucesso
  ]);

  const aplicarDanoAoPato = useCallback((danoBase: number, tipoAtaque: 'basico' | 'arma' | 'fisico' | 'normal', alvo?: PontoFracoLocal, falhouCrit = false) => {
    if (patoChanceDesvio > Math.random() * 100) {
      addLog("❌ Pato desviou do ataque!");
      return;
    }

    let danoFinal = danoBase;
    let logBonus = "";

    if (!falhouCrit && tipoAtaque === 'arma' && armaSelecionada && patoAlvo.superpoder && armaSelecionada.tipoEficazContra.includes(patoAlvo.superpoder.tipo)) {
      const multPoder = 2.0;
      danoFinal *= multPoder;
      logBonus += ` (ARMA EFICAZ x${multPoder}!)`;
    }

    if (alvo && pontosFracosDescobertos.some(pf => pf.local === alvo)) {
      const pf = pontosFracosDescobertos.find(pf => pf.local === alvo)!;
      const multFraqueza = DANO_MULTIPLIER[pf.nivel];
      danoFinal *= multFraqueza;
      logBonus += ` (PONTO FRACO ${pf.nivel.toUpperCase()} x${multFraqueza}!)`;
    }

    danoFinal = Math.round(danoFinal);
    const novoHP = Math.max(0, patoHP - danoFinal);
    setPatoHP(novoHP);

    let logMsg = `⚔️ Drone atingiu ${alvo ? `o(a) ${alvo}` : 'o Pato'} causando ${danoFinal} de dano!${logBonus}`;
    logMsg += ` HP Pato: ${novoHP}/${patoMaxHP}`;
    addLog(logMsg);

    if (novoHP <= 0) {
      addLog("❌ ALERTA: Integridade do alvo falhou!");
      addLog("💥 Pato libera explosão de energia e escapa! Missão falhou.");
      handleFimMissao("Falha - Alvo Escapou (Derrotado)", "💥 Pato libera explosão de energia e escapa! Missão falhou.");
      return;
    }

    if (patoStatusAtual === 'Hibernação Profunda') {
      const tipoAtaqueRecebido = tipoAtaque;
      if (tipoAtaqueRecebido === 'arma') {
        changePatoStatus('Desperto');
      } else if (tipoAtaqueRecebido === 'fisico') {
        if (Math.random() < 0.5) changePatoStatus('Em Transe');
        else changePatoStatus('Desperto');
      } else {
        changePatoStatus('Em Transe');
      }
    } else if (patoStatusAtual === 'Em Transe') {
      const tipoAtaqueRecebido = tipoAtaque;
      if (tipoAtaqueRecebido === 'arma') {
        changePatoStatus('Desperto');
      } else if (tipoAtaqueRecebido === 'fisico') {
        if (Math.random() < 0.8) changePatoStatus('Desperto');
      } else {
        if (Math.random() < 0.5) changePatoStatus('Desperto');
      }
    }
  }, [patoChanceDesvio, patoHP, patoMaxHP, armaSelecionada, patoAlvo, patoStatusAtual, pontosFracosDescobertos, addLog, handleFimMissao, changePatoStatus]);

  const handleAtaqueBasico = () => {
    if (turno !== 'drone' || droneStats.bateria < 1) return;
    setAtaquePendente({ tipo: 'basico' });
    setMenuAtual('selecionar_alvo');
  };

  const handleAtaqueArma = () => {
    if (!armaSelecionada || turno !== 'drone' || armaCooldown > 0 || droneStats.bateria < armaSelecionada.custoBateria) return;
    setAtaquePendente({ tipo: 'arma', arma: armaSelecionada });
    setMenuAtual('selecionar_alvo');
  };

  const handleAtaqueRasante = () => {
    const custoIntegridade = 10;
    const danoBase = 10;
    const chanceStun = 0.4;

    if (turno !== 'drone' || droneStats.integridade <= custoIntegridade) {
      if (droneStats.integridade <= custoIntegridade) addLog("Integridade baixa demais para Ataque Rasante!");
      return;
    }

    addLog(`Drone executa Ataque Rasante (-${custoIntegridade}% Integridade)...`);
    setDroneStats(prev => ({ ...prev, integridade: Math.max(0, prev.integridade - custoIntegridade) }));

    aplicarDanoAoPato(danoBase, 'fisico');

    if (Math.random() < chanceStun) {
      addLog("🌟 Ataque Rasante ATORDOOU o Pato por 1 turno!");
      setPatoStunnedTurns(2);
    }

    proximoTurno();
  };

  const executarAtaqueComAlvo = (alvo: PontoFracoLocal) => {
    if (!ataquePendente || turno !== 'drone') return;

    const { tipo, arma } = ataquePendente;

    if (tipo === 'basico') {
      addLog(`Drone usa Laser Padrão mirando em ${alvo}...`);
      setDroneStats(prev => ({ ...prev, bateria: Math.max(0, prev.bateria - 1) }));
      aplicarDanoAoPato(10, 'normal', alvo);
    } else if (tipo === 'arma' && arma) {
      addLog(`Drone usa ${arma.nome} mirando em ${alvo}...`);
      setDroneStats(prev => ({ ...prev, bateria: Math.max(0, prev.bateria - arma.custoBateria) }));
      setArmaCooldown(arma.cooldownTurns + 1);

      let falhouCrit = false;
      if (patoAlvo.superpoder && arma.tipoEficazContra.includes(patoAlvo.superpoder.tipo)) {
        if (Math.random() < 0.3) falhouCrit = true;
      }
      if (falhouCrit) addLog("❌ Falha crítica! O scan incorreto comprometeu o ataque!");

      const danoBaseArma = arma.danoBase;
      aplicarDanoAoPato(falhouCrit ? Math.floor(danoBaseArma * 0.5) : danoBaseArma, 'arma', alvo, falhouCrit);
    }

    setAtaquePendente(null);
    setMenuAtual('raiz');
    proximoTurno();
  };

  const handleAtivarEscudo = () => {
    if (turno !== 'drone' || escudoAtivo || droneStats.bateria < 10) return;
    addLog("🛡️ Escudo Energético Ativado (-10% Bateria)!");
    setDroneStats(prev => ({ ...prev, bateria: Math.max(0, prev.bateria - 10) }));
    setEscudoAtivo(true);
    proximoTurno();
  };

  const handleQueimarCombustivel = () => {
    if (turno !== 'drone' || droneStats.combustivel < 25) {
      if (droneStats.combustivel < 25) addLog("Combustível insuficiente para conversão!");
      return;
    }

    addLog("Injetando combustível nos geradores... (-25% Combustível, +15% Bateria)");
    setDroneStats(prev => ({
      ...prev,
      combustivel: Math.max(0, prev.combustivel - 25),
      bateria: Math.min(maxBateria, prev.bateria + 15)
    }));
    proximoTurno();
  };

  const handleAbsorver = () => {
    if (turno !== 'drone' || absorverCooldown > 0 || isAbsorvendo) {
      if (absorverCooldown > 0) addLog("Sistema de absorção recarregando...");
      return;
    }

    addLog("Drone assume postura para absorver ataque de energia...");
    setIsAbsorvendo(true);
    setAbsorverCooldown(3);
    proximoTurno();
  };

  const handleTentativaCaptura = (metodo: 'Rede Criogênica' | 'Pulso Sônico' | 'Rede de Titânio' | 'Campo de Estase') => {
    if (turno !== 'drone' || missaoFinalizada) return;

    let custoBateria = 0;
    let sucessoChance = 0;
    let podeTentar = true;

    switch (metodo) {
      case 'Rede Criogênica':
        custoBateria = 15;
        if (patoStatusAtual === 'Hibernação Profunda') sucessoChance = 0.85;
        else if (patoStatusAtual === 'Em Transe') sucessoChance = 0.35;
        else if (patoStatusAtual === 'Desperto' || patoStatusAtual === 'Atordoado') {
          sucessoChance = (patoHP < 15) ? 0.25 : 0.05;
        }
        break;
      case 'Pulso Sônico':
        custoBateria = 20;
        if (patoStatusAtual === 'Em Transe') sucessoChance = 0.65;
        else if (patoStatusAtual === 'Hibernação Profunda') sucessoChance = 0.15;
        else if (patoStatusAtual === 'Desperto' || patoStatusAtual === 'Atordoado') sucessoChance = 0.10;
        break;
      case 'Rede de Titânio':
        custoBateria = 15;
        if (redeTitanioCargas <= 0) {
          addLog("Rede de Titânio sem cargas!");
          podeTentar = false;
          break;
        }
        if (patoStatusAtual === 'Desperto' || patoStatusAtual === 'Atordoado') {
          if (patoHP < 20) sucessoChance = 0.80;
          else sucessoChance = 0.10;
        } else {
          sucessoChance = 0.10;
        }
        break;
      case 'Campo de Estase':
        custoBateria = 999;
        if (campoEstaseUsado || patoStatusAtual !== 'Desperto' || redeTitanioCargas > 0) {
          if(campoEstaseUsado) addLog("Campo de Estase já utilizado.");
          else if (patoStatusAtual !== 'Desperto') addLog("Campo de Estase só funciona em alvos Despertos.");
          else if (redeTitanioCargas > 0) addLog("Use todas as cargas da Rede de Titânio primeiro.");
          podeTentar = false;
          break;
        }
        if (patoHP < 15) sucessoChance = 0.85;
        else sucessoChance = 0.10;
        break;
    }

    if (!podeTentar || (metodo !== 'Campo de Estase' && droneStats.bateria < custoBateria)) {
      if(metodo !== 'Campo de Estase' && droneStats.bateria < custoBateria && podeTentar) addLog("Bateria insuficiente para esta ação de captura!");
      return;
    }

    addLog(`Tentando captura: ${metodo}...`);

    if (metodo === 'Campo de Estase') {
      addLog("⚠️ ATIVANDO CAMPO DE ESTASE! Drenando todos os sistemas...");
      setDroneStats({ integridade: 1, bateria: 1, combustivel: 5 });
      setCampoEstaseUsado(true);
    } else {
      setDroneStats(prev => ({ ...prev, bateria: Math.max(0, prev.bateria - custoBateria) }));
      if (metodo === 'Rede de Titânio') {
        setRedeTitanioCargas(prev => prev - 1);
      }
    }

    if (Math.random() < sucessoChance) {
      addLog(`✅ CAPTURA BEM-SUCEDIDA! ${metodo} efetivo!`);
      changePatoStatus("Capturado");
    } else {
      addLog(`❌ Captura com ${metodo} falhou!`);
      const novasFalhas = falhasCapturaConsecutivas + 1;
      setFalhasCapturaConsecutivas(novasFalhas);
      addLog(`Falhas consecutivas na captura: ${novasFalhas}`);

      let despertou = false;

      if (metodo === 'Rede Criogênica' || (metodo === 'Pulso Sônico' && patoStatusAtual === 'Em Transe')) {
        if (novasFalhas >= 2) {
          if (patoStatusAtual === 'Hibernação Profunda') {
            addLog("⚠️ Falhas repetidas! Pato entrou Em Transe!");
            changePatoStatus('Em Transe');
            despertou = true;
          } else if (patoStatusAtual === 'Em Transe') {
            addLog("🚨 Falhas repetidas! Pato DESPERTOU!");
            changePatoStatus('Desperto');
            despertou = true;
          }
        }
      } else if (metodo === 'Pulso Sônico' && patoStatusAtual === 'Hibernação Profunda') {
        const outcome = Math.random();
        if (outcome < 0.60) {
          addLog("⚠️ Pulso Sônico perturbou a hibernação! Pato entrou Em Transe!");
          changePatoStatus('Em Transe');
          despertou = true;
        } else if (outcome < 0.85) {
          addLog("🚨 Pulso Sônico causou despertar abrupto!");
          changePatoStatus('Desperto');
          despertou = true;
        }
      } else if (metodo === 'Rede de Titânio' && (patoStatusAtual === 'Hibernação Profunda' || patoStatusAtual === 'Em Transe')) {
        addLog("🚨 O barulho da Rede de Titânio DESPERTOU o Pato!");
        changePatoStatus('Desperto');
        despertou = true;
      } else if (metodo === 'Campo de Estase') {
        const msgCampoEstase = "❌ Campo de Estase falhou em conter o alvo! Sistemas críticos drenados!";
        addLog(msgCampoEstase);
        handleFimMissao("Falha - Campo Estase", msgCampoEstase);
        return;
      }

      if (!despertou && patoStatusAtual === 'Desperto' && patoAlvo.superpoder) {
        acaoPato('poder_instantaneo');
      } else if (!despertou) {
        proximoTurno();
      }
    }
  };

  const handleNanoBots = () => {
    if (!loadout.reparo || turno !== 'drone' || nanoCooldown > 0 || droneStats.bateria < 10) return;
    addLog("🔧 Nano-bots de Reparo Ativados (-10% Bateria)...");
    setDroneStats(prev => ({
      ...prev,
      bateria: Math.max(0, prev.bateria - 10),
      integridade: Math.min(maxIntegridade, prev.integridade + 15)
    }));
    addLog("✅ +15% Integridade restaurada!");
    setNanoCooldown(3);
    proximoTurno();
  };

  const handleSGDA = () => {
    const custoBateria = 25;
    const cooldownTurns = 4;

    if (turno !== 'drone' || sgdaCooldown > 0 || isSgdaActive || droneStats.bateria < custoBateria) {
      if (sgdaCooldown > 0) addLog("SGDA ainda está recarregando...");
      else if (isSgdaActive) addLog("SGDA já está ativo, aguardando ataque do Pato.");
      else if (droneStats.bateria < custoBateria) addLog("Bateria insuficiente para SGDA.");
      return;
    }

    addLog(`🎲 Ativando Sistema Gerador de Defesas Aleatórias (-${custoBateria}% Bateria)...`);
    setDroneStats(prev => ({ ...prev, bateria: Math.max(0, prev.bateria - custoBateria) }));

    let tipoAlvo: TipoPoder | 'Geral' = 'Geral';

    if (patoStatusAtual === 'Desperto' && patoAlvo.superpoder) {
      tipoAlvo = patoAlvo.superpoder.tipo || 'Geral';
      if (tipoAlvo === 'Outro') tipoAlvo = 'Geral';
    }

    const defesasPossiveis = defesasPorTipo.get(tipoAlvo) || defesasPorTipo.get('Geral')!;
    const defesaEscolhida = defesasPossiveis[Math.floor(Math.random() * defesasPossiveis.length)];

    addLog(`🛡️ SGDA Preparado: ${defesaEscolhida} (Contra ${tipoAlvo}). Aguardando próximo ataque de poder.`);

    setIsSgdaActive(true);
    setSgdaCooldown(cooldownTurns);
    proximoTurno();
  };

  const handleDroneDeApoio = () => {
    if (turno !== 'drone' || droneDeApoioSelecionado === 'nenhum' || droneDeApoioUsado) {
      if (droneDeApoioUsado) addLog("Drone de apoio já foi utilizado nesta missão.");
      return;
    }

    addLog(`Solicitando Drone de Apoio (${droneDeApoioSelecionado})...`);

    switch (droneDeApoioSelecionado) {
      case 'energia':
        setDroneStats(prev => ({
          ...prev,
          bateria: Math.min(maxBateria, prev.bateria + 20)
        }));
        addLog("✅ Suporte de Bateria recebido! +20% Bateria.");
        break;
      case 'integridade':
        setDroneStats(prev => ({
          ...prev,
          integridade: Math.min(maxIntegridade, prev.integridade + 25)
        }));
        addLog("✅ Suporte de Reparo recebido! +25% Integridade.");
        break;
      case 'combustivel':
        setDroneStats(prev => ({
          ...prev,
          combustivel: Math.min(maxCombustivel, prev.combustivel + 15)
        }));
        addLog("✅ Suporte de Reabastecimento recebido! +15% Combustível.");
        break;
    }

    setDroneDeApoioUsado(true);
    proximoTurno();
  };

  const handleConfirmarPoderDespertado = useCallback((nomePoder: string, descPoder: string, raridadePoder: RaridadePoder) => {
    if (!tipoPoderDespertado) return;

    const novoSuperpoder: Superpoder = {
      nome: nomePoder,
      descricao: descPoder,
      tipo: tipoPoderDespertado,
      raridade: raridadePoder,
    };

    setPatoAlvo(prev => ({ ...prev, superpoder: novoSuperpoder }));

    updatePatoStatusInDB({ superpoder: novoSuperpoder, batimentos_cardiacos_bpm: patoBPMAtual });

    addLog(`⚡ Poder despertado catalogado: ${nomePoder} (${tipoPoderDespertado}, ${raridadePoder})`);
    setMostrarModalDespertar(false);
  }, [tipoPoderDespertado, patoBPMAtual, updatePatoStatusInDB, addLog]);

  const acaoPato = useCallback((modo: 'normal' | 'poder_instantaneo' = 'normal') => {
    if (patoHP <= 0 || patoStatusAtual === 'Capturado') return;
    if (modo === 'normal' && turno !== 'pato') return;

    const executarAcao = () => {
      if (modo === 'normal' && patoStunnedTurns > 0) {
        addLog("😵 Pato está Atordoado e não pode agir!");
        proximoTurno();
        return;
      }

      if (modo === 'normal' && patoStatusAtual === 'Hibernação Profunda') {
        addLog("💤 Pato permanece em hibernação profunda.");
        setTurno('drone');
        setMenuAtual('raiz');
        return;
      }

      if (modo === 'normal' && patoStatusAtual === 'Em Transe') {
        if (Math.random() < 0.15) {
          changePatoStatus('Desperto');
        } else {
          addLog("😵 Pato permanece Em Transe.");
        }
        setTurno('drone');
        setMenuAtual('raiz');
        return;
      }

      if (modo === 'normal' && patoStatusAtual === 'Atordoado') {
        addLog("😵 Pato está atordoado, recuperando...");
        if (Math.random() < 0.4) {
          changePatoStatus("Desperto");
          addLog("⚡ O Pato se recuperou do atordoamento!");
        }
        setTurno('drone');
        setMenuAtual('raiz');
        return;
      }

      if (patoStatusAtual === 'Desperto' || modo === 'poder_instantaneo') {
        if (modo === 'normal' && patoHP < 30 && Math.random() < 0.3) {
          const msgFuga = "💨 O PATO CONSEGUIU FUGIR! MISSÃO FALHOU.";
          addLog(msgFuga);
          setPatoStatusAtual("Fugindo");
          handleFimMissao("Falha - Alvo Fugiu", msgFuga);
          return;
        }

        if (patoCarregandoPoder) {
          if (patoAlvo.superpoder) {
            const danoPoderCarregado = Math.floor(Math.random() * 25) + 20;
            let danoFinal = danoPoderCarregado;

            if (isSgdaActive) {
              addLog("🛡️ DEFESA SGDA ATIVADA! Ataque neutralizado!");
              setIsSgdaActive(false);
            } else if (isAbsorvendo) {
              addLog("⚡ Drone absorve a energia do poder! (+15% Bat, -20% Int)");
              setDroneStats(prev => ({
                ...prev,
                bateria: Math.min(maxBateria, prev.bateria + 15),
                integridade: Math.max(0, prev.integridade - 20)
              }));
              setIsAbsorvendo(false);
            } else {
              if (escudoAtivo) {
                danoFinal = Math.floor(danoPoderCarregado * 0.5);
                addLog("🛡️ Escudo absorveu parte do dano!");
              }
              addLog(`💥 PATO LIBERA PODER CARREGADO: ${patoAlvo.superpoder.nome}!`);
              setDroneStats(prev => ({ ...prev, integridade: Math.max(0, prev.integridade - danoFinal) }));
              addLog(`🤖 Drone sofreu ${danoFinal} de dano!`);
            }
            setPatoCarregandoPoder(false);
          }
        } else {
          if (patoAlvo.superpoder && Math.random() < 0.4) {
            addLog("⚡ Pato está CARREGANDO SEU PODER!");
            setPatoCarregandoPoder(true);
          } else if (patoAlvo.superpoder && Math.random() < 0.6) {
            const dano = Math.floor(Math.random() * 15) + 10;
            let danoFinal = dano;

            if (isSgdaActive) {
              addLog("🛡️ DEFESA SGDA ATIVADA! Ataque neutralizado!");
              setIsSgdaActive(false);
            } else if (isAbsorvendo) {
              addLog("⚡ Drone absorve a energia do poder! (+15% Bat, -20% Int)");
              setDroneStats(prev => ({
                ...prev,
                bateria: Math.min(maxBateria, prev.bateria + 15),
                integridade: Math.max(0, prev.integridade - 20)
              }));
              setIsAbsorvendo(false);
            } else {
              if (escudoAtivo) {
                danoFinal = Math.floor(dano * 0.5);
                addLog("🛡️ Escudo absorveu parte do dano!");
              }
              addLog(`⚡ PATO ATACA: Usando ${patoAlvo.superpoder.nome}!`);
              setDroneStats(prev => ({ ...prev, integridade: Math.max(0, prev.integridade - danoFinal) }));
              addLog(`🤖 Drone sofreu ${danoFinal} de dano!`);
            }
          } else {
            const dano = Math.floor(Math.random() * 8) + 5;
            let danoFinal = dano;

            if (isAbsorvendo) {
              addLog("❌ Absorção falhou contra ataque físico!");
              setIsAbsorvendo(false);
            }

            if (escudoAtivo) {
              danoFinal = Math.floor(dano * 0.5);
              addLog("🛡️ Escudo absorveu parte do dano!");
            }
            addLog("👊 PATO ATACA: Ataque Físico!");
            setDroneStats(prev => ({ ...prev, integridade: Math.max(0, prev.integridade - danoFinal) }));
            addLog(`🤖 Drone sofreu ${danoFinal} de dano!`);
          }
        }
      }

      if (modo === 'normal') {
        setTurno('drone');
        setMenuAtual('raiz');
        addLog("--- Sua vez de agir ---");
      }
    };

    if (modo === 'poder_instantaneo') {
      executarAcao();
    } else {
      setTimeout(executarAcao, 1500);
    }
  }, [turno, patoHP, patoStatusAtual, patoStunnedTurns, patoAlvo, patoCarregandoPoder, escudoAtivo, isAbsorvendo, isSgdaActive, maxBateria, addLog, setDroneStats, handleFimMissao, proximoTurno, changePatoStatus]);

  useEffect(() => {
    if (turno === 'pato') {
      acaoPato();
    }
  }, [turno, acaoPato]);

  useEffect(() => {
    if (missaoFinalizada) return;

    let statusFinal: string | null = null;
    let finalLogMessage: string = ""; // Variável para a mensagem

    if (patoStatusAtual === 'Capturado') {
        finalLogMessage = "🎉 ALVO CAPTURADO COM SUCESSO! Retornando à base..."; // Define a mensagem
        addLog(finalLogMessage); // Adiciona ao log local da UI
        statusFinal = "Sucesso - Pato Capturado";
    } else if (droneStats.integridade <= 0) {
        finalLogMessage = "💀 INTEGRIDADE DO DRONE COMPROMETIDA. MISSÃO FALHOU."; // Define a mensagem
        addLog(finalLogMessage); // Adiciona ao log local da UI
        statusFinal = "Falha - Drone Destruído";
    } else if (droneStats.bateria <= 0) {
        finalLogMessage = "🔋 BATERIA ESGOTADA. MISSÃO FALHOU."; // Define a mensagem
        addLog(finalLogMessage); // Adiciona ao log local da UI
        statusFinal = "Falha - Bateria Esgotada";
    }
    // Adicionar outras condições (Fuga, Alvo Morto, etc.) definindo finalLogMessage

    // Se uma condição final foi atingida, chama handleFimMissao com a mensagem
    if (statusFinal) {
        // Não precisa mais marcar missaoFinalizada aqui, handleFimMissao faz isso
        handleFimMissao(statusFinal, finalLogMessage); // <-- Passa a mensagem final
    }

}, [
    patoStatusAtual, droneStats.integridade, droneStats.bateria,
    missaoFinalizada, addLog, handleFimMissao // Mantenha handleFimMissao aqui
]);

  const getHPColor = (hp: number, maxHP: number) => {
    const percent = (hp / maxHP) * 100;
    if (percent > 60) return 'bg-green-500';
    if (percent > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(space.32))]">
      <div className="flex-1 relative bg-gradient-to-b from-gray-700 to-gray-800 rounded-t-lg p-4 flex justify-between items-center overflow-hidden">
        <div className="absolute top-4 right-4 text-right">
          <div className="bg-gray-900 bg-opacity-70 p-3 rounded mb-2 border border-gray-600">
            <p className="text-sm font-bold text-white">{patoAlvo.localizacao.pais}</p>
            <p className={`text-xs font-medium ${
              patoStatusAtual === 'Desperto' ? 'text-red-400' :
              patoStatusAtual === 'Em Transe' ? 'text-yellow-400' :
              patoStatusAtual === 'Capturado' ? 'text-green-400' :
              'text-blue-400'
            }`}>{patoStatusAtual}</p>
            <div className="w-32 bg-gray-600 rounded-full h-2 mt-2">
              <div className={`h-2 rounded-full transition-all duration-500 ${getHPColor(patoHP, patoMaxHP)}`} style={{ width: `${(patoHP / patoMaxHP) * 100}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{patoHP}/{patoMaxHP} HP</p>
            {patoCarregandoPoder && <p className="text-yellow-400 animate-pulse text-xs mt-1">⚡ CARREGANDO!</p>}
            {(patoStatusAtual === 'Hibernação Profunda' || patoStatusAtual === 'Em Transe') && patoBPMAtual !== undefined && (
              <p className="text-red-400 text-xs mt-1 flex items-center justify-end">
                <span className="mr-1 animate-pulse">❤️</span> {patoBPMAtual} BPM
              </p>
            )}
          </div>
          <div className={`w-24 h-24 md:w-32 md:h-32 bg-gray-600 rounded-full flex items-center justify-center border-2 ${
            patoCarregandoPoder ? 'border-yellow-500 animate-pulse' : 'border-gray-500'
          }`}>
            <span className="text-4xl">🦆</span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4">
          <div className={`w-24 h-24 md:w-32 md:h-32 bg-gray-700 rounded-full flex items-center justify-center border-2 relative ${
            escudoAtivo ? 'border-blue-500 ring-4 ring-blue-500 ring-opacity-50' : 'border-gray-500'
          }`}>
            <span className="text-4xl">🤖</span>
            {escudoAtivo && <div className="absolute inset-0 rounded-full bg-blue-500 bg-opacity-20 animate-pulse"></div>}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-b-lg p-4 border-t-4 border-cyan-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="mb-2 p-3 bg-gray-700 rounded border border-blue-600">
              <h3 className="text-sm font-semibold text-blue-400 mb-1">Pontos Fracos Revelados ({pontosFracosDescobertos.length}/3):</h3>
              {pontosFracosDescobertos.length > 0 ? (
                <ul className="list-disc list-inside text-xs space-y-1">
                  {pontosFracosDescobertos.map(pf => (
                    <li key={pf.local} className="text-gray-300">
                      <span className="font-semibold">{pf.local}:</span> {pf.nivel} ({DANO_MULTIPLIER[pf.nivel]}x Dano)
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500 italic">Nenhum ponto fraco descoberto ainda.</p>
              )}
              {scanBloqueado && <p className="text-xs text-yellow-500 mt-1">Scan bloqueado.</p>}
              {ultimoScanResultado && <p className="text-xs text-gray-400 mt-1">Último Scan: {ultimoScanResultado}</p>}
            </div>
            {turno === 'pato' && (
              <div className="bg-yellow-900 bg-opacity-50 p-3 rounded border border-yellow-500 text-center">
                <p className="text-yellow-300 font-semibold">⏳ Turno do Pato - Aguarde...</p>
              </div>
            )}
            {turno === 'drone' && (
              <div className="bg-cyan-900 bg-opacity-50 p-2 rounded border border-cyan-500 text-center">
                <p className="text-cyan-300 font-semibold text-sm">Seu Turno</p>
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-2">
            {menuAtual === 'raiz' && (
              <>
                <button
                  onClick={() => setMenuAtual('atacar')}
                  disabled={turno !== 'drone'}
                  className="w-full p-3 bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 font-bold"
                  data-tooltip-id="combate-tooltip"
                  data-tooltip-content="Opções de ataque: Laser Padrão, Arma Especial e Ataque Rasante."
                >
                  ⚔️ ATACAR
                </button>
                <button
                  onClick={handleScan}
                  disabled={turno !== 'drone' || scanBloqueado || droneStats.bateria < 10 || pontosFracosDescobertos.length >= 3}
                  className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 text-sm"
                  data-tooltip-id="combate-tooltip"
                  data-tooltip-content="Analisa o alvo para revelar pontos fracos. Máximo 3 pontos. 2 falhas consecutivas bloqueiam o scan."
                >
                  🔍 SCAN {scanBloqueado || pontosFracosDescobertos.length >= 3 ? '(BLOQ)' : '(-10%)'}
                </button>
                <button
                  onClick={() => setMenuAtual('captura')}
                  disabled={turno !== 'drone'}
                  className="w-full p-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 text-sm"
                  data-tooltip-id="combate-tooltip"
                  data-tooltip-content="Métodos de captura: Rede Criogênica, Pulso Sônico, Rede de Titânio e Campo de Estase."
                >
                  🎯 CAPTURA
                </button>
                <button
                  onClick={() => setMenuAtual('opcoes')}
                  disabled={turno !== 'drone'}
                  className="w-full p-2 bg-gray-600 hover:bg-gray-700 rounded disabled:opacity-50 text-sm"
                  data-tooltip-id="combate-tooltip"
                  data-tooltip-content="Ações defensivas e de suporte: Escudo, Conversão de Combustível, Absorver, Nano Reparo e SGDA."
                >
                  ⚙️ OPÇÕES
                </button>
              </>
            )}

            {menuAtual === 'atacar' && (
              <>
                <button
                  onClick={handleAtaqueBasico}
                  disabled={turno !== 'drone' || droneStats.bateria < 1}
                  className="w-full p-2 bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 text-sm"
                  data-tooltip-id="combate-tooltip"
                  data-tooltip-content="Ataque básico de energia. Custo baixo, dano moderado. Pode mirar em pontos fracos revelados."
                >
                  Laser Padrão (-1%)
                </button>
                {armaSelecionada && (
                  <button
                    onClick={handleAtaqueArma}
                    disabled={turno !== 'drone' || armaCooldown > 0 || droneStats.bateria < armaSelecionada.custoBateria}
                    className="w-full p-2 bg-red-800 hover:bg-red-900 rounded disabled:opacity-50 text-sm"
                    data-tooltip-id="combate-tooltip"
                    data-tooltip-content={`${armaSelecionada.nome}: Dano ${armaSelecionada.danoBase}. Eficaz contra: ${armaSelecionada.tipoEficazContra.join(', ')}. Pode mirar em pontos fracos.`}
                  >
                    {armaSelecionada.nome} (-{armaSelecionada.custoBateria}%) {armaCooldown > 0 ? `(${armaCooldown}t)` : ''}
                  </button>
                )}
                <button
                  onClick={handleAtaqueRasante}
                  disabled={turno !== 'drone' || droneStats.integridade <= 10}
                  className="w-full p-2 bg-yellow-600 hover:bg-yellow-700 text-black rounded disabled:opacity-50 text-sm font-semibold"
                  data-tooltip-id="combate-tooltip"
                  data-tooltip-content="Investida física arriscada. Causa dano e tem chance de atordoar o alvo. Danifica sua integridade."
                >
                  Ataque Rasante (-10% Int)
                </button>
                <button onClick={() => setMenuAtual('raiz')} className="w-full p-1 bg-gray-500 hover:bg-gray-600 rounded text-xs mt-2">← Voltar</button>
              </>
            )}

            {menuAtual === 'selecionar_alvo' && (
              <div className="space-y-1">
                <p className="text-xs text-center text-gray-400 mb-1">Selecione o Alvo para {ataquePendente?.tipo === 'basico' ? 'Laser Padrão' : ataquePendente?.arma?.nome}:</p>
                {(["Cabeça", "Bico", "Asas", "Cauda", "Peito", "Dorso", "Pés", "Olhos"] as PontoFracoLocal[]).map(local => (
                  <button
                    key={local}
                    onClick={() => executarAtaqueComAlvo(local)}
                    disabled={turno !== 'drone'}
                    className="w-full p-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50 text-xs"
                  >
                    {local}
                    {pontosFracosDescobertos.find(pf => pf.local === local) &&
                      ` (${pontosFracosDescobertos.find(pf => pf.local === local)!.nivel})`}
                  </button>
                ))}
                <button onClick={() => { setMenuAtual('atacar'); setAtaquePendente(null); }} className="w-full p-1 bg-gray-500 hover:bg-gray-600 rounded text-xs mt-2">← Cancelar Alvo</button>
              </div>
            )}

            {menuAtual === 'captura' && (
              <>
                <button
                  onClick={() => handleTentativaCaptura('Rede Criogênica')}
                  disabled={turno !== 'drone' || droneStats.bateria < 15}
                  className="w-full p-3 bg-cyan-600 hover:bg-cyan-700 rounded disabled:opacity-50 text-sm"
                  data-tooltip-id="combate-tooltip"
                  data-tooltip-content="Ideal para alvos dormentes (Hibernando/Transe). Baixa chance contra despertos. Falhas repetidas podem despertar o alvo."
                >
                  Rede Criogênica (-15%)
                </button>

                <button
                  onClick={() => handleTentativaCaptura('Pulso Sônico')}
                  disabled={turno !== 'drone' || droneStats.bateria < 20}
                  className="w-full p-3 bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50 text-sm"
                  data-tooltip-id="combate-tooltip"
                  data-tooltip-content="Eficaz para aprofundar Transe ou atordoar. Arriscado contra Hibernação. Baixa chance contra despertos."
                >
                  Pulso Sônico (-20%)
                </button>

                <button
                  onClick={() => handleTentativaCaptura('Rede de Titânio')}
                  disabled={turno !== 'drone' || droneStats.bateria < 15 || redeTitanioCargas <= 0}
                  className="w-full p-3 bg-gray-500 hover:bg-gray-600 rounded disabled:opacity-50 text-sm"
                  data-tooltip-id="combate-tooltip"
                  data-tooltip-content={`Rede física ultra-resistente. Eficaz contra alvos Despertos com HP baixo (<20%). Desperta alvos dormentes na falha. Cargas: ${redeTitanioCargas}/3`}
                >
                  Rede Titânio (-15%) [{redeTitanioCargas}/3]
                </button>

                <button
                  onClick={() => handleTentativaCaptura('Campo de Estase')}
                  disabled={turno !== 'drone' || campoEstaseUsado || patoStatusAtual !== 'Desperto' || redeTitanioCargas > 0}
                  className="w-full p-3 bg-yellow-700 hover:bg-yellow-800 rounded disabled:opacity-50 text-sm font-bold"
                  data-tooltip-id="combate-tooltip"
                  data-tooltip-content="ÚLTIMO RECURSO. Congela o alvo no tempo. Alto custo (drena quase todos os recursos). Só disponível se Desperto e Rede de Titânio esgotada. Chance maior com HP crítico (<15%). Uso único."
                >
                  Campo Estase (USO ÚNICO)
                </button>

                <button onClick={() => setMenuAtual('raiz')} className="w-full p-2 bg-gray-500 hover:bg-gray-600 rounded text-xs">← Voltar</button>
              </>
            )}

            {menuAtual === 'opcoes' && (
              <>
                <button
                  onClick={handleAtivarEscudo}
                  disabled={turno !== 'drone' || escudoAtivo || droneStats.bateria < 10}
                  className="w-full p-3 bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50 text-sm"
                  data-tooltip-id="combate-tooltip"
                  data-tooltip-content="Ativa escudo energético que reduz dano em 50% por 1 turno."
                >
                  🛡️ Escudo {escudoAtivo ? '(Ativo)' : '(-10%)'}
                </button>
                <button
                  onClick={handleQueimarCombustivel}
                  disabled={turno !== 'drone' || droneStats.combustivel < 25}
                  className="w-full p-3 bg-orange-700 hover:bg-orange-800 rounded disabled:opacity-50 text-sm"
                  data-tooltip-id="combate-tooltip"
                  data-tooltip-content="Converte 25% de combustível em 15% de bateria. Útil em emergências energéticas."
                >
                  🔥 Queimar Combustível (-25% Comb)
                </button>
                <button
                  onClick={handleAbsorver}
                  disabled={turno !== 'drone' || absorverCooldown > 0 || isAbsorvendo || !patoAlvo.superpoder}
                  className="w-full p-3 bg-purple-700 hover:bg-purple-800 rounded disabled:opacity-50 text-sm"
                  data-tooltip-id="combate-tooltip"
                  data-tooltip-content="Absorve próximo ataque de energia, convertendo em +15% bateria. Falha contra ataques físicos. Recarga: 3 turnos."
                >
                  ⚡ Absorver Ataque {absorverCooldown > 0 ? `(${absorverCooldown}t)` : ''} {isAbsorvendo ? '(Ativo)' : ''}
                </button>
                {loadout.reparo && (
                  <button
                    onClick={handleNanoBots}
                    disabled={turno !== 'drone' || nanoCooldown > 0 || droneStats.bateria < 10}
                    className="w-full p-3 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 text-sm"
                    data-tooltip-id="combate-tooltip"
                    data-tooltip-content="Ativa nano-bots para reparar 15% de integridade. Requer módulo de Reparo. Recarga: 3 turnos."
                  >
                    🔧 Nano Reparo (-10%) {nanoCooldown > 0 ? `(${nanoCooldown}t)` : ''}
                  </button>
                )}
                <button
                  onClick={handleSGDA}
                  disabled={turno !== 'drone' || sgdaCooldown > 0 || isSgdaActive || droneStats.bateria < 25}
                  className="w-full p-3 bg-orange-600 hover:bg-orange-700 rounded disabled:opacity-50 text-sm"
                  data-tooltip-id="combate-tooltip"
                  data-tooltip-content="Sistema Gerador de Defesas Aleatórias. Neutraliza completamente o próximo ataque de poder do alvo. Recarga: 4 turnos."
                >
                  🎲 SGDA (-25%) {sgdaCooldown > 0 ? `(${sgdaCooldown}t)` : ''} {isSgdaActive ? '(ATIVO)' : ''}
                </button>
                {droneDeApoioSelecionado !== 'nenhum' && (
                  <button
                    onClick={handleDroneDeApoio}
                    disabled={turno !== 'drone' || droneDeApoioUsado}
                    className="w-full p-3 bg-teal-600 hover:bg-teal-700 rounded disabled:opacity-50 text-sm"
                    data-tooltip-id="combate-tooltip"
                    data-tooltip-content={`Solicita entrega de suprimentos de uso único. Selecionado: ${droneDeApoioSelecionado}.`}
                  >
                    📦 Chamar Drone de Apoio {droneDeApoioUsado ? '(Já Usado)' : ''}
                  </button>
                )}
                <button onClick={() => setMenuAtual('raiz')} className="w-full p-2 bg-gray-500 hover:bg-gray-600 rounded text-xs">← Voltar</button>
              </>
            )}
          </div>
        </div>
      </div>

      {mostrarModalDespertar && <ModalDespertarPato tipoDetectado={tipoPoderDespertado} onConfirm={handleConfirmarPoderDespertado} />}
      <ReactTooltip id="combate-tooltip" place="top" className="max-w-xs text-xs" />
    </div>
  );
}

interface ModalProps {
  tipoDetectado: TipoPoder | null;
  onConfirm: (nome: string, desc: string, raridade: RaridadePoder) => void;
}

const ModalDespertarPato: React.FC<ModalProps> = ({ tipoDetectado, onConfirm }) => {
  const [nome, setNome] = useState('');
  const [desc, setDesc] = useState('');
  const [raridade, setRaridade] = useState<RaridadePoder>('Comum');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-red-900 to-red-800 border-4 border-red-500 p-6 rounded-lg shadow-2xl max-w-lg w-full text-white">
        <h2 className="text-3xl font-bold text-yellow-300 mb-4 text-center">
          🚨 ALERTA: PATO DESPERTOU! 🚨
        </h2>
        <p className="mb-2 text-center text-lg text-cyan-300 font-semibold">
          Tipo de Poder Detectado: {tipoDetectado || 'Analisando...'}
        </p>
        <p className="mb-4 text-center">O alvo saiu do estado dormente! Um poder desconhecido foi detectado. Catalogação de emergência necessária!</p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-bold mb-1">Nome do Poder:</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="bg-gray-800 text-white p-2 rounded w-full border border-red-500 focus:border-yellow-500 focus:outline-none"
              placeholder="Ex: Controle Temporal"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Descrição:</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className="bg-gray-800 text-white p-2 rounded w-full border border-red-500 focus:border-yellow-500 focus:outline-none h-20"
              placeholder="Descreva o poder observado..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Raridade Estimada:</label>
            <select
              value={raridade}
              onChange={e => setRaridade(e.target.value as RaridadePoder)}
              className="bg-gray-800 text-white p-2 rounded w-full border border-red-500 focus:border-yellow-500 focus:outline-none"
            >
              <option>Comum</option>
              <option>Incomum</option>
              <option>Raro</option>
              <option>Épico</option>
              <option>Lendário</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => onConfirm(nome, desc, raridade)}
          disabled={!nome || !desc}
          className="w-full mt-4 p-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✅ Confirmar Análise
        </button>
      </div>
    </div>
  );
};
