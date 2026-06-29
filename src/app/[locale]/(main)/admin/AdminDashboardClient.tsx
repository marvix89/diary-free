'use client';

import { useState, useEffect, useRef } from 'react';
import type { Product } from '@/types';

type SyncState = {
  query: string;
  currentPage: number;
  totalPages: number;
  totalProducts: number;
} | null;

type CategoryItem = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  count: number;
};

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
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
  const isSyncingRef = useRef(false);

  // Categories Admin State
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoadingCats, setIsLoadingCats] = useState(false);
  const [isRecategorizing, setIsRecategorizing] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [catLabel, setCatLabel] = useState('');
  const [catEmoji, setCatEmoji] = useState('🏷️');
  const [catColor, setCatColor] = useState('#6366f1');
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'categories') setActiveTab('categories');
      else setActiveTab('products');
    }
  }, []);

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

  const fetchCategories = async () => {
    setIsLoadingCats(true);
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingCats(false);
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

  useEffect(() => {
    if (activeTab === 'categories') {
      fetchCategories();
    }
  }, [activeTab]);

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
      updateSyncState(null);
    }

    let currentPage = startPage;
    let totalPages = syncState?.totalPages || 999;

    try {
      while (isSyncingRef.current && currentPage <= totalPages) {
        let success = false;
        let pageData: any = null;

        while (!success && isSyncingRef.current) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const res = await fetch('/api/admin/auto-import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ q: currentQuery, page: currentPage, limit: 100 }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`Errore Server (Codice: ${res.status})`);
            pageData = await res.json();
            success = true;
          } catch (err: any) {
            if (!isSyncingRef.current) break;
            setMessage({ type: 'error', text: `Errore a pagina ${currentPage}: ${err.message}. Riprovo tra 5s...` });
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }

        if (!isSyncingRef.current) break;

        totalPages = pageData.pageCount || 1;
        updateSyncState({
          query: currentQuery,
          currentPage: currentPage,
          totalPages: totalPages,
          totalProducts: pageData.totalCount || 0
        });

        fetchLocalProducts(1, pageSize);

        if (currentPage >= totalPages) {
          if (totalPages === 1 && (!pageData.totalCount || pageData.totalCount === 0)) {
            setMessage({ type: 'info', text: 'Nessun prodotto trovato per questa ricerca su OpenFoodFacts.' });
          } else {
            setMessage({ type: 'success', text: `Importazione completata! ${totalPages} pagine analizzate.` });
          }
          updateSyncState(null);
          break;
        }

        currentPage++;
        if (isSyncingRef.current) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          setMessage({ type: 'info', text: 'Importazione in corso...' });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Errore critico: ${(err as Error).message}` });
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

  const handleRunAutoCategorization = async (onlyCustom = false) => {
    setIsRecategorizing(true);
    setMessage({ type: 'info', text: `⚡ Categorizzazione automatica batch in corso (${onlyCustom ? 'Solo Personalizzati' : 'Tutto il DB'})...` });
    try {
      const res = await fetch('/api/admin/re-categorize-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlyCustomCategory: onlyCustom })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante la categorizzazione automatica');
      setMessage({ type: 'success', text: `✨ Categorizzazione completata! ${data.updatedCount} prodotti aggiornati su ${data.totalAnalyzed} analizzati.` });
      fetchCategories();
      fetchLocalProducts(1, pageSize);
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsRecategorizing(false);
    }
  };

  const handleStartEdit = (cat: CategoryItem) => {
    setEditingCat(cat);
    setCatLabel(cat.label);
    setCatEmoji(cat.emoji);
    setCatColor(cat.color);
    setIsCreatingCat(true);
  };

  const handleStartCreate = () => {
    setEditingCat(null);
    setCatLabel('');
    setCatEmoji('🏷️');
    setCatColor('#10b981');
    setIsCreatingCat(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catLabel.trim()) return;
    try {
      const url = editingCat ? `/api/admin/categories/${editingCat.id}` : '/api/admin/categories';
      const method = editingCat ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: catLabel, emoji: catEmoji, color: catColor })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore salvataggio categoria');
      setMessage({ type: 'success', text: `Categoria "${catLabel}" salvata con successo!` });
      setIsCreatingCat(false);
      setEditingCat(null);
      fetchCategories();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    }
  };

  const handleDeleteCategory = async (id: string, label: string) => {
    if (!confirm(`Sei sicuro di voler eliminare la categoria "${label}"? I prodotti associati verranno spostati in Personalizzato.`)) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore eliminazione categoria');
      setMessage({ type: 'success', text: `Categoria "${label}" eliminata con successo.` });
      fetchCategories();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    }
  };

  const handleCleanEmptyCategories = async () => {
    const emptyCount = categories.filter(c => c.count === 0 && c.id !== 'personalizzato').length;
    if (!confirm(`Vuoi eliminare definitivamente ${emptyCount} categorie che hanno 0 prodotti associati?`)) return;
    try {
      const res = await fetch('/api/admin/categories?empty=true', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante la pulizia');
      setMessage({ type: 'success', text: `🧹 Pulizia completata! Rimosse ${emptyCount} categorie vuote.` });
      fetchCategories();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    }
  };

  const progressPercentage = syncState && syncState.totalPages > 0 
    ? Math.round((syncState.currentPage / syncState.totalPages) * 100) 
    : 0;

  return (
    <div>
      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border-color)', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('products')}
          style={{
            padding: '1rem 1.5rem',
            background: activeTab === 'products' ? 'var(--surface)' : 'transparent',
            border: '1px solid var(--border-color)',
            borderBottom: activeTab === 'products' ? '3px solid #3b82f6' : '1px solid var(--border-color)',
            borderRadius: '0.5rem 0.5rem 0 0',
            color: activeTab === 'products' ? '#3b82f6' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '1.05rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          }}
        >
          <span>📦</span> Catalogo Prodotti & OFF
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          style={{
            padding: '1rem 1.5rem',
            background: activeTab === 'categories' ? 'var(--surface)' : 'transparent',
            border: '1px solid var(--border-color)',
            borderBottom: activeTab === 'categories' ? '3px solid #10b981' : '1px solid var(--border-color)',
            borderRadius: '0.5rem 0.5rem 0 0',
            color: activeTab === 'categories' ? '#10b981' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '1.05rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          }}
        >
          <span>🏷️</span> Gestione Categorie
        </button>
      </div>

      {message && (
        <div style={{
          padding: '1rem 1.25rem',
          marginBottom: '2rem',
          borderRadius: '0.75rem',
          backgroundColor: message.type === 'success' ? '#10b98118' : message.type === 'error' ? '#ef444418' : '#3b82f618',
          border: `1px solid ${message.type === 'success' ? '#10b981' : message.type === 'error' ? '#ef4444' : '#3b82f6'}`,
          color: message.type === 'success' ? '#10b981' : message.type === 'error' ? '#ef4444' : '#3b82f6',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
        </div>
      )}

      {/* TAB 1: PRODOTTI */}
      {activeTab === 'products' && (
        <div>
          <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--surface)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.25rem' }}>Sincronizzazione OpenFoodFacts</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Cerca una parola chiave per scaricare nuovi prodotti. Il processo analizzerà tutte le pagine disponibili in automatico.
            </p>

            {syncState ? (
              <div style={{ padding: '1.25rem', background: 'var(--bg)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontWeight: 600 }}>
                  <span>Importazione: {syncState.query ? `"${syncState.query}"` : "Generale"}</span>
                  <span>{progressPercentage}% (Pagina {syncState.currentPage} di {syncState.totalPages})</span>
                </div>
                
                <div style={{ width: '100%', height: '10px', background: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                  <div style={{ width: `${progressPercentage}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s ease' }}></div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {isSyncing ? (
                    <button onClick={stopSync} className="btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }}>
                      ⏸ Pausa Importazione
                    </button>
                  ) : (
                    <>
                      <button onClick={() => startOrResumeSync(undefined, true)} className="btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }}>
                        ▶ Riprendi da Pagina {syncState.currentPage + 1}
                      </button>
                      <button onClick={clearSync} style={{ padding: '0.6rem 1.25rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>
                        Annulla
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => startOrResumeSync(e, false)} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="es. 'soia' (lascia vuoto per importare gli ultimi prodotti generali)"
                  disabled={isSyncing}
                  style={{
                    flex: '1 1 300px',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
                <button type="submit" disabled={isSyncing} className="btn-primary" style={{ padding: '0.75rem 2rem' }}>
                  {isSyncing ? 'Avvio...' : '🔍 Cerca e Avvia'}
                </button>
              </form>
            )}
          </div>

          {!isSyncing && isLoading && <div style={{ textAlign: 'center', padding: '3rem' }}>⏳ Caricamento prodotti locali...</div>}

          {!isLoading && results.length > 0 && (
            <div style={{ overflowX: 'auto', background: 'var(--surface)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Prodotti nel Catalogo DB ({totalCount})</h2>
                <select 
                  value={pageSize} 
                  onChange={(e) => setPageSize(parseInt(e.target.value))}
                  style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-primary)' }}
                >
                  <option value={10}>10 per pagina</option>
                  <option value={25}>25 per pagina</option>
                  <option value={50}>50 per pagina</option>
                  <option value={100}>100 per pagina</option>
                </select>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '1rem 0.75rem' }}>Img</th>
                    <th style={{ padding: '1rem 0.75rem' }}>Prodotto</th>
                    <th style={{ padding: '1rem 0.75rem' }}>ID / Barcode</th>
                    <th style={{ padding: '1rem 0.75rem' }}>Categoria</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        {(p.enrichment?.imageThumbnailUrl || p.enrichment?.imageUrl) ? (
                          <img src={p.enrichment.imageThumbnailUrl || p.enrichment.imageUrl} alt="" style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '6px' }} />
                        ) : (
                          <div style={{ width: '42px', height: '42px', background: 'var(--bg)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                            {p.emoji || '🛒'}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <strong style={{ display: 'block', marginBottom: '0.2rem' }}>{p.name}</strong>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{p.enrichment?.brand || p.description}</span>
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.id}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--bg)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 600, border: '1px solid var(--border-color)' }}>
                          <span>{p.emoji}</span> {p.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalCount > pageSize && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '2rem', gap: '1rem' }}>
                  <button
                    onClick={() => fetchLocalProducts(page - 1, pageSize)}
                    disabled={isLoading || page === 1}
                    style={{ padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
                  >
                    ← Precedente
                  </button>
                  <span style={{ fontWeight: 700 }}>Pagina {page} di {Math.ceil(totalCount / pageSize) || 1}</span>
                  <button
                    onClick={() => fetchLocalProducts(page + 1, pageSize)}
                    disabled={isLoading || page >= Math.ceil(totalCount / pageSize)}
                    style={{ padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-primary)', cursor: page >= Math.ceil(totalCount / pageSize) ? 'not-allowed' : 'pointer', opacity: page >= Math.ceil(totalCount / pageSize) ? 0.5 : 1 }}
                  >
                    Successiva →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CATEGORIE */}
      {activeTab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Box Azione Categorizzazione Batch */}
          <div style={{
            padding: '1.75rem',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.15))',
            borderRadius: '1rem',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '2rem' }}>⚡</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)' }}>Categorizzazione Automatica Batch</h3>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  Esegui l&apos;algoritmo intelligente su tutti i prodotti nel database. Verranno ricreati i tag e le emoji corrette riparando eventuali prodotti finiti su &quot;Personalizzato&quot;.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <button
                onClick={() => handleRunAutoCategorization(true)}
                disabled={isRecategorizing}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none',
                  padding: '0.85rem 1.5rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
                  flex: '1 1 auto'
                }}
              >
                {isRecategorizing ? '⏳ Elaborazione...' : '🎯 Categorizza Solo Prodotti in "Personalizzato"'}
              </button>

              <button
                onClick={() => handleRunAutoCategorization(false)}
                disabled={isRecategorizing}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none',
                  padding: '0.85rem 1.5rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                  flex: '1 1 auto'
                }}
              >
                {isRecategorizing ? '⏳ Elaborazione...' : '🔄 Categorizza Tutto il Database'}
              </button>
            </div>
          </div>

          {/* Sezione Categorie */}
          <div style={{ background: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem' }}>Elenco Categorie DB ({categories.length})</h2>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Gestisci le etichette, i colori e i chip mostrati nei filtri della pagina principale.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {categories.some(c => c.count === 0 && c.id !== 'personalizzato') && (
                  <button
                    onClick={handleCleanEmptyCategories}
                    style={{ padding: '0.65rem 1.2rem', borderRadius: '0.5rem', border: '1px solid #f59e0b', background: '#f59e0b18', color: '#f59e0b', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}
                  >
                    <span>🧹</span> Rimuovi Categorie Vuote (0)
                  </button>
                )}
                <button
                  onClick={handleStartCreate}
                  className="btn-primary"
                  style={{ background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <span>➕</span> Nuova Categoria
                </button>
              </div>
            </div>

            {/* Form Modifica/Creazione Inline */}
            {isCreatingCat && (
              <form onSubmit={handleSaveCategory} style={{
                padding: '1.5rem',
                background: 'var(--bg)',
                borderRadius: '0.75rem',
                border: '1px solid #10b98155',
                marginBottom: '2rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.25rem',
                alignItems: 'end'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nome Categoria</label>
                  <input
                    type="text"
                    required
                    value={catLabel}
                    onChange={e => setCatLabel(e.target.value)}
                    placeholder="es. Dolci Senza Glutine"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Emoji Icona</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={catEmoji}
                    onChange={e => setCatEmoji(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--surface)', color: 'var(--text-primary)', textAlign: 'center', fontSize: '1.25rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Colore Badge</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={catColor}
                      onChange={e => setCatColor(e.target.value)}
                      style={{ width: '45px', height: '42px', padding: 0, border: 'none', borderRadius: '0.5rem', cursor: 'pointer', background: 'transparent' }}
                    />
                    <input
                      type="text"
                      value={catColor}
                      onChange={e => setCatColor(e.target.value)}
                      style={{ width: '100px', padding: '0.65rem 0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--surface)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1, background: '#10b981', borderColor: '#10b981' }}>
                    💾 Salva
                  </button>
                  <button type="button" onClick={() => setIsCreatingCat(false)} style={{ padding: '0.65rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
                    Annulla
                  </button>
                </div>
              </form>
            )}

            {isLoadingCats ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>⏳ Caricamento categorie...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {categories.map(c => (
                  <div key={c.id} style={{
                    padding: '1.25rem',
                    background: 'var(--bg)',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: `${c.color}25`,
                          border: `1.5px solid ${c.color}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          boxShadow: `0 2px 8px ${c.color}20`
                        }}>
                          {c.emoji}
                        </div>
                        <div>
                          <strong style={{ fontSize: '1.1rem', display: 'block', color: 'var(--text-primary)' }}>{c.label}</strong>
                          <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{c.id}</span>
                        </div>
                      </div>

                      <span style={{
                        background: 'var(--surface)',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '1rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: c.count > 0 ? '#3b82f6' : 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        whiteSpace: 'nowrap'
                      }}>
                        {c.count} prod.
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.85rem' }}>
                      <button
                        onClick={() => handleStartEdit(c)}
                        style={{ padding: '0.4rem 0.85rem', borderRadius: '0.4rem', border: '1px solid var(--border-color)', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        ✏️ Modifica
                      </button>
                      {c.id !== 'personalizzato' && (
                        <button
                          onClick={() => handleDeleteCategory(c.id, c.label)}
                          style={{ padding: '0.4rem 0.85rem', borderRadius: '0.4rem', border: '1px solid #ef444444', background: '#ef444412', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          🗑️ Elimina
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
