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
import { createMarriage, getActiveMarriage } from "../../schemas/marriage.js";

export const commandBase = {
  slashData: new SlashCommandBuilder()
    .setName("marry")
    .setDescription("Randomly marry two members!"),

  cooldown: 0,
  ownerOnly: false,

  async slashRun(client, interaction) {
    await interaction.deferReply();
    const db = await connectToDatabase();
    const guild = interaction.guild;
    const members = await guild.members.fetch();

    // Filter out bots and married users
    const allMembers = [...members.values()].filter((m) => !m.user.bot);
    const unmarried = [];

    for (const member of allMembers) {
      const marriage = await getActiveMarriage(db, member.user.id);
      if (!marriage) unmarried.push(member);
    }

    if (unmarried.length < 2) {
      await interaction.editReply(
        "❌ Not enough unmarried members to create a marriage."
      );
    }

    // Pick 2 random users
    const shuffled = unmarried.sort(() => 0.5 - Math.random());
    const [user1, user2] = shuffled;

    // Save to DB
    await createMarriage(db, user1.user.id, user2.user.id);

    const heading = new TextDisplayBuilder({
      content: `## 💍 New Marriage!!`,
    });
    const description = new TextDisplayBuilder({
      content: `${user1} and ${user2} are now married!`,
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
