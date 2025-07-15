// Basic schema logic using raw MongoDB (not mongoose)
export async function createMarriage(db, user1Id, user2Id) {
  const marriage = {
    user1Id,
    user2Id,
    marriedAt: new Date(),
    active: true,
  };
  await db.collection("marriages").insertOne(marriage);
}

export async function getActiveMarriage(db, userId) {
  return db.collection("marriages").findOne({
    $and: [
      { active: true },
      { $or: [{ user1Id: userId }, { user2Id: userId }] },
    ],
  });
}

export async function getAllActiveMarriages(db) {
  return db.collection("marriages").find({ active: true }).toArray();
}

export async function endMarriage(db, user1Id, user2Id) {
  return db.collection("marriages").updateOne(
    {
      $or: [
        { user1Id, user2Id },
        { user1Id: user2Id, user2Id: user1Id },
      ],
      active: true,
    },
    {
      $set: {
        active: false,
        divorcedAt: new Date(),
      },
    }
  );
}

export async function updateLastDivorceAttempt(db, userId) {
  return db
    .collection("users")
    .updateOne(
      { userId },
      { $set: { lastDivorceAttempt: new Date() } },
      { upsert: true }
    );
}

export async function getUserData(db, userId) {
  return db.collection("users").findOne({ userId });
}

// Get or create user data
export async function getOrCreateUserData(db, userId) {
  const users = db.collection("users");
  let data = await users.findOne({ userId });

  if (!data) {
    data = {
      userId,
      deathTier: 0,
      jailTier: 0,
      killPartnerCooldownUntil: null,
    };
    await users.insertOne(data);
  } else {
    // Backfill any missing fields for existing users
    const update = {};
    if (data.deathTier === undefined) update.deathTier = 0;
    if (data.jailTier === undefined) update.jailTier = 0;
    if (data.killPartnerCooldownUntil === undefined)
      update.killPartnerCooldownUntil = null;

    if (Object.keys(update).length > 0) {
      await users.updateOne({ userId }, { $set: update });
      data = { ...data, ...update };
    }
  }

  return data;
}

export async function incrementTier(db, userId, field) {
  const users = db.collection("users");
  await users.updateOne({ userId }, { $inc: { [field]: 1 } }, { upsert: true });
}
