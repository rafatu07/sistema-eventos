'use client';

import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export function SEOHead({ 
  title, 
  description, 
  keywords = [], 
  canonicalUrl,
  ogImage = '/og-image.jpg',
  noIndex = false 
}: SEOHeadProps) {
  useEffect(() => {
    // Update document title
    document.title = title;
    
    // Update meta description
    updateMeta('description', description);
    
    // Update keywords if provided
    if (keywords.length > 0) {
      updateMeta('keywords', keywords.join(', '));
    }
    
    // Update Open Graph tags
    updateMeta('property', 'og:title', title, 'property');
    updateMeta('property', 'og:description', description, 'property');
    updateMeta('property', 'og:image', ogImage, 'property');
    
    // Update Twitter tags
    updateMeta('name', 'twitter:title', title);
    updateMeta('name', 'twitter:description', description);
    updateMeta('name', 'twitter:image', ogImage);
    
    // Update canonical URL if provided
    if (canonicalUrl) {
      updateLink('canonical', canonicalUrl);
    }
    
    // Update robots
    if (noIndex) {
      updateMeta('robots', 'noindex, nofollow');
    } else {
      updateMeta('robots', 'index, follow');
    }
  }, [title, description, keywords, canonicalUrl, ogImage, noIndex]);

  return null;
}

function updateMeta(attribute: string, content: string, name?: string, attributeType: 'name' | 'property' = 'name') {
  const selector = name 
    ? `meta[${attributeType}="${name}"]` 
    : `meta[${attribute}]`;
  
  let meta = document.querySelector(selector) as HTMLMetaElement;
  
  if (!meta) {
    meta = document.createElement('meta');
    if (name) {
      meta.setAttribute(attributeType, name);
    } else {
      meta.setAttribute(attribute, content);
      return;
    }
    document.head.appendChild(meta);
  }
  
  meta.content = content;
}

function updateLink(rel: string, href: string) {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  
  link.href = href;
}
