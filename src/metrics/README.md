# Metrics API notes

Progress is calculated from baseline to target using `calculateMetricProgress`:
- HIGHER_IS_BETTER requires target > baseline.
- LOWER_IS_BETTER requires target < baseline.
- Progress is clamped to 0–100%; values beyond target remain 100%.

A metric update validates the combined existing and incoming values, so changing direction or target cannot leave an invalid metric record.
