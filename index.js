require("dotenv").config();
const fs = require("fs");
const path = require("path");
const http = require('http');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const cron = require("node-cron");
const getEpicGames = require("./fetchers/epic.js");
const getSteamGames = require("./fetchers/steam.js");

const CACHE_PATH = path.join(__dirname, "cache.json");

function loadCache() {
  if (!fs.existsSync(CACHE_PATH)) {
    fs.writeFileSync(CACHE_PATH, JSON.stringify({ epic: [], steam: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function createGameMessage(game) {
  const embed = new EmbedBuilder()
    .setColor(game.source === 'Steam' ? '#1b2838' : '#0078f2')
    .setTitle(game.title)
    .setURL(game.url)
    .setImage(game.image || "https://cdn.discordapp.com/embed/avatars/0.png")
    .setFooter({ text: game.source, iconURL: game.sourceIcon });

  if (game.ends) {
    embed.setDescription(`🎮 Gratis untuk diklaim/dimainkan hingga **${game.ends}**`);
  } else {
    embed.setDescription('🎮 Klik tombol di bawah untuk mengklaim game!');
  }

  const row = new ActionRowBuilder();
  row.addComponents(
    new ButtonBuilder()
      .setLabel("Buka di Browser")
      .setStyle(ButtonStyle.Link)
      .setURL(game.url)
  );

  if (game.clientUrl) {
    const clientLabel = game.source === 'Steam' ? 'Buka di Klien Steam' : 'Buka di Epic Launcher';
    row.addComponents(
      new ButtonBuilder()
        .setLabel(clientLabel)
        .setStyle(ButtonStyle.Link)
        .setURL(game.clientUrl)
    );
  }
  
  return { embeds: [embed], components: [row] };
}


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`✅ Bot aktif sebagai ${client.user.tag}`);

  cron.schedule("0 */2 * * *", async () => {
    try {
      console.log("⏰ Menjalankan cron untuk memeriksa game gratis...");

      const channel = await client.channels.fetch(process.env.CHANNEL_ID);
      if (!channel) return console.error("❌ Channel tidak ditemukan!");

      const cache = loadCache();
      const updatedCache = { ...cache };

      const allSources = [
        { name: "epic", getGames: getEpicGames },
        { name: "steam", getGames: getSteamGames },
      ];

      for (const source of allSources) {
        const games = (await source.getGames()).filter(
          (game) => game.region === "ID"
        );

        const newGames = games.filter(
          (game) => !cache[source.name].includes(game.url)
        );
        if (newGames.length === 0) continue;

        for (const game of newGames) {
          const messagePayload = createGameMessage(game);
          await channel.send(messagePayload);
          updatedCache[source.name].push(game.url);
        }
      }

      saveCache(updatedCache);
    } catch (error) {
        console.error("❌ Terjadi kesalahan saat menjalankan cron job:", error);
    }
  });
});

async function sendGames(games, message) {
  if (games.length === 0) {
    return message.channel.send("🚫 Tidak ada game gratis yang ditemukan untuk kategori ini di region Indonesia.");
  }
  for (const game of games) {
    const messagePayload = createGameMessage(game);
    await message.channel.send(messagePayload);
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHANNEL_ID) return;

  const cmd = message.content.toLowerCase();

  if (cmd === "!cekgame" || cmd === "!cekall") {
    message.channel.send("🔎 Mengecek semua game gratis...");
    const epic = await getEpicGames();
    const steam = await getSteamGames();
    const all = [...epic, ...steam].filter((game) => game.region === "ID");
    sendGames(all, message);
  }

  if (cmd === "!cekepic") {
    message.channel.send("🔎 Mengecek game gratis dari Epic Games...");
    const epic = (await getEpicGames()).filter((game) => game.region === "ID");
    sendGames(epic, message);
  }

  if (cmd === "!ceksteam") {
    message.channel.send("🔎 Mengecek game gratis dari Steam...");
    const steam = (await getSteamGames()).filter((game) => game.region === "ID");
    sendGames(steam, message);
  }
});


// Server Keep-Alive untuk Replit
http.createServer((req, res) => {
  res.write("Bot is alive!");
  res.end();
}).listen(8080);

client.login(process.env.DISCORD_TOKEN);