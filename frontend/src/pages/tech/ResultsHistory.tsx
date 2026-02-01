import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { DataTable, useToast } from '@/components/ui-dashboard';
import { Search, Eye, RefreshCw, Trash2, Send, FileText, MessageSquare, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/StatusBadge';
import { DropdownMenu, DropdownMenuItem } from '@/components/DropdownMenu';
import { FixContactModal } from '@/components/FixContactModal';

interface Result {
    id: string;
    createdAt: string;
    patientName: string;
    patientPhone: string;
    folderRef: string;
    status: 'UPLOADED' | 'NOTIFIED' | 'DELIVERED' | 'OPENED' | 'FAILED' | 'PENDING';
    isCritical?: boolean;
}

export default function ResultsHistory() {
    const { t, i18n } = useTranslation();
    const { addToast } = useToast();
    const [results, setResults] = useState<Result[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [fixModalOpen, setFixModalOpen] = useState(false);
    const [selectedResult, setSelectedResult] = useState<Result | null>(null);

    useEffect(() => {
        fetchResults();
    }, [searchTerm]);

    const fetchResults = async () => {
        try {
            const res = await api.get(`/api/results?search=${encodeURIComponent(searchTerm)}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setResults(data.data || []);
        } catch (error) {
            console.error('Fetch Error:', error);
            addToast(t('errors.fetch_failed'), 'error');
        }
    };

    const handlePreview = async (id: string) => {
        try {
            const res = await api.get(`/api/results/${id}/preview`);
            if (!res.ok) throw new Error('Failed to get preview');
            const { url } = await res.json();
            window.open(url, '_blank');
        } catch (error) {
            addToast(t('errors.preview_failed'), 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('common.warning') + ': ' + t('common.delete') + '?')) return;
        try {
            const res = await api.delete(`/api/results/${id}`);
            if (!res.ok) throw new Error('Failed to delete');
            addToast(t('common.success'), 'success');
            fetchResults();
        } catch (error) {
            addToast(t('errors.failed'), 'error');
        }
    };

    const handleResend = async (result: Result) => {
        // Quick resend without changing phone
        try {
            const res = await api.patch(`/api/results/${result.id}/resend`, { phone: result.patientPhone });
            if (!res.ok) throw new Error('Failed');
            addToast(t('history.modals.resentSuccess', { phone: result.patientPhone }), 'success');
            fetchResults();
        } catch (error) {
            addToast(t('errors.failed'), 'error');
        }
    };

    const handleResendCode = async (result: Result) => {
        // Send access code via SMS fallback
        try {
            const res = await api.post(`/api/results/${result.id}/resend-code`, {});
            if (!res.ok) throw new Error('Failed');
            addToast(t('history.actions.codeSent'), 'success');
        } catch (error) {
            addToast(t('errors.failed'), 'error');
        }
    };

    const openFixModal = (result: Result) => {
        setSelectedResult(result);
        setFixModalOpen(true);
    };

    // Custom Row Render with Background Logic
    const columns = [
        {
            key: 'createdAt',
            header: t('history.table.date'),
            render: (row: Result) => (
                <span className="text-sm text-muted-foreground">
                    {new Date(row.createdAt).toLocaleDateString(i18n.language, {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                </span>
            )
        },
        {
            key: 'patientName',
            header: t('history.table.patient'),
            render: (row: Result) => (
                <div className="flex items-center gap-2">
                    {row.isCritical && (
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                        <div className={`font-medium ${row.isCritical ? 'text-red-700' : 'text-slate-900'}`}>{row.patientName}</div>
                        <div className="text-xs text-slate-500">
                            {row.patientPhone}
                        </div>
                    </div>
                </div>
            )
        },
        {
            key: 'folderRef',
            header: t('history.table.reference'),
            render: (row: Result) => <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{row.folderRef}</span>
        },
        {
            key: 'status',
            header: t('history.table.status'),
            render: (row: Result) => <StatusBadge status={row.status} timestamp={new Date(row.createdAt).toLocaleTimeString()} />
        },
        {
            key: 'actions',
            header: t('history.table.actions'),
            render: (row: Result) => (
                <DropdownMenu>
                    {/* CASE A: FAILED */}
                    {row.status === 'FAILED' && (
                        <>
                            <DropdownMenuItem onClick={() => openFixModal(row)} className="font-bold">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                {t('actions.retry')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePreview(row.id)}>
                                <Eye className="w-4 h-4 mr-2" />
                                {t('actions.preview')}
                            </DropdownMenuItem>
                        </>
                    )}

                    {/* CASE B: UPLOADED (Not Sent) - Assume PENDING/UPLOADED implies not notified yet */}
                    {(row.status === 'UPLOADED' || row.status === 'PENDING') && (
                        <>
                            <DropdownMenuItem onClick={() => handleResend(row)} className="font-medium">
                                <Send className="w-4 h-4 mr-2" />
                                {t('actions.resend')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePreview(row.id)}>
                                <Eye className="w-4 h-4 mr-2" />
                                {t('actions.preview')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(row.id)} variant="danger">
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('actions.cancel')}
                            </DropdownMenuItem>
                        </>
                    )}

                    {/* CASE C: OPENED/DELIVERED/NOTIFIED (Success Flow) */}
                    {(row.status === 'OPENED' || row.status === 'DELIVERED' || row.status === 'NOTIFIED') && (
                        <>
                            <DropdownMenuItem onClick={() => handlePreview(row.id)} className="font-medium">
                                <Eye className="w-4 h-4 mr-2" />
                                {t('actions.preview')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResend(row)}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                {t('actions.resend')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResendCode(row)}>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                {t('history.actions.resendCode')}
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenu>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('history.title')}</h1>
                    <p className="text-muted-foreground">{t('history.subtitle')}</p>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder={t('history.searchPlaceholder')}
                        className="pl-9 w-full border rounded-md px-3 py-2 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <DataTable
                data={results}
                columns={columns}
                rowClassName={(row: Result) => row.status === 'FAILED' ? 'bg-red-50 hover:bg-red-100' : ''}
            />

            <FixContactModal
                open={fixModalOpen}
                onClose={() => setFixModalOpen(false)}
                result={selectedResult}
                onSuccess={fetchResults}
            />
        </div >
    );
}
