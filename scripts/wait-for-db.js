const net = require('net');

const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT || 5433);
const maxAttempts = 30;
const delayMs = 1000;

function tryConnect() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', reject);
    socket.setTimeout(2000, () => {
      socket.destroy();
      reject(new Error('timeout'));
    });
  });
}

(async () => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await tryConnect();
      console.log(`PostgreSQL ready on ${host}:${port}`);
      process.exit(0);
    } catch {
      console.log(`Waiting for PostgreSQL (${attempt}/${maxAttempts})...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  console.error(`PostgreSQL not ready on ${host}:${port}`);
  process.exit(1);
})();
