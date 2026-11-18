import type { Metadata } from "next";

import { AuthFooter, AuthHeader } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Terms of Service & Data Privacy Notice" };

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-[640px] py-6">
      <div className="auth-card">
        <AuthHeader
          title="Terms of Service & Data Privacy Notice"
          subtitle="Please read carefully before creating your account"
          note="ASCB • TVET Department"
        />

        <div className="prose prose-sm prose-slate max-w-none space-y-6 text-slate-600">
          {/* ---- Terms of Service ---- */}
          <section>
            <h2 className="text-base font-bold text-navy">Terms of Service</h2>
            <p>
              By creating an account on the <strong>TVET Digital Feedback System</strong> of Andres
              Soriano Colleges of Bislig (ASCB), you agree to the following terms:
            </p>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              <li>
                <strong>Purpose.</strong> This system is designed exclusively for academic evaluation
                and feedback. You agree to use it solely for its intended purpose.
              </li>
              <li>
                <strong>Account Responsibility.</strong> You are responsible for keeping your login
                credentials confidential. Any activity under your account is your responsibility.
              </li>
              <li>
                <strong>Honest Feedback.</strong> You agree to provide fair, honest, and constructive
                evaluations. Submitting false, defamatory, or malicious feedback is prohibited.
              </li>
              <li>
                <strong>Prohibited Conduct.</strong> You shall not attempt to tamper with the system,
                impersonate others, submit duplicate evaluations, or use automated tools to interact
                with the platform.
              </li>
              <li>
                <strong>Account Suspension.</strong> ASCB reserves the right to suspend or deactivate
                any account that violates these terms without prior notice.
              </li>
              <li>
                <strong>System Availability.</strong> The system is provided &ldquo;as is.&rdquo;
                ASCB does not guarantee uninterrupted access and may perform maintenance or updates
                at any time.
              </li>
              <li>
                <strong>Amendments.</strong> These terms may be updated from time to time. Continued
                use of the system after changes constitutes acceptance of the revised terms.
              </li>
            </ol>
          </section>

          {/* ---- Data Privacy Notice (RA 10173) ---- */}
          <section>
            <h2 className="text-base font-bold text-navy">
              Data Privacy Notice
            </h2>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              In compliance with Republic Act No. 10173 — Data Privacy Act of 2012
            </p>
            <p>
              Andres Soriano Colleges of Bislig is committed to protecting your personal data in
              accordance with the <em>Data Privacy Act of 2012 (RA 10173)</em> and its Implementing
              Rules and Regulations.
            </p>

            <h3 className="mt-4 text-sm font-semibold text-slate-700">
              1. Personal Data We Collect
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>Full name, username, email address, course, and year level</li>
              <li>Evaluation responses, ratings, and comments</li>
              <li>Account activity logs (login timestamps, IP addresses) for security purposes</li>
            </ul>

            <h3 className="mt-4 text-sm font-semibold text-slate-700">
              2. Purpose of Collection
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>To create and manage your student account</li>
              <li>To facilitate the teacher evaluation process</li>
              <li>To generate aggregate evaluation reports for academic improvement</li>
              <li>To verify your identity and secure your account via two-factor authentication</li>
            </ul>

            <h3 className="mt-4 text-sm font-semibold text-slate-700">
              3. Data Storage and Security
            </h3>
            <p className="text-sm">
              Your personal data is stored on secured cloud servers with encryption at rest and in
              transit. Access is restricted to authorized personnel only. Passwords are hashed and
              cannot be viewed by administrators.
            </p>

            <h3 className="mt-4 text-sm font-semibold text-slate-700">
              4. Data Sharing
            </h3>
            <p className="text-sm">
              Your personal information is <strong>not</strong> sold, shared, or disclosed to third
              parties except when required by law or authorized government agencies.
            </p>

            <h3 className="mt-4 text-sm font-semibold text-slate-700">
              5. Confidentiality of Evaluations
            </h3>
            <p className="text-sm">
              Individual evaluation responses are treated as confidential. Only aggregate results are
              shared with faculty and administration. Your identity as an evaluator is{" "}
              <strong>never</strong> disclosed to the teacher being evaluated.
            </p>

            <h3 className="mt-4 text-sm font-semibold text-slate-700">
              6. Your Rights
            </h3>
            <p className="text-sm">Under RA 10173, you have the right to:</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>Be informed about how your data is collected and used</li>
              <li>Access your personal data held by the institution</li>
              <li>Correct inaccurate or incomplete personal information</li>
              <li>Object to the processing of your data under certain conditions</li>
              <li>Request erasure or blocking of your data, subject to legal obligations</li>
              <li>Lodge a complaint with the National Privacy Commission</li>
            </ul>

            <h3 className="mt-4 text-sm font-semibold text-slate-700">
              7. Data Retention
            </h3>
            <p className="text-sm">
              Your account and evaluation data will be retained for the duration of your enrollment
              and for a reasonable period afterward as required by institutional and regulatory
              policies. After this period, your data will be securely deleted or anonymized.
            </p>

            <h3 className="mt-4 text-sm font-semibold text-slate-700">
              8. Contact
            </h3>
            <p className="text-sm">
              For questions or concerns regarding your personal data, please contact the ASCB Data
              Protection Officer through the school administration office.
            </p>
          </section>
        </div>

        <AuthFooter />
      </div>
    </div>
  );
}
