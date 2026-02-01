
import React, { useState } from 'react';
import { Modal } from './ui-dashboard';
import { Button, Input, Label } from './ui-basic';
import { useTranslation } from 'react-i18next';
import { Phone, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from './ui-dashboard';

interface FixContactModalProps {
    open: boolean;
    onClose: () => void;
    result: { id: string; patientPhone: string; folderRef: string } | null;
    onSuccess: () => void;
}

export function FixContactModal({ open, onClose, result, onSuccess }: FixContactModalProps) {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const [phone, setPhone] = useState(result?.patientPhone || '');
    const [loading, setLoading] = useState(false);

    // Update local state when result changes
    React.useEffect(() => {
        if (result) setPhone(result.patientPhone);
    }, [result]);

    const handleSubmit = async () => {
        if (!result) return;
        setLoading(true);
        try {
            const res = await api.patch(`/api/results/${result.id}/resend`, { phone });

            if (!res.ok) throw new Error('Failed to update and resend');

            addToast(t('history.modals.resentSuccess', { phone }), 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            addToast(t('errors.failed'), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={t('history.modals.retryTitle')}
        >
            <div className="space-y-4">
                <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm">
                    {t('history.modals.confirmText')}
                </div>

                <div className="space-y-2">
                    <Label>{t('history.modals.phoneLabel')}</Label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="pl-9"
                            placeholder="+237..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        {t('actions.cancel')}
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading || !phone}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t('history.modals.btn_confirm')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
