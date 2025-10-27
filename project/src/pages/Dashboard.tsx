import { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { Archive, Globe, Zap, Dna, Loader2 } from 'lucide-react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { supabase } from '../lib/supabaseClient';
import { PatoPrimordial, BaseOperacional } from '../types';

interface StatsPorPais {
  total: number;
  despertos: number;
}

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export default function Dashboard() {
  const [patos, setPatos] = useState<PatoPrimordial[]>([]);
  const [bases, setBases] = useState<BaseOperacional[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltipContent, setTooltipContent] = useState('');
  const [statsPorPais, setStatsPorPais] = useState<Record<string, StatsPorPais>>({});
  const [totalPaisesComRegistros, setTotalPaisesComRegistros] = useState(0);

  useEffect(() => {
    fetchPatos();
  }, []);

  async function fetchPatos() {
    setLoading(true);
    const { data: patosData, error: patosError } = await supabase
      .from('patos_primordiais')
      .select('status_hibernacao, quantidade_mutacoes, localizacao, capturado');

    const { data: basesData, error: basesError } = await supabase
      .from('bases_operacionais')
      .select('nome, cidade, pais, latitude, longitude, is_sede');

    if (patosData) {
      setPatos(patosData as PatoPrimordial[]);

      const stats = patosData.reduce((acc, pato) => {
        const pais = pato.localizacao?.pais;
        if (!pais) return acc;

        if (!acc[pais]) {
          acc[pais] = { total: 0, despertos: 0 };
        }

        acc[pais].total += 1;

        if (pato.status_hibernacao === 'Desperto') {
          acc[pais].despertos += 1;
        }

        return acc;
      }, {} as Record<string, StatsPorPais>);

      setStatsPorPais(stats);
      setTotalPaisesComRegistros(Object.keys(stats).length);
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
      <div className="p-8">
        <h1 className="text-3xl font-bold text-cyan-400 mb-8">Dashboard - Resumo da Missão</h1>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
        </div>
      </div>
    );
  }

  const totalDucks = patos.length;
  const awakeDucks = patos.filter(d => d.status_hibernacao === 'Desperto').length;
  const capturedDucks = patos.filter(d => d.capturado === true).length;

  const stats = [
    { label: 'Total de Patos Catalogados', value: totalDucks, icon: Dna, color: 'cyan' },
    { label: 'Patos Despertos', value: awakeDucks, icon: Zap, color: 'red' },
    { label: 'Patos Capturados', value: capturedDucks, icon: Archive, color: 'green' },
    { label: 'Países com Registros', value: totalPaisesComRegistros, icon: Globe, color: 'yellow' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-cyan-400 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 hover:border-cyan-500/60 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${stat.color}-500/20 border border-${stat.color}-500/50`}
                >
                  <Icon className={`text-${stat.color}-400`} size={24} />
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
              <p className="text-3xl font-bold text-cyan-300">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6">
        <h2 className="text-xl font-bold text-cyan-400 mb-4">Distribuição Global de Ocorrências</h2>
        <div className="bg-gray-950 rounded-lg p-4 border border-cyan-500/20">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 140,
            }}
            onMouseLeave={() => setTooltipContent('')}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo: any) => {
                  const countryName = geo.properties.name;

                  const matchedCountry = Object.keys(statsPorPais).find(
                    country => country.toLowerCase() === countryName.toLowerCase() ||
                    (country === 'Brasil' && countryName === 'Brazil') ||
                    (country === 'Japão' && countryName === 'Japan') ||
                    (country === 'Egito' && countryName === 'Egypt') ||
                    (country === 'Austrália' && countryName === 'Australia') ||
                    (country === 'Canadá' && countryName === 'Canada') ||
                    (country === 'Índia' && countryName === 'India')
                  );

                  const dadosPais = matchedCountry ? statsPorPais[matchedCountry] : null;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={dadosPais ? '#22d3ee' : '#1e293b'}
                      stroke={dadosPais ? '#06b6d4' : '#334155'}
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: {
                          outline: 'none',
                          fill: dadosPais ? '#06b6d4' : '#2d3748',
                        },
                        pressed: { outline: 'none' },
                      }}
                      data-tooltip-id="map-tooltip"
                      onMouseEnter={() => {
                        if (dadosPais) {
                          const content = `<strong>${countryName}</strong><br />Patos Catalogados: ${dadosPais.total}<br />Patos Despertos: ${dadosPais.despertos}`;
                          setTooltipContent(content);
                        } else {
                          setTooltipContent(countryName);
                        }
                      }}
                      onMouseLeave={() => {
                        setTooltipContent('');
                      }}
                    />
                  );
                })
              }
            </Geographies>
            {bases.map((base) => (
              <Marker
                key={base.nome}
                coordinates={[base.longitude, base.latitude]}
              >
                <rect
                  x="-5"
                  y="-5"
                  width="10"
                  height="10"
                  fill="#EF4444"
                  stroke="#FFF"
                  strokeWidth={1}
                  data-tooltip-id="map-tooltip"
                  onMouseEnter={() => setTooltipContent(`<strong>BASE: ${base.nome}</strong>`)}
                  onMouseLeave={() => setTooltipContent('')}
                />
              </Marker>
            ))}
          </ComposableMap>
          <ReactTooltip
            id="map-tooltip"
            html={tooltipContent}
            style={{ backgroundColor: '#1F2937', color: '#E5E7EB', borderRadius: '4px' }}
          />
        </div>
        <div className="mt-4 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-cyan-400 rounded"></div>
            <span className="text-sm text-gray-400">Países com Registros</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-400">Bases Operacionais</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-800 rounded"></div>
            <span className="text-sm text-gray-400">Sem Registros</span>
          </div>
        </div>
      </div>
    </div>
  );
}
