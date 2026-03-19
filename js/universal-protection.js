// Universal Protection Script - Add to all pages
(function() {
    'use strict';
    
    // Load protection script on all pages
    function loadProtection() {
        // Check if protection already loaded
        if (window.protectionLoaded) {
            return;
        }
        
        // Create protection script
        var script = document.createElement('script');
        script.src = '/js/protection.js';
        script.async = true;
        script.onload = function() {
            window.protectionLoaded = true;
            console.log('Protection loaded successfully');
        };
        document.head.appendChild(script);
    }
    
    // Load protection immediately
    loadProtection();
    
    // Also load on DOM content loaded (fallback)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadProtection);
    } else {
        loadProtection();
    }
    
    // Additional protection for dynamic content
    setInterval(function() {
        // Re-apply protection to new elements
        var elements = document.getElementsByTagName('*');
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            if (!element.classList.contains('no-select')) {
                element.classList.add('no-select');
                element.style.userSelect = 'none';
                element.style.webkitUserSelect = 'none';
                element.style.mozUserSelect = 'none';
                element.style.msUserSelect = 'none';
            }
        }
    }, 1000);
    
})();
