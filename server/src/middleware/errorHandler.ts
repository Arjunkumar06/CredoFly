import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 1. Zod schema validation errors
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
      message,
    });
  }

  // 2. Custom AppErrors (BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      message: err.message,
    });
  }

  const errString = String(err?.message || err || '');

  // 3. Prisma missing DATABASE_URL / initialization errors
  if (
    err?.name === 'PrismaClientInitializationError' ||
    errString.includes('Environment variable not found: DATABASE_URL') ||
    errString.includes('DATABASE_URL')
  ) {
    console.error('🚨 [Database Error] Missing or invalid DATABASE_URL:', err);
    return res.status(503).json({
      success: false,
      error: 'Database connection failed: DATABASE_URL environment variable is not configured on the server. Please add DATABASE_URL in your hosting environment settings.',
      message: 'Database connection failed: DATABASE_URL environment variable is not configured on the server.',
      code: 'DATABASE_URL_MISSING',
    });
  }

  // 4. Prisma known request errors (P-codes)
  if (err?.code) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') || 'field';
        return res.status(409).json({
          success: false,
          error: `A record with this ${target} already exists.`,
          message: `A record with this ${target} already exists.`,
        });
      }
      case 'P1000': {
        return res.status(503).json({
          success: false,
          error: 'Database authentication failed. Please verify the username and password in your DATABASE_URL.',
          message: 'Database authentication failed.',
        });
      }
      case 'P1001': {
        return res.status(503).json({
          success: false,
          error: 'Cannot connect to database server. Please ensure your PostgreSQL database is running and reachable.',
          message: 'Database server unreachable.',
        });
      }
      case 'P1003': {
        return res.status(503).json({
          success: false,
          error: 'The database specified in DATABASE_URL does not exist.',
          message: 'Database does not exist.',
        });
      }
      case 'P2025': {
        const cause = (err.meta?.cause as string) || 'The requested record was not found.';
        return res.status(404).json({
          success: false,
          error: cause,
          message: cause,
        });
      }
    }
  }

  // 5. General unhandled errors: return actual descriptive error message
  console.error('Unhandled Server Error:', err);

  const errorMessage =
    err?.message && typeof err.message === 'string' && err.message.length > 0
      ? err.message
      : 'An internal server error occurred. Please try again later.';

  return res.status(500).json({
    success: false,
    error: errorMessage,
    message: errorMessage,
  });
}
