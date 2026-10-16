export const metadata = {
  title: 'Privacy Policy - Stewards App',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <article className="prose prose-sm max-w-none dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p>Last updated: 2026-10-12</p>
        <p>
          Stewards App (&quot;we&quot;, &quot;us&quot;) is a personal project. We care about your privacy. This policy explains what we
          collect, why, how we use it, and your choices.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account information</strong>: email address, name, and phone number if you provide it when signing
            up or updating your profile.
          </li>
          <li>
            <strong>Contacts</strong>: names and emails/phones you add (friends). Other users may see limited
            information needed to track shared expenses.
          </li>
          <li>
            <strong>Expense data</strong>: amounts, currencies, exchange rates, who paid, splits, notes, groups, and
            timestamps to compute balances.
          </li>
          <li>
            <strong>Reminders and activity</strong>: when reminders are sent or marked read.
          </li>
          <li>
            <strong>Technical data</strong>: IP address, browser/user agent, and basic server logs. This helps keep the
            service secure.
          </li>
          <li>
            <strong>Cookies</strong>: authentication cookies/session tokens needed to sign you in.
          </li>
        </ul>

        <h2>Why we collect it</h2>
        <ul>
          <li>To let you sign in and access your data.</li>
          <li>To track shared expenses and calculate who owes whom.</li>
          <li>To let you settle up and send reminders you choose to send.</li>
          <li>To maintain security, prevent abuse, and keep the service working.</li>
        </ul>

        <h2>Who we share it with</h2>
        <ul>
          <li>
            <strong>Service providers</strong>: Supabase (authentication and database hosting). Vercel (hosting the app).
            These providers process data only to run the service under their terms.
          </li>
          <li>
            <strong>Other users</strong>: people in shared groups or expense splits see what is needed to understand
            balances (names, amounts, splits). What others see is limited to what is necessary for the shared expense.
          </li>
          <li>
            <strong>Legal</strong>: only if required by law, court order, or to protect safety.
          </li>
        </ul>
        <p>We do not sell, rent, or trade your personal information for advertising.</p>

        <h2>Data retention</h2>
        <p>
          We keep your data while your account is active. When you delete something, we may soft-delete it for safety or
          record-keeping limits. We may delete or anonymize data when it is no longer needed to provide the service,
          unless law requires us to keep it longer.
        </p>

        <h2>Your choices</h2>
        <ul>
          <li>You can update or remove some information in the app where available.</li>
          <li>You can ask us to delete your account or export your data at support@stewards.app.</li>
          <li>You can block or delete cookies in your browser, but doing so may stop you from signing in.</li>
        </ul>

        <h2>Security</h2>
        <p>We use reasonable safeguards to protect your data, but no system is completely secure.</p>

        <h2>Children</h2>
        <p>This service is not meant for children under 13. If you believe a child under 13 provided information, email support@stewards.app and we will remove it.</p>

        <h2>Changes</h2>
        <p>We may update this policy. Changes take effect when posted here with the updated date.</p>

        <h2>Contact</h2>
        <p>
          Questions: <a href="mailto:support@stewards.app">support@stewards.app</a>
        </p>
      </article>
    </div>
  );
}
