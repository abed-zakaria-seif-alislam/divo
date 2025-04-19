import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/router';
import { login, logout, updateUser } from '../store/slices/authSlice';
import { supabase } from '../lib/supabaseClient'; // Import Supabase client

const validateEmail = (email) => {
  return email && email.includes('@') && email.includes('.');
};

export function useAuth() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [loading, setLoading] = useState(false); // Start with false to prevent initial render delay
  const [error, setError] = useState(null);

  // Get auth state from Redux store
  const { user, isAuthenticated } = useSelector(state => state.auth);

  // Subscribe to Supabase auth state changes with lazy initialization
  useEffect(() => {
    let didCancel = false;
    
    // Lazy initialization - only check auth status when needed
    const checkAuthStatus = async () => {
      if (didCancel) return;
      setLoading(true);
      
      try {
        // Check initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && !didCancel) {
          // Fetch profile if session exists - using a more efficient approach
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, role, avatar_url')  // Only select fields we need immediately
            .eq('id', session.user.id)
            .single();

          if (!didCancel) {
            if (profileError) {
              console.error('Error fetching profile:', profileError);
              setError('Failed to load user profile.');
              dispatch(logout());
            } else if (profile) {
              dispatch(login({ ...session.user, ...profile }));
            } else {
              console.error('Profile not found for authenticated user:', session.user.id);
              setError('User profile missing.');
              await supabase.auth.signOut();
              dispatch(logout());
            }
          }
        } else if (!didCancel && isAuthenticated) {
          dispatch(logout());
        }
      } catch (err) {
        if (!didCancel) {
          console.error("Error checking auth:", err);
          setError("Failed to check authentication status.");
        }
      } finally {
        if (!didCancel) {
          setLoading(false);
        }
      }
    };

    // Only run auth check if the user is accessing a protected route
    const isProtectedRoute = !['/', '/login', '/register', '/about', '/features', '/contact'].includes(router.pathname);
    if (isProtectedRoute) {
      checkAuthStatus();
    } else {
      // For public routes, we don't need to wait for auth check to complete
      setLoading(false);
    }

    // Listen for auth changes (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (didCancel) return;
        
        setError(null);
        if (session?.user) {
          // Minimal user data for quick updates
          dispatch(login({
            id: session.user.id,
            email: session.user.email,
            // Add minimal info needed for UI rendering
          }));
          
          // Then fetch complete profile in background
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (!didCancel && profile) {
            dispatch(updateUser({ ...session.user, ...profile }));
          }
        } else {
          dispatch(logout());
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      didCancel = true;
      subscription?.unsubscribe();
    };
  }, [dispatch, isAuthenticated, router.pathname]); 

  // Sign in handler
  const signIn = useCallback(async (email, password) => {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    try {
      setLoading(true);
      setError(null);
      
      // Convert email to string and trim
      const cleanEmail = String(email).trim().toLowerCase();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) throw signInError;

      if (data?.user) {
        return { success: true, user: data.user };
      }
      
      throw new Error('Login failed');
    } catch (err) {
      console.error('Sign in error:', err);
      return {
        success: false,
        error: err.message || 'Failed to sign in'
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign up handler
  const signUp = useCallback(async (formData) => {
    try {
      setLoading(true);
      setError(null);

      const { email, password, firstName, lastName } = formData;
      const cleanEmail = String(email).trim().toLowerCase();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`,
            avatar_url: null,
            role: 'patient'
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data?.user) {
        return { success: true, data };
      } else {
        throw new Error('Failed to create user account');
      }

    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign out handler
  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }
      // No need to dispatch logout, onAuthStateChange handles it
      router.push('/login');
    } catch (err) {
       console.error('Sign out error:', err);
       setError(err.message || 'Failed to sign out.');
       dispatch(logout());
       router.push('/login');
    } finally {
       setLoading(false);
    }
  }, [router, dispatch]);

  // Update user profile
  const updateProfile = useCallback(async (profileData) => {
    if (!user?.id) {
      setError("Not authenticated.");
      return { success: false, error: "Not authenticated." };
    }
    setLoading(true);
    setError(null);

    try {
      // Prepare data for Supabase update (map frontend fields to DB columns if needed)
      const updateData = {
        full_name: profileData.name, // Assuming profileData has 'name'
        username: profileData.username,
        avatar_url: profileData.profilePicture,
        specialty: profileData.specialty,
        bio: profileData.bio,
        updated_at: new Date(),
        // Add other updatable fields from your 'profiles' table
      };

      // Remove undefined fields to avoid overwriting with null in Supabase
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);


      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select() // Select the updated row
        .single(); // Expecting a single row back

      if (updateError) {
        throw updateError;
      }

      if (updatedProfile) {
        // Combine with existing auth data (like email) and update Redux state
        const updatedUser = { ...user, ...updatedProfile };
        dispatch(updateUser(updatedUser));
        return { success: true, user: updatedUser };
      } else {
        throw new Error("Profile update succeeded but failed to retrieve updated data.");
      }

    } catch (err) {
      console.error('Update profile error:', err);
      setError(err.message || 'Failed to update profile.');
      return { success: false, error: err.message || 'Failed to update profile.' };
    } finally {
      setLoading(false);
    }
  }, [dispatch, user]); // user dependency is important here

  return {
    user,
    isAuthenticated,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile
  };
}

export default useAuth;
