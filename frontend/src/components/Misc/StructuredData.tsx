/**
 * Structured Data Component
 * Adds JSON-LD schema for better SEO
 */

import { useEffect } from 'react';
import { SITE_URL } from '../../config';

export function StructuredData() {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Ted Charles",
      "url": SITE_URL,
      "image": `${SITE_URL}/photos/avatar.png`,
      "jobTitle": "Photographer",
      "sameAs": [
        "https://www.youtube.com/@ted_charles",
        "https://github.com/theodoreroddy/"
      ],
      "knowsAbout": ["Photography", "Web Development", "Digital Art"],
      "hasOccupation": {
        "@type": "Occupation",
        "name": "Photographer"
      }
    };

    // Remove old script if exists
    const oldScript = document.getElementById('structured-data-person');
    if (oldScript) {
      oldScript.remove();
    }
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    script.id = 'structured-data-person';
    
    document.head.appendChild(script);
    
    return () => {
      const scriptToRemove = document.getElementById('structured-data-person');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, []);
  
  return null;
}

