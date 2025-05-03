/**
 * Footer component for the photography website.
 * This component displays copyright information, album selection, and a link to the license page.
 */

import { Link } from 'react-router-dom';

interface FooterProps {
  albums: string[];
  currentAlbum?: string;
}

function Footer({ albums, currentAlbum }: FooterProps) {
  return (
    <footer className="footer">
      <div className="footer-content" style={{ maxWidth: '360px' }}>
        <div className="footer-albums">
          <h3>{currentAlbum === 'homepage' ? 'Select an album' : 'Select another album'}</h3>
          <div className="albums-buttons" style={{ marginTop: '2rem' }}>
            {albums
              .filter(albumName => albumName !== 'homepage' && (currentAlbum === 'homepage' || albumName !== currentAlbum))
              .map((albumName) => (
                <Link
                  key={albumName}
                  to={`/album/${albumName}`}
                  className="album-button"
                >
                  {albumName.charAt(0).toUpperCase() + albumName.slice(1)}
                </Link>
              ))}
          </div>
        </div>
        <div className="footer-bottom" style={{ marginTop: '2rem' }}>
          <span>&copy; {new Date().getFullYear()} Ted Charles.</span>
          <div className="footer-links">
            <Link to="/license" className="footer-link">View License</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer; 