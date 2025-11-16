/**
 * Footer component for the photography website.
 * This component displays copyright information, album selection, and a link to the license page.
 * The copyright year is fetched from the backend to prevent client-side clock manipulation.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const API_URL = import.meta.env.VITE_API_URL || '';

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
        if (response.status === 429) {
          if ((window as any).handleRateLimit) {
            (window as any).handleRateLimit();
          }
          return;
        }
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
        <div className="footer-bottom">
          <span>
            &copy; {currentYear} Ted Charles.{' '}
            <span className="footer-separator">•</span>{' '}
            <Link to="/license" className="footer-link">View License</Link>
          </span>
          <div className="footer-links">
            <span className="footer-powered-by">
              Powered by{' '}
              <a 
                href="https://github.com/theodorecharles/photography-website" 
                target="_blank" 
                rel="noopener noreferrer"
                className="footer-galleria-link"
              >
                Galleria
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer; 