// Verification Script for configurator.html JSON structure integrity
var fs = require('fs');

try {
    var htmlContent = fs.readFileSync('./configurator.html', 'utf8');

    // Extract JSON from the configuration tag
    var startPattern = '<script id="config-data" type="application/json">';
    var endPattern = '</script>';

    var startIndex = htmlContent.indexOf(startPattern);
    var endIndex = htmlContent.indexOf(endPattern, startIndex);

    if (startIndex === -1 || endIndex === -1) {
        throw new Error("Could not find config-data script tag!");
    }

    var jsonStr = htmlContent.substring(startIndex + startPattern.length, endIndex).trim();
    var config = JSON.parse(jsonStr);

    console.log("✔ JSON Parsing Succeeded!");
    console.log("Configured Equipment Types: ", config.equipmentTypes);
    console.log("Default Locations Count: ", config.locations.length);
    console.log("Current Records Count: ", config.records.length);

    if (config.equipmentTypes.indexOf("Blade") === -1 || config.equipmentTypes.indexOf("Thor") === -1) {
        throw new Error("Missing required equipment types!");
    }

    console.log("✔ CONFIGURATOR INTEGRITY VERIFIED SUCCESSFULLY!");
} catch (e) {
    console.error("❌ INTEGRITY CHECK FAILED:");
    console.error(e);
    process.exit(1);
}
