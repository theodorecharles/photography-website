/**
 * Config Manager V2 - Grid-Based Settings Navigation
 * Routes to individual settings pages with breadcrumbs
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigManagerProps } from './ConfigManager/types';
import SettingsHome from './ConfigManager/components/SettingsHome';
import GeneralPage from './ConfigManager/pages/GeneralPage';
import LinksPage from './ConfigManager/pages/LinksPage';
import UsersPage from './ConfigManager/pages/UsersPage';
import OpenAIPage from './ConfigManager/pages/OpenAIPage';
import ImageQualityPage from './ConfigManager/pages/ImageQualityPage';
import VideoQualityPage from './ConfigManager/pages/VideoQualityPage';
import EmailPage from './ConfigManager/pages/EmailPage';
import PushNotificationsPage from './ConfigManager/pages/PushNotificationsPage';
import NotificationEventsPage from './ConfigManager/pages/NotificationEventsPage';
import GoogleOAuthPage from './ConfigManager/pages/GoogleOAuthPage';
import AnalyticsPage from './ConfigManager/pages/AnalyticsPage';
import LoggingPage from './ConfigManager/pages/LoggingPage';
import './ConfigManager.css';

const ConfigManagerV2: React.FC<ConfigManagerProps> = ({
  setMessage,
  branding,
  setBranding,
  loadBranding,
  externalLinks,
  setExternalLinks,
}) => {
  return (
    <section className="admin-section">
      <Routes>
        {/* Settings Home with Icon Grid */}
        <Route index element={<SettingsHome />} />

        {/* Individual Settings Pages */}
        <Route
          path="general"
          element={
            <GeneralPage
              setMessage={setMessage}
              branding={branding}
              setBranding={setBranding}
              loadBranding={loadBranding}
              externalLinks={externalLinks}
              setExternalLinks={setExternalLinks}
            />
          }
        />
        <Route
          path="links"
          element={
            <LinksPage
              setMessage={setMessage}
              externalLinks={externalLinks}
              setExternalLinks={setExternalLinks}
            />
          }
        />
        <Route path="users" element={<UsersPage setMessage={setMessage} />} />
        <Route path="openai" element={<OpenAIPage setMessage={setMessage} />} />
        <Route
          path="image-quality"
          element={<ImageQualityPage setMessage={setMessage} />}
        />
        <Route
          path="video-quality"
          element={<VideoQualityPage setMessage={setMessage} />}
        />
        <Route path="email" element={<EmailPage setMessage={setMessage} />} />
        <Route
          path="push-notifications"
          element={<PushNotificationsPage setMessage={setMessage} />}
        />
        <Route
          path="push-notifications/events"
          element={<NotificationEventsPage setMessage={setMessage} />}
        />
        <Route
          path="google-oauth"
          element={<GoogleOAuthPage setMessage={setMessage} />}
        />
        <Route path="analytics" element={<AnalyticsPage setMessage={setMessage} />} />
        <Route path="logging" element={<LoggingPage setMessage={setMessage} />} />

        {/* Redirect unknown paths to settings home */}
        <Route path="*" element={<Navigate to="/admin/settings" replace />} />
      </Routes>
    </section>
  );
};

export default ConfigManagerV2;

