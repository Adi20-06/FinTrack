// jsonwebtoken helps us verify if a user's login token is valid
const jwt = require('jsonwebtoken');
require('dotenv').config();

// This is a "middleware" function
// Middleware = a checkpoint that runs BEFORE your actual route code
// Think of it like a security guard at a door —
// it checks your ID before letting you in

const protect = (req, res, next) => {

  // Every request from the frontend will carry a token in the "headers"
  // Headers are like the envelope around a letter — extra info about the request
  const authHeader = req.headers['authorization'];

  // The token comes in this format: "Bearer eyJhbGci..."
  // We split by space and take the second part (the actual token)
  const token = authHeader && authHeader.split(' ')[1];

  // If no token was sent, reject the request
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    // Verify the token using our secret key
    // If it's valid, jwt.verify() gives us back the user's data
    const decoded = jwt.verify(token, 'myfinanceapp_super_secret_key_2026');

    // Attach the user's ID to the request object
    // Now every route that uses this middleware knows WHO is making the request
    req.user = decoded;

    // "next()" means "okay, the guard is happy, let the request through"
    next();

  } catch (error) {
    // Token was tampered with or expired
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

module.exports = protect; 