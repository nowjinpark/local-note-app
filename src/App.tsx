import React, { useEffect } from 'react';
import { AppStateProvider, useAppState } from './hooks/useAppState';
import { AppLayout } from './components/Layout/AppLayout';
import { Sidebar } from './components/Sidebar/Sidebar';
import { NoteList } from './components/NoteList/NoteList';
import { MarkdownEditor } from './components/Editor/MarkdownEditor';
import { TrashView } from './components/Trash/TrashView';
import './index.css';

function AppContent() {
  const { theme, setSelectedNoteId, selectedCategoryId, setSearchQuery, selectedNoteId, isTrashView } = useAppState();

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N: 새 노트 생성
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        handleNewNote();
      }

      // Ctrl+F: 검색창에 포커스
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder^="노트 검색"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // ESC: 검색창 포커스 해제 또는 검색어 초기화
      if (e.key === 'Escape') {
        const searchInput = document.querySelector('input[placeholder^="노트 검색"]') as HTMLInputElement;
        if (searchInput && document.activeElement === searchInput) {
          searchInput.blur();
          setSearchQuery('');
        }
      }

      // Ctrl+S: 수동 저장
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };

    const handleNewNote = async () => {
      try {
        const newNote = await window.noteApi.createNote({
          title: '제목 없음',
          content: '',
          categoryId: selectedCategoryId,
        });
        setSelectedNoteId(newNote.id);
      } catch (error) {
        console.error('Failed to create note:', error);
      }
    };

    const handleManualSave = () => {
      if (!selectedNoteId) return;

      // 수동 저장 이벤트 발생 (MarkdownEditor에서 처리)
      window.dispatchEvent(new CustomEvent('manual-save', { detail: { noteId: selectedNoteId } }));

      // 사용자에게 저장 중임을 알림
      console.log('💾 수동 저장 중...');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCategoryId, setSelectedNoteId, setSearchQuery, selectedNoteId]);

  return (
    <AppLayout
      sidebar={<Sidebar />}
      noteList={isTrashView ? <TrashView /> : <NoteList />}
      editor={<MarkdownEditor />}
    />
  );
}

const App: React.FC = () => {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
};

export default App;
