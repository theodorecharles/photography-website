import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbsProps {
  section?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ section }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="breadcrumbs">
      <button 
        className="breadcrumb-link"
        onClick={() => navigate('/admin/settings')}
      >
        {t('adminPortal.settings')}
      </button>
      {section && (
        <>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">{section}</span>
        </>
      )}
    </div>
  );
};

export default Breadcrumbs;

