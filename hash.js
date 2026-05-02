const b = require('bcryptjs');
b.hash('admin12', 10).then(h => console.log(h));