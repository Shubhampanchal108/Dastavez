/**
 * DMS - Document Management System - Documentation Engine
 * Handles theme switching, mobile drawer, search modal, code copying,
 * interactive workflow stepper, and scrollspy navigation.
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileNav();
  initScrollSpy();
  initReadingProgress();
  initBackToTop();
  initCodeBlocks();
  initFlowTabs();
  initApiAccordions();
  initSearch();
});

/* ==========================================================================
   1. Theme Management (Dark / Light)
   ========================================================================== */
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  
  // Check preference: localStorage -> OS preference -> default dark
  const savedTheme = localStorage.getItem('dms_doc_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  applyTheme(initialTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('dms_doc_theme', newTheme);
    });
  }

  // Listen to OS theme changes if user hasn't explicitly set one
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('dms_doc_theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeIcon) {
      if (theme === 'dark') {
        // Show sun icon to toggle to light
        themeIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
        themeToggleBtn.setAttribute('title', 'Switch to Light Mode');
      } else {
        // Show moon icon to toggle to dark
        themeIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
        themeToggleBtn.setAttribute('title', 'Switch to Dark Mode');
      }
    }
  }
}

/* ==========================================================================
   2. Mobile Navigation Drawer
   ========================================================================== */
function initMobileNav() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const sidebarLinks = document.querySelectorAll('.sidebar-link');

  if (!menuBtn || !sidebar || !backdrop) return;

  function toggleMenu() {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('open');
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
  }

  function closeMenu() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  menuBtn.addEventListener('click', toggleMenu);
  backdrop.addEventListener('click', closeMenu);

  sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 992) {
        closeMenu();
      }
    });
  });
}

/* ==========================================================================
   3. ScrollSpy for Sidebar and Table of Contents
   ========================================================================== */
function initScrollSpy() {
  const sections = document.querySelectorAll('.doc-section');
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  const tocLinks = document.querySelectorAll('.toc-link');

  function onScroll() {
    let currentSectionId = '';
    const scrollPosition = window.scrollY + 120;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      if (scrollPosition >= top && scrollPosition < top + height) {
        currentSectionId = section.getAttribute('id');
      }
    });

    if (currentSectionId) {
      sidebarLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${currentSectionId}`);
      });
      tocLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${currentSectionId}`);
      });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ==========================================================================
   4. Reading Progress Bar
   ========================================================================== */
function initReadingProgress() {
  const progressBar = document.getElementById('reading-progress');
  if (!progressBar) return;

  window.addEventListener('scroll', () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
    progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }, { passive: true });
}

/* ==========================================================================
   5. Back to Top Button
   ========================================================================== */
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ==========================================================================
   6. Code Block Copy & Language Tabs Switcher
   ========================================================================== */
function initCodeBlocks() {
  // Setup copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('.code-container');
      const activePre = container.querySelector('.code-snippet:not([style*="display: none"])') || container.querySelector('pre');
      const codeText = activePre ? activePre.innerText : '';

      navigator.clipboard.writeText(codeText).then(() => {
        const originalText = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
        
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove('copied');
        }, 2200);
      }).catch(err => {
        console.error('Copy failed: ', err);
      });
    });
  });

  // Setup code language tabs
  document.querySelectorAll('.code-container').forEach(container => {
    const tabs = container.querySelectorAll('.code-tab-btn');
    const snippets = container.querySelectorAll('.code-snippet');
    if (tabs.length === 0 || snippets.length === 0) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const lang = tab.getAttribute('data-lang');
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        snippets.forEach(snippet => {
          if (snippet.getAttribute('data-lang') === lang) {
            snippet.style.display = 'block';
          } else {
            snippet.style.display = 'none';
          }
        });
      });
    });
  });
}

/* ==========================================================================
   7. Interactive Flow Stepper Tabs
   ========================================================================== */
