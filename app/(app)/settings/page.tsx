import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Settings className="size-6 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}
