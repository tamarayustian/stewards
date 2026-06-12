import { Users } from 'lucide-react';

export default function GroupsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Users className="size-6 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-xl font-semibold">Groups</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        You haven&apos;t joined any groups yet.
      </p>
    </div>
  );
}
