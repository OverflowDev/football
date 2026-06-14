// FPI seed script. Loads the deterministic mock players/clubs into Postgres.
// Run with: npm run prisma:seed
import { PrismaClient, Position } from "@prisma/client";
import { CLUBS, PLAYERS, getNewsForPlayer } from "../lib/mock-data";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding FPI database…");

  // Clubs
  for (const club of CLUBS) {
    await prisma.club.upsert({
      where: { id: club.id },
      update: {},
      create: {
        id: club.id,
        name: club.name,
        shortName: club.shortName,
        logo: club.logo,
        league: club.league,
        country: club.country,
      },
    });
  }
  console.log(`  ✓ ${CLUBS.length} clubs`);

  // Players + stats + a little price history + news
  for (const p of PLAYERS) {
    await prisma.player.upsert({
      where: { id: p.id },
      update: {
        currentPrice: p.currentPrice,
        previousPrice: p.previousPrice,
        priceChange24h: p.priceChange24h,
        priceChangePercent24h: p.priceChangePercent24h,
        marketCap: p.marketCap,
        formRating: p.formRating,
        rumorScore: p.rumorScore,
        injuryStatus: p.injuryStatus,
        performanceIndex: p.performanceIndex,
        contractAddress: p.contractAddress,
        tokenId: p.tokenId,
      },
      create: {
        id: p.id,
        apiFootballId: p.apiFootballId,
        name: p.name,
        slug: p.slug,
        position: p.position as Position,
        nationality: p.nationality,
        age: p.age,
        clubId: p.club.id,
        currentPrice: p.currentPrice,
        previousPrice: p.previousPrice,
        priceChange24h: p.priceChange24h,
        priceChangePercent24h: p.priceChangePercent24h,
        marketCap: p.marketCap,
        totalShares: p.totalShares,
        sharesAvailable: p.sharesAvailable,
        baseValue: p.baseValue,
        formRating: p.formRating,
        rumorScore: p.rumorScore,
        injuryStatus: p.injuryStatus,
        performanceIndex: p.performanceIndex,
        imageUrl: p.imageUrl,
        contractAddress: p.contractAddress,
        tokenId: p.tokenId,
        isActive: true,
        stats: {
          create: {
            season: p.stats.season,
            matches: p.stats.matches,
            goals: p.stats.goals,
            assists: p.stats.assists,
            minutesPlayed: p.stats.minutesPlayed,
            yellowCards: p.stats.yellowCards,
            redCards: p.stats.redCards,
            rating: p.stats.rating,
            form: p.stats.form,
          },
        },
      },
    });

    // news
    for (const n of getNewsForPlayer(p.id, 3)) {
      await prisma.newsItem.create({
        data: {
          playerId: p.id,
          headline: n.headline,
          summary: n.summary,
          source: n.source,
          url: n.url,
          sentiment: n.sentiment,
          sentimentScore: n.sentimentScore,
          priceImpact: n.priceImpact,
          publishedAt: new Date(n.publishedAt),
        },
      });
    }
  }
  console.log(`  ✓ ${PLAYERS.length} players (+ stats, news)`);

  // A demo user with a starter portfolio
  const demo = await prisma.user.upsert({
    where: { email: "demo@fpi.market" },
    update: {},
    create: {
      email: "demo@fpi.market",
      name: "Demo Trader",
      username: "demo_trader",
      image: "https://i.pravatar.cc/96?u=demo",
      virtualBalance: 6420.55,
    },
  });

  const demoHoldings = [
    { playerId: "player_1", shares: 220, averageBuyPrice: 78.4 },
    { playerId: "player_5", shares: 600, averageBuyPrice: 41.2 },
    { playerId: "player_11", shares: 410, averageBuyPrice: 33.9 },
  ];
  for (const h of demoHoldings) {
    await prisma.portfolio.upsert({
      where: { userId_playerId: { userId: demo.id, playerId: h.playerId } },
      update: {},
      create: {
        userId: demo.id,
        playerId: h.playerId,
        shares: h.shares,
        averageBuyPrice: h.averageBuyPrice,
        totalInvested: h.shares * h.averageBuyPrice,
      },
    });
  }
  console.log("  ✓ demo user + portfolio");
  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
