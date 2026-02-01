/**
 * Mini OCR - PDF Text Extractor
 * Extracts patient information from PDF files using pdf.js
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface ExtractedData {
    patientFirstName?: string;
    patientLastName?: string;
    patientPhone?: string;
    folderRef?: string;
    prescriberName?: string;  // Médecin prescripteur (for BI Dashboard)
    rawText?: string;
    confidence: 'high' | 'medium' | 'low' | 'none';
}

/**
 * Extract text from a PDF file
 */
async function extractTextFromPdf(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    // Extract text from first 3 pages (usually enough for patient info)
    const pagesToScan = Math.min(pdf.numPages, 3);

    for (let i = 1; i <= pagesToScan; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
        fullText += pageText + '\n';
    }

    return fullText;
}

/**
 * Detect Cameroonian phone numbers
 * Formats: +237 6XXXXXXXX, 6XXXXXXXX, 237 6XXXXXXXX
 */
function detectPhone(text: string): string | undefined {
    // Patterns for Cameroonian numbers
    const patterns = [
        /\+237\s?([6][5-9]\d{7})/,           // +237 6XXXXXXXX
        /237\s?([6][5-9]\d{7})/,              // 237 6XXXXXXXX
        /\b([6][5-9]\d{7})\b/,                // 6XXXXXXXX (9 digits starting with 65-69)
        /\+237\s?(\d{3})\s?(\d{2})\s?(\d{2})\s?(\d{2})/, // +237 XXX XX XX XX
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            // Normalize to +237XXXXXXXXX format
            let phone = match[0].replace(/\s/g, '');
            if (!phone.startsWith('+')) {
                if (phone.startsWith('237')) {
                    phone = '+' + phone;
                } else {
                    phone = '+237' + phone;
                }
            }
            // Ensure it's valid length
            if (phone.length === 13) {
                return phone;
            }
        }
    }

    return undefined;
}

/**
 * Detect patient name from text
 * Looks for patterns like "Patient: ...", "Nom: ...", "M./Mme ..."
 */
function detectPatientName(text: string): { firstName?: string; lastName?: string } {
    const result: { firstName?: string; lastName?: string } = {};

    // Common patterns in medical documents
    const patterns = [
        // "Patient: Prénom Nom" or "Patient: Nom Prénom"
        /(?:Patient|Patiente?)\s*[:\-]\s*([A-ZÀ-Ÿ][a-zà-ÿ]+)\s+([A-ZÀ-Ÿ][a-zà-ÿ]+)/i,
        // "Nom: XXX" followed by "Prénom: XXX"
        /Nom\s*[:\-]\s*([A-ZÀ-Ÿ]{2,})/i,
        // "M./Mme LASTNAME Firstname"
        /(?:M\.|Mme|Mr|Mrs)\s+([A-ZÀ-Ÿ]{2,})\s+([A-ZÀ-Ÿ][a-zà-ÿ]+)/i,
        // "NOM Prénom" (all caps last name)
        /\b([A-ZÀ-Ÿ]{3,})\s+([A-ZÀ-Ÿ][a-zà-ÿ]{2,})\b/,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            if (match[2]) {
                // Pattern with both first and last name
                result.lastName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
                result.firstName = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
            } else if (match[1]) {
                // Only last name found
                result.lastName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
            }
            if (result.lastName) break;
        }
    }

    // Try to find first name separately if not found
    if (result.lastName && !result.firstName) {
        const firstNameMatch = text.match(/Pr[ée]nom\s*[:\-]\s*([A-ZÀ-Ÿ][a-zà-ÿ]+)/i);
        if (firstNameMatch) {
            result.firstName = firstNameMatch[1];
        }
    }

    return result;
}

/**
 * Detect folder/dossier reference
 * Looks for patterns like "DOS-XXXX", "REF-XXXX", "N° XXXX"
 */
