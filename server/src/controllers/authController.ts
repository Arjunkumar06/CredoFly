import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';
import { registerSchema, loginSchema } from '../validators/index.js';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth.js';
import { BadRequestError, UnauthorizedError, ConflictError } from '../utils/errors.js';
import { AuthRequest } from '../middleware/auth.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);

      const existingUser = await prisma.user.findUnique({
        where: { username: validated.username },
      });

      if (existingUser) {
        throw new ConflictError('Username is already taken');
      }

      if (validated.email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email: validated.email },
        });
        if (existingEmail) {
          throw new ConflictError('Email is already registered');
        }
      }

      const passwordHash = await hashPassword(validated.password);

      const user = await prisma.user.create({
        data: {
          username: validated.username,
          email: validated.email || null,
          passwordHash,
        },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
        },
      });

      const token = generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        user,
        token,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user) {
        throw new UnauthorizedError('Invalid username or password');
      }

      const isMatch = await verifyPassword(password, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid username or password');
      }

      const token = generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        token,
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response) {
    res.clearCookie('token');
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  static async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new UnauthorizedError('User no longer exists');
      }

      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  }
}
