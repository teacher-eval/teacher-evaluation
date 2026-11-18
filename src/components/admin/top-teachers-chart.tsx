"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

import type { TeacherChartRow } from "@/server/queries/admin-reports";

/**
 * Top-5 average-rating bar chart from frontend/views/admin/reports.php.
 * Vertical bars, fixed 0–5 axis, teacher names along the bottom.
 */
export function TopTeachersChart({ teachers }: { teachers: TeacherChartRow[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element || teachers.length === 0) return;

    // next/font owns the real family name, so inherit whatever the body uses.
    const family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.family = family;
    Chart.defaults.color = "#64748b";

    const chart = new Chart(element, {
      type: "bar",
      data: {
        labels: teachers.map((teacher) => teacher.teacherName),
        datasets: [
          {
            label: "Average Rating",
            data: teachers.map((teacher) => teacher.averageRating),
            backgroundColor: "#1A3A5C",
            hoverBackgroundColor: "#22496E",
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 26,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              label: (context) => ` Average rating: ${Number(context.raw).toFixed(2)} / 5`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "#64748b",
              font: { size: 12, weight: 600 },
            },
          },
          y: {
            beginAtZero: true,
            max: 5,
            grid: { color: "#eef2f7" },
            border: { display: false },
            ticks: { stepSize: 1, color: "#94a3b8", font: { size: 11 } },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [teachers]);

  if (teachers.length === 0) {
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
          No evaluations yet — rated teachers will appear here.
        </p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label="Bar chart of the average rating for the top 5 highest rated teachers"
    />
  );
}
