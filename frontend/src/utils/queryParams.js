export const parseCsvParam = (value) =>
  value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []
