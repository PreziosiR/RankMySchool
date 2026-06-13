# 🏗️ Modèle de données RankMySchool (figé)

> Document de référence figé le **2026-06-13**, fondé sur l'inspection live de l'API ODS v2.1 de
> `data.education.gouv.fr` (datasets écoles / collèges / lycées).
> Complète `AUDIT.md`. Sert de contrat pour les sous-tâches d'implémentation.
> **Ce fichier décrit la cible — il n'y a encore aucune implémentation dans `src/`.**

---

## Principe directeur

3 datasets gouvernementaux **hétérogènes** décrivent la même chose. On n'adapte pas l'UI à chaque
API : on introduit une **couche canonique**. L'API brute entre, un **modèle unique et stable** sort.
L'UI ne connaît **jamais** les noms de champs gouvernementaux.

```
API ODS (brut, 3 schémas)  ──►  ADAPTERS (1 par type)  ──►  Modèle canonique (1 seul)  ──►  UI
        descripteurs                 normalisation              School / IpsRecord
```

---

## Faits du terrain qui dictent le modèle (vérifiés en live)

- `secteur` vaut réellement `'public'` et `'privé sous contrat'` (PAS `"prive"`). → enum + libellé.
- `type_de_lycee` : `LEGT`, `LP`, `LPO`.
- Lycées : `ips_voie_pro` est NULL pour les 9221 LEGT. L'IPS universel d'un lycée = `ips_ensemble_gt_pro`.
- Lycées & écoles : champ nom = `nom_de_l_etablissment` (faute, sans « e »). Collèges : `nom_de_l_etablissement` (avec « e »).
- Lycées n'ont PAS de champ `ips` simple.
- Collèges : seuls à avoir `centroid` (`{lon, lat}`), une région, et des IPS de référence (national/académique/départemental).
- Années par dataset : écoles 2016→2022, lycées 2016→2022, collèges **2023→2026**. → années dynamiques via facettes, jamais codées en dur.

---

## 1. Distinction fondamentale : Établissement ≠ Mesure annuelle

Une ligne d'API n'est pas un établissement : c'est **la mesure d'IPS d'un établissement pour une
rentrée donnée**. Le même `uai` réapparaît chaque année. On modélise deux niveaux :

- `School` — l'identité stable d'un établissement (clé : `uai`).
- `IpsRecord` — une mesure d'IPS pour une rentrée (ce qu'est réellement une ligne d'API).

Pour la vue liste simple, on prend `records[0]` (le plus récent). Le niveau historique ouvre les
tendances et la comparaison sans refonte ultérieure.

---

## 2. Le champ qui fait tout le produit : `ips` canonique

Le cœur du site = « les mieux classés ». Une **seule** valeur numérique comparable entre les 3 types :

| Type | Source de l'`ips` canonique |
|---|---|
| École | `ips` |
| Collège | `ips` |
| Lycée | **`ips_ensemble_gt_pro`** (et non `ips`, inexistant) |

Tri (`order_by`), couleur (`getColorForIps`) et rang s'appuient sur ce champ unique. Les valeurs
riches du lycée vont dans `extra`.

---

## 3. Schéma d'ensemble

```
School
├─ uai, type, name, sector, subtype?
├─ location { commune, department, academie, region?, coordinates? }
└─ records: IpsRecord[]
     └─ { year, ips ⭐, ipsStdDev, extra?: LyceeIps, benchmarks?: IpsBenchmarks }
```

---

## 4. Types (TypeScript de référence)

