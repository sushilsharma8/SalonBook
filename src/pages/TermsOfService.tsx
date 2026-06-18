export default function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
      <h1 className="text-3xl md:text-4xl font-bold text-stone-900 font-display tracking-tight mb-2">
        Terms of Service
      </h1>
      <p className="text-sm text-stone-500 mb-10">Last updated: June 2026</p>

      <div className="prose prose-stone max-w-none space-y-8 text-stone-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-stone-900 font-display mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using SalonBook ("the Platform"), you agree to be bound by these Terms of
            Service. If you do not agree to these terms, please do not use the Platform. SalonBook reserves
            the right to update these terms at any time; continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 font-display mb-3">2. Use of the Platform</h2>
          <p>
            SalonBook provides an online marketplace that connects customers with salon and wellness service
            providers in India. You may use the Platform only for lawful purposes and in accordance with
            these Terms. You agree not to use the Platform in any way that violates applicable local,
            national, or international law or regulation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 font-display mb-3">3. Account Registration</h2>
          <p>
            To access certain features you must register for an account. You agree to provide accurate,
            current, and complete information and to keep your account credentials secure. You are
            responsible for all activity that occurs under your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 font-display mb-3">4. Bookings and Payments</h2>
          <p>
            SalonBook facilitates appointment bookings between customers and salons. All payments for
            services are made directly at the salon ("Pay at the shop"). SalonBook does not process or
            hold any payments on behalf of salons or customers unless explicitly stated otherwise.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 font-display mb-3">5. Limitation of Liability</h2>
          <p>
            SalonBook is not responsible for the quality of services provided by any salon listed on the
            Platform. We act solely as an intermediary. To the fullest extent permitted by law, SalonBook
            shall not be liable for any indirect, incidental, or consequential damages arising from your
            use of the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 font-display mb-3">6. Contact</h2>
          <p>
            If you have any questions about these Terms, please contact us at{' '}
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
