/**
 * License Page Component
 * Displays the full license text for the photography portfolio
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../config';
import { getLicenseById, getDefaultLicense } from '../../utils/licenses';
import './License.css';
import { error as logError } from '../../utils/logger';

function License() {
  const { t } = useTranslation();
  const [siteName, setSiteName] = useState<string>('');
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [photoLicense, setPhotoLicense] = useState<string>('cc-by');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0);

    const fetchData = async () => {
      try {
        // Fetch branding to get site name and license
        const brandingResponse = await fetch(`${API_URL}/api/branding`);
        if (brandingResponse.ok) {
          const brandingData = await brandingResponse.json();
          const name = brandingData.siteName || '';
          setSiteName(name);
          setPhotoLicense(brandingData.photoLicense || 'cc-by');
          
          // Update document title
          document.title = `${t('license.title')} - ${name}`;
        }

        // Fetch current year
        const yearResponse = await fetch(`${API_URL}/api/current-year`);
        if (yearResponse.ok) {
          const yearData = await yearResponse.json();
          setCurrentYear(yearData.year);
        }
      } catch (err) {
        logError('Failed to fetch license data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Trigger footer to show
    window.dispatchEvent(new Event('show-footer'));

    // Cleanup: reset title when component unmounts
    return () => {
      document.title = siteName || t('license.photographyPortfolio');
    };
  }, [siteName, t]);

  const license = getLicenseById(photoLicense) || getDefaultLicense();

  // Get translated license description
  const getLicenseDescription = (licenseId: string): string => {
    const descMap: Record<string, string> = {
      'all-rights-reserved': t('license.allRightsReservedDesc'),
      'cc-by': t('license.ccByDesc'),
      'cc-by-sa': t('license.ccBySaDesc'),
      'cc-by-nd': t('license.ccByNdDesc'),
      'cc-by-nc': t('license.ccByNcDesc'),
      'cc-by-nc-sa': t('license.ccByNcSaDesc'),
      'cc-by-nc-nd': t('license.ccByNcNdDesc'),
      'cc0': t('license.cc0Desc'),
      'public-domain': t('license.publicDomainDesc'),
    };
    return descMap[licenseId] || license.description;
  };

  // Get translated license full text
  const getLicenseFullText = (licenseId: string): string => {
    const fullTextMap: Record<string, string> = {
      'all-rights-reserved': t('license.allRightsReservedFullText'),
      'cc-by': t('license.ccByFullText'),
      'cc-by-sa': t('license.ccBySaFullText'),
      'cc-by-nd': t('license.ccByNdFullText'),
      'cc-by-nc': t('license.ccByNcFullText'),
      'cc-by-nc-sa': t('license.ccByNcSaFullText'),
      'cc-by-nc-nd': t('license.ccByNcNdFullText'),
      'cc0': t('license.cc0FullText'),
      'public-domain': t('license.publicDomainFullText'),
    };
    return fullTextMap[licenseId] || license.fullText;
  };

  if (loading) {
    return (
      <div className="license-page">
        <div className="license-container">
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="license-page">
        <div className="license-container">
          <h1>{t('license.title')}</h1>
          
          <div className="license-section">
            <h2>{license.name}</h2>
            {license.url && (
              <p className="license-url">
                <a href={license.url} target="_blank" rel="noopener noreferrer">
                  {license.url}
                </a>
              </p>
            )}
          </div>

          <div className="license-section">
            <h3>{t('license.summary')}</h3>
            <p>{getLicenseDescription(license.id)}</p>
          </div>

          <div className="license-section">
            <h3>{t('license.fullLicenseText')}</h3>
            <p className="license-full-text">{getLicenseFullText(license.id)}</p>
          </div>

          <div className="license-section">
            <h3>{t('license.copyright')}</h3>
            <p>
              {t('license.copyrightText', { year: currentYear, siteName })}
            </p>
          </div>

          {license.id.startsWith('cc-') && license.id !== 'cc0' && (
            <div className="license-section license-notice">
              <h3>{t('license.howToAttribute')}</h3>
              <p>{t('license.attributionText')}</p>
              <div className="license-attribution-example">
                <code>
                  {t('license.attributionExample', { 
                    siteName, 
                    licenseName: license.shortName,
                    url: license.url ? ` (${license.url})` : ''
                  })}
                </code>
              </div>
            </div>
          )}

          {license.id === 'all-rights-reserved' && (
            <div className="license-section license-notice">
              <h3>{t('license.permissions')}</h3>
              <p>
                {t('license.permissionsText')}
              </p>
            </div>
          )}
        </div>
      </div>
  );
}

export default License;
