/**
 * Expired Share Link component with cowboy theme
 */

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './NotFound.css'; // Reuse the same styles

export default function ExpiredLink() {
  const { t } = useTranslation();
  return (
    <div className="not-found-container">
      <div className="not-found-icon">🤠</div>
      <h2>{t('expiredLink.title')}</h2>
      <p>{t('expiredLink.message1')}</p>
      <p>{t('expiredLink.message2')}</p>
      <div className="not-found-actions">
        <Link to="/" className="home-button">
          {t('expiredLink.backHome')}
        </Link>
      </div>
    </div>
  );
}
