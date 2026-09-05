import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Send,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  Package,
} from 'lucide-react';
import type { ProcessDto, ProductionDto } from '../types/production';
import { createProductionEntry } from '../services/api';

const getTodayDate = () => new Date().toISOString().split('T')[0];

export const STYLE_OPTIONS = [
  { value: 'TRUNK', label: 'Trunk', multiplier: 45 },
  { value: 'EASY_SHORTS', label: 'Easy Shorts', multiplier: 32 },
  { value: 'LENIN_PANT', label: 'Lenin Pant', multiplier: 23 },
  { value: 'ANKLE_PANTS', label: 'Ankle Pants', multiplier: 23 },
];

const getStyleMultiplier = (styleValue: string): number => {
  const opt = STYLE_OPTIONS.find((s) => s.value === styleValue);
  return opt ? opt.multiplier : 0;
};

const createEmptyProductionDto = (): ProductionDto => ({
  style: 'TRUNK',
  manPowerAllocated: 0,
  target: 0,
  checked: 0,
  pass: 0,
  defects: 0,
  defectPercentage: 0,
  offeredBeyondTarget: 0,
  remarks: '',
});

export const CreateProcessForm: React.FC = () => {
  const [processDate, setProcessDate] = useState<string>(getTodayDate());
  const [hour, setHour] = useState<number>(1);

  const [productionDtos, setProductionDtos] = useState<ProductionDto[]>([
    createEmptyProductionDto(),
  ]);

  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Handle updates for a specific ProductionDto row
  const updateProductionDto = (
    index: number,
    field: keyof ProductionDto,
    value: any
  ) => {
    setProductionDtos((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      let currentStyle = item.style;
      let currentManpower = item.manPowerAllocated;

      if (field === 'style') {
        currentStyle = String(value);
      } else if (field === 'manPowerAllocated') {
        currentManpower = Number(value) || 0;
      }

      // Auto-compute target based on style & manpower
      if (field === 'style' || field === 'manPowerAllocated') {
        const mult = getStyleMultiplier(currentStyle);
        item.target = currentManpower * mult;
      } else if (field === 'target') {
        item.target = Number(value) || 0;
      }

      // Auto-compute entry level numbers when checked / pass / target change
      const c = field === 'checked' ? Number(value) || 0 : item.checked;
      const p = field === 'pass' ? Number(value) || 0 : item.pass;
      const t = item.target;

      if (field === 'defects') {
        const d = Number(value) || 0;
        item.defects = d;
        item.defectPercentage = c > 0 ? Number(((d / c) * 100).toFixed(2)) : 0;
      } else {
        const calculatedDefects = Math.max(0, c - p);
        item.defects = calculatedDefects;
        item.defectPercentage = c > 0 ? Number(((calculatedDefects / c) * 100).toFixed(2)) : 0;
      }

      item.offeredBeyondTarget = Math.max(0, p - t);

      updated[index] = item;
      return updated;
    });
  };

  const addProductionDto = () => {
    setProductionDtos((prev) => [...prev, createEmptyProductionDto()]);
  };

  const removeProductionDto = (index: number) => {
    if (productionDtos.length === 1) {
      // Keep at least one entry
      setProductionDtos([createEmptyProductionDto()]);
      return;
    }
    setProductionDtos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    // Basic validation
    if (!processDate) {
      setStatusMessage({ type: 'error', text: 'Please select a valid process date.' });
      return;
    }

    if (productionDtos.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please add at least one production entry.' });
      return;
    }

    const mappedDtos = productionDtos.map((item) => ({
      ...item,
      id: item.id ? Number(item.id) : null,
      manPowerAllocated: Number(item.manPowerAllocated) || 0,
      target: Number(item.target) || 0,
      checked: Number(item.checked) || 0,
      pass: Number(item.pass) || 0,
      defects: Number(item.defects) || 0,
      defectPercentage: Number(item.defectPercentage) || 0,
      offeredBeyondTarget: Number(item.offeredBeyondTarget) || 0,
    }));

    // Auto calculate top-level totals from production entries
    const totalManPower = mappedDtos.reduce((sum, item) => sum + item.manPowerAllocated, 0);
    const totalTarget = mappedDtos.reduce((sum, item) => sum + item.target, 0);
    const totalChecked = mappedDtos.reduce((sum, item) => sum + item.checked, 0);
    const totalPass = mappedDtos.reduce((sum, item) => sum + item.pass, 0);
    const totalDefects = mappedDtos.reduce((sum, item) => sum + item.defects, 0);
    const totalDefectPct = totalChecked > 0 ? Number(((totalDefects / totalChecked) * 100).toFixed(2)) : 0;

    const payload: ProcessDto = {
      processDate,
      hour: Number(hour) || 1,
      manPowerAllocated: totalManPower,
      target: totalTarget,
      checked: totalChecked,
      pass: totalPass,
      defects: totalDefects,
      defectPercentage: totalDefectPct,
      productionDtos: mappedDtos,
      productionList: mappedDtos,
    };

    try {
      setLoading(true);
      await createProductionEntry(payload);
      setStatusMessage({
        type: 'success',
        text: `Production process entry for date ${processDate} (Hour ${hour}) submitted successfully!`,
      });

      // Reset form or keep date
      setProductionDtos([createEmptyProductionDto()]);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'An error occurred while creating production entry.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-process-wrapper">
      {statusMessage && (
        <div className={`toast-banner ${statusMessage.type}`}>
          <div className="toast-content">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-icon-only"
            onClick={() => setStatusMessage(null)}
            style={{ padding: '0.2rem', border: 'none', background: 'transparent' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Main Process Info Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Calendar size={22} />
                <span>Process Information Header</span>
              </h2>
              <p className="card-subtitle">
                Select target date and working hour
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="processDate">
                <span>Process Date</span>
              </label>
              <input
                id="processDate"
                type="date"
                className="form-control"
                value={processDate}
                onChange={(e) => setProcessDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="hour">
                <span>Working Hour / Shift</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="hour"
                  type="number"
                  min="1"
                  max="24"
                  className="form-control"
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  placeholder="e.g. 1"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Production Entries Section */}
        <div className="card">
          <div className="entries-header">
            <div>
              <h2 className="card-title">
                <Package size={22} />
                <span>Production Entries ({productionDtos.length})</span>
              </h2>
              <p className="card-subtitle">
                Add multiple production styles/items for this process date
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={addProductionDto}
            >
              <Plus size={16} />
              <span>Add Production Entry</span>
            </button>
          </div>

          {productionDtos.map((item, index) => (
            <div key={index} className="entry-card">
              <div className="entry-card-header">
                <span className="entry-badge">Item #{index + 1}</span>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => removeProductionDto(index)}
                  title="Remove entry"
                >
                  <Trash2 size={15} />
                  <span>Remove</span>
                </button>
              </div>

              <div className="entry-grid">
                <div className="form-group">
                  <label className="form-label">Style / Item</label>
                  <select
                    className="form-control"
                    value={item.style}
                    onChange={(e) =>
                      updateProductionDto(index, 'style', e.target.value)
                    }
                    required
                  >
                    {STYLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({opt.multiplier}/mp)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Manpower</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={item.manPowerAllocated}
                    onChange={(e) =>
                      updateProductionDto(
                        index,
                        'manPowerAllocated',
                        e.target.value
                      )
                    }
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Target <span className="auto-tag">Auto</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={item.target}
                    onChange={(e) =>
                      updateProductionDto(index, 'target', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Checked</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={item.checked}
                    onChange={(e) =>
                      updateProductionDto(index, 'checked', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Pass</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={item.pass}
                    onChange={(e) =>
                      updateProductionDto(index, 'pass', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Defects <span className="auto-tag">Auto</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={item.defects}
                    onChange={(e) =>
                      updateProductionDto(index, 'defects', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Defect % <span className="auto-tag">Auto</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={item.defectPercentage}
                    onChange={(e) =>
                      updateProductionDto(
                        index,
                        'defectPercentage',
                        e.target.value
                      )
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Beyond Target <span className="auto-tag">Auto</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={item.offeredBeyondTarget}
                    onChange={(e) =>
                      updateProductionDto(
                        index,
                        'offeredBeyondTarget',
                        e.target.value
                      )
                    }
                    placeholder="0"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Remarks / Notes</label>
                  <input
                    type="text"
                    className="form-control"
                    value={item.remarks}
                    onChange={(e) =>
                      updateProductionDto(index, 'remarks', e.target.value)
                    }
                    placeholder="Enter any production observations, line issues, etc."
                  />
                </div>
              </div>
            </div>
          ))}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addProductionDto}
            >
              <Plus size={16} />
              <span>Add Another Entry</span>
            </button>

            <button
              type="submit"
              className="btn btn-success"
              disabled={loading}
              style={{ minWidth: '180px' }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Production Entry</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
