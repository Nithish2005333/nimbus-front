import { Link } from 'react-router-dom';

export default function Privacy() {
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
            <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] mb-4">Privacy Policy</h1>
            <p className="text-sm text-[var(--text-muted)]">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="max-w-none space-y-6 text-[var(--text-secondary)]">
            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">1. Introduction</h2>
              <p className="text-sm leading-relaxed">
                Nimbus Cloud ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our cloud storage service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">2. Zero-Knowledge Encryption</h2>
              <p className="text-sm leading-relaxed">
                Nimbus Cloud uses zero-knowledge encryption architecture. This means:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm ml-4 mt-3">
                <li>Your files are encrypted on your device before upload</li>
                <li>Encryption keys never leave your device</li>
                <li>We cannot access, read, or view your encrypted content</li>
                <li>Only you can decrypt and access your files</li>
                <li>We have zero knowledge of your file contents</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">3. Information We Collect</h2>
              <p className="text-sm leading-relaxed mb-3">
                We collect the following information:
              </p>
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Account Information</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                    <li>Name and email address</li>
                    <li>Date of birth and mobile number</li>
                    <li>Account preferences and settings</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">File Metadata</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                    <li>File names and sizes</li>
                    <li>Upload dates and modification dates</li>
                    <li>File types and extensions</li>
                    <li>Storage usage statistics</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Technical Information</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                    <li>IP address and device information</li>
                    <li>Browser type and version</li>
                    <li>Usage logs and error reports</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">4. What We Don't Collect</h2>
              <p className="text-sm leading-relaxed">
                Due to zero-knowledge encryption, we do NOT collect or have access to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm ml-4 mt-3">
                <li>File contents (encrypted before upload)</li>
                <li>Encryption keys or passwords</li>
                <li>Decrypted file data</li>
                <li>File content metadata beyond names and sizes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">5. How We Use Your Information</h2>
              <p className="text-sm leading-relaxed mb-3">
                We use collected information to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                <li>Provide and maintain the Service</li>
                <li>Process your account registration and authentication</li>
                <li>Manage your storage and file organization</li>
                <li>Improve service performance and reliability</li>
                <li>Send important service notifications</li>
                <li>Respond to support requests</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">6. Data Storage and Security</h2>
              <p className="text-sm leading-relaxed">
                Your encrypted files are stored on secure servers with industry-standard security measures:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm ml-4 mt-3">
                <li>AES-256 encryption for all stored files</li>
                <li>Secure data centers with physical security</li>
                <li>Regular security audits and updates</li>
                <li>Backup and redundancy systems</li>
                <li>Access controls and monitoring</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">7. Data Sharing and Disclosure</h2>
              <p className="text-sm leading-relaxed mb-3">
                We do NOT sell your data. We may share information only in these circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations or court orders</li>
                <li>To protect our rights and prevent fraud</li>
                <li>With service providers who assist in operations (under strict confidentiality)</li>
                <li>In case of business transfer (with notice to users)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">8. Your Rights</h2>
              <p className="text-sm leading-relaxed mb-3">
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and data</li>
                <li>Export your files at any time</li>
                <li>Opt-out of non-essential communications</li>
                <li>Request information about data processing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">9. Cookies and Tracking</h2>
              <p className="text-sm leading-relaxed">
                We use essential cookies for authentication and session management. We do not use tracking cookies or third-party analytics that compromise your privacy. You can manage cookie preferences through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">10. Data Retention</h2>
              <p className="text-sm leading-relaxed">
                We retain your account information and encrypted files as long as your account is active. Upon account deletion, we will delete your data within 30 days, except where retention is required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">11. Children's Privacy</h2>
              <p className="text-sm leading-relaxed">
                Our Service is not intended for users under 13 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">12. International Data Transfers</h2>
              <p className="text-sm leading-relaxed">
                Your data may be stored and processed in servers located outside your country. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">13. Changes to Privacy Policy</h2>
              <p className="text-sm leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the Service. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">14. Contact Us</h2>
              <p className="text-sm leading-relaxed">
                If you have questions, concerns, or requests regarding this Privacy Policy or your data, please contact us through the Settings page or support channels.
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

