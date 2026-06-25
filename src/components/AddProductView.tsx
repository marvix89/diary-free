'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Category } from '@/types';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

const EMOJI_OPTIONS = [
  '🥛','🌿','🌾','🥥','🫙','🧀','🧈','🍌','🥑','🫐',
  '🥬','🥦','🍊','🍚','🌰','🫘','🍗','🐟','🐠','🥚',
  '💧','🍵','☕','🍫','🥜','🍿','🍧','🫒','🧂','🍶',
  '🥣','🫛','🍋','🍇','🥝','🍓','🥕','🌽','🧅','🧄',
  '🍎','🍑','🍐','🍒','🥭','🍍','🍅','🥔','🍠','🍞',
];

export default function AddProductView() {
  const t = useTranslations('AddProduct');
  const tCat = useTranslations('Categories');
  const { addCustomProduct, categories } = useApp();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('personalizzato');
  const [emoji, setEmoji] = useState('🌟');
  const [tagsInput, setTagsInput] = useState('');
  const [lactoseLevel, setLactoseLevel] = useState<'none' | 'trace' | 'low'>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const isFormValid = name.trim().length >= 2 && description.trim().length >= 5;

  const getCatName = (id: string, fallback: string) => {
    if (typeof tCat.has === 'function' && tCat.has(id)) {
      return tCat(id);
    }
    return fallback || id;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await addCustomProduct({
        name: name.trim(),
        description: description.trim(),
        category,
        emoji,
        tags,
        isLactoseFree: true,
        lactoseLevel,
      });

      setIsSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch {
      setSubmitError(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayCategories = categories.length > 0 ? categories : [{ id: 'personalizzato', label: 'Personalizzato', emoji: '⭐' }];

  return (
    <div className="add-view">
      <div className="add-hero">
        <div className="add-hero-icon">➕</div>
        <h1>{t('heroTitle')}</h1>
        <p>{t('heroDesc')}</p>
      </div>

      {isSuccess ? (
        <div className="empty-state" role="status" aria-live="polite">
          <span className="empty-icon">✅</span>
          <p className="empty-title">{t('successTitle')}</p>
          <p className="empty-desc">{t('successDesc')}</p>
        </div>
      ) : (
        <form
          className="add-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label={t('heroTitle')}
        >
          {/* Emoji picker */}
          <div className="form-group">
            <label className="form-label">{t('iconLabel')}</label>
            <div className="emoji-picker" role="listbox" aria-label={t('iconPickerLabel')}>
              {EMOJI_OPTIONS.map((e) => (
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
              <label className="form-label" htmlFor="product-name">
                {t('nameLabel')}
              </label>
              <input
                id="product-name"
                className="form-input"
                type="text"
                placeholder={t('namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                required
                aria-required="true"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="product-category">
                {t('categoryLabel')}
              </label>
              <select
                id="product-category"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {displayCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {getCatName(c.id, c.label)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="product-description">
              {t('descLabel')}
            </label>
            <textarea
              id="product-description"
              className="form-textarea"
              placeholder={t('descPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              required
              aria-required="true"
            />
            <span className="form-hint">{description.length}/200</span>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label" htmlFor="product-tags">
              {t('tagsLabel')}
            </label>
            <input
              id="product-tags"
              className="form-input"
              type="text"
              placeholder={t('tagsPlaceholder')}
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
            <span className="form-hint">{t('tagsHint')}</span>
          </div>

          {/* Lactose Level */}
          <div className="form-group">
            <label className="form-label" htmlFor="lactose-level">
              {t('lactoseLabel')}
            </label>
            <select
              id="lactose-level"
              className="form-select"
              value={lactoseLevel}
              onChange={(e) =>
                setLactoseLevel(e.target.value as 'none' | 'trace' | 'low')
              }
            >
              <option value="none">{t('lactoseNone')}</option>
              <option value="trace">{t('lactoseTrace')}</option>
              <option value="low">{t('lactoseLow')}</option>
            </select>
          </div>

          {submitError && (
            <div className="auth-error" role="alert">
              ⚠️ {submitError}
            </div>
          )}

          <button
            id="submit-product"
            type="submit"
            className="submit-btn"
            disabled={!isFormValid || isSubmitting}
            aria-disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>
        </form>
      )}
    </div>
  );
}
