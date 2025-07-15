import { SlashCommandBuilder } from "@discordjs/builders";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} from "discord.js";
import { DiceRoll } from "rpg-dice-roller";
import { connectToDatabase } from "../../Base/mongodb.js";
import { getActiveMarriage, endMarriage } from "../../schemas/marriage.js";
import { getOrCreateUserData, incrementTier } from "../../schemas/marriage.js";

export const commandBase = {
  slashData: new SlashCommandBuilder()
    .setName("kill")
    .setDescription("Attempt to kill your partner using a D20 roll"),

  cooldown: 0,
  ownerOnly: false,

  /**
   * @param {import("discord.js").Client} client
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */
  async slashRun(client, interaction) {
    await interaction.deferReply();
    const db = await connectToDatabase();
    const userId = interaction.user.id;
    const users = db.collection("users");

    // Check cooldown
    const userData = await getOrCreateUserData(db, userId);
    const now = new Date();
    if (
      userData.killPartnerCooldownUntil &&
      new Date(userData.killPartnerCooldownUntil) > now
    ) {
      const diffMin = Math.ceil(
        (new Date(userData.killPartnerCooldownUntil) - now) / 60000
      );
      return interaction.editReply(
        `🕒 You must wait **${diffMin} minutes** before attempting to kill your partner again.`
      );
    }

    const marriage = await getActiveMarriage(db, userId);
    if (!marriage) {
      return interaction.editReply("❌ You are not married to anyone.");
    }

    const partnerId =
      marriage.user1Id === userId ? marriage.user2Id : marriage.user1Id;
    await getOrCreateUserData(db, partnerId);

    const roll = new DiceRoll("1d20").total;
    let resultText = `🎲 You rolled **${roll}**.\n`;
    let outcome = "";
    let cooldownMinutes = 0;

    if (roll === 1) {
      await incrementTier(db, userId, "deathTier");
      outcome = `😵 You rolled a **1** and died trying to kill <@${partnerId}>.\nYour **Death Tier** has increased by 1.`;
      cooldownMinutes = 360; // 6 hours
    } else if (roll >= 15) {
      await incrementTier(db, partnerId, "deathTier");
      await endMarriage(db, userId, partnerId);
      outcome = `☠️ You successfully killed <@${partnerId}> and ended the marriage.\nTheir **Death Tier** has increased by 1.`;
      cooldownMinutes = 0;
    } else {
      await incrementTier(db, userId, "jailTier");
      outcome = `🚔 You failed to kill <@${partnerId}> and got caught.\nYour **Jail Tier** has increased by 1.`;
      cooldownMinutes = 60; // 1 hour
    }

    // Update cooldown if needed
    if (cooldownMinutes > 0) {
      const nextTry = new Date(now.getTime() + cooldownMinutes * 60000);
      await users.updateOne(
        { userId },
        { $set: { killPartnerCooldownUntil: nextTry } },
        { upsert: true }
      );
    }

    const explanation = `
-# **📖 What Tiers Do:**

-# - **Death Tier**: Decreases your divorce cooldown by **30 minutes** per tier (minimum 1 hour).
-# - **Jail Tier**: Increases your divorce cooldown by **1 hour** per tier (maximum 48 hours).
    `;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder({ content: "## 💥 Murder Attempt Result" })
      )
      .addSeparatorComponents(
        new SeparatorBuilder({
          spacing: SeparatorSpacingSize.Large,
          divider: true,
        })
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder({ content: `${resultText}${outcome}` })
      )
      .addSeparatorComponents(
        new SeparatorBuilder({
          spacing: SeparatorSpacingSize.Medium,
          divider: false,
        })
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder({ content: explanation })
      );

    return interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};
