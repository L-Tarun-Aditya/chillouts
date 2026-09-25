import { db } from "@/lib/db";

const users = [
  { email: "rory@example.com", name: "rory ivor", avatarColor: "#fce7ed" },
  { email: "elena@example.com", name: "Elena Rostova", avatarColor: "#e0e7ff" },
  { email: "marcus@example.com", name: "Marcus Vance", avatarColor: "#fef3c7" },
  { email: "maya@example.com", name: "Maya Lin", avatarColor: "#e0f2fe" },
  { email: "arjun@example.com", name: "Arjun Rao", avatarColor: "#f3e8ff" },
  { email: "priya@example.com", name: "Priya Nair", avatarColor: "#dcfce7" },
];

async function main() {
  console.log("Seeding Chillouts...");
  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, avatarColor: u.avatarColor },
      create: u,
    });
  }
  const rory = (await db.user.findUniqueOrThrow({ where: { email: "rory@example.com" } }));
  const elena = (await db.user.findUniqueOrThrow({ where: { email: "elena@example.com" } }));
  const marcus = (await db.user.findUniqueOrThrow({ where: { email: "marcus@example.com" } }));
  const maya = (await db.user.findUniqueOrThrow({ where: { email: "maya@example.com" } }));
  const arjun = (await db.user.findUniqueOrThrow({ where: { email: "arjun@example.com" } }));
  const priya = (await db.user.findUniqueOrThrow({ where: { email: "priya@example.com" } }));

  // Clean previous demo chillouts (idempotent)
  await db.locationShare.deleteMany({});
  await db.participation.deleteMany({});
  await db.chillout.deleteMany({});

  const evening = await db.chillout.create({
    data: {
      title: "Evening ChillOut",
      description: "Casual hang, bring snacks",
      hostId: rory.id,
      locationName: "Rooftop café, MG Road",
      latitude: 12.9716,
      longitude: 77.5946,
      maxPeople: null,
      status: "ACTIVE",
      inviteCode: "EVEN2026",
    },
  });

  const coffee = await db.chillout.create({
    data: {
      title: "Coffee at Third Wave",
      description: "Study session + filter coffee",
      hostId: elena.id,
      locationName: "Third Wave Coffee, Indiranagar",
      latitude: 12.9784,
      longitude: 77.6408,
      maxPeople: 8,
      status: "ACTIVE",
      inviteCode: "COFFEE26",
    },
  });

  await db.chillout.create({
    data: {
      title: "Weekend Meetup",
      description: "Cubbon Park walk",
      hostId: marcus.id,
      locationName: "Cubbon Park, Gate 2",
      latitude: 12.9763,
      longitude: 77.5929,
      status: "ACTIVE",
      inviteCode: "WEEKEND1",
    },
  });

  // Participants for Evening ChillOut: elena + marcus + maya joined, arjun blocked, priya left
  const parts = [
    { chilloutId: evening.id, userId: elena.id, status: "JOINED" },
    { chilloutId: evening.id, userId: marcus.id, status: "JOINED" },
    { chilloutId: evening.id, userId: maya.id, status: "JOINED" },
    { chilloutId: evening.id, userId: arjun.id, status: "BLOCKED" },
    { chilloutId: evening.id, userId: priya.id, status: "LEFT" },
    { chilloutId: coffee.id, userId: rory.id, status: "JOINED" },
    { chilloutId: coffee.id, userId: maya.id, status: "JOINED" },
  ];
  for (const p of parts) {
    await db.participation.create({ data: p });
  }

  // Live locations (Bengaluru-like, fictional seed only)
  await db.locationShare.createMany({
    data: [
      { chilloutId: evening.id, userId: elena.id, latitude: 12.972, longitude: 77.595, accuracy: 12, sharingEnabled: true },
      { chilloutId: evening.id, userId: marcus.id, latitude: 12.984, longitude: 77.607, accuracy: 30, sharingEnabled: true },
      { chilloutId: evening.id, userId: maya.id, latitude: 12.965, longitude: 77.588, accuracy: 25, sharingEnabled: true },
      { chilloutId: coffee.id, userId: maya.id, latitude: 12.978, longitude: 77.641, accuracy: 15, sharingEnabled: true },
    ],
  });

  console.log("Seed done:", { evening: evening.id, coffee: coffee.id });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
