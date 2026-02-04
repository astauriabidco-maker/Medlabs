import { Link } from 'react-router-dom';
import { Activity, ArrowLeft } from 'lucide-react';

export function TermsOfService() {
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
                <h1 className="text-4xl font-bold mb-8">Conditions Générales d'Utilisation</h1>

                <div className="bg-white rounded-2xl p-8 shadow-sm space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold mb-4">1. Objet</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation
                            de la plateforme MedLab Secure, un service de transmission sécurisée de résultats
                            d'analyses médicales destiné aux laboratoires de biologie médicale et à leurs patients.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">2. Définitions</h2>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li><strong>« Plateforme » :</strong> Le service web MedLab Secure accessible à l'adresse medlab.cm</li>
                            <li><strong>« Laboratoire » :</strong> Établissement de biologie médicale client de MedLab Secure</li>
                            <li><strong>« Patient » :</strong> Personne physique destinataire des résultats d'analyses</li>
                            <li><strong>« Utilisateur » :</strong> Toute personne accédant à la Plateforme</li>
                            <li><strong>« Résultats » :</strong> Documents PDF contenant les analyses médicales</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">3. Accès au service</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">
                            L'accès à la Plateforme est réservé :
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Aux laboratoires ayant souscrit un abonnement</li>
                            <li>Aux membres du personnel autorisés par le laboratoire</li>
                            <li>Aux patients munis d'un code OTP valide pour consulter leurs résultats</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">4. Inscription et compte</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Les laboratoires s'inscrivent via le formulaire de demande de partenariat.
                            Après validation, un compte administrateur est créé. Le laboratoire est responsable
                            de la confidentialité des identifiants de connexion et de toutes les actions
                            effectuées via son compte.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">5. Obligations du laboratoire</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">Le laboratoire s'engage à :</p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Disposer de toutes les autorisations légales pour exercer</li>
                            <li>Obtenir le consentement des patients pour la transmission électronique</li>
                            <li>Garantir l'exactitude des informations transmises</li>
                            <li>Respecter la réglementation sur les données de santé</li>
                            <li>Former son personnel à l'utilisation sécurisée de la Plateforme</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">6. Obligations de MedLab Secure</h2>
                        <p className="text-slate-600 leading-relaxed mb-4">MedLab Secure s'engage à :</p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2">
                            <li>Assurer la disponibilité du service (SLA 99.9%)</li>
                            <li>Héberger les données chez un hébergeur certifié HDS</li>
                            <li>Mettre en œuvre les mesures de sécurité appropriées</li>
                            <li>Notifier les laboratoires en cas de violation de données</li>
                            <li>Fournir un support technique réactif</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">7. Tarification et paiement</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Les tarifs sont ceux indiqués sur la page Tarifs au moment de la souscription.
                            Le paiement est mensuel, dû d'avance. En cas de non-paiement, l'accès au service
                            pourra être suspendu après mise en demeure restée sans effet pendant 15 jours.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">8. Propriété intellectuelle</h2>
                        <p className="text-slate-600 leading-relaxed">
                            La Plateforme, son code source, son design et ses fonctionnalités sont la propriété
                            exclusive de MedLab Secure SAS. Le laboratoire dispose d'un droit d'utilisation
                            non exclusif, non transférable, limité à la durée de son abonnement.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">9. Responsabilité</h2>
                        <div className="text-slate-600 space-y-4">
                            <p>
                                <strong>Responsabilité de MedLab Secure :</strong> Limitée aux dommages directs
                                prouvés, dans la limite du montant des sommes versées au cours des 12 derniers mois.
                            </p>
                            <p>
                                <strong>Exclusions :</strong> MedLab Secure ne saurait être tenu responsable des
                                dommages indirects, de l'inexactitude des résultats transmis par le laboratoire,
                                ou des interruptions dues à des cas de force majeure.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">10. Durée et résiliation</h2>
                        <p className="text-slate-600 leading-relaxed">
                            L'abonnement est conclu pour une durée initiale de 1 mois, renouvelable tacitement.
                            Chaque partie peut résilier avec un préavis de 30 jours. En cas de manquement grave,
                            la résiliation peut être immédiate après mise en demeure.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">11. Modification des CGU</h2>
                        <p className="text-slate-600 leading-relaxed">
                            MedLab Secure se réserve le droit de modifier les présentes CGU. Les modifications
                            seront notifiées par email 30 jours avant leur entrée en vigueur. L'utilisation
                            continue du service vaut acceptation des nouvelles conditions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">12. Loi applicable et juridiction</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Les présentes CGU sont régies par le droit camerounais. Tout litige sera soumis
                            aux tribunaux compétents de Yaoundé, après tentative de règlement amiable.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">13. Contact</h2>
                        <div className="text-slate-600 space-y-2">
                            <p>Pour toute question concernant les présentes CGU :</p>
                            <p>Email : legal@medlab.cm</p>
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
