const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function test() {
  const pool = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'baquiran12',
    database: 'ict_community',
  });
  const [rows] = await pool.query("SELECT * FROM users WHERE username = 'admin'");
  const user = rows[0];
  console.log('Found user:', user.username, 'role:', user.role);
  const match = await bcrypt.compare('admin12', user.password);
  console.log('Password match:', match);
  process.exit();
}
test(); 