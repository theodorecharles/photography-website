/**
 * ScrollToTop component that scrolls the window to the top
 * whenever the route changes.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // Only scroll to top if the pathname changes (ignoring hash changes)
    if (pathname !== prevPathname.current) {
      window.scrollTo(0, 0);
      prevPathname.current = pathname;
    }
  }, [pathname]);

  return null;
}

export default ScrollToTop; 
