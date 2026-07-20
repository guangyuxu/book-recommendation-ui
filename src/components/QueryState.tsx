import { Loader2 } from "lucide-react";
import { apiErrorMessage } from "@/lib/format";

// Uniform loading / error gate for query-backed panels.
export function QueryState({
  isLoading,
  error,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="py-6 text-sm text-destructive">{apiErrorMessage(error)}</p>
    );
  }
  return <>{children}</>;
}
