// Keep original server identifiers and the latest record for each ID.
export function uniqueRecords(data, field = "id") {
  if (!Array.isArray(data)) return [];
  return [
    ...new Map(
      data
        .filter(
          (item) =>
            item && typeof item[field] === "string" && item[field].trim(),
        )
        .map((item) => [item[field], item]),
    ).values(),
  ];
}
