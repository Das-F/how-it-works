
# Plan — Dashboards multiples partagés

## Concept

Aujourd'hui : **un seul dashboard global** partagé par tous. Demain : **plusieurs dashboards isolés**. Tu (admin) possèdes :
- Ton dashboard perso (bac à sable pour tester)
- Autant de dashboards partagés que tu veux, chacun avec ses propres post-its, widgets, galerie et messagerie
- Chaque dashboard peut contenir plusieurs invités

Un sélecteur en haut du dashboard permet de basculer entre tous tes dashboards.

## Backend (migration)

### Nouvelles tables

- **`dashboards`** — `id`, `name` (ex: "Famille", "Amis Lyon"), `owner_id`, `is_personal` (bool), `created_at`. L'owner est admin du dashboard.
- **`dashboard_members`** — `dashboard_id`, `user_id`, `joined_at`. Lien N-N entre users et dashboards.
- **`dashboard_invitations`** — `id`, `dashboard_id`, `email`, `token` (uuid), `invited_by`, `created_at`, `accepted_at`. Permet de pré-créer l'accès avant que la personne ne se connecte.

### Modifications de tables existantes

Ajout d'une colonne `dashboard_id` (FK vers `dashboards`, NOT NULL) sur :
- `post_its`
- `widgets`
- `gallery_items`
- `messages`

Migration des données existantes : création d'un dashboard "Principal" pour toi, rattachement de toutes les lignes existantes à ce dashboard.

### RLS rewrites

Une fonction SECURITY DEFINER `is_dashboard_member(dashboard_id, user_id)` qui regarde `dashboard_members`. Toutes les policies de `post_its`/`widgets`/`gallery_items`/`messages` deviennent : « accessible si membre du dashboard ». Écriture restreinte à l'owner pour post-its/widgets (comme avant). Pour `gallery_items` : chacun voit/édite ses propres items dans les dashboards dont il est membre.

### Acceptation d'invitation

Trigger sur `handle_new_user` étendu : à la création d'un compte, on consomme toutes les invitations en attente pour son email → on l'ajoute à `dashboard_members` automatiquement.

## Email d'invitation

J'utilise **Lovable Emails** (infrastructure intégrée) :
1. Un domaine email doit être configuré → je te proposerai le dialogue de setup si ce n'est pas déjà fait.
2. Une server function admin `inviteToDashboard({ email, dashboard_id })` qui :
   - crée la ligne dans `dashboard_invitations`
   - envoie un magic link Supabase à l'email avec redirection vers l'app
   - à la première connexion, le user est ajouté au dashboard

## Frontend

### Sélecteur de dashboard (header)

Composant `DashboardSwitcher` dans le header : dropdown listant tous les dashboards de l'utilisateur courant, badge "Perso" pour le dashboard personnel, badge "owner" sur les tiens. Le dashboard actif est stocké en URL (`/?dashboard=<id>`) pour être bookmarkable et survivre au refresh.

### Hook `useActiveDashboard()`

Retourne le dashboard actif (depuis l'URL), avec fallback sur le dashboard perso. Tous les hooks existants (`usePostIt`, `useWidgets`, `useGallery`, `useMessages`) reçoivent ce `dashboard_id` et filtrent leurs queries dessus.

### Bouton admin "Créer un dashboard"

Visible uniquement si admin. Ouvre une modale :
1. **Étape 1** : nom du dashboard (ex: "Famille") → bouton "Créer"
2. Le dashboard est créé immédiatement et tu y es basculé pour le personnaliser (poser un post-it, configurer des widgets, etc.) avant d'inviter qui que ce soit.
3. **Étape 2** : un panneau "Membres" dans le dashboard te permet d'ajouter des emails à inviter (envoi du magic link à ce moment-là, pas avant).

### Panneau "Membres du dashboard"

Visible uniquement à l'owner. Liste les membres actuels, les invitations en attente, et un formulaire d'ajout d'email avec bouton "Envoyer l'invitation".

## Migration en deux phases

Pour ne rien casser :
1. **Phase 1 (cette session)** : migration BDD + RLS + sélecteur fonctionnel + création de dashboards. Tes données actuelles deviennent ton dashboard "Principal".
2. **Phase 2 (même session)** : modale de création, panneau membres, envoi des invitations email (nécessite que tu confirmes la config du domaine email).

## Détails techniques

- `dashboard_id` côté client : driven par search param TanStack Router validé avec Zod.
- Toutes les server functions privilégiées (création de dashboard, invitation) passent par `requireSupabaseAuth` + check `has_role('admin')`.
- Le SMS n'est pas inclus (nécessiterait Twilio + numéro vérifié → coût et délai). Email seulement, comme convenu.
- Le dashboard perso (`is_personal=true`) est créé automatiquement au signup pour toi, et est non-supprimable.

## Ordre d'exécution

1. Migration SQL (tables, FK, RLS, fonctions, backfill du dashboard "Principal").
2. Hook `useActiveDashboard` + adaptation des hooks existants.
3. `DashboardSwitcher` dans le header.
4. Modale admin "Créer un dashboard".
5. Setup email domain (si pas déjà fait).
6. Server function `inviteToDashboard` + panneau membres + emails.

Confirme et je lance.
