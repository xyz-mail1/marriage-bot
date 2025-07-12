import { SlashCommandBuilder } from "@discordjs/builders";
import { EmbedBuilder } from "discord.js";
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

    // Make sure user is not married
    const married = await getActiveMarriage(db, userId);
    if (married) {
      return interaction.editReply(
        "❌ You can't sabotage marriages while you're married."
      );
    }

    // Get user data (for cooldown tracking)
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

    // Roll the die
    const roll = new DiceRoll("1d20");
    const result = roll.total;

    // Update cooldown regardless of result
    const cooldownDuration = result === 20 ? 24 * 60 : 10; // minutes
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

    // Success — end a random marriage
    const marriages = await getAllActiveMarriages(db);
    if (marriages.length === 0) {
      await interaction.editReply("🥹 There are no marriages to sabotage.");
      return;
    }

    const randomMarriage =
      marriages[Math.floor(Math.random() * marriages.length)];
    await endMarriage(db, randomMarriage.user1Id, randomMarriage.user2Id);

    const embed = new EmbedBuilder()
      .setTitle("💣 Sabotage Success!")
      .setDescription(
        `You rolled a **natural 20** and ended a marriage between <@${randomMarriage.user1Id}> and <@${randomMarriage.user2Id}>!`
      )
      .setColor("DarkRed");

    await interaction.editReply({ embeds: [embed] });
  },
};
