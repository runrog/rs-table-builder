const http = require('http');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const mime = require('mime');

const port = 2001;

http.createServer((request, response) => {
  let filePath = `.${request.url}`;

  if (!filePath.match(/\/dist\//gi)) {
    if (filePath === './') {
      filePath = './src/index.ejs';
    } else {
      filePath = filePath.replace(/\.\//gi, './src/');
    }
  }

  // zoolander loads version numbers after font files, so we
  // need to tell node what to load.
  if (filePath.match(/\/dist\/zoolander\/font\/rswebfonts/gi)) {
    const dir = path.dirname(filePath);
    let file = filePath.split('/').pop();
    file = file.split('?')[0];
    filePath = `${dir}/${file}`;
  }

  const extname = path.extname(filePath);
    // Render our ejs
  if (extname === '.ejs') {
    ejs.renderFile(filePath, { env: 'dev' }, (err, str) => {
      // render on success
      if (!err) {
        response.end(str);
      } else {
        // render or error
        response.end('An error occurred, see error in terminal');
        console.log(err); // eslint-disable-line
      }
    });
  }

  const charSet = 'utf-8';
  const contentType = mime.getType(path.basename(filePath));

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile('./404.html', () => {
          response.writeHead(200, { 'Content-Type': contentType });
          response.end(content, charSet);
        });
      } else {
        response.writeHead(500);
        response.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
        response.end();
      }
    } else {
      response.writeHead(200, { 'Content-Type': contentType });
      response.end(content, charSet);
    }
  });
}).listen(port);
