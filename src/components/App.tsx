import React, { useState, useEffect } from 'react';
import './App.css';
import { Navbar } from './Navbar';
import { CreateProcessForm } from './CreateProcessForm';
import { ViewProductionEntries } from './ViewProductionEntries';
import { StyleConfigPage } from './StyleConfig';
import { loadStyleConfigs, type StyleConfig } from '../config/styleConfig';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'view' | 'config'>('create');
  const [styleConfigs, setStyleConfigs] = useState<StyleConfig[]>(loadStyleConfigs);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        styleConfigCount={styleConfigs.length}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main className="main-content">
        {activeTab === 'create' && <CreateProcessForm styles={styleConfigs} />}
        {activeTab === 'view' && <ViewProductionEntries styles={styleConfigs} />}
        {activeTab === 'config' && (
          <StyleConfigPage styles={styleConfigs} onStylesChange={setStyleConfigs} />
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
