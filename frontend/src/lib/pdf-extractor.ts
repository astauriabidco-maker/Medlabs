/**
 * Mini OCR - PDF Text Extractor with Tesseract.js Fallback
 * Extracts patient information from PDF files using pdf.js
 * Falls back to Tesseract.js OCR for scanned PDFs
 */

import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface ExtractedData {
    patientFirstName?: string;
    patientLastName?: string;
    patientPhone?: string;
    folderRef?: string;
    prescriberName?: string;  // Médecin prescripteur (for BI Dashboard)
    civility?: 'M' | 'Mme' | 'Mlle';  // Civilité patient
    sampleDate?: string;  // Date de prélèvement (ISO format)
    rawText?: string;
    confidence: 'high' | 'medium' | 'low' | 'none';
    ocrUsed?: boolean;  // Indicates if Tesseract OCR was used
}

// Progress callback type for UI feedback
export type OcrProgressCallback = (progress: number, status: string) => void;

// =========================================================================
// DYNAMIC OCR EXCLUSION KEYWORDS - Loaded from Super Admin configuration
// =========================================================================

interface OcrKeywordCache {
    keywords: string[];
    timestamp: number;
}

const OCR_CACHE_KEY = 'medlabs_ocr_keywords';
const OCR_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Default keywords (fallback if API unavailable)
const DEFAULT_STAFF_KEYWORDS = [
    'major', 'vice', 'chef', 'biologiste', 'directeur', 'responsable',
    'pharmacien', 'technicien', 'laborantin', 'secrétaire', 'infirmier',
    'médecin', 'agrément', 'accréditation', 'dr', 'pr'
];

/**
 * Load OCR exclusion keywords from API with localStorage cache
 * Falls back to defaults if API is unavailable
 */
async function loadOcrKeywords(): Promise<string[]> {
    try {
        // Check localStorage cache
        const cached = localStorage.getItem(OCR_CACHE_KEY);
        if (cached) {
            const cacheData: OcrKeywordCache = JSON.parse(cached);
            if (Date.now() - cacheData.timestamp < OCR_CACHE_TTL) {
                return cacheData.keywords;
            }
        }

        // Fetch from API
        const response = await fetch('/api/ocr-config/keywords');
        if (!response.ok) {
            throw new Error('API unavailable');
        }

        const data = await response.json();
        const keywords = data.map((k: { keyword: string }) => k.keyword.toLowerCase());

        // Update cache
        const cacheData: OcrKeywordCache = {
            keywords,
            timestamp: Date.now()
        };
        localStorage.setItem(OCR_CACHE_KEY, JSON.stringify(cacheData));

        return keywords;
    } catch (error) {
        console.warn('[PDF Extractor] Failed to load OCR keywords from API, using defaults');
        return DEFAULT_STAFF_KEYWORDS;
    }
}

// Pre-load keywords on module initialization
let cachedKeywords: string[] | null = null;
loadOcrKeywords().then(keywords => {
    cachedKeywords = keywords;
});

/**
 * Get OCR keywords (sync, uses pre-loaded cache)
 */
function getOcrKeywords(): string[] {
    return cachedKeywords || DEFAULT_STAFF_KEYWORDS;
}

/**
 * Extract text from a PDF file using pdf.js
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
 * Convert PDF page to image for OCR
 */
async function pdfPageToImage(file: File, pageNum: number = 1): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNum);

    // Render at 2x scale for better OCR accuracy
    const scale = 2.0;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
    } as any).promise;

    // Return as base64 data URL
    return canvas.toDataURL('image/png');
}

/**
 * Extract text from scanned PDF using Tesseract.js OCR
 */
