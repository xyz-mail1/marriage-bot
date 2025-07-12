// utils/cooldown.js

/**
 * Checks if the user can perform an action based on cooldown.
 * @param {Db} db - MongoDB database instance
 * @param {string} userId - Discord user ID
 * @param {string} action - cooldown field, e.g. "sabotage", "divorce"
 * @returns {Object} { allowed: boolean, remaining: number (ms) }
 */
export async function canUserAct(db, userId, action) {
  const users = db.collection("users");
  const cooldownField = `${action}CooldownUntil`;

  const user = await users.findOne({ userId });
  const now = Date.now();

  if (user?.[cooldownField]) {
    const expiresAt = new Date(user[cooldownField]).getTime();
    if (expiresAt > now) {
      return { allowed: false, remaining: expiresAt - now };
    }
  }

  return { allowed: true, remaining: 0 };
}

/**
 * Sets a cooldown for a user action.
 * @param {Db} db - MongoDB database instance
 * @param {string} userId - Discord user ID
 * @param {string} action - cooldown field, e.g. "sabotage", "divorce"
 * @param {number} minutes - duration in minutes
 */
export async function setCooldown(db, userId, action, minutes) {
  const users = db.collection("users");
  const cooldownField = `${action}CooldownUntil`;
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

  await users.updateOne(
    { userId },
    { $set: { [cooldownField]: expiresAt } },
    { upsert: true }
  );
}
