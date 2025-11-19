/**
 * 404 Not Found component with cowboy theme
 */

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './NotFound.css';

export default function NotFound() {
  const { t } = useTranslation();
  
  return (
    <div className="not-found-container">
      <div className="not-found-icon">🤠</div>
      <h2>{t('notFound.wanderOffTrail')}</h2>
      <p>{t('notFound.pageNotExist')}</p>
      <div className="not-found-actions">
        <Link to="/" className="home-button">
          {t('notFound.goHome')}
        </Link>
      </div>
    </div>
  );
}

