import React, { useEffect, useState } from 'react';
import '../styles/globals.css';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from 'react-query';
import { store } from '../store/store';
import { ThemeProvider } from '../contexts/ThemeContext';
import { SessionProvider } from "next-auth/react";
import { NotificationProvider } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Create a client for React Query with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const [isLoading, setIsLoading] = useState(true);

  // Remove the server-side injected CSS when running on client
  useEffect(() => {
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles && jssStyles.parentElement) {
      jssStyles.parentElement.removeChild(jssStyles);
    }
    
    // Set a timeout to ensure we don't show loading spinner for too long
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // Show simplified loading state during initial load
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
        <p className="ml-2 text-gray-600">Loading Divo Medical System...</p>
      </div>
    );
  }

  // Wrap application with NotificationProvider
  return (
    <ThemeProvider>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <SessionProvider session={session}>
            <NotificationProvider>
              <Component {...pageProps} />
            </NotificationProvider>
          </SessionProvider>
        </QueryClientProvider>
      </Provider>
    </ThemeProvider>
  );
}

export default MyApp;
