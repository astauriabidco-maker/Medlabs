/**
 * Module Documentation Data
 * Centralized documentation content for all Marketplace modules
 */

export interface ModuleQuickStep {
    step: number;
    title: string;
    description: string;
}

export interface ModuleDocumentation {
    id: string;
    name: string;
    quickStart: ModuleQuickStep[];
    fullDoc: string; // Markdown content
    configPath?: string; // Link to configuration page if applicable
}

export const modulesDocs: Record<string, ModuleDocumentation> = {
    AUTO_SYNC: {
        id: 'AUTO_SYNC',
        name: 'Auto-Sync Windows',
        configPath: '/dashboard/integration',
        quickStart: [
            {
                step: 1,
                title: 'Télécharger l\'automate',
                description: 'Récupérez le logiciel MedLab Sync pour Windows sur votre serveur de résultats.'
            },
            {
                step: 2,
                title: 'Générer une clé API',
                description: 'Allez dans Intégration API et cliquez sur "Générer clé" pour créer votre clé de connexion.'
            },
            {
                step: 3,
                title: 'Configurer le dossier à surveiller',
                description: 'Dans l\'automate, indiquez le dossier où votre SIL dépose les PDFs de résultats.'
            },
            {
                step: 4,
                title: 'Tester la synchronisation',
                description: 'Déposez un PDF test dans le dossier surveillé et vérifiez qu\'il apparaît dans l\'historique MedLab.'
            }
        ],
        fullDoc: `
# Auto-Sync Windows

## Présentation
Le module Auto-Sync Windows permet de synchroniser automatiquement les résultats PDF depuis votre serveur Windows vers la plateforme MedLab. Plus besoin de téléverser manuellement les résultats !

## Prérequis
- Serveur Windows (2016 ou supérieur) avec .NET 4.7+
- Accès réseau vers internet (HTTPS sortant)
- Dossier partagé entre votre SIL et le serveur MedLab Sync

## Installation

### Étape 1 : Téléchargement
Téléchargez le logiciel **MedLab Sync** depuis le portail partenaire ou contactez votre représentant commercial.

### Étape 2 : Génération de la clé API
1. Connectez-vous à MedLab en tant qu'administrateur
2. Allez dans **Intégration API** (depuis la Marketplace ou la sidebar)
3. Dans la section "Auto-Sync Windows", cliquez sur **Générer clé**
4. Copiez la clé API et l'URL endpoint

### Étape 3 : Configuration de l'automate
1. Installez MedLab Sync sur votre serveur
2. Ouvrez le fichier de configuration \`config.json\`
3. Renseignez :
   - \`apiKey\`: votre clé API
   - \`endpoint\`: l'URL endpoint fournie
   - \`watchFolder\`: le chemin du dossier à surveiller
   - \`processedFolder\`: le dossier où déplacer les fichiers traités

### Étape 4 : Démarrage du service
1. Lancez MedLab Sync en mode service Windows
2. Vérifiez les logs pour confirmer la connexion
3. Testez avec un fichier PDF

## Dépannage

| Problème | Solution |
|----------|----------|
| Connexion refusée | Vérifiez la clé API et l'accès réseau |
| Fichiers non traités | Vérifiez les permissions sur le dossier |
| Erreur d'authentification | Régénérez la clé API |

## Support
Contactez le support technique pour toute assistance.
        `
    },

    LONG_TERM_ARCHIVE: {
        id: 'LONG_TERM_ARCHIVE',
        name: 'Archive Longue Durée',
        configPath: '/dashboard/settings',
        quickStart: [
            {
                step: 1,
                title: 'Vérifier la rétention actuelle',
                description: 'Allez dans Paramètres > Rétention pour voir la durée de conservation actuelle.'
            },
            {
                step: 2,
                title: 'Configurer la durée d\'archivage',
                description: 'Sélectionnez la durée de conservation souhaitée (jusqu\'à 5 ans).'
            },
            {
                step: 3,
                title: 'Accéder aux archives',
                description: 'Utilisez la recherche avancée dans l\'historique pour retrouver les anciens résultats.'
            }
        ],
        fullDoc: `
# Archive Longue Durée

## Présentation
Ce module étend la durée de conservation de vos résultats de 90 jours (par défaut) jusqu'à 5 ans (1825 jours). Idéal pour la conformité réglementaire et les audits.

## Configuration

### Durées disponibles
| Plan | Durée maximale |
|------|----------------|
| Standard | 90 jours |
| Archive 3 ans | 1095 jours |
| Archive 5 ans | 1825 jours |

### Activation
1. Activez votre licence dans la Marketplace
2. Allez dans **Paramètres > Sécurité & Rétention**
3. Sélectionnez la nouvelle durée de conservation
4. Confirmez le changement

## Accès aux archives
- Utilisez les filtres de date dans l'historique
- Recherche par nom de patient, numéro de dossier
- Export en masse possible

## Conformité
Ce module est conforme aux exigences :
- RGPD (droit à l'effacement respecté)
- Réglementation sanitaire camerounaise
- Normes d'archivage médical
        `
    },

    ANALYTICS_BI: {
        id: 'ANALYTICS_BI',
        name: 'Analytics BI',
        configPath: '/dashboard/analytics',
        quickStart: [
            {
                step: 1,
                title: 'Accéder au dashboard',
                description: 'Cliquez sur "Analytics BI" dans la sidebar pour ouvrir le tableau de bord.'
            },
            {
                step: 2,
                title: 'Sélectionner la période',
                description: 'Utilisez les filtres (7j, 30j, 90j, 1 an) pour ajuster la plage d\'analyse.'
            },
            {
                step: 3,
                title: 'Analyser les KPIs',
                description: 'Consultez les indicateurs clés : volume, revenus, prescripteurs, heures de pointe.'
            },
            {
                step: 4,
                title: 'Exporter les rapports',
                description: 'Cliquez sur "Exporter" pour télécharger les données en PDF ou Excel.'
            }
        ],
        fullDoc: `
# Analytics BI

## Présentation
Le module Business Intelligence vous offre une vision complète de l'activité de votre laboratoire avec des indicateurs en temps réel.

## Indicateurs disponibles

### KPIs principaux
- **Patients traités** : nombre total de résultats envoyés
- **Chiffre d'affaires** : revenus des analyses payées
- **Prescripteur principal** : médecin qui vous réfère le plus
- **Moyenne journalière** : activité moyenne par jour

### Graphiques
- **Évolution du volume** : courbe de tendance quotidienne
- **Distribution par prescripteur** : répartition des prescripteurs
- **Heures d'affluence** : pic d'activité dans la journée

## Filtres de période
- 7 derniers jours
- 30 derniers jours
- 90 derniers jours
- 1 an

## Export de données
Le bouton "Exporter" permet de télécharger :
- Rapport PDF formaté
- Données brutes Excel/CSV
        `
    },

    PATIENT_PORTAL: {
        id: 'PATIENT_PORTAL',
        name: 'Carnet de Santé Patient',
        configPath: '/dashboard/patient-portal',
        quickStart: [
            {
                step: 1,
                title: 'Personnaliser le portail',
                description: 'Allez dans "Carnet Santé Patient" pour configurer l\'apparence et les messages.'
            },
            {
                step: 2,
                title: 'Configurer l\'authentification OTP',
                description: 'Les patients recevront un code par SMS pour accéder à leurs résultats.'
            },
            {
                step: 3,
                title: 'Partager le lien du portail',
                description: 'Communiquez l\'URL du portail à vos patients via SMS ou affiche.'
            }
        ],
        fullDoc: `
# Carnet de Santé Patient

## Présentation
Offrez à vos patients un accès sécurisé à leur historique de résultats via un portail web dédié.

## Fonctionnalités
- Historique complet des résultats
- Courbes d'évolution des valeurs
- Téléchargement des PDFs
- Authentification sécurisée par OTP

## Configuration

### Personnalisation
1. Logo et couleurs du laboratoire
2. Message de bienvenue personnalisé
3. Informations de contact

### Authentification
Les patients s'authentifient avec :
1. Leur numéro de téléphone
2. Un code OTP reçu par SMS

### URL du portail
\`https://app.medlab.cm/patient/[votre-slug]/login\`

## Sécurité
- Connexion chiffrée HTTPS
- Code OTP valide 5 minutes
- Session expirée après 30 min d'inactivité
        `
    },

    APPOINTMENTS: {
        id: 'APPOINTMENTS',
        name: 'Rendez-vous en Ligne',
        configPath: '/dashboard/appointments',
        quickStart: [
            {
                step: 1,
                title: 'Définir vos horaires',
                description: 'Configurez vos jours et heures d\'ouverture dans les paramètres du module.'
            },
            {
                step: 2,
                title: 'Créer des types de rendez-vous',
                description: 'Ajoutez les types d\'analyses disponibles (bilan sanguin, prélèvement, etc.).'
            },
            {
                step: 3,
                title: 'Activer les rappels SMS',
                description: 'Les patients recevront automatiquement un rappel 24h et 1h avant leur RDV.'
            },
            {
                step: 4,
                title: 'Partager le lien de réservation',
                description: 'Publiez votre lien de booking sur vos réseaux ou site web.'
            }
        ],
        fullDoc: `
# Rendez-vous en Ligne

## Présentation
Permettez à vos patients de prendre rendez-vous en ligne 24h/24. Réduisez les appels téléphoniques et optimisez votre planning.

## Configuration

### Horaires d'ouverture
1. Allez dans **Rendez-vous > Paramètres**
2. Définissez vos heures d'ouverture par jour
3. Marquez les jours fériés comme indisponibles

### Types de rendez-vous
Créez différents types avec :
- Nom (ex: "Bilan sanguin complet")
- Durée (15, 30, 45 ou 60 min)
- Prix (optionnel)

### Rappels automatiques
- Rappel J-1 par SMS
- Rappel H-1 par SMS
- Personnalisation des messages

## Widget de réservation
URL publique :
\`https://app.medlab.cm/book/[votre-slug]\`

Intégrable sur votre site web via iframe.
        `
    },

    CRITICAL_ALERTS: {
        id: 'CRITICAL_ALERTS',
        name: 'Alertes Critiques',
        configPath: '/dashboard/alerts',
        quickStart: [
            {
                step: 1,
                title: 'Définir les seuils critiques',
                description: 'Configurez les valeurs limites qui déclenchent une alerte (glycémie, hémoglobine, etc.).'
            },
            {
                step: 2,
                title: 'Ajouter les destinataires',
                description: 'Indiquez les emails/téléphones qui recevront les alertes en temps réel.'
            },
            {
                step: 3,
                title: 'Activer l\'escalade',
                description: 'Activez la notification automatique du médecin prescripteur si disponible.'
            }
        ],
        fullDoc: `
# Alertes Critiques

## Présentation
Recevez une notification immédiate lorsqu'un résultat contient une valeur critique nécessitant une attention urgente.

## Configuration des seuils

### Seuils par défaut
Le système détecte automatiquement les valeurs marquées comme critiques dans les PDFs.

### Seuils personnalisés
Vous pouvez ajouter des règles pour :
- Glycémie > 4 g/L ou < 0.5 g/L
- Hémoglobine < 7 g/dL
- Potassium > 6 mmol/L
- etc.

## Notifications

### Canaux
- Email instantané
- SMS (crédit requis)
- Notification push (app mobile)

### Destinataires
- Administrateur laboratoire
- Biologiste de garde
- Médecin prescripteur (si connu)

## Tableau de bord des alertes
Visualisez toutes les alertes passées et leur statut (traitée / en attente).
        `
    },

    WHATSAPP_BUSINESS: {
        id: 'WHATSAPP_BUSINESS',
        name: 'WhatsApp Business',
        quickStart: [
            {
                step: 1,
                title: 'Lier votre compte WhatsApp Business',
                description: 'Suivez la procédure Meta pour connecter votre numéro professionnel.'
            },
            {
                step: 2,
                title: 'Valider les templates de messages',
                description: 'Soumettez vos templates de notification à Meta pour approbation.'
            },
            {
                step: 3,
                title: 'Activer l\'envoi WhatsApp',
                description: 'Dans les paramètres de notification, cochez "Envoyer via WhatsApp".'
            }
        ],
        fullDoc: `
# WhatsApp Business

## Présentation
Envoyez les notifications de résultats directement sur WhatsApp pour un taux de lecture optimal (98% vs 20% pour les SMS).

## Prérequis
- Compte Meta Business Manager
- Numéro WhatsApp Business API
- Templates de messages approuvés par Meta

## Configuration

### Liaison du compte
1. Créez un compte sur Meta Business Suite
2. Ajoutez votre numéro WhatsApp Business API
3. Liez le compte à MedLab via le token fourni

### Templates de messages
Les templates doivent être approuvés par Meta :
- Notification de résultat disponible
- Rappel de rendez-vous
- Confirmation de prélèvement

### Activation
Une fois le compte lié et les templates approuvés :
1. Allez dans Paramètres > Notifications
2. Activez "Envoi WhatsApp"
3. Sélectionnez les templates à utiliser

## Tarification
- Facturation par message envoyé
- Tarifs Meta Business API
        `
    },

    MOBILE_MONEY: {
        id: 'MOBILE_MONEY',
        name: 'Paiements Mobile Money',
        quickStart: [
            {
                step: 1,
                title: 'Créer vos comptes marchands',
                description: 'Inscrivez-vous comme marchant chez Orange Money et/ou MTN MoMo.'
            },
            {
                step: 2,
                title: 'Renseigner les identifiants API',
                description: 'Dans les paramètres, entrez vos clés API Orange Money / MTN MoMo.'
            },
            {
                step: 3,
                title: 'Activer les paiements',
                description: 'Cochez les modes de paiement acceptés dans les paramètres de facturation.'
            }
        ],
        fullDoc: `
# Paiements Mobile Money

## Présentation
Acceptez les paiements par Orange Money, MTN Mobile Money et CamPay directement dans MedLab.

## Opérateurs supportés
- Orange Money Cameroun
- MTN Mobile Money
- CamPay (agrégateur)

## Configuration

### Compte marchand
1. Inscrivez-vous comme marchand chez l'opérateur
2. Obtenez vos clés API (API Key, Secret)
3. Configurez le webhook de callback

### Intégration MedLab
1. Allez dans **Paramètres > Paiements**
2. Entrez vos identifiants pour chaque opérateur
3. Activez les modes de paiement souhaités

## Flux de paiement
1. Le patient reçoit son résultat avec le montant à payer
2. Il clique sur "Payer"
3. Choisit son opérateur (OM, MoMo, CamPay)
4. Valide avec son code PIN
5. Reçoit le PDF débloqué

## Réconciliation
Tableau de bord des paiements avec :
- Historique des transactions
- Export comptable
- Rapprochement automatique
        `
    },

    API_ADVANCED: {
        id: 'API_ADVANCED',
        name: 'API LIS Avancée',
        configPath: '/dashboard/integration',
        quickStart: [
            {
                step: 1,
                title: 'Générer une clé API LIS',
                description: 'Dans Intégration API, créez une clé pour votre système d\'information laboratoire.'
            },
            {
                step: 2,
                title: 'Consulter la documentation',
                description: 'Accédez à la doc Swagger pour voir tous les endpoints disponibles.'
            },
            {
                step: 3,
                title: 'Tester l\'intégration',
                description: 'Envoyez une requête test au format JSON ou HL7 vers l\'endpoint d\'ingestion.'
            }
        ],
        fullDoc: `
# API LIS Avancée

## Présentation
Intégrez votre Système d'Information de Laboratoire (SIL/LIS) avec MedLab via une API REST bidirectionnelle.

## Formats supportés
- JSON native
- HL7 v2.x (ORU^R01, ORM^O01)
- FHIR R4 (en développement)

## Endpoints principaux

### Ingestion de résultat
\`\`\`
POST /api/connect/ingest
Headers: X-API-Key: votre_clé
Content-Type: application/json
\`\`\`

### Consultation d'un résultat
\`\`\`
GET /api/results/:id
Headers: X-API-Key: votre_clé
\`\`\`

### Webhook de notification
Configurez un webhook pour recevoir les événements :
- Résultat créé
- Résultat consulté
- Paiement reçu

## Documentation Swagger
Accédez à la documentation interactive :
\`/api/docs\`

## Exemples HL7
Voir la section Documentation dans Intégration API.
        `
    },

    UNLIMITED_TEAM: {
        id: 'UNLIMITED_TEAM',
        name: 'Équipe Illimitée',
        configPath: '/dashboard/team',
        quickStart: [
            {
                step: 1,
                title: 'Accéder à la gestion d\'équipe',
                description: 'Cliquez sur "Mon Équipe" dans la sidebar pour gérer vos utilisateurs.'
            },
            {
                step: 2,
                title: 'Inviter un membre',
                description: 'Cliquez sur "Inviter" et entrez l\'email du nouveau collaborateur.'
            },
            {
                step: 3,
                title: 'Attribuer un rôle',
                description: 'Choisissez le rôle : Administrateur, Technicien, ou Réceptionniste.'
            }
        ],
        fullDoc: `
# Équipe Illimitée

## Présentation
Ajoutez un nombre illimité de techniciens et utilisateurs à votre équipe. Sans ce module, vous êtes limité à 3 utilisateurs.

## Rôles disponibles

| Rôle | Permissions |
|------|-------------|
| LAB_ADMIN | Accès complet, paramètres, facturation |
| TECHNICIAN | Upload résultats, historique |
| RECEPTIONIST | Consultation uniquement |

## Gestion des utilisateurs

### Inviter un membre
1. Allez dans **Mon Équipe**
2. Cliquez sur **Inviter un membre**
3. Entrez l'email
4. Sélectionnez le rôle
5. L'utilisateur reçoit un email d'invitation

### Modifier un rôle
1. Cliquez sur l'utilisateur dans la liste
2. Changez le rôle via le menu déroulant
3. Confirmez

### Désactiver un compte
1. Cliquez sur l'utilisateur
2. Cliquez sur "Désactiver"
3. Le compte est suspendu (pas supprimé)

## Audit
Toutes les actions sont tracées dans le journal d'audit.
        `
    }
};

// Helper function to get documentation by module ID
export function getModuleDoc(moduleId: string): ModuleDocumentation | undefined {
    return modulesDocs[moduleId];
}

// Helper function to get all module IDs
export function getAllModuleIds(): string[] {
    return Object.keys(modulesDocs);
}
