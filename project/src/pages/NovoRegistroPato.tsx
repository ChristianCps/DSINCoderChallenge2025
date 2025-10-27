import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Plus, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { converterAlturaParaCM, converterPesoParaG, converterPrecisaoParaM, cmParaM, cmParaFt, gParaKg, gParaLbs, ftParaCm, ftParaM, lbsParaG, lbsParaKg, formatarNumero } from '../utils/conversions';
import { countries } from '../data/countries';
import { TipoPoder, RaridadePoder, DroneFabricante, DroneMarca } from '../types';
import ModalFabricante from '../components/ModalFabricante';
import ModalMarca from '../components/ModalMarca';
import MapSelectorModal from '../components/MapSelectorModal';
import { getCityCountryFromCoords } from '../utils/geo';

interface NovoRegistroPatoProps {
  onBack: () => void;
}

export default function NovoRegistroPato({ onBack }: NovoRegistroPatoProps) {
  const [isLoading, setIsLoading] = useState(false);

  const [fabricantes, setFabricantes] = useState<DroneFabricante[]>([]);
  const [marcas, setMarcas] = useState<DroneMarca[]>([]);
  const [selectedFabricanteId, setSelectedFabricanteId] = useState('');
  const [selectedMarcaId, setSelectedMarcaId] = useState('');
  const [generatedSerial, setGeneratedSerial] = useState<string>('Selecione Fabricante/Marca');

  const [modalFabricanteOpen, setModalFabricanteOpen] = useState(false);
  const [modalMarcaOpen, setModalMarcaOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationLocked, setLocationLocked] = useState(true);

  const [alturaValor, setAlturaValor] = useState('');
  const [alturaUnidadeBloqueada, setAlturaUnidadeBloqueada] = useState<'cm' | 'ft'>('cm');
  const [pesoValor, setPesoValor] = useState('');
  const [pesoUnidadeBloqueada, setPesoUnidadeBloqueada] = useState<'g' | 'lb'>('g');
  const [precisaoInfo, setPrecisaoInfo] = useState<{valor: number, unidade: string} | null>(null);

  const [cidade, setCidade] = useState('');
  const [pais, setPais] = useState('Brasil');
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

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchFabricantes();
    fetchMarcas();
  }, []);

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

        if (marcaData.fabricante_id) {
          setSelectedFabricanteId(marcaData.fabricante_id);
        }
      }
      if (error) console.error('Erro ao buscar detalhes da marca:', error);
    }
    fetchMarcaDetails();
  }, [selectedMarcaId]);

  useEffect(() => {
    if (!selectedFabricanteId || !selectedMarcaId) {
      setGeneratedSerial('Selecione Fabricante/Marca');
      return;
    }

    async function generateSerial() {
      setGeneratedSerial('Gerando...');

      const { data: fabData } = await supabase
        .from('drone_fabricantes')
        .select('nome')
        .eq('id', selectedFabricanteId)
        .maybeSingle();

      const { data: marcaData } = await supabase
        .from('drone_marcas')
        .select('nome')
        .eq('id', selectedMarcaId)
        .maybeSingle();

      if (!fabData || !marcaData) {
        setGeneratedSerial('Erro ao buscar nomes');
        return;
      }

      const fabSigla = (fabData.nome.substring(0, 2).toUpperCase() + 'ZZ').substring(0, 2);
      const marcaSigla = (marcaData.nome.substring(0, 2).toUpperCase() + 'ZZ').substring(0, 2);
      const prefix = fabSigla + marcaSigla;

      const { data: lastSerialData, error: serialError } = await supabase
        .from('patos_primordiais')
        .select('drone_numero_serie')
        .like('drone_numero_serie', `${prefix}-%`)
        .order('drone_numero_serie', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNum = 1;
      if (lastSerialData && lastSerialData.drone_numero_serie) {
        try {
          const lastNumStr = lastSerialData.drone_numero_serie.split('-')[1];
          const lastNum = parseInt(lastNumStr, 10);
          if (!isNaN(lastNum)) {
            nextNum = lastNum + 1;
          }
        } catch (e) {
          console.error('Erro ao parsear último serial:', e);
        }
      } else if (serialError && serialError.code !== 'PGRST116') {
        console.error('Erro ao buscar último serial:', serialError);
      }

      const numeroFormatado = String(nextNum).padStart(4, '0');
      setGeneratedSerial(`${prefix}-${numeroFormatado}`);
    }

    generateSerial();
  }, [selectedFabricanteId, selectedMarcaId]);

  useEffect(() => {
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

  async function fetchFabricantes() {
    const { data, error } = await supabase
      .from('drone_fabricantes')
      .select('*')
      .order('nome');

    if (data) setFabricantes(data as DroneFabricante[]);
    if (error) console.error('Erro ao buscar fabricantes:', error);
  }

  async function fetchMarcas() {
    const { data, error } = await supabase
      .from('drone_marcas')
      .select('*')
      .order('nome');

    if (data) setMarcas(data as DroneMarca[]);
    if (error) console.error('Erro ao buscar marcas:', error);
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (generatedSerial === 'Gerando...' || generatedSerial.includes('Erro') || generatedSerial === 'Selecione Fabricante/Marca') {
      toast.error('Aguarde a geração do número de série ou selecione um fabricante/marca válido');
      return;
    }

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

      if (precisao_m < 0.04 || precisao_m > 30) {
        toast.error('A precisão GPS da marca deve estar entre 0.04m e 30m (convertido)');
        setIsLoading(false);
        return;
      }

      const dadosDoPato = {
        drone_marca_id: selectedMarcaId || null,
        drone_numero_serie: generatedSerial,
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
        } : null,
        capturado: false
      };

      const { error } = await supabase.from('patos_primordiais').insert([dadosDoPato]);

      if (error) {
        console.error('Erro ao salvar Pato:', error);
        if (error.code === '23505' && error.message.includes('drone_numero_serie')) {
          toast.error('Este número de série já está cadastrado!');
        } else {
          toast.error('Falha ao catalogar: ' + error.message);
        }
      } else {
        toast.success('Pato Primordial catalogado com sucesso!');
        onBack();
      }
    } catch (err) {
      console.error('Erro ao processar dados:', err);
      toast.error('Erro ao processar dados do formulário');
    } finally {
      setIsLoading(false);
    }
  };

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

  const marcasFiltradas = selectedFabricanteId
    ? marcas.filter(m => m.fabricante_id === selectedFabricanteId)
    : marcas;

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

      <h1 className="text-3xl font-bold text-cyan-400 mb-8">Novo Registro de Pato Primordial</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">Informações do Drone</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fabricante *
              </label>
              <div className="flex gap-2">
                <select
                  required
                  value={selectedFabricanteId}
                  onChange={(e) => setSelectedFabricanteId(e.target.value)}
                  className="flex-1 bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Selecione um fabricante</option>
                  {fabricantes.map((fab) => (
                    <option key={fab.id} value={fab.id}>
                      {fab.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setModalFabricanteOpen(true)}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded-lg transition-all"
                  title="Adicionar Fabricante"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Marca/Modelo *
              </label>
              <div className="flex gap-2">
                <select
                  required
                  value={selectedMarcaId}
                  onChange={(e) => setSelectedMarcaId(e.target.value)}
                  className="flex-1 bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Selecione uma marca</option>
                  {marcasFiltradas.map((marca) => (
                    <option key={marca.id} value={marca.id}>
                      {marca.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setModalMarcaOpen(true)}
                  disabled={fabricantes.length === 0}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Adicionar Marca"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Número de Série (Automático)
              </label>
              <div className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-cyan-300 font-mono">
                {generatedSerial}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Gerado automaticamente baseado no fabricante e marca
              </p>
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
            disabled={isLoading || isFetchingLocation || !pais || !alturaValor || !pesoValor || !selectedMarcaId || !generatedSerial.includes('-')}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            <span className="font-medium">{isLoading ? 'Salvando...' : 'Catalogar Pato'}</span>
          </button>
        </div>
      </form>

      <ModalFabricante
        isOpen={modalFabricanteOpen}
        onClose={() => setModalFabricanteOpen(false)}
        onSuccess={(fabricante) => {
          setFabricantes([...fabricantes, fabricante]);
          setSelectedFabricanteId(fabricante.id || '');
          fetchFabricantes();
        }}
      />

      <ModalMarca
        isOpen={modalMarcaOpen}
        onClose={() => setModalMarcaOpen(false)}
        onSuccess={(marca) => {
          setMarcas([...marcas, marca]);
          setSelectedMarcaId(marca.id || '');
          fetchMarcas();
        }}
        fabricantes={fabricantes}
      />

      <MapSelectorModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onLocationSelect={handleMapSelect}
        initialCoords={!isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude)) ? [parseFloat(latitude), parseFloat(longitude)] : undefined}
      />
    </div>
  );
}
