import React, { useState, useEffect } from 'react';
import Card from '../common/Card';

const AppointmentsAnalytics = ({ appointments }) => {
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    byType: {
      'in-person': 0,
      'video': 0,
      'phone': 0
    }
  });

  // Calculate statistics from appointments
  useEffect(() => {
    if (!appointments || appointments.length === 0) return;

    const newStats = {
      total: appointments.length,
      upcoming: appointments.filter(a => a.status === 'scheduled').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
      byType: {
        'in-person': appointments.filter(a => a.type === 'in-person').length,
        'video': appointments.filter(a => a.type === 'video').length,
        'phone': appointments.filter(a => a.type === 'phone').length
      }
    };
    
    setStats(newStats);
  }, [appointments]);

  const renderProgressBar = (value, total, color) => {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    
    return (
      <div className="w-full bg-gray-200 h-2 rounded-full dark:bg-gray-700">
        <div 
          className={`${color} h-2 rounded-full`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Appointments Overview
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Summary of your appointment history and statistics
        </p>
      </div>
      
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Appointments</p>
            <p className="text-2xl font-semibold text-blue-800 dark:text-blue-200 mt-1">{stats.total}</p>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">Upcoming</p>
            <p className="text-2xl font-semibold text-green-800 dark:text-green-200 mt-1">{stats.upcoming}</p>
          </div>
          
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Completed</p>
            <p className="text-2xl font-semibold text-purple-800 dark:text-purple-200 mt-1">{stats.completed}</p>
          </div>
          
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Cancelled</p>
            <p className="text-2xl font-semibold text-red-800 dark:text-red-200 mt-1">{stats.cancelled}</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Appointment Types
            </h4>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">In-person</span>
                  <span className="text-gray-900 dark:text-gray-100">{stats.byType['in-person']}</span>
                </div>
                {renderProgressBar(stats.byType['in-person'], stats.total, 'bg-green-500')}
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">Video</span>
                  <span className="text-gray-900 dark:text-gray-100">{stats.byType['video']}</span>
                </div>
                {renderProgressBar(stats.byType['video'], stats.total, 'bg-blue-500')}
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">Phone</span>
                  <span className="text-gray-900 dark:text-gray-100">{stats.byType['phone']}</span>
                </div>
                {renderProgressBar(stats.byType['phone'], stats.total, 'bg-purple-500')}
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Appointment Status
            </h4>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">Upcoming</span>
                  <span className="text-gray-900 dark:text-gray-100">{stats.upcoming}</span>
                </div>
                {renderProgressBar(stats.upcoming, stats.total, 'bg-blue-500')}
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">Completed</span>
                  <span className="text-gray-900 dark:text-gray-100">{stats.completed}</span>
                </div>
                {renderProgressBar(stats.completed, stats.total, 'bg-green-500')}
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">Cancelled</span>
                  <span className="text-gray-900 dark:text-gray-100">{stats.cancelled}</span>
                </div>
                {renderProgressBar(stats.cancelled, stats.total, 'bg-red-500')}
              </div>
            </div>
          </div>
        </div>
        
        {stats.total === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No appointment data available yet.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AppointmentsAnalytics;