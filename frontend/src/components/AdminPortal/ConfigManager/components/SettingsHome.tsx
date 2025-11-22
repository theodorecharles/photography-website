import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  GeneralIcon,
  LinksIcon,
  UsersIcon,
  AIIcon,
  ImageQualityIcon,
  VideoQualityIcon,
  EmailIcon,
  BellIcon,
  GoogleGrayIcon,
  AnalyticsIcon,
  LoggingIcon,
} from '../../../icons';
import './SettingsHome.css';

interface SettingsCardProps {
  icon: React.ReactNode;
  title: string;
  path: string;
  onClick: () => void;
}

const SettingsCard: React.FC<SettingsCardProps> = ({
  icon,
  title,
  onClick,
}) => {
  return (
    <button className="settings-card" onClick={onClick}>
      <div className="settings-card-icon">{icon}</div>
      <h3 className="settings-card-title">{title}</h3>
    </button>
  );
};

const SettingsHome: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const settingsSections = [
    {
      icon: <GeneralIcon width={56} height={56} />,
      title: t('settings.general.title'),
      path: '/admin/settings/general',
    },
    {
      icon: <LinksIcon width={56} height={56} />,
      title: t('settings.links.title'),
      path: '/admin/settings/links',
    },
    {
      icon: <UsersIcon width={56} height={56} />,
      title: t('settings.users.title'),
      path: '/admin/settings/users',
    },
    {
      icon: <AIIcon width={56} height={56} />,
      title: t('settings.openai.title'),
      path: '/admin/settings/openai',
    },
    {
      icon: <ImageQualityIcon width={56} height={56} />,
      title: t('settings.imageQuality.title'),
      path: '/admin/settings/image-quality',
    },
    {
      icon: <VideoQualityIcon width={56} height={56} />,
      title: t('settings.videoQuality.title'),
      path: '/admin/settings/video-quality',
    },
    {
      icon: <EmailIcon width={56} height={56} />,
      title: t('settings.email.title'),
      path: '/admin/settings/email',
    },
    {
      icon: <BellIcon width={56} height={56} />,
      title: t('settings.pushNotifications.title'),
      path: '/admin/settings/push-notifications',
    },
    {
      icon: <GoogleGrayIcon width={56} height={56} />,
      title: t('settings.googleOAuth.title'),
      path: '/admin/settings/google-oauth',
    },
    {
      icon: <AnalyticsIcon width={56} height={56} />,
      title: t('settings.analytics.title'),
      path: '/admin/settings/analytics',
    },
    {
      icon: <LoggingIcon width={56} height={56} />,
      title: t('settings.logging.title'),
      path: '/admin/settings/logging',
    },
  ];

  return (
    <div className="settings-home">
      <div className="settings-home-header">
        <h2>{t('adminPortal.settings')}</h2>
        <p className="settings-home-description">
          {t('settings.home.description')}
        </p>
      </div>

      <div className="settings-grid">
        {settingsSections.map((section) => (
          <SettingsCard
            key={section.path}
            icon={section.icon}
            title={section.title}
            path={section.path}
            onClick={() => navigate(section.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default SettingsHome;

