// Shift filters. The user configures these through the Telegram inline keyboard.
// Each filter is a simple predicate; a shift passes if all active filters pass.

export const FILTER_TYPES = {
  location:  { label: 'Location',      match: (s, v) => !v || s.location?.toLowerCase().includes(v.toLowerCase()) },
  minPay:    { label: 'Min pay ($/hr)', match: (s, v) => !v || (s.payRate ?? 0) >= Number(v) },
  dayOfWeek: { label: 'Day of week',    match: (s, v) => !v || v.split(',').some((d) => s.day?.toLowerCase() === d.trim().toLowerCase()) },
  timeSlot:  { label: 'Time slot',      match: (s, v) => !v || s.timeSlot?.toLowerCase() === v.toLowerCase() },
};

export function applyFilters(shifts, userFilters = {}) {
  return shifts.filter((s) =>
    Object.entries(userFilters).every(([key, value]) => {
      const ft = FILTER_TYPES[key];
      return !ft || ft.match(s, value);
    }),
  );
}

// Default settings for a new user.
export function defaultSettings() {
  return {
    filters: {},
    autoApply: false,
    checkIntervalMin: 2,
    alertsEnabled: true,
    paused: false,
  };
}
