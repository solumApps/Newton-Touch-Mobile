import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonModal } from '@ionic/angular/standalone';

export interface NtSettingsRow {
  icon: string;
  label: string;
  value: string;
  /** CSS color for an optional small swatch square shown before the value. */
  swatch?: string;
}

export interface NtSettingsGroup {
  label: string;
  rows: NtSettingsRow[];
}

/**
 * "All settings" bottom sheet — the completeness guarantee for a wizard
 * step's editor deck. Lists every option of the current step grouped by
 * category (icon + label + current value + chevron). Tapping a row emits
 * which option was tapped so the caller can close the sheet, activate that
 * option's chip + pill, and scroll it into view.
 */
@Component({
  selector: 'nt-settings-sheet',
  standalone: true,
  imports: [CommonModule, IonIcon, IonModal],
  template: `
    <ion-modal class="nt-settings-sheet-modal" [isOpen]="isOpen"
               [initialBreakpoint]="initialBreakpoint" [breakpoints]="breakpoints"
               [backdropDismiss]="true" (didDismiss)="onDidDismiss()">
      <ng-template>
        <div class="nt-settings-sheet">
          <div class="grab"></div>
          <div class="hd">
            <span class="t">{{ title }}</span>
            <span class="c" *ngIf="totalOptions">{{ totalOptions }} option{{ totalOptions === 1 ? '' : 's' }}</span>
          </div>
          <div class="body">
            <ng-container *ngFor="let group of groups; let gi = index; trackBy: trackByIndex">
              <div class="grouplabel">{{ group.label }}</div>
              <button type="button" class="row" *ngFor="let row of group.rows; let ri = index; trackBy: trackByIndex"
                      (click)="select(gi, ri)">
                <ion-icon class="ic" [name]="row.icon" aria-hidden="true"></ion-icon>
                <span class="lbl">{{ row.label }}</span>
                <span class="val">
                  <span class="sw" *ngIf="row.swatch" [style.background]="row.swatch" aria-hidden="true"></span>
                  {{ row.value }}
                  <ion-icon class="chev" name="chevron-forward-outline" aria-hidden="true"></ion-icon>
                </span>
              </button>
            </ng-container>
          </div>
        </div>
      </ng-template>
    </ion-modal>
  `,
  styleUrls: ['./nt-settings-sheet.component.scss'],
})
export class NtSettingsSheetComponent {
  @Input() groups: NtSettingsGroup[] = [];
  @Input() isOpen = false;
  @Input() title = 'All settings';
  @Input() initialBreakpoint = 0.6;
  @Input() breakpoints = [0, 0.4, 0.6, 0.92];

  @Output() rowSelected = new EventEmitter<{ groupIndex: number; rowIndex: number }>();
  /** Emitted when the sheet closes without a row being selected (backdrop / drag-down dismiss). */
  @Output() dismissed = new EventEmitter<void>();
  @Output() isOpenChange = new EventEmitter<boolean>();

  @ViewChild(IonModal) modal?: IonModal;

  trackByIndex = (i: number): number => i;

  private pendingSelection: { groupIndex: number; rowIndex: number } | null = null;

  get totalOptions(): number {
    return this.groups.reduce((n, g) => n + g.rows.length, 0);
  }

  select(groupIndex: number, rowIndex: number): void {
    this.pendingSelection = { groupIndex, rowIndex };
    this.modal?.dismiss();
  }

  onDidDismiss(): void {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    if (this.pendingSelection) {
      const sel = this.pendingSelection;
      this.pendingSelection = null;
      this.rowSelected.emit(sel);
    } else {
      this.dismissed.emit();
    }
  }
}
