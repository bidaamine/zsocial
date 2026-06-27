const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const PORT = 9999;

const services = [
  // Services
  { name: 'API Gateway', host: '127.0.0.1', port: 4000, type: 'service' },
  { name: 'BFF Gateway', host: '127.0.0.1', port: 4001, type: 'service' },
  { name: 'Realtime Gateway', host: '127.0.0.1', port: 4002, type: 'service' },
  { name: 'Security Agent', host: '127.0.0.1', port: 4010, type: 'service' },
  { name: 'Auth Service', host: '127.0.0.1', port: 4100, type: 'service' },
  { name: 'Consent Service', host: '127.0.0.1', port: 4104, type: 'service' },
  { name: 'Notification Service', host: '127.0.0.1', port: 4105, type: 'service' },
  { name: 'Media & File Service', host: '127.0.0.1', port: 4107, type: 'service' },
  { name: 'Audit & Observability', host: '127.0.0.1', port: 4109, type: 'service' },
  { name: 'Privacy Engine', host: '127.0.0.1', port: 5100, type: 'service' },
  // Unimplemented Phase 1 Services
  { name: 'User Profile Service', host: '127.0.0.1', port: 4004, type: 'service' },
  { name: 'Family Service', host: '127.0.0.1', port: 4005, type: 'service' },
  
  // Infrastructure
  { name: 'PostgreSQL', host: '127.0.0.1', port: 5432, type: 'infra' },
  { name: 'Redis', host: '127.0.0.1', port: 6379, type: 'infra' },
  { name: 'Neo4j', host: '127.0.0.1', port: 7687, type: 'infra' },
  { name: 'Kafka', host: '127.0.0.1', port: 9092, type: 'infra' },
  { name: 'Minio', host: '127.0.0.1', port: 9000, type: 'infra' },
  { name: 'VectorDB (Milvus)', host: '127.0.0.1', port: 19530, type: 'infra' },
];

const checkPort = (port, host) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
};

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/health') {
    const results = await Promise.all(
      services.map(async (service) => {
        const isUp = await checkPort(service.port, service.host);
        return { ...service, isUp };
      })
    );
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
    return;
  }

  const htmlContent = fs.readFileSync(path.join(__dirname, 'health-dashboard.html'), 'utf-8');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(htmlContent);
});

server.listen(PORT, () => {
  console.log('Health Dashboard running at http://localhost:' + PORT);
});
