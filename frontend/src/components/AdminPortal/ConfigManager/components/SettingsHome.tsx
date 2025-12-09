import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
import { API_URL } from '../../../../config';
import './SettingsHome.css';

interface SettingsCardProps {
  icon: React.ReactNode;
  title: string;
  path: string;
  onClick: () => void;
  needsConfig?: boolean;
}

const SettingsCard: React.FC<SettingsCardProps> = ({
  icon,
  title,
  onClick,
  needsConfig,
}) => {
  return (
    <button className="settings-card" onClick={onClick}>
      <div className="settings-card-icon-wrapper">
        <div className={`settings-card-icon ${needsConfig ? 'needs-config' : ''}`}>{icon}</div>
        {needsConfig && (
          <span className="settings-card-badge" title="Not configured">
            !
          </span>
        )}
      </div>
      <h3 className="settings-card-title">{title}</h3>
    </button>
  );
};

const SettingsHome: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [configStatus, setConfigStatus] = useState({
    openai: true,
    smtp: true,
    oauth: true,
    pushNotifications: true,
    analytics: true,
  });
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    // Fetch config to check what's configured
    fetch(`${API_URL}/api/config`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    })
      .then(async (res) => {
        console.log('Config fetch response status:', res.status);
        if (!res.ok) {
          const text = await res.text();
          console.error('Config fetch failed, response body:', text.substring(0, 500));
          throw new Error(`HTTP ${res.status}`);
        }
        const text = await res.text();
        console.log('Config response (first 200 chars):', text.substring(0, 200));
        return JSON.parse(text);
      })
      .then((config) => {
        console.log('Raw config:', config);
        const status = {
          openai: !!(config.openai?.apiKey && config.openai.apiKey.trim()),
          smtp: !!(config.email?.enabled),
          oauth: !!(config.environment?.auth?.google?.enabled),
          pushNotifications: !!(config.pushNotifications?.enabled),
          analytics: !!((config.analytics?.scriptPath && config.analytics.scriptPath.trim()) || config.analytics?.openobserve?.enabled),
        };
        console.log('Config status (true = configured, false = needs badge):', status);
        setConfigStatus(status);
        setConfigLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to fetch config status:', err);
        setConfigLoaded(true);
      });
  }, []);

  const settingsSections = [
    {
      icon: <GeneralIcon width={48} height={48} />,
      title: t('settings.general.title'),
      path: '/admin/settings/general',
    },
    {
      icon: <LinksIcon width={48} height={48} />,
      title: t('settings.links.title'),
      path: '/admin/settings/links',
    },
    {
      icon: <UsersIcon width={48} height={48} />,
      title: t('settings.users.title'),
      path: '/admin/settings/users',
    },
    {
      icon: <AIIcon width={48} height={48} />,
      title: t('settings.openai.title'),
      path: '/admin/settings/openai',
      needsConfig: configLoaded && !configStatus.openai,
    },
    {
      icon: <ImageQualityIcon width={48} height={48} />,
      title: t('settings.imageQuality.title'),
      path: '/admin/settings/image-quality',
    },
    {
      icon: <VideoQualityIcon width={48} height={48} />,
      title: t('settings.videoQuality.title'),
      path: '/admin/settings/video-quality',
    },
    {
      icon: <EmailIcon width={48} height={48} />,
      title: t('settings.email.title'),
      path: '/admin/settings/email',
      needsConfig: configLoaded && !configStatus.smtp,
    },
    {
      icon: <BellIcon width={48} height={48} />,
      title: t('settings.pushNotifications.title'),
      path: '/admin/settings/push-notifications',
      needsConfig: configLoaded && !configStatus.pushNotifications,
    },
    {
      icon: <GoogleGrayIcon width={48} height={48} />,
      title: t('settings.googleOAuth.title'),
      path: '/admin/settings/google-oauth',
      needsConfig: configLoaded && !configStatus.oauth,
    },
    {
      icon: <AnalyticsIcon width={48} height={48} />,
      title: t('settings.analytics.title'),
      path: '/admin/settings/analytics',
      needsConfig: configLoaded && !configStatus.analytics,
    },
    {
      icon: <LoggingIcon width={48} height={48} />,
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
            needsConfig={section.needsConfig}
            onClick={() => navigate(section.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default SettingsHome;