async function extractTextWithOcr(
    file: File,
    onProgress?: OcrProgressCallback
): Promise<string> {
    let fullText = '';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pagesToScan = Math.min(pdf.numPages, 2); // OCR first 2 pages only (slow)

    for (let i = 1; i <= pagesToScan; i++) {
        if (onProgress) {
            onProgress((i - 1) / pagesToScan * 100, `OCR page ${i}/${pagesToScan}...`);
        }

        const imageData = await pdfPageToImage(file, i);

        const result = await Tesseract.recognize(
            imageData,
            'fra+eng', // French + English
            {
                logger: (m) => {
                    if (m.status === 'recognizing text' && onProgress) {
                        const pageProgress = (i - 1) / pagesToScan * 100;
                        const stepProgress = (m.progress || 0) * 100 / pagesToScan;
                        onProgress(pageProgress + stepProgress, `Analyse page ${i}...`);
                    }
                }
            }
        );

        fullText += result.data.text + '\n';
    }

    if (onProgress) {
        onProgress(100, 'Terminé');
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
 * Extract only the patient section from text, excluding header/laboratory section
 * The header typically contains: Laboratory name, Biologist names, Address, Accreditation
 * The patient section typically starts with: "Patient:", "Nom du patient", etc.
 */
function extractPatientSection(text: string): string {
    // Try to find explicit patient section markers
    const patientSectionMarkers = [
        /(?:PATIENT|Patient|PATIENTE?)\s*[:\-]/i,
        /(?:Informations?\s+patient|Renseignements?\s+patient)/i,
        /(?:Identité\s+du\s+patient)/i,
        /(?:Nom\s+du\s+patient)/i,
        /(?:Identification\s+patient)/i,
    ];

    for (const marker of patientSectionMarkers) {
        const match = text.match(marker);
        if (match && match.index !== undefined) {
            // Return text starting from patient section
            return text.substring(match.index);
        }
    }

    // If no explicit marker, try to find the end of header section
    // Header typically ends before patient info and contains these keywords
    const headerEndMarkers = [
        /(?:Biologiste|Directeur|Responsable|Pharmacien|Docteur)\s*[:\-]?\s*(?:Dr\.?|Pr\.?)?\s*[A-ZÀ-Ÿ][a-zà-ÿ]+\s+[A-ZÀ-Ÿ][a-zà-ÿ]+/gi,
        /(?:Agrément|Accréditation|N°\s*Agrément)/gi,  // FIXED: added global flag for matchAll
        /(?:Tél|Tel|Fax)\s*[:\-]?\s*[\d\s\+\-\.]+/gi,
    ];

    let headerEndIndex = 0;
    for (const marker of headerEndMarkers) {
        const matches = [...text.matchAll(marker)];
        if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            if (lastMatch.index !== undefined) {
                const potentialEnd = lastMatch.index + lastMatch[0].length;
                if (potentialEnd > headerEndIndex && potentialEnd < text.length / 2) {
                    headerEndIndex = potentialEnd;
                }
            }
        }
    }

    // Return text after header section
    if (headerEndIndex > 0) {
        return text.substring(headerEndIndex);
    }

    return text;
}

/**
 * Check if a name appears in a laboratory/professional context
 */
function isLaboratoryContext(text: string, name: string): boolean {
    // Check if the name appears near laboratory-related keywords
    const labKeywords = [
        'Biologiste',
        'Directeur',
        'Responsable',
        'Pharmacien',
        'Laboratoire',
        'Laboratory',
        'Agrément',
        'Accréditation',
        'Médecin biologiste',
        'Chef de service',
        'Technicien',
        'signé par',
        'validé par',
    ];

    const nameIndex = text.toLowerCase().indexOf(name.toLowerCase());
    if (nameIndex === -1) return false;

    // Check 200 characters before the name for lab context
    const contextBefore = text.substring(Math.max(0, nameIndex - 200), nameIndex).toLowerCase();

    for (const keyword of labKeywords) {
        if (contextBefore.includes(keyword.toLowerCase())) {
            return true;
        }
    }

    return false;
}

/**
 * =============================================================================
 * PATIENT NAME DETECTION
 * =============================================================================
 * 
 * This function extracts the patient name from medical laboratory PDF text.
 * 
 * CHALLENGE:
 * Laboratory PDFs often contain multiple names in the header (biologists, 
 * directors, technicians) which can be confused with the patient name.
 * 
 * SOLUTION - Priority-based detection:
 * 
 *   PRIORITY 1: "Mlle" (Mademoiselle) pattern
 *   - Very specific to patients, almost never used for laboratory staff
 *   - Staff typically use "Mme", "M.", "Dr.", "Pr."
 * 
 *   PRIORITY 2: Name near "Code Patient" marker
 *   - If found, look backwards and filter out staff role keywords
 * 
 *   PRIORITY 3: Title + Name NOT preceded by staff role keywords
 *   - Scans all "Mlle/Mme/M." patterns and excludes those near staff keywords
 * 
 *   PRIORITY 4: Explicit "Patient:" label
 * 
 *   PRIORITY 5: Separate "Nom:" and "Prénom:" fields
 * 
 * STAFF KEYWORDS TO EXCLUDE:
 * These keywords in the 80 characters before a name indicate it's staff, not patient:
 *   - Roles: major, vice major, chef de service, biologiste, directeur, responsable
 *   - Medical: pharmacien, technicien, laborantin, secrétaire, infirmier
 *   - Titles: Dr., Pr.
 *   - Context: list separators (dash before name)
 * 
 * TO EXTEND:
 * Add new staff keywords to the STAFF_ROLE_PATTERNS array below.
 * =============================================================================
 */
function detectPatientName(text: string): { firstName?: string; lastName?: string } {
    const result: { firstName?: string; lastName?: string } = {};

    // =========================================================================
    // STAFF ROLE PATTERNS - Generated from dynamic keywords
    // Keywords are loaded from Super Admin configuration with localStorage cache
    // =========================================================================
    const dynamicKeywords = getOcrKeywords();

    // Generate regex patterns from dynamic keywords
    // Match if keyword appears in the 80 chars BEFORE a name (not just at end)
    const STAFF_ROLE_PATTERNS = dynamicKeywords.map(keyword => {
        // Escape special regex characters and handle spaces in multi-word keywords
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        // Match keyword followed by optional 's', colon, dash, or whitespace
        return new RegExp(`${escaped}s?(?:\\s*[:.\\-])?`, 'i');
    });

    // Add list context pattern (names after dash in staff lists)
    STAFF_ROLE_PATTERNS.push(/\-\s*$/);

    // Staff keywords for simple string matching (used in Code Patient filtering)
    // Convert multi-word keywords to single lowercase string for includes() check
    const STAFF_KEYWORDS = dynamicKeywords.map(kw => kw.toLowerCase().replace(/\s+/g, ' '));

    // =========================================================================
    // PRIORITY 0: Look for name BEFORE "Code Patient" marker
    // In Cameroon labs format: "Mr TCHAMBA Roland\nCode Patient 2601122170"
    // The name appears ON THE LINE BEFORE or SAME LINE as Code Patient
    // Multiple patterns tried with increasing flexibility
    // =========================================================================

    // Pattern 1: Title + UPPERCASE LastName + Capitalized FirstName before Code Patient
    const codePatientPattern1 = /(?:Mr\.?|Mme\.?|Mlle\.?|M\.)\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿa-zà-ÿ]+)\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿa-zà-ÿ]+)\s*[\n\r\s]*Code\s*Patient/i;
    const match1 = text.match(codePatientPattern1);

    if (match1) {
        console.log('[PDF Extractor] Pattern 1 matched:', match1[0]);
        result.lastName = match1[1].charAt(0).toUpperCase() + match1[1].slice(1).toLowerCase();
        result.firstName = match1[2].charAt(0).toUpperCase() + match1[2].slice(1).toLowerCase();
        return result;
    }

    // Pattern 2: Just look for any name near Code Patient (within 80 chars before)
    // BUT exclude names that are preceded by staff role keywords
    const codePatientIdx = text.search(/Code\s*Patient/i);
    if (codePatientIdx > 0) {
        const textBefore = text.substring(Math.max(0, codePatientIdx - 150), codePatientIdx);
        console.log('[PDF Extractor] Text before Code Patient:', JSON.stringify(textBefore));

        // Find ALL title + name patterns in this chunk
        const namePattern = /(?:Mr\.?|Mme\.?|Mlle\.?|M\.)\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿa-zà-ÿ]+)\s+([A-ZÀ-Ÿa-zà-ÿ]+)/gi;
        const allMatches = [...textBefore.matchAll(namePattern)];

        // Filter out names that are preceded by staff keywords (Major:, Vice:, Chef:, etc.)
        const staffLabels = /(?:major|vice|chef|biologiste|directeur|responsable|technicien)\s*[:\-]/i;

        for (const nameMatch of allMatches) {
            if (nameMatch.index !== undefined) {
                // Check the 50 chars BEFORE this specific match for staff labels
                const contextBefore = textBefore.substring(Math.max(0, nameMatch.index - 50), nameMatch.index);
                const isStaffName = staffLabels.test(contextBefore);

                console.log('[PDF Extractor] Pattern 2 candidate:', nameMatch[0], '| Context:', JSON.stringify(contextBefore), '| IsStaff:', isStaffName);

                if (!isStaffName) {
                    result.lastName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
                    result.firstName = nameMatch[2].charAt(0).toUpperCase() + nameMatch[2].slice(1).toLowerCase();
                    console.log('[PDF Extractor] Pattern 2 accepted:', result);
                    return result;
                }
            }
        }
    }

    // =========================================================================
    // PRIORITY 1: Explicit "NOM DU PATIENT:" or "PATIENT:" marker
    // =========================================================================
    const nomDuPatientPattern = /(?:NOM\s+DU\s+PATIENT|NOM\s+PATIENT|PATIENT)\s*[:\-]?\s*(?:Mlle|Mme|M\.?|Mr\.?|Mrs\.?)?\s*([A-ZÀ-Ÿ][A-ZÀ-Ÿa-zà-ÿ]+)\s+([A-ZÀ-Ÿ][a-zà-ÿ]+)/i;
    const nomDuPatientMatch = text.match(nomDuPatientPattern);

    if (nomDuPatientMatch) {
        result.lastName = nomDuPatientMatch[1].charAt(0).toUpperCase() + nomDuPatientMatch[1].slice(1).toLowerCase();
        result.firstName = nomDuPatientMatch[2].charAt(0).toUpperCase() + nomDuPatientMatch[2].slice(1).toLowerCase();
        return result;
    }

    // =========================================================================
    // PRIORITY 2: "Mlle" (Mademoiselle) - Very specific, almost always patient
    // =========================================================================
    const mllePattern = /Mlle\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿa-zà-ÿ]+)\s+([A-ZÀ-Ÿ][a-zà-ÿ]+)/i;
    const mlleMatch = text.match(mllePattern);

    if (mlleMatch) {
        result.lastName = mlleMatch[1].charAt(0).toUpperCase() + mlleMatch[1].slice(1).toLowerCase();
        result.firstName = mlleMatch[2].charAt(0).toUpperCase() + mlleMatch[2].slice(1).toLowerCase();
        return result;
    }

    // =========================================================================
    // PRIORITY 3: "Code Patient" marker - Look backwards for patient name (legacy)
    // =========================================================================
    const codePatientIndex = text.search(/Code\s*Patient/i);

    if (codePatientIndex > 0) {
        const textBeforeCodePatient = text.substring(Math.max(0, codePatientIndex - 100), codePatientIndex);
        const namePattern = /(?:Mlle|Mme|M\.?|Mr|Mrs)\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿa-zà-ÿ]+)\s+([A-ZÀ-Ÿ][a-zà-ÿ]+)/gi;
        const matches = [...textBeforeCodePatient.matchAll(namePattern)];

        // Filter out staff names
        const filteredMatches = matches.filter(m => {
            const matchIndex = m.index || 0;
            const contextBefore = textBeforeCodePatient.substring(Math.max(0, matchIndex - 40), matchIndex).toLowerCase();
            return !STAFF_KEYWORDS.some(kw => contextBefore.includes(kw));
        });

        if (filteredMatches.length > 0) {
            const lastMatch = filteredMatches[filteredMatches.length - 1];
            result.lastName = lastMatch[1].charAt(0).toUpperCase() + lastMatch[1].slice(1).toLowerCase();
            result.firstName = lastMatch[2].charAt(0).toUpperCase() + lastMatch[2].slice(1).toLowerCase();
            return result;
        }
    }

    // =========================================================================
    // PRIORITY 4: Title + Name NOT preceded by staff role
    // NOTE: Added \b word boundary to prevent matching "M" from email endings like ".cm"
    // ENHANCED: Uses direct staff label regex for strict filtering
    // =========================================================================
    const titleNamePattern = /(?:^|\s)(?:Mlle|Mme|M\.|Mr\.?|Mrs\.?)\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿa-zà-ÿ]+)\s+([A-ZÀ-Ÿ][a-zà-ÿ]+)/gi;
    const allTitleMatches = [...text.matchAll(titleNamePattern)];

    // Strict staff label pattern - matches "Major :", "Vice major :", "Chef :", etc.
    const staffLabelPattern = /(?:major|vice\s*major|chef|biologiste|directeur|responsable|technicien|laborantin|secrétaire|infirmier|pharmacien)\s*[:\-]/i;

    for (const match of allTitleMatches) {
        if (match.index === undefined) continue;

        const contextBefore = text.substring(Math.max(0, match.index - 80), match.index);
        const isStaffRole = STAFF_ROLE_PATTERNS.some(pattern => pattern.test(contextBefore));
        const isStaffLabel = staffLabelPattern.test(contextBefore);

        console.log('[PDF Extractor] Pattern 4 candidate:', match[0], '| IsStaffRole:', isStaffRole, '| IsStaffLabel:', isStaffLabel);

        if (!isStaffRole && !isStaffLabel) {
            result.lastName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
            result.firstName = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
            console.log('[PDF Extractor] Pattern 4 accepted:', result);
            return result;
        }
    }

    // =========================================================================
    // PRIORITY 4: Explicit "Patient:" label
    // =========================================================================
    const explicitPatientPattern = /(?:Patient|Patiente?)\s*[:\-]\s*(?:Mlle|Mme|M\.?|Mr|Mrs)?\s*([A-ZÀ-Ÿ][a-zà-ÿ]+)\s+([A-ZÀ-Ÿ][a-zà-ÿ]+)/i;
    const explicitMatch = text.match(explicitPatientPattern);

    if (explicitMatch) {
        result.lastName = explicitMatch[1].charAt(0).toUpperCase() + explicitMatch[1].slice(1).toLowerCase();
        result.firstName = explicitMatch[2].charAt(0).toUpperCase() + explicitMatch[2].slice(1).toLowerCase();
        return result;
    }

    // =========================================================================
    // PRIORITY 5: Separate "Nom:" and "Prénom:" fields
    // =========================================================================
    const patientSection = extractPatientSection(text);

    const nomMatch = patientSection.match(/Nom\s*[:\-]\s*([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)?)/i);
    const prenomMatch = patientSection.match(/Pr[ée]nom\s*[:\-]\s*([A-ZÀ-Ÿ][a-zà-ÿ]+)/i);

    if (nomMatch) {
        result.lastName = nomMatch[1].charAt(0).toUpperCase() + nomMatch[1].slice(1).toLowerCase();
    }
    if (prenomMatch) {
        result.firstName = prenomMatch[1].charAt(0).toUpperCase() + prenomMatch[1].slice(1).toLowerCase();
    }

    // =========================================================================
    // PRIORITY 6: Name before "Né(e) le" birth date
    // =========================================================================
    if (!result.lastName) {
        const birthPattern = /([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)?)\s*,?\s*[Nn][ée]e?\s+le/i;
        const birthMatch = patientSection.match(birthPattern);
        if (birthMatch) {
            const parts = birthMatch[1].trim().split(/\s+/);
            if (parts.length >= 2) {
                result.firstName = parts[0];
                result.lastName = parts.slice(1).join(' ');
            } else {
                result.lastName = birthMatch[1];
            }
        }
    }

    return result;
}

