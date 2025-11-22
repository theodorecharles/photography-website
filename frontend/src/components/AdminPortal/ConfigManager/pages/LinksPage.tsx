import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Breadcrumbs from '../components/Breadcrumbs';
import LinksSection from '../sections/LinksSection';
import { ExternalLink } from '../../../Header';

interface LinksPageProps {
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
  externalLinks: ExternalLink[];
  setExternalLinks: (links: ExternalLink[]) => void;
}

const LinksPage: React.FC<LinksPageProps> = ({
  setMessage,
  externalLinks,
  setExternalLinks,
}) => {
  const { t } = useTranslation();
  const [actionButtons, setActionButtons] = useState<React.ReactNode>(null);

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <h2 className="settings-page-title">{t('settings.links.title')}</h2>
        <p className="settings-page-description">
          {t('settings.links.pageDescription')}
        </p>
      </div>
      
      <Breadcrumbs 
        section={t('settings.links.title')}
        actions={actionButtons}
      />

      <LinksSection
        externalLinks={externalLinks}
        setExternalLinks={setExternalLinks}
        setMessage={setMessage}
        setActionButtons={setActionButtons}
      />
    </div>
  );
};

export default LinksPage;

