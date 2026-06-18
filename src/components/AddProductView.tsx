import { useState, FormEvent } from 'react';
import type { Category, View } from '../types';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/products';

const EMOJI_OPTIONS = [
  '🥛','🌿','🌾','🥥','🫙','🧀','🧈','🍌','🥑','🫐',
  '🥬','🥦','🍊','🍚','🌰','🫘','🍗','🐟','🐠','🥚',
  '💧','🍵','☕','🍫','🥜','🍿','🍧','🫒','🧂','🍶',
  '🥣','🫛','🍋','🍇','🥝','🍓','🥕','🌽','🧅','🧄',
];

interface AddProductViewProps {
  onNavigate: (v: View) => void;
}

export default function AddProductView({ onNavigate }: AddProductViewProps) {
  const { addCustomProduct } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('personalizzato');
  const [emoji, setEmoji] = useState('🌟');
  const [tagsInput, setTagsInput] = useState('');
  const [lactoseLevel, setLactoseLevel] = useState<'none' | 'trace' | 'low'>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isFormValid = name.trim().length >= 2 && description.trim().length >= 5;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    addCustomProduct({
      name: name.trim(),
      description: description.trim(),
      category,
      emoji,
      tags,
      lactoseLevel,
      isLactoseFree: true,
    });

    setIsSuccess(true);
    setIsSubmitting(false);

    setTimeout(() => {
      setName('');
      setDescription('');
      setCategory('personalizzato');
      setEmoji('🌟');
      setTagsInput('');
      setLactoseLevel('none');
      setIsSuccess(false);
      onNavigate('catalog');
    }, 1500);
  };

  return (
    <div className="add-view">
      <div className="add-hero">
        <div className="add-hero-icon">➕</div>
        <h1>Aggiungi un Prodotto</h1>
        <p>Non trovi un prodotto sicuro? Aggiungilo tu alla tua lista personale.</p>
      </div>

      {isSuccess ? (
        <div className="empty-state" role="status" aria-live="polite">
          <span className="empty-icon">✅</span>
          <p className="empty-title">Prodotto aggiunto!</p>
          <p className="empty-desc">Il tuo prodotto è stato salvato. Redirezione al catalogo…</p>
        </div>
      ) : (
        <form className="add-form" onSubmit={handleSubmit} noValidate aria-label="Modulo aggiunta prodotto">

          {/* Emoji picker */}
          <div className="form-group">
            <label className="form-label">Icona Prodotto</label>
            <div className="emoji-picker" role="listbox" aria-label="Scegli un'icona">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  type="button"
                  role="option"
                  aria-selected={emoji === e}
                  className={`emoji-option ${emoji === e ? 'selected' : ''}`}
                  onClick={() => setEmoji(e)}
                  title={e}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name & Category */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="product-name">Nome Prodotto *</label>
              <input
                id="product-name"
                className="form-input"
                type="text"
                placeholder="es. Latte di Riso"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={60}
                required
                aria-required="true"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="product-category">Categoria</label>
              <select
                id="product-category"
                className="form-select"
                value={category}
                onChange={e => setCategory(e.target.value as Category)}
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="product-description">Descrizione *</label>
            <textarea
              id="product-description"
              className="form-textarea"
              placeholder="Descrivi brevemente il prodotto e perché è sicuro per intolleranti al lattosio…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={200}
              required
              aria-required="true"
            />
            <span className="form-hint">{description.length}/200 caratteri</span>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label" htmlFor="product-tags">Tag (separati da virgola)</label>
            <input
              id="product-tags"
              className="form-input"
              type="text"
              placeholder="es. vegan, proteico, senza glutine"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
            />
            <span className="form-hint">Aiutano nella ricerca per parola chiave</span>
          </div>

          {/* Lactose Level */}
          <div className="form-group">
            <label className="form-label" htmlFor="lactose-level">Livello di Lattosio</label>
            <select
              id="lactose-level"
              className="form-select"
              value={lactoseLevel}
              onChange={e => setLactoseLevel(e.target.value as 'none' | 'trace' | 'low')}
            >
              <option value="none">✓ 0% – Completamente privo</option>
              <option value="trace">⚠ Tracce – Quantità minime</option>
              <option value="low">~ Basso – Generalmente tollerato</option>
            </select>
          </div>

          <button
            id="submit-product"
            type="submit"
            className="submit-btn"
            disabled={!isFormValid || isSubmitting}
            aria-disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? '⏳ Salvataggio…' : '✨ Aggiungi Prodotto'}
          </button>
        </form>
      )}
    </div>
  );
}
