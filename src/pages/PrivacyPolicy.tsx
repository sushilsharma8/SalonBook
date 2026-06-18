export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
      <h1 className="text-3xl md:text-4xl font-bold text-stone-900 font-display tracking-tight mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-stone-500 mb-10">Last updated: June 2026</p>

      <div className="prose prose-stone max-w-none space-y-8 text-stone-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-stone-900 font-display mb-3">1. Information We Collect</h2>
          <p>
            When you register or use SalonBook, we collect personal information such as your name, email
            address, and phone number. We also collect usage data including pages visited, searches
            performed, and bookings made on the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 font-display mb-3">2. How We Use Your Information</h2>
          <p>
            We use the information we collect to operate and improve the Platform, process bookings,
            send transactional communications (e.g. booking confirmations), and provide customer support.
            We do not sell your personal data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 font-display mb-3">3. Data Sharing</h2>
          <p>
            We share your booking details with the relevant salon in order to fulfil your appointment.
            We may share data with service providers who assist us in operating the Platform (e.g. cloud
            hosting), subject to confidentiality obligations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 font-display mb-3">4. Data Security</h2>
          <p>
            We use industry-standard security measures to protect your personal data. However, no method
            of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 font-display mb-3">5. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal data held by us. To exercise
            these rights, please contact us at the email address below.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 font-display mb-3">6. Contact</h2>
          <p>
            For any privacy-related questions or requests, please reach out to us at{' '}
            <a href="mailto:supportsalonbook@gmail.com" className="text-stone-900 underline hover:no-underline">
              supportsalonbook@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
