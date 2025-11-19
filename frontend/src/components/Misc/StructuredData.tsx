/**
 * Structured Data Component
 * Adds JSON-LD schema for better SEO
 */

import { useEffect } from "react";
import { SITE_URL } from "../../config";

interface StructuredDataProps {
  siteName?: string;
}

export function StructuredData({ siteName = "Galleria" }: StructuredDataProps) {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: siteName,
      url: SITE_URL,
      image: `${SITE_URL}/photos/avatar.png`,
      jobTitle: "Photographer",
      knowsAbout: ["Photography"],
      hasOccupation: {
        "@type": "Occupation",
        name: "Photographer",
      },
    };

    // Remove old script if exists
    const oldScript = document.getElementById("structured-data-person");
    if (oldScript) {
      oldScript.remove();
    }

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(schema);
    script.id = "structured-data-person";

    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById("structured-data-person");
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [siteName]);

  return null;
}
