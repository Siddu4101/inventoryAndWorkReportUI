import React, { useState } from 'react';
import './App.css';
import { Navbar } from './Navbar';
import { CreateProcessForm } from './CreateProcessForm';
import { ViewProductionEntries } from './ViewProductionEntries';
import { getStoredBaseUrl } from '../services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
  const apiUrl = getStoredBaseUrl();

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
          Production & Work Report UI • API Base Endpoint:{' '}
          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#475569' }}>
            {apiUrl}
          </code>
        </p>
      </footer>
    </div>
  );
};

export default App;
