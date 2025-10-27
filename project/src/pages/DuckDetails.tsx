import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Radio, Zap, Heart, AlertTriangle, Crosshair, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { PatoPrimordial } from '../types';
import { gParaKg, gParaLbs, cmParaM, cmParaYd, cmParaFt, mParaCm, mParaYd, ydParaM, ydParaCm, formatarNumero } from '../utils/conversions';
import { getRiskLevel } from '../utils/classification';

interface DuckDetailsProps {
  duckId: string;
  onBack: () => void;
}

export default function DuckDetails({ duckId, onBack }: DuckDetailsProps) {
  const [pato, setPato] = useState<PatoPrimordial | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPato();
  }, [duckId]);

  async function fetchPato() {
    setLoading(true);
    const { data, error} = await supabase
      .from('patos_primordiais')
      .select(`
        *,
        marca:drone_marcas (
          nome,
          precisao_valor,
          precisao_unidade,
          fabricante:drone_fabricantes (
            nome,
            pais_origem
          )
        )
      `)
      .eq('id', duckId)
      .maybeSingle();

    if (data) {
      setPato(data as any);
    }

    if (error) {
      console.error('Erro ao buscar pato:', error);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 transition-colors duration-200"
        >
          <ArrowLeft size={20} />
          <span>Voltar ao Catálogo</span>
        </button>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!pato) {
    return (
      <div className="p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 transition-colors duration-200"
        >
          <ArrowLeft size={20} />
          <span>Voltar ao Catálogo</span>
        </button>
        <p className="text-gray-400">Pato não encontrado.</p>
      </div>
    );
  }

  const risco = getRiskLevel(pato);

  return (
    <div className="p-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 transition-colors duration-200"
      >
        <ArrowLeft size={20} />
        <span>Voltar ao Catálogo</span>
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-cyan-400 mb-2">Detalhes do Espécime {pato.id?.substring(0, 8)}</h1>
        <p className="text-gray-400">Dados completos do Pato Primordial</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/50 rounded-lg flex items-center justify-center">
              <Heart className="text-cyan-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-cyan-400">Informações Biológicas</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-sm">Altura</p>
              <p className="text-cyan-300 text-lg font-semibold">{formatarNumero(pato.altura_cm, 0)} cm</p>
              <p className="text-xs text-gray-400 mt-1">
                (equiv. {formatarNumero(cmParaM(pato.altura_cm))} m / {formatarNumero(cmParaFt(pato.altura_cm))} ft)
              </p>
              {pato.dados_originais?.altura && (
                <p className="text-gray-500 text-xs italic">Original: {pato.dados_originais.altura.valor} {pato.dados_originais.altura.unidade}</p>
              )}
            </div>
            <div>
              <p className="text-gray-400 text-sm">Peso</p>
              <p className="text-cyan-300 text-lg font-semibold">{formatarNumero(pato.peso_g, 0)} g</p>
              <p className="text-xs text-gray-400 mt-1">
                (equiv. {formatarNumero(gParaKg(pato.peso_g))} kg / {formatarNumero(gParaLbs(pato.peso_g))} lbs)
              </p>
              {pato.dados_originais?.peso && (
                <p className="text-gray-500 text-xs italic">Original: {pato.dados_originais.peso.valor} {pato.dados_originais.peso.unidade}</p>
              )}
            </div>
            <div>
              <p className="text-gray-400 text-sm">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border mt-1 ${
                pato.capturado ? 'text-green-400 bg-green-500/20 border-green-500/50' :
                pato.status_hibernacao === 'Desperto' ? 'text-red-400 bg-red-500/20 border-red-500/50' :
                pato.status_hibernacao === 'Em Transe' ? 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50' :
                'text-blue-400 bg-blue-500/20 border-blue-500/50'
              }`}>
                {pato.capturado ? 'Capturado' : pato.status_hibernacao}
              </span>
            </div>
            {pato.status_hibernacao !== 'Desperto' && pato.batimentos_cardiacos_bpm && (
              <div>
                <p className="text-gray-400 text-sm">Batimentos Cardíacos</p>
                <p className="text-cyan-300 text-lg font-semibold">{pato.batimentos_cardiacos_bpm} bpm</p>
              </div>
            )}
            <div>
              <p className="text-gray-400 text-sm">Quantidade de Mutações</p>
              <p className="text-cyan-300 text-lg font-semibold">{pato.quantidade_mutacoes}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/50 rounded-lg flex items-center justify-center">
              <MapPin className="text-cyan-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-cyan-400">Localização e Coleta</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-sm">Local</p>
              <p className="text-cyan-300 text-lg font-semibold">{pato.localizacao.cidade}, {pato.localizacao.pais}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Coordenadas GPS</p>
              <p className="text-cyan-300 text-lg font-semibold">{pato.localizacao.latitude}, {pato.localizacao.longitude}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Ponto de Referência</p>
              <p className="text-cyan-300 text-lg font-semibold">{pato.localizacao.pontoDeReferencia || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Precisão GPS</p>
              {(pato as any).marca?.precisao_valor ? (
                <>
                  <p className="text-cyan-300 text-lg font-semibold">
                    {(pato as any).marca.precisao_valor} {(pato as any).marca.precisao_unidade}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    (equiv.
                    {(pato as any).marca.precisao_unidade === 'm' &&
                      `${formatarNumero(mParaCm((pato as any).marca.precisao_valor), 0)} cm / ${formatarNumero(mParaYd((pato as any).marca.precisao_valor))} yd`}
                    {(pato as any).marca.precisao_unidade === 'cm' &&
                      `${formatarNumero(cmParaM((pato as any).marca.precisao_valor))} m / ${formatarNumero(cmParaYd((pato as any).marca.precisao_valor))} yd`}
                    {(pato as any).marca.precisao_unidade === 'yd' &&
                      `${formatarNumero(ydParaM((pato as any).marca.precisao_valor))} m / ${formatarNumero(ydParaCm((pato as any).marca.precisao_valor), 0)} cm`}
                    {!['m', 'cm', 'yd'].includes((pato as any).marca.precisao_unidade) &&
                      `${formatarNumero(pato.precisao_m)} m`}
                    )
                  </p>
                  <p className="text-xs text-gray-500 italic">
                    Definida pela marca: {(pato as any).marca.nome}
                  </p>
                </>
              ) : (
                <p className="text-gray-500">Marca não encontrada</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/50 rounded-lg flex items-center justify-center">
              <Radio className="text-cyan-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-cyan-400">Dados do Drone (Fonte)</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-sm">Nº de Série</p>
              <p className="text-cyan-300 text-lg font-semibold font-mono">{pato.drone_numero_serie || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Marca/Modelo</p>
              <p className="text-cyan-300 text-lg font-semibold">{(pato as any).marca?.nome || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Fabricante</p>
              <p className="text-cyan-300 text-lg font-semibold">{(pato as any).marca?.fabricante?.nome || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">País de Origem</p>
              <p className="text-cyan-300 text-lg font-semibold">{(pato as any).marca?.fabricante?.pais_origem || 'N/A'}</p>
            </div>
          </div>
        </div>

        {pato.status_hibernacao === 'Desperto' && pato.superpoder && (
          <div className="bg-gradient-to-br from-red-950/50 to-orange-950/50 border border-red-500/50 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center justify-center">
                <Zap className="text-red-400" size={20} />
              </div>
              <h2 className="text-xl font-bold text-red-400">Análise de Super-poder</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-sm">Nome do Poder</p>
                <p className="text-red-300 text-lg font-semibold">{pato.superpoder.nome || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Descrição</p>
                <p className="text-gray-300 text-base">{pato.superpoder.descricao || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Tipo</p>
                <p className="text-cyan-300 text-lg font-semibold">
                  {pato.superpoder.tipo === 'Outro'
                    ? pato.superpoder.tipo_custom || 'Outro (não especificado)'
                    : pato.superpoder.tipo || 'N/A'
                  }
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Raridade</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border mt-1 ${
                  pato.superpoder.raridade === 'Lendário' ? 'text-purple-400 bg-purple-500/20 border-purple-500/50' :
                  pato.superpoder.raridade === 'Épico' ? 'text-orange-400 bg-orange-500/20 border-orange-500/50' :
                  pato.superpoder.raridade === 'Raro' ? 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50' :
                  pato.superpoder.raridade === 'Incomum' ? 'text-green-400 bg-green-500/20 border-green-500/50' :
                  'text-gray-400 bg-gray-500/20 border-gray-500/50'
                }`}>
                  {pato.superpoder.raridade || 'N/A'}
                </span>
              </div>
              {pato.superpoder.notas && (
                <div>
                  <p className="text-gray-400 text-sm">Notas Adicionais</p>
                  <p className="text-yellow-400 italic text-base">"{pato.superpoder.notas}"</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-cyan-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-cyan-400">Avaliação de Risco</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-sm">Nível de Risco</p>
              <span className={`inline-block px-4 py-2 rounded-full text-base font-bold border mt-2 ${risco.className}`}>
                {risco.label}
              </span>
            </div>
            <div className="pt-4 border-t border-cyan-500/20">
              <p className="text-gray-400 text-sm mb-2">Recomendações</p>
              <ul className="space-y-2">
                {risco.label === 'Nenhum' && (
                  <li className="flex items-start gap-2 text-gray-400 text-sm">
                    <Crosshair size={16} className="mt-0.5 flex-shrink-0" />
                    <span>Alvo já capturado. Nenhum risco.</span>
                  </li>
                )}
                {risco.label === 'Crítico' && (
                  <>
                    <li className="flex items-start gap-2 text-red-300 text-sm">
                      <Crosshair size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Monitoramento contínuo 24/7 obrigatório</span>
                    </li>
                    <li className="flex items-start gap-2 text-red-300 text-sm">
                      <Crosshair size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Equipe de contenção em standby</span>
                    </li>
                  </>
                )}
                {risco.label === 'Alto' && (
                  <>
                    <li className="flex items-start gap-2 text-orange-300 text-sm">
                      <Crosshair size={16} className="mt-0.5 flex-shrink-0" />
                      <span>Verificações a cada 6 horas</span>
                    </li>
                  </>
                )}
                {(risco.label === 'Médio' || risco.label === 'Baixo') && (
                  <li className="flex items-start gap-2 text-cyan-300 text-sm">
                    <Crosshair size={16} className="mt-0.5 flex-shrink-0" />
                    <span>Monitoramento padrão ativo</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
