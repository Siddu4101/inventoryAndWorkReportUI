import React, { useState } from 'react';
import { Server, Save, X, RotateCcw } from 'lucide-react';
import { getStoredBaseUrl} from '../services/api';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUrlUpdated: (newUrl: string) => void;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({
  isOpen,
  onClose,
  onUrlUpdated,
}) => {
  const [url, setUrl] = useState<string>(getStoredBaseUrl());

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onUrlUpdated(url.trim());
      onClose();
    }
  };

  const handleReset = () => {
    const defaultUrl = 'http://localhost:8080/api/v1/production-process';
    setUrl(defaultUrl);
    onUrlUpdated(defaultUrl);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="card-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem' }}>
          <div className="card-title">
            <Server size={20} />
            <span>Configure Backend API</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-icon-only"
            onClick={onClose}
            style={{ padding: '0.35rem' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Set the base URL for your Spring Boot / backend REST API endpoints.
          </p>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="api-url-input">
              Base API URL
            </label>
            <input
              id="api-url-input"
              type="text"
              className="form-control"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. http://localhost:8080/api/production"
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
              Endpoints: <br />
              • <code>POST &#123;baseUrl&#125;</code> <br />
              • <code>GET &#123;baseUrl&#125;/all-for-date?processDate=...</code>
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleReset}
            >
              <RotateCcw size={14} /> Reset Default
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                <Save size={14} /> Save Configuration
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
