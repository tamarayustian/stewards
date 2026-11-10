export function SettingsBlock({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string;
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 border-t border-line py-7 first:border-t-2 first:border-t-ink"
    >
      <p className="eyebrow">{number}</p>
      <h2 className="mt-2 font-heading text-[20px] font-bold tracking-[-0.03em] text-ink">
        {title}
      </h2>
      <p className="mt-1 max-w-[60ch] text-[13px] text-body">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
