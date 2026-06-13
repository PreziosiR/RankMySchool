---
name: rankmyschool-style
description: Guide de style UI de RankMySchool. À consulter avant d'écrire ou modifier du CSS / des composants Svelte (.svelte), de créer un composant UI, ou de toucher au thème/couleurs/espacements. Impose le CSS natif + design tokens, interdit les frameworks CSS.
---

# Guide de style — RankMySchool

Stack de style **validée le 2026-06-13**. Objectif produit : **lisibilité et clarté maximales**,
zéro friction pour un parent. Source : `AUDIT.md` §5.

## Règles dures

1. **CSS natif uniquement. AUCUN framework CSS.** Pas de Tailwind, Bootstrap, Pico, UnoCSS, etc.
   Si tu es tenté d'ajouter une dépendance CSS, ne le fais pas — demande d'abord.
2. **Design tokens dans `:root`** (`src/app.css`). Toute couleur, espacement, rayon, ombre passe par
   une variable CSS. **Pas de valeur littérale en dur** dans les composants (ex. écrire
   `var(--c-primary)`, jamais `#2563eb`).
3. **Styles scopés par composant** via les blocs `<style>` Svelte (scoping automatique). Pas de CSS
   global hors `app.css` (tokens + reset léger uniquement).
4. **Police `system-ui`** (`--font`). Aucune police chargée par réseau.
5. **Layout en CSS Grid / Flexbox natifs.** Pas de lib de grille.
6. **Couleur IPS** : pilotée par les mêmes tokens que `getColorForIps` (`src/helpers.js`). Garder
   logique et thème synchronisés via les variables `--ips-*`.

## Tokens de référence (`src/app.css`)

```css
:root {
  /* couleurs */
  --c-bg: #f7f8fa;     --c-surface: #fff;    --c-text: #1a1a2e;
  --c-primary: #2563eb; --c-border: #e2e8f0; --c-muted: #64748b;
  /* échelle IPS (cf. getColorForIps) */
  --ips-low: #8b0000;  --ips-mid: #ffa500;   --ips-high: #5e9c00;
  /* espacements */
  --space-1: 4px; --space-2: 8px; --space-4: 16px; --space-6: 24px;
  /* forme */
  --radius: 10px; --shadow: 0 1px 3px rgb(0 0 0 / .08);
  /* typo */
  --font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
```

## Exemple de composant conforme

```svelte
<style>
  .card {
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: var(--space-4);
    font-family: var(--font);
  }
</style>
```

## Géolocalisation / carte

- Vue carte : **Leaflet + fonds OpenStreetMap** (sans clé API), alimentée par `centroid {lat, lon}`
  (collèges uniquement). **Seule** dépendance UI autorisée, isolée à la vue carte.
- « Près de chez moi » : **`navigator.geolocation`** natif, pas de dépendance.

## Conventions composants UI

- Toggle type (école / collège / lycée) : header persistant (`<TypeSelector>`).
- Filtres repliés par défaut (drawer) ; retirer les champs experts (UAI, code INSEE) de l'UI.
- Tri par IPS décroissant par défaut.
- États explicites : loading / erreur / vide.
