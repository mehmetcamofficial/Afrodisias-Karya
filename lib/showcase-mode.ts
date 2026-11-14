/**
 * Production is a presentation-only launch until a separate commerce release.
 * Do not use a public NEXT_PUBLIC_* switch as the security boundary.
 * The server checks VERCEL_ENV directly. Development/Preview remain unaffected.
 */
export const isProductionShowcase = () => process.env.VERCEL_ENV === "production";
