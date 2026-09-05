import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Calendar,
  RefreshCw,
  Users,
  CheckCircle,
  AlertTriangle,
  Filter,
  Download,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Save,
  X,
  CheckCircle2,
} from 'lucide-react';
import type { ProcessDto, ProductionDto } from '../types/production';
import {
  getAllProductionEntriesForDate,
  deleteProductionEntries,
  updateProductionEntries,
} from '../services/api';

const getTodayDate = () => new Date().toISOString().split('T')[0];

const getStyleMultiplier = (styleName: string): number => {
  const norm = (styleName || '').toUpperCase().replace(/[\s_-]+/g, '');
  if (norm.includes('TRUNK')) return 45;
  if (norm.includes('EASYSHORTS') || norm.includes('EASY') || norm.includes('SHORT')) return 32;
  if (norm.includes('LENINPANT') || norm.includes('LENIN')) return 23;
  if (norm.includes('ANKLEPANTS') || norm.includes('ANKLE')) return 23;
  return 0;
};

export const ViewProductionEntries: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [processes, setProcesses] = useState<ProcessDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedHourFilter, setSelectedHourFilter] = useState<string>('ALL');
  const [collapsedHours, setCollapsedHours] = useState<Record<number, boolean>>({});

  // Selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingMap, setEditingMap] = useState<Record<number, ProductionDto>>({});

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const fetchEntries = useCallback(async (dateToFetch: string) => {
    if (!dateToFetch) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getAllProductionEntriesForDate(dateToFetch);
      const sortedData = [...data].sort((a, b) => (a.hour || 0) - (b.hour || 0));
      setProcesses(sortedData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch production entries.');
      setProcesses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries(selectedDate);
    // Reset selection and edit mode when date changes
    setSelectedIds([]);
    setIsEditMode(false);
    setEditingMap({});
  }, [selectedDate, fetchEntries]);

  const toggleHourCollapse = (hourNum: number) => {
    setCollapsedHours((prev) => ({
      ...prev,
      [hourNum]: !prev[hourNum],
    }));
  };

  const collapseAll = () => {
    const newCollapsed: Record<number, boolean> = {};
    processes.forEach((p) => {
      newCollapsed[p.hour] = true;
    });
    setCollapsedHours(newCollapsed);
  };

  const expandAll = () => {
    setCollapsedHours({});
  };

  // Helper to extract production items array regardless of backend property name
  const getProductionItems = (p: ProcessDto): ProductionDto[] => {
    return p.productionList || p.productionDtos || [];
  };

  // Toggle selection for a single ProductionDto row
  const toggleSelectRow = (id: number) => {
    if (isEditMode) return; // Prevent selection changes during edit mode
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Toggle selection for all items in a single hour
  const toggleSelectProcess = (proc: ProcessDto) => {
    if (isEditMode) return;
    const procItemIds = getProductionItems(proc)
      .map((item) => item.id)
      .filter((id): id is number => id != null);

    const areAllSelected = procItemIds.every((id) => selectedIds.includes(id));

    if (areAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !procItemIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...procItemIds])));
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setIsEditMode(false);
    setEditingMap({});
  };

  // Enter Edit Mode for selected rows
  const startEditingSelected = () => {
    if (selectedIds.length === 0) return;
    const newEditingMap: Record<number, ProductionDto> = {};

    processes.forEach((proc) => {
      getProductionItems(proc).forEach((item) => {
        if (item.id != null && selectedIds.includes(item.id)) {
          newEditingMap[item.id] = { ...item };
        }
      });
    });

    setEditingMap(newEditingMap);
    setIsEditMode(true);
  };

  // Cancel Editing
  const cancelEditing = () => {
    setIsEditMode(false);
    setEditingMap({});
  };

  // Handle field update for an item in edit mode with auto-calculations
  const handleEditFieldChange = (
    id: number,
    field: keyof ProductionDto,
    value: string | number
  ) => {
    setEditingMap((prev) => {
      const current = prev[id];
      if (!current) return prev;

      const updated = { ...current, [field]: value };

      if (field === 'manPowerAllocated') {
        const manpower = Number(value) || 0;
        updated.manPowerAllocated = manpower;
        const multiplier = getStyleMultiplier(updated.style);
        updated.target = manpower * multiplier;
      } else if (field === 'checked') {
        updated.checked = Number(value) || 0;
      } else if (field === 'pass') {
        updated.pass = Number(value) || 0;
      } else if (field === 'defects') {
        updated.defects = Number(value) || 0;
      } else if (field === 'remarks') {
        updated.remarks = String(value);
      }

      // Auto compute defects, defect %, offeredBeyondTarget
      const c = updated.checked;
      const p = updated.pass;
      const t = updated.target;

      if (field !== 'defects') {
        updated.defects = Math.max(0, c - p);
      }

      updated.defectPercentage = c > 0 ? Number(((updated.defects / c) * 100).toFixed(2)) : 0;
      updated.offeredBeyondTarget = Math.max(0, p - t);

      return {
        ...prev,
        [id]: updated,
      };
    });
  };

  // Submit Delete Request
  const handleConfirmDelete = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    setStatusMessage(null);

    try {
      await deleteProductionEntries(selectedIds);
      setStatusMessage({
        type: 'success',
        text: `Successfully deleted ${selectedIds.length} production entry(ies).`,
      });
      setShowDeleteModal(false);
      clearSelection();
      await fetchEntries(selectedDate);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to delete selected entries.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Update Request
  const handleConfirmUpdate = async () => {
    if (selectedIds.length === 0 || !isEditMode) return;
    setActionLoading(true);
    setStatusMessage(null);

    try {
      // Group updated process DTOs
      const processDtosToUpdate: ProcessDto[] = [];

      processes.forEach((proc) => {
        const items = getProductionItems(proc);
        const hasEditedItem = items.some(
          (item) => item.id != null && selectedIds.includes(item.id)
        );

        if (hasEditedItem) {
          // Replace edited items, keep intact items
          const updatedItems = items.map((item) => {
            if (item.id != null && selectedIds.includes(item.id) && editingMap[item.id]) {
              return editingMap[item.id];
            }
            return item;
          });

          // Recalculate Process level totals
          const totalManpower = updatedItems.reduce((acc, curr) => acc + (Number(curr.manPowerAllocated) || 0), 0);
          const totalTarget = updatedItems.reduce((acc, curr) => acc + (Number(curr.target) || 0), 0);
          const totalChecked = updatedItems.reduce((acc, curr) => acc + (Number(curr.checked) || 0), 0);
          const totalPass = updatedItems.reduce((acc, curr) => acc + (Number(curr.pass) || 0), 0);
          const totalDefects = updatedItems.reduce((acc, curr) => acc + (Number(curr.defects) || 0), 0);
          const totalDefectPct = totalChecked > 0 ? Number(((totalDefects / totalChecked) * 100).toFixed(2)) : 0;

          const updatedProc: ProcessDto = {
            id: proc.id,
            processDate: proc.processDate,
            hour: proc.hour,
            manPowerAllocated: totalManpower,
            target: totalTarget,
            checked: totalChecked,
            pass: totalPass,
            defects: totalDefects,
            defectPercentage: totalDefectPct,
            productionList: updatedItems,
            productionDtos: updatedItems,
          };

          processDtosToUpdate.push(updatedProc);
        }
      });

      await updateProductionEntries(processDtosToUpdate);
      setStatusMessage({
        type: 'success',
        text: `Successfully updated ${selectedIds.length} selected production entry(ies).`,
      });
      clearSelection();
      await fetchEntries(selectedDate);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to update selected entries.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter processes by hour and production entries by search query
  const filteredProcesses = processes
    .filter((p) => {
      if (selectedHourFilter === 'ALL') return true;
      return String(p.hour) === selectedHourFilter;
    })
    .map((p) => {
      const items = getProductionItems(p);
      if (!searchQuery.trim()) {
        return { ...p, productionList: items, productionDtos: items };
      }
      const query = searchQuery.toLowerCase();
      const processIdMatches = p.id && String(p.id).includes(query);
      if (processIdMatches) {
        return { ...p, productionList: items, productionDtos: items };
      }
      const filteredDtos = items.filter(
        (dto) =>
          (dto.style && dto.style.toLowerCase().includes(query)) ||
          (dto.remarks && dto.remarks.toLowerCase().includes(query)) ||
          (dto.id && String(dto.id).includes(query))
      );
      return {
        ...p,
        productionList: filteredDtos,
        productionDtos: filteredDtos,
      };
    })
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const items = getProductionItems(p);
      return items.length > 0;
    });

  // Overall calculations across all hours for the selected date
  const totalHoursLogged = processes.length;
  const totalManpower = processes.reduce((acc, curr) => acc + (Number(curr.manPowerAllocated) || 0), 0);
  const totalTarget = processes.reduce((acc, curr) => acc + (Number(curr.target) || 0), 0);
  const totalChecked = processes.reduce((acc, curr) => acc + (Number(curr.checked) || 0), 0);
  const totalPass = processes.reduce((acc, curr) => acc + (Number(curr.pass) || 0), 0);
  const totalDefects = processes.reduce((acc, curr) => acc + (Number(curr.defects) || 0), 0);

  const overallDefectPct = totalChecked > 0 ? (totalDefects / totalChecked) * 100 : 0;
  const yieldEfficiency = totalTarget > 0 ? (totalPass / totalTarget) * 100 : 0;

  // List of unique hours available for dropdown filter
  const availableHours = Array.from(new Set(processes.map((p) => p.hour))).sort((a, b) => a - b);

  // Export to CSV helper
  const exportToCSV = () => {
    if (processes.length === 0) return;

    const headers = [
      'Process Date',
      'Hour',
      'S.No',
      'Style',
      'Manpower Allocated',
      'Target',
      'Checked',
      'Pass',
      'Defects',
      'Defect %',
      'Offered Beyond Target',
      'Remarks',
    ];

    const rows: (string | number)[][] = [];

    processes.forEach((proc) => {
      const items = getProductionItems(proc);
      if (items.length > 0) {
        items.forEach((dto: ProductionDto, index: number) => {
          rows.push([
            proc.processDate,
            proc.hour,
            index + 1,
            `"${dto.style ?? ''}"`,
            dto.manPowerAllocated ?? 0,
            dto.target ?? 0,
            dto.checked ?? 0,
            dto.pass ?? 0,
            dto.defects ?? 0,
            dto.defectPercentage ?? 0,
            dto.offeredBeyondTarget ?? 0,
            `"${dto.remarks ?? ''}"`,
          ]);
        });
      } else {
        rows.push([
          proc.processDate,
          proc.hour,
          'N/A',
          '"HOURLY TOTAL"',
          proc.manPowerAllocated ?? 0,
          proc.target ?? 0,
          proc.checked ?? 0,
          proc.pass ?? 0,
          proc.defects ?? 0,
          proc.defectPercentage ?? 0,
          0,
          '"Summary"',
        ]);
      }
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Production_Report_Hourly_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDefectBadgeClass = (pct: number) => {
    if (pct === 0) return 'badge-success';
    if (pct < 5) return 'badge-info';
    if (pct < 10) return 'badge-warning';
    return 'badge-danger';
  };

  return (
    <div className="view-entries-wrapper">
      {/* Top Filter & Date Selector Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="action-bar" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.6rem' }}>
              <label className="form-label" htmlFor="fetch-date" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                <Calendar size={18} color="var(--primary)" />
                <span>Process Date:</span>
              </label>
              <input
                id="fetch-date"
                type="date"
                className="form-control"
                style={{ width: 'auto' }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fetchEntries(selectedDate)}
              disabled={loading || actionLoading}
            >
              <RefreshCw size={15} className={loading ? 'spinner' : ''} />
              <span>Fetch Data</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={exportToCSV}
              disabled={processes.length === 0}
            >
              <Download size={15} />
              <span>Export Hourly CSV</span>
            </button>
          </div>
        </div>
      </div>

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

      {error && (
        <div className="toast-banner error">
          <div className="toast-content">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchEntries(selectedDate)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Total Summary Cards Across All Hours */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon indigo">
            <Clock size={22} />
          </div>
          <div className="metric-info">
            <p>Hours Logged</p>
            <h3>{totalHoursLogged} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Hours</span></h3>
            <span className="metric-subtext">Working shifts for date</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon blue">
            <Users size={22} />
          </div>
          <div className="metric-info">
            <p>Total Manpower</p>
            <h3>{totalManpower}</h3>
            <span className="metric-subtext">Sum of all hourly shifts</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon emerald">
            <CheckCircle size={22} />
          </div>
          <div className="metric-info">
            <p>Target vs Pass</p>
            <h3>
              {totalPass} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {totalTarget}</span>
            </h3>
            <span className="metric-subtext">Day Efficiency: {yieldEfficiency.toFixed(1)}%</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon amber">
            <AlertTriangle size={22} />
          </div>
          <div className="metric-info">
            <p>Total Defects</p>
            <h3>
              {totalDefects}{' '}
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: overallDefectPct > 5 ? 'var(--danger-text)' : 'var(--success-text)' }}>
                ({overallDefectPct.toFixed(2)}%)
              </span>
            </h3>
            <span className="metric-subtext">Total checked: {totalChecked}</span>
          </div>
        </div>
      </div>

      {/* Selection Control Banner if items are selected */}
      {selectedIds.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.5rem',
            background: 'var(--primary-light)',
            borderColor: 'var(--primary-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-info" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              {selectedIds.length} Line{selectedIds.length > 1 ? 's' : ''} Selected
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 500 }}>
              {isEditMode
                ? 'Editing selected lines. Only manpower, checked, pass, and remarks are editable.'
                : 'Select lines across hours to update fields or delete.'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            {!isEditMode ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={startEditingSelected}
                  disabled={actionLoading}
                >
                  <Edit3 size={15} /> Edit Selected ({selectedIds.length})
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={actionLoading}
                >
                  <Trash2 size={15} /> Delete Selected ({selectedIds.length})
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={clearSelection}
                  disabled={actionLoading}
                >
                  <X size={15} /> Clear Selection
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={handleConfirmUpdate}
                  disabled={actionLoading}
                >
                  <Save size={15} />
                  <span>{actionLoading ? 'Saving Updates...' : `Confirm & Save Updates (${selectedIds.length})`}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={cancelEditing}
                  disabled={actionLoading}
                >
                  <X size={15} /> Cancel Edit
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar for Hourly View */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.75rem' }}>
        <div className="action-bar" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Search style, remarks, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} color="var(--text-muted)" />
              <select
                className="form-control"
                style={{ width: 'auto', minWidth: '130px' }}
                value={selectedHourFilter}
                onChange={(e) => setSelectedHourFilter(e.target.value)}
              >
                <option value="ALL">All Hours ({availableHours.length})</option>
                {availableHours.map((hr) => (
                  <option key={hr} value={String(hr)}>
                    Hour {hr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={expandAll}
              disabled={processes.length === 0}
            >
              <ChevronDown size={14} /> Expand All
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={collapseAll}
              disabled={processes.length === 0}
            >
              <ChevronUp size={14} /> Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Main Hourly Process Cards */}
      {loading ? (
        <div className="card">
          <div className="empty-state">
            <div
              className="spinner"
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid var(--primary-border)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
                margin: '0 auto 1rem',
              }}
            />
            <h3>Fetching Hourly Production Data...</h3>
            <p>Loading process records for {selectedDate}</p>
          </div>
        </div>
      ) : filteredProcesses.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Clock size={28} />
            </div>
            <h3>No Hourly Production Entries Found</h3>
            <p>
              {searchQuery || selectedHourFilter !== 'ALL'
                ? `No hourly process entries match your current search / hour filter.`
                : `No production processes have been submitted for ${selectedDate} yet.`}
            </p>
          </div>
        </div>
      ) : (
        filteredProcesses.map((proc) => {
          const isCollapsed = collapsedHours[proc.hour] || false;
          const dtos = getProductionItems(proc);
          const procItemIds = dtos.map((d) => d.id).filter((id): id is number => id != null);
          const areAllProcSelected = procItemIds.length > 0 && procItemIds.every((id) => selectedIds.includes(id));

          return (
            <div key={proc.hour} className="hour-card">
              {/* Hourly Card Header / Process Summary */}
              <div
                className="hour-header"
                onClick={() => toggleHourCollapse(proc.hour)}
                title="Click to toggle hourly details"
              >
                <div className="hour-title">
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', marginRight: '0.25rem' }}
                  >
                    <input
                      type="checkbox"
                      checked={areAllProcSelected}
                      onChange={() => toggleSelectProcess(proc)}
                      disabled={isEditMode}
                      title="Select all entries in this hour"
                      style={{ width: '17px', height: '17px', cursor: isEditMode ? 'not-allowed' : 'pointer' }}
                    />
                  </div>

                  <div className="hour-badge">
                    <Clock size={15} />
                    <span>Hour {proc.hour}</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                      Shift / Hour {proc.hour} Summary {proc.id ? <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}> • ID #{proc.id}</span> : ''}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {dtos.length} Style {dtos.length === 1 ? 'Entry' : 'Entries'}
                    </span>
                  </div>
                </div>

                <div className="hour-metrics-summary">
                  <div className="hour-metric-item">
                    <span className="label">Manpower</span>
                    <span className="value">{proc.manPowerAllocated ?? 0}</span>
                  </div>

                  <div className="hour-metric-item">
                    <span className="label">Target</span>
                    <span className="value">{proc.target ?? 0}</span>
                  </div>

                  <div className="hour-metric-item">
                    <span className="label">Checked</span>
                    <span className="value">{proc.checked ?? 0}</span>
                  </div>

                  <div className="hour-metric-item">
                    <span className="label">Pass</span>
                    <span className="value" style={{ color: 'var(--success-text)' }}>
                      {proc.pass ?? 0}
                    </span>
                  </div>

                  <div className="hour-metric-item">
                    <span className="label">Defects</span>
                    <span
                      className="value"
                      style={{ color: proc.defects > 0 ? 'var(--danger-text)' : 'inherit' }}
                    >
                      {proc.defects ?? 0}
                    </span>
                  </div>

                  <div className="hour-metric-item">
                    <span className="label">Defect %</span>
                    <span className={`badge ${getDefectBadgeClass(proc.defectPercentage || 0)}`}>
                      {(proc.defectPercentage ?? 0).toFixed(2)}%
                    </span>
                  </div>

                  <div style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>
                    {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                  </div>
                </div>
              </div>

              {/* Hourly Body / Production Dtos Table */}
              {!isCollapsed && (
                <div className="hour-body">
                  {dtos.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      No individual production styles recorded for Hour {proc.hour}.
                    </div>
                  ) : (
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>Select</th>
                            <th>S.No</th>
                            <th>Style / Item</th>
                            <th>Manpower</th>
                            <th>Target</th>
                            <th>Checked</th>
                            <th>Pass</th>
                            <th>Defects</th>
                            <th>Defect %</th>
                            <th>Beyond Target</th>
                            <th>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dtos.map((item, idx) => {
                            const itemId = item.id;
                            const isRowSelected = itemId != null && selectedIds.includes(itemId);
                            const isRowEditing = isEditMode && isRowSelected && itemId != null && editingMap[itemId] != null;
                            const currentItem = isRowEditing ? editingMap[itemId!] : item;

                            return (
                              <tr
                                key={itemId ?? idx}
                                style={{
                                  backgroundColor: isRowEditing
                                    ? '#f0fdf4'
                                    : isRowSelected
                                    ? 'var(--primary-light)'
                                    : undefined,
                                }}
                              >
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={isRowSelected}
                                    onChange={() => itemId != null && toggleSelectRow(itemId)}
                                    disabled={isEditMode}
                                    style={{ width: '16px', height: '16px', cursor: isEditMode ? 'not-allowed' : 'pointer' }}
                                  />
                                </td>

                                <td>
                                  <code style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    #{idx + 1}
                                  </code>
                                </td>

                                <td>
                                  <strong style={{ color: 'var(--primary)' }}>{currentItem.style}</strong>
                                </td>

                                <td>
                                  {isRowEditing ? (
                                    <input
                                      type="number"
                                      min="0"
                                      className="form-control"
                                      style={{ width: '85px', padding: '0.35rem 0.5rem', textAlign: 'center' }}
                                      value={currentItem.manPowerAllocated}
                                      onChange={(e) => handleEditFieldChange(itemId!, 'manPowerAllocated', e.target.value)}
                                    />
                                  ) : (
                                    currentItem.manPowerAllocated ?? 0
                                  )}
                                </td>

                                <td>
                                  {isRowEditing ? (
                                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                      {currentItem.target}
                                    </span>
                                  ) : (
                                    currentItem.target ?? 0
                                  )}
                                </td>

                                <td>
                                  {isRowEditing ? (
                                    <input
                                      type="number"
                                      min="0"
                                      className="form-control"
                                      style={{ width: '85px', padding: '0.35rem 0.5rem', textAlign: 'center' }}
                                      value={currentItem.checked}
                                      onChange={(e) => handleEditFieldChange(itemId!, 'checked', e.target.value)}
                                    />
                                  ) : (
                                    currentItem.checked ?? 0
                                  )}
                                </td>

                                <td>
                                  {isRowEditing ? (
                                    <input
                                      type="number"
                                      min="0"
                                      className="form-control"
                                      style={{ width: '85px', padding: '0.35rem 0.5rem', textAlign: 'center' }}
                                      value={currentItem.pass}
                                      onChange={(e) => handleEditFieldChange(itemId!, 'pass', e.target.value)}
                                    />
                                  ) : (
                                    <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>
                                      {currentItem.pass ?? 0}
                                    </span>
                                  )}
                                </td>

                                <td>
                                  {isRowEditing ? (
                                    <span style={{ color: currentItem.defects > 0 ? 'var(--danger-text)' : 'inherit', fontWeight: 700 }}>
                                      {currentItem.defects}
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        color: currentItem.defects > 0 ? 'var(--danger-text)' : 'inherit',
                                        fontWeight: currentItem.defects > 0 ? 600 : 400,
                                      }}
                                    >
                                      {currentItem.defects ?? 0}
                                    </span>
                                  )}
                                </td>

                                <td>
                                  <span className={`badge ${getDefectBadgeClass(currentItem.defectPercentage || 0)}`}>
                                    {(currentItem.defectPercentage ?? 0).toFixed(2)}%
                                  </span>
                                </td>

                                <td>
                                  {currentItem.offeredBeyondTarget > 0 ? (
                                    <span className="badge badge-success">
                                      +{currentItem.offeredBeyondTarget}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-light)' }}>0</span>
                                  )}
                                </td>

                                <td>
                                  {isRowEditing ? (
                                    <input
                                      type="text"
                                      className="form-control"
                                      style={{ minWidth: '130px', padding: '0.35rem 0.5rem' }}
                                      value={currentItem.remarks || ''}
                                      onChange={(e) => handleEditFieldChange(itemId!, 'remarks', e.target.value)}
                                      placeholder="Remarks..."
                                    />
                                  ) : (
                                    <span
                                      style={{
                                        fontSize: '0.825rem',
                                        color: currentItem.remarks ? 'var(--text-main)' : 'var(--text-light)',
                                      }}
                                    >
                                      {currentItem.remarks || '—'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !actionLoading && setShowDeleteModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="card-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem' }}>
              <div className="card-title" style={{ color: 'var(--danger-text)' }}>
                <AlertTriangle size={20} />
                <span>Confirm Delete</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-icon-only"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
                style={{ padding: '0.35rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong>{selectedIds.length}</strong> selected production entry(ies) across the hours? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
