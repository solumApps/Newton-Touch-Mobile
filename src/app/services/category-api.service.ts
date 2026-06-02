import { Injectable } from '@angular/core';
import { CapacitorHttp } from '@capacitor/core';

/**
 * A product flattened from the SOLUM Category API (`labelList[].articleList[]`).
 * Text/IDs come from the API; the hierarchy can be driven by EITHER the standard
 * `category1..4` fields OR the `etc0..3` fields (chosen per-content). Images are
 * uploaded separately in the app.
 */
export interface ApiProduct {
  productId: string;     // labelCode + articleId
  name: string;          // articleName
  price?: string;
  zone?: string;
  articleId?: string;
  labelId?: string;      // labelCode
  shelf?: string;        // position[0].shelfId
  category1?: string; category2?: string; category3?: string; category4?: string;
  etc0?: string; etc1?: string; etc2?: string; etc3?: string;
}

export interface ApiCreds {
  serverUrl: string;     // e.g. https://stage00.common.solumesl.com
  token: string;         // Bearer access_token
  companyId: string;
  storeId: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryApiService {
  /** GET {base}/common/api/v2/common/labels/category?company=&store= (Bearer). Mock fallback if no creds. */
  async fetchProducts(creds?: ApiCreds, category1 = ''): Promise<ApiProduct[]> {
    if (creds?.serverUrl && creds.token) {
      try {
        const url = `${creds.serverUrl}/common/api/v2/common/labels/category` +
          `?company=${encodeURIComponent(creds.companyId)}&store=${encodeURIComponent(creds.storeId)}` +
          (category1 ? `&category1=${encodeURIComponent(category1)}` : '');
        const res = await CapacitorHttp.get({ url, headers: { Authorization: `Bearer ${creds.token}` } });
        const parsed = this.parseLabelList(res.data);
        if (parsed.length) return parsed;
      } catch (e) {
        console.warn('Category API fetch failed; using mock', e);
      }
    }
    return this.mock();
  }

  /** Flatten { labelList:[{ labelCode, category1..4, etc0..3, position[], articleList:[...] }] }. */
  private parseLabelList(data: any): ApiProduct[] {
    const labels = data?.labelList;
    if (!Array.isArray(labels)) return [];
    const out: ApiProduct[] = [];
    for (const lbl of labels) {
      const shelf = Array.isArray(lbl?.position) && lbl.position[0]?.shelfId ? String(lbl.position[0].shelfId) : undefined;
      const arts = Array.isArray(lbl?.articleList) ? lbl.articleList : [];
      for (const a of arts) {
        out.push({
          productId: `${lbl.labelCode || ''}_${a.articleId || ''}`,
          name: a.articleName ?? a.articleId ?? '',
          price: a.price != null ? String(a.price) : undefined,
          zone: a.zone,
          articleId: a.articleId,
          labelId: lbl.labelCode,
          shelf,
          category1: lbl.category1, category2: lbl.category2, category3: lbl.category3, category4: lbl.category4,
          etc0: lbl.etc0, etc1: lbl.etc1, etc2: lbl.etc2, etc3: lbl.etc3,
        });
      }
    }
    return out;
  }

  private mock(): ApiProduct[] {
    // Mirrors the real shape incl. category1..4 + etc0..3 so the field-source picker works offline.
    return [
      { productId: 'L1_w2021009', name: 'Casillero del Diablo', price: '9.09', zone: 'Wine', articleId: 'w2021009', labelId: '03793F04B295', shelf: 'B-1', category1: 'Beverages', category2: 'Wine', category3: 'Red', etc0: 'Wine', etc1: 'Red', etc2: 'Chile' },
      { productId: 'L2_b1001', name: 'Artisan Sourdough', price: '4.50', zone: 'Bakery', articleId: 'b1001', labelId: '03793F04B296', shelf: 'A-3', category1: 'Food', category2: 'Bakery', category3: 'Bread', etc0: 'Bakery', etc1: 'Bread', etc2: 'Sourdough' },
      { productId: 'L3_d2002', name: 'Whole Milk 1L', price: '1.20', zone: 'Dairy', articleId: 'd2002', labelId: '03793F04B297', shelf: 'C-2', category1: 'Food', category2: 'Dairy', category3: 'Milk', etc0: 'Dairy', etc1: 'Milk', etc2: 'Whole' },
      { productId: 'L4_p3003', name: 'Gala Apples 1kg', price: '3.10', zone: 'Produce', articleId: 'p3003', labelId: '03793F04B298', shelf: 'D-1', category1: 'Food', category2: 'Produce', category3: 'Fruit', etc0: 'Produce', etc1: 'Fruit', etc2: 'Apple' },
    ];
  }
}
