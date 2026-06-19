# Dairy Free

**Dairy Free** è una web application moderna progettata per supportare le persone intolleranti al lattosio. Permette di consultare un catalogo di prodotti "sicuri", gestire una lista dei preferiti, e aggiungere prodotti personalizzati salvando tutte le informazioni in modo sicuro e cifrato.

## Caratteristiche
- **Catalogo Sicuro**: Un database di partenza con decine di prodotti testati, divisi per categorie (Latte, Formaggi, Snack, ecc.).
- **Livelli di Lattosio**: Classificazione chiara (`Senza lattosio`, `Tracce`, `Basso contenuto`).
- **Autenticazione**: Sistema di login e registrazione multi-utente protetto da password hashing (`bcrypt`).
- **Privacy e Sicurezza**: I prodotti personalizzati caricati dagli utenti sono **cifrati tramite AES-256-GCM**, rendendo i dati sensibili inaccessibili perfino a chi gestisce il database.
- **Supporto Preferiti**: Ogni utente può salvare i prodotti che acquista più spesso.

## Stack Tecnologico
- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Linguaggio**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Vercel Postgres (Neon DB)](https://neon.tech/)
- **Autenticazione**: [NextAuth v5 (Auth.js)](https://authjs.dev/)
- **Stile**: Vanilla CSS + CSS Variables (tema premium/dark)

---

## Istruzioni per lo Sviluppo Locale

### 1. Requisiti
- Node.js 18+ o 20+
- Un database PostgreSQL (consigliato: Vercel Postgres o Neon)

### 2. Installazione
Clona il progetto ed entra nella directory:
```bash
git clone https://github.com/[TuoUsername]/diary-free.git
cd diary-free
npm install
```

### 3. Variabili d'Ambiente
Copia il file di template fornito e nominalo `.env.local`:
```bash
cp .env.local.example .env.local
```
Quindi, apri il file `.env.local` e inserisci i dati corretti:
- `DATABASE_URL`: La stringa di connessione a Postgres.
- `AUTH_SECRET`: Genera un token casuale di 32 byte in esadecimale.
- `ENCRYPTION_KEY`: Genera un token casuale di 32 byte in esadecimale (fondamentale per decifrare i dati utente).

### 4. Avvio
Esegui il server di sviluppo:
```bash
npm run dev
```
Vai all'indirizzo `http://localhost:3000`.

---

## Licenza
Questo progetto è **Proprietario**. Tutti i diritti sono riservati. Consulta il file [LICENSE](LICENSE) per i dettagli.
