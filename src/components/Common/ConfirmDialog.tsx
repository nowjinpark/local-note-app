import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAppState } from '../../hooks/useAppState';
import { getTheme } from '../../shared/theme';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  type = 'warning',
}: ConfirmDialogProps) {
  const { theme } = useAppState();
  const colors = getTheme(theme);

  if (!isOpen) return null;

  const getColor = () => {
    switch (type) {
      case 'danger':
        return colors.error;
      case 'warning':
        return colors.warning;
      case 'info':
        return colors.primary;
      default:
        return colors.warning;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: colors.background,
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: `0 4px 6px ${colors.shadow}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 아이콘 + 제목 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <AlertTriangle size={24} color={getColor()} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: colors.textPrimary }}>
            {title}
          </h3>
        </div>

        {/* 메시지 */}
        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: colors.textSecondary, lineHeight: '1.5' }}>
          {message}
        </p>

        {/* 버튼들 */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: colors.backgroundSecondary,
              color: colors.textPrimary,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              backgroundColor: getColor(),
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
