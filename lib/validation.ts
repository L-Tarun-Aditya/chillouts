import { z } from "zod";

export const createChilloutSchema = z.object({
  title: z.string().min(1, "Name is required").max(80),
  hostName: z.string().min(1, "Your name is required").max(80),
  locationName: z.string().max(160).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  maxPeople: z.number().int().min(2).max(500).optional(),
  description: z.string().max(500).optional(),
});

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).optional(),
  sharingEnabled: z.boolean().optional(),
  // 'simulated' is honored only when the server permits Developer Mode for
  // this user; otherwise it is rejected. Real device posts omit it.
  source: z.enum(["real", "simulated"]).optional(),
});

export type CreateChilloutInput = z.infer<typeof createChilloutSchema>;
