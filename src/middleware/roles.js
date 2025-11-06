const roleHierarchy = {
  student: 1,
  instructor: 2,
  support_admin: 3,
  system_admin: 4,
};

const allowRoles = (...roles) => (req, res, next) => {
  const currentRole = req.user?.role;
  if (!currentRole || !roles.includes(currentRole)) {
    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  }
  next();
};

const minRole = (role) => (req, res, next) => {
  const currentRole = req.user?.role;
  if (!currentRole || roleHierarchy[currentRole] < roleHierarchy[role]) {
    return res.status(403).json({
      success: false,
      message: "Insufficient role",
    });
  }
  next();
};

module.exports = { allowRoles, minRole };
