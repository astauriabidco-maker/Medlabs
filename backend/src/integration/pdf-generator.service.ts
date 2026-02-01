import { Injectable, Logger } from '@nestjs/common';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');

interface PatientData {
    name: string;
    phone?: string;
    dateOfBirth?: string;
}

interface ResultRow {
    test: string;
    value: string;
    unit: string;
    range: string;
    isAbnormal?: boolean;
}

interface TenantInfo {
    name: string;
    address?: string;
    phone?: string;
    pdfTemplateHeader?: string;
    brandLogoUrl?: string;
}

@Injectable()
export class PdfGeneratorService {
    private readonly logger = new Logger(PdfGeneratorService.name);
    private printer: any;  // pdfmake printer instance

    constructor() {
        // Define fonts for pdfmake
        const fonts = {
            Roboto: {
                normal: 'node_modules/pdfmake/build/vfs_fonts.js',
                bold: 'node_modules/pdfmake/build/vfs_fonts.js',
                italics: 'node_modules/pdfmake/build/vfs_fonts.js',
                bolditalics: 'node_modules/pdfmake/build/vfs_fonts.js',
            },
        };
        this.printer = new PdfPrinter(fonts);
    }

    /**
     * Generate a PDF report from patient data and results
     */
    async generateReport(
        patient: PatientData,
        results: ResultRow[],
        tenant: TenantInfo,
        reportDate?: Date
    ): Promise<Buffer> {
        const date = reportDate || new Date();
        const formattedDate = new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);

        // Build table body
        const tableBody: any[][] = [
            [
                { text: 'Analyse', style: 'tableHeader' },
                { text: 'Résultat', style: 'tableHeader' },
                { text: 'Unité', style: 'tableHeader' },
                { text: 'Valeurs de référence', style: 'tableHeader' },
            ],
        ];

        for (const row of results) {
            tableBody.push([
                { text: row.test, style: row.isAbnormal ? 'abnormal' : 'normal' },
                { text: row.value, style: row.isAbnormal ? 'abnormalValue' : 'normalValue', bold: true },
                { text: row.unit, style: 'normal' },
                { text: row.range, style: 'reference' },
            ]);
        }

        const docDefinition: TDocumentDefinitions = {
            pageSize: 'A4',
            pageMargins: [40, 60, 40, 80],

            header: {
                columns: [
                    {
                        text: tenant.name.toUpperCase(),
                        style: 'header',
                        margin: [40, 20, 0, 0],
                    },
                    {
                        text: tenant.address || '',
                        style: 'subheader',
                        alignment: 'right',
                        margin: [0, 20, 40, 0],
                    },
                ],
            },

            content: [
                // Patient Info Section
                {
                    columns: [
                        {
                            width: '50%',
                            stack: [
                                { text: 'PATIENT', style: 'sectionTitle' },
                                { text: patient.name, style: 'patientName', margin: [0, 5, 0, 0] },
                                patient.dateOfBirth ? { text: `Né(e) le: ${patient.dateOfBirth}`, style: 'patientInfo' } : { text: '' },
                            ],
                        },
                        {
                            width: '50%',
                            stack: [
                                { text: 'DATE DU RAPPORT', style: 'sectionTitle', alignment: 'right' },
                                { text: formattedDate, style: 'dateValue', alignment: 'right', margin: [0, 5, 0, 0] },
                            ],
                        },
                    ],
                    margin: [0, 20, 0, 20],
                },

                // Separator
                {
                    canvas: [
                        { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#E5E7EB' }
                    ],
                    margin: [0, 0, 0, 20],
                },

                // Title
                {
                    text: 'RÉSULTATS D\'ANALYSES',
                    style: 'reportTitle',
                    margin: [0, 0, 0, 15],
                },

                // Results Table
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto', 'auto', 'auto'],
                        body: tableBody,
                    },
                    layout: {
                        hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
                        vLineWidth: () => 0,
                        hLineColor: (i: number) => i === 1 ? '#1F2937' : '#E5E7EB',
                        paddingLeft: () => 8,
                        paddingRight: () => 8,
                        paddingTop: () => 8,
                        paddingBottom: () => 8,
                    },
                },
            ],

            footer: (currentPage: number, pageCount: number) => ({
                stack: [
                    {
                        canvas: [
                            { type: 'line', x1: 40, y1: 0, x2: 555, y2: 0, lineWidth: 0.5, lineColor: '#E5E7EB' }
                        ],
                    },
                    {
                        text: 'Document généré électroniquement à partir des données transmises par le LIS. En cas de doute, consulter le biologiste.',
                        style: 'disclaimer',
                        margin: [40, 10, 40, 5],
                    },
                    {
                        columns: [
                            { text: tenant.phone || '', style: 'footerText', margin: [40, 0, 0, 0] },
                            { text: `Page ${currentPage} / ${pageCount}`, style: 'footerText', alignment: 'right', margin: [0, 0, 40, 0] },
                        ],
                    },
                ],
            }),

            styles: {
                header: {
                    fontSize: 16,
                    bold: true,
                    color: '#1F2937',
                },
                subheader: {
                    fontSize: 9,
                    color: '#6B7280',
                },
                sectionTitle: {
                    fontSize: 10,
                    bold: true,
                    color: '#6B7280',
                },
                patientName: {
                    fontSize: 14,
                    bold: true,
                    color: '#1F2937',
                },
                patientInfo: {
                    fontSize: 10,
                    color: '#4B5563',
                },
                dateValue: {
                    fontSize: 12,
                    color: '#1F2937',
                },
                reportTitle: {
                    fontSize: 14,
                    bold: true,
                    color: '#1F2937',
                },
                tableHeader: {
                    fontSize: 10,
                    bold: true,
                    color: '#1F2937',
                    fillColor: '#F3F4F6',
                },
                normal: {
                    fontSize: 10,
                    color: '#374151',
                },
                normalValue: {
                    fontSize: 10,
                    color: '#059669',
                },
                abnormal: {
                    fontSize: 10,
                    color: '#DC2626',
                },
                abnormalValue: {
                    fontSize: 10,
                    color: '#DC2626',
                    bold: true,
                },
                reference: {
                    fontSize: 9,
                    color: '#6B7280',
                },
                disclaimer: {
                    fontSize: 8,
                    color: '#9CA3AF',
                    italics: true,
                    alignment: 'center',
                },
                footerText: {
                    fontSize: 8,
                    color: '#6B7280',
                },
            },
        };

        return new Promise((resolve, reject) => {
            try {
                const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
                const chunks: Buffer[] = [];

                pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
                pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
                pdfDoc.on('error', (error: Error) => reject(error));

                pdfDoc.end();
            } catch (error) {
                this.logger.error(`PDF generation failed: ${error}`);
                reject(error);
            }
        });
    }
}
