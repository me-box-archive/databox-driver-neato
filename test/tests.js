var app = require("../src/main.js");
var supertest = require("supertest")(app);
var assert = require('assert');


it("Responds with 'active'", function(done) {
    supertest
        .get("/status")
        .expect(200)
        .expect("active",done);
});
