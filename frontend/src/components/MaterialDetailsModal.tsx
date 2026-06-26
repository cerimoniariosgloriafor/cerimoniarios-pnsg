import React from 'react';
import { Material } from '../pages/materials/MaterialsPage';

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '2.5rem',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
  width: '90%',
  maxWidth: '600px',
  maxHeight: '80vh',
  overflowY: 'auto',
  position: 'relative',
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  background: 'transparent',
  border: 'none',
  fontSize: '1.8rem',
  cursor: 'pointer',
  color: '#888',
  padding: '0.5rem',
  lineHeight: 1,
};

interface MaterialDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material;
}

const renderDescriptionWithLinks = (description: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const parts = description.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a key={index} href={part} target="_blank" rel="noopener noreferrer">
          {part}
        </a>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

export const MaterialDetailsModal: React.FC<MaterialDetailsModalProps> = ({ isOpen, onClose, material }) => {
  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <button onClick={onClose} style={closeButtonStyle}>&times;</button>
        <h2>{material.title}</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>
          {renderDescriptionWithLinks(material.description)}
        </p>
      </div>
    </div>
  );
};
