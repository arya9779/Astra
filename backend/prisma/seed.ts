import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sample rewards
  await prisma.reward.createMany({
    data: [
      {
        name: 'Premium Badge',
        description: 'Exclusive premium badge for your profile',
        karmaCost: 100,
        type: 'DIGITAL_GOOD',
        stock: 1000,
      },
      {
        name: 'Custom Avatar Frame',
        description: 'Unique avatar frame to stand out',
        karmaCost: 250,
        type: 'DIGITAL_GOOD',
        stock: 500,
      },
      {
        name: 'Truth Guardian NFT',
        description: 'Limited edition NFT for top contributors',
        karmaCost: 5000,
        type: 'NFT',
        stock: 100,
      },
    ],
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
