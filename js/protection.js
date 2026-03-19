// Complete Website Protection Script
(function() {
    'use strict';
    
    // Disable right click
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Disable text selection
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Disable copy
    document.addEventListener('copy', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Disable cut
    document.addEventListener('cut', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Disable paste
    document.addEventListener('paste', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Disable drag
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Disable drop
    document.addEventListener('drop', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    document.addEventListener('keydown', function(e) {
        // F12
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+Shift+I
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+Shift+J
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+U
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+S
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+A
        if (e.ctrlKey && e.keyCode === 65) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+P
        if (e.ctrlKey && e.keyCode === 80) {
            e.preventDefault();
            return false;
        }
    });
    
    // Disable developer tools
    setInterval(function() {
        if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
            window.close();
            window.location.replace("about:blank");
        }
    }, 500);
    
    // Disable console access
    console.log = function() {};
    console.warn = function() {};
    console.error = function() {};
    console.info = function() {};
    console.debug = function() {};
    
    // Clear console
    console.clear();
    
    // Disable view source
    document.onkeydown = function(e) {
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
    };
    
    // Disable print
    window.addEventListener('beforeprint', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Disable save page
    window.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            return false;
        }
    });
    
    // Add no-select class to all elements
    function addNoSelect() {
        var elements = document.getElementsByTagName('*');
        for (var i = 0; i < elements.length; i++) {
            elements[i].classList.add('no-select');
            elements[i].style.userSelect = 'none';
            elements[i].style.webkitUserSelect = 'none';
            elements[i].style.mozUserSelect = 'none';
            elements[i].style.msUserSelect = 'none';
        }
    }
    
    // Run on page load
    addNoSelect();
    
    // Run on DOM changes
    var observer = new MutationObserver(function(mutations) {
        addNoSelect();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Disable image drag
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            return false;
        }
    });
    
    // Disable right click on images
    document.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            return false;
        }
    });
    
    // Add watermark effect
    function addWatermark() {
        var watermark = document.createElement('div');
        watermark.innerHTML = '© Geo Tags Editor - Protected Content';
        watermark.style.position = 'fixed';
        watermark.style.bottom = '10px';
        watermark.style.right = '10px';
        watermark.style.color = 'rgba(0,0,0,0.1)';
        watermark.style.fontSize = '12px';
        watermark.style.pointerEvents = 'none';
        watermark.style.zIndex = '999999';
        document.body.appendChild(watermark);
    }
    
    addWatermark();
    
    // Disable text selection for all elements
    document.onselectstart = function() {
        return false;
    };
    
    // Disable drag for all elements
    document.ondragstart = function() {
        return false;
    };
    
    // Add protection message
    window.addEventListener('load', function() {
        var protectionMsg = document.createElement('div');
        protectionMsg.innerHTML = 'This website is protected. All content is copyrighted.';
        protectionMsg.style.position = 'fixed';
        protectionMsg.style.top = '0';
        protectionMsg.style.left = '0';
        protectionMsg.style.width = '100%';
        protectionMsg.style.background = 'rgba(255,0,0,0.8)';
        protectionMsg.style.color = 'white';
        protectionMsg.style.textAlign = 'center';
        protectionMsg.style.padding = '10px';
        protectionMsg.style.fontSize = '14px';
        protectionMsg.style.zIndex = '9999999';
        protectionMsg.style.display = 'none';
        document.body.appendChild(protectionMsg);
        
        // Show message on suspicious activity
        var suspiciousActivity = false;
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey || e.metaKey) {
                suspiciousActivity = true;
                protectionMsg.style.display = 'block';
                setTimeout(function() {
                    protectionMsg.style.display = 'none';
                }, 3000);
            }
        });
    });
    
})();
