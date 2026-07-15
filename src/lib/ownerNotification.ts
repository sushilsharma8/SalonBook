type OwnerNotificationInput = {
  whatsappApiUrl?: string;
  appBaseUrl?: string;
  salonName: string;
  listedPhone?: string | null;
  claimToken?: string | null;
  bookingDateLabel: string;
  serviceNames: string[];
};

function toVenomNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return null;
}

export async function sendOwnerNotification(input: OwnerNotificationInput): Promise<void> {
  if (!input.listedPhone || !input.claimToken) return;
  const venomNumber = toVenomNumber(input.listedPhone);
  if (!venomNumber) return;

  const baseUrl = input.appBaseUrl || 'http://localhost:3000';
  const claimUrl = `${baseUrl.replace(/\/+$/, '')}/claim/${input.claimToken}`;
  const message = `Hi ${input.salonName}, a customer booked ${input.serviceNames.join(', ')} on ${input.bookingDateLabel} via SalonBook. Claim your free profile to confirm: ${claimUrl}`;

  if (!input.whatsappApiUrl) {
    console.log('[owner-notify][dry-run]', { number: venomNumber, message });
    return;
  }

  const endpoint = `${input.whatsappApiUrl.replace(/\/+$/, '')}/api/send-message`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ number: venomNumber, message }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Venom send failed (${response.status}): ${text}`);
  }
}
