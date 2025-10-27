import { AlertCircle } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  subtitle: string;
}

export default function Placeholder({ title, subtitle }: PlaceholderProps) {
  return (
    <div className="p-8 h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-500/20 border-2 border-cyan-500/50 rounded-full mb-6">
          <AlertCircle className="text-cyan-400" size={40} />
        </div>
        <h1 className="text-4xl font-bold text-cyan-400 mb-4">{title}</h1>
        <p className="text-xl text-gray-400">{subtitle}</p>
        <div className="mt-8 inline-block bg-gray-900 border border-cyan-500/30 rounded-lg px-6 py-3">
          <p className="text-cyan-300 text-sm font-mono">STATUS: EM DESENVOLVIMENTO</p>
        </div>
      </div>
    </div>
  );
}
