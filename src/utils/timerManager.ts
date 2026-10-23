type TimerId = NodeJS.Timeout;

export class TimerManager {
  private timers = new Map<string, Set<TimerId>>();

  set(roomId: string, timer: TimerId, tag?: string): void {
    if (!this.timers.has(roomId)) {
      this.timers.set(roomId, new Set());
    }
    this.timers.get(roomId)!.add(timer);
  }

  clear(roomId: string): void {
    const set = this.timers.get(roomId);
    if (!set) return;
    for (const t of set) {
      clearTimeout(t as NodeJS.Timeout);
      clearInterval(t as NodeJS.Timeout);
    }
    this.timers.delete(roomId);
  }

  clearOne(roomId: string, timer: TimerId): void {
    const set = this.timers.get(roomId);
    if (!set) return;
    clearTimeout(timer as NodeJS.Timeout);
    clearInterval(timer as NodeJS.Timeout);
    set.delete(timer);
    if (set.size === 0) {
      this.timers.delete(roomId);
    }
  }
}

export const bacTimerManager = new TimerManager();
export const quizTimerManager = new TimerManager();
