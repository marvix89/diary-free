'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setMessage('Se l\'indirizzo email è registrato, riceverai un link per ripristinare la password.');
        setEmail('');
      } else {
        const data = await res.json();
        setError(data.error || 'Si è verificato un errore.');
      }
    } catch (err) {
      setError('Errore di rete. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo-icon">🥛</div>
          <span className="auth-logo-text">Dairy Free</span>
        </div>

        <h1 className="auth-title">Recupera Password</h1>
        <p className="auth-subtitle">
          Inserisci la tua email per ricevere il link di ripristino.
        </p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="forgot-email">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              className="form-input"
              placeholder="tu@esempio.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {error && (
            <div className="auth-error" role="alert">
              ⚠️ {error}
            </div>
          )}

          {message && (
            <div style={{ color: 'var(--success)', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', fontSize: '0.875rem', marginBottom: '1rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              ✅ {message}
            </div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? '⏳ Invio in corso…' : 'Invia Link'}
          </button>
        </form>

        <p className="auth-footer-link">
          <Link href="/login">← Torna al Login</Link>
        </p>
      </div>
    </div>
  );
}
