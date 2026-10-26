import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../auth';
import { encryptAccountNumber, last4OfAccount, decryptAccountNumber } from '../utils/crypto';

const router = Router();

const createSchema = z.object({
  currency: z.string().min(1),
  accountNumber: z.string().min(6),
  userId: z.string().optional(), // optional to allow admin to create for a specific user later if needed
});

const updateSchema = z.object({
  currency: z.string().min(1).optional(),
  accountNumber: z.string().min(6).optional(),
});

// Public to authenticated users: get masked account by currency
router.get('/by-currency/:currency', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const currency = String(req.params.currency || '').toUpperCase();
    const decryptedParam = String(req.query.decrypted || '') === '1';
    const acc = await prisma.currencyAccount.findFirst({
      where: { currency },
      orderBy: { createdAt: 'desc' },
      select: { id: true, currency: true, encryptedData: true, last4: true, userId: true, createdAt: true, updatedAt: true },
    });
    if (!acc) return res.status(200).json(null);

    // Policy: any authenticated user may request decrypted value when explicitly opted-in via ?decrypted=1
    const canDecrypt = decryptedParam;
    if (canDecrypt) {
      try {
        const accountNumber = decryptAccountNumber(acc.encryptedData);
        return res.json({ id: acc.id, currency: acc.currency, accountNumber, last4: acc.last4, userId: acc.userId, createdAt: acc.createdAt, updatedAt: acc.updatedAt });
      } catch (e) {
        console.error('Decryption failed', e);
        return res.status(500).json({ error: 'Failed to decrypt account' });
      }
    }
    return res.json({ id: acc.id, currency: acc.currency, last4: acc.last4, userId: acc.userId, createdAt: acc.createdAt, updatedAt: acc.updatedAt });
  } catch (err) {
    console.error('Error fetching currency account by currency', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin-only routes below
router.use(authenticateToken, requireAdmin);

// GET /api/currency-accounts
router.get('/', async (_req, res) => {
  const accounts = await prisma.currencyAccount.findMany({
    select: { id: true, currency: true, last4: true, userId: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(accounts);
});

// GET /api/currency-accounts/by-currency/:currency
// Returns the account for a given currency. If ?decrypted=1, include plaintext accountNumber.
// (moved above; see public route)

// POST /api/currency-accounts
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { currency, accountNumber, userId } = createSchema.parse(req.body);
    const ownerUserId = userId ?? req.user!.id; // default to current admin

    const encryptedData = encryptAccountNumber(accountNumber);
    const last4 = last4OfAccount(accountNumber);

    const created = await prisma.currencyAccount.create({
      data: { currency, encryptedData, last4, userId: ownerUserId },
      select: { id: true, currency: true, last4: true, userId: true, createdAt: true, updatedAt: true },
    });

    res.status(201).json(created);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    console.error('Error creating currency account', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/currency-accounts/:id
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { currency, accountNumber } = updateSchema.parse(req.body);

    const data: {
      currency?: string;
      encryptedData?: string;
      last4?: string;
    } = {};
    if (currency) data.currency = currency;
    if (accountNumber) {
      data.encryptedData = encryptAccountNumber(accountNumber);
      data.last4 = last4OfAccount(accountNumber);
    }

    const updated = await prisma.currencyAccount.update({
      where: { id },
      data,
      select: { id: true, currency: true, last4: true, userId: true, createdAt: true, updatedAt: true },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    console.error('Error updating currency account', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/currency-accounts/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await prisma.currencyAccount.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting currency account', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
