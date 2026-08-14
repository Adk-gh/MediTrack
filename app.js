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
// MediTrack is deployed behind Render's reverse proxy.
//
// This is IMPORTANT for:
//   - express-rate-limit
//   - req.ip
//   - authentication/security logging
//   - identifying individual clients
//
// Render forwards the original client IP using
// X-Forwarded-For.
//
// `true` tells Express to trust the proxy chain and use
// the forwarded client IP.
//
// This prevents all users behind Render from being treated
// as the same internal proxy IP.
//

app.set('trust proxy', true);



// 3. SECURITY AND CORS


app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

app.use(corsMiddleware);



// 4. REQUEST BODY LIMITS


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



// 5. BASIC TEST ROUTE


app.post('/test', (req, res) => {
  res.json({
    success: true,
    received: req.body,
  });
});



// 6. TEMPORARY IP DEBUG ROUTE

//
// KEEP THIS ONLY WHILE TESTING RATE LIMITING.
//
// Test:
// https://meditrack-1-pq7i.onrender.com/test-ip
//
// After confirming that different devices show different
// IP addresses, you can REMOVE this route.
//

app.get('/test-ip', (req, res) => {
  console.log('=========================================');
  console.log('IP DEBUG');
  console.log('Client IP:', req.ip);
  console.log('Proxy IPs:', req.ips);
  console.log(
    'X-Forwarded-For:',
    req.headers['x-forwarded-for']
  );
  console.log('=========================================');

  res.json({
    success: true,
    ip: req.ip,
    ips: req.ips,
    forwardedFor:
      req.headers['x-forwarded-for'] || null,
  });
});



// 7. API ROUTES


app.use('/api', routes);



// 8. GLOBAL ERROR HANDLER

//
// MUST remain AFTER all routes.
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
  Trust Proxy: ENABLED
=========================================
  `);
});



// 10. SERVER CLOSE


server.on('close', () => {
  console.log('Server closed');
});



// 11. KEEP PROCESS ALIVE


process.stdin.resume();



// 12. PROCESS ERROR HANDLERS


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



// 13. EXPORT APP


module.exports = app;