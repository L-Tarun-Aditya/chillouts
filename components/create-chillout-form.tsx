"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, MessageCircle, QrCode, ArrowRight, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlaceSearch, type PlaceResult } from "@/components/place-search";
import { LocationPickerMap } from "@/components/location-picker-map";

const formSchema = z.object({
  title: z.string().min(1, "Name is required").max(80),
  hostName: z.string().min(1, "Your name is required").max(80),
  maxPeople: z.string().optional(),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

type CreatedChillout = {
  id: number;
  title: string;
  inviteCode: string;
};

function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function SharePanel({ chillout }: { chillout: CreatedChillout }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const joinUrl = `${appBaseUrl()}/chillouts/${chillout.id}`;
  const whatsappText = encodeURIComponent(
    `Hey! Join my ChillOut "${chillout.title}" 👉 ${joinUrl}`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

  function copyLink() {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-5">
      {/* Success header */}
      <div className="flex items-center gap-3 py-1">
        <div className="w-10 h-10 rounded-full bg-[#fee7ea] flex items-center justify-center shrink-0">
          <PartyPopper className="w-5 h-5 text-[#f43f5e]" />
        </div>
        <div>
          <h2 className="font-display text-xl uppercase tracking-wide text-[#0f172a]">
            ChillOut created!
          </h2>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Share the link so people can join.
          </p>
        </div>
      </div>

      {/* Link box */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Invite link
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <p className="text-[13px] text-slate-700 font-medium truncate">{joinUrl}</p>
          </div>
          <button
            onClick={copyLink}
            aria-label="Copy link"
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[13px] font-semibold text-slate-700 transition"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Invite code pill */}
        <p className="text-[12px] text-slate-500">
          Invite code:{" "}
          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
            {chillout.inviteCode}
          </span>
        </p>
      </div>

      {/* WhatsApp share */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl bg-[#25d366] hover:bg-[#1ebe5d] text-white font-semibold text-[14px] transition shadow-sm"
      >
        <MessageCircle className="w-4 h-4" />
        Share on WhatsApp
      </a>

      {/* QR code — optional toggle */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowQr((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-slate-50 transition"
          aria-expanded={showQr}
        >
          <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
            <QrCode className="w-4 h-4 text-slate-400" />
            Generate QR Code
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            {showQr ? "Hide" : "Show"}
          </span>
        </button>
        {showQr && (
          <div className="flex flex-col items-center gap-3 px-4 pb-5 pt-1 border-t border-slate-100">
            <QRCodeSVG
              value={joinUrl}
              size={180}
              className="rounded-lg"
            />
            <p className="text-[12px] text-slate-400 text-center">
              Scan to join &ldquo;{chillout.title}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Go to ChillOut */}
      <Button
        onClick={() => router.push(`/chillouts/${chillout.id}`)}
        className="w-full py-3.5 bg-[#f43f5e] hover:bg-[#e11d48] text-white font-semibold text-[14px] rounded-xl flex items-center justify-center gap-2"
      >
        Go to ChillOut
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function CreateChilloutForm({ defaultName }: { defaultName: string }) {
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedChillout | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      hostName: defaultName,
      maxPeople: "",
      description: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const res = await fetch("/api/chillouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        hostName: values.hostName,
        locationName: selectedPlace?.shortName || undefined,
        latitude: selectedPlace?.latitude,
        longitude: selectedPlace?.longitude,
        maxPeople: values.maxPeople,
        description: values.description || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Unable to create ChillOut");
      return;
    }
    // Show share panel instead of immediately navigating
    setCreated({ id: data.id, title: data.title, inviteCode: data.inviteCode });
  }

  const field =
    "w-full px-3.5 py-2.5 bg-white text-[14px] text-[#334155] border border-[#e2e8f0] rounded-xl hover:border-[#cbd5e1] focus:outline-none focus:border-[#f43f5e] focus:ring-1 focus:ring-[#f43f5e] transition shadow-xs";

  // Show share panel after successful creation
  if (created) {
    return <SharePanel chillout={created} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ChillOut name */}
      <div>
        <Label htmlFor="title" className="block text-[13px] font-semibold mb-1.5">
          ChillOut name *
        </Label>
        <Input
          id="title"
          placeholder="e.g. Board Game Night"
          {...register("title")}
          className={field + " border-2 !border-[#f43f5e]"}
        />
        {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
      </div>

      {/* Host name */}
      <div>
        <Label htmlFor="hostName" className="block text-[13px] font-semibold mb-1.5">
          Your name *
        </Label>
        <Input
          id="hostName"
          placeholder="Your full or preferred name"
          {...register("hostName")}
          className={field}
        />
        {errors.hostName && <p className="text-xs text-red-600 mt-1">{errors.hostName.message}</p>}
      </div>

      {/* Place search — replaces manual locationName + lat/lng fields */}
      <PlaceSearch
        fieldClassName={field}
        onSelect={(result: PlaceResult) => setSelectedPlace(result)}
        onClear={() => setSelectedPlace(null)}
      />

      {/* Map preview — appears only after a place is selected */}
      {selectedPlace && (
        <div className="rounded-xl overflow-hidden">
          <LocationPickerMap
            latitude={selectedPlace.latitude}
            longitude={selectedPlace.longitude}
            label={selectedPlace.shortName}
          />
        </div>
      )}

      {/* Max people */}
      <div>
        <Label htmlFor="maxPeople" className="block text-[13px] font-semibold mb-1.5">
          Max people (optional)
        </Label>
        <Input
          id="maxPeople"
          placeholder="No limit or a number"
          {...register("maxPeople")}
          className={field}
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" className="block text-[13px] font-semibold mb-1.5">
          Description (optional)
        </Label>
        <Textarea
          id="description"
          placeholder="Share what this chillout is about…"
          rows={3}
          {...register("description")}
          className={field}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-6 bg-[#f43f5e] hover:bg-[#e11d48] text-white font-semibold text-[14px] rounded-xl"
        >
          {isSubmitting ? "Creating ChillOut…" : "Create ChillOut"}
        </Button>
      </div>
    </form>
  );
}
