import React from 'react';
import { Shield, Zap, Flame } from 'lucide-react';

interface DroneStatusProps {
  integridade: number;
  bateria: number;
  combustivel: number;
  maxIntegridade?: number;
  maxBateria?: number;
  maxCombustivel?: number;
}

const getBarColor = (value: number) => {
  if (value > 60) return 'bg-green-500';
  if (value > 30) return 'bg-yellow-500';
  return 'bg-red-500';
};

const DroneStatus: React.FC<DroneStatusProps> = ({
  integridade,
  bateria,
  combustivel,
  maxIntegridade = 100,
  maxBateria = 100,
  maxCombustivel = 100
}) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Status do Drone Mk-II</h3>
      <div className="space-y-4">

        <div className="flex items-center">
          <Shield className="h-6 w-6 text-blue-400 mr-3 flex-shrink-0" />
          <div className="w-full">
            <span className="text-sm font-medium text-gray-300">Integridade ({integridade}/{maxIntegridade})</span>
            <div className="w-full bg-gray-600 rounded-full h-4 mt-1">
              <div
                className={`h-4 rounded-full transition-all duration-300 ${getBarColor((integridade / maxIntegridade) * 100)}`}
                style={{ width: `${(integridade / maxIntegridade) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <Zap className="h-6 w-6 text-yellow-400 mr-3 flex-shrink-0" />
          <div className="w-full">
            <span className="text-sm font-medium text-gray-300">Bateria ({bateria}/{maxBateria})</span>
            <div className="w-full bg-gray-600 rounded-full h-4 mt-1">
              <div
                className={`h-4 rounded-full transition-all duration-300 ${getBarColor((bateria / maxBateria) * 100)}`}
                style={{ width: `${(bateria / maxBateria) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <Flame className="h-6 w-6 text-orange-400 mr-3 flex-shrink-0" />
          <div className="w-full">
            <span className="text-sm font-medium text-gray-300">Combustível ({combustivel.toFixed(1)} / {maxCombustivel})</span>
            <div className="w-full bg-gray-600 rounded-full h-4 mt-1">
              <div
                className={`h-4 rounded-full transition-all duration-300 ${getBarColor((combustivel / maxCombustivel) * 100)}`}
                style={{ width: `${(combustivel / maxCombustivel) * 100}%` }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DroneStatus;
