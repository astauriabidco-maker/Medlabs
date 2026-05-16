import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Input,
    Label,
} from '@/components/ui-basic';
import {
    Shield,
    Loader2,
    CheckCircle,
    AlertTriangle,
    Download,
    FileText,
    Hash,
    Lock,
    Wallet,
    Smartphone,
} from 'lucide-react';

const API_BASE = 'http://localhost:3005';

type WizardState =
    | 'loading'
    | 'accessCode'
    | 'paywall'
    | 'paying'
    | 'success'
    | 'error';

interface ErrorInfo {
    title: string;
    message: string;
}

interface GuestErrorResponse {
    message?: string;
    isAnonymized?: boolean;
}

interface VerifyCodeResponse {
    paymentStatus?: string;
    price?: number;
    documentId?: string;
    paymentAccessToken?: string;
    downloadUrl?: string;
}

interface PaymentInitiateResponse {
    reference: string;
}

interface PaymentStatusResponse {
    paymentStatus?: string;
}

export function GuestAccess() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [state, setState] = React.useState<WizardState>('loading');
    const [accessCode, setAccessCode] = React.useState('');
    const [downloadUrl, setDownloadUrl] = React.useState<string>('');
    const [error, setError] = React.useState<ErrorInfo | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    // Payment state
    const [documentId, setDocumentId] = React.useState<string>('');
    const [paymentAccessToken, setPaymentAccessToken] =
        React.useState<string>('');
    const [paymentAmount, setPaymentAmount] = React.useState<number>(0);
    const [paymentReference, setPaymentReference] = React.useState<string>('');

    // Detect mobile
    const isMobile = React.useMemo(() => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
        );
    }, []);

    // Initial token check
    React.useEffect(() => {
        if (!token) {
            setError({
                title: t('guest.error.title'),
                message: t('guest.error.invalidLink'),
            });
            setState('error');
            return;
        }
        setState('accessCode');
    }, [token, t]);

    const handleVerifyCode = async () => {
        if (accessCode.length < 4) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/auth/guest/verify-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, accessCode: accessCode.trim() }),
            });

            // Check for archived document
            if (res.status === 410) {
                const data: GuestErrorResponse = await res
                    .json()
                    .catch(() => ({}));
                if (data.isAnonymized) {
                    setError({
                        title: t('guest.error.archived'),
                        message: t('guest.error.archivedDesc'),
                    });
                    setState('error');
                    return;
                }
                window.location.href = '/expired';
                return;
            }

            if (res.status === 401) {
                setError({
                    title: t('guest.error.expired'),
                    message: t('guest.error.expiredDesc'),
                });
                setState('error');
                return;
            }

            if (res.status === 403) {
                setError({
                    title: t('guest.accessCode.invalid'),
                    message: t('guest.accessCode.invalidDesc'),
                });
                setAccessCode('');
                return;
            }

            if (!res.ok) {
                const errData: GuestErrorResponse = await res
                    .json()
                    .catch(() => ({}));
                throw new Error(errData.message || 'Verification failed');
            }

            const data: VerifyCodeResponse = await res.json();

            // Check if payment is required
            if (data.paymentStatus === 'UNPAID' && data.price > 0) {
                setDocumentId(data.documentId);
                setPaymentAccessToken(data.paymentAccessToken);
                setPaymentAmount(data.price);
                setState('paywall');
                return;
            }

            setDownloadUrl(data.downloadUrl);
            setState('success');
        } catch (err: unknown) {
            setError({
                title: t('guest.error.title'),
                message:
                    err instanceof Error ? err.message : t('errors.failed'),
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle payment initiation
    const handlePayment = async () => {
        setIsLoading(true);
        setError(null);
        setState('paying');

        try {
            const res = await fetch(`${API_BASE}/payment/initiate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId, paymentAccessToken }),
            });

            if (!res.ok) {
                const errData: GuestErrorResponse = await res
                    .json()
                    .catch(() => ({}));
                throw new Error(errData.message || 'Payment initiation failed');
            }

            const data: PaymentInitiateResponse = await res.json();
            setPaymentReference(data.reference);

            // Poll for payment status
            pollPaymentStatus(data.reference);
        } catch (err: unknown) {
            setError({
                title: t('guest.payment.error', 'Erreur de paiement'),
                message:
                    err instanceof Error ? err.message : t('errors.failed'),
            });
            setState('paywall');
        } finally {
            setIsLoading(false);
        }
    };

    // Poll payment status
    const pollPaymentStatus = async () => {
        const maxAttempts = 30; // 5 minutes with 10s intervals
        let attempts = 0;

        const checkStatus = async () => {
            try {
                const params = new URLSearchParams({ paymentAccessToken });
                const res = await fetch(
                    `${API_BASE}/payment/status/${documentId}?${params.toString()}`,
                );
                const data: PaymentStatusResponse = await res.json();

                if (data.paymentStatus === 'PAID') {
                    // Re-verify to get download URL
                    const verifyRes = await fetch(
                        `${API_BASE}/auth/guest/verify-code`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                token,
                                accessCode: accessCode.trim(),
                            }),
                        },
                    );
                    const verifyData: VerifyCodeResponse =
                        await verifyRes.json();
                    setDownloadUrl(verifyData.downloadUrl);
                    setState('success');
                    return;
                }

                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(checkStatus, 10000); // Check every 10 seconds
                } else {
                    setError({
                        title: 'Timeout',
                        message: t(
                            'guest.payment.timeout',
                            "Le délai d'attente du paiement a expiré",
                        ),
                    });
                    setState('paywall');
                }
            } catch (err) {
                console.error('Payment status check failed:', err);
            }
        };

        checkStatus();
    };

    // Handle Enter key
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && accessCode.length >= 4) {
            handleVerifyCode();
        }
    };

    // Render states
    if (state === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (state === 'error' && error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <CardTitle className="text-xl">{error.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-muted-foreground mb-6">
                            {error.message}
                        </p>
                        <Button
                            onClick={() => window.location.reload()}
                            variant="outline"
                            className="w-full"
                        >
                            {t('guest.error.tryAgain')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (state === 'accessCode') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <Card className="w-full max-w-md shadow-xl">
                    <CardHeader className="text-center pb-4">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Hash className="w-10 h-10 text-white" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-slate-800">
                            {t('guest.accessCode.title')}
                        </CardTitle>
                        <p className="text-muted-foreground mt-2">
                            {t('guest.accessCode.subtitle')}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Error display */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-red-700">
                                        {error.title}
                                    </p>
                                    <p className="text-sm text-red-600">
                                        {error.message}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Access Code Input */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="accessCode"
                                className="text-sm font-medium"
                            >
                                {t('guest.accessCode.label')}
                            </Label>
                            <Input
                                id="accessCode"
                                value={accessCode}
                                onChange={(e) =>
                                    setAccessCode(e.target.value.toUpperCase())
                                }
                                onKeyPress={handleKeyPress}
                                placeholder="X4-92"
                                className="text-center text-2xl font-mono tracking-wider h-14 uppercase"
                                autoFocus
                                autoComplete="off"
                            />
                            <p className="text-xs text-muted-foreground text-center">
                                {t('guest.accessCode.hint')}
                            </p>
                        </div>

                        <Button
                            onClick={handleVerifyCode}
                            disabled={isLoading || accessCode.length < 4}
                            className="w-full h-12 text-base font-semibold"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    {t('common.loading')}
                                </>
                            ) : (
                                <>
                                    <Shield className="w-5 h-5 mr-2" />
                                    {t('guest.accessCode.submit')}
                                </>
                            )}
                        </Button>

                        {/* Help text */}
                        <div className="text-center text-sm text-muted-foreground border-t pt-4">
                            <p>{t('guest.accessCode.lostCode')}</p>
                            <p className="font-medium text-primary">
                                {t('guest.accessCode.contactLab')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Paywall state - payment required
    if (state === 'paywall' || state === 'paying') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 p-4">
                <Card className="w-full max-w-md shadow-xl">
                    <CardHeader className="text-center pb-4">
                        <div className="bg-gradient-to-br from-orange-500 to-amber-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Lock className="w-10 h-10 text-white" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-slate-800">
                            {t('guest.payment.title', 'Résultat Verrouillé')}
                        </CardTitle>
                        <p className="text-muted-foreground mt-2">
                            {t(
                                'guest.payment.subtitle',
                                'Un paiement est requis pour accéder à ce résultat',
                            )}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-red-700">
                                        {error.title}
                                    </p>
                                    <p className="text-sm text-red-600">
                                        {error.message}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Amount Display */}
                        <div className="bg-white border-2 border-orange-200 rounded-xl p-6 text-center">
                            <Wallet className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground mb-1">
                                {t(
                                    'guest.payment.amountLabel',
                                    'Montant à payer',
                                )}
                            </p>
                            <p className="text-4xl font-bold text-orange-600">
                                {paymentAmount.toLocaleString()}{' '}
                                <span className="text-lg">FCFA</span>
                            </p>
                        </div>

                        {state === 'paying' ? (
                            <div className="text-center py-6">
                                <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
                                <p className="font-medium text-slate-700">
                                    {t(
                                        'guest.payment.waiting',
                                        'En attente de votre paiement...',
                                    )}
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    {t(
                                        'guest.payment.ussdHint',
                                        'Validez la demande de paiement sur votre téléphone',
                                    )}
                                </p>
                                {paymentReference && (
                                    <p className="text-xs text-muted-foreground mt-4">
                                        Réf: {paymentReference}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <>
                                <Button
                                    onClick={handlePayment}
                                    disabled={isLoading}
                                    className="w-full h-14 text-base font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                                >
                                    <Smartphone className="w-5 h-5 mr-2" />
                                    {t(
                                        'guest.payment.payButton',
                                        'Payer par Mobile Money',
                                    )}
                                </Button>

                                {/* Provider logos */}
                                <div className="flex justify-center gap-6 pt-2">
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-white font-bold text-sm">
                                            MTN
                                        </div>
                                        <span className="text-xs text-muted-foreground mt-1">
                                            MoMo
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
                                            OM
                                        </div>
                                        <span className="text-xs text-muted-foreground mt-1">
                                            Orange
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="text-center text-sm text-muted-foreground border-t pt-4">
                            <p>
                                {t(
                                    'guest.payment.securePayment',
                                    'Paiement sécurisé via Campay',
                                )}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Success state
    if (state === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
                <Card className="w-full max-w-md shadow-xl">
                    <CardHeader className="text-center">
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <CheckCircle className="w-12 h-12 text-white" />
                        </div>
                        <CardTitle className="text-2xl text-green-700">
                            {t('guest.success.title')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p className="text-center text-muted-foreground">
                            {t('guest.success.subtitle')}
                        </p>

                        {/* Download Preview */}
                        <div className="bg-white border-2 border-green-200 rounded-xl p-6 text-center">
                            <FileText className="w-16 h-16 text-green-600 mx-auto mb-4" />
                            <p className="font-medium text-slate-700">
                                Résultat d'analyse
                            </p>
                            <p className="text-sm text-muted-foreground">
                                PDF sécurisé
                            </p>
                        </div>

                        {isMobile ? (
                            <a
                                href={downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                <Button className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700">
                                    <Download className="w-6 h-6 mr-2" />
                                    {t('guest.success.download')}
                                </Button>
                            </a>
                        ) : (
                            <div className="space-y-3">
                                <a
                                    href={downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                >
                                    <Button className="w-full h-12 bg-green-600 hover:bg-green-700">
                                        <Download className="w-5 h-5 mr-2" />
                                        {t('guest.success.download')}
                                    </Button>
                                </a>
                            </div>
                        )}

                        <p className="text-xs text-center text-muted-foreground">
                            {t('guest.success.linkExpiry')}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}
