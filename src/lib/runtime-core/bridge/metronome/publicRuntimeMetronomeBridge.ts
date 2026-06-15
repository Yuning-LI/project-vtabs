const PUBLIC_RUNTIME_METRONOME_BRIDGE_CONFIG = {
  ids: {
    beat: 'metronome-beat',
    bpm: 'metronome-bpm',
    modal: 'metronome-modal',
    playButton: 'metronome-play',
    sheet: 'sheet',
    timeSignature: 'metronome-time-signature'
  },
  selectors: {
    archivedPlayWrapper: '.center-align',
    content: '.modal-content',
    inputField: '.input-field',
    row: '.row',
    timeSignatureLabel: 'label[for="metronome-time-signature"]'
  },
  attributes: {
    docked: 'data-vtabs-public-docked',
    publicMetronome: 'data-vtabs-public-metronome'
  },
  classes: {
    action: 'vtabs-public-metronome-action',
    beat: 'vtabs-public-metronome-chip',
    field: 'vtabs-public-metronome-field',
    title: 'vtabs-public-metronome-title',
    toolbar: 'vtabs-public-metronome-toolbar'
  }
} as const

const PUBLIC_RUNTIME_METRONOME_BPM_LABELS = {
  '40': '40 Grave',
  '46': '46 Largo',
  '56': '56 Adagio',
  '60': '60 Larghetto',
  '66': '66 Andante',
  '69': '69 Andantino',
  '88': '88 Moderato',
  '108': '108 Allegretto',
  '132': '132 Allegro',
  '160': '160 Vivace',
  '184': '184 Presto',
  '208': '208 Prestissimo'
} as const

export function buildPublicRuntimeMetronomeBridgeScript() {
  return `
  var publicMetronomeBridgeConfig = ${JSON.stringify(PUBLIC_RUNTIME_METRONOME_BRIDGE_CONFIG)};
  var publicMetronomeBpmLabels = ${JSON.stringify(PUBLIC_RUNTIME_METRONOME_BPM_LABELS)};

  function syncPublicMetronomeButtonLabel() {
    var playButton = document.getElementById(publicMetronomeBridgeConfig.ids.playButton);
    if (!playButton) {
      return;
    }

    if (window.Metronome && window.Metronome.tick >= 0) {
      playButton.textContent = 'Stop';
      return;
    }

    playButton.textContent = 'Start';
  }

  function setPublicMetronomeBeat(value) {
    var beat = document.getElementById(publicMetronomeBridgeConfig.ids.beat);
    if (!beat) {
      return;
    }

    beat.textContent = value ? String(value) : '';
  }

  function localizePublicMetronome() {
    if (!hasPublicMetronome || textMode !== 'english') {
      return;
    }

    var timeSignatureLabel = document.querySelector(publicMetronomeBridgeConfig.selectors.timeSignatureLabel);
    if (timeSignatureLabel) {
      timeSignatureLabel.textContent = 'Time Signature';
    }

    Array.prototype.slice
      .call(document.querySelectorAll('#' + publicMetronomeBridgeConfig.ids.bpm + ' option'))
      .forEach(function (option) {
        var value = option.getAttribute('value') || '';
        if (publicMetronomeBpmLabels[value]) {
          option.textContent = publicMetronomeBpmLabels[value];
        }
      });

    syncPublicMetronomeButtonLabel();
  }

  function findMetronomeField(content, inputId) {
    return (
      Array.prototype.slice
        .call(content.querySelectorAll(publicMetronomeBridgeConfig.selectors.inputField))
        .find(function (node) {
          return Boolean(node.querySelector('#' + inputId));
        }) || null
    );
  }

  function showPublicMetronomeModal(modal) {
    modal.style.display = 'block';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.removeAttribute('aria-hidden');
  }

  function mountPublicMetronomePanel() {
    if (!hasPublicMetronome) {
      return;
    }

    var modal = document.getElementById(publicMetronomeBridgeConfig.ids.modal);
    var sheet = document.getElementById(publicMetronomeBridgeConfig.ids.sheet);
    if (!modal || !sheet || !sheet.parentNode) {
      return;
    }

    showPublicMetronomeModal(modal);

    if (!modal.getAttribute(publicMetronomeBridgeConfig.attributes.docked)) {
      modal.setAttribute(publicMetronomeBridgeConfig.attributes.docked, '1');
      sheet.parentNode.insertBefore(modal, sheet);

      var content = modal.querySelector(publicMetronomeBridgeConfig.selectors.content);
      if (content) {
        var timeSignatureField = findMetronomeField(content, publicMetronomeBridgeConfig.ids.timeSignature);
        var bpmField = findMetronomeField(content, publicMetronomeBridgeConfig.ids.bpm);
        var playButton = content.querySelector('#' + publicMetronomeBridgeConfig.ids.playButton);
        if (timeSignatureField) {
          timeSignatureField.classList.add(publicMetronomeBridgeConfig.classes.field);
        }
        if (bpmField) {
          bpmField.classList.add(publicMetronomeBridgeConfig.classes.field);
        }

        var toolbar = document.createElement('div');
        toolbar.className = publicMetronomeBridgeConfig.classes.toolbar;

        var title = document.createElement('div');
        title.className = publicMetronomeBridgeConfig.classes.title;

        var titleText = document.createElement('h2');
        titleText.textContent = 'Metronome';
        title.appendChild(titleText);

        var beat = document.createElement('p');
        beat.id = publicMetronomeBridgeConfig.ids.beat;
        beat.className = publicMetronomeBridgeConfig.classes.beat;
        beat.setAttribute('aria-live', 'polite');
        title.appendChild(beat);

        toolbar.appendChild(title);

        if (timeSignatureField) {
          toolbar.appendChild(timeSignatureField);
        }

        if (bpmField) {
          toolbar.appendChild(bpmField);
        }

        if (playButton) {
          var playAction = document.createElement('div');
          playAction.className = publicMetronomeBridgeConfig.classes.action;
          playAction.appendChild(playButton);
          toolbar.appendChild(playAction);
        }

        var archivedBeat = content.querySelector('#' + publicMetronomeBridgeConfig.ids.beat);
        if (archivedBeat && archivedBeat !== beat) {
          archivedBeat.remove();
        }

        var row = content.querySelector(publicMetronomeBridgeConfig.selectors.row);
        if (row) {
          row.remove();
        }

        var archivedPlayWrapper = content.querySelector(publicMetronomeBridgeConfig.selectors.archivedPlayWrapper);
        if (archivedPlayWrapper) {
          archivedPlayWrapper.remove();
        }

        content.insertBefore(toolbar, content.firstChild);
      }
    }

    document.documentElement.setAttribute(publicMetronomeBridgeConfig.attributes.publicMetronome, '1');
    localizePublicMetronome();

    if (window.Metronome) {
      window.Metronome.onstart = function () {
        syncPublicMetronomeButtonLabel();
      };
      window.Metronome.onstop = function () {
        setPublicMetronomeBeat('');
        syncPublicMetronomeButtonLabel();
      };
      window.Metronome.onbeat = function (value) {
        setPublicMetronomeBeat(value);
      };
      syncPublicMetronomeButtonLabel();
    }
  }
`
}
