import { Skeleton } from "antd";

interface FileTableSkeletonProps {
  rows?: number;
  narrow?: boolean;
}

export function FileTableSkeleton({
  rows = 6,
  narrow = false,
}: FileTableSkeletonProps) {
  return (
    <div
      className={`file-table-skeleton${narrow ? " narrow" : ""}`}
      role="status"
      aria-label="Loading documents"
      aria-live="polite"
    >
      <div className="file-table-skeleton-header" aria-hidden="true">
        <span />
        <Skeleton.Input active size="small" />
        <Skeleton.Input active size="small" />
        <Skeleton.Input active size="small" />
        <Skeleton.Input active size="small" />
        <span />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div className="file-table-skeleton-row" key={index} aria-hidden="true">
          <Skeleton.Button active size="small" shape="square" />
          <div className="file-table-skeleton-name">
            <Skeleton.Avatar active shape="square" size={34} />
            <span>
              <Skeleton.Input active size="small" />
              <Skeleton.Input active size="small" />
            </span>
          </div>
          <Skeleton.Input active size="small" />
          <Skeleton.Input active size="small" />
          <Skeleton.Input active size="small" />
          <Skeleton.Button active size="small" shape="circle" />
        </div>
      ))}
    </div>
  );
}

interface FileCardGridSkeletonProps {
  count?: number;
}

export function FileCardGridSkeleton({ count = 8 }: FileCardGridSkeletonProps) {
  return (
    <div
      className="file-card-grid file-card-grid-skeleton"
      role="status"
      aria-label="Loading documents"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div className="file-card-skeleton" key={index} aria-hidden="true">
          <div className="file-card-skeleton-top">
            <Skeleton.Avatar active shape="square" size={34} />
            <Skeleton.Button active size="small" shape="circle" />
          </div>
          <Skeleton.Input active size="small" />
          <Skeleton.Input active size="small" />
        </div>
      ))}
    </div>
  );
}

export type RouteSkeletonVariant = "content" | "workspace" | "login" | "editor";

interface RouteSkeletonProps {
  variant?: RouteSkeletonVariant;
}

function SkeletonLine({ short = false }: { short?: boolean }) {
  return <Skeleton.Input active size="small" className={short ? "short" : ""} />;
}

export function RouteSkeleton({ variant = "content" }: RouteSkeletonProps) {
  if (variant === "login") {
    return (
      <div className="route-skeleton route-skeleton-login" role="status" aria-label="Loading sign in">
        <div className="route-skeleton-login-brand" aria-hidden="true">
          <Skeleton.Avatar active shape="square" size={42} />
          <div className="route-skeleton-login-copy">
            <SkeletonLine />
            <SkeletonLine />
            <SkeletonLine short />
          </div>
        </div>
        <div className="route-skeleton-login-form" aria-hidden="true">
          <SkeletonLine short />
          <Skeleton.Input active block />
          <Skeleton.Input active block />
          <Skeleton.Button active block />
        </div>
      </div>
    );
  }

  if (variant === "editor") {
    return (
      <div className="route-skeleton route-skeleton-editor" role="status" aria-label="Loading editor">
        <div className="route-skeleton-editor-bar" aria-hidden="true">
          <Skeleton.Button active shape="circle" />
          <SkeletonLine />
          <span />
          <Skeleton.Button active />
          <Skeleton.Button active />
        </div>
        <div className="route-skeleton-editor-canvas" aria-hidden="true">
          <div className="route-skeleton-editor-page">
            <Skeleton active title paragraph={{ rows: 12 }} />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "workspace") {
    return (
      <div className="route-skeleton route-skeleton-workspace" role="status" aria-label="Loading workspace">
        <aside className="route-skeleton-sidebar" aria-hidden="true">
          <div className="route-skeleton-brand">
            <Skeleton.Avatar active shape="square" size={34} />
            <SkeletonLine />
          </div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="route-skeleton-nav-item" key={index}>
              <Skeleton.Avatar active shape="circle" size={18} />
              <SkeletonLine />
            </div>
          ))}
        </aside>
        <div className="route-skeleton-workspace-main" aria-hidden="true">
          <div className="route-skeleton-workspace-header">
            <Skeleton.Input active block />
            <Skeleton.Button active />
            <Skeleton.Button active />
          </div>
          <div className="route-skeleton-workspace-content">
            <div className="route-skeleton-heading">
              <SkeletonLine />
              <SkeletonLine short />
            </div>
            <div className="route-skeleton-quick-grid">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index}>
                  <Skeleton.Avatar active shape="square" size={34} />
                  <span>
                    <SkeletonLine />
                    <SkeletonLine short />
                  </span>
                </div>
              ))}
            </div>
            <FileTableSkeleton rows={5} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="route-skeleton route-skeleton-content" role="status" aria-label="Loading page">
      <div className="route-skeleton-content-heading" aria-hidden="true">
        <span>
          <SkeletonLine />
          <SkeletonLine short />
        </span>
        <Skeleton.Button active />
      </div>
      <div className="route-skeleton-metrics" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index}>
            <SkeletonLine short />
            <SkeletonLine />
            <SkeletonLine short />
          </div>
        ))}
      </div>
      <FileTableSkeleton rows={6} />
    </div>
  );
}
