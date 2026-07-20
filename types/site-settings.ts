export interface BackgroundSetting {
  url: string;
  mediaId?: string;
}

export type BiographyBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | {
      type: 'image';
      title: string;
      url: string;
      alt: string;
      caption: string;
      width: number;
      height: number;
    };

export interface BiographyContent {
  writtenBy: string;
  blocks: BiographyBlock[];
}

export interface SiteSettingsMap {
  home_background?: BackgroundSetting | null;
  messages_post_background?: BackgroundSetting | null;
  biography_pt?: BiographyContent | null;
  biography_en?: BiographyContent | null;
}
