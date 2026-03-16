import React, { useState, useEffect, useRef } from 'react';
import { X, Tag as TagIcon } from 'lucide-react';
import { useAppState } from '../../hooks/useAppState';
import { getTheme } from '../../shared/theme';

interface TagInputProps {
  noteId: string;
  initialTags?: any[];
  onTagsChange?: () => void;
}

export function TagInput({ noteId, initialTags = [], onTagsChange }: TagInputProps) {
  const { theme } = useAppState();
  const colors = getTheme(theme);
  const [tags, setTags] = useState<any[]>(initialTags);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTags(initialTags);
  }, [noteId, initialTags]);

  useEffect(() => {
    if (inputValue.trim()) {
      searchTags(inputValue);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue]);

  const searchTags = async (query: string) => {
    try {
      const results = await window.noteApi.searchTags(query);
      setSuggestions(results.filter((tag: any) =>
        !tags.some(t => t.id === tag.id)
      ));
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error('Failed to search tags:', error);
    }
  };

  const handleAddTag = async (tagName: string) => {
    if (!tagName.trim()) return;

    try {
      // 태그 생성 (이미 존재하면 기존 태그 반환)
      const tag = await window.noteApi.createTag({ name: tagName.trim() });

      // 노트에 태그 추가
      const currentTagIds = tags.map(t => t.id);
      await window.noteApi.updateNote(noteId, {
        tagIds: [...currentTagIds, tag.id],
      });

      setTags([...tags, tag]);
      setInputValue('');
      setSuggestions([]);
      setShowSuggestions(false);
      onTagsChange?.();
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      const newTagIds = tags.filter(t => t.id !== tagId).map(t => t.id);
      await window.noteApi.updateNote(noteId, { tagIds: newTagIds });

      setTags(tags.filter(t => t.id !== tagId));
      onTagsChange?.();
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        handleAddTag(suggestions[0].name);
      } else {
        handleAddTag(inputValue);
      }
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '8px 12px',
        border: `1px solid ${colors.border}`,
        borderRadius: '6px',
        backgroundColor: colors.backgroundSecondary,
        minHeight: '42px',
        alignItems: 'center',
      }}>
        {/* 태그들 */}
        {tags.map((tag) => (
          <div
            key={tag.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: colors.primaryLight,
              borderRadius: '4px',
              fontSize: '12px',
              color: colors.primary,
            }}
          >
            <TagIcon size={12} />
            <span>{tag.name}</span>
            <button
              onClick={() => handleRemoveTag(tag.id)}
              style={{
                padding: '0',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: colors.primary,
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {/* 입력 필드 */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={tags.length === 0 ? '태그 추가...' : ''}
          style={{
            flex: 1,
            minWidth: '100px',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontSize: '13px',
            color: colors.textPrimary,
          }}
        />
      </div>

      {/* 자동완성 제안 */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: '6px',
          boxShadow: `0 2px 8px ${colors.shadow}`,
          zIndex: 10,
          maxHeight: '200px',
          overflowY: 'auto',
        }}>
          {suggestions.map((tag) => (
            <div
              key={tag.id}
              onClick={() => handleAddTag(tag.name)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                color: colors.textPrimary,
                borderBottom: `1px solid ${colors.borderLight}`,
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.backgroundSecondary}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.background}
            >
              <TagIcon size={12} style={{ display: 'inline', marginRight: '6px' }} />
              {tag.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
