import { SlashCommandBuilder } from "@discordjs/builders";
import { EmbedBuilder } from "discord.js";
import { connectToDatabase } from "../mongo.js";

export const commandBase = {
  slashData: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Shows the longest lasting marriages"),

  cooldown: 5000,
  ownerOnly: false,

  async slashRun(client, interaction) {
    const db = await connectToDatabase();
    const marriages = await db
      .collection("marriages")
      .find({ active: true })
      .sort({ marriedAt: 1 }) // oldest first = longest lasting
      .limit(10)
      .toArray();

    if (marriages.length === 0) {
      return interaction.reply("No marriages found 🥲");
    }

    const now = new Date();
    const formatDuration = (ms) => {
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
      return `${days}d ${hours}h`;
    };

    const description = marriages
      .map((m, i) => {
        const duration = formatDuration(now - new Date(m.marriedAt));
        return `**${i + 1}.** <@${m.user1Id}> ❤️ <@${
          m.user2Id
        }> — \`${duration}\``;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🏆 Longest Lasting Marriages")
      .setDescription(description)
      .setColor("Gold");

    await interaction.reply({ embeds: [embed] });
  },
};
