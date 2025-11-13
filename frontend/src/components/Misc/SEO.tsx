/**
 * SEO Component - Updates meta tags dynamically
 * Updates document title and meta tags for each page
 */

import { useEffect } from 'react';
import { SITE_URL } from '../../config';
import { updateMetaTag, updateCanonicalLink } from '../../utils/seoHelpers';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SEO({ 
  title = "Ted Charles - Photography Portfolio",
  description = "Professional photography portfolio by Ted Charles. View stunning landscape, portrait, and creative photography collections.",
  image = `${SITE_URL}/photos/avatar.png`,
  url = SITE_URL,
  type = "website"
}: SEOProps) {
  useEffect(() => {
    // Update document title
    document.title = title;
    
    // Update meta tags
    updateMetaTag('name', 'description', description);
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:image', image);
    updateMetaTag('property', 'og:url', url);
    updateMetaTag('property', 'og:type', type);
    updateMetaTag('property', 'twitter:title', title);
    updateMetaTag('property', 'twitter:description', description);
    updateMetaTag('property', 'twitter:image', image);
    
    // Update canonical link
    updateCanonicalLink(url);
  }, [title, description, image, url, type]);
  
  return null;
}

