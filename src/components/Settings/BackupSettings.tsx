import React, { useEffect, useState } from 'react';
import { Download, Upload, Trash2, FolderOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { useAppState } from '../../hooks/useAppState';
import { getTheme } from '../../shared/theme';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import type { BackupInfo } from '../../shared/types';

export function BackupSettings() {
  const { theme } = useAppState();
  const colors = getTheme(theme);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<BackupInfo | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 백업 목록 로드
  const loadBackups = async () => {
    try {
      const list = await window.noteApi.listBackups();
      setBackups(list);
    } catch (error) {
      console.error('Failed to load backups:', error);
      showNotification('error', '백업 목록을 불러올 수 없습니다.');
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  // 알림 표시
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // 백업 생성
  const handleCreateBackup = async (format: 'json' | 'sqlite') => {
    try {
      setLoading(true);
      const result = await window.noteApi.createBackup({ type: 'manual', format });

      if (result.success) {
        showNotification('success', `백업이 생성되었습니다 (${formatFileSize(result.fileSize || 0)})`);
        await loadBackups();
      } else {
        showNotification('error', result.error || '백업 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
      showNotification('error', '백업 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 백업 삭제 확인
  const handleDeleteClick = (backup: BackupInfo) => {
    setBackupToDelete(backup);
    setDeleteDialogOpen(true);
  };

  // 백업 삭제 실행
  const handleConfirmDelete = async () => {
    if (!backupToDelete) return;

    try {
      const result = await window.noteApi.deleteBackup(backupToDelete.id);
      if (result.success) {
        showNotification('success', '백업이 삭제되었습니다.');
        await loadBackups();
      } else {
        showNotification('error', '백업 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete backup:', error);
      showNotification('error', '백업 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteDialogOpen(false);
      setBackupToDelete(null);
    }
  };

  // 백업 폴더 열기
  const handleOpenBackupFolder = async () => {
    try {
      await window.noteApi.openBackupFolder();
      showNotification('success', '백업 폴더를 열었습니다.');
    } catch (error) {
      console.error('Failed to open backup folder:', error);
      showNotification('error', '백업 폴더를 열 수 없습니다.');
    }
  };

  // 백업 복원 확인
  const handleRestoreClick = () => {
    setRestoreDialogOpen(true);
  };

  // 백업 복원 실행
  const handleConfirmRestore = async () => {
    setRestoreDialogOpen(false);

    try {
      setLoading(true);
      const result = await window.noteApi.restoreBackup();

      if (result.success) {
        showNotification('success', '백업이 복원되었습니다. 페이지를 새로고침합니다.');
        // 잠시 후 페이지 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else if (result.error === 'Cancelled') {
        // 사용자가 취소한 경우 - 아무 메시지도 표시하지 않음
      } else {
        showNotification('error', result.error || '백업 복원에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      showNotification('error', '백업 복원 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 날짜 포맷
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '20px'
    }}>
      {/* 알림 메시지 */}
      {notification && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '6px',
          backgroundColor: notification.type === 'success' ? colors.primaryLight : colors.errorLight,
          color: notification.type === 'success' ? colors.primary : colors.error,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px'
        }}>
          {notification.type === 'success' ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {notification.message}
        </div>
      )}

      {/* 백업 생성 섹션 */}
      <div>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '16px',
          fontWeight: 600,
          color: colors.textPrimary
        }}>
          백업 생성
        </h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => handleCreateBackup('json')}
            disabled={loading}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              backgroundColor: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: loading ? 0.6 : 1
            }}
          >
            <Download size={16} />
            JSON 백업 생성
          </button>
          <button
            onClick={() => handleCreateBackup('sqlite')}
            disabled={loading}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              backgroundColor: colors.backgroundSecondary,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: loading ? 0.6 : 1
            }}
          >
            <Download size={16} />
            SQLite 백업 생성
          </button>
          <button
            onClick={handleOpenBackupFolder}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              backgroundColor: colors.backgroundSecondary,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FolderOpen size={16} />
            폴더 열기
          </button>
        </div>
      </div>

      {/* 백업 복원 섹션 */}
      <div>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '16px',
          fontWeight: 600,
          color: colors.textPrimary
        }}>
          백업 복원
        </h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleRestoreClick}
            disabled={loading}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              backgroundColor: colors.backgroundSecondary,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: loading ? 0.6 : 1
            }}
          >
            <Upload size={16} />
            파일에서 복원
          </button>
          <div style={{
            fontSize: '12px',
            color: colors.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertCircle size={14} />
            복원 시 현재 데이터가 모두 대체됩니다
          </div>
        </div>
      </div>

      {/* 백업 목록 */}
      <div>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '16px',
          fontWeight: 600,
          color: colors.textPrimary
        }}>
          백업 목록
        </h3>

        {backups.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: colors.textSecondary,
            backgroundColor: colors.backgroundSecondary,
            borderRadius: '6px'
          }}>
            <Download size={48} color={colors.textTertiary} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <div style={{ fontSize: '14px' }}>생성된 백업이 없습니다</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {backups.map((backup) => (
              <div
                key={backup.id}
                style={{
                  padding: '16px',
                  backgroundColor: colors.backgroundSecondary,
                  borderRadius: '6px',
                  border: `1px solid ${colors.borderLight}`
                }}
              >
                {/* 백업 정보 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: colors.textPrimary,
                      marginBottom: '4px'
                    }}>
                      {formatDate(backup.created_at)}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: colors.textSecondary,
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        padding: '2px 6px',
                        backgroundColor: backup.backup_type === 'manual' ? colors.primary : colors.backgroundSecondary,
                        color: backup.backup_type === 'manual' ? 'white' : colors.textSecondary,
                        borderRadius: '3px',
                        fontSize: '11px'
                      }}>
                        {backup.backup_type === 'manual' ? '수동' : '자동'}
                      </span>
                      <span style={{
                        padding: '2px 6px',
                        backgroundColor: colors.background,
                        borderRadius: '3px',
                        fontSize: '11px'
                      }}>
                        {backup.backup_format.toUpperCase()}
                      </span>
                      <span>{formatFileSize(backup.file_size)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteClick(backup)}
                    style={{
                      padding: '6px',
                      backgroundColor: 'transparent',
                      color: colors.error,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="백업 삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* 백업 통계 */}
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  fontSize: '12px',
                  color: colors.textSecondary
                }}>
                  <span>📝 노트: {backup.notes_count}</span>
                  <span>📁 카테고리: {backup.categories_count}</span>
                  <span>🏷️ 태그: {backup.tags_count}</span>
                  {backup.attachments_count > 0 && (
                    <span>📎 첨부파일: {backup.attachments_count}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="백업 삭제"
        message={`백업 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setBackupToDelete(null);
        }}
        isDangerous={true}
      />

      {/* 복원 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={restoreDialogOpen}
        title="백업 복원"
        message="백업을 복원하면 현재의 모든 노트, 카테고리, 태그가 백업 파일의 데이터로 대체됩니다. 계속하시겠습니까?"
        confirmText="복원"
        cancelText="취소"
        onConfirm={handleConfirmRestore}
        onCancel={() => setRestoreDialogOpen(false)}
        isDangerous={true}
      />
    </div>
  );
}
