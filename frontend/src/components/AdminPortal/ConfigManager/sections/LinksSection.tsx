/**
 * Links Section Component
 * Manages external links (social media, etc.)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../../../../config';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink } from '../../types';
import { trackExternalLinksUpdate } from '../../../../utils/analytics';
import { ChevronUpIcon, ChevronDownIcon } from '../../../icons';
import '../../LinksManager.css';
import { info } from '../../../../utils/logger';


interface LinksSectionProps {
  externalLinks: ExternalLink[];
  setExternalLinks: (links: ExternalLink[]) => void;
  setMessage: (message: { type: "success" | "error"; text: string }) => void;
}

const LinksSection: React.FC<LinksSectionProps> = ({
  externalLinks,
  setExternalLinks,
  setMessage,
}) => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [originalExternalLinks, setOriginalExternalLinks] = useState<ExternalLink[]>([]);
  const [savingLinks, setSavingLinks] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const linksSectionRef = useRef<HTMLDivElement>(null);

  // Initialize originalExternalLinks only once when data is first loaded
  useEffect(() => {
    if (!isInitialized && externalLinks.length >= 0) {
      info('[LinksSection] Initializing originalExternalLinks:', externalLinks);
      setOriginalExternalLinks(structuredClone(externalLinks));
      setIsInitialized(true);
    }
  }, [externalLinks, isInitialized]);

  // Handle section parameter from URL (e.g., ?section=links)
  useEffect(() => {
    const section = searchParams.get('section');
    if (!section) return;
    
    // Wait for component to mount and render
    setTimeout(() => {
      if (section === 'links') {
        if (linksSectionRef.current) {
          const yOffset = -100; // Offset to account for header
          const element = linksSectionRef.current;
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }
    }, 100);
  }, [searchParams]);

  const handleAddLink = () => {
    setExternalLinks([...externalLinks, { title: "", url: "" }]);
  };

  const handleDeleteLink = (index: number) => {
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
  };

  const handleLinkChange = (
    index: number,
    field: "title" | "url",
    value: string
  ) => {
    const newLinks = [...externalLinks];
    newLinks[index][field] = value;
    setExternalLinks(newLinks);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newLinks = [...externalLinks];
    const temp = newLinks[index];
    newLinks[index] = newLinks[index - 1];
    newLinks[index - 1] = temp;
    setExternalLinks(newLinks);
  };

  const handleMoveDown = (index: number) => {
    if (index === externalLinks.length - 1) return;
    const newLinks = [...externalLinks];
    const temp = newLinks[index];
    newLinks[index] = newLinks[index + 1];
    newLinks[index + 1] = temp;
    setExternalLinks(newLinks);
  };

  const handleCancelLinks = () => {
    setExternalLinks(structuredClone(originalExternalLinks));
    setMessage({ type: "success", text: t('links.changesCancelled') });
  };

  const handleSaveLinks = async () => {
    setSavingLinks(true);

    try {
      const res = await fetch(`${API_URL}/api/external-links`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ links: externalLinks }),
      });

      if (res.ok) {
        // Update original links after successful save
        setOriginalExternalLinks(structuredClone(externalLinks));
        setMessage({
          type: "success",
          text: t('links.savedSuccessfully'),
        });
        trackExternalLinksUpdate(externalLinks.length);
        window.dispatchEvent(new Event("external-links-updated"));
      } else {
        const errorData = await res.json();
        setMessage({
          type: "error",
          text: errorData.error || t('links.failedToSave'),
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: t('common.networkError') });
    } finally {
      setSavingLinks(false);
    }
  };

  const hasUnsavedLinksChanges = (): boolean => {
    return (
      JSON.stringify(externalLinks) !== JSON.stringify(originalExternalLinks)
    );
  };

  return (
    <div ref={linksSectionRef}>
      <div className="links-list">
          {externalLinks.map((link, index) => (
            <div key={index} className="link-wrapper">
              <div className="link-item">
                <div className="link-fields">
                  <input
                    type="text"
                    placeholder={t('links.titlePlaceholder')}
                    value={link.title}
                    onChange={(e) =>
                      handleLinkChange(index, "title", e.target.value)
                    }
                    className="link-input"
                  />
                  <input
                    type="text"
                    placeholder={t('links.urlPlaceholder')}
                    value={link.url}
                    onChange={(e) =>
                      handleLinkChange(index, "url", e.target.value)
                    }
                    className="link-input"
                  />
                </div>
                <div className="link-controls">
                  <div className="reorder-buttons">
                    <button
                      onClick={() => handleMoveUp(index)}
                      className="btn-reorder"
                      title={t('links.moveUp')}
                      disabled={index === 0}
                    >
                      <ChevronUpIcon width="20" height="20" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      className="btn-reorder"
                      title={t('links.moveDown')}
                      disabled={index === externalLinks.length - 1}
                    >
                      <ChevronDownIcon width="20" height="20" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleDeleteLink(index)}
                    className="btn-delete-link"
                    title={t('links.deleteLink')}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}

        <div className="section-actions">
          <button onClick={handleAddLink} className="btn-secondary">
            + {t('links.addLink')}
          </button>
          {hasUnsavedLinksChanges() && (
            <>
              <button
                onClick={handleCancelLinks}
                className="btn-secondary"
                disabled={savingLinks}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveLinks}
                className="btn-primary"
                disabled={savingLinks}
              >
                {savingLinks ? t('common.saving') : t('links.saveChanges')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinksSection;
