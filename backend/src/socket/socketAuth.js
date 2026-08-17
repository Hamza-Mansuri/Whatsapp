import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/env.js';

// Manual cookie parser helper to parse the token out of headers
const parseCookies = (cookieString) => {
  if (!cookieString) return {};
  return cookieString.split(';').reduce((acc, pair) => {
    const parts = pair.split('=');
    acc[parts[0].trim()] = parts[1] ? decodeURIComponent(parts[1].trim()) : '';
    return acc;
  }, {});
};

export const socketAuth = async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    const cookies = parseCookies(cookieHeader);
    const token = cookies.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // Attach authenticated user to the socket
    socket.user = user;
    next();
  } catch (err) {
    console.error('Socket Connection Auth Denied:', err.message);
    next(new Error('Authentication error: Invalid token'));
  }
};
