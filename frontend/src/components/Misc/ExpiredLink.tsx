/**
 * Expired Share Link component with cowboy theme
 */

import { Link } from 'react-router-dom';
import './NotFound.css'; // Reuse the same styles

export default function ExpiredLink() {
  return (
    <div className="not-found-container">
      <div className="not-found-icon">🤠</div>
      <h2>Well, howdy there, pardner!</h2>
      <p>Looks like this here share link done rode off into the sunset.</p>
      <p>It expired faster than a tumbleweed in a dust storm.</p>
      <div className="not-found-actions">
        <Link to="/" className="home-button">
          Head Back Home
        </Link>
      </div>
    </div>
  );
}
