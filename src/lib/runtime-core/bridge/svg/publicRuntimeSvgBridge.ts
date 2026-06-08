export function buildPublicRuntimeSvgBridgeScript() {
  return `
  var letterTrackWarned = false;

  function setSheetPending(isPending) {
    if (!letterTrack || letterTrack.mode === 'number') {
      document.documentElement.removeAttribute('data-vtabs-letter-track-pending');
      return;
    }

    if (isPending) {
      document.documentElement.setAttribute('data-vtabs-letter-track-pending', '1');
      return;
    }

    document.documentElement.removeAttribute('data-vtabs-letter-track-pending');
  }

  function getSheetSvg() {
    return document.querySelector('#sheet svg, #sheet .sheet-svg');
  }

  function getRuntimeAccessibleSongTitle() {
    var contextTitle =
      typeof context !== 'undefined' && context
        ? context.title || context.song_name || context.alias_name || ''
        : '';
    if (contextTitle && String(contextTitle).trim()) {
      return String(contextTitle).trim();
    }

    var documentTitle = String(document.title || '')
      .replace(/\s*-\s*Public Runtime Preview\s*$/i, '')
      .trim();
    return documentTitle || songId;
  }

  function annotateSheetSvgAccessibility(svg) {
    if (!svg) {
      return;
    }

    var songTitle = getRuntimeAccessibleSongTitle();
    var titleId = 'vtabs-sheet-title';
    var descId = 'vtabs-sheet-desc';
    var titleText = songTitle
      ? songTitle + ' fingering chart and sheet music'
      : 'Fingering chart and sheet music';
    var descText = songTitle
      ? 'Interactive SVG fingering chart and melody notation for ' + songTitle + '.'
      : 'Interactive SVG fingering chart and melody notation.';

    svg.setAttribute('role', 'img');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('aria-labelledby', titleId + ' ' + descId);
    svg.removeAttribute('aria-hidden');

    Array.prototype.slice
      .call(svg.querySelectorAll('[data-vtabs-a11y]'))
      .forEach(function (node) {
        node.remove();
      });

    var titleNode = createSvgNode('title');
    titleNode.setAttribute('id', titleId);
    titleNode.setAttribute('data-vtabs-a11y', 'title');
    titleNode.textContent = titleText;

    var descNode = createSvgNode('desc');
    descNode.setAttribute('id', descId);
    descNode.setAttribute('data-vtabs-a11y', 'desc');
    descNode.textContent = descText;

    svg.insertBefore(descNode, svg.firstChild || null);
    svg.insertBefore(titleNode, descNode);
  }

  function getPublicRuntimeVisualTheme() {
    if (
      typeof publicRuntimeVisualTheme !== 'object' ||
      !publicRuntimeVisualTheme ||
      publicRuntimeVisualTheme.enabled !== true
    ) {
      return null;
    }

    return publicRuntimeVisualTheme;
  }

  function applyPublicRuntimeVisualTheme(svg) {
    if (!svg) {
      return;
    }

    var theme = getPublicRuntimeVisualTheme();
    if (!theme) {
      svg.removeAttribute('data-vtabs-visual-theme');
      svg.removeAttribute('data-vtabs-sheet-tone');
      svg.removeAttribute('data-vtabs-fingering-palette');
      svg.removeAttribute('data-vtabs-typography');
      svg.removeAttribute('data-vtabs-fingering-shape');
      return;
    }

    svg.setAttribute('data-vtabs-visual-theme', 'public-runtime');
    svg.setAttribute('data-vtabs-sheet-tone', theme.sheetTone || 'none');
    svg.setAttribute('data-vtabs-fingering-palette', theme.fingeringPalette || 'legacy');
    svg.setAttribute('data-vtabs-typography', theme.typography || 'legacy');
    svg.setAttribute('data-vtabs-fingering-shape', theme.fingeringShape || 'legacy');

    if (theme.sheetTone === 'classic-paper') {
      applyClassicPublicSheetTone(svg);
    }

    if (theme.typography === 'classic-public') {
      applyClassicPublicInkAndTypography(svg);
    }

    if (theme.fingeringPalette === 'classic-public') {
      ensureClassicPublicFingeringGradients(svg);
      applyClassicPublicFingeringPalette(svg);
      applyClassicPublicFingeringDetailStyle(svg);
      applyClassicPublicRecorder8Shape(svg);
      applyClassicPublicO12HoleScale(svg);
      applyClassicPublicO12HolePosition(svg);
      applyClassicPublicO12ReferenceShape(svg);
      applyClassicPublicO12VisualScale(svg);
      applyClassicPublicRecorder8CollisionSpacing(svg);
      applyClassicPublicWhistle6Shape(svg);
      applyClassicPublicO6Shape(svg);
    }
  }

  function normalizeSvgColor(value) {
    return String(value || '').trim().toLowerCase();
  }

  function applyClassicPublicSheetTone(svg) {
    var background = svg.querySelector('rect[x="0"][y="0"][width="100%"][height="100%"]');
    if (background) {
      background.setAttribute('fill', '#fff8ee');
    }

    ensureClassicPublicPaperTexture(svg);
    svg.style.backgroundColor = '#fff8ee';
  }

  function ensureClassicPublicPaperTexture(svg) {
    var textureId = 'vtabs-classic-paper-texture';
    if (svg.querySelector('[data-vtabs-paper-texture="overlay"]')) {
      return;
    }

    var defs = getOrCreateSvgDefs(svg);
    if (!defs) {
      return;
    }

    if (!svg.querySelector('#' + textureId)) {
      var pattern = createSvgNode('pattern');
      pattern.setAttribute('id', textureId);
      pattern.setAttribute('data-vtabs-paper-texture', 'pattern');
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      pattern.setAttribute('width', '18');
      pattern.setAttribute('height', '18');

      var warmFiber = createSvgNode('path');
      warmFiber.setAttribute('d', 'M0 9H18M9 0V18');
      warmFiber.setAttribute('stroke', '#b89463');
      warmFiber.setAttribute('stroke-width', '0.45');
      warmFiber.setAttribute('stroke-opacity', '0.08');
      pattern.appendChild(warmFiber);

      var coolFiber = createSvgNode('path');
      coolFiber.setAttribute('d', 'M-4 18L18 -4M4 22L22 4');
      coolFiber.setAttribute('stroke', '#6c8a76');
      coolFiber.setAttribute('stroke-width', '0.35');
      coolFiber.setAttribute('stroke-opacity', '0.045');
      pattern.appendChild(coolFiber);

      defs.appendChild(pattern);
    }

    var overlay = createSvgNode('rect');
    overlay.setAttribute('data-vtabs-paper-texture', 'overlay');
    overlay.setAttribute('x', '0');
    overlay.setAttribute('y', '0');
    overlay.setAttribute('width', '100%');
    overlay.setAttribute('height', '100%');
    overlay.setAttribute('fill', 'url(#' + textureId + ')');
    overlay.setAttribute('pointer-events', 'none');
    overlay.setAttribute('aria-hidden', 'true');

    var firstContentNode = Array.prototype.slice.call(svg.childNodes).find(function (node) {
      return node.nodeType === 1 && String(node.nodeName).toLowerCase() !== 'defs';
    });
    svg.insertBefore(overlay, firstContentNode ? firstContentNode.nextSibling : null);
  }

  function getOrCreateSvgDefs(svg) {
    var defs = svg.querySelector('defs');
    if (!defs) {
      defs = createSvgNode('defs');
      svg.insertBefore(defs, svg.firstChild || null);
    }

    return defs;
  }

  function applyClassicPublicInkAndTypography(svg) {
    var strokeMap = {
      '#000': '#1f1812',
      '#000000': '#1f1812',
      '#1b1b1b': '#1f1812',
      '#3e2723': '#3a2718',
      '#777': '#4f4337',
      '#777777': '#4f4337',
      '#999': '#66594b',
      '#999999': '#66594b',
      '#eee': '#e3d6c2',
      '#eeeeee': '#e3d6c2',
      '#803b05': '#5f341a'
    };
    var fillMap = {
      '#000': '#1f1812',
      '#000000': '#1f1812',
      '#1b1b1b': '#1f1812',
      '#3e2723': '#3a2718',
      '#777': '#4f4337',
      '#777777': '#4f4337',
      '#999': '#66594b',
      '#999999': '#66594b',
      '#803b05': '#5f341a'
    };

    Array.prototype.slice
      .call(svg.querySelectorAll('path[stroke], line[stroke], polyline[stroke], rect[stroke], circle[stroke], ellipse[stroke]'))
      .forEach(function (node) {
        var nextStroke = strokeMap[normalizeSvgColor(node.getAttribute('stroke'))];
        if (!nextStroke) {
          return;
        }

        node.setAttribute('stroke', nextStroke);
      });

    Array.prototype.slice
      .call(svg.querySelectorAll('text[fill], tspan[fill], path[fill], circle[fill], ellipse[fill]'))
      .forEach(function (node) {
        var nextFill = fillMap[normalizeSvgColor(node.getAttribute('fill'))];
        if (!nextFill) {
          return;
        }

        node.setAttribute('fill', nextFill);
      });

    Array.prototype.slice
      .call(svg.querySelectorAll('text'))
      .forEach(function (node) {
        if (node.getAttribute('data-vtabs-letter-track')) {
          return;
        }

        node.setAttribute(
          'font-family',
          'Georgia, "Times New Roman", "Noto Serif CJK SC", "Songti SC", serif'
        );
      });
  }

  function applyClassicPublicFingeringPalette(svg) {
    var legacyToPublicPalette = {
      '#dcb4ff': 'url(#vtabs-fingering-gradient-rose)',
      '#80baea': 'url(#vtabs-fingering-gradient-sky)',
      '#e2aa58': 'url(#vtabs-fingering-gradient-sage)',
      '#e2cd78': 'url(#vtabs-fingering-gradient-sage)',
      '#ea8a80': 'url(#vtabs-fingering-gradient-rose)',
      '#80ea80': 'url(#vtabs-fingering-gradient-sage)',
      '#fbbbbb': 'url(#vtabs-fingering-gradient-sky)',
      '#b3e085': 'url(#vtabs-fingering-gradient-sage)',
      '#ea80c1': 'url(#vtabs-fingering-gradient-rose)',
      '#87cefa': 'url(#vtabs-fingering-gradient-sky)',
      '#b693f0': 'url(#vtabs-fingering-gradient-rose)',
      '#efc99d': 'url(#vtabs-fingering-gradient-amber)',
      '#e2b178': 'url(#vtabs-fingering-gradient-amber)',
      '#78e2af': 'url(#vtabs-fingering-gradient-sage)',
      '#e278b4': 'url(#vtabs-fingering-gradient-rose)',
      '#f5d391': 'url(#vtabs-fingering-gradient-amber)'
    };

    Array.prototype.slice
      .call(svg.querySelectorAll('use[fill]'))
      .forEach(function (node) {
        var href = getUseHref(node);
        var nextFill = legacyToPublicPalette[normalizeSvgColor(node.getAttribute('fill'))];
        if (!nextFill) {
          return;
        }

        if (
          href.indexOf('Outline') === -1 &&
          href.indexOf('graph') === -1 &&
          href.indexOf('Graph') === -1
        ) {
          return;
        }

        node.setAttribute('fill', nextFill);
      });
  }

  function ensureClassicPublicFingeringGradients(svg) {
    var defs = getOrCreateSvgDefs(svg);
    if (!defs) {
      return;
    }

    [
      {
        id: 'vtabs-fingering-gradient-sky',
        edge: '#48b6dc',
        mid: '#9be2f1',
        light: '#e8fbff'
      },
      {
        id: 'vtabs-fingering-gradient-sage',
        edge: '#9fc44d',
        mid: '#d9ea79',
        light: '#f6fad1'
      },
      {
        id: 'vtabs-fingering-gradient-rose',
        edge: '#c978bd',
        mid: '#ebb2df',
        light: '#fde5f6'
      },
      {
        id: 'vtabs-fingering-gradient-amber',
        edge: '#e0a13d',
        mid: '#f0c866',
        light: '#fff0bd'
      }
    ].forEach(function (item) {
      if (svg.querySelector('#' + item.id)) {
        return;
      }

      var gradient = createSvgNode('radialGradient');
      gradient.setAttribute('id', item.id);
      gradient.setAttribute('cx', '44%');
      gradient.setAttribute('cy', '42%');
      gradient.setAttribute('r', '78%');
      gradient.setAttribute('fx', '42%');
      gradient.setAttribute('fy', '38%');

      [
        ['0%', item.light],
        ['45%', item.mid],
        ['100%', item.edge]
      ].forEach(function (stopConfig) {
        var stop = createSvgNode('stop');
        stop.setAttribute('offset', stopConfig[0]);
        stop.setAttribute('stop-color', stopConfig[1]);
        gradient.appendChild(stop);
      });

      defs.appendChild(gradient);
    });
  }

  function applyClassicPublicFingeringDetailStyle(svg) {
    Array.prototype.slice
      .call(svg.querySelectorAll('symbol[id]'))
      .forEach(function (symbol) {
        var id = symbol.getAttribute('id') || '';
        if (!/(?:tdo12Outline|do12Outline|o12Outline|td6|do6|r8|w6|Outline|Graph)/i.test(id)) {
          return;
        }

        Array.prototype.slice
          .call(symbol.querySelectorAll('path[stroke], line[stroke], polyline[stroke]'))
          .forEach(function (node) {
            var stroke = normalizeSvgColor(node.getAttribute('stroke'));
            if (stroke === '#000' || stroke === '#000000' || stroke === '#1b1b1b') {
              node.setAttribute('stroke', '#2f261d');
              node.setAttribute('stroke-width', String(Math.max(Number(node.getAttribute('stroke-width') || 0.8), 0.95)));
              node.setAttribute('stroke-linecap', 'round');
              node.setAttribute('stroke-linejoin', 'round');
            }
          });

        Array.prototype.slice
          .call(symbol.querySelectorAll('circle'))
          .forEach(function (circle) {
            var fill = normalizeSvgColor(circle.getAttribute('fill'));
            if (fill === '#fff' || fill === '#ffffff' || fill === 'white') {
              circle.setAttribute('fill', '#ffffff');
              circle.setAttribute('stroke', '#17110c');
              circle.setAttribute('stroke-width', '1.15');
              return;
            }

            if (fill === '#ccc' || fill === '#cccccc') {
              circle.setAttribute('fill', '#d2c6b4');
              circle.setAttribute('stroke', '#17110c');
              circle.setAttribute('stroke-width', '0.85');
              return;
            }

            if (fill === '#000' || fill === '#000000' || fill === '#1b1b1b') {
              circle.setAttribute('fill', '#000000');
              circle.setAttribute('stroke', '#120d09');
              circle.setAttribute('stroke-width', '0.55');
            }
          });
      });
  }

  function applyClassicPublicO12ReferenceShape(svg) {
    var originalOutlineD =
      'M45,98c-6,0,-6,0,-6,-20c-2,-4,-2,-4,-6,-6c-40,-10,-40,-34,25,-50c80,-20,80,-8,10,40c-8,6,-8,6,-12,20l-4,14c-1,2,-1,2,-8,2';
    var referenceOutlineD =
      'M43,97c-5,0,-7,-2,-7,-16c-1,-5,-3,-7,-8,-8c-32,-8,-37,-25,3,-41c18,-7,47,-12,73,-8c16,3,17,9,1,21c-12,9,-32,19,-45,36c-4,7,-5,11,-8,15c-2,3,-7,2,-13,1';

    Array.prototype.slice
      .call(svg.querySelectorAll('symbol[id]'))
      .forEach(function (symbol) {
        var id = symbol.getAttribute('id') || '';
        if (!/(?:tdo12Outline|do12Outline|o12Outline)/i.test(id)) {
          return;
        }

        var outline = symbol.querySelector('path');
        if (!outline) {
          return;
        }

        var currentD = String(outline.getAttribute('d') || '').trim();
        if (currentD !== originalOutlineD && outline.getAttribute('data-vtabs-o12-reference-shape') !== '1') {
          return;
        }

        outline.setAttribute('d', referenceOutlineD);
        outline.setAttribute('data-vtabs-o12-reference-shape', '1');
        outline.setAttribute('stroke', '#1f1812');
        outline.setAttribute('stroke-width', String(Math.max(Number(outline.getAttribute('stroke-width') || 0.8), 0.9)));
        outline.setAttribute('stroke-linejoin', 'round');
        outline.setAttribute('stroke-linecap', 'round');
      });
  }

  function applyClassicPublicRecorder8Shape(svg) {
    var originalBodyD =
      'M90,196 a40 40 0 0 1 -10 -20 l0,-172 l40,0 l0,172 a40 40 0 0 1 -10,20 z';
    var publicBodyD =
      'M92,197L87,177L87,16L84,0L118,0L115,16L115,177L110,197Z';

    Array.prototype.slice
      .call(svg.querySelectorAll('symbol[id]'))
      .forEach(function (symbol) {
        var id = symbol.getAttribute('id') || '';
        if (!/recorder8Outline/i.test(id)) {
          return;
        }

        var body = symbol.querySelector('path');
        if (body) {
          var currentD = String(body.getAttribute('d') || '').trim();
          if (currentD === originalBodyD || body.getAttribute('data-vtabs-recorder8-shape') === '1') {
            body.setAttribute('d', publicBodyD);
            body.setAttribute('data-vtabs-recorder8-shape', '1');
            body.setAttribute('stroke', '#17110c');
            body.setAttribute('stroke-width', '2.15');
            body.setAttribute('stroke-linecap', 'round');
            body.setAttribute('stroke-linejoin', 'round');
          }
        }

        if (!symbol.querySelector('[data-vtabs-recorder8-mouthpiece-divider="1"]')) {
          var mouthpieceDivider = createSvgNode('path');
          mouthpieceDivider.setAttribute('d', 'M87,177 L115,177');
          mouthpieceDivider.setAttribute('fill', 'none');
          mouthpieceDivider.setAttribute('stroke', '#17110c');
          mouthpieceDivider.setAttribute('stroke-width', '1.7');
          mouthpieceDivider.setAttribute('stroke-linecap', 'butt');
          mouthpieceDivider.setAttribute('data-vtabs-recorder8-mouthpiece-divider', '1');
          symbol.insertBefore(mouthpieceDivider, body ? body.nextSibling : symbol.firstChild);
        }

        Array.prototype.slice.call(symbol.querySelectorAll('path[stroke], ellipse[stroke]')).forEach(function (node) {
          var nodeD = String(node.getAttribute('d') || '').replace(/\\s+/g, '');
          if (nodeD === 'M80,96l40,0') {
            node.setAttribute('d', 'M87,102.5 L115,102.5');
          }
          if (nodeD === 'M80,31l40,0') {
            node.setAttribute('d', 'M87,31 L115,31');
          }

          node.setAttribute('stroke', '#17110c');
          node.setAttribute('stroke-linecap', 'round');
          node.setAttribute('stroke-linejoin', 'round');
          nodeD = String(node.getAttribute('d') || '').replace(/\\s+/g, '');
          if (
            nodeD === 'M87,177L115,177' ||
            nodeD === 'M87,102.5L115,102.5' ||
            nodeD === 'M87,31L115,31'
          ) {
            node.setAttribute('stroke-linecap', 'butt');
          }

          var strokeWidth = Number(node.getAttribute('stroke-width') || 1);
          if (String(node.getAttribute('stroke-dasharray') || '').trim()) {
            node.setAttribute('stroke-width', String(Math.max(strokeWidth, 1.15)));
            node.setAttribute('stroke-dasharray', '1.6 1.4');
            return;
          }

          node.setAttribute('stroke-width', String(Math.max(strokeWidth, 1.2)));
        });

        applyClassicPublicRecorder8DetachedBackHole(symbol);
        applyClassicPublicRecorder8FrontHolePosition(symbol);
        applyClassicPublicRecorder8HoleScale(symbol);

        Array.prototype.slice.call(symbol.querySelectorAll('circle')).forEach(function (circle) {
          var fill = normalizeSvgColor(circle.getAttribute('fill'));
          if (fill === '#fff' || fill === '#ffffff' || fill === 'white') {
            circle.setAttribute('fill', '#ffffff');
            circle.setAttribute('stroke', '#17110c');
            circle.setAttribute('stroke-width', '1.15');
            return;
          }

          if (fill === '#000' || fill === '#000000' || fill === '#1b1b1b') {
            circle.setAttribute('fill', '#000000');
            circle.setAttribute('stroke', '#120d09');
            circle.setAttribute('stroke-width', '0.65');
          }
        });
      });
  }

  function applyClassicPublicRecorder8DetachedBackHole(symbol) {
    if (!symbol) {
      return;
    }

    Array.prototype.slice.call(symbol.querySelectorAll('path[d]')).forEach(function (path) {
      var d = String(path.getAttribute('d') || '').replace(/\\s+/g, '');
      if (d === 'M80,176l40,0' || d === 'M80,158l40,0') {
        path.setAttribute('display', 'none');
        path.setAttribute('aria-hidden', 'true');
      }
    });

    if (symbol.getAttribute('data-vtabs-recorder8-back-hole') === '1') {
      return;
    }

    symbol.setAttribute('viewBox', '67 0 70 200');
    symbol.setAttribute('data-vtabs-recorder8-back-hole', '1');

    var backHoleCandidates = Array.prototype.slice
      .call(symbol.querySelectorAll('circle[cx][cy]'))
      .filter(function (circle) {
        var cy = Number(circle.getAttribute('cy'));
        return isFinite(cy) && Math.abs(cy - 167) <= 3;
      });

    if (backHoleCandidates.length < 1) {
      return;
    }

    var openCandidate = backHoleCandidates.find(function (circle) {
      return normalizeSvgColor(circle.getAttribute('fill')) === '#ffffff';
    });
    var source = openCandidate || backHoleCandidates[0];
    var hasBackHoleHalfMark = Array.prototype.slice.call(symbol.querySelectorAll('path[d]')).some(function (path) {
      var d = String(path.getAttribute('d') || '').replace(/\\s+/g, '');
      var fill = normalizeSvgColor(path.getAttribute('fill'));
      return d === 'M90167A77000104167' && (fill === '#fff' || fill === '#ffffff' || fill === 'white');
    });
    var detachedCenterX = 126.4;
    var detachedCenterY = getClassicPublicRecorder8DetachedBackHoleY();
    var detachedRadius = 6.55;
    var detached;

    if (hasBackHoleHalfMark) {
      detached = createSvgNode('g');
      detached.setAttribute('data-vtabs-recorder8-detached-back-hole', '1');

      var base = createSvgNode('circle');
      base.setAttribute('cx', String(detachedCenterX));
      base.setAttribute('cy', String(detachedCenterY));
      base.setAttribute('r', String(detachedRadius));
      base.setAttribute('fill', '#ffffff');

      var leftHalf = createSvgNode('path');
      leftHalf.setAttribute(
        'd',
        'M' +
          detachedCenterX +
          ' ' +
          (detachedCenterY - detachedRadius) +
          ' A' +
          detachedRadius +
          ' ' +
          detachedRadius +
          ' 0 0 1 ' +
          detachedCenterX +
          ' ' +
          (detachedCenterY + detachedRadius) +
          ' L' +
          detachedCenterX +
          ' ' +
          detachedCenterY +
          ' Z'
      );
      leftHalf.setAttribute('fill', '#000000');
      leftHalf.setAttribute('stroke-width', '0');

      var outline = createSvgNode('circle');
      outline.setAttribute('cx', String(detachedCenterX));
      outline.setAttribute('cy', String(detachedCenterY));
      outline.setAttribute('r', String(detachedRadius));
      outline.setAttribute('fill', 'none');
      outline.setAttribute('stroke', '#17110c');
      outline.setAttribute('stroke-width', '1.15');

      detached.appendChild(base);
      detached.appendChild(leftHalf);
      detached.appendChild(outline);
    } else {
      detached = source.cloneNode(true);
      detached.setAttribute('cx', String(detachedCenterX));
      detached.setAttribute('cy', String(detachedCenterY));
      detached.setAttribute('r', String(detachedRadius));
      detached.setAttribute('data-vtabs-recorder8-detached-back-hole', '1');
      detached.setAttribute('stroke', '#17110c');
      detached.setAttribute('stroke-width', normalizeSvgColor(source.getAttribute('fill')) === '#ffffff' ? '1.15' : '0.9');
    }

    backHoleCandidates.forEach(function (circle) {
      circle.setAttribute('display', 'none');
      circle.setAttribute('aria-hidden', 'true');
    });
    Array.prototype.slice.call(symbol.querySelectorAll('path[d]')).forEach(function (path) {
      var d = String(path.getAttribute('d') || '').replace(/\\s+/g, '');
      if (d === 'M90167A77000104167') {
        path.setAttribute('display', 'none');
        path.setAttribute('aria-hidden', 'true');
      }
    });

    var firstBodyHole = Array.prototype.slice.call(symbol.querySelectorAll('circle[cx][cy]')).find(function (circle) {
      var cy = Number(circle.getAttribute('cy'));
      return isFinite(cy) && cy > 20;
    });
    symbol.insertBefore(detached, firstBodyHole || null);
  }

  function getClassicPublicRecorder8DetachedBackHoleY() {
    return 165;
  }

  function applyClassicPublicRecorder8HoleScale(symbol) {
    if (!symbol || symbol.getAttribute('data-vtabs-recorder8-hole-scale') === '1') {
      return;
    }

    var mainHoleRadius = 6.55;

    Array.prototype.slice.call(symbol.querySelectorAll('circle[cx][cy][r]')).forEach(function (circle) {
      if (circle.getAttribute('display') === 'none') {
        return;
      }

      var cx = Number(circle.getAttribute('cx'));
      var cy = Number(circle.getAttribute('cy'));
      var r = Number(circle.getAttribute('r'));
      if (!isFinite(cx) || !isFinite(cy) || !isFinite(r)) {
        return;
      }

      if ((Math.abs(cx - 100) <= 1.5 && [165, 140, 115, 90, 70].indexOf(Math.round(cy)) !== -1) || Math.abs(cx - 126.4) <= 1.5) {
        circle.setAttribute('r', String(mainHoleRadius));
        circle.setAttribute('data-vtabs-recorder8-hole-scale', '1');
        return;
      }

      if (Math.abs(cy - 45) <= 1 || Math.abs(cy - 18) <= 1) {
        if (Math.abs(cx - 104) <= 1.5) {
          circle.setAttribute('cx', '106.2');
        }
        if (Math.abs(cx - 92) <= 1.5) {
          circle.setAttribute('cx', '95.2');
        }
        var nextR = r >= 5 ? 5.2 : 3.3;
        circle.setAttribute('r', String(nextR));
        circle.setAttribute('data-vtabs-recorder8-hole-scale', '1');
      }
    });

    Array.prototype.slice.call(symbol.querySelectorAll('ellipse[cx][cy][rx][ry]')).forEach(function (ellipse) {
      var cy = Number(ellipse.getAttribute('cy'));
      if (!isFinite(cy) || (Math.abs(cy - 45) > 1 && Math.abs(cy - 18) > 1)) {
        return;
      }

      ellipse.setAttribute('cx', '100.7');
      ellipse.setAttribute('rx', '12.2');
      ellipse.setAttribute('ry', '9.3');
      ellipse.setAttribute('data-vtabs-recorder8-hole-scale', '1');
    });

    Array.prototype.slice.call(symbol.querySelectorAll('path[d]')).forEach(function (path) {
      var d = String(path.getAttribute('d') || '').replace(/\\s+/g, '');
      var verticalHalf = d.match(/^M100(-?\\d+(?:\\.\\d+)?)A7700([01])100(-?\\d+(?:\\.\\d+)?)$/);
      if (verticalHalf) {
        var centerY = Math.round((Number(verticalHalf[1]) + Number(verticalHalf[3])) / 2);
        path.setAttribute(
          'd',
          'M100 ' +
            (centerY - mainHoleRadius) +
            ' A' +
            mainHoleRadius +
            ' ' +
            mainHoleRadius +
            ' 0 0 ' +
            verticalHalf[2] +
            ' 100 ' +
            (centerY + mainHoleRadius)
        );
        path.setAttribute('data-vtabs-recorder8-hole-scale', '1');
      }
    });

    symbol.setAttribute('data-vtabs-recorder8-hole-scale', '1');
  }

  function applyClassicPublicRecorder8CollisionSpacing(svg) {
    if (!svg || svg.getAttribute('data-vtabs-recorder8-collision-spacing') === '1') {
      return;
    }

    var recorderUses = Array.prototype.slice.call(svg.querySelectorAll('use')).filter(function (node) {
      return /recorder8Outline/i.test(getUseHref(node));
    });
    if (recorderUses.length < 2) {
      return;
    }

    var rows = [];
    recorderUses.forEach(function (node) {
      var box;
      try {
        box = node.getBBox();
      } catch (error) {
        return;
      }

      if (!box || !isFinite(box.x) || !isFinite(box.y) || !isFinite(box.width)) {
        return;
      }

      var row = rows.find(function (item) {
        return Math.abs(item.y - box.y) <= 6;
      });
      if (!row) {
        row = { y: box.y, items: [] };
        rows.push(row);
      }
      row.items.push({ node: node, box: box, offset: 0 });
    });

    rows.forEach(function (row) {
      row.items.sort(function (a, b) {
        return a.box.x - b.box.x;
      });

      var rightEdge = -Infinity;
      row.items.forEach(function (item) {
        var minGap = 3.2;
        var x = item.box.x + item.offset;
        var needed = rightEdge + minGap - x;
        if (needed > 0) {
          item.offset += Math.min(needed, 8);
          appendSvgTranslate(item.node, item.offset, 0);
        }
        rightEdge = Math.max(rightEdge, item.box.x + item.offset + item.box.width);
      });
    });

    svg.setAttribute('data-vtabs-recorder8-collision-spacing', '1');
  }

  function applyClassicPublicWhistle6Shape(svg) {
    Array.prototype.slice.call(svg.querySelectorAll('symbol[id]')).forEach(function (symbol) {
      var id = symbol.getAttribute('id') || '';
      if (!/whistle6Outline/i.test(id) || symbol.getAttribute('data-vtabs-whistle6-shape') === '1') {
        return;
      }

      symbol.setAttribute('viewBox', '82 7 36 180');
      symbol.setAttribute('data-vtabs-whistle6-shape', '1');

      var body = symbol.querySelector('rect[x="85"][y="10"][width="30"][height="172"]');
      if (body) {
        body.setAttribute('x', '87');
        body.setAttribute('width', '26');
        body.setAttribute('stroke', '#17110c');
        body.setAttribute('stroke-width', '1.65');
        body.setAttribute('stroke-linejoin', 'round');
        body.setAttribute('data-vtabs-whistle6-body', '1');
      }

      Array.prototype.slice.call(symbol.querySelectorAll('path[d]')).forEach(function (path) {
        var d = String(path.getAttribute('d') || '').replace(/\\s+/g, '');
        if (d === 'M85,10v172m30,0v-172') {
          path.setAttribute('d', 'M87,10 v172 m26,0 v-172');
          path.setAttribute('stroke', '#17110c');
          path.setAttribute('stroke-width', '1.05');
          path.setAttribute('stroke-linejoin', 'round');
          return;
        }

        var halfHole = d.match(/^M100(-?\\d+(?:\\.\\d+)?)a77000(-?\\d+(?:\\.\\d+)?)$/);
        if (halfHole) {
          var y = Number(halfHole[1]);
          if (isFinite(y)) {
            var halfCenterY = y + 7;
            var nextHalfCenterY = getClassicPublicWhistle6HoleY(halfCenterY);
            path.setAttribute('d', 'M100 ' + (nextHalfCenterY - 6.4) + ' a6.4 6.4 0 0 0 0 12.8');
            path.setAttribute('stroke', '#17110c');
            path.setAttribute('stroke-width', '1.05');
            path.setAttribute('stroke-linecap', 'round');
          }
          return;
        }

        if (/^M(?:90|95|100|105|110)168l510l-100z$/i.test(d)) {
          if (normalizeSvgColor(path.getAttribute('fill')) === 'none') {
            path.setAttribute('stroke', 'none');
            path.setAttribute('stroke-width', '0');
            return;
          }

          path.setAttribute('stroke', '#17110c');
          path.setAttribute('stroke-width', '0.85');
          path.setAttribute('stroke-linejoin', 'round');
        }
      });

      Array.prototype.slice.call(symbol.querySelectorAll('circle[cx][cy][r]')).forEach(function (circle) {
        var cx = Number(circle.getAttribute('cx'));
        var cy = Number(circle.getAttribute('cy'));
        if (!isFinite(cx) || !isFinite(cy) || Math.abs(cx - 100) > 1.5) {
          return;
        }

        circle.setAttribute('cy', String(getClassicPublicWhistle6HoleY(cy)));
        circle.setAttribute('r', '6.4');
        circle.setAttribute('stroke', normalizeSvgColor(circle.getAttribute('fill')) === '#ffffff' ? '#17110c' : '#120d09');
        circle.setAttribute('stroke-width', normalizeSvgColor(circle.getAttribute('fill')) === '#ffffff' ? '1.05' : '0.65');
        circle.setAttribute('data-vtabs-whistle6-hole-scale', '1');
      });
    });
  }

  function getClassicPublicWhistle6HoleY(cy) {
    var yMap = {
      37: 35,
      60: 57,
      79: 79,
      106: 109,
      129: 131,
      148: 153
    };
    var rounded = Math.round(Number(cy));
    return typeof yMap[rounded] === 'number' ? yMap[rounded] : cy;
  }

  function applyClassicPublicO6Shape(svg) {
    var originalOutlineD =
      'M40,100c-6,0,-6,0,-10,-20c-2,-4,-2,-4,-6,-6c-24,-16,-24,-64,16,-70c40,6,40,54,16,70c-4,2,-4,2,-6,6c-4,20,-4,20,-10,20Z';
    var publicOutlineD =
      'M40,96c-8,0,-11,-1,-12,-8c-1,-5,-4,-7,-11,-10C6,72,3,57,3,41C3,20,15,6,32,2c4,-1,12,-1,16,0c17,4,29,18,29,39c0,16,-3,31,-14,37c-7,3,-10,5,-11,10c-1,7,-4,8,-12,8Z';

    Array.prototype.slice.call(svg.querySelectorAll('symbol[id]')).forEach(function (symbol) {
      var id = symbol.getAttribute('id') || '';
      if (!/^tdOutline\\d+$/i.test(id) || symbol.getAttribute('data-vtabs-o6-shape') === '1') {
        return;
      }

      var outline = symbol.querySelector('path[d]');
      if (!outline) {
        return;
      }

      var currentD = String(outline.getAttribute('d') || '').trim();
      if (currentD !== originalOutlineD && outline.getAttribute('data-vtabs-o6-shape') !== '1') {
        return;
      }

      outline.setAttribute('d', publicOutlineD);
      outline.setAttribute('data-vtabs-o6-shape', '1');
      outline.setAttribute('stroke', '#17110c');
      outline.setAttribute('stroke-width', '1.35');
      outline.setAttribute('stroke-linejoin', 'round');
      outline.setAttribute('stroke-linecap', 'round');

      Array.prototype.slice.call(symbol.querySelectorAll('circle[cx][cy]')).forEach(function (circle) {
        var cx = Number(circle.getAttribute('cx'));
        var cy = Number(circle.getAttribute('cy'));
        if (!isFinite(cx) || !isFinite(cy) || Math.abs(cy - 84) > 2) {
          return;
        }

        if (Math.abs(cx - 16) <= 2) {
          circle.setAttribute('cx', '9');
          circle.setAttribute('cy', '89');
          circle.setAttribute('data-vtabs-o6-outer-hole-position', '1');
        }
        if (Math.abs(cx - 64) <= 2) {
          circle.setAttribute('cx', '71');
          circle.setAttribute('cy', '89');
          circle.setAttribute('data-vtabs-o6-outer-hole-position', '1');
        }
      });
    });
  }

  function appendSvgTranslate(node, dx, dy) {
    if (!node || !isFinite(dx) || !isFinite(dy) || (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01)) {
      return;
    }

    var currentX = Number(node.getAttribute('x'));
    if (isFinite(currentX)) {
      node.setAttribute('x', String(Math.round((currentX + dx) * 10) / 10));
      var transformValue = String(node.getAttribute('transform') || '');
      node.setAttribute(
        'transform',
        transformValue.replace(/rotate\\(180,([^,]+),([^\\)]+)\\)/, function (_match, cx, cy) {
          var nextCx = Number(cx) + dx;
          return 'rotate(180,' + (isFinite(nextCx) ? Math.round(nextCx * 10) / 10 : cx) + ',' + cy + ')';
        })
      );
      node.setAttribute('data-vtabs-recorder8-collision-offset', String(Math.round(dx * 10) / 10));
      return;
    }

    var transform = String(node.getAttribute('transform') || '').trim();
    var translate = 'translate(' + Math.round(dx * 10) / 10 + ' ' + Math.round(dy * 10) / 10 + ')';
    node.setAttribute('transform', translate + (transform ? ' ' + transform : ''));
    node.setAttribute('data-vtabs-recorder8-collision-offset', String(Math.round(dx * 10) / 10));
  }

  function applyClassicPublicRecorder8FrontHolePosition(symbol) {
    if (!symbol || symbol.getAttribute('data-vtabs-recorder8-front-hole-position') === '1') {
      return;
    }

    var yMap = {
      147: 165,
      127: 140,
      107: 115,
      85: 90,
      65: 70
    };

    Array.prototype.slice.call(symbol.querySelectorAll('circle[cx][cy]')).forEach(function (circle) {
      if (circle.getAttribute('display') === 'none') {
        return;
      }

      var cx = Number(circle.getAttribute('cx'));
      var cy = Number(circle.getAttribute('cy'));
      if (!isFinite(cx) || !isFinite(cy) || Math.abs(cx - 100) > 1.5) {
        return;
      }

      var nextY = yMap[Math.round(cy)];
      if (typeof nextY !== 'number') {
        return;
      }

      circle.setAttribute('cy', String(nextY));
      circle.setAttribute('data-vtabs-recorder8-front-hole-position', '1');
    });

    Array.prototype.slice.call(symbol.querySelectorAll('path[d]')).forEach(function (path) {
      if (path.getAttribute('display') === 'none') {
        return;
      }

      var d = String(path.getAttribute('d') || '').replace(/\\s+/g, '');
      var verticalHalf = d.match(/^M100(-?\\d+(?:\\.\\d+)?)A7700([01])100(-?\\d+(?:\\.\\d+)?)$/);
      if (verticalHalf) {
        var oldCenterY = Math.round((Number(verticalHalf[1]) + Number(verticalHalf[3])) / 2);
        var nextVerticalY = yMap[oldCenterY];
        if (typeof nextVerticalY === 'number') {
          path.setAttribute(
            'd',
            'M100 ' +
              (nextVerticalY - 7) +
              ' A7 7 0 0 ' +
              verticalHalf[2] +
              ' 100 ' +
              (nextVerticalY + 7)
          );
          path.setAttribute('data-vtabs-recorder8-front-hole-position', '1');
        }
        return;
      }

      var horizontalHalf = d.match(/^M93(-?\\d+(?:\\.\\d+)?)A7700([01])107(-?\\d+(?:\\.\\d+)?)$/);
      if (!horizontalHalf) {
        return;
      }

      var oldHorizontalY = Math.round((Number(horizontalHalf[1]) + Number(horizontalHalf[3])) / 2);
      var nextHorizontalY = yMap[oldHorizontalY];
      if (typeof nextHorizontalY !== 'number') {
        return;
      }

      path.setAttribute(
        'd',
        'M93 ' +
          nextHorizontalY +
          ' A7 7 0 0 ' +
          horizontalHalf[2] +
          ' 107 ' +
          nextHorizontalY
      );
      path.setAttribute('data-vtabs-recorder8-front-hole-position', '1');
    });

    symbol.setAttribute('data-vtabs-recorder8-front-hole-position', '1');
  }

  function applyClassicPublicO12HolePosition(svg) {
    var rules = [
      { x: 16, y: 52, dx: -1.2, dy: 0 },
      { x: 28, y: 48, dx: -1.2, dy: 0 },
      { x: 40, y: 43, dx: -1.2, dy: 0 },
      { x: 52, y: 34, dx: -1.2, dy: 0 },
      { x: 32, y: 60, dx: -1.2, dy: 0 },
      { x: 72, y: 48, dx: 0.2, dy: 7 },
      { x: 84, y: 40, dx: 0.2, dy: 7 },
      { x: 94, y: 32, dx: 0.2, dy: 7 },
      { x: 104, y: 24, dx: 1.2, dy: 9.2 },
      { x: 78, y: 30, dx: 0.2, dy: 7 }
    ];

    Array.prototype.slice
      .call(svg.querySelectorAll('symbol[id]'))
      .forEach(function (symbol) {
        var id = symbol.getAttribute('id') || '';
        if (!/(?:tdo12Outline|do12Outline|o12Outline)/i.test(id)) {
          return;
        }

        Array.prototype.slice.call(symbol.querySelectorAll('circle[cx][cy]')).forEach(function (circle) {
          if (circle.getAttribute('data-vtabs-o12-hole-position') === '1') {
            return;
          }

          var cx = Number(circle.getAttribute('cx'));
          var cy = Number(circle.getAttribute('cy'));
          if (!isFinite(cx) || !isFinite(cy)) {
            return;
          }

          rules.forEach(function (rule) {
            var dx = cx - rule.x;
            var dy = cy - rule.y;
            if (Math.sqrt(dx * dx + dy * dy) > 2.4) {
              return;
            }

            circle.setAttribute('cx', String(Math.round((cx + rule.dx) * 10) / 10));
            circle.setAttribute('cy', String(Math.round((cy + rule.dy) * 10) / 10));
            circle.setAttribute('data-vtabs-o12-hole-position', '1');
          });
        });
      });
  }

  function applyClassicPublicO12VisualScale(svg) {
    Array.prototype.slice
      .call(svg.querySelectorAll('symbol[id]'))
      .forEach(function (symbol) {
        var id = symbol.getAttribute('id') || '';
        if (!/(?:tdo12Outline|do12Outline|o12Outline)/i.test(id)) {
          return;
        }

        if (symbol.querySelector('g[data-vtabs-o12-visual-scale="1"]')) {
          return;
        }

        var wrapper = createSvgNode('g');
        wrapper.setAttribute('data-vtabs-o12-visual-scale', '1');
        wrapper.setAttribute('transform', 'translate(60 50) scale(1.04) translate(-60 -50)');

        Array.prototype.slice.call(symbol.childNodes).forEach(function (node) {
          wrapper.appendChild(node);
        });
        symbol.appendChild(wrapper);
      });
  }

  function applyClassicPublicO12HoleScale(svg) {
    var rules = [
      { x: 28, y: 85, r: 4.55 },
      { x: 68, y: 85, r: 4.55 },
      { x: 32, y: 60, r: 3.45 },
      { x: 78, y: 30, r: 3.45 }
    ];

    Array.prototype.slice
      .call(svg.querySelectorAll('symbol[id]'))
      .forEach(function (symbol) {
        var id = symbol.getAttribute('id') || '';
        if (!/(?:tdo12Outline|do12Outline|o12Outline)/i.test(id)) {
          return;
        }

        Array.prototype.slice.call(symbol.querySelectorAll('circle[cx][cy][r]')).forEach(function (circle) {
          var cx = Number(circle.getAttribute('cx'));
          var cy = Number(circle.getAttribute('cy'));
          if (!isFinite(cx) || !isFinite(cy)) {
            return;
          }

          rules.forEach(function (rule) {
            var dx = cx - rule.x;
            var dy = cy - rule.y;
            if (Math.sqrt(dx * dx + dy * dy) > 3.2) {
              return;
            }

            circle.setAttribute('r', String(rule.r));
            circle.setAttribute('data-vtabs-o12-hole-scale', '1');
          });
        });
      });
  }

  function isClassicPublicTypographyEnabled() {
    var theme = getPublicRuntimeVisualTheme();
    return Boolean(theme && theme.typography === 'classic-public');
  }

  function getPublicRuntimeLetterFill() {
    return isClassicPublicTypographyEnabled() ? '#2f2115' : '#7a5331';
  }

  function getPublicRuntimeLetterStroke() {
    return isClassicPublicTypographyEnabled() ? '#f9efdf' : '#ffffff';
  }

  function getPublicRuntimeLetterCoverFill() {
    return isClassicPublicTypographyEnabled() ? '#fff8ee' : '#ffffff';
  }

  function getPublicRuntimeLetterCoverTextureFill() {
    return isClassicPublicTypographyEnabled() ? 'url(#vtabs-classic-paper-texture)' : null;
  }

  function createPublicRuntimeLetterCoverTexture(cover) {
    var textureFill = getPublicRuntimeLetterCoverTextureFill();
    if (!textureFill || !cover) {
      return null;
    }

    var texture = createSvgNode('rect');
    texture.setAttribute('data-vtabs-letter-track', 'cover-texture');
    ['x', 'y', 'width', 'height', 'rx', 'ry'].forEach(function (name) {
      var value = cover.getAttribute(name);
      if (value !== null) {
        texture.setAttribute(name, value);
      }
    });
    texture.setAttribute('fill', textureFill);
    texture.setAttribute('pointer-events', 'none');
    texture.setAttribute('aria-hidden', 'true');
    return texture;
  }

  function getPublicRuntimeLetterFontFamily() {
    return isClassicPublicTypographyEnabled()
      ? 'Georgia, "Times New Roman", serif'
      : 'Arial, sans-serif';
  }

  function getLetterTrackAnchors(svg) {
    return Array.prototype.slice
      .call(svg.querySelectorAll('use'))
      .filter(function (node) {
        var href = node.getAttribute('xlink:href') || node.getAttribute('href') || '';
        return (
          href.indexOf('tdo12Outline') !== -1 ||
          href.indexOf('do12Outline') !== -1 ||
          href.indexOf('o12Outline') !== -1 ||
          href.indexOf('tdo6Outline') !== -1 ||
          href.indexOf('do6Outline') !== -1
        );
      })
      .map(function (node) {
        return {
          x: Number(node.getAttribute('x') || 0),
          y: Number(node.getAttribute('y') || 0),
          width: Number(node.getAttribute('width') || 60) || 60,
          height: Number(node.getAttribute('height') || 50) || 50
        };
      })
      .sort(function (left, right) {
        if (left.y !== right.y) {
          return left.y - right.y;
        }
        return left.x - right.x;
      });
  }

  function getUseHref(node) {
    return node.getAttribute('xlink:href') || node.getAttribute('href') || '';
  }

  function getLetterTrackNoteGlyphs(svg) {
    return Array.prototype.slice
      .call(svg.querySelectorAll('use'))
      .filter(function (node) {
        return /^#note_serif_[0-7](?:_s)?$/.test(getUseHref(node));
      })
      .map(function (node) {
        var href = getUseHref(node);
        var bbox = typeof node.getBBox === 'function' ? node.getBBox() : null;
        var x = Number(node.getAttribute('x') || 0);
        var y = Number(node.getAttribute('y') || 0);

        return {
          href: href,
          id: node.getAttribute('id'),
          degree: Number((href.match(/#note_serif_(\\d)/) || [])[1] || -1),
          sourceX: x,
          sourceY: y,
          x: bbox && Number.isFinite(bbox.x) ? bbox.x : x - 6,
          y: bbox && Number.isFinite(bbox.y) ? bbox.y : y - 10,
          width: bbox && Number.isFinite(bbox.width) && bbox.width > 0 ? bbox.width : 12,
          height: bbox && Number.isFinite(bbox.height) && bbox.height > 0 ? bbox.height : 18
        };
      })
      .sort(function (left, right) {
        if (left.y !== right.y) {
          return left.y - right.y;
        }
        return left.x - right.x;
      });
  }

  function getLetterTrackGraceNoteGlyphs(svg) {
    return Array.prototype.slice
      .call(svg.querySelectorAll('use'))
      .filter(function (node) {
        return /^#yiyin_yinfu_[0-7]$/.test(getUseHref(node));
      })
      .map(function (node) {
        var href = getUseHref(node);
        var bbox = typeof node.getBBox === 'function' ? node.getBBox() : null;
        var x = Number(node.getAttribute('x') || 0);
        var y = Number(node.getAttribute('y') || 0);

        return {
          href: href,
          degree: Number((href.match(/#yiyin_yinfu_(\\d)/) || [])[1] || -1),
          sourceX: x,
          sourceY: y,
          x: bbox && Number.isFinite(bbox.x) ? bbox.x : x - 4,
          y: bbox && Number.isFinite(bbox.y) ? bbox.y : y - 7,
          width: bbox && Number.isFinite(bbox.width) && bbox.width > 0 ? bbox.width : 8,
          height: bbox && Number.isFinite(bbox.height) && bbox.height > 0 ? bbox.height : 11
        };
      })
      .sort(function (left, right) {
        if (left.y !== right.y) {
          return left.y - right.y;
        }
        return left.x - right.x;
      });
  }

  function getLetterTrackGlyphMarkers(svg) {
    return Array.prototype.slice
      .call(svg.querySelectorAll('use'))
      .map(function (node) {
        return {
          href: getUseHref(node),
          x: Number(node.getAttribute('x') || 0),
          y: Number(node.getAttribute('y') || 0)
        };
      })
      .filter(function (node) {
        return (
          node.href === '#yingao_gao' ||
          node.href === '#yingao_di' ||
          node.href === '#yiyin_yingao_gao' ||
          node.href === '#yiyin_yingao_di' ||
          node.href === '#yiyin_bianyinfu_sheng' ||
          node.href === '#yiyin_bianyinfu_jiang'
        );
      });
  }

  function formatGlyphLetterName(letter, accidental, octave) {
    if (accidental > 1 || accidental < -1) {
      var midiNumber = getMidiNumberForRuntimeLetter(letter, accidental, octave);
      if (midiNumber !== null) {
        return getRuntimeSharpMidiLabel(midiNumber);
      }
    }

    var accidentalText =
      accidental === 0
        ? ''
        : accidental > 0
          ? '#'.repeat(accidental)
          : 'b'.repeat(Math.abs(accidental));

    return '' + letter + accidentalText + octave;
  }

  function getPitchClassForRuntimeLetter(letter) {
    switch (letter) {
      case 'C':
        return 0;
      case 'D':
        return 2;
      case 'E':
        return 4;
      case 'F':
        return 5;
      case 'G':
        return 7;
      case 'A':
        return 9;
      case 'B':
        return 11;
      default:
        return null;
    }
  }

  function getMidiNumberForRuntimeLetter(letter, accidental, octave) {
    var pitchClass = getPitchClassForRuntimeLetter(letter);
    if (pitchClass === null) {
      return null;
    }
    return (octave + 1) * 12 + pitchClass + accidental;
  }

  function getRuntimeSharpMidiLabel(noteNumber) {
    var noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    var pitchClass = ((noteNumber % 12) + 12) % 12;
    var octave = Math.floor(noteNumber / 12) - 1;
    return noteNames[pitchClass] + octave;
  }

  function mapMpnNodeToLetterLabel(node) {
    if (!node) {
      return null;
    }

    if (Number(node.scale) === 0 || Number(node.noteNumber) === 0) {
      return 'R';
    }

    var noteNumber = Number(node.noteNumber);
    var scaleDegree = Number(node.scale);
    if (
      Array.isArray(letterTrack.scale) &&
      letterTrack.scale.length >= 7 &&
      scaleDegree >= 1 &&
      scaleDegree <= 7
    ) {
      var base = letterTrack.scale[scaleDegree - 1];
      if (base) {
        var accidental = base.accidental + Number(node.accidental || 0);
        var octave = base.octave + Number(node.octave || 0);

        if (Number.isFinite(noteNumber) && noteNumber > 0) {
          var spelledMidi = getMidiNumberForRuntimeLetter(base.letter, accidental, octave);
          if (spelledMidi !== null) {
            while (spelledMidi - noteNumber >= 12) {
              octave -= 1;
              spelledMidi -= 12;
            }
            while (noteNumber - spelledMidi >= 12) {
              octave += 1;
              spelledMidi += 12;
            }
            if (((spelledMidi - noteNumber) % 12 + 12) % 12 !== 0) {
              return getRuntimeSharpMidiLabel(noteNumber);
            }
          }
        }

        return formatGlyphLetterName(base.letter, accidental, octave);
      }
    }

    if (Number.isFinite(noteNumber) && noteNumber > 0) {
      return getRuntimeSharpMidiLabel(noteNumber);
    }

    return null;
  }

  function getRuntimeMpnNoteLabelsById(noteGlyphs) {
    var runtimeNodesById = getRuntimeMpnVisibleNodesById(noteGlyphs);
    if (!runtimeNodesById) {
      return null;
    }

    var labelsById = {};
    Object.keys(runtimeNodesById).forEach(function (id) {
      var label = mapMpnNodeToLetterLabel(runtimeNodesById[id]);
      if (label) {
        labelsById[id] = label;
      }
    });

    return Object.keys(labelsById).length > 0 ? labelsById : null;
  }

  function getRuntimeMpnVisibleNodesById(noteGlyphs) {
    var context =
      window.Kit &&
      window.Kit.context &&
      typeof window.Kit.context.getContext === 'function'
        ? window.Kit.context.getContext()
        : null;
    var tracks = context && context.mpn && Array.isArray(context.mpn.tracks) ? context.mpn.tracks : null;
    if (!tracks || !Array.isArray(noteGlyphs) || noteGlyphs.length === 0) {
      return null;
    }

    var targetIds = {};
    noteGlyphs.forEach(function (glyph) {
      if (glyph && glyph.id) {
        targetIds[glyph.id] = true;
      }
    });

    var trackOrder = tracks.slice().sort(function (left, right) {
      var leftMain = left && left.name === 'main' ? 0 : 1;
      var rightMain = right && right.name === 'main' ? 0 : 1;
      return leftMain - rightMain;
    });
    var nodesById = {};

    trackOrder.forEach(function (track) {
      var nodes = track && Array.isArray(track.nodes) ? track.nodes : [];
      nodes.forEach(function (node) {
        if (!node || !node.id || !targetIds[node.id] || nodesById[node.id]) {
          return;
        }
        nodesById[node.id] = node;
      });
    });

    return Object.keys(nodesById).length > 0 ? nodesById : null;
  }

  function getRuntimeMpnDegreePitchMap(noteGlyphs) {
    var runtimeNodesById = getRuntimeMpnVisibleNodesById(noteGlyphs);
    if (!runtimeNodesById) {
      return null;
    }

    var exact = {};
    var byDegreeAccidental = {};
    Object.keys(runtimeNodesById).forEach(function (id) {
      var node = runtimeNodesById[id];
      var scaleDegree = Number(node && node.scale);
      var noteNumber = Number(node && node.noteNumber);
      if (!(scaleDegree >= 1 && scaleDegree <= 7) || !Number.isFinite(noteNumber) || noteNumber <= 0) {
        return;
      }

      var accidental = Number(node.accidental || 0);
      var octave = Number(node.octave || 0);
      var exactKey = scaleDegree + ':' + accidental + ':' + octave;
      var degreeKey = scaleDegree + ':' + accidental;
      if (!(exactKey in exact)) {
        exact[exactKey] = noteNumber;
      }
      if (!byDegreeAccidental[degreeKey]) {
        byDegreeAccidental[degreeKey] = [];
      }
      byDegreeAccidental[degreeKey].push({
        octave: octave,
        noteNumber: noteNumber
      });
    });

    return Object.keys(exact).length > 0
      ? {
        exact: exact,
        byDegreeAccidental: byDegreeAccidental
      }
      : null;
  }

  function getRuntimeMpnDegreePitchLabel(degree, accidental, octave, pitchMap) {
    if (!pitchMap) {
      return null;
    }

    var exactKey = degree + ':' + accidental + ':' + octave;
    if (exactKey in pitchMap.exact) {
      return getRuntimeSharpMidiLabel(pitchMap.exact[exactKey]);
    }

    var degreeKey = degree + ':' + accidental;
    var samples = pitchMap.byDegreeAccidental[degreeKey];
    var accidentalOffset = 0;
    if ((!Array.isArray(samples) || samples.length === 0) && accidental !== 0) {
      samples = pitchMap.byDegreeAccidental[degree + ':0'];
      accidentalOffset = accidental;
    }
    if (!Array.isArray(samples) || samples.length === 0) {
      return null;
    }

    var nearest = samples
      .slice()
      .sort(function (left, right) {
        return Math.abs(left.octave - octave) - Math.abs(right.octave - octave);
      })[0];
    if (!nearest) {
      return null;
    }

    return getRuntimeSharpMidiLabel(nearest.noteNumber + accidentalOffset + (octave - nearest.octave) * 12);
  }

  function getGlyphMarkerOffsets(glyph, glyphMarkers) {
    var highCount = glyphMarkers.filter(function (marker) {
      return (
        (marker.href === '#yingao_gao' || marker.href === '#yiyin_yingao_gao') &&
        Math.abs(marker.x - glyph.sourceX) <= 3 &&
        marker.y <= glyph.sourceY + 2 &&
        marker.y >= glyph.sourceY - 28
      );
    }).length;
    var lowCount = glyphMarkers.filter(function (marker) {
      return (
        (marker.href === '#yingao_di' || marker.href === '#yiyin_yingao_di') &&
        Math.abs(marker.x - glyph.sourceX) <= 3 &&
        marker.y >= glyph.sourceY - 2 &&
        marker.y <= glyph.sourceY + 20
      );
    }).length;
    var accidentalShift =
      glyphMarkers.filter(function (marker) {
        return (
          marker.href === '#yiyin_bianyinfu_sheng' &&
          marker.x >= glyph.sourceX - 26 &&
          marker.x <= glyph.sourceX - 2 &&
          Math.abs(marker.y - glyph.sourceY) <= 10
        );
      }).length -
      glyphMarkers.filter(function (marker) {
        return (
          marker.href === '#yiyin_bianyinfu_jiang' &&
          marker.x >= glyph.sourceX - 26 &&
          marker.x <= glyph.sourceX - 2 &&
          Math.abs(marker.y - glyph.sourceY) <= 10
        );
      }).length;

    return {
      highCount: highCount,
      lowCount: lowCount,
      accidentalShift: accidentalShift
    };
  }

  function mapGraceGlyphToRuntimeMpnLabel(glyph, glyphMarkers, pitchMap) {
    if (!glyph || !glyphMarkers || !pitchMap || glyph.degree === 0) {
      return null;
    }

    var offsets = getGlyphMarkerOffsets(glyph, glyphMarkers);
    return getRuntimeMpnDegreePitchLabel(
      glyph.degree,
      offsets.accidentalShift,
      offsets.highCount - offsets.lowCount,
      pitchMap
    );
  }

  function getAlignedGlyphTokens(noteGlyphs) {
    // 理想路径：优先用我们自己的 compact notation token 与最终 SVG 音符做顺序对齐。
    // 这样字母谱可以稳定保留 R、升降号、八度信息，而不是只读出 A-G。
    if (!Array.isArray(letterTrack.glyphTokens) || letterTrack.glyphTokens.length === 0) {
      return null;
    }

    var glyphDegrees = noteGlyphs.map(function (glyph) {
      return String(glyph.degree);
    });
    var tokenDegrees = letterTrack.glyphTokens.map(function (token) {
      var match = token && token.match(/[0-7]/);
      return match ? match[0] : '';
    });

    if (glyphDegrees.length === 0 || tokenDegrees.length === 0) {
      return null;
    }

    // 之前这里用的是“从左到右贪心撞 degree”。
    // 对 faded 这类重复 degree 很多、结构又长的旋律，
    // 一次误撞就会把后面的 token 全部吃偏，最后整首歌退回 runtime mpn fallback，
    // 表现成“切换 fingering_index 后字母谱不变”。
    //
    // 这里改成完整的最长公共子序列对齐：
    // - token 序列保留我们自己的休止/升降/八度语义
    // - glyph 序列保留最终 SVG 真正画出来的 note 顺序
    // - 只要 glyph degree 序列确实是 token degree 序列的一个子序列，
    //   就能稳定找回整条映射，不再被局部重复片段带偏
    var dp = new Array(tokenDegrees.length + 1);
    for (var tokenRow = 0; tokenRow <= tokenDegrees.length; tokenRow += 1) {
      dp[tokenRow] = new Uint16Array(glyphDegrees.length + 1);
    }

    for (var tokenIndex = tokenDegrees.length - 1; tokenIndex >= 0; tokenIndex -= 1) {
      for (var glyphIndex = glyphDegrees.length - 1; glyphIndex >= 0; glyphIndex -= 1) {
        if (tokenDegrees[tokenIndex] === glyphDegrees[glyphIndex]) {
          dp[tokenIndex][glyphIndex] = dp[tokenIndex + 1][glyphIndex + 1] + 1;
        } else {
          dp[tokenIndex][glyphIndex] = Math.max(
            dp[tokenIndex + 1][glyphIndex],
            dp[tokenIndex][glyphIndex + 1]
          );
        }
      }
    }

    if (dp[0][0] !== glyphDegrees.length) {
      return null;
    }

    var aligned = [];
    var tokenCursor = 0;
    var glyphCursor = 0;

    while (tokenCursor < tokenDegrees.length && glyphCursor < glyphDegrees.length) {
      if (
        tokenDegrees[tokenCursor] === glyphDegrees[glyphCursor] &&
        dp[tokenCursor][glyphCursor] === dp[tokenCursor + 1][glyphCursor + 1] + 1
      ) {
        aligned.push(letterTrack.glyphTokens[tokenCursor]);
        tokenCursor += 1;
        glyphCursor += 1;
        continue;
      }

      if (dp[tokenCursor + 1][glyphCursor] >= dp[tokenCursor][glyphCursor + 1]) {
        tokenCursor += 1;
      } else {
        glyphCursor += 1;
      }
    }

    return aligned.length === glyphDegrees.length ? aligned : null;
  }

  function mapGlyphTokenToLetterLabel(token) {
    if (!token || !Array.isArray(letterTrack.scale) || letterTrack.scale.length < 7) {
      return null;
    }

    var match = token.match(/^([#bn]?)([0-7])([',dg]*)$/i);
    if (!match) {
      return null;
    }

    if (match[2] === '0') {
      return 'R';
    }

    var base = letterTrack.scale[Number(match[2]) - 1];
    if (!base) {
      return null;
    }

    var accidentalShift = match[1] === '#' ? 1 : match[1] === 'b' ? -1 : 0;
    var octaveMarks = match[3] || '';
    var octaveShift = 0;
    for (var index = 0; index < octaveMarks.length; index += 1) {
      var octaveMark = octaveMarks[index].toLowerCase();
      octaveShift += octaveMark === "'" || octaveMark === 'g' ? 1 : -1;
    }

    return formatGlyphLetterName(
      base.letter,
      base.accidental + accidentalShift,
      base.octave + octaveShift
    );
  }

  function mapGlyphMarkersToLetterLabel(glyph, glyphMarkers) {
    if (!glyph || !glyphMarkers) {
      return null;
    }

    if (glyph.degree === 0) {
      return 'R';
    }

    if (!Array.isArray(letterTrack.scale) || letterTrack.scale.length < 7) {
      return null;
    }

    var base = letterTrack.scale[glyph.degree - 1];
    if (!base) {
      return null;
    }

    var offsets = getGlyphMarkerOffsets(glyph, glyphMarkers);

    return formatGlyphLetterName(
      base.letter,
      base.accidental + offsets.accidentalShift,
      base.octave + offsets.highCount - offsets.lowCount
    );
  }

  function createSvgNode(tagName) {
    return document.createElementNS('http://www.w3.org/2000/svg', tagName);
  }

  function replaceAllText(source, replacements) {
    var next = source;
    replacements.forEach(function (pair) {
      next = next.split(pair[0]).join(pair[1]);
    });
    return next;
  }

  function translateVisibleSheetText(text) {
    if (!text || textMode !== 'english') {
      return text;
    }

    var replacements = [
      ['作曲', 'Composer'],
      ['作词', 'Lyricist'],
      ['編曲', 'Arranger'],
      ['编曲', 'Arranger'],
      ['記譜', 'Notation'],
      ['记谱', 'Notation'],
      ['制谱', 'Notation'],
      ['十二孔陶笛', '12-hole ocarina'],
      ['六孔陶笛', '6-hole ocarina'],
      ['三管陶笛', 'Triple ocarina'],
      ['英式八孔竖笛', 'Recorder (Baroque fingering)'],
      ['德式八孔竖笛', 'Recorder (German fingering)'],
      ['爱尔兰哨笛', 'Tin whistle'],
      ['筒音作低音', 'Tube tone bass '],
      ['筒音作', 'Tube tone '],
      ['八孔埙', '8-hole xun'],
      ['十孔埙', '10-hole xun'],
      ['合埙', 'He-xun'],
      ['八孔箫', '8-hole xiao'],
      ['七孔葫芦丝', '7-hole hulusi'],
      ['九孔葫芦丝', '9-hole hulusi'],
      ['六孔竹笛', '6-hole bamboo flute'],
      ['F调指法', 'F fingering'],
      ['G调指法', 'G fingering'],
      ['C调指法', 'C fingering'],
      ['D调指法', 'D fingering'],
      ['bB调指法', 'Bb fingering'],
      ['♭B调指法', 'Bb fingering'],
      ['bE调指法', 'Eb fingering'],
      ['♭E调指法', 'Eb fingering'],
      ['标准指法', 'Standard fingering'],
      ['易于握持', 'Easy grip'],
      ['吹口在下（推荐）', 'Mouthpiece down (Recommended)'],
      ['吹口在上（推荐）', 'Mouthpiece up (Recommended)'],
      ['吹口在下', 'Mouthpiece down'],
      ['吹口在上', 'Mouthpiece up'],
      ['轻吹', 'Soft blow'],
      ['重吹', 'Strong blow'],
      ['演奏顺序：', 'Play order:'],
      ['演奏顺序', 'Play order'],
      ['前奏', 'Prelude'],
      ['後奏', 'Postlude'],
      ['后奏', 'Postlude'],
      ['間奏', 'Interlude'],
      ['间奏', 'Interlude'],
      ['尾奏', 'Coda'],
      ['省略', 'Omit'],
      ['休止', 'Rest'],
      ['英文版', 'English lyrics version'],
      ['瓦格纳版本', 'Wagner version'],
      ['美国民歌', 'American folk song'],
      ['英国民歌', 'English folk song'],
      ['爱尔兰民歌', 'Irish folk song'],
      ['加拿大民歌', 'Canadian folk song'],
      ['意大利民歌', 'Italian folk song'],
      ['日本民歌', 'Japanese folk song'],
      ['江苏民歌', 'Jiangsu folk song'],
      ['丹麦民歌', 'Danish folk song'],
      ['朝鲜族民歌', 'Korean folk song'],
      ['法国童谣', 'French nursery rhyme'],
      ['英语童谣', 'English nursery rhyme'],
      ['左起', 'Left-start'],
      ['右起', 'Right-start'],
      ['七星', 'Seven-star']
    ];

    var translated = replaceAllText(text, replacements);
    translated = translated
      .replace(/[（(]\\s*Prelude\\s*(\\d+)\\s*小[节節]\\s*[）)]/g, '$1-bar prelude')
      .replace(/[（(]\\s*Postlude\\s*(\\d+)\\s*小[节節]\\s*[）)]/g, '$1-bar postlude')
      .replace(/[（(]\\s*Interlude\\s*(\\d+)\\s*小[节節]\\s*[）)]/g, '$1-bar interlude')
      .replace(/[（(]\\s*Coda\\s*(\\d+)\\s*小[节節]\\s*[）)]/g, '$1-bar coda')
      .replace(/[（(]\\s*Omit\\s*(\\d+)\\s*小[节節]\\s*[）)]/g, '$1-bar omit')
      .replace(/[（(]\\s*Rest\\s*(\\d+)\\s*小[节節]\\s*[）)]/g, '$1-bar rest')
      .replace(/\\((prelude|postlude|interlude|coda|omit|rest)\\s+(\\d+)\\s+measures\\)/gi, function (_, label, count) {
        return count + '-bar ' + String(label).toLowerCase();
      })
      .replace(/[（(]\\s*Prelude\\s*[）)]/g, '(prelude)')
      .replace(/[（(]\\s*Postlude\\s*[）)]/g, '(postlude)')
      .replace(/[（(]\\s*Interlude\\s*[）)]/g, '(interlude)')
      .replace(/[（(]\\s*Coda\\s*[）)]/g, '(coda)')
      .replace(/[（(]\\s*Omit\\s*[）)]/g, '(omit)')
      .replace(/[（(]\\s*Rest\\s*[）)]/g, '(rest)')
      .replace(/\\bocarina\\((12|6) holes\\)\\s*/gi, function (_, holes) {
        return holes + '-hole ocarina ';
      })
      .replace(/\\bbamboo flute\\((6) holes\\)\\s*/gi, function (_, holes) {
        return holes + '-hole bamboo flute ';
      })
      .replace(/\\brecorder\\(baroque 8 holes\\)\\s*/gi, 'Recorder (Baroque fingering) ')
      .replace(/\\brecorder\\(german 8 holes\\)\\s*/gi, 'Recorder (German fingering) ')
      .replace(/\\bxun\\((8|10|11) holes\\)\\s*/gi, function (_, holes) {
        return holes === '11' ? 'He-xun ' : holes + '-hole xun ';
      })
      .replace(/\\bhulusi\\((7|9) holes\\)\\s*/gi, function (_, holes) {
        return holes + '-hole hulusi ';
      })
      .replace(/\\bb([A-G])\\b/g, '$1b');
    translated = translated.replace(
      /([a-z)])(?=(?:Bb|Eb|[A-G]|bE|bB)\\s*fingering\\b)/g,
      '$1 '
    );
    return translated.replace(/\\s{2,}/g, ' ').trim();
  }

  function shouldRelaxVisibleSheetTextWidth(text) {
    if (!text || textMode !== 'english') {
      return false;
    }

    return /(?:Composer|Lyricist|Arranger|Notation|fingering|ocarina|recorder|xun|hulusi|xiao|bamboo flute|prelude|postlude|interlude|coda|omit|rest|measures)/i.test(
      text
    );
  }

  function isVisibleSheetStructureMarkerText(text) {
    if (!text || textMode !== 'english') {
      return false;
    }

    return /(?:\\b\\d+-bar\\s+(?:prelude|postlude|interlude|coda|omit|rest)\\b|\\b(?:prelude|postlude|interlude|coda|omit|rest)\\b)/i.test(
      text
    );
  }

  function shouldHideVisibleSheetText(text) {
    if (!text || textMode !== 'english') {
      return false;
    }

    var normalized = String(text).replace(/\\s+/g, ' ').trim();
    if (!normalized) {
      return false;
    }

    if (/^1\\s*[=＝]\\s*[#b♭]?[A-G]$/i.test(normalized)) {
      return true;
    }

    if (/^\\d+\\s*[\\/／]\\s*\\d+$/.test(normalized)) {
      return true;
    }

    if (/=\\s*\\d+\\b/.test(normalized)) {
      return true;
    }

    return /(?:fingering|ocarina|recorder|tin whistle|xun|hulusi|xiao|bamboo flute)/i.test(
      normalized
    );
  }

  function shouldHideTopHeaderNumericMetadata(node, normalized) {
    if (!node || !normalized || !/^\\d+$/.test(normalized)) {
      return false;
    }

    var showMeasureNum =
      typeof context !== 'undefined' && context && context.show_measure_num
        ? String(context.show_measure_num).toLowerCase()
        : 'off';
    if (showMeasureNum === 'on') {
      return false;
    }

    var x = Number(node.getAttribute('x'));
    var y = Number(node.getAttribute('y'));
    var fontSize = Number(node.getAttribute('font-size') || 0);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return false;
    }

    if (y >= 240) {
      return false;
    }

    return x < 180 || (Number.isFinite(fontSize) && fontSize >= 16);
  }

  function hideTopLeftSheetMetadata(svg) {
    if (!svg || textMode !== 'english') {
      return;
    }

    Array.prototype.slice
      .call(svg.querySelectorAll('text, use'))
      .forEach(function (node) {
        var tagName = node && node.tagName ? String(node.tagName).toLowerCase() : '';
        if (tagName !== 'text' && tagName !== 'use') {
          return;
        }

        var x = Number(node.getAttribute('x'));
        var y = Number(node.getAttribute('y'));
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return;
        }

        var normalized = '';
        var shouldCheckWideTopHeaderNumeric = false;
        if (tagName === 'text') {
          normalized = String(node.textContent || '').replace(/\\s+/g, ' ').trim();
          shouldCheckWideTopHeaderNumeric = shouldHideTopHeaderNumericMetadata(node, normalized);
        }

        if ((x > 280 || y > 220) && !shouldCheckWideTopHeaderNumeric) {
          return;
        }

        var shouldHide = false;
        if (tagName === 'use') {
          var href = getUseHref(node);
          shouldHide =
            /^#diaohao_/.test(href) ||
            /^#paihao_/.test(href) ||
            (/^#shuzi_/.test(href) && x < 180 && y < 170) ||
            href === '#bpm';
        } else {
          shouldHide =
            /(?:fingering|ocarina|recorder|tin whistle|xun|hulusi|xiao|bamboo flute)/i.test(
              normalized
            ) ||
            shouldHideTopHeaderNumericMetadata(node, normalized);
        }

        if (!shouldHide) {
          return;
        }

        node.setAttribute('display', 'none');
        node.setAttribute('aria-hidden', 'true');
        node.setAttribute('data-vtabs-top-left-metadata-hidden', '1');
      });
  }

  function localizeVisibleSheetText(svg) {
    if (!svg || textMode !== 'english') {
      return;
    }

    hideTopLeftSheetMetadata(svg);

    Array.prototype.slice
      .call(svg.querySelectorAll('text'))
      .forEach(function (node) {
        if (node.getAttribute('data-vtabs-top-left-metadata-hidden') === '1') {
          return;
        }
        var original = node.textContent || '';
        var translated = translateVisibleSheetText(original);
        if (shouldHideVisibleSheetText(translated || original)) {
          node.setAttribute('display', 'none');
          node.setAttribute('aria-hidden', 'true');
          return;
        }
        var shouldRelaxWidth = shouldRelaxVisibleSheetTextWidth(translated || original);
        if (!translated || (translated === original && !shouldRelaxWidth)) {
          return;
        }
        if (shouldRelaxWidth) {
          node.removeAttribute('textLength');
          node.removeAttribute('lengthAdjust');
        }
        if (isVisibleSheetStructureMarkerText(translated || original)) {
          var currentFontSize = Number(node.getAttribute('font-size') || 0);
          if (Number.isFinite(currentFontSize) && currentFontSize > 16) {
            node.setAttribute('font-size', '16');
          }
        }
        node.textContent = translated;
      });
  }

  function clearLetterTrack(svg) {
    clearPublicPlaybackLetterHighlightObservers();
    Array.prototype.slice
      .call(svg.querySelectorAll('[data-vtabs-letter-track]'))
      .forEach(function (node) {
        node.remove();
      });

    Array.prototype.slice
      .call(svg.querySelectorAll('[data-vtabs-letter-hidden]'))
      .forEach(function (node) {
        node.removeAttribute('data-vtabs-letter-hidden');
        node.style.opacity = '';
      });
  }

  function clearPublicPlaybackLetterHighlightObservers() {
    while (playbackLetterHighlightObservers.length > 0) {
      var observer = playbackLetterHighlightObservers.pop();
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    }
  }

  function getPublicPlaybackHighlightColor() {
    var body = document.body;
    var isDark = body && body.getAttribute('data-theme') === 'dark';
    return isDark ? '#ffd95edd' : '#c6ff00dd';
  }

  function isPublicPlaybackHighlightedSource(node) {
    if (!node) {
      return false;
    }

    var style = String(node.getAttribute('style') || '');
    return /fill\\s*:\\s*[^;]+/i.test(style) || /stroke\\s*:\\s*[^;]+/i.test(style);
  }

  function syncPublicPlaybackLetterHighlight(item) {
    if (!item || !item.sourceNode || !item.coverNode || !item.labelNode) {
      return;
    }

    var active = isPublicPlaybackHighlightedSource(item.sourceNode);
    if (active) {
      item.coverNode.setAttribute('fill', getPublicPlaybackHighlightColor());
      item.coverNode.setAttribute('fill-opacity', '1');
      item.coverNode.setAttribute('stroke', 'none');
      item.labelNode.setAttribute('fill', '#201910');
      item.labelNode.setAttribute('stroke', '#fff8d9');
      item.labelNode.setAttribute('stroke-width', '3');
    } else {
      item.coverNode.setAttribute('fill', getPublicRuntimeLetterCoverFill());
      item.coverNode.setAttribute('fill-opacity', '0.98');
      item.coverNode.setAttribute('stroke', 'none');
      item.labelNode.setAttribute('fill', getPublicRuntimeLetterFill());
      item.labelNode.setAttribute('stroke', getPublicRuntimeLetterStroke());
      item.labelNode.setAttribute('stroke-width', '2.5');
    }
  }

  function installPublicPlaybackLetterHighlightSync(items) {
    clearPublicPlaybackLetterHighlightObservers();

    if (!hasPublicPlayback || !Array.isArray(items) || items.length === 0) {
      return;
    }

    items.forEach(function (item) {
      if (!item || !item.sourceNode) {
        return;
      }

      var observer = new MutationObserver(function () {
        syncPublicPlaybackLetterHighlight(item);
      });
      observer.observe(item.sourceNode, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      playbackLetterHighlightObservers.push(observer);
      syncPublicPlaybackLetterHighlight(item);
    });
  }

  function getSvgWidth(svg) {
    if (svg && svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width > 0) {
      return svg.viewBox.baseVal.width;
    }

    var widthAttr = Number(svg.getAttribute('width') || 0);
    if (widthAttr > 0) {
      return widthAttr;
    }

    var rect = svg.getBoundingClientRect ? svg.getBoundingClientRect() : null;
    if (rect && rect.width > 0) {
      return rect.width;
    }

    return 600;
  }

  function getLetterTrackRows(anchors) {
    return anchors.reduce(function (rows, anchor) {
      var previousRow = rows[rows.length - 1];
      var rowRight = anchor.x + anchor.width;

      if (previousRow && Math.abs(previousRow.anchorY - anchor.y) < 4) {
        previousRow.minX = Math.min(previousRow.minX, anchor.x);
        previousRow.maxX = Math.max(previousRow.maxX, rowRight);
        return rows;
      }

      rows.push({
        anchorY: anchor.y,
        minX: anchor.x,
        maxX: rowRight
      });
      return rows;
    }, []);
  }

  function getNotationMarkers(svg) {
    return Array.prototype.slice
      .call(svg.querySelectorAll('use'))
      .map(function (node) {
        return {
          href: node.getAttribute('xlink:href') || node.getAttribute('href') || '',
          x: Number(node.getAttribute('x') || 0),
          y: Number(node.getAttribute('y') || 0)
        };
      })
      .filter(function (node) {
        return (
          node.href.indexOf('note_') !== -1 ||
          node.href.indexOf('fudian') !== -1 ||
          node.href.indexOf('huxifu') !== -1 ||
          node.href.indexOf('single_bar') !== -1 ||
          node.href.indexOf('double_bar') !== -1 ||
          node.href.indexOf('repeat_') !== -1
        );
      });
  }

  function getLetterTrackBreathMarks(svg) {
    return Array.prototype.slice
      .call(svg.querySelectorAll('use'))
      .map(function (node) {
        return {
          href: getUseHref(node),
          x: Number(node.getAttribute('x') || 0),
          y: Number(node.getAttribute('y') || 0)
        };
      })
      .filter(function (node) {
        return node.href === '#huxifu';
      });
  }

  function hideLetterModeJianpuOnlyMarks(svg) {
    Array.prototype.slice
      .call(svg.querySelectorAll('use'))
      .forEach(function (node) {
        var href = getUseHref(node);
        if (
          /^#note_serif_[0-7](?:_s)?$/.test(href) ||
          /^#yiyin_yinfu_[0-7]$/.test(href) ||
          href === '#yingao_gao' ||
          href === '#yingao_di' ||
          href === '#yiyin_yingao_gao' ||
          href === '#yiyin_yingao_di' ||
          href === '#fudian' ||
          href === '#huxifu' ||
          href === '#accidental_flat' ||
          href === '#accidental_sharp' ||
          href === '#accidental_nature' ||
          href === '#accidental_x' ||
          href === '#yiyin_bianyinfu_jiang' ||
          href === '#yiyin_bianyinfu_sheng'
        ) {
          node.setAttribute('data-vtabs-letter-hidden', '1');
          node.style.opacity = '0';
        }
      });

    Array.prototype.slice
      .call(svg.querySelectorAll('line'))
      .forEach(function (node) {
        var y1 = Number(node.getAttribute('y1') || 0);
        var y2 = Number(node.getAttribute('y2') || 0);
        var strokeWidth = Number(node.getAttribute('stroke-width') || 0);

        if (strokeWidth === 2 && Math.abs(y1 - y2) < 0.2) {
          node.setAttribute('data-vtabs-letter-hidden', '1');
          node.style.opacity = '0';
        }
      });
  }

  function getLetterTrackRowMetrics(svg, anchors) {
    var notationMarkers = getNotationMarkers(svg);

    return getLetterTrackRows(anchors).map(function (row) {
      var rowMarkers = notationMarkers.filter(function (marker) {
        var delta = marker.y - row.anchorY;
        return delta >= 40 && delta <= 110;
      });
      var notationY = rowMarkers.length
        ? Math.min.apply(
            null,
            rowMarkers.map(function (marker) {
              return marker.y;
            })
          )
        : row.anchorY + 62;
      var notationBottom = rowMarkers.length
        ? Math.max.apply(
            null,
            rowMarkers.map(function (marker) {
              return marker.y;
            })
          )
        : notationY + 22;

      return {
        anchorY: row.anchorY,
        minX: row.minX,
        maxX: row.maxX,
        notationY: notationY,
        notationBottom: notationBottom
      };
    });
  }

  function renderLetterTrack() {
    var svg = getSheetSvg();
    if (!svg) {
      return false;
    }

    annotateSheetSvgAccessibility(svg);
    applyPublicRuntimeVisualTheme(svg);
    localizeVisibleSheetText(svg);
    clearPublicPlaybackLetterHighlightObservers();

    if (!letterTrack || letterTrack.mode === 'number') {
      setSheetPending(false);
      return true;
    }

    clearLetterTrack(svg);
    var anchors = getLetterTrackAnchors(svg);
    var noteGlyphs = getLetterTrackNoteGlyphs(svg);
    var needsLabels = letterTrack.mode === 'letter';
    var positionNodes = letterTrack.mode === 'letter' ? noteGlyphs : anchors;
    if (
      positionNodes.length === 0 ||
      (letterTrack.mode !== 'letter' &&
        needsLabels &&
        (!Array.isArray(letterTrack.anchorLabels) || positionNodes.length !== letterTrack.anchorLabels.length))
    ) {
      if (!letterTrackWarned) {
        console.warn('Skipped letter track because note anchors did not line up.', {
          expected: Array.isArray(letterTrack.anchorLabels) ? letterTrack.anchorLabels.length : 0,
          actual: positionNodes.length,
          songId: songId
        });
        letterTrackWarned = true;
      }
      setSheetPending(false);
      return true;
    }

    var rows = getLetterTrackRowMetrics(svg, anchors);
    var layer = createSvgNode('g');
    layer.setAttribute('data-vtabs-letter-track', 'layer');
    layer.setAttribute('pointer-events', 'none');

    if (letterTrack.mode === 'graph') {
      var svgWidth = getSvgWidth(svg);
      var coverX = 24;
      var coverWidth = Math.max(svgWidth - coverX * 2, 120);

      rows.forEach(function (row) {
        var cover = createSvgNode('rect');
        cover.setAttribute('data-vtabs-letter-track', 'cover');
        cover.setAttribute('x', String(coverX));
        cover.setAttribute('y', String(row.notationY - 4));
        cover.setAttribute('width', String(coverWidth));
        cover.setAttribute(
          'height',
          String(Math.max(54, row.notationBottom - row.notationY + 24))
        );
        cover.setAttribute('rx', '8');
        cover.setAttribute('fill', getPublicRuntimeLetterCoverFill());
        cover.setAttribute('fill-opacity', '1');
        layer.appendChild(cover);
        var texture = createPublicRuntimeLetterCoverTexture(cover);
        if (texture) {
          layer.appendChild(texture);
        }
      });
    }

    if (letterTrack.mode === 'letter') {
      hideLetterModeJianpuOnlyMarks(svg);
      var breathMarks = getLetterTrackBreathMarks(svg);
      var alignedGlyphTokens = getAlignedGlyphTokens(noteGlyphs);
      var runtimeGlyphMarkers = getLetterTrackGlyphMarkers(svg);
      var glyphMarkers = alignedGlyphTokens ? null : runtimeGlyphMarkers;
      var graceNoteGlyphs = getLetterTrackGraceNoteGlyphs(svg);
      var graceGlyphMarkers = graceNoteGlyphs.length > 0 ? runtimeGlyphMarkers : null;
      var letterCovers = [];
      var letterCoverTextures = [];
      var letterLabels = [];
      var playbackHighlightItems = [];
      var runtimeNoteLabelsById = getRuntimeMpnNoteLabelsById(noteGlyphs);
      var runtimeDegreePitchMap = getRuntimeMpnDegreePitchMap(noteGlyphs);
      noteGlyphs.forEach(function (glyph, index) {
        var label = alignedGlyphTokens
          ? mapGlyphTokenToLetterLabel(alignedGlyphTokens[index])
          : null;

        if (!label && glyphMarkers) {
          label = mapGlyphMarkersToLetterLabel(glyph, glyphMarkers);
        }

        if (!label && runtimeGlyphMarkers) {
          label = mapGraceGlyphToRuntimeMpnLabel(glyph, runtimeGlyphMarkers, runtimeDegreePitchMap);
        }

        if (!label && glyph.id && runtimeNoteLabelsById) {
          label = runtimeNoteLabelsById[glyph.id];
        }

        if (!label) {
          return;
        }

        var cover = createSvgNode('rect');
        cover.setAttribute('data-vtabs-letter-track', 'cover');
        cover.setAttribute('x', String(glyph.x - 3));
        cover.setAttribute('y', String(glyph.y - 2));
        cover.setAttribute('width', String(Math.max(18, glyph.width + 6)));
        cover.setAttribute('height', String(Math.max(20, glyph.height + 4)));
        cover.setAttribute('rx', '3');
        cover.setAttribute('fill', getPublicRuntimeLetterCoverFill());
        cover.setAttribute('fill-opacity', '0.98');
        letterCovers.push(cover);
        var coverTexture = createPublicRuntimeLetterCoverTexture(cover);
        if (coverTexture) {
          letterCoverTextures.push(coverTexture);
        }

        var text = createSvgNode('text');
        text.setAttribute('data-vtabs-letter-track', 'label');
        text.setAttribute('x', String(glyph.x + glyph.width / 2));
        text.setAttribute('y', String(glyph.y + glyph.height - 0.5));
        text.setAttribute('fill', getPublicRuntimeLetterFill());
        text.setAttribute('font-size', label === 'R' ? '15' : label.length >= 4 ? '11' : '13');
        text.setAttribute('font-weight', '700');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-family', getPublicRuntimeLetterFontFamily());
        text.setAttribute('paint-order', 'stroke fill');
        text.setAttribute('stroke', getPublicRuntimeLetterStroke());
        text.setAttribute('stroke-width', '2.5');
        text.setAttribute('stroke-linejoin', 'round');
        text.textContent = label;
        letterLabels.push(text);

        if (glyph.id) {
          playbackHighlightItems.push({
            sourceNode: document.getElementById(glyph.id),
            coverNode: cover,
            labelNode: text
          });
        }
      });

      graceNoteGlyphs.forEach(function (glyph) {
        var label = mapGlyphMarkersToLetterLabel(glyph, graceGlyphMarkers);
        if (!label) {
          return;
        }

        var cover = createSvgNode('rect');
        cover.setAttribute('data-vtabs-letter-track', 'cover');
        cover.setAttribute('x', String(glyph.x - 5));
        cover.setAttribute('y', String(glyph.y - 4));
        cover.setAttribute('width', String(Math.max(label.length >= 3 ? 20 : 17, glyph.width + 10)));
        cover.setAttribute('height', String(Math.max(25, glyph.height + 16)));
        cover.setAttribute('rx', '2');
        cover.setAttribute('fill', getPublicRuntimeLetterCoverFill());
        cover.setAttribute('fill-opacity', '0.98');
        letterCovers.push(cover);
        var graceCoverTexture = createPublicRuntimeLetterCoverTexture(cover);
        if (graceCoverTexture) {
          letterCoverTextures.push(graceCoverTexture);
        }

        var text = createSvgNode('text');
        text.setAttribute('data-vtabs-letter-track', 'label');
        text.setAttribute('data-vtabs-letter-track-kind', 'grace');
        text.setAttribute('x', String(glyph.x + glyph.width / 2));
        text.setAttribute('y', String(glyph.y + glyph.height + 1.5));
        text.setAttribute('fill', getPublicRuntimeLetterFill());
        text.setAttribute('font-size', label.length >= 3 ? '8' : '9');
        text.setAttribute('font-weight', '700');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-family', getPublicRuntimeLetterFontFamily());
        text.setAttribute('paint-order', 'stroke fill');
        text.setAttribute('stroke', getPublicRuntimeLetterStroke());
        text.setAttribute('stroke-width', '2');
        text.setAttribute('stroke-linejoin', 'round');
        text.textContent = label;
        letterLabels.push(text);
      });

      letterCovers.forEach(function (cover) {
        layer.appendChild(cover);
      });
      letterCoverTextures.forEach(function (texture) {
        layer.appendChild(texture);
      });
      letterLabels.forEach(function (text) {
        layer.appendChild(text);
      });

      installPublicPlaybackLetterHighlightSync(playbackHighlightItems);

      breathMarks.forEach(function (breath) {
        var mark = createSvgNode('text');
        mark.setAttribute('data-vtabs-letter-track', 'breath');
        mark.setAttribute('x', String(breath.x + 1));
        mark.setAttribute('y', String(breath.y - 11));
        mark.setAttribute('fill', getPublicRuntimeLetterFill());
        mark.setAttribute('font-size', '18');
        mark.setAttribute('font-style', 'italic');
        mark.setAttribute('font-weight', '700');
        mark.setAttribute('text-anchor', 'middle');
        mark.setAttribute('font-family', getPublicRuntimeLetterFontFamily());
        mark.textContent = ',';
        layer.appendChild(mark);
      });

      svg.appendChild(layer);
      setSheetPending(false);
      return true;
    }

    svg.appendChild(layer);
    setSheetPending(false);
    return true;
  }
`
}
