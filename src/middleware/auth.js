const jwt = require("jsonwebtoken");
const env = require("../config/env");

const extractToken = (req, allowQuery = false) => {
  const authHeader = req.headers.authorization?.split(" ")[1];
  if (authHeader) return authHeader;
  if (allowQuery && req.query?.token) {
    return req.query.token;
  }
  return null;
};

const authMiddleware = (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

const optionalAuth = (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = decoded;
    }
    next();
  } catch (error) {
    next();
  }
};

const authMiddlewareWithQuery = (req, res, next) => {
  try {
    const token = extractToken(req, true);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

module.exports = { authMiddleware, optionalAuth, authMiddlewareWithQuery };
