import React, { useEffect, useState } from 'react';
import { Plus, Folder, FolderOpen, Settings, Tag, ChevronRight, ChevronDown, Moon, Sun, Trash2 } from 'lucide-react';
import { useAppState } from '../../hooks/useAppState';
import { CategoryManageDialog } from './CategoryManageDialog';
import { SettingsDialog } from '../Settings/SettingsDialog';
import { getTheme } from '../../shared/theme';

import { ThemeColors } from '../../shared/theme';

// 재귀 카테고리 트리 아이템 컴포넌트
interface CategoryTreeItemProps {
  category: any;
  level: number;
  childMap: Map<string, any[]>;
  selectedCategoryId: string | null;
  dragOverCategoryId: string | null | 'NONE';
  colors: ThemeColors;
  onSelect: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
}

function CategoryTreeItem({
  category,
  level,
  childMap,
  selectedCategoryId,
  dragOverCategoryId,
  colors,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop,
}: CategoryTreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const children = childMap.get(category.id) || [];
  const hasChildren = children.length > 0;

  return (
    <>
      <div
        onClick={() => onSelect(category.id)}
        onDragOver={(e) => onDragOver(e, category.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, category.id)}
        style={{
          paddingLeft: `${12 + level * 20}px`,
          paddingRight: '12px',
          paddingTop: '10px',
          paddingBottom: '10px',
          margin: '2px 0',
          borderRadius: '6px',
          cursor: 'pointer',
          backgroundColor: dragOverCategoryId === category.id
            ? colors.dragOverBackground
            : (selectedCategoryId === category.id ? colors.primaryLight : 'transparent'),
          border: dragOverCategoryId === category.id ? `2px dashed ${colors.dragOverBorder}` : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: selectedCategoryId === category.id ? colors.primary : colors.textPrimary,
        }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              color: colors.textSecondary,
            }}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        {!hasChildren && <span style={{ width: '16px' }} />}
        {selectedCategoryId === category.id ? <FolderOpen size={18} /> : <Folder size={18} />}
        <span style={{ fontWeight: selectedCategoryId === category.id ? '500' : '400' }}>
          {category.name}
        </span>
      </div>
      {expanded && children.map((child: any) => (
        <CategoryTreeItem
          key={child.id}
          category={child}
          level={level + 1}
          childMap={childMap}
          selectedCategoryId={selectedCategoryId}
          dragOverCategoryId={dragOverCategoryId}
          colors={colors}
          onSelect={onSelect}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        />
      ))}
    </>
  );
}

