export const parseCsvParam = (value) =>
  value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []

export const toggleInList = (list, item) =>
  list.includes(item) ? list.filter((v) => v !== item) : [...list, item]
