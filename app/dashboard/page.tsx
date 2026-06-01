import { DashboardPageClient } from "@/app/dashboard/DashboardPageClient"

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return <DashboardPageClient searchParams={resolvedSearchParams} />
}
