import React from 'react';
import { Layers, PlusCircle, Search } from 'lucide-react';

interface NavbarProps {
  activeTab: 'create' | 'view';
  setActiveTab: (tab: 'create' | 'view') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand">
          <div className="brand-icon">
            <Layers size={24} color="#ffffff" />
          </div>
          <div className="brand-text">
            <h1>Production & Work Report</h1>
            <p>Inventory & Production Tracking Dashboard</p>
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
              className={`tab-btn ${activeTab === 'view' ? 'active' : ''}`}
              onClick={() => setActiveTab('view')}
            >
              <Search size={17} />
              <span>View Entries</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
