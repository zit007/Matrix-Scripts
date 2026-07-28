// Local Test Harness for datalogic_script.js
// Runs in Node.js to verify all logic branches under simulated Datalogic environment.

var fs = require('fs');

// Read the script to test
var scriptContent = fs.readFileSync('./datalogic_script.js', 'utf8');

// Global mock variables and functions to simulate DL.CODE environment
var output2Triggered = false;
var Output = {
    set: function(index, state) {
        if (index === 2 && state === true) {
            output2Triggered = true;
        }
    }
};

// Evaluate the script content within global context
eval(scriptContent);

// Test Runner Helper
function runTest(testName, inputData, expectedSuccess, expectedErrorType) {
    output2Triggered = false; // Reset output trigger state

    var result = processScanData(inputData);

    var output2Verified = (expectedSuccess === false) ? output2Triggered : !output2Triggered;
    var successMatch = (result.success === expectedSuccess);
    var errorMatch = true;
    if (expectedErrorType) {
        errorMatch = (result.error === expectedErrorType);
    }

    if (successMatch && errorMatch && output2Verified) {
        console.log("✔ PASS: " + testName);
    } else {
        console.error("❌ FAIL: " + testName);
        console.error("  Input: ", inputData);
        console.error("  Expected Success: " + expectedSuccess + ", Got: " + result.success);
        console.error("  Expected Error: " + expectedErrorType + ", Got: " + result.error);
        console.error("  Expected Output 2 Triggered: " + (!expectedSuccess) + ", Got: " + output2Triggered);
    }
}

console.log("--- Starting Tests for Datalogic Script ---");

// Test Case 1: First read. Two different codes. Should fail (IDENT_MISMATCH) and trigger Output 2.
runTest("First read: Two different codes", ["123456", "789012"], false, "IDENT_MISMATCH");

// Test Case 2: Two identical codes on first read. Should succeed (success = true).
runTest("First read: Two identical codes", ["ABC-123", "ABC-123"], true);

// Test Case 3: Next Phase ID. Two identical codes, but identical to the one read in the previous Phase ID. Should fail (HISTORICAL_MATCH) and trigger Output 2.
runTest("Next Phase ID: Code matches previous Phase ID", ["ABC-123", "ABC-123"], false, "HISTORICAL_MATCH");

// Test Case 4: Next Phase ID. Two identical codes, and different from the one read in the previous Phase ID. Should succeed.
runTest("Next Phase ID: Unique code compared to previous Phase ID", ["XYZ-789", "XYZ-789"], true);

// Test Case 5: Single string format input. Two identical codes space-separated. Should succeed.
runTest("String format: Space-separated identical codes", "HELLO-99 HELLO-99", true);

// Test Case 6: String format input. Identical to previous (HELLO-99). Should fail (HISTORICAL_MATCH) and trigger Output 2.
runTest("String format: Identical to previous Phase ID code", "HELLO-99 HELLO-99", false, "HISTORICAL_MATCH");

// Test Case 7: String format input. Different code, but mismatching. Should fail (IDENT_MISMATCH) and trigger Output 2.
runTest("String format: Mismatching codes", "NEW-CODE OTHER-CODE", false, "IDENT_MISMATCH");

// Test Case 8: Missing codes (e.g. empty or single code). Should fail (IDENT_MISMATCH) and trigger Output 2.
runTest("Missing second code", ["ONLYONE"], false, "IDENT_MISMATCH");
