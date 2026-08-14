import { BookUser } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { PeopleForm } from '@/components/people-form';
import { RemoveContactButton } from '@/components/remove-contact-button';
import { Card, CardContent } from '@/components/ui/card';
import { listContacts } from '@/lib/expenses';
import { createServerClientReadOnly } from '@/lib/supabase';

export default async function PeoplePage() {
  const cookieStore = await cookies();
  const supabase = createServerClientReadOnly(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const contacts = await listContacts(user.id);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">People</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">The people you split expenses with.</p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <PeopleForm />
        </CardContent>
      </Card>

      {contacts.length > 0 ? (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="flex items-center justify-between gap-4 pt-6">
                <div className="min-w-0">
                  <p className="truncate font-medium">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {contact.isRegistered ? contact.email : 'Contact — no account yet'}
                  </p>
                </div>
                <RemoveContactButton contactId={contact.id} name={contact.name} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <BookUser className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No people yet</p>
              <p className="text-sm text-muted-foreground">
                Add people you actually split money with — they&apos;ll show up here and in the
                expense form.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
