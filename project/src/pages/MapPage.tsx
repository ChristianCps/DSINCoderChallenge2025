import { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { PatoPrimordial, BaseOperacional } from '../types';

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface MapPageProps {
  onSelectDuck?: (id: string) => void;
}

export default function MapPage({ onSelectDuck }: MapPageProps) {
  const [patos, setPatos] = useState<PatoPrimordial[]>([]);
  const [bases, setBases] = useState<BaseOperacional[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ id: string; city: string; country: string; status: string; x: number; y: number } | null>(null);
  const [baseTooltip, setBaseTooltip] = useState<{ nome: string; cidade: string; x: number; y: number } | null>(null);

  useEffect(() => {
    fetchPatos();
  }, []);

  async function fetchPatos() {
    setLoading(true);
    const { data: patosData, error: patosError } = await supabase
      .from('patos_primordiais')
      .select('id, localizacao, status_hibernacao');

    const { data: basesData, error: basesError } = await supabase
      .from('bases_operacionais')
      .select('nome, cidade, pais, latitude, longitude, is_sede');

    if (patosData) {
      setPatos(patosData as PatoPrimordial[]);
    }

    if (basesData) {
      setBases(basesData as BaseOperacional[]);
    }

    if (patosError) {
      console.error('Erro ao buscar patos:', patosError);
    }

    if (basesError) {
      console.error('Erro ao buscar bases:', basesError);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-8 h-screen flex flex-col">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">Mapa de Ocorrências</h1>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-screen flex flex-col">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">Mapa de Ocorrências</h1>

      <div className="flex-1 bg-gray-900 border border-cyan-500/30 rounded-lg p-6 relative overflow-hidden">
        <div className="w-full h-full bg-gray-950 rounded-lg border border-cyan-500/20 relative">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 140,
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup zoom={1} center={[0, 20]}>
              <Geographies geography={geoUrl}>
                {({ geographies }: { geographies: any[] }) =>
                  geographies.map((geo: any) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#1e293b"
                      stroke="#334155"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { outline: 'none', fill: '#2d3748' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>

              {patos.map((pato) => (
                <Marker key={pato.id} coordinates={[pato.localizacao.longitude, pato.localizacao.latitude]}>
                  <g
                    className="cursor-pointer"
                    onClick={() => onSelectDuck && pato.id && onSelectDuck(pato.id)}
                  >
                    <circle
                      r={6}
                      fill="#06b6d4"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      className="hover:fill-cyan-300 transition-all duration-200"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          id: pato.id?.substring(0, 8) || '',
                          city: pato.localizacao.cidade,
                          country: pato.localizacao.pais,
                          status: pato.status_hibernacao,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                    <circle
                      r={12}
                      fill="transparent"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          id: pato.id?.substring(0, 8) || '',
                          city: pato.localizacao.cidade,
                          country: pato.localizacao.pais,
                          status: pato.status_hibernacao,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  </g>
                </Marker>
              ))}

              {bases.map((base) => (
                <Marker key={base.nome} coordinates={[base.longitude, base.latitude]}>
                  <rect
                    x="-5"
                    y="-5"
                    width="10"
                    height="10"
                    fill="#EF4444"
                    stroke="#FFF"
                    strokeWidth={1}
                    className="cursor-pointer hover:fill-red-600 transition-all duration-200"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setBaseTooltip({
                        nome: base.nome,
                        cidade: base.cidade || '',
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setBaseTooltip(null)}
                  />
                </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>

          {tooltip && (
            <div
              className="fixed bg-gray-900 border border-cyan-500 rounded-lg p-4 pointer-events-none z-50 shadow-2xl shadow-cyan-500/30"
              style={{
                left: `${tooltip.x}px`,
                top: `${tooltip.y - 120}px`,
                transform: 'translateX(-50%)',
              }}
            >
              <p className="text-cyan-400 font-bold mb-2">Pato ID: {tooltip.id}</p>
              <p className="text-gray-300 text-sm">
                Local: <span className="text-cyan-300">{tooltip.city}, {tooltip.country}</span>
              </p>
              <p className="text-gray-300 text-sm mt-1">
                Status: <span className={`font-semibold ${
                  tooltip.status === 'Desperto' ? 'text-red-400' :
                  tooltip.status === 'Em Transe' ? 'text-yellow-400' :
                  'text-blue-400'
                }`}>{tooltip.status}</span>
              </p>
            </div>
          )}

          {baseTooltip && (
            <div
              className="fixed bg-gray-900 border border-red-500 rounded-lg p-4 pointer-events-none z-50 shadow-2xl shadow-red-500/30"
              style={{
                left: `${baseTooltip.x}px`,
                top: `${baseTooltip.y - 100}px`,
                transform: 'translateX(-50%)',
              }}
            >
              <p className="text-red-400 font-bold mb-2">BASE: {baseTooltip.nome}</p>
              {baseTooltip.cidade && (
                <p className="text-gray-300 text-sm">
                  Local: <span className="text-red-300">{baseTooltip.cidade}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-8 left-8 bg-gray-900/90 border border-cyan-500/50 rounded-lg p-4">
          <p className="text-cyan-400 text-sm font-semibold mb-2">Legenda</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
            <span className="text-gray-300 text-xs">Localização de Pato Primordial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500"></div>
            <span className="text-gray-300 text-xs">Base Operacional</span>
          </div>
          <p className="text-gray-400 text-xs mt-2 italic">Passe o mouse sobre os marcadores</p>
        </div>
      </div>
    </div>
  );
}
