import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrencyAccounts, useCreateCurrencyAccount, useDeleteCurrencyAccount, useUpdateCurrencyAccount } from '@/hooks/useCurrencyAccounts';
import { Shield, Trash2, Pencil, Save, X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { MAJOR_CURRENCY_OPTIONS } from '@/lib/currency';
import { api } from '@/services/api';

type ErrorWithMessage = Error & {
  message: string;
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
};

// Options sourced from shared currency list

export default function AdminCurrencyAccounts() {
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const { toast } = useToast();
  const { data: accounts, isLoading, isError } = useCurrencyAccounts();
  const createMut = useCreateCurrencyAccount();
  const updateMut = useUpdateCurrencyAccount();
  const deleteMut = useDeleteCurrencyAccount();

  const [form, setForm] = useState<{ currency: string; accountNumber: string }>({ currency: 'EUR', accountNumber: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ currency: string; accountNumber: string }>({ currency: 'EUR', accountNumber: '' });
  // Visibility + decrypted cache per account
  const [visibleIds, setVisibleIds] = useState<Record<string, boolean>>({});
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});
  const createAccountInputRef = useRef<HTMLInputElement | null>(null);
  const editInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Account number validation constraints
  const MAX_ACCOUNT_DIGITS = 30; // server rejects > 30 per E2E expectation

  useEffect(() => {
    if (!isAdmin) {
      toast({ title: 'Access denied', description: 'Admin access required', variant: 'destructive' });
    }
  }, [isAdmin, toast]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Prevent double submission (sync + async guards)
      if (submittingRef.current || isSubmitting || createMut.isPending) return;
      if (!form.accountNumber || form.accountNumber.replace(/\D/g, '').length < 6) {
        toast({ title: 'Validation', description: 'Account number must be at least 6 digits', variant: 'destructive' });
        createAccountInputRef.current?.focus();
        return;
      }
      if (form.accountNumber.replace(/\D/g, '').length > MAX_ACCOUNT_DIGITS) {
        toast({ title: 'Validation', description: 'Account number too long', variant: 'destructive' });
        createAccountInputRef.current?.focus();
        return;
      }
      
      // Check if currency account already exists
      const existingAccount = accounts?.find(account => account.currency === form.currency);
      if (existingAccount) {
        toast({ 
          title: 'Duplicate Currency', 
          description: `An account for ${form.currency} already exists. Only one account per currency is allowed.`, 
          variant: 'destructive' 
        });
        return;
      }
      
      submittingRef.current = true;
      setIsSubmitting(true);
      await createMut.mutateAsync({ currency: form.currency, accountNumber: form.accountNumber });
      setForm({ currency: form.currency, accountNumber: '' });
      toast({ title: 'Saved', description: 'Currency account added', variant: 'success' });
    } catch (error) {
      const err = error as ErrorWithMessage;
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Unexpected error';
      toast({ 
        title: 'Failed to save', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };


  const startEdit = async (item: { id: string; currency: string; accountNumber?: string }) => {
    setEditingId(item.id);
    setEdit({ currency: item.currency, accountNumber: '' });
    try {
      setRowLoading((p) => ({ ...p, [item.id]: true }));
      // Fetch decrypted number for this currency (admin-only)
      const res = await api.getCurrencyAccountByCurrency(item.currency, { decrypted: true });
      if (res && res.accountNumber) {
        setDecryptedMap((p) => ({ ...p, [item.id]: res.accountNumber || '' }));
        // Pre-fill edit input with full number
        setEdit({ currency: item.currency, accountNumber: res.accountNumber });
      } else {
        // If no account found, just set empty account number for editing
        setEdit({ currency: item.currency, accountNumber: '' });
      }
    } catch {
      // ignore, keep masked
      setEdit({ currency: item.currency, accountNumber: '' });
    } finally {
      setRowLoading((p) => ({ ...p, [item.id]: false }));
      // Focus on the edit input after state updates
      setTimeout(() => {
        const input = editInputRefs.current[item.id];
        if (input) {
          input.focus();
          input.select();
        }
      }, 10);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEdit({ currency: 'EUR', accountNumber: '' });
  };

  const saveEdit = async (id: string) => {
    try {
      if (!edit.currency && !edit.accountNumber) {
        toast({ title: 'Nothing to update', description: 'Change currency or enter a new account number' });
        // Focus on the edit input
        setTimeout(() => {
          const input = editInputRefs.current[id];
          if (input) {
            input.focus();
            input.select();
          }
        }, 10);
        return;
      }
      if (edit.accountNumber && edit.accountNumber.replace(/\D/g, '').length < 6) {
        toast({ title: 'Validation', description: 'Account number must be at least 6 digits', variant: 'destructive' });
        // Focus on the edit input
        setTimeout(() => {
          const input = editInputRefs.current[id];
          if (input) {
            input.focus();
            input.select();
          }
        }, 10);
        return;
      }
      if (edit.accountNumber && edit.accountNumber.replace(/\D/g, '').length > MAX_ACCOUNT_DIGITS) {
        toast({ title: 'Validation', description: 'Account number too long', variant: 'destructive' });
        // Focus on the edit input
        setTimeout(() => {
          const input = editInputRefs.current[id];
          if (input) {
            input.focus();
            input.select();
          }
        }, 10);
        return;
      }
      
      // Check if changing to a currency that already exists (excluding current account)
      if (edit.currency) {
        const existingAccount = accounts?.find(account => account.currency === edit.currency && account.id !== id);
        if (existingAccount) {
          toast({ 
            title: 'Duplicate Currency', 
            description: `An account for ${edit.currency} already exists. Only one account per currency is allowed.`, 
            variant: 'destructive' 
          });
          // Focus on the edit input
          setTimeout(() => {
            const input = editInputRefs.current[id];
            if (input) {
              input.focus();
              input.select();
            }
          }, 10);
          return;
        }
      }
      
      await updateMut.mutateAsync(
        { id, data: { currency: edit.currency, accountNumber: edit.accountNumber || undefined } },
        {
          onSuccess: () => {
            // Update the decrypted map with the new account number if it was provided
            if (edit.accountNumber) {
              setDecryptedMap(prev => ({
                ...prev,
                [id]: edit.accountNumber
              }));
            }
            // Keep the row visible if it was visible before
            setVisibleIds(prev => ({
              ...prev,
              [id]: prev[id] || false
            }));
          }
        }
      );
      
      cancelEdit();
      toast({ title: 'Updated', description: 'Currency account updated', variant: 'success' });
    } catch (err: unknown) {
      const e = err as ErrorWithMessage;
      const errorMessage = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Unexpected error';
      toast({ title: 'Failed to update', description: errorMessage, variant: 'destructive' });
    }
  };

  const toggleVisibility = async (item: { id: string; currency: string }) => {
    const id = item.id;
    const willShow = !visibleIds[id];
    if (!willShow) {
      setVisibleIds((p) => ({ ...p, [id]: false }));
      return;
    }
    // Need to show: ensure we have decrypted in cache
    if (!decryptedMap[id]) {
      try {
        setRowLoading((p) => ({ ...p, [id]: true }));
        const res = await api.getCurrencyAccountByCurrency(item.currency, { decrypted: true });
        if (res && res.accountNumber) {
          setDecryptedMap((p) => ({ ...p, [id]: res.accountNumber }));
        } else {
          toast({ title: 'Account not found', description: 'No account found for this currency', variant: 'destructive' });
          setRowLoading((p) => ({ ...p, [id]: false }));
          return;
        }
      } catch {
        toast({ title: 'Access restricted', description: 'Cannot show full account number', variant: 'destructive' });
        setRowLoading((p) => ({ ...p, [id]: false }));
        return;
      } finally {
        setRowLoading((p) => ({ ...p, [id]: false }));
      }
    }
    setVisibleIds((p) => ({ ...p, [id]: true }));
  };

  const remove = async (id: string) => {
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: 'Deleted', description: 'Currency account removed', variant: 'success' });
    } catch (err: unknown) {
      toast({ title: 'Failed to delete', description: (err as Error)?.message ?? 'Unexpected error', variant: 'destructive' });
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-var(--app-sticky-offset))] bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="py-10 text-center text-red-600 font-semibold flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" /> Admin access required
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-var(--app-sticky-offset))] bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="group overflow-hidden rounded-sm border border-gray-200 shadow-md bg-white mb-6">
          <div className="h-1 w-full bg-gradient-to-r from-primary/95 via-primary/70 to-primary/60" />
          <CardContent>
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mt-4 mb-4">Add Currency Account</h3>
            <form onSubmit={handleCreate} className="flex flex-col md:flex-row md:items-end gap-2">
              <div className="md:w-1/4">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}>
                  <SelectTrigger className="mt-1 h-10" autoFocus>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAJOR_CURRENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.code} value={opt.code}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:w-2/3 min-w-0">
                <Label>Account Number</Label>
                <Input
                  className="mt-1 h-10"
                  placeholder="Enter account number"
                  value={form.accountNumber}
                  onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                  inputMode="numeric"
                  pattern="[0-9\s-]*"
                  ref={createAccountInputRef}
                />
              </div>
              <div className="flex-none md:self-end">
                <Button type="submit" className="h-10 bg-primary hover:bg-orange-500" disabled={isSubmitting || createMut.isPending}>
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>
            </form>
            {/* <p className="text-xs text-gray-500 mt-1">Stored encrypted. Only last 4 digits will be shown.</p> */}
          </CardContent>
        </Card>

        <Card className="group overflow-hidden rounded-sm border border-gray-200 shadow-md bg-white">
          <div className="h-1 w-full bg-gradient-to-r from-primary/95 via-primary/70 to-primary/60" />
          <CardContent>
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mt-4">Currency Accounts</h3>
              </div>
            {isLoading ? (
              <div className="py-6 text-center text-gray-500">Loading...</div>
            ) : isError ? (
              <div className="py-6 text-center text-red-600">Failed to load accounts</div>
            ) : (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left px-3 py-2">Currency</th>
                      <th className="text-left px-3 py-2">Account</th>
                      <th className="text-right px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts && accounts.length > 0 ? (
                      accounts.map((a) => (
                        <tr key={a.id} className="border-b">
                          <td className="px-3 py-2 align-middle">
                            {editingId === a.id ? (
                              <Select value={edit.currency} onValueChange={(v) => setEdit((p) => ({ ...p, currency: v }))}>
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MAJOR_CURRENCY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.code} value={opt.code}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="font-medium">{a.currency}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            {editingId === a.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  ref={(el) => {
                                    editInputRefs.current[a.id] = el;
                                  }}
                                  className="h-8"
                                  placeholder="Enter new account number (leave blank to keep)"
                                  value={edit.accountNumber}
                                  onChange={(e) => setEdit((p) => ({ ...p, accountNumber: e.target.value }))}
                                  inputMode="numeric"
                                  pattern="[0-9\s-]*"
                                />
                                {rowLoading[a.id] && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="tabular-nums tracking-wider">
                                  {visibleIds[a.id] && decryptedMap[a.id]
                                    ? decryptedMap[a.id]
                                    : 'XXXXXX' + (decryptedMap[a.id] ? decryptedMap[a.id].slice(-4) : (a.last4 || ''))}
                                </span>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleVisibility(a)}>
                                  {rowLoading[a.id] ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : visibleIds[a.id] && decryptedMap[a.id] ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {editingId === a.id ? (
                              <div className="flex justify-end gap-2">
                                <Button size="sm" onClick={() => saveEdit(a.id)} className="bg-primary hover:bg-orange-500">
                                  <Save className="w-4 h-4 mr-1" /> Save
                                </Button>
                                <Button size="sm" variant="secondary" onClick={cancelEdit}>
                                  <X className="w-4 h-4 mr-1" /> Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="secondary" onClick={() => startEdit(a)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the currency account
                                        &quot;{a.currency} - XXXXX{a.last4}&quot; and remove it from the system.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => remove(a.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete Account
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-gray-500">No accounts yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
