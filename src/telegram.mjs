// Telegram bot UI. This is the part the client has a detailed spec for.
// The spike shows the inline-keyboard menu structure that matches what
// they described: dashboard, settings, filters, shift alerts.
//
// It doesn't call the real Telegram API (no token in the spike), but the
// message and keyboard payloads are exactly what the API expects, so
// plugging in a token makes it live.

export function dashboardMessage(stats, settings) {
  const status = settings.paused ? '⏸ Paused' : '🟢 Monitoring';
  const autoApply = settings.autoApply ? '✅ On' : '❌ Off';
  const interval = `${settings.checkIntervalMin} min`;
  const filters = Object.entries(settings.filters)
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n') || '  None set';

  return {
    text: [
      `📊 *Dashboard*`,
      ``,
      `Status: ${status}`,
      `Auto-apply: ${autoApply}`,
      `Check interval: ${interval}`,
      ``,
      `Checks: ${stats.checks}  |  Shifts found: ${stats.found}  |  Errors: ${stats.errors}`,
      `Last check: ${stats.lastCheck ? stats.lastCheck.toLocaleTimeString() : 'never'}`,
      ``,
      `*Active filters:*`,
      filters,
    ].join('\n'),
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: settings.paused ? '▶️ Resume' : '⏸ Pause', callback_data: 'toggle_pause' },
          { text: '🔄 Check now', callback_data: 'check_now' },
        ],
        [
          { text: '⚙️ Settings', callback_data: 'settings' },
          { text: '🔍 Filters', callback_data: 'filters' },
        ],
        [{ text: '📋 Recent shifts', callback_data: 'recent' }],
      ],
    },
  };
}

export function settingsMessage(settings) {
  return {
    text: [
      `⚙️ *Settings*`,
      ``,
      `Auto-apply: ${settings.autoApply ? '✅ On' : '❌ Off'}`,
      `Check interval: ${settings.checkIntervalMin} min`,
      `Alerts: ${settings.alertsEnabled ? '🔔 On' : '🔕 Off'}`,
    ].join('\n'),
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: `Auto-apply: ${settings.autoApply ? 'Turn off' : 'Turn on'}`, callback_data: 'toggle_auto_apply' },
        ],
        [
          { text: '⏱ 1 min', callback_data: 'interval_1' },
          { text: '⏱ 2 min', callback_data: 'interval_2' },
          { text: '⏱ 5 min', callback_data: 'interval_5' },
        ],
        [
          { text: `Alerts: ${settings.alertsEnabled ? 'Turn off' : 'Turn on'}`, callback_data: 'toggle_alerts' },
        ],
        [{ text: '← Back', callback_data: 'dashboard' }],
      ],
    },
  };
}

export function filtersMessage(settings) {
  const current = Object.entries(settings.filters)
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n') || '  None set';

  return {
    text: [
      `🔍 *Filters*`,
      ``,
      `Active:`,
      current,
      ``,
      `Tap a filter to set or clear it. Shifts that don't match are hidden from alerts.`,
    ].join('\n'),
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📍 Location', callback_data: 'filter_location' }],
        [{ text: '💰 Min pay', callback_data: 'filter_minPay' }],
        [{ text: '📅 Day of week', callback_data: 'filter_dayOfWeek' }],
        [{ text: '🕐 Time slot', callback_data: 'filter_timeSlot' }],
        [{ text: '🗑 Clear all filters', callback_data: 'clear_filters' }],
        [{ text: '← Back', callback_data: 'dashboard' }],
      ],
    },
  };
}

export function shiftAlertMessage(shift) {
  return {
    text: [
      `🚨 *New shift available*`,
      ``,
      `📍 ${shift.location || 'Unknown location'}`,
      `📅 ${shift.day || '-'}  🕐 ${shift.timeSlot || '-'}`,
      `💰 $${shift.payRate ?? '?'}/hr`,
      shift.description ? `\n${shift.description}` : '',
    ].join('\n'),
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Apply now', callback_data: `apply_${shift.id}` },
          { text: '❌ Skip', callback_data: `skip_${shift.id}` },
        ],
      ],
    },
  };
}

// Handles a callback_data press and returns the next message to send.
export function handleCallback(data, stats, settings) {
  if (data === 'dashboard') return dashboardMessage(stats, settings);
  if (data === 'settings') return settingsMessage(settings);
  if (data === 'filters') return filtersMessage(settings);
  if (data === 'toggle_pause') { settings.paused = !settings.paused; return dashboardMessage(stats, settings); }
  if (data === 'toggle_auto_apply') { settings.autoApply = !settings.autoApply; return settingsMessage(settings); }
  if (data === 'toggle_alerts') { settings.alertsEnabled = !settings.alertsEnabled; return settingsMessage(settings); }
  if (data === 'clear_filters') { settings.filters = {}; return filtersMessage(settings); }
  if (data.startsWith('interval_')) { settings.checkIntervalMin = Number(data.split('_')[1]); return settingsMessage(settings); }
  return dashboardMessage(stats, settings);
}
