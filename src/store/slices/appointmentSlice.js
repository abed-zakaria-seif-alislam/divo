import { createSlice } from '@reduxjs/toolkit';

// Initial state - Simplified
const initialState = {
  data: [],
  loading: false,
  error: null,
};

// Create the appointment slice
export const appointmentSlice = createSlice({
  name: 'appointments',
  initialState,
  reducers: {
    // Action dispatched when starting to fetch appointments
    fetchAppointmentsStart: (state) => {
      state.loading = true;
      state.error = null;
    },

    // Action dispatched when appointments are successfully fetched
    fetchAppointmentsSuccess: (state, action) => {
      state.loading = false;
      state.data = action.payload; // Payload is the array of appointments
      state.error = null;
    },

    // Action dispatched when fetching appointments fails
    fetchAppointmentsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload; // Payload is the error message
    },
    
    // Add a single appointment
    addAppointment: (state, action) => {
      state.data.unshift(action.payload); // Add to beginning of array
    },

    // Add multiple appointments (for recurring appointments)
    addMultipleAppointments: (state, action) => {
      state.data = [...action.payload, ...state.data];
    },
    
    // Update an appointment
    updateAppointment: (state, action) => {
      const index = state.data.findIndex(app => app.id === action.payload.id);
      if (index !== -1) {
        state.data[index] = action.payload;
      }
    },
    
    // Delete an appointment
    deleteAppointment: (state, action) => {
      state.data = state.data.filter(app => app.id !== action.payload);
    },
    
    // Update all appointments in a recurring group
    updateRecurringAppointments: (state, action) => {
      const { groupId, updates } = action.payload;
      state.data = state.data.map(app => 
        app.recurring_group_id === groupId ? { ...app, ...updates } : app
      );
    },
    
    // Cancel all future appointments in a recurring group
    cancelFutureRecurringAppointments: (state, action) => {
      const { groupId, fromSequence } = action.payload;
      state.data = state.data.map(app => 
        (app.recurring_group_id === groupId && app.recurring_sequence >= fromSequence) 
          ? { ...app, status: 'cancelled' } 
          : app
      );
    }
  },
});

// Export the simplified actions
export const {
  fetchAppointmentsStart,
  fetchAppointmentsSuccess,
  fetchAppointmentsFailure,
  addAppointment,
  addMultipleAppointments,
  updateAppointment,
  deleteAppointment,
  updateRecurringAppointments,
  cancelFutureRecurringAppointments
} = appointmentSlice.actions;

// Export the reducer
export default appointmentSlice.reducer;
