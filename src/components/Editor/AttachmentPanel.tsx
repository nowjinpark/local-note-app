import React, { useEffect, useState } from 'react';
import { Paperclip, ExternalLink, Trash2, ChevronDown, ChevronUp, Image, FileText, File } from 'lucide-react';
import { useAppState } from '../../hooks/useAppState';
import { getTheme } from '../../shared/theme';
import type { AttachmentData } from '../../shared/types';

interface AttachmentPanelProps {
  noteId: string | null;
  onAttachmentUploaded?: (attachment: AttachmentData) => void;
}

export function AttachmentPanel({ noteId, onAttachmentUploaded }: AttachmentPanelProps) {
  const { theme } = useAppState();
  const colors = getTheme(theme);
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 썸네일 관련 상태
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(new Map());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // 첨부파일 목록 로드
  const loadAttachments = async () => {
    if (!noteId) {
      setAttachments([]);
      return;
    }

    try {
      const list = await window.noteApi.listAttachments(noteId);
      setAttachments(list);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [noteId]);

  // 썸네일 URL 로드
  useEffect(() => {
    const loadThumbnails = async () => {
      // 기존 상태 초기화
      setThumbnailUrls(new Map());
      setLoadingImages(new Set());
      setFailedImages(new Set());

      for (const attachment of attachments) {
        if (attachment.mime_type.startsWith('image/')) {
          setLoadingImages(prev => new Set(prev).add(attachment.id));

          try {
            const url = await window.noteApi.getAttachmentUrl(attachment.id);
            setThumbnailUrls(prev => new Map(prev).set(attachment.id, url));
          } catch (error) {
            console.error('Failed to load thumbnail:', error);
            setFailedImages(prev => new Set(prev).add(attachment.id));
          } finally {
            setLoadingImages(prev => {
              const newSet = new Set(prev);
              newSet.delete(attachment.id);
              return newSet;
            });
          }
        }
      }
    };

    loadThumbnails();
  }, [attachments]);

  // 첨부파일 업로드
  const handleUpload = async () => {
    if (!noteId) return;

    try {
      setLoading(true);
      const attachment = await window.noteApi.uploadAttachment(noteId);
      await loadAttachments();

      // 콜백 호출 (이미지면 마크다운에 삽입)
      if (onAttachmentUploaded) {
        onAttachmentUploaded(attachment);
      }
    } catch (error: any) {
      if (error.message !== 'Cancelled') {
        console.error('Failed to upload attachment:', error);
        alert(`파일 업로드 실패: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 첨부파일 삭제
  const handleDelete = async (attachmentId: string) => {
    if (!confirm('첨부파일을 삭제하시겠습니까?')) return;

    try {
      await window.noteApi.deleteAttachment(attachmentId);
      await loadAttachments();
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      alert('첨부파일 삭제에 실패했습니다.');
    }
  };

  // 첨부파일 열기
  const handleOpen = async (attachmentId: string) => {
    try {
      await window.noteApi.openAttachment(attachmentId);
    } catch (error) {
      console.error('Failed to open attachment:', error);
      alert('파일을 열 수 없습니다.');
    }
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 파일 타입에 따른 아이콘
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image size={16} color={colors.primary} />;
    } else if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) {
      return <FileText size={16} color={colors.textSecondary} />;
    } else {
      return <File size={16} color={colors.textSecondary} />;
    }
  };

  // 이미지 여부 확인
  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  // 썸네일 렌더링
  const renderThumbnail = (attachment: AttachmentData) => {
    const url = thumbnailUrls.get(attachment.id);
    const isLoading = loadingImages.has(attachment.id);
    const hasFailed = failedImages.has(attachment.id);

    // 로드 실패한 경우 fallback 아이콘
    if (hasFailed) {
      return getFileIcon(attachment.mime_type);
    }

    // 로딩 중 placeholder
    if (isLoading) {
      return (
        <div style={{
          width: '40px',
          height: '40px',
          backgroundColor: colors.border,
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Image size={20} color={colors.textSecondary} />
        </div>
      );
    }

    // 썸네일 표시
    if (url) {
      return (
        <img
          src={url}
          alt={attachment.filename}
          style={{
            width: '40px',
            height: '40px',
            objectFit: 'cover',
            borderRadius: '4px',
            border: `1px solid ${colors.border}`,
            flexShrink: 0
          }}
          onError={() => {
            setFailedImages(prev => new Set(prev).add(attachment.id));
          }}
        />
      );
    }

    // URL 로드 전 기본 아이콘
    return getFileIcon(attachment.mime_type);
  };

  if (!noteId) return null;

  return (
    <div style={{
      borderTop: `1px solid ${colors.border}`,
      backgroundColor: colors.background,
      padding: '12px 16px'
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isCollapsed ? 0 : '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: '500',
          color: colors.textPrimary
        }}>
          <Paperclip size={14} />
          <span>첨부파일</span>
          {attachments.length > 0 && (
            <span style={{
              padding: '2px 6px',
              backgroundColor: colors.primaryLight,
              color: colors.primary,
              borderRadius: '10px',
              fontSize: '11px'
            }}>
              {attachments.length}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={handleUpload}
            disabled={loading}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
            title="파일 첨부"
          >
            {loading ? '업로드 중...' : '첨부'}
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: colors.textSecondary
            }}
            title={isCollapsed ? '펼치기' : '접기'}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* 첨부파일 목록 */}
      {!isCollapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {attachments.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: colors.textTertiary,
              fontSize: '12px'
            }}>
              첨부파일이 없습니다
            </div>
          ) : (
            attachments.map((attachment) => (
              <div
                key={attachment.id}
                style={{
                  padding: '8px',
                  backgroundColor: colors.backgroundSecondary,
                  borderRadius: '4px',
                  border: `1px solid ${colors.borderLight}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                {/* 아이콘 또는 썸네일 */}
                <div style={{ flexShrink: 0 }}>
                  {isImage(attachment.mime_type)
                    ? renderThumbnail(attachment)
                    : getFileIcon(attachment.mime_type)
                  }
                </div>

                {/* 파일 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '12px',
                    color: colors.textPrimary,
                    fontWeight: '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {attachment.filename}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: colors.textTertiary,
                    marginTop: '2px'
                  }}>
                    {formatFileSize(attachment.file_size)}
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => handleOpen(attachment.id)}
                    style={{
                      padding: '4px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: colors.textSecondary
                    }}
                    title="열기"
                  >
                    <ExternalLink size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(attachment.id)}
                    style={{
                      padding: '4px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: colors.error
                    }}
                    title="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
