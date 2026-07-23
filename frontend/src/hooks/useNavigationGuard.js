import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * useNavigationGuard
 * Prevents accidental exit from the app via browser back button or swipe gestures.
 * Forces the user to use explicit logout buttons by adding a dummy history entry.
 */
const useNavigationGuard = (enabled = true) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;

    // Push a "fake" state to the history stack
    // This makes the NEXT 'popstate' event trigger on this page instead of leaving it
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (event) => {
      // Re-push state to keep the user "locked" into this page
      // unless they explicitly trigger navigation via code
      window.history.pushState(null, '', window.location.href);
      
      // Optional: You could show a confirmation dialog here
      console.log('Navigation attempt blocked. Please use explicit logout/navigation links.');
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname, enabled]);
};

export default useNavigationGuard;
