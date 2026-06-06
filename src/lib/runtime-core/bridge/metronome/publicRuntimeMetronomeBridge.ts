export function buildPublicRuntimeMetronomeBridgeScript() {
  return `
  function syncPublicMetronomeButtonLabel() {
    var playButton = document.getElementById('metronome-play');
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
    var beat = document.getElementById('metronome-beat');
    if (!beat) {
      return;
    }

    beat.textContent = value ? String(value) : '';
  }

  function localizePublicMetronome() {
    if (!hasPublicMetronome || textMode !== 'english') {
      return;
    }

    var timeSignatureLabel = document.querySelector('label[for="metronome-time-signature"]');
    if (timeSignatureLabel) {
      timeSignatureLabel.textContent = 'Time Signature';
    }

    var bpmOptions = {
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
    };
    Array.prototype.slice
      .call(document.querySelectorAll('#metronome-bpm option'))
      .forEach(function (option) {
        var value = option.getAttribute('value') || '';
        if (bpmOptions[value]) {
          option.textContent = bpmOptions[value];
        }
      });

    syncPublicMetronomeButtonLabel();
  }

  function findMetronomeField(content, inputId) {
    return (
      Array.prototype.slice
        .call(content.querySelectorAll('.input-field'))
        .find(function (node) {
          return Boolean(node.querySelector('#' + inputId));
        }) || null
    );
  }

  function mountPublicMetronomePanel() {
    if (!hasPublicMetronome) {
      return;
    }

    var modal = document.getElementById('metronome-modal');
    var sheet = document.getElementById('sheet');
    if (!modal || !sheet || !sheet.parentNode) {
      return;
    }

    if (!modal.getAttribute('data-vtabs-public-docked')) {
      modal.setAttribute('data-vtabs-public-docked', '1');
      sheet.parentNode.insertBefore(modal, sheet);

      var content = modal.querySelector('.modal-content');
      if (content) {
        var timeSignatureField = findMetronomeField(content, 'metronome-time-signature');
        var bpmField = findMetronomeField(content, 'metronome-bpm');
        var playButton = content.querySelector('#metronome-play');
        if (timeSignatureField) {
          timeSignatureField.classList.add('vtabs-public-metronome-field');
        }
        if (bpmField) {
          bpmField.classList.add('vtabs-public-metronome-field');
        }

        var toolbar = document.createElement('div');
        toolbar.className = 'vtabs-public-metronome-toolbar';

        var title = document.createElement('div');
        title.className = 'vtabs-public-metronome-title';

        var titleText = document.createElement('h2');
        titleText.textContent = 'Metronome';
        title.appendChild(titleText);

        var beat = document.createElement('p');
        beat.id = 'metronome-beat';
        beat.className = 'vtabs-public-metronome-chip';
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
          playAction.className = 'vtabs-public-metronome-action';
          playAction.appendChild(playButton);
          toolbar.appendChild(playAction);
        }

        var archivedBeat = content.querySelector('#metronome-beat');
        if (archivedBeat && archivedBeat !== beat) {
          archivedBeat.remove();
        }

        var row = content.querySelector('.row');
        if (row) {
          row.remove();
        }

        var archivedPlayWrapper = content.querySelector('.center-align');
        if (archivedPlayWrapper) {
          archivedPlayWrapper.remove();
        }

        content.insertBefore(toolbar, content.firstChild);
      }
    }

    document.documentElement.setAttribute('data-vtabs-public-metronome', '1');
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
