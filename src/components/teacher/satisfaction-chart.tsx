"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

import type { RatingBucket } from "@/server/queries/teacher-dashboard";

/**
 * Brand palette from frontend/assets/js/chart-config.js. Index 0 is "Very
 * Poor"; the legacy dashboard reversed it so Excellence sits at the top.
 */
const RATING_COLORS = ["#DC2626", "#D97706", "#C8A84B", "#2E5C8E", "#1A3A5C"];

export function SatisfactionChart({
  buckets,
  totalEvaluations,
}: {
  buckets: RatingBucket[];
  totalEvaluations: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element || totalEvaluations === 0) return;

    // next/font owns the real family name, so inherit whatever the body uses.
    const family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.family = family;
    Chart.defaults.font.size = 12;
    Chart.defaults.color = "#64748b";

    const chart = new Chart(element, {
      type: "bar",
      data: {
        labels: buckets.map((bucket) => bucket.label),
        datasets: [
          {
            label: "Number of Student Evaluations",
            data: buckets.map((bucket) => bucket.count),
            backgroundColor: RATING_COLORS.slice().reverse(),
            borderRadius: 10,
            borderSkipped: false,
            barThickness: 32,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1A3A5C",
            padding: 12,
            cornerRadius: 12,
            titleFont: { size: 14, family, weight: "bold" },
            bodyFont: { size: 13, family },
            displayColors: false,
            callbacks: {
              label: (context) => {
                const value = Number(context.raw);
                const percentage =
                  totalEvaluations > 0
                    ? ((value / totalEvaluations) * 100).toFixed(1)
                    : "0";
                return `${value} students (${percentage}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: "#f1f5f9" },
            ticks: { stepSize: 1, font: { family, size: 11 } },
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { family, size: 13, weight: 600 },
              color: "#334155",
            },
          },
        },
        animation: { duration: 2000, easing: "easeOutQuart" },
      },
    });

    return () => chart.destroy();
  }, [buckets, totalEvaluations]);

  if (totalEvaluations === 0) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center px-6 text-center"
        role="status"
      >
        <svg
          className="mb-2 h-8 w-8 text-slate-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-sm text-slate-400">
          No evaluation data yet. Results will appear here once students submit their
          feedback.
        </p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label="Horizontal bar chart showing the number of student evaluations for each satisfaction rating"
    />
  );
}
