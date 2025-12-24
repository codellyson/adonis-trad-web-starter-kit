/**
 * FastAppoint Embed Widget
 * Usage: <div id="fastappoint-widget"></div>
 *        <script src="https://fastappoint.com/embed.js" data-slug="your-business-slug"></script>
 */
(function() {
  'use strict';

  // Get the script tag that loaded this script
  const script = document.currentScript || document.querySelector('script[data-slug]');
  if (!script) {
    console.error('FastAppoint: Script tag not found');
    return;
  }

  const slug = script.getAttribute('data-slug');
  if (!slug) {
    console.error('FastAppoint: data-slug attribute is required');
    return;
  }

  // Get configuration from data attributes
  const config = {
    slug: slug,
    width: script.getAttribute('data-width') || '100%',
    height: script.getAttribute('data-height') || '800px',
    container: script.getAttribute('data-container') || 'fastappoint-widget',
    baseUrl: script.getAttribute('data-base-url') || (window.location.protocol === 'https:' ? 'https://fastappoint.com' : 'http://localhost:3333')
  };

  // Find or create container
  let container = document.getElementById(config.container);
  if (!container) {
    container = document.createElement('div');
    container.id = config.container;
    script.parentNode.insertBefore(container, script);
  }

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = `${config.baseUrl}/book/${config.slug}/embed`;
  iframe.style.width = config.width;
  iframe.style.height = config.height;
  iframe.style.border = 'none';
  iframe.style.overflow = 'hidden';
  iframe.setAttribute('scrolling', 'no');
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allowtransparency', 'true');
  
  // Handle responsive height
  iframe.onload = function() {
    // Listen for messages from iframe to adjust height
    window.addEventListener('message', function(event) {
      // Verify origin for security
      if (event.origin !== config.baseUrl.replace(/^https?:\/\//, '').split('/')[0]) {
        return;
      }
      
      if (event.data && event.data.type === 'fastappoint-resize' && event.data.height) {
        iframe.style.height = event.data.height + 'px';
      }
    });
  };

  container.appendChild(iframe);

  // Expose API for programmatic control
  window.FastAppoint = window.FastAppoint || {};
  window.FastAppoint.widgets = window.FastAppoint.widgets || [];
  window.FastAppoint.widgets.push({
    container: container,
    iframe: iframe,
    slug: config.slug,
    destroy: function() {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  });
})();

