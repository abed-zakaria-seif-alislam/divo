import React, { useState } from 'react';
import Button from '../common/Button';
import Card from '../common/Card';
import Alert from '../common/Alert';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';

const METRICS = [
  { id: 'weight', label: 'Weight', unit: 'kg', type: 'number', step: 0.1 },
  { id: 'bloodPressureSystolic', label: 'Blood Pressure (Systolic)', unit: 'mmHg', type: 'number', step: 1 },
  { id: 'bloodPressureDiastolic', label: 'Blood Pressure (Diastolic)', unit: 'mmHg', type: 'number', step: 1 },
  { id: 'heartRate', label: 'Heart Rate', unit: 'bpm', type: 'number', step: 1 },
  { id: 'bloodSugar', label: 'Blood Sugar', unit: 'mmol/L', type: 'number', step: 0.1 },
  { id: 'temperature', label: 'Body Temperature', unit: '°C', type: 'number', step: 0.1 },
  { id: 'oxygenSaturation', label: 'Oxygen Saturation', unit: '%', type: 'number', step: 1 },
  { id: 'respiratoryRate', label: 'Respiratory Rate', unit: 'breaths/min', type: 'number', step: 1 }
];

const HealthMetricsForm = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    metrics: {}
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState(['weight', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'heartRate']);
  
  const toggleMetric = (metricId) => {
    if (selectedMetrics.includes(metricId)) {
      setSelectedMetrics(selectedMetrics.filter(id => id !== metricId));
      
      // Remove value from form data
      const newMetrics = { ...formData.metrics };
      delete newMetrics[metricId];
      setFormData({ ...formData, metrics: newMetrics });
    } else {
      setSelectedMetrics([...selectedMetrics, metricId]);
    }
  };
  
  const handleMetricChange = (e, metricId) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setFormData({
      ...formData,
      metrics: {
        ...formData.metrics,
        [metricId]: value
      }
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Validate that at least one metric has a value
      const hasValues = Object.values(formData.metrics).some(value => value !== undefined && value !== '');
      if (!hasValues) {
        throw new Error('Please enter at least one health metric value');
      }
      
      // Create records for each metric
      const recordsToInsert = [];
      
      // Special handling for blood pressure which has two values
      const hasSystolic = formData.metrics.bloodPressureSystolic !== undefined;
      const hasDiastolic = formData.metrics.bloodPressureDiastolic !== undefined;
      
      if (hasSystolic && hasDiastolic) {
        recordsToInsert.push({
          patient_id: user.id,
          recorded_at: new Date(`${formData.date}T00:00:00`).toISOString(),
          metric_type: 'bloodPressure',
          value_systolic: formData.metrics.bloodPressureSystolic,
          value_diastolic: formData.metrics.bloodPressureDiastolic,
          unit: 'mmHg'
        });
      } else if (hasSystolic) {
        setError('Please enter both systolic and diastolic values for blood pressure');
        setSubmitting(false);
        return;
      } else if (hasDiastolic) {
        setError('Please enter both systolic and diastolic values for blood pressure');
        setSubmitting(false);
        return;
      }
      
      // Add all other metrics
      for (const metricId of selectedMetrics) {
        // Skip blood pressure components as they are handled separately
        if (metricId === 'bloodPressureSystolic' || metricId === 'bloodPressureDiastolic') {
          continue;
        }
        
        const value = formData.metrics[metricId];
        if (value !== undefined && value !== '') {
          const metric = METRICS.find(m => m.id === metricId);
          recordsToInsert.push({
            patient_id: user.id,
            recorded_at: new Date(`${formData.date}T00:00:00`).toISOString(),
            metric_type: metricId,
            value_numeric: value,
            unit: metric.unit
          });
        }
      }
      
      if (recordsToInsert.length === 0) {
        throw new Error('Please enter at least one health metric value');
      }
      
      // Insert records
      const { data, error: insertError } = await supabase
        .from('health_metrics')
        .insert(recordsToInsert);
      
      if (insertError) throw insertError;
      
      setSuccess(true);
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        metrics: {}
      });
      
      // Call success callback
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      console.error('Error saving health metrics:', err);
      setError(err.message || 'Failed to save health metrics');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Log New Health Metrics</h2>
      
      {error && (
        <Alert 
          type="error"
          message={error}
          className="mb-4"
        />
      )}
      
      {success && (
        <Alert 
          type="success"
          message="Health metrics saved successfully!"
          className="mb-4"
        />
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Metrics to Log
          </label>
          <div className="flex flex-wrap gap-2">
            {METRICS.map((metric) => (
              <button
                key={metric.id}
                type="button"
                onClick={() => toggleMetric(metric.id)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedMetrics.includes(metric.id)
                    ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 border-2 border-primary-500'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-6">
          {selectedMetrics.includes('weight') && (
            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                id="weight"
                name="weight"
                value={formData.metrics.weight || ''}
                onChange={(e) => handleMetricChange(e, 'weight')}
                step="0.1"
                placeholder="e.g. 70.5"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}
          
          {(selectedMetrics.includes('bloodPressureSystolic') || selectedMetrics.includes('bloodPressureDiastolic')) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Blood Pressure (mmHg)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  name="bloodPressureSystolic"
                  value={formData.metrics.bloodPressureSystolic || ''}
                  onChange={(e) => handleMetricChange(e, 'bloodPressureSystolic')}
                  placeholder="Systolic"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
                <span className="text-gray-500">/</span>
                <input
                  type="number"
                  name="bloodPressureDiastolic"
                  value={formData.metrics.bloodPressureDiastolic || ''}
                  onChange={(e) => handleMetricChange(e, 'bloodPressureDiastolic')}
                  placeholder="Diastolic"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}
          
          {selectedMetrics.includes('heartRate') && (
            <div>
              <label htmlFor="heartRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Heart Rate (bpm)
              </label>
              <input
                type="number"
                id="heartRate"
                name="heartRate"
                value={formData.metrics.heartRate || ''}
                onChange={(e) => handleMetricChange(e, 'heartRate')}
                placeholder="e.g. 75"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}
          
          {selectedMetrics.includes('bloodSugar') && (
            <div>
              <label htmlFor="bloodSugar" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Blood Sugar (mmol/L)
              </label>
              <input
                type="number"
                id="bloodSugar"
                name="bloodSugar"
                value={formData.metrics.bloodSugar || ''}
                onChange={(e) => handleMetricChange(e, 'bloodSugar')}
                step="0.1"
                placeholder="e.g. 5.5"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}
          
          {selectedMetrics.includes('temperature') && (
            <div>
              <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Body Temperature (°C)
              </label>
              <input
                type="number"
                id="temperature"
                name="temperature"
                value={formData.metrics.temperature || ''}
                onChange={(e) => handleMetricChange(e, 'temperature')}
                step="0.1"
                placeholder="e.g. 37.0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}
          
          {selectedMetrics.includes('oxygenSaturation') && (
            <div>
              <label htmlFor="oxygenSaturation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Oxygen Saturation (%)
              </label>
              <input
                type="number"
                id="oxygenSaturation"
                name="oxygenSaturation"
                value={formData.metrics.oxygenSaturation || ''}
                onChange={(e) => handleMetricChange(e, 'oxygenSaturation')}
                min="0"
                max="100"
                placeholder="e.g. 98"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}
          
          {selectedMetrics.includes('respiratoryRate') && (
            <div>
              <label htmlFor="respiratoryRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Respiratory Rate (breaths/min)
              </label>
              <input
                type="number"
                id="respiratoryRate"
                name="respiratoryRate"
                value={formData.metrics.respiratoryRate || ''}
                onChange={(e) => handleMetricChange(e, 'respiratoryRate')}
                placeholder="e.g. 14"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}
        </div>
        
        <div className="mt-8 flex justify-end space-x-3">
          {onCancel && (
            <Button 
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
          )}
          
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
          >
            Save Health Metrics
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default HealthMetricsForm;