import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import Card from '../common/Card';
import Modal from '../common/Modal';
import RecurringAppointmentForm from './RecurringAppointmentForm';
import { motion } from 'framer-motion';
import Alert from '../common/Alert';

const LOCAL_STORAGE_KEY = 'divo-recurring-appointments';

const RecurringAppointmentsManager = ({ doctor }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    // Load existing recurring appointments from localStorage
    if (typeof window !== 'undefined') {
      const savedAppointments = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      // Filter to only show appointments for this doctor
      const doctorAppointments = savedAppointments.filter(appt => appt.doctorId === doctor.id);
      setAppointments(doctorAppointments);
    }
  }, [doctor.id]);

  const saveAppointmentsToStorage = (updatedAppointments) => {
    if (typeof window !== 'undefined') {
      // Get all appointments
      const allAppointments = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      
      // Remove all appointments for this doctor
      const filteredAppointments = allAppointments.filter(appt => appt.doctorId !== doctor.id);
      
      // Add updated appointments for this doctor
      const newAppointments = [...filteredAppointments, ...updatedAppointments];
      
      // Save back to localStorage
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newAppointments));
    }
  };

  const handleCreateAppointment = () => {
    setEditingAppointment(null);
    setIsModalOpen(true);
  };

  const handleEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleDeleteAppointment = (id) => {
    const updatedAppointments = appointments.filter(appt => appt.id !== id);
    setAppointments(updatedAppointments);
    saveAppointmentsToStorage(updatedAppointments);
    
    showAlert('Recurring appointment deleted successfully', 'success');
  };

  const handleSubmit = (formData) => {
    let updatedAppointments;
    
    if (editingAppointment) {
      // Update existing appointment
      updatedAppointments = appointments.map(appt => 
        appt.id === formData.id ? formData : appt
      );
      showAlert('Recurring appointment updated successfully', 'success');
    } else {
      // Add new appointment
      updatedAppointments = [...appointments, formData];
      showAlert('Recurring appointment scheduled successfully', 'success');
    }
    
    setAppointments(updatedAppointments);
    saveAppointmentsToStorage(updatedAppointments);
    setIsModalOpen(false);
  };

  const showAlert = (message, type = 'info', duration = 3000) => {
    setAlert({ message, type });
    setTimeout(() => {
      setAlert(null);
    }, duration);
  };

  // Format day of week for display
  const formatDayOfWeek = (day) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  // Format time for display
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    return `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Recurring Appointments
        </h3>
        <Button onClick={handleCreateAppointment} size="sm">
          Schedule Recurring
        </Button>
      </div>

      {alert && (
        <Alert type={alert.type} className="mb-4">
          {alert.message}
        </Alert>
      )}

      {appointments.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No recurring appointments scheduled with this doctor.
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={handleCreateAppointment}
          >
            Schedule Your First Recurring Appointment
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {appointments.map((appointment) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">
                    {formatDayOfWeek(appointment.dayOfWeek)} at {formatTime(appointment.timeSlot)}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {appointment.recurrencePattern.charAt(0).toUpperCase() + appointment.recurrencePattern.slice(1)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    From {new Date(appointment.startDate).toLocaleDateString()} to {new Date(appointment.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditAppointment(appointment)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteAppointment(appointment.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingAppointment ? "Edit Recurring Appointment" : "New Recurring Appointment"}
      >
        <RecurringAppointmentForm
          doctor={doctor}
          initialValues={editingAppointment}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default RecurringAppointmentsManager;