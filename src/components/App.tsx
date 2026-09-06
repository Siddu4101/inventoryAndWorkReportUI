import React, { useState, useEffect } from 'react';
import './App.css';
import { Navbar } from './Navbar';
import { CreateProcessForm } from './CreateProcessForm';
import { ViewProductionEntries } from './ViewProductionEntries';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
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
        theme={theme}
        toggleTheme={toggleTheme}
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
