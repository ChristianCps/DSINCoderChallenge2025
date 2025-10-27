import { PatoPrimordial, BaseOperacional } from '../types';

export type RiscoNivel = "Baixo" | "Médio" | "Alto" | "Extremo";
export type CustoNivel = "Baixo" | "Médio" | "Alto" | "Extremo";
export type ValorNivel = "Baixo" | "Médio" | "Alto" | "Inestimável";
export type DificuldadeNivel = "Trivial" | "Baixa" | "Moderada" | "Alta" | "Extrema";

export interface ClassificacaoPato {
  custoOperacional: CustoNivel;
  grauDeRisco: RiscoNivel;
  dificuldade: DificuldadeNivel;
  ganhoCientifico: ValorNivel;
  distanciaKm: number;
  pontos: { custo: number; risco: number; valor: number };
}

function getDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calcularVisaoDeCaptura(
  pato: PatoPrimordial,
  base: BaseOperacional
): ClassificacaoPato {

  let custoPts = 0;
  let riscoPts = 0;
  let valorPts = 0;

  const distanciaKm = getDistanciaKm(
    pato.localizacao.latitude,
    pato.localizacao.longitude,
    base.latitude,
    base.longitude
  );

  if (distanciaKm > 9000) custoPts += 40;
  else if (distanciaKm > 4000) custoPts += 25;
  else if (distanciaKm > 1500) custoPts += 15;
  else if (distanciaKm > 500) custoPts += 5;
  else custoPts += 1;

  const fatorVolume = (pato.altura_cm / 100) * (pato.peso_g / 10000);
  custoPts += fatorVolume;

  custoPts += Math.pow(pato.quantidade_mutacoes, 1.4);

  if (pato.status_hibernacao === 'Desperto') riscoPts += 30;
  else if (pato.status_hibernacao === 'Em Transe') riscoPts += 10;
  else riscoPts += 1;

  if (pato.status_hibernacao === 'Em Transe' && pato.batimentos_cardiacos_bpm && pato.batimentos_cardiacos_bpm > 100) riscoPts += 15;
  else if (pato.status_hibernacao === 'Em Transe' && pato.batimentos_cardiacos_bpm && pato.batimentos_cardiacos_bpm > 70) riscoPts += 5;
  if (pato.status_hibernacao === 'Hibernação Profunda' && pato.batimentos_cardiacos_bpm && pato.batimentos_cardiacos_bpm > 40) riscoPts += 10;

  if (pato.superpoder) {
    riscoPts += 5;
    const tipo = pato.superpoder.tipo;
    if (tipo === 'Bélico' || tipo === 'Caótico' || tipo === 'Espacial') riscoPts += 25;
    else if (tipo === 'Elemental' || tipo === 'Psíquico') riscoPts += 15;

    const notas = pato.superpoder.notas?.toLowerCase();
    if (notas?.includes('alto risco')) riscoPts += 10;
    if (notas?.includes('instável')) riscoPts += 15;
  }

  if (pato.localizacao.pontoDeReferencia) riscoPts += 10;

  const dificuldadeTerreno = pato.localizacao.dificuldade_terreno;
  if (dificuldadeTerreno === 'Extrema') {
    custoPts += 20;
    riscoPts += 15;
  } else if (dificuldadeTerreno === 'Alta') {
    custoPts += 12;
    riscoPts += 10;
  } else if (dificuldadeTerreno === 'Moderada') {
    custoPts += 6;
    riscoPts += 5;
  } else if (dificuldadeTerreno === 'Baixa') {
    custoPts += 3;
    riscoPts += 2;
  }

  if (pato.precisao_m > 20) riscoPts += 15;
  else if (pato.precisao_m > 5) riscoPts += 5;

  valorPts += pato.quantidade_mutacoes * 1.5;

  if (pato.superpoder) {
    valorPts += 10;
    const raridade = pato.superpoder.raridade;
    if (raridade === 'Lendário') valorPts += 50;
    else if (raridade === 'Épico') valorPts += 30;
    else if (raridade === 'Raro') valorPts += 15;
    else valorPts += 2;
  }

  if (pato.altura_cm > 400 || pato.altura_cm < 20) valorPts += 15;
  if (pato.peso_g > 150000) valorPts += 10;

  if (pato.status_hibernacao === 'Desperto') valorPts += 15;
  else if (pato.status_hibernacao === 'Hibernação Profunda') valorPts += 10;

  const custoOperacional: CustoNivel =
    custoPts > 50 ? "Extremo" : custoPts > 25 ? "Alto" : custoPts > 10 ? "Médio" : "Baixo";

  const grauDeRisco: RiscoNivel =
    riscoPts > 50 ? "Extremo" : riscoPts > 25 ? "Alto" : riscoPts > 10 ? "Médio" : "Baixo";

  const ganhoCientifico: ValorNivel =
    valorPts > 50 ? "Inestimável" : valorPts > 25 ? "Alto" : valorPts > 10 ? "Médio" : "Baixo";

  const dificuldadePts = (riscoPts * 2) + (custoPts * 1.5) - (valorPts * 0.5);

  const dificuldade: DificuldadeNivel =
    dificuldadePts > 80 ? "Extrema"
    : dificuldadePts > 50 ? "Alta"
    : dificuldadePts > 25 ? "Moderada"
    : dificuldadePts > 5 ? "Baixa"
    : "Trivial";

  return {
    custoOperacional,
    grauDeRisco,
    dificuldade,
    ganhoCientifico,
    distanciaKm: Math.round(distanciaKm),
    pontos: {
      custo: Math.round(custoPts),
      risco: Math.round(riscoPts),
      valor: Math.round(valorPts)
    },
  };
}

export const getRiskLevel = (pato: PatoPrimordial) => {
  if (pato.capturado) {
    return { label: 'Nenhum', className: 'text-gray-400 bg-gray-700 border-gray-600' };
  }

  if (pato.status_hibernacao === 'Desperto') {
    if (pato.quantidade_mutacoes > 10 || pato.superpoder) {
      return { label: 'Crítico', className: 'text-red-400 bg-red-500/20 border-red-500/50' };
    }
    return { label: 'Alto', className: 'text-orange-400 bg-orange-500/20 border-orange-500/50' };
  }

  if (pato.status_hibernacao === 'Em Transe') {
    if (pato.quantidade_mutacoes > 7 || (pato.batimentos_cardiacos_bpm && pato.batimentos_cardiacos_bpm > 100)) {
      return { label: 'Alto', className: 'text-orange-400 bg-orange-500/20 border-orange-500/50' };
    }
    return { label: 'Médio', className: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50' };
  }

  if (pato.status_hibernacao === 'Hibernação Profunda') {
    return { label: 'Baixo', className: 'text-green-400 bg-green-500/20 border-green-500/50' };
  }

  return { label: 'N/A', className: 'text-gray-400 bg-gray-700 border-gray-600' };
};
