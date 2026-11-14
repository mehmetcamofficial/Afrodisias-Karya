export function clerkPreviewConfigured(): boolean {
  return process.env.VERCEL_ENV === "preview"
    && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_"))
    && Boolean(process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"));
}
