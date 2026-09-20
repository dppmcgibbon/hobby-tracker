# Lightweight Supabase PHP Auth & Games Catalog

A zero-dependency, drop-in PHP application that authenticates users with your existing Supabase project and provides the full hierarchical Games Catalog and Game Detail experience from Hobby Tracker.

- **Zero dependencies**: Pure PHP, no Composer, no Node.js required.
- **Drop-in ready**: Works on any standard shared hosting (cPanel), Apache, Nginx, or LiteSpeed server with PHP 7.4+.
- **Secure**: Native PHP session management with `httponly` and `samesite` cookies, CSRF protection, and token revocation on logout.
- **Hierarchical Navigation with Smart Direct Routing**:
  1. **Universes Table** (`index.php`): Displays table of universes and total games.
  2. **Games Table** (`index.php?universe=...`): Displays games in that universe. Games with no editions route straight to Game Detail!
  3. **Editions Table** (`index.php?universe=...&game=...`): Displays editions. Editions with no expansions route straight to Game Detail!
  4. **Expansions Table** (`index.php?universe=...&game=...&edition=...`): Displays expansions linking to Game Detail.
- **Feature-Complete Game Detail Page** (`detail.php`):
  - 3D Book / Box Cover preview with zoom lightbox.
  - **About & Resources Tab**: Lore overview, editable description, official references, and rules wikis with Add/Delete links support.
  - **PDF Documents Tab**: Organized rules, errata, and reference PDFs with direct opening/downloading and add document form.
  - **Images Tab**: Gallery grid with click-to-preview lightbox modal and add image form.
  - **Miniatures Tab**: Live query of miniatures linked to this game system with photos, painting status, faction tags, and storage boxes.

---

## File Structure

```
php-app/
├── config.php      # Supabase URL & Anon Key config + auth, hierarchy & detail queries
├── login.php       # Login page (Email + Password)
├── index.php       # Hierarchical Catalog (Universes -> Games -> Editions -> Expansions)
├── detail.php      # Feature-complete Game Detail page (Cover, Lore, PDFs, Images, Miniatures)
├── logout.php      # Signs out user and clears session
├── style.css       # Clean, modern, responsive styling
└── .env.example    # Optional environment variable template
```

---

## Configuration & Deployment

### Option A: Direct drop-in into web server

1. Copy the files in this folder (`config.php`, `login.php`, `index.php`, `logout.php`, `style.css`) directly into your server's public web directory (e.g. `public_html` or `/var/www/html/`).
2. Open `config.php` and set your Supabase project URL and anon public key:
   ```php
   define('SUPABASE_URL', 'https://your-project-id.supabase.co');
   define('SUPABASE_ANON_KEY', 'your-anon-key-here');
   ```
3. Visit `https://your-server.com/login.php` in your browser.

### Option B: Using a `.env` file or server environment variables

If your server supports environment variables or a `.env` file:
1. Rename `.env.example` to `.env` in the same directory.
2. Fill in:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. `config.php` will automatically detect and load these values.

---

## Local Testing

You can test this application locally using PHP's built-in web server:

```bash
cd php-app
php -S localhost:8080
```

Then navigate to `http://localhost:8080/login.php` in your browser.
