import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms and Conditions | Nutrika",
    description: "Terms and conditions of use for Nutrika.",
};

export default function TermsPage() {
    return (
        <div className="flex flex-col w-full min-h-screen">
            <section className="relative overflow-hidden px-4 py-20 bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-orange-950/30">
                <div className="relative z-10 mx-auto max-w-4xl text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-6">
                        Terms and Conditions
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 font-medium">
                        The rules and guidelines for using our services.
                    </p>
                </div>
            </section>
            
            <section className="px-4 py-16">
                <div className="mx-auto max-w-3xl prose prose-lg prose-orange dark:prose-invert">
                    <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>
                    
                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">1. Agreement to Terms</h2>
                    <p>By accessing or using Nutrika, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you disagree with any part of the terms, then you may not access the service.</p>
                    
                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">2. Description of Service</h2>
                    <p>Nutrika is a food barcode scanner application designed to provide users with nutritional information, ingredient analysis, and health-related scores. The information provided by our application is for educational and informational purposes only.</p>
                    
                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">3. Medical Disclaimer</h2>
                    <p>The information provided by Nutrika is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition or dietary restrictions.</p>

                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">4. User Accounts</h2>
                    <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.</p>

                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">5. Intellectual Property</h2>
                    <p>The service and its original content, features, and functionality are and will remain the exclusive property of Nutrika and its licensors. The service is protected by copyright, trademark, and other laws.</p>

                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">6. Limitation of Liability</h2>
                    <p>In no event shall Nutrika, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.</p>
                    
                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">7. Changes to Terms</h2>
                    <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our service after those revisions become effective, you agree to be bound by the revised terms.</p>
                </div>
            </section>
        </div>
    );
}
