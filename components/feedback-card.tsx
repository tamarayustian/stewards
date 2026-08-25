'use client';

import { ImagePlus, MessageSquare, X } from 'lucide-react';
import { useActionState, useRef, useState } from 'react';

import { submitFeedback } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const MAX_IMAGES = 3;
const ACCEPT = 'image/png,image/jpeg,image/webp';

export function FeedbackCard({ email }: { email: string }) {
  const [state, action, pending] = useActionState(submitFeedback, undefined);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="size-4 text-primary" />
          Feedback
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Type</Label>
            <Select id="feedback-type" name="type" required className="w-full">
              <option value="feedback">General feedback</option>
              <option value="feature">Feature request</option>
              <option value="bug">Bug report</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-message">Message</Label>
            <textarea
              id="feedback-message"
              name="message"
              required
              rows={4}
              placeholder="Tell us what's on your mind..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
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

          <div className="space-y-2">
            <Label>Screenshots (optional, max 3)</Label>
            <div className="flex flex-wrap gap-3">
              {previews.map((src, i) => (
                <div key={src} className="relative size-20">
                  <img
                    src={src}
                    alt={`Screenshot ${i + 1}`}
                    className="size-full rounded-lg object-cover ring-1 ring-foreground/10"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white"
                    aria-label={`Remove screenshot ${i + 1}`}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {files.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex size-20 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-colors hover:border-muted-foreground/50"
                >
                  <ImagePlus className="size-5" />
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

          {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
          {state?.success && <p className="text-xs text-accent">Feedback sent — thank you!</p>}

          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Sending...' : 'Send feedback'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
