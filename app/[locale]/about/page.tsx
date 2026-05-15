import { Metadata } from "next";

export const metadata: Metadata = {
    title: "About Us | Nutrika",
    description: "Learn more about Nutrika, your smart nutrition companion.",
};

export default function AboutPage() {
    return (
        <div className="flex flex-col w-full min-h-screen">
            <section className="relative overflow-hidden px-4 py-20 bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-orange-950/30">
                <div className="relative z-10 mx-auto max-w-4xl text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-6">
                        About <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orangina-300">Nutrika</span>
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 font-medium">
                        Empowering you to make healthier, more informed food choices every day.
                    </p>
                </div>
            </section>
            
            <section className="px-4 py-16">
                <div className="mx-auto max-w-3xl prose prose-lg prose-orange dark:prose-invert">
                    <h2>Our Mission</h2>
                    <p>At Nutrika, we believe that understanding what you eat shouldn't require a degree in nutrition. Our mission is to make food transparency accessible to everyone by providing instant, easy-to-understand insights into the products you consume.</p>
                    
                    <h2>Why We Built Nutrika</h2>
                    <p>Navigating the grocery store can be overwhelming. With complex ingredient lists, hidden sugars, and confusing nutritional labels, making the right choice for your health and diet goals is challenging. We built Nutrika to cut through the noise. By simply scanning a barcode, you unlock a wealth of information—from basic macros to detailed allergen alerts and comprehensive eco-scores.</p>
                    
                    <h2>What We Do</h2>
                    <ul>
                        <li><strong>Instant Scanning:</strong> Point your camera at any barcode and instantly retrieve comprehensive nutritional data.</li>
                        <li><strong>Clear Scoring:</strong> We utilize trusted, science-backed scoring systems (like Nutri-Score and Eco-Score) to help you quickly assess if a product is right for you.</li>
                        <li><strong>Personalized Alerts:</strong> Stay safe with immediate warnings for allergens and dietary restrictions tailored to your profile.</li>
                    </ul>

                    <h2>Join Us</h2>
                    <p>We're constantly evolving and improving our database to bring you the most accurate and up-to-date information possible. Join our community of health-conscious users and start taking control of your diet today.</p>
                </div>
            </section>
        </div>
    );
}
