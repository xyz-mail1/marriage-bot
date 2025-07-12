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
