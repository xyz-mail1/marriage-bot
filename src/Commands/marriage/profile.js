import { SlashCommandBuilder } from "@discordjs/builders";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} from "discord.js";
import { connectToDatabase } from "../../Base/mongodb.js";
import { getOrCreateUserData } from "../../schemas/marriage.js";
import { calculateDivorceCooldown } from "../../utils/cooldownHelper.js";

export const commandBase = {
  slashData: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your marriage-related stats")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("Select someone to see their profile")
        .setRequired(false)
    ),

  cooldown: 0,
  ownerOnly: false,

  /**
   * @param {import('discord.js').Client} client
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async slashRun(client, interaction) {
    const db = await connectToDatabase();
    const target = interaction.options.getUser("user") || interaction.user;
    const userId = target.id;
    //  console.log(userId);

    if (!userId) {
      return interaction.editReply("❌ User not found.");
    }

    await interaction.deferReply();

    const userData = await getOrCreateUserData(db, userId);

    const deathTier = userData.deathTier || 0;
    const jailTier = userData.jailTier || 0;

    const baseDivorceHours = 24;
    const cooldownMs = calculateDivorceCooldown(
      baseDivorceHours,
      jailTier,
      deathTier
    );
    const cooldownHours = Math.floor(cooldownMs / (60 * 60 * 1000));
    const cooldownMinutes = Math.floor(
      (cooldownMs % (60 * 60 * 1000)) / (60 * 1000)
    );
    const cooldownSeconds = Math.floor((cooldownMs % (60 * 1000)) / 1000);

    const now = new Date();
    let killCooldownMsg = "✅ You can use </kill:1394661544616267817> now";

    if (
      userData.killPartnerCooldownUntil &&
      new Date(userData.killPartnerCooldownUntil) > now
    ) {
      const diff = new Date(userData.killPartnerCooldownUntil) - now;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      killCooldownMsg = `⏳ You can use \</kill:1394661544616267817>\ in **${mins}m ${secs}s**`;
    }

    const heading = new TextDisplayBuilder({
      content: `## 📜 ${target.username}'s Profile`,
    });
    const stats = new TextDisplayBuilder({
      content: `
**💀 Death Tier**: ${deathTier}
**🚔 Jail Tier**: ${jailTier}

**📆 Divorce Cooldown**: ${cooldownHours}h ${cooldownMinutes}m ${cooldownSeconds}s (based on tiers)

${killCooldownMsg}
      `.trim(),
    });

    const container = new ContainerBuilder()
      .addTextDisplayComponents(heading)
      .addSeparatorComponents(
        new SeparatorBuilder({
          spacing: SeparatorSpacingSize.Large,
          divider: true,
        })
      )
      .addTextDisplayComponents(stats);

    return interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};
