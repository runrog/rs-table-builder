'use strict';

/* global document $ Quill localStorage FileReader window Blob */

var rsTableBuilder = {
  globals: {
    name: $('input[name="save-table-name"]'),
    saveDownload: $('.save-download'),
    saveBar: $('.save-table-area'),
    addRow: $('#add-row'),
    addCol: $('#add-col'),
    output: $('.save-table-btn'),
    clear: $('.clear-table-btn'),
    htmlString: $('#html-output'),
    fileInput: $('#hidden-files')
  },
  empty: {
    name: '',
    id: false,
    headers: [{ title: 'Header' }, { title: 'Header' }],
    rows: [{
      cols: [{
        content: false
      }, {
        content: false
      }]
    }, {
      cols: [{
        content: false
      }, {
        content: false
      }]
    }]
  },
  config: {},
  makeDroppable: function makeDroppable($t) {
    var _this = this;

    var type = void 0;
    document.addEventListener('drag', function (e) {
      if (e.srcElement.tagName === 'BUTTON') {
        type = $(e.target).attr('type');
      }
    });
    document.addEventListener('dragover', function (e) {
      e.preventDefault();
    });
    document.addEventListener('drop', function (e) {
      e.preventDefault();
      var target = e.target;
      if (!target.classList.contains('droptarget')) {
        target = $(target).closest('.droptarget').get(0);
      }
      // only allow featured titles to go into the first col
      if (type === 'title' && $(target).attr('data-td-index') === '0' && target && target.classList.contains('droptarget')) {
        _this.onDrop(target, type, $t);
      } else if (type !== 'title' && target && target.classList.contains('droptarget')) {
        _this.onDrop(target, type, $t);
      }
    });
  },

  editingImage: null,
  onDrop: function onDrop(target, type, $t) {
    var $tr = parseInt($(target).attr('data-tr-index'), 10);
    var $td = parseInt($(target).attr('data-td-index'), 10);
    var content = false;
    if (type.match(/gen-text/gi)) {
      content = '<span data-inline-text="true">Click me to edit text.<span>';
    }
    if (type.match(/check/gi)) {
      content = 'offered';
    }
    if (type.match(/times/gi)) {
      content = 'notOffered';
    }
    if (type.match(/image/gi)) {
      content = 'Upload Image...';
      this.editingImage = this.config.rows[$tr].cols[$td];
      this.openFileBrowser();
    }
    if (type.match(/title/gi)) {
      content = '<p data-feat-title="true">Feature Title</p>';
    }
    this.config.rows[$tr].cols[$td].content = content;
    this.saveLocal();
    this.renderTable($t);
  },
  openFileBrowser: function openFileBrowser() {
    var inp = this.globals.fileInput;
    inp.click();
  },
  convertImage: function convertImage(img, $t) {
    var _this2 = this;

    var reader = new FileReader();
    reader.readAsDataURL(img);
    reader.onload = function () {
      _this2.editingImage.content = '<img src="' + reader.result + '" />';
      _this2.saveLocal();
      _this2.renderTable($t);
    };
    reader.onerror = function (err) {
      console.log('Error making base64: ', err); // eslint-disable-line
    };
  },
  renderTable: function renderTable($t, $editor) {
    var _this3 = this;

    this.globals.name.val(this.config.name);
    var id = this.config.id;
    if (!id) {
      id = this.uuid();
      this.config.id = id;
    }
    // start the build
    var $table = '<table class="productTable" id="rs-table-' + id + '">';
    // table headers
    if (this.config.headers.length > 0) {
      $table += '\n        <thead class="productTable-header">\n          <tr class="productTable-row">';

      $.each(this.config.headers, function (i, h) {
        var title = $editor ? '<span contenteditable="true">' + h.title + '</span>' : h.title;
        var rmBtn = $editor ? '<button data-index="' + i + '" class="remove-col"></button>' : '';
        var attrs = $editor ? ' data-th-index="' + i + '"' : '';
        var style = $editor ? ' style="position:relative;"' : '';
        $table += '<th class="productTable-name"' + style + attrs + '>' + title + rmBtn + '</th>';
      });

      $table += '\n          </tr>\n        </thead>';
    }
    // table body
    if (this.config.rows.length > 0) {
      $table += '<tbody">';

      var zIndexes = Array.from({ length: this.config.rows.length }).map(function (x, i) {
        return i;
      }).reverse();

      $.each(this.config.rows, function (i, r) {
        var rowStyle = $editor ? ' style="z-index:' + zIndexes[i] + ';"' : '';
        $table += '<tr class="productTable-row"' + rowStyle + '>';
        // loop through row columns
        if (r.cols.length > 0) {
          $.each(r.cols, function (x, c) {
            var content = '';
            var checkClass = 'productTable-feature';
            if (c.content) {
              if (c.content === 'offered' || c.content === 'notOffered') {
                checkClass = checkClass + 'Item ' + c.content;
              } else {
                content = c.content;
                if (!content.match(/data-feat-title="true"/gi)) {
                  checkClass = checkClass + 'Item';
                } else {
                  content = $editor ? '<span contenteditable="true">' + content + '</span>' : content;
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
            var style = $editor ? ' style="position:relative;z-index:' + zIndexes[i] + ';"' : '';
            var attrs = $editor ? 'data-tr-index="' + i + '" data-td-index="' + x + '"' : '';
            var dropCls = $editor ? ' droptarget' : '';
            // if last col in row, put remove button
            var rmBtn = $editor && x === r.cols.length - 1 ? '<button data-index="' + i + '" class="remove-row"></button>' : '';
            $table += '<td ' + attrs + ' class="' + checkClass + dropCls + '"' + style + '>' + content + rmBtn + '</td>';
          });
        }
        $table += '</tr>';
      });

      $table += '</tbody>';
    }
    $table += '</table>';
    // add any needed css overrides
    var inlineTableStyling = '\n      <style type="text/css">\n        table#rs-table-' + id + ' tbody tr td {\n          width: 1%;\n        }\n        table#rs-table-' + id + ' .productTable-featureItem {\n          vertical-align: middle;\n        }\n      </style>\n    ';
    var init$Plugin = '\n    <script type="text/javascript">\n      $(\'table#rs-table-' + id + '\').responsiveTable();\n    </script>';
    if (!$editor) {
      this.output = '' + inlineTableStyling + $table + init$Plugin;
      this.globals.htmlString.text(rsTableBuilder.output);
      // re render for $editor
      this.renderTable($t, true);
    }
    this.packageForSave();
    // bind editor events post DOM insertion --------------------------------------------
    if ($editor) {
      $t.html('' + inlineTableStyling + $table);
      // removing row clicks
      $t.find('tbody tr .remove-row').click(function (e) {
        _this3.removeRow(e, $t);
      });
      // removing column clicks
      $t.find('thead tr .remove-col').click(function (e) {
        _this3.removeColumn(e, $t);
      });
      // inline text editing
      $t.find('tbody tr td').each(function findTexts() {
        var _this4 = this;

        var $feat = $(this).find('p[data-feat-title="true"]');
        if ($feat.length) {
          $feat.parent('span[contenteditable="true"]').on('focusout', function () {
            console.log('save feature text'); // eslint-disable-line
            // console.log($feat.text());
            rsTableBuilder.updateFeat($t, $(_this4), $feat);
          });
        }
        var $text = $(this).find('span');
        if ($text.length && $text.attr('data-inline-text')) {
          var toolbar = [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], [{ script: 'sub' }, { script: 'super' }], [{ align: [] }]];
          var quill = new Quill($text.get(0), { // eslint-disable-line
            modules: { toolbar: toolbar },
            theme: 'bubble'
          });
          $text.on('focusout', function () {
            console.log('save text'); // eslint-disable-line
            rsTableBuilder.updateText($t, $(_this4));
          });
        }
      });
      // add bg helpers when hovering over a column header
      $t.find('thead th').each(function h() {
        var $h = $(this);
        // attach contenteditable titles
        $h.find('span[contenteditable="true"]').on('focusout', function (e) {
          rsTableBuilder.updateHeader($t, $h, e.target);
        });
        $h.hover(function () {
          $t.find('tbody tr').each(function a() {
            $(this).find('td').eq($h.index()).addClass('hover-col');
          });
        }, function () {
          $t.find('tbody tr').each(function a() {
            $(this).find('td').eq($h.index()).removeClass('hover-col');
          });
        });
      });
      // bind table plugin from zoolander
      $t.find('table.productTable').responsiveTable();
    }
  },
  updateText: function updateText($t, $text) {
    var $tr = parseInt($text.attr('data-tr-index'), 10);
    var $td = parseInt($text.attr('data-td-index'), 10);
    // format contenteditable input then save
    var $formatted = $text.find('span > .ql-editor').html();
    this.config.rows[$tr].cols[$td].content = '<span data-inline-text="true">' + $formatted + '</span>';
    this.saveLocal();
    this.renderTable($t);
  },
  updateHeader: function updateHeader($t, $h, val) {
    var $th = parseInt($h.attr('data-th-index'), 10);
    var v = $(val).text();
    this.config.headers[$th].title = v;
    this.saveLocal();
    this.renderTable($t);
  },
  updateFeat: function updateFeat($t, $el, val) {
    var $tr = parseInt($el.attr('data-tr-index'), 10);
    var $td = parseInt($el.attr('data-td-index'), 10);
    var v = $(val).text();
    this.config.rows[$tr].cols[$td].content = '<p data-feat-title="true">' + v + '</p>';
    this.saveLocal();
    this.renderTable($t);
  },
  addRow: function addRow($t) {
    // count the headers and make that many cols
    var times = this.config.headers.length;
    var cols = [];
    for (var i = 0; i < times; i += 1) {
      cols.push({ content: false });
    }
    this.config.rows.push({ cols: cols });
    this.saveLocal();
    this.renderTable($t);
  },
  removeRow: function removeRow(e, $t) {
    var i = parseInt($(e.target).attr('data-index'), 10);
    this.config.rows.splice(i, 1);
    this.saveLocal();
    this.renderTable($t);
  },
  addColumn: function addColumn($t) {
    // append header to headers
    this.config.headers.push({ title: 'Header' });
    // loop body rows and append new col to each
    $.each(this.config.rows, function (i, r) {
      r.cols.push({ content: false });
    });
    this.saveLocal();
    this.renderTable($t);
  },
  removeColumn: function removeColumn(e, $t) {
    var i = parseInt($(e.target).attr('data-index'), 10);
    // remove from header
    this.config.headers.splice(i, 1);
    // remove that same col in each row
    $.each(this.config.rows, function (x, r) {
      r.cols.splice(i, 1);
    });
    this.saveLocal();
    this.renderTable($t);
  },
  uuid: function uuid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return '' + s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  },
  saveLocal: function saveLocal() {
    localStorage.setItem('SAVED_TABLE', JSON.stringify(this.config));
  },

  file: null,
  output: '',
  openSave: function openSave() {
    rsTableBuilder.globals.saveBar.slideToggle(200);
  },
  packageForSave: function packageForSave() {
    this.globals.name.val(this.config.name);
    var name = this.config.name;
    if (name.trim() === '') {
      name = 'table-generated-file';
    }
    var $btn = this.globals.saveDownload;
    // generate file
    var data = new Blob([JSON.stringify(this.config)], { type: 'application/json' });
    if (this.file !== null) {
      window.URL.revokeObjectURL(this.file);
    }
    this.file = window.URL.createObjectURL(data);
    $btn.attr('href', this.file);
    $btn.attr('download', name + '.json');
  },
  bindImport: function bindImport($t) {
    var _this5 = this;

    var $importer = $('#import-table');
    $importer.get(0).ondragover = function () {
      $importer.addClass('hover-file');
      return false;
    };
    $importer.get(0).ondragleave = function () {
      $importer.removeClass('hover-file');
      return false;
    };
    $importer.get(0).ondrop = function (e) {
      $importer.removeClass('hover-file');
      e.preventDefault();

      var file = e.dataTransfer.files[0];
      if (file.name.split('.').pop().match(/json/gi)) {
        // @TODO if json obj has certain properties and are arrays
        // then pass
        var reader = new FileReader();
        reader.onload = function (event) {
          $importer.removeClass('wrong-file-type');
          _this5.config = JSON.parse(event.target.result);
          _this5.saveLocal();
          _this5.renderTable($t);
          $importer.addClass('correct-file-type');
          setTimeout(function () {
            $importer.removeClass('correct-file-type');
          }, 1500);
        };
        reader.readAsText(file);
      } else {
        // error = not a json file
        $importer.addClass('wrong-file-type');
        setTimeout(function () {
          $importer.removeClass('wrong-file-type');
        }, 2000);
      }
      return false;
    };
  },
  updateTableName: function updateTableName(v, $t) {
    this.config.name = v;
    this.saveLocal();
    this.renderTable($t);
  },

  nameTimeOut: null,
  init: function init($t) {
    var _this6 = this;

    this.globals.name.on('input', function (e) {
      clearTimeout(_this6.nameTimeOut);
      _this6.nameTimeOut = setTimeout(function () {
        _this6.updateTableName(e.target.value, $t);
      }, 250);
    });
    this.globals.addRow.click(function () {
      _this6.addRow($t);
    });
    this.globals.addCol.click(function () {
      _this6.addColumn($t);
    });
    this.globals.output.click(function () {
      _this6.openSave($t);
    });
    this.globals.clear.click(function () {
      _this6.config = JSON.parse(JSON.stringify(_this6.empty));
      _this6.saveLocal();
      _this6.renderTable($t);
    });
    this.globals.fileInput.on('change', function (e) {
      if (e.target.files.length === 1) {
        _this6.convertImage(e.target.files[0], $t);
      }
    });
    this.bindImport($t);
    this.renderTable($t);
    this.makeDroppable($t);
  }
};

// check and load a cached table
if (localStorage.SAVED_TABLE) {
  rsTableBuilder.config = JSON.parse(localStorage.SAVED_TABLE);
} else {
  rsTableBuilder.config = JSON.parse(JSON.stringify(rsTableBuilder.empty));
}

rsTableBuilder.init($('#table-output'));