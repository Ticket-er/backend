import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting full seed...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  const [admin, organizer, user1, user2] = await Promise.all([
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
    Array.from({ length: 3 }).map((_, i) =>
      prisma.event.create({
        data: {
          name: `Music Festival ${i + 1}`,
          price: 2000 + i * 1000,
          maxTickets: 50,
          description:
            'Join us for the biggest music festival of the summer featuring top artists from around the world. Experience three days of non-stop music, food, and fun in the heart of Central Park.',
          location: 'Central Park, New York, NY',
          date: new Date(`2025-08-${10 + i}T20:00:00Z`),
          organizerId: organizer.id,
        },
      }),
    ),
  );

  console.log('🎉 Created multiple events');

  for (const [i, event] of events.entries()) {
    for (let j = 0; j < event.maxTickets; j++) {
      const buyer = j % 2 === 0 ? user1 : user2;

      // Get fresh event data to check minted count
      const updatedEvent = await prisma.event.findUnique({
        where: { id: event.id },
      });

      if (!updatedEvent || updatedEvent.minted >= updatedEvent.maxTickets) {
        console.warn(`❌ Max tickets minted for event: ${event.name}`);
        break;
      }

      // Mint ticket
      const ticket = await prisma.ticket.create({
        data: {
          code: `EVT${i + 1}_TKT${j + 1}`,
          userId: buyer.id,
          eventId: event.id,
        },
      });

      // Update minted count
      await prisma.event.update({
        where: { id: event.id },
        data: { minted: { increment: 1 } },
      });

      // Create primary purchase transaction
      await prisma.transaction.create({
        data: {
          reference: `txn_evt${i + 1}_${j + 1}`,
          userId: buyer.id,
          eventId: event.id,
          type: 'PURCHASE',
          amount: event.price,
          status: 'SUCCESS',
          tickets: {
            create: [{ ticketId: ticket.id }],
          },
        },
      });

      // Only list ticket (no resale transaction or owner change)
      if (j % 10 === 0) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            isListed: true,
            resalePrice: event.price + 500,
            listedAt: new Date(),
            resaleCommission: Math.floor((event.price + 500) * 0.05),
          },
        });
      }
    }

    console.log(`🎟️ Minted and listed tickets for Event: ${event.name}`);
  }

  console.log('🌱 Full seed complete!');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
