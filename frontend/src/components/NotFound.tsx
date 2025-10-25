/**
 * 404 Not Found component with cowboy theme
 */

import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-icon">🤠</div>
      <h1>Well, howdy there!</h1>
      <h2>Looks like you've wandered off the trail, partner.</h2>
      <p>This here page doesn't exist in these parts.</p>
      <p className="error-code">Error 404 - Page Not Found</p>
      <div className="not-found-actions">
        <Link to="/" className="home-button">
          Head Back Home
        </Link>
      </div>
    </div>
  );
}

