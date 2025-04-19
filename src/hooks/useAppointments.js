import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useState } from 'react'; // Added useState for local doctor state
import { supabase } from '../lib/supabaseClient'; // Import Supabase client
import { useAuth } from './useAuth'; // Import useAuth to get current user
import {
  fetchAppointmentsStart,
  fetchAppointmentsSuccess,
  fetchAppointmentsFailure,
  addAppointment,
  updateAppointment,
  addMultipleAppointments,
  // cancelAppointment // We'll use updateAppointment for cancellation status
} from '../store/slices/appointmentSlice';

// Removed mock data and generation functions

export const useAppointments = () => {
  const dispatch = useDispatch();
  const { user } = useAuth(); // Get current authenticated user
  const { appointments, loading, error } = useSelector(
    (state) => state.appointments
  );
  const [doctors, setDoctors] = useState([]); // Local state for doctors list
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorsError, setDoctorsError] = useState(null);
  const [appointmentStats, setAppointmentStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);


  const fetchAppointments = useCallback(
    async () => {
      if (!user?.id) {
        // Don't fetch if user is not logged in
        dispatch(fetchAppointmentsSuccess([])); // Clear appointments
        return { success: true, appointments: [] };
      }

      try {
        dispatch(fetchAppointmentsStart());

        // Fetch appointments where the current user is either the patient or the doctor
        // Join profile data for both patient and doctor
        const { data, error: fetchError } = await supabase
          .from('appointments')
          .select(`
            *,
            patient:patient_id ( id, full_name, avatar_url ),
            doctor:doctor_id ( id, full_name, avatar_url, specialty )
          `)
          .or(`patient_id.eq.${user.id},doctor_id.eq.${user.id}`) // User is patient OR doctor
          .order('appointment_time', { ascending: false }); // Order by time

        if (fetchError) {
          throw fetchError;
        }

        // Combine date and time from Supabase if they are separate columns
        // Assuming 'appointment_time' is a timestamp with time zone column
        const formattedAppointments = data.map(app => ({
            ...app,
            // Supabase returns ISO string, potentially format date/time here if needed
            // or format in the component where it's displayed
            date: app.appointment_time ? new Date(app.appointment_time).toISOString().split('T')[0] : null,
            time: app.appointment_time ? new Date(app.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
        }));


        dispatch(fetchAppointmentsSuccess(formattedAppointments));
        return { success: true, appointments: formattedAppointments };

      } catch (err) {
        console.error("Error fetching appointments:", err);
        const message = err.message || 'Failed to fetch appointments';
        dispatch(fetchAppointmentsFailure(message));
        return { success: false, error: message };
      }
    },
    [dispatch, user?.id] // Depend on user.id
  );

  const createAppointment = useCallback(
    async (appointmentData) => {
       if (!user?.id) return { success: false, error: 'User not authenticated' };

      // Combine date and time strings into a valid ISO 8601 timestamp string
      // Assumes appointmentData has 'date' (YYYY-MM-DD) and 'time' (HH:MM)
      let appointmentTimestamp;
      if (appointmentData.date && appointmentData.time) {
          try {
              appointmentTimestamp = new Date(`${appointmentData.date}T${appointmentData.time}:00`).toISOString();
          } catch (e) {
              console.error("Invalid date/time format:", e);
              return { success: false, error: 'Invalid date or time format provided.' };
          }
      } else {
          return { success: false, error: 'Date and time are required.' };
      }


      const newAppointmentData = {
        patient_id: user.id, // Current user is the patient creating the appointment
        doctor_id: appointmentData.doctorId,
        appointment_time: appointmentTimestamp,
        status: 'scheduled', // Default status
        reason: appointmentData.reason,
        // Add other relevant fields from appointmentData if needed
      };

      try {
        const { data, error: insertError } = await supabase
          .from('appointments')
          .insert(newAppointmentData)
          .select(`
            *,
            patient:patient_id ( id, full_name, avatar_url ),
            doctor:doctor_id ( id, full_name, avatar_url, specialty )
          `) // Select the newly created row with joins
          .single(); // Expecting a single row back

        if (insertError) {
          throw insertError;
        }

        // Format the newly created appointment similarly to fetched ones
         const formattedAppointment = {
            ...data,
            date: data.appointment_time ? new Date(data.appointment_time).toISOString().split('T')[0] : null,
            time: data.appointment_time ? new Date(data.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
        };

        dispatch(addAppointment(formattedAppointment)); // Add to Redux state
        return { success: true, appointment: formattedAppointment };

      } catch (err) {
        console.error("Error creating appointment:", err);
        return { success: false, error: err.message || 'Failed to create appointment' };
      }
    },
    [dispatch, user?.id]
  );

  // Update function can be used for rescheduling, adding notes, or cancelling
  const updateAppointmentById = useCallback(
    async (id, updateData) => {
       if (!user?.id) return { success: false, error: 'User not authenticated' };

       // If date/time are being updated, format them
       let appointmentTimestamp;
       if (updateData.date && updateData.time) {
           try {
               appointmentTimestamp = new Date(`${updateData.date}T${updateData.time}:00`).toISOString();
               updateData.appointment_time = appointmentTimestamp; // Add to update payload
               delete updateData.date; // Remove separate fields
               delete updateData.time;
           } catch (e) {
               console.error("Invalid date/time format for update:", e);
               return { success: false, error: 'Invalid date or time format provided for update.' };
           }
       } else {
           // Ensure date/time are not accidentally removed if only other fields are updated
           delete updateData.date;
           delete updateData.time;
       }


      try {
        const { data, error: updateError } = await supabase
          .from('appointments')
          .update(updateData) // Pass the fields to update (e.g., { status: 'cancelled' }, { notes: '...' }, { appointment_time: '...' })
          .eq('id', id)
          // Add RLS check simulation if needed, though DB enforces it:
          // .or(`patient_id.eq.${user.id},doctor_id.eq.${user.id}`)
          .select(`
            *,
            patient:patient_id ( id, full_name, avatar_url ),
            doctor:doctor_id ( id, full_name, avatar_url, specialty )
          `)
          .single();

        if (updateError) {
          // Handle RLS errors specifically if needed (e.g., updateError.code === '42501')
          throw updateError;
        }

         const formattedAppointment = {
            ...data,
            date: data.appointment_time ? new Date(data.appointment_time).toISOString().split('T')[0] : null,
            time: data.appointment_time ? new Date(data.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
        };

        dispatch(updateAppointment(formattedAppointment)); // Update in Redux state
        return { success: true, appointment: formattedAppointment };

      } catch (err) {
        console.error("Error updating appointment:", err);
        return { success: false, error: err.message || 'Failed to update appointment' };
      }
    },
    [dispatch, user?.id]
  );

  // New function to send appointment reminders
  const sendAppointmentReminder = useCallback(
    async (appointmentId) => {
      if (!user?.id) return { success: false, error: 'User not authenticated' };

      try {
        // First get the appointment details
        const { data: appointment, error: fetchError } = await supabase
          .from('appointments')
          .select(`
            *,
            patient:patient_id ( id, full_name, email ),
            doctor:doctor_id ( id, full_name, specialty )
          `)
          .eq('id', appointmentId)
          .single();

        if (fetchError) throw fetchError;
        
        // Check if current user is authorized to send this reminder
        if (appointment.patient_id !== user.id && appointment.doctor_id !== user.id) {
          return { success: false, error: 'Not authorized to send reminders for this appointment' };
        }

        // Create a notification record in the database
        const { data, error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: appointment.patient_id === user.id ? appointment.doctor_id : appointment.patient_id, // Send to the other party
            title: 'Appointment Reminder',
            message: `Reminder: You have an appointment with ${
              appointment.patient_id === user.id 
                ? appointment.patient.full_name 
                : appointment.doctor.full_name
            } on ${new Date(appointment.appointment_time).toLocaleDateString()} at ${
              new Date(appointment.appointment_time).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })
            }.`,
            type: 'appointment_reminder',
            related_id: appointmentId,
            read: false
          })
          .select()
          .single();

        if (notificationError) throw notificationError;

        return { 
          success: true, 
          message: 'Appointment reminder sent successfully' 
        };
      } catch (err) {
        console.error("Error sending appointment reminder:", err);
        return { 
          success: false, 
          error: err.message || 'Failed to send appointment reminder' 
        };
      }
    },
    [user?.id]
  );

  // Function to get available slots for a specific doctor
  const getAvailableSlots = useCallback(
    async (doctorId, date) => {
      if (!doctorId || !date) {
        return { success: false, error: 'Doctor ID and date are required' };
      }

      try {
        // First, get the doctor's working hours
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('working_hours')
          .eq('id', doctorId)
          .single();

        if (doctorError) throw doctorError;

        // Default working hours if not set
        const workingHours = doctorData?.working_hours || {
          start: '09:00',
          end: '17:00',
          slotDuration: 30, // in minutes
          daysOff: [0, 6]   // Sunday and Saturday off (0 = Sunday)
        };

        const selectedDate = new Date(date);
        const dayOfWeek = selectedDate.getDay();

        // Check if selected date is a day off
        if (workingHours.daysOff.includes(dayOfWeek)) {
          return { 
            success: true, 
            slots: [],
            message: 'The doctor is not available on this day'
          };
        }

        // Generate all possible time slots
        const startTime = new Date(`${date}T${workingHours.start}`);
        const endTime = new Date(`${date}T${workingHours.end}`);
        const slotDuration = workingHours.slotDuration * 60 * 1000; // convert to milliseconds
        
        const allSlots = [];
        let currentSlot = new Date(startTime);
        
        while (currentSlot < endTime) {
          allSlots.push(new Date(currentSlot));
          currentSlot = new Date(currentSlot.getTime() + slotDuration);
        }

        // Fetch booked appointments for that doctor on that day
        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const { data: bookedSlots, error: bookedError } = await supabase
          .from('appointments')
          .select('appointment_time')
          .eq('doctor_id', doctorId)
          .gte('appointment_time', dayStart.toISOString())
          .lt('appointment_time', dayEnd.toISOString())
          .neq('status', 'cancelled');

        if (bookedError) throw bookedError;

        // Filter out booked slots
        const bookedTimes = bookedSlots.map(slot => new Date(slot.appointment_time).getTime());
        const availableSlots = allSlots.filter(slot => 
          !bookedTimes.includes(slot.getTime())
        ).map(slot => ({
          time: slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          available: true
        }));

        return { 
          success: true, 
          slots: availableSlots 
        };
      } catch (err) {
        console.error("Error getting available slots:", err);
        return { 
          success: false, 
          error: err.message || 'Failed to get available appointment slots' 
        };
      }
    },
    []
  );

  // Specific function for cancellation for clarity
  const cancelAppointmentById = useCallback(
    async (id) => {
      return updateAppointmentById(id, { status: 'cancelled' });
    },
    [updateAppointmentById] // Depends on the generic update function
  );

  // Function to create recurring appointments
  const createRecurringAppointments = useCallback(
    async (appointmentData, recurringPattern) => {
      if (!user?.id) return { success: false, error: 'User not authenticated' };
      
      // Validate recurring pattern
      if (!['weekly', 'biweekly', 'monthly'].includes(recurringPattern.type)) {
        return { success: false, error: 'Invalid recurring pattern type' };
      }
      
      if (!recurringPattern.occurrences || recurringPattern.occurrences < 1 || recurringPattern.occurrences > 52) {
        return { success: false, error: 'Number of occurrences should be between 1 and 52' };
      }

      try {
        const appointments = [];
        const baseDate = new Date(`${appointmentData.date}T${appointmentData.time}:00`);
        
        // Generate appointments based on recurring pattern
        for (let i = 0; i < recurringPattern.occurrences; i++) {
          const currentDate = new Date(baseDate);
          
          // Calculate date based on pattern type
          if (i > 0) { // Skip the first date as it's the base date
            if (recurringPattern.type === 'weekly') {
              currentDate.setDate(currentDate.getDate() + (7 * i));
            } else if (recurringPattern.type === 'biweekly') {
              currentDate.setDate(currentDate.getDate() + (14 * i));
            } else if (recurringPattern.type === 'monthly') {
              currentDate.setMonth(currentDate.getMonth() + i);
            }
          }
          
          const appointmentTimestamp = currentDate.toISOString();
          
          // Create appointment data for this occurrence
          appointments.push({
            patient_id: user.id,
            doctor_id: appointmentData.doctorId,
            appointment_time: appointmentTimestamp,
            status: 'scheduled',
            reason: appointmentData.reason,
            notes: appointmentData.notes,
            type: appointmentData.type || 'in-person',
            recurring_group_id: crypto.randomUUID(), // To group recurring appointments
            recurring_sequence: i + 1, // Sequence number in the recurring group
            total_occurrences: recurringPattern.occurrences
          });
        }
        
        // Insert all appointments in batch
        const { data, error: insertError } = await supabase
          .from('appointments')
          .insert(appointments)
          .select(`
            *,
            patient:patient_id ( id, full_name, avatar_url ),
            doctor:doctor_id ( id, full_name, avatar_url, specialty )
          `);
        
        if (insertError) throw insertError;
        
        // Format appointments
        const formattedAppointments = data.map(app => ({
          ...app,
          date: app.appointment_time ? new Date(app.appointment_time).toISOString().split('T')[0] : null,
          time: app.appointment_time ? new Date(app.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
        }));
        
        // Update Redux state
        dispatch(addMultipleAppointments(formattedAppointments));
        
        return { success: true, appointments: formattedAppointments };
      } catch (err) {
        console.error("Error creating recurring appointments:", err);
        return { success: false, error: err.message || 'Failed to create recurring appointments' };
      }
    },
    [dispatch, user?.id]
  );

  // Function to create a follow-up appointment
  const createFollowUpAppointment = useCallback(
    async (originalAppointmentId, followUpData) => {
      if (!user?.id) return { success: false, error: 'User not authenticated' };
      
      try {
        // First, get the original appointment details
        const { data: originalAppointment, error: fetchError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', originalAppointmentId)
          .single();
        
        if (fetchError) throw fetchError;
        
        // Check if user is authorized to create follow-up
        if (originalAppointment.patient_id !== user.id && originalAppointment.doctor_id !== user.id) {
          return { success: false, error: 'Not authorized to create follow-up for this appointment' };
        }
        
        // Format follow-up date and time
        let followUpTimestamp;
        try {
          followUpTimestamp = new Date(`${followUpData.date}T${followUpData.time}:00`).toISOString();
        } catch (e) {
          return { success: false, error: 'Invalid date or time format provided.' };
        }
        
        // Create follow-up appointment data
        const followUpAppointment = {
          patient_id: originalAppointment.patient_id,
          doctor_id: originalAppointment.doctor_id,
          appointment_time: followUpTimestamp,
          status: 'scheduled',
          reason: followUpData.reason || `Follow-up to appointment from ${new Date(originalAppointment.appointment_time).toLocaleDateString()}`,
          notes: followUpData.notes,
          type: followUpData.type || originalAppointment.type || 'in-person',
          parent_appointment_id: originalAppointmentId, // Reference to the original appointment
          is_follow_up: true
        };
        
        // Insert follow-up appointment
        const { data, error: insertError } = await supabase
          .from('appointments')
          .insert(followUpAppointment)
          .select(`
            *,
            patient:patient_id ( id, full_name, avatar_url ),
            doctor:doctor_id ( id, full_name, avatar_url, specialty )
          `)
          .single();
        
        if (insertError) throw insertError;
        
        // Format appointment
        const formattedAppointment = {
          ...data,
          date: data.appointment_time ? new Date(data.appointment_time).toISOString().split('T')[0] : null,
          time: data.appointment_time ? new Date(data.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
        };
        
        // Update Redux state
        dispatch(addAppointment(formattedAppointment));
        
        return { success: true, appointment: formattedAppointment };
      } catch (err) {
        console.error("Error creating follow-up appointment:", err);
        return { success: false, error: err.message || 'Failed to create follow-up appointment' };
      }
    },
    [dispatch, user?.id]
  );

  // Function to get appointment analytics
  const getAppointmentAnalytics = useCallback(
    async (period = 'month') => {
      if (!user?.id) return { success: false, error: 'User not authenticated' };
      
      setStatsLoading(true);
      
      try {
        const now = new Date();
        let startDate;
        
        // Calculate start date based on period
        if (period === 'week') {
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
        } else if (period === 'month') {
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
        } else if (period === 'quarter') {
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 3);
        } else if (period === 'year') {
          startDate = new Date(now);
          startDate.setFullYear(now.getFullYear() - 1);
        } else {
          return { success: false, error: 'Invalid period specified' };
        }
        
        // Fetch all relevant appointments for the period
        const { data: appointmentsData, error: fetchError } = await supabase
          .from('appointments')
          .select(`
            id, 
            appointment_time, 
            status, 
            type,
            patient:patient_id ( id, full_name ),
            doctor:doctor_id ( id, full_name, specialty )
          `)
          .or(`patient_id.eq.${user.id},doctor_id.eq.${user.id}`)
          .gte('appointment_time', startDate.toISOString())
          .lte('appointment_time', now.toISOString());
        
        if (fetchError) throw fetchError;
        
        // Process analytics data
        const stats = {
          total: appointmentsData.length,
          byStatus: {},
          byType: {},
          byDay: {},
          bySpecialty: {},
          completionRate: 0,
          averageDuration: 0,
        };
        
        // Calculate metrics
        appointmentsData.forEach(app => {
          // By status
          const status = app.status || 'unknown';
          stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
          
          // By type
          const type = app.type || 'in-person';
          stats.byType[type] = (stats.byType[type] || 0) + 1;
          
          // By day of week
          const day = new Date(app.appointment_time).toLocaleDateString('en-US', { weekday: 'short' });
          stats.byDay[day] = (stats.byDay[day] || 0) + 1;
          
          // By specialty (if doctor)
          if (app.doctor && app.doctor.specialty) {
            const specialty = app.doctor.specialty;
            stats.bySpecialty[specialty] = (stats.bySpecialty[specialty] || 0) + 1;
          }
        });
        
        // Calculate completion rate
        const completed = stats.byStatus['completed'] || 0;
        const cancelled = stats.byStatus['cancelled'] || 0;
        const noShow = stats.byStatus['no-show'] || 0;
        stats.completionRate = stats.total ? (completed / stats.total) * 100 : 0;
        stats.cancellationRate = stats.total ? ((cancelled + noShow) / stats.total) * 100 : 0;
        
        setAppointmentStats(stats);
        return { success: true, stats };
      } catch (err) {
        console.error("Error fetching appointment analytics:", err);
        return { success: false, error: err.message || 'Failed to fetch appointment analytics' };
      } finally {
        setStatsLoading(false);
      }
    },
    [user?.id]
  );

  // Function to get appointments by specific filters
  const getFilteredAppointments = useCallback(
    async (filters) => {
      if (!user?.id) return { success: false, error: 'User not authenticated' };
      
      try {
        // Start building the query
        let query = supabase
          .from('appointments')
          .select(`
            *,
            patient:patient_id ( id, full_name, avatar_url ),
            doctor:doctor_id ( id, full_name, avatar_url, specialty )
          `)
          .or(`patient_id.eq.${user.id},doctor_id.eq.${user.id}`);
        
        // Apply filters if they exist
        if (filters) {
          // Date range filter
          if (filters.startDate) {
            query = query.gte('appointment_time', new Date(filters.startDate).toISOString());
          }
          
          if (filters.endDate) {
            query = query.lte('appointment_time', new Date(filters.endDate).toISOString());
          }
          
          // Status filter
          if (filters.status) {
            query = query.eq('status', filters.status);
          }
          
          // Type filter
          if (filters.type) {
            query = query.eq('type', filters.type);
          }
          
          // Doctor filter (if user is a patient)
          if (filters.doctorId) {
            query = query.eq('doctor_id', filters.doctorId);
          }
          
          // Patient filter (if user is a doctor)
          if (filters.patientId) {
            query = query.eq('patient_id', filters.patientId);
          }
          
          // Search filter for reason or notes
          if (filters.searchTerm) {
            query = query.or(`reason.ilike.%${filters.searchTerm}%,notes.ilike.%${filters.searchTerm}%`);
          }
          
          // Filter for follow-ups only
          if (filters.onlyFollowUps) {
            query = query.eq('is_follow_up', true);
          }
          
          // Filter for parent appointments only
          if (filters.onlyParentAppointments) {
            query = query.is('parent_appointment_id', null);
          }
        }
        
        // Always order by appointment time (descending/ascending based on filter)
        query = query.order('appointment_time', { ascending: filters?.oldestFirst || false });
        
        const { data, error: fetchError } = await query;
        
        if (fetchError) throw fetchError;
        
        // Format appointments
        const formattedAppointments = data.map(app => ({
          ...app,
          date: app.appointment_time ? new Date(app.appointment_time).toISOString().split('T')[0] : null,
          time: app.appointment_time ? new Date(app.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
        }));
        
        return { success: true, appointments: formattedAppointments };
      } catch (err) {
        console.error("Error fetching filtered appointments:", err);
        return { success: false, error: err.message || 'Failed to fetch filtered appointments' };
      }
    },
    [user?.id]
  );

  // --- Filtering Logic (remains the same, operates on Redux state) ---
  const getUpcomingAppointments = useCallback(() => {
    const now = new Date();
    return appointments.filter(
      (appointment) =>
        appointment.appointment_time && new Date(appointment.appointment_time) >= now && appointment.status === 'scheduled'
    ).sort((a, b) => new Date(a.appointment_time) - new Date(b.appointment_time));
  }, [appointments]);

  const getPastAppointments = useCallback(() => {
     const now = new Date();
    return appointments.filter(
      (appointment) =>
        !appointment.appointment_time || new Date(appointment.appointment_time) < now || appointment.status !== 'scheduled'
    ).sort((a, b) => new Date(b.appointment_time) - new Date(a.appointment_time));
  }, [appointments]);


  // --- Fetch Doctors ---
  const getDoctors = useCallback(async () => {
    setDoctorsLoading(true);
    setDoctorsError(null);
    try {
      const { data, error: doctorError } = await supabase
        .from('profiles')
        .select('id, full_name, specialty, avatar_url, bio') // Select relevant fields
        .eq('role', 'doctor');

      if (doctorError) {
        throw doctorError;
      }
      setDoctors(data || []);
      return { success: true, doctors: data || [] };
    } catch (err) {
      console.error("Error fetching doctors:", err);
      const message = err.message || 'Failed to fetch doctors';
      setDoctorsError(message);
      return { success: false, error: message };
    } finally {
      setDoctorsLoading(false);
    }
  }, []); // No dependencies needed for this specific fetch


  return {
    appointments, // From Redux state
    loading,
    error,
    fetchAppointments,
    createAppointment,
    updateAppointmentById,
    cancelAppointmentById,
    getUpcomingAppointments,
    getPastAppointments,
    getDoctors, // Function to fetch doctors
    doctors, // Local state holding fetched doctors
    doctorsLoading, // Loading state for doctors fetch
    doctorsError, // Error state for doctors fetch
    sendAppointmentReminder, // Function to send appointment reminders
    getAvailableSlots, // Function to get available slots for a specific doctor
    // New functionality
    createRecurringAppointments, // Create multiple recurring appointments
    createFollowUpAppointment, // Create a follow-up appointment
    getAppointmentAnalytics, // Get analytics about appointments
    appointmentStats, // Appointment statistics state
    statsLoading, // Loading state for stats
    getFilteredAppointments, // Advanced filtering for appointments
  };
};
