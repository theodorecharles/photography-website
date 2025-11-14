/**
 * SEO utility functions for manipulating meta tags and canonical links
 */

/**
 * Updates or creates a meta tag with the specified attribute, key, and content
 */
export function updateMetaTag(attribute: string, key: string, content: string): void {
  let element = document.querySelector(`meta[${attribute}="${key}"]`);
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

/**
 * Updates or creates a canonical link tag with the specified URL
 */
export function updateCanonicalLink(url: string): void {
  let link = document.querySelector('link[rel="canonical"]');
  
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  
  link.setAttribute('href', url);
}

