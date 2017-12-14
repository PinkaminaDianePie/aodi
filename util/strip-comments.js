const fs = require('fs');

function strip(path) {
  const file = fs.readFileSync(path, 'UTF8');
  fs.writeFileSync(path, file.replace(/__strip__/g, ''));
}

strip(process.argv[2]);
