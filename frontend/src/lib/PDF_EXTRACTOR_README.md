# PDF Extractor - Documentation

## Vue d'ensemble

L'extracteur PDF (`pdf-extractor.ts`) extrait automatiquement les informations patient des documents PDF de laboratoire. Il utilise:

1. **pdf.js** - Pour les PDFs texte natifs (rapide, ~100ms)
2. **Tesseract.js** - Fallback OCR pour les PDFs scannés (lent, 5-15s)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        extractPdfData()                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Essayer pdf.js (extraction texte native)                    │
│         │                                                        │
│         ├── Texte trouvé? → Analyser les patterns               │
│         │                                                        │
│         └── Pas de texte? → Fallback Tesseract OCR              │
│                   │                                              │
│                   ▼                                              │
│  2. Tesseract.js OCR (français + anglais)                       │
│         │                                                        │
│         ▼                                                        │
│  3. Extraction des patterns:                                     │
│         - detectPatientName()                                    │
│         - detectPhone()                                          │
│         - detectFolderRef()                                      │
│         - detectPrescriber()                                     │
│         │                                                        │
│         ▼                                                        │
│  4. Retour: ExtractedData avec score de confiance               │
└─────────────────────────────────────────────────────────────────┘
```

## Détection du nom patient

### Le problème

Les PDFs de laboratoire contiennent de nombreux noms dans l'entête :
- Biologistes, directeurs, techniciens
- Major, Vice major, Chef de service
- Prescripteurs

Ces noms peuvent être confondus avec le patient.

### La solution : Détection par priorité

| Priorité | Pattern | Description |
|----------|---------|-------------|
| **1** | `Mlle + Nom` | "Mlle" (Mademoiselle) est rare pour le staff |
| **2** | `Code Patient` | Cherche le nom proche de "Code Patient" |
| **3** | `Titre + Nom sans rôle staff` | Exclut les noms précédés de rôles |
| **4** | `Patient:` | Label explicite |
| **5** | `Nom:` / `Prénom:` | Champs séparés |
| **6** | `Né(e) le` | Nom avant la date de naissance |

### Mots-clés staff exclus

```typescript
const STAFF_ROLE_PATTERNS = [
    // Administratifs
    /major/i, /vice major/i, /chef de service/i,
    /directeur/i, /responsable/i, /secrétaire/i,
    
    // Médicaux/Techniques
    /biologiste/i, /pharmacien/i, /technicien/i,
    /laborantin/i, /infirmier/i, /médecin/i,
    
    // Titres professionnels
    /dr\./i, /pr\./i,
    
    // Contexte de liste (tiret avant le nom)
    /\-\s*$/
];
```

## Comment étendre

### Ajouter un nouveau rôle staff à exclure

Dans `detectPatientName()`, ajoutez le pattern dans `STAFF_ROLE_PATTERNS`:

```typescript
const STAFF_ROLE_PATTERNS = [
    // ... patterns existants
    
    // NOUVEAU: Ajouter ici
    /coordinateur\s*[:.\-]?\s*$/i,
    /assistant[e]?\s*[:.\-]?\s*$/i,
];
```

### Ajouter un mot-clé simple pour le filtrage

Dans `STAFF_KEYWORDS`:

```typescript
const STAFF_KEYWORDS = [
    // ... mots existants
    'coordinateur', 'assistant'
];
```

### Ajouter un nouveau pattern de détection

1. Créer une nouvelle priorité dans `detectPatientName()`
2. Retourner immédiatement si trouvé (`return result;`)
3. Tester avec des PDFs réels

## Troubleshooting

### Le mauvais nom est détecté

1. Ouvrir la console du navigateur (F12)
2. Uploader le PDF
3. Vérifier les logs `[PDF Extractor]`
4. Identifier quel pattern est déclenché
5. Ajouter le rôle manquant dans `STAFF_ROLE_PATTERNS`

### L'OCR ne fonctionne pas

- Vérifier que Tesseract.js est installé: `npm list tesseract.js`
- Les PDFs scannés prennent 5-15 secondes (barre de progression affichée)

### Le texte extrait est incorrect

- pdf.js lit dans l'ordre de lecture, pas visuel
- Les tableaux et colonnes peuvent mélanger l'ordre
- Vérifier le log `FULL EXTRACTED TEXT` pour voir l'ordre réel

## Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `src/lib/pdf-extractor.ts` | Logique d'extraction principale |
| `src/components/SmartUploadForm.tsx` | Interface utilisateur |

## Performance

| Type PDF | Temps | Méthode |
|----------|-------|---------|
| Texte natif | ~100ms | pdf.js |
| Scanné (1 page) | 5-8s | Tesseract.js |
| Scanné (2 pages) | 10-15s | Tesseract.js |
