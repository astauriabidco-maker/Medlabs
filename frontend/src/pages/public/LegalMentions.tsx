import { Link } from 'react-router-dom';
import { Activity, ArrowLeft } from 'lucide-react';

export function LegalMentions() {
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
                <h1 className="text-4xl font-bold mb-8">Mentions Légales</h1>

                <div className="bg-white rounded-2xl p-8 shadow-sm space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold mb-4">1. Éditeur du site</h2>
                        <div className="text-slate-600 space-y-2">
                            <p><strong>Raison sociale :</strong> MedLab Secure SAS</p>
                            <p><strong>Forme juridique :</strong> Société par Actions Simplifiée</p>
                            <p><strong>Capital social :</strong> 10 000 000 XAF</p>
                            <p><strong>Siège social :</strong> Quartier Bastos, Yaoundé, Cameroun</p>
                            <p><strong>RCCM :</strong> RC/YAO/2024/A/XXXXX</p>
                            <p><strong>NIU :</strong> MXXXXXXXXXXXXXXX</p>
                            <p><strong>Directeur de la publication :</strong> Le Président de la société</p>
                            <p><strong>Email :</strong> contact@medlab.cm</p>
                            <p><strong>Téléphone :</strong> +237 6XX XXX XXX</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">2. Hébergement</h2>
                        <div className="text-slate-600 space-y-2">
                            <p><strong>Hébergeur :</strong> OVH SAS</p>
                            <p><strong>Adresse :</strong> 2 rue Kellermann, 59100 Roubaix, France</p>
                            <p><strong>Certification :</strong> Hébergeur de Données de Santé (HDS)</p>
                            <p><strong>Téléphone :</strong> +33 9 72 10 10 07</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">3. Propriété intellectuelle</h2>
                        <p className="text-slate-600 leading-relaxed">
                            L'ensemble du contenu de ce site (textes, images, graphismes, logo, icônes, logiciels, etc.)
                            est la propriété exclusive de MedLab Secure SAS ou de ses partenaires. Toute reproduction,
                            représentation, modification, publication, transmission ou dénaturation, totale ou partielle
                            du site ou de son contenu, par quelque procédé que ce soit, et sur quelque support que ce soit
                            est interdite sans autorisation écrite préalable de MedLab Secure SAS.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">4. Protection des données personnelles</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi n°2010/012
                            du 21 décembre 2010 relative à la cybersécurité et la cybercriminalité au Cameroun, vous disposez
                            d'un droit d'accès, de rectification, de suppression et d'opposition aux données personnelles
                            vous concernant. Pour exercer ces droits, contactez-nous à : dpo@medlab.cm
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">5. Cookies</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Ce site utilise des cookies strictement nécessaires au fonctionnement du service.
                            Aucun cookie publicitaire ou de tracking tiers n'est utilisé. En continuant à naviguer
                            sur ce site, vous acceptez l'utilisation de ces cookies techniques.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">6. Loi applicable</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Les présentes mentions légales sont soumises au droit camerounais. En cas de litige,
                            les tribunaux de Yaoundé seront seuls compétents.
                        </p>
                    </section>

                    <p className="text-slate-500 text-sm pt-4 border-t">
                        Dernière mise à jour : Février 2026
                    </p>
                </div>
            </main>
        </div>
    );
}
