import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import UserManagementSection from '../sections/UserManagementSection';

interface UsersPageProps {
  setMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

const UsersPage: React.FC<UsersPageProps> = ({ setMessage }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <h2 className="settings-page-title">{t('settings.users.title')}</h2>
        <p className="settings-page-description">
          {t('settings.users.pageDescription')}
        </p>
      </div>
      
      <Breadcrumbs section={t('settings.users.title')} />

      <UserManagementSection 
        setMessage={setMessage}
        onNavigateToSmtp={() => navigate('/admin/settings/email')}
      />
    </div>
  );
};

export default UsersPage;

