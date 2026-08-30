const normalizePermissions = (permissions) => {
  if (Array.isArray(permissions)) return permissions;

  if (typeof permissions === 'string') {
    try {
      const parsedPermissions = JSON.parse(permissions);
      return Array.isArray(parsedPermissions) ? parsedPermissions : [];
    } catch {
      return [];
    }
  }

  return [];
};

export const hasPermission = (permissions, requiredPermission = '') => (
  requiredPermission === ''
  || normalizePermissions(permissions).includes(requiredPermission)
);
