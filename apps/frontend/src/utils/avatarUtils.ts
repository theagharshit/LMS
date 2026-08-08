export const getAvatarUrl = (avatar?: string, name?: string): string => {
  if (
    avatar &&
    (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:'))
  ) {
    return avatar;
  }
  const safeName = name ? encodeURIComponent(name) : 'User';
  return `https://ui-avatars.com/api/?name=${safeName}&background=6366f1&color=fff&bold=true`;
};
