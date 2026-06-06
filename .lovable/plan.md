# Plan — Artemis Community

## 1. Backend (Lovable Cloud / Supabase)

J'active Lovable Cloud, puis je crée les tables suivantes avec RLS strict.

### Tables
- **`profiles`** — `id (uuid, FK auth.users)`, `nom (text)`, `qualificatif (text)`, `avatar_url (text?)`, `created_at`. Trigger auto-create au signup (nom/qualificatif vides par défaut, l'admin remplit ensuite).
- **`user_roles`** — `id`, `user_id`, `role (enum: admin | user)`. Fonction `has_role(uuid, app_role)` SECURITY DEFINER (anti-recursion RLS).
- **`post_its`** — `id`, `content (text)`, `updated_at`, `updated_by`. Lecture pour tous les authentifiés, écriture admin seulement.
- **`widgets`** — `id`, `slot (int)`, `type (text)`, `config (jsonb)`, `is_active (bool)`. Lecture authentifiés, écriture admin.
- **`gallery_items`** — `id`, `user_id`, `storage_path`, `caption`, `created_at`. RLS : chacun voit/édite uniquement ses propres items.

### Storage
- Bucket **`gallery`** privé. Policies : un user peut lire/upload/delete uniquement dans son dossier `{user_id}/...`.

### Sécurité RLS (toutes les tables)
- **`profiles`** : SELECT pour authentifiés (chacun voit les profils des autres pour affichage), **INSERT/UPDATE/DELETE réservés à l'admin uniquement** (`has_role(auth.uid(), 'admin')`). Les amis ne peuvent pas modifier leur propre profil — c'est toi qui définis qualificatif + nom.
- **`user_roles`** : SELECT soi-même, modif admin uniquement.
- **`post_its`** / **`widgets`** : SELECT authentifiés, ALL si admin.
- **`gallery_items`** : ALL où `user_id = auth.uid()`.
- Trigger : auto-création du profil vide + rôle 'user' au signup.

### Toi (Artemis)
- Après ton 1er login Magic Link, je te fournis 2 requêtes SQL : une pour te promouvoir `admin`, une pour remplir ton profil avec `qualificatif='Chasseresse'`, `nom='Artemis'`.

## 2. Frontend — Architecture

### Stylage : CSS Modules purs
- Variables CSS globales dans `src/styles/theme.css` :
  ```
  --bg: #0f172a; --violet: #5e2ca7; --orange: #ff8a00;
  --text: #f1f5f9; --muted: #94a3b8;
  --font: 'Inter', sans-serif;
  ```
- Chaque composant a son `Component.module.css`. Pas de Tailwind dans les composants Artemis.

### Routes (TanStack Start)
- `/auth` — page Magic Link (public)
- `/_authenticated/index` — dashboard 3 colonnes (layout protégé géré par l'intégration)

### Composants modulaires
```
src/components/artemis/
  Layout/DashboardLayout.tsx        — grid 3 colonnes responsive
  Header/Header.tsx                  — "Bonjour, [qualificatif] [nom]" + logout
  PostIt/PostItWidget.tsx            — colonne gauche, fetch read-only (edit si admin)
  WidgetGrid/WidgetGrid.tsx          — colonne centre, slots modulaires
  WidgetGrid/EmptySlot.tsx           — placeholder pour widgets futurs
  Gallery/GalleryColumn.tsx          — colonne droite (privée par user)
  Gallery/GalleryUpload.tsx          — input upload
  Gallery/GalleryItem.tsx            — vignette + delete
  Admin/AdminProfileEditor.tsx       — éditeur de profils visible uniquement pour toi
```

### Layout responsive
- Desktop : grid 25% / 50% / 25%.
- Mobile : stack vertical (post-it → widgets → gallery).
- Esthétique : fond sombre, bordures violettes subtiles, accents orange sur boutons/liens, espacement aéré.

## 3. Auth — Magic Links
- Page `/auth` minimaliste : input email → `supabase.auth.signInWithOtp({ email, emailRedirectTo: window.location.origin })`.
- Logout dans le header.

## 4. Données
- TanStack Query pour tous les fetchs (profil, post-it, widgets, gallery).
- Hooks : `useProfile()`, `usePostIt()`, `useWidgets()`, `useGallery()`, `useIsAdmin()`.
- Mutations admin (post-it, widgets, profils des amis) visibles uniquement si admin.

## 5. Ordre d'exécution
1. Activer Lovable Cloud.
2. Migration SQL : tables + RLS + trigger + bucket storage.
3. Page `/auth` Magic Link.
4. Theme CSS global + DashboardLayout.
5. Header + PostIt + WidgetGrid + Gallery (en parallèle).
6. Éditeur admin de profils.
7. Te fournir les requêtes SQL pour te promouvoir admin + remplir ton profil Artemis / Chasseresse.

## Notes
- Pas de Tailwind dans les composants Artemis — uniquement CSS Modules.
- Les amis n'éditent jamais leur profil : seule toi (admin) le fais.
- Widgets centraux : slots vides stylés pour l'instant, extensibles plus tard.

Confirme et je lance la construction.
