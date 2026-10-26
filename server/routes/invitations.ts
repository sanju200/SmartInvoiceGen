import { Router } from 'express';
import { prisma } from '../db';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../auth';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { addDays, isBefore } from 'date-fns';

const router = Router();

// Resolve base URL for generating invite links
function resolveAppUrl(req: AuthenticatedRequest): string {
  const headerOrigin = (req.headers.origin as string) || '';
  // In some cases only referer is present; extract origin part
  const referer = (req.headers.referer as string) || '';
  let derived = '';
  try {
    if (headerOrigin) derived = new URL(headerOrigin).origin;
    else if (referer) derived = new URL(referer).origin;
  } catch {
    derived = '';
  }
  return derived || process.env.APP_URL || 'http://localhost:5173';
}

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  expiresInDays: z.number().int().min(1).max(90).optional().default(14),
  isAdmin: z.boolean().optional().default(false),
});

// Admin-only: list invitations
router.get('/admin/invitations', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const invitations = await prisma.invitation.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const appUrl = resolveAppUrl(req);
    type InvitationWithAdmin = {
      id: string;
      email: string;
      token: string;
      expiresAt: Date;
      usedAt: Date | null;
      createdAt: Date;
      isAdmin: boolean;
    };

    const items = invitations.map((inv: InvitationWithAdmin) => ({
      id: inv.id,
      email: inv.email,
      token: inv.token,
      expiresAt: inv.expiresAt,
      usedAt: inv.usedAt,
      createdAt: inv.createdAt,
      isAdmin: inv.isAdmin ?? false,
      inviteLink: `${appUrl}/signup?token=${inv.token}`,
    }));

    res.json({ invitations: items });
  } catch (error) {
    console.error('List invitations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin-only: cancel (delete) invitation if not used
router.delete('/admin/invitations/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const invitation = await prisma.invitation.findUnique({ where: { id } });
    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    if (invitation.usedAt) return res.status(409).json({ error: 'Cannot cancel a used invitation' });

    await prisma.invitation.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin-only: delete user (only if invitation was accepted)
router.delete('/admin/users/:email', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {

  try {
    const { email } = req.params;
    const decodedEmail = decodeURIComponent(email);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: decodedEmail },
      include: {
        projects: {
          include: {
            employees: true
          }
        },
        currencyAccounts: true,
        invitationsCreated: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user.id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Delete user and related data in correct order
    await prisma.$transaction(async (tx) => {
      // First, delete all employees for user's projects
      for (const project of user.projects) {
        await tx.employee.deleteMany({
          where: { projectId: project.id }
        });
      }

      // Delete user's projects
      await tx.project.deleteMany({
        where: { userId: user.id }
      });

      // Delete user's currency accounts
      await tx.currencyAccount.deleteMany({
        where: { userId: user.id }
      });

      // Delete invitations created by this user (update to null or reassign)
      await tx.invitation.updateMany({
        where: { createdByUserId: user.id },
        data: { createdByUserId: req.user!.id } // Reassign to current admin
      });

      // Delete all invitations for this email (both used and unused)
      await tx.invitation.deleteMany({
        where: { email: decodedEmail }
      });

      // Finally, delete the user
      await tx.user.delete({ where: { id: user.id } });
    }, {
      timeout: 30000 // 30 second timeout for complex deletions
    });
    res.status(204).send();
  } catch (error) {
    console.error('Delete user error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Provide more specific error messages
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        errorMessage = 'Cannot delete user due to data dependencies';
      } else if (error.message.includes('Record to delete does not exist')) {
        errorMessage = 'User not found or already deleted';
      } else if (error.message.includes('Timeout')) {
        errorMessage = 'Delete operation timed out - please try again';
      }
    }

    res.status(500).json({ error: errorMessage });
  }
});

// Admin-only: create invitation
router.post('/admin/invitations', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { email, expiresInDays, isAdmin } = createInvitationSchema.parse(req.body);

    // If user already exists, block inviting again
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    // If an active (unused, unexpired) invite already exists, block duplicate invite
    const now = new Date();
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        email,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existingInvite) {
      return res.status(409).json({ error: 'An active invitation already exists for this email' });
    }
    const token = randomBytes(24).toString('hex');
    const expiresAt = addDays(new Date(), expiresInDays ?? 14);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        token,
        expiresAt,
        isAdmin: !!isAdmin,
        createdByUserId: req.user!.id,
      }
    });

    const appUrl = resolveAppUrl(req);
    const inviteLink = `${appUrl}/signup?token=${invitation.token}`;

    // Create a properly typed response object
    const response = {
      id: invitation.id,
      email: invitation.email,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      isAdmin: invitation.isAdmin,
      inviteLink
    };

    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Create invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public: validate invitation token and return email
router.get('/auth/invitations/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      select: {
        email: true,
        expiresAt: true,
        usedAt: true,
        isAdmin: true
      }
    });

    if (!invitation) return res.status(404).json({ error: 'Invalid token' });
    if (invitation.usedAt) return res.status(409).json({ error: 'Invite already used' });
    if (isBefore(invitation.expiresAt, new Date())) return res.status(410).json({ error: 'Invite expired' });

    res.json({
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      isAdmin: invitation.isAdmin
    });
  } catch (error) {
    console.error('Validate invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
