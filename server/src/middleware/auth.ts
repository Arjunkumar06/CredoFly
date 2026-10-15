import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/auth.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export interface AuthRequest extends Request {
  user?: TokenPayload;
  isAdmin?: boolean;
}

export function requireCustomerAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new UnauthorizedError('Please log in to proceed.');
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired authentication session.'));
  }
}

export function optionalCustomerAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      req.user = verifyToken(token);
    }
  } catch (err) {
    // Ignore invalid token for optional auth
  }
  next();
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function requireAdminBasicAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="CredoFly Admin"');
    return next(new UnauthorizedError('Administrator Basic Authentication required'));
  }

  try {
    const base64Credentials = authHeader.substring(6).trim();
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, ...passwordParts] = credentials.split(':');
    const password = passwordParts.join(':');

    const expectedAdminUser = process.env.ADMIN_USERNAME || 'admin';
    const expectedAdminPass = process.env.ADMIN_PASSWORD || 'adminpassword123';

    const userMatch = safeCompare(username, expectedAdminUser);
    const passMatch = safeCompare(password, expectedAdminPass);

    if (!userMatch || !passMatch) {
      res.setHeader('WWW-Authenticate', 'Basic realm="CredoFly Admin"');
      return next(new UnauthorizedError('Invalid administrator credentials'));
    }

    req.isAdmin = true;
    next();
  } catch (err) {
    res.setHeader('WWW-Authenticate', 'Basic realm="CredoFly Admin"');
    return next(new UnauthorizedError('Failed to parse administrator credentials'));
  }
}
