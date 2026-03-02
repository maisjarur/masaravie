import { useState, useId } from 'react';
import { submitContact } from '../../api/contact';

export function ContactSection() {
  const headingId = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setStatus('Please fill in all fields.');
      setIsError(true);
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setStatus('Please enter a valid email address.');
      setIsError(true);
      return;
    }

    setLoading(true);
    setStatus('Sending\u2026');
    setIsError(false);

    try {
      await submitContact(trimmedName, trimmedEmail, trimmedMessage);
      setStatus("Message sent! We'll be in touch.");
      setIsError(false);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong.';
      setStatus(errMsg);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="contact-section" aria-labelledby={headingId}>
      <h2 id={headingId}>Get in touch</h2>
      <p className="contact-intro">
        Have a question, or want to list your space? We&apos;d love to hear from you.
      </p>
      <form className="contact-form" onSubmit={handleSubmit} noValidate>
        <div className="contact-row">
          <div className="contact-field">
            <label htmlFor="contact-name">Name</label>
            <input
              type="text"
              id="contact-name"
              placeholder="Your name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="contact-field">
            <label htmlFor="contact-email">Email</label>
            <input
              type="email"
              id="contact-email"
              placeholder="your@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <div className="contact-field">
          <label htmlFor="contact-message">Message</label>
          <textarea
            id="contact-message"
            rows={4}
            placeholder="Tell us about your space, or ask us anything\u2026"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="contact-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            Send message
          </button>
          {status && (
            <span className={`status-text${isError ? ' error' : ''}`}>
              {status}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
