import type { PrismaClient } from "../client-gen";
import { addHours, subHours, subMinutes } from "date-fns";

const CONTACT_NAMES = [
  "Priya Nair",
  "Rohan Mehta",
  "Ananya Iyer",
  "Karan Malhotra",
  "Sneha Reddy",
  "Vikram Singh",
  "Ishita Kapoor",
  "Arjun Rao",
  "Divya Menon",
  "Aditya Verma",
  "Neha Joshi",
  "Rahul Bhatt",
  "Pooja Desai",
  "Siddharth Nair",
  "Kavya Pillai",
  "Manish Kumar",
];

const OPENING_MESSAGES = [
  "Hi, I saw your reel about the AI roadmap. Is it still free?",
  "Hey! How much does the course cost?",
  "Can I get the content calendar template?",
  "Is there a discount for the annual plan?",
  "Do you offer 1:1 coaching?",
  "I want to know more about your ML guide.",
];

function phoneNumberFor(index: number) {
  return `+91 9${(800000000 + index * 137).toString().slice(0, 9)}`;
}

/**
 * WhatsApp demo data focuses on the Inbox + messaging-window/tier mechanics
 * (its genuinely distinctive constraints) rather than duplicating Instagram's
 * full 90-day AutoDM funnel treatment — that would be a lot of seed time for
 * low marginal value here.
 */
export async function seedWhatsApp(prisma: PrismaClient, workspaceId: string, rng: () => number) {
  let socialAccount = await prisma.socialAccount.findFirst({
    where: { workspaceId, platform: "WHATSAPP" },
  });

  if (!socialAccount) {
    socialAccount = await prisma.socialAccount.create({
      data: {
        workspaceId,
        platform: "WHATSAPP",
        externalAccountId: "demo_wa_15550001111",
        username: "+91 98765 43210",
        displayName: "Aarav's Creator Business",
        avatarUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=aarav-whatsapp",
        status: "DEMO",
        isDemo: true,
      },
    });
  }

  await prisma.platformConnection.upsert({
    where: { socialAccountId: socialAccount.id },
    update: {},
    create: {
      socialAccountId: socialAccount.id,
      mode: "DEMO",
      scopes: [],
      messagingTier: "TIER_2",
      qualityRating: "GREEN",
      dailyMessageLimit: 1000,
      lastSyncedAt: new Date(),
      lastSyncStatus: "ok",
    },
  });

  await prisma.profile.upsert({
    where: { socialAccountId: socialAccount.id },
    update: {},
    create: {
      socialAccountId: socialAccount.id,
      followersCount: 0,
      followingCount: 0,
      mediaCount: 0,
      bio: "Official WhatsApp Business account for AI Creator Studio",
      website: "https://autodm.app/aarav",
    },
  });

  // Clean slate for idempotent re-seeding.
  await prisma.message.deleteMany({ where: { conversation: { socialAccountId: socialAccount.id } } });
  await prisma.conversation.deleteMany({ where: { socialAccountId: socialAccount.id } });
  await prisma.contact.deleteMany({ where: { workspaceId, socialAccountId: socialAccount.id } });

  const now = new Date();

  for (let i = 0; i < CONTACT_NAMES.length; i++) {
    const [firstName, lastName] = CONTACT_NAMES[i].split(" ");
    const contact = await prisma.contact.create({
      data: {
        workspaceId,
        socialAccountId: socialAccount.id,
        platformUsername: phoneNumberFor(i),
        phone: phoneNumberFor(i),
        firstName,
        lastName,
        source: "MANUAL",
      },
    });

    // Roughly two-thirds of conversations are recent (window open); the
    // rest are older than 24h (window closed, template required) — gives
    // the Inbox UI a realistic mix to demonstrate the constraint.
    const windowOpen = rng() < 0.65;
    const hoursAgo = windowOpen ? rng() * 20 : 26 + rng() * 96;
    const lastInboundAt = subHours(now, hoursAgo);
    const opening = OPENING_MESSAGES[i % OPENING_MESSAGES.length];

    const conversation = await prisma.conversation.create({
      data: {
        workspaceId,
        socialAccountId: socialAccount.id,
        contactId: contact.id,
        platform: "WHATSAPP",
        status: i % 5 === 0 ? "PENDING" : "OPEN",
        lastInboundAt,
        lastMessageAt: lastInboundAt,
      },
    });

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "INBOUND",
        senderType: "CONTACT",
        body: opening,
        sentAt: subMinutes(lastInboundAt, 2),
      },
    });

    if (windowOpen && rng() < 0.7) {
      const replyAt = addHours(lastInboundAt, 0.05);
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: "OUTBOUND",
          senderType: "BOT",
          body: "Thanks for reaching out! Here's what you're looking for — let me know if you have questions. 🙌",
          sentAt: replyAt,
        },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: replyAt },
      });
    }
  }

  return socialAccount;
}
