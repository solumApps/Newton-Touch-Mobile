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

  it('makes the finder-select home card area transparent when a home background image is set', () => {
    fixture.componentInstance.page = 'home';
    fixture.componentInstance.theme = {
      homeLayout: 'finder-select',
      background: '#112233',
      backgroundImage: 'assets/bg.jpg',
      intermediate: { heroColor: '#445566' },
    } as any;

    fixture.detectChanges();

    const fsBody = fixture.nativeElement.querySelector('.body.fs-body') as HTMLElement;
    const fsMain = fixture.nativeElement.querySelector('.fs-main') as HTMLElement;

    expect(fsBody.style.getPropertyValue('--nt-int-bg')).toBe('transparent');
    expect(fsMain.style.background).toBe('transparent');
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

  it('makes the finder-select intermediate page background transparent when an intermediate background image is set', () => {
    fixture.componentInstance.page = 'inter';
    fixture.componentInstance.theme = {
      intermediateStyle: 'finder-select',
      intermediate: { background: '#223344', backgroundImage: 'assets/inter-bg.jpg', heroColor: '#667788' },
    } as any;

    fixture.detectChanges();

    const fsBody = fixture.nativeElement.querySelector('.body.fs-body') as HTMLElement;
    const fsMain = fixture.nativeElement.querySelector('.fs-main') as HTMLElement;

    expect(fsBody.style.getPropertyValue('--nt-int-bg')).toBe('transparent');
    expect(fsMain.style.background).toBe('transparent');
  });

  it('renders the finder A-Z letter filter inside the home preview and defaults cards to A-Z', () => {
    fixture.componentInstance.page = 'home';
    fixture.componentInstance.theme = {
      homeLayout: 'finder-select',
      intermediate: { heroColor: '#445566' },
    } as any;
    fixture.componentInstance.home = [
      { id: 'c', name: 'Produce' },
      { id: 'a', name: 'Bakery' },
      { id: 'b', name: 'Dairy' },
    ] as any;

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.fs-sort-btn').length).toBe(0);
    const letters = Array.from(fixture.nativeElement.querySelectorAll('.fs-alpha-index .fs-letter')) as HTMLButtonElement[];
    expect(letters.map((b) => b.textContent?.trim()).slice(0, 5)).toEqual(['All', 'A', 'B', 'C', 'D']);
    expect(letters.length).toBe(27);
    expect(letters[0].classList.contains('active')).toBeTrue();
    expect(letters[1].disabled).toBeTrue();
    expect(letters[2].classList.contains('available')).toBeTrue();
    expect(letters[4].classList.contains('available')).toBeTrue();
    expect(letters[16].classList.contains('available')).toBeTrue();
    expect(fixture.componentInstance.finderHomeCells.map((c) => c.name)).toEqual(['Bakery', 'Dairy', 'Produce']);

    letters[16].click();
    fixture.detectChanges();

    expect(letters[16].classList.contains('active')).toBeTrue();
    expect(fixture.componentInstance.finderHomeCells.map((c) => c.name)).toEqual(['Produce']);

    letters[0].click();
    fixture.detectChanges();

    expect(letters[0].classList.contains('active')).toBeTrue();
    expect(fixture.componentInstance.finderHomeCells.map((c) => c.name)).toEqual(['Bakery', 'Dairy', 'Produce']);
  });

  it('ignores old finder sort-order tokens and keeps the finder preview A-Z', () => {
    fixture.componentInstance.page = 'home';
    fixture.componentInstance.theme = {
      homeLayout: 'finder-select',
      intermediate: { fsSortOrder: 'za' },
    } as any;
    fixture.componentInstance.home = [
      { id: 'c', name: 'Produce' },
      { id: 'a', name: 'Bakery' },
      { id: 'b', name: 'Dairy' },
    ] as any;

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.fs-sort-btn').length).toBe(0);
    expect(fixture.componentInstance.finderHomeCells.map((c) => c.name)).toEqual(['Bakery', 'Dairy', 'Produce']);
  });

  it('renders the finder A-Z letter filter inside the intermediate preview', () => {
    fixture.componentInstance.page = 'inter';
    fixture.componentInstance.theme = {
      intermediateStyle: 'finder-select',
      intermediate: { background: '#223344' },
    } as any;
    fixture.componentInstance.intermediate = [
      { id: 'a', name: 'Bakery' },
      { id: 'b', name: 'Dairy' },
      { id: 'c', name: 'Produce' },
    ] as any;
    fixture.componentInstance.forceSharedIntermediate = true;

    fixture.detectChanges();

    const letters = Array.from(fixture.nativeElement.querySelectorAll('.fs-alpha-index .fs-letter')) as HTMLButtonElement[];
    expect(letters.length).toBe(27);
    expect(letters[0].textContent?.trim()).toBe('All');
    expect(letters[0].classList.contains('active')).toBeTrue();
    expect(letters[2].classList.contains('available')).toBeTrue();
    expect(letters[4].classList.contains('available')).toBeTrue();
    expect(letters[16].classList.contains('available')).toBeTrue();
    expect(fixture.componentInstance.finderInterCells.map((c) => c.name)).toEqual(['Bakery', 'Dairy', 'Produce']);
    expect(fixture.componentInstance.fsIndexValues).toEqual(['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')]);

    letters[4].click();
    fixture.detectChanges();

    expect(letters[4].classList.contains('active')).toBeTrue();
    expect(fixture.componentInstance.finderInterCells.map((c) => c.name)).toEqual(['Dairy']);

    letters[0].click();
    fixture.detectChanges();

    expect(letters[0].classList.contains('active')).toBeTrue();
    expect(fixture.componentInstance.finderInterCells.map((c) => c.name)).toEqual(['Bakery', 'Dairy', 'Produce']);
  });

  it('renders all intermediate finder cards so the strip can scroll', () => {
    fixture.componentInstance.page = 'inter';
    fixture.componentInstance.theme = {
      intermediateStyle: 'finder-select',
      intermediate: { background: '#223344' },
    } as any;
    fixture.componentInstance.intermediate = [
      { id: 'a', name: 'Bakery' },
      { id: 'b', name: 'Dairy' },
      { id: 'c', name: 'Frozen' },
      { id: 'd', name: 'Meat' },
      { id: 'e', name: 'Produce' },
      { id: 'f', name: 'Snacks' },
      { id: 'g', name: 'Wine' },
    ] as any;
    fixture.componentInstance.forceSharedIntermediate = true;

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.fs-card').length).toBe(7);
  });

  it('forces finder-select circle and hexagon text alignment to center', () => {
    fixture.componentInstance.theme = {
      intermediate: { fsCardShape: 'circle', fsTextAlign: 'left' },
    } as any;
    expect(fixture.componentInstance.finderTextAlignClass).toBe('center');

    fixture.componentInstance.theme = {
      intermediate: { fsCardShape: 'hexagon', fsTextAlign: 'right' },
    } as any;
    expect(fixture.componentInstance.finderTextAlignClass).toBe('center');
  });
});
