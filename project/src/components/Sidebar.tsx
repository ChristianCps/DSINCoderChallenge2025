import { BarChart3, Book, Map, Telescope, History, Home, Building2, Wrench, X } from 'lucide-react';
import { PageType } from '../types';
import logoDSIN from '../assets/images/logo-dsin.png';

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Sidebar({ currentPage, onPageChange, isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as PageType, label: 'Dashboard', icon: BarChart3 },
    { id: 'catalog' as PageType, label: 'Catálogo de Patos', icon: Book },
    { id: 'map' as PageType, label: 'Mapa de Ocorrências', icon: Map },
    { id: 'bases-operacionais' as PageType, label: 'Bases de Operações', icon: Building2 },
    { id: 'gerenciar-drones' as PageType, label: 'Drones', icon: Wrench },
    { id: 'vision' as PageType, label: 'Operação Visão de Captura', icon: Telescope },
    { id: 'historico-missoes' as PageType, label: 'Histórico de Missões', icon: History },
  ];

  return (
    <>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`
          w-72 bg-gray-950 border-r border-cyan-500/30 h-screen fixed left-0 top-0 flex flex-col z-50
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="p-4 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center justify-center flex-1">
            <img
              src={logoDSIN}
              alt="DSIN Logo - Projeto Pato Primordial"
              className="h-12 w-auto"
            />
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
            aria-label="Fechar menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onPageChange(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all duration-200 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                    : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent'
                }`}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-cyan-500/30">
          <div className="bg-cyan-950/50 border border-cyan-500/30 rounded-lg p-3">
            <p className="text-cyan-400 text-xs font-mono">SISTEMA DSIN</p>
            <p className="text-cyan-600 text-xs mt-1">Monitoramento e Captura de Patos Primordiais</p>
          </div>
        </div>
      </div>
    </>
  );
}
