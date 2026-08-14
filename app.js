// C:\Users\HP\MediTrack\app.js

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');

const corsMiddleware = require('./configs/cors');
const globalErr = require('./middleware/global-err');
const routes = require('./routes/index');


// 1. INITIALIZE EXPRESS


const app = express();


// 2. TRUST PROXY

//
// Important when deployed behind Render, Railway,
// Cloudflare, Nginx, or another reverse proxy.
//
// This allows Express to determine the real client IP
// from the proxy headers.
//


app.set('trust proxy', 1);


// 3. SECURITY AND CORS


app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

app.use(corsMiddleware);


// 4. PAYLOAD PARSING


app.use(
  express.json({
    limit: '10mb',
  })
);

app.use(
  express.urlencoded({
    limit: '10mb',
    extended: true,
  })
);


// 5. DEBUG TEST ROUTE


app.post('/test', (req, res) => {
  res.json({
    received: req.body,
  });
});


// 6. IP DEBUG ROUTE

//
// TEMPORARY:
// Use this to verify whether you and your friend are
// being detected as different IP addresses.
//
// Open:
//
// https://YOUR-BACKEND-DOMAIN/test-ip
//
// from your computer and your friend's computer.
//


app.get('/test-ip', (req, res) => {
  const clientIp = req.ip;
  const proxyIps = req.ips;
  const forwardedFor = req.headers['x-forwarded-for'];

  console.log('=========================================');
  console.log('IP DEBUG');
  console.log('Client IP:', clientIp);
  console.log('Proxy IPs:', proxyIps);
  console.log('X-Forwarded-For:', forwardedFor);
  console.log('=========================================');

  res.json({
    ip: clientIp,
    ips: proxyIps,
    forwardedFor: forwardedFor || null,
  });
});


// 7. API ROUTES


app.use('/api', routes);


// 8. GLOBAL ERROR HANDLER

//
// Must remain AFTER all routes.
//


app.use(globalErr);


// 9. START SERVER


const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
=========================================
  MediTrack Node Server Running
  Port: ${PORT}
  Database: Supabase Connected
  Proxy Trust: Enabled
=========================================
  `);

  server.on('close', () => {
    console.log('Server closed');
  });
});


// 10. KEEP PROCESS ALIVE


process.stdin.resume();


// 11. PROCESS ERROR HANDLERS


process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(
    'Unhandled Rejection at:',
    promise,
    'reason:',
    reason
  );
});


// 12. EXPORT APP


module.exports = app;