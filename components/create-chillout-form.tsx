"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  title: z.string().min(1, "Name is required").max(80),
  hostName: z.string().min(1, "Your name is required").max(80),
  locationName: z.string().max(160).optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  maxPeople: z.string().optional(),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateChilloutForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "Evening ChillOut",
      hostName: defaultName,
      locationName: "Rooftop café, MG Road",
      latitude: "12.9716",
      longitude: "77.5946",
      maxPeople: "No limit",
      description: "Casual hang, bring snacks",
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const lat = values.latitude?.trim() ? Number(values.latitude) : undefined;
    const lng = values.longitude?.trim() ? Number(values.longitude) : undefined;
    if (values.latitude?.trim() && (Number.isNaN(lat) || lat! < -90 || lat! > 90)) {
      setError("Latitude must be between -90 and 90");
      return;
    }
    if (values.longitude?.trim() && (Number.isNaN(lng) || lng! < -180 || lng! > 180)) {
      setError("Longitude must be between -180 and 180");
      return;
    }
    const res = await fetch("/api/chillouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        hostName: values.hostName,
        locationName: values.locationName || undefined,
        latitude: lat,
        longitude: lng,
        maxPeople: values.maxPeople,
        description: values.description || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Unable to create ChillOut");
      return;
    }
    router.push(`/chillouts/${data.id}`);
    router.refresh();
  }

  const field = "w-full px-3.5 py-2.5 bg-white text-[14px] text-[#334155] border border-[#e2e8f0] rounded-xl hover:border-[#cbd5e1] focus:outline-none focus:border-[#f43f5e] focus:ring-1 focus:ring-[#f43f5e] transition shadow-xs";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title" className="block text-[13px] font-semibold mb-1.5">ChillOut name *</Label>
        <Input id="title" placeholder="e.g. Board Game Night" {...register("title")} className={field + " border-2 !border-[#f43f5e]"} />
        {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
      </div>
      <div>
        <Label htmlFor="hostName" className="block text-[13px] font-semibold mb-1.5">Your name *</Label>
        <Input id="hostName" placeholder="Your full or preferred name" {...register("hostName")} className={field} />
        {errors.hostName && <p className="text-xs text-red-600 mt-1">{errors.hostName.message}</p>}
      </div>
      <div>
        <Label htmlFor="locationName" className="block text-[13px] font-semibold mb-1.5">Where (optional)</Label>
        <Input id="locationName" placeholder="Location or address" {...register("locationName")} className={field} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="latitude" className="block text-[13px] font-semibold mb-1.5">Latitude</Label>
          <Input id="latitude" placeholder="12.9716" inputMode="decimal" {...register("latitude")} className={field} />
        </div>
        <div>
          <Label htmlFor="longitude" className="block text-[13px] font-semibold mb-1.5">Longitude</Label>
          <Input id="longitude" placeholder="77.5946" inputMode="decimal" {...register("longitude")} className={field} />
        </div>
      </div>
      <div>
        <Label htmlFor="maxPeople" className="block text-[13px] font-semibold mb-1.5">Max people (optional)</Label>
        <Input id="maxPeople" placeholder="No limit or number" {...register("maxPeople")} className={field} />
      </div>
      <div>
        <Label htmlFor="description" className="block text-[13px] font-semibold mb-1.5">Description (optional)</Label>
        <Textarea id="description" placeholder="Share what this chillout is about..." rows={3} {...register("description")} className={field} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="pt-2">
        <Button type="submit" disabled={isSubmitting} className="w-full py-3.5 px-6 bg-[#f43f5e] hover:bg-[#e11d48] text-white font-semibold text-[14px] rounded-xl">
          {isSubmitting ? "Creating ChillOut..." : "Create ChillOut"}
        </Button>
      </div>
    </form>
  );
}
