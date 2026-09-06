import React from 'react';
import { Layers, PlusCircle, Search, Sun, Moon, SlidersHorizontal } from 'lucide-react';

interface NavbarProps {
  activeTab: 'create' | 'view' | 'config';
  setActiveTab: (tab: 'create' | 'view' | 'config') => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  styleConfigCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  theme,
  toggleTheme,
  styleConfigCount,
}) => {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand">
          <div className="brand-icon">
            <Layers size={24} color="#ffffff" />
          </div>
          <div className="brand-text">
            <h1>MINOSIMHA – HOURLY PRODUCTION REPORT</h1>
            <p>Hourly production tracking dashboard</p>
          </div>
        </div>

        <div className="nav-controls">
          <nav className="nav-tabs" aria-label="Main Navigation">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              <PlusCircle size={17} />
              <span>Create Entry</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => setActiveTab('config')}
              title="Manage styles and manpower multipliers"
            >
              <SlidersHorizontal size={17} />
              <span>Config ({styleConfigCount})</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === 'view' ? 'active' : ''}`}
              onClick={() => setActiveTab('view')}
            >
              <Search size={17} />
              <span>View Entries</span>
            </button>
          </nav>

          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.55rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
};
