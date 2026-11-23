import test from "node:test";
import assert from "node:assert/strict";

// Hall utilization formula matching backend & frontend
function calculateHallUtilization(bookedHoursToday, operationalHallsCount) {
  const denominator = Math.max(1.0, operationalHallsCount * 10);
  const percentage = (bookedHoursToday / denominator) * 100;
  return Math.min(100.0, Math.round(percentage * 10) / 10);
}

// 3D printing cost estimate formula matching print_3d_service
function calculate3DPrintEstimate(material, infillPercentage, fileSizeBytes) {
  const densityMap = {
    PLA: 1.24, // g/cm3
    ABS: 1.04,
    PETG: 1.27,
    RESIN: 1.15,
  };

  const costPerGramMap = {
    PLA: 20.0, // LKR per gram
    ABS: 25.0,
    PETG: 28.0,
    RESIN: 45.0,
  };

  const density = densityMap[material] || 1.24;
  const ratePerGram = costPerGramMap[material] || 20.0;

  // Approximate volume in cm3 from file size heuristics
  const estimatedVolumeCm3 = Math.max(10, Math.round((fileSizeBytes / 50000) * (infillPercentage / 50)));
  const estimatedGrams = Math.round(estimatedVolumeCm3 * density * 10) / 10;
  const machineHourRate = 150.0; // LKR
  const estimatedHours = Math.max(0.5, Math.round((estimatedGrams / 25) * 10) / 10);
  const calculatedCostLkr = Math.round(estimatedGrams * ratePerGram + estimatedHours * machineHourRate);

  return {
    estimatedGrams,
    estimatedHours,
    calculatedCostLkr,
  };
}

// Date range calculation matching frontend admin reports
function getDateRangeFromPreset(preset) {
  const now = new Date();
  const endIso = now.toISOString();

  let days = 30;
  if (preset === "7d") days = 7;
  else if (preset === "30d") days = 30;
  else if (preset === "90d") days = 90;

  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: endIso,
  };
}

test("Hall Utilization Formula Calculation", () => {
  // 5 operational halls, 10 hours capacity each = 50 total available hours
  // 25 booked hours = 50% utilization
  const util50 = calculateHallUtilization(25, 5);
  assert.equal(util50, 50.0);

  // Fully booked (50 hours out of 50) = 100%
  const util100 = calculateHallUtilization(50, 5);
  assert.equal(util100, 100.0);

  // Over-scheduled capped at 100%
  const utilOver = calculateHallUtilization(75, 5);
  assert.equal(utilOver, 100.0);

  // 0 booked hours = 0%
  const util0 = calculateHallUtilization(0, 5);
  assert.equal(util0, 0.0);
});

test("3D Printing Estimate Calculation", () => {
  const estimatePLA = calculate3DPrintEstimate("PLA", 20, 250000);
  assert.equal(estimatePLA.estimatedGrams > 0, true);
  assert.equal(estimatePLA.estimatedHours > 0, true);
  assert.equal(estimatePLA.calculatedCostLkr > 0, true);

  // RESIN is priced higher per gram than PLA
  const estimateResin = calculate3DPrintEstimate("RESIN", 20, 250000);
  assert.equal(estimateResin.calculatedCostLkr > estimatePLA.calculatedCostLkr, true);
});

test("Date Range Presets - Relative Timestamps", () => {
  for (const preset of ["7d", "30d", "90d"]) {
    const range = getDateRangeFromPreset(preset);
    const startMs = new Date(range.start).getTime();
    const endMs = new Date(range.end).getTime();
    const diffDays = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));

    const expectedDays = parseInt(preset);
    assert.equal(diffDays, expectedDays, `Expected preset ${preset} to yield ${expectedDays} days`);
  }
});
