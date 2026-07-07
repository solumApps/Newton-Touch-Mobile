import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const HEX = /^#[0-9a-fA-F]{6}$/;

@Injectable({ providedIn: 'root' })
export class ThemeCustomColorService {
  private readonly colorsSubject = new BehaviorSubject<string[]>([]);
  readonly colors$ = this.colorsSubject.asObservable();

  get colors(): string[] {
    return this.colorsSubject.value;
  }

  reset(colors: string[] = []): void {
    this.colorsSubject.next(this.clean(colors));
  }

  add(color: string): void {
    const c = this.normalize(color);
    if (!c) return;
    const next = this.clean([...this.colorsSubject.value, c]);
    this.colorsSubject.next(next);
  }

  private clean(colors: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of colors || []) {
      const c = this.normalize(raw);
      if (!c || seen.has(c.toLowerCase())) continue;
      seen.add(c.toLowerCase());
      out.push(c);
    }
    return out.slice(0, 24);
  }

  private normalize(color: string): string | null {
    const c = (color || '').trim();
    return HEX.test(c) ? c.toUpperCase() : null;
  }
}
