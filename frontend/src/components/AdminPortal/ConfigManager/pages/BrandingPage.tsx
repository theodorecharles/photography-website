import { useTranslation } from 'react-i18next';
import Breadcrumbs from '../components/Breadcrumbs';
import GeneralSection from '../sections/GeneralSection';
import { ConfigManagerProps } from '../types';

const GeneralPage: React.FC<ConfigManagerProps> = ({
  setMessage,
  branding,
  setBranding,
  loadBranding,
}) => {
  const { t } = useTranslation();

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <h2 className="settings-page-title">{t('settings.general.title')}</h2>
        <p className="settings-page-description">
          {t('settings.general.pageDescription')}
        </p>
      </div>
      
      <Breadcrumbs section={t('settings.general.title')} />

      <GeneralSection
        branding={branding}
        setBranding={setBranding}
        loadBranding={loadBranding}
        setMessage={setMessage}
      />
    </div>
  );
};

export default GeneralPage;

