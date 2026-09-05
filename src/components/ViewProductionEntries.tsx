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
} from 'lucide-react';
import type { ProcessDto, ProductionDto } from '../types/production';
import { getAllProductionEntriesForDate } from '../services/api';

const getTodayDate = () => new Date().toISOString().split('T')[0];

export const ViewProductionEntries: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [processes, setProcesses] = useState<ProcessDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedHourFilter, setSelectedHourFilter] = useState<string>('ALL');
  const [collapsedHours, setCollapsedHours] = useState<Record<number, boolean>>({});

  const fetchEntries = useCallback(async (dateToFetch: string) => {
    if (!dateToFetch) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getAllProductionEntriesForDate(dateToFetch);
      // Sort processes by hour ascending
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

  // Helper to extract production items array regardless of backend property name (productionList or productionDtos)
  const getProductionItems = (p: ProcessDto): ProductionDto[] => {
    return p.productionList || p.productionDtos || [];
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
    // Hide hours that have 0 matching entries when searching
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
      'Entry ID',
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
        items.forEach((dto: ProductionDto) => {
          rows.push([
            proc.processDate,
            proc.hour,
            dto.id ?? '',
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
              disabled={loading}
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

          return (
            <div key={proc.hour} className="hour-card">
              {/* Hourly Card Header / Process Summary */}
              <div
                className="hour-header"
                onClick={() => toggleHourCollapse(proc.hour)}
                title="Click to toggle hourly details"
              >
                <div className="hour-title">
                  <div className="hour-badge">
                    <Clock size={15} />
                    <span>Hour {proc.hour}</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                      Shift / Hour {proc.hour} Summary
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
                            <th>ID</th>
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
                          {dtos.map((item, idx) => (
                            <tr key={item.id ?? idx}>
                              <td>
                                <code style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  #{item.id ?? idx + 1}
                                </code>
                              </td>
                              <td>
                                <strong style={{ color: 'var(--primary)' }}>{item.style}</strong>
                              </td>
                              <td>{item.manPowerAllocated ?? 0}</td>
                              <td>{item.target ?? 0}</td>
                              <td>{item.checked ?? 0}</td>
                              <td>
                                <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>
                                  {item.pass ?? 0}
                                </span>
                              </td>
                              <td>
                                <span
                                  style={{
                                    color: item.defects > 0 ? 'var(--danger-text)' : 'inherit',
                                    fontWeight: item.defects > 0 ? 600 : 400,
                                  }}
                                >
                                  {item.defects ?? 0}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${getDefectBadgeClass(item.defectPercentage || 0)}`}>
                                  {(item.defectPercentage ?? 0).toFixed(2)}%
                                </span>
                              </td>
                              <td>
                                {item.offeredBeyondTarget > 0 ? (
                                  <span className="badge badge-success">
                                    +{item.offeredBeyondTarget}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-light)' }}>0</span>
                                )}
                              </td>
                              <td>
                                <span
                                  style={{
                                    fontSize: '0.825rem',
                                    color: item.remarks ? 'var(--text-main)' : 'var(--text-light)',
                                  }}
                                >
                                  {item.remarks || '—'}
                                </span>
                              </td>
                            </tr>
                          ))}
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
    </div>
  );
};