/**
 * Detect folder/dossier reference
 * Looks for patterns like "DOS-XXXX", "REF-XXXX", "N° XXXX", "Référence : XXXXX"
 */
function detectFolderRef(text: string): string | undefined {
    const patterns = [
        // "Référence : 2601122170" (exact Cameroon format with space before colon)
        /R[ée]f[ée]rence\s*[:\-]\s*(\d{6,})/i,
        // Code Patient number (often same as reference in Cameroon)
        /Code\s*Patient\s*[:\-]?\s*(\d{6,})/i,
        // DOS-2024-001, REF-123456, DOSSIER-XXX
        /\b(DOS|REF|DOSSIER)\s*[-:]?\s*([A-Z0-9\-\/]{4,})/i,
        // N° XXXXX or N°: XXXXX
        /\bN[°o]\s*[:\-]?\s*([A-Z0-9\-\/]{4,})/i,
        // Numéro de dossier: XXXXX
        /(?:Num[ée]ro|N[°o])\s*(?:de\s*)?(?:dossier|ref|référence)\s*[:\-]?\s*([A-Z0-9\-\/]{4,})/i,
        // ID Patient: XXXXX
        /ID\s*(?:Patient|Dossier)\s*[:\-]?\s*([A-Z0-9\-\/]{4,})/i,
        // Ref: XXXXX (short form)
        /\bRef\s*[:\-]\s*([A-Z0-9\-\/]{4,})/i,
        // Standalone pattern: XXX-YYYY-NNN (common lab formats)
        /\b([A-Z]{2,4}[\-\/]\d{4}[\-\/]\d{3,6})\b/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            // Get the captured group (could be match[1] or match[2] depending on pattern)
            const ref = match[2] || match[1];
            if (ref && ref.length >= 4 && ref.length <= 30) {
                return ref.toUpperCase();
            }
        }
    }

    return undefined;
}

