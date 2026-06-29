import { BarChart3, FileDown, UploadCloud } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: UploadCloud,
    title: "Upload",
    description:
      "Drag & drop your .xlsx daily or catch-up campaign report. The parser auto-detects headers and maps every column to the database.",
  },
  {
    number: "02",
    icon: BarChart3,
    title: "Analyze",
    description:
      "The dashboard auto-populates with KPI cards, day-by-day charts, and UC comparisons. AI insights highlight risks and recommendations.",
  },
  {
    number: "03",
    icon: FileDown,
    title: "Export",
    description:
      "Generate a professional 7-section PDF report with charts and analysis in one click — ready to share with stakeholders.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        {/* Section heading */}
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            From spreadsheet to insights in{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              three steps
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            No complex setup. No manual data entry. Just upload, analyze, and
            export.
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connecting line (desktop) */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-12 hidden h-0.5 bg-gradient-to-r from-blue-200 via-cyan-200 to-blue-200 md:block"
          />

          {STEPS.map((step) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              {/* Numbered circle */}
              <div className="relative z-10 flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg">
                <step.icon className="h-7 w-7" />
                <span className="mt-1 text-xs font-bold">{step.number}</span>
              </div>

              <h3 className="mt-5 text-xl font-bold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