```ts
type SchoolType = 'ecole' | 'college' | 'lycee';
type LyceeKind  = 'LEGT' | 'LP' | 'LPO';
type Sector     = 'public' | 'prive';   // normalisé depuis 'public' / 'privé sous contrat'

interface Location {
  commune:     { name: string; inseeCode: string };
  department:  { name: string; code: string };       // code: "027"
  academie:    string;
  region:      string | null;                        // collèges uniquement
  coordinates: { lat: number; lon: number } | null;  // collèges uniquement
}

interface LyceeIps {
  voieGT:   number | null;   // ips_voie_gt
  voiePro:  number | null;   // ips_voie_pro (null pour les LEGT)
  ensemble: number | null;   // ips_ensemble_gt_pro (= ips canonique)
  stdDevGT: number | null;
  stdDevPro: number | null;
}

interface IpsBenchmarks {    // collèges uniquement
  national:      { all: number; public: number; prive: number };
  academique:    { all: number; public: number; prive: number };
  departemental: { all: number; public: number; prive: number };
}

interface IpsRecord {
  year: string;                  // "2021-2022"
  ips: number;                   // ⭐ valeur canonique pour tri/couleur/rang
  ipsStdDev: number | null;
  extra: LyceeIps | null;        // détails type-spécifiques (lycées)
  benchmarks?: IpsBenchmarks;    // contexte (collèges)
}

interface School {
  uai: string;                 // identifiant national unique (clé de regroupement)
  type: SchoolType;
  name: string | null;         // "A COMPLETER" → null
  sector: Sector;
  location: Location;
  subtype?: LyceeKind;         // LEGT | LP | LPO (lycées uniquement)
  records: IpsRecord[];        // historique trié par année (plus récent en premier)
}
```

---

## 5. Source unique de vérité : descripteur de dataset

Un seul objet config pilote URL, mapping, années et géo. On l'étend si un 4ᵉ dataset arrive.

```ts
interface DatasetDescriptor {
  type: SchoolType;
  datasetId: string;           // "fr-en-ips_ecoles_v2"
  label: string;               // "École primaire"
  fields: {
    name: string;              // 'nom_de_l_etablissment' vs 'nom_de_l_etablissement'
    ips: string;               // champ à trier : 'ips' | 'ips_ensemble_gt_pro'
    ipsStdDev: string | null;
  };
  hasGeo: boolean;             // true pour collèges
  filterableFields: string[];  // pilote l'UI des filtres (where=...)
}

const DATASETS: Record<SchoolType, DatasetDescriptor> = {
  ecole: {
    type: 'ecole', datasetId: 'fr-en-ips_ecoles_v2', label: 'École primaire',
    fields: { name: 'nom_de_l_etablissment', ips: 'ips', ipsStdDev: null },
    hasGeo: false,
    filterableFields: ['academie','code_du_departement','nom_de_la_commune','secteur','rentree_scolaire'],
  },
  college: {
    type: 'college', datasetId: 'fr-en-ips-colleges-ap2023', label: 'Collège',
    fields: { name: 'nom_de_l_etablissement', ips: 'ips', ipsStdDev: 'ecart_type_de_l_ips' },
    hasGeo: true,
    filterableFields: ['academie','code_du_departement','nom_de_la_commune','secteur','rentree_scolaire'],
  },
  lycee: {
    type: 'lycee', datasetId: 'fr-en-ips_lycees', label: 'Lycée',
    fields: { name: 'nom_de_l_etablissment', ips: 'ips_ensemble_gt_pro', ipsStdDev: null },
    hasGeo: false,
    filterableFields: ['academie','code_du_departement','nom_de_la_commune','secteur','rentree_scolaire','type_de_lycee'],
  },
};
```

> Les années, académies et départements ne sont **pas** codés en dur : récupération dynamique via
> `/facets?facet=rentree_scolaire` (etc.) du dataset sélectionné. La facette fait foi.

---

## 6. Ce que ce modèle débloque

- **Un seul `ips`** comparable → tri, rang et couleur pour les 3 types (corrige le lycée vide).
- **Mapping centralisé** → corrige le nom des collèges, plus jamais de champ oublié.
- **`sector` enum** → corrige le filtre privé.
- **Années/facettes dynamiques** → corrige le décalage collège.
- **Historique par établissement** → tendances et comparaison sans refonte.
- **UI 100% découplée** de l'API : un renommage de champ ou un `ips_ecoles_v3` ne touche qu'un descripteur.

---

## 7. Implémentation cible (JSDoc — À FAIRE, non implémenté)

Le projet est en **JS** (pas TS). Implémentation prévue en JSDoc `@typedef` dans `src/types.js`
+ config `DATASETS` dans `src/datasets.config.js`. Autocomplétion sans build TS.

> ⚠️ Le bloc ci-dessous est la **proposition à coller** lors de la sous-tâche d'implémentation.
> Il n'est PAS encore présent dans `src/`.

### `src/types.js` (proposé)

