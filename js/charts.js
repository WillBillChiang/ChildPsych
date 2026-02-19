/* ========================================
   CHILD PSYCHOLOGY COURSE — CHARTS.JS
   Animated SVG chart renderers that draw
   on scroll into view using GSAP ScrollTrigger.
   ======================================== */

(function () {
  'use strict';

  /* Default colors matching the design tokens */
  var DEFAULT_COLORS = [
    '#9B5BBF', // primary-600
    '#3EB589', // secondary-500
    '#FFA75A', // accent-500
    '#7EB8E8', // blue
    '#FF6B8A', // rose
    '#7DD8AD', // emerald
    '#A96BCF', // primary-500
    '#2FA07A', // secondary-600
    '#E07830', // accent-600
    '#8B8FE0'  // indigo
  ];

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* Check for reduced motion preference */
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------
     UTILITY: Create an SVG element with attributes
  ------------------------------------------ */
  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var key in attrs) {
        if (attrs.hasOwnProperty(key)) {
          el.setAttribute(key, attrs[key]);
        }
      }
    }
    return el;
  }

  /* ------------------------------------------
     UTILITY: Get a color from the palette
  ------------------------------------------ */
  function getColor(index, customColor) {
    if (customColor) return customColor;
    return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  }

  /* ------------------------------------------
     UTILITY: Find the max value in data
  ------------------------------------------ */
  function maxValue(data) {
    var max = 0;
    data.forEach(function (item) {
      var val = typeof item === 'object' ? item.value : item;
      if (val > max) max = val;
    });
    return max;
  }

  /* ==========================================
     BAR CHART
     Renders an SVG bar chart with animated bars
     that grow from the bottom on scroll.

     @param {HTMLElement} container - DOM element to render into
     @param {Array} data - [{label, value, color}]
     @param {Object} options - {width, height, barColor, gap, showLabels, showValues}
  ========================================== */
  function createBarChart(container, data, options) {
    if (!container || !data || data.length === 0) return;

    var opts = Object.assign({
      width: 500,
      height: 300,
      barColor: null,        // default: use palette
      gap: 0.3,              // gap ratio between bars (0-1)
      showLabels: true,
      showValues: true,
      padding: { top: 20, right: 20, bottom: 50, left: 50 },
      animationDuration: 0.4,
      animationStagger: 0.05
    }, options || {});

    var pad = opts.padding;
    var chartWidth = opts.width - pad.left - pad.right;
    var chartHeight = opts.height - pad.top - pad.bottom;
    var max = maxValue(data) * 1.1; // 10% headroom
    if (max === 0) max = 1;

    // Create SVG
    var svg = svgEl('svg', {
      viewBox: '0 0 ' + opts.width + ' ' + opts.height,
      width: '100%',
      height: 'auto',
      'class': 'chart chart-bar',
      'aria-label': 'Bar chart'
    });

    // Background grid lines
    var gridGroup = svgEl('g', { 'class': 'chart-grid' });
    var gridLines = 5;
    for (var g = 0; g <= gridLines; g++) {
      var gy = pad.top + chartHeight - (g / gridLines) * chartHeight;
      var gridLine = svgEl('line', {
        x1: pad.left,
        y1: gy,
        x2: pad.left + chartWidth,
        y2: gy,
        stroke: '#E2E8F0',
        'stroke-width': 1
      });
      gridGroup.appendChild(gridLine);

      // Y-axis labels
      var yLabel = svgEl('text', {
        x: pad.left - 8,
        y: gy + 4,
        fill: '#94A3B8',
        'font-size': '11',
        'font-family': "'Nunito', sans-serif",
        'text-anchor': 'end'
      });
      yLabel.textContent = Math.round((g / gridLines) * max);
      gridGroup.appendChild(yLabel);
    }
    svg.appendChild(gridGroup);

    // Bars
    var barGroup = svgEl('g', { 'class': 'chart-bars' });
    var barWidth = chartWidth / data.length;
    var innerBarWidth = barWidth * (1 - opts.gap);
    var barOffset = (barWidth - innerBarWidth) / 2;
    var bars = [];

    data.forEach(function (item, i) {
      var barHeight = (item.value / max) * chartHeight;
      var x = pad.left + i * barWidth + barOffset;
      var y = pad.top + chartHeight - barHeight;
      var color = getColor(i, item.color || opts.barColor);

      // Bar rectangle — starts at zero height for animation
      var rect = svgEl('rect', {
        x: x,
        y: pad.top + chartHeight, // start at bottom
        width: innerBarWidth,
        height: 0,                // start at 0 height
        fill: color,
        rx: 4,
        ry: 4,
        'class': 'chart-bar-rect'
      });

      // Store target values for animation
      rect._targetY = y;
      rect._targetHeight = barHeight;
      bars.push(rect);
      barGroup.appendChild(rect);

      // Value labels above bars
      if (opts.showValues) {
        var valLabel = svgEl('text', {
          x: x + innerBarWidth / 2,
          y: y - 8,
          fill: '#475569',
          'font-size': '12',
          'font-family': "'Nunito', sans-serif",
          'font-weight': '700',
          'text-anchor': 'middle',
          opacity: 0,
          'class': 'chart-bar-value'
        });
        valLabel.textContent = item.value;
        barGroup.appendChild(valLabel);
        bars.push(valLabel);
      }

      // X-axis labels
      if (opts.showLabels && item.label) {
        var xLabel = svgEl('text', {
          x: x + innerBarWidth / 2,
          y: pad.top + chartHeight + 20,
          fill: '#64748B',
          'font-size': '11',
          'font-family': "'Nunito', sans-serif",
          'font-weight': '600',
          'text-anchor': 'middle'
        });
        xLabel.textContent = item.label;
        barGroup.appendChild(xLabel);
      }
    });

    svg.appendChild(barGroup);
    container.appendChild(svg);

    // Animate bars on scroll
    animateOnScroll(container, function () {
      if (typeof gsap === 'undefined') {
        // Fallback: show immediately
        bars.forEach(function (el) {
          if (el.tagName === 'rect' && el._targetY !== undefined) {
            el.setAttribute('y', el._targetY);
            el.setAttribute('height', el._targetHeight);
          } else if (el.tagName === 'text') {
            el.setAttribute('opacity', 1);
          }
        });
        return;
      }

      var barRects = svg.querySelectorAll('.chart-bar-rect');
      var barValues = svg.querySelectorAll('.chart-bar-value');

      barRects.forEach(function (rect, i) {
        gsap.to(rect, {
          attr: { y: rect._targetY, height: rect._targetHeight },
          duration: prefersReducedMotion ? 0.01 : opts.animationDuration,
          delay: prefersReducedMotion ? 0 : i * opts.animationStagger,
          ease: 'power2.out'
        });
      });

      barValues.forEach(function (label, i) {
        gsap.to(label, {
          attr: { opacity: 1 },
          duration: prefersReducedMotion ? 0.01 : 0.2,
          delay: prefersReducedMotion ? 0 : (i * opts.animationStagger) + opts.animationDuration * 0.6
        });
      });
    });

    return svg;
  }

  /* ==========================================
     DONUT / RING CHART
     Renders an SVG donut chart with animated
     segments that draw in on scroll.

     @param {HTMLElement} container - DOM element to render into
     @param {Array} segments - [{label, value, color}]
     @param {Object} options - {width, height, innerRadius, outerRadius, showLabels, showLegend}
  ========================================== */
  function createDonutChart(container, segments, options) {
    if (!container || !segments || segments.length === 0) return;

    var opts = Object.assign({
      width: 300,
      height: 300,
      innerRadius: 70,
      outerRadius: 120,
      showLabels: true,
      showLegend: true,
      animationDuration: 0.6,
      gapAngle: 2 // degrees gap between segments
    }, options || {});

    var cx = opts.width / 2;
    var cy = opts.height / 2;
    var total = 0;
    segments.forEach(function (s) { total += s.value; });
    if (total === 0) total = 1;

    // Create SVG
    var svg = svgEl('svg', {
      viewBox: '0 0 ' + opts.width + ' ' + opts.height,
      width: '100%',
      height: 'auto',
      'class': 'chart chart-donut',
      'aria-label': 'Donut chart'
    });

    var pathGroup = svgEl('g', { 'class': 'chart-donut-segments' });
    var gapRad = (opts.gapAngle * Math.PI) / 180;
    var totalGap = gapRad * segments.length;
    var availableAngle = (2 * Math.PI) - totalGap;
    var currentAngle = -Math.PI / 2; // start at top
    var segmentPaths = [];

    segments.forEach(function (seg, i) {
      var segAngle = (seg.value / total) * availableAngle;
      var startAngle = currentAngle;
      var endAngle = currentAngle + segAngle;
      var color = getColor(i, seg.color);

      // Calculate arc path for the donut segment
      var path = describeArc(cx, cy, opts.innerRadius, opts.outerRadius, startAngle, endAngle);

      var pathEl = svgEl('path', {
        d: path,
        fill: color,
        opacity: 0,
        'class': 'chart-donut-segment'
      });

      pathGroup.appendChild(pathEl);
      segmentPaths.push(pathEl);

      // Label: percentage in the middle of the arc
      if (opts.showLabels && seg.value / total > 0.05) {
        var midAngle = (startAngle + endAngle) / 2;
        var labelRadius = (opts.innerRadius + opts.outerRadius) / 2;
        var lx = cx + labelRadius * Math.cos(midAngle);
        var ly = cy + labelRadius * Math.sin(midAngle);

        var label = svgEl('text', {
          x: lx,
          y: ly + 4,
          fill: 'white',
          'font-size': '12',
          'font-family': "'Nunito', sans-serif",
          'font-weight': '700',
          'text-anchor': 'middle',
          opacity: 0,
          'class': 'chart-donut-label'
        });
        label.textContent = Math.round((seg.value / total) * 100) + '%';
        pathGroup.appendChild(label);
        segmentPaths.push(label);
      }

      currentAngle = endAngle + gapRad;
    });

    svg.appendChild(pathGroup);

    // Center text (total or title)
    var centerText = svgEl('text', {
      x: cx,
      y: cy,
      fill: '#1E293B',
      'font-size': '24',
      'font-family': "'Nunito', sans-serif",
      'font-weight': '800',
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      opacity: 0,
      'class': 'chart-donut-center'
    });
    centerText.textContent = total;
    svg.appendChild(centerText);
    segmentPaths.push(centerText);

    container.appendChild(svg);

    // Legend (rendered as HTML below the SVG)
    if (opts.showLegend) {
      var legend = document.createElement('div');
      legend.className = 'chart-legend';
      legend.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:1rem;margin-top:1rem;font-family:Nunito,sans-serif;font-size:0.8125rem;';

      segments.forEach(function (seg, i) {
        var item = document.createElement('div');
        item.style.cssText = 'display:flex;align-items:center;gap:0.375rem;';

        var swatch = document.createElement('span');
        swatch.style.cssText = 'width:12px;height:12px;border-radius:3px;flex-shrink:0;background:' + getColor(i, seg.color) + ';';

        var text = document.createElement('span');
        text.style.color = '#475569';
        text.textContent = seg.label + ' (' + seg.value + ')';

        item.appendChild(swatch);
        item.appendChild(text);
        legend.appendChild(item);
      });

      container.appendChild(legend);
    }

    // Animate segments on scroll
    animateOnScroll(container, function () {
      if (typeof gsap === 'undefined') {
        segmentPaths.forEach(function (el) {
          el.setAttribute('opacity', 1);
        });
        return;
      }

      segmentPaths.forEach(function (el, i) {
        gsap.to(el, {
          attr: { opacity: 1 },
          duration: prefersReducedMotion ? 0.01 : 0.25,
          delay: prefersReducedMotion ? 0 : i * 0.1,
          ease: 'power2.out'
        });
      });
    });

    return svg;
  }

  /* ------------------------------------------
     UTILITY: Describe an arc path for donut
     segments (annular sector).
  ------------------------------------------ */
  function describeArc(cx, cy, innerR, outerR, startAngle, endAngle) {
    var outerStart = polarToCartesian(cx, cy, outerR, startAngle);
    var outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
    var innerStart = polarToCartesian(cx, cy, innerR, startAngle);
    var innerEnd = polarToCartesian(cx, cy, innerR, endAngle);

    var largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;

    var d = [
      'M', outerStart.x, outerStart.y,
      'A', outerR, outerR, 0, largeArc, 1, outerEnd.x, outerEnd.y,
      'L', innerEnd.x, innerEnd.y,
      'A', innerR, innerR, 0, largeArc, 0, innerStart.x, innerStart.y,
      'Z'
    ].join(' ');

    return d;
  }

  function polarToCartesian(cx, cy, r, angle) {
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  }

  /* ==========================================
     LINE CHART
     Renders an SVG line chart with a path-drawing
     animation on scroll.

     @param {HTMLElement} container - DOM element to render into
     @param {Array} points - [{label, value}] or [value, value, ...]
     @param {Object} options - {width, height, lineColor, fillColor, showDots, showLabels, showArea}
  ========================================== */
  function createLineChart(container, points, options) {
    if (!container || !points || points.length === 0) return;

    var opts = Object.assign({
      width: 500,
      height: 300,
      lineColor: '#9B5BBF',
      fillColor: 'rgba(155, 91, 191, 0.08)',
      lineWidth: 2.5,
      showDots: true,
      showLabels: true,
      showArea: true,
      showGrid: true,
      dotRadius: 4,
      padding: { top: 20, right: 20, bottom: 50, left: 50 },
      animationDuration: 0.75,
      smooth: true
    }, options || {});

    // Normalize points to {label, value} format
    var normalizedPoints = points.map(function (p, i) {
      if (typeof p === 'object') {
        return { label: p.label || ('Point ' + (i + 1)), value: p.value || 0 };
      }
      return { label: 'Point ' + (i + 1), value: p };
    });

    var pad = opts.padding;
    var chartWidth = opts.width - pad.left - pad.right;
    var chartHeight = opts.height - pad.top - pad.bottom;
    var max = maxValue(normalizedPoints) * 1.1;
    if (max === 0) max = 1;

    // Create SVG
    var svg = svgEl('svg', {
      viewBox: '0 0 ' + opts.width + ' ' + opts.height,
      width: '100%',
      height: 'auto',
      'class': 'chart chart-line',
      'aria-label': 'Line chart'
    });

    // Grid lines
    if (opts.showGrid) {
      var gridGroup = svgEl('g', { 'class': 'chart-grid' });
      var gridLines = 5;
      for (var g = 0; g <= gridLines; g++) {
        var gy = pad.top + chartHeight - (g / gridLines) * chartHeight;
        gridGroup.appendChild(svgEl('line', {
          x1: pad.left,
          y1: gy,
          x2: pad.left + chartWidth,
          y2: gy,
          stroke: '#E2E8F0',
          'stroke-width': 1
        }));

        var yLabel = svgEl('text', {
          x: pad.left - 8,
          y: gy + 4,
          fill: '#94A3B8',
          'font-size': '11',
          'font-family': "'Nunito', sans-serif",
          'text-anchor': 'end'
        });
        yLabel.textContent = Math.round((g / gridLines) * max);
        gridGroup.appendChild(yLabel);
      }
      svg.appendChild(gridGroup);
    }

    // Calculate point coordinates
    var coords = normalizedPoints.map(function (p, i) {
      var x = pad.left + (i / (normalizedPoints.length - 1 || 1)) * chartWidth;
      var y = pad.top + chartHeight - (p.value / max) * chartHeight;
      return { x: x, y: y, label: p.label, value: p.value };
    });

    // Build line path
    var pathData;
    if (opts.smooth && coords.length > 2) {
      pathData = buildSmoothPath(coords);
    } else {
      pathData = coords.map(function (c, i) {
        return (i === 0 ? 'M' : 'L') + c.x + ',' + c.y;
      }).join(' ');
    }

    // Area fill (closed path going down to x-axis)
    if (opts.showArea) {
      var areaPath = pathData +
        ' L' + coords[coords.length - 1].x + ',' + (pad.top + chartHeight) +
        ' L' + coords[0].x + ',' + (pad.top + chartHeight) +
        ' Z';

      var area = svgEl('path', {
        d: areaPath,
        fill: opts.fillColor,
        opacity: 0,
        'class': 'chart-line-area'
      });
      svg.appendChild(area);
    }

    // Line path
    var line = svgEl('path', {
      d: pathData,
      fill: 'none',
      stroke: opts.lineColor,
      'stroke-width': opts.lineWidth,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'class': 'chart-line-path'
    });
    svg.appendChild(line);

    // Calculate path length for animation
    var pathLength;
    try {
      // Temporarily add to DOM to measure
      container.appendChild(svg);
      pathLength = line.getTotalLength();
      container.removeChild(svg);
    } catch (e) {
      pathLength = 1000;
    }

    line.setAttribute('stroke-dasharray', pathLength);
    line.setAttribute('stroke-dashoffset', pathLength);

    // Dots at each data point
    var dotsGroup = svgEl('g', { 'class': 'chart-line-dots' });
    if (opts.showDots) {
      coords.forEach(function (c) {
        var dot = svgEl('circle', {
          cx: c.x,
          cy: c.y,
          r: opts.dotRadius,
          fill: 'white',
          stroke: opts.lineColor,
          'stroke-width': 2,
          opacity: 0,
          'class': 'chart-line-dot'
        });
        dotsGroup.appendChild(dot);
      });
    }
    svg.appendChild(dotsGroup);

    // X-axis labels
    if (opts.showLabels) {
      coords.forEach(function (c) {
        var xLabel = svgEl('text', {
          x: c.x,
          y: pad.top + chartHeight + 20,
          fill: '#64748B',
          'font-size': '11',
          'font-family': "'Nunito', sans-serif",
          'font-weight': '600',
          'text-anchor': 'middle'
        });
        xLabel.textContent = c.label;
        svg.appendChild(xLabel);
      });
    }

    container.appendChild(svg);

    // Animate on scroll
    animateOnScroll(container, function () {
      var duration = prefersReducedMotion ? 0.01 : opts.animationDuration;

      if (typeof gsap === 'undefined') {
        // Fallback: show everything immediately
        line.setAttribute('stroke-dashoffset', 0);
        var areaEl = svg.querySelector('.chart-line-area');
        if (areaEl) areaEl.setAttribute('opacity', 1);
        svg.querySelectorAll('.chart-line-dot').forEach(function (d) {
          d.setAttribute('opacity', 1);
        });
        return;
      }

      // Animate line drawing
      gsap.to(line, {
        attr: { 'stroke-dashoffset': 0 },
        duration: duration,
        ease: 'power2.inOut'
      });

      // Animate area fill
      var areaEl = svg.querySelector('.chart-line-area');
      if (areaEl) {
        gsap.to(areaEl, {
          attr: { opacity: 1 },
          duration: duration * 0.5,
          delay: duration * 0.3,
          ease: 'power2.out'
        });
      }

      // Animate dots appearing
      var dots = svg.querySelectorAll('.chart-line-dot');
      dots.forEach(function (dot, i) {
        gsap.to(dot, {
          attr: { opacity: 1 },
          duration: prefersReducedMotion ? 0.01 : 0.15,
          delay: prefersReducedMotion ? 0 : (i / dots.length) * duration
        });
      });
    });

    return svg;
  }

  /* ------------------------------------------
     UTILITY: Build a smooth cubic bezier path
     through a set of coordinates.
  ------------------------------------------ */
  function buildSmoothPath(coords) {
    if (coords.length < 2) return '';

    var d = 'M' + coords[0].x + ',' + coords[0].y;

    for (var i = 0; i < coords.length - 1; i++) {
      var p0 = coords[i === 0 ? 0 : i - 1];
      var p1 = coords[i];
      var p2 = coords[i + 1];
      var p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

      // Control points using Catmull-Rom to Bezier conversion
      var tension = 0.3;
      var cp1x = p1.x + (p2.x - p0.x) * tension;
      var cp1y = p1.y + (p2.y - p0.y) * tension;
      var cp2x = p2.x - (p3.x - p1.x) * tension;
      var cp2y = p2.y - (p3.y - p1.y) * tension;

      d += ' C' + cp1x + ',' + cp1y + ' ' + cp2x + ',' + cp2y + ' ' + p2.x + ',' + p2.y;
    }

    return d;
  }

  /* ------------------------------------------
     ANIMATE ON SCROLL
     Uses GSAP ScrollTrigger (if available) or
     IntersectionObserver to trigger the
     animation callback when the container
     scrolls into view.
  ------------------------------------------ */
  function animateOnScroll(container, callback) {
    if (typeof gsap !== 'undefined' && (typeof ScrollTrigger !== 'undefined' || gsap.ScrollTrigger)) {
      // Use ScrollTrigger
      var ST = typeof ScrollTrigger !== 'undefined' ? ScrollTrigger : gsap.ScrollTrigger;
      ST.create({
        trigger: container,
        start: 'top 85%',
        once: true,
        onEnter: callback
      });
    } else if ('IntersectionObserver' in window) {
      // Fallback: IntersectionObserver
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            callback();
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2 });
      observer.observe(container);
    } else {
      // Last resort: animate immediately
      callback();
    }
  }

  /* ==========================================
     GROUPED BAR CHART
     Renders side-by-side grouped bars for
     comparing two series (e.g. MZ vs DZ twins).

     @param {HTMLElement} container
     @param {Object} data - {labels:[], series:[{name,color,values:[]}]}
     @param {Object} options
  ========================================== */
  function createGroupedBarChart(container, data, options) {
    if (!container || !data || !data.series || data.series.length === 0) return;

    var opts = Object.assign({
      width: 500,
      height: 300,
      gap: 0.2,
      groupGap: 0.4,
      showLabels: true,
      showValues: true,
      showLegend: true,
      padding: { top: 20, right: 20, bottom: 50, left: 50 },
      animationDuration: 0.8,
      animationStagger: 0.08
    }, options || {});

    var pad = opts.padding;
    var chartWidth = opts.width - pad.left - pad.right;
    var chartHeight = opts.height - pad.top - pad.bottom;
    var labels = data.labels || [];
    var seriesCount = data.series.length;
    var groupCount = labels.length;

    // Find max value across all series
    var max = 0;
    data.series.forEach(function (s) {
      s.values.forEach(function (v) { if (v > max) max = v; });
    });
    max = max * 1.1;
    if (max === 0) max = 1;

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + opts.width + ' ' + opts.height,
      width: '100%',
      height: 'auto',
      'class': 'chart chart-grouped-bar',
      'aria-label': 'Grouped bar chart'
    });

    // Grid lines
    var gridGroup = svgEl('g', { 'class': 'chart-grid' });
    var gridLines = 5;
    for (var g = 0; g <= gridLines; g++) {
      var gy = pad.top + chartHeight - (g / gridLines) * chartHeight;
      gridGroup.appendChild(svgEl('line', {
        x1: pad.left, y1: gy, x2: pad.left + chartWidth, y2: gy,
        stroke: '#E2E8F0', 'stroke-width': 1
      }));
      var yLabel = svgEl('text', {
        x: pad.left - 8, y: gy + 4, fill: '#94A3B8',
        'font-size': '11', 'font-family': "'Nunito', sans-serif", 'text-anchor': 'end'
      });
      yLabel.textContent = Math.round((g / gridLines) * max);
      gridGroup.appendChild(yLabel);
    }
    svg.appendChild(gridGroup);

    // Bars
    var barGroup = svgEl('g', { 'class': 'chart-bars' });
    var groupWidth = chartWidth / groupCount;
    var barAreaWidth = groupWidth * (1 - opts.groupGap);
    var singleBarWidth = barAreaWidth / seriesCount * (1 - opts.gap);
    var barGap = barAreaWidth / seriesCount * opts.gap;
    var bars = [];

    for (var gi = 0; gi < groupCount; gi++) {
      var groupStart = pad.left + gi * groupWidth + (groupWidth - barAreaWidth) / 2;

      for (var si = 0; si < seriesCount; si++) {
        var val = data.series[si].values[gi] || 0;
        var barHeight = (val / max) * chartHeight;
        var x = groupStart + si * (singleBarWidth + barGap);
        var y = pad.top + chartHeight - barHeight;
        var color = getColor(si, data.series[si].color);

        var rect = svgEl('rect', {
          x: x, y: pad.top + chartHeight, width: singleBarWidth, height: 0,
          fill: color, rx: 3, ry: 3, 'class': 'chart-bar-rect'
        });
        rect._targetY = y;
        rect._targetHeight = barHeight;
        bars.push(rect);
        barGroup.appendChild(rect);

        if (opts.showValues) {
          var valLabel = svgEl('text', {
            x: x + singleBarWidth / 2, y: y - 6, fill: '#475569',
            'font-size': '10', 'font-family': "'Nunito', sans-serif",
            'font-weight': '700', 'text-anchor': 'middle', opacity: 0,
            'class': 'chart-bar-value'
          });
          valLabel.textContent = val;
          barGroup.appendChild(valLabel);
          bars.push(valLabel);
        }
      }

      // Group label
      if (opts.showLabels && labels[gi]) {
        var xLabel = svgEl('text', {
          x: pad.left + gi * groupWidth + groupWidth / 2,
          y: pad.top + chartHeight + 20,
          fill: '#64748B', 'font-size': '11', 'font-family': "'Nunito', sans-serif",
          'font-weight': '600', 'text-anchor': 'middle'
        });
        xLabel.textContent = labels[gi];
        barGroup.appendChild(xLabel);
      }
    }
    svg.appendChild(barGroup);
    container.appendChild(svg);

    // Legend
    if (opts.showLegend) {
      var legend = document.createElement('div');
      legend.className = 'chart-legend';
      legend.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:1rem;margin-top:0.75rem;font-family:Nunito,sans-serif;font-size:0.8125rem;';
      data.series.forEach(function (s, i) {
        var item = document.createElement('div');
        item.style.cssText = 'display:flex;align-items:center;gap:0.375rem;';
        var swatch = document.createElement('span');
        swatch.style.cssText = 'width:12px;height:12px;border-radius:3px;flex-shrink:0;background:' + getColor(i, s.color) + ';';
        var text = document.createElement('span');
        text.style.color = '#475569';
        text.textContent = s.name;
        item.appendChild(swatch);
        item.appendChild(text);
        legend.appendChild(item);
      });
      container.appendChild(legend);
    }

    // Animate
    animateOnScroll(container, function () {
      if (typeof gsap === 'undefined') {
        bars.forEach(function (el) {
          if (el.tagName === 'rect' && el._targetY !== undefined) {
            el.setAttribute('y', el._targetY);
            el.setAttribute('height', el._targetHeight);
          } else if (el.tagName === 'text') { el.setAttribute('opacity', 1); }
        });
        return;
      }
      var barRects = svg.querySelectorAll('.chart-bar-rect');
      var barValues = svg.querySelectorAll('.chart-bar-value');
      barRects.forEach(function (rect, i) {
        gsap.to(rect, {
          attr: { y: rect._targetY, height: rect._targetHeight },
          duration: prefersReducedMotion ? 0.01 : opts.animationDuration,
          delay: prefersReducedMotion ? 0 : i * opts.animationStagger,
          ease: 'power2.out'
        });
      });
      barValues.forEach(function (label, i) {
        gsap.to(label, {
          attr: { opacity: 1 },
          duration: prefersReducedMotion ? 0.01 : 0.4,
          delay: prefersReducedMotion ? 0 : (i * opts.animationStagger) + opts.animationDuration * 0.6
        });
      });
    });

    return svg;
  }

  /* ==========================================
     AUTO-INITIALIZATION
     Finds all [data-chart] elements, reads their
     configuration, and creates the appropriate chart.

     Expected HTML:
       <div data-chart
            data-chart-type="bar"
            data-chart-data='[{"label":"A","value":30},{"label":"B","value":50}]'
            data-chart-options='{"barColor":"#9B5BBF"}'>
       </div>
  ========================================== */
  function initCharts() {
    var chartContainers = document.querySelectorAll('[data-chart]');
    if (chartContainers.length === 0) return;

    chartContainers.forEach(function (container) {
      var chartType = container.getAttribute('data-chart-type') || container.getAttribute('data-chart') || 'bar';
      var dataRaw = container.getAttribute('data-chart-data');
      var optionsRaw = container.getAttribute('data-chart-options');

      // Parse data
      var data;
      try {
        data = JSON.parse(dataRaw);
      } catch (e) {
        console.warn('[ChildPsych] Invalid chart data for element:', container, e.message);
        return;
      }

      // Parse options (optional)
      var options = {};
      if (optionsRaw) {
        try {
          options = JSON.parse(optionsRaw);
        } catch (e) {
          console.warn('[ChildPsych] Invalid chart options:', e.message);
        }
      }

      // Create the chart
      switch (chartType) {
        case 'bar':
          createBarChart(container, data, options);
          break;

        case 'donut':
        case 'ring':
          createDonutChart(container, data, options);
          break;

        case 'line':
          createLineChart(container, data, options);
          break;

        case 'grouped-bar':
          createGroupedBarChart(container, data, options);
          break;

        default:
          console.warn('[ChildPsych] Unknown chart type: ' + chartType);
      }
    });

    console.log('[ChildPsych] Charts initialized: ' + chartContainers.length + ' charts');
  }

  /* ------------------------------------------
     INITIALIZATION
     Called on DOMContentLoaded.
  ------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    initCharts();
  });

  // Expose chart creators globally so they can be called programmatically
  window.createBarChart = createBarChart;
  window.createDonutChart = createDonutChart;
  window.createLineChart = createLineChart;
  window.createGroupedBarChart = createGroupedBarChart;
  window.initCharts = initCharts;

})();
