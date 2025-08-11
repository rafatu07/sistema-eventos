'use client';

import React from 'react';

export function SkipLink() {
  return (
    <a 
      href="#main-content" 
      className="skip-link"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const mainContent = document.getElementById('main-content');
          if (mainContent) {
            mainContent.focus();
            mainContent.scrollIntoView();
          }
        }
      }}
    >
      Pular para o conteúdo principal
    </a>
  );
}
