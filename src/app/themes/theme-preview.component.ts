import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, IonIcon, IonModal } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { ellipsisHorizontal, createOutline, downloadOutline, copyOutline, arrowForward } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { ThemeService, SavedTheme } from '../services/theme.service';
import { NtButtonComponent, NtBadgeComponent, NtSectionHeaderComponent } from '../shared/ui';

/** B2 — Theme preview: hero + 3 LCD thumbnails + expanded config summary + palette + actions. */
@Component({
  selector: 'app-theme-preview',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, IonIcon, IonModal, NtButtonComponent, NtBadgeComponent, NtSectionHeaderComponent],
  templateUrl: './theme-preview.component.html',
  styleUrls: ['./theme-preview.component.scss'],
})
export class ThemePreviewComponent implements OnInit {
  @ViewChild(IonModal) moreModal?: IonModal;
  theme?: SavedTheme;
  msg = '';
  moreOpen = false;

  constructor(private themes: ThemeService, private route: ActivatedRoute, private router: Router) {
    addIcons({ ellipsisHorizontal, createOutline, downloadOutline, copyOutline, arrowForward });
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.theme = await this.themes.getById(id);
    if (!this.theme) this.router.navigateByUrl('/tabs/themes');
  }

  async edit(): Promise<void> {
    if (!this.theme) return;
    await this.closeMore();
    if (this.theme.predefined) {
      const copy = await this.themes.cloneFrom(this.theme, this.theme.name + ' Copy');
      this.router.navigate(['/theme-wizard', copy.id], {
        queryParams: { from: 'theme-preview', returnTheme: this.theme.id },
      });
    } else {
      this.router.navigate(['/theme-wizard', this.theme.id], {
        queryParams: { from: 'theme-preview', returnTheme: this.theme.id },
      });
    }
  }

  private async closeMore(): Promise<void> {
    this.moreOpen = false;
    await this.moreModal?.dismiss();
  }

  async download(): Promise<void> {
    if (!this.theme) return;
    const data = this.themes.export(this.theme);
    const filename = `${this.theme.name.replace(/\s+/g, '')}.solumtheme`;
    // Web: trigger a browser download via an object URL.
    if (Capacitor.getPlatform() === 'web') {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      this.msg = 'Exported .solumtheme';
      return;
    }
    // Native (Android/iOS): the blob/anchor trick is a no-op. Write the file to the
    // app's Cache dir (always writable, no permission needed) then open the system
    // share sheet so the user can save it to Files, send it, etc.
    try {
      await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true });
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
      const canShare = await Share.canShare().catch(() => ({ value: false }));
      if (canShare.value) {
        await Share.share({ title: this.theme.name, text: `Newton Touch theme: ${this.theme.name}`, url: uri, dialogTitle: 'Export .solumtheme' });
        this.msg = 'Theme exported';
      } else {
        this.msg = `Exported ${filename} → ${uri}`;   // sharing unavailable → report saved path
      }
    } catch (e: any) {
      // User dismissing the share sheet also rejects — don't treat that as a hard error.
      const m = e?.message || String(e);
      this.msg = /cancel|dismiss/i.test(m) ? 'Export cancelled' : 'Export failed: ' + m;
    }
  }

  async copy(): Promise<void> {
    if (!this.theme) return;
    try { await navigator.clipboard.writeText(this.themes.export(this.theme)); this.msg = 'Theme code copied'; }
    catch { this.msg = 'Copy not available'; }
  }

  useInContent(): void {
    this.router.navigate(['/content-create'], {
      queryParams: { theme: this.theme!.id, from: 'theme-preview' },
    });
  }
  back(): void { this.router.navigateByUrl('/tabs/themes'); }
}
