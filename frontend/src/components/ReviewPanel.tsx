import { cn } from "@/lib/utils";
import type { StoryReview } from "@/types";

const CRITERIA_LABELS: Record<string, string> = {
  clarity: "Clarity",
  completeness: "Completeness",
  testability: "Testability",
  independence: "Independence",
  value: "Business Value",
};

const STATUS_STYLES = {
  clear: "bg-green-50 border-green-200 text-green-700",
  ambiguous: "bg-yellow-50 border-yellow-200 text-yellow-700",
  incomplete: "bg-red-50 border-red-200 text-red-700",
};

export default function ReviewPanel({ review }: { review: StoryReview }) {
  return (
    <div className="space-y-3">
      <div className={cn("rounded-lg border px-3 py-2 text-sm font-medium", STATUS_STYLES[review.overall_status])}>
        AI Review: {review.overall_status.charAt(0).toUpperCase() + review.overall_status.slice(1)}
      </div>

      <div className="space-y-2">
        {Object.entries(review.feedback).map(([key, item]) => (
          <div key={key} className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <ScoreBar score={item.score} />
            </div>
            <div>
              <span className="text-xs font-medium text-gray-600">{CRITERIA_LABELS[key] ?? key}: </span>
              <span className="text-xs text-gray-500">{item.comment}</span>
            </div>
          </div>
        ))}
      </div>

      {review.suggestions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-blue-700 mb-1">Suggestions</h5>
          <p className="text-xs text-blue-600 whitespace-pre-wrap">{review.suggestions}</p>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-lime-400", "bg-green-500"];
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={cn("w-2 h-2 rounded-sm", i <= score ? colors[score - 1] : "bg-gray-200")}
        />
      ))}
    </div>
  );
}
