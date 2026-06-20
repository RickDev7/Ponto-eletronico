import { SkeletonKpiGrid, SkeletonOperationsPage } from "@/components/shared";

export default function OperationsLoading() {
  return (
    <div className="space-y-4 p-4">
      <SkeletonKpiGrid count={7} />
      <SkeletonOperationsPage showFilters={false} tableRows={6} tableColumns={5} />
    </div>
  );
}
