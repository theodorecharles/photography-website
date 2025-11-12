/**
 * Links Section Component
 * Manages external links (social media, etc.)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink } from '../../types';
import { trackExternalLinksUpdate } from '../../../../utils/analytics';
import SectionHeader from '../components/SectionHeader';
import '../../LinksManager.css';

const API_URL = import.meta.env.VITE_API_URL || '';

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
  const [searchParams] = useSearchParams();
  const [showLinks, setShowLinks] = useState(false);
  const [originalExternalLinks, setOriginalExternalLinks] = useState<ExternalLink[]>([]);
  const [savingLinks, setSavingLinks] = useState(false);
  const linksSectionRef = useRef<HTMLDivElement>(null);

  // Track original external links when they change from parent
  useEffect(() => {
    setOriginalExternalLinks(structuredClone(externalLinks));
  }, [externalLinks.length]);

  // Handle section parameter from URL (e.g., ?section=links)
  useEffect(() => {
    const section = searchParams.get('section');
    if (!section) return;
    
    // Wait for component to mount and render
    setTimeout(() => {
      if (section === 'links') {
        setShowLinks(true);
        setTimeout(() => {
          if (linksSectionRef.current) {
            const yOffset = -100; // Offset to account for header
            const element = linksSectionRef.current;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: "smooth" });
          }
        }, 300); // Wait for section to expand
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
    setMessage({ type: "success", text: "Changes cancelled" });
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
          text: "External links saved successfully!",
        });
        trackExternalLinksUpdate(externalLinks.length);
        window.dispatchEvent(new Event("external-links-updated"));
      } else {
        const errorData = await res.json();
        setMessage({
          type: "error",
          text: errorData.error || "Failed to save external links",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error occurred" });
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
    <div className="config-group full-width" ref={linksSectionRef}>
      <SectionHeader
        title="Links"
        description="Manage external links and contact information"
        isExpanded={showLinks}
        onToggle={() => setShowLinks(!showLinks)}
      />

      <div
        className={`collapsible-content ${showLinks ? "expanded" : "collapsed"}`}
        style={{
          maxHeight: showLinks ? "10000px" : "0",
        }}
      >
        <div className="links-list">
          {externalLinks.map((link, index) => (
            <div key={index} className="link-wrapper">
              <div className="link-item">
                <div className="link-fields">
                  <input
                    type="text"
                    placeholder="Title"
                    value={link.title}
                    onChange={(e) =>
                      handleLinkChange(index, "title", e.target.value)
                    }
                    className="link-input"
                  />
                  <input
                    type="text"
                    placeholder="URL"
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
                      title="Move up"
                      disabled={index === 0}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      className="btn-reorder"
                      title="Move down"
                      disabled={index === externalLinks.length - 1}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={() => handleDeleteLink(index)}
                    className="btn-delete-link"
                    title="Delete link"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="section-actions">
          <button onClick={handleAddLink} className="btn-secondary">
            + Add Link
          </button>
          {hasUnsavedLinksChanges() && (
            <>
              <button
                onClick={handleCancelLinks}
                className="btn-secondary"
                disabled={savingLinks}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLinks}
                className="btn-primary"
                disabled={savingLinks}
              >
                {savingLinks ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinksSection;
