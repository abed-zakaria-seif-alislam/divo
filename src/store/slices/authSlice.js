import { createSlice } from '@reduxjs/toolkit';

// Initial state - Simplified
const initialState = {
  user: null, // Will store Supabase user object + profile data
  isAuthenticated: false,
};

// Create the auth slice
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Called by useAuth hook when Supabase auth state changes to logged in
    login: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload; // Payload should be { ...supabaseUser, ...profileData }
    },

    // Called by useAuth hook when Supabase auth state changes to logged out
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },

    // Called by useAuth hook after successful profile update
    updateUser: (state, action) => {
      // Ensure user exists before trying to merge
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

// Export the actions used by the hook
export const {
  login,
  logout,
  updateUser,
} = authSlice.actions;

// Export the reducer
export default authSlice.reducer;
