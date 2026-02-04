import { Link } from 'react-router-dom';
import { Activity, ArrowLeft } from 'lucide-react';

export function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-primary font-bold text-xl">
                        <Activity className="w-6 h-6" />
                        <span>MedLab Secure</span>
                    </Link>
                    <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-primary transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Retour à l'accueil
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-16 max-w-4xl">
                <h1 className="text-4xl font-bold mb-8">Politique de Confidentialité</h1>

                <div className="bg-white rounded-2xl p-8 shadow-sm space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
                        <p className="text-slate-600 leading-relaxed">
                            MedLab Secure SAS (ci-après « nous », « notre » ou « MedLab ») s'engage à protéger
                            la vie privée de ses utilisateurs. Cette politique de confidentialité explique comment
                            nous collectons, utilisons, stockons et protégeons vos données personnelles, notamment
                            les données de santé qui sont des données sensibles soumises à une protection renforcée.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">2. Données collectées</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">Nous collectons les catégories de données suivantes :</p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li><strong>Données d'identification :</strong> nom, prénom, date de naissance, numéro de téléphone, email</li>
                            <li><strong>Données de santé :</strong> résultats d'analyses médicales, historique des consultations</li>
                            <li><strong>Données techniques :</strong> logs de connexion, adresse IP, type de navigateur</li>
                            <li><strong>Données de transaction :</strong> historique des paiements (le cas échéant)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">3. Finalités du traitement</h2>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Transmission sécurisée des résultats d'analyses aux patients</li>
                            <li>Gestion des rendez-vous et notifications</li>
                            <li>Amélioration de nos services et support client</li>
                            <li>Respect des obligations légales et réglementaires</li>
                            <li>Traçabilité et audit de sécurité</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">4. Base légale</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Le traitement de vos données personnelles repose sur les bases légales suivantes :
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2 mt-4">
                            <li><strong>Exécution du contrat :</strong> pour la fourniture de nos services</li>
                            <li><strong>Consentement explicite :</strong> pour les données de santé</li>
                            <li><strong>Intérêt légitime :</strong> pour l'amélioration de nos services</li>
                            <li><strong>Obligation légale :</strong> pour la conservation des données médicales</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">5. Conservation des données</h2>
                        <div className="text-slate-600 space-y-4">
                            <p>Les durées de conservation varient selon le type de données :</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Résultats médicaux :</strong> Configurable par le laboratoire (7 à 90 jours sur notre plateforme)</li>
                                <li><strong>Données de compte :</strong> Durée de la relation contractuelle + 3 ans</li>
                                <li><strong>Logs de connexion :</strong> 1 an conformément à la législation</li>
                                <li><strong>Données de facturation :</strong> 10 ans (obligation comptable)</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">6. Sécurité des données</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles
                            conformes aux standards les plus élevés :
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Chiffrement AES-256 des données au repos et en transit</li>
                            <li>Hébergement certifié HDS (Hébergeur de Données de Santé)</li>
                            <li>Authentification à deux facteurs (OTP)</li>
                            <li>Audit trail complet de toutes les actions</li>
                            <li>Tests de pénétration réguliers</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">7. Vos droits</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            Conformément au RGPD et à la législation camerounaise, vous disposez des droits suivants :
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
                            <li><strong>Droit de rectification :</strong> corriger des données inexactes</li>
                            <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
                            <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                            <li><strong>Droit d'opposition :</strong> vous opposer à certains traitements</li>
                        </ul>
                        <p className="text-slate-600 mt-4">
                            Pour exercer ces droits, contactez notre DPO : <strong>dpo@medlab.cm</strong>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">8. Partage des données</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées
                            uniquement avec :
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2 mt-4">
                            <li>Votre laboratoire d'analyses (en tant que responsable de traitement)</li>
                            <li>Nos sous-traitants certifiés HDS (hébergement, SMS)</li>
                            <li>Les autorités compétentes en cas d'obligation légale</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">9. Contact</h2>
                        <div className="text-slate-600 space-y-2">
                            <p><strong>Délégué à la Protection des Données (DPO) :</strong></p>
                            <p>Email : dpo@medlab.cm</p>
                            <p>Adresse : MedLab Secure SAS, Quartier Bastos, Yaoundé, Cameroun</p>
                        </div>
                    </section>

                    <p className="text-slate-500 text-sm pt-4 border-t">
                        Dernière mise à jour : Février 2026
                    </p>
                </div>
            </main>
        </div>
    );
}
