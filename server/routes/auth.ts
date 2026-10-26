import { RequestHandler } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { Invitation } from '@prisma/client';
import {
  hashPassword,
  comparePassword,
  generateToken,
  AuthenticatedRequest
} from '../auth';
import { isBefore } from 'date-fns';

const signupSchema = z.object({
  token: z.string().min(1, 'Invite token is required'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const handleSignup: RequestHandler = async (req, res) => {
  try {
    const validatedData = signupSchema.parse(req.body);
    // Validate invitation
    const invite = await prisma.invitation.findUnique({
      where: { token: validatedData.token }
    }) as Invitation | null;
    if (!invite) return res.status(400).json({ error: 'Invalid invite token' });
    if (invite.usedAt) return res.status(409).json({ error: 'Invite already used' });
    if (isBefore(invite.expiresAt, new Date())) return res.status(410).json({ error: 'Invite expired' });
    const email = invite.email;

    // Check if user already exists for invited email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'User with this email already exists' });

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email,
        password: hashedPassword,
        // Assign role based on invitation
        isAdmin: invite.isAdmin,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        createdAt: true
      }
    });

    // Mark invitation used
    await prisma.invitation.update({ where: { token: validatedData.token }, data: { usedAt: new Date() } });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      user,
      token
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedPassword = password.trim();

    // Find user with case-insensitive email match
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        isAdmin: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.password) {
      console.error('User has no password set in database');
      return res.status(500).json({ error: 'Account configuration error' });
    }

    // Check password with error handling
    let isValidPassword = false;
    try {
      isValidPassword = await comparePassword(trimmedPassword, user.password);
    } catch (error) {
      console.error('Password comparison error:', error);
      return res.status(500).json({
        error: 'Error validating credentials',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate access token (7 days)
    const accessToken = generateToken(user.id);

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      accessToken
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// No refresh-token endpoint in single-token strategy

export const handleLogout: RequestHandler = (req, res) => {
  // Stateless: client will clear its local token
  res.json({ message: 'Logged out successfully' });
};

export const handleMe: RequestHandler = (req: AuthenticatedRequest, res) => {
  // Return current user data (req.user is set by authenticateToken middleware)
  res.json({ user: req.user });
};

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"]
});

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email address').optional()
}).refine((data) => data.name || data.email, {
  message: "At least one field (name or email) must be provided"
});

export const handleUpdatePassword: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = updatePasswordSchema.parse(req.body);

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(validatedData.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(validatedData.newPassword);

    // Update password
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedNewPassword }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Update password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/auth/user-by-email?email=user@example.com
export const handleFindUserByEmail: RequestHandler = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email query parameter is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error finding user by email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const handleUpdateProfile: RequestHandler = async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = updateProfileSchema.parse(req.body);

    // Check if email is being updated and if it already exists
    if (validatedData.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email }
      });

      if (existingUser && existingUser.id !== req.user!.id) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        createdAt: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
