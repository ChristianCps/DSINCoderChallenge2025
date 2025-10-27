import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { converterPrecisaoParaM, mParaYd, ydParaM, formatarNumero } from '../utils/conversions';
import { DroneFabricante, DroneMarca } from '../types';

interface ModalMarcaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (marca: DroneMarca) => void;
  fabricantes: DroneFabricante[];
}

export default function ModalMarca({ isOpen, onClose, onSuccess, fabricantes }: ModalMarcaProps) {
  const [nome, setNome] = useState('');
  const [fabricanteId, setFabricanteId] = useState('');
  const [precisaoValor, setPrecisaoValor] = useState('');
  const [precisaoUnidade, setPrecisaoUnidade] = useState('m');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (fabricantes.length > 0 && !fabricanteId) {
      setFabricanteId(fabricantes[0].id || '');
    }
  }, [fabricantes, fabricanteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const precisao_m = converterPrecisaoParaM(parseFloat(precisaoValor), precisaoUnidade as 'cm' | 'm' | 'yd');

      if (precisao_m < 0.04 || precisao_m > 30) {
        toast.error('A precisão GPS deve estar entre 0.04m e 30m (convertido)');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('drone_marcas')
        .insert([{
          nome,
          fabricante_id: fabricanteId,
          precisao_valor: parseFloat(precisaoValor),
          precisao_unidade: precisaoUnidade
        }])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar marca:', error);
        toast.error('Erro ao criar marca: ' + error.message);
      } else if (data) {
        toast.success('Marca criada com sucesso!');
        onSuccess(data as DroneMarca);
        setNome('');
        setPrecisaoValor('');
        setPrecisaoUnidade('m');
        onClose();
      }
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao criar marca');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-cyan-400">Nova Marca de Drone</h2>
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
              Nome da Marca/Modelo *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Mavic Pro, Phantom 4, etc."
              className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
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
              className="w-full bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
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
                min="0"
                value={precisaoValor}
                onChange={(e) => setPrecisaoValor(e.target.value)}
                placeholder="Ex: 5"
                className="flex-1 bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
              <select
                value={precisaoUnidade}
                onChange={(e) => setPrecisaoUnidade(e.target.value)}
                className="bg-gray-950 border border-cyan-500/30 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="m">m</option>
                <option value="yd">yd</option>
              </select>
            </div>
            <div className="text-xs text-gray-400 mt-1 h-4">
              {(() => {
                const valorNum = parseFloat(precisaoValor);
                if (isNaN(valorNum) || valorNum === 0) return null;

                if (precisaoUnidade === 'm') {
                  return `(equiv. ${formatarNumero(mParaYd(valorNum), 2)} jardas)`;
                } else if (precisaoUnidade === 'yd') {
                  return `(equiv. ${formatarNumero(ydParaM(valorNum), 2)} metros)`;
                }
                return null;
              })()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Deve estar entre 0.04m e 30m quando convertido
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
