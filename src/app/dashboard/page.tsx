"use client";

import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { HeroBand, StatStrip } from "@/components/dashboard/hero-band";
import { BrandStrip } from "@/components/dashboard/brand-strip";
import { ProcessingCard } from "@/components/dashboard/processing-card";
import { ResultsSection } from "@/components/dashboard/results-section";
import { UploadHero } from "@/components/dashboard/upload-hero";

export default function DashboardHome() {
  const { jobs } = useDashboard();

  const activeJob = jobs.find((j) => j.stage !== "ready" && j.stage !== "failed");
  const latestReady = jobs.find((j) => j.stage === "ready");
  const isZeroState = jobs.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <HeroBand />

      {isZeroState ? (
        <>
          {/* The one thing you came here to do, before the proof that other
              people did it too. */}
          <UploadHero />
          <BrandStrip />
        </>
      ) : (
        <>
          {/* Counters first, at the client's call. */}
          <StatStrip />
          {activeJob ? <ProcessingCard job={activeJob} /> : <UploadHero compact />}
          {latestReady && !activeJob && <ResultsSection job={latestReady} />}
          {latestReady && activeJob && (
            <ResultsSection job={latestReady} title="Your previous micro-ads" />
          )}
        </>
      )}
    </div>
  );
}
