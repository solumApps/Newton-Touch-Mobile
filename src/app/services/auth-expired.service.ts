import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthExpiredService {
  readonly expired$ = new Subject<void>();

  triggerExpired(): void {
    this.expired$.next();
  }
}
