import { useState, useEffect, useRef } from 'react';
import { Building2, ArrowLeft, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { countries } from '../data/countries';
import toast from 'react-hot-toast';
import MapSelectorModal from '../components/MapSelectorModal';
import { getCityCountryFromCoords } from '../utils/geo';

interface EditarBaseProps {
  baseId: string;
  onBack: () => void;
}

export default function EditarBase({ baseId, onBack }: EditarBaseProps) {
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [pais, setPais] = useState('Brasil');
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [isSede, setIsSede] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jaExisteSede, setJaExisteSede] = useState(false);
  const [estaBaseESede, setEstaBaseESede] = useState(false);

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationLocked, setLocationLocked] = useState(true);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const isInitialDataLoaded = useRef(false);

  useEffect(() => {
    async function fetchData() {
      if (!baseId) return;
      setIsLoading(true);

      const { data: baseData, error: baseError } = await supabase
        .from('bases_operacionais')
        .select('*')
        .eq('id', baseId)
        .maybeSingle();

      if (baseError || !baseData) {
        toast.error('Base não encontrada.');
        onBack();
        return;
      }

      const { data: allBasesData } = await supabase
        .from('bases_operacionais')
        .select('id, is_sede');

      setNome(baseData.nome);
      setCidade(baseData.cidade || '');
      setPais(baseData.pais);
      setLatitude(baseData.latitude);
      setLongitude(baseData.longitude);
      setIsSede(baseData.is_sede);
      setEstaBaseESede(baseData.is_sede);

      const outraSedeExiste = allBasesData?.some(
        (base) => base.is_sede === true && base.id !== baseId
      ) || false;
      setJaExisteSede(outraSedeExiste);

      setIsLoading(false);
      setTimeout(() => {
        isInitialDataLoaded.current = true;
      }, 100);
    }
    fetchData();
  }, [baseId, onBack]);

  useEffect(() => {
    if (!isInitialDataLoaded.current) {
      return;
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (latitude !== '' && longitude !== '') {
      const latNum = Number(latitude);
      const lonNum = Number(longitude);

      if (!isNaN(latNum) && !isNaN(lonNum)) {
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
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [latitude, longitude]);

  const handleMapSelect = async (lat: number, lon: number) => {
    setLatitude(Number(lat.toFixed(6)));
    setLongitude(Number(lon.toFixed(6)));
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nome.trim() || !pais || latitude === '' || longitude === '') {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('bases_operacionais')
      .update({
        nome: nome.trim(),
        cidade: cidade.trim() || undefined,
        pais,
        latitude: Number(latitude),
        longitude: Number(longitude),
        is_sede: isSede,
      })
      .eq('id', baseId);

    setIsSubmitting(false);

    if (error) {
      toast.error('Erro ao atualizar base operacional');
      console.error('Erro:', error);
    } else {
      toast.success('Base operacional atualizada com sucesso!');
      onBack();
    }
  }

  const isSedeCheckboxDisabled = jaExisteSede && !estaBaseESede;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 p-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-400">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold">Alterar Base Operacional</h1>
          </div>
          <p className="text-gray-400">
            Edite as informações da base operacional
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-300 mb-1">
                Nome da Base <span className="text-red-400">*</span>
              </label>
              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Base Central São Paulo"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-gray-300 mb-1">
                  Latitude <span className="text-red-400">*</span>
                </label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="-23.5505"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-gray-300 mb-1">
                  Longitude <span className="text-red-400">*</span>
                </label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="-46.6333"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMapModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-500 text-blue-400 rounded-lg hover:bg-blue-500/10 transition-colors text-sm"
            >
              <MapPin size={16} /> Não sabe as coordenadas? Selecione no Mapa
            </button>

            {locationLocked ? (
              <>
                <div>
                  <label htmlFor="pais" className="block text-sm font-medium text-gray-300 mb-1">
                    País {isFetchingLocation ? '(Carregando...)' : '(Automático)'}
                  </label>
                  <input
                    id="pais"
                    type="text"
                    value={pais}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-gray-300 rounded-lg cursor-not-allowed"
                  />
                </div>

                <div>
                  <label htmlFor="cidade" className="block text-sm font-medium text-gray-300 mb-1">
                    Cidade {isFetchingLocation ? '(Carregando...)' : '(Automático)'}
                  </label>
                  <input
                    id="cidade"
                    type="text"
                    value={cidade}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-gray-300 rounded-lg cursor-not-allowed"
                  />
                </div>
              </>
            ) : (
              <div className="col-span-1 md:col-span-2 p-4 border border-yellow-500 rounded-lg bg-yellow-900 bg-opacity-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pais_manual" className="block text-sm font-medium text-yellow-400 mb-1">
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
                    <label htmlFor="cidade_manual" className="block text-sm font-medium text-gray-300 mb-1">
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
              </div>
            )}

            <div className="col-span-1 md:col-span-2">
              <button
                type="button"
                onClick={() => setLocationLocked(!locationLocked)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {locationLocked ? 'Corrigir Localização Manualmente?' : 'Travar Campos (Usar Automático)'}
              </button>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center">
                <input
                  id="is_sede"
                  type="checkbox"
                  checked={isSede}
                  onChange={(e) => setIsSede(e.target.checked)}
                  disabled={isSedeCheckboxDisabled}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label
                  htmlFor="is_sede"
                  className={`ml-2 text-sm ${isSedeCheckboxDisabled ? 'text-gray-500' : 'text-gray-300'}`}
                >
                  Marcar como Sede (Matriz)
                </label>
              </div>
              {isSedeCheckboxDisabled && (
                <p className="mt-1 text-xs text-yellow-500">
                  Outra base já é a Sede. Desmarque-a primeiro para poder definir esta como Sede.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isFetchingLocation || !pais || latitude === '' || longitude === ''}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </div>
      </div>

      <MapSelectorModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onLocationSelect={handleMapSelect}
        initialCoords={latitude !== '' && longitude !== '' ? [Number(latitude), Number(longitude)] : undefined}
      />
    </div>
  );
}
