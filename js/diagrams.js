/* ========================================
   CHILD PSYCHOLOGY COURSE — DIAGRAMS.JS
   Interactive SVG diagram controllers for
   brain diagrams, hotspots, and scales.
   ======================================== */

(function () {
  'use strict';

  /* ------------------------------------------
     BRAIN DIAGRAM CONTROLLER
     Handles hover/click interactions on the
     #brain-diagram SVG. Shows tooltips near
     hovered .brain-region elements.

     Expected HTML structure:
       <div class="diagram-container">
         <svg id="brain-diagram">
           <g class="brain-region"
              data-region="frontal-lobe"
              data-label="Frontal Lobe"
              data-info="Controls planning, reasoning...">
             <path ... />
           </g>
         </svg>
         <div class="diagram-tooltip">
           <h5 class="diagram-tooltip-title"></h5>
           <p class="diagram-tooltip-text"></p>
         </div>
       </div>
  ------------------------------------------ */
  function initBrainDiagram() {
    var diagram = document.getElementById('brain-diagram');
    if (!diagram) return;

    var container = diagram.closest('.diagram-container');
    if (!container) return;

    // Find or create the tooltip element
    var tooltip = container.querySelector('.diagram-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'diagram-tooltip';
      tooltip.innerHTML = '<h5 class="diagram-tooltip-title"></h5><p class="diagram-tooltip-text"></p>';
      container.appendChild(tooltip);
    }

    var tooltipTitle = tooltip.querySelector('.diagram-tooltip-title') || tooltip.querySelector('h5');
    var tooltipText = tooltip.querySelector('.diagram-tooltip-text') || tooltip.querySelector('p');

    var regions = diagram.querySelectorAll('.brain-region');
    if (regions.length === 0) return;

    // Track currently active region
    var activeRegion = null;

    /* --- Position tooltip near the hovered element --- */
    function positionTooltip(regionEl) {
      var containerRect = container.getBoundingClientRect();
      var regionRect = regionEl.getBoundingClientRect();

      // Center tooltip above the region
      var tooltipWidth = tooltip.offsetWidth || 240;
      var tooltipHeight = tooltip.offsetHeight || 80;

      var left = (regionRect.left - containerRect.left) + (regionRect.width / 2) - (tooltipWidth / 2);
      var top = (regionRect.top - containerRect.top) - tooltipHeight - 12;

      // Clamp to container bounds
      left = Math.max(8, Math.min(left, containerRect.width - tooltipWidth - 8));
      if (top < 8) {
        // Place below instead
        top = (regionRect.bottom - containerRect.top) + 12;
      }

      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    }

    /* --- Show tooltip --- */
    function showTooltip(regionEl) {
      var label = regionEl.getAttribute('data-label') || regionEl.getAttribute('data-region') || 'Region';
      var info = regionEl.getAttribute('data-info') || '';

      if (tooltipTitle) tooltipTitle.textContent = label;
      if (tooltipText) tooltipText.textContent = info;

      positionTooltip(regionEl);
      tooltip.classList.add('is-visible');
    }

    /* --- Hide tooltip --- */
    function hideTooltip() {
      tooltip.classList.remove('is-visible');
    }

    /* --- Highlight a region --- */
    function highlightRegion(regionEl) {
      // Remove highlight from previous
      if (activeRegion && activeRegion !== regionEl) {
        activeRegion.classList.remove('is-active');
      }
      regionEl.classList.add('is-active');
      activeRegion = regionEl;
    }

    /* --- Clear highlight --- */
    function clearHighlight(regionEl) {
      regionEl.classList.remove('is-active');
      if (activeRegion === regionEl) {
        activeRegion = null;
      }
    }

    /* --- Event listeners --- */
    regions.forEach(function (region) {
      // Mouse hover
      region.addEventListener('mouseenter', function () {
        highlightRegion(region);
        showTooltip(region);
      });

      region.addEventListener('mouseleave', function () {
        clearHighlight(region);
        hideTooltip();
      });

      // Click: toggle info (useful on touch devices)
      region.addEventListener('click', function (e) {
        e.stopPropagation();
        if (activeRegion === region && tooltip.classList.contains('is-visible')) {
          clearHighlight(region);
          hideTooltip();
        } else {
          highlightRegion(region);
          showTooltip(region);
        }
      });

      // Keyboard accessibility
      region.setAttribute('tabindex', '0');
      region.setAttribute('role', 'button');
      region.setAttribute('aria-label', region.getAttribute('data-label') || 'Brain region');

      region.addEventListener('focus', function () {
        highlightRegion(region);
        showTooltip(region);
      });

      region.addEventListener('blur', function () {
        clearHighlight(region);
        hideTooltip();
      });
    });

    // Click outside to dismiss
    container.addEventListener('click', function (e) {
      if (!e.target.closest('.brain-region')) {
        if (activeRegion) {
          clearHighlight(activeRegion);
          hideTooltip();
        }
      }
    });

    console.log('[ChildPsych] Brain diagram initialized with ' + regions.length + ' regions');
  }

  /* ------------------------------------------
     GENERIC HOTSPOT SYSTEM
     Handles hover/click interactions on any
     .hotspot-region elements within a
     .diagram-container.

     Expected HTML structure:
       <div class="diagram-container" id="some-diagram">
         <svg>
           <g class="hotspot-region"
              data-hotspot-id="hs1"
              data-label="Label"
              data-info="Description text">
             <circle/rect/path ... />
           </g>
         </svg>
         <div class="diagram-tooltip">
           <h5 class="diagram-tooltip-title"></h5>
           <p class="diagram-tooltip-text"></p>
         </div>
         <!-- Optional: info panels for each hotspot -->
         <div class="hotspot-info-panel" data-for-hotspot="hs1">
           <h4>Title</h4>
           <p>Detailed description...</p>
         </div>
       </div>
  ------------------------------------------ */
  function initHotspots() {
    var hotspots = document.querySelectorAll('.hotspot-region');
    if (hotspots.length === 0) return;

    hotspots.forEach(function (hotspot) {
      var container = hotspot.closest('.diagram-container');
      if (!container) return;

      // Find associated tooltip
      var tooltip = container.querySelector('.diagram-tooltip');
      var tooltipTitle = tooltip ? (tooltip.querySelector('.diagram-tooltip-title') || tooltip.querySelector('h5')) : null;
      var tooltipText = tooltip ? (tooltip.querySelector('.diagram-tooltip-text') || tooltip.querySelector('p')) : null;

      // Find associated info panel (if any)
      var hotspotId = hotspot.getAttribute('data-hotspot-id');
      var infoPanel = hotspotId ? container.querySelector('.hotspot-info-panel[data-for-hotspot="' + hotspotId + '"]') : null;

      /* --- Hover: highlight and show tooltip --- */
      hotspot.addEventListener('mouseenter', function () {
        // Change fill opacity for highlight effect
        hotspot.style.fillOpacity = '0.7';
        hotspot.classList.add('is-hovered');

        // Show tooltip with label
        if (tooltip) {
          var label = hotspot.getAttribute('data-label') || '';
          var info = hotspot.getAttribute('data-info') || '';
          if (tooltipTitle) tooltipTitle.textContent = label;
          if (tooltipText) tooltipText.textContent = info;

          // Position tooltip
          var containerRect = container.getBoundingClientRect();
          var hotspotRect = hotspot.getBoundingClientRect();
          var tooltipWidth = tooltip.offsetWidth || 240;

          var left = (hotspotRect.left - containerRect.left) + (hotspotRect.width / 2) - (tooltipWidth / 2);
          var top = (hotspotRect.top - containerRect.top) - (tooltip.offsetHeight || 60) - 12;

          left = Math.max(8, Math.min(left, containerRect.width - tooltipWidth - 8));
          if (top < 8) {
            top = (hotspotRect.bottom - containerRect.top) + 12;
          }

          tooltip.style.left = left + 'px';
          tooltip.style.top = top + 'px';
          tooltip.classList.add('is-visible');
        }
      });

      hotspot.addEventListener('mouseleave', function () {
        hotspot.style.fillOpacity = '';
        hotspot.classList.remove('is-hovered');

        if (tooltip) {
          tooltip.classList.remove('is-visible');
        }
      });

      /* --- Click: show info panel --- */
      hotspot.addEventListener('click', function (e) {
        e.stopPropagation();

        // Hide all other info panels in this container
        var allPanels = container.querySelectorAll('.hotspot-info-panel');
        allPanels.forEach(function (panel) {
          if (panel !== infoPanel) {
            panel.classList.remove('is-active');
          }
        });

        // Remove active state from other hotspots
        var allHotspots = container.querySelectorAll('.hotspot-region');
        allHotspots.forEach(function (hs) {
          if (hs !== hotspot) {
            hs.classList.remove('is-active');
          }
        });

        // Toggle this hotspot's panel
        if (infoPanel) {
          var isActive = infoPanel.classList.contains('is-active');
          infoPanel.classList.toggle('is-active', !isActive);
          hotspot.classList.toggle('is-active', !isActive);
        } else {
          hotspot.classList.toggle('is-active');
        }
      });

      // Keyboard accessibility
      hotspot.setAttribute('tabindex', '0');
      hotspot.setAttribute('role', 'button');
      hotspot.setAttribute('aria-label', hotspot.getAttribute('data-label') || 'Hotspot');
    });

    // Click outside to dismiss info panels
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.hotspot-region') && !e.target.closest('.hotspot-info-panel')) {
        document.querySelectorAll('.hotspot-info-panel.is-active').forEach(function (p) {
          p.classList.remove('is-active');
        });
        document.querySelectorAll('.hotspot-region.is-active').forEach(function (hs) {
          hs.classList.remove('is-active');
        });
      }
    });

    console.log('[ChildPsych] Hotspots initialized: ' + hotspots.length + ' regions');
  }

  /* ------------------------------------------
     INTERACTIVE NATURE-NURTURE SCALE
     Uses GSAP Draggable (if available) to make
     .drag-token elements draggable. Handles
     hit-testing against .scale-pan drop zones
     and calculates a tilt angle for #scale-beam.

     Expected HTML structure:
       <div class="scale-container diagram-container">
         <div class="scale-tokens">
           <div class="drag-token"
                data-token-value="nature"
                data-token-weight="3">
             Genetics
           </div>
           ...
         </div>
         <svg class="scale-svg">
           <g id="scale-beam" transform-origin="center">
             <line ... />
           </g>
           <g class="scale-pan scale-pan-left" data-pan="nature">
             <rect ... />
           </g>
           <g class="scale-pan scale-pan-right" data-pan="nurture">
             <rect ... />
           </g>
         </svg>
       </div>
  ------------------------------------------ */
  function initInteractiveScale() {
    var scaleContainer = document.querySelector('.scale-container');
    if (!scaleContainer) return;

    var beam = document.getElementById('scale-beam');
    var tokens = scaleContainer.querySelectorAll('.drag-token');
    var pans = scaleContainer.querySelectorAll('.scale-pan');

    if (!beam || tokens.length === 0 || pans.length === 0) return;

    // Track weights on each side
    var weights = {
      nature: 0,
      nurture: 0
    };

    /* --- Calculate and apply tilt angle --- */
    function updateBeamTilt() {
      var diff = weights.nature - weights.nurture;
      // Max tilt of 15 degrees
      var maxTilt = 15;
      var maxWeight = 10;
      var tiltAngle = (diff / maxWeight) * maxTilt;
      tiltAngle = Math.max(-maxTilt, Math.min(maxTilt, tiltAngle));

      // Apply rotation — negative means left side is heavier (tilts left down)
      if (typeof gsap !== 'undefined') {
        gsap.to(beam, {
          rotation: -tiltAngle,
          duration: 0.3,
          ease: 'elastic.out(1, 0.5)'
        });
      } else {
        beam.style.transform = 'rotate(' + (-tiltAngle) + 'deg)';
      }

      // Update any weight display labels
      var natureLabel = scaleContainer.querySelector('.scale-weight-nature');
      var nurtureLabel = scaleContainer.querySelector('.scale-weight-nurture');
      if (natureLabel) natureLabel.textContent = weights.nature;
      if (nurtureLabel) nurtureLabel.textContent = weights.nurture;
    }

    /* --- Check if GSAP Draggable is available --- */
    if (typeof Draggable !== 'undefined' || (typeof gsap !== 'undefined' && gsap.Draggable)) {
      var DraggablePlugin = typeof Draggable !== 'undefined' ? Draggable : gsap.Draggable;

      tokens.forEach(function (token) {
        var tokenValue = token.getAttribute('data-token-value') || 'nature';
        var tokenWeight = parseFloat(token.getAttribute('data-token-weight')) || 1;
        var isPlaced = false;
        var placedPan = null;

        // Store original position
        var originalLeft = token.offsetLeft;
        var originalTop = token.offsetTop;

        DraggablePlugin.create(token, {
          type: 'x,y',
          bounds: scaleContainer,
          edgeResistance: 0.65,
          inertia: false,

          onDragStart: function () {
            token.classList.add('is-dragging');

            // If already placed on a pan, remove its weight
            if (isPlaced && placedPan) {
              var panSide = placedPan.getAttribute('data-pan');
              if (panSide && weights[panSide] !== undefined) {
                weights[panSide] -= tokenWeight;
              }
              isPlaced = false;
              placedPan = null;
            }
          },

          onDrag: function () {
            // Highlight pans on hover
            pans.forEach(function (pan) {
              if (isOverlapping(token, pan)) {
                pan.classList.add('is-highlight');
              } else {
                pan.classList.remove('is-highlight');
              }
            });
          },

          onDragEnd: function () {
            token.classList.remove('is-dragging');

            // Check which pan the token was dropped on
            var droppedOn = null;
            pans.forEach(function (pan) {
              pan.classList.remove('is-highlight');
              if (isOverlapping(token, pan)) {
                droppedOn = pan;
              }
            });

            if (droppedOn) {
              // Token was placed on a pan
              var panSide = droppedOn.getAttribute('data-pan');
              if (panSide && weights[panSide] !== undefined) {
                weights[panSide] += tokenWeight;
                isPlaced = true;
                placedPan = droppedOn;
                token.classList.add('is-placed');

                // Snap token to the pan center
                snapToPan(token, droppedOn);
              }
            } else {
              // Token was dropped outside — snap back
              token.classList.remove('is-placed');
              if (typeof gsap !== 'undefined') {
                gsap.to(token, {
                  x: 0,
                  y: 0,
                  duration: 0.2,
                  ease: 'power2.out'
                });
              }
            }

            updateBeamTilt();
          }
        });
      });
    } else {
      /* --- Fallback: click-based placement --- */
      console.info('[ChildPsych] GSAP Draggable not available. Using click-based scale interaction.');

      var selectedToken = null;

      tokens.forEach(function (token) {
        token.style.cursor = 'pointer';
        token.addEventListener('click', function () {
          // Select or deselect this token
          if (selectedToken === token) {
            token.classList.remove('is-selected');
            selectedToken = null;
          } else {
            if (selectedToken) selectedToken.classList.remove('is-selected');
            token.classList.add('is-selected');
            selectedToken = token;
          }
        });
      });

      pans.forEach(function (pan) {
        pan.style.cursor = 'pointer';
        pan.addEventListener('click', function () {
          if (!selectedToken) return;

          var tokenWeight = parseFloat(selectedToken.getAttribute('data-token-weight')) || 1;
          var panSide = pan.getAttribute('data-pan');

          if (panSide && weights[panSide] !== undefined) {
            weights[panSide] += tokenWeight;
            selectedToken.classList.add('is-placed');
            selectedToken.classList.remove('is-selected');
            selectedToken.style.opacity = '0.5';
            selectedToken.style.pointerEvents = 'none';
            selectedToken = null;

            updateBeamTilt();
          }
        });
      });
    }

    /* --- Utility: check if two elements overlap --- */
    function isOverlapping(el1, el2) {
      var r1 = el1.getBoundingClientRect();
      var r2 = el2.getBoundingClientRect();
      return !(
        r1.right < r2.left ||
        r1.left > r2.right ||
        r1.bottom < r2.top ||
        r1.top > r2.bottom
      );
    }

    /* --- Utility: snap a token to the center of a pan --- */
    function snapToPan(token, pan) {
      if (typeof gsap === 'undefined') return;

      var panRect = pan.getBoundingClientRect();
      var tokenRect = token.getBoundingClientRect();
      var containerRect = scaleContainer.getBoundingClientRect();

      // Calculate offset needed to center the token over the pan
      var panCenterX = panRect.left + panRect.width / 2 - containerRect.left;
      var panCenterY = panRect.top + panRect.height / 2 - containerRect.top;
      var tokenCenterX = tokenRect.left + tokenRect.width / 2 - containerRect.left;
      var tokenCenterY = tokenRect.top + tokenRect.height / 2 - containerRect.top;

      var offsetX = panCenterX - tokenCenterX;
      var offsetY = panCenterY - tokenCenterY;

      // Get current GSAP x/y values
      var currentX = gsap.getProperty(token, 'x') || 0;
      var currentY = gsap.getProperty(token, 'y') || 0;

      gsap.to(token, {
        x: currentX + offsetX,
        y: currentY + offsetY,
        duration: 0.15,
        ease: 'power2.out'
      });
    }

    // Initial beam state (level)
    updateBeamTilt();

    console.log('[ChildPsych] Interactive scale initialized with ' + tokens.length + ' tokens');
  }

  /* ------------------------------------------
     INITIALIZATION
     Each init function checks for the relevant
     DOM elements before doing any work.
     All are called on DOMContentLoaded.
  ------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    initBrainDiagram();
    initHotspots();
    initInteractiveScale();

    console.log('[ChildPsych] Diagrams initialized');
  });

  // Expose functions globally in case they need to be re-initialized
  window.initBrainDiagram = initBrainDiagram;
  window.initHotspots = initHotspots;
  window.initInteractiveScale = initInteractiveScale;

})();
