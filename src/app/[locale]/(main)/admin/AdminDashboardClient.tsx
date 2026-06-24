'use client';

import { useState } from 'react';
import type { Product } from '@/types';

type EnrichedProduct = Product & { conflictStatus: 'new' | 'exists' | 'duplicate_name' };

export default function AdminDashboardClient() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<EnrichedProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPage = async (targetPage: number, targetPageSize: number) => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/off-search?q=${encodeURIComponent(query)}&limit=${targetPageSize}&page=${targetPage}`);
      if (!res.ok) throw new Error('Errore durante la ricerca');
      const data = await res.json();
      
      const newProducts = data.products || [];
      if (newProducts.length === 0 && targetPage > 1) {
        throw new Error('Nessun risultato in questa pagina.');
      }

      setResults(newProducts);
      setTotalCount(data.count || 0);
      setPage(targetPage);
      
      // Auto-seleziona i prodotti nuovi
      const newIds = new Set(
        newProducts
          .filter((p: EnrichedProduct) => p.conflictStatus === 'new')
          .map((p: EnrichedProduct) => p.id)
      );
      setSelectedIds(newIds as Set<string>);
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  const searchOFF = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchPage(1, pageSize);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const importSelected = async () => {
    const toImport = results.filter(p => selectedIds.has(p.id));
    if (toImport.length === 0) return;

    setIsImporting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: toImport }),
      });
      if (!res.ok) throw new Error('Errore durante l\'importazione');
      const data = await res.json();
      setMessage({ type: 'success', text: `Importati con successo ${data.count} prodotti!` });
      
      // Aggiorna lo stato dei conflitti
      setResults(prev => prev.map(p => 
        selectedIds.has(p.id) ? { ...p, conflictStatus: 'exists' } : p
      ));
      setSelectedIds(new Set());
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div>
      <form onSubmit={searchOFF} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca su Open Food Facts (es. 'soia')"
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-color)',
            background: 'var(--surface)',
            color: 'var(--text-primary)'
          }}
        />
        <button 
          type="submit" 
          disabled={isLoading}
          className="btn-primary"
          style={{ padding: '0 2rem' }}
        >
          {isLoading ? 'Ricerca...' : 'Cerca su OFF'}
        </button>
      </form>

      {message && (
        <div style={{
          padding: '1rem',
          marginBottom: '2rem',
          borderRadius: '0.5rem',
          backgroundColor: message.type === 'success' ? '#10b98122' : '#ef444422',
          color: message.type === 'success' ? '#10b981' : '#ef4444'
        }}>
          {message.text}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h2>Risultati ({results.length} di {totalCount})</h2>
              <select 
                value={pageSize} 
                onChange={(e) => {
                  const newSize = parseInt(e.target.value);
                  setPageSize(newSize);
                  if (query && totalCount > 0) {
                    fetchPage(1, newSize);
                  }
                }}
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
            <button
              onClick={importSelected}
              disabled={isImporting || selectedIds.size === 0}
              className="btn-primary"
            >
              {isImporting ? 'Importazione...' : `Importa Selezionati (${selectedIds.size})`}
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '1rem' }}>
                  <input 
                    type="checkbox" 
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(results.map(p => p.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    checked={selectedIds.size === results.length && results.length > 0}
                  />
                </th>
                <th style={{ padding: '1rem' }}>Stato</th>
                <th style={{ padding: '1rem' }}>Immagine</th>
                <th style={{ padding: '1rem' }}>Nome Prodotto</th>
                <th style={{ padding: '1rem' }}>Barcode</th>
              </tr>
            </thead>
            <tbody>
              {results.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                    <input 
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                    />
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {p.conflictStatus === 'new' && <span style={{ color: '#10b981', fontWeight: 'bold' }}>Nuovo</span>}
                    {p.conflictStatus === 'exists' && <span style={{ color: '#6b7280' }}>Già nel DB</span>}
                    {p.conflictStatus === 'duplicate_name' && <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>Nome simile</span>}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {p.enrichment?.imageThumbnailUrl && (
                      <img src={p.enrichment.imageThumbnailUrl} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <strong>{p.name}</strong>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{p.enrichment?.brand}</div>
                  </td>
                  <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{p.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {totalCount > pageSize && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '2rem', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => fetchPage(page - 1, pageSize)}
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
                onClick={() => fetchPage(page + 1, pageSize)}
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
