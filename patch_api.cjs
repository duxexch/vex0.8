const fs = require('fs');

let apiCode = fs.readFileSync('src/services/api.ts', 'utf8');

apiCode = apiCode.replace(
  "id: 'FIX-RMA-BAR',",
  "id: 'FIX-RMA-BAR',\n        category: 'Football',\n        date: 'Today',"
);

apiCode = apiCode.replace(
  "id: 'FIX-MCI-ARS',",
  "id: 'FIX-MCI-ARS',\n        category: 'Football',\n        date: 'Tomorrow',"
);

fs.writeFileSync('src/services/api.ts', apiCode);
console.log('patched api');
