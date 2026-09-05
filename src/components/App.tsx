import React, { useState } from 'react';
import './App.css';
import { Navbar } from './Navbar';
import { CreateProcessForm } from './CreateProcessForm';
import { ViewProductionEntries } from './ViewProductionEntries';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="main-content">
        {activeTab === 'create' ? (
          <CreateProcessForm />
        ) : (
          <ViewProductionEntries />
        )}
      </main>

      <footer className="app-footer">
        <p>
          Production & Work Report UI 
        </p>
      </footer>
    </div>
  );
};

export default App;
