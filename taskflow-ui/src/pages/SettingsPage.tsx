import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import type { ConnectionSettings } from '@/lib/api/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const defaultSettings: ConnectionSettings = {
  host: 'localhost',
  port: 5432,
  database: 'taskflow_db',
  username: 'admin',
  password: '',
};

type ConnectionFormState = Omit<ConnectionSettings, 'port'> & {
  port: string;
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<ConnectionFormState>({
    ...defaultSettings,
    port: String(defaultSettings.port),
  });
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const parsed = await apiClient.getConnectionSettings();
        if (!parsed || !active) return;

        setForm({
          host: parsed.host ?? defaultSettings.host,
          port: String(parsed.port ?? defaultSettings.port),
          database: parsed.database ?? defaultSettings.database,
          username: parsed.username ?? defaultSettings.username,
          password: parsed.password ?? defaultSettings.password,
        });
      } catch {
        // ignore load errors
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  function update(field: keyof ConnectionFormState, value: string) {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  }

  function buildPayload(): ConnectionSettings | null {
    const port = Number(form.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      toast({
        title: 'Invalid port',
        description: 'Port must be an integer between 1 and 65535.',
        variant: 'destructive',
      });
      return null;
    }

    const host = form.host.trim();
    const database = form.database.trim();
    const username = form.username.trim();
    const password = form.password;

    if (!host || !database || !username) {
      toast({
        title: 'Missing required fields',
        description: 'Host, Database Name, and Username are required.',
        variant: 'destructive',
      });
      return null;
    }

    return {
      host,
      port,
      database,
      username,
      password,
    };
  }

  async function handleTest() {
    const payload = buildPayload();
    if (!payload) return;

    setTesting(true);
    try {
      const result = await apiClient.testConnection(payload);
      toast({
        title: result.success ? 'Connection successful' : 'Connection failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (err) {
      toast({
        title: 'Connection failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    const payload = buildPayload();
    if (!payload) return;

    setSaving(true);
    try {
      await apiClient.saveConnection(payload);
      toast({ title: 'Settings saved' });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  const fields: { label: string; field: keyof ConnectionSettings; type?: string; placeholder?: string }[] = [
    { label: 'Host', field: 'host', placeholder: 'localhost' },
    { label: 'Port', field: 'port', type: 'number', placeholder: '5432' },
    { label: 'Database Name', field: 'database', placeholder: 'taskflow_db' },
    { label: 'Username', field: 'username', placeholder: 'admin' },
  ];

  const busy = testing || saving;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 max-w-xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Database Configuration</h2>

          {fields.map(f => (
            <div key={f.field} className="space-y-1.5">
              <Label htmlFor={f.field}>{f.label}</Label>
              <Input
                id={f.field}
                type={f.type || 'text'}
                placeholder={f.placeholder}
                value={form[f.field]}
                onChange={e => update(f.field, e.target.value)}
                disabled={busy}
              />
            </div>
          ))}

          {/* Password with show/hide */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                disabled={busy}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleTest} disabled={busy}>
            {testing && <Loader2 className="h-4 w-4 animate-spin" />}
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-4">v1.0.0</p>
      </main>
    </div>
  );
}
