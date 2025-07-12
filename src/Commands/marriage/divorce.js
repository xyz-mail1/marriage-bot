import { SlashCommandBuilder } from "@discordjs/builders";
import {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";
import { DiceRoll } from "rpg-dice-roller";
import { connectToDatabase } from "../../Base/mongodb.js";
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

  /**
   * Handles the slash command interaction.
   * @param {import('discord.js').Client} client - The Discord bot client
   * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object
   */
  async slashRun(client, interaction) {
    const db = await connectToDatabase();
    const userId = interaction.user.id;

    await interaction.deferReply();

    const marriage = await getActiveMarriage(db, userId);
    if (!marriage) {
      return interaction.editReply("❌ You're not married to anyone.");
    }

    const marriedAt = new Date(marriage.marriedAt);
    const now = new Date();
    const hoursSinceMarriage = (now - marriedAt) / (1000 * 60 * 60);

    if (hoursSinceMarriage < 24) {
      return interaction.editReply(
        "⏳ You can't divorce within 24 hours of marriage."
      );
    }

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

    const roll = new DiceRoll("1d20");
    const result = roll.total;

    await updateLastDivorceAttempt(db, userId);

    const success = result >= 15;
    if (success) {
      await endMarriage(db, marriage.user1Id, marriage.user2Id);
    }

    const heading = new TextDisplayBuilder({
      content: success ? "## 💔 Divorce Success!" : "## 😬 Divorce Failed!",
    });

    const description = new TextDisplayBuilder({
      content: success
        ? `You rolled **${result}**. Your marriage has ended.`
        : `You rolled **${result}**. You need a 15 or higher to divorce.\nTry again in 24 hours.`,
    });

    const separator = new SeparatorBuilder({
      spacing: SeparatorSpacingSize.Large,
      divider: true,
    });

    const container = new ContainerBuilder()
      .addTextDisplayComponents(heading)
      .addSeparatorComponents(separator)
      .addTextDisplayComponents(description);

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};
