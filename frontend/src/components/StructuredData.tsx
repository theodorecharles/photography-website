/**
 * Structured Data Component
 * Adds JSON-LD schema for better SEO
 */

import { useEffect } from 'react';

export function StructuredData() {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Ted Charles",
      "url": "https://tedcharles.net",
      "image": "https://tedcharles.net/photos/derpatar.png",
      "jobTitle": "Photographer",
      "sameAs": [
        "https://www.youtube.com/@ted_charles",
        "https://github.com/theodoreroddy/photography-website"
      ],
      "knowsAbout": ["Photography", "Web Development", "Digital Art"],
      "hasOccupation": {
        "@type": "Occupation",
        "name": "Photographer"
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    script.id = 'structured-data-person';
    
    // Remove old script if exists
    const oldScript = document.getElementById('structured-data-person');
    if (oldScript) {
      oldScript.remove();
    }
    
    document.head.appendChild(script);
    
    return () => {
      script.remove();
    };
  }, []);
  
  return null;
}

