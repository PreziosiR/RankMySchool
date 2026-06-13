# 📋 Audit RankMySchool — État des lieux & feuille de route

> Document de référence établi le **2026-06-13**. Sert de base aux sous-tâches de reprise du projet.
> Le projet est un prototype dont le cœur repose sur l'**IPS** (Indice de Position Sociale) issu de
> l'API ouverte de `data.education.gouv.fr` (écoles primaires / collèges / lycées).
> Objectif produit : permettre à un parent français de trouver **rapidement et sans friction**
> les établissements les mieux classés selon l'IPS.

---

## 1. Stack technique

### Frontend
| Élément | Détail |
|---|---|
| Framework | **Svelte 4** (4.2.8) — composants `.svelte` |
| Build / dev server | **Vite 5** |
| Composants | `src/App.svelte` (page unique), `src/TypeSelection.svelte` (choix école/collège/lycée), `src/lib/Counter.svelte` (résidu du template, inutilisé) |
| Logique | `src/router.js` (construction d'URL API), `src/helpers.js` (encodage param + couleur IPS), `src/utils.js` (listes statiques : académies, départements, années, secteurs) |
| Appels API | `fetch` natif côté navigateur (axios n'est **pas** utilisé dans le front) |

### Backend
| Élément | Détail |
|---|---|
| Serveur | **Express 4** + **axios** dans `src/server.js` |
| État réel | **Coquille vide.** Écoute sur le port 3000 mais toute la logique de proxy est **commentée**. Aucun endpoint actif. Pas branché dans les scripts npm. |

> **État actuel : projet 100% front statique.** Le front tape directement l'API gouvernementale.
> Express/axios sont des dépendances mortes *en l'état*.
>
> **Décision (2026-06-13) :** le backend est **activé comme BFF / proxy fin** devant l'API ODS
> (front → Express → ODS, avec normalisation + cache côté serveur). Express/axios ne sont donc
> plus à supprimer : ils deviennent le cœur du BFF. Cadrage figé dans le skill `rankmyschool-backend`
> (`.claude/skills/rankmyschool-backend/SKILL.md`).

### Source de données
API **Opendatasoft (ODS) Explore v2.1** de `data.education.gouv.fr` — 3 datasets distincts.

---

## 2. Configuration & démarrage

```bash
npm install        # installe les dépendances
npm run dev        # lance Vite (front) → http://localhost:5173
```

Autres scripts :
```bash
npm run build      # build de production dans /dist
npm run preview    # prévisualise le build
```

> ⚠️ Aucun script pour le backend. Pour lancer Express : `node src/server.js` manuellement —
> mais il ne sert à rien en l'état.

---

## 3. Test des endpoints (vérifié en live le 2026-06-13)

**Les 3 datasets répondent en HTTP 200 et contiennent des données.**

| Type | Dataset | Statut | Volume | Années disponibles |
|---|---|---|---|---|
| École | `fr-en-ips_ecoles_v2` | ✅ 200 | 182 082 lignes | 2016-2017 → **2021-2022** |
| Collège | `fr-en-ips-colleges-ap2023` | ✅ 200 | 21 061 lignes | **2023-2024 → 2025-2026** |
| Lycée | `fr-en-ips_lycees` | ✅ 200 | 21 777 lignes | 2016-2017 → 2021-2022 |

Endpoint de base : `https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/{dataset}/records`

### 🔴 BUG MAJEUR — le filtrage est cassé (et silencieux)

Le code construit des URL du type `…/records?&academie=PARIS`. Or **l'API ODS v2.1 ignore
purement et simplement ce paramètre brut** — elle attend `refine=academie:PARIS` ou
`where=academie='PARIS'`.

Preuve par test :
- `&academie=PARIS` → renvoie **182 082 résultats** (tout le dataset, 1ʳᵉ académie = ROUEN) ❌
- `refine=academie:PARIS` → renvoie **2 687 résultats**, tous à PARIS ✅

**Conséquence : aucun filtre ne fonctionne.** De plus, l'API renvoie **10 résultats par défaut**
(pas de `limit` ni de pagination dans le code) → l'utilisateur voit toujours les **10 mêmes
établissements** quelle que soit sa recherche. La fonction `encodeParam` (`src/helpers.js`), qui
génère pourtant la bonne syntaxe `refine=`, est définie mais **jamais appelée**.

### 🔴 Incohérences de schéma entre datasets

Le code suppose un schéma identique pour les 3 types. C'est faux :

1. **Champ nom d'établissement** :
   - Écoles & lycées : `nom_de_l_etablissment` (faute de frappe de l'API, sans « e »)
   - Collèges : `nom_de_l_etablissement` (correct, avec « e »)
   - → `App.svelte` utilise la version sans « e » → **le nom des collèges ne s'affiche jamais**.

2. **Champ IPS des lycées** : il n'existe **pas** de champ `ips` simple. Les lycées ont
   `ips_voie_gt`, `ips_voie_pro`, `ips_ensemble_gt_pro`. → `item.ips` est `undefined` →
   **l'IPS des lycées s'affiche vide**, et `getColorForIps(undefined)` renvoie le rouge foncé par défaut.

3. **Années** : la liste `rentree_scolaire` (`src/utils.js`) est unique et figée (2016→2022) mais :
   - Les **collèges** ne couvrent que **2023→2026** → le filtre année ne propose **aucune année valide** pour les collèges.
   - Les écoles s'arrêtent à 2021-2022 (donnée API la plus récente, normal).

### Champs disponibles par dataset (référence)

**Écoles** (`fr-en-ips_ecoles_v2`) :
`rentree_scolaire, academie, code_du_departement, departement, uai, nom_de_l_etablissment,
code_insee_de_la_commune, nom_de_la_commune, secteur, ips`

**Collèges** (`fr-en-ips-colleges-ap2023`) :
`rentree_scolaire, code_region, region_insee, region_academique, code_academie, academie,
code_du_departement, departement, code_insee_de_la_commune, nom_de_la_commune, uai,
nom_de_l_etablissement, secteur, ips, ecart_type_de_l_ips, ips_national_prive, ips_national_public,
ips_national, ips_academique_prive, ips_academique_public, ips_academique, ips_departemental_prive,
ips_departemental_public, ips_departemental, geom, centroid`  ← contient des **coordonnées (carte possible)**

**Lycées** (`fr-en-ips_lycees`) :
`rentree_scolaire, academie, code_du_departement, departement, uai, nom_de_l_etablissment,
code_insee_de_la_commune, nom_de_la_commune, secteur, type_de_lycee, ips_voie_gt, ips_voie_pro,
ips_ensemble_gt_pro, ecart_type_de_l_ips_voie_gt, ecart_type_de_l_ips_voie_pro`

### Syntaxe ODS v2.1 correcte (à utiliser)
- Filtre exact : `where=academie='PARIS'` ou `refine=academie:PARIS`
- Tri : `order_by=ips DESC`
- Pagination : `limit=20&offset=0` (limit max = 100)
- Recherche plein texte : `where=suggest(nom_de_la_commune, 'lyon')` / `q=`

---

## 4. Points négatifs / à améliorer

### Bugs bloquants
- **Filtres non fonctionnels** (mauvaise syntaxe ODS) — le cœur du produit ne marche pas.
- **Pas de pagination ni `limit`** → 10 résultats max, sans tri.
- **Schémas non gérés par type** (nom collège, IPS lycée, années collège).
- **Pas de tri par IPS** — alors que « trouver les mieux classés » est l'objectif n°1.

### Qualité / architecture
- Express + axios : **à activer comme BFF / proxy fin** (décision actée, cf. §1 et skill `rankmyschool-backend`).
- **Aucune gestion d'erreur** sur le `fetch` (pas de try/catch, pas d'état loading).
- Reliquats du template Vite : `Counter.svelte`, `svelte.svg`, `<title>Vite + Svelte</title>`, `lang="en"` sur un site FR.
- `secteurs` codé `"prive"` sans accent — à vérifier vs valeur réelle de l'API.
- Aucun design : HTML brut, pas de responsive, pas de thème.
- URL en dur, commentaires d'URL dispersés ; pas de config centralisée.

### UX
- 8 filtres manuels à remplir, dont des champs techniques (UAI, code INSEE) **incompréhensibles pour un parent**.
- Pas de recherche libre par nom de ville/établissement.
- Pas de carte, pas de classement visuel, pas de comparaison.

---

## 5. Découpage UI proposé

Objectif : **un parent trouve les meilleurs établissements près de chez lui, vite et sans friction.**
Partir d'une **recherche unique géographique** plutôt que d'un mur de filtres.

```
┌─────────────────────────────────────────────────────────┐
│  HEADER : Logo RankMySchool   |  [École][Collège][Lycée] │  ← toggle type
├─────────────────────────────────────────────────────────┤
│                                                          │
│   🔎  « Entrez une ville, un code postal… »              │  ← 1 barre, autocomplete
│       [ Filtres ▾ ]   [ Trier : IPS décroissant ▾ ]      │  ← filtres repliés
│                                                          │
├──────────────────┬──────────────────────────────────────┤
│  FILTRES (drawer)│   RÉSULTATS (liste classée)          │
│  • Secteur       │  ┌────────────────────────────────┐  │
│    ◦ Public      │  │ #1  École Jean Moulin   🟢 124 │  │  ← rang + pastille couleur IPS
│    ◦ Privé       │  │     Paris 12e · public         │  │
│  • Année         │  ├────────────────────────────────┤  │
│  • Académie/Dépt │  │ #2  École Pasteur       🟡 98  │  │
│  • IPS min ──●── │  │     ...                        │  │
│                  │  └────────────────────────────────┘  │
│                  │   [ Charger plus ]  (pagination)     │
└──────────────────┴──────────────────────────────────────┘
        (optionnel : onglet 🗺️ Carte — les collèges ont des coords geom)
```

### Composants cibles
1. **`<TypeSelector>`** : toggle persistant en header (pas un écran bloquant). Adapte automatiquement champs IPS + années selon le type.
2. **`<SearchBar>`** : recherche libre par commune/établissement (`suggest()` / `refine`), avec autocomplete. Point d'entrée unique.
3. **`<Filters>`** (drawer repliable) : secteur, année, slider IPS minimum — masqués par défaut. **Retirer UAI / code INSEE** de l'UI (champs experts).
4. **`<SortBar>`** : tri **par IPS décroissant par défaut** (le besoin réel).
5. **`<ResultList>` + `<SchoolCard>`** : carte par établissement avec **rang**, pastille couleur IPS (réutilise `getColorForIps`), nom, ville, secteur. Gère les 3 schémas différents.
6. **`<Pagination>` / infinite scroll** : indispensable (corrige la limite 10).
7. **Vue carte optionnelle** : possible pour les collèges (champs `geom`/`centroid`).

### Décisions UI validées (2026-06-13)

- ✅ **Toggle type** (école / collège / lycée) **conservé**, en header persistant (`<TypeSelector>`).
- ✅ **Approche style : CSS natif + design tokens.** 100% natif, **zéro framework CSS**.
  - Tokens (couleurs, espacements, rayons, ombres) déclarés en `:root` dans `src/app.css`.
  - Reste des styles **scopés par composant** via les `<style>` Svelte (scoping automatique).
  - Police **`system-ui`** (rendu natif, aucun chargement réseau, lisibilité maximale).
  - Couleur IPS pilotée par les **mêmes tokens** que `getColorForIps` (`src/helpers.js`).
  - Rejeté : Tailwind / Bootstrap / Pico (surcouche inutile, markup moins lisible) — voir skill `rankmyschool-style`.
- ✅ **Géolocalisation validée.** Vue carte via **Leaflet + fonds OpenStreetMap** (sans clé API),
  alimentée par `centroid {lat, lon}` (collèges uniquement). « Près de chez moi » via
  **`navigator.geolocation`** natif. Leaflet = **seule** dépendance UI ajoutée, isolée à la vue carte.

> Le guide de style détaillé (tokens, conventions) est figé dans le skill **`rankmyschool-style`**
> (`.claude/skills/rankmyschool-style/SKILL.md`).

---

## 6. Feuille de route / sous-tâches

> Ordre recommandé. La tâche **A** débloque tout le reste.

- **[A] BFF / couche API** — PRIORITÉ ABSOLUE (cf. skill `rankmyschool-backend`)
  - Activer Express en **proxy fin** : endpoints `/api/schools` et `/api/facets`.
  - Construire la vraie syntaxe ODS côté serveur : `where`, `order_by=ips DESC`, `limit`/`offset`.
  - Mapping de champs **par type** via les descripteurs `DATASETS` (nom d'établissement, champ IPS).
  - `normalize()` **côté serveur** → renvoyer le modèle canonique `School[]` (cf. `DATA_MODEL.md`).
  - Cache des facettes (années / académies / départements).
- **[B] Gestion d'état & robustesse** — try/catch, états loading/erreur/vide, dans `App.svelte`.
- **[C] Pagination / tri** — `limit`/`offset` + tri IPS décroissant par défaut.
- **[D] UI : SearchBar + autocomplete** — recherche par ville/établissement.
- **[E] UI : Filters drawer + SortBar** — repli des filtres, retrait des champs experts.
- **[F] UI : ResultList + SchoolCard** — rang, pastille couleur, design responsive.
- **[G] Nettoyage** — retirer reliquats template Vite (`Counter.svelte`, `svelte.svg`), `lang="fr"`, titre, favicon. (Express/axios **conservés** : ils servent le BFF.)
- **[H] (Optionnel) Vue carte** — pour les collèges (`geom`/`centroid`).
