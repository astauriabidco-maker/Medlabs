
import * as React from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/ui-dashboard';
import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AuditLog {
    id: string;
    createdAt: string;
    action: string;
    description: string;
    actorId: string;
    tenant?: { name: string };
}

export function AuditLogs() {
    const { t, i18n } = useTranslation();
    const [logs, setLogs] = React.useState<AuditLog[]>([]);

    React.useEffect(() => {
        api.get('/api/audit-logs').then(res => res.json()).then(setLogs).catch(console.error);
    }, []);

    const columns = [
        {
            key: 'createdAt',
            header: t('audit.table.date'),
            render: (row: AuditLog) => new Date(row.createdAt).toLocaleString(i18n.language)
        },
        {
            key: 'action',
            header: t('audit.table.action'),
            render: (row: AuditLog) => <div className="font-mono text-xs font-bold text-slate-600">{row.action}</div>
        },
        {
            key: 'description',
            header: t('audit.table.description'),
        },
        {
            key: 'tenant',
            header: t('audit.table.context'),
            render: (row: AuditLog) => row.tenant?.name || <div className="text-slate-400 italic">{t('audit.table.platform')}</div>
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                    <Activity className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">{t('audit.title')}</h1>
                    <p className="text-muted-foreground">{t('audit.subtitle')}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <DataTable data={logs} columns={columns} />
            </div>
        </div>
    );
}