function initFlowTabs() {
  const tabs = document.querySelectorAll('.flow-tab-btn');
  const sequences = document.querySelectorAll('.flow-sequence-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetFlow = tab.getAttribute('data-flow');
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      sequences.forEach(seq => {
        if (seq.getAttribute('data-flow') === targetFlow) {
          seq.style.display = 'flex';
          seq.style.animation = 'fadeIn 0.3s ease';
        } else {
          seq.style.display = 'none';
        }
      });
    });
  });
}

/* ==========================================================================
   8. API Accordion Expand/Collapse
   ========================================================================== */
function initApiAccordions() {
  document.querySelectorAll('.api-card').forEach(card => {
    const header = card.querySelector('.api-header');
    if (header) {
      header.addEventListener('click', () => {
        card.classList.toggle('open');
      });
    }
  });
}

/* ==========================================================================
   9. Search Modal with Live Filtering
   ========================================================================== */
function initSearch() {
  const triggerBtn = document.getElementById('search-trigger');
  const backdrop = document.getElementById('search-modal-backdrop');
  const closeBtn = document.getElementById('search-close');
  const input = document.getElementById('search-input');
  const resultsContainer = document.getElementById('search-results');

  if (!triggerBtn || !backdrop || !input || !resultsContainer) return;

  // Build searchable index from documentation sections
  const searchIndex = [];
  document.querySelectorAll('.doc-section').forEach(section => {
    const sectionId = section.getAttribute('id');
    const sectionTag = section.querySelector('.section-tag')?.innerText || 'General';
    const heading = section.querySelector('.section-heading')?.innerText.trim() || '';
    const desc = section.querySelector('.section-desc')?.innerText.trim() || '';
    
    // Add main section
    if (heading) {
      searchIndex.push({
        id: sectionId,
        title: heading,
        category: sectionTag,
        snippet: desc.substring(0, 140) + '...',
        element: section
      });
    }

    // Add sub-features or endpoints inside this section
    section.querySelectorAll('.feature-card, .api-card, .usecase-card').forEach(item => {
      const cardTitle = item.querySelector('.feature-title, .usecase-title, .api-route')?.innerText.trim();
      const cardDesc = item.querySelector('.feature-desc, .usecase-desc, .api-summary')?.innerText.trim();
      if (cardTitle) {
        searchIndex.push({
          id: sectionId,
          title: cardTitle,
          category: heading,
          snippet: (cardDesc || '').substring(0, 120) + '...',
          element: item
        });
      }
    });
  });

  function openSearch() {
    backdrop.classList.add('open');
    input.value = '';
    renderResults(searchIndex.slice(0, 6)); // Show first few as suggestions
    setTimeout(() => input.focus(), 50);
  }

  function closeSearch() {
    backdrop.classList.remove('open');
  }

  triggerBtn.addEventListener('click', openSearch);
  if (closeBtn) closeBtn.addEventListener('click', closeSearch);

  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeSearch();
  });

  // Keyboard shortcut Ctrl+K or Cmd+K
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (backdrop.classList.contains('open')) {
        closeSearch();
      } else {
        openSearch();
      }
    } else if (e.key === 'Escape' && backdrop.classList.contains('open')) {
      closeSearch();
    }
  });

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      renderResults(searchIndex.slice(0, 6));
      return;
    }

    const matches = searchIndex.filter(item => {
      return item.title.toLowerCase().includes(query) ||
             item.snippet.toLowerCase().includes(query) ||
             item.category.toLowerCase().includes(query);
    });

    renderResults(matches);
  });

  function renderResults(items) {
    if (items.length === 0) {
      resultsContainer.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
          No documentation matches found for your query.
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = items.map(item => `
      <a href="#${item.id}" class="search-result-item" onclick="document.getElementById('search-modal-backdrop').classList.remove('open')">
        <div class="search-result-title">
          <span>${escapeHtml(item.title)}</span>
          <span class="search-result-cat">${escapeHtml(item.category)}</span>
        </div>
        <div class="search-result-snippet">${escapeHtml(item.snippet)}</div>
      </a>
    `).join('');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
  }
}
