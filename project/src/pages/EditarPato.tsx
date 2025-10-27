import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { converterAlturaParaCM, converterPesoParaG, converterPrecisaoParaM, cmParaM, cmParaFt, gParaKg, gParaLbs, ftParaCm, ftParaM, lbsParaG, lbsParaKg, formatarNumero } from '../utils/conversions';
import { countries } from '../data/countries';
import { TipoPoder, RaridadePoder, DroneMarca, DroneFabricante } from '../types';
import MapSelectorModal from '../components/MapSelectorModal';
import { getCityCountryFromCoords } from '../utils/geo';

interface EditarPatoProps {
  patoId: string;
  onBack: () => void;
}

export default function EditarPato({ patoId, onBack }: EditarPatoProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [fabricantes, setFabricantes] = useState<DroneFabricante[]>([]);
  const [marcas, setMarcas] = useState<DroneMarca[]>([]);
  const [allMarcas, setAllMarcas] = useState<DroneMarca[]>([]);
  const [selectedFabricanteId, setSelectedFabricanteId] = useState('');
  const [selectedMarcaId, setSelectedMarcaId] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');

  const [alturaValor, setAlturaValor] = useState('');
  const [alturaUnidadeBloqueada, setAlturaUnidadeBloqueada] = useState<'cm' | 'ft'>('cm');
  const [pesoValor, setPesoValor] = useState('');
  const [pesoUnidadeBloqueada, setPesoUnidadeBloqueada] = useState<'g' | 'lb'>('g');
  const [precisaoInfo, setPrecisaoInfo] = useState<{valor: number, unidade: string} | null>(null);

  const [cidade, setCidade] = useState('');
  const [pais, setPais] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [pontoDeReferencia, setPontoDeReferencia] = useState('');
  const [dificuldadeTerreno, setDificuldadeTerreno] = useState('');

  const [statusHibernacao, setStatusHibernacao] = useState<'Desperto' | 'Em Transe' | 'Hibernação Profunda'>('Hibernação Profunda');
  const [batimentosCardiacos, setBatimentosCardiacos] = useState('');
  const [quantidadeMutacoes, setQuantidadeMutacoes] = useState('0');

  const [superpoderNome, setSuperpoderNome] = useState('');
  const [superpoderDescricao, setSuperpoderDescricao] = useState('');
  const [superpoderTipo, setSuperpoderTipo] = useState<TipoPoder>('Bélico');
  const [superpoderTipoCustom, setSuperpoderTipoCustom] = useState('');
  const [superpoderRaridade, setSuperpoderRaridade] = useState<RaridadePoder>('Comum');
  const [superpoderNotas, setSuperpoderNotas] = useState('');

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationLocked, setLocationLocked] = useState(true);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const isInitialDataLoaded = useRef(false);

  useEffect(() => {
    fetchFabricantesAndMarcas();
  }, []);

  useEffect(() => {
    if (selectedFabricanteId) {
      const marcasFiltradas = allMarcas.filter(m => m.fabricante_id === selectedFabricanteId);
      setMarcas(marcasFiltradas);
      if (!marcasFiltradas.find(m => m.id === selectedMarcaId)) {
        setSelectedMarcaId('');
      }
    } else {
      setMarcas([]);
      setSelectedMarcaId('');
    }
  }, [selectedFabricanteId, allMarcas]);

  useEffect(() => {
    if (!selectedMarcaId) {
      setAlturaUnidadeBloqueada('cm');
      setPesoUnidadeBloqueada('g');
      setPrecisaoInfo(null);
      return;
    }

    async function fetchMarcaDetails() {
      const { data: marcaData, error } = await supabase
        .from('drone_marcas')
        .select(`
          *,
          fabricante:drone_fabricantes (unidade_medida_padrao)
        `)
        .eq('id', selectedMarcaId)
        .maybeSingle();

      if (marcaData) {
        const unidadePadrao = marcaData.fabricante?.unidade_medida_padrao;
        setAlturaUnidadeBloqueada(unidadePadrao === 'imperial' ? 'ft' : 'cm');
        setPesoUnidadeBloqueada(unidadePadrao === 'imperial' ? 'lb' : 'g');
        setPrecisaoInfo({
          valor: marcaData.precisao_valor,
          unidade: marcaData.precisao_unidade
        });
      }
      if (error) console.error('Erro ao buscar detalhes da marca:', error);
    }
    fetchMarcaDetails();
  }, [selectedMarcaId]);

  async function fetchFabricantesAndMarcas() {
    const [fabResult, marcaResult] = await Promise.all([
      supabase.from('drone_fabricantes').select('*').order('nome'),
      supabase.from('drone_marcas').select('*').order('nome')
    ]);

    if (fabResult.data) setFabricantes(fabResult.data as DroneFabricante[]);
    if (marcaResult.data) setAllMarcas(marcaResult.data as DroneMarca[]);

    if (fabResult.error) console.error('Erro ao buscar fabricantes:', fabResult.error);
    if (marcaResult.error) console.error('Erro ao buscar marcas:', marcaResult.error);
  }

  useEffect(() => {
    if (!patoId) return;

    async function fetchPatoData() {
      setIsLoadingData(true);
      const { data, error } = await supabase
        .from('patos_primordiais')
        .select('*')
        .eq('id', patoId)
        .maybeSingle();

      if (error) {
        toast.error('Pato não encontrado.');
        onBack();
        return;
      }

      if (data) {
        const marcaId = data.drone_marca_id || '';
        setSelectedMarcaId(marcaId);
        setNumeroSerie(data.drone_numero_serie || '');

        if (marcaId) {
          const { data: marcaData } = await supabase
            .from('drone_marcas')
            .select('fabricante_id')
            .eq('id', marcaId)
            .maybeSingle();

          if (marcaData) {
            setSelectedFabricanteId(marcaData.fabricante_id);
          }
        }

        if (data.dados_originais?.altura) {
          setAlturaValor(data.dados_originais.altura.valor.toString());
        }
        if (data.dados_originais?.peso) {
          setPesoValor(data.dados_originais.peso.valor.toString());
        }

        setQuantidadeMutacoes(data.quantidade_mutacoes.toString());
        setCidade(data.localizacao.cidade);
        setPais(data.localizacao.pais);
        setLatitude(data.localizacao.latitude.toString());
        setLongitude(data.localizacao.longitude.toString());
        setPontoDeReferencia(data.localizacao.pontoDeReferencia || '');
        setDificuldadeTerreno(data.localizacao.dificuldade_terreno || '');

        setStatusHibernacao(data.status_hibernacao);
        setBatimentosCardiacos(data.batimentos_cardiacos_bpm ? data.batimentos_cardiacos_bpm.toString() : '');

        if (data.status_hibernacao === 'Desperto' && data.superpoder) {
          setSuperpoderNome(data.superpoder.nome || '');
          setSuperpoderDescricao(data.superpoder.descricao || '');
          setSuperpoderTipo(data.superpoder.tipo || 'Bélico');
          setSuperpoderTipoCustom(data.superpoder.tipo_custom || '');
          setSuperpoderRaridade(data.superpoder.raridade || 'Comum');
          setSuperpoderNotas(data.superpoder.notas || '');
        }
      }
      setIsLoadingData(false);
      setTimeout(() => {
        isInitialDataLoaded.current = true;
      }, 100);
    }

    fetchPatoData();
  }, [patoId, onBack]);

  useEffect(() => {
    if (!isInitialDataLoaded.current) {
      return;
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (!isNaN(latNum) && !isNaN(lonNum) && latitude.trim() !== '' && longitude.trim() !== '') {
      debounceTimeout.current = setTimeout(async () => {
        setIsFetchingLocation(true);
        const location = await getCityCountryFromCoords(latNum, lonNum);

        let countryFound = false;

        if (location.country) {
          const countryMatch = countries.find(c =>
            c.label.toLowerCase() === location.country?.toLowerCase() ||
            c.value.toLowerCase() === location.country?.toLowerCase()
          );

          if (countryMatch) {
            setPais(countryMatch.value);
            countryFound = true;
          } else {
            setPais(location.country);
            countryFound = true;
          }
          setCidade(location.city || '');
          setLocationLocked(true);
        } else {
          setPais('');
          setCidade('');
          setLocationLocked(false);
          toast('Localização inválida (oceano ou área não mapeada). Insira manualmente.', {
            icon: '⚠️',
          });
        }

        setIsFetchingLocation(false);
      }, 1000);
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [latitude, longitude]);

  const handleMapSelect = async (lat: number, lon: number) => {
    setLatitude(lat.toFixed(6));
    setLongitude(lon.toFixed(6));
    setIsFetchingLocation(true);

    const location = await getCityCountryFromCoords(lat, lon);

    let countryFound = false;

    if (location.country) {
      const countryMatch = countries.find(c =>
        c.label.toLowerCase() === location.country?.toLowerCase() ||
        c.value.toLowerCase() === location.country?.toLowerCase()
      );

      if (countryMatch) {
        setPais(countryMatch.value);
        countryFound = true;
      } else {
        setPais(location.country);
        countryFound = true;
      }
      setCidade(location.city || '');
      setLocationLocked(true);
    } else {
      setPais('');
      setCidade('');
      setLocationLocked(false);
      toast('Localização inválida (oceano ou área não mapeada). Insira manualmente.', {
        icon: '⚠️',
      });
    }

    setIsFetchingLocation(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      if (!precisaoInfo) {
        toast.error('Nenhuma marca selecionada para obter precisão!');
        setIsLoading(false);
        return;
      }

      const altura_cm = converterAlturaParaCM(parseFloat(alturaValor), alturaUnidadeBloqueada);
      const peso_g = converterPesoParaG(parseFloat(pesoValor), pesoUnidadeBloqueada);
      const precisao_m = converterPrecisaoParaM(precisaoInfo.valor, precisaoInfo.unidade as 'cm' | 'm' | 'yd');

      const dadosDoPato = {
        drone_marca_id: selectedMarcaId || null,
        drone_numero_serie: numeroSerie,
        altura_cm,
        peso_g,
        precisao_m,
        dados_originais: {
          altura: { valor: parseFloat(alturaValor), unidade: alturaUnidadeBloqueada },
          peso: { valor: parseFloat(pesoValor), unidade: pesoUnidadeBloqueada },
          precisao: { valor: precisaoInfo.valor, unidade: precisaoInfo.unidade }
        },
        localizacao: {
          cidade,
          pais,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          pontoDeReferencia: pontoDeReferencia || undefined,
          dificuldade_terreno: dificuldadeTerreno || undefined
        },
        status_hibernacao: statusHibernacao,
        batimentos_cardiacos_bpm: statusHibernacao !== 'Desperto' && batimentosCardiacos ? parseInt(batimentosCardiacos) : null,
        quantidade_mutacoes: parseInt(quantidadeMutacoes),
        superpoder: statusHibernacao === 'Desperto' && superpoderNome ? {
          nome: superpoderNome,
          descricao: superpoderDescricao,
          tipo: superpoderTipo,
          tipo_custom: superpoderTipo === 'Outro' ? superpoderTipoCustom : null,
          raridade: superpoderRaridade,
          notas: superpoderNotas
        } : null
      };

      const { error } = await supabase
        .from('patos_primordiais')
        .update(dadosDoPato)
        .eq('id', patoId);

      if (error) {
        console.error('Erro ao atualizar Pato:', error);
        toast.error('Falha ao atualizar: ' + error.message);
      } else {
        toast.success('Pato atualizado com sucesso!');
        onBack();
      }
    } catch (err) {
      console.error('Erro ao processar dados:', err);
      toast.error('Erro ao processar dados do formulário');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-cyan-400">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Voltar ao Catálogo</span>
        </button>
      </div>

      <h1 className="text-3xl font-bold text-cyan-400 mb-8">Alterar Registro de Pato Primordial</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">Informações do Drone</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fabricante *
              </label>
              <select
                required
                value={selectedFabricanteId}
                onChange={(e) => setSelectedFabricanteId(e.target.value)}
                className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">Selecione um fabricante</option>
                {fabricantes.map((fab) => (
                  <option key={fab.id} value={fab.id}>
                    {fab.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Marca/Modelo *
              </label>
              <select
                required
                value={selectedMarcaId}
                onChange={(e) => setSelectedMarcaId(e.target.value)}
                disabled={!selectedFabricanteId}
                className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Selecione uma marca</option>
                {marcas.map((marca) => (
                  <option key={marca.id} value={marca.id}>
                    {marca.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Número de Série *
              </label>
              <input
                type="text"
                required
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">Dados Biométricos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Altura ({alturaUnidadeBloqueada}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                value={alturaValor}
                onChange={(e) => setAlturaValor(e.target.value)}
                className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
              <div className="text-xs text-gray-400 mt-1 h-4">
                {(() => {
                  const valorNum = parseFloat(alturaValor);
                  if (isNaN(valorNum) || valorNum === 0) return null;

                  if (alturaUnidadeBloqueada === 'cm') {
                    return `(equiv. ${formatarNumero(cmParaM(valorNum), 2)} m / ${formatarNumero(cmParaFt(valorNum), 2)} ft)`;
                  } else if (alturaUnidadeBloqueada === 'ft') {
                    return `(equiv. ${formatarNumero(ftParaCm(valorNum), 0)} cm / ${formatarNumero(ftParaM(valorNum), 2)} m)`;
                  }
                  return null;
                })()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Unidade definida pelo fabricante do drone</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Peso ({pesoUnidadeBloqueada}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                value={pesoValor}
                onChange={(e) => setPesoValor(e.target.value)}
                className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
              <div className="text-xs text-gray-400 mt-1 h-4">
                {(() => {
                  const valorNum = parseFloat(pesoValor);
                  if (isNaN(valorNum) || valorNum === 0) return null;

                  if (pesoUnidadeBloqueada === 'g') {
                    return `(equiv. ${formatarNumero(gParaKg(valorNum), 3)} kg / ${formatarNumero(gParaLbs(valorNum), 2)} lbs)`;
                  } else if (pesoUnidadeBloqueada === 'lb') {
                    return `(equiv. ${formatarNumero(lbsParaG(valorNum), 0)} g / ${formatarNumero(lbsParaKg(valorNum), 3)} kg)`;
                  }
                  return null;
                })()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Unidade definida pelo fabricante do drone</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">Localização</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Latitude *
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Longitude *
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMapModalOpen(true)}
            className="mb-4 w-full flex items-center justify-center gap-2 px-4 py-2 border border-cyan-500 text-cyan-400 rounded hover:bg-cyan-500/10 transition-colors text-sm"
          >
            <MapPin size={16} /> Não sabe as coordenadas? Selecione no Mapa
          </button>

          {locationLocked ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  País {isFetchingLocation ? '(Carregando...)' : '(Automático)'}
                </label>
                <input
                  type="text"
                  value={pais}
                  readOnly
                  disabled
                  className="w-full bg-gray-600 border border-gray-500 text-gray-300 rounded px-4 py-2 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cidade {isFetchingLocation ? '(Carregando...)' : '(Automático)'}
                </label>
                <input
                  type="text"
                  value={cidade}
                  readOnly
                  disabled
                  className="w-full bg-gray-600 border border-gray-500 text-gray-300 rounded px-4 py-2 cursor-not-allowed"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-yellow-500 rounded-lg bg-yellow-900 bg-opacity-20">
              <div>
                <label htmlFor="pais_manual" className="block text-sm font-medium text-yellow-400 mb-2">
                  País (Seleção Manual) *
                </label>
                <select
                  id="pais_manual"
                  name="pais_manual"
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Selecione o país...</option>
                  {countries.map((country) => (
                    <option key={country.value} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="cidade_manual" className="block text-sm font-medium text-gray-300 mb-2">
                  Cidade (Manual)
                </label>
                <input
                  id="cidade_manual"
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite a cidade/região"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setLocationLocked(!locationLocked)}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {locationLocked ? 'Corrigir Localização Manualmente?' : 'Travar Campos (Usar Automático)'}
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ponto de Referência
              </label>
              <input
                type="text"
                value={pontoDeReferencia}
                onChange={(e) => setPontoDeReferencia(e.target.value)}
                className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            {precisaoInfo && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Precisão GPS (Definida pela Marca)
                </label>
                <div className="bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-cyan-300">
                  {precisaoInfo.valor} {precisaoInfo.unidade}
                </div>
                <p className="text-xs text-gray-500 mt-1">Precisão GPS automática baseada no modelo do drone</p>
              </div>
            )}
            {pontoDeReferencia && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Dificuldade do Terreno
                </label>
                <select
                  value={dificuldadeTerreno}
                  onChange={(e) => setDificuldadeTerreno(e.target.value)}
                  className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Selecione</option>
                  <option value="Trivial">Trivial</option>
                  <option value="Baixa">Baixa</option>
                  <option value="Moderada">Moderada</option>
                  <option value="Alta">Alta</option>
                  <option value="Extrema">Extrema</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">Status e Habilidades</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status de Hibernação *
              </label>
              <select
                value={statusHibernacao}
                onChange={(e) => setStatusHibernacao(e.target.value as any)}
                className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Hibernação Profunda">Hibernação Profunda</option>
                <option value="Em Transe">Em Transe</option>
                <option value="Desperto">Desperto</option>
              </select>
            </div>

            {statusHibernacao !== 'Desperto' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Batimentos Cardíacos (BPM)
                </label>
                <input
                  type="number"
                  min="0"
                  value={batimentosCardiacos}
                  onChange={(e) => setBatimentosCardiacos(e.target.value)}
                  className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quantidade de Mutações *
              </label>
              <input
                type="number"
                required
                min="0"
                value={quantidadeMutacoes}
                onChange={(e) => setQuantidadeMutacoes(e.target.value)}
                className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {statusHibernacao === 'Desperto' && (
              <div className="border-t border-cyan-500/30 pt-4 mt-4">
                <h3 className="text-lg font-bold text-cyan-400 mb-4">Análise de Super-poder</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nome do Poder
                    </label>
                    <input
                      type="text"
                      value={superpoderNome}
                      onChange={(e) => setSuperpoderNome(e.target.value)}
                      placeholder="Ex: Tempestade Elétrica"
                      className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Descrição
                    </label>
                    <textarea
                      value={superpoderDescricao}
                      onChange={(e) => setSuperpoderDescricao(e.target.value)}
                      rows={3}
                      placeholder="Ex: Gera descargas elétricas em área"
                      className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tipo do Poder
                    </label>
                    <select
                      value={superpoderTipo}
                      onChange={(e) => setSuperpoderTipo(e.target.value as TipoPoder)}
                      className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Bélico">Bélico (Combate direto)</option>
                      <option value="Defensivo">Defensivo (Escudos, barreiras)</option>
                      <option value="Elemental">Elemental (Fogo, água, etc.)</option>
                      <option value="Tecnológico">Tecnológico (Energia, eletrônicos)</option>
                      <option value="Psíquico">Psíquico (Mente, ilusão)</option>
                      <option value="Biológico">Biológico (Regeneração, veneno)</option>
                      <option value="Espacial">Espacial (Tempo, gravidade)</option>
                      <option value="Místico">Místico (Magia, espiritual)</option>
                      <option value="Sônico">Sônico (Som, vibrações)</option>
                      <option value="Caótico">Caótico (Instável, imprevisível)</option>
                      <option value="Outro">Outro (Especificar)</option>
                    </select>
                  </div>
                  {superpoderTipo === 'Outro' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Especifique o Tipo:
                      </label>
                      <input
                        type="text"
                        value={superpoderTipoCustom}
                        onChange={(e) => setSuperpoderTipoCustom(e.target.value)}
                        placeholder="Ex: Gravitacional"
                        className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Raridade
                    </label>
                    <select
                      value={superpoderRaridade}
                      onChange={(e) => setSuperpoderRaridade(e.target.value as RaridadePoder)}
                      className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Comum">Comum</option>
                      <option value="Incomum">Incomum</option>
                      <option value="Raro">Raro</option>
                      <option value="Épico">Épico</option>
                      <option value="Lendário">Lendário</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Notas Adicionais de Classificação
                    </label>
                    <input
                      type="text"
                      value={superpoderNotas}
                      onChange={(e) => setSuperpoderNotas(e.target.value)}
                      placeholder="Ex: alto risco de curto-circuito, instável, etc."
                      className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="px-6 py-3 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading || isFetchingLocation || !pais || !alturaValor || !pesoValor || !selectedMarcaId}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            <span className="font-medium">{isLoading ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>

      <MapSelectorModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onLocationSelect={handleMapSelect}
        initialCoords={!isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude)) ? [parseFloat(latitude), parseFloat(longitude)] : undefined}
      />
    </div>
  );
}
