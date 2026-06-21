'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Token mancante. Richiedi un nuovo link.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Le password non coincidono.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setMessage('Password aggiornata con successo! Verrai reindirizzato al login...');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
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
    <form onSubmit={handleSubmit} className="auth-form" noValidate>
      <div className="form-group">
        <label className="form-label" htmlFor="reset-password">
          Nuova Password
        </label>
        <input
          id="reset-password"
          type="password"
          className="form-input"
          placeholder="•••••••• (min 8 caratteri)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="confirm-password">
          Conferma Password
        </label>
        <input
          id="confirm-password"
          type="password"
          className="form-input"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
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
        disabled={loading || !!message}
      >
        {loading ? '⏳ Aggiornamento…' : 'Aggiorna Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo-icon">🥛</div>
          <span className="auth-logo-text">Dairy Free</span>
        </div>

        <h1 className="auth-title">Imposta Nuova Password</h1>
        <p className="auth-subtitle">
          Scegli una nuova password per il tuo account.
        </p>

        <Suspense fallback={<p>Caricamento...</p>}>
          <ResetPasswordForm />
        </Suspense>

        <p className="auth-footer-link">
          <Link href="/login">← Torna al Login</Link>
        </p>
      </div>
    </div>
  );
}
