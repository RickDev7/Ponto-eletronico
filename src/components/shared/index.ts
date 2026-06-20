// ── Types ────────────────────────────────────────────────────────────────────
export type {
  SharedSize,
  SharedVariant,
  StatusTone,
  TrendDirection,
  TrendIndicator,
  WithActions,
  WithClassName,
  WithIcon,
} from "./types";

// ── Layout & content ─────────────────────────────────────────────────────────
export { PageHeader, type PageHeaderProps } from "./page-header";
export { SectionHeader, type SectionHeaderProps } from "./section-header";

// ── Surfaces ─────────────────────────────────────────────────────────────────
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
  type CardProps,
} from "./card";

export { KpiCard, type KpiCardProps } from "./kpi-card";
export { EmptyState, type EmptyStateProps } from "./empty-state";
export {
  OperationsPage,
  OperationsWorkspace,
  OperationsFilterBar,
  WorkspacePanelBar,
  WorkspaceSection,
  DataTableShell,
  DataRow,
  DataSectionLabel,
  OPERATIONS_PAGE_CLASS,
  OPERATIONS_FORM_CLASS,
  OPERATIONS_FILTER_BAR_CLASS,
  ROW_ACTION_TRIGGER_CLASS,
} from "./workspace";

// ── Feedback ─────────────────────────────────────────────────────────────────
export {
  Skeleton,
  SkeletonText,
  SkeletonBlock,
  SkeletonCard,
  SkeletonTable,
  SkeletonKpiGrid,
  SkeletonOperationsPage,
  type SkeletonProps,
  type SkeletonTextProps,
  type SkeletonBlockProps,
  type SkeletonCardProps,
  type SkeletonTableProps,
  type SkeletonKpiGridProps,
  type SkeletonOperationsPageProps,
} from "./skeleton";

export { Badge, badgeVariants, type BadgeProps, type BadgeVariant } from "./badge";
export { StatusBadge, type StatusBadgeProps } from "./status-badge";

// ── Overlays ─────────────────────────────────────────────────────────────────
export {
  ModalWrapper,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  type ModalWrapperProps,
  type ModalSize,
} from "./modal-wrapper";
