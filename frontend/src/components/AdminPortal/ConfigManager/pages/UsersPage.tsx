import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Breadcrumbs from '../components/Breadcrumbs';
import UserManagementSection from '../sections/UserManagementSection';

interface UsersPageProps {
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

const UsersPage: React.FC<UsersPageProps> = ({ setMessage }) => {
  const { t } = useTranslation();
  const [actionButtons, setActionButtons] = useState<React.ReactNode>(null);

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <h2 className="settings-page-title">{t('settings.users.title')}</h2>
        <p className="settings-page-description">
          {t('settings.users.pageDescription')}
        </p>
      </div>
      
      <Breadcrumbs 
        section={t('settings.users.title')}
        actions={actionButtons}
      />

      <UserManagementSection 
        setMessage={setMessage}
        setActionButtons={setActionButtons}
      />
    </div>
  );
};

export default UsersPage;

