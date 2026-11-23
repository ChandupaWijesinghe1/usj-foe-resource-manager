import test from "node:test";
import assert from "node:assert/strict";

// Helper simulating JWT generation and client decoding
function createMockJwt(payload, expiresInSeconds = 3600) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const b64Payload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  return `${b64Header}.${b64Payload}.mock_signature_bytes`;
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const jsonStr = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function isTokenExpired(token, thresholdSeconds = 10) {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + thresholdSeconds;
}

function getAuthorizationHeader(token) {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

test("JWT Token Handling - Valid Token Decoding", () => {
  const mockToken = createMockJwt({
    sub: "user-12345",
    email: "nuwan.student@eng.sjp.ac.lk",
    role: "STUDENT",
  });

  const payload = decodeJwtPayload(mockToken);
  assert.equal(payload.sub, "user-12345");
  assert.equal(payload.email, "nuwan.student@eng.sjp.ac.lk");
  assert.equal(payload.role, "STUDENT");
  assert.equal(typeof payload.exp, "number");
});

test("JWT Token Handling - Expiration Checking", () => {
  // Fresh token (1 hour left)
  const freshToken = createMockJwt({ sub: "user-fresh" }, 3600);
  assert.equal(isTokenExpired(freshToken), false);

  // Expired token (expired 10 seconds ago)
  const expiredToken = createMockJwt({ sub: "user-expired" }, -10);
  assert.equal(isTokenExpired(expiredToken), true);

  // Near-expiry token within 10-second buffer
  const nearExpiryToken = createMockJwt({ sub: "user-near" }, 5);
  assert.equal(isTokenExpired(nearExpiryToken, 10), true);
});

test("Authorization Header Injection", () => {
  const token = "eyJh...sample.token";
  const headers = getAuthorizationHeader(token);
  assert.equal(headers.Authorization, "Bearer eyJh...sample.token");

  const emptyHeaders = getAuthorizationHeader(null);
  assert.deepEqual(emptyHeaders, {});
});

test("Authentication Session Lifecycle Simulation", () => {
  // Simulating localStorage store
  const mockStorage = new Map();

  function storeAuthSession(tokens, user) {
    mockStorage.set("access_token", tokens.access_token);
    mockStorage.set("refresh_token", tokens.refresh_token);
    mockStorage.set("user", JSON.stringify(user));
  }

  function clearAuthSession() {
    mockStorage.delete("access_token");
    mockStorage.delete("refresh_token");
    mockStorage.delete("user");
  }

  // Login
  const tokens = {
    access_token: createMockJwt({ sub: "user-1" }, 3600),
    refresh_token: "refresh-uuid-xyz",
  };
  const user = { id: "user-1", email: "nuwan@eng.sjp.ac.lk", role: "STUDENT" };

  storeAuthSession(tokens, user);
  assert.equal(mockStorage.has("access_token"), true);
  assert.equal(mockStorage.get("refresh_token"), "refresh-uuid-xyz");
  assert.equal(JSON.parse(mockStorage.get("user")).email, "nuwan@eng.sjp.ac.lk");

  // Logout
  clearAuthSession();
  assert.equal(mockStorage.has("access_token"), false);
  assert.equal(mockStorage.has("refresh_token"), false);
  assert.equal(mockStorage.has("user"), false);
});
