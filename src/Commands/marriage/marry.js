import { SlashCommandBuilder } from "@discordjs/builders";
import {
  MessageFlags,
  ContainerBuilder,
  ComponentType,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";
import { connectToDatabase } from "../../Base/mongodb.js";
import {
  createMarriage,
  getActiveMarriage,
  getAllActiveMarriages,
} from "../../schemas/marriage.js";

export const commandBase = {
  slashData: new SlashCommandBuilder()
    .setName("marry")
    .setDescription("Randomly marry two members!"),

  cooldown: 0,
  ownerOnly: false,

  async slashRun(client, interaction) {
    try {
      await interaction.deferReply();

      const db = await connectToDatabase();
      const guild = interaction.guild;
      const members = await guild.members.fetch();
      const marriages = await getAllActiveMarriages(db); // optimize by fetching once

      const marriedUserIds = new Set(
        marriages.flatMap((m) => [m.user1Id, m.user2Id])
      );

      const unmarried = [...members.values()].filter(
        (member) => !member.user.bot && !marriedUserIds.has(member.user.id)
      );

      if (unmarried.length < 2) {
        return await interaction.editReply(
          "❌ Not enough unmarried members to create a marriage."
        );
      }

      // Pick 2 random users
      const [user1, user2] = unmarried.sort(() => 0.5 - Math.random());

      await createMarriage(db, user1.user.id, user2.user.id);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder({ content: `## 💍 New Marriage!!` })
        )
        .addSeparatorComponents(
          new SeparatorBuilder({
            spacing: SeparatorSpacingSize.Large,
            divider: true,
          })
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder({
            content: `${user1} and ${user2} are now married!`,
          })
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (err) {
      console.error("Marriage command error:", err);
      await interaction.editReply(
        "❌ An error occurred while creating the marriage."
      );
    }
  },
};
