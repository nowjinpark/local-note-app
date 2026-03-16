import React, { useEffect, useState, useRef } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { FileText, Download } from 'lucide-react';
import { useAppState } from '../../hooks/useAppState';
import { TagInput } from './TagInput';
import { AttachmentPanel } from './AttachmentPanel';
import { getTheme } from '../../shared/theme';
import type { AttachmentData } from '../../shared/types';

export function MarkdownEditor() {
  const { selectedNoteId, theme } = useAppState();
  const colors = getTheme(theme);
  const [note, setNote] = useState<any>(null);
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 카테고리 목록 로드
  useEffect(() => {
    loadCategories();
  }, []);

  // 선택된 노트 로드
  useEffect(() => {
    if (selectedNoteId) {
      loadNote(selectedNoteId);
    } else {
      setNote(null);
      setContent('');
      setTitle('');
    }
  }, [selectedNoteId]);

  const loadCategories = async () => {
    try {
      const cats = await window.noteApi.listCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadNote = async (noteId: string) => {
    setLoading(true);
    try {
      const loadedNote = await window.noteApi.getNote(noteId);
      if (loadedNote) {
        setNote(loadedNote);
        setContent(loadedNote.content || '');
        setTitle(loadedNote.title || '');
      }
    } catch (error) {
      console.error('Failed to load note:', error);
    } finally {
      setLoading(false);
    }
  };

  // 수동 저장 핸들러
  const saveNote = async () => {
    if (!selectedNoteId) return;

    try {
      await window.noteApi.updateNote(selectedNoteId, {
        title: title || '제목 없음',
        content,
      });
      console.log('💾 저장 완료');
      // 저장 완료 알림 (선택사항)
      window.dispatchEvent(new Event('note-saved'));
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  // 수동 저장 이벤트 리스너
  useEffect(() => {
    const handleManualSave = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.noteId === selectedNoteId) {
        saveNote();
      }
    };

    window.addEventListener('manual-save', handleManualSave);
    return () => window.removeEventListener('manual-save', handleManualSave);
  }, [selectedNoteId, title, content]);

  // 자동 저장 (0.5초 debounce - 빠른 응답성)
  useEffect(() => {
    if (!selectedNoteId || !note) return;

    // 기존 타이머 취소
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 내용이 변경되었는지 확인
    const hasChanged = content !== note.content || title !== note.title;
    if (!hasChanged) return;

    // 0.5초 후 자동 저장 (타이핑 멈춘 즉시 저장)
    saveTimeoutRef.current = setTimeout(async () => {
      await saveNote();
      console.log('✅ Auto-saved');
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, title, selectedNoteId, note]);

  const handleContentChange = (value?: string) => {
    setContent(value || '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  // 첨부파일 업로드 후 처리 (이미지면 마크다운에 삽입)
  const handleAttachmentUploaded = async (attachment: AttachmentData) => {
    if (attachment.mime_type.startsWith('image/')) {
      try {
        const url = await window.noteApi.getAttachmentUrl(attachment.id);
        const imageMarkdown = `\n![${attachment.filename}](${url})\n`;
        setContent(prevContent => prevContent + imageMarkdown);
      } catch (error) {
        console.error('Failed to get attachment URL:', error);
      }
    }
  };

  const handleCategoryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategoryId = e.target.value || null;
    try {
      await window.noteApi.updateNote(selectedNoteId!, { categoryId: newCategoryId });
      await loadNote(selectedNoteId!);
      console.log('✅ Category updated');
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleExport = async () => {
    try {
      const result = await window.noteApi.exportNote(selectedNoteId!);
      if (result.success) {
        console.log('✅ Exported to:', result.filePath);
      }
    } catch (error) {
      console.error('Failed to export note:', error);
    }
  };

  // 노트 선택 안 됨
  if (!selectedNoteId) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: colors.textTertiary,
      }}>
        <FileText size={64} color={colors.border} style={{ marginBottom: '20px' }} />
        <p style={{ margin: 0, fontSize: '16px' }}>노트를 선택하거나 새로 만드세요</p>
      </div>
    );
  }

  // 로딩 중
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: colors.textSecondary,
      }}>
        로딩 중...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: colors.background }}>
      {/* 제목 입력 */}
      <div style={{
        padding: '20px 30px 15px 30px',
        borderBottom: `1px solid ${colors.border}`,
        position: 'relative',
        backgroundColor: colors.background,
      }}>
        {/* 내보내기 버튼 */}
        <button
          onClick={handleExport}
          style={{
            position: 'absolute',
            top: '20px',
            right: '30px',
            padding: '6px 12px',
            fontSize: '13px',
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: colors.textPrimary,
          }}
        >
          <Download size={14} />
          내보내기
        </button>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="제목 없음"
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            fontSize: '24px',
            fontWeight: '600',
            color: colors.textPrimary,
            backgroundColor: 'transparent',
            marginBottom: '15px',
          }}
        />

        {/* 카테고리 선택 */}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '12px', color: colors.textSecondary, marginRight: '8px' }}>카테고리:</label>
          <select
            value={note?.category_id || ''}
            onChange={handleCategoryChange}
            style={{
              padding: '4px 8px',
              fontSize: '13px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              backgroundColor: colors.background,
              color: colors.textPrimary,
              cursor: 'pointer',
            }}
          >
            <option value="">없음</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* 태그 입력 */}
        <TagInput
          noteId={selectedNoteId!}
          initialTags={note?.tags || []}
          onTagsChange={() => loadNote(selectedNoteId!)}
        />

        {/* 첨부파일 패널 */}
        <AttachmentPanel
          noteId={selectedNoteId}
          onAttachmentUploaded={handleAttachmentUploaded}
        />
      </div>

      {/* 마크다운 에디터 */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '10px 20px', backgroundColor: colors.background }}>
        <MDEditor
          value={content}
          onChange={handleContentChange}
          height="100%"
          preview="live"
          hideToolbar={false}
          data-color-mode={theme}
          style={{ border: 'none' }}
        />
      </div>
    </div>
  );
}
