import { Header } from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const fields = [
  { label: 'Host', value: 'localhost' },
  { label: 'Port', value: '5432' },
  { label: 'Database Name', value: 'taskflow_db' },
  { label: 'Username', value: 'admin' },
  { label: 'Password', value: '••••••••' },
];

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 max-w-xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Database settings will be functional when connected to a real backend.
          </AlertDescription>
        </Alert>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Database Configuration</h2>
          {fields.map(f => (
            <div key={f.label} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Input value={f.value} disabled className="bg-muted" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
