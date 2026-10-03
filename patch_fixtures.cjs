const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

serverCode = serverCode.replace(
  "id: 'FIX-RMA-BAR',",
  "id: 'FIX-RMA-BAR',\n    category: 'Football',\n    date: 'Today',"
);

serverCode = serverCode.replace(
  "id: 'FIX-MCI-ARS',",
  "id: 'FIX-MCI-ARS',\n    category: 'Football',\n    date: 'Tomorrow',"
);

serverCode = serverCode.replace(
  "id: 'FIX-LIV-PSG',",
  "id: 'FIX-LIV-PSG',\n    category: 'Football',\n    date: 'Tomorrow',"
);

serverCode = serverCode.replace(
  "id: 'FIX-BAY-BVB',",
  "id: 'FIX-BAY-BVB',\n    category: 'Basketball',\n    date: 'Weekend',"
);

serverCode = serverCode.replace(
  "id: 'FIX-HIL-NAS',",
  "id: 'FIX-HIL-NAS',\n    category: 'Tennis',\n    date: 'Today',"
);

fs.writeFileSync('server.ts', serverCode);
console.log('patched');
