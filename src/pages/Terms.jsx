import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="relative min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.3),transparent_55%)] pointer-events-none" />
      
      <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl sm:rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/90 p-6 sm:p-8 lg:p-12 backdrop-blur-xl shadow-2xl">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Link to="/register" className="inline-flex items-center gap-2 text-[var(--accent-primary)] hover:opacity-80 transition-colors text-sm">
                ← Back to Registration
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm">
                Go to Login
              </Link>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] mb-4">Terms of Service</h1>
            <p className="text-sm text-[var(--text-muted)]">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="max-w-none space-y-6 text-[var(--text-secondary)]">
            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">1. Acceptance of Terms</h2>
              <p className="text-sm leading-relaxed">
                By accessing and using Nimbus Cloud ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">2. Description of Service</h2>
              <p className="text-sm leading-relaxed">
                Nimbus Cloud provides secure cloud storage services with zero-knowledge encryption. The Service allows you to upload, store, organize, and access your files from any device with internet connectivity.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">3. User Accounts</h2>
              <p className="text-sm leading-relaxed mb-3">
                To use the Service, you must:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>Be responsible for all activities under your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">4. Data Security and Privacy</h2>
              <p className="text-sm leading-relaxed">
                We implement industry-standard security measures including AES-256 encryption. Your files are encrypted before upload, and encryption keys remain on your device. We cannot access your encrypted content. Please review our Privacy Policy for detailed information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">5. Acceptable Use</h2>
              <p className="text-sm leading-relaxed mb-3">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                <li>Upload illegal, harmful, or malicious content</li>
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit viruses or malicious code</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Interfere with or disrupt the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">6. Storage Limits</h2>
              <p className="text-sm leading-relaxed">
                Storage limits are based on your selected plan. Free tier includes 10GB. You are responsible for managing your storage usage and may upgrade your plan at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">7. Service Availability</h2>
              <p className="text-sm leading-relaxed">
                We strive to maintain high availability but do not guarantee uninterrupted service. The Service may be temporarily unavailable due to maintenance, updates, or unforeseen circumstances.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">8. Intellectual Property</h2>
              <p className="text-sm leading-relaxed">
                You retain all rights to your content. By uploading files, you grant us a limited license to store and transmit your files as necessary to provide the Service. You are responsible for ensuring you have the right to upload any content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">9. Termination</h2>
              <p className="text-sm leading-relaxed">
                You may terminate your account at any time. We reserve the right to suspend or terminate accounts that violate these Terms. Upon termination, you may lose access to your stored files, so please download important data before termination.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">10. Limitation of Liability</h2>
              <p className="text-sm leading-relaxed">
                To the maximum extent permitted by law, Nimbus Cloud shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">11. Changes to Terms</h2>
              <p className="text-sm leading-relaxed">
                We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">12. Contact Information</h2>
              <p className="text-sm leading-relaxed">
                If you have questions about these Terms, please contact us through the Settings page or support channels.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-[var(--border-color)]">
            <Link to="/register" className="btn-primary">
              Back to Registration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

