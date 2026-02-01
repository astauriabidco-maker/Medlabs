/**
 * WhatsApp Provider Interface
 * Strategy Pattern for supporting multiple WhatsApp providers (Meta, Twilio)
 */
export interface IWhatsAppProvider {
    /**
     * Send a PDF result link to a patient
     */
    sendPdfLink(
        to: string,
        patientName: string,
        labName: string,
        documentUrl: string,
    ): Promise<{ success: boolean; messageId?: string; error?: string }>;

    /**
     * Send a test message to verify configuration
     */
    sendTestMessage(to: string): Promise<{ success: boolean; messageId?: string; error?: string }>;

    /**
     * Get provider name for logging
     */
    getProviderName(): string;
}
