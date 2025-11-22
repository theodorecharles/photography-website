import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbsProps {
  section?: string;
  parentSection?: { title: string; path: string };
  actions?: React.ReactNode;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ section, parentSection, actions }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="breadcrumbs-container">
      <div className="breadcrumbs">
        <button 
          className="breadcrumb-link"
          onClick={() => navigate('/admin/settings')}
        >
          {t('adminPortal.settings')}
        </button>
        {parentSection && (
          <>
            <span className="breadcrumb-separator">›</span>
            <button 
              className="breadcrumb-link"
              onClick={() => navigate(parentSection.path)}
            >
              {parentSection.title}
            </button>
          </>
        )}
        {section && (
          <>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">{section}</span>
          </>
        )}
      </div>
      {actions && (
        <div className="breadcrumbs-actions">
          {actions}
        </div>
      )}
    </div>
  );
};

export default Breadcrumbs;

