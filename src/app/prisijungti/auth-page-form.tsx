"use client";

import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui";

export function AuthPageForm({ tab, next, provider = false }: { tab: "login" | "register"; next: string | null; provider?: boolean }) {
  const router = useRouter();
  return (
    <Card>
      <AuthForm
        initialTab={tab}
        providerIntent={provider}
        onSuccess={(user) => {
          const target = next ?? (provider ? "/paskyra/teikejas" : user.mode === "provider" ? "/darbai-salia" : "/");
          router.replace(target);
          router.refresh();
        }}
      />
    </Card>
  );
}
