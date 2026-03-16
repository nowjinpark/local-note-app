import React, { createContext, useContext, useState, ReactNode } from 'react';

// 노트 정렬 타입
export type NoteSortType = 'updated-desc' | 'updated-asc' | 'title-asc' | 'title-desc' | 'created-desc' | 'created-asc';

// 앱 전역 상태 인터페이스
interface AppState {
  selectedNoteId: string | null;
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  searchQuery: string;
  theme: 'light' | 'dark';
  sortBy: NoteSortType;
  isTrashView: boolean;
}

// Context 값 타입 (상태 + setter 함수들)
interface AppStateContextValue extends AppState {
  setSelectedNoteId: (id: string | null) => void;
  setSelectedCategoryId: (id: string | null) => void;
  setSelectedTagId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleTheme: () => void;
  setSortBy: (sort: NoteSortType) => void;
  setIsTrashView: (isTrash: boolean) => void;
}

// Context 생성
const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

// Provider Props
interface AppStateProviderProps {
  children: ReactNode;
}

// Provider 컴포넌트
export function AppStateProvider({ children }: AppStateProviderProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isTrashView, setIsTrashView] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // 로컬 스토리지에서 테마 불러오기
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });
  const [sortBy, setSortByState] = useState<NoteSortType>(() => {
    // 로컬 스토리지에서 정렬 방식 불러오기
    const saved = localStorage.getItem('noteSortBy');
    return (saved as NoteSortType) || 'updated-desc';
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  const setSortBy = (sort: NoteSortType) => {
    setSortByState(sort);
    localStorage.setItem('noteSortBy', sort);
  };

  const contextValue: AppStateContextValue = {
    selectedNoteId,
    selectedCategoryId,
    selectedTagId,
    searchQuery,
    theme,
    sortBy,
    isTrashView,
    setSelectedNoteId,
    setSelectedCategoryId,
    setSelectedTagId,
    setSearchQuery,
    toggleTheme,
    setSortBy,
    setIsTrashView,
  };

  return React.createElement(
    AppStateContext.Provider,
    { value: contextValue },
    children
  );
}

// 커스텀 훅 (useAppState)
export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}
