
const request = require("supertest");
const { app, pool } = require("../server");

describe("TrustVault Security Tests", () => {

    test("Backend and database should be working", async () => {
        const response = await request(app).get("/api/health");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    test("Unauthorized user should not access documents", async () => {
        const response = await request(app).get("/api/documents");

        expect(response.status).toBe(401);
    });

    test("Unauthorized user should not access admin audit logs", async () => {
        const response = await request(app).get("/api/admin/audit-logs");

        expect(response.status).toBe(401);
    });

    test("Owner should be able to login with correct password", async () => {
        const response = await request(app)
            .post("/api/login")
            .send({
                email: "siri@gmail.com",
                password: process.env.TEST_OWNER_PASSWORD
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    test("Login should fail with incorrect password", async () => {
        const response = await request(app)
            .post("/api/login")
            .send({
                email: "owner@test.com",
                password: "WrongPassword123!"
            });

        expect(response.status).toBe(401);
    });

    test("Unauthorized user should not download documents", async () => {
        const response = await request(app)
            .get("/api/documents/1/download");

        expect(response.status).toBe(401);
    });

    test("Unauthorized user should not grant document permissions", async () => {
        const response = await request(app)
            .post("/api/documents/1/permissions")
            .send({
                userId: 1,
                permission: "read"
            });

        expect(response.status).toBe(401);
    });

    test("Unauthorized user should not revoke document permissions", async () => {
        const response = await request(app)
            .delete("/api/documents/1/permissions/1");

        expect(response.status).toBe(401);
    });

});

afterAll(async () => {
    await pool.end();
});
