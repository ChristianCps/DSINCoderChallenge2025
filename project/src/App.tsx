import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import Catalog from './pages/Catalog';
import DuckDetails from './pages/DuckDetails';
import NovoRegistroPato from './pages/NovoRegistroPato';
import EditarPato from './pages/EditarPato';
import BasesOperacionais from './pages/BasesOperacionais';
import EditarBase from './pages/EditarBase';
import VisaoCaptura from './pages/VisaoCaptura';
import MissaoCaptura from './pages/MissaoCaptura';
import HistoricoMissoes from './pages/HistoricoMissoes';
import DetalhesMissao from './pages/DetalhesMissao';
import GerenciarDrones from './pages/GerenciarDrones';
import EditarFabricante from './pages/EditarFabricante';
import EditarMarca from './pages/EditarMarca';
import Placeholder from './pages/Placeholder';
import { PageType } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedDuckId, setSelectedDuckId] = useState<string | null>(null);
  const [editingDuckId, setEditingDuckId] = useState<string | null>(null);
  const [editingBaseId, setEditingBaseId] = useState<string | null>(null);
  const [editingFabricanteId, setEditingFabricanteId] = useState<string | null>(null);
  const [editingMarcaId, setEditingMarcaId] = useState<string | null>(null);
  const [missionPatoId, setMissionPatoId] = useState<string | null>(null);
  const [missionBaseId, setMissionBaseId] = useState<string | null>(null);
  const [viewingMissaoId, setViewingMissaoId] = useState<string | null>(null);

  const handleSelectDuck = (id: string) => {
    setSelectedDuckId(id);
    setCurrentPage('details');
  };

  const handleBackToCatalog = () => {
    setSelectedDuckId(null);
    setEditingDuckId(null);
    setCurrentPage('catalog');
  };

  const handleNewRecord = () => {
    setCurrentPage('new-record');
  };

  const handleEditRecord = (id: string) => {
    setEditingDuckId(id);
    setCurrentPage('edit-record');
  };

  const handleEditBase = (id: string) => {
    setEditingBaseId(id);
    setCurrentPage('edit-base');
  };

  const handleBackToBases = () => {
    setEditingBaseId(null);
    setCurrentPage('bases-operacionais');
  };

  const handleEditFabricante = (id: string) => {
    setEditingFabricanteId(id);
    setCurrentPage('editar-fabricante');
  };

  const handleBackToDrones = () => {
    setEditingFabricanteId(null);
    setEditingMarcaId(null);
    setCurrentPage('gerenciar-drones');
  };

  const handleEditMarca = (id: string) => {
    setEditingMarcaId(id);
    setCurrentPage('editar-marca');
  };

  const handleStartMission = (patoId: string, baseId: string) => {
    setMissionPatoId(patoId);
    setMissionBaseId(baseId);
    setCurrentPage('mission');
  };

  const handleBackToVision = () => {
    setMissionPatoId(null);
    setMissionBaseId(null);
    setCurrentPage('vision');
  };

  const handleViewMissaoDetails = (missaoId: string) => {
    setViewingMissaoId(missaoId);
    setCurrentPage('detalhes-missao');
  };

  const handleBackToHistorico = () => {
    setViewingMissaoId(null);
    setCurrentPage('historico-missoes');
  };

  const renderPage = () => {
    if (currentPage === 'details' && selectedDuckId) {
      return <DuckDetails duckId={selectedDuckId} onBack={handleBackToCatalog} />;
    }

    if (currentPage === 'new-record') {
      return <NovoRegistroPato onBack={handleBackToCatalog} />;
    }

    if (currentPage === 'edit-record' && editingDuckId) {
      return <EditarPato patoId={editingDuckId} onBack={handleBackToCatalog} />;
    }

    if (currentPage === 'edit-base' && editingBaseId) {
      return <EditarBase baseId={editingBaseId} onBack={handleBackToBases} />;
    }

    if (currentPage === 'editar-fabricante' && editingFabricanteId) {
      return <EditarFabricante fabricanteId={editingFabricanteId} onBack={handleBackToDrones} />;
    }

    if (currentPage === 'editar-marca' && editingMarcaId) {
      return <EditarMarca marcaId={editingMarcaId} onBack={handleBackToDrones} />;
    }

    if (currentPage === 'mission' && missionPatoId && missionBaseId) {
      return <MissaoCaptura patoId={missionPatoId} baseId={missionBaseId} onBack={handleBackToVision} />;
    }

    if (currentPage === 'detalhes-missao' && viewingMissaoId) {
      return <DetalhesMissao missaoId={viewingMissaoId} onBack={handleBackToHistorico} onViewPato={handleSelectDuck} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'catalog':
        return <Catalog onSelectDuck={handleSelectDuck} onNewRecord={handleNewRecord} onEditRecord={handleEditRecord} />;
      case 'map':
        return <MapPage onSelectDuck={handleSelectDuck} />;
      case 'bases-operacionais':
        return <BasesOperacionais onEditBase={handleEditBase} />;
      case 'gerenciar-drones':
        return <GerenciarDrones onBack={() => setCurrentPage('dashboard')} onEditFabricante={handleEditFabricante} onEditMarca={handleEditMarca} />;
      case 'vision':
        return <VisaoCaptura onStartMission={handleStartMission} />;
      case 'historico-missoes':
        return <HistoricoMissoes onBack={() => setCurrentPage('dashboard')} onViewDetails={handleViewMissaoDetails} />;
      case 'mission':
        return (
          <Placeholder
            title="Missão de Captura"
            subtitle="Em Desenvolvimento"
          />
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid rgba(34, 211, 238, 0.3)',
          },
          success: {
            iconTheme: {
              primary: '#22d3ee',
              secondary: '#1f2937',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#1f2937',
            },
          },
        }}
      />
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <div className="lg:ml-72 flex-1">
        <header className="sticky top-0 z-30 lg:hidden p-4 bg-gray-900 border-b border-gray-700">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-gray-300 hover:text-cyan-400"
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
