import { SlashCommandBuilder } from "@discordjs/builders";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} from "discord.js";
import { connectToDatabase } from "../../Base/mongodb.js";
import { getActiveMarriage } from "../../schemas/marriage.js";

export const commandBase = {
  slashData: new SlashCommandBuilder()
    .setName("marriage")
    .setDescription("Check who a user is married to")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to check")
        .setRequired(false)
    ),

  cooldown: 0,
  ownerOnly: false,

  /**
   * @param {import('discord.js').Client} client
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async slashRun(client, interaction) {
    await interaction.deferReply();

    const db = await connectToDatabase();
    const targetUser = interaction.options.getUser("user") || interaction.user;

    const marriage = await getActiveMarriage(db, targetUser.id);
    if (!marriage) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder({
            content: `💔 <@${targetUser.id}> is not currently married.`,
          })
        )
        .setAccentColor(Colors.Red);
      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    const partnerId =
      marriage.user1Id === targetUser.id ? marriage.user2Id : marriage.user1Id;

    const marriedAt = new Date(marriage.marriedAt);
    const now = new Date();
    const durationMs = now - marriedAt;
    const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((durationMs / (1000 * 60 * 60)) % 24);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder({ content: `## 💍 Marriage Info` })
      )
      .addSeparatorComponents(
        new SeparatorBuilder({
          spacing: SeparatorSpacingSize.Large,
          divider: true,
        })
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder({
          content: `<@${targetUser.id}> is married to <@${partnerId}>.\nThey have been married for **${days} days** and **${hours} hours**.`,
        })
      );

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};
