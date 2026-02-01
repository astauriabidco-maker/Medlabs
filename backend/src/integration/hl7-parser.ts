/**
 * Lightweight HL7 ORU^R01 Parser
 * Extracts patient info and observation results from HL7 messages
 */

export interface HL7Patient {
    name: string;
    phone?: string;
    dateOfBirth?: string;
    patientId?: string;
}

export interface HL7Observation {
    test: string;
    value: string;
    unit: string;
    range: string;
    isAbnormal?: boolean;
    observationTime?: string;
}

export interface HL7ParseResult {
    patient: HL7Patient;
    observations: HL7Observation[];
    messageType: string;
    messageControlId?: string;
    sendingFacility?: string;
}

/**
 * Parse an HL7 ORU^R01 message
 * Supports standard segment delimiters (|^~\&)
 */
export function parseHL7Message(hl7Message: string): HL7ParseResult {
    const segments = hl7Message.split(/[\r\n]+/).filter(s => s.trim());

    let patient: HL7Patient = { name: '' };
    const observations: HL7Observation[] = [];
    let messageType = '';
    let messageControlId = '';
    let sendingFacility = '';

    for (const segment of segments) {
        const fields = segment.split('|');
        const segmentType = fields[0];

        switch (segmentType) {
            case 'MSH':
                // Message Header
                // MSH|^~\&|SendingApp|SendingFacility|ReceivingApp|ReceivingFacility|DateTime||MessageType|MessageControlID|ProcessingID|VersionID
                sendingFacility = fields[3] || '';
                messageType = fields[8] || '';  // e.g., "ORU^R01"
                messageControlId = fields[9] || '';
                break;

            case 'PID':
                // Patient Identification
                // PID|1||PatientID^^^AssigningAuth||PatientName^First^Middle||DOB|Sex|||Address||Phone|||...
                patient = parsePIDSegment(fields);
                break;

            case 'OBX':
                // Observation/Result
                // OBX|SetID|ValueType|ObservationID^Text^CodingSystem|SubID|Value|Units|ReferenceRange|AbnormalFlags|...
                const obs = parseOBXSegment(fields);
                if (obs) {
                    observations.push(obs);
                }
                break;
        }
    }

    return {
        patient,
        observations,
        messageType,
        messageControlId,
        sendingFacility,
    };
}

/**
 * Parse PID (Patient Identification) segment
 */
function parsePIDSegment(fields: string[]): HL7Patient {
    // PID|1||PatientID^^^Auth||LastName^FirstName^Middle||DOB|Sex|||Address||Phone
    const patientId = fields[3]?.split('^')[0] || '';

    // Parse name (field 5): LastName^FirstName^Middle^Suffix^Prefix
    const nameComponents = (fields[5] || '').split('^');
    const lastName = nameComponents[0] || '';
    const firstName = nameComponents[1] || '';
    const name = `${firstName} ${lastName}`.trim() || 'Patient Inconnu';

    // Date of birth (field 7): YYYYMMDD
    const dobRaw = fields[7] || '';
    let dateOfBirth: string | undefined;
    if (dobRaw.length >= 8) {
        const year = dobRaw.substring(0, 4);
        const month = dobRaw.substring(4, 6);
        const day = dobRaw.substring(6, 8);
        dateOfBirth = `${day}/${month}/${year}`;
    }

    // Phone number (field 13)
    // Can be in format: (XXX)XXX-XXXX or number^use^equipment
    const phoneRaw = fields[13] || '';
    const phone = phoneRaw.split('^')[0].replace(/[^\d+]/g, '') || undefined;

    return {
        name,
        phone,
        dateOfBirth,
        patientId,
    };
}

/**
 * Parse OBX (Observation/Result) segment
 */
function parseOBXSegment(fields: string[]): HL7Observation | null {
    // OBX|1|NM|TestCode^Test Name^CodingSystem|SubID|Value|Units|RefRange|AbnormalFlag|...
    const valueType = fields[2];  // NM = Numeric, ST = String, etc.

    // Test identifier (field 3): Code^Description^CodingSystem
    const testComponents = (fields[3] || '').split('^');
    const testCode = testComponents[0] || '';
    const testName = testComponents[1] || testCode;

    // Value (field 5)
    const value = fields[5] || '';

    // Skip empty observations
    if (!value.trim()) {
        return null;
    }

    // Units (field 6)
    const unit = fields[6] || '';

    // Reference range (field 7)
    const range = fields[7] || '';

    // Abnormal flag (field 8): H=High, L=Low, N=Normal, A=Abnormal, etc.
    const abnormalFlag = fields[8] || '';
    const isAbnormal = ['H', 'L', 'HH', 'LL', 'A', 'AA'].includes(abnormalFlag.toUpperCase());

    return {
        test: testName,
        value,
        unit,
        range,
        isAbnormal,
    };
}

/**
 * Validate that a message is a valid HL7 ORU message
 */
export function isValidORUMessage(hl7Message: string): boolean {
    if (!hl7Message || typeof hl7Message !== 'string') {
        return false;
    }

    // Check for MSH segment at start
    if (!hl7Message.startsWith('MSH|')) {
        return false;
    }

    // Check for ORU message type
    const segments = hl7Message.split(/[\r\n]+/);
    const mshSegment = segments.find(s => s.startsWith('MSH|'));
    if (mshSegment) {
        const fields = mshSegment.split('|');
        const messageType = fields[8] || '';
        if (messageType.includes('ORU')) {
            return true;
        }
    }

    return false;
}
