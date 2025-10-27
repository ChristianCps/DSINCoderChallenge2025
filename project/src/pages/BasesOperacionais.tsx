import { useState, useEffect, useRef } from 'react';
import { Building2, MapPin, Trash2, Pencil, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { BaseOperacional } from '../types';
import { countries } from '../data/countries';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';
import MapSelectorModal from '../components/MapSelectorModal';
import { getCityCountryFromCoords } from '../utils/geo';

interface BasesOperacionaisProps {
  onEditBase?: (id: string) => void;
}

export default function BasesOperacionais({ onEditBase }: BasesOperacionaisProps) {
  const [bases, setBases] = useState<BaseOperacional[]>([]);
  const [jaExisteSede, setJaExisteSede] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [pais, setPais] = useState('Brasil');
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [isSede, setIsSede] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [itemToDeleteName, setItemToDeleteName] = useState<string>('');

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationLocked, setLocationLocked] = useState(true);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchBases();
  }, []);

  useEffect(() => {
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

  async function fetchBases() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('bases_operacionais')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar bases operacionais');
      console.error('Erro:', error);
    } else if (data) {
      setBases(data);
      const sedeEncontrada = data.some(base => base.is_sede === true);
      setJaExisteSede(sedeEncontrada);
    }
    setIsLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nome.trim() || !pais || latitude === '' || longitude === '') {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);

    const novaBase: Omit<BaseOperacional, 'id' | 'created_at'> = {
      nome: nome.trim(),
      cidade: cidade.trim() || undefined,
      pais,
      latitude: Number(latitude),
      longitude: Number(longitude),
      is_sede: isSede,
    };

    const { error } = await supabase
      .from('bases_operacionais')
      .insert([novaBase]);

    if (error) {
      toast.error('Erro ao adicionar base operacional');
      console.error('Erro:', error);
    } else {
      toast.success('Base operacional adicionada com sucesso!');
      setNome('');
      setCidade('');
      setPais('Brasil');
      setLatitude('');
      setLongitude('');
      setIsSede(false);
      fetchBases();
    }

    setIsSubmitting(false);
  }

  const openDeleteModal = (id: string, nomeBase: string) => {
    setItemToDeleteId(id);
    setItemToDeleteName(nomeBase);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDeleteId) return;

    const { error } = await supabase
      .from('bases_operacionais')
      .delete()
      .eq('id', itemToDeleteId);

    if (error) {
      toast.error('Erro ao excluir base operacional');
      console.error('Erro:', error);
    } else {
      toast.success('Base operacional excluída com sucesso!');
      fetchBases();
    }

    closeModal();
  };

  const closeModal = () => {
    setIsDeleteModalOpen(false);
    setItemToDeleteId(null);
    setItemToDeleteName('');
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-8 h-8 text-cyan-400" />
          <h1 className="text-3xl font-bold text-cyan-400">Bases de Operações</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Building2 className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">Bases de Operações</h1>
          <p className="text-gray-400">Gerencie a Sede (Matriz) e Filiais do Projeto Pato Primordial</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Adicionar Nova Base
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-300 mb-2">
                Nome da Base <span className="text-red-400">*</span>
              </label>
              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Base Central São Paulo"
                className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-gray-300 mb-2">
                  Latitude <span className="text-red-400">*</span>
                </label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="-23.5505"
                  className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-gray-300 mb-2">
                  Longitude <span className="text-red-400">*</span>
                </label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="-46.6333"
                  className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMapModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-cyan-500 text-cyan-400 rounded hover:bg-cyan-500/10 transition-colors text-sm"
            >
              <MapPin size={16} /> Não sabe as coordenadas? Selecione no Mapa
            </button>

            {locationLocked ? (
              <>
                <div>
                  <label htmlFor="pais" className="block text-sm font-medium text-gray-300 mb-2">
                    País {isFetchingLocation ? '(Carregando...)' : '(Automático)'}
                  </label>
                  <input
                    id="pais"
                    type="text"
                    value={pais}
                    readOnly
                    disabled
                    className="w-full bg-gray-600 border border-gray-500 text-gray-300 rounded px-4 py-2 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label htmlFor="cidade" className="block text-sm font-medium text-gray-300 mb-2">
                    Cidade {isFetchingLocation ? '(Carregando...)' : '(Automático)'}
                  </label>
                  <input
                    id="cidade"
                    type="text"
                    value={cidade}
                    readOnly
                    disabled
                    className="w-full bg-gray-600 border border-gray-500 text-gray-300 rounded px-4 py-2 cursor-not-allowed"
                  />
                </div>
              </>
            ) : (
              <div className="col-span-1 md:col-span-2 p-4 border border-yellow-500 rounded-lg bg-yellow-900 bg-opacity-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            )}

            <div className="col-span-1 md:col-span-2">
              <button
                type="button"
                onClick={() => setLocationLocked(!locationLocked)}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {locationLocked ? 'Corrigir Localização Manualmente?' : 'Travar Campos (Usar Automático)'}
              </button>
            </div>

            <div className="border-t border-cyan-500/30 pt-4">
              <div className="flex items-center">
                <input
                  id="is_sede"
                  type="checkbox"
                  checked={isSede}
                  onChange={(e) => setIsSede(e.target.checked)}
                  disabled={jaExisteSede}
                  className="h-4 w-4 rounded border-cyan-500/30 bg-gray-950 text-cyan-500 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label
                  htmlFor="is_sede"
                  className={`ml-2 text-sm ${jaExisteSede ? 'text-gray-500' : 'text-gray-300'}`}
                >
                  Marcar como Sede (Matriz)
                </label>
              </div>
              {jaExisteSede && (
                <p className="mt-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded px-3 py-2">
                  Uma Sede (Matriz) já foi cadastrada. Só é possível ter uma.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isFetchingLocation || !pais || latitude === '' || longitude === ''}
              className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
            >
              {isSubmitting ? 'Adicionando...' : 'Adicionar Base'}
            </button>
          </form>
        </div>

        <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">Bases Cadastradas</h2>

          {bases.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500">Nenhuma base cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {bases.map((base) => (
                <div
                  key={base.id}
                  className="bg-gray-950 rounded-lg p-4 border border-cyan-500/30 hover:border-cyan-500/60 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-white">{base.nome}</h3>
                      <p className="text-sm text-gray-400">
                        {base.cidade ? `${base.cidade}, ` : ''}{base.pais}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {base.is_sede && (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 text-xs font-medium rounded">
                          SEDE
                        </span>
                      )}
                      <button
                        onClick={() => onEditBase && onEditBase(base.id!)}
                        className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors"
                        title="Alterar base"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(base.id!, base.nome)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Excluir base"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 font-mono bg-gray-900 px-3 py-2 rounded border border-cyan-500/20">
                    {base.latitude.toFixed(4)}, {base.longitude.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeModal}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão de Base"
        message={
          <span>
            Tem certeza que deseja excluir permanentemente{' '}
            <strong>{itemToDeleteName}</strong>?
            <span className="block mt-2 text-yellow-400">
              Esta ação não pode ser desfeita.
            </span>
          </span>
        }
        confirmText="Excluir"
        confirmVariant="danger"
      />

      <MapSelectorModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onLocationSelect={handleMapSelect}
        initialCoords={latitude !== '' && longitude !== '' ? [Number(latitude), Number(longitude)] : undefined}
      />
    </div>
  );
}
