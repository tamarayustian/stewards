import { permanentRedirect } from 'next/navigation';

export default async function PeoplePage() {
  permanentRedirect('/groups#people');
}
