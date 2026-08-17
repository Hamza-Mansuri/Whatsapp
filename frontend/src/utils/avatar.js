const headshots = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces', // Woman
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces', // Man
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces', // Woman
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces', // Man
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=faces', // Woman
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=faces', // Man
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop&crop=faces', // Woman
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=faces', // Man
];

/**
 * Returns a realistic human stock headshot URL.
 * If user.avatar is set and not a DiceBear link, it returns that directly.
 * Otherwise, it dynamically resolves a realistic stock headshot by hashing user.name.
 */
export const getProfessionalAvatar = (user) => {
  if (!user) return headshots[0];
  const avatar = user.avatar;
  const name = user.name || 'User';

  if (avatar && !avatar.includes('dicebear.com')) {
    if (avatar.startsWith('/uploads/')) {
      const BACKEND_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';
      return `${BACKEND_URL}${avatar}`;
    }
    return avatar;
  }

  const charSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const avatarIndex = charSum % headshots.length;
  return headshots[avatarIndex];
};

/**
 * Returns a group avatar URL.
 */
export const getGroupAvatar = (chat) => {
  if (!chat) return 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&h=150&fit=crop&crop=faces';
  
  if (chat.groupImage) {
    if (chat.groupImage.startsWith('/uploads/')) {
      const BACKEND_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';
      return `${BACKEND_URL}${chat.groupImage}`;
    }
    return chat.groupImage;
  }
  
  // Generic group image
  return 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&h=150&fit=crop&crop=faces';
};
