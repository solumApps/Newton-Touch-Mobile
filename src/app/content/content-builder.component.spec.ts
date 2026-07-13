import { ContentBuilderComponent } from './content-builder.component';

describe('ContentBuilderComponent', () => {
  let component: ContentBuilderComponent;

  beforeEach(() => {
    component = new ContentBuilderComponent({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  });

  it('does not require image upload for finder-select home cards when the finder card content is text-only', () => {
    component.draft = {
      home: [],
      intermediate: [],
      themeTokens: {
        cardContent: 'image-text',
        intermediateStyle: 'finder-select',
        intermediate: { fsCardContent: 'text-only' }
      }
    } as any;

    expect(component.needsImage).toBeFalse();
    expect(component.uploadIsIcon).toBeFalse();
  });

  it('does require image upload for finder-select home cards when the finder card content is image-text', () => {
    component.draft = {
      home: [],
      intermediate: [],
      themeTokens: {
        cardContent: 'text-only',
        intermediateStyle: 'finder-select',
        intermediate: { fsCardContent: 'image-text' }
      }
    } as any;

    expect(component.needsImage).toBeTrue();
  });
});
