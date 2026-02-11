import * as React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui-basic';

interface Column {
    key: string;
    label: string;
    format?: (value: any, row: any) => string;
}

interface ExportButtonProps {
    data: any[];
    columns: Column[];
    filename: string;
    label?: string;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'icon';
    disabled?: boolean;
}

function escapeCSV(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export function ExportCSVButton({
    data,
    columns,
    filename,
    label = 'Exporter CSV',
    variant = 'outline',
    size = 'sm',
    disabled = false,
}: ExportButtonProps) {
    const handleExport = () => {
        if (!data.length) return;

        // BOM for UTF-8 Excel compatibility
        const BOM = '\uFEFF';

        // Header row
        const header = columns.map(c => escapeCSV(c.label)).join(';');

        // Data rows
        const rows = data.map(row =>
            columns
                .map(col => {
                    const value = col.format
                        ? col.format(row[col.key], row)
                        : row[col.key];
                    return escapeCSV(value);
                })
                .join(';')
        );

        const csv = BOM + [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleExport}
            disabled={disabled || !data.length}
            title={label}
        >
            <Download className="w-4 h-4 mr-2" />
            {label}
        </Button>
    );
}
