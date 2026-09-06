import React, { useState } from 'react';
import { Check, Pencil, Save, Trash2, X } from 'lucide-react';
import {
  saveStyleConfigs,
  type StyleConfig,
} from '../config/styleConfig';

interface StyleConfigProps {
  styles: StyleConfig[];
  onStylesChange: (styles: StyleConfig[]) => void;
}

type DraftStyle = Omit<StyleConfig, 'id'>;

export const StyleConfigPage: React.FC<StyleConfigProps> = ({ styles, onStylesChange }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftStyle>({ name: '', multiplier: 0 });
  const [message, setMessage] = useState<string | null>(null);

  const persist = (nextStyles: StyleConfig[], successMessage: string) => {
    saveStyleConfigs(nextStyles);
    onStylesChange(nextStyles);
    setMessage(successMessage);
  };

  const startEditing = (style: StyleConfig) => {
    setEditingId(style.id);
    setDraft({ name: style.name, multiplier: style.multiplier });
    setMessage(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft({ name: '', multiplier: 0 });
  };

  const saveDraft = () => {
    const name = draft.name.trim();
    const multiplier = Number(draft.multiplier);

    if (!name || !Number.isFinite(multiplier) || multiplier < 0) {
      setMessage('Enter a style name and a multiplier of zero or greater.');
      return;
    }

    const duplicate = styles.some(
      (style) => style.id !== editingId && style.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      setMessage('A style with this name already exists.');
      return;
    }

    const nextStyles = editingId
      ? styles.map((style) =>
          style.id === editingId ? { ...style, name, multiplier } : style,
        )
      : [...styles, { id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`, name, multiplier }];

    persist(nextStyles, editingId ? 'Style configuration updated.' : 'Style added to the dropdown.');
    cancelEditing();
  };

  const deleteStyle = (id: string) => {
    const nextStyles = styles.filter((style) => style.id !== id);
    persist(nextStyles, 'Style removed from the dropdown.');
    if (editingId === id) cancelEditing();
  };

  return (
    <div className="style-config-page">
      <div className="card config-hero">
        <div>
          <h2 className="card-title"><Pencil size={22} /> Style Configuration</h2>
          <p className="card-subtitle">
            Manage the styles available during entry creation and the target multiplier used for manpower calculations.
          </p>
        </div>
      </div>

      {message && (
        <div className="toast-banner success">
          <div className="toast-content"><Check size={18} /><span>{message}</span></div>
          <button type="button" className="btn btn-secondary btn-icon-only" onClick={() => setMessage(null)}>
            <X size={15} />
          </button>
        </div>
      )}

      <div className="config-layout">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Configured Styles</h3>
              <p className="card-subtitle">Changes are saved in this browser and immediately shared across Create and View.</p>
            </div>
          </div>
          <div className="config-list">
            {styles.length === 0 ? (
              <div className="empty-state"><h3>No styles configured</h3><p>Add one using the form.</p></div>
            ) : styles.map((style) => (
              <div className="config-row" key={style.id}>
                <div>
                  <strong>{style.name}</strong>
                  <span>{style.multiplier} units per manpower</span>
                </div>
                <div className="config-row-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEditing(style)}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteStyle(style.id)}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card config-form-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">{editingId ? 'Edit Style' : 'Add Style'}</h3>
              <p className="card-subtitle">Target = manpower x multiplier</p>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="config-style-name">Style Name</label>
            <input
              id="config-style-name"
              className="form-control"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. Polo Shirt"
            />
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label" htmlFor="config-style-multiplier">Multiplier</label>
            <input
              id="config-style-multiplier"
              type="number"
              min="0"
              step="1"
              className="form-control"
              value={draft.multiplier}
              onChange={(event) => setDraft((current) => ({ ...current, multiplier: Number(event.target.value) }))}
            />
          </div>
          <div className="config-form-actions">
            <button type="button" className="btn btn-primary" onClick={saveDraft}>
              <Save size={16} /> {editingId ? 'Save Changes' : 'Add Style'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={cancelEditing}>
                <X size={16} /> Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
