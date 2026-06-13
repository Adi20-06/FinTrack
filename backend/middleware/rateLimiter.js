const rateLimit = require('express-rate-limit');

// ── GENERAL LIMITER ───────────────────────────────────
// Applied to ALL routes — prevents abuse and DDoS
// Allows 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,  // 15 minutes in milliseconds
  max:              100,              // max requests per window per IP
  standardHeaders:  true,            // sends rate limit info in response headers
  legacyHeaders:    false,           // disables old X-RateLimit headers
  message: {
    status:  429,
    message: 'Too many requests. Please wait a few minutes and try again.'
  },
  // keyGenerator tells the limiter how to identify each "user"
  // We use IP address — works even behind proxies (Vercel uses proxies)
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0].trim()
      || req.headers['x-real-ip']
      || req.ip;
  },
});

// ── AUTH LIMITER ──────────────────────────────────────
// Applied ONLY to /api/auth/login and /api/auth/register
// Much stricter — only 5 attempts per 15 minutes per IP
// Prevents brute-force password attacks
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,   // 15 minutes
  max:             5,                 // only 5 attempts allowed
  standardHeaders: true,
  legacyHeaders:   false,
  skipSuccessfulRequests: true,       // successful logins don't count toward the limit
                                      // so only FAILED attempts are counted
  message: {
    status:  429,
    message: 'Too many login attempts. Please wait 15 minutes and try again.'
  },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0].trim()
      || req.headers['x-real-ip']
      || req.ip;
  },
  // Called every time a limit is hit — useful for logging/monitoring
  handler: (req, res, next, options) => {
    console.warn(`⚠️  Rate limit hit on auth route — IP: ${req.ip} at ${new Date().toISOString()}`);
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = { generalLimiter, authLimiter };