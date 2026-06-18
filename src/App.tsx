import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import type { View } from './types';
import Header from './components/Header';
import CatalogView from './components/CatalogView';
import FavoritesView from './components/FavoritesView';
import AddProductView from './components/AddProductView';

function AppContent() {
  const [currentView, setCurrentView] = useState<View>('catalog');

  return (
    <div className="app">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      <main className="main-content" id="main-content">
        {currentView === 'catalog' && <CatalogView />}
        {currentView === 'favorites' && (
          <FavoritesView onNavigate={setCurrentView} />
        )}
        {currentView === 'add' && (
          <AddProductView onNavigate={setCurrentView} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
