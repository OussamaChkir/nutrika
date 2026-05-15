import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy | Nutrika",
    description: "Privacy policy and data handling practices for Nutrika.",
};

export default function PrivacyPage() {
    return (
        <div className="flex flex-col w-full min-h-screen">
            <section className="relative overflow-hidden px-4 py-20 bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-orange-950/30">
                <div className="relative z-10 mx-auto max-w-4xl text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-6">
                        Privacy Policy
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 font-medium">
                        How we protect and manage your personal data.
                    </p>
                </div>
            </section>
            
            <section className="px-4 py-16">
                <div className="mx-auto max-w-3xl prose prose-lg prose-orange dark:prose-invert">
                    <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>
                    
                    <h2>1. Introduction</h2>
                    <p>Welcome to Nutrika. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and use our application.</p>
                    
                    <h2>2. Data We Collect</h2>
                    <p>We may collect, use, store, and transfer different kinds of personal data about you, which we have grouped together as follows:</p>
                    <ul>
                        <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                        <li><strong>Contact Data:</strong> includes email address.</li>
                        <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location.</li>
                        <li><strong>Usage Data:</strong> includes information about how you use our application, including scanned products and search history.</li>
                    </ul>

                    <h2>3. How We Use Your Data</h2>
                    <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                    <ul>
                        <li>To register you as a new user.</li>
                        <li>To manage our relationship with you.</li>
                        <li>To personalize your experience and deliver relevant content and product suggestions.</li>
                        <li>To improve our website, products/services, marketing, customer relationships, and experiences.</li>
                    </ul>

                    <h2>4. Data Security</h2>
                    <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed.</p>

                    <h2>5. Your Legal Rights</h2>
                    <p>Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, or restriction of processing of your personal data.</p>
                    
                    <h2>6. Contact Us</h2>
                    <p>If you have any questions about this privacy policy or our privacy practices, please contact us at support@nutrika.com.</p>
                </div>
            </section>
        </div>
    );
}
