export interface ThemeColors {
  // 배경색
  background: string;
  backgroundSecondary: string;
  backgroundHover: string;

  // 텍스트
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;

  // 테두리
  border: string;
  borderLight: string;

  // 선택/강조
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // 상태 색상
  success: string;
  warning: string;
  error: string;
  errorLight: string;

  // 기타
  shadow: string;
  dragOverBackground: string;
  dragOverBorder: string;
  pinnedBackground: string;
  pinnedColor: string;
}

export const lightTheme: ThemeColors = {
  background: '#ffffff',
  backgroundSecondary: '#f5f5f5',
  backgroundHover: 'transparent',

  textPrimary: '#212121',
  textSecondary: '#757575',
  textTertiary: '#9e9e9e',

  border: '#e0e0e0',
  borderLight: '#f0f0f0',

  primary: '#1976d2',
  primaryLight: '#e3f2fd',
  primaryDark: '#2196F3',

  success: '#4CAF50',
  warning: '#fbc02d',
  error: '#d32f2f',
  errorLight: '#ffebee',

  shadow: 'rgba(0, 0, 0, 0.1)',
  dragOverBackground: '#c5e1a5',
  dragOverBorder: '#689f38',
  pinnedBackground: '#fff9c4',
  pinnedColor: '#fbc02d',
};

export const darkTheme: ThemeColors = {
  background: '#1e1e1e',
  backgroundSecondary: '#2d2d2d',
  backgroundHover: '#383838',

  textPrimary: '#f5f5f5',
  textSecondary: '#d0d0d0',
  textTertiary: '#808080',

  border: '#404040',
  borderLight: '#333333',

  primary: '#64b5f6',
  primaryLight: '#2a4a6f',
  primaryDark: '#42a5f5',

  success: '#66bb6a',
  warning: '#fdd835',
  error: '#ef5350',
  errorLight: '#5c2828',

  shadow: 'rgba(0, 0, 0, 0.3)',
  dragOverBackground: '#3a4a3a',
  dragOverBorder: '#689f38',
  pinnedBackground: '#4a4520',
  pinnedColor: '#fdd835',
};

export function getTheme(mode: 'light' | 'dark'): ThemeColors {
  return mode === 'dark' ? darkTheme : lightTheme;
}
