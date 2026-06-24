import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { captureUtmFromUrl } from '../lib/utm';
import { trackEvent } from '../lib/analytics';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    captureUtmFromUrl();
  }, [location.search]);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/explore') trackEvent('explore_view');
    else if (path.startsWith('/salon/')) trackEvent('salon_view', { salon_id: path.split('/')[2] });
  }, [location.pathname]);

  return <>{children}</>;
}
