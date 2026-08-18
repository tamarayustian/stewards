import { permanentRedirect } from 'next/navigation';

export default async function BalancesPage() {
  permanentRedirect('/activity?view=people');
}
