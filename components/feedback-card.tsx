'use client';

import { useEffect, useActionState, useRef, useState } from 'react';

import { submitFeedback } from '@/app/(app)/actions';
import { FormError } from '@/components/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/toast';

const MAX_IMAGES = 3;
const ACCEPT = 'image/png,image/jpeg,image/webp';

export function FeedbackCard({ email }: { email: string }) {
  const [state, action, pending] = useActionState(submitFeedback, undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.success) toast({ title: 'Feedback sent — thank you!', variant: 'success' });
  }, [state?.success, toast]);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const remaining = MAX_IMAGES - files.length;
    const next = selected.slice(0, remaining);

    const newPreviews = next.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...next]);
    setPreviews((prev) => [...prev, ...newPreviews]);

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(formData: FormData) {
    files.forEach((file, i) => {
      formData.set(`image_${i}`, file);
    });
    action(formData);
    if (!state?.error) {
      setFiles([]);
      setPreviews([]);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="feedback-type">Type</Label>
          <Select id="feedback-type" name="type" required className="w-full">
            <option value="feedback">General feedback</option>
            <option value="feature">Feature request</option>
            <option value="bug">Bug report</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedback-email">Email (optional)</Label>
          <Input
            id="feedback-email"
            name="email"
            type="email"
            defaultValue={email}
            placeholder="For follow-up"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-message">Message</Label>
        <textarea
          id="feedback-message"
          name="message"
          required
          rows={4}
          placeholder="Tell us what's on your mind..."
          className="min-h-24 w-full rounded-md border border-line-strong bg-paper px-3 py-2 text-[15px] placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
      </div>

      <div className="space-y-2">
        <Label>Screenshots (optional, max 3)</Label>
        <div className="flex flex-wrap gap-3">
          {previews.map((src, i) => (
            <div key={src} className="relative size-20">
              <img
                src={src}
                alt={`Screenshot ${i + 1}`}
                className="size-full rounded-md object-cover ring-1 ring-line"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-rust text-[11px] font-semibold text-paper"
                aria-label={`Remove screenshot ${i + 1}`}
              >
                ×
              </button>
            </div>
          ))}
          {files.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-20 items-center justify-center rounded-md border-2 border-dashed border-line-strong text-lg text-ink-muted transition-colors hover:border-ink hover:text-ink"
              aria-label="Add screenshot"
            >
              +
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <FormError message={state?.error} />

      <Button type="submit" disabled={pending}>
        {pending ? 'Sending...' : 'Send feedback'}
      </Button>
    </form>
  );
}
