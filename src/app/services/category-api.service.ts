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
  username?: string;     // SOLUM username (optional — not needed for token-based calls)
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
        return this.parseLabelList(res.data);
      } catch (e) {
        console.warn('Category API fetch failed', e);
        throw e;
      }
    }
    // No creds configured → no dummy data; caller prompts to set Server Config.
    throw new Error('No server credentials. Set them in Settings → Server / API Credentials.');
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

}
