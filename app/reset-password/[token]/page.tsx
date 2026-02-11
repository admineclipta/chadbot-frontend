import ResetPasswordClient from "./ResetPasswordClient"

export default function ResetPasswordPage({
  params,
}: {
  params: { token: string }
}) {
  return <ResetPasswordClient token={params.token} />
}

export async function generateStaticParams() {
  // Static export requires at least one path; we provide a placeholder while allowing any token at runtime.
  return [{ token: "placeholder" }]
}

// Allow navigating to arbitrary tokens beyond the placeholder during runtime (CSR fallback with static export).
export const dynamicParams = true
