import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import Select from '../common/Select';
import Input from '../common/Input';

const RecurringAppointmentForm = ({ 
  doctor, 
  initialValues = null, 
  onSubmit, 
  onCancel
}) => {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    dayOfWeek: '',
    timeSlot: '',
    recurrencePattern: 'weekly',
  });

  const daysOfWeek = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' },
  ];

  const timeSlots = [
    { value: '09:00', label: '9:00 AM' },
    { value: '09:30', label: '9:30 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '10:30', label: '10:30 AM' },
    { value: '11:00', label: '11:00 AM' },
    { value: '11:30', label: '11:30 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '14:00', label: '2:00 PM' },
    { value: '14:30', label: '2:30 PM' },
    { value: '15:00', label: '3:00 PM' },
    { value: '15:30', label: '3:30 PM' },
    { value: '16:00', label: '4:00 PM' },
    { value: '16:30', label: '4:30 PM' },
  ];

  const recurrencePatterns = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  useEffect(() => {
    if (initialValues) {
      setFormData(initialValues);
    }
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      doctorId: doctor.id,
      doctorName: doctor.name,
      id: initialValues?.id || Date.now().toString()
    });
  };

  // Calculate min date (today)
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];

  // Calculate max date (1 year from today)
  const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {initialValues ? 'Edit Recurring Appointment' : 'Schedule a Recurring Appointment'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <Input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              min={minDate}
              max={maxDate}
              required
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <Input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              min={formData.startDate || minDate}
              max={maxDate}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="recurrencePattern" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Recurrence Pattern
          </label>
          <Select
            name="recurrencePattern"
            value={formData.recurrencePattern}
            options={recurrencePatterns}
            onChange={(value) => handleSelectChange('recurrencePattern', value)}
            required
          />
        </div>

        <div>
          <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Day of Week
          </label>
          <Select
            name="dayOfWeek"
            value={formData.dayOfWeek}
            options={daysOfWeek}
            onChange={(value) => handleSelectChange('dayOfWeek', value)}
            required
          />
        </div>

        <div>
          <label htmlFor="timeSlot" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Time Slot
          </label>
          <Select
            name="timeSlot"
            value={formData.timeSlot}
            options={timeSlots}
            onChange={(value) => handleSelectChange('timeSlot', value)}
            required
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
          >
            {initialValues ? 'Update Appointment' : 'Schedule'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RecurringAppointmentForm;