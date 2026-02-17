import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import type { ConnectionSettings } from '@/lib/api/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const STORAGE_KEY = 'taskflow_connection';

const defaultSettings: ConnectionSettings = {
  host: 'localhost',
  port: 5432,
  database: 'taskflow_db',
  username: 'admin',
  password: '',
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<ConnectionSettings>(defaultSettings);
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ConnectionSettings;
        setForm(parsed);
      }
    } catch {
      // ignore malformed data
    }
  }, []);

  function update(field: keyof ConnectionSettings, value: string) {
    setForm(prev => ({
      ...prev,
      [field]: field === 'port' ? (value === '' ? '' : Number(value)) : value,
    } as ConnectionSettings));
  }

  async function handleTest() {
    setTesting(true);
    try {
      const result = await apiClient.testConnection(form);
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
    setSaving(true);
    try {
      await apiClient.saveConnection(form);
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
                value={String(form[f.field])}
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
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleTest} disabled={busy}>
            {testing && <Loader2 className="h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-4">v1.0.0</p>
      </main>
    </div>
  );
}
