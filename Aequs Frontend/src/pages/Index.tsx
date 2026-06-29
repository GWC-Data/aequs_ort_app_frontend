import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Printer, Calendar, Clock, User, AlertCircle, Edit, Trash2, CheckCircle, XCircle, Play, Pause, RefreshCw, TestTube } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Add this import

const ChamberLoadsDashboard = () => {
  const [chamberLoads, setChamberLoads] = useState([]);
  const [filteredLoads, setFilteredLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChamber, setSelectedChamber] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedLoads, setSelectedLoads] = useState([]);
  const [stats, setStats] = useState({
    totalLoads: 0,
    activeLoads: 0,
    completedLoads: 0,
    totalParts: 0,
    totalDuration: 0
  });

  // Add navigate hook
  const navigate = useNavigate();

  useEffect(() => {
    loadChamberLoads();
  }, []);

  useEffect(() => {
    filterLoads();
  }, [chamberLoads, searchTerm, selectedChamber, statusFilter, dateRange]);

  const loadChamberLoads = () => {
    setLoading(true);
    try {
      const loads = JSON.parse(localStorage.getItem('chamberLoads') || '[]');

      // Sort by loadedAt date (newest first)
      const sortedLoads = loads.sort((a, b) =>
        new Date(b.loadedAt) - new Date(a.loadedAt)
      );

      setChamberLoads(sortedLoads);

      // Calculate statistics
      calculateStats(sortedLoads);

      setLoading(false);
    } catch (error) {
      console.error('Error loading chamber loads:', error);
      setLoading(false);
    }
  };

  const calculateStats = (loads) => {
    const statsData = {
      totalLoads: loads.length,
      activeLoads: 0,
      completedLoads: 0,
      totalParts: 0,
      totalDuration: 0,
      chambers: new Set(),
      projects: new Set()
    };

    loads.forEach(load => {
      statsData.totalParts += load.parts?.length || 0;
      statsData.totalDuration += parseFloat(load.duration) || 0;

      if (load.chamber) statsData.chambers.add(load.chamber);
      if (load.machineDetails?.project) statsData.projects.add(load.machineDetails.project);

      // Determine status
      if (load.status === 'loaded') {
        const estimatedCompletion = new Date(load.estimatedCompletion);
        const now = new Date();
        if (estimatedCompletion > now) {
          statsData.activeLoads++;
        } else {
          statsData.completedLoads++;
        }
      } else if (load.status === 'completed') {
        statsData.completedLoads++;
      }
    });

    setStats({
      ...statsData,
      uniqueChambers: statsData.chambers.size,
      uniqueProjects: statsData.projects.size
    });
  };

  const filterLoads = () => {
    let filtered = [...chamberLoads];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(load =>
        load.chamber?.toLowerCase().includes(term) ||
        load.machineDetails?.ticketCode?.toLowerCase().includes(term) ||
        load.machineDetails?.project?.toLowerCase().includes(term) ||
        load.parts?.some(part =>
          part.partNumber?.toLowerCase().includes(term) ||
          part.serialNumber?.toLowerCase().includes(term)
        )
      );
    }

    // Chamber filter
    if (selectedChamber !== 'all') {
      filtered = filtered.filter(load => load.chamber === selectedChamber);
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(load => {
          if (load.status === 'loaded') {
            const estimatedCompletion = new Date(load.estimatedCompletion);
            return estimatedCompletion > new Date();
          }
          return false;
        });
      } else if (statusFilter === 'completed') {
        filtered = filtered.filter(load => {
          if (load.status === 'completed') return true;
          if (load.status === 'loaded') {
            const estimatedCompletion = new Date(load.estimatedCompletion);
            return estimatedCompletion <= new Date();
          }
          return false;
        });
      }
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();

      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }

      filtered = filtered.filter(load =>
        new Date(load.loadedAt) >= startDate
      );
    }

    setFilteredLoads(filtered);
  };

  const getStatusInfo = (load) => {
    const estimatedCompletion = new Date(load.estimatedCompletion);
    const now = new Date();
    const timeRemaining = estimatedCompletion - now;

    if (load.status === 'completed') {
      return { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    } else if (timeRemaining <= 0) {
      return { label: 'Expired', color: 'bg-red-100 text-red-800', icon: XCircle };
    } else if (timeRemaining < 24 * 60 * 60 * 1000) {
      return { label: 'Finishing Soon', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle };
    } else {
      return { label: 'Active', color: 'bg-blue-100 text-blue-800', icon: Play };
    }
  };

  const getUniqueChambers = () => {
    const chambers = new Set();
    chamberLoads.forEach(load => {
      if (load.chamber) chambers.add(load.chamber);
    });
    return Array.from(chambers).sort();
  };

  const formatDuration = (hours) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    return `${hours}h`;
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateTimeRemaining = (estimatedCompletion) => {
    const end = new Date(estimatedCompletion);
    const now = new Date();
    const diffMs = end - now;

    if (diffMs <= 0) return 'Completed';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;

    if (diffDays > 0) {
      return `${diffDays}d ${remainingHours}h`;
    }
    return `${diffHours}h`;
  };

  const handleExportData = (format) => {
    const data = filteredLoads.map(load => ({
      'Load ID': load.id,
      'Chamber': load.chamber,
      'Status': getStatusInfo(load).label,
      'Parts Count': load.parts?.length || 0,
      'Duration (h)': load.duration,
      'Loaded At': formatDateTime(load.loadedAt),
      'Estimated Completion': formatDateTime(load.estimatedCompletion),
      'Ticket Code': load.machineDetails?.ticketCode || 'N/A',
      'Project': load.machineDetails?.project || 'N/A',
      'Build': load.machineDetails?.build || 'N/A',
      'Colour': load.machineDetails?.colour || 'N/A'
    }));

    if (format === 'csv') {
      exportToCSV(data);
    } else if (format === 'json') {
      exportToJSON(data);
    }
  };

  const exportToCSV = (data) => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header =>
          `"${String(row[header] || '').replace(/"/g, '""')}"`
        ).join(',')
      )
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chamber_loads_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = (data) => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chamber_loads_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteLoad = (loadId) => {
    if (window.confirm('Are you sure you want to delete this load? This action cannot be undone.')) {
      const updatedLoads = chamberLoads.filter(load => load.id !== loadId);
      localStorage.setItem('chamberLoads', JSON.stringify(updatedLoads));
      loadChamberLoads();
    }
  };

  const handleMarkComplete = (loadId) => {
    const updatedLoads = chamberLoads.map(load => {
      if (load.id === loadId) {
        return { ...load, status: 'completed' };
      }
      return load;
    });

    localStorage.setItem('chamberLoads', JSON.stringify(updatedLoads));
    loadChamberLoads();
  };

  // NEW FUNCTION: Navigate to testing page with parts data
  const handleNavigateToTesting = (load) => {
    // Prepare the data to pass to testing page
    const record = {
      loadId: load.id,
      chamber: load.chamber,
      parts: load.parts || [],
      totalParts: load.parts?.length || 0,
      machineDetails: load.machineDetails || {},
      loadedAt: load.loadedAt,
      estimatedCompletion: load.estimatedCompletion,
      duration: load.duration,
      testRecords: load.parts || [] // Add this line
    };

    console.log(record);

    // Store in localStorage for the testing page to access
    localStorage.setItem('testingLoadData', JSON.stringify(record));

    // Navigate to testing page
    navigate('/form-default', {
      state: {
        record
      }
    });
  };
  const toggleSelectLoad = (loadId) => {
    setSelectedLoads(prev => {
      if (prev.includes(loadId)) {
        return prev.filter(id => id !== loadId);
      } else {
        return [...prev, loadId];
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedLoads.length === 0) {
      alert('Please select loads to delete');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedLoads.length} selected load(s)?`)) {
      const updatedLoads = chamberLoads.filter(load => !selectedLoads.includes(load.id));
      localStorage.setItem('chamberLoads', JSON.stringify(updatedLoads));
      setSelectedLoads([]);
      loadChamberLoads();
    }
  };

  const handleBulkComplete = () => {
    if (selectedLoads.length === 0) {
      alert('Please select loads to mark as complete');
      return;
    }

    if (window.confirm(`Mark ${selectedLoads.length} selected load(s) as complete?`)) {
      const updatedLoads = chamberLoads.map(load => {
        if (selectedLoads.includes(load.id)) {
          return { ...load, status: 'completed' };
        }
        return load;
      });

      localStorage.setItem('chamberLoads', JSON.stringify(updatedLoads));
      setSelectedLoads([]);
      loadChamberLoads();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading chamber loads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className=" mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Chamber Loads Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage and monitor all chamber load activities</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadChamberLoads}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total Loads</p>
                  <p className="text-2xl font-bold text-blue-800">{stats.totalLoads}</p>
                </div>
                <div className="p-2 bg-blue-200 rounded-full">
                  <Calendar className="text-blue-700" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Active Loads</p>
                  <p className="text-2xl font-bold text-green-800">{stats.activeLoads}</p>
                </div>
                <div className="p-2 bg-green-200 rounded-full">
                  <Play className="text-green-700" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-purple-800">{stats.completedLoads}</p>
                </div>
                <div className="p-2 bg-purple-200 rounded-full">
                  <CheckCircle className="text-purple-700" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Total Parts</p>
                  <p className="text-2xl font-bold text-yellow-800">{stats.totalParts}</p>
                </div>
                <div className="p-2 bg-yellow-200 rounded-full">
                  <User className="text-yellow-700" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Total Duration</p>
                  <p className="text-2xl font-bold text-red-800">{formatDuration(stats.totalDuration)}</p>
                </div>
                <div className="p-2 bg-red-200 rounded-full">
                  <Clock className="text-red-700" size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search chambers, parts, tickets..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chamber</label>
              <select
                value={selectedChamber}
                onChange={(e) => setSelectedChamber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Chambers</option>
                {getUniqueChambers().map(chamber => (
                  <option key={chamber} value={chamber}>{chamber}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedLoads.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Filter className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">
                      {selectedLoads.length} load(s) selected
                    </p>
                    <p className="text-sm text-blue-600">Perform bulk actions on selected items</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkComplete}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle size={18} />
                    Mark Complete
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 size={18} />
                    Delete Selected
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedLoads.length === filteredLoads.length && filteredLoads.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLoads(filteredLoads.map(load => load.id));
                        } else {
                          setSelectedLoads([]);
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chamber
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loaded At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket / Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLoads.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Calendar className="text-gray-400 mb-4" size={48} />
                        <p className="text-gray-500 text-lg">No chamber loads found</p>
                        <p className="text-gray-400 mt-2">
                          {chamberLoads.length === 0
                            ? 'No loads have been created yet. Load parts in the Gantt Chart view.'
                            : 'Try adjusting your filters to see more results.'
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLoads.map((load) => {
                    const statusInfo = getStatusInfo(load);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <tr key={load.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedLoads.includes(load.id)}
                            onChange={() => toggleSelectLoad(load.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{load.chamber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            <StatusIcon size={12} />
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{load.parts?.length || 0} parts</div>
                          <div className="text-xs text-gray-500">
                            {load.parts?.slice(0, 2).map(p => p.partNumber).join(', ')}
                            {load.parts?.length > 2 && '...'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock size={14} className="text-gray-400" />
                            <span className="text-sm font-medium">{formatDuration(load.duration)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDateTime(load.loadedAt)}</div>
                          <div className="text-xs text-gray-500">
                            Est. complete: {formatDateTime(load.estimatedCompletion)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${statusInfo.label === 'Active' ? 'text-blue-600' :
                            statusInfo.label === 'Finishing Soon' ? 'text-yellow-600' :
                              statusInfo.label === 'Completed' ? 'text-green-600' :
                                'text-red-600'
                            }`}>
                            {calculateTimeRemaining(load.estimatedCompletion)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {load.machineDetails?.ticketCode || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {load.machineDetails?.project || 'N/A'} / {load.machineDetails?.build || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {/* Testing Button - NEW */}
                            <button
                              onClick={() => handleNavigateToTesting(load)}
                              className="text-purple-600 hover:text-purple-800 transition-colors"
                              title="Go to Testing"
                            >
                              <TestTube size={18} />
                            </button>

                            {statusInfo.label !== 'Completed' && (
                              <button
                                onClick={() => handleMarkComplete(load.id)}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Mark as complete"
                              >
                                <CheckCircle size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteLoad(load.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Delete load"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination/Info */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{filteredLoads.length}</span> of{' '}
                <span className="font-medium">{chamberLoads.length}</span> total loads
              </div>
              <div className="text-sm text-gray-700">
                {stats.uniqueChambers} chambers • {stats.uniqueProjects} projects
              </div>
            </div>
          </div>
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Export Data</h3>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-gray-600 mb-6">
                  Export {filteredLoads.length} load(s) in your preferred format
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      handleExportData('csv');
                      setShowExportModal(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download size={20} />
                    Export as CSV
                  </button>

                  <button
                    onClick={() => {
                      handleExportData('json');
                      setShowExportModal(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download size={20} />
                    Export as JSON
                  </button>

                  <button
                    onClick={() => setShowExportModal(false)}
                    className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChamberLoadsDashboard;