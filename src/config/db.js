const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'seubanco',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err.message);
    return;
  }
  console.log('Conectado ao MySQL com sucesso');
  
  connection.query('SELECT DATABASE() AS db;', (err, result) => {
    connection.release();
    
    if (err) {
      console.error('Erro ao verificar banco:', err);
    } else {
      console.log('Banco atual:', result[0].db);
    }
  });
});

module.exports = pool;