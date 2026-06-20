import { SkeletonKpiGrid, SkeletonOperationsPage } from "@/components/shared";

export default function WorkforceLoading() {
  return (
    <div className="space-y-4 p-4">
      <SkeletonKpiGrid count={6} />
      <SkeletonOperationsPage showFilters={false} tableRows={8} tableColumns={5} />
    </div>
  );
}
