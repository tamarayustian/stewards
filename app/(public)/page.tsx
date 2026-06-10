import { Sprout, Users, Scale, Handshake } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Users,
    title: 'Track Together',
    description: 'Create groups, add friends, and log shared expenses in seconds.',
  },
  {
    icon: Scale,
    title: 'Split Fairly',
    description: 'Equal or custom splits — everyone pays their share, no math required.',
  },
  {
    icon: Handshake,
    title: 'Settle Simply',
    description: 'See who owes whom and settle up with a tap. No IOUs, no spreadsheets.',
  },
];

export default function Home() {
  return (
    <>
      <section className="flex flex-1 flex-col items-center justify-center px-6 pt-20 pb-16 text-center">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <Sprout className="size-7 text-primary" />
        </div>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Split expenses with friends. <span className="text-primary">No spreadsheets needed.</span>
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          Track shared costs, split bills evenly or custom, and settle up — all in one place.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Button size="lg" render={<Link href="/register" />}>
            Create your first group
          </Button>
          <Button variant="outline" size="lg" render={<Link href="/login" />}>
            Sign in
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl grid-cols-1 gap-4 px-6 pb-20 sm:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} size="sm">
              <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
                <h3 className="font-medium">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </>
  );
}