/**
 * Detect patient civility (M., Mme, Mlle) from text
 * Looks for civility preceding patient name
 */
function detectCivility(text: string): 'M' | 'Mme' | 'Mlle' | undefined {
    // Look for civility patterns near patient context
    const patterns = [
        // "Patient: Mlle LASTNAME" or "Patient: Mme. LASTNAME"
        /(?:Patient|Patiente?)\s*[:\-]?\s*(Mlle|Mme|M\.?)\s+[A-ZÀ-Ÿ]/i,
        // "Mlle LASTNAME Firstname" (standalone)
        /\b(Mlle)\s+[A-ZÀ-Ÿ][a-zà-ÿ]+/i,
        // "Mme LASTNAME" or "Mme. LASTNAME"
        /\b(Mme\.?)\s+[A-ZÀ-Ÿ][a-zà-ÿ]+/i,
        // "M. LASTNAME" or "Mr LASTNAME" (but not in header context)
        /(?:Patient|Nom)\s*[:\-]?\s*(M\.?|Mr\.?)\s+[A-ZÀ-Ÿ][a-zà-ÿ]+/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const civility = match[1].toLowerCase().replace('.', '');
            if (civility === 'mlle') return 'Mlle';
            if (civility === 'mme') return 'Mme';
            if (civility === 'm' || civility === 'mr') return 'M';
        }
    }

    return undefined;
}

