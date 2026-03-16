import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';
import { useAppState } from '../../hooks/useAppState';
import { getTheme } from '../../shared/theme';

interface CategoryManageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryChange: () => void;
}

export function CategoryManageDialog({ isOpen, onClose, onCategoryChange }: CategoryManageDialogProps) {
  const { theme } = useAppState();
  const colors = getTheme(theme);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingParentId, setEditingParentId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const list = await window.noteApi.listCategories();
      setCategories(list);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleCreate = async () => {
    if (!newCategoryName.trim()) return;

    try {
      await window.noteApi.createCategory({
        name: newCategoryName.trim(),
        parentId: newParentId || undefined,
      });
      setNewCategoryName('');
      setNewParentId(null);
      await loadCategories();
      onCategoryChange();
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('카테고리 생성에 실패했습니다.');
    }
  };

  const handleStartEdit = (category: any) => {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditingParentId(category.parent_id || null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    try {
      await window.noteApi.updateCategory(editingId, {
        name: editingName.trim(),
        parentId: editingParentId || undefined,
      });
      setEditingId(null);
      setEditingName('');
      setEditingParentId(null);
      await loadCategories();
      onCategoryChange();
    } catch (error) {
      console.error('Failed to update category:', error);
      alert('카테고리 수정에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 카테고리를 삭제하시겠습니까?`)) return;

    try {
      await window.noteApi.deleteCategory(id);
      await loadCategories();
      onCategoryChange();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('카테고리 삭제에 실패했습니다.');
    }
  };

  if (!isOpen) return null;

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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: colors.background,
          borderRadius: '8px',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: `0 4px 6px ${colors.shadow}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: colors.textPrimary }}>카테고리 관리</h3>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} color={colors.textSecondary} />
          </button>
        </div>

        {/* 새 카테고리 추가 */}
        <div style={{ padding: '20px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '6px', display: 'block' }}>
              상위 카테고리 (선택사항)
            </label>
            <select
              value={newParentId || ''}
              onChange={(e) => setNewParentId(e.target.value || null)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: colors.background,
                color: colors.textPrimary,
              }}
            >
              <option value="">없음 (최상위 카테고리)</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="새 카테고리 이름"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: colors.background,
                color: colors.textPrimary,
              }}
            />
            <button
              onClick={handleCreate}
              disabled={!newCategoryName.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: newCategoryName.trim() ? colors.success : colors.border,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: newCategoryName.trim() ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={16} />
              추가
            </button>
          </div>
        </div>

        {/* 카테고리 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px' }}>
          {categories.length === 0 ? (
            <p style={{ textAlign: 'center', color: colors.textSecondary, padding: '20px' }}>
              카테고리가 없습니다
            </p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: colors.backgroundSecondary,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {editingId === category.id ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <select
                      value={editingParentId || ''}
                      onChange={(e) => setEditingParentId(e.target.value || null)}
                      style={{
                        padding: '6px 10px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '4px',
                        fontSize: '13px',
                        outline: 'none',
                        backgroundColor: colors.background,
                        color: colors.textPrimary,
                      }}
                    >
                      <option value="">없음 (최상위 카테고리)</option>
                      {categories
                        .filter(cat => cat.id !== category.id) // 자기 자신 제외
                        .map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))
                      }
                    </select>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                        autoFocus
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          border: `1px solid ${colors.primary}`,
                          borderRadius: '4px',
                          fontSize: '14px',
                          outline: 'none',
                          backgroundColor: colors.background,
                          color: colors.textPrimary,
                        }}
                      />
                      <button
                        onClick={handleSaveEdit}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: colors.primaryDark,
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        저장
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingName('');
                          setEditingParentId(null);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: colors.textSecondary,
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: '14px', color: colors.textPrimary }}>
                      {category.name}
                    </span>
                    <button
                      onClick={() => handleStartEdit(category)}
                      style={{
                        padding: '6px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="수정"
                    >
                      <Edit2 size={16} color={colors.primary} />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id, category.name)}
                      style={{
                        padding: '6px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="삭제"
                    >
                      <Trash2 size={16} color={colors.error} />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