```js
/**
 * @typedef {'ecole' | 'college' | 'lycee'} SchoolType
 * @typedef {'LEGT' | 'LP' | 'LPO'} LyceeKind
 * @typedef {'public' | 'prive'} Sector
 */

/**
 * @typedef {Object} Coordinates
 * @property {number} lat
 * @property {number} lon
 */

/**
 * @typedef {Object} Location
 * @property {{ name: string, inseeCode: string }} commune
 * @property {{ name: string, code: string }} department  // code ex: "027"
 * @property {string} academie
 * @property {string | null} region                       // collèges uniquement
 * @property {Coordinates | null} coordinates             // collèges uniquement
 */

/**
 * @typedef {Object} LyceeIps
 * @property {number | null} voieGT       // ips_voie_gt
 * @property {number | null} voiePro      // ips_voie_pro (null pour les LEGT)
 * @property {number | null} ensemble     // ips_ensemble_gt_pro (= ips canonique)
 * @property {number | null} stdDevGT
 * @property {number | null} stdDevPro
 */

/**
 * @typedef {Object} BenchmarkScope
 * @property {number} all
 * @property {number} public
 * @property {number} prive
 */

/**
 * @typedef {Object} IpsBenchmarks   // collèges uniquement
 * @property {BenchmarkScope} national
 * @property {BenchmarkScope} academique
 * @property {BenchmarkScope} departemental
 */

/**
 * @typedef {Object} IpsRecord
 * @property {string} year                 // "2021-2022"
 * @property {number} ips                   // ⭐ valeur canonique (tri/couleur/rang)
 * @property {number | null} ipsStdDev
 * @property {LyceeIps | null} extra        // détails lycées
 * @property {IpsBenchmarks=} benchmarks    // contexte collèges
 */

/**
 * @typedef {Object} School
 * @property {string} uai                   // identifiant national unique
 * @property {SchoolType} type
 * @property {string | null} name           // "A COMPLETER" → null
 * @property {Sector} sector
 * @property {Location} location
 * @property {LyceeKind=} subtype           // lycées uniquement
 * @property {IpsRecord[]} records          // historique, plus récent en premier
 */

/**
 * @typedef {Object} DatasetFields
 * @property {string} name                  // champ nom côté API
 * @property {string} ips                   // champ IPS à trier
 * @property {string | null} ipsStdDev
 */

/**
 * @typedef {Object} DatasetDescriptor
 * @property {SchoolType} type
 * @property {string} datasetId
 * @property {string} label
 * @property {DatasetFields} fields
 * @property {boolean} hasGeo
 * @property {string[]} filterableFields
 */

export {};
```

### `src/datasets.config.js` (proposé)

```js
/** @typedef {import('./types.js').DatasetDescriptor} DatasetDescriptor */
/** @typedef {import('./types.js').SchoolType} SchoolType */

/** @type {Record<SchoolType, DatasetDescriptor>} */
export const DATASETS = {
  ecole: {
    type: 'ecole',
    datasetId: 'fr-en-ips_ecoles_v2',
    label: 'École primaire',
    fields: { name: 'nom_de_l_etablissment', ips: 'ips', ipsStdDev: null },
    hasGeo: false,
    filterableFields: ['academie', 'code_du_departement', 'nom_de_la_commune', 'secteur', 'rentree_scolaire'],
  },
  college: {
    type: 'college',
    datasetId: 'fr-en-ips-colleges-ap2023',
    label: 'Collège',
    fields: { name: 'nom_de_l_etablissement', ips: 'ips', ipsStdDev: 'ecart_type_de_l_ips' },
    hasGeo: true,
    filterableFields: ['academie', 'code_du_departement', 'nom_de_la_commune', 'secteur', 'rentree_scolaire'],
  },
  lycee: {
    type: 'lycee',
    datasetId: 'fr-en-ips_lycees',
    label: 'Lycée',
    fields: { name: 'nom_de_l_etablissment', ips: 'ips_ensemble_gt_pro', ipsStdDev: null },
    hasGeo: false,
    filterableFields: ['academie', 'code_du_departement', 'nom_de_la_commune', 'secteur', 'rentree_scolaire', 'type_de_lycee'],
  },
};

export const API_BASE_URL =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/';
```
