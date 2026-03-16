import React from 'react';
import { X } from 'lucide-react';
import { useAppState } from '../../hooks/useAppState';
import { getTheme } from '../../shared/theme';
import { BackupSettings } from './BackupSettings';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { theme } = useAppState();
  const colors = getTheme(theme);

  if (!isOpen) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={onClose}
      >
        {/* 다이얼로그 컨테이너 */}
        <div
          style={{
            backgroundColor: colors.background,
            borderRadius: '8px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div style={{
            padding: '20px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              color: colors.textPrimary
            }}>
              설정
            </h2>
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                color: colors.textSecondary,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* 컨텐츠 */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: colors.backgroundSecondary
          }}>
            <BackupSettings />
          </div>
        </div>
      </div>
    </>
  );
}
