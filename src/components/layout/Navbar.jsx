import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { BellIcon, UserCircleIcon, ArrowLeftOnRectangleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'; 
import NotificationDropdown from '../notifications/NotificationDropdown';
import { useAuth } from '../../hooks/useAuth'; 
import { useRouter } from 'next/router';
import Button from '../common/Button'; // Assuming Button exists for potential use

// Helper component for Nav Links
const NavLink = ({ href, children }) => {
  const router = useRouter();
  const isActive = router.pathname === href || (href !== '/' && router.pathname.startsWith(href)); // Improved active check

  return (
    <Link href={href} legacyBehavior>
      <a className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive 
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' 
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
      }`}>
        {children}
      </a>
    </Link>
  );
};


const Navbar = () => {
  const { user, isAuthenticated, signOut, loading: authLoading } = useAuth(); 
  const router = useRouter();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  // TODO: Replace with actual notifications from useNotifications hook later
  const [notifications, setNotifications] = useState([ 
    { id: 1, type: 'appointment', title: 'Upcoming Appointment', message: 'You have an appointment with Dr. Labed Mahfoud tomorrow at 2:00 PM', time: '1 hour ago', isNew: true },
    { id: 2, type: 'medical', title: 'Test Results Available', message: 'Your recent blood test results have been uploaded to your health records', time: '3 hours ago', isNew: true },
    { id: 3, type: 'system', title: 'Profile Updated', message: 'Your profile information has been successfully updated', time: 'Yesterday', isNew: false }
  ]); 
  const notificationRef = useRef(null);

  const hasNewNotifications = notifications.some(notif => notif.isNew);

  // Close notification dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Define Navigation Links based on role
  const getNavLinks = () => {
    // Don't render links until auth state is resolved
    if (authLoading) return []; 

    if (!isAuthenticated) { // Visitor Links
      return [
        { href: '/', label: 'Home' },
        { href: '/features', label: 'Features' },
        { href: '/about', label: 'About Us' },
        // Add other visitor links as needed
      ];
    }
    // Logged-in user links
    switch (user?.role) {
      case 'patient':
        return [
          { href: '/dashboard/patient', label: 'Dashboard' },
          { href: '/appointments', label: 'Appointments' },
          { href: '/find-doctors', label: 'Find Doctors' },
          { href: '/health-records', label: 'Health Records' },
          // { href: '/features', label: 'Features' }, // Maybe remove redundant links for logged-in users
          // { href: '/about', label: 'About Us' },
        ];
      case 'doctor':
        return [
          { href: '/dashboard/doctor', label: 'Dashboard' },
          // Add other doctor-specific links like 'My Patients', 'Schedule' etc.
          // Example: { href: '/doctor/schedule', label: 'My Schedule' },
          { href: '/profile', label: 'Profile Settings' }, 
        ];
      case 'admin':
        return [
          { href: '/admin/dashboard', label: 'Admin Dashboard' },
          // Add links for user management, etc.
          // Example: { href: '/admin/users', label: 'Manage Users' },
        ];
      default: // Fallback if role is missing or unexpected (shouldn't happen ideally)
         console.warn("Navbar: User authenticated but role is missing or invalid:", user?.role);
         // Show basic links or dashboard link based on assumption
         return [{ href: '/dashboard/patient', label: 'Dashboard' }]; // Default to patient dashboard?
    }
  };

  const navLinks = getNavLinks();

  // Determine logo link based on auth status and role
  const getLogoLink = () => {
    if (authLoading) return '/'; // Default to home while loading
    if (!isAuthenticated) return '/';
    switch (user?.role) {
        case 'patient': return '/dashboard/patient';
        case 'doctor': return '/dashboard/doctor';
        case 'admin': return '/admin/dashboard';
        default: return '/'; // Fallback
    }
  }

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40"> {/* Added sticky positioning */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href={getLogoLink()} legacyBehavior>
                <a className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  Divo
                </a>
              </Link>
            </div>
            {/* Navigation Links */}
            <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-1 md:space-x-4"> {/* Adjusted spacing */}
              {!authLoading && navLinks.map(link => ( // Render links only when auth is resolved
                <NavLink key={link.href} href={link.href}>{link.label}</NavLink>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center">
            {/* Theme Toggle Placeholder - Add actual toggle logic here */}
             <button 
               className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none mr-2"
               aria-label="Toggle dark mode" 
               // onClick={toggleDarkMode} // Add theme toggle function
             >
                <svg className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
             </button>

            {authLoading ? (
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse ml-3"></div> // Placeholder while loading auth
            ) : isAuthenticated ? (
              <>
                {/* Notification Bell */}
                <div className="relative ml-3" ref={notificationRef}>
                  <Link href="/notifications" legacyBehavior>
                    <a 
                      className={`relative p-2 rounded-full focus:outline-none transition-colors duration-200 ${
                        isNotificationsOpen 
                          ? 'bg-primary-600 dark:bg-primary-700 text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      } block`}
                      aria-label="Notifications"
                    >
                      <BellIcon className="h-6 w-6" />
                      {hasNewNotifications && (
                        <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 transform translate-x-1 -translate-y-1 ring-2 ring-white dark:ring-gray-800"></span>
                      )}
                    </a>
                  </Link>

                  <NotificationDropdown
                    isOpen={isNotificationsOpen}
                    onClose={() => setIsNotificationsOpen(false)}
                    notifications={notifications} 
                    onNotificationClick={(id) => {
                      console.log("Clicked notification:", id);
                      setNotifications(notifications.map(notif => 
                        notif.id === id ? { ...notif, isNew: false } : notif
                      ));
                      setIsNotificationsOpen(false); 
                    }}
                  />
                </div>

                {/* Profile Link */}
                <div className="ml-3 relative">
                  <Link href="/profile" legacyBehavior>
                    <a className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800" aria-label="User profile">
                      {user.avatar_url ? (
                         <img className="h-8 w-8 rounded-full object-cover" src={user.avatar_url} alt="User avatar" onError={(e) => { e.target.onerror = null; e.target.src='/images/default-avatar.png'; }}/>
                      ) : (
                         <UserCircleIcon className="h-8 w-8 rounded-full text-gray-500 dark:text-gray-400" />
                      )}
                    </a>
                  </Link>
                  {/* TODO: Add dropdown menu for profile/settings/logout */}
                </div>

                 {/* Logout Button */}
                 <button
                    onClick={signOut}
                    disabled={authLoading} // Disable during sign out process
                    className="ml-4 p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
                    aria-label="Logout"
                  >
                     <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                  </button>
              </>
            ) : (
              // Login/Register Buttons for Visitors
              <div className="hidden sm:flex sm:items-center sm:ml-6 space-x-2">
                <Link href="/login" legacyBehavior>
                  <a className="px-3 py-2 rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors duration-200 ease-in-out">
                    Sign in
                  </a>
                </Link>
                <Link href="/register" legacyBehavior>
                  <a className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 ease-in-out transform hover:scale-105 hover:text-white">
                    Sign up
                  </a>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
