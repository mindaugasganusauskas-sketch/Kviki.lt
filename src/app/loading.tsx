import { Spinner } from "@/components/ui";

export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-muted" role="status">
      <Spinner /> Kraunama…
    </div>
  );
}
