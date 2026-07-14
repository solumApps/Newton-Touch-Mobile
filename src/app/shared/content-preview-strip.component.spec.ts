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

  it('renders the finder sort filter inside the home preview and defaults to A-Z', () => {
    fixture.componentInstance.page = 'home';
    fixture.componentInstance.theme = {
      homeLayout: 'finder-select',
      intermediate: { heroColor: '#445566', fsSortOrder: 'az' },
    } as any;
    fixture.componentInstance.home = [
      { id: 'c', name: 'Produce' },
      { id: 'a', name: 'Bakery' },
      { id: 'b', name: 'Dairy' },
    ] as any;

    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.fs-sort-btn')) as HTMLButtonElement[];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['A-Z', 'Z-A']);
    expect(buttons[0].classList.contains('active')).toBeTrue();
    expect(fixture.componentInstance.finderHomeCells.map((c) => c.name)).toEqual(['Bakery', 'Dairy', 'Produce']);
  });

  it('emits finder sort changes from the preview filter', () => {
    fixture.componentInstance.page = 'inter';
    fixture.componentInstance.theme = {
      intermediateStyle: 'finder-select',
      intermediate: { background: '#223344', fsSortOrder: 'az' },
    } as any;
    fixture.componentInstance.intermediate = [
      { id: 'a', name: 'Bakery' },
      { id: 'b', name: 'Dairy' },
      { id: 'c', name: 'Produce' },
    ] as any;
    fixture.componentInstance.forceSharedIntermediate = true;
    const emitted: string[] = [];
    fixture.componentInstance.finderSortOrderChange.subscribe((order) => emitted.push(order));

    fixture.detectChanges();
    (fixture.nativeElement.querySelectorAll('.fs-sort-btn')[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(emitted).toEqual(['za']);
    expect(fixture.componentInstance.theme.intermediate.fsSortOrder).toBe('za');
    expect(fixture.componentInstance.finderInterCells.map((c) => c.name)).toEqual(['Produce', 'Dairy', 'Bakery']);
    expect(fixture.componentInstance.fsIndexValues).toEqual(['Produce', 'Dairy', 'Bakery']);
  });
});
