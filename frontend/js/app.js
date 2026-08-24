import { cart } from './cart.js';

/**
 * Shared App Initializer
 */
document.addEventListener('DOMContentLoaded', () => {
  cart.updateBadge();

  // Set active class on matching navbar link
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-links a');

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '/' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
});
