/**
 * License Page Component
 * Displays the full license text for the photography portfolio
 */

import { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { getLicenseById, getDefaultLicense } from '../../utils/licenses';
import './License.css';

function License() {
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
          document.title = `License - ${name}`;
        }

        // Fetch current year
        const yearResponse = await fetch(`${API_URL}/api/current-year`);
        if (yearResponse.ok) {
          const yearData = await yearResponse.json();
          setCurrentYear(yearData.year);
        }
      } catch (error) {
        console.error('Failed to fetch license data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Trigger footer to show
    window.dispatchEvent(new Event('show-footer'));

    // Cleanup: reset title when component unmounts
    return () => {
      document.title = siteName || 'Photography Portfolio';
    };
  }, [siteName]);

  const license = getLicenseById(photoLicense) || getDefaultLicense();

  if (loading) {
    return (
      <div className="license-page">
        <div className="license-container">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="license-page">
        <div className="license-container">
          <h1>Photo License</h1>
          
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
            <h3>Summary</h3>
            <p>{license.description}</p>
          </div>

          <div className="license-section">
            <h3>Full License Text</h3>
            <p className="license-full-text">{license.fullText}</p>
          </div>

          <div className="license-section">
            <h3>Copyright</h3>
            <p>
              © {currentYear} {siteName}. All photographs on this website are protected by copyright law.
            </p>
          </div>

          {license.id.startsWith('cc-') && license.id !== 'cc0' && (
            <div className="license-section license-notice">
              <h3>How to Attribute</h3>
              <p>If you use these photographs under this license, please provide attribution as follows:</p>
              <div className="license-attribution-example">
                <code>
                  Photo by {siteName} - Licensed under {license.shortName}
                  {license.url && ` (${license.url})`}
                </code>
              </div>
            </div>
          )}

          {license.id === 'all-rights-reserved' && (
            <div className="license-section license-notice">
              <h3>Permissions</h3>
              <p>
                If you would like to use any photographs from this website, please contact the photographer 
                to request permission.
              </p>
            </div>
          )}
        </div>
      </div>
  );
}

export default License;
