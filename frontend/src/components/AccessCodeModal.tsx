import React from 'react';
import { Printer, X, Check, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AccessCodeModalProps {
    isOpen: boolean;
    accessCode: string;
    patientName: string;
    folderRef: string;
    onClose: () => void;
}

export function AccessCodeModal({
    isOpen,
    accessCode,
    patientName,
    folderRef,
    onClose,
}: AccessCodeModalProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const handlePrint = () => {
        // Create a printable receipt
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Reçu - Code de Retrait</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        padding: 20px;
                        max-width: 400px;
                        margin: 0 auto;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px dashed #ccc;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                    }
                    .logo {
                        font-size: 24px;
                        font-weight: bold;
                        color: #0066cc;
                    }
                    .code-section {
                        text-align: center;
                        background: #f5f5f5;
                        padding: 30px;
                        border-radius: 10px;
                        margin: 20px 0;
                    }
                    .code-label {
                        font-size: 14px;
                        color: #666;
                        margin-bottom: 10px;
                    }
                    .code {
                        font-size: 48px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        color: #333;
                        font-family: monospace;
                    }
                    .info {
                        margin: 20px 0;
                        font-size: 14px;
                    }
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 8px 0;
                        border-bottom: 1px solid #eee;
                    }
                    .info-label {
                        color: #666;
                    }
                    .instructions {
                        margin-top: 30px;
                        padding: 15px;
                        background: #fff8e6;
                        border-radius: 8px;
                        font-size: 12px;
                        color: #666;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        font-size: 11px;
                        color: #999;
                        border-top: 2px dashed #ccc;
                        padding-top: 15px;
                    }
                    @media print {
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">🔬 MedLab Secure</div>
                    <div style="font-size: 12px; color: #666; margin-top: 5px;">Reçu de Résultat</div>
                </div>

                <div class="code-section">
                    <div class="code-label">CODE DE RETRAIT</div>
                    <div class="code">${accessCode}</div>
                </div>

                <div class="info">
                    <div class="info-row">
                        <span class="info-label">Patient:</span>
                        <span>${patientName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Dossier:</span>
                        <span>${folderRef}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Date:</span>
                        <span>${new Date().toLocaleDateString('fr-FR')}</span>
                    </div>
                </div>

                <div class="instructions">
                    <strong>Instructions:</strong><br>
                    1. Vous recevrez un lien par WhatsApp/SMS<br>
                    2. Cliquez sur le lien reçu<br>
                    3. Saisissez le code ci-dessus<br>
                    4. Téléchargez vos résultats
                </div>

                <div class="footer">
                    Conservez ce reçu • En cas de perte, contactez votre laboratoire
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <Hash className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">{t('accessCode.title')}</h2>
                                <p className="text-sm text-white/80">{t('accessCode.subtitle')}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="hover:bg-white/20 p-1 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Code Display */}
                <div className="px-6 py-8">
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
                        <p className="text-sm text-slate-500 mb-3">{t('accessCode.codeLabel')}</p>
                        <div className="text-5xl font-bold tracking-[0.3em] font-mono text-slate-800">
                            {accessCode}
                        </div>
                    </div>

                    {/* Patient Info */}
                    <div className="mt-6 space-y-2 text-sm">
                        <div className="flex justify-between text-slate-600">
                            <span>{t('accessCode.patient')}:</span>
                            <span className="font-medium text-slate-800">{patientName}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                            <span>{t('accessCode.folder')}:</span>
                            <span className="font-mono text-slate-800">{folderRef}</span>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-800 flex items-start gap-2">
                            <span className="text-lg">📋</span>
                            <span>{t('accessCode.instruction')}</span>
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        {t('accessCode.print')}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                        <Check className="w-4 h-4" />
                        {t('accessCode.done')}
                    </button>
                </div>
            </div>
        </div>
    );
}
