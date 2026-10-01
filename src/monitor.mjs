// The monitoring loop. Checks the target page for new shifts at a set interval,
// diffs against what was already seen, and hands new ones to the alert callback.
//
// In the real build this targets the client's specific job site. For the spike
// it works against any page, with the scraping logic passed in as a function.

export class ShiftMonitor {
  constructor({ intervalMs = 60_000, scrapeFn, onNewShifts, onError, maxHistory = 500 }) {
    this.intervalMs = intervalMs;
    this.scrapeFn = scrapeFn;
    this.onNewShifts = onNewShifts;
    this.onError = onError || console.error;
    this.seen = new Set();
    this.maxHistory = maxHistory;
    this.timer = null;
    this.running = false;
    this.stats = { checks: 0, found: 0, errors: 0, lastCheck: null };
  }

  async check() {
    this.stats.checks++;
    this.stats.lastCheck = new Date();
    try {
      const shifts = await this.scrapeFn();
      const fresh = shifts.filter((s) => !this.seen.has(s.id));
      for (const s of fresh) {
        this.seen.add(s.id);
        this.stats.found++;
      }
      // Cap the seen set so memory doesn't grow forever.
      if (this.seen.size > this.maxHistory) {
        const arr = [...this.seen];
        this.seen = new Set(arr.slice(arr.length - this.maxHistory));
      }
      if (fresh.length > 0) await this.onNewShifts(fresh);
      return fresh;
    } catch (err) {
      this.stats.errors++;
      this.onError(err);
      return [];
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.check(); // first check immediately
    this.timer = setInterval(() => this.check(), this.intervalMs);
  }

  stop() {
    this.running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
}
