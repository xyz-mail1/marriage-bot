/**
 * Calculate divorce cooldown based on jail/death tier.
 * @param {number} baseHours - Base cooldown in hours
 * @param {number} jailTier
 * @param {number} deathTier
 * @returns {number} cooldown in milliseconds
 */
export function calculateDivorceCooldown(baseHours, jailTier, deathTier) {
  const maxCooldown = 48 * 60;
  const minCooldown = 60; // 1 hour

  const base = baseHours * 60;
  const increase = jailTier * 60;
  const reduction = deathTier * 30;

  const adjusted = Math.max(
    minCooldown,
    Math.min(base + increase - reduction, maxCooldown)
  );
  return adjusted * 60 * 1000;
}
