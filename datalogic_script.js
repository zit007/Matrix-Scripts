// Datalogic Matrix Scanner Script - Dual Code Validation with History Check
// Language: JavaScript / ECMAScript 5 (ES5)
// Compatible with recent Datalogic Matrix firmware (DL.CODE environment)

// Globals used to store state across Phase IDs
if (typeof lastVerifiedCode === 'undefined') {
    var lastVerifiedCode = ""; // stores the successfully validated code from the prior Phase ID
}

/**
 * Triggers Digital Output 2 on the Datalogic Matrix scanner.
 * Supports multiple API paradigms used by Datalogic Matrix/DL.CODE depending on firmware/configuration.
 */
function triggerOutput2() {
    // Paradigm 1: Direct digital output manipulation using modern/standard DL.CODE API (if available)
    if (typeof Output !== 'undefined' && typeof Output.set === 'function') {
        try {
            Output.set(2, true); // Sets Output 2 high
        } catch (e1) {
            // fallback handled below
        }
    }

    // Paradigm 2: Alternative object structure for digital outputs
    if (typeof DigitalOutput2 !== 'undefined' && typeof DigitalOutput2.set === 'function') {
        try {
            DigitalOutput2.set(true);
        } catch (e2) {
            // fallback handled below
        }
    }

    // Paradigm 3: Event triggering method (triggers a configured Logical/Physical Event in DL.CODE)
    if (typeof Event !== 'undefined' && typeof Event.trigger === 'function') {
        try {
            Event.trigger("Output2Active"); // triggers user-configured event "Output2Active" mapped to Output 2
        } catch (e3) {
            // fallback handled below
        }
    }

    // Paradigm 4: Legacy matrix output style
    if (typeof setDigitalOutput === 'function') {
        try {
            setDigitalOutput(2, true);
        } catch (e4) {
            // fallback handled below
        }
    }

    // Paradigm 5: Standard DL.CODE IO object manipulation
    if (typeof IO !== 'undefined') {
        try {
            if (typeof IO.out2 !== 'undefined') {
                IO.out2 = true;
            } else if (typeof IO.out !== 'undefined' && typeof IO.out[2] !== 'undefined') {
                IO.out[2] = true;
            }
        } catch (e5) {
            // fallback handled below
        }
    }

    // Safe logger hook for troubleshooting / debug console in DL.CODE script editor
    if (typeof logger !== 'undefined' && typeof logger.info === 'function') {
        logger.info("VALIDATION FAILED: Triggered Output 2");
    } else if (typeof console !== 'undefined' && typeof console.log === 'function') {
        console.log("VALIDATION FAILED: Triggered Output 2");
    }
}

function processScanData(inputData) {
    // Phase 1: Extract the two codes read at Good Read.
    // Datalogic scanners can pass code data in multiple ways:
    // Case A: inputData is an array of strings representing individual barcodes/codes.
    // Case B: inputData is a single string where codes are joined by a separator (e.g., space, comma, or newline).
    var code1 = "";
    var code2 = "";

    if (Array.isArray(inputData)) {
        if (inputData.length >= 2) {
            code1 = inputData[0];
            code2 = inputData[1];
        } else if (inputData.length === 1) {
            code1 = inputData[0];
        }
    } else if (typeof inputData === "string") {
        // Trim and clean input string
        var cleanInput = inputData.replace(/^\s+|\s+$/g, '');
        // Split by common delimiters: tab (\t), newline (\n), carriage return (\r), comma (,), semicolon (;), or multiple spaces
        var parts = cleanInput.split(/[\r\n\t,;]|\s{2,}/);

        // If split didn't yield multiple items, try splitting by a single space
        if (parts.length < 2) {
            parts = cleanInput.split(' ');
        }

        // Clean each part
        var cleanParts = [];
        for (var i = 0; i < parts.length; i++) {
            var trimmed = parts[i].replace(/^\s+|\s+$/g, '');
            if (trimmed.length > 0) {
                cleanParts.push(trimmed);
            }
        }

        if (cleanParts.length >= 2) {
            code1 = cleanParts[0];
            code2 = cleanParts[1];
        } else if (cleanParts.length === 1) {
            code1 = cleanParts[0];
        }
    }

    // Step 1 check: Verify we actually got two codes and that they are identical
    if (code1 === "" || code2 === "" || code1 !== code2) {
        // Validation Failed: Codes are either missing or not identical
        triggerOutput2();
        return {
            success: false,
            error: "IDENT_MISMATCH",
            details: "Codes are not identical or one/both are missing. Code1: '" + code1 + "', Code2: '" + code2 + "'"
        };
    }

    // Step 2 check: Compare with the verified code from the previous Phase ID
    var currentVerifiedCode = code1; // since code1 === code2

    if (lastVerifiedCode !== "" && currentVerifiedCode === lastVerifiedCode) {
        // Validation Failed: Current code is identical to the one from the previous Phase ID
        triggerOutput2();
        return {
            success: false,
            error: "HISTORICAL_MATCH",
            details: "The read code '" + currentVerifiedCode + "' is identical to the code read in the previous Phase ID."
        };
    }

    // Success path: Store current code as the last verified code for the next Phase ID check
    lastVerifiedCode = currentVerifiedCode;

    return {
        success: true,
        code: currentVerifiedCode,
        details: "Success. Codes are identical and different from the previous Phase ID's code."
    };
}
