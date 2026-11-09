declare module "@vercel/analytics/next" {
  import type { ComponentType } from "react";
  export const Analytics: ComponentType<Record<string, unknown>>;
}

declare module "@vercel/speed-insights/next" {
  import type { ComponentType } from "react";
  export const SpeedInsights: ComponentType<Record<string, unknown>>;
}
