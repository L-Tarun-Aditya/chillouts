import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CreateChilloutForm } from "@/components/create-chillout-form";

export default async function CreatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="bg-[#fcfdfe] min-h-screen flex flex-col items-center py-8 sm:py-12 px-4 sm:px-6">
      <main className="w-full max-w-[480px] mx-auto">
        <nav aria-label="Breadcrumb" className="mb-5">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#0f172a] group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </Link>
        </nav>
        <header className="mb-6">
          <h1 className="text-[30px] sm:text-[34px] leading-tight font-display uppercase tracking-wide text-[#0f172a]">
            Create a ChillOut
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[#64748b]">
            Just a name is enough — you can share it the moment it&apos;s created.
          </p>
        </header>
        <CreateChilloutForm defaultName={user.name} />
      </main>
    </div>
  );
}
