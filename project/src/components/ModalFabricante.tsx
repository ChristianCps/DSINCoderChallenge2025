import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { countries } from '../data/countries';
import { DroneFabricante } from '../types';

interface ModalFabricanteProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (fabricante: DroneFabricante) => void;
}

export default function ModalFabricante({ isOpen, onClose, onSuccess }: ModalFabricanteProps) {
  const [nome, setNome] = useState('');
  const [paisOrigem, setPaisOrigem] = useState('Brasil');
  const [unidadePadrao, setUnidadePadrao] = useState<'metrico' | 'imperial'>('metrico');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('drone_fabricantes')
        .insert([{ nome, pais_origem: paisOrigem, unidade_medida_padrao: unidadePadrao }])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar fabricante:', error);
        toast.error('Erro ao criar fabricante: ' + error.message);
      } else if (data) {
        toast.success('Fabricante criado com sucesso!');
        onSuccess(data as DroneFabricante);
        setNome('');
        setPaisOrigem('Brasil');
        setUnidadePadrao('metrico');
        onClose();
      }
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao criar fabricante');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-cyan-400">Novo Fabricante</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome do Fabricante *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: DJI, Parrot, etc."
              className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              País de Origem *
            </label>
            <select
              required
              value={paisOrigem}
              onChange={(e) => setPaisOrigem(e.target.value)}
              className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sistema de Unidades Padrão *
            </label>
            <select
              required
              value={unidadePadrao}
              onChange={(e) => setUnidadePadrao(e.target.value as 'metrico' | 'imperial')}
              className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="metrico">Métrico (cm, g)</option>
              <option value="imperial">Imperial (ft, lb)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Define as unidades que serão bloqueadas nos formulários de catalogação
            </p>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-2 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50"
            >
              <Save size={18} />
              <span>{isLoading ? 'Salvando...' : 'Criar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
