---
name: rankmyschool-backend
description: Guide d'architecture backend de RankMySchool. À consulter avant d'écrire ou modifier du code serveur (src/server.js, routes Express, axios, appels à l'API ODS, normalisation côté serveur, cache). Impose le pattern BFF / proxy fin devant l'API data.education.gouv.fr.
---

# Guide backend — RankMySchool (BFF / proxy fin)

Architecture **validée le 2026-06-13**. Le backend Express est un **BFF (Backend For Frontend) /
proxy mince** devant l'API ODS de `data.education.gouv.fr`. Sources : `AUDIT.md`, `DATA_MODEL.md`.

```
Front (Svelte)  ──►  Express BFF  ──►  API ODS (data.education.gouv.fr)
                     /api/schools       build where/order_by/limit
                                        cache facettes + réponses
                                        normalize() -> School[]
                                        renvoie JSON canonique
```

## Principe

Le **front ne connaît plus l'API gouvernementale**. Il appelle uniquement le BFF, qui :
1. traduit les paramètres front en requête ODS valide,
2. appelle l'API ODS (via `axios`),
3. **normalise** la réponse vers le modèle canonique (`DATA_MODEL.md`),
4. **met en cache** ce qui est stable (facettes : années / académies / départements).

La logique de mapping/normalisation (descripteurs `DATASETS`, `normalize()`) **vit côté serveur**,
pas dans le front. Le front reçoit du JSON déjà propre (`School[]`).

## Règles dures

1. **Express reste mince.** Pas de logique métier au-delà de : construire la requête ODS, appeler,
   normaliser, cacher, gérer l'erreur. Aucune base de données (décision : on reste sur l'API ODS
   en temps réel — pas d'ingestion/BDD).
2. **`axios` est la seule façon d'appeler l'API ODS.** Centraliser l'URL de base et la construction
   de requête (réutiliser le descripteur `DATASETS` de `DATA_MODEL.md` §5).
3. **Syntaxe ODS correcte obligatoire** (cf. bug historique `AUDIT.md` §3) :
   `where=...`, `order_by=ips DESC`, `limit`/`offset` (limit max 100). Jamais de param brut
   `&academie=PARIS` (ignoré par l'API).
4. **Mapping par type** : champ nom et champ IPS diffèrent selon école/collège/lycée
   (cf. `DATASETS`). Le `order_by` utilise le `fields.ips` du descripteur.
5. **Gestion d'erreur systématique** : try/catch sur chaque appel ODS, statut HTTP propre
   (502 si l'amont échoue), message JSON exploitable par le front. Jamais d'erreur silencieuse.
6. **Cache des facettes** : années / académies / départements changent rarement → cache en mémoire
   avec TTL (ex. 1h). Évite de spammer l'API ODS à chaque rafraîchissement de filtre.
7. **Config par env** : URL de base ODS et port via variables d'environnement (`.env`), pas en dur.

## Endpoints cibles (contrat front ↔ BFF)

- `GET /api/schools?type=&q=&academie=&departement=&secteur=&year=&sort=&limit=&offset=`
  → renvoie `{ total, results: School[] }` (modèle canonique normalisé).
- `GET /api/facets?type=&facet=rentree_scolaire|academie|departement`
  → renvoie la liste des valeurs disponibles (caché). Sert à peupler les filtres dynamiquement.

> Les valeurs de filtres (années notamment) viennent **toujours** des facettes du dataset
> sélectionné — jamais codées en dur (les collèges sont en 2023→2026, pas 2016→2022).

## Démarrage / scripts

- Ajouter un script npm dédié, ex. `"server": "node src/server.js"` (actuellement absent).
- En dev, le front (Vite) et le BFF tournent séparément ; configurer le proxy Vite ou CORS du BFF
  pour que `/api/*` atteigne Express.

## Stack

- **Express 4** (déjà présent), **axios** (déjà présent — désormais réellement utilisé).
- Cache : structure en mémoire simple (Map + TTL) ou `node-cache`. Pas de Redis (sur-dimensionné).
- Voir le style/UI dans le skill `rankmyschool-style` ; le modèle de données dans `DATA_MODEL.md`.
