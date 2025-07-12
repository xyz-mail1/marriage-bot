import { SlashCommandBuilder } from "@discordjs/builders";
import { EmbedBuilder } from "discord.js";
import { DiceRoll } from "rpg-dice-roller";
import { connectToDatabase } from "../mongo.js";
import { getActiveMarriage, endMarriage } from "../../schemas/marriage.js";
import {
  updateLastDivorceAttempt,
  getUserData,
} from "../../schemas/marriage.js";

export const commandBase = {
  slashData: new SlashCommandBuilder()
    .setName("divorce")
    .setDescription(
      "Attempt to divorce your partner using a D20 roll (15+ required)"
    ),

  cooldown: 0,
  ownerOnly: false,

  async slashRun(client, interaction) {
    const db = await connectToDatabase();
    const userId = interaction.user.id;

    await interaction.deferReply();

    // Check if user is married
    const marriage = await getActiveMarriage(db, userId);
    if (!marriage) {
      return interaction.editReply("❌ You're not married to anyone.");
    }

    // Check marriage age (24h rule)
    const marriedAt = new Date(marriage.marriedAt);
    const now = new Date();
    const hoursSinceMarriage = (now - marriedAt) / (1000 * 60 * 60);

    if (hoursSinceMarriage < 24) {
      return interaction.editReply(
        "⏳ You can't divorce within 24 hours of marriage."
      );
    }

    // Check last attempt
    const userData = await getUserData(db, userId);
    if (userData?.lastDivorceAttempt) {
      const lastAttempt = new Date(userData.lastDivorceAttempt);
      const hoursSinceLastAttempt = (now - lastAttempt) / (1000 * 60 * 60);
      if (hoursSinceLastAttempt < 24) {
        return interaction.editReply(
          `🕒 You must wait ${Math.ceil(
            24 - hoursSinceLastAttempt
          )}h before trying to divorce again.`
        );
      }
    }

    // Roll the dice
    const roll = new DiceRoll("1d20");
    const result = roll.total;

    if (result >= 15) {
      // Success
      await endMarriage(db, marriage.user1Id, marriage.user2Id);
      await updateLastDivorceAttempt(db, userId);

      const embed = new EmbedBuilder()
        .setTitle("💔 Divorce Success!")
        .setDescription(`You rolled **${result}**. Your marriage has ended.`)
        .setColor("Red");
      return interaction.editReply({ embeds: [embed] });
    } else {
      // Failure
      await updateLastDivorceAttempt(db, userId);

      const embed = new EmbedBuilder()
        .setTitle("😬 Divorce Failed!")
        .setDescription(
          `You rolled **${result}**. You need a 15 or higher to divorce.\nTry again in 24 hours.`
        )
        .setColor("Orange");
      return interaction.editReply({ embeds: [embed] });
    }
  },
};
