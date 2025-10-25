/**
 * Footer component for the photography website.
 * This component displays copyright information, album selection, and a link to the license page.
 * The copyright year is fetched from the backend to prevent client-side clock manipulation.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import './Footer.css';

interface FooterProps {
  albums?: string[];
  externalLinks?: { title: string; url: string }[];
  currentAlbum?: string;
}

function Footer({ albums: _albums = [], externalLinks: _externalLinks = [], currentAlbum: _currentAlbum }: FooterProps) {
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    // Fetch the current year from the backend to prevent clock manipulation
    const fetchCurrentYear = async () => {
      try {
        const response = await fetch(`${API_URL}/api/current-year`);
        if (response.ok) {
          const data = await response.json();
          setCurrentYear(data.year);
        }
      } catch (error) {
        // Silently fail and use local year as fallback
        console.debug('Failed to fetch server year, using local time:', error);
      }
    };

    fetchCurrentYear();
  }, []);

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* <h3>{currentAlbum === 'homepage' ? 'Select an album' : 'Select another album'}</h3>
        <div className="albums-buttons">
          {albums
            .filter(albumName => albumName !== 'homepage' && (currentAlbum === 'homepage' || albumName !== currentAlbum))
            .map((albumName) => (
              <Link
                key={albumName}
                to={`/album/${albumName}`}
                className="album-button"
                onClick={() => trackAlbumNavigation(albumName, 'footer')}
              >
                {albumName.charAt(0).toUpperCase() + albumName.slice(1)}
              </Link>
            ))}
          
          {externalLinks && externalLinks.length > 0 && externalLinks.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="album-button"
              onClick={() => trackExternalLinkClick(link.title, link.url, 'footer')}
            >
              {link.title}
            </a>
          ))}
        </div> */}
        
        <div className="footer-bottom">
          <span>&copy; {currentYear} Ted Charles.</span>
          <div className="footer-links">
            <Link to="/license" className="footer-link">View License</Link>
            <span className="footer-separator">•</span>
            <a href={`${API_URL}/api/auth/google`} className="footer-link">Login</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer; 