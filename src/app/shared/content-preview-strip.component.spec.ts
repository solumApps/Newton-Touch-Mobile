import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContentPreviewStripComponent } from './content-preview-strip.component';

describe('ContentPreviewStripComponent', () => {
  let fixture: ComponentFixture<ContentPreviewStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentPreviewStripComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentPreviewStripComponent);
  });

  it('maps finder-select home background tokens to the hero and main preview containers', () => {
    fixture.componentInstance.page = 'home';
    fixture.componentInstance.theme = {
      homeLayout: 'finder-select',
      background: '#112233',
      intermediate: { heroColor: '#445566', accent: '#ffcc00' },
    } as any;

    fixture.detectChanges();

    const fsBody = fixture.nativeElement.querySelector('.body.fs-body');
    const fsHero = fixture.nativeElement.querySelector('.fs-hero');
    const fsMain = fixture.nativeElement.querySelector('.fs-main');

    expect(fsBody).not.toBeNull();
    expect(fsHero).not.toBeNull();
    expect(fsMain).not.toBeNull();
    expect(fsBody.style.getPropertyValue('--nt-int-bg')).toBe('#112233');
    expect(fsBody.style.getPropertyValue('--prm-panel')).toBe('#445566');
  });

  it('maps finder-select intermediate background tokens to the hero and main preview containers', () => {
    fixture.componentInstance.page = 'inter';
    fixture.componentInstance.theme = {
      intermediateStyle: 'finder-select',
      intermediate: { background: '#223344', heroColor: '#667788', accent: '#00ccff' },
    } as any;

    fixture.detectChanges();

    const fsBody = fixture.nativeElement.querySelector('.body.fs-body');
    const fsHero = fixture.nativeElement.querySelector('.fs-hero');
    const fsMain = fixture.nativeElement.querySelector('.fs-main');

    expect(fsBody).not.toBeNull();
    expect(fsHero).not.toBeNull();
    expect(fsMain).not.toBeNull();
    expect(fsBody.style.getPropertyValue('--nt-int-bg')).toBe('#223344');
    expect(fsBody.style.getPropertyValue('--prm-panel')).toBe('#667788');
  });
});
