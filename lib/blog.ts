export interface BlogPost {
  slug: string;
  title: Record<string, string>;
  description: Record<string, string>;
  content: Record<string, string>;
  date: string;
  author: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "benefits-of-scanning-food-labels",
    title: {
      en: "The Hidden Benefits of Scanning Food Labels",
      fr: "Les avantages cachés de la numérisation des étiquettes alimentaires"
    },
    description: {
      en: "Discover why scanning food barcodes can dramatically improve your diet and overall health.",
      fr: "Découvrez pourquoi scanner les codes-barres des aliments peut considérablement améliorer votre alimentation et votre santé."
    },
    content: {
      en: `
# Why You Should Scan Every Food Item

In today's fast-paced world, it's easy to grab packaged foods without reading the ingredients. However, scanning barcodes with Nutrika can reveal a wealth of hidden information.

## Uncover Hidden Sugars
Many foods marketed as "healthy" contain excessive amounts of added sugars. By scanning the barcode, you can instantly see the nutritional breakdown and make better choices.

## Manage Allergies
If you or your family members have food allergies, scanning is crucial. Nutrika instantly flags potential allergens that might be hidden in long ingredient lists.

## Track Additives
Not all additives are harmful, but some are best avoided. Our app helps you understand what those complex chemical names really mean for your body.

Start scanning today and take control of what you eat!
      `,
      fr: `
# Pourquoi vous devriez scanner chaque aliment

Dans le monde trépidant d'aujourd'hui, il est facile de prendre des aliments emballés sans lire les ingrédients. Cependant, scanner les codes-barres avec Nutrika peut révéler une mine d'informations cachées.

## Découvrez les sucres cachés
De nombreux aliments commercialisés comme « sains » contiennent des quantités excessives de sucres ajoutés. En scannant le code-barres, vous pouvez voir instantanément la répartition nutritionnelle et faire de meilleurs choix.

## Gérer les allergies
Si vous ou les membres de votre famille souffrez d'allergies alimentaires, il est crucial de scanner les produits. Nutrika signale instantanément les allergènes potentiels qui pourraient être cachés dans les longues listes d'ingrédients.

## Suivre les additifs
Tous les additifs ne sont pas nocifs, mais certains sont à éviter. Notre application vous aide à comprendre ce que ces noms chimiques complexes signifient réellement pour votre corps.

Commencez à scanner dès aujourd'hui et prenez le contrôle de ce que vous mangez !
      `
    },
    date: "2024-01-15",
    author: "Nutrika Health Team"
  },
  {
    slug: "understanding-nutriscore",
    title: {
      en: "Understanding Nutri-Score: A Complete Guide",
      fr: "Comprendre le Nutri-Score : Un guide complet"
    },
    description: {
      en: "Learn how the Nutri-Score is calculated and how it helps you make healthier grocery choices.",
      fr: "Apprenez comment le Nutri-Score est calculé et comment il vous aide à faire des choix d'épicerie plus sains."
    },
    content: {
      en: `
# Cracking the Nutri-Score Code

The Nutri-Score system is designed to make healthy eating simpler. But how does it actually work?

## The Grading System
It ranks foods from A (dark green) to E (dark red). 'A' represents the most nutritionally favorable choices, while 'E' represents the least.

## What is Considered?
The score balances "negative" points (calories, saturated fat, sugars, sodium) against "positive" points (fruits, vegetables, fiber, protein).

## Using it with Nutrika
Our app doesn't just show the score; it breaks down *why* a product received its specific grade, empowering you to find better alternatives.
      `,
      fr: `
# Décoder le Nutri-Score

Le système Nutri-Score est conçu pour simplifier l'alimentation saine. Mais comment cela fonctionne-t-il réellement ?

## Le système de notation
Il classe les aliments de A (vert foncé) à E (rouge foncé). 'A' représente les choix les plus favorables sur le plan nutritionnel, tandis que 'E' représente les moins favorables.

## Qu'est-ce qui est pris en compte ?
Le score équilibre les points "négatifs" (calories, graisses saturées, sucres, sodium) avec les points "positifs" (fruits, légumes, fibres, protéines).

## L'utiliser avec Nutrika
Notre application ne se contente pas d'afficher le score ; elle explique *pourquoi* un produit a reçu sa note spécifique, vous permettant ainsi de trouver de meilleures alternatives.
      `
    },
    date: "2024-02-02",
    author: "Nutrika Nutritionists"
  }
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug);
}
