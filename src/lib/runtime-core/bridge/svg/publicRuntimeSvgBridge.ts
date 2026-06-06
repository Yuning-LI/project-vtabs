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
      item.coverNode.setAttribute('fill', '#ffffff');
      item.coverNode.setAttribute('fill-opacity', '0.98');
      item.coverNode.setAttribute('stroke', 'none');
      item.labelNode.setAttribute('fill', '#7a5331');
      item.labelNode.setAttribute('stroke', '#ffffff');
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
        cover.setAttribute('fill', '#ffffff');
        cover.setAttribute('fill-opacity', '1');
        layer.appendChild(cover);
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
        cover.setAttribute('fill', '#ffffff');
        cover.setAttribute('fill-opacity', '0.98');
        letterCovers.push(cover);

        var text = createSvgNode('text');
        text.setAttribute('data-vtabs-letter-track', 'label');
        text.setAttribute('x', String(glyph.x + glyph.width / 2));
        text.setAttribute('y', String(glyph.y + glyph.height - 0.5));
        text.setAttribute('fill', '#7a5331');
        text.setAttribute('font-size', label === 'R' ? '15' : label.length >= 4 ? '11' : '13');
        text.setAttribute('font-weight', '700');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('paint-order', 'stroke fill');
        text.setAttribute('stroke', '#ffffff');
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
        cover.setAttribute('fill', '#ffffff');
        cover.setAttribute('fill-opacity', '0.98');
        letterCovers.push(cover);

        var text = createSvgNode('text');
        text.setAttribute('data-vtabs-letter-track', 'label');
        text.setAttribute('data-vtabs-letter-track-kind', 'grace');
        text.setAttribute('x', String(glyph.x + glyph.width / 2));
        text.setAttribute('y', String(glyph.y + glyph.height + 1.5));
        text.setAttribute('fill', '#7a5331');
        text.setAttribute('font-size', label.length >= 3 ? '8' : '9');
        text.setAttribute('font-weight', '700');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('paint-order', 'stroke fill');
        text.setAttribute('stroke', '#ffffff');
        text.setAttribute('stroke-width', '2');
        text.setAttribute('stroke-linejoin', 'round');
        text.textContent = label;
        letterLabels.push(text);
      });

      letterCovers.forEach(function (cover) {
        layer.appendChild(cover);
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
        mark.setAttribute('fill', '#7a5331');
        mark.setAttribute('font-size', '18');
        mark.setAttribute('font-style', 'italic');
        mark.setAttribute('font-weight', '700');
        mark.setAttribute('text-anchor', 'middle');
        mark.setAttribute('font-family', 'Arial, sans-serif');
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
