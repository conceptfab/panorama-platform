'use client';

import { useState } from 'react';
import { AccessControl, AccessRule } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface AccessControlPanelProps {
  accessControl: AccessControl;
}

export function AccessControlPanel({
  accessControl: initialData,
}: AccessControlPanelProps) {
  const [accessControl, setAccessControl] = useState(initialData);
  const [newWhitelistPattern, setNewWhitelistPattern] = useState('');
  const [newBlacklistPattern, setNewBlacklistPattern] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const pending = accessControl.pending ?? [];

  const handlePendingAction = async (
    email: string,
    action: 'approve' | 'reject'
  ) => {
    setPendingAction(email);
    try {
      const res = await fetch('/api/access-control/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd');

      setAccessControl((prev) => ({
        ...prev,
        pending: (prev.pending ?? []).filter(
          (p) => p.email.toLowerCase() !== email.toLowerCase()
        ),
      }));
      toast.success(data.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nie udało się');
    } finally {
      setPendingAction(null);
    }
  };

  const handleAddRule = async (type: 'whitelist' | 'blacklist') => {
    const pattern =
      type === 'whitelist' ? newWhitelistPattern : newBlacklistPattern;
    if (!pattern.trim()) {
      toast.error('Podaj wzorzec');
      return;
    }

    try {
      const res = await fetch('/api/access-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, pattern: pattern.trim() }),
      });

      if (!res.ok) throw new Error('Failed to add rule');

      const data = await res.json();
      setAccessControl((prev) => ({
        ...prev,
        [type]: [...prev[type], data.rule],
      }));

      if (type === 'whitelist') {
        setNewWhitelistPattern('');
      } else {
        setNewBlacklistPattern('');
      }

      toast.success('Reguła dodana');
    } catch {
      toast.error('Nie udało się dodać reguły');
    }
  };

  const handleDeleteRule = async (
    id: string,
    type: 'whitelist' | 'blacklist'
  ) => {
    try {
      const res = await fetch(`/api/access-control/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete rule');

      setAccessControl((prev) => ({
        ...prev,
        [type]: prev[type].filter((r) => r.id !== id),
      }));

      toast.success('Reguła usunięta');
    } catch {
      toast.error('Nie udało się usunąć reguły');
    }
  };

  const RuleList = ({
    rules,
    type,
  }: {
    rules: AccessRule[];
    type: 'whitelist' | 'blacklist';
  }) => (
    <div className="space-y-2">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
        >
          <div>
            <code className="font-mono text-sm">{rule.pattern}</code>
            {rule.notes && (
              <p className="text-xs text-muted-foreground mt-1">{rule.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={rule.isActive ? 'default' : 'secondary'}>
              {rule.isActive ? 'Aktywna' : 'Nieaktywna'}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteRule(rule.id, type)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      {rules.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Brak reguł
        </p>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kontrola dostępu</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              Poczekalnia ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="whitelist">
              Whitelist ({accessControl.whitelist.length})
            </TabsTrigger>
            <TabsTrigger value="blacklist">
              Blacklist ({accessControl.blacklist.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Osoby, które poprosiły o dostęp – zatwierdź, aby wysłać im kod
              logowania.
            </p>
            <div className="space-y-2">
              {pending.map((req) => (
                <div
                  key={req.email}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <span className="font-medium">{req.email}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Prośba:{' '}
                      {new Date(req.requestedAt).toLocaleString('pl-PL')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handlePendingAction(req.email, 'approve')}
                      disabled={pendingAction === req.email}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Zatwierdź
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePendingAction(req.email, 'reject')}
                      disabled={pendingAction === req.email}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Odrzuć
                    </Button>
                  </div>
                </div>
              ))}
              {pending.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Brak osób w poczekalni
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="whitelist" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="np. *@firma.com"
                value={newWhitelistPattern}
                onChange={(e) => setNewWhitelistPattern(e.target.value)}
              />
              <Button onClick={() => handleAddRule('whitelist')}>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj
              </Button>
            </div>
            <RuleList rules={accessControl.whitelist} type="whitelist" />
          </TabsContent>

          <TabsContent value="blacklist" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="np. spam@example.com"
                value={newBlacklistPattern}
                onChange={(e) => setNewBlacklistPattern(e.target.value)}
              />
              <Button onClick={() => handleAddRule('blacklist')}>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj
              </Button>
            </div>
            <RuleList rules={accessControl.blacklist} type="blacklist" />
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground mt-4">
          Użyj <code>*</code> jako wildcard. Przykłady: <code>*@firma.com</code>
          , <code>jan@*</code>, <code>*</code> (wszyscy)
        </p>
      </CardContent>
    </Card>
  );
}
