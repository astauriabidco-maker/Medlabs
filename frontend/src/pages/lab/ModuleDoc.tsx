import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ExternalLink, Settings } from 'lucide-react';
import { Button } from '@/components/ui-basic';
import { getModuleDoc } from '@/data/modulesDocs';
import ReactMarkdown from 'react-markdown';

export default function ModuleDoc() {
    const { moduleId } = useParams<{ moduleId: string }>();
    const doc = moduleId ? getModuleDoc(moduleId) : undefined;

    if (!doc) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-800">Module non trouvé</h1>
                    <p className="text-muted-foreground mt-2">
                        La documentation pour ce module n'existe pas.
                    </p>
                    <Link to="/dashboard/marketplace">
                        <Button className="mt-4">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Retour à la Marketplace
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard/marketplace">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Marketplace
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-primary" />
                            {doc.name}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Documentation complète du module
                        </p>
                    </div>
                </div>
                {doc.configPath && (
                    <Link to={doc.configPath}>
                        <Button>
                            <Settings className="w-4 h-4 mr-2" />
                            Configurer
                        </Button>
                    </Link>
                )}
            </div>

            {/* Quick Start Summary */}
            <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-xl p-6">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm">⚡</span>
                    Démarrage rapide
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                    {doc.quickStart.map((step) => (
                        <div key={step.step} className="flex gap-3 bg-white/60 rounded-lg p-3">
                            <div className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                {step.step}
                            </div>
                            <div>
                                <p className="font-medium text-sm">{step.title}</p>
                                <p className="text-xs text-muted-foreground">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Full Documentation */}
            <div className="bg-white border rounded-xl p-6">
                <article className="prose prose-sm max-w-none prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h2:border-b prose-h2:pb-2 prose-h2:mb-4 prose-table:text-sm prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
                    <ReactMarkdown>{doc.fullDoc}</ReactMarkdown>
                </article>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between py-4 border-t">
                <Link to="/dashboard/marketplace">
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour à la Marketplace
                    </Button>
                </Link>
                {doc.configPath && (
                    <Link to={doc.configPath}>
                        <Button>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Accéder au module
                        </Button>
                    </Link>
                )}
            </div>
        </div>
    );
}
