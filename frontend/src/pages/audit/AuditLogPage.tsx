import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const LOG_TYPES = ['login', 'session_restored', 'create', 'update', 'delete'];

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    logType: '',
    userId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('Authentication token not found');
        }
        const [logsRes, usersRes] = await Promise.all([
          axios.get('/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/users', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setLogs(logsRes.data);
        setUsers(usersRes.data);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      logType: '',
      userId: '',
      startDate: '',
      endDate: '',
    });
  };

  const filteredLogs = useMemo(() => {
    let tempLogs = logs;

    if (filters.logType) {
      tempLogs = tempLogs.filter(log => log.logType === filters.logType);
    }
    if (filters.userId) {
      tempLogs = tempLogs.filter(log => String(log.user?._id) === filters.userId);
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      tempLogs = tempLogs.filter(log => new Date(log.timestamp) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      tempLogs = tempLogs.filter(log => new Date(log.timestamp) <= end);
    }

    return tempLogs;
  }, [logs, filters]);
  
  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="page">
      <div className="page-header">
        <h2>Auditoria</h2>
      </div>

      {loading && <div className="empty">Carregando...</div>}
      {error && <div className="empty" style={{ color: 'red' }}>{error}</div>}
      
      {!loading && !error && (
        <>
          <div className="filter-bar" style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <select name="logType" value={filters.logType} onChange={handleFilterChange} className="search-input">
              <option value="">Todo tipo de ação</option>
              {LOG_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <select name="userId" value={filters.userId} onChange={handleFilterChange} className="search-input">
              <option value="">Todo usuário</option>
              {users.slice().sort((a,b) => a.name.localeCompare(b.name)).map(user => <option key={user._id} value={user._id}>{user.name}</option>)}
            </select>
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="search-input" />
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="search-input" />
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn secondary">Limpar Filtros</button>
            )}
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Tipo de Ação</th>
                  <th>Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log: any) => (
                  <tr key={log._id}>
                    <td>{log.user?.name || 'Usuário Desconhecido'}</td>
                    <td>{log.logType}</td>
                    <td>{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLogs.length === 0 && (
              <div className="empty">Nenhum registro encontrado com os filtros aplicados.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
