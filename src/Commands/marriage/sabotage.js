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
import {
  getActiveMarriage,
  getAllActiveMarriages,
  endMarriage,
} from "../../schemas/marriage.js";

export const commandBase = {
  slashData: new SlashCommandBuilder()
    .setName("sabotage")
    .setDescription(
      "Try to sabotage a random marriage by rolling a natural 20"
    ),

  cooldown: 0,
  ownerOnly: false,

  async slashRun(client, interaction) {
    const db = await connectToDatabase();
    const userId = interaction.user.id;
    const now = new Date();

    await interaction.deferReply();

    const married = await getActiveMarriage(db, userId);
    if (married) {
      return interaction.editReply(
        "❌ You can't sabotage marriages while you're married."
      );
    }

    const users = db.collection("users");
    const userData = await users.findOne({ userId });

    if (
      userData?.sabotageCooldownUntil &&
      new Date(userData.sabotageCooldownUntil) > now
    ) {
      const diffMin = Math.ceil(
        (new Date(userData.sabotageCooldownUntil) - now) / 60000
      );
      return interaction.editReply(
        `🕒 You must wait **${diffMin} minutes** before sabotaging again.`
      );
    }

    const roll = new DiceRoll("1d20");
    const result = roll.total;

    const cooldownDuration = result === 20 ? 24 * 60 : 10;
    const nextTry = new Date(now.getTime() + cooldownDuration * 60000);

    await users.updateOne(
      { userId },
      { $set: { sabotageCooldownUntil: nextTry } },
      { upsert: true }
    );

    if (result !== 20) {
      return interaction.editReply(
        `🎲 You rolled **${result}**. You need a **natural 20** to succeed.\nTry again in ${cooldownDuration} minutes.`
      );
    }

    const marriages = await getAllActiveMarriages(db);
    if (marriages.length === 0) {
      return interaction.editReply("🥹 There are no marriages to sabotage.");
    }

    const randomMarriage =
      marriages[Math.floor(Math.random() * marriages.length)];
    await endMarriage(db, randomMarriage.user1Id, randomMarriage.user2Id);

    const heading = new TextDisplayBuilder({
      content: `## 💣 Sabotage Success!`,
    });

    const description = new TextDisplayBuilder({
      content: `You rolled a **natural 20** and ended a marriage between <@${randomMarriage.user1Id}> and <@${randomMarriage.user2Id}>!`,
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
