import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { converterPrecisaoParaM } from '../utils/conversions';
import { DroneMarca, DroneFabricante } from '../types';

interface EditarMarcaProps {
  marcaId: string;
  onBack: () => void;
}

export default function EditarMarca({ marcaId, onBack }: EditarMarcaProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [marca, setMarca] = useState<DroneMarca | null>(null);
  const [fabricantes, setFabricantes] = useState<DroneFabricante[]>([]);

  const [nome, setNome] = useState('');
  const [fabricanteId, setFabricanteId] = useState('');
  const [precisaoValor, setPrecisaoValor] = useState('');
  const [precisaoUnidade, setPrecisaoUnidade] = useState('m');

  useEffect(() => {
    fetchData();
  }, [marcaId]);

  async function fetchData() {
    setLoading(true);

    const [marcaResult, fabricantesResult] = await Promise.all([
      supabase
        .from('drone_marcas')
        .select('*')
        .eq('id', marcaId)
        .maybeSingle(),
      supabase
        .from('drone_fabricantes')
        .select('*')
        .order('nome')
    ]);

    if (marcaResult.data) {
      const marcaData = marcaResult.data as DroneMarca;
      setMarca(marcaData);
      setNome(marcaData.nome);
      setFabricanteId(marcaData.fabricante_id);
      setPrecisaoValor(marcaData.precisao_valor.toString());
      setPrecisaoUnidade(marcaData.precisao_unidade);
    }

    if (fabricantesResult.data) {
      setFabricantes(fabricantesResult.data as DroneFabricante[]);
    }

    if (marcaResult.error) {
      console.error('Erro ao buscar marca:', marcaResult.error);
      toast.error('Erro ao buscar marca');
    }

    if (fabricantesResult.error) {
      console.error('Erro ao buscar fabricantes:', fabricantesResult.error);
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const precisao_m = converterPrecisaoParaM(parseFloat(precisaoValor), precisaoUnidade as 'cm' | 'm' | 'yd');

      if (precisao_m < 0.04 || precisao_m > 30) {
        toast.error('A precisão GPS deve estar entre 0.04m e 30m (convertido)');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('drone_marcas')
        .update({
          nome,
          fabricante_id: fabricanteId,
          precisao_valor: parseFloat(precisaoValor),
          precisao_unidade: precisaoUnidade
        })
        .eq('id', marcaId);

      if (error) {
        console.error('Erro ao atualizar marca:', error);
        toast.error('Erro ao atualizar marca: ' + error.message);
      } else {
        toast.success('Marca atualizada com sucesso!');
        onBack();
      }
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao atualizar marca');
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

  if (!marca) {
    return (
      <div className="p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 transition-colors duration-200"
        >
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </button>
        <p className="text-gray-400">Marca não encontrada.</p>
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
        <h1 className="text-3xl font-bold text-cyan-400 mb-2">Editar Marca</h1>
        <p className="text-gray-400">Atualize as informações da marca de drone</p>
      </div>

      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome da Marca/Modelo *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Mavic Pro, Phantom 4, etc."
              className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fabricante *
            </label>
            <select
              required
              value={fabricanteId}
              onChange={(e) => setFabricanteId(e.target.value)}
              className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
            >
              {fabricantes.map((fab) => (
                <option key={fab.id} value={fab.id}>
                  {fab.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Precisão GPS Padrão *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                required
                value={precisaoValor}
                onChange={(e) => setPrecisaoValor(e.target.value)}
                placeholder="Ex: 5"
                className="flex-1 bg-gray-950 border border-cyan-500/30 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
              />
              <select
                value={precisaoUnidade}
                onChange={(e) => setPrecisaoUnidade(e.target.value)}
                className="bg-gray-950 border border-cyan-500/30 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="m">m</option>
                <option value="cm">cm</option>
                <option value="mm">mm</option>
                <option value="ft">ft</option>
                <option value="yd">yd</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Deve estar entre 0.04m e 30m quando convertido
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