function detectFolderRef(text: string): string | undefined {
    const patterns = [
        // DOS-2024-001, REF-123456
        /\b(DOS|REF|DOSSIER|N°)\s*[-:]?\s*([A-Z0-9\-]{4,})/i,
        // Numéro de dossier: XXXXX
        /(?:Num[ée]ro|N[°o])\s*(?:de\s*)?(?:dossier|ref)\s*[:\-]\s*([A-Z0-9\-]{4,})/i,
        // ID Patient: XXXXX
        /ID\s*(?:Patient|Dossier)\s*[:\-]\s*([A-Z0-9\-]{4,})/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const ref = match[2] || match[1];
            if (ref && ref.length >= 4) {
                return ref.toUpperCase();
            }
        }
    }

    return undefined;
}

/**
 * Detect prescriber/doctor name from text
 * Looks for patterns like "Prescrit par:", "Dr.", "Docteur", "Médecin"
 */
function detectPrescriber(text: string): string | undefined {
    const patterns = [
        // "Prescrit par: Dr. LASTNAME Firstname" or "Prescrit par Dr. XXX"
        /Prescrit\s+par\s*[:\-]?\s*(?:Dr\.?|Docteur)?\s*([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)/i,
        // "Médecin Prescripteur: Dr. XXX"
        /M[ée]decin\s+(?:Prescripteur|Traitant)\s*[:\-]?\s*(?:Dr\.?|Docteur)?\s*([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)/i,
        // "Ordonnance du Dr. LASTNAME"
        /Ordonnance\s+(?:du|de)\s+(?:Dr\.?|Docteur)\s*([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)/i,
        // "Dr. LASTNAME Firstname" (standalone)
        /\bDr\.?\s+([A-ZÀ-Ÿ]{2,}(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)?)/,
        // "Docteur LASTNAME"
        /\bDocteur\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)/i,
        // "Référé par: XXX"
        /R[ée]f[ée]r[ée]\s+par\s*[:\-]?\s*(?:Dr\.?|Docteur)?\s*([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            // Clean up and format the name
            const name = match[1].trim();
            // Skip if it looks like a patient name (already captured elsewhere)
            if (name.length >= 3 && name.length <= 50) {
                // Normalize: "Dr. LASTNAME" format
                return `Dr. ${name}`;
            }
        }
    }

    return undefined;
}

/**
 * Calculate confidence level based on extracted data
 */
function calculateConfidence(data: Partial<ExtractedData>): 'high' | 'medium' | 'low' | 'none' {
    let score = 0;

    if (data.patientPhone) score += 2;
    if (data.patientLastName) score += 2;
    if (data.patientFirstName) score += 1;
    if (data.prescriberName) score += 1;
    if (data.folderRef) score += 1;

    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    if (score >= 1) return 'low';
    return 'none';
}

/**
 * Main function: Extract patient data from PDF file
 */
export async function extractPdfData(file: File): Promise<ExtractedData> {
    try {
        // Only process PDF files
        if (!file.type.includes('pdf')) {
            return { confidence: 'none' };
        }

        const rawText = await extractTextFromPdf(file);

        // Extract individual fields
        const phone = detectPhone(rawText);
        const name = detectPatientName(rawText);
        const folderRef = detectFolderRef(rawText);
        const prescriberName = detectPrescriber(rawText);

        const extracted: ExtractedData = {
            patientPhone: phone,
            patientFirstName: name.firstName,
            patientLastName: name.lastName,
            folderRef: folderRef,
            prescriberName: prescriberName,
            rawText: rawText.substring(0, 500), // Keep first 500 chars for debugging
            confidence: 'none',
        };

        extracted.confidence = calculateConfidence(extracted);

        console.log('[PDF Extractor] Extracted data:', {
            phone: extracted.patientPhone,
            firstName: extracted.patientFirstName,
            lastName: extracted.patientLastName,
            folderRef: extracted.folderRef,
            prescriberName: extracted.prescriberName,
            confidence: extracted.confidence,
        });

        return extracted;

    } catch (error) {
        console.error('[PDF Extractor] Error:', error);
        return { confidence: 'none' };
    }
}
