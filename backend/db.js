const mysql = require('mysql2');

const pool = mysql.createPool({
  host:     'localhost',
  user:     'root',
  password: 'root',
  database: 'finance_tracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

promisePool.query('SELECT 1')
  .then(() => console.log('✅ MySQL connected successfully!'))
  .catch(err => console.error('❌ MySQL connection failed:', err.message));

module.exports = promisePool;