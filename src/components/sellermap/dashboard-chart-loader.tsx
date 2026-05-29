"use client";

import dynamic from "next/dynamic";

export const DashboardChartLoader = dynamic(
  () => import("./dashboard-chart").then((module) => module.DashboardChart),
  {
    ssr: false,
    loading: () => <div className="h-72 rounded-lg bg-off-white" />,
  },
);