/**
 * Detect sample/collection date from text
 * Looks for patterns like "Date de prélèvement:", "Prélevé le", etc.
 * Handles both accented and non-accented text (PDF text extraction may lose accents)
 */
function detectSampleDate(text: string): string | undefined {
    // Pre-normalize: collapse spaced-out letters from OCR (e.g., "E d i t i o n" -> "Edition")
    // This handles when PDF text extraction adds spaces between each character
    let precleanedText = text;

    // Check if text has excessive spaces (indication of spaced-out OCR)
    // Pattern: single letters separated by spaces, e.g., "E d i t i o n"
    const spacedWordPattern = /\b([A-Za-z])(?:\s+[A-Za-z]){3,}\b/;
    if (spacedWordPattern.test(text)) {
        console.log('[PDF Extractor] Detected spaced-out OCR, normalizing...');
        // Collapse single-letter sequences separated by spaces
        precleanedText = text.replace(/\b([A-Za-z])\s+(?=[A-Za-z]\s*)/g, '$1');
    }

    // Normalize text to handle accent variations (prélèvement vs PRELEVEMENT)
    const normalizedText = precleanedText
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .toLowerCase();

    const patterns = [
        // "PRELEVEMENT DU : DD-MM-YYYY" or "PRELEVEMENT DU: DD/MM/YYYY" (exact Cameroon format)
        /prelevement\s+du\s*[:\-]?\s*(\d{1,2}[/\-.\s−]\d{1,2}[/\-.\s−]\d{2,4})/i,
        // "DATE DE PRELEVEMENT: DD/MM/YYYY" (handles PRELEVEMENT without accents)
        /date\s+de\s+prelevement\s*[:\-]?\s*(\d{1,2}[/\-.\s−]\d{1,2}[/\-.\s−]\d{2,4})/i,
        // "DATE PRELEVEMENT: DD/MM/YYYY"
        /date\s+prelevement\s*[:\-]?\s*(\d{1,2}[/\-.\s−]\d{1,2}[/\-.\s−]\d{2,4})/i,
        // "PRELEVE LE DD/MM/YYYY" or "PRELEVEMENT LE DD/MM/YYYY"
        /prelev(?:e|ement)\s*(?:le|du)?\s*[:\-]?\s*(\d{1,2}[/\-.\s−]\d{1,2}[/\-.\s−]\d{2,4})/i,
        // "PRELEVEMENT: DD/MM/YYYY"
        /prelevement\s*[:\-]?\s*(\d{1,2}[/\-.\s−]\d{1,2}[/\-.\s−]\d{2,4})/i,
        // "RECUEILLI LE DD/MM/YYYY"
        /recueilli\s+le\s*[:\-]?\s*(\d{1,2}[/\-.\s−]\d{1,2}[/\-.\s−]\d{2,4})/i,
        // "DATE PREL." or "DATE PREL:" abbreviated
        /date\s+prel\.?\s*[:\-]?\s*(\d{1,2}[/\-.\s−]\d{1,2}[/\-.\s−]\d{2,4})/i,
        // "EDITION : DD − MM − YYYY" (Cameroon format - report date as fallback for sample date)
        // Note: Uses Unicode minus sign (−) which PDF extractors often produce
        /edition\s*[:\-]?\s*(\d{1,2}[/\-.\s−]+\d{1,2}[/\-.\s−]+\d{2,4})/i,
        // Generic "DATE: DD/MM/YYYY" (lower priority)
        /date\s*[:\-]\s*(\d{1,2}[/\-.\s−]\d{1,2}[/\-.\s−]\d{2,4})/i,
    ];

    for (const pattern of patterns) {
        const match = normalizedText.match(pattern);
        if (match && match[1]) {
            console.log('[PDF Extractor] Date pattern matched:', pattern.toString(), '| Raw:', match[1]);
            // Parse the date - also handle Unicode minus sign (−, U+2212)
            const dateStr = match[1]
                .replace(/\s/g, '')
                .replace(/[−–—]/g, '-')  // Replace various dash characters
                .replace(/[\-.]/g, '/');

            console.log('[PDF Extractor] Date normalized:', dateStr);
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                let day = parseInt(parts[0], 10);
                let month = parseInt(parts[1], 10);
                let year = parseInt(parts[2], 10);

                // Handle 2-digit year
                if (year < 100) {
                    year += year > 50 ? 1900 : 2000;
                }

                // Validate date
                if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
                    // Return ISO format (YYYY-MM-DD)
                    const result = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    console.log('[PDF Extractor] Date extracted:', result);
                    return result;
                }
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
 * Check if text is meaningful (not just whitespace/garbage)
 */
function isTextMeaningful(text: string): boolean {
    // Remove whitespace and check if we have at least 50 chars of content
    const cleaned = text.replace(/\s+/g, '').trim();
    if (cleaned.length < 50) return false;

    // Check for common French/English words to ensure it's real text
    const hasCommonWords = /\b(patient|nom|prénom|date|résultat|analyse|laboratoire|the|and|or)\b/i.test(text);
    return hasCommonWords || cleaned.length > 200;
}

/**
 * Main function: Extract patient data from PDF file
 * Uses pdf.js first, falls back to Tesseract.js OCR for scanned PDFs
 */
export async function extractPdfData(
    file: File,
    onProgress?: OcrProgressCallback
): Promise<ExtractedData> {
    try {
        // Only process PDF files
        if (!file.type.includes('pdf')) {
            return { confidence: 'none' };
        }

        let rawText = '';
        let ocrUsed = false;

        // Step 1: Try pdf.js text extraction first (fast)
        if (onProgress) onProgress(10, 'Extraction du texte...');
        rawText = await extractTextFromPdf(file);

        // Step 2: If no meaningful text found, use Tesseract OCR (slow)
        if (!isTextMeaningful(rawText)) {
            console.log('[PDF Extractor] No text found, switching to OCR...');
            ocrUsed = true;
            if (onProgress) onProgress(20, 'PDF scanné détecté, démarrage OCR...');
            rawText = await extractTextWithOcr(file, onProgress);
        }

        // Extract individual fields
        const phone = detectPhone(rawText);
        const name = detectPatientName(rawText);
        const folderRef = detectFolderRef(rawText);
        const prescriberName = detectPrescriber(rawText);
        const civility = detectCivility(rawText);
        const sampleDate = detectSampleDate(rawText);

        const extracted: ExtractedData = {
            patientPhone: phone,
            patientFirstName: name.firstName,
            patientLastName: name.lastName,
            folderRef: folderRef,
            prescriberName: prescriberName,
            civility: civility,
            sampleDate: sampleDate,
            rawText: rawText.substring(0, 500), // Keep first 500 chars for debugging
            confidence: 'none',
            ocrUsed: ocrUsed,
        };

        extracted.confidence = calculateConfidence(extracted);

        console.log('[PDF Extractor] Extracted data:', {
            phone: extracted.patientPhone,
            firstName: extracted.patientFirstName,
            lastName: extracted.patientLastName,
            folderRef: extracted.folderRef,
            prescriberName: extracted.prescriberName,
            civility: extracted.civility,
            sampleDate: extracted.sampleDate,
            confidence: extracted.confidence,
            ocrUsed: extracted.ocrUsed,
        });

        return extracted;

    } catch (error) {
        console.error('[PDF Extractor] Error:', error);
        return { confidence: 'none' };
    }
}
