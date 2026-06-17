## Concept

Cliquer sur un slot vide ouvre une popup qui propose des widgets à ajouter. Premier widget livré : **Sessions de sport** (agenda lundi/jeudi 18h30-20h45, avec présence/absence pour chaque invité du dashboard, et périodes de pause gérées par les admins).

## Catalogue de widgets (extensible)

Pour l'instant, 2 types proposés dans la popup :
- **`sport_sessions`** — agenda des sessions sport + présences (le widget principal demandé)
- **`calendar`** — calendrier mensuel simple (placeholder pour usages futurs, juste un mois affiché, pas d'évènements)

Architecture pensée pour ajouter facilement d'autres types plus tard (météo, todo, etc.).

## Pop-up "Ajouter un widget"

Au clic sur un slot vide → modale (Dialog shadcn) :
- Liste des types de widgets disponibles, avec titre + courte description + icône
- Champ "Titre personnalisé" optionnel
- Bouton "Ajouter" → insère dans `widgets` avec `slot`, `type`, `title`, `dashboard_id`, `is_active=true`

Seul l'**owner du dashboard** peut ajouter/configurer un widget (cohérent avec les RLS existantes). Pour les autres membres, clic sur slot vide = rien ne se passe (ou message "Seul l'owner peut configurer les widgets").

Petit menu (⋯) sur les widgets existants pour `Supprimer` (owner uniquement).

## Widget `sport_sessions`

### Logique métier

- Sessions générées côté client : tous les **lundis et jeudis** de l'année courante (et N+1 pour la visibilité long terme), créneau **18h30–20h45**.
- Une session est **active** sauf si elle tombe dans une **période d'exclusion** (vacances, pauses) définie par les admins.
- Chaque membre du dashboard peut marquer pour chaque session future : `présent`, `absent`, ou rien (= pas encore répondu).
- Affichage : liste scrollable des prochaines sessions (limitée aux 8-10 prochaines visibles, scroll pour voir plus loin), avec pour chacune :
  - Date + jour
  - Boutons "Je viens" / "Absent" pour l'utilisateur courant
  - Mini-liste des membres avec leur statut (avatar/initiale + ✓ / ✗ / —)

### Rôle "sport_admin"

Nouveau rôle dans l'enum `app_role` : **`sport_admin`**. 
- Tu es automatiquement `sport_admin` (puisque admin global → on étend la fonction `has_role` ou on ajoute le rôle à la main).
- Tu peux désigner d'autres utilisateurs `sport_admin` via un petit panneau dans le widget (visible uniquement si tu as `admin` ou `sport_admin`).
- Seuls les `sport_admin` (et `admin`) peuvent créer/supprimer des périodes d'exclusion.

### Périodes d'exclusion

Panneau "Périodes sans sport" dans le widget, visible par tous mais éditable seulement par les admins sport :
- Liste des périodes (date début → date fin, libellé optionnel ex: "Vacances été")
- Formulaire admin : 2 datepickers + bouton "Ajouter"
- Bouton ✕ pour supprimer (admin)

## Backend

### Nouvelles tables

- **`sport_excluded_periods`** — `id`, `start_date`, `end_date`, `label`, `created_by`, `created_at`. Pas de `dashboard_id` : les périodes sont **globales** (les sessions sport concernent l'asso, pas un dashboard particulier).
- **`sport_attendances`** — `id`, `session_date` (date), `user_id`, `status` ('present' | 'absent'), `updated_at`. Unique (`session_date`, `user_id`).

Pas de table `sport_sessions` : les sessions sont déterministes (lundi/jeudi 18h30) et calculées côté client. On stocke seulement les exceptions (périodes) et les réponses.

### Migration enum

Ajout de `sport_admin` à `app_role`.

### RLS

- `sport_excluded_periods` : tous les `authenticated` lisent, écriture si `has_role(uid, 'admin')` OU `has_role(uid, 'sport_admin')`.
- `sport_attendances` : tous les `authenticated` lisent (pour voir qui vient), écriture seulement si `user_id = auth.uid()`.

### Promotion `sport_admin`

Server function `grantSportAdmin({ user_id })` protégée par `requireSupabaseAuth` + check `has_role('admin')`. Insère dans `user_roles`. Côté UI : un petit formulaire dans le panneau admin du widget avec un select des membres du dashboard actif (ou champ email).

## Frontend

### Nouveaux fichiers

- `src/components/artemis/WidgetGrid/AddWidgetDialog.tsx` (+ .module.css) — la popup catalogue
- `src/components/artemis/WidgetGrid/WidgetRenderer.tsx` — switch sur `widget.type` → composant correspondant
- `src/components/artemis/widgets/SportSessions/SportSessionsWidget.tsx` (+ .module.css)
- `src/components/artemis/widgets/SportSessions/ExcludedPeriodsPanel.tsx`
- `src/components/artemis/widgets/SportSessions/SportAdminsPanel.tsx`
- `src/components/artemis/widgets/Calendar/CalendarWidget.tsx` (placeholder simple)
- `src/hooks/use-sport-sessions.ts` — calcule les sessions à venir en excluant les périodes
- `src/hooks/use-sport-attendances.ts` — CRUD attendances avec realtime
- `src/hooks/use-excluded-periods.ts` — CRUD périodes
- `src/hooks/use-is-sport-admin.ts`
- `src/lib/api/sport.functions.ts` — server fn `grantSportAdmin`

### Modifications

- `src/components/artemis/WidgetGrid/WidgetGrid.tsx` — slot vide cliquable (owner) ouvrant `AddWidgetDialog` ; slot peuplé délègue à `WidgetRenderer`.

## Détails techniques

- Génération des sessions : fonction pure `getUpcomingSportSessions(periods, limit, fromDate)` qui itère jour par jour, garde lundis/jeudis, exclut les dates couvertes par une période.
- Realtime activé sur `sport_attendances` pour voir en direct les réponses des autres.
- Format date côté DB : `date` (pas timestamp) → simple comparaison string.

## Ordre d'exécution

1. Migration SQL (enum, tables, RLS, grants).
2. Hooks + server function.
3. `AddWidgetDialog` + `WidgetRenderer` + branchement dans `WidgetGrid`.
4. Composants `SportSessionsWidget` + sous-panneaux.
5. `CalendarWidget` placeholder.

Confirme et je lance.