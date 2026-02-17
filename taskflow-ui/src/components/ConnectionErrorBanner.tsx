import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectionErrorBannerProps {
  visible: boolean;
}

export function ConnectionErrorBanner({ visible }: ConnectionErrorBannerProps) {
  if (!visible) return null;

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Unable to connect to database</span>
        <Button variant="outline" size="sm" asChild className="ml-4 border-destructive/50 text-destructive hover:bg-destructive/10">
          <Link to="/settings">Go to Settings</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
