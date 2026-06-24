import { redirect } from "next/navigation";

export default function ValidateRedirectPage({
  params,
}: {
  params: { id: string; reviewId: string };
}) {
  redirect(`/projects/${params.id}/reviews/${params.reviewId}?tab=validate`);
}
