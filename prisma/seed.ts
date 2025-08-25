/* eslint-disable prettier/prettier */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting full seed...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  const [ organizer, user1, user2] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: 'Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true,
        wallet: { create: { balance: 100_000 } },
      },
    }),
    prisma.user.upsert({
      where: { email: 'organizer@example.com' },
      update: {},
      create: {
        email: 'organizer@example.com',
        name: 'Organizer',
        password: hashedPassword,
        role: 'ORGANIZER',
        isVerified: true,
        wallet: { create: { balance: 50_000 } },
      },
    }),
    prisma.user.upsert({
      where: { email: 'user1@example.com' },
      update: {},
      create: {
        email: 'user1@example.com',
        name: 'User One',
        password: hashedPassword,
        role: 'USER',
        isVerified: true,
        wallet: { create: { balance: 30_000 } },
      },
    }),
    prisma.user.upsert({
      where: { email: 'user2@example.com' },
      update: {},
      create: {
        email: 'user2@example.com',
        name: 'User Two',
        password: hashedPassword,
        role: 'USER',
        isVerified: true,
        wallet: { create: { balance: 25_000 } },
      },
    }),
  ]);

  console.log('✅ Created base users');

const events = await Promise.all(
  Array.from({ length: 3 }).map((_, i) => {
    const eventName = `Music Festival ${i + 1}`;
    const eventSlug = `music-festival-${i + 1}`;

    return prisma.event.create({
      data: {
        name: eventName,
        category: "MUSIC",
        slug: eventSlug, // ✅ unique per event
        description:
          "Join us for the biggest music festival of the summer featuring top artists from around the world. Experience three days of non-stop music, food, and fun in the heart of Central Park.",
        location: "Central Park, New York, NY",
        date: new Date(`2025-09-${29 + i}T20:00:00Z`),
        organizerId: organizer.id,
        primaryFeeBps: 1000, // 10% platform fee
        resaleFeeBps: 500,   // 5% resale fee
        royaltyFeeBps: 200,  // 2% royalty fee
        ticketCategories: {
          create: [
            {
              name: `VVIP ${i + 1}`, // ✅ unique per event
              price: 5000 + i * 1000,
              maxTickets: 10,
              minted: 0,
            },
            {
              name: `VIP ${i + 1}`, // ✅ unique per event
              price: 3000 + i * 1000,
              maxTickets: 20,
              minted: 0,
            },
            {
              name: `Regular ${i + 1}`, // ✅ unique per event
              price: 1000 + i * 1000,
              maxTickets: 20,
              minted: 0,
            },
          ],
        },
      },
    });
  }),
);


  console.log('🎉 Created multiple events with ticket categories');

  for (const event of events) {
    const ticketCategories = await prisma.ticketCategory.findMany({
      where: { eventId: event.id },
    });

    for (const category of ticketCategories) {
      const ticketsPerCategory = Math.min(category.maxTickets, 10); // Limit to 10 tickets per category for seeding
      for (let j = 0; j < ticketsPerCategory; j++) {
        const buyer = j % 2 === 0 ? user1 : user2;

        // Get fresh category data to check minted count
        const updatedCategory = await prisma.ticketCategory.findUnique({
          where: { id: category.id },
        });

        if (
          !updatedCategory ||
          updatedCategory.minted >= updatedCategory.maxTickets
        ) {
          console.warn(
            `❌ Max tickets minted for category ${category.name} in event: ${event.name}`,
          );
          continue;
        }

        // Mint ticket
        const ticket = await prisma.ticket.create({
          data: {
            code: `EVT${event.id.slice(0, 8)}_TKT${j + 1}_${category.name}`,
            userId: buyer.id,
            eventId: event.id,
            ticketCategoryId: category.id,
          },
        });

        // Update minted count for the category
        await prisma.ticketCategory.update({
          where: { id: category.id },
          data: { minted: { increment: 1 } },
        });

        // Create primary purchase transaction
        await prisma.transaction.create({
          data: {
           reference: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            userId: buyer.id,
            eventId: event.id,
            type: 'PURCHASE',
            amount: category.price,
            status: 'SUCCESS',
            tickets: {
              create: [{ ticketId: ticket.id }],
            },
          },
        });

        // Only list ticket (no resale transaction or owner change)
        if (j % 5 === 0) {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              isListed: true,
              resalePrice: category.price + 500,
              listedAt: new Date(),
              resaleCommission: Math.floor((category.price + 500) * 0.05),
            },
          });
        }
      }

      console.log(
        `🎟️ Minted and listed tickets for Category: ${category.name} in Event: ${event.name}`,
      );
    }
  }

  console.log('🌱 Full seed complete!');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  .finally(async () => {
    await prisma.$disconnect();
  });
