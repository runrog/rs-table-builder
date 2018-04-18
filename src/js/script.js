/* global document $ Quill localStorage FileReader window Blob */

const rsTableBuilder = {
  globals: {
    name: $('input[name="save-table-name"]'),
    saveDownload: $('.save-download'),
    saveBar: $('.save-table-area'),
    addRow: $('#add-row'),
    addCol: $('#add-col'),
    output: $('.save-table-btn'),
    clear: $('.clear-table-btn'),
  },
  empty: {
    name: '',
    id: false,
    headers: [{ title: 'Header' }, { title: 'Header' }],
    rows: [
      {
        cols: [
          {
            content: false,
          },
          {
            content: false,
          },
        ],
      },
      {
        cols: [
          {
            content: false,
          },
          {
            content: false,
          },
        ],
      },
    ],
  },
  config: {},
  clearTable($t) {
    return $t.html('');
  },
  makeDroppable($t) {
    let type;
    document.addEventListener('drag', (e) => {
      if (e.srcElement.tagName === 'BUTTON') {
        type = $(e.target).attr('type');
      }
    });
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      let target = e.target;
      if (!target.classList.contains('droptarget')) {
        target = $(target).closest('.droptarget').get(0);
      }
      // only allow featured titles to go into the first col
      if (type === 'title' && $(target).attr('data-td-index') === '0' && target && target.classList.contains('droptarget')) {
        this.onDrop(target, type, $t);
      } else if (type !== 'title' && target && target.classList.contains('droptarget')) {
        this.onDrop(target, type, $t);
      }
    });
  },
  onDrop(target, type, $t) {
    const $tr = parseInt($(target).attr('data-tr-index'), 10);
    const $td = parseInt($(target).attr('data-td-index'), 10);
    let content = false;
    if (type.match(/gen-text/gi)) {
      content = '<span data-inline-text="true">Click me to edit text.<span>';
    }
    if (type.match(/check/gi)) {
      content = 'offered';
    }
    if (type.match(/times/gi)) {
      content = 'notOffered';
    }
    if (type.match(/title/gi)) {
      content = '<p data-feat-title="true">Feature Title</p>';
    }
    this.config.rows[$tr].cols[$td].content = content;
    this.saveLocal();
    this.renderTable($t, true);
  },
  renderTable($t, $editor) {
    // reset table first
    this.clearTable($t);
    this.globals.name.val(this.config.name);
    const id = !this.config.id ? this.uuid() : this.config.id;
    // start the build
    let $table = `<table class="productTable" id="rs-table-${id}">`;
    // table headers
    if (this.config.headers.length > 0) {
      $table += `
        <thead class="productTable-header">
          <tr class="productTable-row">`;

      $.each(this.config.headers, (i, h) => {
        const title = $editor ? `<span contenteditable="true">${h.title}</span>` : h.title;
        const rmBtn = $editor ? `<button data-index="${i}" class="remove-col"></button>` : '';
        const attrs = $editor ? ` data-th-index="${i}"` : '';
        const style = $editor ? ' style="position:relative;"' : '';
        $table += `<th class="productTable-name"${style}${attrs}>${title}${rmBtn}</th>`;
      });

      $table += `
          </tr>
        </thead>`;
    }
    // table body
    if (this.config.rows.length > 0) {
      $table += '<tbody">';

      const zIndexes = Array.from({ length: this.config.rows.length }).map((x, i) => i).reverse();

      $.each(this.config.rows, (i, r) => {
        const rowStyle = $editor ? ` style="z-index:${zIndexes[i]};"` : '';
        $table += `<tr class="productTable-row"${rowStyle}>`;
        // loop through row columns
        if (r.cols.length > 0) {
          $.each(r.cols, (x, c) => {
            let content = '';
            let checkClass = 'productTable-feature';
            if (c.content) {
              if (c.content === 'offered' || c.content === 'notOffered') {
                checkClass = `${checkClass}Item ${c.content}`;
              } else {
                content = c.content;
                if (!content.match(/data-feat-title="true"/gi)) {
                  checkClass = `${checkClass}Item`;
                } else {
                  content = $editor ? `<span contenteditable="true">${content}</span>` : content;
                }
              }
              if (!$editor) {
                // strip out editor attrs for output
                content = content.replace(/ data-feat-title="true"/gi, '');
                content = content.replace(/ data-inline-text="true"/gi, '');
                content = content.replace(/ contenteditable="true"/gi, '');
              }
            } else {
              content = $editor ? '<span class="drop-hint">drop item here</span>' : '';
            }
            const style = $editor ? ` style="position:relative;z-index:${zIndexes[i]};"` : '';
            const attrs = $editor ? `data-tr-index="${i}" data-td-index="${x}"` : '';
            const dropCls = $editor ? ' droptarget' : '';
            // if last col in row, put remove button
            const rmBtn = ($editor && x === r.cols.length - 1) ? `<button data-index="${i}" class="remove-row"></button>` : '';
            $table += `<td ${attrs} class="${checkClass}${dropCls}"${style}>${content}${rmBtn}</td>`;
          });
        }
        $table += '</tr>';
      });

      $table += '</tbody>';
    }
    $table += '</table>';
    // add any needed css overrides
    const inlineTableStyling = `
      <style type="text/css">
        table#rs-table-${id} tbody tr td {
          width: unset;
        }
      </style>
    `;
    $t.html(`${inlineTableStyling}${$table}`);
    if (!$editor) {
      this.output = `${inlineTableStyling}${$table}`;
    }
    this.packageForSave();
    // bind editor events post DOM insertion --------------------------------------------
    if ($editor) {
      // removing row clicks
      $t.find('tbody tr .remove-row').click((e) => {
        this.removeRow(e, $t);
      });
      // removing column clicks
      $t.find('thead tr .remove-col').click((e) => {
        this.removeColumn(e, $t);
      });
      // inline text editing
      $t.find('tbody tr td').each(function findTexts() {
        const $feat = $(this).find('p[data-feat-title="true"]');
        if ($feat.length) {
          $feat.parent('span[contenteditable="true"]').on('focusout', () => {
            console.log('save feature text'); // eslint-disable-line
            // console.log($feat.text());
            rsTableBuilder.updateFeat($t, $(this), $feat);
          });
        }
        const $text = $(this).find('span');
        if ($text.length && $text.attr('data-inline-text')) {
          const toolbar = [
            ['bold', 'italic', 'underline'],
            ['image'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ script: 'sub' }, { script: 'super' }],
            [{ align: [] }],
          ];
          const quill = new Quill($text.get(0), { // eslint-disable-line
            modules: { toolbar },
            theme: 'bubble',
          });
          $text.on('focusout', () => {
            console.log('save text'); // eslint-disable-line
            rsTableBuilder.updateText($t, $(this));
          });
        }
      });
      // add bg helpers when hovering over a column header
      $t.find('thead th').each(function h() {
        const $h = $(this);
        // attach contenteditable titles
        $h.find('span[contenteditable="true"]').on('focusout', (e) => {
          rsTableBuilder.updateHeader($t, $h, e.target);
        });
        $h.hover(() => {
          $t.find('tbody tr').each(function a() {
            $(this).find('td').eq($h.index()).addClass('hover-col');
          });
        }, () => {
          $t.find('tbody tr').each(function a() {
            $(this).find('td').eq($h.index()).removeClass('hover-col');
          });
        });
      });
    }
    // bind table plugin from zoolander
    $t.find('table.productTable').responsiveTable();
  },
  updateText($t, $text) {
    const $tr = parseInt($text.attr('data-tr-index'), 10);
    const $td = parseInt($text.attr('data-td-index'), 10);
    // format contenteditable input then save
    const $formatted = $text.find('span > .ql-editor').html();
    this.config.rows[$tr].cols[$td].content = `<span data-inline-text="true">${$formatted}</span>`;
    this.saveLocal();
    this.renderTable($t, true);
  },
  updateHeader($t, $h, val) {
    const $th = parseInt($h.attr('data-th-index'), 10);
    const v = $(val).text();
    this.config.headers[$th].title = v;
    this.saveLocal();
    this.renderTable($t, true);
  },
  updateFeat($t, $el, val) {
    const $tr = parseInt($el.attr('data-tr-index'), 10);
    const $td = parseInt($el.attr('data-td-index'), 10);
    const v = $(val).text();
    this.config.rows[$tr].cols[$td].content = `<p data-feat-title="true">${v}</p>`;
    this.saveLocal();
    this.renderTable($t, true);
  },
  addRow($t) {
    // count the headers and make that many cols
    const times = this.config.headers.length;
    const cols = [];
    for (let i = 0; i < times; i += 1) {
      cols.push({ content: false });
    }
    this.config.rows.push({ cols });
    this.saveLocal();
    this.renderTable($t, true);
  },
  removeRow(e, $t) {
    const i = parseInt($(e.target).attr('data-index'), 10);
    this.config.rows.splice(i, 1);
    this.saveLocal();
    this.renderTable($t, true);
  },
  addColumn($t) {
    // append header to headers
    this.config.headers.push({ title: 'Header' });
    // loop body rows and append new col to each
    $.each(this.config.rows, (i, r) => {
      r.cols.push({ content: false });
    });
    this.saveLocal();
    this.renderTable($t, true);
  },
  removeColumn(e, $t) {
    const i = parseInt($(e.target).attr('data-index'), 10);
    // remove from header
    this.config.headers.splice(i, 1);
    // remove that same col in each row
    $.each(this.config.rows, (x, r) => {
      r.cols.splice(i, 1);
    });
    this.saveLocal();
    this.renderTable($t, true);
  },
  uuid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  },
  saveLocal() {
    localStorage.setItem('SAVED_TABLE', JSON.stringify(this.config));
  },
  file: null,
  output: '',
  openSave($t) {
    rsTableBuilder.renderTable($t);
    rsTableBuilder.renderTable($t, true);
    console.log(rsTableBuilder.output);
    rsTableBuilder.globals.saveBar.slideToggle(200);
  },
  packageForSave() {
    this.globals.name.val(this.config.name);
    let name = this.config.name;
    if (name.trim() === '') {
      name = 'table-generated-file';
    }
    const $btn = this.globals.saveDownload;
    // generate file
    const data = new Blob([JSON.stringify(this.config)], { type: 'application/json' });
    if (this.file !== null) {
      window.URL.revokeObjectURL(this.file);
    }
    this.file = window.URL.createObjectURL(data);
    $btn.attr('href', this.file);
    $btn.attr('download', `${name}.json`);
  },
  bindImport($t) {
    const $importer = $('#import-table');
    $importer.get(0).ondragover = () => {
      $importer.addClass('hover-file');
      return false;
    };
    $importer.get(0).ondragleave = () => {
      $importer.removeClass('hover-file');
      return false;
    };
    $importer.get(0).ondrop = (e) => {
      $importer.removeClass('hover-file');
      e.preventDefault();

      const file = e.dataTransfer.files[0];
      if (file.name.split('.').pop().match(/json/gi)) {
        // @TODO if json obj has certain properties and are arrays
        // then pass
        const reader = new FileReader();
        reader.onload = (event) => {
          $importer.removeClass('wrong-file-type');
          this.config = JSON.parse(event.target.result);
          this.saveLocal();
          this.renderTable($t, true);
          $importer.addClass('correct-file-type');
          setTimeout(() => {
            $importer.removeClass('correct-file-type');
          }, 1500);
        };
        reader.readAsText(file);
      } else {
        // error = not a json file
        $importer.addClass('wrong-file-type');
        setTimeout(() => {
          $importer.removeClass('wrong-file-type');
        }, 2000);
      }
      return false;
    };
  },
  updateTableName(v, $t) {
    this.config.name = v;
    this.saveLocal();
    this.renderTable($t, true);
  },
  nameTimeOut: null,
  init($t) {
    this.globals.name.on('input', (e) => {
      clearTimeout(this.nameTimeOut);
      this.nameTimeOut = setTimeout(() => {
        this.updateTableName(e.target.value, $t);
      }, 250);
    });
    this.globals.addRow.click(() => {
      this.addRow($t);
    });
    this.globals.addCol.click(() => {
      this.addColumn($t);
    });
    this.globals.output.click(() => {
      this.openSave($t);
    });
    this.globals.clear.click(() => {
      this.config = JSON.parse(JSON.stringify(this.empty));
      this.saveLocal();
      this.renderTable($t, true);
    });
    this.bindImport($t);
    this.renderTable($t, true);
    this.makeDroppable($t);
  },
};

// check and load a cached table
if (localStorage.SAVED_TABLE) {
  rsTableBuilder.config = JSON.parse(localStorage.SAVED_TABLE);
} else {
  rsTableBuilder.config = JSON.parse(JSON.stringify(rsTableBuilder.empty));
}

rsTableBuilder.init($('#table-output'));
