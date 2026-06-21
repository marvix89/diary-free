'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Le password non coincidono.');
      return;
    }
    if (password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Errore durante la registrazione.');
        setLoading(false);
        return;
      }

      // Auto-login dopo la registrazione
      await signIn('credentials', { email, password, redirect: false });
      router.push('/');
      router.refresh();
    } catch {
      setError('Errore di rete. Controlla la connessione e riprova.');
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

        <h1 className="auth-title">Crea un account</h1>
        <p className="auth-subtitle">
          Registrati per salvare i tuoi prodotti preferiti.
        </p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">
              Nome (opzionale)
            </label>
            <input
              id="reg-name"
              type="text"
              className="form-input"
              placeholder="Il tuo nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              Email *
            </label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="tu@esempio.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">
              Password * (min. 8 caratteri)
            </label>
            <input
              id="reg-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">
              Conferma Password *
            </label>
            <input
              id="reg-confirm"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="auth-error" role="alert">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            id="register-submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? '⏳ Registrazione…' : '✨ Crea Account'}
          </button>
        </form>

        <p className="auth-footer-link">
          Hai già un account? <Link href="/login">Accedi</Link>
        </p>
      </div>
    </div>
  );
}
