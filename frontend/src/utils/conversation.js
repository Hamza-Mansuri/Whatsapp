/**
 * Normalizes user ID extraction across different serialization shapes (id vs _id).
 */
export const getUserId = (user) => {
  if (!user) return '';
  if (typeof user === 'string') return user;
  return user._id || user.id || '';
};

/**
 * Compares two user objects or IDs to verify if they represent the same user.
 */
export const isSameUser = (user1, user2) => {
  const id1 = getUserId(user1);
  const id2 = getUserId(user2);
  return !!(id1 && id2 && id1 === id2);
};

/**
 * Returns the other participant in the conversation, excluding the currently logged-in user.
 */
export const getOtherParticipant = (participants, currentUser) => {
  if (!participants || !currentUser) return null;
  return participants.find((p) => !isSameUser(p, currentUser)) || null;
};
