import React, { useEffect, useState } from 'react';
import { RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { useAppState } from '../../hooks/useAppState';
import { getTheme } from '../../shared/theme';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import type { TrashNote } from '../../shared/types';

export function TrashView() {
  const { theme } = useAppState();
  const colors = getTheme(theme);
  const [trashedNotes, setTrashedNotes] = useState<TrashNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<TrashNote | null>(null);

  // 휴지통 노트 로드
  const loadTrash = async () => {
    try {
      setLoading(true);
      const notes = await window.noteApi.listTrash();
      setTrashedNotes(notes);
    } catch (error) {
      console.error('Failed to load trash:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, []);

  // 노트 복원
  const handleRestore = async (noteId: string) => {
    try {
      await window.noteApi.restoreFromTrash(noteId);
      await loadTrash();
      window.dispatchEvent(new Event('note-updated'));
      console.log('✅ 노트가 복원되었습니다');
    } catch (error) {
      console.error('Failed to restore note:', error);
      alert('노트 복원에 실패했습니다.');
    }
  };

  // 영구 삭제 확인
  const handleDeleteClick = (note: TrashNote) => {
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  };

  // 영구 삭제 실행
  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;

    try {
      await window.noteApi.deleteNotePermanent(noteToDelete.id);
      await loadTrash();
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
      console.log('✅ 노트가 영구 삭제되었습니다');
    } catch (error) {
      console.error('Failed to permanently delete note:', error);
      alert('노트 삭제에 실패했습니다.');
    }
  };

  // 휴지통 비우기 실행
  const handleEmptyTrash = async () => {
    try {
      const result = await window.noteApi.emptyTrash();
      await loadTrash();
      setEmptyTrashDialogOpen(false);
      console.log(`✅ 휴지통을 비웠습니다 (${result.count}개 삭제)`);
    } catch (error) {
      console.error('Failed to empty trash:', error);
      alert('휴지통 비우기에 실패했습니다.');
    }
  };

  // 날짜 포맷팅
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

  // 삭제된 지 며칠 지났는지 계산
  const getDaysAgo = (dateString: string) => {
    const deletedDate = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - deletedDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    return `${diffDays}일 전`;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: colors.backgroundSecondary
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '15px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.background
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trash2 size={20} color={colors.textPrimary} />
            <h2 style={{ margin: 0, fontSize: '16px', color: colors.textPrimary }}>
              휴지통
            </h2>
            {trashedNotes.length > 0 && (
              <span style={{
                fontSize: '12px',
                color: colors.textSecondary,
                backgroundColor: colors.backgroundSecondary,
                padding: '2px 8px',
                borderRadius: '10px'
              }}>
                {trashedNotes.length}
              </span>
            )}
          </div>

          {trashedNotes.length > 0 && (
            <button
              onClick={() => setEmptyTrashDialogOpen(true)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                backgroundColor: colors.errorLight,
                color: colors.error,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Trash2 size={14} />
              휴지통 비우기
            </button>
          )}
        </div>

        {/* 안내 메시지 */}
        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: colors.backgroundSecondary,
          borderRadius: '4px',
          fontSize: '12px',
          color: colors.textSecondary,
          display: 'flex',
          alignItems: 'start',
          gap: '8px'
        }}>
          <AlertTriangle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
          <span>
            휴지통의 노트는 30일 후 자동으로 영구 삭제됩니다.
          </span>
        </div>
      </div>

      {/* 노트 목록 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: colors.textSecondary,
            fontSize: '14px'
          }}>
            로딩 중...
          </div>
        ) : trashedNotes.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: colors.textSecondary
          }}>
            <Trash2 size={48} color={colors.textTertiary} style={{ opacity: 0.5, marginBottom: '16px' }} />
            <div style={{ fontSize: '14px' }}>휴지통이 비어있습니다</div>
          </div>
        ) : (
          trashedNotes.map((note) => (
            <div
              key={note.id}
              style={{
                padding: '16px',
                borderBottom: `1px solid ${colors.borderLight}`,
                backgroundColor: colors.background,
                cursor: 'default'
              }}
            >
              {/* 노트 제목 */}
              <div style={{
                fontSize: '14px',
                fontWeight: 500,
                color: colors.textPrimary,
                marginBottom: '6px',
                textDecoration: 'line-through',
                opacity: 0.7
              }}>
                {note.title || '제목 없음'}
              </div>

              {/* 카테고리와 태그 */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {note.category && (
                  <span style={{
                    fontSize: '11px',
                    color: colors.textSecondary,
                    backgroundColor: colors.backgroundSecondary,
                    padding: '2px 8px',
                    borderRadius: '3px'
                  }}>
                    📁 {note.category.name}
                  </span>
                )}
                {note.tags && note.tags.map(tag => (
                  <span
                    key={tag.id}
                    style={{
                      fontSize: '11px',
                      color: colors.primary,
                      backgroundColor: colors.primaryLight,
                      padding: '2px 8px',
                      borderRadius: '3px'
                    }}
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>

              {/* 삭제 정보 */}
              <div style={{
                fontSize: '12px',
                color: colors.textTertiary,
                marginBottom: '12px'
              }}>
                {getDaysAgo(note.deleted_at)} 삭제됨 · {formatDate(note.deleted_at)}
              </div>

              {/* 액션 버튼들 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleRestore(note.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    backgroundColor: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RotateCcw size={12} />
                  복원
                </button>
                <button
                  onClick={() => handleDeleteClick(note)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    backgroundColor: colors.errorLight,
                    color: colors.error,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={12} />
                  영구 삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 영구 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="노트 영구 삭제"
        message={`"${noteToDelete?.title || '제목 없음'}" 노트를 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="영구 삭제"
        cancelText="취소"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setNoteToDelete(null);
        }}
        isDangerous={true}
      />

      {/* 휴지통 비우기 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={emptyTrashDialogOpen}
        title="휴지통 비우기"
        message={`휴지통의 모든 노트(${trashedNotes.length}개)를 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="모두 영구 삭제"
        cancelText="취소"
        onConfirm={handleEmptyTrash}
        onCancel={() => setEmptyTrashDialogOpen(false)}
        isDangerous={true}
      />
    </div>
  );
}
