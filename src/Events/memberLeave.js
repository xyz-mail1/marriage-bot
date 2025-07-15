import {
  Events,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} from "discord.js";
import { connectToDatabase } from "../Base/mongodb.js";
import { getActiveMarriage, endMarriage } from "../schemas/marriage.js";

const logsChannelId = "1388088552679538731"; // 🔁 Replace this with your actual log channel ID

export default {
  name: Events.GuildMemberRemove,
  once: false,

  /**
   * @param {import('discord.js').Client} client
   * @param {import('discord.js').GuildMember} member
   */
  async execute(client, member) {
    const db = await connectToDatabase();
    const userId = member.user.id;

    const marriage = await getActiveMarriage(db, userId);
    if (!marriage) return;

    await endMarriage(db, marriage.user1Id, marriage.user2Id);

    const partnerId =
      marriage.user1Id === userId ? marriage.user2Id : marriage.user1Id;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder({ content: "## 🧹 Auto Divorce Triggered" })
      )
      .addSeparatorComponents(
        new SeparatorBuilder({
          spacing: SeparatorSpacingSize.Large,
          divider: true,
        })
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder({
          content: `<@${userId}> ( ${member.user.username} )left the server, so their marriage with <@${partnerId}> has been ended.`,
        })
      );

    try {
      const logChannel = await member.guild.channels.fetch(logsChannelId);
      if (logChannel?.isTextBased()) {
        await logChannel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [container],
        });
      }
    } catch (err) {
      console.error(`Failed to log auto-divorce:`, err);
    }
  },
};
