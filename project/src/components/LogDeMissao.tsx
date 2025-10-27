import React from 'react';

interface LogProps {
  logs: string[];
}

const LogDeMissao: React.FC<LogProps> = ({ logs }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-2">Log da Missão</h3>
      <div className="h-60 overflow-y-auto space-y-2 pr-2">
        {logs.map((log, index) => (
          <p key={index} className="text-sm text-gray-300 font-mono">
            <span className="text-blue-400 mr-2">{`>`}</span>{log}
          </p>
        ))}
        {logs.length === 0 && (
          <p className="text-sm text-gray-500 font-mono">{`> Aguardando início da missão...`}</p>
        )}
      </div>
    </div>
  );
};

export default LogDeMissao;
