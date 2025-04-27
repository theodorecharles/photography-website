/**
 * Footer component for the photography website.
 * This component displays copyright information and a link to the license page.
 */

import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>&copy; {new Date().getFullYear()} Ted Charles. All images are licensed under the Creative Commons Attribution 4.0 International License.</p>
        <div className="footer-links">
          <Link to="/license" className="footer-link">View License</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer; 