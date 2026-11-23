import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

// Zod schema matching frontend student registration
const studentRegisterSchema = z
  .object({
    full_name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z
      .string()
      .email("Invalid email address")
      .regex(
        /^[a-zA-Z0-9._%+-]+@(eng\.)?sjp\.ac\.lk$/i,
        "Registration is restricted to university emails (@eng.sjp.ac.lk or @sjp.ac.lk)"
      ),
    registration_number: z
      .string()
      .regex(
        /^[A-Z]{2,4}\/\d{4}\/\d{3,5}$/i,
        "Registration format must be like 'EG/2021/4500'"
      ),
    phone_number: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(8, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

// Zod schema matching frontend login
const loginSchema = z.object({
  email: z.string().email("Please enter a valid institutional email address"),
  password: z.string().min(1, "Password is required"),
});

// Zod schema matching frontend hall booking form
const hallBookingSchema = z
  .object({
    facility_id: z.string().uuid("Invalid facility ID"),
    title: z.string().min(3, "Title must be at least 3 characters"),
    purpose: z.string().min(5, "Purpose must be at least 5 characters"),
    attendee_count: z.number().int().positive("Attendee count must be greater than zero"),
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
  })
  .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: "End time must be strictly after start time",
    path: ["end_time"],
  });

// Zod schema matching frontend 3D printing form
const print3DSchema = z.object({
  service_id: z.string().uuid(),
  project_title: z.string().min(3),
  description: z.string().min(5),
  material_type: z.enum(["PLA", "ABS", "PETG", "RESIN"]),
  infill_percentage: z.number().int().min(10).max(100),
  color: z.string().min(1),
});

test("Student Registration Validation - Valid Submissions", () => {
  const validInputs = [
    {
      full_name: "Nuwan Bandara",
      email: "nuwan.student@eng.sjp.ac.lk",
      registration_number: "EG/2021/4500",
      password: "StrongPassword123!",
      confirm_password: "StrongPassword123!",
    },
    {
      full_name: "Kavindu Silva",
      email: "kavindu@sjp.ac.lk",
      registration_number: "CE/2022/100",
      password: "SecurePass@2026",
      confirm_password: "SecurePass@2026",
    },
  ];

  for (const input of validInputs) {
    const result = studentRegisterSchema.safeParse(input);
    assert.equal(result.success, true, `Expected valid input to pass: ${JSON.stringify(input)}`);
  }
});

test("Student Registration Validation - Rejects Non-University Emails", () => {
  const invalidEmails = [
    "student@gmail.com",
    "student@yahoo.com",
    "student@eng.sjp.lk", // Missing .ac
    "attacker@eng-sjp.ac.lk",
  ];

  for (const email of invalidEmails) {
    const result = studentRegisterSchema.safeParse({
      full_name: "Kasun Test",
      email,
      registration_number: "EG/2021/4501",
      password: "Password123!",
      confirm_password: "Password123!",
    });
    assert.equal(result.success, false);
    assert.equal(
      result.error.issues.some((i) => i.path.includes("email")),
      true,
      `Expected email error for ${email}`
    );
  }
});

test("Student Registration Validation - Registration Number Format", () => {
  const invalidRegNumbers = ["12345", "EG-2021-4500", "EG/21/450", "INVALID"];
  for (const reg of invalidRegNumbers) {
    const result = studentRegisterSchema.safeParse({
      full_name: "Kasun Test",
      email: "kasun@eng.sjp.ac.lk",
      registration_number: reg,
      password: "Password123!",
      confirm_password: "Password123!",
    });
    assert.equal(result.success, false);
    assert.equal(result.error.issues.some((i) => i.path.includes("registration_number")), true);
  }
});

test("Student Registration Validation - Password Confirmation Mismatch", () => {
  const result = studentRegisterSchema.safeParse({
    full_name: "Kasun Test",
    email: "kasun@eng.sjp.ac.lk",
    registration_number: "EG/2021/4500",
    password: "Password123!",
    confirm_password: "DifferentPassword123!",
  });
  assert.equal(result.success, false);
  assert.equal(result.error.issues.some((i) => i.path.includes("confirm_password")), true);
});

test("Login Form Validation", () => {
  // Valid
  const valid = loginSchema.safeParse({
    email: "admin@eng.sjp.ac.lk",
    password: "AdminPassword123!",
  });
  assert.equal(valid.success, true);

  // Missing password
  const missingPw = loginSchema.safeParse({
    email: "admin@eng.sjp.ac.lk",
    password: "",
  });
  assert.equal(missingPw.success, false);

  // Invalid email
  const badEmail = loginSchema.safeParse({
    email: "not-an-email",
    password: "Password123!",
  });
  assert.equal(badEmail.success, false);
});

test("Lecture Hall Booking Form Validation - Time Range Enforcement", () => {
  // End time before start time must fail
  const badTime = hallBookingSchema.safeParse({
    facility_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    title: "Technical Seminar",
    purpose: "Society Guest Lecture",
    attendee_count: 50,
    start_time: "2026-11-10T14:00:00Z",
    end_time: "2026-11-10T12:00:00Z", // Earlier than start time
  });
  assert.equal(badTime.success, false);

  // Valid time range succeeds
  const goodTime = hallBookingSchema.safeParse({
    facility_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    title: "Technical Seminar",
    purpose: "Society Guest Lecture",
    attendee_count: 50,
    start_time: "2026-11-10T12:00:00Z",
    end_time: "2026-11-10T14:00:00Z",
  });
  assert.equal(goodTime.success, true);
});

test("3D Printing Form Validation - Infill & Material Rules", () => {
  // Invalid infill (<10% or >100%)
  const badInfill = print3DSchema.safeParse({
    service_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    project_title: "Drone Mount",
    description: "Lightweight mount",
    material_type: "PLA",
    infill_percentage: 5, // Below 10%
    color: "Black",
  });
  assert.equal(badInfill.success, false);

  // Valid infill succeeds
  const good = print3DSchema.safeParse({
    service_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    project_title: "Drone Mount",
    description: "Lightweight mount",
    material_type: "PLA",
    infill_percentage: 30,
    color: "Black",
  });
  assert.equal(good.success, true);
});
