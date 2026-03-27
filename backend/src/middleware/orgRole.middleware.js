const db = require("../db");

/**
 * Helper function to get organization's parent chain
 * Returns array of organization IDs from child to root
 */
async function getOrgParentChain(orgId) {
  const chain = [Number(orgId)];
  let currentId = orgId;

  // Max depth to prevent infinite loops
  for (let i = 0; i < 10; i++) {
    const [rows] = await db.query(
      "SELECT parent_id FROM organization WHERE organization_id = ? LIMIT 1",
      [currentId],
    );

    if (rows.length === 0 || !rows[0].parent_id || rows[0].parent_id <= 0) {
      break;
    }

    currentId = rows[0].parent_id;
    chain.push(currentId);
  }

  return chain;
}

const orgScopeMiddleware = (allowRoles = []) => {
  return async (req, res, next) => {
    try {
      // Null check for req.user
      if (!req.user || !req.user.user_id) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const userId = req.user.user_id;
      console.log(`📋 [checkOrgRole] userId: ${userId}, allowRoles:`, allowRoles);

      // 0. Check if user has ADMIN code in user table (global admin bypass)
      const [userCodeRows] = await db.query(
        "SELECT code FROM `user` WHERE user_id = ? LIMIT 1",
        [userId],
      );
      const userCode = userCodeRows[0]?.code;
      console.log(`📋 [checkOrgRole] userCode from user table:`, userCode);

      if (userCode === "ADMIN" || userCode === "SUPER_ADMIN") {
        console.log(`📋 [checkOrgRole] Global admin bypass for user ${userId} (code: ${userCode})`);
        req.orgRole = userCode === "ADMIN" ? "SUPER_ADMIN" : userCode;
        req.organization_id = req.params?.organization_id || req.body?.organizationId || null;
        return next();
      }

      // 1. Get all roles of user across organizations
      const [userRoles] = await db.query(
        `
            SELECT role_in_org, organization_id
            FROM organization_manager
            WHERE user_id = ?
            `,
        [userId],
      );

      console.log(`📋 [checkOrgRole] userRoles found:`, userRoles);

      // 2. If SUPER_ADMIN anywhere, allow global access (bypass orgId requirement if missing)
      const isSuperAdmin = userRoles.some(
        (r) => r.role_in_org === "SUPER_ADMIN",
      );

      // Check multiple possible parameter names for organization_id
      // IMPORTANT: Do NOT use req.params.id here - on user routes, :id is user_id, not org_id
      let orgId =
        req.params?.organization_id ||
        req.body?.organization_id ||
        req.body?.organizationId ||
        req.body?.schoolId ||
        req.query?.organization_id;

      // If orgId is missing but classroomId is present, resolve it from the classroom
      const classroomId =
        req.params?.classroomId ||
        req.body?.classroomId ||
        req.body?.class_room_id;
      
      console.log(`📋 [checkOrgRole] orgId: ${orgId}, classroomId: ${classroomId}`);
      
      if (!orgId && classroomId) {
        const [classRows] = await db.query(
          "SELECT organization_id FROM class_room WHERE class_room_id = ? LIMIT 1",
          [classroomId],
        );
        console.log(`📋 [checkOrgRole] Resolved org from classroom:`, classRows);
        if (classRows.length > 0) {
          orgId = classRows[0].organization_id;
        }
      }

      if (isSuperAdmin) {
        req.orgRole = "SUPER_ADMIN";
        req.organization_id = orgId || null;
        return next();
      }

      // 3. For non-super-admins, organization ID is required.
      // If orgId is still not resolved, fall back to the user's own org from organization_manager.
      if (!orgId) {
        const ownRole = userRoles.find((r) => allowRoles.includes(r.role_in_org));
        console.log(`📋 [checkOrgRole] No orgId, fallback ownRole:`, ownRole);
        if (ownRole) {
          req.orgRole = ownRole.role_in_org;
          req.organization_id = ownRole.organization_id;
          req.managedOrgId = ownRole.organization_id;
          return next();
        }
        console.error(`❌ [checkOrgRole] 400 - No orgId and no matching role for user ${userId}. userRoles:`, userRoles);
        return res.status(400).json({ error: "Organization ID is required" });
      }

      // Get parent chain of target organization
      const orgChain = await getOrgParentChain(orgId);

      // Check if user has allowed role in target org or any of its parents
      let foundRole = null;
      let foundOrgId = null;

      for (const checkOrgId of orgChain) {
        const userRoleInOrg = userRoles.find(
          (r) => Number(r.organization_id) === Number(checkOrgId),
        );
        if (userRoleInOrg && allowRoles.includes(userRoleInOrg.role_in_org)) {
          foundRole = userRoleInOrg.role_in_org;
          foundOrgId = checkOrgId;
          break;
        }
      }

      if (!foundRole) {
        return res.status(403).json({
          error:
            "Access denied: User does not have permission for this organization or its hierarchy",
        });
      }

      req.orgRole = foundRole;
      req.organization_id = orgId;
      req.managedOrgId = foundOrgId; // The org where user actually has the role

      next();
    } catch (error) {
      console.error("Error in orgScopeMiddleware:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

module.exports = orgScopeMiddleware;
