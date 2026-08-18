import { permanentRedirect } from 'next/navigation';

export default async function ExpensesPage() {
  permanentRedirect('/activity?view=feed');
}
