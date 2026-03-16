import React, { ReactNode } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { getTheme } from '../../shared/theme';

interface AppLayoutProps {
  sidebar: ReactNode;
  noteList: ReactNode;
  editor: ReactNode;
}

export function AppLayout({ sidebar, noteList, editor }: AppLayoutProps) {
  const { theme } = useAppState();
  const colors = getTheme(theme);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    }}>
      {/* 사이드바 */}
      <div style={{
        width: '250px',
        minWidth: '250px',
        backgroundColor: colors.background,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {sidebar}
      </div>

      {/* 노트 리스트 */}
      <div style={{
        width: '350px',
        minWidth: '300px',
        backgroundColor: colors.backgroundSecondary,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {noteList}
      </div>

      {/* 에디터 */}
      <div style={{
        flex: 1,
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {editor}
      </div>
    </div>
  );
}
