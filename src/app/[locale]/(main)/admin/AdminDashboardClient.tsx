'use client';

import { useState, useEffect, useRef } from 'react';
import type { Product } from '@/types';

type SyncState = {
  query: string;
  currentPage: number;
  totalPages: number;
  totalProducts: number;
} | null;

export default function AdminDashboardClient() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Sync Loop State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(null);
  
  // Reference per controllare il ciclo asincrono senza problemi di closure
  const isSyncingRef = useRef(false);

  const fetchLocalProducts = async (targetPage: number, targetPageSize: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/products?page=${targetPage}&limit=${targetPageSize}`);
      if (!res.ok) throw new Error('Errore durante il caricamento dei prodotti locali');
      const data = await res.json();
      
      setResults(data.products || []);
      setTotalCount(data.count || 0);
      setPage(targetPage);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocalProducts(1, pageSize);
    
    const saved = localStorage.getItem('diary_free_sync_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.currentPage < parsed.totalPages) {
          setSyncState(parsed);
          setQuery(parsed.query);
        } else {
          localStorage.removeItem('diary_free_sync_state');
        }
      } catch (e) {
        localStorage.removeItem('diary_free_sync_state');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  const updateSyncState = (newState: SyncState) => {
    setSyncState(newState);
    if (newState) {
      localStorage.setItem('diary_free_sync_state', JSON.stringify(newState));
    } else {
      localStorage.removeItem('diary_free_sync_state');
    }
  };

  const startOrResumeSync = async (e?: React.FormEvent, resumeFromState = false) => {
    if (e) e.preventDefault();
    setIsSyncing(true);
    isSyncingRef.current = true;
    setMessage({ type: 'info', text: 'Importazione avviata...' });

    let currentQuery = query;
    let startPage = 1;

    if (resumeFromState && syncState) {
      currentQuery = syncState.query;
      startPage = syncState.currentPage + 1;
    } else {
      // Inizia da zero
      updateSyncState(null);
    }

    let currentPage = startPage;
    let totalPages = syncState?.totalPages || 999; // Verrà aggiornato alla prima chiamata

    try {
      while (isSyncingRef.current && currentPage <= totalPages) {
        let success = false;
        let retryCount = 0;
        let pageData: any = null;

        while (!success && isSyncingRef.current) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // Timeout di 15 secondi

            const res = await fetch('/api/admin/auto-import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ q: currentQuery, page: currentPage, limit: 100 }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!res.ok) {
              throw new Error(`Errore Server (Codice: ${res.status})`);
            }
            
            pageData = await res.json();
            success = true; // Uscita dal ciclo di retry
          } catch (fetchErr) {
            retryCount++;
            
            // Calcola il tempo di attesa: 10s al primo tentativo, poi aumenta di 10s a ogni tentativo fallito
            const waitSeconds = 10 * retryCount;
            const waitIterations = waitSeconds * 10; // 1 iterazione = 100ms
            
            setMessage({ type: 'error', text: `Errore a pagina ${currentPage}: ${(fetchErr as Error).message}. Nuovo tentativo tra ${waitSeconds} secondi (Tentativo ${retryCount})...` });
            
            // Attesa incrementale prima di riprovare, controllando sempre che l'utente non abbia premuto Pausa
            for (let i = 0; i < waitIterations; i++) {
              if (!isSyncingRef.current) break;
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }

        // Se l'utente ha premuto pausa durante un retry o prima, interrompi il ciclo principale
        if (!isSyncingRef.current) break;

        totalPages = pageData.pageCount || 1;
        
        // Aggiorna lo stato nel localStorage e nell'interfaccia
        updateSyncState({
          query: currentQuery,
          currentPage: currentPage,
          totalPages: totalPages,
          totalProducts: pageData.totalCount || 0
        });

        // Ricarica i prodotti locali per far vedere i progressi
        fetchLocalProducts(1, pageSize);

        if (currentPage >= totalPages) {
          // Finito
          if (totalPages === 1 && (!pageData.totalCount || pageData.totalCount === 0)) {
            setMessage({ type: 'info', text: 'Nessun prodotto trovato per questa ricerca su OpenFoodFacts.' });
          } else {
            setMessage({ type: 'success', text: `Importazione completata! ${totalPages} pagine analizzate.` });
          }
          updateSyncState(null);
          break;
        }

        currentPage++;
        
        // Pausa normale di 5 secondi tra chiamate riuscite
        if (isSyncingRef.current) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          setMessage({ type: 'info', text: 'Importazione avviata...' }); // Ripristina il messaggio di info
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: `(Errore critico a pagina ${currentPage}): ${(err as Error).message}` });
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  };

  const stopSync = () => {
    isSyncingRef.current = false;
    setIsSyncing(false);
    setMessage({ type: 'info', text: 'Importazione messa in pausa.' });
  };

  const clearSync = () => {
    updateSyncState(null);
    setQuery('');
  };

  const progressPercentage = syncState && syncState.totalPages > 0 
    ? Math.round((syncState.currentPage / syncState.totalPages) * 100) 
    : 0;

  return (
    <div>
      <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Sincronizzazione OpenFoodFacts</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Cerca una parola chiave per scaricare nuovi prodotti. Il processo analizzerà tutte le pagine disponibili automaticamente.
        </p>

        {syncState ? (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg)', borderRadius: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong>Importazione in corso: {syncState.query ? `"${syncState.query}"` : "Generale"}</strong>
              <span>{progressPercentage}% (Pagina {syncState.currentPage} di {syncState.totalPages})</span>
            </div>
            
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '10px', background: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{ width: `${progressPercentage}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s ease' }}></div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              {isSyncing ? (
                <button onClick={stopSync} className="btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }}>
                  ⏸ Pausa Importazione
                </button>
              ) : (
                <>
                  <button onClick={() => startOrResumeSync(undefined, true)} className="btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }}>
                    ▶ Riprendi da Pagina {syncState.currentPage + 1}
                  </button>
                  <button onClick={clearSync} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '0.25rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Annulla e Nuova Ricerca
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => startOrResumeSync(e, false)} style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="es. 'soia' (lascia vuoto per importare gli ultimi prodotti generali)"
              disabled={isSyncing}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                background: 'var(--bg)',
                color: 'var(--text-primary)'
              }}
            />
            <button 
              type="submit" 
              disabled={isSyncing}
              className="btn-primary"
              style={{ padding: '0 2rem' }}
            >
              {isSyncing ? 'Avvio...' : 'Cerca e Avvia Loop'}
            </button>
          </form>
        )}
      </div>

      {message && (
        <div style={{
          padding: '1rem',
          marginBottom: '2rem',
          borderRadius: '0.5rem',
          backgroundColor: message.type === 'success' ? '#10b98122' : message.type === 'error' ? '#ef444422' : '#3b82f622',
          color: message.type === 'success' ? '#10b981' : message.type === 'error' ? '#ef4444' : '#3b82f6'
        }}>
          {message.text}
        </div>
      )}

      {!isSyncing && isLoading && <div style={{ textAlign: 'center', padding: '2rem' }}>Caricamento prodotti locali...</div>}

      {!isLoading && results.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h2>Prodotti nel Database ({totalCount})</h2>
              <select 
                value={pageSize} 
                onChange={(e) => setPageSize(parseInt(e.target.value))}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.25rem',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value={10}>10 per pagina</option>
                <option value={25}>25 per pagina</option>
                <option value={50}>50 per pagina</option>
                <option value={100}>100 per pagina</option>
              </select>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '1rem' }}>Immagine</th>
                <th style={{ padding: '1rem' }}>Nome Prodotto</th>
                <th style={{ padding: '1rem' }}>Barcode / ID</th>
                <th style={{ padding: '1rem' }}>Categoria / Tag</th>
              </tr>
            </thead>
            <tbody>
              {results.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                    {p.enrichment?.imageThumbnailUrl ? (
                      <img src={p.enrichment.imageThumbnailUrl} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', background: 'var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {p.emoji || '🛒'}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <strong>{p.name}</strong>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {p.enrichment?.brand || p.description}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.9em' }}>{p.id}</td>
                  <td style={{ padding: '1rem', fontSize: '0.9em' }}>
                    {p.tags?.slice(0, 3).map((tag: string) => (
                      <span key={tag} style={{ display: 'inline-block', background: 'var(--bg)', padding: '0.2rem 0.5rem', borderRadius: '1rem', marginRight: '0.5rem', marginBottom: '0.2rem' }}>
                        {tag.replace('en:', '')}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {totalCount > pageSize && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '2rem', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => fetchLocalProducts(page - 1, pageSize)}
                disabled={isLoading || page === 1}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.25rem',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  cursor: (isLoading || page === 1) ? 'not-allowed' : 'pointer',
                  opacity: (isLoading || page === 1) ? 0.5 : 1
                }}
              >
                Precedente
              </button>
              
              <span style={{ fontWeight: 'bold' }}>
                Pagina {page} di {Math.ceil(totalCount / pageSize) || 1}
              </span>

              <button
                type="button"
                onClick={() => fetchLocalProducts(page + 1, pageSize)}
                disabled={isLoading || page >= Math.ceil(totalCount / pageSize)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.25rem',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  cursor: (isLoading || page >= Math.ceil(totalCount / pageSize)) ? 'not-allowed' : 'pointer',
                  opacity: (isLoading || page >= Math.ceil(totalCount / pageSize)) ? 0.5 : 1
                }}
              >
                Successiva
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
