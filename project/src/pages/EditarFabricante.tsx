import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { countries } from '../data/countries';
import { DroneFabricante } from '../types';

interface EditarFabricanteProps {
  fabricanteId: string;
  onBack: () => void;
}

export default function EditarFabricante({ fabricanteId, onBack }: EditarFabricanteProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fabricante, setFabricante] = useState<DroneFabricante | null>(null);

  const [nome, setNome] = useState('');
  const [paisOrigem, setPaisOrigem] = useState('Brasil');
  const [unidadePadrao, setUnidadePadrao] = useState<'metrico' | 'imperial'>('metrico');

  useEffect(() => {
    fetchFabricante();
  }, [fabricanteId]);

  async function fetchFabricante() {
    setLoading(true);
    const { data, error } = await supabase
      .from('drone_fabricantes')
      .select('*')
      .eq('id', fabricanteId)
      .maybeSingle();

    if (data) {
      setFabricante(data as DroneFabricante);
      setNome(data.nome);
      setPaisOrigem(data.pais_origem);
      setUnidadePadrao(data.unidade_medida_padrao);
    }

    if (error) {
      console.error('Erro ao buscar fabricante:', error);
      toast.error('Erro ao buscar fabricante');
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('drone_fabricantes')
        .update({
          nome,
          pais_origem: paisOrigem,
          unidade_medida_padrao: unidadePadrao
        })
        .eq('id', fabricanteId);

      if (error) {
        console.error('Erro ao atualizar fabricante:', error);
        toast.error('Erro ao atualizar fabricante: ' + error.message);
      } else {
        toast.success('Fabricante atualizado com sucesso!');
        onBack();
      }
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao atualizar fabricante');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 transition-colors duration-200"
        >
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </button>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!fabricante) {
    return (
      <div className="p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 transition-colors duration-200"
        >
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </button>
        <p className="text-gray-400">Fabricante não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 transition-colors duration-200"
      >
        <ArrowLeft size={20} />
        <span>Voltar</span>
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-cyan-400 mb-2">Editar Fabricante</h1>
        <p className="text-gray-400">Atualize as informações do fabricante</p>
      </div>

      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
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
              className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
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
              className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="metrico">Métrico (cm, g)</option>
              <option value="imperial">Imperial (ft, lb)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Define as unidades que serão bloqueadas nos formulários de catalogação
            </p>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onBack}
              disabled={saving}
              className="px-6 py-3 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50"
            >
              <Save size={18} />
              <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
