import { apiFetch } from './client';

export async function submitContact(name: string, email: string, message: string): Promise<void> {
  const res = await apiFetch<{ ok: boolean; error?: string }>('/api/contact', {
    method: 'POST',
    body: JSON.stringify({ name, email, message }),
  });
  if (!res.ok) throw new Error(res.error || 'Failed to send message');
}
