/**
 * Footer component for the photography website.
 * This component displays copyright information, album selection, and a link to the license page.
 * The copyright year is fetched from the backend to prevent client-side clock manipulation.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import { Link } from 'react-router-dom';
import './Footer.css';
import { debug } from '../utils/logger';


interface FooterProps {
  albums?: string[];
  externalLinks?: { title: string; url: string }[];
  currentAlbum?: string;
}

function Footer({ albums: _albums = [], externalLinks: _externalLinks = [], currentAlbum: _currentAlbum }: FooterProps) {
  const { t } = useTranslation();
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [siteName, setSiteName] = useState<string>('');

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
        debug('Failed to fetch server year, using local time:', error);
      }
    };

    // Fetch branding to get site name
    const fetchBranding = async () => {
      try {
        const response = await fetch(`${API_URL}/api/branding`);
        if (response.ok) {
          const data = await response.json();
          setSiteName(data.siteName || '');
        }
      } catch (error) {
        debug('Failed to fetch branding:', error);
      }
    };

    fetchCurrentYear();
    fetchBranding();
  }, []);

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-bottom">
          <div className="footer-left">
            <span>
              &copy; {currentYear} {siteName || 'Galleria'}.{' '}
              <span className="footer-separator">•</span>{' '}
              <Link to="/license" className="footer-link">
                {t('footer.license')}
              </Link>
            </span>
            <div className="footer-links">
              <span className="footer-powered-by">
                {t('footer.poweredBy')}{' '}
                <a 
                  href="https://github.com/theodorecharles/Galleria" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="footer-galleria-link"
                >
                  {t('footer.galleria')}
                </a>
              </span>
            </div>
          </div>
          <div className="footer-right">
            <Link to="/admin" className="footer-signin-btn">
              {t('footer.signIn')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer; 
