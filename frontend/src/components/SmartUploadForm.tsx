import { useState, useCallback, useEffect } from 'react';
import { UploadCloud, FileCheck, AlertTriangle, Loader2, X, Sparkles, Lock, Wallet, Stethoscope } from 'lucide-react';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent } from './ui-basic';
import { useTranslation } from 'react-i18next';
import { AccessCodeModal } from './AccessCodeModal';
import * as pdfjsLib from 'pdfjs-dist';
import { extractPdfData, ExtractedData, OcrProgressCallback } from '@/lib/pdf-extractor';

// Worker configuration
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface FormData {
    folderRef: string;
    firstName: string;
    lastName: string;
    dob: string;
    email: string;
    phone: string;
    isBlocked: boolean;
    price: string;
    prescriberName: string;  // Médecin prescripteur (for BI Dashboard)
    consentGiven: boolean;   // Consentement patient pour envoi électronique
    civility: '' | 'M' | 'Mme' | 'Mlle';  // Civilité patient
    sampleDate: string;  // Date de prélèvement (ISO format)
}

export function SmartUploadForm() {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [ocrProgress, setOcrProgress] = useState<{ percent: number; status: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [autoExtracted, setAutoExtracted] = useState<ExtractedData | null>(null);

    // Liste des prescripteurs configurés par le laboratoire
    const [prescribers, setPrescribers] = useState<string[]>([]);

    const [form, setForm] = useState<FormData>({
        folderRef: '',
        firstName: '',
        lastName: '',
        dob: '',
        email: '',
        phone: '',
        isBlocked: false,
        price: '',
        prescriberName: '',
        consentGiven: false,
        civility: '',
        sampleDate: ''
    });

    // Access Code Modal state
    const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
    const [accessCode, setAccessCode] = useState('');

    // Charger la liste des prescripteurs depuis le tenant
    useEffect(() => {
        const loadPrescribers = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch('/api/tenants/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.prescribers && Array.isArray(data.prescribers)) {
                        setPrescribers(data.prescribers);
                    }
                }
            } catch (err) {
                console.error('Failed to load prescribers', err);
            }
        };
        loadPrescribers();
    }, []);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragging(true);
        } else if (e.type === 'dragleave') {
            setDragging(false);
        }
    }, []);

    const parsePdf = async (file: File) => {
        setParsing(true);
        setAutoExtracted(null);
        setOcrProgress(null);

        try {
            // Progress callback for OCR
            const onProgress: OcrProgressCallback = (percent, status) => {
                setOcrProgress({ percent, status });
            };

            // Use the new PDF extractor with OCR fallback
            const extracted = await extractPdfData(file, onProgress);

            if (extracted.confidence !== 'none') {
                setAutoExtracted(extracted);

                // Auto-fill form with extracted data (SAUF prescriberName - doit être sélectionné manuellement)
                setForm(prev => ({
                    ...prev,
                    firstName: extracted.patientFirstName || prev.firstName,
                    lastName: extracted.patientLastName || prev.lastName,
                    phone: extracted.patientPhone || prev.phone,
                    folderRef: extracted.folderRef || prev.folderRef,
                    civility: extracted.civility || prev.civility,
                    sampleDate: extracted.sampleDate || prev.sampleDate,
                    // prescriberName: NE PAS auto-remplir, laissé vide pour sélection manuelle
                }));
            }

            // Also try to extract DOB using the original method
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            const textContent = await page.getTextContent();
            const text = textContent.items.map((item: any) => item.str).join(' ');

            // DOB patterns
            const bornDatePatterns = [
                /N[ée](?:e)?\s+(?:le)?\s*[:.]?\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
                /Date\s+de\s+naissance\s*[:.]?\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
                /D\.?D\.?N\.?\s*[:.]?\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
            ];

            let foundDob = '';
            for (const pattern of bornDatePatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    foundDob = match[1];
                    break;
                }
            }

            if (foundDob) {
                setForm(prev => ({
                    ...prev,
                    dob: foundDob,
                }));
            }

        } catch (err) {
            console.error('[SmartUploadForm] Parse error:', err);
            setError(t('errors.parsing'));
        } finally {
            setParsing(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        setError(null);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];

            if (droppedFile.type !== 'application/pdf') {
                setError(t('errors.pdf_only'));
                return;
            }
            if (droppedFile.size > 10 * 1024 * 1024) { // 10MB
                setError(t('errors.file_size'));
                return;
            }

            setFile(droppedFile);
            parsePdf(droppedFile);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selFile = e.target.files[0];
            if (selFile.type !== 'application/pdf') {
                setError(t('errors.pdf_only'));
                return;
            }
            setFile(selFile);
            parsePdf(selFile);
        }
    };

    const validatePhone = (phone: string) => {
        return /^\+237[6]\d{8}$/.test(phone) || /^\+[1-9]\d{1,14}$/.test(phone);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validatePhone(form.phone)) {
            setError(t('errors.invalid_phone'));
            return;
        }
        if (!file) {
            setError(t('errors.no_file'));
            return;
        }

        if (!form.dob) {
            setError(t('errors.required'));
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderRef', form.folderRef);
        formData.append('patientPhone', form.phone);
        formData.append('patientEmail', form.email);
        formData.append('patientName', `${form.firstName} ${form.lastName}`);
        // Convert DD/MM/YYYY to ISO if needed, or send as is strictly.
        // Assuming backend handles ISO or specific format. Let's convert to ISO YYYY-MM-DD
        const [day, month, year] = form.dob.split(/[\/\-.]/);
        if (day && month && year) {
            formData.append('patientDob', `${year}-${month}-${day}`);
        } else {
            formData.append('patientDob', form.dob); // Fallback
        }

        // Payment/Paywall data
        if (form.isBlocked && form.price) {
            formData.append('price', form.price);
            formData.append('paymentStatus', 'UNPAID');
        }

        // BI Dashboard: Prescriber tracking
        if (form.prescriberName) {
            formData.append('prescriberName', form.prescriberName);
        }

        // Civility (patient title)
        if (form.civility) {
            formData.append('civility', form.civility);
        }

        // Sample collection date
        if (form.sampleDate) {
            formData.append('sampleDate', form.sampleDate);
        }

        try {
            // Mock API call
            const response = await fetch('/api/results', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || t('errors.upload_failed'));
            }

            const data = await response.json();

            // Show access code modal if code is returned
            if (data.accessCode) {
                setAccessCode(data.accessCode);
                setShowAccessCodeModal(true);
            }

            setSuccess(true);
            setFile(null);
            setForm({
                folderRef: '',
                firstName: '',
                lastName: '',
                dob: '',
                email: '',
                phone: '',
                isBlocked: false,
                price: '',
                prescriberName: '',
                consentGiven: false,
                civility: '',
                sampleDate: ''
            });

        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const removeFile = () => {
        setFile(null);
        setSuccess(false);
        setAutoExtracted(null);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto mt-10">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UploadCloud className="w-6 h-6 text-primary" />
                    {t('upload.title')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
                        <FileCheck className="w-5 h-5" />
                        <span>{t('upload.success')}</span>
                        <button onClick={() => setSuccess(false)} className="ml-auto p-1 hover:bg-green-100 rounded">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {!file ? (
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`
                            border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
                            ${dragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
                        `}
                    >
                        <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            id="file-upload"
                            onChange={handleFileChange}
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                            <UploadCloud className={`w-12 h-12 mb-4 ${dragging ? 'text-primary' : 'text-gray-400'}`} />
                            <p className="text-lg font-medium text-gray-700">{t('upload.dragDrop')}</p>
                            <p className="text-sm text-gray-500 mt-1">{t('upload.browse')}</p>
                        </label>
                    </div>
                ) : (
                    <div className="flex items-center p-4 bg-gray-50 border rounded-lg mb-6">
                        <FileCheck className="w-8 h-8 text-blue-500 mr-3" />
                        <div className="flex-1 overflow-hidden">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        {parsing && <span className="text-xs text-blue-500 mr-3 animate-pulse">{t('upload.parsing')}</span>}
                        <button onClick={removeFile} className="text-gray-400 hover:text-red-500 p-1">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* OCR Progress Bar */}
                {ocrProgress && parsing && (
                    <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                            <span className="text-sm font-medium text-orange-700">
                                🔍 OCR en cours (PDF scanné détecté)
                            </span>
                        </div>
                        <div className="w-full bg-orange-200 rounded-full h-2">
                            <div
                                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${ocrProgress.percent}%` }}
                            />
                        </div>
                        <p className="text-xs text-orange-600 mt-1">{ocrProgress.status}</p>
                    </div>
                )}

                {/* OCR Auto-extraction Badge */}
                {autoExtracted && autoExtracted.confidence !== 'none' && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <div className="flex-1">
                            <span className="text-sm font-medium text-purple-700">
                                ✨ {t('upload.ocr.extracted')}
                            </span>
                            {autoExtracted.ocrUsed && (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                    OCR
                                </span>
                            )}
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${autoExtracted.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                autoExtracted.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                {autoExtracted.confidence === 'high' ? t('upload.ocr.high') :
                                    autoExtracted.confidence === 'medium' ? t('upload.ocr.medium') : t('upload.ocr.low')}
                            </span>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="folderRef">{t('upload.folderRef')} *</Label>
                            <Input
                                id="folderRef"
                                required
                                value={form.folderRef}
                                onChange={e => setForm({ ...form, folderRef: e.target.value })}
                                placeholder="DOS-2024-..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dob">{t('upload.dob')} *</Label>
                            <Input
                                id="dob"
                                required
                                value={form.dob}
                                onChange={e => setForm({ ...form, dob: e.target.value })}
                                placeholder="DD/MM/YYYY"
                            />
                        </div>
                    </div>

                    {/* Civilité + Date de Prélèvement */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="civility">Civilité</Label>
                            <select
                                id="civility"
                                value={form.civility}
                                onChange={e => setForm({ ...form, civility: e.target.value as '' | 'M' | 'Mme' | 'Mlle' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">-- Sélectionner --</option>
                                <option value="M">M.</option>
                                <option value="Mme">Mme</option>
                                <option value="Mlle">Mlle</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sampleDate">Date de Prélèvement</Label>
                            <Input
                                id="sampleDate"
                                type="date"
                                value={form.sampleDate}
                                onChange={e => setForm({ ...form, sampleDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Prénom + Nom */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">{t('upload.firstName')}</Label>
                            <Input
                                id="firstName"
                                value={form.firstName}
                                onChange={e => setForm({ ...form, firstName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">{t('upload.lastName')}</Label>
                            <Input
                                id="lastName"
                                value={form.lastName}
                                onChange={e => setForm({ ...form, lastName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">{t('upload.email')} *</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                placeholder="patient@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="flex justify-between">
                                <span>{t('upload.phone')} *</span>
                                <span className="text-xs text-gray-500 font-normal">Strict E.164 (+237...)</span>
                            </Label>
                            <Input
                                id="phone"
                                required
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                placeholder="+237 6..."
                                className={form.phone && !validatePhone(form.phone) ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                            {form.phone && !validatePhone(form.phone) && (
                                <p className="text-xs text-red-500">{t('errors.invalid_phone')}</p>
                            )}
                        </div>
                    </div>

                    {/* Prescriber Name (BI Dashboard) - Select avec liste préremplie */}
                    <div className="space-y-2">
                        <Label htmlFor="prescriberName" className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-purple-500" />
                            {t('upload.prescriberName', 'Médecin Prescripteur')}
                            <span className="text-xs text-gray-400 font-normal">(Facultatif - pour statistiques)</span>
                        </Label>
                        <select
                            id="prescriberName"
                            value={form.prescriberName}
                            onChange={e => setForm({ ...form, prescriberName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            <option value="">-- Sélectionner un prescripteur --</option>
                            {prescribers.map((name, idx) => (
                                <option key={idx} value={name}>{name}</option>
                            ))}
                        </select>
                        {prescribers.length === 0 && (
                            <p className="text-xs text-gray-400 italic">Aucun prescripteur configuré. Ajoutez-les dans Paramètres.</p>
                        )}
                    </div>

                    {/* Payment Paywall Section */}
                    <div className="border-t pt-4 mt-4">
                        <div className="flex items-center gap-3 mb-3">
                            <input
                                type="checkbox"
                                id="isBlocked"
                                checked={form.isBlocked}
                                onChange={e => setForm({ ...form, isBlocked: e.target.checked })}
                                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                            />
                            <label htmlFor="isBlocked" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                                <Lock className="w-4 h-4 text-orange-500" />
                                <span>{t('upload.isBlocked', 'Résultat bloqué (Impayé)')}</span>
                            </label>
                        </div>
                        {form.isBlocked && (
                            <div className="pl-7 space-y-2">
                                <Label htmlFor="price" className="flex items-center gap-2">
                                    <Wallet className="w-4 h-4 text-green-600" />
                                    {t('upload.price', 'Montant restant (FCFA)')} *
                                </Label>
                                <Input
                                    id="price"
                                    type="number"
                                    min="0"
                                    required={form.isBlocked}
                                    value={form.price}
                                    onChange={e => setForm({ ...form, price: e.target.value })}
                                    placeholder="Ex: 15000"
                                    className="max-w-xs"
                                />
                                <p className="text-xs text-gray-500">
                                    {t('upload.priceHint', 'Le patient devra payer ce montant par Mobile Money pour accéder au résultat')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Patient Consent Section - Conformité Loi Camerounaise */}
                    <div className="border-t pt-4 mt-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="consentGiven"
                                    checked={form.consentGiven}
                                    onChange={e => setForm({ ...form, consentGiven: e.target.checked })}
                                    className="w-5 h-5 mt-0.5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
                                />
                                <label htmlFor="consentGiven" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
                                    <span className="font-medium text-gray-900">
                                        Je confirme avoir recueilli l'accord du patient pour :
                                    </span>
                                    <ul className="mt-2 ml-4 list-disc space-y-1 text-gray-600">
                                        <li>L'envoi de ses résultats par voie électronique (WhatsApp et/ou Email)</li>
                                        <li>L'utilisation de ses données personnelles uniquement dans le cadre de cet examen médical</li>
                                    </ul>
                                    <p className="mt-2 text-xs text-gray-500 italic">
                                        Conformément à la Loi n°2010/012 relative à la cybersécurité et cybercriminalité au Cameroun,
                                        aucune exploitation commerciale ne sera faite de ces informations.
                                    </p>
                                </label>
                            </div>
                        </div>
                        {!form.consentGiven && file && (
                            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Vous devez confirmer le consentement du patient pour envoyer le résultat
                            </p>
                        )}
                    </div>

                    <div className="pt-4">
                        <Button type="submit" className="w-full" disabled={loading || !file || !validatePhone(form.phone) || !form.dob || !form.consentGiven}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {loading ? t('upload.btn_uploading') : t('upload.btn_send')}
                        </Button>
                    </div>
                </form>
            </CardContent>

            {/* Access Code Modal */}
            <AccessCodeModal
                isOpen={showAccessCodeModal}
                accessCode={accessCode}
                patientName={`${form.firstName} ${form.lastName}`.trim() || 'Patient'}
                folderRef={form.folderRef || 'N/A'}
                onClose={() => setShowAccessCodeModal(false)}
            />
        </Card>
    );
}

