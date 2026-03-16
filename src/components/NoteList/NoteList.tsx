import React, { useEffect, useState } from 'react';
import { Search, FileText, Trash2, Tag, Star, ArrowUpDown } from 'lucide-react';
import { NoteSortType, useAppState } from '../../hooks/useAppState';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import { getTheme } from '../../shared/theme';

export function NoteList() {
  const { selectedNoteId, setSelectedNoteId, selectedCategoryId, selectedTagId, searchQuery, setSearchQuery, theme, sortBy, setSortBy } = useAppState();
  const colors = getTheme(theme);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<any>(null);

  // 노트 정렬 함수
  const sortNotes = (notesToSort: any[]): any[] => {
    const sorted = [...notesToSort];

    switch (sortBy) {
      case 'updated-desc':
        return sorted.sort((a, b) => new Date(b.updated_at || b.updatedAt).getTime() - new Date(a.updated_at || a.updatedAt).getTime());
      case 'updated-asc':
        return sorted.sort((a, b) => new Date(a.updated_at || a.updatedAt).getTime() - new Date(b.updated_at || b.updatedAt).getTime());
      case 'title-asc':
        return sorted.sort((a, b) => (a.title || '제목 없음').localeCompare(b.title || '제목 없음'));
      case 'title-desc':
        return sorted.sort((a, b) => (b.title || '제목 없음').localeCompare(a.title || '제목 없음'));
      case 'created-desc':
        return sorted.sort((a, b) => new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime());
      case 'created-asc':
        return sorted.sort((a, b) => new Date(a.created_at || a.createdAt).getTime() - new Date(b.created_at || b.createdAt).getTime());
      default:
        return sorted;
    }
  };

  // 정렬 방향 토글 함수
  const handleToggleSort = () => {
    // 현재 sortBy 값을 분석하여 base와 direction 추출
    // 예: 'updated-desc' → base: 'updated', direction: 'desc'
    const parts = sortBy.split('-');
    const base = parts[0]; // 'updated', 'created', 'title'
    const direction = parts[1]; // 'asc', 'desc'

    // direction을 반대로 변경
    const newDirection = direction === 'asc' ? 'desc' : 'asc';

    // 새로운 sortBy 값 생성 및 적용
    const newSortBy = `${base}-${newDirection}` as NoteSortType;
    setSortBy(newSortBy);
  };

  // 노트 목록 로드
  useEffect(() => {
    loadNotes();
  }, [selectedCategoryId, selectedTagId, searchQuery]);

  // 노트 업데이트 이벤트 리스너
  useEffect(() => {
    const handleNoteUpdate = () => {
      loadNotes();
    };
    window.addEventListener('note-updated', handleNoteUpdate);
    return () => {
      window.removeEventListener('note-updated', handleNoteUpdate);
    };
  }, [selectedCategoryId, selectedTagId, searchQuery]);

  // 정렬 방식 변경 시 재정렬
  useEffect(() => {
    setNotes(prevNotes => sortNotes(prevNotes));
  }, [sortBy]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      let notesList;
      if (searchQuery.trim()) {
        // 검색어가 있으면 검색 API 사용
        notesList = await window.noteApi.searchNotes(searchQuery);
      } else {
        // 카테고리 또는 태그 필터링
        const filter: any = {};
        if (selectedCategoryId) filter.categoryId = selectedCategoryId;
        if (selectedTagId) filter.tagId = selectedTagId;

        notesList = await window.noteApi.listNotes(Object.keys(filter).length > 0 ? filter : undefined);
      }

      // 정렬 적용
      const sortedNotes = sortNotes(notesList);
      setNotes(sortedNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleDeleteClick = (e: React.MouseEvent, note: any) => {
    e.stopPropagation(); // 노트 선택 방지
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;

    try {
      await window.noteApi.deleteNote(noteToDelete.id);

      // 삭제된 노트가 현재 선택된 노트면 선택 해제
      if (selectedNoteId === noteToDelete.id) {
        setSelectedNoteId(null);
      }

      // 목록 새로고침
      await loadNotes();

      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('노트 삭제에 실패했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const getPreview = (content: string) => {
    // 마크다운 제거 및 첫 줄 추출
    const preview = content
      .replace(/[#*`_]/g, '')
      .replaceAll('[', '')
      .replaceAll(']', '')
      .split('\n')
      .find(line => line.trim()) || '';
    return preview.substring(0, 60) + (preview.length > 60 ? '...' : '');
  };

  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('noteId', noteId);
  };

  const handleTogglePin = async (e: React.MouseEvent, note: any) => {
    e.stopPropagation(); // 노트 선택 방지

    try {
      await window.noteApi.updateNote(note.id, { isPinned: !note.is_pinned });
      await loadNotes();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: colors.backgroundSecondary }}>
      {/* 검색바 */}
      <div style={{ padding: '15px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.backgroundSecondary }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: '6px',
        }}>
          <Search size={18} color={colors.textSecondary} />
          <input
            type="text"
            placeholder="노트 검색... (Ctrl+F)"
            value={searchQuery}
            onChange={handleSearchChange}
            title="검색 (Ctrl+F), 닫기 (ESC)"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              backgroundColor: 'transparent',
              color: colors.textPrimary,
            }}
          />
        </div>
      </div>

      {/* 정렬 드롭다운 */}
      <div style={{
        padding: '8px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.background,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowUpDown
            size={16}
            color={colors.textSecondary}
            onClick={handleToggleSort}
            style={{ cursor: 'pointer' }}
            title="정렬 방향 전환 (오름차순 ↔ 내림차순)"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as NoteSortType)}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '13px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              backgroundColor: colors.background,
              color: colors.textPrimary,
              cursor: 'pointer',
            }}
          >
            <option value="updated-desc">최근 수정일순</option>
            <option value="updated-asc">오래된 수정일순</option>
            <option value="created-desc">최근 생성일순</option>
            <option value="created-asc">오래된 생성일순</option>
            <option value="title-asc">제목 오름차순 (ㄱ-ㅎ)</option>
            <option value="title-desc">제목 내림차순 (ㅎ-ㄱ)</option>
          </select>
        </div>
      </div>

      {/* 노트 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: colors.backgroundSecondary }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: colors.textSecondary }}>
            로딩 중...
          </div>
        ) : notes.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: colors.textSecondary }}>
            <FileText size={48} color={colors.border} style={{ marginBottom: '10px' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>
              {searchQuery ? '검색 결과가 없습니다' : '노트가 없습니다'}
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              draggable
              onDragStart={(e) => handleDragStart(e, note.id)}
              style={{
                padding: '15px',
                borderBottom: `1px solid ${colors.borderLight}`,
                cursor: 'grab',
                backgroundColor: selectedNoteId === note.id ? colors.primaryLight : 'transparent',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                const deleteBtn = e.currentTarget.querySelector('.delete-btn') as HTMLElement;
                if (deleteBtn) deleteBtn.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                const deleteBtn = e.currentTarget.querySelector('.delete-btn') as HTMLElement;
                if (deleteBtn) deleteBtn.style.opacity = '0';
              }}
              onClick={() => setSelectedNoteId(note.id)}
            >
              <div style={{
                fontWeight: selectedNoteId === note.id ? '600' : '500',
                fontSize: '14px',
                color: colors.textPrimary,
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                paddingRight: '30px', // 삭제 버튼 공간 확보
              }}>
                {note.title || '제목 없음'}
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.textSecondary,
                marginBottom: '6px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {getPreview(note.content)}
              </div>

              {/* 태그 표시 */}
              {note.tags && note.tags.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  marginBottom: '6px',
                }}>
                  {note.tags.slice(0, 3).map((tag: any) => (
                    <span
                      key={tag.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 6px',
                        backgroundColor: colors.primaryLight,
                        borderRadius: '3px',
                        fontSize: '10px',
                        color: colors.primary,
                      }}
                    >
                      <Tag size={9} />
                      {tag.name}
                    </span>
                  ))}
                  {note.tags.length > 3 && (
                    <span style={{
                      fontSize: '10px',
                      color: colors.textTertiary,
                      padding: '2px 4px',
                    }}>
                      +{note.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div style={{ fontSize: '11px', color: colors.textTertiary }}>
                {formatDate(note.updated_at || note.updatedAt)}
              </div>

              {/* 별 버튼 (즐겨찾기) */}
              <button
                onClick={(e) => handleTogglePin(e, note)}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '50px',
                  padding: '6px',
                  backgroundColor: note.is_pinned ? colors.pinnedBackground : colors.backgroundSecondary,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={note.is_pinned ? '고정 해제' : '노트 고정'}
              >
                <Star
                  size={16}
                  color={note.is_pinned ? colors.pinnedColor : colors.textTertiary}
                  fill={note.is_pinned ? colors.pinnedColor : 'none'}
                />
              </button>

              {/* 삭제 버튼 */}
              <button
                className="delete-btn"
                onClick={(e) => handleDeleteClick(e, note)}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  padding: '6px',
                  backgroundColor: colors.errorLight,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  opacity: '0',
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={16} color={colors.error} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="노트 삭제"
        message={`"${noteToDelete?.title || '제목 없음'}" 노트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setNoteToDelete(null);
        }}
      />
    </div>
  );
}
