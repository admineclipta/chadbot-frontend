import ResetPasswordClient from "./ResetPasswordClient"

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { h?: string }
}) {
  const token = typeof searchParams?.h === "string" ? searchParams.h : ""
  return <ResetPasswordClient token={token} />
}
