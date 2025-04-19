import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import Card from '../common/Card';
import Button from '../common/Button';
import Alert from '../common/Alert';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';

const MedicationTracker = () => {
  const { user } = useAuth();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentMedication, setCurrentMedication] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    time_of_day: [],
    start_date: '',
    end_date: '',
    prescribing_doctor: '',
    notes: '',
    remaining: '',
    refill_date: '',
  });
  const [todayLogs, setTodayLogs] = useState({});

  useEffect(() => {
    if (user) {
      fetchMedications();
    }
  }, [user]);

  const fetchMedications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMedications(data || []);
      
      // Initialize today's logs for each medication
      const today = new Date().toISOString().split('T')[0];
      const logs = {};
      for (const med of data || []) {
        // Check if there's a log for today
        const { data: logData } = await supabase
          .from('medication_logs')
          .select('*')
          .eq('medication_id', med.id)
          .eq('date', today);
          
        logs[med.id] = {};
        
        // Initialize each time of day
        const timeSlots = med.time_of_day || [];
        for (const time of timeSlots) {
          // Find if there's a log entry for this time
          const logEntry = logData?.find(entry => entry.time_of_day === time);
          logs[med.id][time] = logEntry ? true : false;
        }
      }
      
      setTodayLogs(logs);
    } catch (err) {
      console.error('Error fetching medications:', err);
      setError('Failed to load medications');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'time_of_day') {
      // Handle checkbox group for time of day
      const updatedTimes = [...formData.time_of_day];
      if (checked) {
        updatedTimes.push(value);
      } else {
        const index = updatedTimes.indexOf(value);
        if (index > -1) {
          updatedTimes.splice(index, 1);
        }
      }
      setFormData({ ...formData, time_of_day: updatedTimes });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddMedication = async (e) => {
    e.preventDefault();
    try {
      const newMedication = {
        ...formData,
        patient_id: user.id,
        created_at: new Date().toISOString(),
        active: true,
      };
      
      const { data, error } = await supabase
        .from('medications')
        .insert([newMedication])
        .select();
        
      if (error) throw error;
      
      setMedications([data[0], ...medications]);
      setShowAddModal(false);
      resetForm();
      
      // Initialize logs for new medication
      const newLogs = { ...todayLogs };
      newLogs[data[0].id] = {};
      for (const time of data[0].time_of_day || []) {
        newLogs[data[0].id][time] = false;
      }
      setTodayLogs(newLogs);
      
    } catch (err) {
      console.error('Error adding medication:', err);
      setError('Failed to add medication');
    }
  };

  const handleEditMedication = async (e) => {
    e.preventDefault();
    try {
      const updatedMedication = {
        ...formData,
        updated_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('medications')
        .update(updatedMedication)
        .eq('id', currentMedication.id)
        .select();
        
      if (error) throw error;
      
      setMedications(medications.map(med => 
        med.id === currentMedication.id ? data[0] : med
      ));
      
      setShowEditModal(false);
      resetForm();
    } catch (err) {
      console.error('Error updating medication:', err);
      setError('Failed to update medication');
    }
  };

  const handleDeleteMedication = async (id) => {
    if (window.confirm('Are you sure you want to delete this medication?')) {
      try {
        const { error } = await supabase
          .from('medications')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        setMedications(medications.filter(med => med.id !== id));
        
        // Remove from logs
        const updatedLogs = { ...todayLogs };
        delete updatedLogs[id];
        setTodayLogs(updatedLogs);
      } catch (err) {
        console.error('Error deleting medication:', err);
        setError('Failed to delete medication');
      }
    }
  };
  
  const handleMarkAsTaken = async (medicationId, timeOfDay) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if there's already a log for this medication and time
      const { data: existingLog } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('medication_id', medicationId)
        .eq('date', today)
        .eq('time_of_day', timeOfDay)
        .single();
        
      if (existingLog) {
        // If it exists, toggle it (delete it)
        await supabase
          .from('medication_logs')
          .delete()
          .eq('id', existingLog.id);
          
        // Update local state
        setTodayLogs(prev => ({
          ...prev,
          [medicationId]: {
            ...prev[medicationId],
            [timeOfDay]: false
          }
        }));
      } else {
        // If it doesn't exist, create a new log
        await supabase
          .from('medication_logs')
          .insert([{
            medication_id: medicationId,
            patient_id: user.id,
            date: today,
            time_of_day: timeOfDay,
            taken_at: new Date().toISOString()
          }]);
          
        // Update local state
        setTodayLogs(prev => ({
          ...prev,
          [medicationId]: {
            ...prev[medicationId],
            [timeOfDay]: true
          }
        }));
        
        // Update remaining count if we have it
        const medication = medications.find(med => med.id === medicationId);
        if (medication && medication.remaining && !isNaN(medication.remaining)) {
          const remaining = parseInt(medication.remaining) - 1;
          await supabase
            .from('medications')
            .update({ remaining })
            .eq('id', medicationId);
            
          // Update local state
          setMedications(medications.map(med => 
            med.id === medicationId ? { ...med, remaining } : med
          ));
        }
      }
    } catch (err) {
      console.error('Error updating medication log:', err);
      setError('Failed to update medication log');
    }
  };

  const openEditModal = (medication) => {
    setCurrentMedication(medication);
    setFormData({
      name: medication.name || '',
      dosage: medication.dosage || '',
      frequency: medication.frequency || 'daily',
      time_of_day: medication.time_of_day || [],
      start_date: medication.start_date || '',
      end_date: medication.end_date || '',
      prescribing_doctor: medication.prescribing_doctor || '',
      notes: medication.notes || '',
      remaining: medication.remaining || '',
      refill_date: medication.refill_date || '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      dosage: '',
      frequency: 'daily',
      time_of_day: [],
      start_date: '',
      end_date: '',
      prescribing_doctor: '',
      notes: '',
      remaining: '',
      refill_date: '',
    });
    setCurrentMedication(null);
  };

  const isWithinDays = (dateStr, days) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= days;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">My Medications</h2>
        <Button
          onClick={() => setShowAddModal(true)}
          className="flex items-center text-sm text-gray-600 hover:text-white hover:bg-gray-100 rounded-full py-1 px-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Add Medication
        </Button>
      </div>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : medications.length === 0 ? (
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-gray-400 mb-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="text-lg font-medium mb-2">No Medications</h3>
            <p className="text-gray-500 mb-4">
              You haven't added any medications yet.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              Add Your First Medication
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {medications.map((medication) => {
            const needsRefill =
              medication.remaining && parseInt(medication.remaining) <= 5;
            const refillSoon =
              medication.refill_date && isWithinDays(medication.refill_date, 7);

            return (
              <Card key={medication.id} className="p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                  <div className="flex-1">
                    <div className="flex items-start">
                      <div className="mr-4">
                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-purple-600 dark:text-purple-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM8 11a1 1 0 100-2 1 1 0 000 2zm2-1a1 1 0 112 0 1 1 0 01-2 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">
                          {medication.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          {medication.dosage}
                        </p>

                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {medication.frequency === "daily"
                            ? "Daily"
                            : medication.frequency === "weekly"
                            ? "Weekly"
                            : medication.frequency === "as_needed"
                            ? "As needed"
                            : medication.frequency}
                        </div>

                        {medication.prescribing_doctor && (
                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Prescribed by: Dr. {medication.prescribing_doctor}
                          </div>
                        )}

                        <div className="flex items-center mt-3 space-x-3">
                          <button
                            onClick={() => openEditModal(medication)}
                            className="text-gray-600 hover:text-primary-600 text-sm flex items-center"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 mr-1"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteMedication(medication.id)
                            }
                            className="text-gray-600 hover:text-red-600 text-sm flex items-center"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 mr-1"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 md:mt-0 md:ml-6 flex flex-col items-start">
                    {(needsRefill || refillSoon) && (
                      <div className="mb-2 px-4 py-1.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full text-sm flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {needsRefill
                          ? `Refill needed (${medication.remaining} left)`
                          : "Refill due soon"}
                      </div>
                    )}

                    {medication.remaining && (
                      <div className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                        Remaining: {medication.remaining}{" "}
                        {parseInt(medication.remaining) === 1
                          ? "pill"
                          : "pills"}
                      </div>
                    )}

                    {medication.refill_date && (
                      <div className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                        Next refill:{" "}
                        {new Date(medication.refill_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Medication schedule for today */}
                {medication.time_of_day &&
                  medication.time_of_day.length > 0 && (
                    <div className="mt-5 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-medium mb-2">
                        Today's Schedule
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {medication.time_of_day.map((time) => {
                          const taken =
                            todayLogs[medication.id]?.[time] || false;
                          return (
                            <button
                              key={time}
                              onClick={() =>
                                handleMarkAsTaken(medication.id, time)
                              }
                              className={`px-3 py-1.5 rounded-full text-sm flex items-center ${
                                taken
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {taken && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-1"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              {time.charAt(0).toUpperCase() + time.slice(1)}
                              {taken ? " - Taken" : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Additional notes */}
                {medication.notes && (
                  <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
                    <span className="font-medium">Notes:</span>{" "}
                    {medication.notes}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Medication Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Add Medication"
      >
        <form onSubmit={handleAddMedication} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Medication Name*
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Lisinopril"
            />
          </div>

          <div>
            <label
              htmlFor="dosage"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Dosage*
            </label>
            <input
              type="text"
              id="dosage"
              name="dosage"
              value={formData.dosage}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., 10mg"
            />
          </div>

          <div>
            <label
              htmlFor="frequency"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Frequency*
            </label>
            <select
              id="frequency"
              name="frequency"
              value={formData.frequency}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="daily">Daily</option>
              <option value="twice_daily">Twice Daily</option>
              <option value="three_times_daily">Three Times Daily</option>
              <option value="weekly">Weekly</option>
              <option value="as_needed">As Needed</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Time of Day
            </label>
            <div className="space-y-2">
              <label className="inline-flex items-center mr-4">
                <input
                  type="checkbox"
                  name="time_of_day"
                  value="morning"
                  checked={formData.time_of_day.includes("morning")}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm">Morning</span>
              </label>
              <label className="inline-flex items-center mr-4">
                <input
                  type="checkbox"
                  name="time_of_day"
                  value="afternoon"
                  checked={formData.time_of_day.includes("afternoon")}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm">Afternoon</span>
              </label>
              <label className="inline-flex items-center mr-4">
                <input
                  type="checkbox"
                  name="time_of_day"
                  value="evening"
                  checked={formData.time_of_day.includes("evening")}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm">Evening</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="time_of_day"
                  value="bedtime"
                  checked={formData.time_of_day.includes("bedtime")}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm">Bedtime</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="start_date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="end_date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                End Date
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="prescribing_doctor"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Prescribing Doctor
            </label>
            <input
              type="text"
              id="prescribing_doctor"
              name="prescribing_doctor"
              value={formData.prescribing_doctor}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Dr. Smith"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="remaining"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Remaining Pills
              </label>
              <input
                type="number"
                id="remaining"
                name="remaining"
                value={formData.remaining}
                onChange={handleInputChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="refill_date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Next Refill Date
              </label>
              <input
                type="date"
                id="refill_date"
                name="refill_date"
                value={formData.refill_date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Additional instructions or notes"
            ></textarea>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Add Medication</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Medication Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        title="Edit Medication"
      >
        <form onSubmit={handleEditMedication} className="space-y-4">
          {/* Same form fields as Add Medication Modal */}
          <div>
            <label
              htmlFor="edit-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Medication Name*
            </label>
            <input
              type="text"
              id="edit-name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="edit-dosage"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Dosage*
            </label>
            <input
              type="text"
              id="edit-dosage"
              name="dosage"
              value={formData.dosage}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="edit-frequency"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Frequency*
            </label>
            <select
              id="edit-frequency"
              name="frequency"
              value={formData.frequency}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="daily">Daily</option>
              <option value="twice_daily">Twice Daily</option>
              <option value="three_times_daily">Three Times Daily</option>
              <option value="weekly">Weekly</option>
              <option value="as_needed">As Needed</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Time of Day
            </label>
            <div className="space-y-2">
              <label className="inline-flex items-center mr-4">
                <input
                  type="checkbox"
                  name="time_of_day"
                  value="morning"
                  checked={formData.time_of_day.includes("morning")}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm">Morning</span>
              </label>
              <label className="inline-flex items-center mr-4">
                <input
                  type="checkbox"
                  name="time_of_day"
                  value="afternoon"
                  checked={formData.time_of_day.includes("afternoon")}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm">Afternoon</span>
              </label>
              <label className="inline-flex items-center mr-4">
                <input
                  type="checkbox"
                  name="time_of_day"
                  value="evening"
                  checked={formData.time_of_day.includes("evening")}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm">Evening</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="time_of_day"
                  value="bedtime"
                  checked={formData.time_of_day.includes("bedtime")}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm">Bedtime</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-start_date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Start Date
              </label>
              <input
                type="date"
                id="edit-start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="edit-end_date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                End Date
              </label>
              <input
                type="date"
                id="edit-end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-prescribing_doctor"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Prescribing Doctor
            </label>
            <input
              type="text"
              id="edit-prescribing_doctor"
              name="prescribing_doctor"
              value={formData.prescribing_doctor}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-remaining"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Remaining Pills
              </label>
              <input
                type="number"
                id="edit-remaining"
                name="remaining"
                value={formData.remaining}
                onChange={handleInputChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="edit-refill_date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Next Refill Date
              </label>
              <input
                type="date"
                id="edit-refill_date"
                name="refill_date"
                value={formData.refill_date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-notes"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Notes
            </label>
            <textarea
              id="edit-notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            ></textarea>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Update Medication</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MedicationTracker;