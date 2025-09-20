const mysql = require('mysql2/promise');
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'defaultdb',
    port: process.env.DB_PORT || 3306, // Defaulting to 3306
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
module.exports = { getConnection: () => pool };
