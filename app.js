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
// Render is forwarding the client IP through multiple proxy
// hops. Your current X-Forwarded-For looked like:
//
//   client IP,
//   Render/proxy IP,
//   Render internal IP
//
// With trust proxy = 1, Express was using:
//
//   10.196.227.102
//
// as req.ip, which can cause multiple users to share the
// same rate-limit bucket.
//
// Trust 3 proxy hops so Express resolves the original
// client IP.
//


app.set('trust proxy', 3);


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
// TEMPORARY DEBUG ROUTE.
//
// After deploying, open:
//
// https://meditrack-1-pq7i.onrender.com/test-ip
//
// from your computer and your friend's computer.
//
// The "ip" value should now represent the original client
// IP rather than:
//
//   10.196.227.102
//


app.get('/test-ip', (req, res) => {
  console.log('=========================================');
  console.log('IP DEBUG');
  console.log('Client IP:', req.ip);
  console.log('Proxy IPs:', req.ips);
  console.log('X-Forwarded-For:', req.headers['x-forwarded-for']);
  console.log('=========================================');

  res.json({
    ip: req.ip,
    ips: req.ips,
    forwardedFor: req.headers['x-forwarded-for'] || null,
  });
});


// 7. API ROUTES


app.use('/api', routes);


// 8. GLOBAL ERROR HANDLER

//
// This MUST remain after all routes.
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
  Proxy Trust: 3 Hops
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