export function Sidebar() {
  const { selectedCategoryId, setSelectedCategoryId, selectedTagId, setSelectedTagId, setSelectedNoteId, theme, toggleTheme, isTrashView, setIsTrashView } = useAppState();
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null | 'NONE'>('NONE');

  const colors = getTheme(theme);

  // 카테고리 목록 로드
  useEffect(() => {
    loadCategories();
    loadTags();
  }, []);

  const loadCategories = async () => {
    try {
      const list = await window.noteApi.listCategories();
      setCategories(list);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadTags = async () => {
    try {
      const list = await window.noteApi.listTags();
      setTags(list);
    } catch (error) {
      console.error('Failed to load tags:', error);
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

  const handleCategoryClick = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setSelectedTagId(null); // 카테고리 선택 시 태그 필터 해제
    setIsTrashView(false); // 카테고리 선택 시 휴지통 뷰 해제
  };

  const handleTagClick = (tagId: string | null) => {
    setSelectedTagId(tagId);
    setSelectedCategoryId(null); // 태그 선택 시 카테고리 필터 해제
    setIsTrashView(false); // 태그 선택 시 휴지통 뷰 해제
  };

  const handleTrashClick = () => {
    setIsTrashView(true);
    setSelectedCategoryId(null);
    setSelectedTagId(null);
    setSelectedNoteId(null);
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCategoryId(categoryId);
  };

  const handleDragLeave = () => {
    setDragOverCategoryId('NONE');
  };

  const handleDrop = async (e: React.DragEvent, categoryId: string | null) => {
    e.preventDefault();
    setDragOverCategoryId('NONE');

    const noteId = e.dataTransfer.getData('noteId');
    if (!noteId) return;

    try {
      await window.noteApi.updateNote(noteId, { categoryId });
      console.log('✅ Note moved to category:', categoryId);
      // 카테고리 목록을 새로고침하여 UI 업데이트
      window.dispatchEvent(new Event('note-updated'));
    } catch (error) {
      console.error('Failed to move note:', error);
    }
  };

  // 카테고리 트리 구조 생성
  const buildCategoryTree = () => {
    const rootCategories = categories.filter(c => !c.parent_id);
    const childMap = new Map<string, any[]>();

    categories.forEach(cat => {
      if (cat.parent_id) {
        if (!childMap.has(cat.parent_id)) {
          childMap.set(cat.parent_id, []);
        }
        childMap.get(cat.parent_id)!.push(cat);
      }
    });

    return { rootCategories, childMap };
  };

  const { rootCategories, childMap } = buildCategoryTree();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: colors.background }}>
      {/* 헤더 */}
      <div style={{
        padding: '20px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: colors.textPrimary }}>
          📝 Note App
        </h2>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            onClick={() => setSettingsDialogOpen(true)}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
            }}
            title="설정"
          >
            <Settings size={20} color={colors.textSecondary} />
          </button>
          <button
            onClick={toggleTheme}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
            }}
            title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
          >
            {theme === 'light' ? <Moon size={20} color={colors.textSecondary} /> : <Sun size={20} color={colors.textSecondary} />}
          </button>
        </div>
      </div>

      {/* 새 노트 버튼 */}
      <div style={{ padding: '15px', backgroundColor: colors.background }}>
        <button
          onClick={handleNewNote}
          title="새 노트 만들기 (Ctrl+N)"
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: colors.primaryDark,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Plus size={18} />
          새 노트
        </button>
      </div>

      {/* 카테고리 섹션 헤더 */}
      <div style={{
        padding: '15px 15px 10px 15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' }}>
          카테고리
        </span>
        <button
          onClick={() => setManageDialogOpen(true)}
          style={{
            padding: '4px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="카테고리 관리"
        >
          <Settings size={16} color={colors.textSecondary} />
        </button>
      </div>

      {/* 카테고리 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
        {/* 전체 노트 */}
        <div
          onClick={() => handleCategoryClick(null)}
          onDragOver={(e) => handleDragOver(e, null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
          style={{
            padding: '10px 12px',
            margin: '2px 0',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: dragOverCategoryId === null ? colors.dragOverBackground : (selectedCategoryId === null && selectedTagId === null && !isTrashView ? colors.primaryLight : 'transparent'),
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: selectedCategoryId === null && selectedTagId === null && !isTrashView ? colors.primary : colors.textPrimary,
            border: dragOverCategoryId === null ? `2px dashed ${colors.dragOverBorder}` : 'none',
          }}
        >
          {selectedCategoryId === null && selectedTagId === null && !isTrashView ? <FolderOpen size={18} /> : <Folder size={18} />}
          <span style={{ fontWeight: selectedCategoryId === null && selectedTagId === null && !isTrashView ? '500' : '400' }}>
            전체 노트
          </span>
        </div>

        {/* 휴지통 */}
        <div
          onClick={handleTrashClick}
          style={{
            padding: '10px 12px',
            margin: '2px 0',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: isTrashView ? colors.primaryLight : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: isTrashView ? colors.primary : colors.textPrimary,
          }}
        >
          <Trash2 size={18} />
          <span style={{ fontWeight: isTrashView ? '500' : '400' }}>
            휴지통
          </span>
        </div>

        {/* 카테고리 목록 (재귀 트리 구조) */}
        {rootCategories.map((category) => (
          <CategoryTreeItem
            key={category.id}
            category={category}
            level={0}
            childMap={childMap}
            selectedCategoryId={selectedCategoryId}
            dragOverCategoryId={dragOverCategoryId}
            colors={colors}
            onSelect={handleCategoryClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        ))}

        {/* 태그 섹션 구분선 */}
        {tags.length > 0 && (
          <div style={{ margin: '20px 0 10px 0', borderTop: `1px solid ${colors.border}`, paddingTop: '15px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', paddingLeft: '5px' }}>
              태그
            </span>
          </div>
        )}

        {/* 전체 태그 보기 */}
        {tags.length > 0 && (
          <div
            onClick={() => handleTagClick(null)}
            style={{
              padding: '10px 12px',
              margin: '2px 0',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: selectedTagId === null && selectedCategoryId === null ? colors.primaryLight : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: selectedTagId === null && selectedCategoryId === null ? colors.primary : colors.textPrimary,
            }}
          >
            <Tag size={18} />
            <span style={{ fontWeight: selectedTagId === null && selectedCategoryId === null ? '500' : '400' }}>
              전체 태그
            </span>
          </div>
        )}

        {/* 태그 목록 */}
        {tags.map((tag) => (
          <div
            key={tag.id}
            onClick={() => handleTagClick(tag.id)}
            style={{
              padding: '10px 12px',
              margin: '2px 0',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: selectedTagId === tag.id ? colors.primaryLight : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: selectedTagId === tag.id ? colors.primary : colors.textPrimary,
            }}
          >
            <Tag size={16} />
            <span style={{ fontWeight: selectedTagId === tag.id ? '500' : '400' }}>
              #{tag.name}
            </span>
          </div>
        ))}
      </div>

      {/* 카테고리 관리 다이얼로그 */}
      <CategoryManageDialog
        isOpen={manageDialogOpen}
        onClose={() => setManageDialogOpen(false)}
        onCategoryChange={loadCategories}
      />

      {/* 설정 다이얼로그 */}
      <SettingsDialog
        isOpen={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
      />
    </div>
  );
}
