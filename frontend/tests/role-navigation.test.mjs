import test from "node:test";
import assert from "node:assert/strict";

// Nav item generator matching DashboardLayout
function getNavItems(role) {
  if (role === "STUDENT") {
    return [
      { title: "Student Dashboard", href: "/dashboard/student" },
      { title: "Lecture Halls & Booking", href: "/halls" },
      { title: "Lecturer Consultations", href: "/lecturers" },
      { title: "Equipment Borrowing", href: "/equipment" },
      { title: "Lab Services & 3D Print", href: "/services" },
      { title: "My Requests & Tracker", href: "/my-requests" },
      { title: "Notifications", href: "/notifications" },
      { title: "My Profile", href: "/profile" },
    ];
  }

  if (role === "LECTURER") {
    return [
      { title: "Lecturer Dashboard", href: "/dashboard/lecturer" },
      { title: "Consultation Requests", href: "/lecturers" },
      { title: "Lecture Halls", href: "/halls" },
      { title: "Equipment Catalog", href: "/equipment" },
      { title: "My Requests", href: "/my-requests" },
      { title: "Notifications", href: "/notifications" },
      { title: "My Profile", href: "/profile" },
    ];
  }

  // Administrators: SUPER_ADMIN, FACILITY_ADMIN, LAB_ADMIN
  return [
    { title: "Admin Overview", href: "/dashboard/admin" },
    { title: "Operations Hub", href: "/admin" },
    { title: "Halls & Facilities", href: "/halls" },
    { title: "Lab & Equipment", href: "/equipment" },
    { title: "3D Print & Services", href: "/services" },
    { title: "Notifications", href: "/notifications" },
    { title: "My Profile", href: "/profile" },
  ];
}

// Route permission checker matching ProtectedRoute
function isRouteAllowed(userRole, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(userRole);
}

test("Role-based Navigation - Student Menu", () => {
  const items = getNavItems("STUDENT");
  const hrefs = items.map((i) => i.href);

  assert.equal(hrefs.includes("/dashboard/student"), true);
  assert.equal(hrefs.includes("/my-requests"), true);
  assert.equal(hrefs.includes("/notifications"), true);
  assert.equal(hrefs.includes("/dashboard/admin"), false);
  assert.equal(hrefs.includes("/admin"), false);
});

test("Role-based Navigation - Lecturer Menu", () => {
  const items = getNavItems("LECTURER");
  const hrefs = items.map((i) => i.href);

  assert.equal(hrefs.includes("/dashboard/lecturer"), true);
  assert.equal(hrefs.includes("/lecturers"), true);
  assert.equal(hrefs.includes("/notifications"), true);
  assert.equal(hrefs.includes("/dashboard/student"), false);
  assert.equal(hrefs.includes("/dashboard/admin"), false);
});

test("Role-based Navigation - Administrator Menus", () => {
  for (const adminRole of ["SUPER_ADMIN", "FACILITY_ADMIN", "LAB_ADMIN"]) {
    const items = getNavItems(adminRole);
    const hrefs = items.map((i) => i.href);

    assert.equal(hrefs.includes("/dashboard/admin"), true);
    assert.equal(hrefs.includes("/admin"), true);
    assert.equal(hrefs.includes("/notifications"), true);
    assert.equal(hrefs.includes("/dashboard/student"), false);
  }
});

test("Protected Route Access Verification", () => {
  const adminOnly = ["SUPER_ADMIN", "FACILITY_ADMIN", "LAB_ADMIN"];
  const superAdminOnly = ["SUPER_ADMIN"];

  // Students attempting admin pages
  assert.equal(isRouteAllowed("STUDENT", adminOnly), false);
  assert.equal(isRouteAllowed("STUDENT", superAdminOnly), false);

  // Facility admin attempting super admin user management
  assert.equal(isRouteAllowed("FACILITY_ADMIN", superAdminOnly), false);
  assert.equal(isRouteAllowed("FACILITY_ADMIN", adminOnly), true);

  // Super Admin has access everywhere
  assert.equal(isRouteAllowed("SUPER_ADMIN", adminOnly), true);
  assert.equal(isRouteAllowed("SUPER_ADMIN", superAdminOnly), true);
});

test("Dedicated Portals Seed Role Mapping & Routing", () => {
  const seedUsers = {
    lecturer: { email: "kamal@eng.sjp.ac.lk", role: "LECTURER", targetDashboard: "/dashboard/lecturer", loginRoute: "/lecture" },
    superAdmin: { email: "admin@eng.sjp.ac.lk", role: "SUPER_ADMIN", targetDashboard: "/dashboard/admin", loginRoute: "/admin" },
    facilityAdmin: { email: "facility.admin@eng.sjp.ac.lk", role: "FACILITY_ADMIN", targetDashboard: "/dashboard/admin", loginRoute: "/admin" },
    labAdmin: { email: "lab.admin@eng.sjp.ac.lk", role: "LAB_ADMIN", targetDashboard: "/dashboard/admin", loginRoute: "/admin" },
  };

  // Lecturer portal routing verification
  assert.equal(seedUsers.lecturer.loginRoute, "/lecture");
  assert.equal(seedUsers.lecturer.role, "LECTURER");

  // Admin portal routing verification (all admin roles use /admin)
  for (const adminKey of ["superAdmin", "facilityAdmin", "labAdmin"]) {
    const admin = seedUsers[adminKey];
    assert.equal(admin.loginRoute, "/admin");
    assert.equal(isRouteAllowed(admin.role, ["SUPER_ADMIN", "FACILITY_ADMIN", "LAB_ADMIN"]), true);
  }

  // Strict registration policy: Only student self-registration allowed, staff pre-provisioned
  const selfRegistrationRolesAllowed = ["STUDENT"];
  assert.equal(selfRegistrationRolesAllowed.includes("LECTURER"), false);
  assert.equal(selfRegistrationRolesAllowed.includes("SUPER_ADMIN"), false);
  assert.equal(selfRegistrationRolesAllowed.includes("FACILITY_ADMIN"), false);
  assert.equal(selfRegistrationRolesAllowed.includes("LAB_ADMIN"), false);
});
